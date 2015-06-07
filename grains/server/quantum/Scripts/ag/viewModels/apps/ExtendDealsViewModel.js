var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var ExtendDealsViewModel = (function (_super) {
        __extends(ExtendDealsViewModel, _super);
        function ExtendDealsViewModel(options) {
            var _this = this;
            _super.call(this, options);

            //for "processing/currency-options-diary" page
            var grid = this.grid;
            grid['isAllowRateUpdate'] = function () {
                return _this.applicationOptions["allowRateUpdates"]() && _this.applicationOptions["details"]() == 0;
            };

            grid['appendApplicationOption'] = function (action, payload) {
                var appHeaderData = { appdata: ko.mapping.toJS(_this.applicationOptions) };
                $.extend(payload, appHeaderData);
            };

            grid['refreshItem'] = function () {
                var key = _this.applicationOptions && ko.unwrap(_this.applicationOptions);
                if (!key) {
                    return;
                }
                return _this.runReportRequest(false, 0, _this.grid.getGridViewOptionsQueryString(), "refresh");
            };
        }
        ExtendDealsViewModel.prototype.addHoldConstantToPayload = function (action, payload) {
            //var holdConstant = _.find(this.reportParameterSummary(), function (s) { return s.key === "HoldConstant"; } ).value;
            var holdConstant = ko.unwrap(this.applicationOptions['holdConstant']);
            payload.holdConstant = holdConstant;
        };

        ExtendDealsViewModel.prototype.attachOptions = function (data, action) {
            var _this = this;
            var additionalOptionFields = {};
            var additionalFields = action['actionDetails']['additionalFields'];
            if (additionalFields) {
                _.each(additionalFields.split(','), function (element) {
                    var fieldToBeAdded = _this.applicationOptions[element];
                    if (fieldToBeAdded) {
                        additionalOptionFields[element] = fieldToBeAdded;
                    }
                });
            }
            return {
                appOptions: ko.mapping.toJS(additionalOptionFields),
                data: ko.mapping.toJS(data)
            };
        };

        ExtendDealsViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            var grid = this.grid, actions = grid.actions, extendAction = actions.extend, ratefixAction = actions.rateFix, rateSetAction = actions.rateSet, reviewRollDealAction = actions.reviewRollDeal, reviewMatureDealDetailsAction = actions.reviewMatureDealDetails;

            if (extendAction) {
                extendAction.createCustomPayload = function (data) {
                    return _this.attachOptions(data, extendAction);
                };
            }

            if (ratefixAction) {
                ratefixAction.createCustomPayload = function (data) {
                    return _this.attachOptions(data, ratefixAction);
                };
            }

            if (rateSetAction) {
                rateSetAction.createCustomPayload = function (data) {
                    return { appdata: ko.mapping.toJS(_this.applicationOptions), data: ko.mapping.toJS(data) };
                };
            }

            if (reviewMatureDealDetailsAction) {
                reviewMatureDealDetailsAction.createCustomPayload = function (data) {
                    return { appdata: ko.mapping.toJS(_this.applicationOptions), data: ko.mapping.toJS(data) };
                };
            }

            if (reviewRollDealAction) {
                reviewRollDealAction.createCustomPayload = function (data) {
                    return { appdata: ko.mapping.toJS(_this.applicationOptions), data: ko.mapping.toJS(data) };
                };
            }
        };
        return ExtendDealsViewModel;
    })(ag.ReportingViewModel);
    ag.ExtendDealsViewModel = ExtendDealsViewModel;
})(ag || (ag = {}));
