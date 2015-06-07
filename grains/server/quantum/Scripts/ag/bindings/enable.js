/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    var originalEnableFn = ko.bindingHandlers.enable.update;

    ko.bindingHandlers.enable.update = function (element, valueAccessor) {
        originalEnableFn.apply(this, arguments);

        var value = ko.unwrap(valueAccessor());
        ko.utils.toggleDomNodeCssClass(element, 'disabled', !value);
    };
})(ag || (ag = {}));
