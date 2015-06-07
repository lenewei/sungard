/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   ko.bindingHandlers["slider"] =
   {
      init: (element, valueAccessor) =>
      {
         var value = valueAccessor();

         ko.utils.registerEventHandler(element, "slidechange", (event, ui) =>
         {
            value(ui.value);
         });

         // Dispose	
         ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
         {
            $(element).slider("destroy");
         });

      },
      update: (element, valueAccessor, allBindingsAccessor) =>
      {
         var value = valueAccessor(),
            valueUnwrapped = ko.unwrap(value),
            max = allBindingsAccessor().sliderMax,
            maxUnwrapped = ko.unwrap(max);

         $(element).slider({ step: 1, min: 0, max: maxUnwrapped, value: valueUnwrapped });
      }
   };

}