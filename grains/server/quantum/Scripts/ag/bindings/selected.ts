/// <reference path="../../ts/global.d.ts" />

// This binding is based on the knockout 'checked' binding. But adds select all ability.
module ag
{
   "use strict";

   ko.bindingHandlers["selected"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var updateHandler = (event: JQueryEventObject) =>
         {
            var valueToWrite;
            if (element.type == "checkbox")
            {
               valueToWrite = element.checked;
            }
            else
            {
               return; // "selected" binding only responds to checkboxes
            }

            var selectedViewModel = ko.unwrap(valueAccessor());
            if (selectedViewModel)
            {
               var keys = selectedViewModel.keys,
                  all = ko.unwrap(selectedViewModel.all),
                  selectedKey = bindingContext.$parent[selectedViewModel.itemKey];

               // For checkboxes bound to an array, we add/remove the checkbox value to that array
               // This works for both observable and non-observable arrays
               var existingEntryIndex = ko.utils.arrayIndexOf(keys(), selectedKey),
                  checked = all ? !element.checked : element.checked;

               if (checked && (existingEntryIndex < 0))
                  keys.push(selectedKey);
               else if (!checked && (existingEntryIndex >= 0))
                  keys.splice(existingEntryIndex, 1);

               var bubble = allBindingsAccessor()["clickBubble"] !== false;
               if (!bubble)
               {
                  event.cancelBubble = true;
                  if (event.stopPropagation)
                     event.stopPropagation();
               }
            }
         };

         ko.utils.registerEventHandler(element, "click", updateHandler);
      } ,
      update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var selectedViewModel = ko.unwrap(valueAccessor());
         if (selectedViewModel)
         {
            var keys = ko.unwrap(selectedViewModel.keys),
               all = ko.unwrap(selectedViewModel.all),
               selectedKey = bindingContext.$parent[selectedViewModel.itemKey],
               containsKey = ko.utils.arrayIndexOf(keys, selectedKey) >= 0;

            element.checked = all ? !containsKey : containsKey;
         }
      }
   }
}