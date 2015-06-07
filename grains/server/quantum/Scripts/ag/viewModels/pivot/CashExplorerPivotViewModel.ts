/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../models/MessagesViewModel.ts" />
/// <reference path="PivotViewModel.ts" />

module ag
{
   interface ICashExplorerGridResponse
   {
      data: any;
      pageTargets: any;
      gridViewOptions: any;
   }

   export class CashExplorerPivotViewModel extends PivotViewModel
   {
      action: CashExplorerPivotActionViewModel;
      drillDownCommand: KoliteAsyncCommand;
      directTradingCommand: KoliteAsyncCommand;
      net = new utils.Network();
      showDrillDownDialog = ko.observable(false);
      drillDownItem: any;

      constructor(
         selectedQuery,
         selectedView,
         activeReport,
         grid: GridViewModel,
         options)
      {
         super(selectedQuery, selectedView, activeReport, grid, _.extend(options, { pageSize: 500 }));
         this.action = new CashExplorerPivotActionViewModel();

         this.drillDownCommand = ko.asyncCommand(
            {
               execute: (data, event, callback) =>
               {
                  var context: KnockoutBindingContext = ko.contextFor(event.target);
                  this.actionRequest('drilldowndetails', data, context)
                     .then((result) =>
                     {
                        var cashFlows = result.data.cashFlowsDataSet,
                           root = context.$root,
                           action = root.actions.drillDownDetails,
                           grid = action.grids.cashFlowsDataSet;

                        action.isLoaded(true);
                        ko.mapping.fromJS(result.data, action.model);

                        var fieldData = _.map(cashFlows.fields, (f) =>
                        {
                           return ko.mapping.fromJS(new ViewFieldData(f));
                        });

                        grid.views.selected().appliedFields(fieldData);
                        this.populateGrid(grid, cashFlows);
                        action.showDialog(true);
                     })
                     .always(callback);
               }
            });

         this.directTradingCommand = ko.asyncCommand(
            {
               execute: (data, event, callback) =>
               {
                  var context: KnockoutBindingContext = ko.contextFor(event.target);
                  this.actionRequest('directTrading', data, context)
                     .then((result) =>
                     {
                        var root = context.$root,
                           action = root.actions.directTrading;
                        action.isLoaded(true);
                        ko.mapping.fromJS(result.data, action.model);
                        this.populateGrid(action.grids.transferToAccounts, result.data.transferToAccounts);
                        this.populateGrid(action.grids.recentDeals, result.data.recentDeals);
                        action.showDialog(true);
                     })
                     .always(callback);
               }
            });
      }

      private populateGrid(grid: GridViewModel, response: ICashExplorerGridResponse)
      {
         grid.loadData(response);
      }

      private getCellLinks(itemData): string[]
      {
         var value = itemData.value,
            additionalInfo = itemData.additionalInfo;

         if (!value)
            return [];

         if (!(_.has(additionalInfo, 'colKey') && _.has(additionalInfo, 'rowKey')))
            return [];

         return [
            '<a href="#" data-bind="command: $parents[1].drillDownCommand">Details...</a>',
            '<a href="#" data-bind="command: $parents[1].directTradingCommand"">Action...</a>'
         ];
      }

      private actionRequest(action: string, additionalInfo: any, context: KnockoutBindingContext): JQueryPromise<any>
      {
         var rootViewModel = context.$root,
            payload =
            {
               additionalInfo: additionalInfo,
               data: ko.mapping.toJS(rootViewModel.applicationOptions),
               reportId: rootViewModel.activeReport().key(),
               viewKey: rootViewModel.views.selected().key()
            };

         return this.net.postJson(action, payload);
      }
   }

   export class CashExplorerPivotActionViewModel
   {
      showDialog = ko.observable(false);

      display()
      {
         this.showDialog(true);
      }
   }
}