/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    var Pager = (function () {
        function Pager(options) {
            var _this = this;
            this.options = options;
            this.keepPageTargetsShownFlag = false;
            this.page = ko.observable(0);
            this.totalPages = ko.observable(0);
            this.totalItems = ko.observable(0);
            this.pageTargets = ko.observableArray();
            this.pageTargetsCenter = ko.observable(0);
            this.showPageTargets = ko.observable(false);
            this.pageSize = ko.observable(options.pageSize || 20);
            this.pageTargetsInnerSize = ko.observable(2);
            this.pageTargetsEdgeSize = ko.observable(3);

            this.navigateToPage(1);

            this.itemsShowing = ko.computed(function () {
                var total = _this.totalItems(), pageSize = _this.pageSize(), page = _this.page(), to = _this.page() * _this.pageSize();

                if (total === 0)
                    return _this.options.noItemsMessage || ag.strings.noItems;

                if (to > total)
                    to = total;

                var from = (to > pageSize) ? ((page - 1) * pageSize) + 1 : 1;

                return _this.itemsMessage(from, to, total);
            });

            this.hasPages = ko.computed(function () {
                return _this.totalPages() > 0;
            });

            this.loadPreviousPageCommand = ko.command({
                execute: function () {
                    if (_this.showPageTargets())
                        _this.snapPageTargetsCenter(_this.pageTargetsCenter() - _this.getPageTargetsStepSize());
                    else
                        _this.navigateToPage(_this.page() - 1);
                },
                canExecute: function () {
                    if (_this.options.updating())
                        return false;

                    if (_this.showPageTargets())
                        return _this.pageTargetsCenter() > _this.getMinPageTargetsCenter();
                    else
                        return _this.page() > 1;
                }
            });

            this.loadNextPageCommand = ko.command({
                execute: function () {
                    if (_this.showPageTargets())
                        _this.snapPageTargetsCenter(_this.pageTargetsCenter() + _this.getPageTargetsStepSize());
                    else
                        _this.navigateToPage(_this.page() + 1);
                },
                canExecute: function () {
                    if (_this.options.updating())
                        return false;

                    if (_this.showPageTargets())
                        return _this.pageTargetsCenter() < _this.getMaxPageTargetsCenter();
                    else
                        return _this.page() < _this.totalPages();
                }
            });

            this.hasPageTargets = ko.computed(function () {
                return !_.isEmpty(_this.pageTargets());
            });

            this.pageTargetColumns = ko.computed(function () {
                var columns = [ko.mapping.fromJS(new ag.FieldData({ key: "itemRange", dataType: "string", displayName: "" }))];

                _.each(options.activeSortColumns(), function (i) {
                    var newColumn = ko.mapping.fromJS(ko.mapping.toJS(i));
                    newColumn.key("firstItem." + newColumn.key());
                    columns.push(newColumn);
                });

                return columns;
            });
        }
        Pager.prototype.itemsMessage = function (from, to, total) {
            if (from === 1 && to === total)
                return "{0} {1}".format(total, ag.strings.items);

            return "{0}-{1} {2} {3}".format(from, to, ag.strings.of, total);
        };

        // Response is either a GridViewDataResponse or LookupDataResponse
        Pager.prototype.updateFromResponse = function (response) {
            this.pageTargets(response.pageTargets);

            this.pageSize(response.gridViewOptions.pageSize);
            this.totalItems(response.gridViewOptions.totalItems);
            this.totalPages(response.gridViewOptions.totalPages);
        };

        // Caution! this doesn't reset the page and page targets center
        Pager.prototype.reset = function () {
            this.totalItems(0);
            this.totalPages(0);
            this.pageTargets.removeAll();
        };

        Pager.prototype.navigateToPage = function (page) {
            this.page(page);
            this.snapPageTargetsCenter(page);
        };

        Pager.prototype.keepPageTargetsShown = function () {
            // Prevent the page targets dropdown from closing when then next or previous button is clicked
            // Alternative method is to call event.stopPropagation but it is a bad practice and may break other codes
            this.keepPageTargetsShownFlag = this.showPageTargets();
        };

        Pager.prototype.canPageTargetsHide = function () {
            if (!this.keepPageTargetsShownFlag)
                return true;

            this.keepPageTargetsShownFlag = false;
            return false;
        };

        Pager.prototype.isPageTargetSelected = function (pageTarget) {
            return pageTarget.page === this.page();
        };

        Pager.prototype.isPageTargetDivider = function (pageTarget) {
            return pageTarget.page < 1;
        };

        Pager.prototype.selectPageTarget = function (pageTarget) {
            if (pageTarget.page >= 1)
                this.navigateToPage(pageTarget.page);
            else
                this.keepPageTargetsShown(); // Prevent dropdown from closing when "..." item is clicked
        };

        Pager.prototype.snapPageTargetsCenter = function (preferredPageTargetsCenter) {
            this.pageTargetsCenter(Math.max(Math.min(preferredPageTargetsCenter, this.getMaxPageTargetsCenter()), this.getMinPageTargetsCenter()));
        };

        Pager.prototype.getMinPageTargetsCenter = function () {
            return this.pageTargetsEdgeSize() + this.pageTargetsInnerSize() + 1;
        };

        Pager.prototype.getMaxPageTargetsCenter = function () {
            return this.totalPages() - (this.pageTargetsEdgeSize() + this.pageTargetsInnerSize());
        };

        Pager.prototype.getPageTargetsStepSize = function () {
            return this.pageTargetsInnerSize() * 2 + 1;
        };
        return Pager;
    })();
    ag.Pager = Pager;
})(ag || (ag = {}));
