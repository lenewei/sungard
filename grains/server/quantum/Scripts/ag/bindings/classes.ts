/// <reference path="../../ts/global.d.ts" />

// Add some CSS classes to the bound element (as opposed to 
// toggling a specific class with the "css" binding or adding 
// an inline style with the "style" binding).
module ag 
{
   "use strict";

   ko.bindingHandlers["classes"] =
   {
      update: (element, valueAccessor) =>
      {
         var classes = ko.unwrap(valueAccessor());
         if (classes.push)
            classes = classes.join(" ");

         $(element).addClass(classes);
      }
   };

} 