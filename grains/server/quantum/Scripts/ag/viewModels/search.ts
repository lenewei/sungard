/// <reference path="../../ts/global.d.ts" />

module ag
{ 
   "use strict";

   export class SearchViewModel
   {
      text = ko.observable("");
      searchTerms = ko.observableArray();
      isEmpty: KnockoutComputed<any>;
      hasText: KnockoutComputed<any>;

      constructor()
      {
         this.isEmpty = ko.computed(() =>
         {
            return this.text().length === 0;
         });

         this.hasText = ko.computed(() =>
         {
            return this.text().length > 0;
         });
      }
        
      clear()
      {
         this.text("");
      }
   }
}
