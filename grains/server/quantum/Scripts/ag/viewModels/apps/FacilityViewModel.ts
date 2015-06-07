/// <reference path="../HierarchicalViewModel.ts" />

module ag 
{
   export class FacilityViewModel extends HierarchicalViewModel
   {
      afterApplyBindings()
      {
         var counterpartiesGrid = this.grids.counterpartiesDataList,
            actions = counterpartiesGrid.actions,
            initializeAtAction = actions.initializeAt,
            assignTo = actions.assignTo,
            decreaseBy = actions.decreaseBy,
            increaseBy = actions.increaseBy,
            bulkCopy = actions.counterpartyCopyByDate,
            loadItem = (result, parentViewModel) =>
            {
               this.loadItem(result, false);
            };

         initializeAtAction.afterInvoke = loadItem;
         assignTo.afterInvoke = loadItem;
         decreaseBy.afterInvoke = loadItem;
         increaseBy.afterInvoke = loadItem;
         bulkCopy.afterInvoke = loadItem;

      }
   }
}

