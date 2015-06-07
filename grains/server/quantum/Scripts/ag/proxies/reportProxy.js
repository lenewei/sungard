/// <reference path="../../ts/global.d.ts" />
/// <reference path="../helpers/proxy.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    "use strict";

    var ReportProxy = (function (_super) {
        __extends(ReportProxy, _super);
        function ReportProxy(options) {
            if (typeof options === "undefined") { options = {}; }
            _super.call(this);
            this.runViewAction = options.runViewAction || 'runview';
            this.getCalculatedFieldTemplateAction = options.getComputedFieldTemplateAction || 'getcalculatedfieldtemplate';
            this.getCalculatedAggregateFieldTemplateAction = options.getComputedAggregateFieldTemplateAction || 'getcalculatedaggregatefieldtemplate';
        }
        ReportProxy.prototype.runView = function (report, view, gridViewOptionsQueryString, useCache, data, expansions, callback) {
            var url = "/{0}/{1}{2}".format(this.serviceUrl(), this.runViewAction, gridViewOptionsQueryString || "");

            var params = {
                reportId: report.key(),
                viewKey: view.clientKey(),
                viewData: ko.mapping.toJS(view),
                useCache: useCache,
                data: ko.mapping.toJS(data || {}),
                expansions: expansions
            };

            return this.net.postJson({ url: url }, params).then(callback);
        };

        ReportProxy.prototype.getCalculatedFieldTemplate = function () {
            return this.getConstJson(this.getCalculatedFieldTemplateAction);
        };

        ReportProxy.prototype.getCalculatedAggregateFieldTemplate = function () {
            return this.getConstJson(this.getCalculatedAggregateFieldTemplateAction);
        };

        ReportProxy.prototype.getConstJson = function (relativeUri) {
            var url = "/{0}/{1}".format(this.serviceUrl(), relativeUri);
            return this.net.getJson({ url: url }, null, true);
        };
        return ReportProxy;
    })(ag.ControllerProxy);
    ag.ReportProxy = ReportProxy;
})(ag || (ag = {}));
