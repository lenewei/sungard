/// <reference path="reportingViewModel.ts" />

module ag 
{
   export class ProcessingViewModel extends ReportingViewModel 
   {
      gridSelectionAndApplicationOptions: KnockoutComputed<any>;

      constructor(options)
      {
         super(options);
      }

      init(model)
      {
         super.init(model);

         this.gridSelectionAndApplicationOptions = ko.computed(() =>
         {
            return {
               selections: this.grid.selected.model(),
               applicationOptions: this.applicationOptions
            };
         } );
      }
   }
}