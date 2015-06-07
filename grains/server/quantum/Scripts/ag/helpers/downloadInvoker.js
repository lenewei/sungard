var ag;
(function (ag) {
    (function (downloadInvoker) {
        function invoke(url, params) {
            ag.isNavigation = false;

            var $form = createForm(url, $.browser.msie ? "POST" : "GET", params).attr("id", "downloadInvokerForm").hide();
            $("body").remove("#downloadInvokerForm").append($form); // In IE, form can only be submitted if it's attached to the body
            $form.submit();
        }
        downloadInvoker.invoke = invoke;

        function createForm(url, method, params) {
            var $form = $("<form>", { action: url, method: method });

            _.each($.toDictionary(params), function (nameValuePair) {
                $form.append($("<input>", nameValuePair));
            });

            $form.append($("<input>", { name: "__PageIdToken", value: ag.utils.getPageIdToken() }));

            if (method.toUpperCase() === "POST")
                $form.append($("<input>", { name: "__RequestVerificationToken", value: ag.utils.getRequestVerificationToken() }));

            return $form;
        }
    })(ag.downloadInvoker || (ag.downloadInvoker = {}));
    var downloadInvoker = ag.downloadInvoker;
})(ag || (ag = {}));
