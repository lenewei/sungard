/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["loadingState"] = {
        update: function (element, valueAccessor) {
            //var value = ko.unwrap(valueAccessor());
            //$(element).button(value ? 'loading' : 'reset');
        }
    };
})(ag || (ag = {}));
