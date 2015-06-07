/// <reference path="../reportingViewModel.ts" />
module ag
{
   export class ConfirmationsViewModel extends ReportingViewModel
   {
      constructor(public options: IReportingViewModelOptions)
      {
         super(options);

         var grid = <any>this.grid,
            itemKey = grid.itemKey;

         grid.canMatchAnythingSelected = () =>
         {
            return this.canPerformAction(grid, itemKey, "canMatch");
         };

         grid.canUnmatchAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canUnmatch");
         };

         grid.canRejectAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canReject");
         };

         grid.canOpenPaperAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canOpenPaper");
         };

         grid.canOpenDealTicketAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canOpenDealTicket");
         };

         grid.canOpenElectronicAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canOpenElectronic");
         };

         grid.canSubmitPaperAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canSubmitPaper");
         };

         grid.canSubmitElectronicAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canSubmitElectronic");
         };

         grid.canSubmitAmendedElectronicAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canSubmitAmendedElectronic");
         };

         grid.canGetHistoryAnythingSelected = () =>
         {
             return this.canPerformAction(grid, itemKey, "canGetHistory");
         };
      }
   }
}
