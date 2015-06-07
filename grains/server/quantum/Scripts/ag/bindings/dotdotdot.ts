/// <reference path="../../ts/global.d.ts" />

// jQuery dotdotdot plugin binding
module ag 
{
   "use strict";

   ko.bindingHandlers["dotdotdot"] =
   {
      init: (element) =>
      {
         ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
         {
            $(element).trigger("destroy.dot");
         });
      },
      update: (element, valueAccessor) =>
      {
         var opts = {},
            value = ko.unwrap(valueAccessor());

         ko.utils.objectForEach(value, (optName: string, optValue: any) =>
         {
            opts[optName] = ko.unwrap(optValue);
         });

         //update dotdotdot after all other bindings are done.
         //this is needed to handle dialog boxes
         setTimeout(() => 
         {
            $(element).dotdotdot(opts);
         });
      }
   };
} 