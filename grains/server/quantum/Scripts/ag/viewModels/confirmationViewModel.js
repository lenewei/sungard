/// <reference path="../../ts/global.d.ts" />
/// <reference path="../utils/network.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var ag;
(function (ag) {
    var BaseConfirmationViewModel = (function () {
        function BaseConfirmationViewModel() {
            this.actions = {
                confirmation: {
                    showDialog: ko.observable(false),
                    model: {
                        messages: ko.observableArray([])
                    },
                    isLoaded: ko.observable(false)
                }
            };
        }
        BaseConfirmationViewModel.prototype.reInitialiseOptions = function () {
            return { deferred: null, action: null, confirmationId: null, data: null, messages: null, net: null };
        };

        BaseConfirmationViewModel.prototype.init = function (options) {
            this.reInitialiseOptions();

            // Update observable
            this.actions.confirmation.model.messages(options.messages);

            // Copy over options
            this.options = $.extend(this.options, options);

            // Display the dialog
            this.actions.confirmation.isLoaded(true);
            this.actions.confirmation.showDialog(true);
        };
        return BaseConfirmationViewModel;
    })();
    ag.BaseConfirmationViewModel = BaseConfirmationViewModel;

    var ConfirmationViewModel = (function (_super) {
        __extends(ConfirmationViewModel, _super);
        function ConfirmationViewModel() {
            var _this = this;
            _super.call(this);

            this.actions.confirmation['invokeCommand'] = ko.command({
                execute: function () {
                    if (!_this.options.deferred)
                        throw new Error("deferred not set on ConfirmationViewModel");

                    var payload = _this.options.data;
                    if (_.isFunction(payload)) {
                        // Invoke our function to get the data
                        payload = payload();
                    } else if (_.isString(payload)) {
                        // Convert a string into object
                        payload = $.parseJSON(payload);
                    }

                    // Add confirmationId to payload
                    $.extend(payload, { __confirmationId: _this.options.confirmationId });

                    _this.options.net.postJson(_this.options.action, payload, _this.options.deferred).done(function (result) {
                        _this.options.deferred.resolve(result);
                    }, function () {
                        var result = [];
                        for (var _i = 0; _i < (arguments.length - 0); _i++) {
                            result[_i] = arguments[_i + 0];
                        }
                        _this.options.deferred.fail(result);
                    }).always(function () {
                        _this.actions.confirmation.showDialog(false);
                    });
                }
            });

            this.actions.confirmation.showDialog.subscribe(function (newValue) {
                if (!newValue)
                    _this.options.deferred.reject();
            });
        }
        ConfirmationViewModel.prototype.init = function (options) {
            _super.prototype.init.call(this, options);

            if (!options.messages || !$.isArray(options.messages))
                throw new Error("confirmation messages missing");

            if (!options.confirmationId)
                throw new Error("confirmationId missing");

            if (!options.deferred)
                throw new Error("deferred missing");

            if (!options.data)
                throw new Error("data missing");

            if (!options.net)
                throw new Error("net missing");
        };
        return ConfirmationViewModel;
    })(BaseConfirmationViewModel);
    ag.ConfirmationViewModel = ConfirmationViewModel;

    var KeyChangeConfirmationViewModel = (function (_super) {
        __extends(KeyChangeConfirmationViewModel, _super);
        function KeyChangeConfirmationViewModel() {
            var _this = this;
            _super.call(this);
            // Commands for KeyChangeConfirmationViewModel
            this.commands = ["doNew", "doCopy", "doCancel"];

            _.each(this.commands, function (value) {
                _this.buildKoLiteCommands(value);
            });
        }
        KeyChangeConfirmationViewModel.prototype.buildKoLiteCommands = function (type) {
            var _this = this;
            var confirmationAction = this.actions.confirmation;
            if (confirmationAction) {
                var subActions = confirmationAction.subActions;
                if (_.isUndefined(subActions)) {
                    confirmationAction.subActions = {};
                }

                confirmationAction.subActions[type] = {
                    invokeCommand: ko.command({
                        execute: function () {
                            _this.actions.confirmation.showDialog(false);
                            return _this.options.deferred.resolve(type);
                        }
                    })
                };
            }
        };
        return KeyChangeConfirmationViewModel;
    })(BaseConfirmationViewModel);
    ag.KeyChangeConfirmationViewModel = KeyChangeConfirmationViewModel;

    // apply the binding under the ag namespace
    ag.confirmationViewModel = new ConfirmationViewModel();
    ag.keyChangeConfirmationViewModel = new KeyChangeConfirmationViewModel();
})(ag || (ag = {}));
