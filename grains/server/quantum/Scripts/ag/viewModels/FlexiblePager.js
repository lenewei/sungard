/// <reference path="../../ts/global.d.ts" />
/// <reference path="pager.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var FlexiblePager = (function (_super) {
        __extends(FlexiblePager, _super);
        function FlexiblePager(options) {
            var _this = this;
            _super.call(this, options);
            this.pageFrom = ko.observable(0);
            this.pageTo = ko.observable(0);

            this.itemsShowing = ko.computed(function () {
                var total = _this.totalItems();
                var from = _this.pageFrom();
                var to = _this.pageTo();

                if (total === 0)
                    return _this.options.noItemsMessage || " ";

                return _this.itemsMessage(from, to, total);
            });
        }
        FlexiblePager.prototype.updateFromResponse = function (response) {
            _super.prototype.updateFromResponse.call(this, response);

            this.pageFrom(response.gridViewOptions.pageFrom);
            this.pageTo(response.gridViewOptions.pageTo);
        };
        return FlexiblePager;
    })(ag.Pager);
    ag.FlexiblePager = FlexiblePager;
})(ag || (ag = {}));
