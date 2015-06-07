/// <reference path="../appViewModel.ts" />

module ag 
{
   export class InstructionsViewModel extends AppViewModel
   {
      usedCounterpartyCategoryFilters: KnockoutComputed<any>;

      constructor(options: IAppViewModelOptions)
      {
         options.noBrowseGrid = true;
         super(options);
      }
   }

   export class OursInstructionsViewModel extends InstructionsViewModel
   {
      constructor(options: IAppViewModelOptions)
      {
         options.noBrowseGrid = true;

         this.usedCounterpartyCategoryFilters = ko.computed(() =>
         {
            return this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters;
         }, this, { deferEvaluation: true });

         super(options);
      }

      updateCounterpartyCategoryFilters(items: any)
      {
         // The passed items array is a list of new filters to add to the existing collection
         this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters.push.apply(this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters,
            $.map(items, item=> ag.filters.buildFilter(item, true)));
      }

      getCounterpartyCategoryFilters()
      {
         return this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters;
      }
   }
}