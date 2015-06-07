/// <reference path="../../ts/global.d.ts" />
/// <reference path="../helpers/proxy.ts" />

module ag
{
   "use strict";

   export interface IReportProxy
   {
      runView(report, view, gridViewOptionsQueryString, useCache, data, expansions, callback): JQueryPromise<any>;
      getCalculatedFieldTemplate(): JQueryPromise<any>;
      getCalculatedAggregateFieldTemplate(): JQueryPromise<any>;  
   }

   export class ReportProxy extends ControllerProxy implements IReportProxy
   {
      private runViewAction: string;
      private getCalculatedFieldTemplateAction: string;
      private getCalculatedAggregateFieldTemplateAction: string;

      constructor(options: any = {})
      {
         super();
         this.runViewAction = options.runViewAction || 'runview';
         this.getCalculatedFieldTemplateAction = options.getComputedFieldTemplateAction || 'getcalculatedfieldtemplate';
         this.getCalculatedAggregateFieldTemplateAction = options.getComputedAggregateFieldTemplateAction || 'getcalculatedaggregatefieldtemplate';
      }

      runView(report, view, gridViewOptionsQueryString, useCache, data, expansions, callback): JQueryPromise<any>
      {
         var url = "/{0}/{1}{2}".format(this.serviceUrl(), this.runViewAction, gridViewOptionsQueryString || "");

         var params =
         { 
            reportId: report.key(),
            viewKey: view.clientKey(),
            viewData: ko.mapping.toJS(view),
            useCache: useCache,
            data: ko.mapping.toJS(data || {}),
            expansions: expansions
         };

         return this.net.postJson({ url: url }, params).then(callback);
      }

      getCalculatedFieldTemplate(): JQueryPromise<any>
      {
         return this.getConstJson(this.getCalculatedFieldTemplateAction);
      }

      getCalculatedAggregateFieldTemplate(): JQueryPromise<any>
      {
         return this.getConstJson(this.getCalculatedAggregateFieldTemplateAction);
      }

      private getConstJson(relativeUri: string): JQueryPromise<any>
      {
         var url = "/{0}/{1}".format(this.serviceUrl(), relativeUri);
         return this.net.getJson({ url: url }, null, true);
      }
   }

}