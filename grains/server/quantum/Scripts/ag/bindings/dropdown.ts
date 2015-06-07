module ag
{
   ko.bindingHandlers["dropdown"] =
   {
      init: (element, valueAccessor, allBindings, viewModel) =>
      {
         var options = valueAccessor(),
            $element = $(element),
            $parent = $element.parent();

         $element.dropdown();

         if (ko.isObservable(options.show))
         {
            ko.utils.registerEventHandler($parent, "shown.bs.dropdown", () =>
            {
               options.show(true);
            });

            ko.utils.registerEventHandler($parent, "hidden.bs.dropdown", () =>
            {
               options.show(false);
            });
         }

         if (_.isFunction(options.canHide))
         {
            ko.utils.registerEventHandler($parent, "hide.bs.dropdown", e =>
            {
               if (!options.canHide.call(viewModel))
                  e.preventDefault();
            });
         }

         ko.computed(() =>
         {
            var value = ko.unwrap(options.show);
            _.delay(() =>
            {
               // delayed so that the dropdown opens when observable was changed via click event
               $element.dropdown("toggle", value);
            });
         }, null, { disposeWhenNodeIsRemoved: element });

         ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
         {
            $element.dropdown("destroy");
         });
      }
   };
}