var ag;
(function (ag) {
    ko.bindingHandlers["afterHtmlRender"] = {
        init: function (element, valueAccessor, allBindings) {
            // check if element has 'html' binding
            if (!allBindings().html)
                return;

            // get bound callback (don't care about context, it's ready-to-use ref to function)
            var callback = valueAccessor();

            allBindings().html.subscribe(function () {
                callback(element);
            }, { rateLimits: 200 });
        }
    };
})(ag || (ag = {}));
