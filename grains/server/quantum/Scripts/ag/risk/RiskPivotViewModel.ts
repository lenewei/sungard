module ag 
{
   export class RiskPivotViewModel extends PivotViewModel
   {
      pageId: any = ag.utils.getPageIdToken();

      constructor(selectedQuery, selectedView, activeReport, grid: GridViewModel, options)
      {
         super(selectedQuery, selectedView, activeReport, grid, options);

         this.setRiskOperators();
      }

      private setRiskOperators(): void
      {
         this.allOperators([
            { text: strings.none, value: 0 },
            { text: strings.count, value: 1 },
            { text: strings.sum, value: 2 },
            { text: strings.runningSum, value: 3 },
            { text: strings.revRunningSum, value: 4 },
            { text: strings.max, value: 5 },
            { text: strings.min, value: 6 },
            { text: strings.mean, value: 7 },
            { text: strings.meanExZero, value: 8 },
            { text: strings.first, value: 9 },
            { text: strings.last, value: 10 },
            { text: strings.list, value: 11 }
         ]);
      }
   }
}