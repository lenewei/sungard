/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    var GridLabelType;
    (function (GridLabelType) {
        GridLabelType[GridLabelType["default"] = 0] = "default";
        GridLabelType[GridLabelType["success"] = 1] = "success";
        GridLabelType[GridLabelType["warning"] = 2] = "warning";
        GridLabelType[GridLabelType["important"] = 3] = "important";
        GridLabelType[GridLabelType["info"] = 4] = "info";
        GridLabelType[GridLabelType["inverse"] = 5] = "inverse";
    })(GridLabelType || (GridLabelType = {}));

    var GridLabel = (function () {
        function GridLabel() {
        }
        return GridLabel;
    })();
    ag.GridLabel = GridLabel;
})(ag || (ag = {}));
