/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../ag.ts" />
/// <reference path="../../utils/network.ts" />
/// <reference path="../UpdatingModelHelper.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../baseViewModel.ts" />

module ag
{
   "use strict";

   export class OpenApplicationAction extends PerformActionBeforeNavigationAction
   {
      constructor(public options: IActionOptions, public isSubAction = false)
      {
         super(options, isSubAction);
      }

      invoke(parentViewModel, event: JQueryEventObject, complete): JQueryPromise<any>
      {
         var path = this.options.path;

         // make a JSON request first to server 
         if (this.performActionBeforeNavigation)
         {
            var params = this.getParams(parentViewModel);

            this.net.postJson(this.actionDetails.action, params).then((result) =>
            {
               this.getMessageFromResponse(result);
               var tempPath = this.getPathFromResult(result);
               path = tempPath ? tempPath : path;
               return this.invokeFinalAction(parentViewModel, complete, path, !tempPath);
            }).always(complete);
         }
         else
         {
            return this.invokeFinalAction(parentViewModel, complete, path);
         }
      }

      invokeFinalAction(parentViewModel: any, complete: any, path: string, includeParams = true): JQueryPromise<any>
      {
         var responseOnly = null;
         if (parentViewModel && parentViewModel.responseOnly)
            responseOnly = parentViewModel.responseOnly.split(",");

         var params = includeParams ? this.getParams() : {};

         var promise = utils.openApplicationWindowPromise(path, params, this.options.replaceCurrentPage, responseOnly);
         // always complete, even if the window has an error
         if (_.isFunction(complete))
            complete();  
         return promise;
      }
   }
}