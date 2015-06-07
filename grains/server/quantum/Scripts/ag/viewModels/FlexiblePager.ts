/// <reference path="../../ts/global.d.ts" />
/// <reference path="pager.ts" />

module ag {

   export class FlexiblePager extends Pager
   {
      pageFrom = ko.observable(0);
      pageTo = ko.observable(0);
      
      constructor(options: IPagerOptions)
      {
         super(options);

         this.itemsShowing = ko.computed(() => {
            var total = this.totalItems();
            var from = this.pageFrom();
            var to = this.pageTo();

            if (total === 0)
               return this.options.noItemsMessage || " ";

            return this.itemsMessage(from, to, total);
         });
      }

      updateFromResponse(response)
      {
         super.updateFromResponse(response);

         this.pageFrom(response.gridViewOptions.pageFrom);
         this.pageTo(response.gridViewOptions.pageTo);
      }
   }
}