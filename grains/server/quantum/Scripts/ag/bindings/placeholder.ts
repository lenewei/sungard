/// <reference path="../../ts/global.d.ts" />

// Used in place of a text binding to provide access to an edit action for the bound object
module ag
{
   "use strict";

   ko.bindingHandlers["placeholder"] =
   {
      processingEvent: false,
      update: (element, valueAccessor) =>
      {
         var target = $(element),
            opts = valueAccessor(),
            value = ko.unwrap(opts.value),
            emptyValueCaption = opts.emptyValueCaption || "...";
         
         target.text(value || emptyValueCaption);
      }
   };
}