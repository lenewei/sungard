/// <reference path="../dealingViewModel.ts" />

module ag
{
   export class QuoteDealingViewModel extends DealingViewModel
   {
      bidsGrid: GridViewModel;

      constructor(public options: IAppViewModelOptions)
      {
         super(options);
      }

      init(itemModel: any)
      {
         super.init(itemModel);

         this.bidsGrid = <GridViewModel>this.grids.bidsReceivedInfo;

         var canExecuteCreateLiveDeal = (isExecuting: boolean) =>
         {
            // Can execute when not a new Quote, the grid has a selected item, 
            // and the deal number of the selected item is zero
            return !isExecuting && !this.isNewItem();
            /* && this.bidsGrid.isAnythingSelected() && this.bidsGrid.selected.item() */ /* TEMP: work around for grid selections not being re-applied after grid refreshes */
            //&& this.bidsGrid.selected.item().linkedActualDeal1 == 0;
         };

         // Open appropriate dealing application (with defaults set)
         // if successfully saved refresh the grid
         this.bidsGrid.menuCommands.createLiveDealCommand = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  this.createLiveDeal().always(complete);
               },
               canExecute: canExecuteCreateLiveDeal
            });

         // Attempt to create live deal - headless
         // if successfully saved refresh the grid
         this.bidsGrid.menuCommands.createAndSaveLiveDealCommand = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  this.createAndSaveLiveDeal().always(complete);
               },
               canExecute: canExecuteCreateLiveDeal
            });
      }

      childWindowClosing(viewModel, result, saved, windowHandle: Window)
      {
         // Get the bidId of the window that has been opened by us for live deal creation
         var bidId = utils.getQueryStringParameterByName("quoteBidId", windowHandle.location.search);

         // Find the bid by Id
         var bid = <any>(_.find(this.bidsGrid.items(), (item: any) => item.id == bidId));

         if (!bid)
            messages.error(strings.unableToFindBid);

         // Update the selected items linked deal number
         bid.linkedActualDeal1 = result.data.dealNumber;

         // Post the updated bid (and model)
         var payload = { data: ko.mapping.toJS(this.editingItem), bidData: bid };
         this.net.postJson("updatequotewithbid", payload).then((response) =>
         {
            // Refresh the entire model
            ko.mapping.fromJS(response.data, this.editingItem);

            // Refresh the grid of bids
            this.bidsGrid.refresh(false);

            // Given a result from a child window display it
            if (result && result.message)
               messages.show(result.message, result.messageType);
         });

         return true;
      }

      createLiveDeal(): JQueryPromise<any>
      {
         return this.net.validateUnmapAndPostJson("createlivedeal", this.editingItem).then((result) =>
         {
            // Open a window as a dialog, dialog = 2 => Save and Cancel toolbar options
            utils.openApplicationWindow(result.url, $.extend({ dialog: 2 }, result.data));
         });
      }

      createAndSaveLiveDeal(): JQueryPromise<any>
      {
         return this.net.validateUnmapAndPostJson("createandsavelivedeal", this.editingItem).then((response) =>
         {
            if (response && response.message)
               messages.show(response.message, response.messageType);

            this.createItem();
         });
      }
   }
}