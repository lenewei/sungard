var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["richtext"] = {
        init: function (element, valueAccessor) {
            var $element = $(element), stayInDom = $element.data("stayInDom");
            ag.dom.redactor.init($element);

            // update the value accessor
            ko.utils.registerEventHandler($element.closest('div'), "focusout", function () {
                valueAccessor()(ag.dom.redactor.getHTML($element));
            });

            // if this rich text editor is in the dialog
            if ($("body").data('modalmanager').isLoading) {
                $element.parents(".modal").on("hidden", function () {
                    // if note comes from the ViewModel we can not remove it
                    // due to it will be reused.
                    if (stayInDom)
                        return;

                    $("[class^=redactor]").remove();
                    $("[id^=redactor]").remove();
                });
            }
        },
        update: function (element, valueAccessor) {
            var $element = $(element);

            if ($element.data("htmlset"))
                return;

            $element.data("htmlset", true);

            ag.dom.redactor.insertHtml($element, ko.unwrap(valueAccessor()) || "");
            ag.dom.redactor.fixLinks($element);
        }
    };
})(ag || (ag = {}));
