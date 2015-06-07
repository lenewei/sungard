/// <reference path="../../ts/global.d.ts" />

module ag
{
   export class PivotFieldData
   {   
      key: string;
      drillDownLevel: number;
      endTotal: boolean;
      resetRunningTotals: boolean;
      canDrillDown: boolean;
      isLastInLevel: boolean;
      colSpan: number;
      displayName: string;
      itemType: number;
      dataType: string;
      index: number;
      isFirstColumn: boolean;
      isLast: boolean;

      constructor(options)
      {   
         this.key = options.key;
         this.drillDownLevel = options.drillDownLevel || 0;
         this.endTotal = options.endTotal || false;
         this.resetRunningTotals = options.resetRunningTotals || false;
         this.canDrillDown = options.canDrillDown || false;
         this.isLastInLevel = options.isLastInLevel || false;
         this.colSpan = options.colSpan || 0;
         this.displayName = options.displayName;
         this.itemType = options.itemType || 0;
         this.dataType = options.dataType || '';
         this.index = options.index || 0;
         this.isFirstColumn = options.isFirstColumn || false;
         this.isLast = options.isLast || false;
      }
   }
}