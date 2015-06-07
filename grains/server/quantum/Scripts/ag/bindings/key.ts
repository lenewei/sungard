module ag
{
   ko.bindingHandlers["key"] =
   {
      init: (element: HTMLElement, valueAccessor, allBindingsAccessor, appViewModel:IAppViewModel) =>
      {
         var $element = $(element),
            readOnly = $element.data("read-only");

         if (!(appViewModel instanceof AppViewModel) && !readOnly)
            throw new Error("KeyBinding is used incorrectly.");
         
         appViewModel.copyOriginalKeyCallBack = key.utils.copyOriginalKey;
         
         var retriever = () =>
         {
            if (appViewModel.updatingModel())
               return;

            // Notify the UIHtml to update when key value changed
            PubSub.publish(ag.topics.UpdateUIHtml);

            appViewModel.publishViewModelUpdatingEvent(true);
            getEntity($element, valueAccessor, appViewModel, !!readOnly).always(() =>
            {
               appViewModel.publishViewModelUpdatingEvent(false);
            });
         };

         ko.utils.registerEventHandler(element, "change", retriever);
         

         // IE specific
         if ($.browser.msie)
         {
            ko.utils.registerEventHandler(element, "paste",() =>
            {
               $element.data("ieRetrieve", true);
            });

            ko.utils.registerEventHandler(element, "keyup", (event: JQueryEventObject) =>
            {
               if (event.keyCode !== 13)
                  return;

               // if this event is from typehead select we won't fire 
               var typehead = $element.data("typeahead");
               if (typehead && typehead.shown)
                  return;

               retriever();
            });

            ko.utils.registerEventHandler(element, "blur",() =>
            {
               if ($element.data("ieRetrieve"))
                  retriever();

               $element.data("ieRetrieve", false);
            });
         }
      },

      update: (element, valueAccessor, allBindingsAccessor) =>
      {
         var keyOld = $(element).val(),
            keyNew = ko.unwrap(valueAccessor());

         if (key.utils.isSameKeyValue(keyNew, keyOld))
            return;

         // Stop updating the value if this field conatins the relativedatepicker binding,
         // it will casue date format display issue
         if (!allBindingsAccessor().date)
            $(element).val(keyNew);
      }
   };

   function getEntity($element: JQuery, valueAccessor: any, model: IAppViewModel, throwOnNotFound: boolean): JQueryPromise<any>
   {
      var temp = $.Deferred();

      if (!model.editUrl || !model.itemKey)
         return temp.resolve();

      if (!key.utils.isTryRetrieveOnce($element) && ko.unwrap(valueAccessor()) == $element.val())
         return temp.resolve();

      var postData = { throwOnNotFound: throwOnNotFound },
         net = new utils.Network(),
         keyValue = $element.val();

      if (!keyValue)
         return temp.resolve();

      postData[model.editProperty] = keyValue;

      return net.getJson({ url: model.editUrl }, postData)
         .done((result) =>
         {
            // If a matching entity was found, load it and then navigate to it
            if (result && result.data)
               model.loadItemThenNavigate(result, keyValue, false);
            else
            {
               var newlyInputValue = $element.val();
               if (model.isNewItem())
               {
                  valueAccessor()(newlyInputValue);
               }
               else
               {
                  if (model.editingItem.canRename && model.editingItem.canRename())
                  {
                     // if model canRename, so we won't fire new item request
                     valueAccessor()(newlyInputValue);
                  }
                  else
                  {
                     model.requestNewItem().done(() =>
                     {
                        valueAccessor()(newlyInputValue);
                     });
                  }
               }

               model.afterKeyBindingChangeCallbackFunction();
            }
         })
         .fail(() =>
         {
            var editPropertyObserverable = model.editingItem[model.editProperty];
            if (model.isNewItem())
            {
               $($element).focus().select();
            }
            else
            {
               model.silenceDependency(() =>
               {
                  model.mapJsToEditingItem(model.originalKeyStore);
                  // Force the UI update it again
                  editPropertyObserverable.valueHasMutated();
                  $($element).focus().select();
               }, model);
            }
         });
   }

   // Extension method for key/multikey
   export module key.utils
   {
      export var TRY_RETRIEVE_KEY_ONCE: string = "TRY_RETRIEVE_KEY_ONCE";

      export function syncKeysStoreWithViewModel(model: IAppViewModel): any
      {
         return copyKey(model);
      }

      export function copyOriginalKey(isNewItem: boolean, model: IAppViewModel): any
      {
         if (isNewItem)
            return {};

         model.originalKeyStore = copyKey(model);
      }

      export function isTryRetrieveOnce($target: JQuery): boolean
      {
         var val = $target.data(TRY_RETRIEVE_KEY_ONCE);

         //reset back it to undefined so will only call once
         $target.data(TRY_RETRIEVE_KEY_ONCE, undefined);

         return val;
      }

      export function isSameKeyValue(keyNew: any, keyOld: any): boolean
      {
         if (keyNew == keyOld)
            return true;

         if (keyNew != null && keyOld != null)
            if (keyNew.toString().toLowerCase() == keyOld.toString().toLowerCase())
               return true;

         return false;
      }

      function copyKey(model: IAppViewModel): any
      {
         var temp = {};
         _.each(model.editPropertyFields, (property: string) =>
         {
            temp[property] = ko.unwrap(model.editingItem[property]);
         });
         return temp;
      }

      // I am trying to not expand the code base of explorerToggle and filter binding
      // due to we are going to rewrite it.
      export function notifyKeyEventChange(target: JQuery): void
      {
         var bindInfo: string = target.data("bind");
         if (bindInfo && (bindInfo.indexOf("key:") != -1 || bindInfo.indexOf("multikey:") != -1))
         {
            // key binding change fire once
            target.data(TRY_RETRIEVE_KEY_ONCE, true);

            // Fire the change event so bindings 
            target.change();
         }
      }
   }
}