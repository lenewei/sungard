var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var ModelNavigationKeyValuePair = (function () {
        function ModelNavigationKeyValuePair() {
            this.parentType = "parentName";
            this.name = "displayName";
            this.currency = "currency";
            this.account = "account";
            this.approvalStatus = "approvalStatus";
        }
        return ModelNavigationKeyValuePair;
    })();
    ag.ModelNavigationKeyValuePair = ModelNavigationKeyValuePair;

    var DataTranslationViewModel = (function (_super) {
        __extends(DataTranslationViewModel, _super);
        function DataTranslationViewModel(options) {
            _super.call(this, options);
            this.modelNavigationKeyValuePair = new ModelNavigationKeyValuePair();

            this.navigationGroups = [
                {
                    key: "Bank Account",
                    params: ["parentType", "name", "approvalStatus"]
                },
                {
                    key: "Counterparty",
                    params: ["parentType", "name", "approvalStatus"]
                },
                {
                    key: "Counterparty Delivery Instruction",
                    params: ["parentType", "name", "currency", "account", "approvalStatus"]
                },
                {
                    key: "Country",
                    params: ["parentType", "name"]
                },
                {
                    key: "Entity",
                    params: ["parentType", "name"]
                },
                {
                    key: "Instrument",
                    params: ["parentType", "name"]
                },
                {
                    key: "Location",
                    params: ["parentType", "name"]
                }
            ];
        }
        DataTranslationViewModel.prototype.getEditingItemNavKey = function (model, keyFields, key, translateFn) {
            var _this = this;
            var value = _.find(this.navigationGroups, function (navigationGroup) {
                return navigationGroup.key == model.parentName;
            });

            var params = this.navigateGetParams();

            $.each(value.params, function (propertyValue, propertyName) {
                params[propertyName] = model[_this.modelNavigationKeyValuePair[propertyName]];
            });

            params.edit = true;
            return params;
        };
        return DataTranslationViewModel;
    })(ag.StaticDataViewModel);
    ag.DataTranslationViewModel = DataTranslationViewModel;
})(ag || (ag = {}));
