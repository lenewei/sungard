/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    function decorateValue(value) {
        value.valueIsUnvalidated = false;

        return ko.computed({
            read: value,
            write: function (v) {
                value.valueIsUnvalidated = true;
                value(v);
            }
        });
    }

    ko.bindingHandlers["filterValue"] = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            if (!ko.isObservable(value))
                throw new Error("value must be an observable");

            ko.applyBindingsToNode(element, { value: decorateValue(value) });
        }
    };
})(ag || (ag = {}));
