var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var HierarchicalViewModel = (function (_super) {
        __extends(HierarchicalViewModel, _super);
        function HierarchicalViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            this.unapprovedPrefix = "unapproved-";
            this.isGroup = ko.observable(false);

            this.groupKey = options.groupKey;
            this.hierarchicalGroupName = options.hierarchicalGroupName;
            this.diagramViewModel = new ag.HierarchicalDiagramViewModel(this);

            this.isUnapprovedApplication = ko.computed(function () {
                return window.location.pathname.indexOf(_this.unapprovedPrefix) != -1;
            });
        }
        HierarchicalViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            if (this.options.hasHierarcicalDiagram) {
                this.actions.getHierarchicalDiagram["createCustomPayload"] = function () {
                    var getLastParent = function () {
                        var last = _.last(_this.breadcrumb.parents());
                        return { name: last.name() };
                    };

                    if (_this.isNewItem())
                        return getLastParent();

                    if (_this.isGroup())
                        return { name: _this.editingItem.name() };
                    else
                        return getLastParent();
                };
            }
        };

        HierarchicalViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.membersGrid = this.grids.members;
            if (this.membersGrid) {
                this.membersGrid.getCellLinks = function (context) {
                    if (ko.unwrap(context.$data.key) === "name")
                        return ['<a href="#" data-bind="click: $root.navigateToMember.bind($root), attr: { href: $root.navigateToMemberUrl($data) }"></a>'];

                    return [];
                };
            }

            this.canSaveItem = ko.computed(function () {
                return !(_this.isUnapproved && _this.isNewItem()) && !_this.isDeletedItem() && !ko.unwrap(_this.isRoot);
            });

            // calculate if there is a pending changes children
            this.hasPendingChangesInChildren = ko.computed(function () {
                if (!_this.membersGrid)
                    return false;

                if (!_this.membersGrid.items)
                    return false;

                var t = _.find(_this.membersGrid.items(), function (item) {
                    return item.hasPendingChanges;
                });

                return t != undefined;
            });

            this.breadcrumbViewModel = new ag.BreadcrumbViewModel(this.breadcrumb);
        };

        HierarchicalViewModel.prototype.createMenuCommands = function () {
            var _this = this;
            _super.prototype.createMenuCommands.call(this);

            this.menuCommands.saveCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.saveItem().then(function () {
                        _this.hidePageMenuItemSave();
                    }).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && !_this.isNewItemNeedingApproval();
                }
            });

            this.menuCommands.saveGroupCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.saveItem().always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && !_this.isNewItemNeedingApproval();
                },
                isVisible: function () {
                    return _this.breadcrumb.currentItemIsGroup() && !ko.unwrap(_this.isRoot);
                }
            });

            // Override the copy command execute
            this.menuCommands.copyCommand.execute = function (complete) {
                // Set the copy mode
                _this.copyMode = 0 /* Item */;
                _this.copyItem().always(complete);
            };

            this.menuCommands.copyGroupCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.copyMode = 1 /* Group */;
                    _this.copyItem().always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canCopyItem();
                },
                isVisible: function () {
                    return _this.breadcrumb.currentItemIsGroup() && !_this.isUnapproved && !ko.unwrap(_this.isRoot);
                }
            });

            this.menuCommands.saveAndNewCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.saveItem(true).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting;
                },
                isVisible: function () {
                    return !_this.isGroup();
                }
            });

            this.editingItem.groupTransactor.subscribe(function () {
                _this.isGroup(_this.editingItem.groupTransactor() == 1 /* Group */);

                if (_this.isGroup())
                    _this.isSaveAndNewMode(false);
            });
        };

        HierarchicalViewModel.prototype.copyItemVisible = function () {
            return !this.breadcrumb.currentItemIsGroup();
        };

        HierarchicalViewModel.prototype.navigateToParent = function () {
            // Due to there are few applications have two different key binding modes between item and group
            // We can not use navigateToItem generically determine which key navigation method to follow
            // this.navigateToItem((<any>_.last(ag.viewModel.breadcrumb.parents())).name());
            // Temp until two key binding mode resolved.
            ag.dom.hierarchicalNavigateToParent();
        };

        HierarchicalViewModel.prototype.navigateToMemberUrl = function (data) {
            var navKey = this.getEditingItemNavKey(data, this.editPropertyFields, this.editProperty);
            return this.getApprovedServiceUrl() + '?' + this.getKeyQueryString(navKey);
        };

        HierarchicalViewModel.prototype.navigateToGroupUrl = function (viewModel) {
            var groupKey = this.groupKeyValue(viewModel);
            _.each(groupKey, function (value, key) {
                if (value == null)
                    delete groupKey[key];
            });
            return this.getApprovedServiceUrl() + '?' + this.getKeyQueryString(groupKey);
        };

        HierarchicalViewModel.prototype.getApprovedServiceUrl = function () {
            if (ag.serviceUrl.indexOf(this.unapprovedPrefix) != -1)
                return ag.serviceUrl.replace(this.unapprovedPrefix, "");

            return ag.serviceUrl;
        };

        HierarchicalViewModel.prototype.getKeyQueryString = function (key) {
            return _.isString(key) ? "edit=" + key : _.map(key, function (v, k) {
                return k + '=' + v;
            }).join('&');
        };

        HierarchicalViewModel.prototype.navigateToMember = function (data, event) {
            if (ag.dom.isPop(event)) {
                ag.dom.encodeLinkHref(event);
                return true;
            }

            var key = this.translateEditingItemKeyToListKey(this.getModelSubset(data, this.editProperty));
            this.editItem(key);
        };

        HierarchicalViewModel.prototype.loadItem = function (result, isNewItem) {
            var deffered = _super.prototype.loadItem.call(this, result, isNewItem);
            this.updateBreadcrumb(result);
            this.hidePageMenuItemSave();

            return deffered;
        };

        HierarchicalViewModel.prototype.updateBreadcrumb = function (result) {
            if (result.breadcrumb) {
                ko.mapping.fromJS(result.breadcrumb, {}, this.breadcrumb);
                var lastParent = _.last(this.breadcrumb.parents());
                var parent = !lastParent ? undefined : lastParent.name();
                this.breadcrumbViewModel.reset(parent);
            }
        };

        HierarchicalViewModel.prototype.editGroupFromBreadcrumb = function (viewModel, _, e) {
            if (ag.dom.isPop(e))
                return true;

            if (this.isUnapprovedApplication())
                return true;

            this.navigateToItem(this.groupKeyValue(viewModel));
        };

        HierarchicalViewModel.prototype.groupKeyValue = function (viewModel) {
            var id = ko.unwrap(viewModel.id), keyValue = id, groupKey = this.groupKey;

            if (groupKey) {
                keyValue = { edit: true };
                keyValue[groupKey] = id;

                _.each(this.editPropertyFields, function (f) {
                    if (f != groupKey) {
                        keyValue[f] = null;
                    }
                });
            }

            return keyValue;
        };

        HierarchicalViewModel.prototype.moveItem = function (items, event, model) {
            var location = this.breadcrumbViewModel.getNewLocation(items, event, model);
            if (!location)
                return;
            this.editingItem.parentGroup(location.isRoot ? 'None' : location.name);
        };

        HierarchicalViewModel.prototype.createItemGroup = function () {
            this.cacheCurrentParentKeyValue();

            this.beforeSendCreateItemRequest();

            // Create Item
            return this.createGroupRequest();
        };

        HierarchicalViewModel.prototype.updateCreateItemParams = function (params) {
            this.updateParamsWithParentData(params, false);
            this.breadcrumb.currentItem.name("");
        };

        HierarchicalViewModel.prototype.updateParamsWithParentData = function (params, isGroup) {
            if (!this.breadcrumb)
                return;

            params = $.extend(params, { parentGroup: this.currentParentKeyValue });
            params.isGroup = isGroup;
        };

        HierarchicalViewModel.prototype.itemRequest = function (action, params, isNewItem, byPOST) {
            var _this = this;
            if (typeof byPOST === "undefined") { byPOST = false; }
            return _super.prototype.itemRequest.call(this, action, params, isNewItem, byPOST).done(function () {
                if (isNewItem && _.has(params, "isGroup"))
                    _this.resetPageTitleAndBreadcrumbCurrentItem(params.isGroup);

                _this.currentParentKeyValue = "";
            });
        };

        HierarchicalViewModel.prototype.createGroupRequest = function () {
            var params = {};
            this.updateParamsWithParentData(params, true);

            return this.itemRequest("create", params, true);
        };

        HierarchicalViewModel.prototype.createCopyRequestParams = function () {
            var params = {};
            this.updateParamsWithParentData(params, this.copyMode == 1 /* Group */);

            return $.extend({}, ko.mapping.toJS(this.editingItem), params);
        };

        HierarchicalViewModel.prototype.copyItem = function () {
            this.cacheCurrentParentKeyValue(true);
            return _super.prototype.copyItem.call(this);
        };

        HierarchicalViewModel.prototype.resetPageTitleAndBreadcrumbCurrentItem = function (isGroup) {
            var title = "{0} {1}".format(ag.strings.newLabel, isGroup ? this.hierarchicalGroupName : this.applicationTitle);
            this.breadcrumb.currentItem.name(title);
        };

        HierarchicalViewModel.prototype.createItem = function (refreshGrid) {
            if (typeof refreshGrid === "undefined") { refreshGrid = false; }
            this.cacheCurrentParentKeyValue();
            return _super.prototype.createItem.call(this, refreshGrid);
        };

        HierarchicalViewModel.prototype.requestNewItem = function () {
            if (this.isGroup())
                return this.createItemGroup();

            return this.createItem();
        };

        HierarchicalViewModel.prototype.cacheCurrentParentKeyValue = function (fromCopy, prefix) {
            if (typeof fromCopy === "undefined") { fromCopy = false; }
            if (typeof prefix === "undefined") { prefix = "name"; }
            if (fromCopy)
                this.currentParentKeyValue = this.editingItem.parentGroup();
            else if (this.isGroup() && !this.isNewItem())
                this.currentParentKeyValue = ko.unwrap(this.breadcrumb.currentItem[prefix]);
            else
                this.currentParentKeyValue = this.getLastParentName(ko.unwrap(this.breadcrumb.parents), prefix);

            // Reset currnet parent to empty if in the contents folder
            if (this.currentParentKeyValue == "All" || this.currentParentKeyValue == "Contents")
                this.currentParentKeyValue = "";
        };

        HierarchicalViewModel.prototype.getLastParentName = function (parents, prefix) {
            if (typeof prefix === "undefined") { prefix = "name"; }
            var length = parents.length, temp = parents[length - 1];

            return temp ? temp[prefix]() : "";
        };

        HierarchicalViewModel.prototype.hidePageMenuItemSave = function () {
            if (this.breadcrumb.currentItemIsGroup())
                $("#pageMenuItemSave").hide();
        };
        return HierarchicalViewModel;
    })(ag.StaticDataViewModel);
    ag.HierarchicalViewModel = HierarchicalViewModel;

    var InstrumentHierarchicalViewModel = (function (_super) {
        __extends(InstrumentHierarchicalViewModel, _super);
        function InstrumentHierarchicalViewModel() {
            _super.apply(this, arguments);
        }
        InstrumentHierarchicalViewModel.prototype.afterKeyBindingChangeCallbackFunction = function () {
            if (!this.isNewItem())
                return;

            if (!_.isEmpty(ko.unwrap(this.editingItem.description)))
                return;

            this.editingItem.description(ko.unwrap(this.editingItem.name));
        };
        return InstrumentHierarchicalViewModel;
    })(HierarchicalViewModel);
    ag.InstrumentHierarchicalViewModel = InstrumentHierarchicalViewModel;
})(ag || (ag = {}));
