/// <reference path="../dealingViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var QuoteDealingViewModel = (function (_super) {
        __extends(QuoteDealingViewModel, _super);
        function QuoteDealingViewModel(options) {
            _super.call(this, options);
            this.options = options;
        }
        QuoteDealingViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.bidsGrid = this.grids.bidsReceivedInfo;

            var canExecuteCreateLiveDeal = function (isExecuting) {
                // Can execute when not a new Quote, the grid has a selected item,
                // and the deal number of the selected item is zero
                return !isExecuting && !_this.isNewItem();
                /* && this.bidsGrid.isAnythingSelected() && this.bidsGrid.selected.item() */ /* TEMP: work around for grid selections not being re-applied after grid refreshes */
                //&& this.bidsGrid.selected.item().linkedActualDeal1 == 0;
                            };

            // Open appropriate dealing application (with defaults set)
            // if successfully saved refresh the grid
            this.bidsGrid.menuCommands.createLiveDealCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.createLiveDeal().always(complete);
                },
                canExecute: canExecuteCreateLiveDeal
            });

            // Attempt to create live deal - headless
            // if successfully saved refresh the grid
            this.bidsGrid.menuCommands.createAndSaveLiveDealCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.createAndSaveLiveDeal().always(complete);
                },
                canExecute: canExecuteCreateLiveDeal
            });
        };

        QuoteDealingViewModel.prototype.childWindowClosing = function (viewModel, result, saved, windowHandle) {
            var _this = this;
            // Get the bidId of the window that has been opened by us for live deal creation
            var bidId = ag.utils.getQueryStringParameterByName("quoteBidId", windowHandle.location.search);

            // Find the bid by Id
            var bid = (_.find(this.bidsGrid.items(), function (item) {
                return item.id == bidId;
            }));

            if (!bid)
                ag.messages.error(ag.strings.unableToFindBid);

            // Update the selected items linked deal number
            bid.linkedActualDeal1 = result.data.dealNumber;

            // Post the updated bid (and model)
            var payload = { data: ko.mapping.toJS(this.editingItem), bidData: bid };
            this.net.postJson("updatequotewithbid", payload).then(function (response) {
                // Refresh the entire model
                ko.mapping.fromJS(response.data, _this.editingItem);

                // Refresh the grid of bids
                _this.bidsGrid.refresh(false);

                // Given a result from a child window display it
                if (result && result.message)
                    ag.messages.show(result.message, result.messageType);
            });

            return true;
        };

        QuoteDealingViewModel.prototype.createLiveDeal = function () {
            return this.net.validateUnmapAndPostJson("createlivedeal", this.editingItem).then(function (result) {
                // Open a window as a dialog, dialog = 2 => Save and Cancel toolbar options
                ag.utils.openApplicationWindow(result.url, $.extend({ dialog: 2 }, result.data));
            });
        };

        QuoteDealingViewModel.prototype.createAndSaveLiveDeal = function () {
            var _this = this;
            return this.net.validateUnmapAndPostJson("createandsavelivedeal", this.editingItem).then(function (response) {
                if (response && response.message)
                    ag.messages.show(response.message, response.messageType);

                _this.createItem();
            });
        };
        return QuoteDealingViewModel;
    })(ag.DealingViewModel);
    ag.QuoteDealingViewModel = QuoteDealingViewModel;
})(ag || (ag = {}));
