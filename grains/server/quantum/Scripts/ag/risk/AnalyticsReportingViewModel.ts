interface IRiskReportingApplicationOptions extends IReportingApplicationOptions
{
   columnInfo: any;
   limits: any;
   mapProfile: any;
   scenarios: any;
   alerts: any;
   mappingProfile: any;
   alertName: any;

   alertsId: any;
   asAtDate: any;
   assumptions: any;
   assumptionsId: any;
   assumptionsName: any;
   autoBenchmark: any;
   autoReExecute: any;
   autoReExecuteTime: any;
   balances: any;
   balancesId: any;
   balancesName: any;
   benchmarkId: any;
   columnsId: any;
   columnsName: any;
   comments: any;
   endDate: any;
   failureTreatment: any;
   filters: any;
   filtersId: any;
   filtersName: any;
   hasAlerts: any;
   hasAssumptions: any;
   hasBalances: any;
   hasColumns: any;
   hasFilters: any;
   hasLimits: any;
   hasMappingProfile: any;
   hasScenarios: any;
   hasTimeProfile: any;
   id: any;
   includeFXRates: any;
   includeVolRates: any;
   includeYieldRates: any;
   isSpectrum: any;
   limitsId: any;
   limitsName: any;
   location: any;
   mappingProfileId: any;
   mappingProfileName: any;
   messages: any;
   name: any;
   nettDate: any;
   parentId: any;
   path: any;
   positionDate: any;
   preDealLimit: any;
   scenariosId: any;
   scenariosName: any;
   startDate: any;
   subType: any;
   subTypeString: any;
   timeProfile: any;
   timeProfileId: any;
   timeProfileName: any;
   title: any;
}

interface ILazyDefinitionLoaderOptions
{
   active: KnockoutObservable<boolean>;
   headerKey: KnockoutObservable<number>;
   definitionKey: KnockoutObservable<number>;
   grids?: any[];
   afterLoadCallback?: Function;
}

interface IAppProperty
{
   prop: KnockoutObservable<string>;
   target: string;
   hasIdField: boolean;
}

interface IAnalyticsReportNavigationParams extends IReportNavigationParams
{
   autorun: boolean;
   parentid: number;
   querytype: string;
}

module ag
{
   export class AnalyticsReportingViewModel extends ReportingViewModel
   {
      dealIdGuid: string;
      definitionLoaders: any = {};

      balances: ag.FiltersViewModel;
      observeProperties: Array<IAppProperty>;
      breadcrumbViewModel: BreadcrumbViewModel;
      applicationOptions: IRiskReportingApplicationOptions;
      isRoot: KnockoutComputed<boolean>;

      mappingProfileActive = ko.observable(false);

      constructor(options)
      {
         super(options);

         this.dealIdGuid = options.dealIdGuid;

         // Top-level tabs
         this.tabs.defaults = ko.observable(false);
         this.tabs.properties = ko.observable(false);
         this.tabs.assumptions = ko.observable(false);
         this.tabs.columns = ko.observable(false);
         this.tabs.filters = ko.observable(false);
         this.tabs.balances = ko.observable(false);
         this.tabs.mappingProfile = ko.observable(false);
         this.tabs.timeProfile = ko.observable(false);
         this.tabs.limits = ko.observable(false);
         this.tabs.alerts = ko.observable(false);
         this.tabs.scenarios = ko.observable(false);
         this.copyAction = "copyQuery";

         this.filters = new ag.FiltersViewModel(
            {
               availableOperators: options.availableOperators,
               controller: "filters"
            });

         this.balances = new ag.FiltersViewModel(
            {
               serviceUrl: options.serviceUrl,
               availableOperators: options.availableOperators,
               controller: "balances"
            });

         if (options.editingQuery)
            if (!options.editingQuery.key)
               this.toggleConfiguration();

         this.breadcrumbViewModel = new BreadcrumbViewModel(this.breadcrumb, true);
         this.grid.disableLinksTo = true;
      }

      init(model)
      {
         super.init(model);

         document.title = ("{0} - " + strings.query + " - {1}").format(this.getPageTitle(), model.subTypeString);

         this.observeProperties =
         [
            { prop: ko.observable("defaults"), target: "defaults", hasIdField: false },
            { prop: ko.observable("properties"), target: "properties", hasIdField: false },
            { prop: this.applicationOptions.assumptionsName, target: "assumptions", hasIdField: true },
            { prop: this.applicationOptions.columnsName, target: "columns", hasIdField: true },
            { prop: this.applicationOptions.filtersName, target: "filters", hasIdField: true },
            { prop: this.applicationOptions.balancesName, target: "balances", hasIdField: true },
            { prop: this.applicationOptions.mappingProfileName, target: "mappingProfile", hasIdField: true },
            { prop: this.applicationOptions.timeProfileName, target: "timeProfile", hasIdField: true },
            { prop: this.applicationOptions.limitsName, target: "limits", hasIdField: true },
            { prop: this.applicationOptions.alertName, target: "alerts", hasIdField: true },
            { prop: this.applicationOptions.scenariosName, target: "scenarios", hasIdField: true }
         ];

         _.forEach(this.observeProperties, (obj: IAppProperty) =>
         {
            var name: KnockoutObservable<string> = obj.prop,
               target: string = obj.target;

            name.subscribe(() =>
            {
               (<KnockoutObservable<boolean>>(<any>this.tabs)[target])(false);
            });
         });

         // if columns name changed, need to clear existing grids result 
         // and also the active queryreport
         this.applicationOptions.columnsName.subscribe(() =>
         {
            this.activeReport(undefined);
            this.grid.items.removeAll();
            this.grid.pager.reset();
         });

         this.applicationOptions.columnInfo.name.subscribe(() =>
         {
            this.net.getJson('getViews', { subType: this.applicationOptions.subType() }).then(result =>
            {
               this.views.update(result.data, this.views.viewTables(), true);
            });
         });

         this.applicationOptions.filtersName.subscribe(() =>
         {
            this.filters.selectedFilterGroup(undefined);
         });

         // Override grids model
         for (var propt in this.grids)
         {
            if (!_.has(this.applicationOptions, propt))
               return;

            _.each(this.grids[propt], (grid: GridViewModel) =>
            {
               var riskReportingApplicationOption = this.applicationOptions[propt];

               grid.viewModel = riskReportingApplicationOption;

               // only for editable grid
               if (grid.editor)
                  grid.editor.overrideViewModel(riskReportingApplicationOption);
            });
         }

         risk.keepColumnsInSync(this.grids.columnInfo, this.grid.views);

         this.initLazyDefinitionLoaders();

         this.isRoot = ko.computed(() =>
         {
            var breadcrumb = this.breadcrumb;

            if (!breadcrumb)
               return false;

            if (breadcrumb.parents && ko.unwrap(breadcrumb.parents).length > 0)
               return false;

            return true;
         });

         // if the params contain the autorun, execute the run report
         if (this.hasAutoRun())
            this.runReportCommand.execute();
      }

      private hasAutoRun(): boolean
      {
         return (<IAnalyticsReportNavigationParams>this.nav.params()).autorun;
      }

      initLazyDefinitionLoaders()
      {
         this.definitionLoaders.assumptions = new LazyDefinitionLoader(
            {
               active: this.tabs.assumptions,
               headerKey: this.applicationOptions.assumptionsId,
               definitionKey: this.applicationOptions.assumptions.id
            });

         var columns = this.applicationOptions.columnInfo;
         this.definitionLoaders.columns = new LazyDefinitionLoader(
            {
               active: this.tabs.columns,
               headerKey: this.applicationOptions.columnsId,
               definitionKey: this.applicationOptions.columnInfo.id,
               grids: [columns.groupBy, columns.pointInTime, columns.movement, columns.database, columns.calculated]
            });

         this.definitionLoaders.filters = new LazyDefinitionLoader(
            {
               active: this.tabs.filters,
               headerKey: this.applicationOptions.filtersId,
               definitionKey: this.applicationOptions.filters.id,
               afterLoadCallback: () =>
               {
                  ag.dom.filtersInit();
               }
            });

         this.definitionLoaders.balances = new LazyDefinitionLoader(
            {
               active: this.tabs.balances,
               headerKey: this.applicationOptions.balancesId,
               definitionKey: this.applicationOptions.balances.id,
               afterLoadCallback: () =>
               {
                  ag.dom.filtersInit();
               }
            });

         var mapProfile = this.applicationOptions.mappingProfile;

         this.definitionLoaders.mappingProfile = new LazyDefinitionLoader(
            {
               active: this.tabs.mappingProfile,
               headerKey: this.applicationOptions.mappingProfileId,
               definitionKey: this.applicationOptions.mappingProfile.id,
               grids: [mapProfile.matchingCriteria, mapProfile.settings],
               afterLoadCallback: () =>
               {
                  MappingProfilesHierarchicalViewModel.matchingCriteriaStaticInit(this.grids.mappingProfile.matchingCriteria);
               }
            });

         this.definitionLoaders.timeProfile = new LazyDefinitionLoader(
            {
               active: this.tabs.timeProfile,
               headerKey: this.applicationOptions.timeProfileId,
               definitionKey: this.applicationOptions.timeProfile.id
            });

         this.definitionLoaders.limits = new LazyDefinitionLoader(
            {
               active: this.tabs.limits,
               headerKey: this.applicationOptions.limitsId,
               definitionKey: this.applicationOptions.limits.id,
               grids: [this.applicationOptions.limits.details]
            });

         this.definitionLoaders.alerts = new LazyDefinitionLoader(
            {
               active: this.tabs.alerts,
               headerKey: this.applicationOptions.alertsId,
               definitionKey: this.applicationOptions.alerts.id,
               grids: [this.applicationOptions.alerts.alertsDefinitions]
            });

         this.definitionLoaders.scenarios = new LazyDefinitionLoader(
            {
               active: this.tabs.scenarios,
               headerKey: this.applicationOptions.scenariosId,
               definitionKey: this.applicationOptions.scenarios.id,
               grids: [this.grids.scenarios.scenarioDefinitions]
            });
      }

      createPivot(options): PivotViewModel
      {
         return new RiskPivotViewModel(
            this.selectedQuery,
            this.views.selected,
            this.activeReport,
            this.grid,
            options);
      }

      beforeApplyBindings()
      {
         ColumnDefinitionViewModel.initialise(this.grids.columnInfo.calculated);
         ScenarioDefinitionViewModel.initialise(this.grids.scenarios, this.applicationOptions.scenarios, this);
      }

      afterApplyBindings(): void
      {
         AlertDefinitionViewModel.initialise(this.grids.alerts, this.applicationOptions.alerts);
         MappingProfilesHierarchicalViewModel.initialise(this.grids.mappingProfile, this.applicationOptions.mappingProfile);
         TimeProfilesHierarchicalViewModel.initialise(this.applicationOptions.timeProfile);

         //(<any>ag.risk).setupNavigation(this);
         //ag.risk.observeProperties(this, '@Request.GetSanitizedPath()');
         //(<any>ag.risk).syncMappingProfileGrids(this, 'applicationOptions.mapProfile', 'mapProfile');

         var messageLogAction = <Action>this["actions"].messageLog;

         if (messageLogAction)
            messageLogAction.createCustomPayload = () =>
            {
               var id: any;
               if (this.activeReport() !== null)
               {
                  id = this.activeReport().activity();
               }

               return { activityId: id };
            };

         this.breadcrumbViewModel.breadcrumb = this.breadcrumb;
         var lastParent = _.last(this.breadcrumb.parents());
         var parent = !lastParent ? undefined : (<any>lastParent).id();
         this.breadcrumbViewModel.reset(parent);
      }

      private loadGridViewData(gridViewModel, activeProperty)
      {
         if (ko.unwrap(activeProperty))
            gridViewModel.refresh();
      }

      downloadReportCallback(): DownloadCallbackResult
      {
         return {
            targetUrl: ag.serviceUrl + "/download",
            params: { query: this.nav.current().params.query, report: this.nav.current().params.report }
         };
      }

      getCrystalReportLookup(): string
      {
         return "{0}{1}".format(ag.applicationPath === "/" ? "" : ag.applicationPath, "/analytics/reporting/getformatfilelookup");
      }

      addCrystalView(item)
      {
         var report = item.crystalReport;
         this.views.selected().crystalReports.push(ko.mapping.fromJS(new RiskCrystalDefinition({ crystalName: report, crystalFile: report })));
      }

      printView()
      {
         if (this.activeReport() && this.activeReport().key() && this.editingQuery)
            this.printViewRequest(
               this.activeReport().key(),
               this.applicationOptions.id(),
               this.views.selected().key(),
               "pdf",
               this.grid.getGridViewOptions());
      }

      exportView()
      {
         if (this.activeReport() && this.activeReport().key() && this.editingQuery)
            this.exportViewRequest(
               this.activeReport().key(),
               this.applicationOptions.id(),
               this.views.selected().key(),
               this.exportFileType(),
               this.grid.getGridViewOptions());
      }

      editGroupFromBreadcrumb()
      {
         // Fall through to default link behaviour, rather than internal navigation
         return true;
      }

      navigateToGroupUrl(viewModel)
      {
         return "{0}{1}/explorer?id={2}".format(ag.siteRoot, ag.area, ko.unwrap(viewModel.id));
      }

      deleteActiveQuery(): JQueryPromise<any>
      {
         return super.deleteActiveQuery().done(() =>
         {
            var parentBreadcrumb = ko.mapping.toJS(_.last(this.breadcrumb.parents()));
            navigate(this.navigateToGroupUrl(parentBreadcrumb));
         });
      }

      deleteQueryRequest(query): JQueryPromise<any>
      {
         // Delete an existing query
         return this.net.postJson("deletequery", { queryKey: ag.viewModel.applicationOptions.id() })
            .fail(result =>
            {
               ag.utils.showErrorsFromResult(result);
            });
      }

      deleteReport(report): JQueryPromise<any>
      {
         var promise = super.deleteReport(report);
         if (promise)
            promise.done(() =>
            {
               this.nav.navigate({ report: null });
            });
         return promise;
      }

      additionalSaveQueryPostData(): any
      {
         return { views: ko.mapping.toJS(this.views.all) };
      }

      // override the save query request handle
      handleQueryResult(result)
      {
         var queryFromResult = this.getQueryFromResult(result),
            selectedViewIdx = _.findIndex(this.views.all(), (i) => i === this.views.selected());

         messages.show(result.message, result.messageType);
         this.updateBreadcrumb(result.breadcrumb);
         this.updateEditingQueryAndApplicationOptions(queryFromResult);
         this.navigateToQuery(queryFromResult.id, result.clearReport);
         this.updateViews(result.views, result.viewTables, selectedViewIdx); //do this after navigateToQuery so that the previously selected view is reselected
      }

      private updateBreadcrumb(breadcrumb)
      {
         ko.mapping.fromJS(breadcrumb, this.breadcrumb);

         var lastParent = _.last(this.breadcrumb.parents());
         var parent = !lastParent ? undefined : (<any>lastParent).id();
         this.breadcrumbViewModel.reset(parent);
      }

      private updateEditingQueryAndApplicationOptions(query)
      {
         this.applicationOptions.id(query.id);
         this.applicationOptions.name(query.name);

         var updateFieldFunc = (field) =>
         {
            if (_.has(query, field) && _.has(this.applicationOptions, field))
               this.applicationOptions[field](query[field]);
         };
         _.forEach(this.observeProperties, (obj: IAppProperty) =>
         {
            if (!obj.hasIdField)
               return;

            var target = obj.target;

            updateFieldFunc(target + "Name");
            updateFieldFunc(target + "Id");
         });

         this.editingQuery.name(query.name);
      }

      private updateViews(views: any[], viewTables: any[], selectViewIdx: number)
      {
         this.views.update(views, viewTables, false, selectViewIdx);
      }

      private navigateToQuery(queryId: number, clearReport: boolean)
      {
         var navParam = { query: queryId, parentid: null, querytype: null, autorun: null };
         if (clearReport)
            navParam = $.extend(navParam, { report: null });

         this.nav.navigate(navParam);
      }

      navigateGetParams(query = null, preview = null, report = null, parentid = null, querytype = null, autorun = null): IAnalyticsReportNavigationParams
      {
         return { query: query, preview: preview, report: report, parentid: parentid, querytype: querytype, autorun: autorun };
      }

      navigateToNewItem(type: string): void
      {
         var link = ag.serviceUrl + '?parentid={0}&querytype={1}'.format(this.applicationOptions.parentId(), type);
         navigate(link);
      }

      isNewItem = () =>
      {
         var unwrap = ko.unwrap(this.applicationOptions.id);
         return unwrap == 0 || !unwrap;
      }

      verifyQueryKey(queryKey: string): string
      {
         return queryKey;
      }

      moveItem(items: ISelectedItem[], event, model: ag.components.ExplorerViewModel): void
      {
         var location = this.breadcrumbViewModel.getNewLocation(items, event, model);
         if (!location) return;

         this.applicationOptions.parentId(location.id);
      }
   }
}