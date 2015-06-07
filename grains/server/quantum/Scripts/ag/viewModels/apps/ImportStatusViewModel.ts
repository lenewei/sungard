/// <reference path="../simpleViewModel.ts" />

module ag 
{
   export class ImportStatusViewModel extends SimpleViewModel
   {
      actions: any;

      pendingFilesGridViewModel: GridViewModel;
      processingFilesGridViewModel: GridViewModel;
      errorFilesGridViewModel: GridViewModel;
      processedFilesGridViewModel: GridViewModel;
      
      init(itemModel: any)
      {
         super.init(itemModel);

         this.pageTitle([{ keyProperty: utils.documentTitle() }]);

         this.pendingFilesGridViewModel = this.grids.pendingFiles;
         this.processingFilesGridViewModel = this.grids.processingFiles;
         this.errorFilesGridViewModel = this.grids.errorFiles;
         this.processedFilesGridViewModel = this.grids.processedFiles;

         this.editingItem.summaryCounts = {};

         this.editingItem.summaryCounts.pendingCount = ko.computed(() => {
             return this.pendingFilesGridViewModel.pager.totalItems();
         } , this);

         this.editingItem.summaryCounts.processingCount = ko.computed(() => {
            return this.processingFilesGridViewModel.pager.totalItems();
         } , this);

         this.editingItem.summaryCounts.errorCount = ko.computed(() => {
            return this.errorFilesGridViewModel.pager.totalItems();
         } , this);

         this.editingItem.summaryCounts.processedCount = ko.computed(() => {
            return this.processedFilesGridViewModel.pager.totalItems();
         } , this);

         (<any>this.errorFilesGridViewModel).__updatePendingFileGrid = this.updatePendingFileGrid.bind(this);
         (<any>this.processedFilesGridViewModel).__updatePendingFileGrid = this.updatePendingFileGrid.bind(this);
      }

      updatePendingFileGrid():void
      {
         this.pendingFilesGridViewModel.refresh();
      }
   }
}

