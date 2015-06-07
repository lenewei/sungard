// Sets a Grid Columns CSS for: datatype, sorted and relative size
module ag.bindings
{
   "use strict";
   
   export function dataTypeCss(dataType, format)
   {
      var css;
      switch (dataType)
      {
         case "integer":
         case "double":
         case "decimal":
            css = "column-number";
            break;
         default:
            {
               if (format == "generalNumber")
                  css = "column-number";
               else
                  css = "";
            }
      }
      return css;
   }
}