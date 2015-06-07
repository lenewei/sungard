/// <reference path="../simpleViewModel.ts" />

module ag 
{
   export class DayStatusSimpleViewModel extends SimpleViewModel
   {
      accountsGrid: GridViewModel;

      init(itemModel: any)
      {
         super.init(itemModel);

         this.updatePageTitle();

         // Get a reference to the accounts grid
         this.accountsGrid = this.grids.accounts;
      }

      private updatePageTitle(queryName?: string)
      {
         queryName = queryName || this.editingItem.queryName();
         this.pageTitle.removeAll();
         this.pageTitle.push({ keyProperty: queryName });
      }

      afterChangePeriod()
      {
         // Refresh the accounts grid
         this.accountsGrid.refresh();
      }

      runScript()
      {
         alert("display run script dialog");
      }

      querySelected(selections)
      {
         if (selections && $.isArray(selections) && selections.length > 0)
         {
            var selectedQuery = selections[0],
               params = { query: selectedQuery.key, startDate: this.editingItem.startDate(), endDate: this.editingItem.endDate() };

            this.net.getJson("retreivequery", params).then((result) =>
            {
               // Map the result over the current item
               this.updatingModel(true);
               
               ko.mapping.fromJS(result.data, this.editingItem);

               // Refresh the accounts grid
               this.accountsGrid.refresh();
               
               this.updatingModel(false);

               this.updatePageTitle();
            });
         }
      }
   }
}

