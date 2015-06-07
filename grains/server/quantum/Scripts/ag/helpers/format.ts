/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />

// Sets a Grid Cells value and CSS appropriate for datatype
module ag.format
{
   "use strict";

   export function getDataTypeFormatterFunction(dataType: string, value: any):
      (value: any, viewModel?: any, element?: JQuery, rowItem?: any, viewModelName?: string) => string
   {
      if (dataType === "decimal")
         return this.decimalValueFormatter;
      else if (dataType === "integer")
         return this.integerValueFormatter;
      else if (dataType === "datetime")
         return this.dateValueFomatter;
      else if (dataType === "checkbox")
         return this.checkboxFomatter;
      else if (dataType === "boolean")
         return this.booleanFormatter;
      else if ($.isPlainObject(value))
         return this.objectValueFormatter;
      else
         return this.defaultValueFormatter;
   }

   export function defaultValueFormatter(value)
   {
      return value;
   }

   export function objectValueFormatter(value, viewModel, element)
   {
      if (value.itemType === 1)
      {
         element.attr({ rowspan: value.rowCount });

         if (value.canDrillDown)
         {
            return "<a href=\"#\" data-bind=\"click: function() { $root.pivot.rowDrillDown($data[$parent.key]); }\">{0}</a>".format(value.value);
         }
         else
         {
            return value.value;
         }
      }

      return value.value;
   }

   export function integerValueFormatter(value, viewModel)
   {
      //if (!value)
      //   return defaultValueFormatter(value);

      //var dealNumberNameParts = ["deal no", "deal number", "[deal no]", "dealno", "dealnumber"],
      //   propertyName = ko.unwrap(viewModel.displayName).toLowerCase(),
      //   isDealNumber = ko.unwrap(viewModel.format) == "dealNumber";

      //if (isDealNumber || _.detect(dealNumberNameParts, item => item === propertyName))
      //   return "<a href=\"{0}ui/deal-redirect?dealNumber={1}\" class=\"deal-link\" title=\"Open deal\">{1}</a>".format(siteRoot, value);

      return defaultValueFormatter(value);
   }

   export function decimalValueFormatter(value, viewModel)
   {
      // Make sure the value is numeric
      if (isNaN(value))
         return value;

      return formatNumber(value, true);
   }

   export function checkboxFomatter(value, viewModel)
   {
      var propertyName = ko.unwrap(viewModel.key).toLowerCase();
      return '<input type="checkbox" data-bind="checked: $data.{0}"/>'.format(propertyName);
   }

   export function booleanFormatter(value, viewModel)
   {
      return value ? strings.yes : strings.no;
   }

   export function dateValueFomatter(value, viewModel)
   {
      if (ko.unwrap(viewModel.format) === "relativeDateTime")
      {
         return '<span data-bind="timeago: \'{0}\'"></span>'.format(value);
      }
      else
      {
         if (dates.isDateISO8601Format(value))
         {
            var format = ko.unwrap(viewModel.format).toLowerCase();
            switch (format)
            {
               case "fulldatetime":
                  return moment.fromISO(value, true).toFullDisplay();
               case "monthyeardatetime":
                  return moment.fromISO(value, true).toMonthYearDateTimeDisplay();
               default:
                  return moment.fromISO(value).toDisplay();
            }
         }
         return value;
      }
   }

   export function unformatNumber(value: any, invariant?: boolean): number
   {
      if (_.isNumber(value))
         return value;

      if (_.isString(value) && value !== "")
      {
         // Remove any formatting characters from a displayed
         // number and return the float representation
         var raw;
         if (decimalSymbol === "." || invariant)
         {
            raw = value.replace(/[^0-9.-]/g, "");
         }
         else
         {
            // Final replace changes the decimal symbol from "," to "." 
            // as parseFloat only works with the literal "." as a decimal symbol
            raw = value.replace(/[^0-9,-]/g, "").replace(",", ".");
         }

         // Handle case where raw only contains symbols like "-"
         var ret = parseFloat(raw);
         return isFinite(ret) ? ret : null;
      }

      return null;
   }

   export function formatNumber(value: number): string;
   export function formatNumber(value: string, invariant?: boolean): string;
   export function formatNumber(value: any, invariant = false): string
   {
      if (!isNumeric(value))
         return "";

      var parts,
         integerPart,
         fractionalPart,
         rgx = /(\d+)(\d{3})/;

      if (typeof (value) == "string" && !invariant)
      {
         // Remove any existing formatting, this assumes 
         // the string is formatted for the locale.
         value = value.replace((decimalSymbol === "." ? /,/g : /\./g), "");

         // Could be formatted, split on current decimalSymbol
         parts = value.split(decimalSymbol);
      }
      else
      {
         // Invariant as passed in as a number, always split on decimal point
         value += "";
         parts = value.split(".");
      }

      integerPart = parts[0];
      fractionalPart = parts.length > 1 ? decimalSymbol + parts[1] : "";

      while (rgx.test(integerPart))
      {
         integerPart = integerPart.replace(rgx, "$1" + digitGroupingSymbol + "$2");
      }

      return integerPart + fractionalPart;
   }

   export function formatNumberToScale(minimumScale: number, value, invariant?: boolean): string
   {
      value = ko.unwrap(value);

      var raw = format.unformatNumber(value, invariant);

      if (value == null)
         return "";

      var scale = Math.max(minimumScale, mathEx.fractionDigits(raw));
      var num = scale <= 20 ? raw.toFixed(scale) : raw.toExponential();
      return format.formatNumber(num, true);
   }

   export function isNumeric(value: string)
   {
      // numeric input
      if (_.isNumber(value))
         return true;

      // empty value, i.e. null, undefined
      if (_.isEmpty(value))
         return false;

      // string input
      return value.replace(/[0-9-,.]/g, "") === "";
   }

   export function iconFromString(iconOptions, viewModel, disableIconField?)
   {
      if (!iconOptions.icon || typeof iconOptions.icon !== "function")
         throw new Error("icon must be a function that returns the name of the icon class to use.");

      var style = '';
      if (disableIconField)
         style = "style='display:none'";

      return "<i class=\"{0}\" {1}></i> ".format(iconOptions.icon(viewModel), style);
   }
}