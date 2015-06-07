module ag
{
   export class DealMapViewModel
   {
      mode = ko.observable(DealMapMode.Init);
      canCreate: KnockoutComputed<boolean>;
      canEdit: KnockoutComputed<boolean>;
      canDelete: KnockoutComputed<boolean>;
      canCopy: KnockoutComputed<boolean>;
      customize: any;
      customizeVisible: any;

      constructor(editingItem, gridItem, isNewItem: KnockoutObservable<boolean>)
      {
         editingItem.dealMapWorkingMode(DealMapMode.Init);

         editingItem.dealMapEditMode.subscribe(() =>
         {
            dealChanged();
         });

         if (gridItem.editor)
         {
            gridItem.editor.unsavedChanges.subscribe(() =>
            {
               if (gridItem.editor.unsavedChanges())
                  editingItem.dealMapWorkingMode(this.mode);
               else
                  editingItem.dealMapWorkingMode(DealMapMode.Init);
            });
         }

         this.canCreate = ko.computed(() =>
         {
            var mode = this.mode();
            return !isNewItem() && (mode === DealMapMode.Customizer || mode === DealMapMode.Profiler);
         });

         this.canEdit = ko.computed(() =>
         {
            var mode = this.mode();
            return !isNewItem() && (mode === DealMapMode.Customizer || mode === DealMapMode.Scheduler);
         });

         this.canDelete = ko.computed(() =>
         {
            var mode = this.mode();
            return !isNewItem() && (mode === DealMapMode.Customizer || mode === DealMapMode.Profiler);
         });

         this.canCopy = ko.computed(() =>
         {
            return !isNewItem() && this.mode() === DealMapMode.Customizer;
         });

         this.customize = () =>
         {
            if (editingItem.canCustomizeDeal())
            {
               this.mode(DealMapMode.Customizer);
               editingItem.dealMapEditMode(this.mode());
               editingItem.dealMap.refresh(true);
            }
         };

         this.customizeVisible = ko.computed(() =>
         {
            return this.mode() === DealMapMode.Profiler &&
               editingItem.canCustomizeDeal &&
               editingItem.canCustomizeDeal();
         });

         var dealChanged = () =>
         {
            this.mode(editingItem.dealMapEditMode());
         };
      }
   }
}
