/// <reference path="../../../ts/global.d.ts" />

module ag 
{
   export class PivotFontSizeViewModel
   {
      availableSizes: any[] = ['font-small', 'font-medium', 'font-large'];
      currentIndex = ko.observable(1);
      css: KnockoutComputed<any>;

      constructor()
      {
         this.css = ko.computed(() =>
         {
            return _.object(this.availableSizes, _.map(this.availableSizes, (s: any, i: number) => { return i === this.currentIndex(); }));
         });
      }

      setSmall()
      {
         this.currentIndex(0);
      }

      setMedium()
      {
         this.currentIndex(1);
      }

      setLarge()
      {
         this.currentIndex(2);
      }
   }
}