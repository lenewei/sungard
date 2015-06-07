// <reference path="../simpleViewModel.ts" />
/// <reference path="../../helpers/format.ts" />
/// <reference path="../gridViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var ag;
(function (ag) {
    function formatNumberForDisplay(value, scale) {
        return ag.format.formatNumber(ag.mathEx.round(value, scale));
    }

    var bankRecRecordType;
    (function (bankRecRecordType) {
        bankRecRecordType[bankRecRecordType["None"] = 0] = "None";
        bankRecRecordType[bankRecRecordType["RecTypeBankflow"] = 1] = "RecTypeBankflow";
        bankRecRecordType[bankRecRecordType["RecTypecashflow"] = 2] = "RecTypecashflow";
        bankRecRecordType[bankRecRecordType["RecTypeExtCashflow"] = 3] = "RecTypeExtCashflow";
        bankRecRecordType[bankRecRecordType["RecTypeNettedCashflow"] = 4] = "RecTypeNettedCashflow";
        bankRecRecordType[bankRecRecordType["RecTypeProjCashflow"] = 5] = "RecTypeProjCashflow";
    })(bankRecRecordType || (bankRecRecordType = {}));

    var dealType;
    (function (dealType) {
        dealType[dealType["None"] = 0] = "None";
        dealType[dealType["ProjectedCashFlow"] = 1] = "ProjectedCashFlow";
        dealType[dealType["ActualCashFlow"] = 2] = "ActualCashFlow";
        dealType[dealType["AccountTransfer"] = 3] = "AccountTransfer";
        dealType[dealType["AccountAdjustment"] = 4] = "AccountAdjustment";
    })(dealType || (dealType = {}));

    var MatchSelectedViewModel = (function () {
        function MatchSelectedViewModel(grid, accessor) {
            var _this = this;
            this.grid = grid;
            this.accessor = accessor;
            this.items = ko.observableArray([]);

            this.keyAccessor = accessor;

            grid.selected.all.subscribe(function (changes) {
                _this.clear();
            });

            // Subscribe to changes to the keys collection (selections on grid)
            grid.selected.keys.subscribe(function (changes) {
                if (!changes || changes.length == 0)
                    return;

                $.each(changes, function (index, change) {
                    if (change.status == "added") {
                        var item = _this.find(_this.grid.items(), change.value);
                        if (item && !_this.find(_this.items(), _this.keyAccessor(item)))
                            _this.items.push(item);
                    } else if (change.status == "deleted")
                        _this.items.remove(_this.find(_this.items(), change.value));
                });
            }, null, "arrayChange");

            this.count = ko.computed(function () {
                if (ko.unwrap(grid.selected.all)) {
                    return (grid.pager.totalItems() - _this.items().length);
                }
                return (_this.items().length);
            });
        }
        MatchSelectedViewModel.prototype.add = function (item) {
            if (!this.find(this.items(), this.keyAccessor(item))) {
                this.items.push(item);
            }
        };

        MatchSelectedViewModel.prototype.clear = function () {
            // Clear current state of selections
            this.items([]);
        };

        MatchSelectedViewModel.prototype.find = function (items, id) {
            var _this = this;
            return _.find(items, function (item) {
                return _this.keyAccessor(item) == id;
            });
        };
        return MatchSelectedViewModel;
    })();
    ag.MatchSelectedViewModel = MatchSelectedViewModel;

    var SelectedFlowsViewModel = (function (_super) {
        __extends(SelectedFlowsViewModel, _super);
        function SelectedFlowsViewModel(grid, getScale, totalSum) {
            var _this = this;
            _super.call(this, grid, function (item) {
                return item.key;
            });
            this.grid = grid;
            this.getScale = getScale;
            this.totalSum = totalSum;
            this.sum = ko.observable(0);

            this.anyMatched = ko.computed(function () {
                if (ko.unwrap(grid.selected.all))
                    return true;
                return _.any(_this.items(), function (item) {
                    return item.matchNumber > 0;
                });
            });

            this.formattedSum = ko.computed(function () {
                var tempSum = 0;
                var isAllSelected = ko.unwrap(grid.selected.all);
                var balance = isAllSelected ? totalSum() : 0;

                _.each(_this.items(), function (item) {
                    tempSum += parseFloat(item.amount);
                });

                if (isAllSelected)
                    tempSum = tempSum * -1;
                tempSum += balance;
                _this.sum(tempSum);
                return formatNumberForDisplay(tempSum, getScale());
            });
        }
        SelectedFlowsViewModel.prototype.getUniqueValues = function (property) {
            return _.uniq(_.pluck(ko.unwrap(this.items), property));
        };
        return SelectedFlowsViewModel;
    })(MatchSelectedViewModel);
    ag.SelectedFlowsViewModel = SelectedFlowsViewModel;

    var SelectedMatchesViewModel = (function (_super) {
        __extends(SelectedMatchesViewModel, _super);
        function SelectedMatchesViewModel(grid) {
            var _this = this;
            _super.call(this, grid, function (item) {
                return item.matchNumber;
            });
            this.grid = grid;
            this.matchedValue = "Matched";
            this.unmatchedValue = "Unmatched";
            this.probableValue = "Probable";
            this.possibleValue = "Possible";

            this.anyMatched = ko.computed(function () {
                return _.any(_this.items(), function (item) {
                    return item.matchNumber > 0;
                });
            });

            this.canUnmatch = ko.computed(function () {
                return _this.count() > 0;
            });

            this.canPossibleMatch = ko.computed(function () {
                if (_this.count() == 0)
                    return false;

                var result = true;

                _.each(ko.unwrap(_this.items), function (item) {
                    if (parseFloat(item.bankFlowsCount) == 0 && parseFloat(item.cashFlowsCount) < 2) {
                        result = false;
                        return false;
                    }
                });

                return result;
            });

            this.canMatch = ko.computed(function () {
                if (!_this.canPossibleMatch())
                    return false;

                var result = true;

                _.each(ko.unwrap(_this.items), function (item) {
                    if (item.bankFlowsTotal != item.cashFlowsTotal) {
                        result = false;
                        return false;
                    }
                });

                return result;
            });

            this.canProbableMatch = this.canMatch;
        }
        return SelectedMatchesViewModel;
    })(MatchSelectedViewModel);
    ag.SelectedMatchesViewModel = SelectedMatchesViewModel;

    var SelectedItemsViewModel = (function () {
        function SelectedItemsViewModel(bankFlowsGrid, cashFlowsGrid, isIntraday, matchRequest, getScale, bankFlowsAmount, cashFlowsAmount) {
            var _this = this;
            this.bankFlows = new SelectedFlowsViewModel(bankFlowsGrid, getScale, bankFlowsAmount);
            this.cashFlows = new SelectedFlowsViewModel(cashFlowsGrid, getScale, cashFlowsAmount);
            this.isIntraday = isIntraday;
            this.matchRequest = matchRequest;

            this.difference = ko.computed(function () {
                return (_this.bankFlows.sum() - _this.cashFlows.sum());
            });

            this.differenceExist = ko.computed(function () {
                return _this.cashFlows.formattedSum() === _this.bankFlows.formattedSum();
            });

            this.formattedDifference = ko.computed(function () {
                return (formatNumberForDisplay(_this.difference(), getScale()));
            });

            this.matchCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canMatchFlows();
                },
                execute: function (data, event, complete) {
                    _this.doMatch("matchFlows", complete);
                }
            });

            this.unmatchCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canUnmatchFlows();
                },
                execute: function (data, event, complete) {
                    _this.doMatch("unmatchFlows", complete);
                }
            });

            this.possibleMatchCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canPossibleMatchFlows();
                },
                execute: function (data, event, complete) {
                    _this.doMatch("possibleMatchFlows", complete);
                }
            });

            this.probableMatchCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canMatchFlows();
                },
                execute: function (data, event, complete) {
                    _this.doMatch("probableMatchFlows", complete);
                }
            });
        }
        SelectedItemsViewModel.prototype.getDefaultDate = function (defaultDate) {
            var getDateValues = function (flows) {
                return flows.getUniqueValues('valueDate');
            };
            var bankFlowDates = getDateValues(this.bankFlows);
            var cashFlowDates = getDateValues(this.cashFlows);
            var allDates = _.union(bankFlowDates, cashFlowDates);
            if (allDates.length != 1)
                return defaultDate;
            return allDates[0];
        };

        SelectedItemsViewModel.prototype.doMatch = function (action, complete) {
            this.matchRequest(action, this.canUnmatchFlows()).always(complete);
        };

        SelectedItemsViewModel.prototype.canPossibleMatchFlows = function () {
            return !!(this.bankFlows && this.bankFlows.count() > 0 || this.cashFlows && this.cashFlows.count() > 1);
        };

        SelectedItemsViewModel.prototype.canMatchFlows = function () {
            return !!(this.canPossibleMatchFlows() && (this.isIntraday() || this.differenceExist()));
        };

        SelectedItemsViewModel.prototype.canUnmatchFlows = function () {
            return !!(this.bankFlows.anyMatched() || this.cashFlows.anyMatched());
        };

        SelectedItemsViewModel.prototype.clear = function () {
            this.bankFlows.clear();
            this.cashFlows.clear();
        };
        return SelectedItemsViewModel;
    })();
    ag.SelectedItemsViewModel = SelectedItemsViewModel;

    // ViewModel for Bank Reconciliation Matching screens
    var MatchSimpleViewModel = (function (_super) {
        __extends(MatchSimpleViewModel, _super);
        function MatchSimpleViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            this.showConfigure = ko.observable(true);
            this.navigationParameters = { query: null, account: null, autorun: null };
            this.scale = 2;

            // action to perform when user closes related window
            ag.childWindowClosing = function (viewModel, result, saved, windowHandle) {
                if (saved && result) {
                    var dealNumber = result.data.dealNumber;

                    var matchId = parseInt(ag.utils.getQueryStringParameterByName("matchId", windowHandle.location.search)) || 0;
                    var grid = matchId == 0 ? _this.cashFlowsGrid : _this.matchedCashFlowsGrid;
                    _this.getCreatedFlowsRequest(dealNumber, 2 /* RecTypecashflow */, result.data.transactionType, matchId, grid).done(function () {
                        return ag.messages.show(result.message, result.messageType);
                    }).done(function () {
                        return grid.__updateAccountStatus();
                    });
                }
            };
        }
        MatchSimpleViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            // Get a references to the grids we will commonly work with
            this.accountsGrid = this.grids.accounts;
            this.bankFlowsGrid = this.grids.bankFlows;
            this.cashFlowsGrid = this.grids.cashFlows;
            this.matchesGrid = this.grids.matches;
            this.matchedBankFlowsGrid = this.grids.matchedBankFlows;
            this.matchedCashFlowsGrid = this.grids.matchedCashFlows;
            this.accountsSummaryGrid = this.grids.accountsSummary;

            this.bankFlowsGrid.__updateSelections = this.updateBankFlowSelections.bind(this);
            this.bankFlowsGrid.__updateAccountStatus = this.postFlowsHaveChanged.bind(this);
            this.bankFlowsGrid.__attachQuery = this.attachQuery.bind(this);
            this.bankFlowsGrid.__addExtraPayload = this.addExtraPayload.bind(this);

            this.cashFlowsGrid.__updateSelections = this.updateCashFlowSelections.bind(this);
            this.cashFlowsGrid.__updateAccountStatus = this.postFlowsHaveChanged.bind(this);
            this.cashFlowsGrid.__attachQuery = this.attachQuery.bind(this);

            this.matchedBankFlowsGrid.__addExtraPayload = this.addExtraPayload.bind(this);
            this.matchedBankFlowsGrid.__updateSelections = this.updateMatchedBankFlowSelections.bind(this);
            this.matchedBankFlowsGrid.__updateAccountStatus = this.afterAddMatchedBankFlowSelections.bind(this);

            this.matchedCashFlowsGrid.__updateSelections = this.updateMatchedCashFlowSelections.bind(this);
            this.matchedCashFlowsGrid.__updateAccountStatus = this.updateAddMatchedCashFlowSelections.bind(this);

            this.matchesGrid.__matchClearState = this.resetMatchesGrid.bind(this);
            this.matchesGrid.__postMarkAsReconciled = this.postMarkAsReconciled.bind(this);
            this.matchesGrid.__attachQuery = this.attachQuery.bind(this);
            this.matchesGrid.__attachAccountSelection = this.attachAccountSelection.bind(this);

            this.accountsSummaryGrid.__matchClearState = this.resetMatchesGrid.bind(this);

            var getScale = function () {
                return _this.scale;
            };

            this.selectedMatch = ko.computed(function () {
                if (_this.matchesGrid.selected.keys().length != 1)
                    return;
                var grid = _this.matchesGrid;

                for (var keyIndex = 0; keyIndex < grid.selected.keys().length; keyIndex++) {
                    var item = _.find(grid.items(), function (gridItem) {
                        return gridItem[grid.itemKey] == grid.selected.keys()[keyIndex];
                    });

                    return item;
                }
            });

            var bankFlowsTotal = ko.computed(function () {
                return parseFloat(ko.unwrap(_this.editingItem.selectedAccount.reconciliationSummary.bankFlowsTotal));
            });

            var cashFlowsTotal = ko.computed(function () {
                return parseFloat(ko.unwrap(_this.editingItem.selectedAccount.reconciliationSummary.cashFlowsTotal));
            });

            var matchedFlowsTotal = function (propertyName) {
                var item = ko.unwrap(_this.selectedMatch);
                return item ? parseFloat(item[propertyName]) : 0;
            };

            var matchedBankFlowsTotal = ko.computed(function () {
                return matchedFlowsTotal('bankFlowsTotal');
            });

            var matchedCashFlowsTotal = ko.computed(function () {
                return matchedFlowsTotal('cashFlowsTotal');
            });

            this.selectedFlows = new SelectedItemsViewModel(this.bankFlowsGrid, this.cashFlowsGrid, this.editingItem.isIntraDay, function (action, includesMatchedFlows) {
                return _this.matchRequest.call(_this, action, "flows", _this.accountsSummaryGrid, includesMatchedFlows);
            }, getScale, bankFlowsTotal, cashFlowsTotal);
            this.selectedMatchedFlows = new SelectedItemsViewModel(this.matchedBankFlowsGrid, this.matchedCashFlowsGrid, this.editingItem.isIntraDay, function (action, includesMatchedFlows) {
                return _this.matchRequest.call(_this, action, "matchedFlows", _this.matchesGrid, includesMatchedFlows);
            }, getScale, matchedBankFlowsTotal, matchedCashFlowsTotal);

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

            this.selectedMatchId = ko.computed(function () {
                var item = _this.selectedMatch();
                return item ? item.matchNumber : 0;
            });

            this.cashFlowsGrid.canDelete = function () {
                return MatchSimpleViewModel.canPerformAction(_this.cashFlowsGrid, _this.cashFlowsGrid.itemKey, "canDelete", _.every);
            };

            this.bankFlowsGrid.canDelete = function () {
                return MatchSimpleViewModel.canPerformAction(_this.bankFlowsGrid, _this.bankFlowsGrid.itemKey, "canDelete", _.every);
            };

            this.matchedCashFlowsGrid.canDelete = function () {
                return MatchSimpleViewModel.canPerformAction(_this.matchedCashFlowsGrid, _this.matchedCashFlowsGrid.itemKey, "canDelete", _.every);
            };

            this.matchedBankFlowsGrid.canDelete = function () {
                return MatchSimpleViewModel.canPerformAction(_this.matchedBankFlowsGrid, _this.matchedBankFlowsGrid.itemKey, "canDelete", _.every);
            };

            this.matchesGrid.canMatch = function () {
                return _this.selectedMatches.canMatch();
            };

            this.matchesGrid.canProbableMatch = function () {
                return _this.selectedMatches.canProbableMatch();
            };

            this.matchesGrid.canPossibleMatch = function () {
                return _this.selectedMatches.canPossibleMatch();
            };

            this.matchesGrid.canUnmatch = function () {
                return _this.selectedMatches.canUnmatch();
            };

            this.accountsSummaryGrid.selected.item.subscribe(function (value) {
                if (!value)
                    return;
                try  {
                    _this.scale = _this.currencies[value.currency.toLowerCase()].amountDp;
                } catch (e) {
                    _this.scale = 2;
                }
                _this.retrieveAccountRequest(value[_this.accountsSummaryGrid.selected.itemKey]);
            });

            this.matchesGrid.selected.keys.subscribe(function (value) {
                if (!value)
                    return;

                //this.selectedMatchedFlows.clear();
                if (value.length == 1) {
                    _this.matchedBankFlowsGrid.selected.all(true);
                    _this.matchedCashFlowsGrid.selected.all(true);
                    _this.matchedBankFlowsGrid.refreshData(false);
                    _this.matchedCashFlowsGrid.refreshData(false);
                } else {
                    _this.matchedBankFlowsGrid.clearData();
                    _this.matchedCashFlowsGrid.clearData();
                }
            });

            this.matchedBankFlowsGrid.dependencyProxy.subscribe(function (value) {
                if (!_this.updatingModel()) {
                    _this.resetMatchesGrid();
                    _this.matchedCashFlowsGrid.refreshData();
                }
            });

            this.matchedCashFlowsGrid.dependencyProxy.subscribe(function (value) {
                if (!_this.updatingModel()) {
                    _this.resetMatchesGrid();
                    _this.matchedBankFlowsGrid.refreshData();
                }
            });

            ko.computed(function () {
                if (_this.editingItem.name() || _this.editingItem.selectedAccount.accountSummary.name()) {
                    _this.updatePageTitle(_this.editingItem.selectedAccount.accountSummary.name());
                }
            });

            // Lastly, create commands
            this.createCommands();

            this.showConfigure(!itemModel.summary.queryRun);

            if (!itemModel.hasWritePermission) {
                ag.messages.show(ag.strings.accessWrite.format("query", "bank accounts", "copy"), 2);
            }

            // Create client-side navigation
            this.initNav();
        };

        MatchSimpleViewModel.canPerformAction = function (grid, itemKey, canProperty, fn) {
            return grid.selected.keys().length > 0 && fn(grid.selected.keys(), function (key) {
                var item = _.find(grid.items(), function (gridItem) {
                    return gridItem[itemKey] == key;
                });

                return item && item[canProperty];
            });
        };

        MatchSimpleViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            this.bankFlowsGrid.actions.createBankFlow.createCustomPayload = function (data) {
                var payload = { data: ko.mapping.toJS(data) };
                return _this.attachQuery(null, payload);
            };

            this.matchedBankFlowsGrid.actions.createMatchedBankFlow.createCustomPayload = function (data) {
                var payload = { data: ko.mapping.toJS(data) };
                return _this.attachQuery(null, payload);
            };

            this.accountsSummaryGrid.actions.runScriptAccount.createCustomPayload = function (data) {
                var payload = { data: ko.mapping.toJS(data) };
                return _this.attachQuery(null, payload);
            };

            this.bankFlowsGrid.afterFindBestMatch = function (parentViewModel, result) {
                return _this.findBestMatch(result, parentViewModel);
            };

            this.cashFlowsGrid.afterFindBestMatch = function (parentViewModel, result) {
                return _this.findBestMatch(result, parentViewModel);
            };

            this.accountsSummaryGrid.refreshFromResult = function (result) {
                return _this.refreshFromResult(result);
            };

            this.bankFlowsGrid.actions.viewStatement.createCustomPayload = function (data) {
                return { edit: ko.unwrap(data.statementId) };
            };

            var bankStatementCustomPayload = function () {
                var accountItem = _this.accountsSummaryGrid.selected.item;
                if (accountItem) {
                    var data = ko.mapping.toJS(accountItem);
                    return { account: data.accountNumber, start: _this.editingItem.priorDayStartDate(), end: _this.editingItem.priorDayEndDate() };
                }
            };

            this.accountsSummaryGrid.actions.viewStatements.createCustomPayload = bankStatementCustomPayload;
            this.matchesGrid.actions.viewStatements.createCustomPayload = bankStatementCustomPayload;

            var messageLogAction = this["actions"].messageLog;

            if (messageLogAction) {
                messageLogAction.createCustomPayload = function (data) {
                    return { activityId: _this.activityId };
                };
            }

            this.accountsSummaryGrid.setMatchPayload = function (parent, payload) {
                payload.data = ko.mapping.toJS(_this.editingItem);
                payload["source"] = "flows";
            };
            this.matchesGrid.setMatchPayload = function (parent, payload) {
                payload.data = ko.mapping.toJS(_this.editingItem);
                payload["source"] = "matchedflows";
            };
            this.accountsSummaryGrid.postMatch = function () {
                _this.clearGridStates();
            };
            this.matchesGrid.postMatch = function () {
                _this.clearGridStates();
            };
        };

        // Called when a new query is selected in the UI
        MatchSimpleViewModel.prototype.querySelected = function (selections) {
            if (selections && $.isArray(selections) && selections.length > 0) {
                // Navigate to the Query and reset account and autorun
                this.navigate(selections[0].key);
            }
        };

        MatchSimpleViewModel.prototype.isSelectedQuery = function (queryKey) {
            return queryKey === this.editingItem.key();
        };

        // Called when an account is selected in the UI
        MatchSimpleViewModel.prototype.accountSelected = function (selections) {
            if (selections && $.isArray(selections) && selections.length > 0) {
                this.navigate(this.editingItem.key(), selections[0].key);
            }
        };

        MatchSimpleViewModel.prototype.selectedAccount = function () {
            return this.editingItem.selectedAccount.accountSummary.name();
        };

        MatchSimpleViewModel.prototype.isSelectedAccount = function (accountKey) {
            if (!this.editingItem.selectedAccount)
                return false;

            return accountKey === this.editingItem.selectedAccount.key();
        };

        //#region Private Helpers
        MatchSimpleViewModel.prototype.updateCashFlowSelections = function (action, data) {
            // Only thing that can be done at this stage
            // once selections is moved to be on gridViewOptions
            // we will have much better control e.g. leave items
            // selected that were not affected by the action
            //this.cashFlowsGrid.selected.reset();
            //this.selectedCashFlows.clear();
        };

        MatchSimpleViewModel.prototype.postFlowsHaveChanged = function (action, data) {
            var _this = this;
            this.updateAccountStatus().always(function () {
                return _this.accountsSummaryGrid.refreshData();
            });
            //this.updateAccountSummary();
        };

        MatchSimpleViewModel.prototype.updateBankFlowSelections = function (action, data) {
            // Only thing that can be done at this stage
            // (see above for further comment)
            //this.bankFlowsGrid.selected.reset();
            //this.selectedBankFlows.clear();
            this.forceRefresh();
        };

        MatchSimpleViewModel.prototype.updateMatchedCashFlowSelections = function (action, data) {
            this.matchesGrid.selected.reset();

            this.forceRefresh();
        };

        MatchSimpleViewModel.prototype.updateAddMatchedCashFlowSelections = function (action, data) {
            this.resetMatchesGrid();
            this.matchedBankFlowsGrid.refreshData();
            //_this.matchedCashFlowsGrid.refreshData();
        };

        MatchSimpleViewModel.prototype.addExtraPayload = function (viewModel, data) {
            if (data) {
                data['matchId'] = ko.unwrap(this.selectedMatchId);
            }
        };

        MatchSimpleViewModel.prototype.updateMatchedBankFlowSelections = function (action, data) {
            this.clearGridStates();
        };

        MatchSimpleViewModel.prototype.afterAddMatchedBankFlowSelections = function (action, data) {
            this.resetMatchesGrid();
            this.matchedCashFlowsGrid.refreshData();
        };

        MatchSimpleViewModel.prototype.resetMatchesGrid = function () {
            var _this = this;
            this.accountsSummaryGrid.refreshData(true);

            this.bankFlowsGrid.refreshData().always(function () {
                _this.bankFlowsGrid.selected.reset();
            });
            this.cashFlowsGrid.refreshData().always(function () {
                _this.cashFlowsGrid.selected.reset();
            });

            this.matchesGrid.refreshData();
        };

        MatchSimpleViewModel.prototype.forceRefresh = function () {
            this.matchedCashFlowsGrid.refreshData();
            this.accountsSummaryGrid.refreshData();
            this.bankFlowsGrid.refreshData();

            this.cashFlowsGrid.refreshData();

            this.matchesGrid.refreshData();

            this.matchedBankFlowsGrid.refreshData();
            this.matchedCashFlowsGrid.refreshData();
        };

        MatchSimpleViewModel.prototype.clearGridStates = function (ignoreSummary, clearMatchesGrid) {
            var _this = this;
            if (typeof ignoreSummary === "undefined") { ignoreSummary = false; }
            if (typeof clearMatchesGrid === "undefined") { clearMatchesGrid = true; }
            if (!ignoreSummary) {
                this.accountsSummaryGrid.refreshData();
            }

            this.bankFlowsGrid.refreshData().always(function () {
                _this.bankFlowsGrid.selected.reset();
            });
            this.cashFlowsGrid.refreshData().always(function () {
                _this.cashFlowsGrid.selected.reset();
            });

            this.matchesGrid.refreshData().always(function () {
                if (clearMatchesGrid) {
                    _this.matchesGrid.selected.reset();
                    _this.selectedFlows.clear();
                    _this.selectedMatchedFlows.clear();
                }
            });

            this.matchedBankFlowsGrid.refreshData().always(function () {
                _this.matchedBankFlowsGrid.selected.reset();
            });
            this.matchedCashFlowsGrid.refreshData().always(function () {
                _this.matchedCashFlowsGrid.selected.reset();
            });
        };

        MatchSimpleViewModel.prototype.updatePageTitle = function (queryName) {
            var name = queryName ? ' - ' + queryName : '';
            name = this.editingItem.name() + name;
            this.pageTitle.removeAll();
            this.pageTitle.push({ keyProperty: name });
        };

        MatchSimpleViewModel.prototype.updateQueryFromResult = function (result) {
            // Map the result over the current item
            this.updatingModel(true);

            ko.mapping.fromJS(result.data, this.editingItem);
            ag.utils.resetValidation(this.editingItem);

            // Refresh the accounts grid
            this.accountsGrid.refresh();

            this.showConfigure(true);

            //this.showResults(false);
            this.updatingModel(false);
        };

        MatchSimpleViewModel.prototype.updateSelectedAccountFromResult = function (result, clearGrid) {
            if (typeof clearGrid === "undefined") { clearGrid = true; }
            // Map the result over the current item
            ko.mapping.fromJS(result.data.selectedAccount, this.editingItem.selectedAccount);

            // Refresh the matching grids
            if (clearGrid)
                this.clearGridStates(true);
        };

        MatchSimpleViewModel.prototype.isDefaultQuery = function () {
            var defaultQueryKey = "default", key = this.editingItem && this.editingItem.key();

            return key && key.toLowerCase() === defaultQueryKey;
        };

        MatchSimpleViewModel.prototype.isSavedQuery = function () {
            return !!(this.editingItem && this.editingItem.key());
        };

        MatchSimpleViewModel.prototype.hasSelectedAccount = function () {
            return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.key());
        };

        MatchSimpleViewModel.prototype.isScriptLinkedToAccount = function (detailMatchScript) {
            if (detailMatchScript) {
                return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.accountSummary.detailMatchType());
            }
            return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.accountSummary.balanceMatchType());
        };

        MatchSimpleViewModel.prototype.isIntraDayScriptLinkedToAccount = function () {
            return !!(this.editingItem && this.editingItem.selectedAccount && this.editingItem.selectedAccount.accountSummary.intradayMatchType());
        };

        MatchSimpleViewModel.prototype.canPossibleMatch = function (matchStatus) {
            var match = this.selectedMatch();
            if (!match) {
                return false;
            }
            return (matchStatus != match.matchStatus && (match.bankFlowsCount > 0 || match.cashFlowsCount > 1));
        };

        MatchSimpleViewModel.prototype.canMatch = function (matchStatus) {
            return !!(this.canPossibleMatch(matchStatus) && (this.editingItem.isIntraDay() || (this.selectedMatch().flowDifference == 0)));
        };

        MatchSimpleViewModel.prototype.matchRequest = function (action, context, grid, includesMatchedFlows) {
            var _this = this;
            if (includesMatchedFlows) {
                var fn = function (g, a) {
                    g.actions.matchFlows.actionDetails.action = a;
                    g.actions.matchFlows.show();
                };
                return $.when(fn(grid, action));
            }

            var params = this.getEditingItemAsParams();
            params["source"] = context;
            return this.net.postJson(action, params).then(function (result) {
                _this.postMatch(result);
            });
        };

        MatchSimpleViewModel.prototype.postMatch = function (result) {
            this.showMessageFromResult(result);
            this.clearGridStates();
        };

        //#endregion
        //#region Menu Actions and Commands
        MatchSimpleViewModel.prototype.saveQueryIfNew = function () {
            if (this.isSavedQuery())
                return $.Deferred().resolve();

            return this.saveQuery();
        };

        MatchSimpleViewModel.prototype.runQuery = function (complete) {
            var _this = this;
            this.saveQueryIfNew().then(function () {
                _this.runQueryRequest().always(complete);
            }, complete);
        };

        MatchSimpleViewModel.prototype.createCommands = function () {
            var _this = this;
            this.runCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.runQuery(complete);
                }
            });

            this.saveCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    // Can only save when not the default query
                    return !isExecuting && !_this.isDefaultQuery();
                },
                execute: function (data, event, complete) {
                    _this.saveQuery().always(complete);
                }
            });

            this.createCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.navigate("new");
                    complete();
                }
            });

            this.deleteCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    // Can't delete the default query
                    return !isExecuting && !_this.isDefaultQuery() && _this.isSavedQuery();
                },
                execute: function (data, event, complete) {
                    _this.deleteQueryRequest().always(complete);
                    _this.resetNavigation();
                }
            });

            this.copyCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    // Can only copy saved queries
                    return !isExecuting && _this.editingItem.key();
                },
                execute: function (data, event, complete) {
                    _this.copyQueryRequest().always(complete);
                }
            });

            this.runIntradayMatchCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    // Can't delete the default query
                    return !isExecuting;
                },
                execute: function (data, event, complete) {
                    _this.runIntradayMatchRequest().always(complete);
                }
            });
        };

        MatchSimpleViewModel.prototype.beforeApplyBindings = function () {
            var _this = this;
            this.grids.accountsSummary.__postMarkAsReconciled = function (result) {
                return _this.postMarkAsReconciled(result);
            };

            this.grids.accountsSummary.upgradeProbablesCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    // Only execute when there is an account selected
                    return !isExecuting && _this.hasSelectedAccount();
                },
                execute: function (data, event, complete) {
                    _this.upgradeProbablesForAccountRequest().always(complete);
                }
            });

            this.grids.accountsSummary.runIntradayMatchCommand = ko.asyncCommand({
                canExecute: function (isExecuting) {
                    // Only execute when there is an account selected
                    return !isExecuting && _this.hasSelectedAccount() && _this.isIntraDayScriptLinkedToAccount();
                    ;
                },
                execute: function (data, event, complete) {
                    _this.runIntradayMatchRequest(true).always(complete);
                }
            });

            this.grids.accountsSummary.menuCommands.newAdjustmentCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(4 /* AccountAdjustment */, data.actions.newAdjustment, _this.selectedFlows).always(complete);
                }
            });

            this.grids.accountsSummary.menuCommands.newTransferCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(3 /* AccountTransfer */, data.actions.newTransfer, _this.selectedFlows).always(complete);
                }
            });

            this.grids.matches.menuCommands.newAdjustmentCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(4 /* AccountAdjustment */, data.actions.newAdjustment, _this.selectedMatchedFlows, _this.selectedMatchId()).always(complete);
                }
            });

            this.grids.matches.menuCommands.newTransferCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(3 /* AccountTransfer */, data.actions.newTransfer, _this.selectedMatchedFlows, _this.selectedMatchId()).always(complete);
                }
            });

            this.grids.cashFlows.menuCommands.newProjectedCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(1 /* ProjectedCashFlow */, data.actions.newProjectedCashFlow, _this.selectedFlows).always(complete);
                }
            });

            this.grids.cashFlows.menuCommands.newActualCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(2 /* ActualCashFlow */, data.actions.newActualCashFlow, _this.selectedFlows).always(complete);
                }
            });

            this.grids.matchedCashFlows.menuCommands.newProjectedCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(1 /* ProjectedCashFlow */, data.actions.newProjectedCashFlow, _this.selectedMatchedFlows, _this.selectedMatchId()).always(complete);
                }
            });

            this.grids.matchedCashFlows.menuCommands.newActualCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.popWindow(2 /* ActualCashFlow */, data.actions.newActualCashFlow, _this.selectedMatchedFlows, _this.selectedMatchId()).always(complete);
                }
            });

            this.accountsGrid['addQueryDataToPayload'] = function (action, payload) {
                _this.attachQuery(action, payload);
                //payload.currencies = this.editingItem.currencies();
                //payload.entities = this.editingItem.entities();
                //payload.banks = this.editingItem.banks();
                //payload.isInternal = ko.unwrap(this.editingItem.isInternal);
                //payload.isExternal = ko.unwrap(this.editingItem.isExternal);
                //payload.accountType = ko.unwrap(this.editingItem.accountType);
            };
        };

        MatchSimpleViewModel.prototype.attachMatch = function (data) {
            this.attachQuery(null, data);

            //if (data)
            //{
            //    data.selectedMatches = ko.mapping.toJS(this.matchesGrid.selected.keys);
            //}
            return data;
        };

        MatchSimpleViewModel.prototype.attachQuery = function (action, data) {
            if (data) {
                $.extend(data, ko.mapping.toJS(this.editingItem));
            }
            return data;
        };

        MatchSimpleViewModel.prototype.attachAccountSelection = function (action, data) {
            if (data) {
                data.data = ko.mapping.toJS(this.accountsSummaryGrid.selected.item);
            }
            return data;
        };

        MatchSimpleViewModel.prototype.popWindow = function (type, actionItem, simpleViewModel, matchId) {
            var _this = this;
            if (typeof matchId === "undefined") { matchId = 0; }
            var model = ko.mapping.toJS(this.editingItem);

            var accountKey = model.selectedAccount.key;
            var path = actionItem.actionDetails.path;
            var date = simpleViewModel.getDefaultDate(model.summary.endDate);

            if (model.selectedAccount.key != null) {
                // Get the default data for the deal based on selection
                var flows = {
                    accountNumber: model.selectedAccount.key,
                    matchId: matchId,
                    cashFlowOptions: simpleViewModel.cashFlows.grid.getGridViewOptions().selections,
                    bankFlowOptions: simpleViewModel.bankFlows.grid.getGridViewOptions().selections
                };

                return ag.utils.getJson('getDealDefaults', flows).done(function (response) {
                    var amount = response.amount;
                    var data = _this.getDataForDealType(type, model, response.amount, date, matchId, response.comments);
                    _this.setDealProperty(data, "entity", response.entity);
                    _this.openDeal(path, data);
                });
            } else {
                var data = this.getDataForDealType(type, model, 0, date, matchId);
                return this.openDeal(path, data);
            }
        };

        MatchSimpleViewModel.prototype.openDeal = function (path, data) {
            return ag.utils.openApplicationWindowPromise(path, data);
        };

        MatchSimpleViewModel.prototype.getDataForDealType = function (type, model, amount, date, matchId, comments) {
            if (typeof matchId === "undefined") { matchId = 0; }
            if (typeof comments === "undefined") { comments = null; }
            var payload = {
                dialog: 2
            };

            switch (type) {
                case 1 /* ProjectedCashFlow */:
                case 2 /* ActualCashFlow */:
                    this.setCashFlowProperties(payload, model, amount, date, matchId, comments);
                    break;
                case 4 /* AccountAdjustment */:
                    this.setAccountAdjustmentProperties(payload, model, amount, date);
                    break;
                case 3 /* AccountTransfer */:
                    this.setCashTransferProperties(payload, model, amount, date);
                    break;
                default:
                    throw new Error('Unknown deal type.');
            }
            if (matchId > 0) {
                this.setDealProperty(payload, "matchId", matchId);
            }
            return payload;
        };

        // actual cashflow
        MatchSimpleViewModel.prototype.setCashFlowProperties = function (payload, model, amount, date, matchId, comments) {
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
        };

        // actual cashflow
        MatchSimpleViewModel.prototype.setAccountAdjustmentProperties = function (payload, model, amount, date) {
            this.setDealProperty(payload, "dealDate", date);
            this.setDealProperty(payload, "currentAdjustmentMode", "AccAdjMode");
            this.setDealProperty(payload, "currency", model.selectedAccount.accountSummary.currency);
            this.setDealProperty(payload, "bankAccountNumber", model.selectedAccount.key);
            this.setDealProperty(payload, "entity", model.selectedAccount.accountSummary.entity);
            this.setDealProperty(payload, "adjustmentAmount", amount);
            return payload;
        };

        // cash transfer - deal save
        MatchSimpleViewModel.prototype.setCashTransferProperties = function (payload, model, amount, date) {
            this.setDealProperty(payload, "dealDate", date);
            this.setDealProperty(payload, "settlementDate", date);
            this.setDealProperty(payload, "currency", model.selectedAccount.accountSummary.currency);
            this.setDealProperty(payload, "faceValue", Math.abs(amount));
            if (model.amount > 0) {
                this.setDealProperty(payload, "sourceAccountNumber", model.selectedAccount.key);
            } else {
                this.setDealProperty(payload, "destinationAccountNumber", model.selectedAccount.key);
            }
            return payload;
        };

        MatchSimpleViewModel.prototype.setDealProperty = function (payload, destination, modelProp) {
            if (modelProp) {
                payload[destination] = modelProp;
            }
        };

        MatchSimpleViewModel.prototype.toggleConfigure = function () {
            this.showConfigure(!this.showConfigure());
        };

        //#endregion
        //#region Network
        MatchSimpleViewModel.prototype.getCreatedFlowsRequest = function (dealNumber, flowType, transactionType, matchNumber, grid) {
            var _this = this;
            return this.validateEditingItem().then(function () {
                var params = _this.getEditingItemAsParams();
                params["data"] = { dealNumber: dealNumber, flowType: flowType, matchNumber: matchNumber };
                params["transactionType"] = transactionType;
                params["options"] = grid.getGridViewOptions();
                return _this.net.postJson("getCreatedCashFlows", function () {
                    return params;
                }).then(function (result) {
                    if (result) {
                        grid.loadData(result);
                    }
                });
            });
        };

        MatchSimpleViewModel.prototype.runQueryRequest = function () {
            var _this = this;
            if (!ko.unwrap(this.tabs.overview))
                $('#overviewTabHeader a').click();

            return this.validateEditingItem().then(function () {
                return _this.net.postJson("runquery", function () {
                    return _this.getEditingItemAsParams();
                }).then(function (result) {
                    _this.showMessageFromResult(result);

                    _this.updatingModel(true);

                    ko.mapping.fromJS(result.data.summary, _this.editingItem.summary);

                    ko.mapping.fromJS(result.data.selectedAccount, _this.editingItem.selectedAccount);

                    // Hide the configuration panel
                    _this.showConfigure(false);

                    // Show the results grids area
                    //this.showResults(true);
                    // Clear any current state of grids and refresh
                    _this.clearGridStates();
                }).always(function () {
                    return _this.updatingModel(false);
                });
            });
        };

        MatchSimpleViewModel.prototype.retrieveQueryRequest = function (queryKey) {
            var _this = this;
            return this.net.getJson("retrievequery", { key: queryKey }).then(function (result) {
                _this.updateQueryFromResult(result);

                if (result.data !== undefined && !result.data.hasWritePermission) {
                    ag.messages.show(ag.strings.accessWrite.format("query", "bank accounts", "copy"), 2);
                }
            });
        };

        MatchSimpleViewModel.prototype.retrieveQueriesRequest = function () {
            var _this = this;
            return this.net.getJson("getquerylookup", null).then(function (result) {
                _this.queries = ko.mapping.fromJS(result.data || [], {
                    key: function (item) {
                        return ko.unwrap(item.key);
                    }
                });
            });
        };

        MatchSimpleViewModel.prototype.saveQuery = function () {
            var _this = this;
            return this.validateEditingItem().then(function () {
                if (!_this.getEditingItemAsParams().hasWritePermission) {
                    _this.retrieveQueriesRequest().then(function () {
                        // Save a copy of the Query
                        _this.editingItem.key(null);
                        _this.editingItem.name(ag.utils.ensureUniqueName(_this.editingItem.name(), ko.mapping.toJS(_this.queries()), "value"));
                        _this.editingItem.hasWritePermission = true;
                        return _this.saveQueryRequest();
                    });
                } else {
                    return _this.saveQueryRequest();
                }
            });
        };

        MatchSimpleViewModel.prototype.saveQueryRequest = function () {
            var _this = this;
            return this.net.postJson("savequery", function () {
                return _this.getEditingItemAsParams();
            }).then(function (result) {
                _this.showMessageFromResult(result);
                var previousKey = _this.editingItem.key();
                _this.updateQueryFromResult(result);

                // If a new query was saved navigate to update the
                // Url with the key of the newly saved query
                if (result.data.key !== previousKey)
                    _this.navigate(result.data.key);
            });
        };

        MatchSimpleViewModel.prototype.createQueryRequest = function () {
            var _this = this;
            return this.net.getJson("createquery", null).then(function (result) {
                _this.updateQueryFromResult(result);
            });
        };

        MatchSimpleViewModel.prototype.deleteQueryRequest = function () {
            var _this = this;
            return this.net.postJson("deletequery", this.getKeyAsParams()).then(function (result) {
                _this.updateQueryFromResult(result);
                ag.messages.success(result.message);
            });
        };

        MatchSimpleViewModel.prototype.copyQueryRequest = function () {
            var _this = this;
            return this.net.getJson("copyquery", this.getKeyAsParams()).then(function (result) {
                _this.updateQueryFromResult(result);
            });
        };

        MatchSimpleViewModel.prototype.runIntradayMatchRequest = function (accountOnly) {
            var _this = this;
            if (typeof accountOnly === "undefined") { accountOnly = false; }
            var action = !accountOnly ? "runintradaymatches" : "runintradaymatch";
            return this.net.postJson(action, this.getSelectedAccountAsParams()).then(function (result) {
                _this.clearGridStates();
                _this.showMessageFromResult(result);
            });
        };

        MatchSimpleViewModel.prototype.retrieveAccountRequest = function (accountKey) {
            var _this = this;
            var params = { key: accountKey, queryKey: this.editingItem.key() };
            this.updatingModel(true);
            this.accountsSummaryGrid.isLoading(true);
            return this.net.getJson("retrieveaccount", params).done(function (result) {
                _this.updateSelectedAccountFromResult(result);
                _this.updatingModel(false);
                _this.accountsSummaryGrid.isLoading(false);
            });
        };

        MatchSimpleViewModel.prototype.updateAccountStatus = function () {
            var _this = this;
            return this.net.getJson("retrieveAccountStatus", this.getEditingItemAsParams()).done(function (result) {
                _this.updateSelectedAccountFromResult(result, false);
            });
        };

        MatchSimpleViewModel.prototype.updateAccountSummary = function () {
            var _this = this;
            return this.net.getJson("retrieveAccountSummary", this.getEditingItemAsParams()).done(function (result) {
                ko.mapping.fromJS(result.data.summary, _this.editingItem.summary);
            }).always(function () {
                return _this.accountsSummaryGrid.refreshData();
            });
        };

        MatchSimpleViewModel.prototype.upgradeProbablesForAccountRequest = function () {
            var _this = this;
            return this.net.postJson("upgradeprobablesforaccount", this.getEditingItemAsParams()).then(function (result) {
                _this.matchesGrid.reset();
                _this.matchesGrid.refresh();
                _this.showMessageFromResult(result);
            });
        };

        MatchSimpleViewModel.prototype.matchAllRequest = function (action) {
            var _this = this;
            return this.net.postJson(action, this.getEditingItemAsParams()).then(function (result) {
                _this.showMessageFromResult(result);
                _this.clearGridStates();
            });
        };

        MatchSimpleViewModel.prototype.getEditingItemAsParams = function () {
            return ko.mapping.toJS(this.editingItem);
        };

        MatchSimpleViewModel.prototype.validateEditingItem = function () {
            return ag.utils.validateAndShowMessages(this.editingItem);
        };

        MatchSimpleViewModel.prototype.getKeyAsParams = function () {
            return { key: this.editingItem.key() };
        };

        MatchSimpleViewModel.prototype.getSelectedAccountAsParams = function () {
            var params = this.getKeyAsParams();
            params.account = this.editingItem.selectedAccount.key();

            return params;
        };

        MatchSimpleViewModel.prototype.refreshFromResult = function (result) {
            this.showMessageFromResult(result);
            this.runQuery();
        };

        MatchSimpleViewModel.prototype.postMarkAsReconciled = function (result) {
            this.showMessageFromResult(result);
            this.resetMatchesGrid();
        };

        MatchSimpleViewModel.prototype.showMessageFromResult = function (result) {
            if (result && result.message)
                ag.messages.show(result.message, result.messageType);
        };

        MatchSimpleViewModel.prototype.findBestMatch = function (result, parentViewModel) {
            this.addSelectedFlows(this.selectedBankFlows, result.data.bankFlows);
            this.addSelectedFlows(this.selectedCashFlows, result.data.cashFlows);
        };

        MatchSimpleViewModel.prototype.addSelectedFlows = function (selectedFlows, flows) {
            if (flows) {
                $.each(flows, function (index, flow) {
                    selectedFlows.add(flow);
                });
            }
        };

        //#endregion
        //#region Client-side navigation
        MatchSimpleViewModel.prototype.navigate = function (queryKey, accountKey, autorunEnabled) {
            if (typeof queryKey === "undefined") { queryKey = null; }
            if (typeof accountKey === "undefined") { accountKey = null; }
            if (typeof autorunEnabled === "undefined") { autorunEnabled = null; }
            var params = $.extend({}, this.navigationParameters);
            params.query = queryKey;
            params.account = accountKey;
            params.autorun = autorunEnabled;

            this.nav.navigate(params);
        };

        MatchSimpleViewModel.prototype.resetNavigation = function () {
            this.navigate();
        };

        MatchSimpleViewModel.prototype.initNav = function () {
            var _this = this;
            this.nav = new NavHistory({
                params: this.navigationParameters,
                onNavigate: function (navEntry, navInfo) {
                    var queryKey = navEntry.params.query, accountKey = navEntry.params.account, autorun = navEntry.params.autorun && navInfo.isFirst;

                    // Query route - if not already loaded, load the query,
                    // then if autorun run the query too
                    if (!ag.isNullUndefinedOrEmpty(queryKey)) {
                        if (queryKey === "new") {
                            _this.createQueryRequest();
                        } else if (!_this.isSelectedQuery(queryKey)) {
                            _this.retrieveQueryRequest(queryKey).then(function () {
                                if (autorun)
                                    _this.runQuery();
                            });
                        } else if (autorun) {
                            _this.runQuery();
                        }
                    }

                    // Account Route - if not already loaded, load the account
                    if (!ag.isNullUndefinedOrEmpty(accountKey) && !_this.isSelectedAccount(accountKey)) {
                        _this.retrieveAccountRequest(accountKey);
                    }

                    // Auto run the query - default query only
                    if (!queryKey && autorun) {
                        _this.runQuery();
                    }
                }
            }).initialize({ linkToUrl: true });
        };
        return MatchSimpleViewModel;
    })(ag.SimpleViewModel);
    ag.MatchSimpleViewModel = MatchSimpleViewModel;
})(ag || (ag = {}));
