/// <reference path="../../ts/global.d.ts" />\
var ag;
(function (ag) {
    var VisualisationViewModel = (function () {
        function VisualisationViewModel(selectedView) {
            var _this = this;
            this.selectedView = selectedView;
            this.visible = ko.observable(false);
            this.categories = ko.observableArray();
            this.chartTitle = ko.observable('title');
            this.values = ko.observableArray();
            this.series = ko.observableArray();
            this.type = ko.observable('bar');
            this.height = ko.observable(400);
            this.lineWidth = ko.observable(2);
            this.markerSize = ko.observable(10);
            this.xAxisLabel = ko.observable('');
            this.tooltipTemplate = ko.observable('');
            this.categoryLabelVisible = ko.observable(true);
            this.types = ko.observableArray([
                { text: 'Bar Chart', value: 0, type: 'bar' },
                { text: 'Column Chart', value: 1, type: 'column' },
                { text: 'Line Chart', value: 2, type: 'scatterLine' }
            ]);
            this.colours = [
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
            this.options = ko.observable({
                categoryAxis: {
                    field: 'name',
                    categories: this.categories
                }
            });

            this.config = {
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
                    categoryAxis: [
                        {
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
                legendItemClick: function (e) {
                    var chart = this, plotArea = chart._plotArea, seriesIndex = e.seriesIndex, allSeries = plotArea.srcSeries || plotArea.series, currentSeries = allSeries[seriesIndex], originalSeries = (chart._sourceSeries || [])[seriesIndex] || currentSeries, transitionsState, visible;

                    if (_.every(allSeries, function (s) {
                        return s.visible;
                    })) {
                        _.each(allSeries, function (s) {
                            s.visible = false;
                        });
                    }

                    visible = !originalSeries.visible;
                    currentSeries.visible = visible;
                    originalSeries.visible = visible;

                    if (_.every(allSeries, function (s) {
                        return !s.visible;
                    })) {
                        _.each(allSeries, function (s) {
                            s.visible = true;
                        });
                    }

                    if (chart.options.transitions) {
                        chart.options.transitions = false;
                        transitionsState = true;
                    }
                    chart.redraw();
                    if (transitionsState) {
                        chart.options.transitions = true;
                    }

                    e.preventDefault();
                }
            };

            ko.computed(function () {
                if (_this.type() !== 'bar') {
                    _this.height(400);
                    return;
                }

                var valuesHeight = _this.values().length * 20, seriesHeight = _this.values().length * _this.series().length * 6;

                _this.height(Math.max(400, Math.max(valuesHeight, seriesHeight)));
            });

            ko.computed(function () {
                if (_this.type() == 'scatterLine') {
                    _this.tooltipTemplate("#: series.name #: #: value.y #<br />#: kendo.toString(value.x, 'd') #");
                    return;
                }

                _this.tooltipTemplate("#: series.name #: #: value #<br />#: category #");
            });

            ko.computed(function () {
                if (_this.type() != 'column') {
                    _this.categoryLabelVisible(true);
                    return;
                }

                var valueCount = _this.values().length;
                if (valueCount <= 0) {
                    _this.categoryLabelVisible(true);
                    return;
                }

                var maxValueLength = _.max(_.map(_this.values(), function (v) {
                    return v.__name__.length;
                }));
                _this.categoryLabelVisible(valueCount * maxValueLength * 5 < 1000);
            });

            this.seriesValueCount = ko.computed(function () {
                if (_this.type() != 'scatterLine')
                    return 0;

                var series = _this.series();
                if (series)
                    return _.max(_.map(series, function (s) {
                        return s.data && s.data.length ? s.data.length : 0;
                    }));

                return 0;
            });

            ko.computed(function () {
                var count = _this.seriesValueCount();
                if (count <= 0) {
                    _this.markerSize(10);
                    _this.lineWidth(2);
                    return;
                }

                _this.markerSize(Math.max(1, Math.min(10, Math.round(800 / count))));
                _this.lineWidth(Math.max(0.5, Math.min(2, Math.round(200 / count))));
            });

            this.groupBy = ko.computed(function () {
                var view = selectedView();
                if (view) {
                    var groupBy = view.groupRowsBy();
                    if (groupBy && groupBy.length > 0) {
                        return ko.unwrap(_.first(groupBy).displayName);
                    }
                }

                return null;
            });
        }
        VisualisationViewModel.prototype.valueDataTypes = function () {
            return ['decimal', 'integer'];
        };

        VisualisationViewModel.prototype.groupByDataTypes = function () {
            var chartType = ko.unwrap(this.selectedView().chartType);
            if (chartType == 2)
                return ['datetime', 'integer'];

            return ['string'];
        };

        VisualisationViewModel.prototype.setGroupBy = function (items) {
            this.selectedView().groupRowsBy(ko.mapping.fromJS(items)());
        };

        VisualisationViewModel.prototype.processResult = function (result) {
            var groupRows = this.selectedView().groupRowsBy(), isDate = false;
            if (groupRows && groupRows.length > 0)
                isDate = ko.unwrap(_.first(groupRows).dataType) == "datetime";

            this.visible(true);

            if (isDate) {
                _.forEach(result.values, function (v) {
                    v.__name__ = new Date(v.__name__);
                });
                _.forEach(result.series, function (s) {
                    _.forEach(s.data, function (d) {
                        d[0] = new Date(d[0]);
                    });
                });
            }

            // Make sure all values are numeric
            _.forEach(result.series, function (s) {
                _.forEach(s.data, function (d) {
                    d[1] = Number(d[1]);
                });
            });

            this.xAxisLabel(result.xAxisLabel);
            this.type(_.find(this.types(), function (t) {
                return t.value == result.chartType;
            }).type);
            this.values(result.values);
            this.series(result.series);
        };
        return VisualisationViewModel;
    })();
    ag.VisualisationViewModel = VisualisationViewModel;

    var ProfileViewModel = (function () {
        function ProfileViewModel(selectedView, activeReport, applicationOptions) {
            var _this = this;
            this.selectedView = selectedView;
            this.preview = ko.observableArray([]);
            this.profileBy = ko.computed({
                read: function () {
                    var profileBy = ko.unwrap(_this.selectedView().profileBy);
                    return profileBy ? ko.unwrap(profileBy.displayName) : null;
                },
                write: function (value) {
                    _this.setProfileBy(value);
                },
                owner: this
            });

            this.startDate = ko.computed(function () {
                var report = ko.unwrap(activeReport);
                if (report) {
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

            ko.computed(function () {
                var profilePeriods = ko.unwrap(_this.selectedView().profilePeriods);
                _.each(profilePeriods, function (period) {
                    _.each(period, function (property) {
                        ko.unwrap(property);
                    });
                });

                if (profilePeriods && profilePeriods.length > 0) {
                    var payload = {
                        view: ko.unwrap(selectedView().clientKey),
                        periods: ko.mapping.toJS(selectedView().profilePeriods),
                        startDate: _this.startDate()
                    };
                    ag.utils.getJson('getprofilepreview', payload).then(function (result) {
                        _this.preview(result.data);
                    });
                } else {
                    _this.preview([]);
                }
            });

            this.periods = ko.computed(function () {
                return _.map(ko.unwrap(selectedView().profilePeriods), function (p, index) {
                    return new ProfileDataViewModel(p, index);
                });
            });
        }
        ProfileViewModel.prototype.setProfileBy = function (items) {
            var selectedView = this.selectedView();
            var profileBy = selectedView.profileBy;
            if (!items) {
                profileBy(null);
                return;
            }

            if (items.length == 1)
                selectedView.profileBy(new ag.ViewFieldData(items[0]));
        };

        ProfileViewModel.prototype.addPeriod = function () {
            var view = this.selectedView();
            view.profilePeriods.push(ko.mapping.fromJS(new ag.ProfileData({
                occurences: 1,
                size: 1,
                method: 1
            })));
        };

        ProfileViewModel.prototype.removePeriod = function (period) {
            var periods = this.selectedView().profilePeriods;
            periods.remove(period.data);
        };
        return ProfileViewModel;
    })();
    ag.ProfileViewModel = ProfileViewModel;

    var ProfileDataViewModel = (function () {
        function ProfileDataViewModel(data, index) {
            var _this = this;
            this.data = data;
            this.index = index;
            this.unitOptions = ko.computed(function () {
                return [
                    { text: 'Days', value: 0 },
                    { text: 'Weeks', value: 1 },
                    { text: 'Months', value: 2 },
                    { text: 'Quarters', value: 3 },
                    { text: 'Years', value: 4 }
                ];
            });

            this.methodOptions = ko.computed(function () {
                var options = [
                    { text: 'Start', value: 0 },
                    { text: 'Slide', value: 1 },
                    { text: 'Calibrate', value: 2 }
                ];

                if (index === 0)
                    _.remove(options, function (o) {
                        return o.value === 1;
                    });

                if (data.unit() === 0)
                    _.remove(options, function (o) {
                        return o.value === 2;
                    });

                return options;
            });

            this.startOnOptions = ko.computed(function () {
                if (data.method() === 0) {
                    return [{ text: 'Start Date', value: 0 }];
                }

                if (data.method() === 1) {
                    return [{ text: 'After Previous', value: 1 }];
                }

                switch (data.unit()) {
                    case 1:
                        return _.map(_.range(7), function (d) {
                            return { text: moment.weekdays(d + 1), value: d };
                        });
                    case 2:
                        return _.map(_.range(31), function (d) {
                            return { text: 'Day ' + (d + 1), value: d };
                        });
                    case 3:
                        return _.map(_.range(12), function (m) {
                            return { text: 'Q1 starts on ' + moment.months(m), value: m };
                        });
                    case 4:
                        return _.map(_.range(12), function (m) {
                            return { text: moment.months(m), value: m };
                        });
                }

                return [];
            });

            this.startOnEnabled = ko.computed(function () {
                return _this.startOnOptions().length > 1;
            });

            this.methodEnabled = ko.computed(function () {
                return _this.methodOptions().length > 1;
            });
        }
        return ProfileDataViewModel;
    })();
    ag.ProfileDataViewModel = ProfileDataViewModel;
})(ag || (ag = {}));
