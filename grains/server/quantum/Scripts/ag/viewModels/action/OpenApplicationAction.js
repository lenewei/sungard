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

    var OpenApplicationAction = (function (_super) {
        __extends(OpenApplicationAction, _super);
        function OpenApplicationAction(options, isSubAction) {
            if (typeof isSubAction === "undefined") { isSubAction = false; }
            _super.call(this, options, isSubAction);
            this.options = options;
            this.isSubAction = isSubAction;
        }
        OpenApplicationAction.prototype.invoke = function (parentViewModel, event, complete) {
            var _this = this;
            var path = this.options.path;

            // make a JSON request first to server
            if (this.performActionBeforeNavigation) {
                var params = this.getParams(parentViewModel);

                this.net.postJson(this.actionDetails.action, params).then(function (result) {
                    _this.getMessageFromResponse(result);
                    var tempPath = _this.getPathFromResult(result);
                    path = tempPath ? tempPath : path;
                    return _this.invokeFinalAction(parentViewModel, complete, path, !tempPath);
                }).always(complete);
            } else {
                return this.invokeFinalAction(parentViewModel, complete, path);
            }
        };

        OpenApplicationAction.prototype.invokeFinalAction = function (parentViewModel, complete, path, includeParams) {
            if (typeof includeParams === "undefined") { includeParams = true; }
            var responseOnly = null;
            if (parentViewModel && parentViewModel.responseOnly)
                responseOnly = parentViewModel.responseOnly.split(",");

            var params = includeParams ? this.getParams() : {};

            var promise = ag.utils.openApplicationWindowPromise(path, params, this.options.replaceCurrentPage, responseOnly);

            // always complete, even if the window has an error
            if (_.isFunction(complete))
                complete();
            return promise;
        };
        return OpenApplicationAction;
    })(ag.PerformActionBeforeNavigationAction);
    ag.OpenApplicationAction = OpenApplicationAction;
})(ag || (ag = {}));
