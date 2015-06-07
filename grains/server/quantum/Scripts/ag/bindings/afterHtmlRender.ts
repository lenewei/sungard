module ag 
{
   ko.bindingHandlers["afterHtmlRender"] =
   {
      init: (element, valueAccessor, allBindings) =>
      {
         // check if element has 'html' binding
         if (!allBindings().html)
            return;
         
         // get bound callback (don't care about context, it's ready-to-use ref to function)
         var callback = valueAccessor();

         allBindings().html.subscribe(() =>
         {
            callback(element);
         }, {rateLimits: 200});
      }
   };
} 