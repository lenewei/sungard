var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var AnalyticsReportingViewModel = (function (_super) {
        __extends(AnalyticsReportingViewModel, _super);
        function AnalyticsReportingViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.definitionLoaders = {};
            this.mappingProfileActive = ko.observable(false);
            this.isNewItem = function () {
                var unwrap = ko.unwrap(_this.applicationOptions.id);
                return unwrap == 0 || !unwrap;
            };

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

            this.filters = new ag.FiltersViewModel({
                availableOperators: options.availableOperators,
                controller: "filters"
            });

            this.balances = new ag.FiltersViewModel({
                serviceUrl: options.serviceUrl,
                availableOperators: options.availableOperators,
                controller: "balances"
            });

            if (options.editingQuery)
                if (!options.editingQuery.key)
                    this.toggleConfiguration();

            this.breadcrumbViewModel = new ag.BreadcrumbViewModel(this.breadcrumb, true);
            this.grid.disableLinksTo = true;
        }
        AnalyticsReportingViewModel.prototype.init = function (model) {
            var _this = this;
            _super.prototype.init.call(this, model);

            document.title = ("{0} - " + ag.strings.query + " - {1}").format(this.getPageTitle(), model.subTypeString);

            this.observeProperties = [
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

            _.forEach(this.observeProperties, function (obj) {
                var name = obj.prop, target = obj.target;

                name.subscribe(function () {
                    _this.tabs[target](false);
                });
            });

            // if columns name changed, need to clear existing grids result
            // and also the active queryreport
            this.applicationOptions.columnsName.subscribe(function () {
                _this.activeReport(undefined);
                _this.grid.items.removeAll();
                _this.grid.pager.reset();
            });

            this.applicationOptions.columnInfo.name.subscribe(function () {
                _this.net.getJson('getViews', { subType: _this.applicationOptions.subType() }).then(function (result) {
                    _this.views.update(result.data, _this.views.viewTables(), true);
                });
            });

            this.applicationOptions.filtersName.subscribe(function () {
                _this.filters.selectedFilterGroup(undefined);
            });

            for (var propt in this.grids) {
                if (!_.has(this.applicationOptions, propt))
                    return;

                _.each(this.grids[propt], function (grid) {
                    var riskReportingApplicationOption = _this.applicationOptions[propt];

                    grid.viewModel = riskReportingApplicationOption;

                    // only for editable grid
                    if (grid.editor)
                        grid.editor.overrideViewModel(riskReportingApplicationOption);
                });
            }

            ag.risk.keepColumnsInSync(this.grids.columnInfo, this.grid.views);

            this.initLazyDefinitionLoaders();

            this.isRoot = ko.computed(function () {
                var breadcrumb = _this.breadcrumb;

                if (!breadcrumb)
                    return false;

                if (breadcrumb.parents && ko.unwrap(breadcrumb.parents).length > 0)
                    return false;

                return true;
            });

            // if the params contain the autorun, execute the run report
            if (this.hasAutoRun())
                this.runReportCommand.execute();
        };

        AnalyticsReportingViewModel.prototype.hasAutoRun = function () {
            return this.nav.params().autorun;
        };

        AnalyticsReportingViewModel.prototype.initLazyDefinitionLoaders = function () {
            var _this = this;
            this.definitionLoaders.assumptions = new ag.LazyDefinitionLoader({
                active: this.tabs.assumptions,
                headerKey: this.applicationOptions.assumptionsId,
                definitionKey: this.applicationOptions.assumptions.id
            });

            var columns = this.applicationOptions.columnInfo;
            this.definitionLoaders.columns = new ag.LazyDefinitionLoader({
                active: this.tabs.columns,
                headerKey: this.applicationOptions.columnsId,
                definitionKey: this.applicationOptions.columnInfo.id,
                grids: [columns.groupBy, columns.pointInTime, columns.movement, columns.database, columns.calculated]
            });

            this.definitionLoaders.filters = new ag.LazyDefinitionLoader({
                active: this.tabs.filters,
                headerKey: this.applicationOptions.filtersId,
                definitionKey: this.applicationOptions.filters.id,
                afterLoadCallback: function () {
                    ag.dom.filtersInit();
                }
            });

            this.definitionLoaders.balances = new ag.LazyDefinitionLoader({
                active: this.tabs.balances,
                headerKey: this.applicationOptions.balancesId,
                definitionKey: this.applicationOptions.balances.id,
                afterLoadCallback: function () {
                    ag.dom.filtersInit();
                }
            });

            var mapProfile = this.applicationOptions.mappingProfile;

            this.definitionLoaders.mappingProfile = new ag.LazyDefinitionLoader({
                active: this.tabs.mappingProfile,
                headerKey: this.applicationOptions.mappingProfileId,
                definitionKey: this.applicationOptions.mappingProfile.id,
                grids: [mapProfile.matchingCriteria, mapProfile.settings],
                afterLoadCallback: function () {
                    ag.MappingProfilesHierarchicalViewModel.matchingCriteriaStaticInit(_this.grids.mappingProfile.matchingCriteria);
                }
            });

            this.definitionLoaders.timeProfile = new ag.LazyDefinitionLoader({
                active: this.tabs.timeProfile,
                headerKey: this.applicationOptions.timeProfileId,
                definitionKey: this.applicationOptions.timeProfile.id
            });

            this.definitionLoaders.limits = new ag.LazyDefinitionLoader({
                active: this.tabs.limits,
                headerKey: this.applicationOptions.limitsId,
                definitionKey: this.applicationOptions.limits.id,
                grids: [this.applicationOptions.limits.details]
            });

            this.definitionLoaders.alerts = new ag.LazyDefinitionLoader({
                active: this.tabs.alerts,
                headerKey: this.applicationOptions.alertsId,
                definitionKey: this.applicationOptions.alerts.id,
                grids: [this.applicationOptions.alerts.alertsDefinitions]
            });

            this.definitionLoaders.scenarios = new ag.LazyDefinitionLoader({
                active: this.tabs.scenarios,
                headerKey: this.applicationOptions.scenariosId,
                definitionKey: this.applicationOptions.scenarios.id,
                grids: [this.grids.scenarios.scenarioDefinitions]
            });
        };

        AnalyticsReportingViewModel.prototype.createPivot = function (options) {
            return new ag.RiskPivotViewModel(this.selectedQuery, this.views.selected, this.activeReport, this.grid, options);
        };

        AnalyticsReportingViewModel.prototype.beforeApplyBindings = function () {
            ag.ColumnDefinitionViewModel.initialise(this.grids.columnInfo.calculated);
            ag.ScenarioDefinitionViewModel.initialise(this.grids.scenarios, this.applicationOptions.scenarios, this);
        };

        AnalyticsReportingViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            ag.AlertDefinitionViewModel.initialise(this.grids.alerts, this.applicationOptions.alerts);
            ag.MappingProfilesHierarchicalViewModel.initialise(this.grids.mappingProfile, this.applicationOptions.mappingProfile);
            ag.TimeProfilesHierarchicalViewModel.initialise(this.applicationOptions.timeProfile);

            //(<any>ag.risk).setupNavigation(this);
            //ag.risk.observeProperties(this, '@Request.GetSanitizedPath()');
            //(<any>ag.risk).syncMappingProfileGrids(this, 'applicationOptions.mapProfile', 'mapProfile');
            var messageLogAction = this["actions"].messageLog;

            if (messageLogAction)
                messageLogAction.createCustomPayload = function () {
                    var id;
                    if (_this.activeReport() !== null) {
                        id = _this.activeReport().activity();
                    }

                    return { activityId: id };
                };

            this.breadcrumbViewModel.breadcrumb = this.breadcrumb;
            var lastParent = _.last(this.breadcrumb.parents());
            var parent = !lastParent ? undefined : lastParent.id();
            this.breadcrumbViewModel.reset(parent);
        };

        AnalyticsReportingViewModel.prototype.loadGridViewData = function (gridViewModel, activeProperty) {
            if (ko.unwrap(activeProperty))
                gridViewModel.refresh();
        };

        AnalyticsReportingViewModel.prototype.downloadReportCallback = function () {
            return {
                targetUrl: ag.serviceUrl + "/download",
                params: { query: this.nav.current().params.query, report: this.nav.current().params.report }
            };
        };

        AnalyticsReportingViewModel.prototype.getCrystalReportLookup = function () {
            return "{0}{1}".format(ag.applicationPath === "/" ? "" : ag.applicationPath, "/analytics/reporting/getformatfilelookup");
        };

        AnalyticsReportingViewModel.prototype.addCrystalView = function (item) {
            var report = item.crystalReport;
            this.views.selected().crystalReports.push(ko.mapping.fromJS(new ag.RiskCrystalDefinition({ crystalName: report, crystalFile: report })));
        };

        AnalyticsReportingViewModel.prototype.printView = function () {
            if (this.activeReport() && this.activeReport().key() && this.editingQuery)
                this.printViewRequest(this.activeReport().key(), this.applicationOptions.id(), this.views.selected().key(), "pdf", this.grid.getGridViewOptions());
        };

        AnalyticsReportingViewModel.prototype.exportView = function () {
            if (this.activeReport() && this.activeReport().key() && this.editingQuery)
                this.exportViewRequest(this.activeReport().key(), this.applicationOptions.id(), this.views.selected().key(), this.exportFileType(), this.grid.getGridViewOptions());
        };

        AnalyticsReportingViewModel.prototype.editGroupFromBreadcrumb = function () {
            // Fall through to default link behaviour, rather than internal navigation
            return true;
        };

        AnalyticsReportingViewModel.prototype.navigateToGroupUrl = function (viewModel) {
            return "{0}{1}/explorer?id={2}".format(ag.siteRoot, ag.area, ko.unwrap(viewModel.id));
        };

        AnalyticsReportingViewModel.prototype.deleteActiveQuery = function () {
            var _this = this;
            return _super.prototype.deleteActiveQuery.call(this).done(function () {
                var parentBreadcrumb = ko.mapping.toJS(_.last(_this.breadcrumb.parents()));
                ag.navigate(_this.navigateToGroupUrl(parentBreadcrumb));
            });
        };

        AnalyticsReportingViewModel.prototype.deleteQueryRequest = function (query) {
            // Delete an existing query
            return this.net.postJson("deletequery", { queryKey: ag.viewModel.applicationOptions.id() }).fail(function (result) {
                ag.utils.showErrorsFromResult(result);
            });
        };

        AnalyticsReportingViewModel.prototype.deleteReport = function (report) {
            var _this = this;
            var promise = _super.prototype.deleteReport.call(this, report);
            if (promise)
                promise.done(function () {
                    _this.nav.navigate({ report: null });
                });
            return promise;
        };

        AnalyticsReportingViewModel.prototype.additionalSaveQueryPostData = function () {
            return { views: ko.mapping.toJS(this.views.all) };
        };

        // override the save query request handle
        AnalyticsReportingViewModel.prototype.handleQueryResult = function (result) {
            var _this = this;
            var queryFromResult = this.getQueryFromResult(result), selectedViewIdx = _.findIndex(this.views.all(), function (i) {
                return i === _this.views.selected();
            });

            ag.messages.show(result.message, result.messageType);
            this.updateBreadcrumb(result.breadcrumb);
            this.updateEditingQueryAndApplicationOptions(queryFromResult);
            this.navigateToQuery(queryFromResult.id, result.clearReport);
            this.updateViews(result.views, result.viewTables, selectedViewIdx); //do this after navigateToQuery so that the previously selected view is reselected
        };

        AnalyticsReportingViewModel.prototype.updateBreadcrumb = function (breadcrumb) {
            ko.mapping.fromJS(breadcrumb, this.breadcrumb);

            var lastParent = _.last(this.breadcrumb.parents());
            var parent = !lastParent ? undefined : lastParent.id();
            this.breadcrumbViewModel.reset(parent);
        };

        AnalyticsReportingViewModel.prototype.updateEditingQueryAndApplicationOptions = function (query) {
            var _this = this;
            this.applicationOptions.id(query.id);
            this.applicationOptions.name(query.name);

            var updateFieldFunc = function (field) {
                if (_.has(query, field) && _.has(_this.applicationOptions, field))
                    _this.applicationOptions[field](query[field]);
            };
            _.forEach(this.observeProperties, function (obj) {
                if (!obj.hasIdField)
                    return;

                var target = obj.target;

                updateFieldFunc(target + "Name");
                updateFieldFunc(target + "Id");
            });

            this.editingQuery.name(query.name);
        };

        AnalyticsReportingViewModel.prototype.updateViews = function (views, viewTables, selectViewIdx) {
            this.views.update(views, viewTables, false, selectViewIdx);
        };

        AnalyticsReportingViewModel.prototype.navigateToQuery = function (queryId, clearReport) {
            var navParam = { query: queryId, parentid: null, querytype: null, autorun: null };
            if (clearReport)
                navParam = $.extend(navParam, { report: null });

            this.nav.navigate(navParam);
        };

        AnalyticsReportingViewModel.prototype.navigateGetParams = function (query, preview, report, parentid, querytype, autorun) {
            if (typeof query === "undefined") { query = null; }
            if (typeof preview === "undefined") { preview = null; }
            if (typeof report === "undefined") { report = null; }
            if (typeof parentid === "undefined") { parentid = null; }
            if (typeof querytype === "undefined") { querytype = null; }
            if (typeof autorun === "undefined") { autorun = null; }
            return { query: query, preview: preview, report: report, parentid: parentid, querytype: querytype, autorun: autorun };
        };

        AnalyticsReportingViewModel.prototype.navigateToNewItem = function (type) {
            var link = ag.serviceUrl + '?parentid={0}&querytype={1}'.format(this.applicationOptions.parentId(), type);
            ag.navigate(link);
        };

        AnalyticsReportingViewModel.prototype.verifyQueryKey = function (queryKey) {
            return queryKey;
        };

        AnalyticsReportingViewModel.prototype.moveItem = function (items, event, model) {
            var location = this.breadcrumbViewModel.getNewLocation(items, event, model);
            if (!location)
                return;

            this.applicationOptions.parentId(location.id);
        };
        return AnalyticsReportingViewModel;
    })(ag.ReportingViewModel);
    ag.AnalyticsReportingViewModel = AnalyticsReportingViewModel;
})(ag || (ag = {}));
