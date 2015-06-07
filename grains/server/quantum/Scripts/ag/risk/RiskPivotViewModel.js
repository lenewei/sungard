var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var RiskPivotViewModel = (function (_super) {
        __extends(RiskPivotViewModel, _super);
        function RiskPivotViewModel(selectedQuery, selectedView, activeReport, grid, options) {
            _super.call(this, selectedQuery, selectedView, activeReport, grid, options);
            this.pageId = ag.utils.getPageIdToken();

            this.setRiskOperators();
        }
        RiskPivotViewModel.prototype.setRiskOperators = function () {
            this.allOperators([
                { text: ag.strings.none, value: 0 },
                { text: ag.strings.count, value: 1 },
                { text: ag.strings.sum, value: 2 },
                { text: ag.strings.runningSum, value: 3 },
                { text: ag.strings.revRunningSum, value: 4 },
                { text: ag.strings.max, value: 5 },
                { text: ag.strings.min, value: 6 },
                { text: ag.strings.mean, value: 7 },
                { text: ag.strings.meanExZero, value: 8 },
                { text: ag.strings.first, value: 9 },
                { text: ag.strings.last, value: 10 },
                { text: ag.strings.list, value: 11 }
            ]);
        };
        return RiskPivotViewModel;
    })(ag.PivotViewModel);
    ag.RiskPivotViewModel = RiskPivotViewModel;
})(ag || (ag = {}));
