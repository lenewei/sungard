module ag 
{
   export class ViewSelectorViewModel
   {
      hasMultipleViewTables: KnockoutComputed<boolean>;
      isLoaded = ko.observable(false);
      displayViewTypeBadge = ko.observable(true);

      constructor(public views: KnockoutObservable<any>, public viewTables: any, public selectView: (any) => void)
      {
         this.hasMultipleViewTables = ko.computed<boolean>(() =>
         {
            return this.viewTables().length > 1;
         });
      }

      findByViewTable(viewTableKey: any)
      {
         return this.views().filter(view =>
         {
            return viewTableKey && view.viewTableKey() === viewTableKey();
         });
      }
   }

   ko.bindingHandlers["dropdownLoad"] =
   {
      init: (element, valueAccessor) =>
      {
         var isLoaded = valueAccessor();
         $(element).one('show.bs.dropdown', () => isLoaded(true));
      }
   };
}