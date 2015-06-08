var ag;
(function (ag) {
    (function (downloadInvoker) {
        function invoke(url, params) {
            var $iframe = writeIframeToBody(), $form = createForm(url, $.browser.msie ? "POST" : "GET", params);

            writeToIframe($iframe, $form);

            $iframe.on('load', handleError);

            $form.submit();
        }
        downloadInvoker.invoke = invoke;

        function writeIframeToBody() {
            $("#downloadInvokerIframe").off().remove();
            return $("<iframe>", { id: "downloadInvokerIframe", style: "display: none" }).appendTo("body");
        }

        function writeToIframe($iframe, $form) {
            var document = getIframeDocument($iframe);
            document.write("<!DOCTYPE html><title>-</title><body></body>");
            $(document).find('body').append($form);
        }

        function getIframeDocument($iframe) {
            var iframeDoc = $iframe[0].contentWindow || $iframe[0].contentDocument;
            return iframeDoc.document ? iframeDoc.document : iframeDoc;
        }

        function createForm(url, method, params) {
            var $form = $("<form>", { action: url, method: method });

            _.each($.toDictionary(params), function (nameValuePair) {
                $form.append($("<input>", nameValuePair));
            });

            $form.append($("<input>", { name: "__Download", value: true }));

            $form.append($("<input>", { name: "__PageIdToken", value: ag.utils.getPageIdToken() }));

            if (method.toUpperCase() === "POST")
                $form.append($("<input>", { name: "__RequestVerificationToken", value: ag.utils.getRequestVerificationToken() }));

            return $form;
        }

        function handleError() {
            try  {
                ag.utils.showErrorsFromResult({ responseText: getIframeDocument($(this)).body.textContent });
            } catch (e) {
                // Unable to read the iframe so just show the default error
                ag.utils.showErrorsFromResult({});
            }
        }
    })(ag.downloadInvoker || (ag.downloadInvoker = {}));
    var downloadInvoker = ag.downloadInvoker;
})(ag || (ag = {}));
