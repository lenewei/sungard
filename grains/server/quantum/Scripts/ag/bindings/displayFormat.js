var ag;
(function (ag) {
    ko.bindingHandlers["displayDate"] = {
        update: function (element, valueAccessor) {
            $(element).text(moment.fromISO(ko.unwrap(valueAccessor())).toDisplay());
        }
    };

    ko.bindingHandlers["displayfullDateTime"] = {
        update: function (element, valueAccessor) {
            $(element).text(moment.fromISO(ko.unwrap(valueAccessor()), true).toFullDisplay());
        }
    };

    ko.bindingHandlers["displayDecimal"] = {
        update: function (element, valueAccessor) {
            $(element).text(ag.format.formatNumber(ko.unwrap(valueAccessor())));
        }
    };

    ko.bindingHandlers["displayDecimalFormat"] = {
        init: function (element, valueAccessor, allBindingAccessor, viewModel) {
            var accessor = valueAccessor(), valueObservable = accessor.value, usageType = accessor.type, scaleProperty = accessor.scaleProperty;

            var currentCurrency = ag.utils.getObjectPropertyByString(viewModel, scaleProperty);

            currentCurrency.subscribe(function () {
                updateDisplayDecimalFormat({
                    element: element, viewModel: viewModel, valueObservable: valueObservable,
                    currentCurrency: currentCurrency, usageType: usageType
                });
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var accessor = valueAccessor(), valueObservable = accessor.value, usageType = accessor.type, scaleProperty = accessor.scaleProperty;

            var currentCurrency = ag.utils.getObjectPropertyByString(viewModel, scaleProperty);

            updateDisplayDecimalFormat({
                element: element, viewModel: viewModel, valueObservable: valueObservable,
                currentCurrency: currentCurrency, usageType: usageType
            });
        }
    };

    function updateDisplayDecimalFormat(data) {
        var element = data.element, viewModel = data.viewModel, valueObservable = data.valueObservable, currentCurrency = data.currentCurrency();

        if (!ko.unwrap(currentCurrency))
            return;

        var scale = viewModel.currencies[ko.unwrap(currentCurrency).toLowerCase()].amountDp, formatted = ag.format.formatNumberToScale(scale, valueObservable, true);

        $(element).text(formatted);
    }
    ag.updateDisplayDecimalFormat = updateDisplayDecimalFormat;

    ko.bindingHandlers["displayEnum"] = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var enumValue = ko.unwrap(valueAccessor()), bindings = allBindingsAccessor(), propertyName = bindings.displayEnum.fieldName;

            // Get the lookup from the global ag.lookups.lookupData object
            var enumLookup = ag.getProperty(window, $(element).data("lookup-path"));
            if (!enumLookup)
                throw new Error("Unable to resolve lookup for enum property \"{0}\"".format(propertyName));

            var data = enumLookup.data();

            // Resolve the lookup value to a display text
            var lookupItem = _.find(data, function (item) {
                return item.__key__ === enumValue;
            });

            if (!lookupItem)
                throw new Error("Lookup for \"{0}\" found but value \"{1}\" could not be found in lookup data".format(propertyName, enumValue));

            $(element).text(lookupItem.__text__);
        }
    };
})(ag || (ag = {}));
