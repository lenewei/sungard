/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
var ag;
(function (ag) {
    var ControllerProxy = (function () {
        function ControllerProxy() {
            this.net = new ag.utils.Network();
        }
        ControllerProxy.prototype.serviceUrl = function () {
            return ag.utils.normalizeUrl(ag.serviceUrl);
        };
        return ControllerProxy;
    })();
    ag.ControllerProxy = ControllerProxy;
})(ag || (ag = {}));
