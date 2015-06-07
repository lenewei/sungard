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

    var PerformActionBeforeNavigationAction = (function (_super) {
        __extends(PerformActionBeforeNavigationAction, _super);
        function PerformActionBeforeNavigationAction(options, isSubAction) {
            if (typeof isSubAction === "undefined") { isSubAction = false; }
            _super.call(this, options, isSubAction);
            this.options = options;
            this.isSubAction = isSubAction;
            this.performActionBeforeNavigation = !!options.performActionBeforeNavigation;
        }
        return PerformActionBeforeNavigationAction;
    })(ag.Action);
    ag.PerformActionBeforeNavigationAction = PerformActionBeforeNavigationAction;
})(ag || (ag = {}));
