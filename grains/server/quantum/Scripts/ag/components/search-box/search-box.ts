module ag
{ 
   "use strict";

   export class SearchBoxViewModel
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
        
      clear = () =>
      {
         this.text("");
      }
   }
}
