var ag;
(function (ag) {
    (function (filter) {
        (function (helper) {
            // Clean unused values from transient data attributes
            function cleanTransientDataAttributes($element, transientDataAttributes) {
                _.each(transientDataAttributes, function (value) {
                    $element.removeAttr("data-" + value);
                    $element.removeData(value);
                });
            }
            helper.cleanTransientDataAttributes = cleanTransientDataAttributes;

            function registerEventListeners($element, valueCallback, restrictToList) {
                if (typeof valueCallback === "undefined") { valueCallback = undefined; }
                if (typeof restrictToList === "undefined") { restrictToList = false; }
                // update the valueCallback if restrictToList is false
                if (!restrictToList && $element.is("input") && valueCallback) {
                    ko.utils.registerEventHandler($element, "change", function () {
                        valueCallback($element.val());
                    });
                }

                ko.utils.registerEventHandler($element, "blur", function (e) {
                    // If typeahead is not been initialised properly, we don't want to
                    // user navigate out of the input field due to the validation purpose.
                    var typeahead = $element.data("typeahead");
                    if (!typeahead || typeahead.inProgressing) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        $element.focus();
                    }

                    // If the observable is suspended (presumably because the explorer dialog has been triggered)
                    // hide the typeahead and prevent the default blur events.
                    if (valueCallback && valueCallback.isSuspended && !valueCallback.isSuspended())
                        return;

                    if (typeahead)
                        typeahead.hide(false); // don't trigger events

                    e.stopImmediatePropagation();
                    e.preventDefault();
                });

                if (!$element.is("input")) {
                    ko.utils.registerEventHandler($element, "click", function (e) {
                        var typeahead = $element.data("typeahead");
                        if (!typeahead.shown) {
                            typeahead.debouncedLookup();
                            e.stopImmediatePropagation();
                        }
                    });
                }
            }
            helper.registerEventListeners = registerEventListeners;
        })(filter.helper || (filter.helper = {}));
        var helper = filter.helper;
    })(ag.filter || (ag.filter = {}));
    var filter = ag.filter;
})(ag || (ag = {}));
