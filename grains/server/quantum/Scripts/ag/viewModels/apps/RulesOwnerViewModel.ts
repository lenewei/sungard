/// <reference path="../staticDataViewModel.ts" />

module ag
{
   export class RulesOwnerViewModel extends StaticDataViewModel
   {
      init(itemModel: any)
      {
         super.init(itemModel);

         _.each(this.grids, (grid:any) =>
         {
            grid.editor.item.subscribe((newValue:any) =>
            {
               var inherited = newValue.inherited() || newValue.deactivated(),
                   tags = newValue.productGeneralLedgerTags;
               this.setDefaultingFieldsVisibilityAndAvailability(newValue.defaultingRule.defaultingFields, inherited);
               if (tags)
               {
                  this.setTagsAvailability(tags(), inherited);
               }
            } );

            grid.refreshAllGrids = () =>
            {
               _.each(this.grids, (g: GridViewModel) =>
               {
                  g.refresh();
               } );
            };
         } );
      }

      private setDefaultingFieldsVisibilityAndAvailability(fields: KnockoutObservableArray<any>, inherited: boolean)
      {
         var unwrappedFields = fields();
         _.each(unwrappedFields, (field, index: number) =>
         {
            var metaField = ag.mapFromJStoMetaObservable(field, this.isEditorReadOnly),
               isSingle = metaField.isSingleSelect(),
               hiddenValueField = isSingle ? metaField.valueList : metaField.value,
               visibleValueField = isSingle ? metaField.value : metaField.valueList;
            unwrappedFields[index] = metaField;
            hiddenValueField.isVisible(false);
            visibleValueField.isAvailable(!inherited);
            
            if (!inherited)
            {
               visibleValueField.subscribe(function ()
               {
                  fields.valueHasMutated();
               } );
            }
         } );
      }

      private setTagsAvailability(tags: any[], inherited: boolean)
      {
         _.each(tags, (tag, index: number) =>
         {
            var metaTag = ag.mapFromJStoMetaObservable(tag, this.isEditorReadOnly);
            tags[index] = metaTag;
            metaTag.lookupText.isAvailable(!inherited);
         } );
      }
   }
}