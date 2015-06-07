/// <reference path="../../helpers/dom.ts" />
/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../models/PivotFieldData.ts" />
/// <reference path="PivotDrillDownViewModel.ts" />
/// <reference path="PivotFontSizeViewModel.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../../proxies/reportProxy.ts" />
/// <reference path="../VisualisationViewModel.ts" />
/// <reference path="../FlexiblePager.ts" />
var ag;
(function (ag) {
    var PivotViewModel = (function () {
        function PivotViewModel(selectedQuery, selectedView, activeReport, grid, options) {
            var _this = this;
            this.items = ko.observableArray();
            this.visible = ko.observable(false);
            this.initializing = true;
            //groupRows = ko.observable(0);
            this.search = new ag.SearchViewModel();
            this.fontSize = new ag.PivotFontSizeViewModel();
            this.drillDown = {};
            this.pivotHtml = ko.observable("");
            this.hasEndTotals = ko.observable(false);
            this.showEndTotals = ko.observable(false);
            this.pivotData = {};
            this.rowExpansions = ko.observableArray([]);
            this.resetRunningTotalsUpdate = ko.observable(false);
            //grid: GridViewModel;
            this.reportProxy = new ag.ReportProxy();
            this.expansions = ko.observableArray([]);
            this.allOperators = ko.observableArray([
                { text: ag.strings.none, value: 0 },
                { text: ag.strings.count, value: 1 },
                { text: ag.strings.sum, value: 2 },
                { text: ag.strings.runningSum, value: 3 },
                // { text: strings.revRunningSum, value: 4 },
                { text: ag.strings.max, value: 5 },
                { text: ag.strings.min, value: 6 },
                { text: ag.strings.mean, value: 7 }
            ]);
            this.expand = function (key) {
                if (_.contains(_this.expansions(), key))
                    _this.expansions.remove(key);
                else
                    _this.expansions.push(key);
            };
            this.fields = ko.mapping.fromJS([], {
                key: function (item) {
                    return ko.unwrap(item.key);
                },
                create: function (options) {
                    return new ag.PivotFieldData(options.data);
                }
            });

            this.displayConfiguration = ko.computed(function () {
                return selectedView().groupRowsBy().length > 0 || selectedView().groupColumnsBy().length > 0 || selectedView().aggregateOn().length > 0;
            });

            this.selectedView = selectedView;
            this.activeReport = activeReport;
            this.updateDrillDown(this.selectedView().clientKey());

            this.pager = new ag.FlexiblePager({ updating: grid.isLoading, pageSize: options.pageSize || 20, activeSortColumns: ko.computed(this.getActiveSortColumns, this) });

            this.columns = ko.computed(function () {
                var fields = _this.fields();
                return ko.unwrap(fields[fields.length - 1]);
            });

            this.pivotFilters = ko.computed(function () {
                var result = {};

                _this.addFilters(result, _this.selectedDrillDown().rowFilters.filters(), 'row');
                _this.addFilters(result, _this.selectedDrillDown().columnFilters.filters(), 'column');

                return result;
            });

            var refreshPivotColumnsComputed = ko.computed(function () {
                var fontSize = _this.fontSize.css();
                _this.updatePivotColumns();
            }, this).extend({ rateLimit: ag.utils.getRateLimitOption() });

            var resetBackToPageOneComputed = ko.computed(function () {
                var drillDownLevel = _this.selectedDrillDown().level(), drillDownFilters = _this.selectedDrillDown().filters();

                _this.pager.navigateToPage(1);
            }, this).extend({
                rateLimit: ag.utils.getRateLimitOption()
            });

            //this.rowsLookup = ko.computed(() =>
            //{
            //   return this.groupByLookup(selectedView().groupRowsBy());
            //});
            //this.columnsLookup = ko.computed(() =>
            //{
            //   return this.groupByLookup(selectedView().groupColumnsBy());
            //});
            this.maxRowDrillDownLevel = ko.computed(function () {
                return Math.max(0, _.chain(_this.selectedView().groupRowsBy()).map(function (item) {
                    return ko.unwrap(item.groupByLevel);
                }).max().value());
            });

            this.maxColumnDrillDownLevel = ko.computed(function () {
                return Math.max(0, _.chain(_this.selectedView().groupColumnsBy()).map(function (item) {
                    return ko.unwrap(item.groupByLevel);
                }).max().value());
            });

            this.maxAggregateDrillDownLevel = ko.computed(function () {
                return Math.max(0, _.chain(selectedView().aggregateOn()).map(function (item) {
                    return ko.unwrap(item.groupByLevel);
                }).max().value());
            });

            this.maxDrillDownLevel = ko.computed(function () {
                return Math.max(_this.maxRowDrillDownLevel(), _this.maxAggregateDrillDownLevel(), _this.maxColumnDrillDownLevel());
            });

            this.maxDrillDownRange = ko.computed(function () {
                var view = selectedView();

                //if (selectedView().groupRowsBy().length === 0 &&
                //    selectedView().aggregateOn().length === 0)
                //{
                //   return _.range(0);
                //}
                return _.range(_this.maxDrillDownLevel() + 2);
            });

            this.allFields = ko.computed(function () {
                var visible = _.filter(_this.selectedView().fields(), function (field) {
                    return field.hidden() === false;
                });

                var allFields = visible.concat(_this.selectedView().groupRowsBy(), _this.selectedView().groupColumnsBy(), _this.selectedView().aggregateOn());

                return _.uniq(allFields, _this.fieldKey);
            });

            this.pivotFields = ko.computed(function () {
                var pivotFields = [].concat(selectedView().groupRowsBy(), selectedView().groupColumnsBy(), selectedView().aggregateOn());

                return _.uniq(pivotFields, _this.fieldKey);
            });

            this.measureFields = ko.computed(function () {
                return _this.selectedView().aggregateOn();
            });

            this.groupRowsCount = ko.computed(function () {
                return _this.selectedView().groupRowsBy().length;
            });

            this.resetRunningTotalsVisible = ko.computed(function () {
                return _.any(selectedView().aggregateOn(), function (item) {
                    return (item.operator && (item.operator() === 3 || item.operator() === 4)) || (item.totalOperator && (item.totalOperator() === 3 || item.totalOperator() === 4));
                });
            });

            this.maxDrillDownLevel.subscribe(function () {
                _this.updateRowExpansions();
            });

            selectedView.subscribe(function () {
                _this.updateRowExpansions();
            });

            this.rowFieldLookupUrl = ko.computed(function () {
                return "/{0}/{1}".format(options.serviceUrl, "getviewfields");
            });

            this.columnFieldLookupUrl = ko.computed(function () {
                return "/{0}/{1}".format(options.serviceUrl, "getviewfields");
            });

            this.aggregateFieldLookupUrl = ko.computed(function () {
                return "/{0}/{1}".format(options.serviceUrl, "getaggregatefields");
            });

            this.updateRowExpansions();

            this.endTotalRows = ko.computed(function () {
                return _this.endTotalFields(selectedView().groupRowsBy);
            });

            this.resetRunningTotals = ko.computed(function () {
                _this.resetRunningTotalsUpdate();
                return ko.observableArray(_.filter(selectedView().groupRowsBy(), function (row) {
                    return row.resetRunningTotals && row.resetRunningTotals();
                }));
            });

            this.rowCss = ko.computed(function () {
                return true;
            });

            var loadPivotComputed = ko.computed(function () {
                _this.refreshPivot();
            }, this).extend({
                rateLimit: ag.utils.getRateLimitOption()
            });

            this.css = ko.computed(function () {
                return _.extend({ 'show-end-totals': _this.showEndTotals() }, _this.fontSize.css());
            });

            this.groupRowsByFormatVisible = ko.computed(function () {
                return _this.formatVisible(selectedView().groupRowsBy());
            });
            this.groupColumnsByFormatVisible = ko.computed(function () {
                return _this.formatVisible(selectedView().groupColumnsBy());
            });
            this.aggregateOnFormatVisible = ko.computed(function () {
                return _this.formatVisible(selectedView().aggregateOn());
            });

            this.selectedView.subscribe(function (newValue) {
                var isPivot = ko.unwrap(newValue.isPivot);
                if (!isPivot)
                    return;

                _this.updateDrillDown(ko.unwrap(newValue.clientKey));
            });
        }
        PivotViewModel.prototype.updateDrillDown = function (key) {
            var drillDown = this.drillDown[key];
            if (!drillDown) {
                drillDown = new ag.PivotDrillDownViewModel();
                this.drillDown[key] = drillDown;
            }

            var selectedDrillDown = this.selectedDrillDown;
            if (selectedDrillDown)
                selectedDrillDown(drillDown);
            else
                this.selectedDrillDown = ko.observable(drillDown);
        };

        PivotViewModel.prototype.addFilters = function (result, filters, item) {
            _.each(filters, function (filter, index) {
                result[item + 'Filters[' + index + '].key'] = filter.key;
                result[item + 'Filters[' + index + '].fullKey'] = filter.fullKey;
                result[item + 'Filters[' + index + '].value'] = encodeURIComponent(filter.value);
                result[item + 'Filters[' + index + '].name'] = filter.name;
                result[item + 'Filters[' + index + '].drillDownLevel'] = filter.drillDownLevel;
                result[item + 'Filters[' + index + '].dataType'] = filter.dataType;
            });
        };

        PivotViewModel.prototype.reset = function () {
            this.selectedDrillDown().level(0);
            this.selectedDrillDown().rowFilters.clear();
            this.selectedDrillDown().columnFilters.clear();
        };

        PivotViewModel.prototype.formatVisible = function (fields) {
            return _.any(fields, function (field) {
                return ko.unwrap(field.canEditFormatMask);
            });
        };

        PivotViewModel.prototype.groupLevels = function (view) {
            var rows = ko.unwrap(view.groupRowsBy) || [], columns = ko.unwrap(view.groupColumnsBy) || [], values = ko.unwrap(view.aggregateOn) || [], result = [];

            result.push(_.map(rows, this.getGroupByLevel));
            result.push(_.map(columns, this.getGroupByLevel));
            result.push(_.map(values, this.getGroupByLevel));

            return result;
        };

        PivotViewModel.prototype.getGroupByLevel = function (item) {
            return ko.unwrap(item.groupByLevel);
        };

        PivotViewModel.prototype.operators = function (dataType) {
            var operatorValues = this.getOperatorValues(dataType);
            return _.filter(this.allOperators(), function (operator) {
                return _.contains(operatorValues, operator.value);
            });
        };

        PivotViewModel.prototype.getOperatorValues = function (dataType) {
            switch (dataType) {
                case 'string':
                    return [0, 1, 5, 6, 9, 10, 11];
                case 'integer':
                case 'decimal':
                    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                case 'datetime':
                    return [0, 1, 5, 6, 9, 10];
            }

            return [0];
        };

        PivotViewModel.prototype.groupByLookup = function (items) {
            var lookup = {};

            lookup.data = _.map(items, function (item) {
                return { key: item.key(), field: item.displayName() };
            });

            lookup.fields = [
                { key: 'key', displayName: 'Key', isKey: true, hidden: true },
                { key: 'field', displayName: 'Field' }
            ];

            return ag.utils.transformLookup(lookup);
        };

        PivotViewModel.prototype.fieldKey = function (field) {
            return ko.unwrap(field.key);
        };

        PivotViewModel.prototype.updateRowExpansions = function () {
            var _this = this;
            _.each(this.maxDrillDownRange(), function (drillDown) {
                _this.rowExpansions()[drillDown] = ko.observableArray(_.filter(_this.selectedView().groupRowsBy(), function (item) {
                    return item.groupByLevel && item.groupByLevel() === drillDown;
                }));
            });
        };

        PivotViewModel.prototype.endTotalFields = function (observableArray) {
            return ko.observableArray(_.filter(observableArray(), function (row) {
                return row.endTotal && row.endTotal();
            }));
        };

        PivotViewModel.prototype.updateEndTotals = function (items, groupByItems) {
            _.each(groupByItems, function (item) {
                if (!item.endTotal) {
                    item.endTotal = ko.observable(false);
                }

                item.endTotal(_.any(items, function (i) {
                    return ko.unwrap(i.key) === ko.unwrap(item.key);
                }));
            });
        };

        PivotViewModel.prototype.filterFields = function (fields) {
            var _this = this;
            return _.map(fields, function (field) {
                return _.filter(field, function (item) {
                    return !_.any(_this.selectedDrillDown().rowFilters.filters(), function (filter) {
                        return ko.unwrap(item.key).toLowerCase() === ko.unwrap(filter.key).toLowerCase();
                    });
                });
            });
        };

        PivotViewModel.prototype.processResult = function (result) {
            this.visible(true);

            //this.groupRows(result.groupRows - this.drillDown.row.filters().length);
            ko.mapping.fromJS(this.filterFields(result.pivotFields), this.fields);

            //this.fields(this.filterFields(result.pivotFields));
            this.selectedDrillDown().level(0);
            this.selectedDrillDown().max(result.maxDrillDownLevel);

            this.showEndTotals(false);
            this.pivotHtml(result.pivotHtml);
            this.hasEndTotals(result.hasEndTotals);
            this.pivotData = result.pivotData;

            this.pager.updateFromResponse(result);

            // Notify the searchTerms observable array in search.js
            this.search.searchTerms(result.gridViewOptions.searchTerms);
        };

        PivotViewModel.prototype.hide = function () {
            this.visible(false);
        };

        PivotViewModel.prototype.refreshPivot = function (data, useCache) {
            var _this = this;
            if (typeof useCache === "undefined") { useCache = true; }
            var params = {
                page: this.pager.page(),
                pageSize: this.pager.pageSize(),
                pageTargetsCenter: this.pager.pageTargetsCenter(),
                pageTargetsInnerSize: this.pager.pageTargetsInnerSize(),
                pageTargetsEdgeSize: this.pager.pageTargetsEdgeSize(),
                drillDownLevel: this.selectedDrillDown().level()
            };

            this.expansions();

            if (this.search.hasText()) {
                params.searchText = encodeURIComponent(this.search.text());
            }

            $.extend(params, this.pivotFilters());

            // First time the computed is evaluated we are simply
            // initializing values and don't want to call getItems()
            if (this.initializing) {
                this.initializing = false;
                return;
            }

            // Load the items - needs to be wrapped in setTimeout to
            // avoid new dependencies being added to this computed
            window.setTimeout(function () {
                _this.getItems(ag.GridViewModel.prototype.buildQuery(ko.toJS(params)), data, useCache);
            }, 0);
        };

        PivotViewModel.prototype.getItems = function (queryString, data, useCache) {
            var _this = this;
            if (typeof useCache === "undefined") { useCache = true; }
            var report = this.activeReport();
            if (report) {
                this.reportProxy.runView(report, this.selectedView(), queryString, useCache, data, this.expansions(), function (result) {
                    // This means that the fields have changed
                    if (result.isPivoted) {
                        //this.groupRows(result.groupRows - this.drillDown.row.filters().length);
                        //this.fields(this.filterFields(result.pivotFields));
                        ko.mapping.fromJS(_this.filterFields(result.pivotFields), _this.fields);
                    }

                    _this.showEndTotals(false);
                    _this.pivotHtml(result.pivotHtml);
                    _this.hasEndTotals(result.hasEndTotals);
                    _this.pivotData = result.pivotData;

                    _this.pager.updateFromResponse(result);
                    _this.search.searchTerms(result.gridViewOptions.searchTerms);
                });
            }
        };

        PivotViewModel.prototype.updatePivotColumns = function () {
            ag.dom.updatePivotColumns(_.filter(this.columns(), function (c) {
                return c.itemType === 9;
            }));
        };

        PivotViewModel.prototype.toggleEndTotals = function () {
            this.showEndTotals(!this.showEndTotals());
            this.updatePivotColumns();
        };

        PivotViewModel.prototype.getActiveSortColumns = function () {
            var _this = this;
            return _.chain(this.selectedView().groupRowsBy()).filter(function (i) {
                return ko.unwrap(i.groupByLevel) == _this.selectedDrillDown().level();
            }).map(function (i) {
                return ko.mapping.fromJS(new ag.FieldData({ key: "value", dataType: "string", displayName: ko.unwrap(i.displayName) }));
            }).value().slice(0, 1);
        };
        return PivotViewModel;
    })();
    ag.PivotViewModel = PivotViewModel;
})(ag || (ag = {}));
