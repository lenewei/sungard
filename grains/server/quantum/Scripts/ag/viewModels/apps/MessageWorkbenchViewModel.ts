/// <reference path="../simpleViewModel.ts" />

module ag
{
    export class EchosMessagesViewModel extends SimpleViewModel
    {
        init(itemModel: any)
        {
            super.init(itemModel);

            var reconciliationMessagesGrid = this.grids.reconciliationMessages;
            var responseMessagesGrid = this.grids.responseMessages;
            var unresolvedMessagesGrid = this.grids.unresolvedMessages;

            reconciliationMessagesGrid.canDeleteIncomingMessageAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(reconciliationMessagesGrid, reconciliationMessagesGrid.itemKey, "canDeleteIncomingMessage");
            };

            reconciliationMessagesGrid.canSetStatusNotRequiredAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(reconciliationMessagesGrid, reconciliationMessagesGrid.itemKey, "canSetStatusNotRequired");
            };

            reconciliationMessagesGrid.canSetStatusPendingAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(reconciliationMessagesGrid, reconciliationMessagesGrid.itemKey, "canSetStatusPending");
            };

            responseMessagesGrid.canDeleteIncomingMessageAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(responseMessagesGrid, responseMessagesGrid.itemKey, "canDeleteIncomingMessage");
            };

            responseMessagesGrid.canSetStatusNotRequiredAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(responseMessagesGrid, responseMessagesGrid.itemKey, "canSetStatusNotRequired");
            };

            responseMessagesGrid.canSetStatusPendingAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(responseMessagesGrid, responseMessagesGrid.itemKey, "canSetStatusPending");
            };

            unresolvedMessagesGrid.canDeleteIncomingMessageAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(unresolvedMessagesGrid, unresolvedMessagesGrid.itemKey, "canDeleteIncomingMessage");
            };

            unresolvedMessagesGrid.canSetStatusNotRequiredAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(unresolvedMessagesGrid, unresolvedMessagesGrid.itemKey, "canSetStatusNotRequired");
            };

            unresolvedMessagesGrid.canSetStatusPendingAnythingSelected = () =>
            {
                return EchosMessagesViewModel.canPerformAction(unresolvedMessagesGrid, unresolvedMessagesGrid.itemKey, "canSetStatusPending");
            };

        }

        private static canPerformAction(grid: GridViewModel, itemKey: string, canProperty: string)
        {
            return grid.selected.all() || _.any(grid.selected.keys(), (key) =>
            {
                var item = _.find(grid.items(), (gridItem) =>
                {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        }

    }

    export class EFTMessagesViewModel extends SimpleViewModel
    {
        init(itemModel: any)
        {
            super.init(itemModel);

            var eftMessagesGrid = this.grids.eftMessages;

            eftMessagesGrid.canCancelEFTAnythingSelected = () =>
            {
                return EFTMessagesViewModel.canPerformAction(eftMessagesGrid, eftMessagesGrid.itemKey, "canCancelEFT");
            };

            eftMessagesGrid.canUndoRequestAnythingSelected = () =>
            {
                return EFTMessagesViewModel.canPerformAction(eftMessagesGrid, eftMessagesGrid.itemKey, "canUndoRequest");
            };

            eftMessagesGrid.canCreateFreeFormatMessageAnythingSelected = () =>
            {
                return EFTMessagesViewModel.canPerformAction(eftMessagesGrid, eftMessagesGrid.itemKey, "canCreateFreeFormatMessage");
            };

        }

        private static canPerformAction(grid: GridViewModel, itemKey: string, canProperty: string)
        {
            return grid.selected.all() || _.any(grid.selected.keys(), (key) =>
            {
                var item = _.find(grid.items(), (gridItem) =>
                {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        }

    }

    export class FreeFormatMessagesViewModel extends SimpleViewModel
    {
        init(itemModel: any)
        {
            super.init(itemModel);

            var freeFormatMessagesGrid = this.grids.freeFormatMessages;

            freeFormatMessagesGrid.canCreateFreeFormatMessageAnythingSelected = () =>
            {
                return FreeFormatMessagesViewModel.canPerformAction(freeFormatMessagesGrid, freeFormatMessagesGrid.itemKey, "canCreateFreeFormatMessage");
            };

        }

        private static canPerformAction(grid: GridViewModel, itemKey: string, canProperty: string)
        {
            return grid.selected.all() || _.any(grid.selected.keys(), (key) =>
            {
                var item = _.find(grid.items(), (gridItem) =>
                {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        }

    }

    export class ConfirmationMessagesViewModel extends SimpleViewModel
    {
        init(itemModel: any)
        {
            super.init(itemModel);

            var confirmationMessagesGrid = this.grids.confirmationMessages;

            confirmationMessagesGrid.canAmendConfirmationAnythingSelected = () =>
            {
                return ConfirmationMessagesViewModel.canPerformAction(confirmationMessagesGrid, confirmationMessagesGrid.itemKey, "canAmendConfirmation");
            };

            confirmationMessagesGrid.canCreateFreeFormatMessageAnythingSelected = () =>
            {
                return ConfirmationMessagesViewModel.canPerformAction(confirmationMessagesGrid, confirmationMessagesGrid.itemKey, "canCreateFreeFormatMessage");
            };

        }

        private static canPerformAction(grid: GridViewModel, itemKey: string, canProperty: string)
        {
            return grid.selected.all() || _.any(grid.selected.keys(), (key) =>
            {
                var item = _.find(grid.items(), (gridItem) =>
                {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        }

    }

}