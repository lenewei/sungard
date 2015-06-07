/// <reference path="./office.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var RatesTransferViewModel = (function (_super) {
        __extends(RatesTransferViewModel, _super);
        function RatesTransferViewModel() {
            _super.apply(this, arguments);
            this.allFilters = ["RateName", "Name", "RateType", "Currency", "ReferenceCcy", "DealCurrency", "CurrencyPair", "LegTwoCurrency", "RateDate", "Contract", "Exchange", "CallPut", "CapFloor", "InputType", "BankAccount", "PayerReceiver", "Frequency"];
            this.noneForceUpdateRates = ["Index"];
            this.updatingFilters = ko.observable(false);
            this.filterNames = ko.observable([]);
        }
        RatesTransferViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.forceUpdateAvailable = ko.computed(function () {
                _this.editingItem.forceUpdate(false);
                return !_.contains(_this.noneForceUpdateRates, _this.selectedType().name);
            });

            this.selectedType.subscribe(function (type) {
                _this.editingItem.area(type.area);
                _this.editingItem.controller(type.controller);

                _this.updatingFilters(true);

                _.each(_this.allFilters, function (f) {
                    _this.editingItem[f.toCamelCase()]('');
                });

                var filters = type.filters;
                if (filters) {
                    _.each(filters, function (value, key) {
                        _this.editingItem[key.toCamelCase()](value);
                    });
                }

                _this.updatingFilters(false);
            });

            _.each(this.allFilters, function (f) {
                _this.editingItem[f.toCamelCase()].subscribe(function (newValue) {
                    if (!_this.updatingFilters()) {
                        var type = _this.selectedType();
                        if (!type.filters) {
                            type.filters = {};
                        }

                        type.filters[f] = newValue;
                    }
                });
            });
        };

        RatesTransferViewModel.prototype.initializeOffice = function () {
            var _this = this;
            return _super.prototype.initializeOffice.call(this).then(function () {
                _this.availableFilters = ko.asyncComputed(function () {
                    return ag.staticDataUpload.getPropertyNamesAndTypes(_this.selectedType()).then(function (properties) {
                        return _.filter(properties, function (p) {
                            return p.isKey;
                        });
                    });
                }, _this);

                _this.availableFilters.subscribe(function (newValue) {
                    _this.filterNames(_.pluck(_this.availableFilters(), 'name'));
                });
            });
        };

        RatesTransferViewModel.prototype.getTransferTypes = function () {
            return ag.staticDataUpload.getRatesTransferTypes();
        };

        RatesTransferViewModel.prototype.getDownloadPayload = function () {
            var payload = {}, filters = {};
            payload.filters = filters;

            _.each(this.selectedType().filters, function (value, key) {
                if (value !== '') {
                    filters[key] = value;
                }
            });

            return payload;
        };

        RatesTransferViewModel.prototype.modifyUploadPayload = function (payload) {
            var forceUpdate = this.editingItem.forceUpdate;
            if (forceUpdate)
                payload.forceUpdate = ko.unwrap(forceUpdate);
        };
        return RatesTransferViewModel;
    })(ag.ExcelBaseViewModel);
    ag.RatesTransferViewModel = RatesTransferViewModel;
})(ag || (ag = {}));
