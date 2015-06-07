module ag
{
   ko.bindingHandlers["gridRow"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         ko.computed(() => ag.gridRow.utils.applyStyle($(element), bindingContext, <GridViewModel>bindingContext.$parents[0]),
            null, { disposeWhenNodeIsRemoved: element });
      }
   };

   ko.bindingHandlers["browseGridRow"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var appViewModel = <AppViewModel>bindingContext.$root,
            dealLinkSelector = "a.deal-link";

         ko.computed(() =>
         {
            _.delay(() => { ag.gridRow.utils.applyStyle($(element), bindingContext, <GridViewModel>bindingContext.$parents[0]); }, 0);
         }, null, { disposeWhenNodeIsRemoved: element });

         ko.utils.registerEventHandler(element, "click",(event: JQueryEventObject) =>
         {
            if (!$(element).hasClass("selected"))
               appViewModel.editItem(viewModel);
            else
               appViewModel.grid.toggle();

            // If this is a deal link, eat the click so that it behaves just like clicking anywhere on the row
            if ($(event.target).is(dealLinkSelector) || $(event.target).parent().is(dealLinkSelector))
               return false;
         });
      },
      update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var appViewModel = <AppViewModel>bindingContext.$root;

         if (appViewModel.grid.isCurrentEditingItem(valueAccessor()))
            $(element).addClass("selected");
         else
            $(element).removeClass("selected");
      }
   }

   export module gridRow.utils
   {
      export function applyStyle($tr: JQuery, bindingContext, grid: GridViewModel)
      {
         var index = ko.unwrap(bindingContext.$index);

         var hasSelected;
         if( $tr.hasClass('selected'))
            hasSelected = true;
         $tr.removeClass();
         if (hasSelected)
            $tr.addClass('selected');

         var styleItem = _.find(ko.unwrap(grid.styleDictionary),(sItem: IStyleItem) =>
         {
            return sItem.k === index;
         });

         if (!styleItem)
            return;

         var reformatCell = (className: string) =>
         {
            var firstTD = $tr.children().first(),
               firstCellLink = firstTD.children('a');

            firstCellLink.length == 0
               ? firstTD.prepend('<div class="{0}"></div>'.format(className))
               : firstCellLink.prepend('<div class="{0}"></div>'.format(className));
         };

         _.each(styleItem.s,(styleType: GridStyleType) =>
         {
            switch (styleType)
            {
               case GridStyleType.NotAvailable:
                  $tr.addClass("not-available");
                  break;
               case GridStyleType.Important:
                  $tr.addClass("important");
                  break;
               case GridStyleType.Error:
                  $tr.addClass("error");
                  break;
               case GridStyleType.FolderIcon:
                  reformatCell("icon-folder-close");
                  break;
               case GridStyleType.Pending:
                  $tr.addClass("pending");
                  break;
               case GridStyleType.Indent1:
                  $tr.addClass("indent1");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent2:
                  $tr.addClass("indent2");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent3:
                  $tr.addClass("indent3");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent4:
                  $tr.addClass("indent4");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent5:
                  $tr.addClass("indent5");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent6:
                  $tr.addClass("indent6");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent7:
                  $tr.addClass("indent7");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent8:
                  $tr.addClass("indent8");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent9:
                  $tr.addClass("indent9");
                  reformatCell("indent-div");
                  break;
               case GridStyleType.Indent10:
                  $tr.addClass("indent10");
                  reformatCell("indent-div");
                  break;
            }
         });
      }
   }
}