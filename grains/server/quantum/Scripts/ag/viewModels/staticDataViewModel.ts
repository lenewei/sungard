module ag
{
   export class StaticDataViewModel extends AppViewModel implements IStaticDataViewModel
   {
      editParamDelegator = () => ko.mapping.toJS(this.editingItem);
      editWithRenameParamDelegator = () => [ko.mapping.toJS(this.editingItem), this.originalKeyStore];

      canRenameKeyfields: boolean = false;
      hasRootEditor: boolean = true;
      isRoot: KnockoutComputed<boolean>;
      menuCommands: IStaticdataMenuCommand;

      static EditMode =
      {
         Insert: 0,
         Update: 1
      };

      init(itemModel)
      {
         super.init(itemModel);

         this.isRoot = ko.computed(() =>
         {
            var isNewItem = ko.unwrap(this.isNewItem());
            if (isNewItem)
               return false;

            var breadcrumb = this.breadcrumb;

            if (!breadcrumb)
               return false;

            if (breadcrumb.parents && ko.unwrap(breadcrumb.parents).length > 0)
               return false;

            return true;
         });
      }

      copyItem(): JQueryPromise<any>
      {
         return super.copyItem().always(() =>
         {
            this.editingItem.currentMode && this.editingItem.currentMode(StaticDataViewModel.EditMode.Insert);
         });
      }

      copyAndApply(): JQueryPromise<any>
      {
         return super.copyAndApply().always(() =>
         {
            this.editingItem.currentMode && this.editingItem.currentMode(StaticDataViewModel.EditMode.Insert);
         });
      }

      loadItem(result, isNewItem: boolean): JQueryDeferred<any>
      {
         return super.loadItem(result, isNewItem).always(() =>
         {
            if (_.has(this.editingItem, "canRename"))
            {
               this.canRenameKeyfields = <boolean>ko.unwrap(this.editingItem.canRename);
            }
         });
      }

      navigateToEmptyItem(fromKeyFieldChange: boolean = false)
      {
         if (fromKeyFieldChange && this.canRenameKeyfields)
         {
            // If the key field changed and this app which allow rename key fields
            // we don't navigate into new status
         }
         else
         {
            // navigate into new status
            this.navigateToItem(this.navigateGetParams());
         }
      }

      saveItem(clearAfter = false): JQueryPromise<any>
      {
         return ag.utils.validateAndShowMessages(this.editingItem)
            .then(() =>
            {
               // Post to Create or Edit or EditRename
               var action = this.isNewItem() ? "create" : this.getEditAction(),
                  params = (this.isNewItem() || !this.canRenameKeyfields) ? this.editParamDelegator : this.editWithRenameParamDelegator;

               this.isSaveAndNewMode(clearAfter);

               return this.net.validateUnmapAndPostJson(action, params)
                  .done((result: any) =>
                  {
                     this.saveItemDone(result, clearAfter);
                  })
                  .fail((reasons: any) =>
                  {
                     this.saveItemFail(reasons);
                  });
            });
      }

      private getEditAction(): string
      {
         if (this.canRenameKeyfields)
            return this.editAction + "WithRename";
         else
            return this.editAction;
      }
   }
}