/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["slider"] = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();

            ko.utils.registerEventHandler(element, "slidechange", function (event, ui) {
                value(ui.value);
            });

            // Dispose
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                $(element).slider("destroy");
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor) {
            var value = valueAccessor(), valueUnwrapped = ko.unwrap(value), max = allBindingsAccessor().sliderMax, maxUnwrapped = ko.unwrap(max);

            $(element).slider({ step: 1, min: 0, max: maxUnwrapped, value: valueUnwrapped });
        }
    };
})(ag || (ag = {}));
