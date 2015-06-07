/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    var SearchViewModel = (function () {
        function SearchViewModel() {
            var _this = this;
            this.text = ko.observable("");
            this.searchTerms = ko.observableArray();
            this.isEmpty = ko.computed(function () {
                return _this.text().length === 0;
            });

            this.hasText = ko.computed(function () {
                return _this.text().length > 0;
            });
        }
        SearchViewModel.prototype.clear = function () {
            this.text("");
        };
        return SearchViewModel;
    })();
    ag.SearchViewModel = SearchViewModel;
})(ag || (ag = {}));
