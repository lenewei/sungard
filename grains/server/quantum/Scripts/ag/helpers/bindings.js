var ag;
(function (ag) {
    // Sets a Grid Columns CSS for: datatype, sorted and relative size
    (function (bindings) {
        "use strict";

        function dataTypeCss(dataType, format) {
            var css;
            switch (dataType) {
                case "integer":
                case "double":
                case "decimal":
                    css = "column-number";
                    break;
                default: {
                    if (format == "generalNumber")
                        css = "column-number";
                    else
                        css = "";
                }
            }
            return css;
        }
        bindings.dataTypeCss = dataTypeCss;
    })(ag.bindings || (ag.bindings = {}));
    var bindings = ag.bindings;
})(ag || (ag = {}));
