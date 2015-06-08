/// <reference path="../../helpers/dom.ts" />
/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../models/PivotFieldData.ts" />
/// <reference path="PivotDrillDownViewModel.ts" />
/// <reference path="PivotFontSizeViewModel.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../../proxies/reportProxy.ts" />
/// <reference path="../VisualisationViewModel.ts" />
/// <reference path="../FlexiblePager.ts" />

module ag
{
   export class PivotViewModel
   {
      fields: KnockoutObservableArray<any>;
      items = ko.observableArray();
      visible = ko.observable(false);
      hasGrandTotals: KnockoutComputed<any>;
      displayConfiguration: KnockoutComputed<any>;
      private initializing = true;
      pager: FlexiblePager;

      //groupRows = ko.observable(0);
      search = new SearchViewModel();
      fontSize = new PivotFontSizeViewModel();
      selectedDrillDown: KnockoutObservable<PivotDrillDownViewModel>;
      drillDown = {};
      pivotFilters: KnockoutComputed<any>;
      pivotHtml = ko.observable("");
      hasEndTotals = ko.observable(false);
      showEndTotals = ko.observable(false);
      pivotData = {};
      css: KnockoutComputed<any>;

      rowsLookup: KnockoutComputed<any>;
      columnsLookup: KnockoutComputed<any>;
      selectedView: any;
      resetRunningTotalsVisible: KnockoutComputed<any>;
      allFields: KnockoutComputed<any>;
      rowExpansions = ko.observableArray([]);
      private maxRowDrillDownLevel: KnockoutComputed<any>;
      private maxColumnDrillDownLevel: KnockoutComputed<any>;
      maxDrillDownLevel: KnockoutComputed<any>;
      maxDrillDownRange: KnockoutComputed<any>;
      rowFieldLookupUrl: KnockoutComputed<any>;
      columnFieldLookupUrl: KnockoutComputed<any>;
      aggregateFieldLookupUrl: KnockoutComputed<any>;
      endTotalRows: KnockoutComputed<any>;
      resetRunningTotals: KnockoutComputed<any>;
      resetRunningTotalsUpdate = ko.observable(false);
      rowCss: KnockoutComputed<any>;
      pivotFields: KnockoutComputed<any>;
      measureFields: KnockoutComputed<any>;
      groupRowsCount: KnockoutComputed<any>;
      maxAggregateDrillDownLevel: KnockoutComputed<any>;
      columns: KnockoutComputed<any>;
      activeReport: any;
      //grid: GridViewModel;
      reportProxy = new ReportProxy();

      groupRowsByFormatVisible: KnockoutComputed<any>;
      groupColumnsByFormatVisible: KnockoutComputed<any>;
      aggregateOnFormatVisible: KnockoutComputed<any>;

      expansions = ko.observableArray([]);

      allOperators = ko.observableArray(
         [
            { text: strings.none, value: 0 },
            { text: strings.count, value: 1 },
            { text: strings.sum, value: 2 },
            { text: strings.runningSum, value: 3 },
            // { text: strings.revRunningSum, value: 4 },
            { text: strings.max, value: 5 },
            { text: strings.min, value: 6 },
            { text: strings.mean, value: 7 },
            // { text: "Mean (exluding zero)", value: 8 },
            // { text: strings.first, value: 9 },
            // { text: strings.last, value: 10 },
            // { text: strings.list, value: 11 }
         ]);

      constructor(selectedQuery, selectedView, activeReport, grid: GridViewModel, options)
      {
         this.fields = ko.mapping.fromJS([],
         {
            key: (item) =>
            {
               return ko.unwrap(item.key);
            },
            create: (options) =>
            {
               return new PivotFieldData(options.data);
            }
         });

         this.displayConfiguration = ko.computed(() =>
         {
            return selectedView().groupRowsBy().length > 0 ||
               selectedView().groupColumnsBy().length > 0 ||
               selectedView().aggregateOn().length > 0;
         });

         this.selectedView = selectedView;
         this.activeReport = activeReport;
         this.updateDrillDown(this.selectedView().clientKey());

         this.pager = new FlexiblePager({ updating: grid.isLoading, pageSize: options.pageSize || 20, activeSortColumns: ko.computed(this.getActiveSortColumns, this) });

         this.columns = ko.computed(() =>
         {
            var fields = this.fields();
            return ko.unwrap(fields[fields.length - 1]);
         });

         this.pivotFilters = ko.computed(() =>
         {
            var result: any = {};

            this.addFilters(result, this.selectedDrillDown().rowFilters.filters(), 'row');
            this.addFilters(result, this.selectedDrillDown().columnFilters.filters(), 'column');

            return result;
         });

         var refreshPivotColumnsComputed = ko.computed(() =>
         {
            var fontSize = this.fontSize.css();
            this.updatePivotColumns();
         },
            this).extend({ rateLimit: utils.getRateLimitOption() });

         var resetBackToPageOneComputed = ko.computed(() =>
         {
            var drillDownLevel = this.selectedDrillDown().level(),
               drillDownFilters = this.selectedDrillDown().filters();

            this.pager.navigateToPage(1);
         },
            this).extend({
               rateLimit: utils.getRateLimitOption()
            });

         //this.rowsLookup = ko.computed(() =>
         //{
         //   return this.groupByLookup(selectedView().groupRowsBy());
         //});

         //this.columnsLookup = ko.computed(() =>
         //{
         //   return this.groupByLookup(selectedView().groupColumnsBy());
         //});

         this.maxRowDrillDownLevel = ko.computed(() =>
         {
            return Math.max(0, <number>
               _.chain(this.selectedView().groupRowsBy())
                  .map((item: any) => { return ko.unwrap(item.groupByLevel); })
                  .max()
                  .value());
         });

         this.maxColumnDrillDownLevel = ko.computed(() =>
         {
            return Math.max(0, <number>
               _.chain(this.selectedView().groupColumnsBy())
                  .map((item: any) => { return ko.unwrap(item.groupByLevel); })
                  .max()
                  .value());
         });

         this.maxAggregateDrillDownLevel = ko.computed(() =>
         {
            return Math.max(0, <number>
               _.chain(selectedView().aggregateOn())
                  .map((item: any) => { return ko.unwrap(item.groupByLevel); })
                  .max()
                  .value());
         });

         this.maxDrillDownLevel = ko.computed(() =>
         {
            return Math.max(
               this.maxRowDrillDownLevel(),
               this.maxAggregateDrillDownLevel(),
               this.maxColumnDrillDownLevel());
         });

         this.maxDrillDownRange = ko.computed(() =>
         {
            var view = selectedView();
            //if (selectedView().groupRowsBy().length === 0 &&
            //    selectedView().aggregateOn().length === 0)
            //{
            //   return _.range(0);
            //}

            return _.range(this.maxDrillDownLevel() + 2);
         });

         this.allFields = ko.computed(() =>
         {
            var visible = _.filter(this.selectedView().fields(), (field: any) =>
            {
               return field.hidden() === false;
            });

            var allFields = visible.concat(
               this.selectedView().groupRowsBy(),
               this.selectedView().groupColumnsBy(),
               this.selectedView().aggregateOn());

            return _.uniq(allFields, this.fieldKey);
         });

         this.pivotFields = ko.computed(() =>
         {
            var pivotFields = [].concat(
               selectedView().groupRowsBy(),
               selectedView().groupColumnsBy(),
               selectedView().aggregateOn());

            return _.uniq(pivotFields, this.fieldKey);
         });

         this.measureFields = ko.computed(() =>
         {
            return this.selectedView().aggregateOn();
         });

         this.groupRowsCount = ko.computed(() =>
         {
            return this.selectedView().groupRowsBy().length;
         });

         this.resetRunningTotalsVisible = ko.computed(() =>
         {
            return _.any(selectedView().aggregateOn(), (item: any) =>
            {
               return (item.operator && (item.operator() === 3 || item.operator() === 4)) ||
                  (item.totalOperator && (item.totalOperator() === 3 || item.totalOperator() === 4));
            });
         });

         this.maxDrillDownLevel.subscribe(() =>
         {
            this.updateRowExpansions();
         });

         selectedView.subscribe(() =>
         {
            this.updateRowExpansions();
         });

         this.rowFieldLookupUrl = ko.computed(() =>
         {
            return "/{0}/{1}".format(options.serviceUrl, "getviewfields");
         });

         this.columnFieldLookupUrl = ko.computed(() =>
         {
            return "/{0}/{1}".format(options.serviceUrl, "getviewfields");
         });

         this.aggregateFieldLookupUrl = ko.computed(() =>
         {
            return "/{0}/{1}".format(options.serviceUrl, "getaggregatefields");
         });

         this.updateRowExpansions();

         this.endTotalRows = ko.computed(() =>
         {
            return this.endTotalFields(selectedView().groupRowsBy);
         });

         this.resetRunningTotals = ko.computed(() =>
         {
            this.resetRunningTotalsUpdate();
            return ko.observableArray(_.filter(selectedView().groupRowsBy(), (row: any) =>
            {
               return row.resetRunningTotals && row.resetRunningTotals();
            }));
         });

         this.rowCss = ko.computed(() =>
         {
            return true;
         });

         var loadPivotComputed = ko.computed(() =>
         {
            this.refreshPivot();
         },
            this).extend({
               rateLimit: utils.getRateLimitOption()
            });

         this.css = ko.computed(() =>
         {
            return _.extend({ 'show-end-totals': this.showEndTotals() }, this.fontSize.css());
         });

         this.groupRowsByFormatVisible = ko.computed(() => this.formatVisible(selectedView().groupRowsBy()));
         this.groupColumnsByFormatVisible = ko.computed(() => this.formatVisible(selectedView().groupColumnsBy()));
         this.aggregateOnFormatVisible = ko.computed(() => this.formatVisible(selectedView().aggregateOn()));

         this.selectedView.subscribe((newValue) =>
         {
            var isPivot = ko.unwrap(newValue.isPivot);
            if (!isPivot)
               return;

            this.updateDrillDown(ko.unwrap(newValue.clientKey));
         });
      }

      private updateDrillDown(key: string)
      {
         var drillDown = this.drillDown[key];
         if (!drillDown)
         {
            drillDown = new PivotDrillDownViewModel();
            this.drillDown[key] = drillDown;
         }

         var selectedDrillDown = this.selectedDrillDown;
         if (selectedDrillDown)
            selectedDrillDown(drillDown);
         else
            this.selectedDrillDown = ko.observable(drillDown);
      }

      private addFilters(result: any, filters: any[], item: string)
      {
         _.each(filters, (filter: any, index: number) =>
         {
            result[item + 'Filters[' + index + '].key'] = filter.key;
            result[item + 'Filters[' + index + '].fullKey'] = filter.fullKey;
            result[item + 'Filters[' + index + '].value'] = filter.value;
            result[item + 'Filters[' + index + '].name'] = filter.name;
            result[item + 'Filters[' + index + '].drillDownLevel'] = filter.drillDownLevel;
            result[item + 'Filters[' + index + '].dataType'] = filter.dataType;
         });
      }

      reset()
      {
         this.selectedDrillDown().level(0);
         this.selectedDrillDown().rowFilters.clear();
         this.selectedDrillDown().columnFilters.clear();
      }

      private formatVisible(fields)
      {
         return _.any(fields, (field: ViewFieldData) =>
         {
            return ko.unwrap(field.canEditFormatMask);
         });
      }

      private groupLevels(view)
      {
         var rows = ko.unwrap(view.groupRowsBy) || [],
            columns = ko.unwrap(view.groupColumnsBy) || [],
            values = ko.unwrap(view.aggregateOn) || [],
            result = [];

         result.push(_.map(rows, this.getGroupByLevel));
         result.push(_.map(columns, this.getGroupByLevel));
         result.push(_.map(values, this.getGroupByLevel));

         return result;
      }

      private getGroupByLevel(item: any)
      {
         return ko.unwrap(item.groupByLevel);
      }

      operators(dataType)
      {
         var operatorValues = this.getOperatorValues(dataType);
         return _.filter(this.allOperators(), (operator: any) =>
         {
            return _.contains(operatorValues, operator.value);
         });
      }

      private getOperatorValues(dataType)
      {
         switch (dataType)
         {
            case 'string':
               return [0, 1, 5, 6, 9, 10, 11];
            case 'integer':
            case 'decimal':
               return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            case 'datetime':
               return [0, 1, 5, 6, 9, 10];
         }

         return [0];
      }


      private groupByLookup(items)
      {
         var lookup: any = {};

         lookup.data = _.map(items, (item: any) =>
         {
            return { key: item.key(), field: item.displayName() };
         });

         lookup.fields =
         [
            { key: 'key', displayName: 'Key', isKey: true, hidden: true },
            { key: 'field', displayName: 'Field' }
         ];

         return utils.transformLookup(lookup);
      }

      private fieldKey(field)
      {
         return ko.unwrap(field.key);
      }

      private updateRowExpansions()
      {
         _.each(this.maxDrillDownRange(), (drillDown: any) =>
         {
            this.rowExpansions()[drillDown] = ko.observableArray(_.filter(this.selectedView().groupRowsBy(), (item: any) =>
            {
               return item.groupByLevel && item.groupByLevel() === drillDown;
            }));
         });
      }

      private endTotalFields(observableArray)
      {
         return ko.observableArray(_.filter(observableArray(), (row: any) =>
         {
            return row.endTotal && row.endTotal();
         }));
      }

      private updateEndTotals(items, groupByItems)
      {
         _.each(groupByItems, (item: any) =>
         {
            if (!item.endTotal)
            {
               item.endTotal = ko.observable(false);
            }

            item.endTotal(_.any(items, (i: any) =>
            {
               return ko.unwrap(i.key) === ko.unwrap(item.key);
            }));
         });
      }

      private filterFields(fields)
      {
         return _.map(fields, (field: any) =>
         {
            return _.filter(field, (item: any) =>
            {
               return !_.any(this.selectedDrillDown().rowFilters.filters(), (filter: any) =>
               {
                  return ko.unwrap(item.key).toLowerCase() === ko.unwrap(filter.key).toLowerCase();
               });
            });
         });
      }

      processResult(result)
      {
         this.visible(true);
         //this.groupRows(result.groupRows - this.drillDown.row.filters().length);
         ko.mapping.fromJS(this.filterFields(result.pivotFields), this.fields);
         //this.fields(this.filterFields(result.pivotFields));

         this.selectedDrillDown().level(0);
         this.selectedDrillDown().max(result.maxDrillDownLevel);

         this.showEndTotals(false);
         this.pivotHtml("");
         this.pivotHtml(result.pivotHtml);
         this.hasEndTotals(result.hasEndTotals);
         this.pivotData = result.pivotData;

         this.pager.updateFromResponse(result);

         // Notify the searchTerms observable array in search.js 
         this.search.searchTerms(result.gridViewOptions.searchTerms);
      }

      hide()
      {
         this.visible(false);
      }

      refreshPivot(data?: any, useCache: boolean = true)
      {
         var params: any =
            {
               page: this.pager.page(),
               pageSize: this.pager.pageSize(),
               pageTargetsCenter: this.pager.pageTargetsCenter(),
               pageTargetsInnerSize: this.pager.pageTargetsInnerSize(),
               pageTargetsEdgeSize: this.pager.pageTargetsEdgeSize(),
               drillDownLevel: this.selectedDrillDown().level()
            };

         this.expansions();

         if (this.search.hasText())
         {
            params.searchText = this.search.text();
         }

         $.extend(params, this.pivotFilters());

         // First time the computed is evaluated we are simply 
         // initializing values and don't want to call getItems()
         if (this.initializing)
         {
            this.initializing = false;
            return;
         }

         // Load the items - needs to be wrapped in setTimeout to 
         // avoid new dependencies being added to this computed
         window.setTimeout(() =>
         {
            this.getItems(GridViewModel.prototype.buildQuery(ko.toJS(params)), data, useCache);
         },
            0);
      }

      private getItems(queryString: string, data: any, useCache: boolean = true)
      {
         var report = this.activeReport();
         if (report)
         {
            this.reportProxy.runView(report, this.selectedView(), queryString, useCache, data, this.expansions(), (result) =>
            {
               // This means that the fields have changed
               if (result.isPivoted)
               {
                  //this.groupRows(result.groupRows - this.drillDown.row.filters().length);
                  //this.fields(this.filterFields(result.pivotFields));
                  ko.mapping.fromJS(this.filterFields(result.pivotFields), this.fields);
               }

               this.showEndTotals(false);
               this.pivotHtml(result.pivotHtml);
               this.hasEndTotals(result.hasEndTotals);
               this.pivotData = result.pivotData;

               this.pager.updateFromResponse(result);
               this.search.searchTerms(result.gridViewOptions.searchTerms);
            });
         }
      }

      updatePivotColumns()
      {
         dom.updatePivotColumns(_.filter(this.columns(), (c: any) =>
         {
            return c.itemType === 9;
         }));
      }

      toggleEndTotals()
      {
         this.showEndTotals(!this.showEndTotals());
         this.updatePivotColumns();
      }

      expand = (key) =>
      {
         if (_.contains(this.expansions(), key))
            this.expansions.remove(key);
         else
            this.expansions.push(key);
      };

      private getActiveSortColumns()
      {
         return _.chain(<any[]>this.selectedView().groupRowsBy())
            .filter((i: any) => ko.unwrap(i.groupByLevel) == this.selectedDrillDown().level())
            .map((i: any) => ko.mapping.fromJS(new FieldData({ key: "value", dataType: "string", displayName: ko.unwrap(i.displayName) })))
            .value()
            .slice(0, 1);
      }
   }
}