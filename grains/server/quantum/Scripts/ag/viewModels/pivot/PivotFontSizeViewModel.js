/// <reference path="../../../ts/global.d.ts" />
var ag;
(function (ag) {
    var PivotFontSizeViewModel = (function () {
        function PivotFontSizeViewModel() {
            var _this = this;
            this.availableSizes = ['font-small', 'font-medium', 'font-large'];
            this.currentIndex = ko.observable(1);
            this.css = ko.computed(function () {
                return _.object(_this.availableSizes, _.map(_this.availableSizes, function (s, i) {
                    return i === _this.currentIndex();
                }));
            });
        }
        PivotFontSizeViewModel.prototype.setSmall = function () {
            this.currentIndex(0);
        };

        PivotFontSizeViewModel.prototype.setMedium = function () {
            this.currentIndex(1);
        };

        PivotFontSizeViewModel.prototype.setLarge = function () {
            this.currentIndex(2);
        };
        return PivotFontSizeViewModel;
    })();
    ag.PivotFontSizeViewModel = PivotFontSizeViewModel;
})(ag || (ag = {}));
