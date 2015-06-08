module ag.downloadInvoker
{
   export function invoke(url: string, params?: any): void
   {
      var $iframe = writeIframeToBody(),
         $form = createForm(url, $.browser.msie ? "POST" : "GET", params);

      writeToIframe($iframe, $form);

      $iframe.on('load', handleError);

      $form.submit();
   }

   function writeIframeToBody(): JQuery
   {
      $("#downloadInvokerIframe").off().remove();
      return $("<iframe>", { id: "downloadInvokerIframe", style: "display: none" }).appendTo("body");
   }

   function writeToIframe($iframe: JQuery, $form: JQuery): void
   {
      var document = getIframeDocument($iframe);
      document.write("<!DOCTYPE html><title>-</title><body></body>");
      $(document).find('body').append($form);
   }

   function getIframeDocument($iframe: JQuery): Document
   {
      var iframeDoc = (<any>$iframe[0]).contentWindow || (<any>$iframe[0]).contentDocument;
      return iframeDoc.document ? iframeDoc.document : iframeDoc;
   }

   function createForm(url: string, method: string, params: any): JQuery
   {
      var $form = $("<form>", { action: url, method: method });

      _.each($.toDictionary(params), (nameValuePair: any) =>
      {
         $form.append($("<input>", nameValuePair));
      });

      $form.append($("<input>", { name: "__Download", value: true }));

      $form.append($("<input>", { name: "__PageIdToken", value: utils.getPageIdToken() }));

      if (method.toUpperCase() === "POST")
         $form.append($("<input>", { name: "__RequestVerificationToken", value: utils.getRequestVerificationToken() }));

      return $form;
   }

   function handleError()
   {
      try
      {
         ag.utils.showErrorsFromResult({ responseText: getIframeDocument($(this)).body.textContent });
      } 
      catch(e)
      {
         // Unable to read the iframe so just show the default error
         ag.utils.showErrorsFromResult({});
      }
   }
}