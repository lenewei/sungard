/// <reference path="../../ts/global.d.ts" />\
module ag
{
   export class VisualisationViewModel
   {
      visible = ko.observable(false);
      data: KnockoutComputed<any>;
      categories = ko.observableArray();
      options: KnockoutObservable<any>;
      chartTitle = ko.observable('title');
      values = ko.observableArray();
      config: any;
      series = ko.observableArray();
      type = ko.observable('bar');
      height = ko.observable(400);
      groupBy: KnockoutComputed<any>;
      lineWidth = ko.observable(2);
      markerSize = ko.observable(10);
      seriesValueCount: KnockoutComputed<number>;
      xAxisLabel = ko.observable('');
      tooltipTemplate = ko.observable('');
      categoryLabelVisible = ko.observable(true);

      types = ko.observableArray(
      [
         { text: 'Bar Chart', value: 0, type: 'bar' },
         { text: 'Column Chart', value: 1, type: 'column' },
         { text: 'Line Chart', value: 2, type: 'scatterLine' }
      ]);

      colours =
      [
         '#2078B5',
         '#FF7F0E',
         '#2CA02C',
         '#D62728',
         '#BCBD22',
         '#E377C2',
         '#F7E520',
         '#9467BD',
         '#8C564B',
         '#17BECF',
         '#AEC7E8',
         '#FFBB78',
         '#98DF8A',
         '#FF9896',
         '#DBDB8D',
         '#F7B6D2',
         '#FAF3A5',
         '#C5B0D5',
         '#C49C94',
         '#9EDAE5'
      ];

      constructor(public selectedView)
      {
         this.options = ko.observable({
            categoryAxis: {
               field: 'name',
               categories: this.categories
            }
         });

         this.config =
         {
            data: this.values,
            options: ko.observable({
               series: this.series,
               seriesDefaults: ko.observable({ type: this.type, width: this.lineWidth, markers: { size: this.markerSize } }),
               chartArea: ko.observable({
                  height: this.height
               }),
               xAxis: [
               {
                  labels: {
                     visible: false
                  }
               },
               {
                  title: {
                     text: this.xAxisLabel,
                     font: "12px Arial,Helvetica,sans-serif"
                  }
               }],
               categoryAxis: [{
                  field: '__name__',
                  labels: {
                     visible: false
                  }
               },
                  {
                     title: {
                        text: this.xAxisLabel,
                        font: "12px Arial,Helvetica,sans-serif"
                     },
                  field: '__name__',
                  line: {
                     visible: false
                  },
                  labels: {
                     visible: this.categoryLabelVisible
                  }
               }],
               tooltip: {
                  template: this.tooltipTemplate
               }
            }),
            theme: 'flat',
            seriesColors: this.colours,
            valueAxis: {
               axisCrossingValue: [0, -Number.MAX_VALUE],
               labels: {
                  format: "{0:0}"
               }
            },
            yAxis: {
               axisCrossingValue: [0, -Number.MAX_VALUE],
               labels: {
                  format: "{0:0}"
               }
            },
            legend: {
               position: 'bottom'
            },
            tooltip: {
               visible: true
            },
            legendItemClick: function(e)
            {
               var chart = this,
                  plotArea = chart._plotArea,
                  seriesIndex = e.seriesIndex,
                  allSeries = plotArea.srcSeries || plotArea.series,
                  currentSeries = allSeries[seriesIndex],
                  originalSeries = (chart._sourceSeries || [])[seriesIndex] || currentSeries,
                  transitionsState,
                  visible;

               if (_.every(allSeries, (s: any) => s.visible))
               {
                  _.each(allSeries, (s: any) => { s.visible = false; });
               }

               visible = !originalSeries.visible;
               currentSeries.visible = visible;
               originalSeries.visible = visible;

               if (_.every(allSeries, (s: any) => !s.visible))
               {
                  _.each(allSeries, (s: any) => { s.visible = true; });
               }

               if (chart.options.transitions)
               {
                  chart.options.transitions = false;
                  transitionsState = true;
               }
               chart.redraw();
               if (transitionsState)
               {
                  chart.options.transitions = true;
               }

               e.preventDefault();
            }
         }

         ko.computed(() =>
         {
            if (this.type() !== 'bar')
            {
               this.height(400);
               return;
            }

            var valuesHeight = this.values().length * 20,
               seriesHeight = this.values().length * this.series().length * 6;

            this.height(Math.max(400, Math.max(valuesHeight, seriesHeight)));
         });

         ko.computed(() =>
         {
            if (this.type() == 'scatterLine')
            {
               this.tooltipTemplate("#: series.name #: #: value.y #<br />#: kendo.toString(value.x, 'd') #");
               return;
            }

            this.tooltipTemplate("#: series.name #: #: value #<br />#: category #");
         });

         ko.computed(() =>
         {
            if (this.type() != 'column')
            {
               this.categoryLabelVisible(true);
               return;
            }

            var valueCount = this.values().length;
            if (valueCount <= 0)
            {
               this.categoryLabelVisible(true);
               return;
            }

            var maxValueLength = _.max<number>(_.map(this.values(), (v: any) => v.__name__.length));
            this.categoryLabelVisible(valueCount * maxValueLength * 5 < 1000);       
         });

         this.seriesValueCount = ko.computed(() =>
         {
            if (this.type() != 'scatterLine')
               return 0;

            var series = this.series();
            if (series)
               return _.max<number>(_.map(series, (s: any) => s.data && s.data.length ? s.data.length : 0));

            return 0;
         });

         ko.computed(() =>
         {
            var count = this.seriesValueCount();
            if (count <= 0)
            {
               this.markerSize(10);
               this.lineWidth(2);
               return;
            }

            this.markerSize(Math.max(1, Math.min(10, Math.round(800 / count))));
            this.lineWidth(Math.max(0.5, Math.min(2, Math.round(200 / count))));
         });

         this.groupBy = ko.computed(() =>
         {
            var view = selectedView();
            if (view)
            {
               var groupBy = view.groupRowsBy();
               if (groupBy && groupBy.length > 0)
               {
                  return ko.unwrap((<any>_.first(groupBy)).displayName);
               }
            }

            return null;
         });
      }

      valueDataTypes()
      {
         return [ 'decimal', 'integer' ];
      }

      groupByDataTypes()
      {
         var chartType = ko.unwrap(this.selectedView().chartType);
         if (chartType == 2)
            return ['datetime', 'integer'];

         return ['string'];
      }

      setGroupBy(items)
      {
         this.selectedView().groupRowsBy(ko.mapping.fromJS(items)());
      }

      processResult(result)
      {
         var groupRows = this.selectedView().groupRowsBy(),
            isDate = false;
         if (groupRows && groupRows.length > 0)
            isDate = ko.unwrap(_.first<any>(groupRows).dataType) == "datetime";

         this.visible(true);

         if (isDate)
         {
            _.forEach(result.values, (v: any) =>
            {
               v.__name__ = new Date(v.__name__);
            });
            _.forEach(result.series, (s: any) =>
            {
               _.forEach(s.data, (d: any) =>
               {
                  d[0] = new Date(d[0]);
               });
            });
         }

         // Make sure all values are numeric
         _.forEach(result.series, (s: any) =>
         {
            _.forEach(s.data, (d: any) =>
            {
               d[1] = Number(d[1]);
            });
         });

         this.xAxisLabel(result.xAxisLabel);
         this.type(_.find(this.types(), (t: any) => t.value == result.chartType).type);
         this.values(result.values);
         this.series(result.series);
      }
   }

   export class ProfileViewModel
   {
      profileBy: KnockoutComputed<string>;
      periods: KnockoutComputed<any[]>;
      preview = ko.observableArray([]);
      startDate: KnockoutComputed<string>;

      constructor(public selectedView, activeReport, applicationOptions)
      {
         this.profileBy = ko.computed({
            read: () =>
            {
               var profileBy = ko.unwrap(this.selectedView().profileBy);
               return profileBy ? ko.unwrap(profileBy.displayName) : null;
            },
            write: (value) =>
            {
               this.setProfileBy(value);
            },
            owner: this
         });

         this.startDate = ko.computed(() =>
         {
            var report = ko.unwrap(activeReport);
            if (report)
            {
               var reportStartDate = ko.unwrap(report.options.startDate);
               if (reportStartDate)
                  return reportStartDate;

               return ko.unwrap(report.options.asAtDate);
            }

            var startDate = ko.unwrap(applicationOptions.startDate);
            if (startDate)
               return startDate;

            return ko.unwrap(applicationOptions.asAtDate);

         });

         ko.computed(() =>
         {
            var profilePeriods = ko.unwrap(this.selectedView().profilePeriods);
            _.each(profilePeriods, (period) =>
            {
               _.each(period, (property) =>
               {
                  ko.unwrap(property);
               });
            });

            if (profilePeriods && profilePeriods.length > 0)
            {
               var payload =
               {
                  view: ko.unwrap(selectedView().clientKey),
                  periods: ko.mapping.toJS(selectedView().profilePeriods),
                  startDate: this.startDate()
               };
               utils.getJson('getprofilepreview', payload).then((result) =>
               {
                  this.preview(result.data);
               });
            }
            else
            {
               this.preview([]);
            }
         });

         this.periods = ko.computed(() =>
         {
            return _.map(ko.unwrap(selectedView().profilePeriods), (p, index) => new ProfileDataViewModel(p, index) );
         });
      }

      setProfileBy(items)
      {
         var selectedView = this.selectedView();
         var profileBy = selectedView.profileBy;
         if (!items)
         {
            profileBy(null);
            return;
         }

         if (items.length == 1)
            selectedView.profileBy(new ViewFieldData(items[0]));
      }

      addPeriod()
      {
         var view = this.selectedView();
         view.profilePeriods.push(ko.mapping.fromJS(new ProfileData(
         {
            occurences: 1,
            size: 1,
            method: 1
         })));
      }

      removePeriod(period)
      {
         var periods = this.selectedView().profilePeriods;
         periods.remove(period.data);
      }
   }

   export class ProfileDataViewModel 
   {
      unitOptions: KnockoutComputed<any[]>;
      methodOptions: KnockoutComputed<any[]>;
      startOnOptions: KnockoutComputed<any[]>;
      startOnEnabled: KnockoutComputed<boolean>;
      methodEnabled: KnockoutComputed<boolean>;

      constructor(public data, public index: number)
      {
         this.unitOptions = ko.computed(() =>
         {
            return [
               { text: 'Days', value: 0 },
               { text: 'Weeks', value: 1 },
               { text: 'Months', value: 2 },
               { text: 'Quarters', value: 3 },
               { text: 'Years', value: 4 }
            ];
         });

         this.methodOptions = ko.computed(() => 
         {
            var options =
            [
               { text: 'Start', value: 0 },
               { text: 'Slide', value: 1 },
               { text: 'Calibrate', value: 2 }
            ];

            if (index === 0)
               _.remove(options, (o) => o.value === 1);

            if (data.unit() === 0)
               _.remove(options, (o) => o.value === 2);

            return options;
         });

         this.startOnOptions = ko.computed(() =>
         {
            if (data.method() === 0)
            {
               return [{ text: 'Start Date', value: 0 }];
            }

            if (data.method() === 1)
            {
               return [{ text: 'After Previous', value: 1 }];
            }

            switch (data.unit())
            {
               case 1:
                  return _.map(_.range(7), (d) => { return { text: moment.weekdays(d + 1), value: d }; });
               case 2:
                  return _.map<number, any>(_.range(31), (d) => { return { text: 'Day ' + (d + 1), value: d }; });
               case 3:
                  return _.map(_.range(12), (m) => { return { text: 'Q1 starts on ' + moment.months(m), value: m }; });
               case 4:
                  return _.map(_.range(12), (m) => { return { text: moment.months(m), value: m }; });
            }

            return [];
         });

         this.startOnEnabled = ko.computed(() =>
         {
            return this.startOnOptions().length > 1;
         })

         this.methodEnabled = ko.computed(() =>
         {
            return this.methodOptions().length > 1;
         });
      }
   }
}