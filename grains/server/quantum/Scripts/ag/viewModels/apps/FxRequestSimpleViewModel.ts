/// <reference path="../simpleViewModel.ts" />


interface IFXRequestData
{      
   site: KnockoutObservable<string>;
   failedCount: KnockoutObservable<number>;
}

module ag 
{
   export class FxRequestSimpleViewModel extends SimpleViewModel 
   {
      editingItem: IFXRequestData;

      init(itemModel: any)
      {
         super.init(itemModel);         

         this.updatePageTitle(this.editingItem.site());

         _.each(this.grids, (grid: GridViewModel) =>
         {
            var editor = grid.editor;
            if (editor)
            {
               editor.afterUpdate = (result) =>
               {
                  this.refreshAllGrids();
               };
            }  

            grid['refreshAllGrids'] = () =>
            {
               this.refreshAllGrids();
            };
         });
      }

      refreshAllGrids()
      {
         _.each(this.grids, (grid: GridViewModel) =>
         {
            grid.refresh();
         });
      }

      getNewRequestsForSite()
      {     
         var params = { site: ko.unwrap(this.editingItem.site) };

         this.net.getJson("getnewrequestsfromsite", params).then((result) =>
         {
            // Map the result over the current item
            this.updatingModel(true);
            this.editingItem.failedCount(result.data.failedCount);
            this.refreshAllGrids();    
            this.updatingModel(false);            
         });
      }

      requestSelected(selections)
      {
         if (selections && $.isArray(selections) && selections.length > 0)
         {
            var selectedRequest = selections[0];               
            var params =
            {
               key: selectedRequest.key, name: selectedRequest.name, currency: selectedRequest.currency,
               lowThreshold: selectedRequest.lowThreshold, highThreshold: selectedRequest.highThreshold, movement: selectedRequest.dateRange
            };

            this.net.getJson("getfxrequests", params).then((result) => {
               // Map the result over the current item
               this.updatingModel(true);

               ko.mapping.fromJS(result.data, this.editingItem);
               this.editingItem.site(selectedRequest.name);  

               // Refresh the all grids
               this.refreshAllGrids();
               this.updatingModel(false);
               this.updatePageTitle();
            });
         }
      }

      private updatePageTitle(siteName?: string)
      {
         var name = siteName || this.editingItem.site();
         this.pageTitle.removeAll();
         this.pageTitle.push({ keyProperty: name });
      }
   }
}