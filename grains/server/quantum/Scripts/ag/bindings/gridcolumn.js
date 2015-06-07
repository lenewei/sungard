/// <reference path="../../ts/global.d.ts" />
/// <reference path="../viewModels/gridViewModel.ts" />
/// <reference path="../helpers/bindings.ts" />
// Sets a Grid Columns CSS for: datatype, sorted and relative size
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["gridColumn"] = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, context) {
            var columnData = valueAccessor(), dataType = ko.unwrap(columnData.dataType), relativeSize = ko.unwrap(columnData.relativeSize), columnHeader = ko.unwrap(columnData.key), format = ko.unwrap(columnData.format), sorter = null, elm = $(element);

            if (context.$parent.grid)
                sorter = ko.unwrap(context.$parent.grid.sorter);
            else if (context.$parent instanceof ag.GridViewModel)
                sorter = ko.unwrap(context.$parent.sorter);

            if (sorter && sorter.includesColumn(columnHeader))
                elm.addClass("sorted");
            else
                elm.removeClass("sorted");

            ag.utils.addOptionalClasses(elm, ag.bindings.dataTypeCss(dataType, format), relativeSizeCss(relativeSize), ko.unwrap(context.$data.css));
        }
    };

    var relativeSizeCss = function (relativeSize) {
        if (relativeSize === 0)
            return "medium";
        else if (relativeSize === 1)
            return "x-small";
        else if (relativeSize === 2)
            return "small";
        else if (relativeSize === 3)
            return "large";
        else if (relativeSize === 4)
            return "x-large";
        else
            return "medium";
    };
})(ag || (ag = {}));
