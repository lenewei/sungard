module ag.filter.helper
{
   // Clean unused values from transient data attributes
   export function cleanTransientDataAttributes($element: JQuery, transientDataAttributes: string[])
   {
      _.each(transientDataAttributes, (value) =>
      {
         $element.removeAttr("data-" + value);
         $element.removeData(value);
      });
   }

   export function registerEventListeners($element: JQuery, valueCallback: any = undefined, restrictToList: boolean = false): void
   {
      // update the valueCallback if restrictToList is false
      if (!restrictToList && $element.is("input") && valueCallback)
      {
         ko.utils.registerEventHandler($element, "change", () =>
         {
            valueCallback($element.val());
         });
      }

      ko.utils.registerEventHandler($element, "blur", (e: JQueryEventObject) =>
      {
         // If typeahead is not been initialised properly, we don't want to
         // user navigate out of the input field due to the validation purpose.
         var typeahead = $element.data("typeahead");
         if (!typeahead || typeahead.inProgressing)
         {
            e.stopImmediatePropagation();
            e.preventDefault();
            $element.focus();
         }

         // If the observable is suspended (presumably because the explorer dialog has been triggered)
         // hide the typeahead and prevent the default blur events.
         if (valueCallback && valueCallback.isSuspended && !valueCallback.isSuspended())
            return;

         if (typeahead)
            typeahead.hide(false); // don't trigger events

         e.stopImmediatePropagation();
         e.preventDefault();
      });

      if (!$element.is("input"))
      {
         ko.utils.registerEventHandler($element, "click", e =>
         {
            var typeahead = $element.data("typeahead");
            if (!typeahead.shown)
            {
               typeahead.debouncedLookup();
               e.stopImmediatePropagation();
            }
         });
      }
   }
}