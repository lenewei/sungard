/// <reference path="GridViewModel.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../../ts/global.d.ts" />

module ag
{
   export interface IGridEditorOptions
   {
      area: string;
      actionViewModel?: any;
      additionalFields: string;
      controller: string;
      dependencies: any;
      dependencyProxy?: any;
      itemDisplayName: string;
      includeModel: boolean;
      itemKey: string;
      name: string;
      responseOnly: any;
      postOnly: any;
      suffixActionNames: boolean;
      viewModel: any;
      copyGetActionName?: string;
      createGetActionName?: string;
      createPostActionName?: string;
      deletePostActionName?: string;
      editGetActionName?: string;
      editPostActionName?: string;
      savePostActionName?: string;
   }

   export enum EditMode
   {
      Edit,
      New,
      ConfirmDelete
   };

   export enum EditAction
   {
      None,
      Update,
      Delete,
      All
   };

   var generateActionName = function (action: string, name: string, controller: string, suffix: boolean)
   {
      return (controller && !suffix) ? action : action + name;
   };

   var createUrl = function (action, controller)
   {
      if (!controller)
      {
         return action;
      }

      return { controller: controller, action: action };
   };

   export class GridEditorViewModel
   {
      private area: string;
      private selected: SelectedViewModel;
      private itemKey: string;
      private mode: any;
      private name: string;
      private controller: string;
      private suffixActionNames: boolean;
      private itemDisplayName: string;
      private defaultEditActionName: string;
      private defaultCreateActionName: string;
      private defaultCopyActionName: string;
      private defaultDeleteActionName: string;
      private editGetActionName: string;
      private editPostActionName: string;
      private createGetActionName: string;
      private createPostActionName: string;
      private copyGetActionName: string;
      private deletePostActionName: string;
      private savePostActionName: string;
      private dependencies: any;
      private viewModel: any;
      private itemDependenciesHandle: dependencies.IDependenciesHandle;
      unsavedChanges = ko.observable(false);
      item = ko.observable();
      private net: ag.utils.Network;
      showDialog = ko.observable(false).extend({ notify: "always" });
      selectedItem = ko.observable();
      closeDialogOnDeleteCancel = ko.observable(false);
      isEditorReadOnly = ko.observable(false);
      updatingModel = ko.observable(false);
      dialogTitle: KnockoutComputed<any>;
      grids: any = {};

      deleteItemCommand: KoliteAsyncCommand;
      copyItemCommand: KoliteAsyncCommand;
      saveItemCommand: KoliteAsyncCommand;

      canCreateFn: () => boolean;
      canDeleteFn: () => boolean;
      canEditFn: () => boolean;
      canCopyFn: () => boolean;
      canSaveFn: () => boolean;
      afterUpdate: (result: any) => void;

      constructor(public grid: GridViewModel, public options: IGridEditorOptions)
      {
         // Reinstate these checks when GridEditors are only 
         // being created for grids that are editable
         if (!options.name)
            throw Error("name must be supplied.");

         if (!options.itemKey)
            throw Error("itemKey must be supplied.");

         this.selected = grid.selected;
         this.itemKey = options.itemKey;
         this.mode = ko.observable(EditMode.Edit);
         this.name = options.name;
         this.controller = options.controller;
         this.suffixActionNames = options.suffixActionNames;
         this.itemDisplayName = options.itemDisplayName;
         this.defaultEditActionName = generateActionName('edit', this.name, this.controller, this.suffixActionNames);
         this.defaultCreateActionName = generateActionName('create', this.name, this.controller, this.suffixActionNames);
         this.defaultCopyActionName = generateActionName('copy', this.name, this.controller, this.suffixActionNames);
         this.defaultDeleteActionName = generateActionName('delete', this.name, this.controller, this.suffixActionNames);
         this.editGetActionName = options.editGetActionName || this.defaultEditActionName;
         this.editPostActionName = options.editPostActionName || this.defaultEditActionName;
         this.createGetActionName = options.createGetActionName || this.defaultCreateActionName;
         this.createPostActionName = options.createPostActionName || this.defaultCreateActionName ,
         this.copyGetActionName = options.copyGetActionName || this.defaultCopyActionName ,
         this.deletePostActionName = options.deletePostActionName || this.defaultDeleteActionName ,
         this.savePostActionName = options.savePostActionName || (options.controller ? 'save' : this.name + 's') ,
         this.dependencies = options.dependencies ,
         this.viewModel = options.actionViewModel || options.viewModel;                                   
         this.area = ag.area;
         if (options.area !== undefined)
            this.area = options.area;

         this.net = new ag.utils.Network({ area: this.area, controller: this.controller, responseOnly: options.responseOnly, postOnly: options.postOnly });         
         
         this.grid.menuCommands.editItemCommand = ko.asyncCommand(
         {
            execute: (completed) =>
            {
               this.editItem(this.selected.item()).always(completed);
            } ,
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.grid.isEnabled() && this.canEdit(this.selected.item());
            } ,
            deferCanExecute: true
         });

         this.grid.menuCommands.saveItemsCommand = ko.asyncCommand(
         {  
            execute: (data, event, completed) =>
            {
               this.saveItems().always(completed);
            }
         });

         this.grid.menuCommands.newItemCommand = ko.asyncCommand(
         {
            execute: (completed) =>
            {
               this.newItem().always(completed);
            } ,
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.grid.isEnabled() && this.canCreate();
            } ,
            deferCanExecute: true
         });

         this.grid.menuCommands.copyItemCommand = ko.asyncCommand(
         {
            execute: (completed) =>
            {
               this.copyItem(this.selected.item()).always(completed);
            } ,
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.grid.isEnabled() && this.canCopy(this.selected.item());
            }
         });

         this.grid.menuCommands.deleteItemCommand = ko.asyncCommand(
         {
            execute: (completed) =>
            {
               this.deleteItem(this.selected.item()).always(completed);
            } ,
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.grid.isEnabled() && this.canDelete(this.selected.item());
            } ,
            deferCanExecute: true
         });

         this.grid.menuCommands.revertItemCommand = ko.asyncCommand(
         {
            execute: (completed) =>
            {
               this.deleteItem(this.selected.item()).always(completed);
            } ,
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.grid.isEnabled() && this.unsavedChanges();
            }
         });

         this.deleteItemCommand = ko.asyncCommand(
         {
            execute: (completed) =>
            {
               this.deleteItem(this.item(), false).always(completed);
            } ,
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.canDelete(this.item());
            } ,
            isVisible: () =>
            {
               return this.mode() === EditMode.Edit;
            }
         });

         this.copyItemCommand = ko.asyncCommand(
         {
            execute: (completed) =>
            {
               this.copyItem(this.item(), false).always(completed);
            } ,
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.canCopy(this.item());
            } ,
            isVisible: () =>
            {
               return this.mode() === EditMode.Edit;
            }
         });

         this.saveItemCommand = ko.asyncCommand(
         {
            execute: (data, event, completed) =>
            {
               this.saveItem(data, event).always(completed);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.canSave(this.item());
            }
         });

         this.dialogTitle = ko.computed(() =>
         {
            if (this.mode() === EditMode.ConfirmDelete)
            {
               return strings.confirmDel;
            }

            return "{0} {1}".format(this.mode() === EditMode.New ? strings.newLabel :strings.edit, this.itemDisplayName);
         });

         // force grids to re-render when the isEnabled flag changes
         grid.isEnabled.subscribe(() =>
         {
            grid.items.valueHasMutated();
         });
      }

      overrideViewModel(viewModel: any)
      {
         this.viewModel = viewModel;
      }

      private canDoAction(fn: () => boolean)
      {
         return fn ? fn() : true;
      }

      canCreate()
      {
         return this.canDoAction(this.canCreateFn);
      }

      canCopy(data)
      {
         return this.canDoAction(this.canCopyFn) && data;
      }

      canEdit(data)
      {
         return this.canDoActionWithRestriction(data, this.canEditFn, EditAction.Update);
      }

      canDelete(data): boolean
      {
         return this.canDoActionWithRestriction(data, this.canDeleteFn, EditAction.Delete);
      }

      canSave(data): boolean
      {
         return this.canDoActionWithRestriction(data, this.canSaveFn, EditAction.None);
      }

      private canDoActionWithRestriction(data: any, canActionFn : () => boolean, restrictionType: number): boolean
      {
         if (!data)
            return false;
         
         var canAction = this.canDoAction(canActionFn);
         if (!canAction)
            return false;
         
         var restriction = data.restriction ? ko.utils.unwrapObservable<EditAction>(data.restriction) : EditAction.None;
         return !(restriction & restrictionType);
      }

      editItem(item, displayModalLoading = true): JQueryPromise<any>
      {
         this.mode(EditMode.Edit);

         if (displayModalLoading)
         {
            this.showDialog(false);
            dom.displayModalLoading();
         }
 
         if (item == null) // didn't select any item for editing
         {
            var promise = $.Deferred();
            return promise.reject(item);
         }

         var params = {};
         params[this.itemKey] = item[this.itemKey];
         this.extendPayloadWithAdditionalFields(params);

         return this.net.getJson(createUrl(this.editGetActionName, this.controller), params)
            .done((response) =>
            {
               this.setEditingItem(response.data, response.lookups);
               this.showDialog(true);
            })
            .fail(() =>
            {
               dom.hideModalLoading();
            });
      }

      saveItems(): JQueryPromise<any>
      {
         return this.postItem(this.grid.items(), this.savePostActionName, (response) =>
         {
            if (response.hasErrors)
               return;

            this.grid.loadGridData(response);
         } );
      }

      newItem(): JQueryPromise<any>
      {
         this.mode(EditMode.New);

         dom.displayModalLoading();

         var payload = {};
         this.extendPayloadWithAdditionalFields(payload);
         return this.net.getJson(createUrl(this.createGetActionName, this.controller), payload)
            .done((response) =>
            {
               this.setEditingItem(response.data, response.lookups);
               this.showDialog(true);
            })
            .fail(() =>
            {
               dom.hideModalLoading();
            });
      }

      saveItem(data, event : JQueryEventObject): JQueryPromise<any>
      {
         var m = this.mode();
         if (m === EditMode.ConfirmDelete)
            return this.deleteRequest();

         if (m === EditMode.New)
            return this.createRequest();

         if (m === EditMode.Edit)
            return this.saveRequest();
      }

      cancel()
      {
         if (!this.closeDialogOnDeleteCancel() && this.mode() === EditMode.ConfirmDelete)
         {
            this.mode(EditMode.Edit);
            this.isEditorReadOnly(false);
            return;
         }

         this.showDialog(false);
         this.isEditorReadOnly(false);
      }

      copyItem(item, displayModalLoading = true): JQueryPromise<any>
      {
         this.mode(EditMode.New);

         if (displayModalLoading)
            dom.displayModalLoading();

         var params = ko.mapping.toJS(this.selected.item());
         this.extendPayloadWithAdditionalFields(params);
         return this.net.getJson(createUrl(this.copyGetActionName, this.controller), params)
            .done((response) =>
            {
               this.setEditingItem(response.data, response.lookups);
               this.showDialog(true);
            })
            .fail(() =>
            {
               dom.hideModalLoading();
            });
      }

      deleteItem(item, displayModalLoading = true): JQueryPromise<any>
      {
         if (item == null) // didn't select any item 
         {
            var promise = $.Deferred();
            return promise.reject(item);
         }

         return this.editItem(ko.mapping.toJS(this.selected.item()), displayModalLoading)
         .done(() =>
         {
            //this.showDialog(true);
            this.isEditorReadOnly(true);
            this.mode(EditMode.ConfirmDelete);
            this.closeDialogOnDeleteCancel(displayModalLoading);
         } );
      }

      revertChanges()
      {
         if (this.unsavedChanges())
         {
            this.grid.refresh(true);
            this.unsavedChanges(false);
         }
      }

      private setEditingItem(item, lookups)
      {
         // Dipose old item
         if (this.itemDependenciesHandle)
            this.itemDependenciesHandle.dispose();

         if (this.item())
            ag.disposeMappedMetaObservable(this.item());

         // Set new item and lookup
         if (lookups)
            utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups);

         this.item(ag.mapFromJStoMetaObservable(item, this.isEditorReadOnly));
         ag.updateGrids(item, this.grid.grids);
         this.selectedItem(this.item());

         this.itemDependenciesHandle = this.dependencies ? ag.dependencies.init(this.item(), this.dependencies, this.options, this, false) : null;
      }

      private deleteRequest(): JQueryPromise<any>
      {
         return this.postItem(this.item(), this.deletePostActionName, this.closeDialogAndUpdate).done(()=>
         {
            this.selected.reset();
         });
      }

      private saveRequest(): JQueryPromise<any>
      {
         return this.postItem(this.item(), this.editPostActionName, this.closeDialogAndUpdate);
      }

      private createRequest(): JQueryPromise<any>
      {
         return this.postItem(this.item(), this.createPostActionName, this.closeDialogAndUpdate);
      }

      private postItem(item, actionName, success): JQueryPromise<any>
      {
         return ag.utils.validateAndShowMessages(item)
		 .then(() =>
	         {
	            var payload = { data: ko.mapping.toJS(item) };

	            this.extendPayloadWithAdditionalFields(payload);
	            $.extend(payload, { options: this.grid.getGridViewOptions() });

	            return this.net.postJson(createUrl(actionName, this.controller), () => payload)
	               .done((response) =>
	               {
	                  if (_.isUndefined(response.data))
	                  {
	                     var responseError = $.parseJSON(response.responseText);
	                     messages.error(responseError["errors"]);
	                     return;
	                  }
	                  success.call(this, response);
	               });
	         });
      }

      private closeDialogAndUpdate(result)
      {
         this.grid.loadGridData(result);

         this.unsavedChanges(true);
         var proxy = this.options.dependencyProxy;
         if (proxy)
         {
            if (proxy())
            {
               proxy(null);
            }
            else
            {
               proxy.valueHasMutated();
            }
         }

         if (this.afterUpdate)
            this.afterUpdate(result);

         this.showDialog(false);
         this.isEditorReadOnly(false);

         if (result && result.message)
            messages.show(result.message, result.messageType);
      }

      private extendPayloadWithAdditionalFields(payload)
      {
         var additionalPayload = {};

         if (this.options.additionalFields && this.options.additionalFields.length > 0)
         {
            var additionalFields = this.options.additionalFields.split(",");

            _.each(additionalFields, (field) =>
            {
               setProperty(additionalPayload, field, getProperty(this.viewModel, field));
            } );

            $.extend(payload, ko.mapping.toJS(additionalPayload));
         }
         else if (this.options.includeModel)
         {
            $.extend(payload, ko.mapping.toJS(this.viewModel));
         }
      }

      reset()
      {
         this.unsavedChanges(false);
      }
   }
}