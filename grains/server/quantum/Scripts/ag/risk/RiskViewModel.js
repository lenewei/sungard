/// <reference path="../viewModels/action/action.ts" />
/// <reference path="scenarioGraph.ts" />
/// <reference path="observeProperties.ts" />
/// <reference path="RiskPivotViewModel.ts" />
/// <reference path="../../ts/global.d.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../viewModels/reportingViewModel.ts" />
/// <reference path="../viewModels/FiltersViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var ag;
(function (ag) {
    "use strict";

    var AnalyticsViewModel = (function (_super) {
        __extends(AnalyticsViewModel, _super);
        function AnalyticsViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.tabs = {};
            this.mappingProfileActive = ko.observable(false);

            this.dealIdGuid = options.dealIdGuid;

            this.tabs['limits'] = ko.observable(false);
            this.tabs['scenarios'] = ko.observable(false);
            this.tabs['columns'] = ko.observable(false);
            this.tabs['alerts'] = ko.observable(false);
            this.tabs['mappingProfile'] = ko.observable(false);

            // These are on the Time Profile tab.
            this.tabs['details'] = ko.observable(false);
            this.tabs['preview'] = ko.observable(false);

            this.tabs['rates'] = ko.observable(false);
            this.tabs['graph'] = ko.observable(false);

            this.filters = new ag.FiltersViewModel({
                availableOperators: options.availableOperators,
                controller: "filters"
            });

            this.balances = new ag.FiltersViewModel({
                serviceUrl: options.serviceUrl,
                availableOperators: options.availableOperators,
                controller: "balances"
            });

            this.tabs['limits'].subscribe(function () {
                _this.loadGridViewData(_this.applicationOptions.limits.details, _this.tabs['limits']);
            });

            this.tabs['columns'].subscribe(function () {
                var columns = _this.applicationOptions.columnInfo;
                _this.loadGridViewData(columns.groupBy, _this.tabs['columns']);
                _this.loadGridViewData(columns.pointInTime, _this.tabs['columns']);
                _this.loadGridViewData(columns.movement, _this.tabs['columns']);
                _this.loadGridViewData(columns.database, _this.tabs['columns']);
                _this.loadGridViewData(columns.calculated, _this.tabs['columns']);
            });

            this.tabs['alerts'].subscribe(function () {
                _this.loadGridViewData(_this.applicationOptions.alerts.alertsDefinitions, _this.tabs['alerts']);
            });

            this.tabs['mappingProfile'].subscribe(function () {
                var mapProfile = _this.applicationOptions.mappingProfile;
                _this.loadGridViewData(mapProfile.mappingCodes, _this.tabs['mappingProfile']);
                _this.loadGridViewData(mapProfile.mappingRules, _this.tabs['mappingProfile']);
            });

            this.tabs['scenarios'].subscribe(function () {
                _this.loadGridViewData(_this.grids.scenarios.scenarioDefinitions, _this.tabs['scenarios']);
            });

            if (options.editingQuery) {
                if (!options.editingQuery.key)
                    this.toggleConfiguration();
            }
        }
        AnalyticsViewModel.prototype.createPivot = function (options) {
            return new ag.RiskPivotViewModel(this.selectedQuery, this.views.selected, this.activeReport, this.messages, this.grid, options);
        };

        AnalyticsViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            ag.AlertDefinitionViewModel.initialise(this.grids.alerts, this.applicationOptions.alerts);
            ag.ScenarioDefinitionViewModel.initialise(this.grids.scenarios, this.applicationOptions.scenarios, this);
            ag.AnalyticsMappingProfilesHierarchicalViewModel.initialise(this.grids.mappingProfile, this.applicationOptions.mappingProfile);

            //(<any>ag.risk).syncFields(this);
            //(<any>ag.risk).setupNavigation(this);
            //ag.risk.observeProperties(this, '@Request.GetSanitizedPath()');
            //(<any>ag.risk).syncMappingProfileGrids(this, 'applicationOptions.mapProfile', 'mapProfile');
            //ag.risk.scenarioGraph(this);
            var messageLogAction = this["actions"].messageLog;

            if (messageLogAction) {
                messageLogAction.createCustomPayload = function () {
                    return { activityId: _this.activeReport().activity() };
                };
            }
        };

        AnalyticsViewModel.prototype.loadGridViewData = function (gridViewModel, activeProperty) {
            if (activeProperty()) {
                gridViewModel.refresh();
            }
        };

        AnalyticsViewModel.prototype.downloadReportCallback = function () {
            var url = (ag.applicationPath === "/" ? "" : ag.applicationPath) + ag.serviceUrl + "/download/?id={0}";
            return url.format(this.nav.current().params.query);
        };

        AnalyticsViewModel.prototype.removeCrystalView = function (item) {
            var view = _.find(this.views.all(), function (v) {
                return ko.unwrap(v.name) === ko.unwrap(item.crystalName) && ko.unwrap(v.viewType) === 1;
            });
            if (view) {
                this.views.all.remove(view);
            }
            return true;
        };

        AnalyticsViewModel.prototype.addCrystalView = function (item) {
            var report = item.crystalReport;
            this.views.selected().crystalReports.push({ crystalName: report, crystalFile: report });
            this.views.all.push(ko.mapping.fromJS(new ag.ViewData({ name: report, viewType: 1 })));
        };

        AnalyticsViewModel.prototype.editGroupFromBreadcrumb = function () {
            // Fall through to default link behaviour, rather than internal navigation
            return true;
        };

        AnalyticsViewModel.prototype.navigateToGroupUrl = function (viewModel) {
            return "{0}{1}/explorer?id={2}".format(ag.siteRoot, ag.area, ko.unwrap(viewModel.id));
        };
        return AnalyticsViewModel;
    })(ag.ReportingViewModel);
    ag.AnalyticsViewModel = AnalyticsViewModel;

    var RiskViewModel = (function (_super) {
        __extends(RiskViewModel, _super);
        function RiskViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.limitsActive = ko.observable(false);
            this.mappingProfileActive = ko.observable(false);

            this.dealIdGuid = options.dealIdGuid;

            this.balances = new ag.FiltersViewModel({
                serviceUrl: options.serviceUrl,
                availableOperators: options.availableOperators,
                fieldsAction: "getquerybankbalancefields",
                linksAction: "getBalanceLinks"
            });

            this.limitsActive.subscribe(function () {
                _this.loadGridViewData(_this.applicationOptions.limits.limitDetails, _this.limitsActive);
            });

            this.mappingProfileActive.subscribe(function () {
                var mapProfile = _this.applicationOptions.mapProfile;
                _this.loadGridViewData(mapProfile.mappingProfileDetails, _this.mappingProfileActive);
                _this.loadGridViewData(mapProfile.mappingCodeDetails, _this.mappingProfileActive);
                _this.loadGridViewData(mapProfile.mappingCodeDetailsVar, _this.mappingProfileActive);
            });

            if (options.editingQuery) {
                if (!options.editingQuery.key)
                    this.toggleConfiguration();
            }
        }
        RiskViewModel.prototype.createPivot = function (options) {
            return new ag.RiskPivotViewModel(this.selectedQuery, this.views.selected, this.activeReport, this.messages, this.grid, options);
        };

        RiskViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            ag.risk.syncFields(this);
            ag.risk.setupNavigation(this);
            ag.risk.observeProperties(this, '@Request.GetSanitizedPath()');
            ag.risk.syncMappingProfileGrids(this, 'applicationOptions.mapProfile', 'mapProfile');

            //ag.risk.scenarioGraph(this);
            var messageLogAction = this["actions"].messageLog;

            if (messageLogAction) {
                messageLogAction.createCustomPayload = function () {
                    return { activityId: _this.activeReport().activity() };
                };
            }
        };

        RiskViewModel.prototype.loadGridViewData = function (gridViewModel, activeProperty) {
            if (activeProperty()) {
                gridViewModel.refresh();
            }
        };

        RiskViewModel.prototype.downloadReport = function () {
            var url = (ag.applicationPath === "/" ? "" : ag.applicationPath) + ag.serviceUrl + "/download/?id={0}";
            ag.navigate(url.format(this.editingQuery.key()), false);
        };

        RiskViewModel.prototype.removeCrystalView = function (item) {
            var view = _.find(this.views.all(), function (v) {
                return ko.unwrap(v.name) === ko.unwrap(item.crystalName) && ko.unwrap(v.viewType) === 1;
            });
            if (view) {
                this.views.all.remove(view);
            }
            return true;
        };

        RiskViewModel.prototype.addCrystalView = function (item) {
            var report = item.crystalReport;
            this.views.selected().crystalReports.push({ crystalName: report, crystalFile: report });
            this.views.all.push(ko.mapping.fromJS(new ag.ViewData({ name: report, viewType: 1 })));
        };
        return RiskViewModel;
    })(ag.ReportingViewModel);
    ag.RiskViewModel = RiskViewModel;
})(ag || (ag = {}));
