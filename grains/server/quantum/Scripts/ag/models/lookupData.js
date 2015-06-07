/// <reference path="../../ts/global.d.ts" />
/// <reference path="viewData.ts" />
// Definition of LookupData, LookupItem client-side objects
// Strongly related to server-side versions but allows defaults to be set, and additional functionality added
var ag;
(function (ag) {
    "use strict";

    var LookupData = (function () {
        function LookupData(options) {
            var _this = this;
            this.fields = [];
            this.data = options.data;

            if (options.fields && _.isArray(options.fields)) {
                _.each(options.fields, function (item) {
                    _this.fields.push(new ag.ViewFieldData(item));
                });
            }

            if (options.parents && _.isArray(options.parents)) {
                this.parents = [];
                _.each(options.parents, function (item) {
                    _this.parents.push(new LookupItem(item));
                });
            }

            return this;
        }
        return LookupData;
    })();
    ag.LookupData = LookupData;

    var LookupDataResponse = (function () {
        function LookupDataResponse(options) {
            this.parents = options.parents;
            this.fields = options.fields;
            this.data = options.data;
            this.gridViewOptions = options.gridViewOptions;
            this.pageTargets = options.pageTargets;

            return this;
        }
        return LookupDataResponse;
    })();
    ag.LookupDataResponse = LookupDataResponse;

    var LookupItem = (function () {
        function LookupItem(options) {
            this.key = options.key;
            this.displayName = options.displayName;
            this.hasChildren = !!options.hasChildren;
            this.isSelectable = _.isUndefined(options.isSelectable) ? true : options.isSelectable;

            return this;
        }
        return LookupItem;
    })();
    ag.LookupItem = LookupItem;

    var PageTarget = (function () {
        function PageTarget() {
        }
        return PageTarget;
    })();
    ag.PageTarget = PageTarget;
})(ag || (ag = {}));
