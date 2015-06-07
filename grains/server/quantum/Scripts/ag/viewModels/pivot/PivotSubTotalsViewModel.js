///// <reference path="../../../ts/global.d.ts" />
//module ag
//{
//   export class PivotSubTotalsViewModel
//   {
//      indexes = ko.observableArray();
//      currentIndex = ko.observable(1);
//      visible = ko.observable(false);
//      max: KnockoutComputed;
//      currentValue: KnockoutComputed;
//      displayAggregateValues: KnockoutComputed;
//      displaySubTotals: KnockoutComputed;
//      percentages: KnockoutComputed;
//      constructor()
//      {
//         this.max = ko.computed(() =>
//         {
//            return this.indexes().length;
//         } );
//         this.currentValue = ko.computed(() =>
//         {
//            if (this.indexes().length === 0 || this.currentIndex() >= this.indexes().length)
//               return 0;
//            return this.indexes()[this.currentIndex()];
//         } );
//         this.displayAggregateValues = ko.computed(() =>
//         {
//            return this.currentIndex() === this.max() || !this.visible();
//         } );
//         this.displaySubTotals = ko.computed(() =>
//         {
//            return !this.displayAggregateValues();
//         } );
//         this.percentages = ko.computed(() =>
//         {
//            var count = this.indexes().length;
//            if (count === 0)
//               return [];
//            var result = [],
//               step = 100 / count;
//            for (var i = 0; i <= count; i++)
//            {
//               result.push(i * step);
//            }
//            return result;
//         } );
//      }
//      toggle()
//      {
//         this.visible(!this.visible());
//      }
//   }
//}
