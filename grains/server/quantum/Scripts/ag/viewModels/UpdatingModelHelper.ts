/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   export function createUpdatingModelHelper(): KnockoutComputed<any>
   {
      var updatingModelDepth = ko.observable(0);

      this.updatingModel = ko.computed(
      {
         read: ()=> (updatingModelDepth() > 0) ,
         write: (value) =>
         {
            var currentValue = this.updatingModel();
            currentValue += (value ? 1 : (-1));
            updatingModelDepth(currentValue);
         }
      });

      return this.updatingModel;
   }
}