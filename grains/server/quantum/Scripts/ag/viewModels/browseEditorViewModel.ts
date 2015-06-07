/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../../ts/global.d.ts" />

module ag
{
   export interface IBrowseEditorOptions
   {
      action: string;
      additionalFields: string;
      afterItemSelectedFn: string;
      context: any;
      controller: string;
      editItem: any;
      parentName: string;
      typeMetaDataUrl: any;
   }

   export class BrowseEditorViewModel
   {
      context: any;
      private net: ag.utils.Network;
      action: string;
      controller: string;
      createActionName: string;
      copyActionName: string;
      deleteActionName: string;
      parentSelected = ko.observable(false);
      cleanItem: any;
      dirtyFlag: any;
      editingItem: any;
      updatingModel = ko.observable(false);
      menuCommands: any = {};
      actions: any;
      typeMetaDataUrl: any;

      constructor(public options: IBrowseEditorOptions)
      {
         this.context = options.context;
         this.net = new ag.utils.Network(),
         this.action = options.action,
         this.controller = options.controller,
         this.createActionName = 'create' + options.parentName,
         this.copyActionName = 'copy' + options.parentName,
         this.deleteActionName = 'delete' + options.parentName,

         this.editingItem = options.editItem;
         this.dirtyFlag = new ko.DirtyFlag(this.editingItem, false);
         this.typeMetaDataUrl = options.typeMetaDataUrl;

         this.menuCommands.newParentCommand = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  this.net.getJson(this.createActionName, {})
                     .done((response) =>
                     {
                        this.updateEditingItem(response.data, response.lookups);
                     })
                     .always(complete);
               }
            });

         this.menuCommands.deleteParentConfirmationCommand = ko.command(
            {
               execute: () =>
               {
                  var action = this.actions[this.deleteActionName];
                  action.isLoaded(true);
                  action.showDialog(true);
               }
            });

         this.menuCommands.copyParentCommand = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  var params = ko.mapping.toJS(this.editingItem);
                  this.net.getJson(this.copyActionName, params)
                     .done((response) =>
                     {
                        this.updateEditingItem(response.data, response.lookups);
                     })
                     .always(complete);
               },
               canExecute: (isExecuting) =>
               {
                  return !isExecuting && this.parentSelected();
               }
            });


         this.menuCommands.rejectChangesCommand = ko.command(
            {
               execute: () =>
               {
                  this.updateEditingItem(this.cleanItem);
               },
               canExecute: () =>
               {
                  return true;  // this.dirtyFlag().isDirty();
               }
            });

         this.menuCommands.applyChangesCommand = ko.asyncCommand(
            {
               execute: (completed) =>
               {
                  this.applyChanges().always(completed);
               },
               canExecute: (isExecuting) =>
               {
                  return !isExecuting;  //&& this.dirtyFlag().isDirty(); todo: Commented out for performance reasons
               }
            });

         this.actions = {};
         this.actions[this.deleteActionName] =
         {
            showDialog: ko.observable(false),
            invokeCommand: ko.asyncCommand(
            {
               execute: (parentViewModel, complete) =>
               {
                  this.deleteItem().always(complete);
               }
            }),
            isLoaded: ko.observable(false)
         };

      }

      deleteItem(): JQueryPromise<any>
      {
         return this.net.postJson(this.deleteActionName, this.getPayload())
            .then((response) =>
            {
               this.updateEditingItem(response.data, response.lookups);
               this.actions[this.deleteActionName].showDialog(false);
            });
      }

      createItem(): void
      {
         this.updateEditingItem(this.editingItem);
         this.parentSelected(false);
      }

      itemSelected(items)
      {
         var item = items;
         if (_.isArray(item) && item.length > 0)
            item = item[0];

         if (this.action)
         {
            this.loadFullItem(item, this.action)
               .done((response) =>
               {
                  this.updateItem(response.data, response.lookups);
               });
         }
         else
         {
            this.updateItem(item);

         }
      }

      private updateItem(data: any, lookups?: any)
      {
         this.updateEditingItem(data, lookups);
         if (this.context && this.options.afterItemSelectedFn)
         {
            utils.callDescendantFunction(this.context, this.options.afterItemSelectedFn);
         }

      }


      private getPayload()
      {
         var payload: any =
            {
               browseData: ko.mapping.toJS(this.editingItem)
            };

         if (this.options.additionalFields)
         {
            $.extend(payload, utils.getAdditionalFieldsFromModel(
               this.options.additionalFields,
               this.context.editingItem));
         }
         else
         {
            payload.data = ko.mapping.toJS(this.context.editingItem || {});
         }

         return payload;
      }

      private applyChanges(): JQueryPromise<any>
      {
         return this.net.postJson(this.action, this.getPayload())
            .then((response) =>
            {
               this.updateEditingItem(response.data);
            });
      }

      beforeBrowse(event): JQueryPromise<any>
      {
         var deferred = $.Deferred();
         if (!this.dirtyFlag().isDirty())
         {
            deferred.resolve();
         }
         else
         {
            if (ag.utils.validate(this.editingItem).length > 0)
            {
               deferred.reject();
            }
            else
            {
               if (this.action)
               {
                  this.applyChanges().then(
                  () => { deferred.resolve(); },
                  () => { deferred.reject(); });
               }
               else
               {
                  deferred.resolve();
               }
            }
         }
         return deferred.promise();
      }

      updateEditingItem(item: any, lookups?: any): void
      {
         this.context.updatingModel(true);
         this.cleanItem = item;
         ko.mapping.fromJS(item, this.editingItem);
         ag.utils.resetValidation(this.editingItem);
         ag.updateGrids(item, this.context.grids[this.options.parentName.toCamelCase()]);
         this.context.updatingModel(false);
         this.dirtyFlag().reset();
         this.parentSelected(true);
         if (lookups)
         {
            ag.utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups);
         }
      }

      private loadFullItem(item, action): JQueryPromise<any>
      {

         return this.net.getJson(action, ko.mapping.toJS(item));
      }
   }

   export function createBrowseEditors(viewModel, browseEditors, model)
   {
      if (browseEditors)
      {
         _.each(browseEditors, (browse, key?: string) =>
         {
            viewModel.browseEditors[key] = new ag.BrowseEditorViewModel(
               {
                  editItem: getProperty(model, key),
                  afterItemSelectedFn: browse.afterItemSelectedFn,
                  context: viewModel,
                  action: browse.action,
                  controller: browse.controller,
                  parentName: browse.parentName,
                  additionalFields: browse.additionalFields,
                   typeMetaDataUrl: viewModel.typeMetaDataUrl
               });
         });
      }
   };
}
