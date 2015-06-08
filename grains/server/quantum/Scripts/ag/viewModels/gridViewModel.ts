module ag 
{
   export module ProcessingHelper
   {
      export function create(initialValue: boolean = false): KnockoutComputed<boolean>
      {
         var processingCount = ko.observable(!initialValue ? 0 : 1);
         return ko.computed<boolean>(
            {
               read: () =>
               {
                  return processingCount() > 0;
               },
               write: (value) =>
               {
                  var currentCount = processingCount();
                  if (!value)
                  {
                     if (currentCount > 0)
                        processingCount(currentCount - 1);
                  }
                  else
                     processingCount(currentCount + 1);
               },
               owner: this
            });
      }
   }

   export interface IStyleItem
   {
      // Key
      k: number;
      // Style Array
      s: Array<GridStyleType>;
   }

   function getDefaultOptions(options)
   {
      var result = options || {};
      result.serviceUrl = result.serviceUrl || utils.getDefaultServiceUrl();
      result.itemKey = result.itemKey || "";
      result.selectionMode = result.selectionMode || SelectMode.None;

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
   // topics          - subscribe certain topic to enable RTU

   export class GridViewModel 
   {
      methodUtils: dom.MethodUtils = ag.dom.MethodUtils.instance();
      id: string;
      initializing: boolean;
      isVisible = ko.observable(true);
      isEnabled: KnockoutComputed<boolean>;
      isEditorReadOnly: KnockoutObservable<boolean>;
      views: ViewsViewModel;
      editor: GridEditorViewModel;
      items = ko.observableArray();
      menuCommands: any = {};
      itemKey: string;
      displayGrid = ko.observable(true);
      selected: SelectedViewModel;
      pager: Pager;
      chart: VisualisationViewModel;
      columnsEditor: ColumnsEditorViewModel;
      canPage: KnockoutComputed<boolean>;
      usedViewFilters: KnockoutComputed<any>;
      search: SearchViewModel;
      sorter: SorterViewModel;
      columns: KnockoutComputed<any>;
      showColumnConfigDialog = ko.observable(false);
      net: utils.Network;
      showList = ko.observable(false);
      responseOnly: any;
      postOnly: any;
      isEditable: KnockoutObservable<any>;
      allViewFilters: KnockoutObservableArray<any>;
      canSelect: any;
      typeMetaDataUrl: any;
      dependencyProxy: any;
      private dependentColumns = ko.observableArray();
      addLookupActionName: string;
      addPostActionName: string;
      removePostActionName: string;
      canRemove: KnockoutObservable<boolean>;
      canEdit: KnockoutObservable<boolean>;
      doColumnsUpdate: boolean = true;
      getCellLinks: (bindingContext: KnockoutBindingContext) => string[];
      quickMenuItems = [];
      defaultQuickMenuItems = {};
      quickMenuItem = ko.observable();
      canSelectAll = true;
      grids = {};
      active: Array<any>;
      isActive: KnockoutComputed<any>;
      refreshAllGridsWrapper: Function = null;
      isLoading = ProcessingHelper.create();
      labels = {};
      refreshWrapper: Function;
      actions: any;
      viewModel: any;
      columnDisplayNames = ko.observable();
      noItems: KnockoutComputed<boolean>;
      styleDictionary = ko.observableArray<IStyleItem>();
      topics: string[];
      disableLinksTo = false;
      
      constructor(public options: any)
      {
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

         this.isActive = ko.computed(() =>
         {
            if (!this.active || !$.isArray(this.active))
               return true;

            var result = $.grep(this.active, (item) =>
            {
               return item();
            });

            return result.length == this.active.length;
         });

         this.isActive.subscribe((newValue) =>
         {
            if (newValue && this.refreshWrapper != null)
            {
               this.clearTheRefreshWrapper();
            }
         });

         this.id = options.listMetaData.id || undefined;

         // It's possible that there are no views for this grid, i.e., grid metadata will
         // be provided with the data.
         this.views = new ViewsViewModel(
            (options.listMetaData && options.listMetaData.views) || [],
            (options.listMetaData && options.listMetaData.viewTables) || [],
            options.typeName,
            this.isLoading);

         if (options.listMetaData.topics)
            this.topics = options.listMetaData.topics.split(',');

         this.selected = new SelectedViewModel(options.selectionMode, options.itemKey);

         // Only create columns editor when there is a columnsEditorOptions
         if (options.columnsEditorOptions != null)
            this.columnsEditor = new ColumnsEditorViewModel(this.views.selected, options.columnsEditorOptions);

         this.sorter = new SorterViewModel(this.views, false);
         this.sorter.gridSortOn(options.itemKey);

         this.pager = new Pager({ updating: this.isLoading, pageSize: <number>options.pageSize, activeSortColumns: this.sorter.activeSortFields });
         this.canPage = ko.computed(() => 
         {
            return this.views.selectedIsGrid() && this.pager.hasPages();
         });
         this.search = new SearchViewModel();
         this.chart = new VisualisationViewModel(this.views.selected);

         this.columns = ko.computed(() =>
         {
            var columns = this.selected.columns().concat(this.views.visibleColumns());

            if (options.hasDependentColumns)
            {
               columns = _.filter(columns, (column: any) =>
               {
                  return ko.unwrap(column.dataType) === "checkbox"
                     || _.contains(this.dependentColumns(), ko.unwrap(column.key));
               });
            }

            // Make a copy of the columns (so when display names are changed, the field selector
            // names remain unchanged.
            columns = ko.unwrap(ko.mapping.fromJS(ko.mapping.toJS(columns)));

            var columnDisplayNames = ko.unwrap(this.columnDisplayNames);
            if (columnDisplayNames)
            {
               _.each(columns, (column: any) =>
               {
                  var key = ko.unwrap(column.key);
                  var displayName = columnDisplayNames[key];
                  if (displayName)
                  {
                     column.displayName(displayName);
                  }
               });
            }

            return columns;
         });

         this.usedViewFilters = ko.computed(() =>
         {
            return this.views.selected() && this.views.selected().filters;
         });

         this.sorter.changed.subscribe(() =>
         {
            this.pager.navigateToPage(1);
         });

         this.search.text.subscribe((newValue) =>
         {
            // Reset to first Page
            this.pager.navigateToPage(1);

            if (!newValue)
               this.selected.reset();
         });

         this.net = new utils.Network(
            {
               area: ag.area,
               controller: ag.controller,
               responseOnly: this.responseOnly,
               postOnly: this.postOnly
            });

         this.allViewFilters = ko.observableArray(options.viewFilters || []);

         // Use a passed in metaObservable for the associated property on 
         // the main ViewModel (if one exists) as a proxy for dependencies
         this.dependencyProxy = options.dependencyProxy;
         if (this.dependencyProxy)
         {
            this.dependencyProxy.subscribe((newValue) =>
            {
               // If we are not loading and there is a grid response-like value
               if (!this.isLoading() && newValue && newValue.data && $.isArray(ko.unwrap(newValue.data)) && newValue.gridViewOptions)
                  this.loadGridData(newValue);
            });

            this.dependencyProxy.isVisible.subscribe((newValue) =>
            {
               this.isVisible(newValue);
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

         this.isEnabled = ko.computed(() =>
         {
            return !this.isEditorReadOnly() && (!this.dependencyProxy || this.dependencyProxy.isAvailable());
         });

         this.views.selected.subscribe(() =>
         {
            // Clear Search Term before switching to another view
            this.search.clear();

            // Reset to first Page
            this.pager.navigateToPage(1);

            this.selected.reset();
         });

         ko.computed(() =>
         {
            this.refreshData();
         },
            this).extend({ rateLimit: ag.utils.getRateLimitOption() });

         this.noItems = ko.computed(() =>
         {
            return this.items().length === 0;
         });

         this.views.selected().appliedFields.subscribe(() =>
         {
            // Reset to first Page when filter is applied
            this.pager.navigateToPage(1);
         });

         // Only create editors when editable
         if (options.isEditable)
            this.editor = new GridEditorViewModel(this, options);
      }

      clearTheRefreshWrapper()
      {
         // Call the refresh with the original params (in wrapper)
         this.refreshWrapper();

         // Clear the function
         this.refreshWrapper = null;
      }

      isAnythingSelected()
      {
         return this.selected.keys().length > 0 || (this.selected.all() && this.pager.totalItems() > 0);
      }

      isOnlyOneThingSelected()
      {
         return this.selected.keys().length === 1;
      }

      itemIsSelected()
      {
         return this.selected.item();
      }

      quickMenuItemExists() 
      {
         return this.quickMenuItem();
      }

      private getParams(keys: any[])
      {
         var params = this.getGridViewOptions();

         if (this.options.additionalFields != null)
         {
            $.extend(params, utils.getAdditionalFieldsFromModel(
               this.options.additionalFields,
               this.viewModel));
         }

         params.keys = keys;

         return params;
      }

      removeItem(item): JQueryPromise<any>
      {
         return this.itemChange(this.removePostActionName, this.getParams([item[this.itemKey]]));
      }

      itemAdded(items, event, data): JQueryPromise<any>
      {
         var keys = _.map(items, (item) =>
         {
            return item[this.itemKey];
         }),
            params = this.getParams(keys);

         if (data)
            params = $.extend(params, { data: data });

         return this.itemChange(getAreaControllerAction(this.options, this.addPostActionName), params);
      }

      itemsAddedAndNavigateToLastPage(items, event, data): JQueryPromise<any>
      {
         return this.itemAdded(items, event, data).then(() =>
         {
            this.sorter.gridSortOn(''); 
            this.pager.navigateToPage(this.pager.totalPages());
         });
      }

      private itemChange(action, params): JQueryPromise<any>
      {
         this.isLoading(true);

         return this.net.postJson(action, params)
            .done((response) =>
            {
               // Load the response
               this.loadGridData(response);

               // Indicate change to subscribers
               if (this.dependencyProxy)
                  this.dependencyProxy(response);
            })
            .always(() =>
            {
               this.isLoading(false);
            });
      }

      addActionUrl()
      {
         return "{0}{1}/{2}/{3}".format(ag.siteRoot, this.options.area || ag.area, this.options.controller || ag.controller, this.addLookupActionName);
      }

      makeSelectedViewDefault(data)
      {
         this.makeSelectedViewDefaultRequest(data.editingQuery);
      }

      viewFieldLookupSource(): string
      {
         return "/{0}/{1}".format(this.options.serviceUrl, "getviewfields");
      }

      getViewFieldLookupSource()
      {
         return this.viewFieldLookupSource();
      }

      getViewFilters()
      {
         return this.views.selected().filters;
      }

      updateViewFilters(items)
      {
         utils.pushApply(this.views.selected().filters, $.map(items, (filter) =>
         {
            return filters.buildFilter(filter, true);
         }));
      }

      reset(): GridViewModel
      {
         // Clear data and related state should only really be used 
         // when wiping the slate clean, not between pages or search results.
         // clearData() should be used in those cases.
         this.search.clear();
         this.selected.reset();  // clear any current selection(s)
         this.items.removeAll();
         this.pager.navigateToPage(1);
         this.pager.reset();
         if (this.editor)
            this.editor.reset();

         this.refreshWrapper = this.refreshData;

         return this;
      }

      clearData(): GridViewModel
      {
         this.selected.reset();  // clear any current selection(s)
         this.items.removeAll();

         return this;
      }

      refresh(revert?: boolean, additionalParams?: any, invokeImmediately: boolean = false)
      {
         if (invokeImmediately)
            this.refreshData(revert, additionalParams);
         else
            // Let the methodUtils to handle the situation if refresh has been called too many times in
            // a short period, so it will only fire once.
            // Refresh data including resetting
            this.methodUtils.debounce(this.refreshData, this, revert, additionalParams);
      }

      loadData(gridViewDataResponse)
      {
         // Load results
         this.items(gridViewDataResponse.data || []);

         this.pager.updateFromResponse(gridViewDataResponse);
         
         this.dependentColumns(gridViewDataResponse.gridViewOptions.columns);

         if (gridViewDataResponse.gridViewOptions.selections)
            this.selected.load(gridViewDataResponse.gridViewOptions.selections);

         this.selected.updateSelectedItem(this.items());

         if (gridViewDataResponse.gridViewOptions.styleDictionary)
            this.styleDictionary(<Array<IStyleItem>>gridViewDataResponse.gridViewOptions.styleDictionary);
      }

      toggleList()
      {
         this.showList(!this.showList());

         // Refresh the grid everytime it is shown
         if (this.showList())
            this.refresh(undefined, undefined, true);
         else
            this.views.showConfigure(false);
      }

      showConfigureList()
      {
         this.showList(true);
         this.views.toggleConfigure();
      }

      viewRequest(type: string)
      {
         var params = this.saveRequestData && this.saveRequestData();
         var action: ViewRequestType;
         
         if (this.views.selected().isSystem() || !this.views.selected().hasWritePermission())
         {
            switch (type)
            {
               case "new":
                  action = ViewRequestType.CreateTypeView;
                  break;
               case "copy":
                  this.views.copy();
                  return;
               case "save":                  
                  var key = ko.unwrap(this.views.selected().key);                                     
                  this.views.copy();
                  // Reload & update the "source view" (system/default) from server otherwise the default values of this view will be changed
                  this.views.getViewRequest(key).then((result) =>
                  {
                     this.views.updateView(result);
                  });
                  
                  action = ViewRequestType.SaveTypeView;
                  this.views.showConfigure(false); //close configure panel
                  break;
               case "delete":
                  return;
               default:
                  throw new Error('Invalid view request type.');
            };
         }
         else
         {
            switch (type)
            {
               case "new":
                  action = ViewRequestType.CreateTypeView;
                  break;
               case "copy":
                  this.views.copy();
                  return;
               case "save":
                  if (!this.views.selected().key())
                     action = ViewRequestType.SaveTypeView;
                  else
                     action = ViewRequestType.EditView;
                  this.views.showConfigure(false); //close configure panel
                  break;
               case "delete":
                  this.views.deleteView(this.views.selected());
                  return;
               default:
                  throw new Error('Invalid view request type.');
            };
         }
         this.processViewRequest(params, action);
      }

      saveRequestData(): any
      {
         return {};
      }

      removeViewFilter(item)
      {
         this.views.selected().filters.remove(item);
      }

      // Default implementation - usually overridden
      getItems(params, queryString?: string, reset?: boolean): JQueryPromise<any>
      {
         var url = "/{0}/{1}{2}".format(
            this.options.serviceUrl,
            this.options.action,
            this.buildQuery(ko.toJS(params)));

         return this.net.getJson({ url: url }, "").then((result) =>
         {
            this.loadGridData(result, reset);
         });
      }

      refreshData(revert?: any, additionalParams?: any, reset?: boolean): JQueryPromise<any>
      {
         // Observes changes to variables and invokes a request
         // when changes occur, with throttling enabled multiple
         // changes can be made and a single request will be made
         var params = this.getGridViewOptions(),
            deferred = $.Deferred(); // Our promise to be returned

         //console.log(this.options.name || "Browse/List", "From refreshWrapper: " + !!(this.refreshWrapper != null), params, "init: " + this.initializing, "defer: " + this.options.loadImmediately);//, arguments.callee);

         if (revert)
            params.revert = true;

         if (additionalParams && $.isPlainObject(additionalParams))
            $.extend(params, additionalParams);

         // First time the computed is evaluated we are simply 
         // initializing values and don't want to call getItems()
         // unless loadImmediately is set to true
         if (this.initializing && !this.options.loadImmediately)
         {
            this.initializing = false;
            return deferred.resolve();
         }

         // Load the items - needs to be wrapped in setTimeout to 
         // avoid new dependencies being added to the computed
         window.setTimeout(() =>
         {
            // If we are not active (on a hidden panel such as a tab) then
            // flag that a refresh is required but don't perform the refresh
            // this will be done when the grid becomes active
            if (!this.isActive())
            {
               // Create a wrapper of the original call always allow this code to 
               // execute when not active so the latest set of parameters are recorded
               this.refreshWrapper = () =>
               {
                  this.refreshData(revert, additionalParams, reset);
               };

               this.reset();
               deferred.resolve();

               return;
            }

            // We are loading
            this.isLoading(true);

            // Add callbacks for the returned promise so we can relay them to our promise 
            // (needs to be done this way due to the setTimeout breaking code flow)
            // NOTE: getItems must return a promise
            this.getItems(params, this.buildQuery(ko.toJS(params)), reset)
               .done((result) => { deferred.resolve(result); })
               .fail((result) => { deferred.fail(result); })
               .always(() =>
               {
                  // Load complete
                  this.isLoading(false);
                  deferred.always();
               });
         }, 1);

         return deferred;
      }

      getGridViewOptions(): any
      {
         var params: any =
            {
               page: this.pager.page(),
               pageSize: this.pager.pageSize(),
               pageTargetsCenter: this.pager.pageTargetsCenter(),
               pageTargetsInnerSize: this.pager.pageTargetsInnerSize(),
               pageTargetsEdgeSize: this.pager.pageTargetsEdgeSize(),
               view: this.views.selected() && this.views.selected().clientKey(),
               selections: this.selected.model.peek(),
               searchColumnName: "",
               gridGuid: this.id,
            };

         if (this.doColumnsUpdate)
         {
            $.extend(params, this.sorter.sortOptions());
         }

         // Needed so grid will reload when view is saved or applied.
         var fields = this.views.selected().appliedFields();

         if (this.search.hasText())
         {
            params.searchText = this.search.text();
         }

         return params;
      }

      getGridViewOptionsQueryString(): string
      {
         return this.buildQuery(this.getGridViewOptions());
      }



      selectRow(row)
      {
         this.selected.selectKey(ko.unwrap(row[this.itemKey]));
      }

      buildQuery(viewOptions): string
      {
         var query = "?";
         if (!viewOptions)
            throw new Error("viewOptions argument missing.");

         // Remove any options that are not applicable
         if (!viewOptions.sortOn) delete viewOptions.sortDesc;
         if (!viewOptions.columns) delete viewOptions.columns;
         if (!viewOptions.view) delete viewOptions.view;

         var isFirst = true;
         for (var key in viewOptions)
         {
            var optionValue = viewOptions[key];
            if ($.isArray(optionValue)) optionValue = optionValue.join(" ");

            query += "{0}{1}={2}".format(!isFirst ? "&" : "", encodeURIComponent(key.toLowerCase()), _.isUndefined(optionValue) ? optionValue : encodeURIComponent(optionValue));
            isFirst = false;
         }

         return query;
      }

      loadGridData(gridViewDataResponse: any, reset?: boolean)
      {
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
         if (this.search)
         {
            this.search.searchTerms(gridViewDataResponse.gridViewOptions.searchTerms);
         }         
      }

      customizeActionPayload(payload)
      {
         payload.options = this.getGridViewOptions();
      }

      private processViewRequest(params: any, action: ViewRequestType)
      {
         //var hiddenFields = this.views.getHiddenFields();

         var viewData = ko.mapping.toJS(this.views.selected);

         //if (hiddenFields)
         //   viewData.fields = viewData.fields.concat(hiddenFields);

         // [AG 22/6/2012] Hack: we need to set the operator values on any filter to their string equivalents so they
         // will be bound correctly in MVC - MVC doesn't handle binding integer values to enums by default.
         $.each(viewData.filters, (ind, filter) =>
         {
            filter.operator = filter.operator.toString();
         });

         // Do some additional transformation of lookup filter values
         filters.transformFilters(viewData.filters);

         if (action != ViewRequestType.CreateTypeView)
         {
            // Merge in additional parameters
            params = $.extend({}, viewData, params);
         }

         switch (action)
         {
            case ViewRequestType.EditView:
               this.views.editGridViewRequest(params);
               break;
            case ViewRequestType.SaveTypeView:
               this.views.saveTypeGridViewRequest(params);
               break;
            case ViewRequestType.CreateTypeView:
               this.views.createTypeGridViewRequest(params);
               break;
            default:
               throw new Error("Invalid view request type.");
         }
      }

      makeSelectedViewDefaultRequest(query)
      {
         var viewData = { queryKey: query.key(), viewKey: this.views.selected().key() };

         this.net.postJson("setdefaultview", viewData).then(() =>
         {
            // set the default view on the current query
            query.defaultView(viewData.viewKey);
         });
      }

      // Export a Crystal Report to PDF
      exportCrystalReport(reportName)
      {
         var selectedItemKeyValue = null;

         if (this.selected.item() != undefined && this.selected.itemKey != undefined)
         {
            selectedItemKeyValue = this.selected.item()[this.selected.itemKey];
         }

         utils.exportCrystalReport(this.options.serviceUrl, reportName, selectedItemKeyValue, ag.utils.getPageIdToken());
      }

      // Grid search call back function
      gridSearch(action, data)
      {
         if (data.gridViewOptions.searchText != null)
         {
            // Populate search text with "Filtered search value" from server
            this.search.text(data.gridViewOptions.searchText);
         }
         else
         {
            // Populate search text with "selected cell value"
            this.search.text(ko.unwrap(action.data[action.columnName]));
         }

      }

      // Get the selected column's name on grid
      gridSelectedCell(action, data)
      {
         if (action.columnName != null)
         {
            data.options.searchColumnName = action.columnName;
         }
      }
   }

   export function getAreaControllerAction(options: any, actionName: string): any
   {
      return options.controller ?
         { controller: options.controller, action: actionName, area: options.area } :
         actionName;
   }

   export function createGridViewModel(options, editorOptions)
   {
      var gridOptions: any = $.extend({}, options, editorOptions);

      gridOptions.loadImmediately = false;
      gridOptions.noItemsMessage = strings.noItems;
      gridOptions.pageSize = options.pageSize;

      var grid = new GridViewModel(gridOptions);

      grid.getItems = (params) =>
      {
         if (grid.viewModel)
         {
            var viewModelParams = {};

            if (options.additionalFields && options.additionalFields.length > 0)
            {
               var additionalFields = options.additionalFields.split(",");

               // Retrieve the additionalFields off the viewModel to be supplied as params
               _.each(additionalFields, (field: string) =>
               {
                  setProperty(viewModelParams, field, getProperty(grid.viewModel, field));
               });
            }
            else if (options.includeModel)
            {
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

         return grid.net.getJson(action, params).done((response) =>
         {
            grid.loadGridData(response);
         });
      };

      //---------------------------------
      // Methods to support pivot display
      //---------------------------------
      (<any>grid).editingQuery = ko.mapping.fromJS({
         isSystem: true,
         isDefault: true,
         defaultView: "Default"
      });

      (<any>grid).activeReport = ko.observable();
      grid.showList = ko.observable(true);

      // TODO: move these into a separate view model
      (<any>grid).crystalViewUrl = ko.observable();
      (<any>grid).crystalViewerLoading = ko.observable(true);
      (<any>grid).crystalLoaded = () => { (<any>grid).crystalViewerLoading(false); };
      (<any>grid).scrollCrystalViewerIntoView = ko.observable(false);

      (<any>grid).isSelectedViewDefault = ko.computed(() =>
      {
         return grid.views.selected() &&
            // view  is explicitly set as the default for this query
            (grid.views.selected().key() === (<any>grid).editingQuery.defaultView() ||
            // query is the default and this is the default view
            (<any>grid).editingQuery.isDefault() && grid.views.selected().isDefault());
      });

      grid.viewFieldLookupSource = () =>
      {
         return "/{0}/{1}".format(options.typeMetaDataUrl || options.serviceUrl, "getviewfields");
      };

      (<any>grid).saveReportView = () =>
      {
         return grid.viewRequest('save');
      };

      grid.saveRequestData = () =>
      {
         return { typeName: options.typeName };
      };

      //grid.selectView = (view) =>
      //{
      //   var selected = grid.views.selected();

      //   // To prevent object observable trigger when the same value is selected
      //   if (selected.key() !== view.key() || selected.name() !== view.name())
      //      grid.views.setSelected(view);
      //};

      (<any>grid).pivot = new PivotViewModel(
         null, /* Effectively only one query */
         grid.views.selected,
         null, /* Effectively only one current report */
         grid,
         {
            serviceUrl: utils.normalizeUrl(serviceUrl)
         });

      grid.selected.keys.subscribe((newValue) =>
      {
         var selections = ko.unwrap(options.selections);
         if (selections)
         {
            selections.keys(newValue);
         }
      });

      grid.selected.all.subscribe((newValue) =>
      {
         var selections = ko.unwrap(options.selections);
         if (selections)
         {
            selections.all(newValue);
         }
      });

      return grid;
   };

   // Creates GridViewModels for each item in the metadataArray and returns the names of the properties
   export function createGridViewModelsFromMetadata(viewModel, metadataArray, model, options, readOnlyObservable: KnockoutObservable<boolean>, actionModel?, skipPropertyCheck = false)
   {
      // Grids are added to the ViewModel.grids property
      var grids = viewModel.grids = viewModel.grids || {},
         gridProperties = [],
         itemModel = actionModel || model,
         gridViewModel;

      _.each(metadataArray, (meta, key?: string) =>
      {
         if (itemModel && getProperty(itemModel, key))
         {
            gridViewModel = createGridViewModelFromMetadata(meta, options, model, viewModel, actionModel, itemModel, key, readOnlyObservable);

            gridProperties.push(key);

            // Assign to the grids property on the viewModel
            setProperty(grids, key, gridViewModel);
         }
         else if (itemModel)
         {
            var array = key.split("."),
               keyToTry,
               value;

            for (var i = array.length - 2; i >= 0; i--)
            {
               keyToTry = array.slice(0, i + 1).join('.');
               value = getProperty(itemModel, keyToTry);

               if (value)
                  break;
            }
         }
      });

      return gridProperties;
   }

   function getActiveObservables(active, viewModel)
   {
      // Get the observable(s) for the tab(s) this grid belongs to (if any)
      var activeObservables = [],
         tab;

      // Check viewModel contains some tabs before continuing
      if (!viewModel.tabs)
         return activeObservables;

      if (active && $.isArray(active))
      {
         $.each(active, (index, item) =>
         {
            tab = getProperty(viewModel, item);
            if (tab)
               activeObservables.push(tab);
         });
      }

      return activeObservables;
   }

   function createGridViewModelFromMetadata(meta, options, model, viewModel, actionModel, itemModel, key, readOnlyObservable: KnockoutObservable<boolean>)
   {
      var gridOptions: any =
         {
            active: getActiveObservables(meta.active, viewModel),
            typeName: meta.typeName,
            itemKey: meta.itemKey,
            pageSize: meta.pageSize,
            selectionMode: meta.selectionMode,
            canSelect: meta.canSelectProperty,
            canSelectAll: meta.canSelectAll,
            viewModel: actionModel || model, /* Should be editingItem, or the model for the action */
            listMetaData: meta,
            additionalFields: meta.additionalFields,
            includeModel: _.isUndefined(meta.includeModel) ? true : meta.includeModel,
            name: meta.name,
            itemDisplayName: meta.itemDisplayName,
            isEditable: meta.isEditable,
            canEdit: meta.canEdit,
            dependencies: meta.dependencies,
            dependencyProxy: getProperty(itemModel, key),
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

      var gridViewModel = createGridViewModel(gridOptions, {}/*editing options*/);

      if (meta.typeViews)
         createGridViewModelsFromMetadata(gridViewModel, meta.typeViews, model, options, readOnlyObservable, actionModel, true);

      if (meta.selections)
         gridOptions.selections = getProperty(itemModel, meta.selections);

      return gridViewModel;
   }

   // Update Grids based on incoming data
   export function updateGrids(data, grids)
   {
      if (!$.isEmptyObject(grids) && data)
      {
         // Check if data was delivered with the response for grids 
         // directly rather than requiring a seperate call 
         // (for initial data, paging, sorting and filtering will require additional calls)
         var gridDictionary = utils.flattenDictionary(grids, (y) => y instanceof ag.GridViewModel);
         $.each(gridDictionary, (property, gridViewModel: GridViewModel) =>
         {
            var gridResponse = getProperty(data, property);

            // Clear current state
            gridViewModel.reset();

            if (gridResponse &&
               gridResponse.data &&
               $.isArray(gridResponse.data) &&
               gridResponse.gridViewOptions)
            {
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

   //
   export class BrowseGridViewModel extends GridViewModel
   {
      static KEEP_BROWSE_WINDOW_OPEN: string = "keepBrowseWindowOpen";

      appViewModel: AppViewModel;

      constructor(public options: any, parent: AppViewModel)
      {
         super(options);
         this.appViewModel = parent;
         this.initializeBrowseElement($('body').find("#list.browse"));
      }

      initializeBrowseElement(browseElement: JQuery): void
      {
         // Exclude the all the buttons from browse element except browse toggle
         // will close the browse window
         var buttonToolBarLinks = browseElement.find("div.btn-toolbar.shift > div > a");
         if (buttonToolBarLinks)
         {
            _.each(buttonToolBarLinks, (toolBarLink: HTMLElement) =>
            {
               var $toolBarLink = $(toolBarLink);
               if ($toolBarLink.attr("id") != "browseToggle")
                  $toolBarLink.data(BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN, false);
            });
         }

         // If the browse window is on the stage and event is not coming from the 
         // browse container hide the browse window
         ko.utils.registerEventHandler(".page-container", "click", (event: JQueryEventObject) =>
         {
            if (this.showList() == false)
               return;

            if (!$(event.target).data(BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN))
            {
               this.showList(false);
               this.views.showConfigure(false);
            }
         });

         ko.utils.registerEventHandler(browseElement, "click", (event: JQueryEventObject) =>
         {
            var $target = $(event.target);

            if (!_.has($target.data(), BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN))
               $target.data(BrowseGridViewModel.KEEP_BROWSE_WINDOW_OPEN, true);
         });
      }

      toggle(): void
      {
         this.toggleList();

         // if list hidden, we don't need to do any here
         if (!this.showList())
            return;

         // set focus
         $('input[type="search"]').first().focus();
      }

      public isCurrentEditingItem(data): boolean
      {
         if (this.appViewModel.isNewItem())
            return false;

         var match = true;

         _.each(this.appViewModel.editPropertyFields, (property: string, index: number) =>
         {
            var keyField = this.appViewModel.itemKeyFields[index],

               // seach for property value
               targetValue = _.has(data, property) ? data[property] :
               // search for itemKey value
               _.has(data, keyField) ? data[keyField] : undefined,

               lookupData = ag.lookups.lookupData[property];

            // if this is an enum lookup data
            if (lookupData)
            {
               var temp = ko.unwrap(lookupData.data);
               _.each(temp, (lookupItem: any) =>
               {
                  // find the corresponding text
                  if (lookupItem.text == targetValue)
                  {
                     // translate to string
                     targetValue = lookupItem.value;
                     return false;
                  }
               });
            }
            if (targetValue != ko.unwrap(this.appViewModel.editingItem[property]))
            {
               match = false;
            }
            if (this.fuzzyCompareLogic(targetValue, ko.unwrap(this.appViewModel.editingItem[property])))
            {
               match = true;
            }

            if (!match)
               return false;
         });

         return match;
      }

      private fuzzyCompareLogic(s1: string, s2: string): boolean
      {
         if (s1 == s2)
            return true;

         if (!s1 && s2 && _.isString(s2))
            return s2.toLowerCase() == "none";

         if (!s2 && s1 && _.isString(s1))
            return s1.toLowerCase() == "none";

         return false;
      }
   }


}
