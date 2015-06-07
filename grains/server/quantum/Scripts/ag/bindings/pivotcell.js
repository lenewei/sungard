///// <reference path="../../ts/global.d.ts" />
///// <reference path="../viewModels/pivot/PivotViewModel.ts" />
///// <reference path="../ag.ts" />
//// Sets a Grid Cells value and CSS appropriate for datatype
//module ag
//{
//   "use strict";
//   ko.bindingHandlers["pivotCell"] =
//   {
//      update: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext: KnockoutBindingContext) =>
//      {
//         var itemData = valueAccessor();
//         if (itemData.itemType === 3)
//         {
//            var links = bindingContext["$root"].pivot.getCellLinks(itemData);
//            format.saveCellLinksData(element, links);
//         }
//         //   elm = $(element),
//         //   pivot: PivotViewModel = bindingContext["$root"].pivot;
//         //// Don't display "null" in cell
//         //if (cellValue === undefined || cellValue === null)
//         //{
//         //   elm.text("");
//         //   return;
//         //}
//         //var dataTypeFormatter: any = defaultValueFormatter;
//         //if (_.isObject(cellValue))
//         //{
//         //   dataTypeFormatter = objectValueFormatter;
//         //}
//         //elm.html(dataTypeFormatter(utils.htmlEncode(cellValue), viewModel, elm, pivot, bindingContext));
//         //if (cellValue.itemType === 1)
//         //{
//         //   //elm.css("left", cellValue.index * 150);
//         //}
//         //if (cellValue.itemType === 4 || cellValue.itemType === 10)
//         //{
//         //   if (cellValue.columns > 0)
//         //   {
//         //      if (cellValue.itemType === 4)
//         //      {
//         //         elm.attr("rowspan", cellValue.columns);
//         //      }
//         //      //elm.css("width", 150 * groupRows);
//         //   }
//         //   else
//         //   {
//         //      // elm.remove();
//         //      return;
//         //   }
//         //}
//         //if (cellValue.isLast === false)
//         //{
//         //   elm.addClass("clear");
//         //}
//         //if (cellValue.isFirstRow === false)
//         //{
//         //   elm.closest("tr").addClass("clear-row");
//         //}
//         //if (cellValue.isLastRow)
//         //{
//         //   elm.closest("tr").addClass("last-row");
//         //}
//         //if (cellValue.isSummary)
//         //{
//         //   elm.addClass('summary');
//         //}
//         //if (cellValue.value && cellValue.value.indexOf('-') === 0)
//         //{
//         //   elm.addClass('negative');
//         //}
//         //// Manually control descendent bindings ourselves as we need to bind children to
//         //// the parent object (containing cell values) rather than the field model
//         //var childContext = bindingContext.createChildContext(bindingContext.$parent);
//         //ko.applyBindingsToDescendants(childContext, element);
//      }
//   };
//   var defaultValueFormatter = value => value;
//   var objectValueFormatter = (value,
//      viewModel,
//      element,
//      pivot: PivotViewModel,
//      bindingContext: KnockoutBindingContext) =>
//   {
//      if (value.itemType === 1)
//      {
//         if (value.isDuplicate)
//         {
//            element.addClass("duplicate-row");
//            return "&nbsp;";
//         }
//         return value.canDrillDown ?
//            "<a href=\"#\" data-bind=\"click: function() { $root.pivot.drillDown.row.filter($data[$parent.key], $parent); }\"><span>{0}<span></a>".format(value.value)
//            : value.value;
//      }
//      else if (value.itemType === 3)
//      {
//         var links = pivot.getCellLinks(bindingContext);
//         format.saveCellLinksData(element, links);
//         //if (links && links.length)
//         //{
//         //   return format.cellLinks(links, formatValue(value.value));
//         //}
//         //var links = pivot
//         //var link = "",
//         //   values = spanValues(value, false);
//         //if (canViewDetail)
//         //{
//         //   link = "<a href=\"#\" data-bind=\"click: function() { $root.pivot.runDetailView($data[$parent.key]); }\">{0}</a>".format(values);
//         //}
//         //else if (analyseUrl)
//         //{
//         //   link = "<a href=\"{1}\" target=\"_blank\">{0}</a>".format(values, analyseUrl);
//         //}
//         //else
//         //{
//         //   link = values;
//         //}
//         //return link;
//      }
//      else if (value.itemType === 4)
//      {
//         return value.isLast ? value.value : '';
//      }
//      if (value.itemType === 5)
//      {
//         return spanValues(value, !value.isRow); // + subTotalTemplate;
//      }
//      return formatValue(value.value);
//   };
//   var spanValues = (value, includeAggregateValueClass) =>
//   {
//      var fullValue = formatValue(value.value);
//      return fullValue;
//   };
//   var formatValue = (value: string): string =>
//   {
//      if (value.indexOf('-') !== 0)
//         return value;
//      return '(' + value.substring(1) + ')';
//   };
//}
