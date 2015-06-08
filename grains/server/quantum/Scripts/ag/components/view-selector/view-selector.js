var ag;
(function (ag) {
    var ViewSelectorViewModel = (function () {
        function ViewSelectorViewModel(views, viewTables, selectView) {
            var _this = this;
            this.views = views;
            this.viewTables = viewTables;
            this.selectView = selectView;
            this.isLoaded = ko.observable(false);
            this.displayViewTypeBadge = ko.observable(true);
            this.hasMultipleViewTables = ko.computed(function () {
                return _this.viewTables().length > 1;
            });
        }
        ViewSelectorViewModel.prototype.findByViewTable = function (viewTableKey) {
            return this.views().filter(function (view) {
                return viewTableKey && view.viewTableKey() === viewTableKey();
            });
        };
        return ViewSelectorViewModel;
    })();
    ag.ViewSelectorViewModel = ViewSelectorViewModel;

    ko.bindingHandlers["dropdownLoad"] = {
        init: function (element, valueAccessor) {
            var isLoaded = valueAccessor();
            $(element).one('show.bs.dropdown', function () {
                return isLoaded(true);
            });
        }
    };
})(ag || (ag = {}));
