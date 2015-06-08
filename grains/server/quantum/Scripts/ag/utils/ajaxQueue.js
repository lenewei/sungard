var ajaxExtensions;
(function (ajaxExtensions) {
    // jQuery on an empty object, we are going to use this as our Queue
    var ajaxQueue = $({});

    $.ajaxQueue = function (ajaxOptions) {
        var jqXHR, dfd = $.Deferred(), promise = dfd.promise(), resolvedOptions;

        // queue our ajax request
        ajaxQueue.queue(doRequest);

        // add the abort method
        promise.abort = function (statusText) {
            // proxy abort to the jqXHR if it is active
            if (jqXHR) {
                return jqXHR.abort(statusText);
            }

            // if there wasn't already a jqXHR we need to remove from queue
            var queue = ajaxQueue.queue(), index = $.inArray(doRequest, queue);

            if (index > -1) {
                queue.splice(index, 1);
            }

            // and then reject the deferred
            dfd.rejectWith(resolvedOptions.context || resolvedOptions, [promise, statusText, ""]);
            return promise;
        };

        // run the actual query
        function doRequest(next) {
            resolvedOptions = ajaxOptions();

            jqXHR = $.ajax(resolvedOptions).done(dfd.resolve).fail(dfd.reject).then(next, next);
        }

        return promise;
    };
})(ajaxExtensions || (ajaxExtensions = {}));
