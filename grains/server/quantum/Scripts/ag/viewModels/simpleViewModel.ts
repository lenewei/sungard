/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../models/MessagesViewModel.ts" />
/// <reference path="baseViewModel.ts" />
/// <reference path="gridViewModel.ts" />
/// <reference path="UpdatingModelHelper.ts" />
/// <reference path="browseEditorViewModel.ts" />

interface ISimpleViewModelOptions extends IViewModelOptions
{
   // Name of the primary action to be invoked
   primaryAction: string;
   primaryCommand: string;
   browseEditors: any;
   applicationHeaders: any;
   keyFields: string[];
   fieldCategories: any;
}

module ag 
{
   // Very simple ViewModel typically for One-Button-Applications
   //   - No "Browse"
   //   - No "New"
   //   - Single Editor
   //   - One primary action (typically) operating on a single record/values entered
   //   - Or a primary command
   export class SimpleViewModel extends BaseViewModel
   {
      editingItem: any = {};
      grids: any = {};
      menuCommands: any = {};
      actions: any = {};
      primaryAction: string;
      primaryCommand: string;
      primaryActionCommand: KoliteAsyncCommand;
      updatingModel: KnockoutComputed<any>;
      pageTitle = ko.observableArray([{ "keyProperty": strings.newLabel + " " + utils.documentTitle() }]);
      keyFields: string[] = [];
      fieldCategories: any = {};

      constructor(public options: ISimpleViewModelOptions)
      {
         super(options);

         this.updatingModel = ag.createUpdatingModelHelper();
         this.primaryAction = options.primaryAction || "edit";
         this.primaryCommand = options.primaryCommand;
         this.keyFields = options.keyFields;
         this.fieldCategories = options.fieldCategories;
      }

      init(itemModel)
      {
         this.editingItem = ag.mapFromJStoMetaObservable(itemModel, this.isEditorReadOnly);

         // Add these when we need to support them
         this.initGrids();
         this.initBrowseEditors();
         this.setupApplicationHeaders(this.editingItem, this.options.applicationHeaders);

         // Dependencies needs to come last - after the model has completed initialising
         this.initDependencies(this.editingItem);         

         utils.focusForm();
      }

      beforeApplyBindings()
      {
         if (!this.primaryCommand)
         {
            this.primaryActionCommand = ko.asyncCommand({
               execute: (complete) =>
               {
                  this.doPrimaryAction().always(complete);
               }
            });
         }
         else
         {
            var command = this.menuCommands[this.primaryCommand.toCamelCase()];
            if (!command)
               throw new Error("Unable to find command \"{0}\"".format(this.primaryCommand));

            this.primaryActionCommand = command;
         }
      }

      initGrids()
      {
         // TODO: Refactor this similar to createBrowseEditors

         // Create GridViewModels for each typeMetadata key
         var typeMetadata = this.options.typeMetadata || {};
         if (typeMetadata && !$.isEmptyObject(typeMetadata))
         {
            this.options.typeMetaDataUrl = ag.utils.normalizeUrl(this.options.typeMetaDataUrl);

            // Create GridViewModels as required
            ag.createGridViewModelsFromMetadata(this, typeMetadata, this.editingItem, this.options, this.isEditorReadOnly);
         }
      }

      initBrowseEditors()
      {
         ag.createBrowseEditors(this, this.options.browseEditors, this.editingItem);
      }

      doPrimaryAction(): JQueryPromise<any>
      {
         return this.net.validateUnmapAndPostJson(this.primaryAction, this.editingItem)
            .done((result) =>
            {
               if (result.message)
                  messages.show(result.message, result.messageType);

               this.updateEditingItem(result.data);
            });
      }

      updateEditingItem(data)
      {
         try
         {
            this.updatingModel(true);

            ko.mapping.fromJS(data, this.editingItem);
            ag.updateGrids(data, this.grids);
         }
         finally
         {
            this.updatingModel(false);
         }
      }

       getModel()
       {
           return this.editingItem;
       }
   }
}