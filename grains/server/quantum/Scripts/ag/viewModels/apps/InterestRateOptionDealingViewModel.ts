/// <reference path="../dealingViewModel.ts" />

interface IInterestRateOptionDealingViewModelOptions extends IAppViewModelOptions
{
   underlyingDealUrl: string
}

module ag
{
   export class InterestRateOptionDealingViewModel extends DealingViewModel
   {
      private underlyingSwapDeal:any;

      constructor(public options: IInterestRateOptionDealingViewModelOptions)
      {
         super(options);
      }

      childWindowOpened(viewModel: DealingViewModel, windowHandle: Window)
      {
         var interval = window.setInterval(() => 
         {
            // Check if there is still activity on the page
            // once there isn't any map the data across - short-term fix
            if ((<any>windowHandle).$.active)
               return;

            // Clear the timer
            window.clearInterval(interval);

            // Execute mapping in context of child window
            viewModel.silenceDependency(() => windowHandle.ko.mapping.fromJS(this.underlyingSwapDeal, viewModel.editingItem), viewModel);
         }, 500);
      }

      showUnderlyingSwapDeal()
      {
         var underlyingSwapDealWindow = new ag.WindowManager({ name: "underlyingSwapDeal" });

         this.net.postJson("getUnderlyingSwapDeal", () => ko.mapping.toJS(this.editingItem))
            .done(result =>
            {
               this.underlyingSwapDeal = result.data;

               var url = this.options.underlyingDealUrl + "?dialog=1";

               // If we have a dealNumber append the parameter to the querystring
               if (this.underlyingSwapDeal.dealNumber)
                  url += "&dealNumber=" + encodeURIComponent(this.underlyingSwapDeal.dealNumber);

               underlyingSwapDealWindow.navigate(url);
            })
            .fail(result =>
            {
               underlyingSwapDealWindow.close();
               utils.showErrorsFromResult(result);
            });
      }
   }
}