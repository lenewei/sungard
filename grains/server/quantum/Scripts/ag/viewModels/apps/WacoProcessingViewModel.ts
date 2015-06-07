/// <reference path="../action/action.ts" />
/// <reference path="../reportingViewModel.ts" />

module ag 
{
   export class WacoProcessingViewModel extends ReportingViewModel 
   {
      // Override showReport so that we don't attempt to retrieve the report
      // (this application does not support reports/results)
      showReport(report): JQueryPromise<any>
      {  
         // Ensure the Query is set
         report.query = report.query || this.editingQuery.key();

         this.setActiveReport(report, false);

         return $.Deferred().done();
      }
   }
}