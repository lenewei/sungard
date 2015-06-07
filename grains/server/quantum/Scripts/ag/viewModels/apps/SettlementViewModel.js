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
    var SettlementViewModel = (function (_super) {
        __extends(SettlementViewModel, _super);
        function SettlementViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.menuCommands = {};
            this.supportPreviousRun = false;

            var grid = this.grid;
            grid.hasReport = function () {
                var report = _this.activeReport();
                return report && report.key && report.key();
            };

            grid.isDealSelected = function (transactionType) {
                var selection = grid.SelectSingle();

                if ($.isArray(transactionType))
                    return _.contains(transactionType, selection.transactionType);

                return selection && selection.transactionType === transactionType;
            };

            grid.SelectSingle = function () {
                if (grid.selected.keys().length === 1) {
                    var key = grid.selected.keys()[0];
                    var itemKey = grid.itemKey;
                    var item = _.find(grid.items(), function (i) {
                        return i[itemKey] === key;
                    });

                    return item;
                }

                return null;
            };

            grid.isFlowType = function (flowType) {
                var selection = grid.SelectSingle();
                return selection && selection.flowFlag === flowType;
            };

            grid.canAction = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canAction");
            };

            grid.canUnaction = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canUnaction");
            };

            grid.canMature = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canMature");
            };

            grid.canApprove = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canApprove");
            };

            grid.canReject = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canReject");
            };

            grid.canConfirmation = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canConfirmation");
            };

            grid.canNetAsProposed = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canNetAsProposed");
            };

            grid.canNet = function () {
                var count = 0;
                for (var keyIndex = 0; keyIndex < grid.selected.keys().length; keyIndex++) {
                    var item = _.find(grid.items(), function (gridItem) {
                        return gridItem[grid.itemKey] == grid.selected.keys()[keyIndex];
                    });

                    if (item && (item["flowType"] === "Cash" || item["flowType"] === "Proposed"))
                        count++;
                    if (count > 0)
                        return true;
                }

                return false;
            };

            grid.canAppendNet = function () {
                var countCash = 0;
                var haveNet = false;
                for (var keyIndex = 0; keyIndex < grid.selected.keys().length; keyIndex++) {
                    var item = _.find(grid.items(), function (gridItem) {
                        return gridItem[grid.itemKey] == grid.selected.keys()[keyIndex];
                    });

                    if (item) {
                        if (item["flowType"] === "Net")
                            haveNet = true;
                        if (item && (item["flowType"] === "Cash"))
                            countCash++;
                    }
                    if (haveNet && countCash >= 1)
                        return true;
                }

                return false;
            };

            grid.canUnnet = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canUnnet");
            };

            grid.canClearNetAsProposed = function () {
                return _this.canPerformAction(grid, grid.itemKey, "canClearNetAsProposed");
            };

            grid.isDealQuickSelected = function (transactionType) {
                if (grid.quickMenuItem) {
                    var item = grid.quickMenuItem();
                    return item && item.transactionType === transactionType;
                }
                return false;
            };

            this.menuCommands.runQueryandNetCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.processReport(false, ag.constants.ReportMode.Continue, 'runandnet').always(complete);
                }
            });

            //this.menuCommands.counterpartyInstructionsCommand.execute = (complete) =>
            //        {
            //            this.counterpartyInstructions().always(complete);
            //        };
            //(<any>ag).childWindowOpened = (viewModel, windowHandle: Window) =>
            //{
            //    this.childWindowOpened(viewModel, windowHandle);
            //};
            ag.childWindowClosing = function (viewModel, result, saved, windowHandle) {
                _this.childWindowClosing(viewModel, result, saved, windowHandle);
            };
        }
        //counterpartyInstructions(): JQueryPromise
        //{
        //     // Open a window as a dialog, dialog = 2 => Save and Cancel toolbar options
        //     utils.openApplicationWindow(result.url, $.extend({ dialog: 2 }, result.data));
        //}
        //afterApplyBindings()
        //{
        //var grid = this.grid,
        //   actions = grid.actions,
        //fxExtendAction = <Action>actions.fxExtendPreDeliver,
        //fxSwapAction = <Action>actions.foreignExchangeSwap,
        //rateSetAction = <Action>actions.rateSet,
        //rateFixAction = <Action>actions.rateFix,
        //rollDealAction = <Action>actions.rollDeal;
        //  summaryAction = <Action>actions.summary;
        //var createCustomPayload = () =>
        //{
        //   var key = grid.selected.keys()[0];
        //   var item: any = _.find(grid.items(), (i) =>
        //   {
        //      return i[grid.itemKey] === key;
        //   });
        //   if (item)
        //   {
        //      return {
        //         id: item.id,
        //         dealNumber: item.dealNumber,
        //      };
        //   }
        //};
        //fxExtendAction.createCustomPayload = createCustomPayload;
        //fxSwapAction.createCustomPayload = createCustomPayload;
        //rateSetAction.createCustomPayload = createCustomPayload;
        //rateFixAction.createCustomPayload = createCustomPayload;
        //rollDealAction.createCustomPayload = createCustomPayload;
        //summaryAction.createCustomPayload = (data) =>
        //{
        //    return {
        //        reportNumber: this.applicationOptions.reportNumber()
        //    };
        //};
        //}
        SettlementViewModel.prototype.childWindowClosing = function (viewModel, result, saved, windowHandle) {
            // Get the row Id from the window that is closing
            var Id = ag.utils.getQueryStringParameterByName("id", windowHandle.location.search);

            // Find the row by Id
            var row = _.find(this.grid.items(), function (item) {
                return item.id == Id;
            });

            if (!row)
                ag.messages.error(ag.strings.unableToFindRow);

            this.setViewAsStale();
            this.grid.refresh(false);

            // Given a result from a child window display it
            if (result && result.message)
                ag.messages.show(result.message, result.messageType);

            return true;
        };
        return SettlementViewModel;
    })(ag.ReportingViewModel);
    ag.SettlementViewModel = SettlementViewModel;
})(ag || (ag = {}));
