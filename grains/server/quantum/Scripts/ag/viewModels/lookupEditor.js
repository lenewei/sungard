/// <reference path="../utils/network.ts" />
/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    var LookupEditorViewModel = (function () {
        function LookupEditorViewModel(options) {
            var _this = this;
            this.options = options;
            this.net = new ag.utils.Network();
            this.showDialog = ko.observable(false);
            this.isReadOnly = ko.observable(false);
            var name = options.name, defaultCreateActionName = 'create' + name;

            this.value = options.value;
            this.itemKey = options.itemKey;
            this.createGetActionName = options.createGetActionName || defaultCreateActionName;
            this.createPostActionName = options.createPostActionName || defaultCreateActionName;
            this.net = new ag.utils.Network();
            this.dialogTitle = ko.observable(options.editTitle);
            this.item = ag.mapFromJStoMetaObservable(options.editItem, this.isReadOnly);

            this.newItem = ko.asyncCommand({
                execute: function (complete) {
                    _this.showDialog(true);

                    _this.net.getJson(_this.createGetActionName, {}).done(function (response) {
                        var item = response.data;
                        ko.mapping.fromJS(item, _this.item);
                    }).always(complete);
                }
            });
        }
        LookupEditorViewModel.prototype.cancel = function () {
            this.showDialog(false);
        };

        LookupEditorViewModel.prototype.saveItem = function () {
            var _this = this;
            var payload = ko.mapping.toJS(this.item), additionalPayload = {};

            if (this.options.additionalFields && this.options.additionalFields.length > 0) {
                var additionalFields = this.options.additionalFields.split(",");

                _.each(additionalFields, function (field) {
                    ag.setProperty(additionalPayload, field, ag.getProperty(_this.options.viewModel, field));
                });

                $.extend(payload, ko.mapping.toJS(additionalPayload));
            }

            return this.net.postJson(this.createPostActionName, payload).done(function (response) {
                var item = response.data;

                _this.value(item[_this.itemKey]);
                _this.showDialog(false);
            });
        };
        return LookupEditorViewModel;
    })();
    ag.LookupEditorViewModel = LookupEditorViewModel;
})(ag || (ag = {}));
