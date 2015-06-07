module ag.risk
{
   export class ScenarioGraphViewModel
   {
      config: any;
      values = ko.observableArray();
      series = ko.observableArray();

      constructor(grid: GridViewModel)
      {
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
            legendItemClick: (e) =>
            {
               // on clicking the Legend Item, we need to prevent the default behavior.
               e.preventDefault();
            }
         };

         grid.items.subscribe((newValue) =>
         {
            if (!newValue)
            {
               this.values([]);
               return;
            }

            var scenarioData = newValue,
               seriesData = [];

            _.each(scenarioData, (data: any) =>
            {
               seriesData.push({
                  term: data.termAbbreviation,
                  marketRate: parseFloat(data.marketRate),
                  scenario: parseFloat(data.scenario)
               });
            });

            this.values(seriesData);
         });

         $('#graphTabHeader').on('shown', (e) =>
         {
            // force refresh when user clicks Graph tab
            this.values.valueHasMutated();
         });
      }
   }
}