/// <reference path="GridViewModel.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    (function (EditMode) {
        EditMode[EditMode["Edit"] = 0] = "Edit";
        EditMode[EditMode["New"] = 1] = "New";
        EditMode[EditMode["ConfirmDelete"] = 2] = "ConfirmDelete";
    })(ag.EditMode || (ag.EditMode = {}));
    var EditMode = ag.EditMode;
    ;

    (function (EditAction) {
        EditAction[EditAction["None"] = 0] = "None";
        EditAction[EditAction["Update"] = 1] = "Update";
        EditAction[EditAction["Delete"] = 2] = "Delete";
        EditAction[EditAction["All"] = 3] = "All";
    })(ag.EditAction || (ag.EditAction = {}));
    var EditAction = ag.EditAction;
    ;

    var generateActionName = function (action, name, controller, suffix) {
        return (controller && !suffix) ? action : action + name;
    };

    var createUrl = function (action, controller) {
        if (!controller) {
            return action;
        }

        return { controller: controller, action: action };
    };

    var GridEditorViewModel = (function () {
        function GridEditorViewModel(grid, options) {
            var _this = this;
            this.grid = grid;
            this.options = options;
            this.unsavedChanges = ko.observable(false);
            this.item = ko.observable();
            this.showDialog = ko.observable(false).extend({ notify: "always" });
            this.selectedItem = ko.observable();
            this.closeDialogOnDeleteCancel = ko.observable(false);
            this.isEditorReadOnly = ko.observable(false);
            this.updatingModel = ko.observable(false);
            this.grids = {};
            // Reinstate these checks when GridEditors are only
            // being created for grids that are editable
            if (!options.name)
                throw Error("name must be supplied.");

            if (!options.itemKey)
                throw Error("itemKey must be supplied.");

            this.selected = grid.selected;
            this.itemKey = options.itemKey;
            this.mode = ko.observable(0 /* Edit */);
            this.name = options.name;
            this.controller = options.controller;
            this.suffixActionNames = options.suffixActionNames;
            this.itemDisplayName = options.itemDisplayName;
            this.defaultEditActionName = generateActionName('edit', this.name, this.controller, this.suffixActionNames);
            this.defaultCreateActionName = generateActionName('create', this.name, this.controller, this.suffixActionNames);
            this.defaultCopyActionName = generateActionName('copy', this.name, this.controller, this.suffixActionNames);
            this.defaultDeleteActionName = generateActionName('delete', this.name, this.controller, this.suffixActionNames);
            this.editGetActionName = options.editGetActionName || this.defaultEditActionName;
            this.editPostActionName = options.editPostActionName || this.defaultEditActionName;
            this.createGetActionName = options.createGetActionName || this.defaultCreateActionName;
            this.createPostActionName = options.createPostActionName || this.defaultCreateActionName, this.copyGetActionName = options.copyGetActionName || this.defaultCopyActionName, this.deletePostActionName = options.deletePostActionName || this.defaultDeleteActionName, this.savePostActionName = options.savePostActionName || (options.controller ? 'save' : this.name + 's'), this.dependencies = options.dependencies, this.viewModel = options.actionViewModel || options.viewModel;
            this.area = ag.area;
            if (options.area !== undefined)
                this.area = options.area;

            this.net = new ag.utils.Network({ area: this.area, controller: this.controller, responseOnly: options.responseOnly, postOnly: options.postOnly });

            this.grid.menuCommands.editItemCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.editItem(_this.selected.item()).always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.grid.isEnabled() && _this.canEdit(_this.selected.item());
                },
                deferCanExecute: true
            });

            this.grid.menuCommands.saveItemsCommand = ko.asyncCommand({
                execute: function (data, event, completed) {
                    _this.saveItems().always(completed);
                }
            });

            this.grid.menuCommands.newItemCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.newItem().always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.grid.isEnabled() && _this.canCreate();
                },
                deferCanExecute: true
            });

            this.grid.menuCommands.copyItemCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.copyItem(_this.selected.item()).always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.grid.isEnabled() && _this.canCopy(_this.selected.item());
                }
            });

            this.grid.menuCommands.deleteItemCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.deleteItem(_this.selected.item()).always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.grid.isEnabled() && _this.canDelete(_this.selected.item());
                },
                deferCanExecute: true
            });

            this.grid.menuCommands.revertItemCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.deleteItem(_this.selected.item()).always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.grid.isEnabled() && _this.unsavedChanges();
                }
            });

            this.deleteItemCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.deleteItem(_this.item(), false).always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canDelete(_this.item());
                },
                isVisible: function () {
                    return _this.mode() === 0 /* Edit */;
                }
            });

            this.copyItemCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.copyItem(_this.item(), false).always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canCopy(_this.item());
                },
                isVisible: function () {
                    return _this.mode() === 0 /* Edit */;
                }
            });

            this.saveItemCommand = ko.asyncCommand({
                execute: function (data, event, completed) {
                    _this.saveItem(data, event).always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canSave(_this.item());
                }
            });

            this.dialogTitle = ko.computed(function () {
                if (_this.mode() === 2 /* ConfirmDelete */) {
                    return ag.strings.confirmDel;
                }

                return "{0} {1}".format(_this.mode() === 1 /* New */ ? ag.strings.newLabel : ag.strings.edit, _this.itemDisplayName);
            });

            // force grids to re-render when the isEnabled flag changes
            grid.isEnabled.subscribe(function () {
                grid.items.valueHasMutated();
            });
        }
        GridEditorViewModel.prototype.overrideViewModel = function (viewModel) {
            this.viewModel = viewModel;
        };

        GridEditorViewModel.prototype.canDoAction = function (fn) {
            return fn ? fn() : true;
        };

        GridEditorViewModel.prototype.canCreate = function () {
            return this.canDoAction(this.canCreateFn);
        };

        GridEditorViewModel.prototype.canCopy = function (data) {
            return this.canDoAction(this.canCopyFn) && data;
        };

        GridEditorViewModel.prototype.canEdit = function (data) {
            return this.canDoActionWithRestriction(data, this.canEditFn, 1 /* Update */);
        };

        GridEditorViewModel.prototype.canDelete = function (data) {
            return this.canDoActionWithRestriction(data, this.canDeleteFn, 2 /* Delete */);
        };

        GridEditorViewModel.prototype.canSave = function (data) {
            return this.canDoActionWithRestriction(data, this.canSaveFn, 0 /* None */);
        };

        GridEditorViewModel.prototype.canDoActionWithRestriction = function (data, canActionFn, restrictionType) {
            if (!data)
                return false;

            var canAction = this.canDoAction(canActionFn);
            if (!canAction)
                return false;

            var restriction = data.restriction ? ko.utils.unwrapObservable(data.restriction) : 0 /* None */;
            return !(restriction & restrictionType);
        };

        GridEditorViewModel.prototype.editItem = function (item, displayModalLoading) {
            var _this = this;
            if (typeof displayModalLoading === "undefined") { displayModalLoading = true; }
            this.mode(0 /* Edit */);

            if (displayModalLoading) {
                this.showDialog(false);
                ag.dom.displayModalLoading();
            }

            if (item == null) {
                var promise = $.Deferred();
                return promise.reject(item);
            }

            var params = {};
            params[this.itemKey] = item[this.itemKey];
            this.extendPayloadWithAdditionalFields(params);

            return this.net.getJson(createUrl(this.editGetActionName, this.controller), params).done(function (response) {
                _this.setEditingItem(response.data, response.lookups);
                _this.showDialog(true);
            }).fail(function () {
                ag.dom.hideModalLoading();
            });
        };

        GridEditorViewModel.prototype.saveItems = function () {
            var _this = this;
            return this.postItem(this.grid.items(), this.savePostActionName, function (response) {
                if (response.hasErrors)
                    return;

                _this.grid.loadGridData(response);
            });
        };

        GridEditorViewModel.prototype.newItem = function () {
            var _this = this;
            this.mode(1 /* New */);

            ag.dom.displayModalLoading();

            var payload = {};
            this.extendPayloadWithAdditionalFields(payload);
            return this.net.getJson(createUrl(this.createGetActionName, this.controller), payload).done(function (response) {
                _this.setEditingItem(response.data, response.lookups);
                _this.showDialog(true);
            }).fail(function () {
                ag.dom.hideModalLoading();
            });
        };

        GridEditorViewModel.prototype.saveItem = function (data, event) {
            var m = this.mode();
            if (m === 2 /* ConfirmDelete */)
                return this.deleteRequest();

            if (m === 1 /* New */)
                return this.createRequest();

            if (m === 0 /* Edit */)
                return this.saveRequest();
        };

        GridEditorViewModel.prototype.cancel = function () {
            if (!this.closeDialogOnDeleteCancel() && this.mode() === 2 /* ConfirmDelete */) {
                this.mode(0 /* Edit */);
                this.isEditorReadOnly(false);
                return;
            }

            this.showDialog(false);
            this.isEditorReadOnly(false);
        };

        GridEditorViewModel.prototype.copyItem = function (item, displayModalLoading) {
            var _this = this;
            if (typeof displayModalLoading === "undefined") { displayModalLoading = true; }
            this.mode(1 /* New */);

            if (displayModalLoading)
                ag.dom.displayModalLoading();

            var params = ko.mapping.toJS(this.selected.item());
            this.extendPayloadWithAdditionalFields(params);
            return this.net.getJson(createUrl(this.copyGetActionName, this.controller), params).done(function (response) {
                _this.setEditingItem(response.data, response.lookups);
                _this.showDialog(true);
            }).fail(function () {
                ag.dom.hideModalLoading();
            });
        };

        GridEditorViewModel.prototype.deleteItem = function (item, displayModalLoading) {
            var _this = this;
            if (typeof displayModalLoading === "undefined") { displayModalLoading = true; }
            if (item == null) {
                var promise = $.Deferred();
                return promise.reject(item);
            }

            return this.editItem(ko.mapping.toJS(this.selected.item()), displayModalLoading).done(function () {
                //this.showDialog(true);
                _this.isEditorReadOnly(true);
                _this.mode(2 /* ConfirmDelete */);
                _this.closeDialogOnDeleteCancel(displayModalLoading);
            });
        };

        GridEditorViewModel.prototype.revertChanges = function () {
            if (this.unsavedChanges()) {
                this.grid.refresh(true);
                this.unsavedChanges(false);
            }
        };

        GridEditorViewModel.prototype.setEditingItem = function (item, lookups) {
            // Dipose old item
            if (this.itemDependenciesHandle)
                this.itemDependenciesHandle.dispose();

            if (this.item())
                ag.disposeMappedMetaObservable(this.item());

            // Set new item and lookup
            if (lookups)
                ag.utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups);

            this.item(ag.mapFromJStoMetaObservable(item, this.isEditorReadOnly));
            ag.updateGrids(item, this.grid.grids);
            this.selectedItem(this.item());

            this.itemDependenciesHandle = this.dependencies ? ag.dependencies.init(this.item(), this.dependencies, this.options, this, false) : null;
        };

        GridEditorViewModel.prototype.deleteRequest = function () {
            var _this = this;
            return this.postItem(this.item(), this.deletePostActionName, this.closeDialogAndUpdate).done(function () {
                _this.selected.reset();
            });
        };

        GridEditorViewModel.prototype.saveRequest = function () {
            return this.postItem(this.item(), this.editPostActionName, this.closeDialogAndUpdate);
        };

        GridEditorViewModel.prototype.createRequest = function () {
            return this.postItem(this.item(), this.createPostActionName, this.closeDialogAndUpdate);
        };

        GridEditorViewModel.prototype.postItem = function (item, actionName, success) {
            var _this = this;
            return ag.utils.validateAndShowMessages(item).then(function () {
                var payload = { data: ko.mapping.toJS(item) };

                _this.extendPayloadWithAdditionalFields(payload);
                $.extend(payload, { options: _this.grid.getGridViewOptions() });

                return _this.net.postJson(createUrl(actionName, _this.controller), function () {
                    return payload;
                }).done(function (response) {
                    if (_.isUndefined(response.data)) {
                        var responseError = $.parseJSON(response.responseText);
                        ag.messages.error(responseError["errors"]);
                        return;
                    }
                    success.call(_this, response);
                });
            });
        };

        GridEditorViewModel.prototype.closeDialogAndUpdate = function (result) {
            this.grid.loadGridData(result);

            this.unsavedChanges(true);
            var proxy = this.options.dependencyProxy;
            if (proxy) {
                if (proxy()) {
                    proxy(null);
                } else {
                    proxy.valueHasMutated();
                }
            }

            if (this.afterUpdate)
                this.afterUpdate(result);

            this.showDialog(false);
            this.isEditorReadOnly(false);

            if (result && result.message)
                ag.messages.show(result.message, result.messageType);
        };

        GridEditorViewModel.prototype.extendPayloadWithAdditionalFields = function (payload) {
            var _this = this;
            var additionalPayload = {};

            if (this.options.additionalFields && this.options.additionalFields.length > 0) {
                var additionalFields = this.options.additionalFields.split(",");

                _.each(additionalFields, function (field) {
                    ag.setProperty(additionalPayload, field, ag.getProperty(_this.viewModel, field));
                });

                $.extend(payload, ko.mapping.toJS(additionalPayload));
            } else if (this.options.includeModel) {
                $.extend(payload, ko.mapping.toJS(this.viewModel));
            }
        };

        GridEditorViewModel.prototype.reset = function () {
            this.unsavedChanges(false);
        };
        return GridEditorViewModel;
    })();
    ag.GridEditorViewModel = GridEditorViewModel;
})(ag || (ag = {}));
