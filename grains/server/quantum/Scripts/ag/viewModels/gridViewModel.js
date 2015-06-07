var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    (function (ProcessingHelper) {
        function create(initialValue) {
            if (typeof initialValue === "undefined") { initialValue = false; }
            var processingCount = ko.observable(!initialValue ? 0 : 1);
            return ko.computed({
                read: function () {
                    return processingCount() > 0;
                },
                write: function (value) {
                    var currentCount = processingCount();
                    if (!value) {
                        if (currentCount > 0)
                            processingCount(currentCount - 1);
                    } else
                        processingCount(currentCount + 1);
                },
                owner: this
            });
        }
        ProcessingHelper.create = create;
    })(ag.ProcessingHelper || (ag.ProcessingHelper = {}));
    var ProcessingHelper = ag.ProcessingHelper;

    function getDefaultOptions(options) {
        var result = options || {};
        result.serviceUrl = result.serviceUrl || ag.utils.getDefaultServiceUrl();
        result.itemKey = result.itemKey || "";
        result.selectionMode = result.selectionMode || 0 /* None */;

        return result;
    }

    // options:
    // listMetaData    - metadata used to create the grid and supporting elements
    // action          - name of the method to call to retrive data, default: "list"
    // loadImmediately - load the grid immediately or defer, default: false
    // pageSize        - Data page size to retrieve, default: 20
    // noItemsMessage  - Message to be displayed when no items are returned from server, default: "no items";
    // itemKey         - name of the Key Property on the Item, also serves as the default SortOn value
    // serviceUrl      - base Url of the Service to call when retrieving, editing, and listing grid views
    // searchText      - user input search text on view
    // searchTerms     - search terms (an array) populate from "searchText"
    var GridViewModel = (function () {
        function GridViewModel(options) {
            var _this = this;
            this.options = options;
            this.methodUtils = ag.dom.MethodUtils.instance();
            this.isVisible = ko.observable(true);
            this.items = ko.observableArray();
            this.menuCommands = {};
            this.displayGrid = ko.observable(true);
            this.showColumnConfigDialog = ko.observable(false);
            this.showList = ko.observable(false);
            this.dependentColumns = ko.observableArray();
            this.doColumnsUpdate = true;
            this.quickMenuItems = [];
            this.defaultQuickMenuItems = {};
            this.quickMenuItem = ko.observable();
            this.canSelectAll = true;
            this.grids = {};
            this.refreshAllGridsWrapper = null;
            this.isLoading = ProcessingHelper.create();
            this.labels = {};
            this.columnDisplayNames = ko.observable();
            this.styleDictionary = ko.observableArray();
            this.disableLinksTo = false;
            this.initializing = true;

            options = getDefaultOptions(options);
            options.action = options.action || "list";

            this.itemKey = options.itemKey || "key";
            this.isEditable = ko.observable(options.isEditable);
            this.canEdit = ko.observable(options.canEdit || false);

            this.responseOnly = options.responseOnly;
            this.postOnly = options.postOnly;
            this.canSelect = options.canSelect;
            this.typeMetaDataUrl = options.typeMetaDataUrl;
            this.addPostActionName = options.addAction || "add{0}".format(options.name);
            this.addLookupActionName = options.addLookupAction || "get{0}lookup".format(options.name);
            this.removePostActionName = options.removeAction || "remove{0}".format(options.name);
            this.canRemove = ko.observable(options.canRemove || false);
            this.canSelectAll = options.canSelectAll !== undefined ? options.canSelectAll : true;
            this.active = options.active;
            this.viewModel = options.viewModel;
            this.isEditorReadOnly = options.isEditorReadOnly || ko.observable(false);

            this.isActive = ko.computed(function () {
                if (!_this.active || !$.isArray(_this.active))
                    return true;

                var result = $.grep(_this.active, function (item) {
                    return item();
                });

                return result.length == _this.active.length;
            });

            this.isActive.subscribe(function (newValue) {
                if (newValue && _this.refreshWrapper != null) {
                    _this.clearTheRefreshWrapper();
                }
            });

            this.id = options.listMetaData.id || undefined;

            // It's possible that there are no views for this grid, i.e., grid metadata will
            // be provided with the data.
            this.views = new ag.ViewsViewModel((options.listMetaData && options.listMetaData.views) || [], (options.listMetaData && options.listMetaData.viewTables) || [], options.typeName);

            this.selected = new ag.SelectedViewModel(options.selectionMode, options.itemKey);

            // Only create columns editor when there is a columnsEditorOptions
            if (options.columnsEditorOptions != null)
                this.columnsEditor = new ag.ColumnsEditorViewModel(this.views.selected, options.columnsEditorOptions);

            this.sorter = new ag.SorterViewModel(this.views, false);
            this.sorter.gridSortOn(options.itemKey);

            this.pager = new ag.Pager({ updating: this.isLoading, pageSize: options.pageSize, activeSortColumns: this.sorter.activeSortFields });
            this.canPage = ko.computed(function () {
                return _this.views.selectedIsGrid() && _this.pager.hasPages();
            });
            this.search = new ag.SearchViewModel();
            this.chart = new ag.VisualisationViewModel(this.views.selected);

            this.columns = ko.computed(function () {
                var columns = _this.selected.columns().concat(_this.views.visibleColumns());

                if (options.hasDependentColumns) {
                    columns = _.filter(columns, function (column) {
                        return ko.unwrap(column.dataType) === "checkbox" || _.contains(_this.dependentColumns(), ko.unwrap(column.key));
                    });
                }

                // Make a copy of the columns (so when display names are changed, the field selector
                // names remain unchanged.
                columns = ko.unwrap(ko.mapping.fromJS(ko.mapping.toJS(columns)));

                var columnDisplayNames = ko.unwrap(_this.columnDisplayNames);
                if (columnDisplayNames) {
                    _.each(columns, function (column) {
                        var key = ko.unwrap(column.key);
                        var displayName = columnDisplayNames[key];
                        if (displayName) {
                            column.displayName(displayName);
                        }
                    });
                }

                return columns;
            });

            this.usedViewFilters = ko.computed(function () {
                return _this.views.selected() && _this.views.selected().filters;
            });

            this.sorter.changed.subscribe(function () {
                _this.pager.navigateToPage(1);
            });

            this.search.text.subscribe(function (newValue) {
                // Reset to first Page
                _this.pager.navigateToPage(1);

                if (!newValue)
                    _this.selected.reset();
            });

            this.net = new ag.utils.Network({
                area: ag.area,
                controller: ag.controller,
                responseOnly: this.responseOnly,
                postOnly: this.postOnly
            });

            this.allViewFilters = ko.observableArray(options.viewFilters || []);

            // Use a passed in metaObservable for the associated property on
            // the main ViewModel (if one exists) as a proxy for dependencies
            this.dependencyProxy = options.dependencyProxy;
            if (this.dependencyProxy) {
                this.dependencyProxy.subscribe(function (newValue) {
                    // If we are not loading and there is a grid response-like value
                    if (!_this.isLoading() && newValue && newValue.data && $.isArray(ko.unwrap(newValue.data)) && newValue.gridViewOptions)
                        _this.loadGridData(newValue);
                });

                this.dependencyProxy.isVisible.subscribe(function (newValue) {
                    _this.isVisible(newValue);
                });

                //this.dependencyProxy.isAvailable.subscribe((newValue) =>
                //{
                //   // This does nothing at the moment but should make the
                //   // grid editing features, actions, and selections all disabled if false
                //   this.isEnabled(newValue);
                //});
                this.dependencyProxy.refresh = this.refresh.bind(this);
                this.dependencyProxy.clear = this.reset.bind(this); // or .clearData;
            }

            this.isEnabled = ko.computed(function () {
                return !_this.isEditorReadOnly() && (!_this.dependencyProxy || _this.dependencyProxy.isAvailable());
            });

            this.views.selected.subscribe(function () {
                // Clear Search Term before switching to another view
                _this.search.clear();

                // Reset to first Page
                _this.pager.navigateToPage(1);

                _this.selected.reset();
            });

            ko.computed(function () {
                _this.refreshData();
            }, this).extend({ rateLimit: ag.utils.getRateLimitOption() });

            this.noItems = ko.computed(function () {
                return _this.items().length === 0;
            });

            this.views.selected().appliedFields.subscribe(function () {
                // Reset to first Page when filter is applied
                _this.pager.navigateToPage(1);
            });

            // Only create editors when editable
            if (options.isEditable)
                this.editor = new ag.GridEditorViewModel(this, options);
        }
        GridViewModel.prototype.clearTheRefreshWrapper = function () {
            // Call the refresh with the original params (in wrapper)
            this.refreshWrapper();

            // Clear the function
            this.refreshWrapper = null;
        };

        GridViewModel.prototype.isAnythingSelected = function () {
            return this.selected.keys().length > 0 || (this.selected.all() && this.pager.totalItems() > 0);
        };

        GridViewModel.prototype.isOnlyOneThingSelected = function () {
            return this.selected.keys().length === 1;
        };

        GridViewModel.prototype.itemIsSelected = function () {
            return this.selected.item();
        };

        GridViewModel.prototype.quickMenuItemExists = function () {
            return this.quickMenuItem();
        };

        GridViewModel.prototype.getParams = function (keys) {
            var params = this.getGridViewOptions();

            if (this.options.additionalFields != null) {
                $.extend(params, ag.utils.getAdditionalFieldsFromModel(this.options.additionalFields, this.viewModel));
            }

            params.keys = keys;

            return params;
        };

        GridViewModel.prototype.removeItem = function (item) {
            return this.itemChange(this.removePostActionName, this.getParams([item[this.itemKey]]));
        };

        GridViewModel.prototype.itemAdded = function (items, event, data) {
            var _this = this;
            var keys = _.map(items, function (item) {
                return item[_this.itemKey];
            }), params = this.getParams(keys);

            if (data)
                params = $.extend(params, { data: data });

            return this.itemChange(getAreaControllerAction(this.options, this.addPostActionName), params);
        };

        GridViewModel.prototype.itemsAddedAndNavigateToLastPage = function (items, event, data) {
            var _this = this;
            return this.itemAdded(items, event, data).then(function () {
                _this.sorter.gridSortOn('');
                _this.pager.navigateToPage(_this.pager.totalPages());
            });
        };

        GridViewModel.prototype.itemChange = function (action, params) {
            var _this = this;
            this.isLoading(true);

            return this.net.postJson(action, params).done(function (response) {
                // Load the response
                _this.loadGridData(response);

                // Indicate change to subscribers
                if (_this.dependencyProxy)
                    _this.dependencyProxy(response);
            }).always(function () {
                _this.isLoading(false);
            });
        };

        GridViewModel.prototype.addActionUrl = function () {
            return "{0}{1}/{2}/{3}".format(ag.siteRoot, this.options.area || ag.area, this.options.controller || ag.controller, this.addLookupActionName);
        };

        GridViewModel.prototype.makeSelectedViewDefault = function (data) {
            this.makeSelectedViewDefaultRequest(data.editingQuery);
        };

        GridViewModel.prototype.viewFieldLookupSource = function () {
            return "/{0}/{1}".format(this.options.serviceUrl, "getviewfields");
        };

        GridViewModel.prototype.getViewFieldLookupSource = function () {
            return this.viewFieldLookupSource();
        };

        GridViewModel.prototype.getViewFilters = function () {
            return this.views.selected().filters;
        };

        GridViewModel.prototype.updateViewFilters = function (items) {
            ag.utils.pushApply(this.views.selected().filters, $.map(items, function (filter) {
                return ag.filters.buildFilter(filter, true);
            }));
        };

        GridViewModel.prototype.reset = function () {
            // Clear data and related state should only really be used
            // when wiping the slate clean, not between pages or search results.
            // clearData() should be used in those cases.
            this.search.clear();
            this.selected.reset(); // clear any current selection(s)
            this.items.removeAll();
            this.pager.navigateToPage(1);
            this.pager.reset();
            if (this.editor)
                this.editor.reset();

            this.refreshWrapper = this.refreshData;

            return this;
        };

        GridViewModel.prototype.clearData = function () {
            this.selected.reset(); // clear any current selection(s)
            this.items.removeAll();

            return this;
        };

        GridViewModel.prototype.refresh = function (revert, additionalParams, invokeImmediately) {
            if (typeof invokeImmediately === "undefined") { invokeImmediately = false; }
            if (invokeImmediately)
                this.refreshData(revert, additionalParams);
            else
                // Let the methodUtils to handle the situation if refresh has been called too many times in
                // a short period, so it will only fire once.
                // Refresh data including resetting
                this.methodUtils.debounce(this.refreshData, this, revert, additionalParams);
        };

        GridViewModel.prototype.loadData = function (gridViewDataResponse) {
            // Load results
            this.items(gridViewDataResponse.data || []);

            this.pager.updateFromResponse(gridViewDataResponse);

            this.dependentColumns(gridViewDataResponse.gridViewOptions.columns);

            if (gridViewDataResponse.gridViewOptions.selections)
                this.selected.load(gridViewDataResponse.gridViewOptions.selections);

            this.selected.updateSelectedItem(this.items());

            if (gridViewDataResponse.gridViewOptions.styleDictionary)
                this.styleDictionary(gridViewDataResponse.gridViewOptions.styleDictionary);
        };

        GridViewModel.prototype.toggleList = function () {
            this.showList(!this.showList());

            // Refresh the grid everytime it is shown
            if (this.showList())
                this.refresh(undefined, undefined, true);
            else
                this.views.showConfigure(false);
        };

        GridViewModel.prototype.showConfigureList = function () {
            this.showList(true);
            this.views.toggleConfigure();
        };

        GridViewModel.prototype.viewRequest = function (type) {
            var _this = this;
            var params = this.saveRequestData && this.saveRequestData();
            var action;

            if (this.views.selected().isSystem() || !this.views.selected().hasWritePermission()) {
                switch (type) {
                    case "new":
                        action = 0 /* CreateTypeView */;
                        break;
                    case "copy":
                        this.views.copy();
                        return;
                    case "save":
                        var key = ko.unwrap(this.views.selected().key);
                        this.views.copy();

                        // Reload & update the "source view" (system/default) from server otherwise the default values of this view will be changed
                        this.views.getViewRequest(key).then(function (result) {
                            _this.views.updateView(result);
                        });

                        action = 1 /* SaveTypeView */;
                        this.views.showConfigure(false); //close configure panel
                        break;
                    case "delete":
                        return;
                    default:
                        throw new Error('Invalid view request type.');
                }
                ;
            } else {
                switch (type) {
                    case "new":
                        action = 0 /* CreateTypeView */;
                        break;
                    case "copy":
                        this.views.copy();
                        return;
                    case "save":
                        if (!this.views.selected().key())
                            action = 1 /* SaveTypeView */;
                        else
                            action = 2 /* EditView */;
                        this.views.showConfigure(false); //close configure panel
                        break;
                    case "delete":
                        this.views.deleteView(this.views.selected());
                        return;
                    default:
                        throw new Error('Invalid view request type.');
                }
                ;
            }
            this.processViewRequest(params, action);
        };

        GridViewModel.prototype.saveRequestData = function () {
            return {};
        };

        GridViewModel.prototype.removeViewFilter = function (item) {
            this.views.selected().filters.remove(item);
        };

        // Default implementation - usually overridden
        GridViewModel.prototype.getItems = function (params, queryString, reset) {
            var _this = this;
            var url = "/{0}/{1}{2}".format(this.options.serviceUrl, this.options.action, this.buildQuery(ko.toJS(params)));

            return this.net.getJson({ url: url }, "").then(function (result) {
                _this.loadGridData(result, reset);
            });
        };

        GridViewModel.prototype.refreshData = function (revert, additionalParams, reset) {
            var _this = this;
            // Observes changes to variables and invokes a request
            // when changes occur, with throttling enabled multiple
            // changes can be made and a single request will be made
            var params = this.getGridViewOptions(), deferred = $.Deferred();

            //console.log(this.options.name || "Browse/List", "From refreshWrapper: " + !!(this.refreshWrapper != null), params, "init: " + this.initializing, "defer: " + this.options.loadImmediately);//, arguments.callee);
            if (revert)
                params.revert = true;

            if (additionalParams && $.isPlainObject(additionalParams))
                $.extend(params, additionalParams);

            // First time the computed is evaluated we are simply
            // initializing values and don't want to call getItems()
            // unless loadImmediately is set to true
            if (this.initializing && !this.options.loadImmediately) {
                this.initializing = false;
                return deferred.resolve();
            }

            // Load the items - needs to be wrapped in setTimeout to
            // avoid new dependencies being added to the computed
            window.setTimeout(function () {
                // If we are not active (on a hidden panel such as a tab) then
                // flag that a refresh is required but don't perform the refresh
                // this will be done when the grid becomes active
                if (!_this.isActive()) {
                    // Create a wrapper of the original call always allow this code to
                    // execute when not active so the latest set of parameters are recorded
                    _this.refreshWrapper = function () {
                        _this.refreshData(revert, additionalParams, reset);
                    };

                    _this.reset();
                    deferred.resolve();

                    return;
                }

                // We are loading
                _this.isLoading(true);

                // Add callbacks for the returned promise so we can relay them to our promise
                // (needs to be done this way due to the setTimeout breaking code flow)
                // NOTE: getItems must return a promise
                _this.getItems(params, _this.buildQuery(ko.toJS(params)), reset).done(function (result) {
                    deferred.resolve(result);
                }).fail(function (result) {
                    deferred.fail(result);
                }).always(function () {
                    // Load complete
                    _this.isLoading(false);
                    deferred.always();
                });
            }, 1);

            return deferred;
        };

        GridViewModel.prototype.getGridViewOptions = function () {
            var params = {
                page: this.pager.page(),
                pageSize: this.pager.pageSize(),
                pageTargetsCenter: this.pager.pageTargetsCenter(),
                pageTargetsInnerSize: this.pager.pageTargetsInnerSize(),
                pageTargetsEdgeSize: this.pager.pageTargetsEdgeSize(),
                view: this.views.selected() && this.views.selected().clientKey(),
                selections: this.selected.model.peek(),
                searchColumnName: "",
                gridGuid: this.id
            };

            if (this.doColumnsUpdate) {
                $.extend(params, this.sorter.sortOptions());
            }

            // Needed so grid will reload when view is saved or applied.
            var fields = this.views.selected().appliedFields();

            if (this.search.hasText()) {
                params.searchText = encodeURIComponent(this.search.text());
            }

            return params;
        };

        GridViewModel.prototype.getGridViewOptionsQueryString = function () {
            return this.buildQuery(this.getGridViewOptions());
        };

        GridViewModel.prototype.selectView = function (view) {
            var _this = this;
            this.isLoading(true);
            this.views.setSelected(view).always(function () {
                _this.isLoading(false);
            });
        };

        GridViewModel.prototype.selectRow = function (row) {
            this.selected.selectKey(ko.unwrap(row[this.itemKey]));
        };

        GridViewModel.prototype.buildQuery = function (viewOptions) {
            var query = "?";
            if (!viewOptions)
                throw new Error("viewOptions argument missing.");

            // Remove any options that are not applicable
            if (!viewOptions.sortOn)
                delete viewOptions.sortDesc;
            if (!viewOptions.columns)
                delete viewOptions.columns;
            if (!viewOptions.view)
                delete viewOptions.view;

            var isFirst = true;
            for (var key in viewOptions) {
                var optionValue = viewOptions[key];
                if ($.isArray(optionValue))
                    optionValue = optionValue.join(" ");

                query += "{0}{1}={2}".format(!isFirst ? "&" : "", key.toLowerCase(), optionValue);
                isFirst = false;
            }

            return encodeURI((query.length > 1) ? query : "");
        };

        GridViewModel.prototype.loadGridData = function (gridViewDataResponse, reset) {
            // rely on the dependency to load the data
            //this.dependencyProxy(result);
            if (reset)
                this.clearData();

            // It's sometimes wrapped
            gridViewDataResponse = ko.mapping.toJS(gridViewDataResponse);

            this.columnDisplayNames(gridViewDataResponse.columnDisplayNames);

            // Load results
            this.loadData(gridViewDataResponse);

            // HasWritePermission on selected Query
            this.views.viewAccessPermission(this.views.selected());

            // Notify the searchTerms observable array in search view model
            if (this.search) {
                this.search.searchTerms(gridViewDataResponse.gridViewOptions.searchTerms);
            }
        };

        GridViewModel.prototype.customizeActionPayload = function (payload) {
            payload.options = this.getGridViewOptions();
        };

        GridViewModel.prototype.processViewRequest = function (params, action) {
            //var hiddenFields = this.views.getHiddenFields();
            var viewData = ko.mapping.toJS(this.views.selected);

            //if (hiddenFields)
            //   viewData.fields = viewData.fields.concat(hiddenFields);
            // [AG 22/6/2012] Hack: we need to set the operator values on any filter to their string equivalents so they
            // will be bound correctly in MVC - MVC doesn't handle binding integer values to enums by default.
            $.each(viewData.filters, function (ind, filter) {
                filter.operator = filter.operator.toString();
            });

            // Do some additional transformation of lookup filter values
            ag.filters.transformFilters(viewData.filters);

            if (action != 0 /* CreateTypeView */) {
                // Merge in additional parameters
                params = $.extend({}, viewData, params);
            }

            switch (action) {
                case 2 /* EditView */:
                    this.views.editGridViewRequest(params);
                    break;
                case 1 /* SaveTypeView */:
                    this.views.saveTypeGridViewRequest(params);
                    break;
                case 0 /* CreateTypeView */:
                    this.views.createTypeGridViewRequest(params);
                    break;
                default:
                    throw new Error("Invalid view request type.");
            }
        };

        GridViewModel.prototype.makeSelectedViewDefaultRequest = function (query) {
            var viewData = { queryKey: query.key(), viewKey: this.views.selected().key() };

            this.net.postJson("setdefaultview", viewData).then(function () {
                // set the default view on the current query
                query.defaultView(viewData.viewKey);
            });
        };

        // Export a Crystal Report to PDF
        GridViewModel.prototype.exportCrystalReport = function (reportName) {
            var selectedItemKeyValue = null;

            if (this.selected.item() != undefined && this.selected.itemKey != undefined) {
                selectedItemKeyValue = this.selected.item()[this.selected.itemKey];
            }

            ag.utils.exportCrystalReport(this.options.serviceUrl, reportName, selectedItemKeyValue, ag.utils.getPageIdToken());
        };

        // Grid search call back function
        GridViewModel.prototype.gridSearch = function (action, data) {
            if (data.gridViewOptions.searchText != null) {
                // Populate search text with "Filtered search value" from server
                this.search.text(data.gridViewOptions.searchText);
            } else {
                // Populate search text with "selected cell value"
                this.search.text(ko.unwrap(action.data[action.columnName]));
            }
        };

        // Get the selected column's name on grid
        GridViewModel.prototype.gridSelectedCell = function (action, data) {
            if (action.columnName != null) {
                data.options.searchColumnName = action.columnName;
            }
        };
        return GridViewModel;
    })();
    ag.GridViewModel = GridViewModel;

    function getAreaControllerAction(options, actionName) {
        return options.controller ? { controller: options.controller, action: actionName, area: options.area } : actionName;
    }
    ag.getAreaControllerAction = getAreaControllerAction;

    function createGridViewModel(options, editorOptions) {
        var gridOptions = $.extend({}, options, editorOptions);

        gridOptions.loadImmediately = false;
        gridOptions.noItemsMessage = ag.strings.noItems;
        gridOptions.pageSize = options.pageSize;

        var grid = new GridViewModel(gridOptions);

        grid.getItems = function (params) {
            if (grid.viewModel) {
                var viewModelParams = {};

                if (options.additionalFields && options.additionalFields.length > 0) {
                    var additionalFields = options.additionalFields.split(",");

                    // Retrieve the additionalFields off the viewModel to be supplied as params
                    _.each(additionalFields, function (field) {
                        ag.setProperty(viewModelParams, field, ag.getProperty(grid.viewModel, field));
                    });
                } else if (options.includeModel) {
                    // Clone the viewModel onto viewModelParams
                    $.extend(viewModelParams, ko.unwrap(grid.viewModel));
                }

                // Add the viewModelParams to the params
                $.extend(params, ko.mapping.toJS(viewModelParams));
            }

            //var action = options.controller ?
            //   { controller: options.controller, action: options.action, area: options.area } :
            //   options.action;
            var action = getAreaControllerAction(options, options.action);

            return grid.net.getJson(action, params).done(function (response) {
                grid.loadGridData(response);
            });
        };

        //---------------------------------
        // Methods to support pivot display
        //---------------------------------
        grid.editingQuery = ko.mapping.fromJS({
            isSystem: true,
            isDefault: true,
            defaultView: "Default"
        });

        grid.activeReport = ko.observable();
        grid.showList = ko.observable(true);

        // TODO: move these into a separate view model
        grid.crystalViewUrl = ko.observable();
        grid.crystalViewerLoading = ko.observable(true);
        grid.crystalLoaded = function () {
            grid.crystalViewerLoading(false);
        };
        grid.scrollCrystalViewerIntoView = ko.observable(false);

        grid.isSelectedViewDefault = ko.computed(function () {
            return grid.views.selected() && (grid.views.selected().key() === grid.editingQuery.defaultView() || grid.editingQuery.isDefault() && grid.views.selected().isDefault());
        });

        grid.viewFieldLookupSource = function () {
            return "/{0}/{1}".format(options.typeMetaDataUrl || options.serviceUrl, "getviewfields");
        };

        grid.saveReportView = function () {
            return grid.viewRequest('save');
        };

        grid.saveRequestData = function () {
            return { typeName: options.typeName };
        };

        //grid.selectView = (view) =>
        //{
        //   var selected = grid.views.selected();
        //   // To prevent object observable trigger when the same value is selected
        //   if (selected.key() !== view.key() || selected.name() !== view.name())
        //      grid.views.setSelected(view);
        //};
        grid.pivot = new ag.PivotViewModel(null, grid.views.selected, null, grid, {
            serviceUrl: ag.utils.normalizeUrl(ag.serviceUrl)
        });

        grid.selected.keys.subscribe(function (newValue) {
            var selections = ko.unwrap(options.selections);
            if (selections) {
                selections.keys(newValue);
            }
        });

        grid.selected.all.subscribe(function (newValue) {
            var selections = ko.unwrap(options.selections);
            if (selections) {
                selections.all(newValue);
            }
        });

        return grid;
    }
    ag.createGridViewModel = createGridViewModel;
    ;

    // Creates GridViewModels for each item in the metadataArray and returns the names of the properties
    function createGridViewModelsFromMetadata(viewModel, metadataArray, model, options, readOnlyObservable, actionModel, skipPropertyCheck) {
        if (typeof skipPropertyCheck === "undefined") { skipPropertyCheck = false; }
        // Grids are added to the ViewModel.grids property
        var grids = viewModel.grids = viewModel.grids || {}, gridProperties = [], itemModel = actionModel || model, gridViewModel;

        _.each(metadataArray, function (meta, key) {
            if (itemModel && ag.getProperty(itemModel, key)) {
                gridViewModel = createGridViewModelFromMetadata(meta, options, model, viewModel, actionModel, itemModel, key, readOnlyObservable);

                gridProperties.push(key);

                // Assign to the grids property on the viewModel
                ag.setProperty(grids, key, gridViewModel);
            } else if (itemModel) {
                var array = key.split("."), keyToTry, value;

                for (var i = array.length - 2; i >= 0; i--) {
                    keyToTry = array.slice(0, i + 1).join('.');
                    value = ag.getProperty(itemModel, keyToTry);

                    if (value)
                        break;
                }
            }
        });

        return gridProperties;
    }
    ag.createGridViewModelsFromMetadata = createGridViewModelsFromMetadata;

    function getActiveObservables(active, viewModel) {
        // Get the observable(s) for the tab(s) this grid belongs to (if any)
        var activeObservables = [], tab;

        // Check viewModel contains some tabs before continuing
        if (!viewModel.tabs)
            return activeObservables;

        if (active && $.isArray(active)) {
            $.each(active, function (index, item) {
                tab = ag.getProperty(viewModel, item);
                if (tab)
                    activeObservables.push(tab);
            });
        }

        return activeObservables;
    }

    function createGridViewModelFromMetadata(meta, options, model, viewModel, actionModel, itemModel, key, readOnlyObservable) {
        var gridOptions = {
            active: getActiveObservables(meta.active, viewModel),
            typeName: meta.typeName,
            itemKey: meta.itemKey,
            pageSize: meta.pageSize,
            selectionMode: meta.selectionMode,
            canSelect: meta.canSelectProperty,
            canSelectAll: meta.canSelectAll,
            viewModel: actionModel || model,
            listMetaData: meta,
            additionalFields: meta.additionalFields,
            includeModel: _.isUndefined(meta.includeModel) ? true : meta.includeModel,
            name: meta.name,
            itemDisplayName: meta.itemDisplayName,
            isEditable: meta.isEditable,
            canEdit: meta.canEdit,
            dependencies: meta.dependencies,
            dependencyProxy: ag.getProperty(itemModel, key),
            responseOnly: meta.responseOnly,
            postOnly: meta.postOnly,
            controller: meta.controller,
            area: meta.area,
            action: meta.action || "list",
            suffixActionNames: meta.suffixActionNames,
            hasDependentColumns: meta.hasDependentColumns,
            canRemove: meta.canRemove,
            removeAction: meta.removeAction,
            canAdd: meta.canAdd,
            addLookupAction: meta.addLookupAction,
            addAction: meta.addAction,
            serviceUrl: options.serviceUrl,
            typeMetaDataUrl: options.typeMetaDataUrl,
            isEditorReadOnly: readOnlyObservable
        };

        var gridViewModel = createGridViewModel(gridOptions, {} /*editing options*/ );

        if (meta.typeViews)
            createGridViewModelsFromMetadata(gridViewModel, meta.typeViews, model, options, readOnlyObservable, actionModel, true);

        if (meta.selections)
            gridOptions.selections = ag.getProperty(itemModel, meta.selections);

        return gridViewModel;
    }

    // Update Grids based on incoming data
    function updateGrids(data, grids) {
        if (!$.isEmptyObject(grids) && data) {
            // Check if data was delivered with the response for grids
            // directly rather than requiring a seperate call
            // (for initial data, paging, sorting and filtering will require additional calls)
            var gridDictionary = ag.utils.flattenDictionary(grids, function (y) {
                return y instanceof ag.GridViewModel;
            });
            $.each(gridDictionary, function (property, gridViewModel) {
                var gridResponse = ag.getProperty(data, property);

                // Clear current state
                gridViewModel.reset();

                if (gridResponse && gridResponse.data && $.isArray(gridResponse.data) && gridResponse.gridViewOptions) {
                    // Load data and options (making sure the create a copy of the array)
                    gridViewModel.loadData(_.extend({}, gridResponse, { data: gridResponse.data.slice(0) }));
                }
                //else
                //{
                //   gridViewModel.refreshData();
                //}
            });
        }
    }
    ag.updateGrids = updateGrids;

    //
    var BrowseGridViewModel = (function (_super) {
        __extends(BrowseGridViewModel, _super);
        function BrowseGridViewModel(options, parent) {
            _super.call(this, options);
            this.options = options;
            this.appViewModel = parent;
            this.initializeBrowseElement($('body').find("#list.browse"));
        }
        BrowseGridViewModel.prototype.initializeBrowseElement = function (browseElement) {
            var _this = this;
            // Exclude the all the buttons from browse element except browse toggle
            // will close the browse window
            var buttonToolBarLinks = browseElement.find("div.btn-toolbar.shift > div > a");
            if (buttonToolBarLinks) {
                _.each(buttonToolBarLinks, function (toolBarLink) {
                    var $toolBarLink = $(toolBarLink);
                    if ($toolBarLink.attr("id") != "browseToggle")
                        $toolBarLink.data(BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN, false);
                });
            }

            // If the browse window is on the stage and event is not coming from the
            // browse container hide the browse window
            ko.utils.registerEventHandler(".page-container", "click", function (event) {
                if (_this.showList() == false)
                    return;

                if (!$(event.target).data(BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN)) {
                    _this.showList(false);
                    _this.views.showConfigure(false);
                }
            });

            ko.utils.registerEventHandler(browseElement, "click", function (event) {
                var $target = $(event.target);

                if (!_.has($target.data(), BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN))
                    $target.data(BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN, true);
            });
        };

        BrowseGridViewModel.prototype.toggle = function () {
            this.toggleList();

            // if list hidden, we don't need to do any here
            if (!this.showList())
                return;

            // set focus
            $('input[type="search"]').first().focus();
        };

        BrowseGridViewModel.prototype.isCurrentEditingItem = function (data) {
            var _this = this;
            if (this.appViewModel.isNewItem())
                return false;

            var match = true;

            _.each(this.appViewModel.editPropertyFields, function (property, index) {
                var keyField = _this.appViewModel.itemKeyFields[index], targetValue = _.has(data, property) ? data[property] : _.has(data, keyField) ? data[keyField] : undefined, lookupData = ag.lookups.lookupData[property];

                // if this is an enum lookup data
                if (lookupData) {
                    var temp = ko.unwrap(lookupData.data);
                    _.each(temp, function (lookupItem) {
                        // find the corresponding text
                        if (lookupItem.text == targetValue) {
                            // translate to string
                            targetValue = lookupItem.value;
                            return false;
                        }
                    });
                }
                if (targetValue != ko.unwrap(_this.appViewModel.editingItem[property])) {
                    match = false;
                }
                if (_this.fuzzyCompareLogic(targetValue, ko.unwrap(_this.appViewModel.editingItem[property]))) {
                    match = true;
                }

                if (!match)
                    return false;
            });

            return match;
        };

        BrowseGridViewModel.prototype.fuzzyCompareLogic = function (s1, s2) {
            if (s1 == s2)
                return true;

            if (!s1 && s2 && _.isString(s2))
                return s2.toLowerCase() == "none";

            if (!s2 && s1 && _.isString(s1))
                return s1.toLowerCase() == "none";

            return false;
        };
        BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN = "keepBrowseWindowOpen";
        return BrowseGridViewModel;
    })(GridViewModel);
    ag.BrowseGridViewModel = BrowseGridViewModel;
})(ag || (ag = {}));
