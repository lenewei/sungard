/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    function createSimpleNumberValidator(condition) {
        return function (value, acceptZero) {
            if (ag.isNullUndefinedOrEmpty(value))
                return true;

            var num = parseFloat(value);
            if (acceptZero && num === 0)
                return true;

            return condition(num);
        };
    }

    ko.validation.rules["positive"] = {
        validator: createSimpleNumberValidator(function (num) {
            return num > 0;
        }),
        message: "invalid value"
    };

    ko.validation.rules["negative"] = {
        validator: createSimpleNumberValidator(function (num) {
            return num < 0;
        }),
        message: "invalid value"
    };

    ko.validation.registerExtenders();

    ko.validation.init({
        insertMessages: false,
        grouping: {
            deep: true
        }
    });
})(ag || (ag = {}));
