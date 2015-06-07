/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   ko.bindingHandlers["pivotColumn"] =
   {
      update: (element, valueAccessor, allBindingsAccessor, viewModel, context) =>
      {
         var columnData = valueAccessor(),
            elm = $(element);

         if (columnData.itemType === 0)
         {
            elm.addClass("col");
         }
         else if (columnData.itemType === 1)
         {
            elm.addClass("pivot-row");
            elm.addClass("frozen");
            elm.css("left", columnData.index * 150);
         }
         else if (columnData.itemType === 6 || columnData.itemType === 9)
         {
            elm.addClass("pivot-row");
            elm.addClass("frozen");
            //elm.css("left", columnData.index * 150);
         }
         else if (columnData.itemType === 8)
         {
            if (columnData.isLast)
            {
               elm.addClass('isLast');
            }

            elm.addClass("frozen");
            if (columnData.colSpan > 0)
            {
               //elm.attr("rowspan", cellValue.columns);

               //elm.css("width", 150 * groupRows);
            }
            else
            {
               //elm.remove();
               return;
            }
         }

         if (columnData.isLast === false)
         {
            elm.addClass("clear");
         }

         if (columnData.itemType === 9)
         {
            elm.addClass(columnData.key);
         }
      }
   };

}