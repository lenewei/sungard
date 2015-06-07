/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   ko.bindingHandlers["tabActive"] =
   {
      after: ["visible"],
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         // Passed a path so we can parse and find our siblings collection
         var valuePath = valueAccessor();
         if (!valuePath || valuePath.length == 0)
            throw new Error("Active tab path missing.");

         // TEMP - So this doesn't break dealing (and cashEx) while integration in progress
         if (!valuePath.startsWith("tabs."))
            return;
         ///

         // Initialise an active tab
         initialiseActiveTab(element, ko.unwrap(allBindingsAccessor().visible) || true);

         // The tabs object is on the root viewModel
         var root = bindingContext.$root,
            value = getProperty(root, valuePath),
            siblingTabs = [];

         // Get the sibling tab elements
         var siblingElements = $(element).closest("li").siblings("li").children("a");

         // Now get their tabActive binding values, needs to be done 
         // this way to avoid an issue with more than one tab control
         // at the same level in the page.
         $.each(siblingElements, (index, item) =>
         {
            var bindings = ko.bindingProvider.instance.getBindings(item, bindingContext);
            if (bindings.tabActive)
               siblingTabs.push(getProperty(root, bindings.tabActive));
         });

         if (!value)
            throw new Error("Unable to find property \"{0}\" on viewModel.".format(valuePath));

         // Set the initial active state if the tab has the "active" class
         if ($(element).closest("li").is(".active"))
            value(true);

         // Handler for tab header click
         ko.utils.registerEventHandler(element, "click", () =>
         {
            // Already selected - do nothing
            if (value())
               return;

            // Set all siblings to false
            $.each(siblingTabs, (index, item) =>
            {
               if (item())
                  item(false);
            });

            // Update the viewModel property for the selected tab
            value(true);
         });
      }
   };

   function initialiseActiveTab(elem, isElementVisible)
   {
      var element = $(elem),
         tabSelectorList = element.closest('ul'),
         selectors = tabSelectorList.find('li'),
         currentSelector = element.parent(),
         hasActiveClass = tabSelectorList.find('li.active').length > 0;

      if (hasActiveClass || !isElementVisible)
         return;

      // put the active class and current selector and corresponding div content
      currentSelector.addClass('active');
      $(tabSelectorList.siblings('div.tab-content').children()[selectors.index(currentSelector)]).addClass('active');
   }
}