/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   ko.bindingHandlers["filterValue"] =
   {
      init: (element, valueAccessor) =>
      {
         var value = valueAccessor();
         if (!ko.isObservable(value))
            throw new Error("value must be an observable");

         ko.applyBindingsToNode(element, { value: ag.utils.addUnvalidatedFlag(value) });
      }
   };
}