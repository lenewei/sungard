/// <reference path="../../ts/global.d.ts" />
/// <reference path="../helpers/numbers.ts" />
// Used in place of a text binding to provide access to an edit action for the bound object
// e.g., <input data-bind="value: someObservable, numericFormat: 2 ..
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["intFormat"] = {
        init: function (element, valueAccessor) {
            // Provide additonal number format support
            ag.utils.getNumberHelper().registerEvents(element, ag.format.unformatNumber);

            ko.utils.registerEventHandler(element, ag.NumberCalculator.CalculateFinish, function () {
                var $element = $(element), unformattedNumber = ag.format.unformatNumber($element.val()), newValue = unformattedNumber != null ? ag.mathEx.trunc(unformattedNumber) : unformattedNumber, value = valueAccessor();

                // Compare the value has been updated
                if (value() === newValue) {
                    // If the value does not change, apply the old formatted value
                    $(element).val(newValue);
                } else {
                    // If the value has been changed, update the viewModel
                    value(newValue);
                }
            });
        },
        update: function (element, valueAccessor) {
            $(element).val(valueAccessor()());
            PubSub.publish(ag.dom.inputs.ResizeFont, element);
        }
    };

    ko.bindingHandlers["numericFormat"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            // Provide additonal number format support
            ag.utils.getNumberHelper().registerEvents(element, ag.format.unformatNumber);

            ko.utils.registerEventHandler(element, ag.NumberCalculator.CalculateFinish, function () {
                var $element = $(element), options = valueAccessor(), oldValue = ag.format.unformatNumber(valueAccessor().value(), true), scale = getScale(options, bindingContext.$root.currencies), roundType = getRoundType(options, bindingContext.$root.currencies), newValue = conditionalRound(ag.format.unformatNumber($element.val()), scale, roundType);

                // compare the value has been updated
                if (oldValue === newValue) {
                    // if the value does not change, apply the old formatted value
                    var formattedObservableValue = ag.format.formatNumberToScale(scale, options.value, true);
                    $(element).val(formattedObservableValue);
                } else {
                    // if the value has been changed, update the viewModel
                    valueAccessor().value(newValue);
                }
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var options = valueAccessor();
            var scale = getScale(options, bindingContext.$root.currencies);
            var formattedObservableValue = ag.format.formatNumberToScale(scale, options.value, true);

            $(element).val(formattedObservableValue);
            PubSub.publish(ag.dom.inputs.ResizeFont, element);
        }
    };

    function conditionalRound(value, scale, roundType) {
        if (value != null) {
            if (roundType === 10210002 /* fiveFour */)
                return ag.mathEx.round(value, scale);
            if (roundType === 10210003 /* up */)
                return ag.mathEx.ceil(value, scale);
            if (roundType === 10210004 /* down */)
                return ag.mathEx.floor(value, scale);
        }
        return value;
    }

    function getScale(options, currencies) {
        if (options.removeTrailingZero)
            return 0;

        var currencyKeyOrScale = ko.unwrap(options.scaleProperty);

        if (ag.format.isNumeric(currencyKeyOrScale))
            return parseInt(currencyKeyOrScale);

        if (options.type == "bondPrice")
            return 8;

        if (options.scaleProperty) {
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

    function getRoundType(options, currencies) {
        if (options.removeTrailingZero)
            return 10210001 /* none */;

        if (options.roundTypeProperty)
            return ko.unwrap(options.roundTypeProperty);

        if (options.scaleProperty) {
            var currencyKeyOrScale = ko.unwrap(options.scaleProperty);
            if (!ag.format.isNumeric(currencyKeyOrScale))
                return findCurrencyOrDefault(currencyKeyOrScale, currencies).roundType;
        }

        return 10210002 /* fiveFour */;
    }

    // Return the currency settings.
    // If the user entered an invalid currency, return the default one.
    function findCurrencyOrDefault(currencyKey, currencies) {
        if (currencyKey) {
            var currency = currencies[currencyKey.toLowerCase()];
            if (currency)
                return currency;
        }

        return currencies["default"];
    }
})(ag || (ag = {}));
