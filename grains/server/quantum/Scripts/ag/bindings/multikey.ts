/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="key.ts" />

module ag
{
   var currentKeyStore: any = {},
      silenceMultikeyChangeEvent: boolean = false;

   ko.bindingHandlers["multikey"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var rootViewModel: AppViewModel = <AppViewModel>bindingContext.$root,
            applyBindingDoneSubToken;

         rootViewModel.copyOriginalKeyCallBack = key.utils.copyOriginalKey;

         applyBindingDoneSubToken = PubSub.subscribe(topics.ApplyBindingDone, () =>
         {
            ko.utils.registerEventHandler(element, "change", () =>
            {
               if (ko.unwrap(rootViewModel.updatingModel) || silenceMultikeyChangeEvent)
                  return;

               // For radio button group, the CHANGE event fires before the binding finish
               // temp delay this value
               _.delay(() =>
               {
                  currentKeyStore = key.utils.syncKeysStoreWithViewModel(rootViewModel);

                  rootViewModel.publishViewModelUpdatingEvent(true);
                  getEntity(rootViewModel, currentKeyStore).always(() =>
                  {
                     rootViewModel.publishViewModelUpdatingEvent(false);
                  });
               }, 100);
            });
         });

         // Dispose	
         ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
         {
            PubSub.unsubscribe(applyBindingDoneSubToken);
         });
      }
   };

   function getEntity(model: AppViewModel, keysObject: any): JQueryPromise<any>
   {
      if (model.editUrl && model.itemKey)
      {
         var postData = { throwOnNotFound: false, edit: true },
            net = model.net;

         $.extend(postData, keysObject);

         var deferred = $.Deferred();
         var promise = net.getJson({ url: model.editUrl }, postData).done((result) =>
         {
            var isNewItem = model.isNewItem();

            // If a matching entity was found, load it and then navigate to it
            // (navigating won't cause it to be reloaded)
            if (result && result.data)
            {
               model.loadItemThenNavigate(result, postData, true, true);
            }
            else if (!isNewItem)
            {
               keyChangeConfirmationViewModel.init(<IConfirmationInitOptions>{
                  deferred: deferred,
                  confirmationId: null,
                  messages: [strings.keyChange1, strings.keyChange2],
                  action: "",
                  data: null,
                  net: net,
               });
            }
         });
         // chain the deferred object if the status has been changed
         processKeyChangeHandler(deferred, model);

         return promise;
      }

      return $.Deferred().resolve();
   }

   function processKeyChangeHandler(deferred: JQueryDeferred<string>, model: AppViewModel): void
   {
      deferred.done((result) =>
      {
         silenceMultikeyChangeEvent = true;
         switch (result)
         {
            case "doNew":
               model.createItem(true).done(() =>
               {
                  model.silenceDependency(() =>
                  {
                     model.mapJsToEditingItem(currentKeyStore);
                  }, model);
               });
               break;
            case "doCopy":
               model.copyAndApply();
               break;
            case "doCancel":
               model.silenceDependency(() =>
               {
                  //reset back to the old keys
                  model.mapJsToEditingItem(model.originalKeyStore);
               }, model);
               break;
         }
         silenceMultikeyChangeEvent = false;
      });
   }
} 