/// <reference path="../action/action.ts" />
/// <reference path="../reportingViewModel.ts" />

module ag
{
   export class SettlementViewModel extends ReportingViewModel
   {
      menuCommands: any = {};

      constructor(options)
      {
         super(options);
         this.supportPreviousRun = false;

         var grid = <any>this.grid;
         grid.hasReport = () =>
         {
            var report = this.activeReport();
            return report && report.key && report.key();
         };

         grid.isDealSelected = (transactionType: any) =>
         {
            var selection = grid.SelectSingle();

            if ($.isArray(transactionType)) return _.contains(transactionType, selection.transactionType);

            return selection && selection.transactionType === transactionType;
         };

         grid.SelectSingle = () =>
         {
            if (grid.selected.keys().length === 1)
            {
               var key = grid.selected.keys()[0];
               var itemKey = grid.itemKey;
               var item = _.find(grid.items(), (i) =>
               {
                  return i[itemKey] === key;
               });

               return item;
            }

            return null;
         };

         grid.isFlowType = (flowType: string) =>
         {
            var selection = grid.SelectSingle();
            return selection && selection.flowFlag === flowType;
         };

         grid.canAction = () =>
         {
            return this.canPerformAction(grid, grid.itemKey, "canAction");
         };

         grid.canUnaction = () =>
         {
            return this.canPerformAction(grid, grid.itemKey, "canUnaction");
         };

         grid.canMature = () =>
         {
            return this.canPerformAction(grid, grid.itemKey, "canMature");
         };

         grid.canApprove = () =>
         {
            return this.canPerformAction(grid, grid.itemKey, "canApprove");
         };

         grid.canReject = () =>
         {
            return this.canPerformAction(grid, grid.itemKey, "canReject");
         };

          grid.canConfirmation = () => {
              return this.canPerformAction(grid, grid.itemKey, "canConfirmation");
          };

         grid.canNetAsProposed = () =>
         {
             return this.canPerformAction(grid, grid.itemKey, "canNetAsProposed");
         };

         grid.canNet = () =>
         {
            var count = 0;
            for (var keyIndex = 0; keyIndex < grid.selected.keys().length; keyIndex++)
            {
               var item = _.find(grid.items(), (gridItem) =>
               {
                  return gridItem[grid.itemKey] == grid.selected.keys()[keyIndex];
               });

               if (item && (item["flowType"] === "Cash" || item["flowType"] === "Proposed")) count++;
               if (count > 0) return true;
            }

            return false;
         };

          grid.canAppendNet = () =>
          {
              var countCash = 0;
              var haveNet = false;
              for (var keyIndex = 0; keyIndex < grid.selected.keys().length; keyIndex++)
              {
                  var item = _.find(grid.items(), (gridItem) =>
                  {
                      return gridItem[grid.itemKey] == grid.selected.keys()[keyIndex];
                  });

                  if (item)
                  {
                     if (item["flowType"] === "Net") haveNet = true;
                     if (item && (item["flowType"] === "Cash")) countCash++;
                  }
                  if (haveNet && countCash >= 1) return true;
              }

              return false;
          };

          grid.canUnnet = () => {
              return this.canPerformAction(grid, grid.itemKey, "canUnnet");
          };

          grid.canClearNetAsProposed = () => {
              return this.canPerformAction(grid, grid.itemKey, "canClearNetAsProposed");
          };

         grid.isDealQuickSelected = (transactionType: string) =>
         {
            if (grid.quickMenuItem)
            {
               var item = grid.quickMenuItem();
               return item && item.transactionType === transactionType;
            }
            return false;
         };

         this.menuCommands.runQueryandNetCommand = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  this.processReport(false, ag.constants.ReportMode.Continue, 'runandnet').always(complete);
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

         (<any>ag).childWindowClosing = (viewModel, result, saved, windowHandle: Window) =>
         {
            this.childWindowClosing(viewModel, result, saved, windowHandle);
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

      childWindowClosing(viewModel, result, saved, windowHandle: Window)
      {
         // Get the row Id from the window that is closing
         var Id = utils.getQueryStringParameterByName("id", windowHandle.location.search)

         // Find the row by Id
         var row = _.find(this.grid.items(), (item: any) => item.id == Id);

         if (!row)
            messages.error(strings.unableToFindRow);

         this.setViewAsStale();
         this.grid.refresh(false);

         // Given a result from a child window display it
         if (result && result.message)
            messages.show(result.message, result.messageType);

         return true;
      }
   }
}