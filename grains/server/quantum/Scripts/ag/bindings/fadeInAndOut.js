/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["fadeInAndOut"] = {
        init: function (element, valueAccessor) {
            var element$ = $(element), fadingDataKey = "fading";

            if (ko.unwrap(valueAccessor())) {
                element$.fadeIn(50, function () {
                    element$.data(fadingDataKey, false);
                });
                element$.data(fadingDataKey, true);
            } else
                element$.hide();
        },
        update: function (element, valueAccessor) {
            var element$ = $(element), fadingDataKey = "fading", fadeOutDuration = 125, fadeInDuration = 50;

            if (ko.unwrap(valueAccessor())) {
                // Showing, wait for a timeout to occur before showing
                // so fast operations don't get a flash of the element
                _.delay(function () {
                    // Confirm we are still wanting to show the element
                    if (ko.unwrap(valueAccessor())) {
                        element$.fadeIn(fadeInDuration, function () {
                            element$.data(fadingDataKey, false);
                        });
                        element$.data(fadingDataKey, true);
                    }
                }, 100);
            } else {
                // Hiding, if currently still animating the show then
                // allow to finish before commencing the hide
                if (!element$.data(fadingDataKey)) {
                    // Hide
                    element$.fadeOut(fadeOutDuration);
                    element$.data(fadingDataKey, false);
                } else {
                    // Allow element to be completely shown before hiding
                    _.delay(function () {
                        element$.fadeOut(fadeOutDuration);
                        element$.data(fadingDataKey, false);
                    }, fadeInDuration);
                }
            }
        }
    };
})(ag || (ag = {}));
