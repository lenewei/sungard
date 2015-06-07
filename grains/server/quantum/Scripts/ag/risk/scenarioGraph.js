var ag;
(function (ag) {
    (function (risk) {
        var ScenarioGraphViewModel = (function () {
            function ScenarioGraphViewModel(grid) {
                var _this = this;
                this.values = ko.observableArray();
                this.series = ko.observableArray();
                this.config = {
                    data: this.values,
                    categoryAxis: {
                        field: 'term'
                    },
                    series: [
                        { field: 'marketRate', name: 'Market Value' },
                        { field: 'scenario', name: 'Scenario' }
                    ],
                    seriesDefaults: { type: 'line' },
                    seriesColors: ["#AB3020", "#48A90E"],
                    chartArea: {
                        height: 300,
                        background: 'transparent'
                    },
                    plotArea: {
                        background: 'white'
                    },
                    legend: {
                        position: 'bottom'
                    },
                    legendItemClick: function (e) {
                        // on clicking the Legend Item, we need to prevent the default behavior.
                        e.preventDefault();
                    }
                };

                grid.items.subscribe(function (newValue) {
                    if (!newValue) {
                        _this.values([]);
                        return;
                    }

                    var scenarioData = newValue, seriesData = [];

                    _.each(scenarioData, function (data) {
                        seriesData.push({
                            term: data.termAbbreviation,
                            marketRate: parseFloat(data.marketRate),
                            scenario: parseFloat(data.scenario)
                        });
                    });

                    _this.values(seriesData);
                });

                $('#graphTabHeader').on('shown', function (e) {
                    // force refresh when user clicks Graph tab
                    _this.values.valueHasMutated();
                });
            }
            return ScenarioGraphViewModel;
        })();
        risk.ScenarioGraphViewModel = ScenarioGraphViewModel;
    })(ag.risk || (ag.risk = {}));
    var risk = ag.risk;
})(ag || (ag = {}));
