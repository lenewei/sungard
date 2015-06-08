/// <reference path="../dealingViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var ag;
(function (ag) {
    var InterestRateOptionDealingViewModel = (function (_super) {
        __extends(InterestRateOptionDealingViewModel, _super);
        function InterestRateOptionDealingViewModel(options) {
            _super.call(this, options);
            this.options = options;
        }
        InterestRateOptionDealingViewModel.prototype.childWindowOpened = function (viewModel, windowHandle) {
            var _this = this;
            var interval = window.setInterval(function () {
                // Check if there is still activity on the page
                // once there isn't any map the data across - short-term fix
                if (windowHandle.$.active)
                    return;

                // Clear the timer
                window.clearInterval(interval);

                // Execute mapping in context of child window
                viewModel.silenceDependency(function () {
                    return windowHandle.ko.mapping.fromJS(_this.underlyingSwapDeal, viewModel.editingItem);
                }, viewModel);
            }, 500);
        };

        InterestRateOptionDealingViewModel.prototype.showUnderlyingSwapDeal = function () {
            var _this = this;
            var underlyingSwapDealWindow = new ag.WindowManager({ name: "underlyingSwapDeal" });

            this.net.postJson("getUnderlyingSwapDeal", function () {
                return ko.mapping.toJS(_this.editingItem);
            }).done(function (result) {
                _this.underlyingSwapDeal = result.data;

                var url = _this.options.underlyingDealUrl + "?dialog=1";

                // If we have a dealNumber append the parameter to the querystring
                if (_this.underlyingSwapDeal.dealNumber)
                    url += "&dealNumber=" + encodeURIComponent(_this.underlyingSwapDeal.dealNumber);

                underlyingSwapDealWindow.navigate(url);
            }).fail(function (result) {
                underlyingSwapDealWindow.close();
                ag.utils.showErrorsFromResult(result);
            });
        };
        return InterestRateOptionDealingViewModel;
    })(ag.DealingViewModel);
    ag.InterestRateOptionDealingViewModel = InterestRateOptionDealingViewModel;
})(ag || (ag = {}));
