interface IReportingViewModelOptions extends IViewModelOptions
{
   analysisFieldQueryColumns: Array<any>;
   browseEditors: any;
   dependencies: any;
   editableLookups: Array<any>;
   editingQuery: any;
   gridOptions: any;
   pageTitle: string;
   queries: Array<any>;
   resultsAreEditable: boolean;
   fieldCategories: any;
   supportPreviousRun: boolean;
   applicationHeaders: any;
}

interface IReport
{
   query: any;
}

interface IReportingQuery
{
   filters: KnockoutObservableArray<any>;
   analysisFields: KnockoutObservableArray<any>;
   analysisFieldCaptions: KnockoutObservableArray<string>;
   key: KnockoutObservable<string>;
   filterGroup: any;
   reports: KnockoutObservableArray<any>;
   defaultView: KnockoutObservable<string>;
   isDefault: KnockoutObservable<boolean>;
   isSystem: KnockoutObservable<boolean>;
   isPersonal: KnockoutObservable<boolean>;
   name: KnockoutObservable<string>;
   expiryStrategy: KnockoutObservable<number>;
   expiryCount: KnockoutObservable<number>;
   hasWritePermission: boolean;
}

interface IReportingApplicationOptions
{
   activityId: string;
   reportNumber: KnockoutObservable<number>;
}

interface IReportingResponse
{
   data: any;
   gridViewOptions: any;
   isPivoted: boolean;
   isChart: boolean;
   query: any;
   report: IReport;
   view: any;
}

interface IReportNavigationParams
{
   query: string;
   preview: boolean;
   report: string;
}

module ag
{
   export class ReportingViewModel extends BaseViewModel
   {
      // Constants
      static defaultKey = "-1";
      static newQueryKey = "new";
      static defaultQueryKey = "Default";

      // For tracking views with stale results, e.g., the view has changed and cached results for
      // that view need to be invalidated.
      private viewsWithStaleResults = {};

      // For tracking properties of query option that should be re-validated when the view is re-selected
      // Key is the query key, Value is the properties that should be re-revalidated
      private queryOptionsToRevalidate: { [key: string]: string[] } = {};

      // Command
      addReportCommand: KoliteCommand;
      previewReportCommand: KoliteCommand;
      runReportCommand: KoliteAsyncCommand;
      saveConfigurationCommand: KoliteCommand;
      copyActiveQueryCommand: KoliteAsyncCommand;
      runPreviewReportCommand: KoliteAsyncCommand;
      deleteActiveQueryCommand: KoliteAsyncCommand;
      keepReportCommand: KoliteAsyncCommand;
      exportReportCommand: KoliteCommand;

      supportPreviousRun: boolean;
      
      breadcrumb: any;
      grids: any = {};
      fieldCategories: any;
      reportFilters = [];
      lookupEditors = {};
      browseEditors = {};

      grid: GridViewModel;
      pivot: PivotViewModel;
      profile: ProfileViewModel;
      views: ViewsViewModel;
      editingQuery: IReportingQuery;
      analysisFields: AnalysisFieldViewModel;
      applicationOptions: IReportingApplicationOptions;

      runViewAction = "runView";
      copyAction: string;
      queriesLookupUrl: string;
      queryFieldLookupSource: string;
      currentGridViewOptions = null;

      pageTitle: KnockoutComputed<any>;
      previewing: KnockoutComputed<any>;
      sortedQueries: KnockoutComputed<any>;
      queries: KnockoutObservableArray<any>;
      usedQueryFilters: KnockoutComputed<any>;
      usedQueryParameters: KnockoutComputed<any>;
      isSelectedViewDefault: KnockoutComputed<any>;
      reportRunningComputed: KnockoutComputed<any>;
      
      reportParameterSummary = ko.observableArray();
      filterOrder = ko.observableArray();
      selectedAnalysisFieldQueryColumns: KnockoutObservableArray<any>;
      
      folder = ko.observable();
      queryName = ko.observable();
      crystalViewUrl = ko.observable();
      activeReport = ko.observable<any>();
      accessPermissions = ko.observable();
      exportFileType = ko.observable("csv");
      selectedQuery: KnockoutObservable<any>;
      
      showAdvanced = ko.observable(false);
      showParameters = ko.observable(true);
      reportRunning = ko.observable(false);
      crystalViewerLoading = ko.observable(true);
      showResultImmediately = ko.observable(true);
      scrollCrystalViewerIntoView = ko.observable(false);
      showConfirmProcessingDialog = ko.observable(false);
      showConfiguration = ko.observable(false).extend({ notify: "always" });
      isConfigurationLoaded = ko.observable(false);
      isQuerySelectorLoaded = ko.observable(false);
      expiryCountDefaults = [1, 3, 0];

      // An alert message will be displayed & save Query/View will be disabled if Security By User Writable is false
      hasWritePermission = ko.observable(true);   // query.has or view.filters[x].isSecurityByUserWritable 
            
      constructor(public options: IReportingViewModelOptions)
      {
         super(options);

         this.supportPreviousRun = options.supportPreviousRun;

         // Subscribe to notifications that indicate 
         // when long-running reports have completed.
         this.subscribeToNotifications();

         this.queries = ko.mapping.fromJS(options.queries || [],
         {
            key: (item) =>
            {
               return ko.unwrap(item.key);
            }
         });

         this.sortedQueries = ko.computed(() =>
         {
            return (<any>this.queries).slice().sort(this.sortQueries);
         });

         this.editingQuery = ko.mapping.fromJS(options.editingQuery || null);

         this.usedQueryFilters = ko.computed(() =>
         {
            return this.editingQuery.filters();
         });

         this.usedQueryParameters = ko.computed(() =>
         {
            return this.editingQuery.filters().filter((filter) =>
            {
               return filter.isParameter();
            });
         });

         this.analysisFields = new AnalysisFieldViewModel(this.editingQuery, options.serviceUrl);

         // Initialise the selected query with the default query 
         this.selectedQuery = ko.observable(this.getDefaultQuery());

         // Compute the page title based on the selected query
         this.pageTitle = ko.computed(() =>
         {
            return this.getPageTitle();
         });

         this.queryFieldLookupSource = "/{0}/{1}".format(options.serviceUrl, "getqueryfields");
         this.queriesLookupUrl = "/{0}/{1}".format(options.serviceUrl, "getqueries");

         this.previewing = ko.computed(() =>
         {
            return this.activeReport() &&
               ko.isObservable((<any>this.activeReport()).preview) &&
               (<any>this.activeReport()).preview();
         });

         // Extend ourselves with grid view model functionality
         this.grid = this.createGridViewModel();

         // Always show the results list for inquiries
         this.grid.showList(true);

         // TODO: these eventually need to be removed
         this.views = this.grid.views;
         this.pivot = this.createPivot(options);

         // Subscribe to changes on a property defined in the GridViewModel
         this.views.selected.subscribe((newValue) =>
         {
            // Hide the Configuration area for Crystal Views
            // and make sure the Pivot is hidden
            if (newValue && newValue.viewType() === 1)
            {
               this.views.showConfigure(false);
               this.pivot.hide();
            }

            // Get the new viewKey and the current default
            var viewKey = ko.unwrap(newValue.key),
               defaultViewKey = this.editingQuery.defaultView;

            // Set the viewKey onto the query if a saved 
            // view and not the same as the default
            if (viewKey && viewKey !== defaultViewKey())
               defaultViewKey(viewKey);
         });
        
         this.isSelectedViewDefault = ko.computed(() =>
         {
            return this.views.selected() &&
               // view  is explicitly set as the default for this query
               (this.views.selected().key() === this.editingQuery.defaultView() ||
               // query is the default and this is the default view
               this.editingQuery.isDefault() && this.views.selected().isDefault());
         });         

         this.fieldCategories = options.fieldCategories || {};

         this.showConfiguration.subscribe(newValue =>
         {
            if (newValue)
               this.isConfigurationLoaded(true);
         });

         this.queryAccessPermission();
      }

      public updateExpiryStrategy(data)
      {
         // Set defaults for expiry strategy based 
         // on Public vs Private queries
         var expiryStrategy = 0;

         if (this.editingQuery.isPersonal())
            expiryStrategy = 1;

         this.editingQuery.expiryStrategy(expiryStrategy);
         this.editingQuery.expiryCount(this.expiryCountDefaults[expiryStrategy]);         

         return true;
      }

      public resetExpiryStrategy(data)
      {
         // Reset expiry count based on strategy
         this.editingQuery.expiryCount(this.expiryCountDefaults[this.editingQuery.expiryStrategy()]);
         return true;
      }

      public getPageTitle(): string
      {
         var title = (this.selectedQuery() ? this.selectedQuery().name() : this.options.pageTitle);

         // Fall back to page title defined in the view when it is the default query
         if (title === ReportingViewModel.defaultQueryKey)
            title = this.options.pageTitle;

         return title;
      }

      private subscribeToNotifications()
      {
         PubSub.subscribe(Notifications.notificationRecievedTopic, (message, notification: Notification) =>
         {
            // If we have a recieved a notification intended 
            // for us and it is in a completed state, action it
            if (!notification.isForCurrentPage() || notification.inProgress())
               return;

            // Indicate a report is running (show result checkbox has visibility bound to this)
            this.reportRunning(false);

            // Clear any success messages (such as "Report started...")
            messages.clearSuccess();

            // If the user has indicated they would like to see the result immediately show it
            if (this.showResultImmediately())
               this.tryOpenReportFromNotification(notification);
         });

         PubSub.subscribe(Notifications.notificationActionedTopic, (message, notification: Notification) =>
         {
            // If we are able to action the notification, mark as handled to stop further action
            if (notification.pageCanAction() && this.tryOpenReportFromNotification(notification))
               notification.handled = true;
         });
      }

      private tryOpenReportFromNotification(notification: Notification): boolean
      {
         if (!notification.data)
            return false;

         var query = notification.data.query,
            report = notification.data.report;

         if (!isNullUndefinedOrEmpty(query) && !isNullUndefinedOrEmpty(report))
         {
            this.navigate(query, report);
            return true;
         }
      }

      createPivot(options): PivotViewModel
      {
         return new PivotViewModel(
            this.selectedQuery,
            this.views.selected,
            this.activeReport,
            this.grid,
            options);
      }

      // [BN 18/07/2012] Show default query first, followed by the rest ordered by name
      sortQueries(x, y): number
      {
         var xIsSystem = ko.unwrap(x.isSystem),
            yIsSystem = ko.unwrap(y.isSystem),
            xName = ko.unwrap(x.name).toLowerCase(),
            yName = ko.unwrap(y.name).toLowerCase();

         if (xIsSystem) { return -1; }
         if (yIsSystem) { return 1; }

         if (xName < yName) { return -1; }
         if (xName > yName) { return 1; }

         return 0;
      }

      updateQueryFilters(items)
      {
         // The passed items array is a list of new filters to add to the existing collection
         utils.pushApply(this.editingQuery.filters, $.map(items, (item) =>
         {
            return filters.buildFilter(item, true);
         }));
      }

      getQueryFilters()
      {
         return this.editingQuery.filters;
      }

      toggleBetweenFilterTypes(item)
      {
         item.isParameter(!item.isParameter());
      }

      removeQueryFilter(item)
      {
         this.editingQuery.filters.remove(item);
      }

      getQueryFieldLookupSource()
      {
         return this.queryFieldLookupSource;
      }

      getViewFieldLookupSource()
      {
         return this.grid.viewFieldLookupSource();
      }

      getGridFieldLookupRequestData()
      {
         return _.extend({
            selectedQueryFields: this.extractQueryFields(this.views.selected().fields),
         }, this.getBaseLookupRequestData());
      }

      getGroupRowsByLookupRequestData()
      {
         return _.extend({
            selectedQueryFields: this.extractQueryFields(this.views.selected().groupRowsBy),
            excludeKeys: this.extractFieldKey(this.views.selected().groupColumnsBy, this.views.selected().aggregateOn),
         }, this.getBaseLookupRequestData());
      }

      getGroupColumnsByLookupRequestData()
      {
         return _.extend({
            selectedQueryFields: this.extractQueryFields(this.views.selected().groupColumnsBy),
            excludeKeys: this.extractFieldKey(this.views.selected().groupRowsBy, this.views.selected().aggregateOn),
         }, this.getBaseLookupRequestData());
      }

      getAggregateOnLookupRequestData()
      {
         return _.extend({
            selectedQueryFields: this.extractQueryFields(this.views.selected().aggregateOn),
            excludeKeys: this.extractFieldKey(this.views.selected().groupColumnsBy, this.views.selected().groupRowsBy),
         }, this.getBaseLookupRequestData());
      }

      getChartAggregateOnLookupRequestData()
      {
         return _.extend({
            dataTypes: this.grid.chart.valueDataTypes()
         }, this.getAggregateOnLookupRequestData());
      }

      getChartGroupRowsByLookupRequestData()
      {
         return _.extend({
            dataTypes: this.grid.chart.groupByDataTypes()
         }, this.getGroupRowsByLookupRequestData());
      }

      getProfileByLookupRequestData()
      {
         return _.extend({
            dataTypes: [ 'datetime' ]
         }, this.getGroupRowsByLookupRequestData());
      }

      private getBaseLookupRequestData()
      {
         var view = this.views.selected();

         return {
            viewTableKey: ko.unwrap(view.viewTableKey),
            calculatedFields: ko.mapping.toJS(ViewData.getCalculatedFields(view))
         };
      }

      private extractFieldKey(...args: any[])
      {
         return _.union.apply(_, _.map(args, (fieldArray) =>
         {
            return _.pluck(ko.mapping.toJS(fieldArray), 'key');
         }));
      }

      private extractQueryFields(fieldCollection)
      {
         return _.filter(ko.mapping.toJS(fieldCollection), (field: any) =>
         {
            return field.calculatedField === false;
         });
      }

      getQueryFilterFieldLookupRequestData()
      {
         // If we're in a new query, return an empty query key to the filter lookup action so it fetches filter
         // fields from the default query.
         var queryKey = this.editingQuery.key();
         queryKey = queryKey === ReportingViewModel.newQueryKey ? "" : queryKey;

         // We need to pass null values as empty strings to the request otherwise
         // it will be interpreted as "null".
         return {
            queryKey: queryKey || ""
         };
      }

      getViewFilterFieldLookupRequestData()
      {
         return { viewTableKey: ko.unwrap(this.views.selected().viewTableKey) };
      }

      isUnusedQueryFilter(item)
      {
         return !ag.filters.getItemByKey(item, [this.editingQuery.filters()]);
      }

      getQueryFilterKeys()
      {
         return $.map(ko.unwrap(this.editingQuery.filters), (filter) =>
         {
            return ko.unwrap(filter).key();
         });
      }

      saveItem() { return false; }

      init(model)
      {
         ko.utils.extend(this.applicationOptions = <any> this.applicationOptions || {}, ag.mapFromJStoMetaObservable(model, this.isEditorReadOnly));

         if (this.options.applicationHeaders)
            this.setupApplicationHeaders(this.applicationOptions, this.options.applicationHeaders);

         this.typeMetadata = this.options.typeMetadata || {};
         if (this.typeMetadata && !$.isEmptyObject(this.typeMetadata))
         {
            this.options.typeMetaDataUrl = ag.utils.normalizeUrl(this.options.typeMetaDataUrl);

            // Create GridViewModels as required
            ag.createGridViewModelsFromMetadata(this, this.typeMetadata, this.applicationOptions, this.options, this.isEditorReadOnly);

            // If results are editable, override the grid getItems method to use the showReportRequest 
            // method to retrieve results.
            if (this.options.resultsAreEditable)
            {
               this.grids.editableResults.getItems = (params, queryString) =>
               {
                  // Make sure we have an active report and a 
                  // saved view before requesting data
                  if (this.activeReport())
                     return this.showReportRequest(this.activeReport(), queryString, this.previewing());

                  return $.Deferred().resolve();
               };
            }
         }

         if (this.options.editableLookups)
         {
            _.each(this.options.editableLookups, (lookup, key) =>
            {
               if (getProperty(this, key.toString()))
               {
                  var lookupOptions = $.extend(this.options,
                     {
                        name: lookup.name,
                        itemKey: lookup.itemKey,
                        value: getProperty(this, key.toString()),
                        editTitle: lookup.editTitle,
                        editItem: lookup.editItem
                     });
               }

               this.lookupEditors[key] = new ag.LookupEditorViewModel(lookupOptions);
            });
         }

         ag.createBrowseEditors(this, this.options.browseEditors, this.applicationOptions);

         // Dependencies needs to come last - after the model has completed initialising
         if (!$.isEmptyObject(this.options.dependencies))
            ag.dependencies.init(this.applicationOptions, this.options.dependencies, this.options, this);

         this.profile = new ProfileViewModel(this.views.selected, this.activeReport, this.applicationOptions);

         this.initNav();
         this.initialiseMenuCommands();
      }

      getModel()
      {
         return this.applicationOptions;
      }

      afterApplyBindings()
      {
         var messageLogAction = <Action>this["actions"].messageLog;

         if (messageLogAction)
         {
            messageLogAction.createCustomPayload = () =>
            {
               return { activityId: this.activityId };
            };
         }
      }

      customizeActionPayload(payload)
      {
         this.grid.customizeActionPayload(payload);
      }

      previewReport()
      {
         this.processReport(true, ag.constants.ReportMode.Continue);
      }

      runReport()
      {
         this.processReport(false, ag.constants.ReportMode.Continue);
      }

      processReport(previewing, reportMode = ag.constants.ReportMode.Continue, action?): JQueryPromise<any>
      {
         // Re-set the "Message Log" button value (hide) before a new process                                    
         this.hasErrors(false);

         this.showConfirmProcessingDialog(false);

         // Ensure both the Query and View are saved if they are new 
         // and have not yet been saved then run the Report
         // Set the UserDefaultView
         return $.when(this.saveQueryIfNew(), this.setUserDefaultView()).pipe(() =>
         {
            return this.runReportRequest(previewing, reportMode, this.grid.getGridViewOptionsQueryString(), action);
         });
      }

      selectReport(report)
      {
         this.navigate(ko.unwrap(report.query) || ReportingViewModel.defaultQueryKey, ko.unwrap(report.key));
      }

      selectReportFromLookup(items)
      {
         var item = items[0];
         // If the item is actually a query that has no children, then
         // just select the query otherwise it's a report.
         if (ko.unwrap(item.query) === undefined && !ko.unwrap(item.hasChildren))
         {
            this.selectQuery(item);
         }
         else
         {
            this.selectReport(items[0]);
         }
      }

      showReport(report)
      {
         //return $.when(this.saveViewIfNew()).then(() =>
         //{
         this.showReportRequest(report, this.grid.getGridViewOptionsQueryString());
         this.showConfiguration(false);
         this.showParameters(false);
         //}).fail();
      }

      crystalLoaded()
      {
         this.crystalViewerLoading(false);
      }

      printView()
      {
         if (this.activeReport() && this.activeReport().key() && this.editingQuery)
            this.printViewRequest(this.activeReport().key(), this.editingQuery.key(), this.views.selected().key(), "pdf", this.grid.getGridViewOptions());
      }

      exportView()
      {
         if (this.activeReport() && this.activeReport().key() && this.editingQuery)
            this.exportViewRequest(this.activeReport().key(), this.editingQuery.key(), this.views.selected().key(), this.exportFileType(), this.grid.getGridViewOptions());
      }

      toggleConfiguration = () =>
      {
         // toggle the configuration mode
         this.showConfiguration(!this.showConfiguration());
         this.showParameters(true);
      }

      toggleShowAdvanced()
      {
         var value = this.showAdvanced();
         this.showAdvanced(!value);
      }

      addQuery()
      {
         this.navigate(ReportingViewModel.newQueryKey, null);
      }

      deleteActiveQuery(): JQueryPromise<any>
      {
         return this.deleteQueryRequest(this.selectedQuery());
      }

      deleteQuery(query): JQueryPromise<any>
      {
         return this.deleteQueryRequest(query);
      }

      copyActiveQuery(): JQueryPromise<any>
      {
         return this.saveQueryRequest(this.editingQuery, true, this.copyAction);
      }

      selectQuery(query)
      {
         // Make sure a different query has been selected before navigating
         var queryKey = ko.unwrap(query.key);         

         if (this.selectedQuery() && this.selectedQuery().key() === queryKey)
            return;

         this.hasWritePermission(true);

         // Navigate the selected query        
         this.navigate(queryKey || ReportingViewModel.defaultQueryKey, null);         
      }

      selectView(view)
      {
         // Navigate the selected view, leaving the query and report intact
         // This will be done soon
         //this.nav.navigate({ view: view.key() || defaultQueryKey });

         // For now:
         this.views.selected(view);         
      }

      getQueryData()
      {
         return { queryKey: this.editingQuery.key() };
      }

      queryAccessPermission()
      {
         // Check the Security By User Access Permission, if without writable permission then prompt message                                            
         this.hasWritePermission(ko.unwrap(this.editingQuery.hasWritePermission));
         var viewAccessPermission = (ko.unwrap(this.views.selected().hasWritePermission));
         
         if (!viewAccessPermission && !this.hasWritePermission())
         {            
            messages.show(strings.accessWrite2.format("query and view", "resources", "private copy"), 2);
            return;
         } else if (!this.hasWritePermission())
         {
            messages.show(strings.accessWrite.format("query", "resources", "private copy"), 2);
            return;
         }

         if (!viewAccessPermission)         
            messages.show(strings.accessWrite.format("view", "resources", "private copy"), 2);
      }

      saveReportView()
      {         
         var viewData = ko.mapping.toJS(this.views.selected);
                  
         // System views can't be saved so make a copy before saving as a non-system view
         // or Security By User applied and user don't have write access
         if (viewData.isSystem || !viewData.hasWritePermission)
         {                                         
            this.views.copy();                        
            viewData.hasWritePermission = true;                           
            // Reload & update the "source view" (system/default) from server otherwise the default values of this view will be changed
            this.views.getViewRequest(viewData.key).then((result) =>            
            {
               this.views.updateView(result);
            });
         }

         this.saveViewRequest();
      }   

      deleteReport(report): JQueryPromise<any>
      {
         var promise = undefined;
         if (this.activeReport())
            promise = this.deleteReportRequest(this.activeReport());

         return promise;
      }

      filterLookupUrl(filter: any, gridViewModel: GridViewModel, lookupAction: string, controller: string): string
      {
         // If we're in a new query, pass an empty query key to the filter lookup action so it fetches filter
         // fields from the default query.
         var queryKey = this.editingQuery.key();
         queryKey = queryKey === ReportingViewModel.newQueryKey ? "" : queryKey;

         return "{0}{1}/{2}/{3}?key={4}&fieldKey={5}".format(ag.siteRoot, ag.area, controller || ag.controller, lookupAction, queryKey, filter.key());
      }

      //#endregion

      //#region Private Methods

      private startMessageTimer(timeout: number = 10000)
      {
         var i = 0,
            userMessages = [strings.reportProc1, strings.reportProc2, strings.reportProc3, strings.reportProc4, strings.reportProc5, strings.reportProc6];

         return window.setInterval(() =>
         {
            messages.success(userMessages[i]);
            i++;
         },
            timeout);
      }

      private stopMessageTimer(timerId)
      {
         window.clearInterval(timerId);
         timerId = null;
      }

      // Mixin for grid functionality
      private createGridViewModel()
      {
         var gridOptions: any = $.extend({}, this.options, this.options.gridOptions);

         gridOptions.loadImmediately = false;
         gridOptions.noItemsMessage = strings.noItems;

         var grid = new GridViewModel(gridOptions);

         //grid.isActive = ko.computed(() =>
         //{
         //   return grid.views.selected().isPivot() && this.activeReport();
         //});

         // getItems override
         grid.getItems = (params, queryString?) =>
         {
            // Make sure we have an active report
            if (this.activeReport())
               return this.showReportRequest(this.activeReport(), queryString, this.previewing());

            return $.Deferred().resolve();
         };

         return grid;
      }

      orderReportOptions(options)
      {
         var orderedOptions = {},
            filterOrder = this.filterOrder();

         for (var i = 0; i < filterOrder.length; i++)
         {
            for (var prop in options)
            {
               if (prop.toLowerCase() === (<string>filterOrder[i]).toLowerCase())
               {
                  orderedOptions[prop] = options[prop];
                  break;
               }
            }
         }

         return orderedOptions;
      }

      updateReportSummary(report)
      {
         // Clear existing
         this.reportParameterSummary.removeAll();

         // Set order based on filterOrder
         var orderedOptions = this.orderReportOptions(report.options);

         // Add Parameters
         for (var key in orderedOptions)
         {
            if (orderedOptions.hasOwnProperty(key) && (orderedOptions[key] || orderedOptions[key] === 0))
            {
               var parameterValue = orderedOptions[key];
               if (parameterValue && (_.isString(parameterValue) || _.isObject(parameterValue)) && !_.isArray(parameterValue))
               {
                  // Attempt to parse as date
                  var date = moment.fromISO(parameterValue);
                  if (date.isValid())
                     parameterValue = date.toDisplay();
               }
               else if ((parameterValue || parameterValue === 0) && _.isNumber(parameterValue))
               {
                  var lookupValues = this.lookups[key],
                     lookupValueFound = true;

                  if (lookupValues && lookupValues.data)
                  {
                     lookupValueFound = false;
                     $.each(lookupValues.data, (index, lookup) =>
                     {
                        if (lookup.value == parameterValue)
                        {
                           parameterValue = lookup.text;
                           lookupValueFound = true;
                           return false;  // break loop
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
         $.each(report.filters, (i, filter) =>
         {
            var filterName = filter.displayName,
               operator = this.filters.getOperatorLabel(filter.operator),
               filterDisplayValue = this.filters.getFilterDisplayValue(filter);

            if (filterDisplayValue !== undefined && filterDisplayValue !== "")
            {
               this.reportParameterSummary.push({ key: { displayName: (filterName + " " + operator) }, value: filterDisplayValue });
            }
         });
      }

      clearGridResults(clearActiveReport)
      {
         if (clearActiveReport)
         {
            this.activeReport(null);
            this.grid.selected.reset();            
            if (this.pivot && this.pivot.pivotHtml)
            {
               this.pivot.pivotHtml(null);
            }
         }

         this.grid.items.removeAll();
         this.grid.pager.reset();

         this.crystalViewUrl(null);
      }

      public runReportRequest(previewing, reportMode, gridViewOptionsQueryString, action?, additionalInfo?)
      {
         // Run the Report
         var url = "/{0}/{1}{2}".format(this.options.serviceUrl, action ? action : (previewing ? "preview" : "run"),
            gridViewOptionsQueryString);

         // Start message timer      
         var timerId = this.startMessageTimer();

         this.reportRunning(true);

         var deferred = $.Deferred();

         this.net.postJson({ url: url }, () => this.getRunReportParams(additionalInfo, reportMode)).then((result) =>
         {
            // Success
            // Stop message timer
            this.stopMessageTimer(timerId);

            // Check the shape of the response to see if we are long-running or not
            if (result.isLongRunning)
            {
               // We are a long-running report
               deferred.resolve();

               if (result.message)
                  messages.show(result.message, result.messageType);

               return;
            }

            // Report run complete
            this.reportRunning(false);

            // Reset Grid
            this.clearGridResults(true);

            // Hide parameters and get out of configuration mode
            this.showConfiguration(false);
            this.showParameters(false);

            this.showConfiguration(false);
            this.views.showConfigure(false);
            this.grid.pager.navigateToPage(1);
            messages.clear();

            if (typeof result.data === "string")
            {
               // Scroll the crystal viewer into view
               this.scrollCrystalViewerIntoView(true);

               // Set the Url for the Crystal
               this.crystalViewUrl(result.data);
            }
            else if (result.isPivoted)
            {
               this.pivot.processResult(result);
               this.grid.displayGrid(false);
            }
            else
            {
               this.pivot.hide();
               this.grid.displayGrid(true);

               this.grid.loadGridData(result);
            }

            if (result.message)
            {
               // Support a simple message response
               messages.show(result.message, result.messageType);
            }

            if (result.report)
            {
               var report = this.setActiveReport(result.report, previewing);

               // Quality of the ran report 
               this.activeReport().encounteredErrors = result.report.encounteredErrors;

               // Sync the URL - navigate to the query and report
               this.navigate(report.query(), report.key());

               // Update the Parameter Summary
               this.updateReportSummary(result.report);
            }

            deferred.resolve();
         }, () =>
            {
               // Error

               // Stop message timer
               this.stopMessageTimer(timerId);

               this.reportRunning(false);

               deferred.reject();
            });

         return deferred.promise();
      }

      getRunReportParams(additionalInfo?, reportMode = ag.constants.ReportMode.Continue)
      {
         // Create a new parameters object from this.applicationOptions 
         // and add the currently selected query key and any current query data

         // Remove the available fields and reports properties from the post to reduce the request size
         var querydata = ko.mapping.toJS(this.selectedQuery);
         delete querydata["fields"];
         delete querydata["reports"];

         var viewdata = ko.mapping.toJS(this.views.selected());

         // pull the current filter values off the currently edited query
         this.reportFilters = ko.mapping.toJS(this.editingQuery.filters());
         var filterGroup = this.editingQuery.filterGroup ?
            ko.mapping.toJS(this.editingQuery.filterGroup) :
            null;

         ag.filters.transformFilters(this.reportFilters);
         ag.filters.transformFilters(viewdata.filters);

         $.extend(querydata,
            {
               filters: this.reportFilters,
               filterGroup: filterGroup,
               analysisFieldCaptions: ko.mapping.toJS(this.editingQuery.analysisFieldCaptions),
               analysisFields: ko.mapping.toJS(this.editingQuery.analysisFields),               
               expiryCount: ko.mapping.toJS(this.editingQuery.expiryCount),
               expiryStrategy: ko.mapping.toJS(this.editingQuery.expiryStrategy)               
            });

         this.setHiddenOptionsBackToDefaultValue(this.applicationOptions);

         return $.extend({ queryKey: this.selectedQuery().key(), queryData: querydata, viewType: viewdata.viewType },
            ko.mapping.toJS(this.applicationOptions),
            ko.mapping.toJS(additionalInfo || {}),
            { failureTreatment: reportMode });
      }

      getRunReportPayload(action, data)
      {
         $.extend(data, this.getRunReportParams());
      }

      showReportPayload = (addtionalFields: any) : any =>
      {
         return addtionalFields ? ko.unwrap(addtionalFields) : {};
      }

      showReportRequest(report, gridViewOptionsQueryString: string = "", previewing: boolean = false, addtionalFields?: any): JQueryPromise<any>
      {
         // Check if we are already on the report
         if (this.activeReport() && this.activeReport().key() === report.key)
            return $.Deferred().done();

         // Record the current grid view options
         this.currentGridViewOptions = gridViewOptionsQueryString;

         if (this.activeReport() &&
            this.activeReport().isPreviewing !== undefined &&
            this.activeReport().isPreviewing())
         {
            this.clearGridResults(true);
            return $.Deferred().done();
         }

         if (this.views.selected().viewType() === 1)
            return this.showCrystalViewRequest(report, previewing);

         var viewKey = this.views.selected().clientKey(),
             viewdata = ko.mapping.toJS(this.views.selected()),
             params =
             {
                queryKey: this.selectedQuery() ? this.selectedQuery().key() : null,
                reportId: ko.unwrap(report.key),
                viewKey: viewKey,
                viewType: viewdata.viewType,
                useCache: !this.viewsWithStaleResults[viewKey],
                data: this.showReportPayload(addtionalFields)
            },
            url = "/{0}/{1}{2}".format(this.options.serviceUrl, this.runViewAction, gridViewOptionsQueryString);

         //filters.transformFilters(params.viewData.filters);

         // Request a Report using a specific Data View
         return this.net.postJson({ url: url }, params).then((result: IReportingResponse) =>
         {
            this.updateReportDisplay(result, viewKey, previewing);
         },
            () =>
            {
               // Error 

               // Clear existing summary
               this.reportParameterSummary.removeAll();

               // Mark the view results as not stale
               this.viewsWithStaleResults[viewKey] = false;

               // Clear the current results
               this.clearGridResults(false);
            });
      }

      public setActiveReport(report, previewing: boolean)
      {
         var retrievedReport = ko.mapping.fromJS(report);

         // augment the report with preview observable 
         $.extend(retrievedReport, { preview: ko.observable(previewing) });

         // Successfully retrieved report so set as the active report
         // and set the current query to the query associated with the report.
         this.activeReport(retrievedReport);

         return retrievedReport;
      }

      private showCrystalViewRequest(report, previewing): JQueryPromise<any>
      {
         // Scroll the crystal viewer into view
         this.scrollCrystalViewerIntoView(true);

         var params = { reportId: ko.unwrap(report.key), viewKey: this.views.selected().clientKey() };

         // Request a Crystal Report, will return Url for use with our Crystal Report Viewer
         return this.net.postJson("runcrystalview", params).then((result) =>
         {
            // Update the activeReport
            this.setActiveReport(result.data, previewing);

            // Set the Url for the Crystal
            this.crystalViewUrl(result.actionData);

            // Reset the scroll into view
            this.scrollCrystalViewerIntoView(false);
         });
      }

      deleteReportRequest(report): JQueryPromise<any>
      {
         // Delete an existing report
         return this.net.postJson("deletereport", { reportKey: report.key() }).then((result) =>
         {
            messages.success(result.message);

            // If we've just deleted the active report, clear the active report and empty the results.
            if (this.activeReport() && report.key() == this.activeReport().key())
               this.clearGridResults(true);
                          
         });
      }

      getQueryRequest(queryKey)
      {
         if (queryKey === this.editingQuery.key())
            return;

         // Set the selected Query to the query in the list of queries 
         // (used to build the menu) that include the list of reports
         var matchingQueryIndex = (<any>this.queries).mappedIndexOf({ key: queryKey });
         if (matchingQueryIndex >= 0)
            this.selectedQuery(this.queries()[matchingQueryIndex]);
        
         // New Query with a fake key (data not persisted yet) or Query with full object loaded into memory
         if (queryKey === ReportingViewModel.newQueryKey || this.isQueryLoaded())
         {
            this.setActiveReportQueryValues(queryKey);
            this.setEditingQueryValues();
            this.queryAccessPermission();
            return;
         }

         var deferred = $.Deferred();

         // Retrieve the full Query and set the editingQuery to the instance returned
         this.net.getJson("editquery", { key: queryKey }).then((result) =>
         {
            this.processQueryResponse(result.data);
            this.setActiveReportQueryValues(queryKey);            
            this.queryAccessPermission();

            // Resolved
            deferred.resolve();
         }, () =>
            {
               // Error
               deferred.fail();
            });

         return deferred.promise();
      }

      deleteQueryRequest(query): JQueryPromise<any>
      {
         // Can't delete the query if it is the system default
         if (query.isSystem())
         {
            messages.error(strings.defQueryDelete);
            return $.Deferred().resolve();
         }

         var removeQuery = (message) =>
         {
            // Remove the query from the list of queries, and switch the current query 
            // to the default (or system) query if we've just removed the editing query.
            if (query == this.selectedQuery())
            {
               // Get the default (or system default)
               var defaultQuery = this.getDefaultQuery();
               if (defaultQuery == this.selectedQuery())
                  defaultQuery = this.getSystemDefaultQuery();
               
               // Clear results if there are any
               this.clearGridResults(true);

               // Navigate
               this.navigate(ko.unwrap(defaultQuery.key), null);
            }

            (<any>this.queries).mappedRemove({ key: query.key() });
            messages.success(message);

            // Remove validation entry
            delete this.queryOptionsToRevalidate[query.key()];
         };

         // Delete an unsaved query
         if (query.key() == null || query.key() == ReportingViewModel.newQueryKey)
         {
            removeQuery(strings.queryDeleted);
            return $.Deferred().resolve();
         }

         // Delete an existing query
         return this.net.postJson("deletequery", { queryKey: query.key() }).then((result) =>
         {
            removeQuery(result.message);
         });
      }

      private saveQueryRequest(query, doCopy: boolean = false, copyAction?: string): JQueryPromise<any>
      {
         // Save a new or updated existing query
         var savingDefault = query.isSystem(),
            isNew = doCopy || savingDefault || query.key() === null || query.key() === ReportingViewModel.newQueryKey,
            action = isNew ? copyAction || "createquery" : "editquery",
            querydata = ko.mapping.toJS(query);

         if (!(query.hasWritePermission()))
            doCopy = true;
         
         // Remove the available fields property from the post to reduce the request size
         delete querydata["fields"];
         delete querydata["reports"];

         // Clear the fake key  
         if (querydata.key === ReportingViewModel.newQueryKey)
            querydata.key = null;

         if (savingDefault || doCopy)
         {
            querydata.name = utils.ensureUniqueName(querydata.name, ko.mapping.toJS(this.queries()), "name");
            querydata.key = null;
            querydata.isDefault = false;
            querydata.isSystem = false;
            
            // Reload & update the "source query" (system/default) from server otherwise the default values of this query will be changed
            this.net.getJson("editquery", { key: query.key() }).then((result) =>            
            {
               this.processQueryResponse(result.data);               
            });
         }

         filters.transformFilters(querydata.filters);

         this.setHiddenOptionsBackToDefaultValue(this.applicationOptions);

         // Convert the "personal" property to a strict boolean from the truthy value
         // ("0" or "1") obtained from the binding.
         // querydata.isPersonal = isNaN(parseInt(querydata.isPersonal)) ? querydata.isPersonal : !!parseInt(querydata.isPersonal);

         var postdata = $.extend(querydata, { options: ko.mapping.toJS(this.applicationOptions) }, this.additionalSaveQueryPostData());

         var previousQuery = query;

         // Hide the config section, show the parameters
         this.showConfiguration(false);
    
         return this.net.postJson(action, () => postdata)
            .done((result) => this.handleQueryResult(result, savingDefault, doCopy, isNew, previousQuery, query));
      }

      additionalSaveQueryPostData()
      {
         return {}; // overloaded by Analytics
      }

      handleQueryResult(result, savingDefault: boolean, doCopy: boolean, isNew: boolean, previousQuery, query)
      {
         messages.show(result.message, result.messageType);
         var queryFromResult = this.getQueryFromResult(result);

         // Add the query to the queries collection if we're trying to save a default query
         if (savingDefault || doCopy)
         {
            var newQuery = ko.mapping.fromJS(queryFromResult);
            this.queries.push(newQuery);
            this.navigate(queryFromResult.key);
         }
         else
         {
            // Update the queries list observable array to force the list to reflect any changes.
            // [AG 26/6/2012] We need to use the empty option parameter in the call to fromJS to force
            // it to treat the indexed query as the target, otherwise it's expecting the target to be
            // the top-level mapped object.
            var queryNotFound: number = -1;
            var queryIndex = isNew ? this.queries().length - 1 : (<any>this.queries).mappedIndexOf(queryFromResult);

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
      }

      updateQueriesListAfterSaveOrCreate(key: string, query: any)
      {
         _.each(this.queries(), (tempNewQuery: any) =>
         {
            if (tempNewQuery.key() == key)
            {
               ko.mapping.fromJS(ko.mapping.toJS(query), tempNewQuery);
               return false;
            }
         });
      }

      handleQueryNotFound(currentQueryIndex: number, previousQuery: any, data: any, query: any, isNew: boolean): number
      {
         return currentQueryIndex;
      }

      private setHiddenOptionsBackToDefaultValue(options)
      {
         for (var option in options)
         {
            if (options.hasOwnProperty(option) &&
               option.indexOf('_') != 0)
            {
               var applicationOption = options[option];
               if (applicationOption.isVisible &&
                  !applicationOption.isVisible() &&
                  applicationOption.isDirty())
               {
                  var defaultValue = applicationOption.tag();
                  if (defaultValue === "null")
                  {
                     defaultValue = "";
                  }

                  // set back to default value
                  applicationOption.underlying(defaultValue);
               }
            }
         }
      }

      addQueryRequest(): JQueryPromise<any>
      {
         // Get a new query and set the editingQuery to the instance returned
         return this.net.getJson("createquery", null).done((result) =>
         {
            // Check for unique name
            var queries = ko.mapping.toJS(this.queries());
            result.data.name = ag.utils.ensureUniqueName(result.data.name, queries, "name");

            // Update new query with a fake key
            result.data.key = ReportingViewModel.newQueryKey;

            // Make observable
            var query = ko.mapping.fromJS(result.data);

            // Initialize the reports array as won't 
            // exist for new queries
            query.reports = ko.observableArray();

            // Add the query to the queries collection
            this.queries.push(query);

            // Update the selected query (we also need to update the editing query here as we're
            // not going to be navigating to an existing query which usually updates editingQuery).
            this.selectedQuery(query);
            ko.mapping.fromJS(result.data, this.editingQuery);

            if (result.data.options)
               ko.mapping.fromJS(result.data.options, this.applicationOptions);
            else if (result.options)
               ko.mapping.fromJS(result.options, this.applicationOptions);

            // Updating breadcrumb if there is any
            if (result.breadcrumb)
               ko.mapping.fromJS(result.breadcrumb, this.breadcrumb);

            // Clear the reports as they will be left over
            // from a previously edited query otherwise
            if (this.editingQuery.reports && this.editingQuery.reports())
               this.editingQuery.reports.removeAll();

            // Show the configuration view
            this.showParameters(true);
            this.showConfiguration(true);
         });
      }

      private saveQueryIfNew()
      {
         if (this.editingQuery.key() == null || this.editingQuery.key() === ReportingViewModel.newQueryKey)
         {
            // Save this query before running the report
            return this.saveQueryRequest(this.editingQuery, false);
         }
      }

      private setUserDefaultView()
      {
         // Save user default view before running the report
         if (this.views.selected().key() != null)
         {
            this.editingQuery.defaultView(ko.unwrap(this.views.selected().key()));
         }
      }

      updateQuery()
      {
         this.storeQuery();
         this.storeQueryOptionsToRevalidate();
      }

      private storeQuery()
      {
         // Update changes to query (in queries list)
         var matchingQueryIndex = (<any>this.queries).mappedIndexOf({ key: this.editingQuery.key() });

         if (matchingQueryIndex >= 0 && !$.isEmptyObject(this.applicationOptions))
         {
            var querydata = ko.mapping.toJS(this.editingQuery),
               queryInCollection = this.queries()[matchingQueryIndex];

            // Get the latest values of applicationOptions
            querydata.options = ko.mapping.toJS(this.applicationOptions);

            // Map the editingQuery over the top of the lightweight version 
            // in the collection, make sure to ignore reports
            ko.mapping.fromJS(querydata, { ignore: ["reports"] }, queryInCollection);
         }
      }

      private storeQueryOptionsToRevalidate()
      {
         var observables = [];
         _.each(this.applicationOptions, (prop: any, propName: string) =>
         {
            // Only store observables where the validation uses valueIsUnvalidated
            // And validation result is error or still validating
            if (prop.hasOwnProperty("valueIsUnvalidated") && (!prop.isValid() || prop.isValidating()))
               observables.push(propName);
         });

         this.queryOptionsToRevalidate[this.editingQuery.key()] = observables;
      }

      private setActiveReportQueryValues(queryKey)
      {
         // Clear the current results if we have changed query and the report
         // currently being displayed is not associated with the newly selected query
         if (this.activeReport())
         {
            var activeReportQueryKey = this.activeReport().query();

            // Reports created from the "Default" query with have a query key of null
            if (!activeReportQueryKey && queryKey === ReportingViewModel.defaultQueryKey)
               return;

            if (activeReportQueryKey !== queryKey)
            {
               this.clearGridResults(true);
               this.showParameters(true);
               this.showConfiguration(false);
            }
         }

         // Set the currently selected View to the default view for this query
         var defaultViewKey = ko.unwrap(this.selectedQuery().defaultView);
         if (defaultViewKey === undefined)
         {
            defaultViewKey = ko.unwrap(this.editingQuery.defaultView);
         }

         var defaultView = this.views.all().filter((item) =>
         {
            if (defaultViewKey)
            {
               return item.key() === defaultViewKey;
            }

            // if no default key, just display the system default
            return item.isDefault() && item.isSystem();
         })[0];

         if (defaultView)
         {
            this.views.setSelected(defaultView);
         }
      }

      private setEditingQueryValues()
      {
         var querydata = ko.mapping.toJS(this.selectedQuery);
         ko.mapping.fromJS(querydata, this.editingQuery);
         ko.mapping.fromJS(querydata.options, this.applicationOptions);

         // Trigger validation
         _.each(this.queryOptionsToRevalidate[this.editingQuery.key()], (propName: string) =>
         {
            var observable = this.applicationOptions[propName];
            observable.valueIsUnvalidated = true;
            observable.valueHasMutated();
         });
      }

      private saveViewRequest()
      {
         var action = this.views.selected().key() ? "editview" : "createview",
            isNewDefault = action === "createview",
            viewData = ko.mapping.toJS(this.views.selected),
            payload = { view: viewData, queryKey: ko.unwrap(this.editingQuery.key) },
            deferred = $.Deferred();

         filters.transformFilters(viewData.filters);

         var isValid = this.net.postJson(action, payload).then(
            (result) =>
            {
               this.grid.views.showConfigure(false);
               messages.show(result.message, result.messageType);

               this.views.updateSelectedViewAndChildren(result.data);
               
               // Also flag that the view has been updated (for forcing a cache refresh 
               // when next showing a report for this view).
               var viewKey = this.views.selected().clientKey();
               this.viewsWithStaleResults[viewKey] = true;

               // Flag that the selected view has been updated to trigger any dependencies.
               // This is done on the page to stop 'runview' being triggered multiple times.
               this.grid.pager.page.valueHasMutated();
               this.pivot.reset();
               this.grid.selected.reset();

               // If we have just created a new view set its key 
               // on the query as the queries new default.
               if (isNewDefault)
                  this.editingQuery.defaultView(viewKey);

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

      public applyViewRequest()
      {
         this.views.apply().then(() =>
         {
            var viewKey = this.views.selected().clientKey();
            this.viewsWithStaleResults[viewKey] = true;

            this.pivot.reset();
         });
      }

      printViewRequest(reportId, queryKey, viewKey, format, gridViewOptions)
      {
         downloadInvoker.invoke("/{0}/printview".format(this.options.serviceUrl), { reportId: reportId, query: queryKey, viewKey: viewKey, format: format, options: gridViewOptions });
      }

      exportViewRequest(reportId, queryKey, viewKey, format, gridViewOptions)
      {
         downloadInvoker.invoke("/{0}/exportview".format(this.options.serviceUrl), { reportId: reportId, query: queryKey, viewKey: viewKey, format: format, options: gridViewOptions });
      }

      private keepActiveReportRequest(reportId: string)
      {
         return this.net.postJson("keepReport", { reportId: reportId }).done(result =>
         {
            messages.show(result.message, result.messageType);
         });
      }

      updateQueryBeforeNavigate(queryKey)
      {
         // Update current query with changes before 
         // navigating to a different query 
         if (queryKey !== this.editingQuery.key())
            this.updateQuery();
      }

      private getNewQueryOnNavigate()
      {
         // If we already have a new query select it
         if (this.getQueryByKey(ReportingViewModel.newQueryKey))
         {
            // This will get the in-memory new query not do a request
            this.getQueryRequest(ReportingViewModel.newQueryKey);
            return;
         }

         this.addQueryRequest();
      }

      private getQueryByKey(key: string): any
      {
         return this.findQuery(q => q.key() == key);
      }

      private getDefaultQuery(): any
      {
         var defaultQuery = this.findQuery(q => q.isDefault());

         // If there's no default return the system query
         if (!defaultQuery)
            defaultQuery = this.getSystemDefaultQuery();

         return defaultQuery;
      }

      private getSystemDefaultQuery(): any
      {
         return this.findQuery(q => q.isSystem());
      }

      private findQuery(condition: (query: any) => boolean)
      {
         return _.find(this.queries(), condition);
      }

      navigate(queryKey: string, reportKey?: string)
      {
         var params: any = { query: queryKey };
         if (reportKey !== undefined && this.supportPreviousRun)
            params.report = reportKey;

         this.nav.navigate(params);
      }

      navigateGetParams(): any
      {
         return this.supportPreviousRun ? { query: null, preview: false, report: null } : { query: null };
      }

      navigateDelegator(args: any[], currrentContext: any): void
      {
         var navEntry = args[0],
            navInfo = args[1];

         // Query AND Report - route
         if (this.routeToQueryAndReport(navEntry.params))
            return;

         // Query by itself - route
         if (this.routeToQuery(navEntry.params))
            return;

         // Back history navigation - no query or report
         if (navInfo.isBack)
            this.routeBack();
      }

      routeToQueryAndReport(params: IReportNavigationParams): boolean
      {
         var queryKey = params.query;

         if (queryKey && params.report)
         {
            var reportId = params.report;

            queryKey = this.verifyQueryKey(queryKey);

            this.updateQueryBeforeNavigate(queryKey);

            // Request Query
            $.when(this.getQueryRequest(queryKey)).then(() => this.showReport({ key: reportId }));
            return true;
         }

         return false;
      }

      public verifyQueryKey(queryKey:string): string
      {
         var result = _.find(this.queries(), (query) =>
         {
            return query.key() == queryKey;
         });

         if (!result)
         {
            queryKey =  _.find(this.queries(), (query) =>
            {
               return query.isSystem();
            }).key();
         }

         return queryKey;
      }

      routeToQuery(params: IReportNavigationParams): boolean
      {
         if (!params.query)
            return false;

         var queryKey = params.query;

         if (queryKey === ReportingViewModel.defaultKey)
            return false;

         this.updateQueryBeforeNavigate(queryKey);

         if (queryKey !== ReportingViewModel.newQueryKey)
         {
            // Check if we are already on the query
            if (queryKey === this.editingQuery.key())
               return true;

            $.when(this.getQueryRequest(queryKey)).then(() => this.clearGridResults(true));
         }
         else
         {
            this.getNewQueryOnNavigate();
            this.clearGridResults(true);
         }

         return true;
      }

      routeBack()
      {
         // Back to initial setup
         $.when(this.getQueryRequest(ReportingViewModel.defaultQueryKey)).then(() => this.clearGridResults(true));
      }

      private updateReportDisplay(result: IReportingResponse, viewKey: string, previewing: boolean)
      {
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
      }

      private updatePivot(result: IReportingResponse)
      {
         if (result.isPivoted)
         {
            this.pivot.processResult(result);
            this.grid.displayGrid(false);
            this.grid.chart.visible(false);
         }
         else if (result.isChart)
         {
            this.pivot.hide();
            this.grid.displayGrid(false);
            this.grid.chart.processResult(result);
         }
         else
         {
            this.pivot.hide();
            this.grid.chart.visible(false);
            this.grid.displayGrid(true);

            this.grid.loadGridData(result);
         }
      }

      private setReport(report: IReport, previewing: boolean)
      {
         report.query = report.query || ReportingViewModel.defaultQueryKey;

         this.setActiveReport(report, previewing);

         // Update the Parameter Summary
         this.updateReportSummary(report);
      }

      //#region Virtual Methods

      processQueryResponse(data: any)
      {
         this.silenceDependency(() =>
         {
            ko.mapping.fromJS(data, this.editingQuery);
            ko.mapping.fromJS(data.options, this.applicationOptions);
            ag.updateGrids(data.options, this.grids);

            if (data.filterGroup)
               ko.mapping.fromJS(data.filterGroup, this.editingQuery.filterGroup);

            // If an existing option is not in the set of returned options we need to clear that value.
            $.each(this.applicationOptions, (option) =>
            {
               if (data.options[option] == null && typeof this.applicationOptions[option] === "function") this.applicationOptions[option](null);
            });
         }, this);
      }

      updateGridModelAfterSave(data: any) { }

      updateDisplayOptions(data: any) { }

      isQueryLoaded(): boolean
      {
         return this.selectedQuery().options;
      }

      getQueryFromResult(result: any)
      {
         return result.data;
      }
      //#endregion

      public canPerformAction(grid: GridViewModel, itemKey: string, canProperty: string)
      {
         return (grid.selected.all() && grid.pager.totalItems() > 0) || _.any(grid.selected.keys(), (key) =>
         {
            var item = _.find(grid.items(), (gridItem) =>
            {
               return gridItem[itemKey] == key;
            });

            return item === undefined || item[canProperty];
         });
      }

      public setViewAsStale(stale = true)
      {
         var viewKey = this.views.selected().key();
         this.viewsWithStaleResults[viewKey] = stale;
      }

      initialiseMenuCommands(): void
      {
         this.previewReportCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.processReport(true).always(complete);
            }
         });

         this.runReportCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.processReport(false, ag.constants.ReportMode.Continue).always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.runPreviewReportCommand && !this.runPreviewReportCommand.isExecuting();
            }
         });

         this.runPreviewReportCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.processReport(true, ag.constants.ReportMode.Halt).always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && !this.runReportCommand.isExecuting();
            }
         });

         this.saveConfigurationCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               // Save any configuration updates
               this.saveQueryRequest(this.editingQuery).always(complete);
            }
         });

         this.addReportCommand = ko.command(
         {
            execute: () =>
            {
               this.addQuery();               
            }
         });

         this.copyActiveQueryCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.copyActiveQuery().always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && !this.isNewItem();
            }
         });

         this.deleteActiveQueryCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.deleteActiveQuery().always(complete);
            },
            isVisible: (isExecuting) =>
            {
               return !isExecuting && !this.isNewItem() && !ko.unwrap(this.editingQuery.isSystem);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && !this.isNewItem() && !ko.unwrap(this.editingQuery.isSystem);
            }
         });
        
         this.reportRunningComputed = ko.computed(() =>
         {
            return this.runReportCommand.isExecuting() || this.runPreviewReportCommand.isExecuting();
         });

         // This is needed to force the canExecute on runReportCommand to be reevaluated.
         this.runReportCommand.isExecuting.valueHasMutated();

         this.keepReportCommand = ko.asyncCommand(
         {
            execute: (complete) =>
            {
               this.keepActiveReportRequest(this.activeReport().key()).always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.activeReport() && !this.previewing() && !this.views.selectedIsCrystal();
            }
         });

         this.exportReportCommand = ko.command(
         {
            execute: () =>
            {               
               this.showExportDialog();
            },
            canExecute: (isExecuting) => {
               return !isExecuting && this.activeReport() && !this.previewing() && !this.views.selectedIsCrystal();
            }
         });
      }

      isNewItem = () =>
      {
         return (this.editingQuery.key() == null || this.editingQuery.key() === ReportingViewModel.newQueryKey);
      }
   }
}