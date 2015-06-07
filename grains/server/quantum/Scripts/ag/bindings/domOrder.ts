/// <reference path="../../ts/global.d.ts" />

// Track the order of particular dom elements
module ag
{
   "use strict";

   ko.bindingHandlers["domOrder"] =
   {
      init: (element, valueAccessor, allBindingsAccessor) =>
      {
         var bindings = allBindingsAccessor(),
            selector = bindings.selector || "label[for]",
            attribute = bindings.attribute || "for";

         $(element).find(selector).each((index, item) =>
         {
            var attributeValue = <any>$(item).attr(attribute);
            if (attributeValue)
            {
               var val = <string>attributeValue.split("_");
               valueAccessor().push(val[val.length - 1]);
            }
         });
      }
   };
} 