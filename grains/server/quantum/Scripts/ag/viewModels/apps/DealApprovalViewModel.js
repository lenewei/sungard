﻿var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../reportingViewModel.ts" />
var ag;
(function (ag) {
    var DealApprovalViewModel = (function (_super) {
        __extends(DealApprovalViewModel, _super);
        function DealApprovalViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;

            var grid = this.grid, itemKey = grid.itemKey;

            grid.canApproveAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canApprove");
            };

            grid.canRejectAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canReject");
            };

            grid.canRejectWithNoteAnythingSelected = function () {
                return _this.canPerformAction(grid, itemKey, "canRejectWithNote");
            };
        }
        return DealApprovalViewModel;
    })(ag.ReportingViewModel);
    ag.DealApprovalViewModel = DealApprovalViewModel;
})(ag || (ag = {}));
