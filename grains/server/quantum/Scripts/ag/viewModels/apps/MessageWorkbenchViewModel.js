/// <reference path="../simpleViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var EchosMessagesViewModel = (function (_super) {
        __extends(EchosMessagesViewModel, _super);
        function EchosMessagesViewModel() {
            _super.apply(this, arguments);
        }
        EchosMessagesViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);

            var reconciliationMessagesGrid = this.grids.reconciliationMessages;
            var responseMessagesGrid = this.grids.responseMessages;
            var unresolvedMessagesGrid = this.grids.unresolvedMessages;

            reconciliationMessagesGrid.canDeleteIncomingMessageAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(reconciliationMessagesGrid, reconciliationMessagesGrid.itemKey, "canDeleteIncomingMessage");
            };

            reconciliationMessagesGrid.canSetStatusNotRequiredAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(reconciliationMessagesGrid, reconciliationMessagesGrid.itemKey, "canSetStatusNotRequired");
            };

            reconciliationMessagesGrid.canSetStatusPendingAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(reconciliationMessagesGrid, reconciliationMessagesGrid.itemKey, "canSetStatusPending");
            };

            responseMessagesGrid.canDeleteIncomingMessageAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(responseMessagesGrid, responseMessagesGrid.itemKey, "canDeleteIncomingMessage");
            };

            responseMessagesGrid.canSetStatusNotRequiredAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(responseMessagesGrid, responseMessagesGrid.itemKey, "canSetStatusNotRequired");
            };

            responseMessagesGrid.canSetStatusPendingAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(responseMessagesGrid, responseMessagesGrid.itemKey, "canSetStatusPending");
            };

            unresolvedMessagesGrid.canDeleteIncomingMessageAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(unresolvedMessagesGrid, unresolvedMessagesGrid.itemKey, "canDeleteIncomingMessage");
            };

            unresolvedMessagesGrid.canSetStatusNotRequiredAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(unresolvedMessagesGrid, unresolvedMessagesGrid.itemKey, "canSetStatusNotRequired");
            };

            unresolvedMessagesGrid.canSetStatusPendingAnythingSelected = function () {
                return EchosMessagesViewModel.canPerformAction(unresolvedMessagesGrid, unresolvedMessagesGrid.itemKey, "canSetStatusPending");
            };
        };

        EchosMessagesViewModel.canPerformAction = function (grid, itemKey, canProperty) {
            return grid.selected.all() || _.any(grid.selected.keys(), function (key) {
                var item = _.find(grid.items(), function (gridItem) {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        };
        return EchosMessagesViewModel;
    })(ag.SimpleViewModel);
    ag.EchosMessagesViewModel = EchosMessagesViewModel;

    var EFTMessagesViewModel = (function (_super) {
        __extends(EFTMessagesViewModel, _super);
        function EFTMessagesViewModel() {
            _super.apply(this, arguments);
        }
        EFTMessagesViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);

            var eftMessagesGrid = this.grids.eftMessages;

            eftMessagesGrid.canCancelEFTAnythingSelected = function () {
                return EFTMessagesViewModel.canPerformAction(eftMessagesGrid, eftMessagesGrid.itemKey, "canCancelEFT");
            };

            eftMessagesGrid.canUndoRequestAnythingSelected = function () {
                return EFTMessagesViewModel.canPerformAction(eftMessagesGrid, eftMessagesGrid.itemKey, "canUndoRequest");
            };

            eftMessagesGrid.canCreateFreeFormatMessageAnythingSelected = function () {
                return EFTMessagesViewModel.canPerformAction(eftMessagesGrid, eftMessagesGrid.itemKey, "canCreateFreeFormatMessage");
            };
        };

        EFTMessagesViewModel.canPerformAction = function (grid, itemKey, canProperty) {
            return grid.selected.all() || _.any(grid.selected.keys(), function (key) {
                var item = _.find(grid.items(), function (gridItem) {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        };
        return EFTMessagesViewModel;
    })(ag.SimpleViewModel);
    ag.EFTMessagesViewModel = EFTMessagesViewModel;

    var FreeFormatMessagesViewModel = (function (_super) {
        __extends(FreeFormatMessagesViewModel, _super);
        function FreeFormatMessagesViewModel() {
            _super.apply(this, arguments);
        }
        FreeFormatMessagesViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);

            var freeFormatMessagesGrid = this.grids.freeFormatMessages;

            freeFormatMessagesGrid.canCreateFreeFormatMessageAnythingSelected = function () {
                return FreeFormatMessagesViewModel.canPerformAction(freeFormatMessagesGrid, freeFormatMessagesGrid.itemKey, "canCreateFreeFormatMessage");
            };
        };

        FreeFormatMessagesViewModel.canPerformAction = function (grid, itemKey, canProperty) {
            return grid.selected.all() || _.any(grid.selected.keys(), function (key) {
                var item = _.find(grid.items(), function (gridItem) {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        };
        return FreeFormatMessagesViewModel;
    })(ag.SimpleViewModel);
    ag.FreeFormatMessagesViewModel = FreeFormatMessagesViewModel;

    var ConfirmationMessagesViewModel = (function (_super) {
        __extends(ConfirmationMessagesViewModel, _super);
        function ConfirmationMessagesViewModel() {
            _super.apply(this, arguments);
        }
        ConfirmationMessagesViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);

            var confirmationMessagesGrid = this.grids.confirmationMessages;

            confirmationMessagesGrid.canAmendConfirmationAnythingSelected = function () {
                return ConfirmationMessagesViewModel.canPerformAction(confirmationMessagesGrid, confirmationMessagesGrid.itemKey, "canAmendConfirmation");
            };

            confirmationMessagesGrid.canCreateFreeFormatMessageAnythingSelected = function () {
                return ConfirmationMessagesViewModel.canPerformAction(confirmationMessagesGrid, confirmationMessagesGrid.itemKey, "canCreateFreeFormatMessage");
            };
        };

        ConfirmationMessagesViewModel.canPerformAction = function (grid, itemKey, canProperty) {
            return grid.selected.all() || _.any(grid.selected.keys(), function (key) {
                var item = _.find(grid.items(), function (gridItem) {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        };
        return ConfirmationMessagesViewModel;
    })(ag.SimpleViewModel);
    ag.ConfirmationMessagesViewModel = ConfirmationMessagesViewModel;
})(ag || (ag = {}));
