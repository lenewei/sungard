/// <reference path="../../ts/global.d.ts" />
// Track the order of particular dom elements
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["domOrder"] = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            var bindings = allBindingsAccessor(), selector = bindings.selector || "label[for]", attribute = bindings.attribute || "for";

            $(element).find(selector).each(function (index, item) {
                var attributeValue = $(item).attr(attribute);
                if (attributeValue) {
                    var val = attributeValue.split("_");
                    valueAccessor().push(val[val.length - 1]);
                }
            });
        }
    };
})(ag || (ag = {}));
