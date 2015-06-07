/// <reference path="../../ts/global.d.ts" />
// Manages a period control, a combination of a period type and an interval value
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["period"] = {
        init: function (element, valueAccessor) {
            var value = valueAccessor(), intervalTypeSubscription;

            if (!value)
                throw new Error("The period binding has no bound observable");

            // If the interval type changes, clear the interval value because it may no longer be
            // relevant to the selected interval type.
            intervalTypeSubscription = value.intervalType.subscribe(function () {
                value.interval(null);
            });

            // Dispose
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                intervalTypeSubscription.dispose();
            });
        }
    };
})(ag || (ag = {}));
