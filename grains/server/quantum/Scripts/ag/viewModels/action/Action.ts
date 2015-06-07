interface IActionOptions
{
   action: any;
   data: any;
   model: any;
   subActions: Array<any>;
   typeMetadata: any;
   typeMetaDataUrl: string;
   additionalFields: string;
   dependencies: any;
   path: string;
   lookups: any;
   lookupData: any;
   responseOnly: string;
   postOnly: string;
   performGetRequestOnShow: boolean;
   downloadUrl: string;
   fieldCategories: any;
   performActionBeforeNavigation: boolean;
   beforeInvokeCallbackFunction: string;
   replaceCurrentPage: boolean;
   completed: any;
   parentAction: any;
   includeCompleteModel: boolean;
   closeParentDialogWhenComplete: boolean;
   dialogRequiredWhen?: Function;
   parentViewModel: any;
}

// Action definition and any related functionality
module ag 
{
   "use strict";

   export class Action 
   {
      actionDetails: any;
      private data: any;
      private columnName: any;
      private completedBehaviour;
      actionInvoked = false;
      private completedAction;
      private beforeInvokeCallbackFunction: string;
      private afterInvokeCallbackFunction: string;

      model = {};
      grids = {};
      showDialog = ko.observable(false);
      updatingModel = ag.createUpdatingModelHelper();
      lookups: any;
      lookupData: any;
      subActions = {};
      responseOnly: any;
      postOnly: any;
      invokeCommand: KoliteCommand;
      typeMetadata: any;
      net: utils.Network;
      createCustomPayload: (data: any) => any;
      afterInvoke: (result, parentViewModel) => void;
      fieldCategories: any;
      isSubmitRequest: boolean;
      isEditorReadOnly = ko.observable(false);
      isCopyAction: boolean;
      isLoaded = ko.observable(false);

      constructor(public options: IActionOptions, public isSubAction = false)
      {
         this.actionDetails = typeof (options.action) === "string" ? { "action": options.action } : options.action;
         this.data = options.data;

         // What to do when the Action completes successfully
         this.completedBehaviour = this.actionDetails.completed;
         if (isSubAction)
            this.completedBehaviour = options.completed;

         // Action to call on completion on this action if
         // completedBehaviour is set to "call" or "updateAndCall"
         this.isCopyAction = this.actionDetails.isCopyAction;
         this.completedAction = this.actionDetails.completedAction;
         this.beforeInvokeCallbackFunction = this.actionDetails.beforeInvokeCallbackFunction;
         this.afterInvokeCallbackFunction = this.actionDetails.afterInvokeCallbackFunction;
         this.lookups = options.lookups || {};
         this.lookupData = options.lookupData || {};
         this.responseOnly = options.responseOnly;
         this.postOnly = options.postOnly;
         this.fieldCategories = options.fieldCategories || {};

         // Create our network util instance
         this.net = new ag.utils.Network({ area: ag.area, controller: ag.controller, responseOnly: this.responseOnly, postOnly: this.postOnly });

         // Initialise
         this.createViewModel();

         // Initalise action invoke command
         this.initInvokeCommand(options);
      }

      findPrimaryBtn(buttons): any
      {
         if (!buttons)
            return undefined;

         var target;
         _.each(buttons,(b) =>
         {
            if (_.has(b, 'isPrimary') && b['isPrimary'] == true)
            {
               target = b;
               return false;
            }
         });
         return target;
      }

      private initInvokeCommand(options)
      {
         // Get the primary button and see if a disabled condition has been supplied.
         // Create a canExecute if supplied.
         var canExecute,
            canVisible,
            primaryButton = this.findPrimaryBtn(options.action.buttons),
            wrapFunction = (model, modelLogic) => eval(modelLogic);

         if (primaryButton)
         {
            var disabledString = primaryButton.disabled;
            if (disabledString)
               canExecute = (isExecuting) => !isExecuting && wrapFunction(this.model, disabledString);

            var visibleString = primaryButton.visible;
            if (visibleString)
               canVisible = () => wrapFunction(this.model, visibleString);
         }

         this.invokeCommand = ko.asyncCommand(
            {
               execute: (parentViewModel, event: JQueryEventObject, complete) =>
               {
                  if (this.options.beforeInvokeCallbackFunction)
                  {
                     var payload = ko.mapping.toJS(ko.unwrap(this.model) || {});
                     this.customCallback(this.options.beforeInvokeCallbackFunction, payload, parentViewModel);
                  }

                  this.invoke(parentViewModel, event, complete);
               },
               canExecute: (isExecuting) =>
               {
                  // Check if a user supplied canExecute has been supplied
                  return canExecute ? canExecute(isExecuting) : !isExecuting;
               },
               isVisible: () =>
               {
                  // Check if a user supplied canVisible has been supplied
                  return canVisible ? canVisible() : true;
               }
            });
      }

      public updateActionItem(result): JQueryPromise<any>
      {
         var deferred = $.Deferred();
         try
         {
            // Needed so that dependencies know not to fire
            this.updatingModel(true);

            var actionModel = this.model;
            if (!$.isEmptyObject(actionModel) && result.actionData)
            {
               ko.mapping.fromJS(result.actionData, actionModel);
               utils.resetValidation(actionModel);

               ag.updateGrids(result.actionData, this.grids);

               return deferred.resolve().promise();
            }
         }
         finally
         {
            this.updatingModel(false);
         }
         return deferred.resolve().reject();
      }

      show(parentViewModel)
      {
         // Check if a condition is in play for the dialogs display,
         // if not required invoke the action immediately.
         var requiredWhen = this.options.dialogRequiredWhen;
         if (_.isFunction(requiredWhen) && !requiredWhen())
            return this.invokeCommand.execute(parentViewModel);

         if (this.options.performGetRequestOnShow)
         {
            // On showing the dialog retrieve the
            // default values for action viewmodel
            this.actionInitialRequest(parentViewModel);
         }
         else 
         {
            utils.resetValidation(this.model);
            this.isLoaded(true);
            this.showDialog(true);
         }
      }

      updateItem(result, parentViewModel)
      {
         try
         {
            // Needed so that dependencies know not to fire
            if (parentViewModel.updatingModel)
               parentViewModel.updatingModel(true);

            // Action model updating
            this.updatingModel(true);

            ko.mapping.fromJS(result.data, this.data);
            utils.resetValidation(this.data);

            updateGrids(result.data, parentViewModel.grids);

            // Refresh the pageTitle if the method is available
            if (parentViewModel.refreshPageTitle)
               parentViewModel.refreshPageTitle();

            this.updateActionItem(result);
         }
         finally
         {
            this.updatingModel(false);
            if (parentViewModel.updatingModel)
               parentViewModel.updatingModel(false);
         }
      }

      clearItem(result, parentViewModel)
      {
         if (parentViewModel && parentViewModel.createItem)
            parentViewModel.createItem(true);
      }

      navigateToParent(result, parentViewModel)
      {
         if (parentViewModel && parentViewModel.navigateToParent)
            parentViewModel.navigateToParent();
      }

      refreshPage(result, parentViewModel)
      {
         // reset the current page into an empty status
         if (parentViewModel && parentViewModel.navigateToEmptyItem)
            parentViewModel.navigateToEmptyItem();

         _.delay(() =>
         {
            window.location.reload();
         }, 1000);
      }

      refreshItem(result, parentViewModel)
      {
         if (parentViewModel && parentViewModel.refreshItem)
            parentViewModel.refreshItem();
      }

      updateGrid(result, parentViewModel)
      {
         if (parentViewModel && parentViewModel.loadGridData)
            parentViewModel.loadGridData(result);
      }

      resetAndUpdateItem(result, parentViewModel)
      {
         // Reset and then update
         if (parentViewModel && parentViewModel.resetEditor)
            parentViewModel.resetEditor();

         this.updateItem(result, parentViewModel);
      }

      private customCallback(callback: string, data: any, parentViewModel: any)
      {
         if (callback.endsWith(")") || callback.endsWith(";"))
            throw new Error("CallbackFunctions should only contain the name of the function to be invoked without parentheses or a semi-colon.");

         // Validate the callback can be found
         var callbackFunction = parentViewModel[callback];
         if (!callbackFunction)
            throw new Error("CallbackFunction \"" + callback + "\" not found on " + utils.getConstructorName(parentViewModel));

         // Invoke the callback:
         // - this is the current action
         // - data is the payload being sent if calling a "before" callback
         // and for an "after" callback it is the result of the post
         callbackFunction.call(parentViewModel, this, data);
         //callbackFunction(this, data);
      }

      private invokeCompletedAction = function ()
      {
         if (!this.completedAction)
            throw new Error("completedBehaviour is set to \"call\" but no completedAction has been specified.");

         if (!this.actions[this.completedAction])
            throw new Error("The action \"" + this.completedAction + "\" specified for the completedAction cannot be found.");

         this.actions[this.completedAction]();
      };

      public getMessageFromResponse(result: any)
      {
         if (!result)
            return;

         if (result.hasErrors)
         {
            messages.error(result.errors[0]);
         }
         else
         {
            if (result.message != null)
               messages.show(result.message, result.messageType);
         }
      }

      private actionRequest(parentViewModel, event: JQueryEventObject): JQueryPromise<any>
      {
         var requestMethod = this.actionDetails.actionRequestMethod || "post";
         if (requestMethod === "post")
         {
            return ag.utils.validateAndShowMessages(this.model)
               .then(() => this.processActionRequest(parentViewModel, requestMethod));
         }
         return this.processActionRequest(parentViewModel, requestMethod);
      }

      private processActionRequest(parentViewModel, requestMethod: string): JQueryPromise<any>
      {
         var payload = ko.mapping.toJS(ko.unwrap(this.data) || {});
         parentViewModel = this.options.parentViewModel;

         if (!$.isEmptyObject(this.model))
            payload = { data: payload, actionData: ko.mapping.toJS(this.model) };

         if (parentViewModel.customizeActionPayload)
            parentViewModel.customizeActionPayload(payload);

         if (this.beforeInvokeCallbackFunction)
            this.customCallback(this.beforeInvokeCallbackFunction, payload, parentViewModel);

         var completed = (result) =>
         {
            this.getMessageFromResponse(result);

            if (this.isSubAction && this.options.closeParentDialogWhenComplete)
            {
               var parentAction = this.options.parentAction;
               if (parentAction)
               {
                  parentAction.actionInvoked = true;
                  parentAction.showDialog(false);
               }
            }

            // This will need extending to handle other variations
            // of completed behaviour but for now this is enough
            if (this.completedBehaviour === "updateItem")
               this.updateItem(result, parentViewModel);
            else if (this.completedBehaviour === "clearItem")
               this.clearItem(result, parentViewModel);
            else if (this.completedBehaviour === "refreshItem")
               this.refreshItem(result, parentViewModel);
            else if (this.completedBehaviour === "updateGrid")
               this.updateGrid(result, parentViewModel);
            else if (this.completedBehaviour === "resetAndUpdateItem")
               this.resetAndUpdateItem(result, parentViewModel);
            else if (this.completedBehaviour == "refreshPage")
               this.refreshPage(result, parentViewModel);
            else if (this.completedBehaviour == "navigateToParent")
               this.navigateToParent(result, parentViewModel);

            // Not supported yet
            //else if (completedBehaviour === "call")
            // invokeCompletedAction(result);
            //else if (completedBehaviour === "updateAndCall")
            //{
            // updateItem(result);
            // invokeCompletedAction(result);
            //}

            if (this.afterInvokeCallbackFunction)
               this.customCallback(this.afterInvokeCallbackFunction, result, parentViewModel);

            if (this.afterInvoke)
               this.afterInvoke(result, parentViewModel);

            return result;
         };

         if (this.isCopyAction && parentViewModel.copyItemRequest)
            return parentViewModel.copyItemRequest(this.actionDetails.action);

         return this.sendRequest(payload, requestMethod).then(completed);
      }

      public sendRequest(payload: any, requestMethod: string): JQueryPromise<any>
      {
         // Default
         if (requestMethod === "post")
            return this.net.postJson(this.actionDetails,() => payload);

         if (requestMethod === "get")
         {
            // Allowing a requestMethod of GET can only be done if the
            // performGetRequestOnShow is false, as MVC will not like 2 GET methods
            // where the only difference is parameters and not http verb.
            if (this.options.performGetRequestOnShow)
               throw new Error("Cannot perform a GET request when this Action already calls a GET action with the same name.");

            return this.net.getJson(this.actionDetails.action, payload);
         }

         throw new Error("{0} is an unknown request method.".format(requestMethod));
      }

      private actionInitialRequest(parentViewModel): JQueryPromise<any>
      {
         var action = this.getAction();
         dom.displayModalLoading();
         this.isLoaded(true);

         return this.net.getJson(action, this.getParams(parentViewModel))
            .done(result =>
         {
            // Check response to see if showing the dialog is actually 
            // required as we may be able to perform the acion sans dialog.
            if (result.dialogNotRequired)
               return this.invokeCommand.execute(parentViewModel);

            this.updateActionItem(result);
            this.showDialog(true);
         })
            .always(dom.hideModalLoading);
      }

      public getAction(): any
      {
         return this.actionDetails.controller || this.actionDetails.area ?
            {
               controller: this.actionDetails.controller || ag.controller,
               area: this.actionDetails.area || ag.area,
               action: this.actionDetails.action
            } : this.actionDetails.action;

      }

      // Initialization
      createViewModel()
      {
         // If a model has been supplied and we are not a subAction create an observable model
         // If we are a subAction simply use the model passed to us (as will already be observable)
         if (this.options.model)
            this.model = !this.isSubAction ? ag.mapFromJStoMetaObservable(this.options.model, this.isEditorReadOnly) : this.options.model;

         if (this.options.action.controller != undefined)
            this.actionDetails.controller = this.options.action.controller;

         if (this.options.action.area != undefined)
            this.actionDetails.area = this.options.action.area;

         // Transform any named lookup references
         utils.transformLookups(this.lookups, this.lookupData);

         // Create any supplied subActions
         if (!this.isSubAction && this.options.subActions && _.isArray(this.options.subActions))
         {
            _.forEach(this.options.subActions,(subAction) =>
            {
               var subActionOptions: any = $.extend({}, this.options);

               subActionOptions.action = subAction.action;
               subActionOptions.path = subAction.path;
               subActionOptions.includeCompleteModel = subAction.includeCompleteModel;
               subActionOptions.additionalFields = subAction.additionalFields;
               subActionOptions.isOpenAction = subAction.isOpenAction;
               subActionOptions.completed = subAction.completed;
               subActionOptions.performActionBeforeNavigation = subAction.performActionBeforeNavigation;
               subActionOptions.beforeInvokeCallbackFunction = subAction.beforeInvokeCallbackFunction;
               subActionOptions.closeParentDialogWhenComplete = subAction.closeParentDialogWhenComplete;

               subActionOptions.parentAction = this;

               // Set the parent model (already observable) onto the subActionOptions
               // This model will then be used rather than creating new models
               subActionOptions.model = this.model;

               // Clear subActions to avoid endless-loop
               subActionOptions.subActions = [];

               // Create and attach subAction to main Action
               this.subActions[subAction.action] = this.createSubAction(subAction, subActionOptions);
            });
         }

         if (this.options.typeMetadata && !$.isEmptyObject(this.options.typeMetadata))
         {
            // Store any type metadata
            this.typeMetadata = this.options.typeMetadata;

            // Create GridViewModels as required
            this.options.typeMetaDataUrl = utils.normalizeUrl(this.options.typeMetaDataUrl);
            ag.createGridViewModelsFromMetadata(this, this.typeMetadata, this.options.data/*editingItem*/, this.options, this.isEditorReadOnly, this.model/*actionViewModel*/);
         }

         if (!this.isSubAction && this.options.dependencies)
            ag.dependencies.init(this.model, this.options.dependencies, this.options, this);
      }

      createSubAction(subAction, subActionOptions): Action
      {
         if (subAction.isOpenAction)
         {
            return new OpenApplicationAction(subActionOptions, true);
         }
         else if (subAction.isDownloadAction)
         {
            return new DownloadApplicationAction(subActionOptions, true);
         }
         else if (subAction.isDialogAction)
         {
            return new DialogApplicationAction(subActionOptions, true);
         }
         else
         {
            return new Action(subActionOptions, true);
         }
      }

      resolveThePromise(complete): JQueryPromise<any>
      {
         var promise = $.Deferred();
         promise.always(complete);
         return promise.resolve().promise();
      }

      getPathFromResult(result: any): string
      {
         if (result.path && result.path.trim() !== "")
            return result.path;

         if (result.url && result.url.trim() !== "")
            return result.url;

         if (result.uri && result.uri.trim() !== "")
            return result.uri;

         if (result.data && result.data.trim() !== "")
            return result.data;

         return undefined;
      }

      invoke(parentViewModel, event: JQueryEventObject, complete): JQueryPromise<any>
      {
         return this.actionRequest(parentViewModel || this, event).always(complete);
      }

      getModel()
      {
         return this.model;
      }

      public getParams(parentViewModel?)
      {
         var payload = {};

         if (this.createCustomPayload)
            payload = this.createCustomPayload(this.data);
         else if (this.options.additionalFields)
            payload = ag.utils.getAdditionalFieldsFromModel(this.options.additionalFields, this.data);
         else if (this.options.includeCompleteModel)
            payload = ko.mapping.toJS(this.data || {});

         if (parentViewModel && parentViewModel.customizeActionPayload)
            parentViewModel.customizeActionPayload(payload);

         return payload;
      }

      updateData(data, columnName)
      {
         this.data = data;
         this.columnName = columnName;
         _.each(<any>this.subActions,(subAction: any) =>
         {
            subAction.data = data;
            subAction.columnName = columnName;
         });
      }
   }
}