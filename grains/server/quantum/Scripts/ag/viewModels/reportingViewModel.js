var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var ReportingViewModel = (function (_super) {
        __extends(ReportingViewModel, _super);
        function ReportingViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            // For tracking views with stale results, e.g., the view has changed and cached results for
            // that view need to be invalidated.
            this.viewsWithStaleResults = {};
            // For tracking properties of query option that should be re-validated when the view is re-selected
            // Key is the query key, Value is the properties that should be re-revalidated
            this.queryOptionsToRevalidate = {};
            this.grids = {};
            this.reportFilters = [];
            this.lookupEditors = {};
            this.browseEditors = {};
            this.runViewAction = "runView";
            this.currentGridViewOptions = null;
            this.reportParameterSummary = ko.observableArray();
            this.filterOrder = ko.observableArray();
            this.folder = ko.observable();
            this.queryName = ko.observable();
            this.crystalViewUrl = ko.observable();
            this.activeReport = ko.observable();
            this.accessPermissions = ko.observable();
            this.exportFileType = ko.observable("csv");
            this.showAdvanced = ko.observable(false);
            this.showParameters = ko.observable(true);
            this.reportRunning = ko.observable(false);
            this.crystalViewerLoading = ko.observable(true);
            this.showResultImmediately = ko.observable(true);
            this.scrollCrystalViewerIntoView = ko.observable(false);
            this.showConfirmProcessingDialog = ko.observable(false);
            this.showConfiguration = ko.observable(false).extend({ notify: "always" });
            this.isConfigurationLoaded = ko.observable(false);
            this.expiryCountDefaults = [1, 3, 0];
            // An alert message will be displayed & save Query/View will be disabled if Security By User Writable is false
            this.hasWritePermission = ko.observable(true);
            this.toggleConfiguration = function () {
                // toggle the configuration mode
                _this.showConfiguration(!_this.showConfiguration());
                _this.showParameters(true);
            };
            this.showReportPayload = function (addtionalFields) {
                return addtionalFields ? ko.unwrap(addtionalFields) : {};
            };
            this.isNewItem = function () {
                return (_this.editingQuery.key() == null || _this.editingQuery.key() === ReportingViewModel.newQueryKey);
            };

            this.supportPreviousRun = options.supportPreviousRun;

            // Subscribe to notifications that indicate
            // when long-running reports have completed.
            this.subscribeToNotifications();

            this.queries = ko.mapping.fromJS(options.queries || [], {
                key: function (item) {
                    return ko.unwrap(item.key);
                }
            });

            this.sortedQueries = ko.computed(function () {
                return _this.queries.slice().sort(_this.sortQueries);
            });

            this.editingQuery = ko.mapping.fromJS(options.editingQuery || null);

            this.usedQueryFilters = ko.computed(function () {
                return _this.editingQuery.filters();
            });

            this.usedQueryParameters = ko.computed(function () {
                return _this.editingQuery.filters().filter(function (filter) {
                    return filter.isParameter();
                });
            });

            this.analysisFields = new ag.AnalysisFieldViewModel(this.editingQuery, options.serviceUrl);

            // Initialise the selected query with the default query
            this.selectedQuery = ko.observable(this.getDefaultQuery());

            // Compute the page title based on the selected query
            this.pageTitle = ko.computed(function () {
                return _this.getPageTitle();
            });

            this.queryFieldLookupSource = "/{0}/{1}".format(options.serviceUrl, "getqueryfields");
            this.queriesLookupUrl = "/{0}/{1}".format(options.serviceUrl, "getqueries");

            this.previewing = ko.computed(function () {
                return _this.activeReport() && ko.isObservable(_this.activeReport().preview) && _this.activeReport().preview();
            });

            // Extend ourselves with grid view model functionality
            this.grid = this.createGridViewModel();

            // Always show the results list for inquiries
            this.grid.showList(true);

            // TODO: these eventually need to be removed
            this.views = this.grid.views;
            this.pivot = this.createPivot(options);

            // Subscribe to changes on a property defined in the GridViewModel
            this.views.selected.subscribe(function (newValue) {
                // Hide the Configuration area for Crystal Views
                // and make sure the Pivot is hidden
                if (newValue && newValue.viewType() === 1) {
                    _this.views.showConfigure(false);
                    _this.pivot.hide();
                }

                // Get the new viewKey and the current default
                var viewKey = ko.unwrap(newValue.key), defaultViewKey = _this.editingQuery.defaultView;

                // Set the viewKey onto the query if a saved
                // view and not the same as the default
                if (viewKey && viewKey !== defaultViewKey())
                    defaultViewKey(viewKey);
            });

            this.isSelectedViewDefault = ko.computed(function () {
                return _this.views.selected() && (_this.views.selected().key() === _this.editingQuery.defaultView() || _this.editingQuery.isDefault() && _this.views.selected().isDefault());
            });

            this.fieldCategories = options.fieldCategories || {};

            this.showConfiguration.subscribe(function (newValue) {
                if (newValue)
                    _this.isConfigurationLoaded(true);
            });

            this.queryAccessPermission();
        }
        ReportingViewModel.prototype.updateExpiryStrategy = function (data) {
            // Set defaults for expiry strategy based
            // on Public vs Private queries
            var expiryStrategy = 0;

            if (this.editingQuery.isPersonal())
                expiryStrategy = 1;

            this.editingQuery.expiryStrategy(expiryStrategy);
            this.editingQuery.expiryCount(this.expiryCountDefaults[expiryStrategy]);

            return true;
        };

        ReportingViewModel.prototype.resetExpiryStrategy = function (data) {
            // Reset expiry count based on strategy
            this.editingQuery.expiryCount(this.expiryCountDefaults[this.editingQuery.expiryStrategy()]);
            return true;
        };

        ReportingViewModel.prototype.getPageTitle = function () {
            var title = (this.selectedQuery() ? this.selectedQuery().name() : this.options.pageTitle);

            // Fall back to page title defined in the view when it is the default query
            if (title === ReportingViewModel.defaultQueryKey)
                title = this.options.pageTitle;

            return title;
        };

        ReportingViewModel.prototype.subscribeToNotifications = function () {
            var _this = this;
            PubSub.subscribe(ag.Notifications.notificationRecievedTopic, function (message, notification) {
                // If we have a recieved a notification intended
                // for us and it is in a completed state, action it
                if (!notification.isForCurrentPage() || notification.inProgress())
                    return;

                // Indicate a report is running (show result checkbox has visibility bound to this)
                _this.reportRunning(false);

                // Clear any success messages (such as "Report started...")
                ag.messages.clearSuccess();

                // If the user has indicated they would like to see the result immediately show it
                if (_this.showResultImmediately())
                    _this.tryOpenReportFromNotification(notification);
            });

            PubSub.subscribe(ag.Notifications.notificationActionedTopic, function (message, notification) {
                // If we are able to action the notification, mark as handled to stop further action
                if (notification.pageCanAction() && _this.tryOpenReportFromNotification(notification))
                    notification.handled = true;
            });
        };

        ReportingViewModel.prototype.tryOpenReportFromNotification = function (notification) {
            if (!notification.data)
                return false;

            var query = notification.data.query, report = notification.data.report;

            if (!ag.isNullUndefinedOrEmpty(query) && !ag.isNullUndefinedOrEmpty(report)) {
                this.navigate(query, report);
                return true;
            }
        };

        ReportingViewModel.prototype.createPivot = function (options) {
            return new ag.PivotViewModel(this.selectedQuery, this.views.selected, this.activeReport, this.grid, options);
        };

        // [BN 18/07/2012] Show default query first, followed by the rest ordered by name
        ReportingViewModel.prototype.sortQueries = function (x, y) {
            var xIsSystem = ko.unwrap(x.isSystem), yIsSystem = ko.unwrap(y.isSystem), xName = ko.unwrap(x.name).toLowerCase(), yName = ko.unwrap(y.name).toLowerCase();

            if (xIsSystem) {
                return -1;
            }
            if (yIsSystem) {
                return 1;
            }

            if (xName < yName) {
                return -1;
            }
            if (xName > yName) {
                return 1;
            }

            return 0;
        };

        ReportingViewModel.prototype.updateQueryFilters = function (items) {
            // The passed items array is a list of new filters to add to the existing collection
            ag.utils.pushApply(this.editingQuery.filters, $.map(items, function (item) {
                return ag.filters.buildFilter(item, true);
            }));
        };

        ReportingViewModel.prototype.getQueryFilters = function () {
            return this.editingQuery.filters;
        };

        ReportingViewModel.prototype.toggleBetweenFilterTypes = function (item) {
            item.isParameter(!item.isParameter());
        };

        ReportingViewModel.prototype.removeQueryFilter = function (item) {
            this.editingQuery.filters.remove(item);
        };

        ReportingViewModel.prototype.getQueryFieldLookupSource = function () {
            return this.queryFieldLookupSource;
        };

        ReportingViewModel.prototype.getViewFieldLookupSource = function () {
            return this.grid.viewFieldLookupSource();
        };

        ReportingViewModel.prototype.getGridFieldLookupRequestData = function () {
            return _.extend({
                selectedQueryFields: this.extractQueryFields(this.views.selected().fields)
            }, this.getBaseLookupRequestData());
        };

        ReportingViewModel.prototype.getGroupRowsByLookupRequestData = function () {
            return _.extend({
                selectedQueryFields: this.extractQueryFields(this.views.selected().groupRowsBy),
                excludeKeys: this.extractFieldKey(this.views.selected().groupColumnsBy, this.views.selected().aggregateOn)
            }, this.getBaseLookupRequestData());
        };

        ReportingViewModel.prototype.getGroupColumnsByLookupRequestData = function () {
            return _.extend({
                selectedQueryFields: this.extractQueryFields(this.views.selected().groupColumnsBy),
                excludeKeys: this.extractFieldKey(this.views.selected().groupRowsBy, this.views.selected().aggregateOn)
            }, this.getBaseLookupRequestData());
        };

        ReportingViewModel.prototype.getAggregateOnLookupRequestData = function () {
            return _.extend({
                selectedQueryFields: this.extractQueryFields(this.views.selected().aggregateOn),
                excludeKeys: this.extractFieldKey(this.views.selected().groupColumnsBy, this.views.selected().groupRowsBy)
            }, this.getBaseLookupRequestData());
        };

        ReportingViewModel.prototype.getChartAggregateOnLookupRequestData = function () {
            return _.extend({
                dataTypes: this.grid.chart.valueDataTypes()
            }, this.getAggregateOnLookupRequestData());
        };

        ReportingViewModel.prototype.getChartGroupRowsByLookupRequestData = function () {
            return _.extend({
                dataTypes: this.grid.chart.groupByDataTypes()
            }, this.getGroupRowsByLookupRequestData());
        };

        ReportingViewModel.prototype.getProfileByLookupRequestData = function () {
            return _.extend({
                dataTypes: ['datetime']
            }, this.getGroupRowsByLookupRequestData());
        };

        ReportingViewModel.prototype.getBaseLookupRequestData = function () {
            var view = this.views.selected();

            return {
                viewTableKey: ko.unwrap(view.viewTableKey),
                calculatedFields: ko.mapping.toJS(ag.ViewData.getCalculatedFields(view))
            };
        };

        ReportingViewModel.prototype.extractFieldKey = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            return _.union.apply(_, _.map(args, function (fieldArray) {
                return _.pluck(ko.mapping.toJS(fieldArray), 'key');
            }));
        };

        ReportingViewModel.prototype.extractQueryFields = function (fieldCollection) {
            return _.filter(ko.mapping.toJS(fieldCollection), function (field) {
                return field.calculatedField === false;
            });
        };

        ReportingViewModel.prototype.getQueryFilterFieldLookupRequestData = function () {
            // If we're in a new query, return an empty query key to the filter lookup action so it fetches filter
            // fields from the default query.
            var queryKey = this.editingQuery.key();
            queryKey = queryKey === ReportingViewModel.newQueryKey ? "" : queryKey;

            // We need to pass null values as empty strings to the request otherwise
            // it will be interpreted as "null".
            return {
                queryKey: queryKey || ""
            };
        };

        ReportingViewModel.prototype.getViewFilterFieldLookupRequestData = function () {
            return { viewTableKey: ko.unwrap(this.views.selected().viewTableKey) };
        };

        ReportingViewModel.prototype.isUnusedQueryFilter = function (item) {
            return !ag.filters.getItemByKey(item, [this.editingQuery.filters()]);
        };

        ReportingViewModel.prototype.getQueryFilterKeys = function () {
            return $.map(ko.unwrap(this.editingQuery.filters), function (filter) {
                return ko.unwrap(filter).key();
            });
        };

        ReportingViewModel.prototype.saveItem = function () {
            return false;
        };

        ReportingViewModel.prototype.init = function (model) {
            var _this = this;
            ko.utils.extend(this.applicationOptions = this.applicationOptions || {}, ag.mapFromJStoMetaObservable(model, this.isEditorReadOnly));

            if (this.options.applicationHeaders)
                this.setupApplicationHeaders(this.applicationOptions, this.options.applicationHeaders);

            this.typeMetadata = this.options.typeMetadata || {};
            if (this.typeMetadata && !$.isEmptyObject(this.typeMetadata)) {
                this.options.typeMetaDataUrl = ag.utils.normalizeUrl(this.options.typeMetaDataUrl);

                // Create GridViewModels as required
                ag.createGridViewModelsFromMetadata(this, this.typeMetadata, this.applicationOptions, this.options, this.isEditorReadOnly);

                // If results are editable, override the grid getItems method to use the showReportRequest
                // method to retrieve results.
                if (this.options.resultsAreEditable) {
                    this.grids.editableResults.getItems = function (params, queryString) {
                        // Make sure we have an active report and a
                        // saved view before requesting data
                        if (_this.activeReport())
                            return _this.showReportRequest(_this.activeReport(), queryString, _this.previewing());

                        return $.Deferred().resolve();
                    };
                }
            }

            if (this.options.editableLookups) {
                _.each(this.options.editableLookups, function (lookup, key) {
                    if (ag.getProperty(_this, key.toString())) {
                        var lookupOptions = $.extend(_this.options, {
                            name: lookup.name,
                            itemKey: lookup.itemKey,
                            value: ag.getProperty(_this, key.toString()),
                            editTitle: lookup.editTitle,
                            editItem: lookup.editItem
                        });
                    }

                    _this.lookupEditors[key] = new ag.LookupEditorViewModel(lookupOptions);
                });
            }

            ag.createBrowseEditors(this, this.options.browseEditors, this.applicationOptions);

            // Dependencies needs to come last - after the model has completed initialising
            if (!$.isEmptyObject(this.options.dependencies))
                ag.dependencies.init(this.applicationOptions, this.options.dependencies, this.options, this);

            this.profile = new ag.ProfileViewModel(this.views.selected, this.activeReport, this.applicationOptions);

            this.initNav();
            this.initialiseMenuCommands();
        };

        ReportingViewModel.prototype.getModel = function () {
            return this.applicationOptions;
        };

        ReportingViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            var messageLogAction = this["actions"].messageLog;

            if (messageLogAction) {
                messageLogAction.createCustomPayload = function () {
                    return { activityId: _this.activityId };
                };
            }
        };

        ReportingViewModel.prototype.customizeActionPayload = function (payload) {
            this.grid.customizeActionPayload(payload);
        };

        ReportingViewModel.prototype.previewReport = function () {
            this.processReport(true, ag.constants.ReportMode.Continue);
        };

        ReportingViewModel.prototype.runReport = function () {
            this.processReport(false, ag.constants.ReportMode.Continue);
        };

        ReportingViewModel.prototype.processReport = function (previewing, reportMode, action) {
            var _this = this;
            if (typeof reportMode === "undefined") { reportMode = ag.constants.ReportMode.Continue; }
            // Re-set the "Message Log" button value (hide) before a new process
            this.hasErrors(false);

            this.showConfirmProcessingDialog(false);

            // Ensure both the Query and View are saved if they are new
            // and have not yet been saved then run the Report
            // Set the UserDefaultView
            return $.when(this.saveQueryIfNew(), this.setUserDefaultView()).pipe(function () {
                return _this.runReportRequest(previewing, reportMode, _this.grid.getGridViewOptionsQueryString(), action);
            });
        };

        ReportingViewModel.prototype.selectReport = function (report) {
            this.navigate(ko.unwrap(report.query) || ReportingViewModel.defaultQueryKey, ko.unwrap(report.key));
        };

        ReportingViewModel.prototype.selectReportFromLookup = function (items) {
            var item = items[0];

            // If the item is actually a query that has no children, then
            // just select the query otherwise it's a report.
            if (ko.unwrap(item.query) === undefined && !ko.unwrap(item.hasChildren)) {
                this.selectQuery(item);
            } else {
                this.selectReport(items[0]);
            }
        };

        ReportingViewModel.prototype.showReport = function (report) {
            //return $.when(this.saveViewIfNew()).then(() =>
            //{
            this.showReportRequest(report, this.grid.getGridViewOptionsQueryString());
            this.showConfiguration(false);
            this.showParameters(false);
            //}).fail();
        };

        ReportingViewModel.prototype.crystalLoaded = function () {
            this.crystalViewerLoading(false);
        };

        ReportingViewModel.prototype.printView = function () {
            if (this.activeReport() && this.activeReport().key() && this.editingQuery)
                this.printViewRequest(this.activeReport().key(), this.editingQuery.key(), this.views.selected().key(), "pdf", this.grid.getGridViewOptions());
        };

        ReportingViewModel.prototype.exportView = function () {
            if (this.activeReport() && this.activeReport().key() && this.editingQuery)
                this.exportViewRequest(this.activeReport().key(), this.editingQuery.key(), this.views.selected().key(), this.exportFileType(), this.grid.getGridViewOptions());
        };

        ReportingViewModel.prototype.toggleShowAdvanced = function () {
            var value = this.showAdvanced();
            this.showAdvanced(!value);
        };

        ReportingViewModel.prototype.addQuery = function () {
            this.navigate(ReportingViewModel.newQueryKey, null);
        };

        ReportingViewModel.prototype.deleteActiveQuery = function () {
            return this.deleteQueryRequest(this.selectedQuery());
        };

        ReportingViewModel.prototype.deleteQuery = function (query) {
            return this.deleteQueryRequest(query);
        };

        ReportingViewModel.prototype.copyActiveQuery = function () {
            return this.saveQueryRequest(this.editingQuery, true, this.copyAction);
        };

        ReportingViewModel.prototype.selectQuery = function (query) {
            // Make sure a different query has been selected before navigating
            var queryKey = ko.unwrap(query.key);

            if (this.selectedQuery() && this.selectedQuery().key() === queryKey)
                return;

            this.hasWritePermission(true);

            // Navigate the selected query
            this.navigate(queryKey || ReportingViewModel.defaultQueryKey, null);
        };

        ReportingViewModel.prototype.selectView = function (view) {
            // Navigate the selected view, leaving the query and report intact
            // This will be done soon
            //this.nav.navigate({ view: view.key() || defaultQueryKey });
            // For now:
            this.views.selected(view);
        };

        ReportingViewModel.prototype.getQueryData = function () {
            return { queryKey: this.editingQuery.key() };
        };

        ReportingViewModel.prototype.queryAccessPermission = function () {
            // Check the Security By User Access Permission, if without writable permission then prompt message
            this.hasWritePermission(ko.unwrap(this.editingQuery.hasWritePermission));
            var viewAccessPermission = (ko.unwrap(this.views.selected().hasWritePermission));

            if (!viewAccessPermission && !this.hasWritePermission()) {
                ag.messages.show(ag.strings.accessWrite2.format("query and view", "resources", "private copy"), 2);
                return;
            } else if (!this.hasWritePermission()) {
                ag.messages.show(ag.strings.accessWrite.format("query", "resources", "private copy"), 2);
                return;
            }

            if (!viewAccessPermission)
                ag.messages.show(ag.strings.accessWrite.format("view", "resources", "private copy"), 2);
        };

        ReportingViewModel.prototype.saveReportView = function () {
            var _this = this;
            var viewData = ko.mapping.toJS(this.views.selected);

            // System views can't be saved so make a copy before saving as a non-system view
            // or Security By User applied and user don't have write access
            if (viewData.isSystem || !viewData.hasWritePermission) {
                this.views.copy();
                viewData.hasWritePermission = true;

                // Reload & update the "source view" (system/default) from server otherwise the default values of this view will be changed
                this.views.getViewRequest(viewData.key).then(function (result) {
                    _this.views.updateView(result);
                });
            }

            this.saveViewRequest();
        };

        ReportingViewModel.prototype.deleteReport = function (report) {
            var promise = undefined;
            if (this.activeReport())
                promise = this.deleteReportRequest(this.activeReport());

            return promise;
        };

        ReportingViewModel.prototype.filterLookupUrl = function (filter, gridViewModel, lookupAction, controller) {
            // If we're in a new query, pass an empty query key to the filter lookup action so it fetches filter
            // fields from the default query.
            var queryKey = this.editingQuery.key();
            queryKey = queryKey === ReportingViewModel.newQueryKey ? "" : queryKey;

            return "{0}{1}/{2}/{3}?key={4}&fieldKey={5}".format(ag.siteRoot, ag.area, controller || ag.controller, lookupAction, queryKey, filter.key());
        };

        //#endregion
        //#region Private Methods
        ReportingViewModel.prototype.startMessageTimer = function (timeout) {
            if (typeof timeout === "undefined") { timeout = 10000; }
            var i = 0, userMessages = [ag.strings.reportProc1, ag.strings.reportProc2, ag.strings.reportProc3, ag.strings.reportProc4, ag.strings.reportProc5, ag.strings.reportProc6];

            return window.setInterval(function () {
                ag.messages.success(userMessages[i]);
                i++;
            }, timeout);
        };

        ReportingViewModel.prototype.stopMessageTimer = function (timerId) {
            window.clearInterval(timerId);
            timerId = null;
        };

        // Mixin for grid functionality
        ReportingViewModel.prototype.createGridViewModel = function () {
            var _this = this;
            var gridOptions = $.extend({}, this.options, this.options.gridOptions);

            gridOptions.loadImmediately = false;
            gridOptions.noItemsMessage = ag.strings.noItems;

            var grid = new ag.GridViewModel(gridOptions);

            //grid.isActive = ko.computed(() =>
            //{
            //   return grid.views.selected().isPivot() && this.activeReport();
            //});
            // getItems override
            grid.getItems = function (params, queryString) {
                // Make sure we have an active report
                if (_this.activeReport())
                    return _this.showReportRequest(_this.activeReport(), queryString, _this.previewing());

                return $.Deferred().resolve();
            };

            return grid;
        };

        ReportingViewModel.prototype.orderReportOptions = function (options) {
            var orderedOptions = {}, filterOrder = this.filterOrder();

            for (var i = 0; i < filterOrder.length; i++) {
                for (var prop in options) {
                    if (prop.toLowerCase() === filterOrder[i].toLowerCase()) {
                        orderedOptions[prop] = options[prop];
                        break;
                    }
                }
            }

            return orderedOptions;
        };

        ReportingViewModel.prototype.updateReportSummary = function (report) {
            var _this = this;
            // Clear existing
            this.reportParameterSummary.removeAll();

            // Set order based on filterOrder
            var orderedOptions = this.orderReportOptions(report.options);

            for (var key in orderedOptions) {
                if (orderedOptions.hasOwnProperty(key) && (orderedOptions[key] || orderedOptions[key] === 0)) {
                    var parameterValue = orderedOptions[key];
                    if (parameterValue && (_.isString(parameterValue) || _.isObject(parameterValue)) && !_.isArray(parameterValue)) {
                        // Attempt to parse as date
                        var date = moment.fromISO(parameterValue);
                        if (date.isValid())
                            parameterValue = date.toDisplay();
                    } else if ((parameterValue || parameterValue === 0) && _.isNumber(parameterValue)) {
                        var lookupValues = this.lookups[key], lookupValueFound = true;

                        if (lookupValues && lookupValues.data) {
                            lookupValueFound = false;
                            $.each(lookupValues.data, function (index, lookup) {
                                if (lookup.value == parameterValue) {
                                    parameterValue = lookup.text;
                                    lookupValueFound = true;
                                    return false;
                                }
                            });
                        }

                        // has lookups, but no lookup found
                        if (!lookupValueFound)
                            parameterValue = null;
                    }

                    // Id of related label (used for looking up label) has uppercase first letter
                    this.reportParameterSummary.push({ "key": key.capitaliseFirstLetter(), "value": parameterValue });
                }
            }

            if (!report.filters)
                return;

            // Add Filters
            $.each(report.filters, function (i, filter) {
                var filterName = filter.displayName, operator = _this.filters.getOperatorLabel(filter.operator), filterDisplayValue = _this.filters.getFilterDisplayValue(filter);

                if (filterDisplayValue !== undefined && filterDisplayValue !== "") {
                    _this.reportParameterSummary.push({ key: { displayName: (filterName + " " + operator) }, value: filterDisplayValue });
                }
            });
        };

        ReportingViewModel.prototype.clearGridResults = function (clearActiveReport) {
            if (clearActiveReport) {
                this.activeReport(null);
                this.grid.selected.reset();
                if (this.pivot && this.pivot.pivotHtml) {
                    this.pivot.pivotHtml(null);
                }
            }

            this.grid.items.removeAll();
            this.grid.pager.reset();

            this.crystalViewUrl(null);
        };

        ReportingViewModel.prototype.runReportRequest = function (previewing, reportMode, gridViewOptionsQueryString, action, additionalInfo) {
            var _this = this;
            // Run the Report
            var url = "/{0}/{1}{2}".format(this.options.serviceUrl, action ? action : (previewing ? "preview" : "run"), gridViewOptionsQueryString);

            // Start message timer
            var timerId = this.startMessageTimer();

            this.reportRunning(true);

            var deferred = $.Deferred();

            this.net.postJson({ url: url }, function () {
                return _this.getRunReportParams(additionalInfo, reportMode);
            }).then(function (result) {
                // Success
                // Stop message timer
                _this.stopMessageTimer(timerId);

                // Check the shape of the response to see if we are long-running or not
                if (result.isLongRunning) {
                    // We are a long-running report
                    deferred.resolve();

                    if (result.message)
                        ag.messages.show(result.message, result.messageType);

                    return;
                }

                // Report run complete
                _this.reportRunning(false);

                // Reset Grid
                _this.clearGridResults(true);

                // Hide parameters and get out of configuration mode
                _this.showConfiguration(false);
                _this.showParameters(false);

                _this.showConfiguration(false);
                _this.views.showConfigure(false);
                _this.grid.pager.navigateToPage(1);
                ag.messages.clear();

                if (typeof result.data === "string") {
                    // Scroll the crystal viewer into view
                    _this.scrollCrystalViewerIntoView(true);

                    // Set the Url for the Crystal
                    _this.crystalViewUrl(result.data);
                } else if (result.isPivoted) {
                    _this.pivot.processResult(result);
                    _this.grid.displayGrid(false);
                } else {
                    _this.pivot.hide();
                    _this.grid.displayGrid(true);

                    _this.grid.loadGridData(result);
                }

                if (result.message) {
                    // Support a simple message response
                    ag.messages.show(result.message, result.messageType);
                }

                if (result.report) {
                    var report = _this.setActiveReport(result.report, previewing);

                    // Quality of the ran report
                    _this.activeReport().encounteredErrors = result.report.encounteredErrors;

                    // Sync the URL - navigate to the query and report
                    _this.navigate(report.query(), report.key());

                    // Update the Parameter Summary
                    _this.updateReportSummary(result.report);
                }

                deferred.resolve();
            }, function () {
                // Error
                // Stop message timer
                _this.stopMessageTimer(timerId);

                _this.reportRunning(false);

                deferred.reject();
            });

            return deferred.promise();
        };

        ReportingViewModel.prototype.getRunReportParams = function (additionalInfo, reportMode) {
            // Create a new parameters object from this.applicationOptions
            // and add the currently selected query key and any current query data
            if (typeof reportMode === "undefined") { reportMode = ag.constants.ReportMode.Continue; }
            // Remove the available fields and reports properties from the post to reduce the request size
            var querydata = ko.mapping.toJS(this.selectedQuery);
            delete querydata["fields"];
            delete querydata["reports"];

            var viewdata = ko.mapping.toJS(this.views.selected());

            // pull the current filter values off the currently edited query
            this.reportFilters = ko.mapping.toJS(this.editingQuery.filters());
            var filterGroup = this.editingQuery.filterGroup ? ko.mapping.toJS(this.editingQuery.filterGroup) : null;

            ag.filters.transformFilters(this.reportFilters);
            ag.filters.transformFilters(viewdata.filters);

            $.extend(querydata, {
                filters: this.reportFilters,
                filterGroup: filterGroup,
                analysisFieldCaptions: ko.mapping.toJS(this.editingQuery.analysisFieldCaptions),
                analysisFields: ko.mapping.toJS(this.editingQuery.analysisFields),
                expiryCount: ko.mapping.toJS(this.editingQuery.expiryCount),
                expiryStrategy: ko.mapping.toJS(this.editingQuery.expiryStrategy)
            });

            this.setHiddenOptionsBackToDefaultValue(this.applicationOptions);

            return $.extend({ queryKey: this.selectedQuery().key(), queryData: querydata, viewType: viewdata.viewType }, ko.mapping.toJS(this.applicationOptions), ko.mapping.toJS(additionalInfo || {}), { failureTreatment: reportMode });
        };

        ReportingViewModel.prototype.getRunReportPayload = function (action, data) {
            $.extend(data, this.getRunReportParams());
        };

        ReportingViewModel.prototype.showReportRequest = function (report, gridViewOptionsQueryString, previewing, addtionalFields) {
            var _this = this;
            if (typeof gridViewOptionsQueryString === "undefined") { gridViewOptionsQueryString = ""; }
            if (typeof previewing === "undefined") { previewing = false; }
            // Check if we are already on the report
            if (this.activeReport() && this.activeReport().key() === report.key)
                return $.Deferred().done();

            // Record the current grid view options
            this.currentGridViewOptions = gridViewOptionsQueryString;

            if (this.activeReport() && this.activeReport().isPreviewing !== undefined && this.activeReport().isPreviewing()) {
                this.clearGridResults(true);
                return $.Deferred().done();
            }

            if (this.views.selected().viewType() === 1)
                return this.showCrystalViewRequest(report, previewing);

            var viewKey = this.views.selected().clientKey(), viewdata = ko.mapping.toJS(this.views.selected()), params = {
                queryKey: this.selectedQuery() ? this.selectedQuery().key() : null,
                reportId: ko.unwrap(report.key),
                viewKey: viewKey,
                viewType: viewdata.viewType,
                useCache: !this.viewsWithStaleResults[viewKey],
                data: this.showReportPayload(addtionalFields)
            }, url = "/{0}/{1}{2}".format(this.options.serviceUrl, this.runViewAction, gridViewOptionsQueryString);

            //filters.transformFilters(params.viewData.filters);
            // Request a Report using a specific Data View
            return this.net.postJson({ url: url }, params).then(function (result) {
                _this.updateReportDisplay(result, viewKey, previewing);
            }, function () {
                // Error
                // Clear existing summary
                _this.reportParameterSummary.removeAll();

                // Mark the view results as not stale
                _this.viewsWithStaleResults[viewKey] = false;

                // Clear the current results
                _this.clearGridResults(false);
            });
        };

        ReportingViewModel.prototype.setActiveReport = function (report, previewing) {
            var retrievedReport = ko.mapping.fromJS(report);

            // augment the report with preview observable
            $.extend(retrievedReport, { preview: ko.observable(previewing) });

            // Successfully retrieved report so set as the active report
            // and set the current query to the query associated with the report.
            this.activeReport(retrievedReport);

            return retrievedReport;
        };

        ReportingViewModel.prototype.showCrystalViewRequest = function (report, previewing) {
            var _this = this;
            // Scroll the crystal viewer into view
            this.scrollCrystalViewerIntoView(true);

            var params = { reportId: ko.unwrap(report.key), viewKey: this.views.selected().clientKey() };

            // Request a Crystal Report, will return Url for use with our Crystal Report Viewer
            return this.net.postJson("runcrystalview", params).then(function (result) {
                // Update the activeReport
                _this.setActiveReport(result.data, previewing);

                // Set the Url for the Crystal
                _this.crystalViewUrl(result.actionData);

                // Reset the scroll into view
                _this.scrollCrystalViewerIntoView(false);
            });
        };

        ReportingViewModel.prototype.deleteReportRequest = function (report) {
            var _this = this;
            // Delete an existing report
            return this.net.postJson("deletereport", { reportKey: report.key() }).then(function (result) {
                ag.messages.success(result.message);

                // If we've just deleted the active report, clear the active report and empty the results.
                if (_this.activeReport() && report.key() == _this.activeReport().key())
                    _this.clearGridResults(true);
            });
        };

        ReportingViewModel.prototype.getQueryRequest = function (queryKey) {
            var _this = this;
            if (queryKey === this.editingQuery.key())
                return;

            // Set the selected Query to the query in the list of queries
            // (used to build the menu) that include the list of reports
            var matchingQueryIndex = this.queries.mappedIndexOf({ key: queryKey });
            if (matchingQueryIndex >= 0)
                this.selectedQuery(this.queries()[matchingQueryIndex]);

            // New Query with a fake key (data not persisted yet) or Query with full object loaded into memory
            if (queryKey === ReportingViewModel.newQueryKey || this.isQueryLoaded()) {
                this.setActiveReportQueryValues(queryKey);
                this.setEditingQueryValues();
                this.queryAccessPermission();
                return;
            }

            var deferred = $.Deferred();

            // Retrieve the full Query and set the editingQuery to the instance returned
            this.net.getJson("editquery", { key: queryKey }).then(function (result) {
                _this.processQueryResponse(result.data);
                _this.setActiveReportQueryValues(queryKey);
                _this.queryAccessPermission();

                // Resolved
                deferred.resolve();
            }, function () {
                // Error
                deferred.fail();
            });

            return deferred.promise();
        };

        ReportingViewModel.prototype.deleteQueryRequest = function (query) {
            var _this = this;
            // Can't delete the query if it is the system default
            if (query.isSystem()) {
                ag.messages.error(ag.strings.defQueryDelete);
                return $.Deferred().resolve();
            }

            var removeQuery = function (message) {
                // Remove the query from the list of queries, and switch the current query
                // to the default (or system) query if we've just removed the editing query.
                if (query == _this.selectedQuery()) {
                    // Get the default (or system default)
                    var defaultQuery = _this.getDefaultQuery();
                    if (defaultQuery == _this.selectedQuery())
                        defaultQuery = _this.getSystemDefaultQuery();

                    // Clear results if there are any
                    _this.clearGridResults(true);

                    // Navigate
                    _this.navigate(ko.unwrap(defaultQuery.key), null);
                }

                _this.queries.mappedRemove({ key: query.key() });
                ag.messages.success(message);

                // Remove validation entry
                delete _this.queryOptionsToRevalidate[query.key()];
            };

            // Delete an unsaved query
            if (query.key() == null || query.key() == ReportingViewModel.newQueryKey) {
                removeQuery(ag.strings.queryDeleted);
                return $.Deferred().resolve();
            }

            // Delete an existing query
            return this.net.postJson("deletequery", { queryKey: query.key() }).then(function (result) {
                removeQuery(result.message);
            });
        };

        ReportingViewModel.prototype.saveQueryRequest = function (query, doCopy, copyAction) {
            var _this = this;
            if (typeof doCopy === "undefined") { doCopy = false; }
            // Save a new or updated existing query
            var savingDefault = query.isSystem(), isNew = doCopy || savingDefault || query.key() === null || query.key() === ReportingViewModel.newQueryKey, action = isNew ? copyAction || "createquery" : "editquery", querydata = ko.mapping.toJS(query);

            if (!(query.hasWritePermission()))
                doCopy = true;

            // Remove the available fields property from the post to reduce the request size
            delete querydata["fields"];
            delete querydata["reports"];

            // Clear the fake key
            if (querydata.key === ReportingViewModel.newQueryKey)
                querydata.key = null;

            if (savingDefault || doCopy) {
                querydata.name = ag.utils.ensureUniqueName(querydata.name, ko.mapping.toJS(this.queries()), "name");
                querydata.key = null;
                querydata.isDefault = false;
                querydata.isSystem = false;

                // Reload & update the "source query" (system/default) from server otherwise the default values of this query will be changed
                this.net.getJson("editquery", { key: query.key() }).then(function (result) {
                    _this.processQueryResponse(result.data);
                });
            }

            ag.filters.transformFilters(querydata.filters);

            this.setHiddenOptionsBackToDefaultValue(this.applicationOptions);

            // Convert the "personal" property to a strict boolean from the truthy value
            // ("0" or "1") obtained from the binding.
            // querydata.isPersonal = isNaN(parseInt(querydata.isPersonal)) ? querydata.isPersonal : !!parseInt(querydata.isPersonal);
            var postdata = $.extend(querydata, { options: ko.mapping.toJS(this.applicationOptions) }, this.additionalSaveQueryPostData());

            var previousQuery = query;

            // Hide the config section, show the parameters
            this.showConfiguration(false);

            return this.net.postJson(action, function () {
                return postdata;
            }).done(function (result) {
                return _this.handleQueryResult(result, savingDefault, doCopy, isNew, previousQuery, query);
            });
        };

        ReportingViewModel.prototype.additionalSaveQueryPostData = function () {
            return {};
        };

        ReportingViewModel.prototype.handleQueryResult = function (result, savingDefault, doCopy, isNew, previousQuery, query) {
            ag.messages.show(result.message, result.messageType);
            var queryFromResult = this.getQueryFromResult(result);

            // Add the query to the queries collection if we're trying to save a default query
            if (savingDefault || doCopy) {
                var newQuery = ko.mapping.fromJS(queryFromResult);
                this.queries.push(newQuery);
                this.navigate(queryFromResult.key);
            } else {
                // Update the queries list observable array to force the list to reflect any changes.
                // [AG 26/6/2012] We need to use the empty option parameter in the call to fromJS to force
                // it to treat the indexed query as the target, otherwise it's expecting the target to be
                // the top-level mapped object.
                var queryNotFound = -1;
                var queryIndex = isNew ? this.queries().length - 1 : this.queries.mappedIndexOf(queryFromResult);

                queryIndex = queryIndex == queryNotFound ? this.handleQueryNotFound(queryIndex, previousQuery, result.data, queryFromResult, isNew) : queryNotFound;

                ko.mapping.fromJS(queryFromResult, {}, this.queries()[queryIndex]);

                // Update the details of the selected and editing query
                ko.mapping.fromJS(queryFromResult, this.selectedQuery);
                ko.mapping.fromJS(queryFromResult, this.editingQuery);

                this.updateGridModelAfterSave(result.data);

                // Navigate to the newly added query
                if (isNew)
                    this.navigate(ko.unwrap(result.data.key));
            }

            this.updateQueriesListAfterSaveOrCreate(isNew ? "new" : query.key(), query);
        };

        ReportingViewModel.prototype.updateQueriesListAfterSaveOrCreate = function (key, query) {
            _.each(this.queries(), function (tempNewQuery) {
                if (tempNewQuery.key() == key) {
                    ko.mapping.fromJS(ko.mapping.toJS(query), tempNewQuery);
                    return false;
                }
            });
        };

        ReportingViewModel.prototype.handleQueryNotFound = function (currentQueryIndex, previousQuery, data, query, isNew) {
            return currentQueryIndex;
        };

        ReportingViewModel.prototype.setHiddenOptionsBackToDefaultValue = function (options) {
            for (var option in options) {
                if (options.hasOwnProperty(option) && option.indexOf('_') != 0) {
                    var applicationOption = options[option];
                    if (applicationOption.isVisible && !applicationOption.isVisible() && applicationOption.isDirty()) {
                        var defaultValue = applicationOption.tag();
                        if (defaultValue === "null") {
                            defaultValue = "";
                        }

                        // set back to default value
                        applicationOption.underlying(defaultValue);
                    }
                }
            }
        };

        ReportingViewModel.prototype.addQueryRequest = function () {
            var _this = this;
            // Get a new query and set the editingQuery to the instance returned
            return this.net.getJson("createquery", null).done(function (result) {
                // Check for unique name
                var queries = ko.mapping.toJS(_this.queries());
                result.data.name = ag.utils.ensureUniqueName(result.data.name, queries, "name");

                // Update new query with a fake key
                result.data.key = ReportingViewModel.newQueryKey;

                // Make observable
                var query = ko.mapping.fromJS(result.data);

                // Initialize the reports array as won't
                // exist for new queries
                query.reports = ko.observableArray();

                // Add the query to the queries collection
                _this.queries.push(query);

                // Update the selected query (we also need to update the editing query here as we're
                // not going to be navigating to an existing query which usually updates editingQuery).
                _this.selectedQuery(query);
                ko.mapping.fromJS(result.data, _this.editingQuery);

                if (result.data.options)
                    ko.mapping.fromJS(result.data.options, _this.applicationOptions);
                else if (result.options)
                    ko.mapping.fromJS(result.options, _this.applicationOptions);

                // Updating breadcrumb if there is any
                if (result.breadcrumb)
                    ko.mapping.fromJS(result.breadcrumb, _this.breadcrumb);

                // Clear the reports as they will be left over
                // from a previously edited query otherwise
                if (_this.editingQuery.reports && _this.editingQuery.reports())
                    _this.editingQuery.reports.removeAll();

                // Show the configuration view
                _this.showParameters(true);
                _this.showConfiguration(true);
            });
        };

        ReportingViewModel.prototype.saveQueryIfNew = function () {
            if (this.editingQuery.key() == null || this.editingQuery.key() === ReportingViewModel.newQueryKey) {
                // Save this query before running the report
                return this.saveQueryRequest(this.editingQuery, false);
            }
        };

        ReportingViewModel.prototype.setUserDefaultView = function () {
            // Save user default view before running the report
            if (this.views.selected().key() != null) {
                this.editingQuery.defaultView(ko.unwrap(this.views.selected().key()));
            }
        };

        ReportingViewModel.prototype.updateQuery = function () {
            this.storeQuery();
            this.storeQueryOptionsToRevalidate();
        };

        ReportingViewModel.prototype.storeQuery = function () {
            // Update changes to query (in queries list)
            var matchingQueryIndex = this.queries.mappedIndexOf({ key: this.editingQuery.key() });

            if (matchingQueryIndex >= 0 && !$.isEmptyObject(this.applicationOptions)) {
                var querydata = ko.mapping.toJS(this.editingQuery), queryInCollection = this.queries()[matchingQueryIndex];

                // Get the latest values of applicationOptions
                querydata.options = ko.mapping.toJS(this.applicationOptions);

                // Map the editingQuery over the top of the lightweight version
                // in the collection, make sure to ignore reports
                ko.mapping.fromJS(querydata, { ignore: ["reports"] }, queryInCollection);
            }
        };

        ReportingViewModel.prototype.storeQueryOptionsToRevalidate = function () {
            var observables = [];
            _.each(this.applicationOptions, function (prop, propName) {
                // Only store observables where the validation uses valueIsUnvalidated
                // And validation result is error or still validating
                if (prop.hasOwnProperty("valueIsUnvalidated") && (!prop.isValid() || prop.isValidating()))
                    observables.push(propName);
            });

            this.queryOptionsToRevalidate[this.editingQuery.key()] = observables;
        };

        ReportingViewModel.prototype.setActiveReportQueryValues = function (queryKey) {
            // Clear the current results if we have changed query and the report
            // currently being displayed is not associated with the newly selected query
            if (this.activeReport()) {
                var activeReportQueryKey = this.activeReport().query();

                // Reports created from the "Default" query with have a query key of null
                if (!activeReportQueryKey && queryKey === ReportingViewModel.defaultQueryKey)
                    return;

                if (activeReportQueryKey !== queryKey) {
                    this.clearGridResults(true);
                    this.showParameters(true);
                    this.showConfiguration(false);
                }
            }

            // Set the currently selected View to the default view for this query
            var defaultViewKey = ko.unwrap(this.selectedQuery().defaultView);
            if (defaultViewKey === undefined) {
                defaultViewKey = ko.unwrap(this.editingQuery.defaultView);
            }

            var defaultView = this.views.all().filter(function (item) {
                if (defaultViewKey) {
                    return item.key() === defaultViewKey;
                }

                // if no default key, just display the system default
                return item.isDefault() && item.isSystem();
            })[0];

            if (defaultView) {
                this.views.setSelected(defaultView);
            }
        };

        ReportingViewModel.prototype.setEditingQueryValues = function () {
            var _this = this;
            var querydata = ko.mapping.toJS(this.selectedQuery);
            ko.mapping.fromJS(querydata, this.editingQuery);
            ko.mapping.fromJS(querydata.options, this.applicationOptions);

            // Trigger validation
            _.each(this.queryOptionsToRevalidate[this.editingQuery.key()], function (propName) {
                var observable = _this.applicationOptions[propName];
                observable.valueIsUnvalidated = true;
                observable.valueHasMutated();
            });
        };

        ReportingViewModel.prototype.saveViewRequest = function () {
            var _this = this;
            var action = this.views.selected().key() ? "editview" : "createview", isNewDefault = action === "createview", viewData = ko.mapping.toJS(this.views.selected), payload = { view: viewData, queryKey: ko.unwrap(this.editingQuery.key) }, deferred = $.Deferred();

            ag.filters.transformFilters(viewData.filters);

            var isValid = this.net.postJson(action, payload).then(function (result) {
                _this.grid.views.showConfigure(false);
                ag.messages.show(result.message, result.messageType);

                _this.views.updateSelectedViewAndChildren(result.data);

                // Also flag that the view has been updated (for forcing a cache refresh
                // when next showing a report for this view).
                var viewKey = _this.views.selected().clientKey();
                _this.viewsWithStaleResults[viewKey] = true;

                // Flag that the selected view has been updated to trigger any dependencies.
                // This is done on the page to stop 'runview' being triggered multiple times.
                _this.grid.pager.page.valueHasMutated();
                _this.pivot.reset();
                _this.grid.selected.reset();

                // If we have just created a new view set its key
                // on the query as the queries new default.
                if (isNewDefault)
                    _this.editingQuery.defaultView(viewKey);

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

        ReportingViewModel.prototype.applyViewRequest = function () {
            var _this = this;
            this.views.apply().then(function () {
                var viewKey = _this.views.selected().clientKey();
                _this.viewsWithStaleResults[viewKey] = true;

                _this.pivot.reset();
            });
        };

        ReportingViewModel.prototype.printViewRequest = function (reportId, queryKey, viewKey, format, gridViewOptions) {
            ag.downloadInvoker.invoke("/{0}/printview".format(this.options.serviceUrl), { reportId: reportId, query: queryKey, viewKey: viewKey, format: format, options: gridViewOptions });
        };

        ReportingViewModel.prototype.exportViewRequest = function (reportId, queryKey, viewKey, format, gridViewOptions) {
            ag.downloadInvoker.invoke("/{0}/exportview".format(this.options.serviceUrl), { reportId: reportId, query: queryKey, viewKey: viewKey, format: format, options: gridViewOptions });
        };

        ReportingViewModel.prototype.keepActiveReportRequest = function (reportId) {
            return this.net.postJson("keepReport", { reportId: reportId }).done(function (result) {
                ag.messages.show(result.message, result.messageType);
            });
        };

        ReportingViewModel.prototype.updateQueryBeforeNavigate = function (queryKey) {
            // Update current query with changes before
            // navigating to a different query
            if (queryKey !== this.editingQuery.key())
                this.updateQuery();
        };

        ReportingViewModel.prototype.getNewQueryOnNavigate = function () {
            // If we already have a new query select it
            if (this.getQueryByKey(ReportingViewModel.newQueryKey)) {
                // This will get the in-memory new query not do a request
                this.getQueryRequest(ReportingViewModel.newQueryKey);
                return;
            }

            this.addQueryRequest();
        };

        ReportingViewModel.prototype.getQueryByKey = function (key) {
            return this.findQuery(function (q) {
                return q.key() == key;
            });
        };

        ReportingViewModel.prototype.getDefaultQuery = function () {
            var defaultQuery = this.findQuery(function (q) {
                return q.isDefault();
            });

            // If there's no default return the system query
            if (!defaultQuery)
                defaultQuery = this.getSystemDefaultQuery();

            return defaultQuery;
        };

        ReportingViewModel.prototype.getSystemDefaultQuery = function () {
            return this.findQuery(function (q) {
                return q.isSystem();
            });
        };

        ReportingViewModel.prototype.findQuery = function (condition) {
            return _.find(this.queries(), condition);
        };

        ReportingViewModel.prototype.navigate = function (queryKey, reportKey) {
            var params = { query: queryKey };
            if (reportKey !== undefined && this.supportPreviousRun)
                params.report = reportKey;

            this.nav.navigate(params);
        };

        ReportingViewModel.prototype.navigateGetParams = function () {
            return this.supportPreviousRun ? { query: null, preview: false, report: null } : { query: null };
        };

        ReportingViewModel.prototype.navigateDelegator = function (args, currrentContext) {
            var navEntry = args[0], navInfo = args[1];

            // Query AND Report - route
            if (this.routeToQueryAndReport(navEntry.params))
                return;

            // Query by itself - route
            if (this.routeToQuery(navEntry.params))
                return;

            // Back history navigation - no query or report
            if (navInfo.isBack)
                this.routeBack();
        };

        ReportingViewModel.prototype.routeToQueryAndReport = function (params) {
            var _this = this;
            var queryKey = params.query;

            if (queryKey && params.report) {
                var reportId = params.report;

                queryKey = this.verifyQueryKey(queryKey);

                this.updateQueryBeforeNavigate(queryKey);

                // Request Query
                $.when(this.getQueryRequest(queryKey)).then(function () {
                    return _this.showReport({ key: reportId });
                });
                return true;
            }

            return false;
        };

        ReportingViewModel.prototype.verifyQueryKey = function (queryKey) {
            var result = _.find(this.queries(), function (query) {
                return query.key() == queryKey;
            });

            if (!result) {
                queryKey = _.find(this.queries(), function (query) {
                    return query.isSystem();
                }).key();
            }

            return queryKey;
        };

        ReportingViewModel.prototype.routeToQuery = function (params) {
            var _this = this;
            if (!params.query)
                return false;

            var queryKey = params.query;

            if (queryKey === ReportingViewModel.defaultKey)
                return false;

            this.updateQueryBeforeNavigate(queryKey);

            if (queryKey !== ReportingViewModel.newQueryKey) {
                // Check if we are already on the query
                if (queryKey === this.editingQuery.key())
                    return true;

                $.when(this.getQueryRequest(queryKey)).then(function () {
                    return _this.clearGridResults(true);
                });
            } else {
                this.getNewQueryOnNavigate();
                this.clearGridResults(true);
            }

            return true;
        };

        ReportingViewModel.prototype.routeBack = function () {
            var _this = this;
            // Back to initial setup
            $.when(this.getQueryRequest(ReportingViewModel.defaultQueryKey)).then(function () {
                return _this.clearGridResults(true);
            });
        };

        ReportingViewModel.prototype.updateReportDisplay = function (result, viewKey, previewing) {
            // Clear existing summary
            this.reportParameterSummary.removeAll();

            // Mark the view results as not stale
            this.viewsWithStaleResults[viewKey] = false;

            this.updateDisplayOptions(result);

            // Clear the current results
            this.clearGridResults(false);

            this.updatePivot(result);

            if (result.report)
                this.setReport(result.report, previewing);
        };

        ReportingViewModel.prototype.updatePivot = function (result) {
            if (result.isPivoted) {
                this.pivot.processResult(result);
                this.grid.displayGrid(false);
                this.grid.chart.visible(false);
            } else if (result.isChart) {
                this.pivot.hide();
                this.grid.displayGrid(false);
                this.grid.chart.processResult(result);
            } else {
                this.pivot.hide();
                this.grid.chart.visible(false);
                this.grid.displayGrid(true);

                this.grid.loadGridData(result);
            }
        };

        ReportingViewModel.prototype.setReport = function (report, previewing) {
            report.query = report.query || ReportingViewModel.defaultQueryKey;

            this.setActiveReport(report, previewing);

            // Update the Parameter Summary
            this.updateReportSummary(report);
        };

        //#region Virtual Methods
        ReportingViewModel.prototype.processQueryResponse = function (data) {
            var _this = this;
            this.silenceDependency(function () {
                ko.mapping.fromJS(data, _this.editingQuery);
                ko.mapping.fromJS(data.options, _this.applicationOptions);
                ag.updateGrids(data.options, _this.grids);

                if (data.filterGroup)
                    ko.mapping.fromJS(data.filterGroup, _this.editingQuery.filterGroup);

                // If an existing option is not in the set of returned options we need to clear that value.
                $.each(_this.applicationOptions, function (option) {
                    if (data.options[option] == null && typeof _this.applicationOptions[option] === "function")
                        _this.applicationOptions[option](null);
                });
            }, this);
        };

        ReportingViewModel.prototype.updateGridModelAfterSave = function (data) {
        };

        ReportingViewModel.prototype.updateDisplayOptions = function (data) {
        };

        ReportingViewModel.prototype.isQueryLoaded = function () {
            return this.selectedQuery().options;
        };

        ReportingViewModel.prototype.getQueryFromResult = function (result) {
            return result.data;
        };

        //#endregion
        ReportingViewModel.prototype.canPerformAction = function (grid, itemKey, canProperty) {
            return (grid.selected.all() && grid.pager.totalItems() > 0) || _.any(grid.selected.keys(), function (key) {
                var item = _.find(grid.items(), function (gridItem) {
                    return gridItem[itemKey] == key;
                });

                return item === undefined || item[canProperty];
            });
        };

        ReportingViewModel.prototype.setViewAsStale = function (stale) {
            if (typeof stale === "undefined") { stale = true; }
            var viewKey = this.views.selected().key();
            this.viewsWithStaleResults[viewKey] = stale;
        };

        ReportingViewModel.prototype.initialiseMenuCommands = function () {
            var _this = this;
            this.previewReportCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.processReport(true).always(complete);
                }
            });

            this.runReportCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.processReport(false, ag.constants.ReportMode.Continue).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.runPreviewReportCommand && !_this.runPreviewReportCommand.isExecuting();
                }
            });

            this.runPreviewReportCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.processReport(true, ag.constants.ReportMode.Halt).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && !_this.runReportCommand.isExecuting();
                }
            });

            this.saveConfigurationCommand = ko.asyncCommand({
                execute: function (complete) {
                    // Save any configuration updates
                    _this.saveQueryRequest(_this.editingQuery).always(complete);
                }
            });

            this.addReportCommand = ko.command({
                execute: function () {
                    _this.addQuery();
                }
            });

            this.copyActiveQueryCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.copyActiveQuery().always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && !_this.isNewItem();
                }
            });

            this.deleteActiveQueryCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.deleteActiveQuery().always(complete);
                },
                isVisible: function (isExecuting) {
                    return !isExecuting && !_this.isNewItem() && !ko.unwrap(_this.editingQuery.isSystem);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && !_this.isNewItem() && !ko.unwrap(_this.editingQuery.isSystem);
                }
            });

            this.reportRunningComputed = ko.computed(function () {
                return _this.runReportCommand.isExecuting() || _this.runPreviewReportCommand.isExecuting();
            });

            // This is needed to force the canExecute on runReportCommand to be reevaluated.
            this.runReportCommand.isExecuting.valueHasMutated();

            this.keepReportCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.keepActiveReportRequest(_this.activeReport().key()).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.activeReport() && !_this.previewing() && !_this.views.selectedIsCrystal();
                }
            });

            this.exportReportCommand = ko.command({
                execute: function () {
                    _this.showExportDialog();
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.activeReport() && !_this.previewing() && !_this.views.selectedIsCrystal();
                }
            });
        };
        ReportingViewModel.defaultKey = "-1";
        ReportingViewModel.newQueryKey = "new";
        ReportingViewModel.defaultQueryKey = "Default";
        return ReportingViewModel;
    })(ag.BaseViewModel);
    ag.ReportingViewModel = ReportingViewModel;
})(ag || (ag = {}));
