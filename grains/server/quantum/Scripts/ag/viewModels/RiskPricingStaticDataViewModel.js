var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var RiskPricingStaticDataViewModel = (function (_super) {
        __extends(RiskPricingStaticDataViewModel, _super);
        function RiskPricingStaticDataViewModel() {
            _super.apply(this, arguments);
        }
        RiskPricingStaticDataViewModel.prototype.init = function (itemModel) {
            var _this = this;
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            _super.prototype.init.call(this, itemModel);

            this.editingItem.dealNumber.subscribe(function (newValue) {
                if (!newValue)
                    return;

                if (ko.unwrap(_this.updatingModel))
                    return;

                _this.net.postJson("getIdByDealNumber", {
                    dealNumber: newValue,
                    changedProperty: "dealNumber"
                }).done(function (result) {
                    _this.editItem({ id: result.data.id });
                }).done(function (result) {
                    ag.utils.documentTitle(_this.applicationTitle, result.data.id, newValue);
                });
            });

            this.editingItem.isNew.subscribe(function (newValue) {
                if (newValue)
                    _this.isDeletedItem(false);
            });
        };

        RiskPricingStaticDataViewModel.prototype.beforeApplyBindings = function () {
            this.handleCalculatePricingErrors();
        };

        RiskPricingStaticDataViewModel.prototype.handleCalculatePricingErrors = function () {
            var _this = this;
            var action = this.actions.calculatePricing;
            if (!action)
                return;

            // Get the original invoke function
            var original = action.invoke;

            // Redefine the original so we can add fail behaviour
            action.invoke = function () {
                var args = [];
                for (var _i = 0; _i < (arguments.length - 0); _i++) {
                    args[_i] = arguments[_i + 0];
                }
                original.apply(action, args).fail(function (result) {
                    if (!result)
                        return;

                    // Exception encountered
                    var errorMessages = ag.utils.getErrorsFromResponse(result[0]);
                    if (errorMessages !== undefined) {
                        _this.hasErrors(true);
                        _this.errors.removeAll();

                        // There will only be a single errorMessage but it could have
                        // new-line characters as a delimiter
                        _this.errors.push.apply(_this.errors, errorMessages[0].split("\n"));
                    }
                });
            };
        };
        return RiskPricingStaticDataViewModel;
    })(ag.StaticDataViewModel);
    ag.RiskPricingStaticDataViewModel = RiskPricingStaticDataViewModel;
})(ag || (ag = {}));
