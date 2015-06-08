module ag.dom.pivot
{
   export var processToken = ($table: JQuery, pageTokenId: string) =>
   {
      _.delay(() =>
      {
         var tbodyTr = $table.find('tbody tr');

         var tagFormatter = ($tag:JQuery, token:string, worker:Function) =>
         {
            var hasToken = $tag.attr(token);
            if (hasToken !== undefined)
            {
               $tag.removeAttr(token);
               worker();
            }
         };

         tbodyTr.find('td a').each((i, aTag) =>
         {
            var $aTag = $(aTag),
               href = $aTag.attr('href');

            $aTag.attr('target', '_blank');

            if (href !== undefined && href !== null)
            {
               href = href.replace('$1', '&edit=')
                  .replace('$2', '&columnKey=')
                  .replace('$3', '&pageId=' + pageTokenId);
               $aTag.attr('href', href);
            }
            else
            {
               $aTag.attr('href', '#');
            }
            
            tagFormatter($aTag, '$4',() =>
            {
               $aTag.attr('onclick', "ag.contextMenu.positionPivotCellLinks(event)");
               $aTag.attr('data-toggle', 'dropdown');
               $aTag.addClass('dropdown-toggle');

               var parent = $aTag.parent();
               var contextMenu = $('<div class="dropdown context-menu\"></div>');
               contextMenu.append($aTag);
               parent.prepend(contextMenu);
            });
         });
      }, 0);
   }
}
