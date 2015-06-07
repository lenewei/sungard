/// <reference path="../dealingViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var RepoDealingViewModel = (function (_super) {
        __extends(RepoDealingViewModel, _super);
        function RepoDealingViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            this.repoSummaryActive = ko.observable(false);

            this.repoSummaryActive.subscribe(function () {
                _this.updateRepoSummary(_this.editingItem.dealNumber());
            });
        }
        RepoDealingViewModel.prototype.init = function (itemModel) {
            if (!itemModel.repoSummary)
                throw new Error("repoSummary missing or null.");

            this.defaultRepoSummary = itemModel.repoSummary;

            _super.prototype.init.call(this, itemModel);
        };

        RepoDealingViewModel.prototype.updateRepoSummary = function (dealNumber) {
            var _this = this;
            // Always reset
            ko.mapping.fromJS(this.defaultRepoSummary, this.editingItem.repoSummary);

            // Update when active and dealNumber set
            if (dealNumber > 0 && this.repoSummaryActive()) {
                var params = ko.mapping.toJS(this.editingItem);

                this.net.getJson("repoSummary", params).then(function (result) {
                    ko.mapping.fromJS(result.data, _this.editingItem.repoSummary);
                });
            }
        };

        RepoDealingViewModel.prototype.dealNumberChanged = function (dealNumber) {
            _super.prototype.dealNumberChanged.call(this, dealNumber);

            // Notify those interested in deal number changes
            this.updateRepoSummary(dealNumber);
        };
        return RepoDealingViewModel;
    })(ag.DealingViewModel);
    ag.RepoDealingViewModel = RepoDealingViewModel;
})(ag || (ag = {}));
