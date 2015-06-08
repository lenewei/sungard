/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["filterValue"] = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            if (!ko.isObservable(value))
                throw new Error("value must be an observable");

            ko.applyBindingsToNode(element, { value: ag.utils.addUnvalidatedFlag(value) });
        }
    };
})(ag || (ag = {}));
