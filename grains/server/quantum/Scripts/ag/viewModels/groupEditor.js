/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    'use strict';
    var GroupEditorViewModel = (function () {
        // Constructor
        function GroupEditorViewModel(options) {
            var _this = this;
            this.isReadOnly = ko.observable(false);
            this.net = options.net || new ag.utils.Network();
            this.init = function (model) {
                if (_this.current !== undefined) {
                    ko.mapping.fromJS(model, _this.current);
                    ag.utils.resetValidation(_this.current);
                } else {
                    _this.current = ag.mapFromJStoMetaObservable(model, _this.isReadOnly);
                }
            };
        }
        GroupEditorViewModel.prototype.create = function (parentId) {
            var _this = this;
            return this.net.getJson('createGroup', { parentId: parentId }).done(function (result) {
                ko.mapping.fromJS(result.data, _this.current);
            });
        };

        GroupEditorViewModel.prototype.save = function (group, isNew) {
            var _this = this;
            return this.net.postJson(isNew ? 'createGroup' : 'editGroup', function () {
                return group;
            }).done(function (result) {
                _this.displayMessage(result.message);
            });
        };

        GroupEditorViewModel.prototype.remove = function (group) {
            var _this = this;
            return this.net.postJson('deleteGroup', function () {
                return group;
            }).done(function (result) {
                _this.displayMessage(result.message);
            });
        };

        GroupEditorViewModel.prototype.copy = function (group) {
            return null;
        };

        GroupEditorViewModel.prototype.move = function (content) {
            var _this = this;
            return this.net.postJson('moveToGroup', content).done(function (result) {
                _this.displayMessage(result.message);
            });
        };

        GroupEditorViewModel.prototype.addSelectedContentToGroup = function (content) {
            var _this = this;
            return this.net.postJson('addToGroup', content).done(function (result) {
                _this.displayMessage(result.message);
            });
        };

        GroupEditorViewModel.prototype.displayMessage = function (message) {
            if (!message)
                return;

            ag.messages.success(message);
        };
        return GroupEditorViewModel;
    })();
    ag.GroupEditorViewModel = GroupEditorViewModel;
})(ag || (ag = {}));
