/// <reference path="../../ts/global.d.ts" />
/// <reference path="dealMap.ts" />
/// <reference path="appViewModel.ts" />

module ag
{
   export class DealingViewModel extends AppViewModel
   {
      itemTypeIsDeal = ko.observable(true);
      analysisCodesNeedUpdate = ko.observable(false);
      isEditorLoaded = ko.observable(false);

      constructor(public options: IAppViewModelOptions)
      {
         super(options);

         // Register ChildWindow Opened and Closing handlers to be overridden in viewModels
         // Wouldn't have thought that the inline cast would be required for this
         // could be something that is resolved in a later version of TS
         (<any>ag).childWindowOpened = (viewModel, windowHandle: Window) =>
         {
            this.childWindowOpened(viewModel, windowHandle);
         };

         (<any>ag).childWindowClosing = (viewModel, result, saved, windowHandle: Window) =>
         {
            this.childWindowClosing(viewModel, result, saved, windowHandle);
         };
      }

      childWindowOpened(viewModel, windowHandle: Window)
      {
         // Example implementation:

         // Convert to JS
         //var data = ko.mapping.toJS(this.editingItem);

         // Execute mapping in context of child window
         //windowHandle.ko.mapping.fromJS(data, viewModel.editingItem);
      }

      childWindowClosing(viewModel, result, saved, windowHandle: Window)
      {
         // Given a result from a child window display it
         if (result && result.message)
            messages.show(result.message, result.messageType);

         return true;
      }

      editItemRequest(key: any): JQueryPromise<any>
      {
         var params: any = {};
         params[this.editProperty] = key;

         return this.itemRequest("edit", params, false);
      }

      // virtual method for RepoDealingViewModel
      dealNumberChanged(dealNumber: number) { }

      init(itemModel)
      {
         super.init(itemModel);

         this.initAnalysisCodeDefaulting();
         this.setupDealMapGrid();

         // Notify opener
         if (window.opener && (<any>window.opener).ag && (<any>window.opener).ag.childWindowOpened)
            (<any>window.opener).ag.childWindowOpened(this, window);
      }

      initDependencies(editingItem: any)
      {
         var instrument = this.editingItem.instrument,
            loadEditor = () =>
            {
               if (!this.isEditorLoaded() && !this.updatingModel())
               {
                  this.updatingModel(true);
                  this.isEditorLoaded(true);
                  this.updatingModel(false);
               }
            };
         if (instrument)
         {
            if (instrument())
            {
               loadEditor();
            }
            else
            {
               instrument.subscribe(() =>
               {
                  loadEditor();
               });
            }
         }

         super.initDependencies(editingItem);
      }

      beforeApplyBindings()
      {
         var dealMapGrid = this.grids.dealMap;
         if (dealMapGrid)
         {
            var dealMapActions = dealMapGrid.actions;
            if (dealMapActions)
            {
               _.each(dealMapActions, (action: Action) =>
               {
                  var afterInvokeFn = action.afterInvoke;
                  action.afterInvoke = (result, parentViewModel) =>
                  {
                     action.updateItem(result, this);
                     afterInvokeFn(result, parentViewModel);
                  };
               });

               var appendFunction = 'appendDealMapId';
               dealMapGrid[appendFunction] = (action, payload) =>
               {
                  var selectedItem = dealMapGrid.selected.item();
                  if (selectedItem)
                     payload['dealMapId'] = ko.unwrap(selectedItem.dealMapId);
               };

               var bulkReplaceAction = dealMapActions.replaceDealMap;
               if (bulkReplaceAction)
               {
                  bulkReplaceAction.createCustomPayload = (data) =>
                  {
                     var payload = {}; // ko.mapping.toJS(data);

                     var selectedItem = dealMapGrid.selected.item();
                     if (selectedItem)
                        payload['dealMapId'] = ko.unwrap(selectedItem.dealMapId);

                     return payload;
                  };
                  bulkReplaceAction.beforeInvokeCallbackFunction = appendFunction;
               }
            }
         }
      }

      initAnalysisCodeDefaulting()
      {
         var leftLeg = this.editingItem.leftLeg,
            rightLeg = this.editingItem.rightLeg,
            analysisCodes = this.editingItem.analysisCodes || (leftLeg ? leftLeg.analysisCodes : undefined);
         if (analysisCodes)
         {
            analysisCodes.refresh = () =>
            {
               this.analysisCodesNeedUpdate(true);
               return true;
            };

            if (rightLeg && rightLeg.analysisCodes)
            {
               rightLeg.analysisCodes.refresh = () =>
               {
                  this.analysisCodesNeedUpdate(true);
                  return true;
               };
            }

            var analysisCodesActive = this.tabs.analysisCodes;
            if (analysisCodesActive)
            {
               analysisCodesActive.subscribe((value) =>
               {
                  if (value && this.analysisCodesNeedUpdate())
                  {
                     this.net.postJson("updateAnalysisCodes", () => ko.mapping.toJS(this.editingItem)).then((result) =>
                     {
                        var data = result.data;
                        if (data)
                        {
                           if (data.analysisCodes)
                           {
                              this.editingItem.analysisCodes(ko.unwrap(ko.mapping.fromJS(data.analysisCodes)));
                           }

                           if (data.leftLeg && data.leftLeg.analysisCodes)
                           {
                              this.editingItem.leftLeg.analysisCodes(ko.unwrap(ko.mapping.fromJS(data.leftLeg.analysisCodes)));
                           }

                           if (data.rightLeg && data.rightLeg.analysisCodes)
                           {
                              this.editingItem.rightLeg.analysisCodes(ko.unwrap(ko.mapping.fromJS(data.rightLeg.analysisCodes)));
                           }
                        }

                        this.analysisCodesNeedUpdate(false);
                     });
                  }
               });
            }
         }
      }

      setupDealMapGrid()
      {
         var dealMapGrid = <GridViewModel>this.grids.dealMap;
         if (dealMapGrid)
         {
            var dealMap = new DealMapViewModel(this.editingItem, dealMapGrid, this.isNewItem);
            dealMapGrid.menuCommands.customizeCommand = ko.command(
               {
                  execute: () =>
                  {
                     dealMap.customize();
                  },
                  isVisible: () =>
                  {
                     return dealMap.customizeVisible();
                  }
               });

            var editor = dealMapGrid.editor;
            if (editor)
            {
               (<any>dealMapGrid).dealMap = dealMap;
               editor.canCreateFn = dealMap.canCreate;
               editor.canEditFn = dealMap.canEdit;
               editor.canDeleteFn = dealMap.canDelete;
               editor.canCopyFn = dealMap.canCopy;
            }
         }
      }

      editItem(itemViewModel: any) 
      {
         if (itemViewModel.dealNumber)
            this.navigateToItem(itemViewModel.dealNumber);
      }

      navigateToItem(keyValue: any)
      {
         if (!$.isPlainObject(keyValue))
            this.nav.navigate({ dealNumber: keyValue });
         else
            this.nav.navigate(keyValue);
      }

      refreshItem(): JQueryPromise<any>
      {
         // Reload the editing item
         var key = (this.editingItem && this.editingItem[this.editProperty]) ?
            ko.unwrap(this.editingItem[this.editProperty]) : null;

         if (!key)
            throw Error("missing key field");

         return this.editItemRequest(key);
      }

      refreshPageTitle(...args: any[])
      {
         // Get the dealNumber off the editing item, 
         // or what was passed to us.
         var dealNumber = this.editingItem.dealNumber();
         if (args && args.length === 1)
            dealNumber = args[0];

         // Add the Image number if viewing an image
         if (_.has(this.editingItem, "usingImage") && this.editingItem.usingImage())
            dealNumber += " - " + strings.image + " " + this.editingItem.imageNumber();

         // Refresh the page title
         this.pageTitle([{ "keyProperty": utils.documentTitle(this.applicationTitle, dealNumber) }]);
      }

      navigateGetParams(): any
      {
         return { dealNumber: null, view: null, copy: null };
      }

      navigateDelegator(args: any[], currrentContext: any): void
      {
         var navEntry = args[0];
         var dealNumber = navEntry.params.dealNumber;

         if (dealNumber)
         {
            // If not already loaded, load the deal
            if (parseInt(dealNumber) !== this.editingItem.dealNumber())
            {
               // Clear any existing data and form validation
               this.resetEditor();

               // Request the selected item
               this.editItemRequest(dealNumber);

               // We've just selected a new item so close the browse list, if any
               this.grid.showList(false);
            }

            // Set the title      
            this.refreshPageTitle(dealNumber);
         }
         else
         {
            this.resetEditor();
            this.actionInvoked = true;
         }

         this.viewNavigation(navEntry.params.view);
      }

      loadItem(result, isNewItem: boolean): JQueryDeferred<any>
      {
         if (!this.isEditorLoaded() && !isNewItem)
         {
            this.updatingModel(true);
            this.isEditorLoaded(true);
            this.updatingModel(false);
         }

         var deferred = super.loadItem(result, isNewItem);
         this.analysisCodesNeedUpdate(false);
         deferred.then(this.subscribeAnalysisCodes);

         return deferred.resolve();
      }

      subscribeAnalysisCodes = () =>
      {
         var call = (obj, property) =>
         {
            if (property.toLowerCase() != "analysiscodes")
               return false;

            var codes = ko.unwrap(obj[property]);
            if (!_.isArray(codes))
               return false;

            _.forEach(codes, (code: any) =>
            {
               code.value.subscribe(() =>
               {
                  obj[property].valueHasMutated();
               });
            });

            return false;
         };

         utils.walkObject(this.editingItem, call);
      };

      analyseSubActionCallback(model: any, actionData : any)
      {
         //This is an InvokeCallbackFunction for Unwind SubAction
         model.data = actionData;
      }

   }
}
