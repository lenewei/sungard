/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../ag.ts" />
/// <reference path="../../utils/network.ts" />
/// <reference path="../UpdatingModelHelper.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../baseViewModel.ts" />

module ag
{
   "use strict";

   export class DownloadCallbackResult
   {
      targetUrl: string;
      params: any;
   }

   interface IDownloadActionOption extends IActionOptions
   {
      downloadPathCallBackString: string;
   }

   export class DownloadApplicationAction extends PerformActionBeforeNavigationAction
   {
      downloadUrl: string;
      downloadPathCallBackString: string;

      constructor(public options: IActionOptions, public isSubAction = false)
      {
         super(options, isSubAction);
         this.downloadUrl = options.downloadUrl;
         this.downloadPathCallBackString = (<IDownloadActionOption>options).downloadPathCallBackString;
      }

      invoke(parentViewModel, event: JQueryEventObject, complete): JQueryPromise<any>
      {
         var path = this.downloadUrl,
            deferred;

         // Make a JSON request first to server 
         if (this.performActionBeforeNavigation)
         {
            var params = {};

            if (parentViewModel.selected)
               params = parentViewModel.selected.item();

            if ($.isEmptyObject(params))
               params = this.getParams(parentViewModel);

            deferred = this.net.postJson(this.actionDetails.action, params).done((result) =>
            {
               this.getMessageFromResponse(result);
               path = this.getPathFromResult(result) || path;
               return this.invokeFinalAction(parentViewModel, complete, path);
            });
         }
         else
         {
            deferred = this.invokeFinalAction(parentViewModel, complete, path);
         }

         deferred.always(complete);
         return deferred;
      }

      invokeFinalAction(parentViewModel: any, complete: any, path: string): JQueryPromise<any>
      {
         this.downloadUrl = path;
         return this.downloadPromise(parentViewModel, complete, this);
      }

      downloadPromise(parentViewModel: any, complete: any, action: DownloadApplicationAction): JQueryPromise<any>
      {
         var downloadUrl = action.downloadUrl,
            selected = parentViewModel.selected,
            selectedItem = selected && selected.item(), // Download by item
            selectedkeys = selected && selected.keys(), // Download by keys
            targetUrl: string = undefined,
            params: any = undefined,
            downloadPathCallBackString = action.downloadPathCallBackString,
            downloadCallbackResult: DownloadCallbackResult;

         // If there is a call back has been assigned we just use it
         if (downloadPathCallBackString && !_.isEmpty(downloadPathCallBackString))
         {
            var fn = parentViewModel[downloadPathCallBackString];
            if (_.isFunction(fn))
            {
               // ToDo: Replace with ES6 destructuring syntax when TypeScript finally supports it
               downloadCallbackResult = <DownloadCallbackResult>(<Function>fn).call(parentViewModel);
               targetUrl = downloadCallbackResult.targetUrl;
               params = downloadCallbackResult.params;
            }
         }

         // If we already have already performed an action (via performActionBeforeNavigation) 
         // we assume everything we need is now on the download url.
         if (!targetUrl && this.options.performActionBeforeNavigation)
            targetUrl = downloadUrl;

         // Still don't have a target create one.
         if (!targetUrl)
         {
            if (!selected && downloadUrl.indexOf("?") == -1)
               selectedItem = ko.mapping.toJS(parentViewModel.editingItem);

            targetUrl = downloadUrl;

            if (selectedItem && !ko.isObservable(selectedItem))
            {
               params = ag.utils.cleanJSForRequest(selectedItem, this.net.responseOnlyProperties, this.net.postOnlyProperties);
            }
            else if (selectedkeys)
            {
               params = { keys: selectedkeys };
            }
         }

         var promise = $.Deferred<any>();
         promise.always(() =>
         {
            _.delay(() =>
            {
               downloadInvoker.invoke(targetUrl, params);
            }, 0);
         });

         return promise.resolve();
      }
   }
}