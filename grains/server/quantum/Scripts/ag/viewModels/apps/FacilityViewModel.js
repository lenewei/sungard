/// <reference path="../HierarchicalViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var FacilityViewModel = (function (_super) {
        __extends(FacilityViewModel, _super);
        function FacilityViewModel() {
            _super.apply(this, arguments);
        }
        FacilityViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            var counterpartiesGrid = this.grids.counterpartiesDataList, actions = counterpartiesGrid.actions, initializeAtAction = actions.initializeAt, assignTo = actions.assignTo, decreaseBy = actions.decreaseBy, increaseBy = actions.increaseBy, bulkCopy = actions.counterpartyCopyByDate, loadItem = function (result, parentViewModel) {
                _this.loadItem(result, false);
            };

            initializeAtAction.afterInvoke = loadItem;
            assignTo.afterInvoke = loadItem;
            decreaseBy.afterInvoke = loadItem;
            increaseBy.afterInvoke = loadItem;
            bulkCopy.afterInvoke = loadItem;
        };
        return FacilityViewModel;
    })(ag.HierarchicalViewModel);
    ag.FacilityViewModel = FacilityViewModel;
})(ag || (ag = {}));
