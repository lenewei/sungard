/// <reference path="reportingViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var ProcessingViewModel = (function (_super) {
        __extends(ProcessingViewModel, _super);
        function ProcessingViewModel(options) {
            _super.call(this, options);
        }
        ProcessingViewModel.prototype.init = function (model) {
            var _this = this;
            _super.prototype.init.call(this, model);

            this.gridSelectionAndApplicationOptions = ko.computed(function () {
                return {
                    selections: _this.grid.selected.model(),
                    applicationOptions: _this.applicationOptions
                };
            });
        };
        return ProcessingViewModel;
    })(ag.ReportingViewModel);
    ag.ProcessingViewModel = ProcessingViewModel;
})(ag || (ag = {}));
