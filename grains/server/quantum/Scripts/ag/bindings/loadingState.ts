/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   ko.bindingHandlers["loadingState"] =
   {
      update: (element, valueAccessor) =>
      {
         //var value = ko.unwrap(valueAccessor());
         //$(element).button(value ? 'loading' : 'reset');
      }
   };
}