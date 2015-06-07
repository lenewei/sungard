/// <reference path="../../ts/global.d.ts" />
// jQuery dotdotdot plugin binding
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["dotdotdot"] = {
        init: function (element) {
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                $(element).trigger("destroy.dot");
            });
        },
        update: function (element, valueAccessor) {
            var opts = {}, value = ko.unwrap(valueAccessor());

            ko.utils.objectForEach(value, function (optName, optValue) {
                opts[optName] = ko.unwrap(optValue);
            });

            //update dotdotdot after all other bindings are done.
            //this is needed to handle dialog boxes
            setTimeout(function () {
                $(element).dotdotdot(opts);
            });
        }
    };
})(ag || (ag = {}));
