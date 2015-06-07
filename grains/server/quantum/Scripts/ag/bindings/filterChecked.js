/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["filterChecked"] = {
        init: function (element, valueAccessor) {
            var temp = ko.unwrap(valueAccessor());
            if (temp) {
                if (_.isBoolean(temp)) {
                    $(element).selected(temp);
                } else if (temp.length > 0) {
                    $(element).selected(temp[0]);
                }
            }

            ko.utils.registerEventHandler(element, "change", function () {
                valueAccessor()($(element).is(":checked"));
            });
        },
        update: function (element, valueAccessor) {
            var value = ko.unwrap(valueAccessor());

            if (_.isArray(value) && value.length > 0) {
                $(element).selected(value[0]);
            } else {
                $(element).selected(value);
            }
        }
    };
})(ag || (ag = {}));
