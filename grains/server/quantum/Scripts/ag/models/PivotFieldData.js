/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    var PivotFieldData = (function () {
        function PivotFieldData(options) {
            this.key = options.key;
            this.drillDownLevel = options.drillDownLevel || 0;
            this.endTotal = options.endTotal || false;
            this.resetRunningTotals = options.resetRunningTotals || false;
            this.canDrillDown = options.canDrillDown || false;
            this.isLastInLevel = options.isLastInLevel || false;
            this.colSpan = options.colSpan || 0;
            this.displayName = options.displayName;
            this.itemType = options.itemType || 0;
            this.dataType = options.dataType || '';
            this.index = options.index || 0;
            this.isFirstColumn = options.isFirstColumn || false;
            this.isLast = options.isLast || false;
        }
        return PivotFieldData;
    })();
    ag.PivotFieldData = PivotFieldData;
})(ag || (ag = {}));
