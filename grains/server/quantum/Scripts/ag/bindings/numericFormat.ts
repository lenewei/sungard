/// <reference path="../../ts/global.d.ts" />
/// <reference path="../helpers/numbers.ts" />

// Used in place of a text binding to provide access to an edit action for the bound object
// e.g., <input data-bind="value: someObservable, numericFormat: 2 ..
module ag
{
   "use strict";

   ko.bindingHandlers["intFormat"] =
   {
      init: (element, valueAccessor) =>
      {
         // Provide additonal number format support
         utils.getNumberHelper().registerEvents(element, format.unformatNumber);

         ko.utils.registerEventHandler(element, NumberCalculator.CalculateFinish, () =>
         {
            var $element = $(element),
               unformattedNumber = format.unformatNumber($element.val()),
               newValue = unformattedNumber != null ? mathEx.trunc(unformattedNumber) : unformattedNumber,
               value = valueAccessor();

            // Compare the value has been updated
            if (value() === newValue)
            {
               // If the value does not change, apply the old formatted value
               $(element).val(newValue);
            }
            else
            {
               // If the value has been changed, update the viewModel
               value(newValue);
            }
         });
      },
      update: (element, valueAccessor) =>
      {
         $(element).val(valueAccessor()());
         PubSub.publish(dom.inputs.ResizeFont, element);
      }
   }

   ko.bindingHandlers["numericFormat"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         // Provide additonal number format support
         utils.getNumberHelper().registerEvents(element, format.unformatNumber);

         ko.utils.registerEventHandler(element, NumberCalculator.CalculateFinish, () =>
         {
            var $element = $(element),
               options = valueAccessor(),
               oldValue = format.unformatNumber(valueAccessor().value(), true),
               scale = getScale(options, bindingContext.$root.currencies),
               roundType = getRoundType(options, bindingContext.$root.currencies),
               newValue = conditionalRound(format.unformatNumber($element.val()), scale, roundType);

            // compare the value has been updated
            if (oldValue === newValue)
            {
               // if the value does not change, apply the old formatted value
               var formattedObservableValue = format.formatNumberToScale(scale, options.value, true);
               $(element).val(formattedObservableValue);
            }
            else
            {
               // if the value has been changed, update the viewModel
               valueAccessor().value(newValue);
            }
         });
      },
      update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var options = valueAccessor();
         var scale = getScale(options, bindingContext.$root.currencies);
         var formattedObservableValue = format.formatNumberToScale(scale, options.value, true);

         $(element).val(formattedObservableValue);
         PubSub.publish(dom.inputs.ResizeFont, element);
      }
   }

   function conditionalRound(value: number, scale: number, roundType: RoundType): number
   {
      if (value != null)
      {
         if (roundType === RoundType.fiveFour)
            return mathEx.round(value, scale);
         if (roundType === RoundType.up)
            return mathEx.ceil(value, scale);
         if (roundType === RoundType.down)
            return mathEx.floor(value, scale);
      }
      return value;
   }

   function getScale(options, currencies)
   {
      if (options.removeTrailingZero)
         return 0;

      var currencyKeyOrScale = ko.unwrap(options.scaleProperty);

      if (format.isNumeric(currencyKeyOrScale))
         return parseInt(currencyKeyOrScale); // Is numeric, so we know that it's a scale

      if (options.type == "bondPrice")
         return 8;

      if (options.scaleProperty)
      {
         var currency = findCurrencyOrDefault(currencyKeyOrScale, currencies);

         if (options.type == "fxRate")
            return currency.fxDp;
         else if (options.type == "interestRate")
            return currency.intDp;
         else
            return currency.amountDp;
      }

      return options.scale;
   }

   function getRoundType(options, currencies)
   {
      if (options.removeTrailingZero)
         return RoundType.none; // Can't determine how many decimals places the value can have

      if (options.roundTypeProperty)
         return <RoundType>ko.unwrap(options.roundTypeProperty);

      if (options.scaleProperty)
      {
         var currencyKeyOrScale = ko.unwrap(options.scaleProperty);
         if (!format.isNumeric(currencyKeyOrScale))
            return findCurrencyOrDefault(currencyKeyOrScale, currencies).roundType; // Not numeric, so we know that it's not a scale
      }

      return RoundType.fiveFour;
   }

   // Return the currency settings.
   // If the user entered an invalid currency, return the default one.
   function findCurrencyOrDefault(currencyKey: string, currencies: any[]): any
   {
      if (currencyKey)
      {
         var currency = currencies[currencyKey.toLowerCase()];
         if (currency)
            return currency;
      }

      return currencies["default"];
   }
}