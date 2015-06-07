/// <reference path="../../../ts/global.d.ts" />

module ag
{
   export class PivotDrillDownViewModel
   {
      rowFilters: PivotFiltersViewModel;
      columnFilters: PivotFiltersViewModel;
      level = ko.observable(0);
      max = ko.observable(0);
      filters: KnockoutComputed<any>;

      constructor()
      {
         this.rowFilters = new PivotFiltersViewModel();
         this.columnFilters = new PivotFiltersViewModel();

         this.filters = ko.computed(() =>
         {
            return this.rowFilters.filters().concat(this.columnFilters.filters());
         });

         this.filters.subscribeChanged((newValue: string, oldValue: string) =>
         {
            if (newValue.length === 0)
            {
               this.level(0);
               return;
            }

            if (newValue.length > oldValue.length)
            {
               var level = this.level();
               if (level < this.max())
               {
                  this.level(level + 1);
               }
               return;
            }

            var maxFilterLevel = _.max<number>(_.pluck(newValue, 'drillDownLevel')),
               newDrillDownLevel = maxFilterLevel + 1;

            if (newDrillDownLevel <= this.max())
            {
               this.level(newDrillDownLevel);
            }
         });
      }
   }

   export class PivotFiltersViewModel
   {
      level = ko.observable(0);
      max = ko.observable(0);
      filters = ko.observableArray();

      constructor()
      {
      }

      clear()
      {
         this.filters([]);
      }

      setFilter(index)
      {
         this.filters(this.filters().slice(0, index + 1));
      }

      filter (filters)
      {
         this.filters(filters);
      }
   };
}