/// <reference path="../reportingViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var ag;
(function (ag) {
    var EftViewModel = (function (_super) {
        __extends(EftViewModel, _super);
        function EftViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;

            this.activeReport.subscribe(function (newValue) {
                if (newValue && newValue.options && newValue.options.debugFilesAvailable) {
                    _this.applicationOptions.debugFilesAvailable(newValue.options.debugFilesAvailable());
                }
            });
        }
        EftViewModel.prototype.downloadDebugCallback = function () {
            this.applicationOptions.debugFilesAvailable(false);

            return {
                targetUrl: ag.serviceUrl + "/downloadDebug",
                params: { activityId: this.activityId }
            };
        };
        return EftViewModel;
    })(ag.ReportingViewModel);
    ag.EftViewModel = EftViewModel;
})(ag || (ag = {}));
