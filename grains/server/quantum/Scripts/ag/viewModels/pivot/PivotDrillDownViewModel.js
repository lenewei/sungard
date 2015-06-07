/// <reference path="../../../ts/global.d.ts" />
var ag;
(function (ag) {
    var PivotDrillDownViewModel = (function () {
        function PivotDrillDownViewModel() {
            var _this = this;
            this.level = ko.observable(0);
            this.max = ko.observable(0);
            this.rowFilters = new PivotFiltersViewModel();
            this.columnFilters = new PivotFiltersViewModel();

            this.filters = ko.computed(function () {
                return _this.rowFilters.filters().concat(_this.columnFilters.filters());
            });

            this.filters.subscribeChanged(function (newValue, oldValue) {
                if (newValue.length === 0) {
                    _this.level(0);
                    return;
                }

                if (newValue.length > oldValue.length) {
                    var level = _this.level();
                    if (level < _this.max()) {
                        _this.level(level + 1);
                    }
                    return;
                }

                var maxFilterLevel = _.max(_.pluck(newValue, 'drillDownLevel')), newDrillDownLevel = maxFilterLevel + 1;

                if (newDrillDownLevel <= _this.max()) {
                    _this.level(newDrillDownLevel);
                }
            });
        }
        return PivotDrillDownViewModel;
    })();
    ag.PivotDrillDownViewModel = PivotDrillDownViewModel;

    var PivotFiltersViewModel = (function () {
        function PivotFiltersViewModel() {
            this.level = ko.observable(0);
            this.max = ko.observable(0);
            this.filters = ko.observableArray();
        }
        PivotFiltersViewModel.prototype.clear = function () {
            this.filters([]);
        };

        PivotFiltersViewModel.prototype.setFilter = function (index) {
            this.filters(this.filters().slice(0, index + 1));
        };

        PivotFiltersViewModel.prototype.filter = function (filters) {
            this.filters(filters);
        };
        return PivotFiltersViewModel;
    })();
    ag.PivotFiltersViewModel = PivotFiltersViewModel;
    ;
})(ag || (ag = {}));
