/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";
    ko.bindingHandlers["showModalDialog"] = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            ko.utils.registerEventHandler(element, "hidden", function () {
                var observable = valueAccessor();
                observable(false);
            });

            ko.utils.registerEventHandler(element, "shown", function () {
                var observable = valueAccessor(), $element = $(element);

                // Need to make sure observable is not set to true, otherwise will cause
                // dialog to reshow.
                if (!observable()) {
                    observable(true);
                }

                // Wrap a form around the dialog content since some need it such as those that has <input type="file" />
                if ($element.find('form').length === 0) {
                    _.defer(function () {
                        $element.wrapInner("<form onsubmit=\"return false;\" />");
                    });
                }

                // Set focus to the first visible input that is not disabled or a button
                _.defer(function () {
                    var $firstElement = $element.find(":input:visible:not(.disabled):not(button):first").focus();
                    if (allBindingsAccessor().selectFirstElement) {
                        $firstElement.select();
                    }
                });
            });
        },
        update: function (element, valueAccessor) {
            var show = ko.unwrap(valueAccessor()), $element = $(element);

            // The dialog may have moved since it was last shown, so reset position
            if (show) {
                $element.css({ top: '', left: '' });
            }
            $element.modal(show ? "show" : "hide");

           // $("#qrDialog").width(400);
        }
    };
})(ag || (ag = {}));
