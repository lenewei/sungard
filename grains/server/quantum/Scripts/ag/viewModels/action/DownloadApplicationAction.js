/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../ag.ts" />
/// <reference path="../../utils/network.ts" />
/// <reference path="../UpdatingModelHelper.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../baseViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    "use strict";

    var DownloadCallbackResult = (function () {
        function DownloadCallbackResult() {
        }
        return DownloadCallbackResult;
    })();
    ag.DownloadCallbackResult = DownloadCallbackResult;

    var DownloadApplicationAction = (function (_super) {
        __extends(DownloadApplicationAction, _super);
        function DownloadApplicationAction(options, isSubAction) {
            if (typeof isSubAction === "undefined") { isSubAction = false; }
            _super.call(this, options, isSubAction);
            this.options = options;
            this.isSubAction = isSubAction;
            this.downloadUrl = options.downloadUrl;
            this.downloadPathCallBackString = options.downloadPathCallBackString;
        }
        DownloadApplicationAction.prototype.invoke = function (parentViewModel, event, complete) {
            var _this = this;
            var path = this.downloadUrl, deferred;

            // Make a JSON request first to server
            if (this.performActionBeforeNavigation) {
                var params = {};

                if (parentViewModel.selected)
                    params = parentViewModel.selected.item();

                if ($.isEmptyObject(params))
                    params = this.getParams(parentViewModel);

                deferred = this.net.postJson(this.actionDetails.action, params).done(function (result) {
                    _this.getMessageFromResponse(result);
                    path = _this.getPathFromResult(result) || path;
                    return _this.invokeFinalAction(parentViewModel, complete, path);
                });
            } else {
                deferred = this.invokeFinalAction(parentViewModel, complete, path);
            }

            deferred.always(complete);
            return deferred;
        };

        DownloadApplicationAction.prototype.invokeFinalAction = function (parentViewModel, complete, path) {
            this.downloadUrl = path;
            return this.downloadPromise(parentViewModel, complete, this);
        };

        DownloadApplicationAction.prototype.downloadPromise = function (parentViewModel, complete, action) {
            var downloadUrl = action.downloadUrl, selected = parentViewModel.selected, selectedItem = selected && selected.item(), selectedkeys = selected && selected.keys(), targetUrl = undefined, params = undefined, downloadPathCallBackString = action.downloadPathCallBackString, downloadCallbackResult;

            // If there is a call back has been assigned we just use it
            if (downloadPathCallBackString && !_.isEmpty(downloadPathCallBackString)) {
                var fn = parentViewModel[downloadPathCallBackString];
                if (_.isFunction(fn)) {
                    // ToDo: Replace with ES6 destructuring syntax when TypeScript finally supports it
                    downloadCallbackResult = fn.call(parentViewModel);
                    targetUrl = downloadCallbackResult.targetUrl;
                    params = downloadCallbackResult.params;
                }
            }

            // If we already have already performed an action (via performActionBeforeNavigation)
            // we assume everything we need is now on the download url.
            if (!targetUrl && this.options.performActionBeforeNavigation)
                targetUrl = downloadUrl;

            // Still don't have a target create one.
            if (!targetUrl) {
                if (!selected && downloadUrl.indexOf("?") == -1)
                    selectedItem = ko.mapping.toJS(parentViewModel.editingItem);

                targetUrl = downloadUrl;

                if (selectedItem && !ko.isObservable(selectedItem)) {
                    params = ag.utils.cleanJSForRequest(selectedItem, this.net.responseOnlyProperties, this.net.postOnlyProperties);
                } else if (selectedkeys) {
                    params = { keys: selectedkeys };
                }
            }

            var promise = $.Deferred();
            promise.always(function () {
                _.delay(function () {
                    ag.downloadInvoker.invoke(targetUrl, params);
                }, 0);
            });

            return promise.resolve();
        };
        return DownloadApplicationAction;
    })(ag.PerformActionBeforeNavigationAction);
    ag.DownloadApplicationAction = DownloadApplicationAction;
})(ag || (ag = {}));
