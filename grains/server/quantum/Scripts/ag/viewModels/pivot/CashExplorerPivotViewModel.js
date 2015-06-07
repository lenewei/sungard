/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../models/MessagesViewModel.ts" />
/// <reference path="PivotViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var CashExplorerPivotViewModel = (function (_super) {
        __extends(CashExplorerPivotViewModel, _super);
        function CashExplorerPivotViewModel(selectedQuery, selectedView, activeReport, grid, options) {
            var _this = this;
            _super.call(this, selectedQuery, selectedView, activeReport, grid, _.extend(options, { pageSize: 500 }));
            this.net = new ag.utils.Network();
            this.showDrillDownDialog = ko.observable(false);
            this.action = new CashExplorerPivotActionViewModel();

            this.drillDownCommand = ko.asyncCommand({
                execute: function (data, event, callback) {
                    var context = ko.contextFor(event.target);
                    _this.actionRequest('drilldowndetails', data, context).then(function (result) {
                        var cashFlows = result.data.cashFlowsDataSet, root = context.$root, action = root.actions.drillDownDetails, grid = action.grids.cashFlowsDataSet;

                        action.isLoaded(true);
                        ko.mapping.fromJS(result.data, action.model);

                        var fieldData = _.map(cashFlows.fields, function (f) {
                            return ko.mapping.fromJS(new ag.ViewFieldData(f));
                        });

                        grid.views.selected().appliedFields(fieldData);
                        _this.populateGrid(grid, cashFlows);
                        action.showDialog(true);
                    }).always(callback);
                }
            });

            this.directTradingCommand = ko.asyncCommand({
                execute: function (data, event, callback) {
                    var context = ko.contextFor(event.target);
                    _this.actionRequest('directTrading', data, context).then(function (result) {
                        var root = context.$root, action = root.actions.directTrading;
                        action.isLoaded(true);
                        ko.mapping.fromJS(result.data, action.model);
                        _this.populateGrid(action.grids.transferToAccounts, result.data.transferToAccounts);
                        _this.populateGrid(action.grids.recentDeals, result.data.recentDeals);
                        action.showDialog(true);
                    }).always(callback);
                }
            });
        }
        CashExplorerPivotViewModel.prototype.populateGrid = function (grid, response) {
            grid.loadData(response);
        };

        CashExplorerPivotViewModel.prototype.getCellLinks = function (itemData) {
            var value = itemData.value, additionalInfo = itemData.additionalInfo;

            if (!value)
                return [];

            if (!(_.has(additionalInfo, 'colKey') && _.has(additionalInfo, 'rowKey')))
                return [];

            return [
                '<a href="#" data-bind="command: $parents[1].drillDownCommand">Details...</a>',
                '<a href="#" data-bind="command: $parents[1].directTradingCommand"">Action...</a>'
            ];
        };

        CashExplorerPivotViewModel.prototype.actionRequest = function (action, additionalInfo, context) {
            var rootViewModel = context.$root, payload = {
                additionalInfo: additionalInfo,
                data: ko.mapping.toJS(rootViewModel.applicationOptions),
                reportId: rootViewModel.activeReport().key(),
                viewKey: rootViewModel.views.selected().key()
            };

            return this.net.postJson(action, payload);
        };
        return CashExplorerPivotViewModel;
    })(ag.PivotViewModel);
    ag.CashExplorerPivotViewModel = CashExplorerPivotViewModel;

    var CashExplorerPivotActionViewModel = (function () {
        function CashExplorerPivotActionViewModel() {
            this.showDialog = ko.observable(false);
        }
        CashExplorerPivotActionViewModel.prototype.display = function () {
            this.showDialog(true);
        };
        return CashExplorerPivotActionViewModel;
    })();
    ag.CashExplorerPivotActionViewModel = CashExplorerPivotActionViewModel;
})(ag || (ag = {}));
