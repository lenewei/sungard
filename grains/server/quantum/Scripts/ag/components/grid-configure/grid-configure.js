var ag;
(function (ag) {
    var GridConfigureViewModel = (function () {
        function GridConfigureViewModel(params) {
            var _this = this;
            this.id = params.id;
            this.hasFilters = params.hasFilters || false;

            this.layoutId = this.id + "viewlayout";
            this.filtersId = this.id + "viewfilters";
            this.propertiesId = this.id + "viewproperties";

            this.layoutHref = '#' + this.layoutId;
            this.filtersHref = '#' + this.filtersId;
            this.propertiesHref = '#' + this.propertiesId;

            this.layoutTabId = this.id + "viewLayoutTabToggle";
            this.filtersTabId = this.id + "viewFiltersTabToggle";
            this.propertiesTabId = this.id + "viewPropertiesTabToggle";

            this.accessPermissionsName = this.id + "AccessPermissions";

            this.views = params.views;
            this.sorter = params.sorter;

            this.viewFieldLookupSource = params.viewFieldLookupSource;

            this.usedViewFilters = ko.computed(function () {
                return _this.views.selected() && _this.views.selected().filters;
            });
        }
        GridConfigureViewModel.prototype.getViewFieldLookupSource = function () {
            return this.viewFieldLookupSource;
        };

        GridConfigureViewModel.prototype.getViewFilters = function () {
            return this.views.selected().filters;
        };

        GridConfigureViewModel.prototype.updateViewFilters = function (items) {
            ag.utils.pushApply(this.views.selected().filters, $.map(items, function (filter) {
                return ag.filters.buildFilter(filter, true);
            }));
        };

        GridConfigureViewModel.prototype.removeViewFilter = function (item) {
            this.views.selected().filters.remove(item);
        };
        return GridConfigureViewModel;
    })();
    ag.GridConfigureViewModel = GridConfigureViewModel;
})(ag || (ag = {}));
