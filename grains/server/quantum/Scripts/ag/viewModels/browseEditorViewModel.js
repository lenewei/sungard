/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    var BrowseEditorViewModel = (function () {
        function BrowseEditorViewModel(options) {
            var _this = this;
            this.options = options;
            this.parentSelected = ko.observable(false);
            this.updatingModel = ko.observable(false);
            this.menuCommands = {};
            this.context = options.context;
            this.net = new ag.utils.Network(), this.action = options.action, this.controller = options.controller, this.createActionName = 'create' + options.parentName, this.copyActionName = 'copy' + options.parentName, this.deleteActionName = 'delete' + options.parentName, this.editingItem = options.editItem;
            this.dirtyFlag = new ko.DirtyFlag(this.editingItem, false);
            this.typeMetaDataUrl = options.typeMetaDataUrl;

            this.menuCommands.newParentCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.net.getJson(_this.createActionName, {}).done(function (response) {
                        _this.updateEditingItem(response.data, response.lookups);
                    }).always(complete);
                }
            });

            this.menuCommands.deleteParentConfirmationCommand = ko.command({
                execute: function () {
                    var action = _this.actions[_this.deleteActionName];
                    action.isLoaded(true);
                    action.showDialog(true);
                }
            });

            this.menuCommands.copyParentCommand = ko.asyncCommand({
                execute: function (complete) {
                    var params = ko.mapping.toJS(_this.editingItem);
                    _this.net.getJson(_this.copyActionName, params).done(function (response) {
                        _this.updateEditingItem(response.data, response.lookups);
                    }).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.parentSelected();
                }
            });

            this.menuCommands.rejectChangesCommand = ko.command({
                execute: function () {
                    _this.updateEditingItem(_this.cleanItem);
                },
                canExecute: function () {
                    return true;
                }
            });

            this.menuCommands.applyChangesCommand = ko.asyncCommand({
                execute: function (completed) {
                    _this.applyChanges().always(completed);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting;
                }
            });

            this.actions = {};
            this.actions[this.deleteActionName] = {
                showDialog: ko.observable(false),
                invokeCommand: ko.asyncCommand({
                    execute: function (parentViewModel, complete) {
                        _this.deleteItem().always(complete);
                    }
                }),
                isLoaded: ko.observable(false)
            };
        }
        BrowseEditorViewModel.prototype.deleteItem = function () {
            var _this = this;
            return this.net.postJson(this.deleteActionName, this.getPayload()).then(function (response) {
                _this.updateEditingItem(response.data, response.lookups);
                _this.actions[_this.deleteActionName].showDialog(false);
            });
        };

        BrowseEditorViewModel.prototype.createItem = function () {
            this.updateEditingItem(this.editingItem);
            this.parentSelected(false);
        };

        BrowseEditorViewModel.prototype.itemSelected = function (items) {
            var _this = this;
            var item = items;
            if (_.isArray(item) && item.length > 0)
                item = item[0];

            if (this.action) {
                this.loadFullItem(item, this.action).done(function (response) {
                    _this.updateItem(response.data, response.lookups);
                });
            } else {
                this.updateItem(item);
            }
        };

        BrowseEditorViewModel.prototype.updateItem = function (data, lookups) {
            this.updateEditingItem(data, lookups);
            if (this.context && this.options.afterItemSelectedFn) {
                ag.utils.callDescendantFunction(this.context, this.options.afterItemSelectedFn);
            }
        };

        BrowseEditorViewModel.prototype.getPayload = function () {
            var payload = {
                browseData: ko.mapping.toJS(this.editingItem)
            };

            if (this.options.additionalFields) {
                $.extend(payload, ag.utils.getAdditionalFieldsFromModel(this.options.additionalFields, this.context.editingItem));
            } else {
                payload.data = ko.mapping.toJS(this.context.editingItem || {});
            }

            return payload;
        };

        BrowseEditorViewModel.prototype.applyChanges = function () {
            var _this = this;
            return this.net.postJson(this.action, this.getPayload()).then(function (response) {
                _this.updateEditingItem(response.data);
            });
        };

        BrowseEditorViewModel.prototype.beforeBrowse = function (event) {
            var deferred = $.Deferred();
            if (!this.dirtyFlag().isDirty()) {
                deferred.resolve();
            } else {
                if (ag.utils.validate(this.editingItem).length > 0) {
                    deferred.reject();
                } else {
                    if (this.action) {
                        this.applyChanges().then(function () {
                            deferred.resolve();
                        }, function () {
                            deferred.reject();
                        });
                    } else {
                        deferred.resolve();
                    }
                }
            }
            return deferred.promise();
        };

        BrowseEditorViewModel.prototype.updateEditingItem = function (item, lookups) {
            this.context.updatingModel(true);
            this.cleanItem = item;
            ko.mapping.fromJS(item, this.editingItem);
            ag.utils.resetValidation(this.editingItem);
            ag.updateGrids(item, this.context.grids[this.options.parentName.toCamelCase()]);
            this.context.updatingModel(false);
            this.dirtyFlag().reset();
            this.parentSelected(true);
            if (lookups) {
                ag.utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups);
            }
        };

        BrowseEditorViewModel.prototype.loadFullItem = function (item, action) {
            return this.net.getJson(action, ko.mapping.toJS(item));
        };
        return BrowseEditorViewModel;
    })();
    ag.BrowseEditorViewModel = BrowseEditorViewModel;

    function createBrowseEditors(viewModel, browseEditors, model) {
        if (browseEditors) {
            _.each(browseEditors, function (browse, key) {
                viewModel.browseEditors[key] = new ag.BrowseEditorViewModel({
                    editItem: ag.getProperty(model, key),
                    afterItemSelectedFn: browse.afterItemSelectedFn,
                    context: viewModel,
                    action: browse.action,
                    controller: browse.controller,
                    parentName: browse.parentName,
                    additionalFields: browse.additionalFields,
                    typeMetaDataUrl: viewModel.typeMetaDataUrl
                });
            });
        }
    }
    ag.createBrowseEditors = createBrowseEditors;
    ;
})(ag || (ag = {}));
