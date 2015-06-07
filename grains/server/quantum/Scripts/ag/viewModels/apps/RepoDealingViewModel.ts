/// <reference path="../dealingViewModel.ts" />

module ag
{
   export class RepoDealingViewModel extends DealingViewModel
   {
      repoSummaryActive = ko.observable(false);
      defaultRepoSummary: any;

      constructor(public options: IAppViewModelOptions)
      {
         super(options);

         this.repoSummaryActive.subscribe(() =>
         {
            this.updateRepoSummary(this.editingItem.dealNumber());
         }); 
      }

      init(itemModel: any)
      {
         if (!itemModel.repoSummary)
            throw new Error("repoSummary missing or null.");

         this.defaultRepoSummary = itemModel.repoSummary;

         super.init(itemModel);
      }

      private updateRepoSummary(dealNumber)
      {
         // Always reset
         ko.mapping.fromJS(this.defaultRepoSummary, this.editingItem.repoSummary);

         // Update when active and dealNumber set
         if (dealNumber > 0 && this.repoSummaryActive())
         {
            var params = ko.mapping.toJS(this.editingItem);

            this.net.getJson("repoSummary", params/*{ data: { dealNumber: dealNumber } }*/).then((result) =>
            {
               ko.mapping.fromJS(result.data, this.editingItem.repoSummary);
            });
         }
      }

      dealNumberChanged(dealNumber: number)
      {
         super.dealNumberChanged(dealNumber);

         // Notify those interested in deal number changes
         this.updateRepoSummary(dealNumber);
      }    
   }
}