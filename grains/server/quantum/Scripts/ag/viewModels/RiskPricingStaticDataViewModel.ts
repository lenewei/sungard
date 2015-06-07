module ag
{
   export class RiskPricingStaticDataViewModel extends StaticDataViewModel
   {
      init(itemModel, ...args: any[])
      {
         super.init(itemModel);

         this.editingItem.dealNumber.subscribe((newValue) =>
         {
            if (!newValue)
               return;

            if (ko.unwrap(this.updatingModel))
               return;

            this.net.postJson("getIdByDealNumber", {
               dealNumber: newValue,
               changedProperty: "dealNumber",
            }).done((result) =>
            {
               this.editItem({ id: result.data.id });
            }).done((result) =>
            {
               ag.utils.documentTitle(this.applicationTitle, result.data.id, newValue);
            });
         });

         this.editingItem.isNew.subscribe((newValue) =>
         {
            if (newValue)
               this.isDeletedItem(false);
         });
      }

      beforeApplyBindings()
      {
         this.handleCalculatePricingErrors();
      }

      private handleCalculatePricingErrors()
      {
         var action = this.actions.calculatePricing;
         if (!action)
            return;

         // Get the original invoke function 
         var original = action.invoke;

         // Redefine the original so we can add fail behaviour
         action.invoke = (...args: any[]) =>
         {
            original.apply(action, args).fail((result) =>
            {
               if (!result)
                  return;

               // Exception encountered
               var errorMessages = utils.getErrorsFromResponse(result[0]);
               if (errorMessages !== undefined)
               {
                  this.hasErrors(true);
                  this.errors.removeAll();

                  // There will only be a single errorMessage but it could have 
                  // new-line characters as a delimiter
                  this.errors.push.apply(this.errors, errorMessages[0].split("\n"));
               }
            });
         };
      }
   }
}