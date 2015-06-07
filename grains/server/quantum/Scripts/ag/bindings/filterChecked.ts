/// <reference path="../../ts/global.d.ts" />

module ag
{

   "use strict";

   ko.bindingHandlers["filterChecked"] =
   {
      init: (element, valueAccessor) =>
      {
         var temp = ko.unwrap(valueAccessor());
         if (temp)
         {
            if (_.isBoolean(temp))
            {
               (<any>$(element)).selected(temp);
            }
            else if (temp.length > 0)
            {
               (<any>$(element)).selected(temp[0]);
            }
         }

         ko.utils.registerEventHandler(element, "change", () =>
         {
            valueAccessor()($(element).is(":checked"));
         });
      },

      update: (element, valueAccessor) =>
      {
         var value = ko.unwrap(valueAccessor());

         if (_.isArray(value) && value.length > 0)
         {
            (<any>$(element)).selected(value[0]);
         }
         else
         {
            (<any>$(element)).selected(value);
         }
      }
   };
}