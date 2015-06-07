/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    // Scroll to the bound element when an observable is set to true
    ko.bindingHandlers["scrollTo"] = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            // Only scroll when observable set to true and element is visible
            if (!ko.unwrap(valueAccessor()) || !$(element).is(':visible'))
                return;

            // Get the duration or use default
            var duration = allBindingsAccessor().scrollToDuration || 1000;

            // Scroll when observable set to true
            $("html,body").animate({ scrollTop: $(element).offset().top }, duration);
        }
    };
})(ag || (ag = {}));
