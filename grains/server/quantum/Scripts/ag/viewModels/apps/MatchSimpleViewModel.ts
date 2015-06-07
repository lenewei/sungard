// <reference path="../simpleViewModel.ts" />
/// <reference path="../../helpers/format.ts" />
/// <reference path="../gridViewModel.ts" />

interface IFlow
{
   key: string;
   flowId: number;
   amount: string;
   matchNumber: number;
   valueDate: string;
}

interface IMatch
{
   matchNumber: number;
   bankFlowsCount: string;
   bankFlowsTotal: string;
   cashFlowsCount: string;
   cashFlowsTotal: string;
   matchStatus: string;
}

interface IAccountSummaryData
{
   detailMatchType: KnockoutObservable<string>;
   balanceMatchType: KnockoutObservable<string>;
   intradayMatchType: KnockoutObservable<string>;
   name: KnockoutObservable<string>;
   currency: string;
}

interface IAccountData
{
   key: KnockoutObservable<string>;
   accountSummary: IAccountSummaryData;
   reconciliationSummary: any;
}

interface IMatchQueryData
{
   isIntraDay: KnockoutObservable<boolean>;
   name: KnockoutObservable<string>;
   key: KnockoutObservable<string>;
   selectedAccount: IAccountData;
   isExternal: KnockoutObservable<boolean>;
   isInternal: KnockoutObservable<boolean>;
   accountType: KnockoutObservable<number>;
   currencies: KnockoutObservable<any>;
   ccy: KnockoutObservable<string>;
   entities: KnockoutObservable<any>;
   banks: KnockoutObservable<any>;
   summary: any;
   priorDayStartDate: KnockoutObservable<string>;
   priorDayEndDate: KnockoutObservable<string>;
   hasWritePermission: boolean;
}

module ag
{
   function formatNumberForDisplay(value: number, scale: number): string
   {
      return format.formatNumber(mathEx.round(value, scale));
   }

   enum bankRecRecordType
   {
      None = 0,
      RecTypeBankflow = 1,
      RecTypecashflow = 2,
      RecTypeExtCashflow = 3,
      RecTypeNettedCashflow = 4,
      RecTypeProjCashflow = 5
   }

   enum dealType
   {
      None = 0,
      ProjectedCashFlow = 1,
      ActualCashFlow = 2,
      AccountTransfer = 3,
      AccountAdjustment = 4
   }

   export class MatchSelectedViewModel<T>
   {
      items: KnockoutObservableArray<T>;
      keyAccessor: (T) => number;
      count: KnockoutComputed<number>;

      constructor(public grid: GridViewModel,
         public accessor: (T) => number)
      {
         this.items = ko.observableArray([]);

         this.keyAccessor = accessor;

         grid.selected.all.subscribe((changes: any) =>
         {
            this.clear();
         });

         // Subscribe to changes to the keys collection (selections on grid)
         grid.selected.keys.subscribe((changes: any) =>
         {
            if (!changes || changes.length == 0)
               return;

            $.each(changes, (index, change) =>
            {
               if (change.status == "added")
               {
                  var item = this.find(this.grid.items(), change.value);
                  if (item && !this.find(this.items(), this.keyAccessor(item)))
                     this.items.push(item);
               }
               else if (change.status == "deleted")
                  this.items.remove(this.find(this.items(), change.value));
            });
         },
            null, "arrayChange");

         this.count = ko.computed(() =>
         {
            if (ko.unwrap(grid.selected.all))
            {
               return (grid.pager.totalItems() - this.items().length);
            }
            return (this.items().length)
         });
      }

      add(item: T)
      {
         if (!this.find(this.items(), this.keyAccessor(item)))
         {
            this.items.push(item);
         }
      }

      clear()
      {
         // Clear current state of selections
         this.items([]);
      }

      private find(items: Array<any>, id: number): any
      {
         return _.find(items, (item: any) =>
         {
            return this.keyAccessor(item) == id;
         });
      }
   }

   export class SelectedFlowsViewModel extends MatchSelectedViewModel<IFlow>
   {
      formattedSum: KnockoutComputed<string>;
      sum: KnockoutObservable<number>;
      anyMatched: KnockoutComputed<boolean>;
      count: KnockoutComputed<number>;

      constructor(public grid: GridViewModel,
         public getScale: () => number,
         public totalSum: KnockoutComputed<number>)
      {
         super(grid, (item) => item.key);
         this.sum = ko.observable(0);

         this.anyMatched = ko.computed(() =>
         {
            if (ko.unwrap(grid.selected.all)) return true;
            return _.any(this.items(), (item: any) => { return item.matchNumber > 0; })
         });

         this.formattedSum = ko.computed(() =>
         {
            var tempSum: number = 0;
            var isAllSelected: boolean = ko.unwrap(grid.selected.all);
            var balance = isAllSelected ? totalSum() : 0;

            _.each(this.items(), (item) =>
            {
               tempSum += parseFloat(item.amount);
            });

            if (isAllSelected) tempSum = tempSum * -1;
            tempSum += balance;
            this.sum(tempSum);
            return formatNumberForDisplay(tempSum, getScale());
         });
      }

      public getUniqueValues(property: string): string[]
      {
         return _.uniq(_.pluck(ko.unwrap(this.items), property));
      }
   }

   export class SelectedMatchesViewModel extends MatchSelectedViewModel<IMatch>
   {
      anyMatched: KnockoutComputed<boolean>;
      canMatch: KnockoutComputed<boolean>;
      canProbableMatch: KnockoutComputed<boolean>;
      canPossibleMatch: KnockoutComputed<boolean>;
      canUnmatch: KnockoutComputed<boolean>;

      private matchedValue: string = "Matched";
      private unmatchedValue: string = "Unmatched";
      private probableValue: string = "Probable";
      private possibleValue: string = "Possible";

      constructor(public grid: GridViewModel)
      {
         super(grid, (item) => item.matchNumber);

         this.anyMatched = ko.computed(() =>
         {
            return _.any(this.items(), (item: any) => { return item.matchNumber > 0; })
         });

         this.canUnmatch = ko.computed(() =>
         {
            return this.count() > 0;
         });

         this.canPossibleMatch = ko.computed(() =>
         {
            if (this.count() == 0) return false;

            var result: boolean = true;

            _.each(ko.unwrap(this.items), (item: IMatch) =>
            {
               if (parseFloat(item.bankFlowsCount) == 0 && parseFloat(item.cashFlowsCount) < 2)
               {
                  result = false;
                  return false;
               }
            });

            return result;
         });

         this.canMatch = ko.computed(() =>
         {
            if (!this.canPossibleMatch()) return false;

            var result = true;

            _.each(ko.unwrap(this.items), (item: IMatch) =>
            {
               if (item.bankFlowsTotal != item.cashFlowsTotal)
               {
                  result = false;
                  return false;
               }
            });

            return result;
         });

         this.canProbableMatch = this.canMatch;
      }
   }

   export class SelectedItemsViewModel
   {
      // Matching commands
      matchCommand: KoliteAsyncCommand;
      probableMatchCommand: KoliteAsyncCommand;
      possibleMatchCommand: KoliteAsyncCommand;
      unmatchCommand: KoliteAsyncCommand;

      bankFlows: SelectedFlowsViewModel;
      cashFlows: SelectedFlowsViewModel;
      formattedDifference: KnockoutComputed<string>;
      difference: KnockoutComputed<number>;
      differenceExist: KnockoutComputed<boolean>;
      isIntraday: KnockoutObservable<boolean>;
      matchRequest: (string, boolean) => JQueryPromise<any>;

      constructor(
         bankFlowsGrid: GridViewModel,
         cashFlowsGrid: GridViewModel,
         isIntraday: KnockoutObservable<boolean>,
         matchRequest: (string, boolean) => JQueryPromise<any>,
         getScale: () => number,
         bankFlowsAmount: KnockoutComputed<number>,
         cashFlowsAmount: KnockoutComputed<number>)
      {
         this.bankFlows = new SelectedFlowsViewModel(bankFlowsGrid, getScale, bankFlowsAmount);
         this.cashFlows = new SelectedFlowsViewModel(cashFlowsGrid, getScale, cashFlowsAmount);
         this.isIntraday = isIntraday;
         this.matchRequest = matchRequest;

         this.difference = ko.computed(() =>
         {
            return (this.bankFlows.sum() - this.cashFlows.sum());
         });

         this.differenceExist = ko.computed(() =>
         {
            return this.cashFlows.formattedSum() === this.bankFlows.formattedSum();
         });

         this.formattedDifference = ko.computed(() =>
         {
            return (formatNumberForDisplay(this.difference(), getScale()));
         });

         this.matchCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  return !isExecuting && this.canMatchFlows();
               },
               execute: (data, event, complete) =>
               {
                  this.doMatch("matchFlows", complete);
               },

            });

         this.unmatchCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  return !isExecuting && this.canUnmatchFlows();
               },
               execute: (data, event, complete) =>
               {
                  this.doMatch("unmatchFlows", complete);
               }
            });

         this.possibleMatchCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  return !isExecuting && this.canPossibleMatchFlows();
               },
               execute: (data, event, complete) =>
               {
                  this.doMatch("possibleMatchFlows", complete);
               }
            });


         this.probableMatchCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  return !isExecuting && this.canMatchFlows();
               },
               execute: (data, event, complete) =>
               {
                  this.doMatch("probableMatchFlows", complete);
               }
            });
      }

      public getDefaultDate(defaultDate: string): string
      {
         var getDateValues = (flows) => flows.getUniqueValues('valueDate');
         var bankFlowDates: string[] = getDateValues(this.bankFlows);
         var cashFlowDates: string[] = getDateValues(this.cashFlows);
         var allDates = _.union(bankFlowDates, cashFlowDates);
         if (allDates.length != 1) return defaultDate;
         return allDates[0];
      }

      private doMatch(action: string, complete: any): void
      {
         this.matchRequest(action, this.canUnmatchFlows()).always(complete);
      }

      private canPossibleMatchFlows(): boolean
      {
         return !!(this.bankFlows && this.bankFlows.count() > 0 || this.cashFlows && this.cashFlows.count() > 1);
      }

      private canMatchFlows(): boolean
      {
         return !!(this.canPossibleMatchFlows() && (this.isIntraday() || this.differenceExist()));
      }

      private canUnmatchFlows(): boolean
      {
         return !!(this.bankFlows.anyMatched() || this.cashFlows.anyMatched());
      }

      public clear(): void
      {
         this.bankFlows.clear();
         this.cashFlows.clear();
      }
   }

   // ViewModel for Bank Reconciliation Matching screens
   export class MatchSimpleViewModel extends SimpleViewModel
   {
      editingItem: IMatchQueryData;
      accountsGrid: GridViewModel;
      accountsSummaryGrid: GridViewModel;
      bankFlowsGrid: GridViewModel;
      cashFlowsGrid: GridViewModel;
      matchedBankFlowsGrid: GridViewModel;
      matchedCashFlowsGrid: GridViewModel;
      matchesGrid: GridViewModel;

      selectedMatch: KnockoutComputed<any>;
      selectedMatchId: KnockoutComputed<number>;
      showConfigure = ko.observable(true);
      //showResults = ko.observable(false);
      selectedBankFlows: SelectedFlowsViewModel;
      selectedCashFlows: SelectedFlowsViewModel;

      selectedFlows: SelectedItemsViewModel;
      selectedMatchedFlows: SelectedItemsViewModel;

      selectedMatchedBankFlows: SelectedFlowsViewModel;
      selectedMatchedCashFlows: SelectedFlowsViewModel;

      selectedMatches: SelectedMatchesViewModel;

      navigationParameters = { query: null, account: null, autorun: null };

      // Page-level commands
      runCommand: KoliteAsyncCommand;
      saveCommand: KoliteAsyncCommand;
      createCommand: KoliteAsyncCommand;
      deleteCommand: KoliteAsyncCommand;
      copyCommand: KoliteAsyncCommand;
      markAsReconciledCommand: KoliteAsyncCommand;
      forceMarkAsReconciledCommand: KoliteAsyncCommand;
      rollbackMarkCommand: KoliteAsyncCommand;
      runBalanceMatchCommand: KoliteAsyncCommand;
      runDetailMatchCommand: KoliteAsyncCommand;
      runIntradayMatchCommand: KoliteAsyncCommand;

      // Account-level commands
      newAdjustmentForAccountCommand: KoliteAsyncCommand;
      newTransferForAccountCommand: KoliteAsyncCommand;
      newBalanceStatementForAccountCommand: KoliteAsyncCommand;
      upgradeProbablesForAccountCommand: KoliteAsyncCommand;
      markAccountAsReconciledCommand: KoliteAsyncCommand;
      rollbackAccountMarkCommand: KoliteAsyncCommand;
      runBalanceMatchForAccountCommand: KoliteAsyncCommand;
      runDetailMatchForAccountCommand: KoliteAsyncCommand;
      runIntradayMatchForAccountCommand: KoliteAsyncCommand;
      scale: number = 2;

      queries: KnockoutObservableArray<any>;

      constructor(public options: ISimpleViewModelOptions)
      {
         super(options);

         // action to perform when user closes related window
         (<any>ag).childWindowClosing = (viewModel: DealingViewModel, result: any, saved: any, windowHandle: Window) =>
         {
            if (saved && result)
            {
               var dealNumber: number = result.data.dealNumber;

               var matchId = parseInt(ag.utils.getQueryStringParameterByName("matchId", windowHandle.location.search)) || 0;
               var grid = matchId == 0 ? this.cashFlowsGrid : this.matchedCashFlowsGrid;
               this.getCreatedFlowsRequest(dealNumber, bankRecRecordType.RecTypecashflow, result.data.transactionType, matchId, grid)
                  .done(() => messages.show(result.message, result.messageType))
                  .done(() => (<any>grid).__updateAccountStatus());

            }
         };
      }

      init(itemModel: any)
      {
         super.init(itemModel);

         // Get a references to the grids we will commonly work with
         this.accountsGrid = this.grids.accounts;
         this.bankFlowsGrid = this.grids.bankFlows;
         this.cashFlowsGrid = this.grids.cashFlows;
         this.matchesGrid = this.grids.matches;
         this.matchedBankFlowsGrid = this.grids.matchedBankFlows;
         this.matchedCashFlowsGrid = this.grids.matchedCashFlows;
         this.accountsSummaryGrid = this.grids.accountsSummary;

         (<any>this.bankFlowsGrid).__updateSelections = this.updateBankFlowSelections.bind(this);
         (<any>this.bankFlowsGrid).__updateAccountStatus = this.postFlowsHaveChanged.bind(this);
         (<any>this.bankFlowsGrid).__attachQuery = this.attachQuery.bind(this);
         (<any>this.bankFlowsGrid).__addExtraPayload = this.addExtraPayload.bind(this);


         (<any>this.cashFlowsGrid).__updateSelections = this.updateCashFlowSelections.bind(this);
         (<any>this.cashFlowsGrid).__updateAccountStatus = this.postFlowsHaveChanged.bind(this);
         (<any>this.cashFlowsGrid).__attachQuery = this.attachQuery.bind(this);

         (<any>this.matchedBankFlowsGrid).__addExtraPayload = this.addExtraPayload.bind(this);
         (<any>this.matchedBankFlowsGrid).__updateSelections = this.updateMatchedBankFlowSelections.bind(this);
         (<any>this.matchedBankFlowsGrid).__updateAccountStatus = this.afterAddMatchedBankFlowSelections.bind(this);

         (<any>this.matchedCashFlowsGrid).__updateSelections = this.updateMatchedCashFlowSelections.bind(this);
         (<any>this.matchedCashFlowsGrid).__updateAccountStatus = this.updateAddMatchedCashFlowSelections.bind(this);

         (<any>this.matchesGrid).__matchClearState = this.resetMatchesGrid.bind(this);
         (<any>this.matchesGrid).__postMarkAsReconciled = this.postMarkAsReconciled.bind(this);
         (<any>this.matchesGrid).__attachQuery = this.attachQuery.bind(this);
         (<any>this.matchesGrid).__attachAccountSelection = this.attachAccountSelection.bind(this);

         (<any>this.accountsSummaryGrid).__matchClearState = this.resetMatchesGrid.bind(this);

         var getScale: () => number = () => { return this.scale }

         this.selectedMatch = ko.computed(() =>
         {
            if (this.matchesGrid.selected.keys().length != 1) return;
            var grid = this.matchesGrid;

            for (var keyIndex = 0; keyIndex < grid.selected.keys().length; keyIndex++)
            {
               var item = _.find(grid.items(), function (gridItem)
               {
                  return gridItem[grid.itemKey] == grid.selected.keys()[keyIndex];
               });

               return item;
            }
         });

         var bankFlowsTotal: KnockoutComputed<number> = ko.computed(() =>
         {
            return parseFloat(ko.unwrap(this.editingItem.selectedAccount.reconciliationSummary.bankFlowsTotal));
         });

         var cashFlowsTotal: KnockoutComputed<number> = ko.computed(() =>
         {
            return parseFloat(ko.unwrap(this.editingItem.selectedAccount.reconciliationSummary.cashFlowsTotal));
         });

         var matchedFlowsTotal = (propertyName: string) =>
         {
            var item = ko.unwrap(this.selectedMatch);
            return item ? parseFloat(item[propertyName]) : 0;
         }

         var matchedBankFlowsTotal: KnockoutComputed<number> = ko.computed(() =>
         {
            return matchedFlowsTotal('bankFlowsTotal');
         });

         var matchedCashFlowsTotal: KnockoutComputed<number> = ko.computed(() =>
         {
            return matchedFlowsTotal('cashFlowsTotal');
         });

         this.selectedFlows = new SelectedItemsViewModel(this.bankFlowsGrid, this.cashFlowsGrid, this.editingItem.isIntraDay, (action, includesMatchedFlows) => this.matchRequest.call(this, action, "flows", this.accountsSummaryGrid, includesMatchedFlows), getScale, bankFlowsTotal, cashFlowsTotal);
         this.selectedMatchedFlows = new SelectedItemsViewModel(this.matchedBankFlowsGrid, this.matchedCashFlowsGrid, this.editingItem.isIntraDay, (action, includesMatchedFlows) => this.matchRequest.call(this, action, "matchedFlows", this.matchesGrid, includesMatchedFlows), getScale, matchedBankFlowsTotal, matchedCashFlowsTotal);

         // Create Selected View Models for Bank Flows and Cash Flows
         this.selectedBankFlows = this.selectedFlows.bankFlows;
         this.selectedCashFlows = this.selectedFlows.cashFlows;
         this.selectedMatchedBankFlows = this.selectedMatchedFlows.bankFlows;
         this.selectedMatchedCashFlows = this.selectedMatchedFlows.cashFlows;
         this.selectedMatches = new SelectedMatchesViewModel(this.matchesGrid);

         // Create Selected View Models for Bank Flows and Cash Flows
         this.selectedBankFlows = this.selectedFlows.bankFlows;
         this.selectedCashFlows = this.selectedFlows.cashFlows;

         this.selectedMatchedBankFlows = this.selectedMatchedFlows.bankFlows;
         this.selectedMatchedCashFlows = this.selectedMatchedFlows.cashFlows;

         this.selectedMatches = new SelectedMatchesViewModel(this.matchesGrid);


         this.selectedMatchId = ko.computed(() =>
         {
            var item = this.selectedMatch();
            return item ? item.matchNumber : 0;
         });

         (<any>this.cashFlowsGrid).canDelete = () =>
         {
            return MatchSimpleViewModel.canPerformAction(this.cashFlowsGrid, this.cashFlowsGrid.itemKey, "canDelete", _.every);
         };

         (<any>this.bankFlowsGrid).canDelete = () =>
         {
            return MatchSimpleViewModel.canPerformAction(this.bankFlowsGrid, this.bankFlowsGrid.itemKey, "canDelete", _.every);
         };

         (<any>this.matchedCashFlowsGrid).canDelete = () =>
         {
            return MatchSimpleViewModel.canPerformAction(this.matchedCashFlowsGrid, this.matchedCashFlowsGrid.itemKey, "canDelete", _.every);
         };

         (<any>this.matchedBankFlowsGrid).canDelete = () =>
         {
            return MatchSimpleViewModel.canPerformAction(this.matchedBankFlowsGrid, this.matchedBankFlowsGrid.itemKey, "canDelete", _.every);
         };

         (<any>this.matchesGrid).canMatch = () =>
         {
            return this.selectedMatches.canMatch();
         };

         (<any>this.matchesGrid).canProbableMatch = () =>
         {
            return this.selectedMatches.canProbableMatch();
         };

         (<any>this.matchesGrid).canPossibleMatch = () =>
         {
            return this.selectedMatches.canPossibleMatch();
         };

         (<any>this.matchesGrid).canUnmatch = () =>
         {
            return this.selectedMatches.canUnmatch();
         };

         this.accountsSummaryGrid.selected.item.subscribe((value: any) =>
         {
            if (!value) return;
            try
            {
               this.scale = (<any>this).currencies[value.currency.toLowerCase()].amountDp;
            }
            catch (e)
            {
               this.scale = 2;
            }
            this.retrieveAccountRequest(value[this.accountsSummaryGrid.selected.itemKey]);
         });

         this.matchesGrid.selected.keys.subscribe((value: any) =>
         {
            if (!value) return;
            //this.selectedMatchedFlows.clear();

            if (value.length == 1)
            {
               this.matchedBankFlowsGrid.selected.all(true);
               this.matchedCashFlowsGrid.selected.all(true);
               this.matchedBankFlowsGrid.refreshData(false);
               this.matchedCashFlowsGrid.refreshData(false);
            }
            else
            {
               this.matchedBankFlowsGrid.clearData();
               this.matchedCashFlowsGrid.clearData();
            }
         });

         this.matchedBankFlowsGrid.dependencyProxy.subscribe((value: any) =>
         {
            if (!this.updatingModel())
            {
               this.resetMatchesGrid();
               this.matchedCashFlowsGrid.refreshData();
            }
         });

         this.matchedCashFlowsGrid.dependencyProxy.subscribe((value: any) =>
         {
            if (!this.updatingModel())
            {
               this.resetMatchesGrid();
               this.matchedBankFlowsGrid.refreshData();
            }
         });

         ko.computed(() =>
         {
            if (this.editingItem.name() || this.editingItem.selectedAccount.accountSummary.name())
            {
               this.updatePageTitle(this.editingItem.selectedAccount.accountSummary.name());
            }
         });

         // Lastly, create commands
         this.createCommands();

         this.showConfigure(!itemModel.summary.queryRun);


         if (!itemModel.hasWritePermission)
         {
            messages.show(strings.accessWrite.format("query", "bank accounts", "copy"), 2);
         }

         // Create client-side navigation
         this.initNav();
      }

      public static canPerformAction(grid: GridViewModel, itemKey: string, canProperty: string, fn: (list: any, predicate: any) => boolean)
      {
         return grid.selected.keys().length > 0 && fn(grid.selected.keys(), (key) =>
         {
            var item = _.find(grid.items(), (gridItem) =>
            {
               return gridItem[itemKey] == key;
            });

            return item && item[canProperty];
         });
      }

      afterApplyBindings(): void
      {
         this.bankFlowsGrid.actions.createBankFlow.createCustomPayload = (data) =>
         {
            var payload = { data: ko.mapping.toJS(data) }
            return this.attachQuery(null, payload);
         };

         this.matchedBankFlowsGrid.actions.createMatchedBankFlow.createCustomPayload = (data) =>
         {
            var payload = { data: ko.mapping.toJS(data) };
            return this.attachQuery(null, payload);
         };

         this.accountsSummaryGrid.actions.runScriptAccount.createCustomPayload = (data) =>
         {
            var payload = { data: ko.mapping.toJS(data) }
            return this.attachQuery(null, payload);
         };

         (<any>this.bankFlowsGrid).afterFindBestMatch = (parentViewModel, result) =>
         {
            return this.findBestMatch(result, parentViewModel);
         };

         (<any>this.cashFlowsGrid).afterFindBestMatch = (parentViewModel, result) =>
         {
            return this.findBestMatch(result, parentViewModel);
         };

         (<any>this.accountsSummaryGrid).refreshFromResult = (result) =>
         {
            return this.refreshFromResult(result);
         };

         this.bankFlowsGrid.actions.viewStatement.createCustomPayload = (data) =>
         {
            return { edit: ko.unwrap(data.statementId) };
         };

         var bankStatementCustomPayload = () =>
         {
            var accountItem = this.accountsSummaryGrid.selected.item;
            if (accountItem)
            {
               var data = ko.mapping.toJS(accountItem);
               return { account: data.accountNumber, start: this.editingItem.priorDayStartDate(), end: this.editingItem.priorDayEndDate() };
            }
         };

         (<any>this.accountsSummaryGrid).actions.viewStatements.createCustomPayload = bankStatementCustomPayload;
         (<any>this.matchesGrid).actions.viewStatements.createCustomPayload = bankStatementCustomPayload;

         var messageLogAction = <Action>this["actions"].messageLog;

         if (messageLogAction)
         {
            messageLogAction.createCustomPayload = (data) =>
            {
               return { activityId: this.activityId };
            };
         }

         (<any>this.accountsSummaryGrid).setMatchPayload = (parent, payload) =>
         {
            payload.data = ko.mapping.toJS(this.editingItem);
            payload["source"] = "flows";
         }
         (<any>this.matchesGrid).setMatchPayload = (parent, payload) =>
         {
            payload.data = ko.mapping.toJS(this.editingItem);
            payload["source"] = "matchedflows";
         }
         (<any>this.accountsSummaryGrid).postMatch = () => { this.clearGridStates(); }
         (<any>this.matchesGrid).postMatch = () => { this.clearGridStates(); }
      }

      // Called when a new query is selected in the UI
      private querySelected(selections)
      {
         if (selections && $.isArray(selections) && selections.length > 0)
         {
            // Navigate to the Query and reset account and autorun
            this.navigate(selections[0].key);
         }
      }

      private isSelectedQuery(queryKey: string): boolean
      {
         return queryKey === this.editingItem.key();
      }

      // Called when an account is selected in the UI
      private accountSelected(selections)
      {
         if (selections && $.isArray(selections) && selections.length > 0)
         {
            this.navigate(this.editingItem.key(), selections[0].key);
         }
      }

      private selectedAccount(): string
      {
         return this.editingItem.selectedAccount.accountSummary.name();
      }

      private isSelectedAccount(accountKey: string): boolean
      {
         if (!this.editingItem.selectedAccount)
            return false;

         return accountKey === this.editingItem.selectedAccount.key();
      }

      //#region Private Helpers

      private updateCashFlowSelections(action?: any, data?: any)
      {
         // Only thing that can be done at this stage
         // once selections is moved to be on gridViewOptions 
         // we will have much better control e.g. leave items 
         // selected that were not affected by the action
         //this.cashFlowsGrid.selected.reset();
         //this.selectedCashFlows.clear();
      }

      private postFlowsHaveChanged(action?: any, data?: any)
      {
         this.updateAccountStatus().always(() => this.accountsSummaryGrid.refreshData());
         //this.updateAccountSummary();
      }

      private updateBankFlowSelections(action?: any, data?: any)
      {
         // Only thing that can be done at this stage 
         // (see above for further comment)
         //this.bankFlowsGrid.selected.reset();
         //this.selectedBankFlows.clear();
         this.forceRefresh();
      }

       

      private updateMatchedCashFlowSelections(action?: any, data?: any)
      {
         this.matchesGrid.selected.reset();

         this.forceRefresh();
      }

      private updateAddMatchedCashFlowSelections(action?: any, data?: any)
      {
         this.resetMatchesGrid();
         this.matchedBankFlowsGrid.refreshData();
         //_this.matchedCashFlowsGrid.refreshData();
      }

      private addExtraPayload(viewModel: any, data?: any)
      {
         if (data)
         {
            data['matchId'] = ko.unwrap(this.selectedMatchId);
         }
      }


      private updateMatchedBankFlowSelections(action?: any, data?: any)
      {
         this.clearGridStates();
      }

      private afterAddMatchedBankFlowSelections(action?: any, data?: any)
      {
         this.resetMatchesGrid();
         this.matchedCashFlowsGrid.refreshData();
      }

      private resetMatchesGrid()
      {
         this.accountsSummaryGrid.refreshData(true);

         this.bankFlowsGrid.refreshData().always(() =>
         {
            this.bankFlowsGrid.selected.reset();
         });
         this.cashFlowsGrid.refreshData().always(() =>
         {
            this.cashFlowsGrid.selected.reset();
         });


         this.matchesGrid.refreshData();
      }

      private forceRefresh()
      {
         this.matchedCashFlowsGrid.refreshData();
         this.accountsSummaryGrid.refreshData();
         this.bankFlowsGrid.refreshData();

         this.cashFlowsGrid.refreshData();

         this.matchesGrid.refreshData();

         this.matchedBankFlowsGrid.refreshData();
         this.matchedCashFlowsGrid.refreshData();
      }

      private clearGridStates(ignoreSummary: boolean = false, clearMatchesGrid: boolean = true)
      {
         if (!ignoreSummary)
         {
            this.accountsSummaryGrid.refreshData();
         }

         this.bankFlowsGrid.refreshData().always(() =>
         {
            this.bankFlowsGrid.selected.reset();
         });
         this.cashFlowsGrid.refreshData().always(() =>
         {
            this.cashFlowsGrid.selected.reset();
         });

         this.matchesGrid.refreshData().always(() =>
         {
            if (clearMatchesGrid)
            {
               this.matchesGrid.selected.reset();
               this.selectedFlows.clear();
               this.selectedMatchedFlows.clear();
            }
         });

         this.matchedBankFlowsGrid.refreshData().always(() =>
         {
            this.matchedBankFlowsGrid.selected.reset();
         });
         this.matchedCashFlowsGrid.refreshData().always(() =>
         {
            this.matchedCashFlowsGrid.selected.reset();
         });
      }

      private updatePageTitle(queryName?: string)
      {
         var name = queryName ? ' - ' + queryName : '';
         name = this.editingItem.name() + name;
         this.pageTitle.removeAll();
         this.pageTitle.push({ keyProperty: name });
      }

      private updateQueryFromResult(result: any)
      {
         // Map the result over the current item
         this.updatingModel(true);

         ko.mapping.fromJS(result.data, this.editingItem);
         ag.utils.resetValidation(this.editingItem);

         // Refresh the accounts grid
         this.accountsGrid.refresh();

         this.showConfigure(true);
         //this.showResults(false);

         this.updatingModel(false);
      }

      private updateSelectedAccountFromResult(result: any, clearGrid: boolean = true)
      {
         // Map the result over the current item
         ko.mapping.fromJS(result.data.selectedAccount, this.editingItem.selectedAccount);

         // Refresh the matching grids
         if (clearGrid) this.clearGridStates(true);
      }

      private isDefaultQuery(): boolean
      {
         var defaultQueryKey = "default",
            key = this.editingItem && this.editingItem.key();

         return key && key.toLowerCase() === defaultQueryKey;
      }

      private isSavedQuery(): boolean
      {
         return !!(this.editingItem && this.editingItem.key());
      }

      private hasSelectedAccount(): boolean
      {
         return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.key());
      }

      private isScriptLinkedToAccount(detailMatchScript: boolean): boolean
      {
         if (detailMatchScript)
         {
            return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.accountSummary.detailMatchType());
         }
         return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.accountSummary.balanceMatchType());
      }

      private isIntraDayScriptLinkedToAccount(): boolean
      {
         return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.accountSummary.intradayMatchType());
      }

      private canPossibleMatch(matchStatus: string): boolean
      {
         var match = this.selectedMatch();
         if (!match)
         {
            return false;
         }
         return (matchStatus != match.matchStatus && (match.bankFlowsCount > 0 || match.cashFlowsCount > 1));
      }

      private canMatch(matchStatus: string): boolean
      {
         return !!(this.canPossibleMatch(matchStatus) && (this.editingItem.isIntraDay() || (this.selectedMatch().flowDifference == 0)));
      }

      private matchRequest(action: string, context: string, grid: GridViewModel, includesMatchedFlows: boolean): JQueryPromise<any>
      {
         if (includesMatchedFlows)
         {
            var fn = (g, a) =>
            {
               g.actions.matchFlows.actionDetails.action = a;
               g.actions.matchFlows.show();
            }
            return $.when(fn(grid, action));
         }

         var params = this.getEditingItemAsParams();
         params["source"] = context;
         return this.net.postJson(action, params).then((result) =>
         {
            this.postMatch(result);
         });
      }

      private postMatch(result: any)
      {
         this.showMessageFromResult(result);
         this.clearGridStates();
      }

      //#endregion

      //#region Menu Actions and Commands

      private saveQueryIfNew(): JQueryPromise<any>
      {
         if (this.isSavedQuery())
            return $.Deferred().resolve();

         return this.saveQuery();
      }

      private runQuery(complete?: (...reasons: any[]) => any)
      {
         this.saveQueryIfNew().then(() =>
         {
            this.runQueryRequest().always(complete);
         },
            complete
            );
      }

      private createCommands()
      {
         this.runCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.runQuery(complete);
               }
            });

         this.saveCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  // Can only save when not the default query
                  return !isExecuting && !this.isDefaultQuery();
               },
               execute: (data, event, complete) =>
               {
                  this.saveQuery().always(complete);
               }
            });

         this.createCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.navigate("new");
                  complete();
               }
            });

         this.deleteCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  // Can't delete the default query
                  return !isExecuting && !this.isDefaultQuery() && this.isSavedQuery();
               },
               execute: (data, event, complete) =>
               {
                  this.deleteQueryRequest().always(complete);
                  this.resetNavigation();
               }
            });

         this.copyCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  // Can only copy saved queries
                  return !isExecuting && this.editingItem.key();
               },
               execute: (data, event, complete) =>
               {
                  this.copyQueryRequest().always(complete);
               }
            });

         this.runIntradayMatchCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  // Can't delete the default query
                  return !isExecuting;
               },
               execute: (data, event, complete) =>
               {
                  this.runIntradayMatchRequest().always(complete);
               }
            });
      }

      beforeApplyBindings()
      {
         this.grids.accountsSummary.__postMarkAsReconciled = (result) => this.postMarkAsReconciled(result);

         this.grids.accountsSummary.upgradeProbablesCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  // Only execute when there is an account selected
                  return !isExecuting && this.hasSelectedAccount();
               },
               execute: (data, event, complete) =>
               {
                  this.upgradeProbablesForAccountRequest().always(complete);
               }
            });

         this.grids.accountsSummary.runIntradayMatchCommand = ko.asyncCommand(
            {
               canExecute: (isExecuting: boolean) =>
               {
                  // Only execute when there is an account selected
                  return !isExecuting && this.hasSelectedAccount() && this.isIntraDayScriptLinkedToAccount();;
               },
               execute: (data, event, complete) =>
               {
                  this.runIntradayMatchRequest(true).always(complete);
               }
            });

         this.grids.accountsSummary.menuCommands.newAdjustmentCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.AccountAdjustment, data.actions.newAdjustment, this.selectedFlows)
                     .always(complete);
               }
            });

         this.grids.accountsSummary.menuCommands.newTransferCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.AccountTransfer, data.actions.newTransfer, this.selectedFlows)
                     .always(complete);
               }
            });

         this.grids.matches.menuCommands.newAdjustmentCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.AccountAdjustment, data.actions.newAdjustment, this.selectedMatchedFlows, this.selectedMatchId())
                     .always(complete);
               }
            });

         this.grids.matches.menuCommands.newTransferCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.AccountTransfer, data.actions.newTransfer, this.selectedMatchedFlows, this.selectedMatchId())
                     .always(complete);
               }
            });

         this.grids.cashFlows.menuCommands.newProjectedCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.ProjectedCashFlow, data.actions.newProjectedCashFlow, this.selectedFlows)
                     .always(complete);
               }
            });

         this.grids.cashFlows.menuCommands.newActualCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.ActualCashFlow, data.actions.newActualCashFlow, this.selectedFlows)
                     .always(complete);
               }
            });

         this.grids.matchedCashFlows.menuCommands.newProjectedCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.ProjectedCashFlow, data.actions.newProjectedCashFlow, this.selectedMatchedFlows, this.selectedMatchId())
                     .always(complete);
               }
            });

         this.grids.matchedCashFlows.menuCommands.newActualCommand = ko.asyncCommand(
            {
               execute: (data, event, complete) =>
               {
                  this.popWindow(dealType.ActualCashFlow, data.actions.newActualCashFlow, this.selectedMatchedFlows, this.selectedMatchId())
                     .always(complete);
               }
            });

         this.accountsGrid['addQueryDataToPayload'] = (action, payload) =>
         {
            this.attachQuery(action, payload);
            //payload.currencies = this.editingItem.currencies();
            //payload.entities = this.editingItem.entities();
            //payload.banks = this.editingItem.banks();
            //payload.isInternal = ko.unwrap(this.editingItem.isInternal);
            //payload.isExternal = ko.unwrap(this.editingItem.isExternal);
            //payload.accountType = ko.unwrap(this.editingItem.accountType);
         };
      }

      private attachMatch(data?: any)
      {
         this.attachQuery(null, data);
         //if (data)
         //{
         //    data.selectedMatches = ko.mapping.toJS(this.matchesGrid.selected.keys);
         //}
         return data;
      }

      private attachQuery(action?: any, data?: any)
      {
         if (data)
         {
            $.extend(data, ko.mapping.toJS(this.editingItem));
         }
         return data;
      }

      private attachAccountSelection(action?: any, data?: any)
      {
         if (data)
         {
            data.data = ko.mapping.toJS(this.accountsSummaryGrid.selected.item);
         }
         return data;
      }

      private popWindow(type: dealType, actionItem, simpleViewModel: SelectedItemsViewModel, matchId: number = 0): JQueryPromise<any>
      {
         var model = ko.mapping.toJS(this.editingItem);

         var accountKey = model.selectedAccount.key;
         var path = actionItem.actionDetails.path;
         var date = simpleViewModel.getDefaultDate(model.summary.endDate);

         if (model.selectedAccount.key != null)
         {
            // Get the default data for the deal based on selection
            var flows = {
               accountNumber: model.selectedAccount.key,
               matchId: matchId,
               cashFlowOptions: simpleViewModel.cashFlows.grid.getGridViewOptions().selections,
               bankFlowOptions: simpleViewModel.bankFlows.grid.getGridViewOptions().selections
            };

            return ag.utils.getJson('getDealDefaults', flows).done((response) =>
            {
               var amount = response.amount;
               var data = this.getDataForDealType(type, model, response.amount, date, matchId, response.comments);
               this.setDealProperty(data, "entity", response.entity);
               this.openDeal(path, data);
            });
         }
         else
         {
            var data = this.getDataForDealType(type, model, 0, date, matchId);
            return this.openDeal(path, data);
         }
      }

      private openDeal(path, data): JQueryPromise<any>
      {
         return utils.openApplicationWindowPromise(
            path,
            data);
      }

      private getDataForDealType(type: dealType, model: any, amount: number, date: string, matchId: number = 0, comments: string = null)
      {
         var payload: any =
            {
               dialog: 2
            };

         switch (type)
         {
            case dealType.ProjectedCashFlow:
            case dealType.ActualCashFlow:
               this.setCashFlowProperties(payload, model, amount, date, matchId, comments);
               break;
            case dealType.AccountAdjustment:
               this.setAccountAdjustmentProperties(payload, model, amount, date);
               break;
            case dealType.AccountTransfer:
               this.setCashTransferProperties(payload, model, amount, date);
               break;
            default:
               throw new Error('Unknown deal type.');
         }
         if (matchId > 0)
         {
            this.setDealProperty(payload, "matchId", matchId);
         }
         return payload;
      }

      // actual cashflow
      private setCashFlowProperties(payload: any, model: any, amount: number, date: string, matchId: number, comments: string): any
      {
         this.setDealProperty(payload, "dealDate", date);
         this.setDealProperty(payload, "valueDate", date);
         this.setDealProperty(payload, "settlementDate", date);
         this.setDealProperty(payload, "amount", amount);
         this.setDealProperty(payload, "currency", model.selectedAccount.accountSummary.currency);
         this.setDealProperty(payload, "accountNumber", model.selectedAccount.key);
         this.setDealProperty(payload, "entity", model.selectedAccount.accountSummary.entity);
         this.setDealProperty(payload, "paymentReceive", amount <= 0 ? "Payment" : "Receipt");
         if (comments != null && comments.trim() != '')
            this.setDealProperty(payload, "comments", comments);

         return payload;
      }

      // actual cashflow
      private setAccountAdjustmentProperties(payload: any, model: any, amount: number, date: string): any
      {
         this.setDealProperty(payload, "dealDate", date);
         this.setDealProperty(payload, "currentAdjustmentMode", "AccAdjMode");
         this.setDealProperty(payload, "currency", model.selectedAccount.accountSummary.currency);
         this.setDealProperty(payload, "bankAccountNumber", model.selectedAccount.key);
         this.setDealProperty(payload, "entity", model.selectedAccount.accountSummary.entity);
         this.setDealProperty(payload, "adjustmentAmount", amount);
         return payload;
      }

      // cash transfer - deal save
      private setCashTransferProperties(payload: any, model: any, amount: number, date: string): any
      {
         this.setDealProperty(payload, "dealDate", date);
         this.setDealProperty(payload, "settlementDate", date);
         this.setDealProperty(payload, "currency", model.selectedAccount.accountSummary.currency);
         this.setDealProperty(payload, "faceValue", Math.abs(amount));
         if (model.amount > 0)
         {
            this.setDealProperty(payload, "sourceAccountNumber", model.selectedAccount.key);
         }
         else
         {
            this.setDealProperty(payload, "destinationAccountNumber", model.selectedAccount.key);
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

      toggleConfigure()
      {
         this.showConfigure(!this.showConfigure());
      }

      //#endregion

      //#region Network

      private getCreatedFlowsRequest(dealNumber: number, flowType: bankRecRecordType, transactionType: number, matchNumber: number, grid: ag.GridViewModel): JQueryPromise<any>
      {
         return this.validateEditingItem().then(() =>
         {
            var params = this.getEditingItemAsParams();
            params["data"] = { dealNumber: dealNumber, flowType: flowType, matchNumber: matchNumber };
            params["transactionType"] = transactionType;
            params["options"] = grid.getGridViewOptions();
            return this.net.postJson("getCreatedCashFlows", () => params).then((result) =>
            {
               if (result)
               {
                  grid.loadData(result);
               }
            });
         });
      }

      private runQueryRequest(): JQueryPromise<any>
      {
         if (!ko.unwrap(this.tabs.overview)) $('#overviewTabHeader a').click();

         return this.validateEditingItem().then(() =>
         {
            return this.net.postJson("runquery", () => this.getEditingItemAsParams()).then((result) =>
            {
               this.showMessageFromResult(result);

               this.updatingModel(true);

               ko.mapping.fromJS(result.data.summary, this.editingItem.summary);

               ko.mapping.fromJS(result.data.selectedAccount, this.editingItem.selectedAccount);

               // Hide the configuration panel
               this.showConfigure(false);

               // Show the results grids area
               //this.showResults(true);

               // Clear any current state of grids and refresh
               this.clearGridStates();
            }).always(() => this.updatingModel(false));
         });
      }

      private retrieveQueryRequest(queryKey: string): JQueryPromise<any>
      {
         return this.net.getJson("retrievequery", { key: queryKey }).then((result) =>
         {
            this.updateQueryFromResult(result);

            if (result.data !== undefined && !result.data.hasWritePermission)
            {
               messages.show(strings.accessWrite.format("query", "bank accounts", "copy"), 2);
            }
         });
      }

      private retrieveQueriesRequest(): JQueryPromise<any>
      {
         return this.net.getJson("getquerylookup", null).then((result) =>
         {
            this.queries = ko.mapping.fromJS(result.data || [],
               {
                  key: (item) =>
                  {
                     return ko.unwrap(item.key);
                  }
               });
         });
      }

      private saveQuery(): JQueryPromise<any>
      {
         return this.validateEditingItem().then(() =>
         {
            if (!this.getEditingItemAsParams().hasWritePermission)
            {
               this.retrieveQueriesRequest().then(() =>
               {
                  // Save a copy of the Query
                  this.editingItem.key(null);
                  this.editingItem.name(utils.ensureUniqueName(this.editingItem.name(), ko.mapping.toJS(this.queries()), "value"));
                  this.editingItem.hasWritePermission = true;
                  return this.saveQueryRequest();
               });
            }
            else
            {
               return this.saveQueryRequest();
            }
         });
      }

      private saveQueryRequest(): JQueryPromise<any>
      {
         return this.net.postJson("savequery", () => this.getEditingItemAsParams()).then((result) =>
         {
            this.showMessageFromResult(result);
            var previousKey = this.editingItem.key();
            this.updateQueryFromResult(result);

            // If a new query was saved navigate to update the 
            // Url with the key of the newly saved query
            if (result.data.key !== previousKey)
               this.navigate(result.data.key);
         });
      }

      private createQueryRequest(): JQueryPromise<any>
      {
         return this.net.getJson("createquery", null).then((result) =>
         {
            this.updateQueryFromResult(result);
         });
      }

      private deleteQueryRequest(): JQueryPromise<any>
      {
         return this.net.postJson("deletequery", this.getKeyAsParams()).then((result) =>
         {
            this.updateQueryFromResult(result);
            messages.success(result.message);
         });
      }

      private copyQueryRequest(): JQueryPromise<any>
      {
         return this.net.getJson("copyquery", this.getKeyAsParams()).then((result) =>
         {
            this.updateQueryFromResult(result);
         });
      }

      private runIntradayMatchRequest(accountOnly: boolean = false): JQueryPromise<any>
      {
         var action = !accountOnly ? "runintradaymatches" : "runintradaymatch";
         return this.net.postJson(action, this.getSelectedAccountAsParams()).then((result) =>
         {
            this.clearGridStates();
            this.showMessageFromResult(result);
         });
      }

      private retrieveAccountRequest(accountKey: string): JQueryPromise<any>
      {
         var params = { key: accountKey, queryKey: this.editingItem.key() };
         this.updatingModel(true);
         this.accountsSummaryGrid.isLoading(true);
         return this.net.getJson("retrieveaccount", params)
            .done((result) =>
            {
               this.updateSelectedAccountFromResult(result);
               this.updatingModel(false);
               this.accountsSummaryGrid.isLoading(false);
            });
      }

      private updateAccountStatus(): JQueryPromise<any>
      {
         return this.net.getJson("retrieveAccountStatus", this.getEditingItemAsParams()).done((result) =>
         {
            this.updateSelectedAccountFromResult(result, false);
         });
      }

      private updateAccountSummary(): JQueryPromise<any>
      {
         return this.net.getJson("retrieveAccountSummary", this.getEditingItemAsParams()).done((result) =>
         {
            ko.mapping.fromJS(result.data.summary, this.editingItem.summary);
         }).always(() => this.accountsSummaryGrid.refreshData());
      }


      private upgradeProbablesForAccountRequest(): JQueryPromise<any>
      {
         return this.net.postJson("upgradeprobablesforaccount", this.getEditingItemAsParams()).then((result) =>
         {
            this.matchesGrid.reset();
            this.matchesGrid.refresh();
            this.showMessageFromResult(result);
         });
      }


      private matchAllRequest(action: string): JQueryPromise<any>
      {
         return this.net.postJson(action, this.getEditingItemAsParams()).then((result) =>
         {
            this.showMessageFromResult(result);
            this.clearGridStates();
         });
      }

      getEditingItemAsParams()
      {
         return ko.mapping.toJS(this.editingItem);
      }

      private validateEditingItem(): JQueryPromise<string[]>
      {
         return ag.utils.validateAndShowMessages(this.editingItem);
      }

      private getKeyAsParams()
      {
         return { key: this.editingItem.key() };
      }

      private getSelectedAccountAsParams()
      {
         var params: any = this.getKeyAsParams();
         params.account = this.editingItem.selectedAccount.key();

         return params;
      }

      private refreshFromResult(result)
      {
         this.showMessageFromResult(result);
         this.runQuery();
      }


      private postMarkAsReconciled(result)
      {
         this.showMessageFromResult(result);
         this.resetMatchesGrid();
      }

      private showMessageFromResult(result)
      {
         if (result && result.message)
            messages.show(result.message, result.messageType);
      }

      private findBestMatch(result, parentViewModel)
      {
         this.addSelectedFlows(this.selectedBankFlows, result.data.bankFlows);
         this.addSelectedFlows(this.selectedCashFlows, result.data.cashFlows);
      }

      private addSelectedFlows(selectedFlows: SelectedFlowsViewModel, flows: IFlow[]): void
      {
         if (flows)
         {
            $.each(flows, (index, flow) =>
            {
               selectedFlows.add(flow);
            });
         }
      }

      //#endregion

      //#region Client-side navigation

      private navigate(queryKey: string = null, accountKey: string = null, autorunEnabled: boolean = null)
      {
         var params: any = $.extend({}, this.navigationParameters);
         params.query = queryKey;
         params.account = accountKey;
         params.autorun = autorunEnabled;

         this.nav.navigate(params);
      }

      private resetNavigation()
      {
         this.navigate();
      }

      initNav()
      {
         this.nav = new NavHistory(
            {
               params: this.navigationParameters,
               onNavigate: (navEntry: INavEntry, navInfo: INavInfo) =>
               {
                  var queryKey = navEntry.params.query,
                     accountKey = navEntry.params.account,
                     autorun = navEntry.params.autorun && navInfo.isFirst; // Autorun is only applicable on page load

                  // Query route - if not already loaded, load the query, 
                  // then if autorun run the query too
                  if (!isNullUndefinedOrEmpty(queryKey))
                  {
                     if (queryKey === "new")
                     {
                        this.createQueryRequest();
                     }
                     else if (!this.isSelectedQuery(queryKey))
                     {
                        this.retrieveQueryRequest(queryKey).then(() =>
                        {
                           if (autorun)
                              this.runQuery();
                        });
                     }
                     else if (autorun)
                     {
                        this.runQuery();
                     }
                  }

                  // Account Route - if not already loaded, load the account
                  if (!isNullUndefinedOrEmpty(accountKey) && !this.isSelectedAccount(accountKey))
                  {
                     this.retrieveAccountRequest(accountKey);
                  }

                  // Auto run the query - default query only
                  if (!queryKey && autorun)
                  {
                     this.runQuery();
                  }
               }
            }).initialize({ linkToUrl: true });
      }

      //#endregion
   }
}

