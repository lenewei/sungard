module ag.downloadInvoker
{
   export function invoke(url: string, params?: any): void
   {
      ag.isNavigation = false;

      var $form = createForm(url, $.browser.msie ? "POST" : "GET", params).attr("id", "downloadInvokerForm").hide();
      $("body").remove("#downloadInvokerForm").append($form); // In IE, form can only be submitted if it's attached to the body
      $form.submit();
   }

   function createForm(url: string, method: string, params: any): JQuery
   {
      var $form = $("<form>", { action: url, method: method });

      _.each($.toDictionary(params), (nameValuePair: any) =>
      {
         $form.append($("<input>", nameValuePair));
      });

      $form.append($("<input>", { name: "__PageIdToken", value: utils.getPageIdToken() }));

      if (method.toUpperCase() === "POST")
         $form.append($("<input>", { name: "__RequestVerificationToken", value: utils.getRequestVerificationToken() }));

      return $form;
   }
}