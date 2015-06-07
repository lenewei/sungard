/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   ko.bindingHandlers["heatmap"] =
   {
      init: (element, valueAccessor, allBindingsAccessor) =>
      {
         var value = valueAccessor(),
            allBindings = allBindingsAccessor(),
            relativeSize = ko.unwrap(value),
            countBinding = allBindings.valueCount,
            count = ko.unwrap(countBinding),
            heatmapOpacity = relativeSize < 0.5 ?
            0.3 + (0.5 - relativeSize) * 2 * 0.7 :
            0.3 + (relativeSize - 0.5) * 2 * 0.7;

         if (count > 0)
         {
            $('<span class="heatmap visualisation" style="display: none;" data-bind="visible: $root.pivot.displaySquares"></span>')
               .appendTo(element)
               .css('opacity', heatmapOpacity)
               .sparkline([[100, 0]],
               {
                  type: 'bar',
                  barWidth: 16,
                  height: 16,
                  stackedBarColor: [relativeSize < 0.5 ? '#ab3020' : '#48a90e', '#ffffff'],
                  disableInteraction: true
               });
         }
      }
   };

}