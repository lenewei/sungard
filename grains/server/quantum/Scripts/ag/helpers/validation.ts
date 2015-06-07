/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   function createSimpleNumberValidator(condition: (number) => boolean)
   {
      return (value, acceptZero) =>
      {
         if (ag.isNullUndefinedOrEmpty(value))
            return true;

         var num = parseFloat(value);
         if (acceptZero && num === 0)
            return true;

         return condition(num);
      }
   }

   ko.validation.rules["positive"] =
   {
      validator: createSimpleNumberValidator((num) => num > 0),
      message: "invalid value"
   };

   ko.validation.rules["negative"] =
   {
      validator: createSimpleNumberValidator((num) => num < 0),
      message: "invalid value"
   };

   ko.validation.registerExtenders();

   ko.validation.init(
      {
         insertMessages: false,
         grouping:
         {
            deep: true
         }
      });
}