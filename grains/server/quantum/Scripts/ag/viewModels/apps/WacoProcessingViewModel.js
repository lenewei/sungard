/// <reference path="../action/action.ts" />
/// <reference path="../reportingViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var WacoProcessingViewModel = (function (_super) {
        __extends(WacoProcessingViewModel, _super);
        function WacoProcessingViewModel() {
            _super.apply(this, arguments);
        }
        // Override showReport so that we don't attempt to retrieve the report
        // (this application does not support reports/results)
        WacoProcessingViewModel.prototype.showReport = function (report) {
            // Ensure the Query is set
            report.query = report.query || this.editingQuery.key();

            this.setActiveReport(report, false);

            return $.Deferred().done();
        };
        return WacoProcessingViewModel;
    })(ag.ReportingViewModel);
    ag.WacoProcessingViewModel = WacoProcessingViewModel;
})(ag || (ag = {}));
