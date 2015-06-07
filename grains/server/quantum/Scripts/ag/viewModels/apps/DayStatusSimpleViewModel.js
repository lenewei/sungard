/// <reference path="../simpleViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var DayStatusSimpleViewModel = (function (_super) {
        __extends(DayStatusSimpleViewModel, _super);
        function DayStatusSimpleViewModel() {
            _super.apply(this, arguments);
        }
        DayStatusSimpleViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);

            this.updatePageTitle();

            // Get a reference to the accounts grid
            this.accountsGrid = this.grids.accounts;
        };

        DayStatusSimpleViewModel.prototype.updatePageTitle = function (queryName) {
            queryName = queryName || this.editingItem.queryName();
            this.pageTitle.removeAll();
            this.pageTitle.push({ keyProperty: queryName });
        };

        DayStatusSimpleViewModel.prototype.afterChangePeriod = function () {
            // Refresh the accounts grid
            this.accountsGrid.refresh();
        };

        DayStatusSimpleViewModel.prototype.runScript = function () {
            alert("display run script dialog");
        };

        DayStatusSimpleViewModel.prototype.querySelected = function (selections) {
            var _this = this;
            if (selections && $.isArray(selections) && selections.length > 0) {
                var selectedQuery = selections[0], params = { query: selectedQuery.key, startDate: this.editingItem.startDate(), endDate: this.editingItem.endDate() };

                this.net.getJson("retreivequery", params).then(function (result) {
                    // Map the result over the current item
                    _this.updatingModel(true);

                    ko.mapping.fromJS(result.data, _this.editingItem);

                    // Refresh the accounts grid
                    _this.accountsGrid.refresh();

                    _this.updatingModel(false);

                    _this.updatePageTitle();
                });
            }
        };
        return DayStatusSimpleViewModel;
    })(ag.SimpleViewModel);
    ag.DayStatusSimpleViewModel = DayStatusSimpleViewModel;
})(ag || (ag = {}));
