/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="constants.ts" />
var ag;
(function (ag) {
    (function (_filters) {
        var allOperators = ag.constants.OperatorType;

        //#region Operators
        _filters.otherOperators = [
            allOperators.OneOf,
            allOperators.NotOneOf,
            allOperators.EqualTo,
            allOperators.NotEqualTo,
            allOperators.LessThan,
            allOperators.NotLessThan,
            allOperators.GreaterThan,
            allOperators.NotGreaterThan,
            allOperators.Between,
            allOperators.NotBetween
        ];

        _filters.numberOperators = _filters.otherOperators;

        _filters.stringOperators = [
            allOperators.Contains,
            allOperators.DoesNotContain,
            allOperators.EqualTo,
            allOperators.NotEqualTo,
            allOperators.OneOf,
            allOperators.NotOneOf,
            allOperators.OneOfData,
            allOperators.NotOneOfData
        ];

        _filters.stringOperatorsWithoutLookup = [
            allOperators.Contains,
            allOperators.DoesNotContain,
            allOperators.EqualTo,
            allOperators.NotEqualTo,
            allOperators.OneOf,
            allOperators.NotOneOf
        ];

        _filters.lookupOperators = [
            allOperators.OneOf,
            allOperators.NotOneOf,
            allOperators.EqualTo,
            allOperators.NotEqualTo
        ];

        _filters.dateOperators = [
            allOperators.EqualTo,
            allOperators.NotEqualTo,
            allOperators.LessThan,
            allOperators.NotLessThan,
            allOperators.GreaterThan,
            allOperators.NotGreaterThan,
            allOperators.Between,
            allOperators.NotBetween
        ];

        _filters.filterLinkOperators = [
            allOperators.EqualTo,
            allOperators.NotEqualTo
        ];

        //#endregion
        function isMultiSelect(dataType) {
            return dataType === "lookup" || dataType === "enum";
        }
        _filters.isMultiSelect = isMultiSelect;

        function buildFilter(item, isParameter) {
            var itemDataType = ko.unwrap(item.dataType), initialValue = itemDataType === "datetime" ? ag.dates.today() : (isMultiSelect(itemDataType) ? [] : null);

            var filterData = new ag.FilterData(item);

            filterData.operator = getDefaultOperatorForDataType(itemDataType);
            filterData.value1 = initialValue;
            filterData.value2 = initialValue;
            filterData.isParameter = !!isParameter;

            return ko.mapping.fromJS(filterData);
        }
        _filters.buildFilter = buildFilter;

        function getFilterLinkOperators() {
            return _filters.filterLinkOperators;
        }
        _filters.getFilterLinkOperators = getFilterLinkOperators;

        function getOperators(data) {
            var dataType = ko.unwrap(data.dataType);

            switch (dataType) {
                case "string":
                    if (_.has(data, "hasLookup") && ko.unwrap(data.hasLookup))
                        return _filters.stringOperators;
                    return _filters.stringOperatorsWithoutLookup;
                case "lookup":
                case "enum":
                    return _filters.lookupOperators;
                case "datetime":
                    return _filters.dateOperators;
                case "integer":
                case "decimal":
                    return _filters.numberOperators;
                default:
                    return _filters.otherOperators;
            }
        }
        _filters.getOperators = getOperators;

        function getDefaultOperatorForDataType(dataType) {
            switch (dataType) {
                case "string":
                    return _filters.stringOperators[0];
                case "integer":
                case "decimal":
                    return _filters.numberOperators[0];
                case "datetime":
                    return _filters.dateOperators[0];
                default:
                    return isMultiSelect(dataType) ? _filters.lookupOperators[0] : _filters.otherOperators[0];
            }
        }
        _filters.getDefaultOperatorForDataType = getDefaultOperatorForDataType;

        /// Finds an item in the specified list of lists.
        function getItemByKey(testItem, selectedItemsList) {
            var selected = false, testKey = ko.unwrap(testItem.key).toLowerCase();

            $.each(selectedItemsList, function (outer, selectedItems) {
                var done = false;
                $.each(ko.unwrap(selectedItems), function (inner, item) {
                    selected = ko.unwrap(item.key).toLowerCase() == testKey;
                    if (selected) {
                        done = true;
                        return false;
                    }
                    return true;
                });

                if (done)
                    return false;

                return true;
            });

            return selected;
        }
        _filters.getItemByKey = getItemByKey;

        function transformFilters(filters) {
            // Function for attempting to extract values from objects.
            // If not an object do nothing (original filter value will remain).
            var getValueFromEnumObject = function (item, setterFn, prop) {
                if ($.isPlainObject(item) && item.hasOwnProperty(prop))
                    setterFn(item[prop]);
            };

            // Transform filter values and tidy-up ready for request
            $.each(filters, function (i, filter) {
                // Only enums require transforming
                if (ko.unwrap(filter.dataType) === "enum") {
                    if ($.isArray(filter.value1)) {
                        // Get values from array "one of" operator etc.
                        // This will set the filter value1 to an array of numbers e.g. [1, 4, 7]
                        $.each(filter.value1, function (j, item) {
                            getValueFromEnumObject(item, function (value) {
                                return filters[i].value1[j] = value;
                            }, "value");
                        });
                    } else {
                        // Single value "equal to" operator etc.
                        // Currently these type of enum filters want the text value e.g. "Actual Cashflows"
                        // which will then be transformed on the server. This is inconsistent and should be fixed.
                        getValueFromEnumObject(filter.value1, function (value) {
                            return filter.value1 = value;
                        }, "text");
                    }
                }

                // While we're here remove all multiValue1 properties
                // as these are only there for the UI.
                delete filter.multiValue1;
            });
        }
        _filters.transformFilters = transformFilters;

        function getRangeFilterDisplayValue(value1, value2, dataType) {
            return getSingleFilterDisplayValue(value1, dataType) + " - " + getSingleFilterDisplayValue(value2, dataType);
        }
        _filters.getRangeFilterDisplayValue = getRangeFilterDisplayValue;

        function getSingleFilterDisplayValue(value, dataType) {
            if (dataType === "datetime") {
                var date = moment.fromISO(value);
                if (date.isValid())
                    return date.toDisplay();
            }

            if (dataType === "enum") {
                if (_.isArray(value))
                    return _.map(value, function (v) {
                        return v.text;
                    }).join(", ");

                if (!value)
                    return "";

                return value.text;
            }

            if (dataType === "lookup" && $.isArray(value) && value.length > 0) {
                return value.join(", ");
            }

            return value;
        }
        _filters.getSingleFilterDisplayValue = getSingleFilterDisplayValue;
    })(ag.filters || (ag.filters = {}));
    var filters = ag.filters;
})(ag || (ag = {}));
