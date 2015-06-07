/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["ratioPie"] = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            var value = valueAccessor(), allBindings = allBindingsAccessor(), maxCount = ko.unwrap(value), countBinding = allBindings.valueCount, count = ko.unwrap(countBinding), positiveBinding = allBindings.valuePositive, positive = ko.unwrap(positiveBinding);

            if (count > 0) {
                var title = count + " " + ag.strings.value;
                if (count > 1) {
                    title += ag.strings.valuePlural + "<br />";
                    if (positive > 0) {
                        title += positive + "% " + ag.strings.positive;
                    } else {
                        title += "100% " + ag.strings.negative;
                    }
                }

                var ratioOpacity = 0.3 + (count / maxCount * 0.7);

                $('<span class="ratio visualisation" style="display:none" data-bind="visible: $root.pivot.displayCircles"></span>').appendTo(element).css('opacity', ratioOpacity).attr("title", title).tooltip().sparkline([positive, 100 - positive], {
                    type: 'pie',
                    width: 16,
                    height: 16,
                    sliceColors: ['#48a90e', '#ab3020'],
                    disableInteraction: true,
                    offset: -90
                });
            }
        }
    };
})(ag || (ag = {}));
