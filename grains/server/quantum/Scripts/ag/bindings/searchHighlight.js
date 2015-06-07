/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["searchHighlight"] = {
        //valueAccessor: search.js - SearceViewModel.searchTerms()
        update: function (element, valueAccessor) {
            var value = ko.unwrap(valueAccessor());
            highlightText(element, value);
        }
    };

    function highlightText(element, highlightTerms) {
        if (!element || !highlightTerms || highlightTerms.length < 1)
            return;

        // pick the correct target to highlight
        var highlightArea;
        if ($(element).is("table"))
            highlightArea = $(element.tBodies);
        else
            highlightArea = $(element);

        if (!highlightArea)
            return;

        for (var i = 0; i < highlightTerms.length; i++)
            highlightArea.highlight(highlightTerms[i]);
    }
})(ag || (ag = {}));
