/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["optionCheck"] = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            var target = allBindingsAccessor();
            var newValue = target.value(), options = target.options(), found = false;

            _.each(options, function (o) {
                if (typeof (o.value) !== "undefined") {
                    if (o.value === newValue) {
                        found = true;
                        return false;
                    }
                }
            });

            if (!found) {
                var nameSegments = element.name.split('.');
                throw new Error(("{0} has a default value of {1} which does not exist in the lookup list.\n" + "Either update your data to supply a value which does exist or include the value in the lookup list.").format(nameSegments[nameSegments.length - 1], newValue));
            }
        }
    };
})(ag || (ag = {}));
