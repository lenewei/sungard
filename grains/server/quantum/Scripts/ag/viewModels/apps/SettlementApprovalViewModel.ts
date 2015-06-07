/// <reference path="../reportingViewModel.ts" />
module ag
{
   export class SettlementApprovalViewModel extends ReportingViewModel
   {
      constructor(public options: IReportingViewModelOptions)
      {
         super(options);

         var grid = <any>this.grid,
            itemKey = grid.itemKey;

         grid.canApproveAnythingSelected = () =>
         {
            return this.canPerformAction(grid, itemKey, "canApprove");
         };

         grid.canRejectAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canReject");
         };

      }
   }
}
