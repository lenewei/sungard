/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    function createUpdatingModelHelper() {
        var _this = this;
        var updatingModelDepth = ko.observable(0);

        this.updatingModel = ko.computed({
            read: function () {
                return (updatingModelDepth() > 0);
            },
            write: function (value) {
                var currentValue = _this.updatingModel();
                currentValue += (value ? 1 : (-1));
                updatingModelDepth(currentValue);
            }
        });

        return this.updatingModel;
    }
    ag.createUpdatingModelHelper = createUpdatingModelHelper;
})(ag || (ag = {}));
