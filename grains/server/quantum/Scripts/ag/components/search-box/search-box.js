var ag;
(function (ag) {
    "use strict";

    var SearchBoxViewModel = (function () {
        function SearchBoxViewModel() {
            var _this = this;
            this.text = ko.observable("");
            this.searchTerms = ko.observableArray();
            this.clear = function () {
                _this.text("");
            };
            this.isEmpty = ko.computed(function () {
                return _this.text().length === 0;
            });

            this.hasText = ko.computed(function () {
                return _this.text().length > 0;
            });
        }
        return SearchBoxViewModel;
    })();
    ag.SearchBoxViewModel = SearchBoxViewModel;
})(ag || (ag = {}));
