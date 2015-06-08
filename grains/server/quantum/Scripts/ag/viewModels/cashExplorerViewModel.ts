/// <reference path="dealingViewModel.ts" />
/// <reference path="pivot/CashExplorerPivotViewModel.ts" />
/// <reference path="reportingViewModel.ts" />
/// <reference path="../viewModels/FiltersViewModel.ts" />

interface ICashExplorerReportingApplicationOptions extends IReportingApplicationOptions
{
   view: any;
   worksheet: any;
   poolAssignment: any;
   poolDefinition: any;
   dataVersionPoolAssignment: any;
   pivotView: any;
   dataVersion: any;
   actualTransferDetailsUrl: string
}

interface ICashConcentrationToken
{
   id: string;
   action: string;
   sequence: number;
   transactionType: string;
   isSource: boolean;
}

class CashConcentrationToken implements ICashConcentrationToken
{
   constructor(public id: string, public action: string, public transactionType: string, public sequence: number, public isSource: boolean)
   {
      this.id = id;
      this.action = action;
      this.transactionType = transactionType;
      this.sequence = sequence;
      this.isSource = isSource;
   }
}

module ag
{
// Cash Explorer definintion and relsted functionality
   export class CashExplorerViewModel extends ReportingViewModel
   {
      private showRunReportDialog = ko.observable(false);
      private columnGroupsSubscription: any;
      private gridRefresh: any[] = [];
      private isQueryNew: KnockoutComputed<any>;
      private queryModeChanged: KnockoutComputed<any>;
      private canMaintainWorksheet: KnockoutComputed<boolean>;
      private canMaintainVersions: KnockoutComputed<boolean>;
      private canExport: KnockoutComputed<boolean>;
      private canMaintainAnything: KnockoutComputed<boolean>;
      private canMaintainViews: KnockoutComputed<boolean>;

      private remoteJobs: ICashConcentrationToken[] = [];
      private viewNameChanged: KnockoutComputed<any>;
      private worksheetViews: any[] = [];

      deleteDataVersionAction: string;
      menuCommands: any;
      viewAttributeFilters: any;
      refreshReportCommand: KoliteAsyncCommand;

      usedViewAttributeFilters: KnockoutComputed<any>;
      usedViewPoolFilters: KnockoutComputed<any>;
      usedDataVersionViewFilters: KnockoutComputed<any>;
      actions: any;
      applicationOptions: ICashExplorerReportingApplicationOptions;
      gridSubscriptions: any[] = [];
      typeMetaDataUrl: string;
      showDialog = ko.observable(false);
      payload: any;
      getViewAttributeFilters: () => any;
      getViewPoolFilters: () => any;
      updateViewAttributeFilters: (items: any) => any;
      updateViewPoolFilters: (items: any) => any;

      
      constructor(public options: IReportingViewModelOptions)
      {
         super(options);
         this.runViewAction = "refreshView";

         this.menuCommands = {};

         this.isQueryNew = ko.computed(() =>
         {
            return this.editingQuery.key() === ag.ReportingViewModel.newQueryKey;
         }, this);


         this.canMaintainWorksheet = ko.computed(() =>
         {
            return this.applicationOptions.worksheet.canMaintainWorksheet();
         }, this, { deferEvaluation: true });

         this.canMaintainVersions = ko.computed(() => {
            return this.applicationOptions.worksheet.canMaintainVersions();
         }, this, { deferEvaluation: true });

         this.canExport = ko.computed(() => {
            return this.applicationOptions.worksheet.canExport();
         }, this, { deferEvaluation: true });

         this.canMaintainAnything = ko.computed(() => {
            return this.canMaintainWorksheet() || this.canMaintainVersions() || this.canExport();
         }, this, { deferEvaluation: true });

         this.canMaintainViews = ko.computed(() => {
            return this.applicationOptions.worksheet.canMaintainViews();
         }, this, { deferEvaluation: true });

         this.viewNameChanged = ko.computed(() =>
         {
            if (!this.applicationOptions) return;
            this.views.selected().name = this.applicationOptions.pivotView.name();
         }, this);

         (<any>this.grid).isViewSelected = () =>
         {
            var views = (<any>this.grid).views;
            return views.all().length > 0 && views.selected() && views.selected().clientKey();
         }

         (<any>this.grid).canMaintainViews = () =>
         {
            return this.canMaintainViews;
         }

         (<any>this.grid).views.canSave = ko.computed(() =>
         {
            return this.canMaintainViews();
         }, this, { deferEvaluation: true });

         this.grid.views.viewSelector.displayViewTypeBadge(false);

         this.usedViewAttributeFilters = ko.computed(() =>
         {
            return this.applicationOptions.pivotView.attributeFilters;
         }, this, { deferEvaluation: true });

         this.usedViewPoolFilters = ko.computed(() =>
         {
            return this.applicationOptions.pivotView.poolFilters;
         }, this, { deferEvaluation: true });

         this.usedDataVersionViewFilters = ko.computed(() =>
         {
            return this.applicationOptions.pivotView.attributeFilters;
         }, this, { deferEvaluation: true });

         if (this.editingQuery)
         {
            this.selectedQuery(this.editingQuery);
         }

         if (!this.selectedQuery() && this.queries().length > 0)
         {
            this.selectedQuery(this.queries()[0]);
         }

         this.getViewAttributeFilters = () =>
         {
            return this.applicationOptions.pivotView.attributeFilters();
         }

         this.updateViewAttributeFilters = (items: any) =>
         {
            this.updateViewFilters(items, this.applicationOptions.pivotView.attributeFilters);
         }

         this.getViewPoolFilters = () =>
         {
            return this.applicationOptions.pivotView.poolFilters();
         }

         this.updateViewPoolFilters = (items: any) =>
         {
            this.updateViewFilters(items, this.applicationOptions.pivotView.poolFilters);
         }

         this.views.selected.subscribeChanged((newValue: any, oldValue: any) =>
         {
            this.worksheetViews[oldValue.clientKey()] = ko.mapping.toJS(this.applicationOptions.pivotView);
            var key = newValue.clientKey();
            if (key in this.worksheetViews && key != this.applicationOptions.pivotView.key)
               ko.mapping.fromJS(this.worksheetViews[key], this.applicationOptions.pivotView);
         });


         // override exting inherited properties
         this.deleteDataVersionAction = 'deleteDataVersion';
         this.showParameters = this.showConfiguration;


         this.pivot.reportProxy = new ReportProxy({ runViewAction: 'refreshView' });

         this.viewAttributeFilters = new ag.FiltersViewModel(this.filterOptions);

         // method to call on controller
         this.runViewAction = "refreshView";

         // delete data version action
         this.actions = {};
         this.actions.deleteDataVersion =
         {
            showDialog: ko.observable(false),
            invokeCommand: ko.asyncCommand(
            {
               execute: (parentViewModel, complete) =>
               {
                  this.deleteActiveDataVersion(this.actions.deleteDataVerison, this.payload); //.always(complete);
               }
            })

         };

         // action to perform when user clsoses related window
         (<any>ag).childWindowClosing = (viewModel: DealingViewModel, result: any, saved: any, windowHandle: Window) =>
         {
            if (saved && result)
            {
               messages.show(result.message + " " + strings.updatingWorksheet, result.messageType);

               var dealNumber: number = result.data.dealNumber;

               this.runReportRequest(false, 1, this.grid.getGridViewOptionsQueryString(), "refreshWithDeals",
               {
                  deals: [
                     {
                        dealNumber: result.data.dealNumber,
                        instrument: result.data.instrument,
                        transactionType: result.data.transactionType,
                        security: result.data.security
                     }
                  ]
               }).done(() => messages.success(strings.dataVersionUpd + " " + dealNumber));
            }
            else
            {
               var tokenId: any = (ag.utils.getQueryStringParameterByName("token", windowHandle.location.search));

               if (tokenId)
               {
                  var token = this.remoteJobs[tokenId];
                  if (token)
                  {
                     this.updateConcentrationTransfer(windowHandle.ko.mapping.toJSON(viewModel.editingItem), token);
                  }
               }
            }
         };
      }

      // update existing concentration entry
      private updateConcentrationTransfer(transferData: any, token: ICashConcentrationToken)
      {
         var grid = this.actions.concentrationCash.grids.cashConcentrations;
         // Find the concentrationFlow
         var item = _.find(grid.items(), (item: any) => item.sequenceNumber == token.sequence);
         if (!item)
         {
            messages.error(strings.noConcentration);
         }
         // Post the updated bid (and model)
         var payload =
         {
            data: ko.mapping.toJS(ag.utils.getAdditionalFieldsFromModel("worksheet.key, pivotView.key, pivotView.viewType", this.applicationOptions)),
            concentrationItem: item,
         };

         $.extend(payload, { transferData: $.parseJSON(transferData) });

         this.net.postJson(token.action, payload).then((response) =>
         {
            grid.refresh(false);
            if (response && response.message)
               messages.show(response.message, response.messageType);
         });
         return true;
      }

      init(model)
      {
         super.init(model);

         // update report
         this.refreshReportCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.processReport(false, ag.constants.ReportMode.Continue).always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return (!isExecuting && !this.isQueryNew());
            }
         });

         // create report
         this.runReportCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.menuCommands.createNewDataVersionCommand;
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && (!this.refreshReportCommand || !this.refreshReportCommand.isExecuting()) && !this.isQueryNew();
            }
         });

         this.saveConfigurationCommand.canExecute = this.canMaintainWorksheet;
      }

      beforeApplyBindings()
      {
         // direct trading actions
         var directTradingAction = this.actions.directTrading;
         directTradingAction.popDeal = ko.asyncCommand(
         {
            execute: (data, event, complete) =>
            {
               var $element = $(event.target),
                   dealType = $element.data('deal-type');

               directTradingAction.showDialog(false);
               this.popWindow(dealType, ko.mapping.toJS(data.model))
                  .always(complete);
            }
         });

         directTradingAction.accountTransfer = ko.asyncCommand(
         {
            execute: (data, event, complete) =>
            {
               var dealType = "at";

               var model: any = ko.mapping.toJS(directTradingAction.model);
               model.transferTo = data;
               directTradingAction.showDialog(false);
               this.popWindow(dealType, model)
                  .always(complete);
            }
         });

         directTradingAction.recentDeal = ko.asyncCommand(
         {
            execute: (data, event, complete) =>
            {
               var newData = ko.mapping.toJS(data);
               var dealType = newData.transactionType.toLowerCase();
               var model: any = ko.mapping.toJS(directTradingAction.model);
               model.instrument = newData.instrument;
               model.transactionType = newData.transactionType;
               model.security = newData.security;
               directTradingAction.showDialog(false);
               this.popWindow(dealType, model)
                  .always(complete);
            }
         });

         var directTradingGrid = directTradingAction.grids.transferToAccounts;
         directTradingGrid.getCellLinks = () =>
         {
            return [
               '<a href="#" data-bind="command: $parents[3].accountTransfer"></a>'
            ];
         };

         var directTradingRecentDealGrid = directTradingAction.grids.recentDeals;
         directTradingRecentDealGrid.getCellLinks = () =>
         {
            return [
               '<a href="#" data-bind="command: $parents[3].recentDeal"></a>'
            ];
         };


         // concentration actions
         var cashConcentrationsGrid = this.actions.concentrationCash.grids.cashConcentrations;
         cashConcentrationsGrid.getCellLinks = (context: KnockoutBindingContext) =>
         {
            var row = context.$parent;

            if (row.transferType === 'AT')
               return [
                  '<a href="#" data-bind="command: $parents[2].menuCommands.editConcentrationTransferCommand">' + strings.editConcentration + '...</a>',
                  '<a href="#" data-bind="command: $parents[2].menuCommands.changeTransferTypeCommand">' + strings.changeTransferType + '...</a>'
               ];

            if (row.transferType === 'AC')
               return [
                  '<a href="#" data-bind="command: $parents[2].menuCommands.editSourceTransferCommand">' + strings.editTransferSrc + '...</a>',
                  '<a href="#" data-bind="command: $parents[2].menuCommands.editDestinationTransferCommand">' + strings.editTransferDest + '...</a>',
                  '<a href="#" data-bind="command: $parents[2].menuCommands.changeTransferTypeCommand">' + strings.changeTransferType + '...</a>'
               ];

            return ['<a href="#" data-bind="command: $parents[2].menuCommands.changeTransferTypeCommand">' + strings.changeTransferType + '...</a>'];
         };

         var concentrationMenuCommands = this.actions.concentrationCash.grids.cashConcentrations.menuCommands;

         // Open appropriate dealing application (with defaults set)
         // if successfully saved refresh the grid
         concentrationMenuCommands.editConcentrationTransferCommand = ko.asyncCommand(
         {
            execute: (data, event, complete) =>
            {
               this.editConcentrationTransfer(data).always(complete);
            }
         });

         // Open appropriate dealing application (with defaults set)
         // if successfully saved refresh the grid
         concentrationMenuCommands.editSourceTransferCommand = ko.asyncCommand(
         {
            execute: (data, event, complete) =>
            {
               this.editConcentrationSource(data).always(complete);
            }
         });

         // Open appropriate dealing application (with defaults set)
         // if successfully saved refresh the grid
         concentrationMenuCommands.editDestinationTransferCommand = ko.asyncCommand(
         {
            execute: (data, event, complete) =>
            {
               this.editConcentrationDestination(data).always(complete);
            }
         });
      }

      afterApplyBindings()
      {
         // required for change concentration transfer type
         var grid: any = this.actions.concentrationCash.grids.cashConcentrations;
         grid.actions.editConcentrationTransferType.createCustomPayload = () =>
         {
            var key = grid.selected.keys()[0];
            var item = _.find(grid.items(), (i) =>
            {
               return i[grid.itemKey] === key;
            });

            if (item)
            {
               var additionalFields = ag.utils.getAdditionalFieldsFromModel(grid.options.additionalFields, this.applicationOptions);
               return {
                  data: additionalFields,
                  concentrationItem: item
               };
            }
         };


         (<any>this.grid).postCreateView = (model: any, action: any) =>
         {
            var viewKey = action.data.view;

            var _views = (<any>this.grid).views;

            var views = ko.mapping.toJS(_views.all);
            action.data.view.name = action.data.viewSummary.name = ag.utils.ensureUniqueName(action.data.viewSummary.name, views, "name");

            // Make observable
            var view = ko.mapping.fromJS(new ag.ViewData(action.data.viewSummary));

            // Add the query to the queries collection
            _views.all.push(view);

            // Update the selected view (we also need to update the editing view here as we're
            // not going to be navigating to an existing view which usually updates editingQuery).
            _views.selected(view);

            // if (_this.afterViewCreated)
            //    _this.afterViewCreated(view);

            ko.mapping.fromJS(action.data.view, this.applicationOptions.pivotView);
            // Show the Configuration area for the new View
            _views.showConfigure(true);
         }


         (<any>this.grid).postDeleteView = (model: any, action: any) =>
         {
            var _views = (<any>this.grid).views;
            var view = _views.selected();
            view.isSystem(false);
            view.key(null);

            if (view.clientKey in this.worksheetViews)
            {
               delete this.worksheetViews[view.clientKey];
            }
            _views.deleteSelected();

         }
      }

      // cash concentration entry functions

      private editConcentrationTransfer(item: any): JQueryPromise<any>
      {
         var token: ICashConcentrationToken = new CashConcentrationToken(item.id, "UpdateConcentrationTransfer", "at", item.sequenceNumber, false);
         return this.getConcentrationTransfer('editConcentrationTransfer', token.transactionType, 'banking/cash-transfer', item, token);
      }

      private editConcentrationSource(item: any): JQueryPromise<any>
      {
         return this.editConcentrationActualCashFlow("editConcentrationTransferSource", "UpdateConcentrationSource", true, item);
      }

      private editConcentrationDestination(item: any): JQueryPromise<any>
      {
         return this.editConcentrationActualCashFlow("editConcentrationTransferDestination", "UpdateConcentrationDestination", false, item);
      }

      private editConcentrationActualCashFlow(action: string, updateAction: string, isSource: boolean, concentrationItem: any): JQueryPromise<any>
      {
         var token: ICashConcentrationToken = new CashConcentrationToken(concentrationItem.id, updateAction, "ac", concentrationItem.sequenceNumber, isSource);
         return this.getConcentrationTransfer(action, token.transactionType, 'dealing/actual-cashflow', concentrationItem, token);
      }

      private getConcentrationTransfer(action: string, transType: string, path: string, item: any, token: ICashConcentrationToken): JQueryPromise<any>
      {
         var parameters =
         {
            data: ko.mapping.toJS(this.applicationOptions),
            concentrationItem: ko.mapping.toJS(item)
         };

         return this.net.postJson(action, () => parameters).then((result) =>
         {
            var payload: any = result.data;
            payload.dialog = 1;
            payload.dealNumber = null;
            this.remoteJobs[token.id] = token;
            payload.token = token.id;
            this.openDeal(transType, [path, payload]);
         });
      }

      // secondary window operations, e.g. deal editing

      private popWindow(dealType, model): JQueryPromise<any>
      {
         var pathAndData = this.getPathAndDataForDealType(dealType, model);

         return this.openDeal(dealType, pathAndData);
      }

      private openDeal(dealType, pathAndData): JQueryPromise<any>
      {
         return utils.openApplicationWindowPromise(
            ag.siteRoot + pathAndData[0],
            pathAndData[1]);
      }

      private getPathAndDataForDealType(dealType, model)
      {
         var payload: any =
         {
            dialog: 2
         };

         switch (dealType)
         {
         case 'fx':
            if (model.transactionType == 'FX') this.setDealProperty(payload, "instrument", model.instrument);
            if (model.amount > 0)
            {
               this.setDealProperty(payload, "otherCurrency", model.currency);
               this.setDealProperty(payload, "otherFacevalue", model.absoluteAmount);
            }
            else
            {
               this.setDealProperty(payload, "currency", model.currency);
               this.setDealProperty(payload, "faceValue", model.absoluteAmount);
            }

            return ['dealing/fx', payload];
         case 'ac':
            this.setCashFlowProperties(payload, model);
            if (model.transactionType == 'AC') this.setDealProperty(payload, "instrument", model.instrument);
            return ['dealing/actual-cashflow', payload];
         case 'pc':
            this.setCashFlowProperties(payload, model);
            if (model.transactionType == 'PC') this.setDealProperty(payload, "instrument", model.instrument);
            return ['dealing/projected-cashflow', payload];
         case 'sec':
         case 'se':
            if (model.transactionType == 'SE') this.setDealProperty(payload, "instrument", model.instrument);
            this.setDealProperty(payload, "currency", model.currency);
            this.setDealProperty(payload, "faceValue", model.absoluteAmount);
            this.setDealProperty(payload, "security", (model.security || (dealType == "sec")));
            var path = (model.security || (dealType == "sec")) ? "dealing/security" : "dealing/money-market";
            return [path, payload];
         case 'at':
            this.setCashTransferProperties(payload, model);
            return ['banking/cash-transfer', payload];
         }

         throw new Error('Unknown deal type.');
      }

      // actual cashflow
      private setCashFlowProperties(payload: any, model: any): any
      {
         this.setDealProperty(payload, "dealDate", model.dealDate);
         this.setDealProperty(payload, "valueDate", model.settleDate);
         this.setDealProperty(payload, "settlementDate", model.settleDate);
         this.setDealProperty(payload, "amount", model.absoluteAmount);
         this.setDealProperty(payload, "currency", model.currency);
         this.setDealProperty(payload, "accountNumber", model.account);
         this.setDealProperty(payload, "paymentReceive", model.amount <= 0 ? "Pay" : "Receive");

         return payload;
      }

      // cash transfer - editing transfer
      private setCashTransferPropertiesForEdit(transfer: any, model: any): any
      {
         var source = model.source;
         var destination = model.destination;

         this.setDealProperty(transfer, "instrument", source.Instrument ? source.instrument : destination.instrument);
         this.setDealProperty(transfer, "dealDate", source.dealDate);
         this.setDealProperty(transfer, "settlementDate", source.settleDate);
         this.setDealProperty(transfer, "ticketNumber", source.ticketNumber);
         this.setDealProperty(transfer, "currency", source.currency);
         this.setDealProperty(transfer, "faceValue", source.amount);
         this.setDealProperty(transfer, "comments", source.comments);
         this.setDealProperty(transfer, "accountNumber", source.accountNumber);
         this.setDealProperty(transfer, "entity", source.entity);
         this.setDealProperty(transfer, "accountNumber", destination.accountNumber);
         this.setDealProperty(transfer, "entity", destination.entity);

         return transfer;
      }

      // cash transfer - deal save
      private setCashTransferProperties(payload: any, model: any): any
      {
         this.setDealProperty(payload, "settlementDate", model.settleDate);
         this.setDealProperty(payload, "dealDate", model.dealDate);
         if (model.transactionType == 6) this.setDealProperty(payload, "instrument", model.instrument);
         this.setDealProperty(payload, "currency", model.currency);
         this.setDealProperty(payload, "faceValue", model.absoluteAmount);
         if (model.amount > 0)
         {
            this.setDealProperty(payload, "sourceAccountNumber", model.account);
            if (model.transferTo)
            {
               this.setDealProperty(payload, "destinationAccountNumber", model.transferTo.number);
            }
         }
         else
         {
            this.setDealProperty(payload, "destinationAccountNumber", model.account);
            if (model.transferTo)
            {
               this.setDealProperty(payload, "sourceAccountNumber", model.transferTo.number);
            }
         }
         return payload;
      }

      private setDealProperty(payload, destination: string, modelProp: any)
      {
         if (modelProp)
         {
            payload[destination] = modelProp;
         }
      }

      // various methods for supporting cash explorer


      removeViewAttributeFilter(item: any)
      {
         this.applicationOptions.pivotView.attributeFilters.remove(item);
      }

      removeViewPoolFilter(item: any)
      {
         this.applicationOptions.pivotView.poolFilters.remove(item);
      }


      getViewAttributeFieldLookupSource()
      {
         return "/{0}/{1}".format(this.options.serviceUrl, "GetAttributeFilterFields");
      }

      public currentViewKey(): string
      {
         var key = this.views.selected().key();
         return !key ? this.applicationOptions.pivotView.key() : key;
      }

      public applyViewRequest()
      {
         this.showConfiguration(false);
         this.views.showConfigure(false);
         this.pivot.refreshPivot(this.applicationOptions.pivotView, false);
      }

      public saveReportView()
      {
         var action = this.applicationOptions.pivotView.key() ? "editQueryView" : "createQueryView",
             isNewDefault = action === "createQueryView",
             viewData = ko.mapping.toJS(this.views.selected),
             payload = { view: ko.mapping.toJS(this.applicationOptions.pivotView), queryKey: ko.unwrap(this.editingQuery.key) },
             deferred = $.Deferred();


         var isValid = this.net.postJson(action, payload).then(
         (result) =>
         {
            this.grid.views.showConfigure(false);
            messages.show(result.message, result.messageType);

           // ko.mapping.fromJS(result.data, this.applicationOptions.pivotView);

            var forceRefresh = this.grid.views.selected().key() != result.data.key;

            if (forceRefresh)
            {
               var view = this.grid.views.selected();
               if (view)
               {
                  view.clientKey(result.data.key);
                  view.key(result.data.key);
                  view.name(result.data.name);
               }
            }
            else
            {
               this.grid.refreshData();
            }
               

            // Success
            deferred.resolve();
         },
         () =>
         {
            // Error
            deferred.fail();
         });

         // If the view failed client-side validation resolve the promise immediately
         if (!$.isEmptyObject(isValid) && !isValid)
            deferred.resolve();

         // Return deferred object to allow chaining for those that are interested. 
         // Save new View before running a report is an example usage.
         return deferred.promise();
      }

      getViewPoolFieldLookupSource()
      {
         return "/{0}/{1}".format(this.options.serviceUrl, "GetPoolFilterFields");
      }

      showRunReportDialogCommand()
      {
         this.showRunReportDialog(true);
      }

      selectPool(poolName: String)
      {
         this.applicationOptions.poolAssignment.selectedPool(poolName);
         this.grids.poolAssignment.assignments.refresh();
      }

      //dataVersionSelectPool(poolName: String)
      //{
      //    this.applicationOptions.dataVersion.poolAssignment.selectedPool(poolName);
      //    this.grids.dataVersion.poolAssignment.assignments.refresh();
      //}

      deleteActiveDataVersion(action: any, data: any)
      {
         this.nav.navigate({ query: ko.unwrap(action.data.worksheet.key), report: null }, { force: true });
      }

      refreshWorksheetDataVersion(): JQueryPromise<any>
      {
         return this.processReport(false, ag.constants.ReportMode.Continue);
      }

      createPivot(options): PivotViewModel
      {
         return new CashExplorerPivotViewModel(
            this.selectedQuery,
            this.views.selected,
            this.activeReport,
            this.grid,
            options);
      }

//#region Overidden methods

      processQueryResponse(data: any)
      {
         try
         {
            this.updatingModel(true);
            this.showConfiguration(false);
            this.views.showConfigure(false);


            this.resetTabs(this.isQueryNew()
               ? '#reportingDefaultsTab a[href="#propertiesTab"]'
               : '#reportingDefaultsTab a:first', '#pivotViewTab a:first', '#viewTabs a:first');

            this.worksheetViews = [];
            ko.mapping.fromJS(data.query, this.editingQuery);
            ko.mapping.fromJS(data.applicationOptions.worksheet, this.applicationOptions.worksheet);
            ko.mapping.fromJS(data.applicationOptions.poolDefinition, this.applicationOptions.poolDefinition);

            var listMetaData = data.listMetaData;
            if (listMetaData)
            {
               _.forEach(this.views.all(), (view: any) =>
               {
                  view.isDefault(false);
               });
               var forceUpdate = listMetaData.views.length > 0;
               this.views.update(listMetaData.views || [], listMetaData.viewTables || [], forceUpdate);
            }

            this.nav.navigate({ report: data.applicationOptions.dataVersionName, query: data.applicationOptions.worksheet.key });
         }
         finally
         {
            this.updatingModel(false);
         }
      }

      //todo: need an alternative
      resetTabs(...selectquery: string[])
      {
         _.forEach(selectquery, (query: string) =>
         {
            $(query).trigger("click");
         });
      }

      updateGridModelAfterSave(data: any)
      {
         this.processQueryResponse(data);
      }

      updateReportSummary(report)
      {
         //this.views.showConfigure(false);

         this.resetTabs('#pivotViewTab a:first');

         if (!report || !report.key)
         {
            this.clearGridResults(true);
         }
         this.reportParameterSummary.removeAll();

         var result = _.map(ko.unwrap(this.applicationOptions.dataVersion.summary), (item: any) =>
         {
            return { key: { displayName: ko.unwrap(item.displayName) }, value: ko.unwrap(item.value) };
         });

         _.each(result, y => { this.reportParameterSummary.push(y); });
      }

      updateDisplayOptions(data: any)
      {
         try
         {
            this.updatingModel(true);
            if (!data.applicationOptions || !data.applicationOptions.pivotView) return;

            var key = data.applicationOptions.pivotView.key;
            
            if (!(key in this.worksheetViews) && key != this.applicationOptions.pivotView.key())
            {
               ko.mapping.fromJS(data.applicationOptions.pivotView, this.applicationOptions.pivotView);
            }
            ko.mapping.fromJS(data.applicationOptions.dataVersion, this.applicationOptions.dataVersion);
            this.applicationOptions.pivotView.horizon(this.applicationOptions.dataVersion.horizon());
            this.applicationOptions.pivotView.stamp(data.applicationOptions.pivotView.stamp);
            this.setLookups(data.lookups);
         }
         finally
         {
            this.updatingModel(false);
         };
      }

      /// setLookups
      /// Update any lookup datasets on the model
      private setLookups(lookups)
      {
         if (!lookups)
            return;

         ag.utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups);
      }

      private loadGridViewData(gridViewModel: any, refresh: boolean, revert: boolean= false): boolean
      {
         if (!gridViewModel)
            return false;

         if (refresh && !this.isQueryNew())
         {
            gridViewModel.refresh({ revert: revert });
         }
         else
         {
            gridViewModel.clearData();
         }
         return refresh;
      }

      getQueryFromResult(result: any)
      {
         return result.data.query;
      }

      showActualTransferDetails()
      {
         new ag.WindowManager({ url: "cash-explorer" + "?dialog=1" });
      }

      deleteActiveQuery(): JQueryPromise<any>
      {
         if (this.queries().length <= 1)
         {
            this.addQuery();
            return;
         }
         else
         {
            // Remove the query from the list of queries, and switch the current query to the default query
            (<any>this.queries).mappedRemove({ key: this.selectedQuery().key() });
            this.selectQuery(_.first(this.queries()));
            return;
         }
      }

      isQueryLoaded(): boolean
      {
         return false;
      }

      updateWorksheetQuery(parentViewModel: any, result: any)
      {
         this.pivot.activeReport(null);
         this.clearGridResults(true);
         var queries = ko.mapping.toJS(this.queries());
         var dataQuery = result.data.query;

         // Make observable
         var query = ko.mapping.fromJS(dataQuery);

         // Initialize the reports array as won't 
         // exist for new queries
         query.reports = ko.observableArray();

         // Add the query to the queries collection
         this.queries.push(query);

         if (this.editingQuery.reports && this.editingQuery.reports())
            this.editingQuery.reports.removeAll();

         this.selectQuery(query);
      }

      //this is needed when you click on cross behind the worksheet name it call deleteQuery which is doing different for delete from menu item
      deleteQuery(query: any): JQueryPromise<any>
      {
         var removeQuery = (message) =>
         {
            // Remove the query from the list of queries, and switch the current query to the default query
            // if we've just removed the editing query.
            if (this.queries().length <= 1)
            {
               this.addQuery();
            }
            else
            {
               this.selectQuery(_.first(this.queries()));
            }
            (<any>this.queries).mappedRemove({ key: query.key() });
            messages.success(message);
         };

         // Delete an unsaved query
         if (query.key() == null)
         {
            removeQuery(strings.queryDeleted);
            return $.Deferred().resolve().promise();
         }

         // Delete an existing query
         return this.net.postJson("deleteWorksheetQuery", { queryKey: query.key(), options: this.applicationOptions }).then((result) =>
         {
            removeQuery(result.message);
         });
      }


      afterRunQuery(action: any, data: any)
      {
         this.nav.navigate({ report: data.actionData.dataVersionName, query: data.data.worksheet.key });
      }

      updateViewFilters = (items: any, filter: any) =>
      {
         // The passed items array is a list of new filters to add to the existing collection
         filter.push.apply(filter, $.map(items, function(item)
         {
            var filter = ag.filters.buildFilter(item, true);
            filter.value1(["ALL"]);
            return filter;
         }));
      }

      showReportPayload = () : any =>
      {
         !this.applicationOptions.pivotView.key() ? {} : ko.mapping.toJS(this.applicationOptions.pivotView);
      }

      reportLoaded = () =>
      {
         return this.activeReport() && this.activeReport().key();
      }

      additionalFields = () =>
      {
         return ko.mapping.toJS(this.applicationOptions);
      }

      handleQueryNotFound(currentQueryIndex: number, previousQuery: any, data: any, query: any, isNew: boolean): number
      {
         if (currentQueryIndex == -1)
         {
            data.key = query.key;
            isNew = true;
            return (<any>this.queries).mappedIndexOf(previousQuery);
         }
         return currentQueryIndex;
      }

      initNav()
      {
         this.nav = new NavHistory(
            {
               params: { query: null, preview: false, report: null },
               onNavigate: (navEntry, navInfo) =>
               {
                  // Query AND Report - route
                  if (this.routeToQuery(navEntry.params))
                     return;

                  // Back history navigation - no query or report
                  if (navInfo.isBack)
                     this.routeBack();
               }
            })
            .initialize({ linkToUrl: true });
      }

      routeToQuery(params: IReportNavigationParams): boolean
      {
         if (!params.query)
         {
            params.query = ko.unwrap(this.applicationOptions.worksheet.key);
            params.report = ko.unwrap(this.applicationOptions.dataVersion.name);
         }

         if (params.query)
         {
            var queryKey = params.query,
                reportId = params.report;

            this.updateQueryBeforeNavigate(queryKey);

            // Request Query
            $.when(this.getQueryRequest(queryKey)).then(() => this.showReport({ key: reportId }));
            return true;
         }

         return false;
      }
   }
}

