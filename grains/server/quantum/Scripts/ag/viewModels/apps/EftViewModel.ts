/// <reference path="../reportingViewModel.ts" />

interface IEftApplicationOptions extends IReportingApplicationOptions {
   debugFilesAvailable:any;
}

module ag {
   export class EftViewModel extends ReportingViewModel {

      applicationOptions: IEftApplicationOptions;

      constructor(public options: IReportingViewModelOptions) {
         super(options);

         this.activeReport.subscribe(newValue => {
            if (newValue && newValue.options && newValue.options.debugFilesAvailable) {
               this.applicationOptions.debugFilesAvailable(newValue.options.debugFilesAvailable());
            }
         });
      }

      downloadDebugCallback(): DownloadCallbackResult {
         this.applicationOptions.debugFilesAvailable(false);

         return {
            targetUrl: ag.serviceUrl + "/downloadDebug",
            params: { activityId: this.activityId }
         };
      }
   }
} 