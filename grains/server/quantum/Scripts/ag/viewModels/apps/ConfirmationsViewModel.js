var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../reportingViewModel.ts" />
var ag;
(function (ag) {
    var ConfirmationsViewModel = (function (_super) {
        __extends(ConfirmationsViewModel, _super);
        function ConfirmationsViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;

            var grid = this.grid, itemKey = grid.itemKey;

            grid.canMatchAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canMatch");
            };

            grid.canUnmatchAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canUnmatch");
            };

            grid.canRejectAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canReject");
            };

            grid.canOpenPaperAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canOpenPaper");
            };

            grid.canOpenDealTicketAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canOpenDealTicket");
            };

            grid.canOpenElectronicAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canOpenElectronic");
            };

            grid.canSubmitPaperAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canSubmitPaper");
            };

            grid.canSubmitElectronicAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canSubmitElectronic");
            };

            grid.canSubmitAmendedElectronicAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canSubmitAmendedElectronic");
            };

            grid.canGetHistoryAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canGetHistory");
            };
        }
        return ConfirmationsViewModel;
    })(ag.ReportingViewModel);
    ag.ConfirmationsViewModel = ConfirmationsViewModel;
})(ag || (ag = {}));
