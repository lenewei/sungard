/// <reference path="dealingViewModel.ts" />
/// <reference path="pivot/CashExplorerPivotViewModel.ts" />
/// <reference path="reportingViewModel.ts" />
/// <reference path="../viewModels/FiltersViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var CashConcentrationToken = (function () {
    function CashConcentrationToken(id, action, transactionType, sequence, isSource) {
        this.id = id;
        this.action = action;
        this.transactionType = transactionType;
        this.sequence = sequence;
        this.isSource = isSource;
        this.id = id;
        this.action = action;
        this.transactionType = transactionType;
        this.sequence = sequence;
        this.isSource = isSource;
    }
    return CashConcentrationToken;
})();

var ag;
(function (ag) {
    // Cash Explorer definintion and relsted functionality
    var CashExplorerViewModel = (function (_super) {
        __extends(CashExplorerViewModel, _super);
        function CashExplorerViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            this.showRunReportDialog = ko.observable(false);
            this.gridRefresh = [];
            this.remoteJobs = [];
            this.worksheetViews = [];
            this.gridSubscriptions = [];
            this.showDialog = ko.observable(false);
            this.updateViewFilters = function (items, filter) {
                // The passed items array is a list of new filters to add to the existing collection
                filter.push.apply(filter, $.map(items, function (item) {
                    var filter = ag.filters.buildFilter(item, true);
                    filter.value1(["ALL"]);
                    return filter;
                }));
            };
            this.showReportPayload = function () {
                !_this.applicationOptions.pivotView.key() ? {} : ko.mapping.toJS(_this.applicationOptions.pivotView);
            };
            this.reportLoaded = function () {
                return _this.activeReport() && _this.activeReport().key();
            };
            this.additionalFields = function () {
                return ko.mapping.toJS(_this.applicationOptions);
            };
            this.runViewAction = "refreshView";

            this.menuCommands = {};

            this.isQueryNew = ko.computed(function () {
                return _this.editingQuery.key() === ag.ReportingViewModel.newQueryKey;
            }, this);

            this.canMaintainWorksheet = ko.computed(function () {
                return _this.applicationOptions.worksheet.canMaintainWorksheet();
            }, this, { deferEvaluation: true });

            this.canMaintainVersions = ko.computed(function () {
                return _this.applicationOptions.worksheet.canMaintainVersions();
            }, this, { deferEvaluation: true });

            this.canExport = ko.computed(function () {
                return _this.applicationOptions.worksheet.canExport();
            }, this, { deferEvaluation: true });

            this.canMaintainAnything = ko.computed(function () {
                return _this.canMaintainWorksheet() || _this.canMaintainVersions() || _this.canExport();
            }, this, { deferEvaluation: true });

            this.canMaintainViews = ko.computed(function () {
                return _this.applicationOptions.worksheet.canMaintainViews();
            }, this, { deferEvaluation: true });

            this.viewNameChanged = ko.computed(function () {
                if (!_this.applicationOptions)
                    return;
                _this.views.selected().name = _this.applicationOptions.pivotView.name();
            }, this);

            this.grid.isViewSelected = function () {
                var views = _this.grid.views;
                return views.all().length > 0 && views.selected() && views.selected().clientKey();
            };

            this.grid.canMaintainViews = function () {
                return _this.canMaintainViews;
            };

            this.grid.views.canSave = ko.computed(function () {
                return _this.canMaintainViews();
            }, this, { deferEvaluation: true });

            this.usedViewAttributeFilters = ko.computed(function () {
                return _this.applicationOptions.pivotView.attributeFilters;
            }, this, { deferEvaluation: true });

            this.usedViewPoolFilters = ko.computed(function () {
                return _this.applicationOptions.pivotView.poolFilters;
            }, this, { deferEvaluation: true });

            this.usedDataVersionViewFilters = ko.computed(function () {
                return _this.applicationOptions.pivotView.attributeFilters;
            }, this, { deferEvaluation: true });

            if (this.editingQuery) {
                this.selectedQuery(this.editingQuery);
            }

            if (!this.selectedQuery() && this.queries().length > 0) {
                this.selectedQuery(this.queries()[0]);
            }

            this.getViewAttributeFilters = function () {
                return _this.applicationOptions.pivotView.attributeFilters();
            };

            this.updateViewAttributeFilters = function (items) {
                _this.updateViewFilters(items, _this.applicationOptions.pivotView.attributeFilters);
            };

            this.getViewPoolFilters = function () {
                return _this.applicationOptions.pivotView.poolFilters();
            };

            this.updateViewPoolFilters = function (items) {
                _this.updateViewFilters(items, _this.applicationOptions.pivotView.poolFilters);
            };

            this.views.selected.subscribeChanged(function (newValue, oldValue) {
                _this.worksheetViews[oldValue.clientKey()] = ko.mapping.toJS(_this.applicationOptions.pivotView);
                var key = newValue.clientKey();
                if (key in _this.worksheetViews && key != _this.applicationOptions.pivotView.key)
                    ko.mapping.fromJS(_this.worksheetViews[key], _this.applicationOptions.pivotView);
            });

            // override exting inherited properties
            this.deleteDataVersionAction = 'deleteDataVersion';
            this.showParameters = this.showConfiguration;

            this.pivot.reportProxy = new ag.ReportProxy({ runViewAction: 'refreshView' });

            this.viewAttributeFilters = new ag.FiltersViewModel(this.filterOptions);

            // method to call on controller
            this.runViewAction = "refreshView";

            // delete data version action
            this.actions = {};
            this.actions.deleteDataVersion = {
                showDialog: ko.observable(false),
                invokeCommand: ko.asyncCommand({
                    execute: function (parentViewModel, complete) {
                        _this.deleteActiveDataVersion(_this.actions.deleteDataVerison, _this.payload); //.always(complete);
                    }
                })
            };

            // action to perform when user clsoses related window
            ag.childWindowClosing = function (viewModel, result, saved, windowHandle) {
                if (saved && result) {
                    ag.messages.show(result.message + " " + ag.strings.updatingWorksheet, result.messageType);

                    var dealNumber = result.data.dealNumber;

                    _this.runReportRequest(false, 1, _this.grid.getGridViewOptionsQueryString(), "refreshWithDeals", {
                        deals: [
                            {
                                dealNumber: result.data.dealNumber,
                                instrument: result.data.instrument,
                                transactionType: result.data.transactionType,
                                security: result.data.security
                            }
                        ]
                    }).done(function () {
                        return ag.messages.success(ag.strings.dataVersionUpd + " " + dealNumber);
                    });
                } else {
                    var tokenId = (ag.utils.getQueryStringParameterByName("token", windowHandle.location.search));

                    if (tokenId) {
                        var token = _this.remoteJobs[tokenId];
                        if (token) {
                            _this.updateConcentrationTransfer(windowHandle.ko.mapping.toJSON(viewModel.editingItem), token);
                        }
                    }
                }
            };
        }
        // update existing concentration entry
        CashExplorerViewModel.prototype.updateConcentrationTransfer = function (transferData, token) {
            var grid = this.actions.concentrationCash.grids.cashConcentrations;

            // Find the concentrationFlow
            var item = _.find(grid.items(), function (item) {
                return item.sequenceNumber == token.sequence;
            });
            if (!item) {
                ag.messages.error(ag.strings.noConcentration);
            }

            // Post the updated bid (and model)
            var payload = {
                data: ko.mapping.toJS(ag.utils.getAdditionalFieldsFromModel("worksheet.key, pivotView.key, pivotView.viewType", this.applicationOptions)),
                concentrationItem: item
            };

            $.extend(payload, { transferData: $.parseJSON(transferData) });

            this.net.postJson(token.action, payload).then(function (response) {
                grid.refresh(false);
                if (response && response.message)
                    ag.messages.show(response.message, response.messageType);
            });
            return true;
        };

        CashExplorerViewModel.prototype.init = function (model) {
            var _this = this;
            _super.prototype.init.call(this, model);

            // update report
            this.refreshReportCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.processReport(false, ag.constants.ReportMode.Continue).always(complete);
                },
                canExecute: function (isExecuting) {
                    return (!isExecuting && !_this.isQueryNew());
                }
            });

            // create report
            this.runReportCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.menuCommands.createNewDataVersionCommand;
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && (!_this.refreshReportCommand || !_this.refreshReportCommand.isExecuting()) && !_this.isQueryNew();
                }
            });

            this.saveConfigurationCommand.canExecute = this.canMaintainWorksheet;
        };

        CashExplorerViewModel.prototype.beforeApplyBindings = function () {
            var _this = this;
            // direct trading actions
            var directTradingAction = this.actions.directTrading;
            directTradingAction.popDeal = ko.asyncCommand({
                execute: function (data, event, complete) {
                    var $element = $(event.target), dealType = $element.data('deal-type');

                    directTradingAction.showDialog(false);
                    _this.popWindow(dealType, ko.mapping.toJS(data.model)).always(complete);
                }
            });

            directTradingAction.accountTransfer = ko.asyncCommand({
                execute: function (data, event, complete) {
                    var dealType = "at";

                    var model = ko.mapping.toJS(directTradingAction.model);
                    model.transferTo = data;
                    directTradingAction.showDialog(false);
                    _this.popWindow(dealType, model).always(complete);
                }
            });

            directTradingAction.recentDeal = ko.asyncCommand({
                execute: function (data, event, complete) {
                    var newData = ko.mapping.toJS(data);
                    var dealType = newData.transactionType.toLowerCase();
                    var model = ko.mapping.toJS(directTradingAction.model);
                    model.instrument = newData.instrument;
                    model.transactionType = newData.transactionType;
                    model.security = newData.security;
                    directTradingAction.showDialog(false);
                    _this.popWindow(dealType, model).always(complete);
                }
            });

            var directTradingGrid = directTradingAction.grids.transferToAccounts;
            directTradingGrid.getCellLinks = function () {
                return [
                    '<a href="#" data-bind="command: $parents[3].accountTransfer"></a>'
                ];
            };

            var directTradingRecentDealGrid = directTradingAction.grids.recentDeals;
            directTradingRecentDealGrid.getCellLinks = function () {
                return [
                    '<a href="#" data-bind="command: $parents[3].recentDeal"></a>'
                ];
            };

            // concentration actions
            var cashConcentrationsGrid = this.actions.concentrationCash.grids.cashConcentrations;
            cashConcentrationsGrid.getCellLinks = function (context) {
                var row = context.$parent;

                if (row.transferType === 'AT')
                    return [
                        '<a href="#" data-bind="command: $parents[2].menuCommands.editConcentrationTransferCommand">' + ag.strings.editConcentration + '...</a>',
                        '<a href="#" data-bind="command: $parents[2].menuCommands.changeTransferTypeCommand">' + ag.strings.changeTransferType + '...</a>'
                    ];

                if (row.transferType === 'AC')
                    return [
                        '<a href="#" data-bind="command: $parents[2].menuCommands.editSourceTransferCommand">' + ag.strings.editTransferSrc + '...</a>',
                        '<a href="#" data-bind="command: $parents[2].menuCommands.editDestinationTransferCommand">' + ag.strings.editTransferDest + '...</a>',
                        '<a href="#" data-bind="command: $parents[2].menuCommands.changeTransferTypeCommand">' + ag.strings.changeTransferType + '...</a>'
                    ];

                return ['<a href="#" data-bind="command: $parents[2].menuCommands.changeTransferTypeCommand">' + ag.strings.changeTransferType + '...</a>'];
            };

            var concentrationMenuCommands = this.actions.concentrationCash.grids.cashConcentrations.menuCommands;

            // Open appropriate dealing application (with defaults set)
            // if successfully saved refresh the grid
            concentrationMenuCommands.editConcentrationTransferCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.editConcentrationTransfer(data).always(complete);
                }
            });

            // Open appropriate dealing application (with defaults set)
            // if successfully saved refresh the grid
            concentrationMenuCommands.editSourceTransferCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.editConcentrationSource(data).always(complete);
                }
            });

            // Open appropriate dealing application (with defaults set)
            // if successfully saved refresh the grid
            concentrationMenuCommands.editDestinationTransferCommand = ko.asyncCommand({
                execute: function (data, event, complete) {
                    _this.editConcentrationDestination(data).always(complete);
                }
            });
        };

        CashExplorerViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            // required for change concentration transfer type
            var grid = this.actions.concentrationCash.grids.cashConcentrations;
            grid.actions.editConcentrationTransferType.createCustomPayload = function () {
                var key = grid.selected.keys()[0];
                var item = _.find(grid.items(), function (i) {
                    return i[grid.itemKey] === key;
                });

                if (item) {
                    var additionalFields = ag.utils.getAdditionalFieldsFromModel(grid.options.additionalFields, _this.applicationOptions);
                    return {
                        data: additionalFields,
                        concentrationItem: item
                    };
                }
            };

            this.grid.postCreateView = function (model, action) {
                var viewKey = action.data.view;

                var _views = _this.grid.views;

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
                ko.mapping.fromJS(action.data.view, _this.applicationOptions.pivotView);

                // Show the Configuration area for the new View
                _views.showConfigure(true);
            };

            this.grid.postDeleteView = function (model, action) {
                var _views = _this.grid.views;
                var view = _views.selected();
                view.isSystem(false);
                view.key(null);

                if (view.clientKey in _this.worksheetViews) {
                    delete _this.worksheetViews[view.clientKey];
                }
                _views.deleteSelected();
            };
        };

        // cash concentration entry functions
        CashExplorerViewModel.prototype.editConcentrationTransfer = function (item) {
            var token = new CashConcentrationToken(item.id, "UpdateConcentrationTransfer", "at", item.sequenceNumber, false);
            return this.getConcentrationTransfer('editConcentrationTransfer', token.transactionType, 'banking/cash-transfer', item, token);
        };

        CashExplorerViewModel.prototype.editConcentrationSource = function (item) {
            return this.editConcentrationActualCashFlow("editConcentrationTransferSource", "UpdateConcentrationSource", true, item);
        };

        CashExplorerViewModel.prototype.editConcentrationDestination = function (item) {
            return this.editConcentrationActualCashFlow("editConcentrationTransferDestination", "UpdateConcentrationDestination", false, item);
        };

        CashExplorerViewModel.prototype.editConcentrationActualCashFlow = function (action, updateAction, isSource, concentrationItem) {
            var token = new CashConcentrationToken(concentrationItem.id, updateAction, "ac", concentrationItem.sequenceNumber, isSource);
            return this.getConcentrationTransfer(action, token.transactionType, 'dealing/actual-cashflow', concentrationItem, token);
        };

        CashExplorerViewModel.prototype.getConcentrationTransfer = function (action, transType, path, item, token) {
            var _this = this;
            var parameters = {
                data: ko.mapping.toJS(this.applicationOptions),
                concentrationItem: ko.mapping.toJS(item)
            };

            return this.net.postJson(action, function () {
                return parameters;
            }).then(function (result) {
                var payload = result.data;
                payload.dialog = 1;
                payload.dealNumber = null;
                _this.remoteJobs[token.id] = token;
                payload.token = token.id;
                _this.openDeal(transType, [path, payload]);
            });
        };

        // secondary window operations, e.g. deal editing
        CashExplorerViewModel.prototype.popWindow = function (dealType, model) {
            var pathAndData = this.getPathAndDataForDealType(dealType, model);

            return this.openDeal(dealType, pathAndData);
        };

        CashExplorerViewModel.prototype.openDeal = function (dealType, pathAndData) {
            return ag.utils.openApplicationWindowPromise(ag.siteRoot + pathAndData[0], pathAndData[1]);
        };

        CashExplorerViewModel.prototype.getPathAndDataForDealType = function (dealType, model) {
            var payload = {
                dialog: 2
            };

            switch (dealType) {
                case 'fx':
                    if (model.transactionType == 'FX')
                        this.setDealProperty(payload, "instrument", model.instrument);
                    if (model.amount > 0) {
                        this.setDealProperty(payload, "otherCurrency", model.currency);
                        this.setDealProperty(payload, "otherFacevalue", model.absoluteAmount);
                    } else {
                        this.setDealProperty(payload, "currency", model.currency);
                        this.setDealProperty(payload, "faceValue", model.absoluteAmount);
                    }

                    return ['dealing/fx', payload];
                case 'ac':
                    this.setCashFlowProperties(payload, model);
                    if (model.transactionType == 'AC')
                        this.setDealProperty(payload, "instrument", model.instrument);
                    return ['dealing/actual-cashflow', payload];
                case 'pc':
                    this.setCashFlowProperties(payload, model);
                    if (model.transactionType == 'PC')
                        this.setDealProperty(payload, "instrument", model.instrument);
                    return ['dealing/projected-cashflow', payload];
                case 'sec':
                case 'se':
                    if (model.transactionType == 'SE')
                        this.setDealProperty(payload, "instrument", model.instrument);
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
        };

        // actual cashflow
        CashExplorerViewModel.prototype.setCashFlowProperties = function (payload, model) {
            this.setDealProperty(payload, "dealDate", model.dealDate);
            this.setDealProperty(payload, "valueDate", model.settleDate);
            this.setDealProperty(payload, "settlementDate", model.settleDate);
            this.setDealProperty(payload, "amount", model.absoluteAmount);
            this.setDealProperty(payload, "currency", model.currency);
            this.setDealProperty(payload, "accountNumber", model.account);
            this.setDealProperty(payload, "paymentReceive", model.amount <= 0 ? "Pay" : "Receive");

            return payload;
        };

        // cash transfer - editing transfer
        CashExplorerViewModel.prototype.setCashTransferPropertiesForEdit = function (transfer, model) {
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
        };

        // cash transfer - deal save
        CashExplorerViewModel.prototype.setCashTransferProperties = function (payload, model) {
            this.setDealProperty(payload, "settlementDate", model.settleDate);
            this.setDealProperty(payload, "dealDate", model.dealDate);
            if (model.transactionType == 6)
                this.setDealProperty(payload, "instrument", model.instrument);
            this.setDealProperty(payload, "currency", model.currency);
            this.setDealProperty(payload, "faceValue", model.absoluteAmount);
            if (model.amount > 0) {
                this.setDealProperty(payload, "sourceAccountNumber", model.account);
                if (model.transferTo) {
                    this.setDealProperty(payload, "destinationAccountNumber", model.transferTo.number);
                }
            } else {
                this.setDealProperty(payload, "destinationAccountNumber", model.account);
                if (model.transferTo) {
                    this.setDealProperty(payload, "sourceAccountNumber", model.transferTo.number);
                }
            }
            return payload;
        };

        CashExplorerViewModel.prototype.setDealProperty = function (payload, destination, modelProp) {
            if (modelProp) {
                payload[destination] = modelProp;
            }
        };

        // various methods for supporting cash explorer
        CashExplorerViewModel.prototype.removeViewAttributeFilter = function (item) {
            this.applicationOptions.pivotView.attributeFilters.remove(item);
        };

        CashExplorerViewModel.prototype.removeViewPoolFilter = function (item) {
            this.applicationOptions.pivotView.poolFilters.remove(item);
        };

        CashExplorerViewModel.prototype.getViewAttributeFieldLookupSource = function () {
            return "/{0}/{1}".format(this.options.serviceUrl, "GetAttributeFilterFields");
        };

        CashExplorerViewModel.prototype.applyViewRequest = function () {
            this.showConfiguration(false);
            this.views.showConfigure(false);
            this.pivot.refreshPivot(this.applicationOptions.pivotView, false);
        };

        CashExplorerViewModel.prototype.saveReportView = function () {
            var _this = this;
            var action = this.applicationOptions.pivotView.key() ? "editQueryView" : "createQueryView", isNewDefault = action === "createQueryView", viewData = ko.mapping.toJS(this.views.selected), payload = { view: ko.mapping.toJS(this.applicationOptions.pivotView), queryKey: ko.unwrap(this.editingQuery.key) }, deferred = $.Deferred();

            var isValid = this.net.postJson(action, payload).then(function (result) {
                _this.grid.views.showConfigure(false);
                ag.messages.show(result.message, result.messageType);

                // ko.mapping.fromJS(result.data, this.applicationOptions.pivotView);
                var forceRefresh = _this.grid.views.selected().key() != result.data.key;

                if (forceRefresh) {
                    var view = _this.grid.views.selected();
                    if (view) {
                        view.clientKey(result.data.key);
                        view.key(result.data.key);
                        view.name(result.data.name);
                    }
                } else {
                    _this.grid.refreshData();
                }

                // Success
                deferred.resolve();
            }, function () {
                // Error
                deferred.fail();
            });

            // If the view failed client-side validation resolve the promise immediately
            if (!$.isEmptyObject(isValid) && !isValid)
                deferred.resolve();

            // Return deferred object to allow chaining for those that are interested.
            // Save new View before running a report is an example usage.
            return deferred.promise();
        };

        CashExplorerViewModel.prototype.getViewPoolFieldLookupSource = function () {
            return "/{0}/{1}".format(this.options.serviceUrl, "GetPoolFilterFields");
        };

        CashExplorerViewModel.prototype.showRunReportDialogCommand = function () {
            this.showRunReportDialog(true);
        };

        CashExplorerViewModel.prototype.selectPool = function (poolName) {
            this.applicationOptions.poolAssignment.selectedPool(poolName);
            this.grids.poolAssignment.assignments.refresh();
        };

        //dataVersionSelectPool(poolName: String)
        //{
        //    this.applicationOptions.dataVersion.poolAssignment.selectedPool(poolName);
        //    this.grids.dataVersion.poolAssignment.assignments.refresh();
        //}
        CashExplorerViewModel.prototype.deleteActiveDataVersion = function (action, data) {
            this.nav.navigate({ query: ko.unwrap(action.data.worksheet.key), report: null }, { force: true });
        };

        CashExplorerViewModel.prototype.refreshWorksheetDataVersion = function () {
            return this.processReport(false, ag.constants.ReportMode.Continue);
        };

        CashExplorerViewModel.prototype.createPivot = function (options) {
            return new ag.CashExplorerPivotViewModel(this.selectedQuery, this.views.selected, this.activeReport, this.grid, options);
        };

        //#region Overidden methods
        CashExplorerViewModel.prototype.processQueryResponse = function (data) {
            try  {
                this.updatingModel(true);
                this.showConfiguration(false);
                this.views.showConfigure(false);

                this.resetTabs(this.isQueryNew() ? '#reportingDefaultsTab a[href="#propertiesTab"]' : '#reportingDefaultsTab a:first', '#pivotViewTab a:first', '#viewTabs a:first');

                this.worksheetViews = [];
                ko.mapping.fromJS(data.query, this.editingQuery);
                ko.mapping.fromJS(data.applicationOptions.worksheet, this.applicationOptions.worksheet);
                ko.mapping.fromJS(data.applicationOptions.poolDefinition, this.applicationOptions.poolDefinition);

                var listMetaData = data.listMetaData;
                if (listMetaData) {
                    _.forEach(this.views.all(), function (view) {
                        view.isDefault(false);
                    });
                    var forceUpdate = listMetaData.views.length > 0;
                    this.views.update(listMetaData.views || [], listMetaData.viewTables || [], forceUpdate);
                }

                this.nav.navigate({ report: data.applicationOptions.dataVersionName, query: data.applicationOptions.worksheet.key });
            } finally {
                this.updatingModel(false);
            }
        };

        //todo: need an alternative
        CashExplorerViewModel.prototype.resetTabs = function () {
            var selectquery = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                selectquery[_i] = arguments[_i + 0];
            }
            _.forEach(selectquery, function (query) {
                $(query).trigger("click");
            });
        };

        CashExplorerViewModel.prototype.updateGridModelAfterSave = function (data) {
            this.processQueryResponse(data);
        };

        CashExplorerViewModel.prototype.updateReportSummary = function (report) {
            //this.views.showConfigure(false);
            var _this = this;
            this.resetTabs('#pivotViewTab a:first');

            if (!report || !report.key) {
                this.clearGridResults(true);
            }
            this.reportParameterSummary.removeAll();

            var result = _.map(ko.unwrap(this.applicationOptions.dataVersion.summary), function (item) {
                return { key: { displayName: ko.unwrap(item.displayName) }, value: ko.unwrap(item.value) };
            });

            _.each(result, function (y) {
                _this.reportParameterSummary.push(y);
            });
        };

        CashExplorerViewModel.prototype.updateDisplayOptions = function (data) {
            try  {
                this.updatingModel(true);
                if (!data.applicationOptions || !data.applicationOptions.pivotView)
                    return;

                var key = data.applicationOptions.pivotView.key;

                if (!(key in this.worksheetViews) && key != this.applicationOptions.pivotView.key()) {
                    ko.mapping.fromJS(data.applicationOptions.pivotView, this.applicationOptions.pivotView);
                }
                ko.mapping.fromJS(data.applicationOptions.dataVersion, this.applicationOptions.dataVersion);
                this.applicationOptions.pivotView.horizon(this.applicationOptions.dataVersion.horizon());
                this.applicationOptions.pivotView.stamp(data.applicationOptions.pivotView.stamp);
                this.setLookups(data.lookups);
            } finally {
                this.updatingModel(false);
            }
            ;
        };

        /// setLookups
        /// Update any lookup datasets on the model
        CashExplorerViewModel.prototype.setLookups = function (lookups) {
            if (!lookups)
                return;

            ag.utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups);
        };

        CashExplorerViewModel.prototype.loadGridViewData = function (gridViewModel, refresh, revert) {
            if (typeof revert === "undefined") { revert = false; }
            if (!gridViewModel)
                return false;

            if (refresh && !this.isQueryNew()) {
                gridViewModel.refresh({ revert: revert });
            } else {
                gridViewModel.clearData();
            }
            return refresh;
        };

        CashExplorerViewModel.prototype.getQueryFromResult = function (result) {
            return result.data.query;
        };

        CashExplorerViewModel.prototype.showActualTransferDetails = function () {
            new ag.WindowManager({ url: "cash-explorer" + "?dialog=1" });
        };

        CashExplorerViewModel.prototype.deleteActiveQuery = function () {
            if (this.queries().length <= 1) {
                this.addQuery();
                return;
            } else {
                // Remove the query from the list of queries, and switch the current query to the default query
                this.queries.mappedRemove({ key: this.selectedQuery().key() });
                this.selectQuery(_.first(this.queries()));
                return;
            }
        };

        CashExplorerViewModel.prototype.isQueryLoaded = function () {
            return false;
        };

        CashExplorerViewModel.prototype.updateWorksheetQuery = function (parentViewModel, result) {
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
        };

        //this is needed when you click on cross behind the worksheet name it call deleteQuery which is doing different for delete from menu item
        CashExplorerViewModel.prototype.deleteQuery = function (query) {
            var _this = this;
            var removeQuery = function (message) {
                // Remove the query from the list of queries, and switch the current query to the default query
                // if we've just removed the editing query.
                if (_this.queries().length <= 1) {
                    _this.addQuery();
                } else {
                    _this.selectQuery(_.first(_this.queries()));
                }
                _this.queries.mappedRemove({ key: query.key() });
                ag.messages.success(message);
            };

            // Delete an unsaved query
            if (query.key() == null) {
                removeQuery(ag.strings.queryDeleted);
                return $.Deferred().resolve().promise();
            }

            // Delete an existing query
            return this.net.postJson("deleteWorksheetQuery", { queryKey: query.key(), options: this.applicationOptions }).then(function (result) {
                removeQuery(result.message);
            });
        };

        CashExplorerViewModel.prototype.afterRunQuery = function (action, data) {
            this.nav.navigate({ report: data.actionData.dataVersionName, query: data.data.worksheet.key });
        };

        CashExplorerViewModel.prototype.handleQueryNotFound = function (currentQueryIndex, previousQuery, data, query, isNew) {
            if (currentQueryIndex == -1) {
                data.key = query.key;
                isNew = true;
                return this.queries.mappedIndexOf(previousQuery);
            }
            return currentQueryIndex;
        };

        CashExplorerViewModel.prototype.initNav = function () {
            var _this = this;
            this.nav = new NavHistory({
                params: { query: null, preview: false, report: null },
                onNavigate: function (navEntry, navInfo) {
                    // Query AND Report - route
                    if (_this.routeToQuery(navEntry.params))
                        return;

                    // Back history navigation - no query or report
                    if (navInfo.isBack)
                        _this.routeBack();
                }
            }).initialize({ linkToUrl: true });
        };

        CashExplorerViewModel.prototype.routeToQuery = function (params) {
            var _this = this;
            if (!params.query) {
                params.query = ko.unwrap(this.applicationOptions.worksheet.key);
                params.report = ko.unwrap(this.applicationOptions.dataVersion.name);
            }

            if (params.query) {
                var queryKey = params.query, reportId = params.report;

                this.updateQueryBeforeNavigate(queryKey);

                // Request Query
                $.when(this.getQueryRequest(queryKey)).then(function () {
                    return _this.showReport({ key: reportId });
                });
                return true;
            }

            return false;
        };
        return CashExplorerViewModel;
    })(ag.ReportingViewModel);
    ag.CashExplorerViewModel = CashExplorerViewModel;
})(ag || (ag = {}));
