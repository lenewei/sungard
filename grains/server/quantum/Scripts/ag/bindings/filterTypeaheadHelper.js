var ag;
(function (ag) {
    (function (filter) {
        (function (helper) {
            (function (_typeahead) {
                // Start initialise process for remote data source
                function init($element, maxItems, dataSource, optionsTitle, optionsText, compareKey, optionsValue, valueCallback, hideQueryUI, hintSource, hintTarget, prefix, currentContext, showOnNoItems) {
                    var hasHint = hintSource && hintTarget;

                    $element.typeahead({
                        source: dataSource,
                        matcher: function () {
                            return true;
                        },
                        sorter: !hasHint ? function (items) {
                            return sorter($element, optionsTitle, optionsText, compareKey, items);
                        } : function (items) {
                            return sorterWithHints($element, optionsTitle, optionsText, compareKey, hintSource, hintTarget, items);
                        },
                        updater: function (value, item) {
                            return updater($element, optionsText, compareKey, optionsValue, valueCallback, value, item, hintSource, hintTarget, prefix, currentContext);
                        },
                        items: maxItems,
                        hideQueryUI: hideQueryUI,
                        hintSource: hintSource,
                        hintTarget: hintTarget,
                        prefix: prefix,
                        showOnNoItems: showOnNoItems
                    });

                    registerEventListeners($element);
                }
                _typeahead.init = init;

                // Start initialise process for local data source
                function initForLocalDatasource($element, dataSource) {
                    $element.typeahead({
                        source: dataSource,
                        items: 100,
                        minQueryLength: 0,
                        disableQuery: false,
                        hideQueryUI: false,
                        isLocalDatasource: true,
                        showOnNoItems: false
                    });

                    registerEventListeners($element);
                }
                _typeahead.initForLocalDatasource = initForLocalDatasource;

                var sorter = function (target, optionsTitle, optionsText, compareKey, _items) {
                    // Sorts items if required, but in our case it's an opportunity to marshall the results for output.
                    // The assumption is that the typeahead source needs to be an array of either strings or objects
                    // (see ag.bootstrap.extensions.js for details on the properties of these objects)
                    target.data("typeaheadFilterItems", _items);

                    return $.map(_items, function (item) {
                        if (optionsTitle) {
                            var ret = {
                                name: ag.utils.getValueFromAccessor(ko.unwrap(item), optionsText),
                                title: ag.utils.getValueFromAccessor(ko.unwrap(item), optionsTitle)
                            };
                            ret[compareKey] = ag.utils.getValueFromAccessor(ko.unwrap(item), compareKey);
                            return ret;
                        } else {
                            return ag.utils.getValueFromAccessor(ko.unwrap(item), optionsText);
                        }
                    });
                };

                var sorterWithHints = function (target, optionsTitle, optionsText, compareKey, hintSource, hintTarget, items) {
                    target.data("typeaheadFilterItems", items);

                    return $.map(items, function (item) {
                        return {
                            name: ag.utils.getValueFromAccessor(ko.unwrap(item), optionsText),
                            hint: item[hintSource]
                        };
                    });
                };

                var updater = function (target, optionsText, compareKey, optionsValue, valueCallback, value, item, hintSource, hintTarget, prefix, currentContext) {
                    var selectedValue = value, isEnum = currentContext && ko.unwrap(currentContext.dataType) === "enum";

                    if (value) {
                        // If a selected object has been provided, base the comparison on the compareKey on that object
                        // otherwise fetch the selected item corresponding to the typeahead display value
                        var selectedItem = ko.utils.arrayFirst(target.data("typeaheadFilterItems"), function (testItem) {
                            if (item)
                                return ag.utils.getValueFromAccessor(item, compareKey) == ag.utils.getValueFromAccessor(testItem, compareKey);
                            else
                                return (optionsText ? ag.utils.getValueFromAccessor(testItem, optionsText) : testItem) == value;
                        });

                        if (!selectedItem)
                            return null;

                        if (!isEnum) {
                            // Pass the selected value to the callback, optionally transformed if an optionsValue was specified
                            selectedValue = optionsValue ? ag.utils.getValueFromAccessor(selectedItem, optionsValue) : selectedItem;
                        } else {
                            // Return whole item for enums
                            selectedValue = selectedItem;
                        }
                    }

                    // Do the value callback
                    valueCallback(selectedValue);

                    if (hintSource && hintTarget) {
                        var property = ag.getProperty(currentContext[prefix], hintTarget);
                        if (property)
                            property(item.hint);
                    }

                    // In the rare case where the observable value hasn't changed but the UI value has, we need to force the
                    // UI value to be the same as the observable value because the value binding won't have done this if the
                    // observable value hadn't changed.
                    if (ko.isObservable(valueCallback) && valueCallback() === selectedValue) {
                        ag.key.utils.notifyKeyEventChange(target);

                        if (target.val() !== selectedValue)
                            target.val(selectedValue).change();
                    }

                    // Return null to override the default behaviour of the typehead which is to populate
                    // the target input field with the return value.
                    return null;
                };

                // Event registration
                function registerEventListeners(target) {
                    var navigateDirection = "NAVIGATE_DIRECTION";

                    ko.utils.registerEventHandler(target, "typeahead.done", function (e) {
                        var input = $(e.target), nextFocusInput;

                        if (input.data(navigateDirection) == "next") {
                            nextFocusInput = ag.dom.nextTabElement(input, 1);

                            if (nextFocusInput)
                                nextFocusInput.focus().select();

                            input.removeData(navigateDirection);
                        } else if (input.data(navigateDirection) == "prev") {
                            nextFocusInput = ag.dom.nextTabElement(input, -1);
                            if (nextFocusInput)
                                nextFocusInput.focus().select();

                            input.removeData(navigateDirection);
                        }
                    });

                    // Keydown
                    ko.utils.registerEventHandler(target, "keydown", function (e) {
                        var input = $(e.target), typeahead = input.data("typeahead");

                        switch (e.keyCode) {
                            case $.ui.keyCode.DOWN:
                                if (!typeahead.shown)
                                    typeahead.debouncedLookup();
                                break;
                            case $.ui.keyCode.TAB:
                                if (e.shiftKey)
                                    input.data(navigateDirection, "prev");
                                else
                                    input.data(navigateDirection, "next");
                                break;
                            default:
                                break;
                        }
                    });
                }
            })(helper.typeahead || (helper.typeahead = {}));
            var typeahead = helper.typeahead;
        })(filter.helper || (filter.helper = {}));
        var helper = filter.helper;
    })(ag.filter || (ag.filter = {}));
    var filter = ag.filter;
})(ag || (ag = {}));
