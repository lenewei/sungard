module ag
{
   "use strict";

   ko.bindingHandlers["richtext"] =
   {
      init: (element: HTMLElement, valueAccessor: any) =>
      {
         var $element = $(element),
            stayInDom = $element.data("stayInDom");
         dom.redactor.init($element);

         // update the value accessor
         ko.utils.registerEventHandler($element.closest('div'), "focusout", () =>
         {
            valueAccessor()(dom.redactor.getHTML($element));
         });

         // if this rich text editor is in the dialog
         if ($("body").data('modalmanager').isLoading)
         {
            $element.parents(".modal").on("hidden", () =>
            {
               // if note comes from the ViewModel we can not remove it
               // due to it will be reused.
               if (stayInDom)
                  return;

               $("[class^=redactor]").remove();
               $("[id^=redactor]").remove();
            });
         }
      },
      update: (element: HTMLElement, valueAccessor: any) =>
      {
         var $element = $(element);
         
         if ($element.data("htmlset"))
            return;

         $element.data("htmlset", true);
         
         dom.redactor.insertHtml($element, ko.unwrap(valueAccessor()) || "");
         dom.redactor.fixLinks($element);
      }
   };
}