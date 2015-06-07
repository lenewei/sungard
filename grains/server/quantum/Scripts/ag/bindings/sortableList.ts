module ag
{
   ko.bindingHandlers["sortableList"] =
   {
      init: (element, valueAccessor) => 
      {
         var list = valueAccessor();
         $(element).sortable({
            containment: "parent",
            update: (event, ui) => 
            {
               var item = ko.dataFor(ui.item.context),
                  position = ko.utils.arrayIndexOf(ui.item.parent().children(), ui.item[0]);
               if (position >= 0)
               {
                  _.remove(list,(tempItem) =>
                  {
                     return tempItem == item;
                  });
                  list.splice(position, 0, item);
               }
            }
         });
      }
   };
}
