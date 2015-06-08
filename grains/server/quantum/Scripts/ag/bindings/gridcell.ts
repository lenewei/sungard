// Sets a Grid Cells value and CSS appropriate for datatype
module ag
{
   "use strict";

   ko.bindingHandlers["gridCell"] =
   {
      init: () =>
      {
         return { controlsDescendantBindings: true };
      },
      update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var dataType = ko.unwrap(viewModel.dataType),
            viewModelName = ko.unwrap(viewModel.key),
            rowItem = valueAccessor(),
            cellValue = utils.htmlEncode(ko.unwrap(rowItem[viewModelName])),
            rootContext = bindingContext.$root,
            grid = <GridViewModel>bindingContext.$parents[1],
            canEdit = ko.unwrap(grid.canEdit),
            isEditable = ko.unwrap(grid.isEditable) && canEdit && ko.unwrap(grid.isEnabled),
            canSelect = ko.unwrap(grid.canSelect),
            canRemove = ko.unwrap(grid.canRemove),
            gridItemKey = ko.unwrap(grid.itemKey) || 'key',
            elm = $(element),
            iconOptions = allBindingsAccessor().gridCellIcon;

         // For grids with 'restriction' use that value to determine whether editable or not.
         if (rowItem.restriction)
         {
            isEditable = isEditable && !(rowItem.restriction & EditAction.Update);
         }

         // If we have a custom formatter, see if it wants to format this cell.
         var cellFormatter: (value: any, viewModel?: any, element?: JQuery, rowItem?: any, viewModelName?: string) => string = allBindingsAccessor().gridCellFormatter,
            formattedValue = cellFormatter &&
            cellFormatter.call(rootContext, cellValue, viewModel, elm, rowItem, viewModelName);

         // If the formatter doesn't exist or returned undefined (didn't want to format the cell)
         // use the default formatter.
         if (formattedValue === undefined)
         {
            var links = getCellLinks(grid, bindingContext, element, isEditable, viewModel.linksTo, cellValue);

            cellFormatter = format.getDataTypeFormatterFunction(dataType, cellValue);
            if ($.isPlainObject(cellValue))
            {
               // Don't display empty row headers (this allows for row span to work correctly)
               if (cellValue.itemType === 1 &&
                  cellValue.isBlank === false &&
                  cellValue.value === "")
               {
                  elm.remove();
                  return;
               }
            }

            // Display a checkbox for selectable fields
            if (dataType === "checkbox" && cellValue === undefined)
            {
               var visibleDataBind = '';

               if (canSelect)
                  visibleDataBind = 'visible: $parent.' + canSelect + ', ';

               elm.html('<input type="checkbox" data-bind="selected: $parentContext.$parent.selected, ' + visibleDataBind + 'attr: { value: $parent[\'' + gridItemKey + '\'] }, clickBubble: false" class="value" />');
               ko.applyBindingsToDescendants(bindingContext, element);
               return;
            }

            // Don't display "null" in cell
            if (isNullOrUndefined(cellValue))
            {
               elm.text("");
               return;
            }

            var columnName = viewModelName.toCamelCase();
            if (grid.labels && grid.labels[columnName])
            {
               formattedValue = labelValue(grid.labels[columnName], cellValue);
            }
            else
            {
               var value = cellFormatter(cellValue, viewModel, elm, rowItem, viewModelName);
               formattedValue = links && links.length > 0 ?
                  contextMenu.cellLinks(links, value) :
                  grid.quickMenuItems && grid.quickMenuItems.length > 0 ? contextMenu.groupedMenu(value) : value;
            }
         }

         var index = (<any>bindingContext).$index(),
            total = 0;

         if (grid.columns)
            total = grid.columns().length;

         // Output the formatted value
         if (!iconOptions || iconOptions.column !== viewModelName)
            elm.html(outputValue(formattedValue, canRemove, index === total - 1));
         else
         {
            var disableIconField = elm.data("disableFolderIcon");

            elm.html(ag.format.iconFromString(iconOptions, valueAccessor(), disableIconField) +
               (!disableIconField ? formattedValue : '<i class="icon icon-folder-close" style="margin-right:3px"></i>' + elm.data("cellDisplay")));
         }

         // Add data type css and css classes passed through
         utils.addOptionalClasses(elm, bindings.dataTypeCss(dataType, ko.unwrap(bindingContext.$data.format)), ko.unwrap(bindingContext.$data.css));

         // Manually control descendent bindings ourselves as we need to bind children to
         // the parent object (containing cell values) rather than the field model
         var childContext = bindingContext.createChildContext(bindingContext.$parent);
         ko.applyBindingsToDescendants(childContext, element);
      }
   };

   function outputValue(value, canRemove: boolean, isLast: boolean)
   {
      var output = value;

      if (canRemove && isLast)
      {
         output = '<button class="close action" data-bind ="click: function() { $parents[2].removeItem($data); }, clickBubble: false">&times;</button>' + (output instanceof jQuery ? output[0].outerHTML : output);
      }

      return output;
   }

   function labelValue(columnLabels, cellValue): string
   {
      var labelType = columnLabels[cellValue.toCamelCase()],
         labelSpan = '<span class="label {1}">{0}</span>';

      return labelSpan.format(cellValue, getLabelClass(labelType));
   }

   function getLabelClass(labelType): string
   {
      if (labelType)
      {
         if (labelType === 1)
            return "label-success";

         if (labelType === 2)
            return "label-warning";

         if (labelType === 3)
            return "label-important";

         if (labelType === 4)
            return "label-info";

         if (labelType === 5)
            return "label-inverse";
      }

      return "";
   }

   function getCellLinks(grid: GridViewModel, context: KnockoutBindingContext, element, isEditable: boolean, linksTo, cellValue)
      : contextMenu.IContextMenuGroup[]
   {
      var links: contextMenu.IContextMenuGroup[] = [];

      if (grid.getCellLinks)
         links.push({ menuItems: grid.getCellLinks(context) });

      var applicationLink = getApplicationLink(ko.unwrap(linksTo), cellValue, isEditable);
      if (!grid.disableLinksTo && applicationLink)
         links.push(applicationLink);

      if (isEditable)
      {
         var editLabel = links.length > 0 ? 'Edit' : cellValue;
         links.unshift({ menuItems: ['<a href="#" data-bind="click: function(item) { $parents[2].editor.editItem(item); }">{0}</a>'.format(editLabel)] });
      }

      if (links.length > 0)
         contextMenu.saveCellLinksData(element, links);

      return links;
   }

   function getApplicationLink(linksTo, cellValue, isEditable: boolean): contextMenu.IContextMenuGroup
   {
      if (!linksTo)
         return null;

      var action = ko.mapping.toJS(linksTo);
      if (action.action == "index")
         action.action = "";

      var href = ag.utils.createUrlForRequest(action);
      href += "?" + action.keyField + "=" + cellValue;
      var type = (_.contains(href, 'deal-redirect') ? 'deal' : 'app') + '-link';
      var label = isEditable ? cellValue : '';

      var link: contextMenu.IContextMenuGroup = { menuItems: ['<a href="' + href + '" class="' + type + '">' + label + '</a>'] };
      if (isEditable)
         link.name = 'Go To';

      return link;
   }
}