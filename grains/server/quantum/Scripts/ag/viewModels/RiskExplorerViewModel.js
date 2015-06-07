/// <reference path="../helpers/dom.ts" />
/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../helpers/lookups.ts" />
/// <reference path="../models/messagesViewModel.ts" />
/// <reference path="sorter.ts" />
/// <reference path="groupEditor.ts" />
/// <reference path="gridViewModel.ts" />
var ag;
(function (ag) {
    "use strict";

    var RiskExplorerGridHelper = (function () {
        function RiskExplorerGridHelper(selectableType) {
            if (typeof selectableType === "undefined") { selectableType = "Query"; }
            var _this = this;
            this.selectableType = selectableType;
            this.isSelected = ko.observable(false);
            ko.utils.registerEventHandler($("#queryExplorerGridTable tbody"), "click", function (event) {
                var clickedRow, $target = $(event.target);

                if ($target.is("tr"))
                    clickedRow = $target;
                else
                    clickedRow = $target.closest("tr");

                _this.selectRow(clickedRow);
            });
        }
        RiskExplorerGridHelper.prototype.selectRow = function (tr) {
            if (!tr)
                return;

            if (this.selected && tr[0] == this.selected[0]) {
                this.deselectRow();
            } else {
                this.deselectRow();
                if (!this.isSelectable(tr))
                    return;
                this.setSelectRow(tr);
            }
        };

        RiskExplorerGridHelper.prototype.deselectRow = function () {
            if (!this.selected)
                return;

            this.selected.removeClass("selected");
            this.setSelectRow(undefined);
        };

        RiskExplorerGridHelper.prototype.isSelectable = function (tr) {
            if (tr && tr[0] !== undefined)
                return ko.unwrap(ko.dataFor(tr[0]).itemType) == this.selectableType;
            return false;
        };

        RiskExplorerGridHelper.prototype.setSelectRow = function (tr) {
            this.selected = tr;
            this.isSelected(tr !== undefined);

            if (tr)
                tr.addClass("selected");
        };

        RiskExplorerGridHelper.prototype.selectedRowViewModel = function () {
            return ko.dataFor(this.selected[0]);
        };
        return RiskExplorerGridHelper;
    })();
    ag.RiskExplorerGridHelper = RiskExplorerGridHelper;

    var RiskExplorerViewModel = (function () {
        function RiskExplorerViewModel(options) {
            var _this = this;
            this.options = options;
            this.net = new ag.utils.Network();
            this.items = ko.observableArray();
            this.currentId = 0;
            this.breadcrumb = ko.observable();
            this.initialiseFinish = false;
            this.isGroup = ko.observable(false);
            this.isNewItem = ko.observable(false);
            this.gridHelperIsSelected = ko.observable(false);
            this.hasErrors = ko.observable(false);
            options = this.getDefaultOptions(options);
            options.serviceUrl = ag.utils.normalizeUrl(options.serviceUrl);

            this.folderURL = options.folderURL;
            this.queryURL = options.queryURL;
            this.itemKey = options.itemKey || "";
            this.currentId = options.currentId;
            this.grid = this.createGridViewModelForBrowse($.extend(options, { hasDependentColumns: true }));
            this.typeMetaDataUrl = options.typeMetaDataUrl;

            this.gridHelper = new RiskExplorerGridHelper("Query");
            this.gridHelperIsSelected = ko.observable(this.gridHelper.isSelected());

            this.isNewGroup = ko.computed(function () {
                return _this.group && _this.group.current && _this.group.current.id() === 0;
            }, this, { deferEvaluation: true });

            // You can not modify root folder.
            this.isGroupEditable = ko.computed(function () {
                // new group should always be editable
                if (ko.unwrap(_this.isNewGroup()))
                    return true;

                var breadcrumb = ko.unwrap(_this.breadcrumb);
                if (!_.has(breadcrumb, "parents"))
                    return false;

                var factor = _this.isSearchMode() ? -1 : 0;

                return breadcrumb.parents().length + factor > 0;
            }, this, { deferEvaluation: true });

            this.isSearchMode = ko.computed(function () {
                var breadcrumb = ko.unwrap(_this.breadcrumb);
                if (!breadcrumb || !_.has(breadcrumb, "currentItem"))
                    return false;

                return breadcrumb.currentItem.id() == 0;
            });

            // Actions commands
            this.newGroupCommandOptions = {
                canExecute: function () {
                    return !_this.isNewGroup();
                },
                execute: function () {
                    _this.newGroup();
                }
            };

            this.saveGroupCommandOptions = {
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.isGroupEditable();
                },
                execute: function (completed) {
                    _this.saveItem().always(completed);
                }
            };

            this.deleteGroupCommandOptions = {
                canExecute: function (isExecuting) {
                    return !isExecuting && !_this.isNewGroup() && _this.isGroupEditable();
                },
                execute: function (completed) {
                    _this.deleteItem().always(completed);
                }
            };

            this.exportCommandOptions = {
                canExecute: function () {
                    return !_this.isNewGroup() && _this.isGroupEditable();
                },
                execute: function () {
                    _this.exportView();
                }
            };

            this.runAllCommandOptions = {
                canExecute: function () {
                    return true;
                },
                execute: function () {
                    _this.runAll();
                }
            };

            this.runCommandOptions = {
                canExecute: function () {
                    return _this.gridHelper.isSelected();
                },
                execute: function () {
                    window.open(_this.queryURL.format(_this.gridHelper.selectedRowViewModel().id) + "&autorun=true");
                }
            };

            this.group = new ag.GroupEditorViewModel(options);
            this.editingGroup = null;

            ag.viewModel = this;

            this.breadcrumbViewModel = new ag.BreadcrumbViewModel(this.breadcrumb);
        }
        RiskExplorerViewModel.prototype.init = function (result) {
            var _this = this;
            this.explorerGridViewDataResponseHandler(result);

            // Initialise group commands (that rely on data structure)
            this.deleteGroupCommand = ko.asyncCommand(this.deleteGroupCommandOptions);
            this.saveGroupCommand = ko.asyncCommand(this.saveGroupCommandOptions);
            this.newGroupCommand = ko.asyncCommand(this.newGroupCommandOptions);
            this.exportCommand = ko.asyncCommand(this.exportCommandOptions);
            this.runAllCommand = ko.asyncCommand(this.runAllCommandOptions);
            this.runCommand = ko.asyncCommand(this.runCommandOptions);

            this.initNav();
            this.initialiseFinish = true;

            this.isRoot = ko.computed(function () {
                var breadcrumb = ko.unwrap(_this.breadcrumb);

                if (!breadcrumb)
                    return false;

                if (breadcrumb.parents && ko.unwrap(breadcrumb.parents).length > 0)
                    return false;

                return true;
            });
        };

        RiskExplorerViewModel.prototype.loadGridData = function (result) {
            this.grid.loadGridData(result, true);
        };

        // Explort content
        RiskExplorerViewModel.prototype.exportView = function () {
            ag.downloadInvoker.invoke(ag.serviceUrl + "/exportContent", ko.mapping.toJS(this.editingGroup));
        };

        RiskExplorerViewModel.prototype.getModel = function () {
            return this.editingGroup;
        };

        RiskExplorerViewModel.prototype.getCurrentItemName = function () {
            if (this.breadcrumb())
                return this.breadcrumb().currentItem.name();
        };

        // explorer call back
        RiskExplorerViewModel.prototype.getParentContext = function () {
            return { parentId: this.currentId };
        };

        // select item
        RiskExplorerViewModel.prototype.itemSelected = function (params) {
            var temp = params[0];
            if (temp.itemType === "Query")
                ag.navigate(this.queryURL.format(temp.id));
            else
                this.nav.navigate(temp);
        };

        // navigate to new query item
        RiskExplorerViewModel.prototype.navigateToNewItem = function (type) {
            var link = this.queryURL.replace('query={0}', '') + 'parentid={0}&querytype={1}'.format(this.currentId, type);
            ag.navigate(link);
        };

        // server side handlers
        RiskExplorerViewModel.prototype.addSelectedContentToGroup = function (selected) {
            var _this = this;
            $.each(selected, function (index, value) {
                value.parentId = _this.currentId;
                value.name = value.getDisplayName();
            });

            return this.group.addSelectedContentToGroup(selected).done(function (result) {
                _this.resultHandler(result, ag.strings.folderUpd);
            });
        };

        RiskExplorerViewModel.prototype.moveToGroup = function (selected) {
            var _this = this;
            $.each(selected, function (index, value) {
                value.parentId = _this.currentId;
            });

            return this.group.move(selected).done(function (result) {
                _this.resultHandler(result, ag.strings.folderUpd);
            });
        };

        RiskExplorerViewModel.prototype.newGroup = function () {
            var _this = this;
            // Group mode
            this.isGroup(true);

            // If on a new group return the parent Id, otherwise return the id of the current editing group
            return this.group.create(this.editingGroup.id()).done(function (result) {
                _this.resultHandler(result);
            });
        };

        RiskExplorerViewModel.prototype.deleteItem = function () {
            var _this = this;
            return this.group.remove(ko.mapping.toJS(this.editingGroup)).done(function (result) {
                _this.resultHandler(result, ag.strings.folderDel);
            });
        };

        RiskExplorerViewModel.prototype.saveItem = function () {
            var _this = this;
            return ag.utils.validateAndShowMessages(this.editingGroup).then(function () {
                return _this.group.save(ko.mapping.toJS(_this.editingGroup), _this.isNewGroup()).done(function (result) {
                    _this.resultHandler(result, ag.strings.folderSaved);
                });
            });
        };

        RiskExplorerViewModel.prototype.editGroupFromBreadcrumb = function (viewModel) {
            var id = viewModel[this.itemKey](), params = { id: id };

            // if the breadcrumb current item id == 0, means it's under search mode
            // so we just need to clear the search text, it will simply navigate us
            // to the current item
            if (this.isSearchMode() && this.nav.current().params.id == id)
                this.grid.search.clear();
            else
                this.nav.navigate(params);
        };

        RiskExplorerViewModel.prototype.editItem = function (itemViewModel, anchorTarget, event) {
            if (ag.dom.isPop(event))
                return true;

            var id = $(event.target).data("id");
            if (id) {
                if (this.nav.current().params.id == id)
                    this.grid.search.clear();

                this.nav.navigate({ id: id });
                return false;
            }

            if (this.navigateToWorksheet(itemViewModel))
                return false;

            if (itemViewModel[this.itemKey])
                this.nav.navigate({ id: itemViewModel[this.itemKey] });

            // Important to do this and stop event propagation
            return false;
        };

        RiskExplorerViewModel.prototype.runAll = function () {
            var _this = this;
            this.net.postJson("runAll", { id: this.currentId || 0 }).done(function (result) {
                _this.resultHandler(result);
            });
        };

        RiskExplorerViewModel.prototype.iconFromType = function (viewModel) {
            // We are basing icons on the "type" property of the item
            var iconType = viewModel.itemType;

            if (iconType === "Query")
                return "";
            else if (iconType === "Folder")
                return "icon-folder-close";
            else
                return "";
        };

        RiskExplorerViewModel.prototype.navigateToWorksheet = function (viewModel) {
            // In case the row was clicked and is worksheet (a tag click will do this anyway)
            var isWorksheet = viewModel.itemType === "Query";
            if (isWorksheet)
                ag.navigate(this.queryURL.format(viewModel.id));

            // Allow natural link navigation if a worksheet
            return isWorksheet;
        };

        RiskExplorerViewModel.prototype.formatter = function (cellValue, viewModel, elm, rowItem, columnName) {
            var html = cellValue, isQuery = rowItem.itemType === "Query", path = isQuery ? this.queryURL.format(rowItem.id) : this.folderURL.format(rowItem.id);

            switch (columnName) {
                case "name":
                    html = "<a href=\"{0}\">{1}</a>".format(path, cellValue);
                    break;
                case "lastRunTime":
                    if (cellValue)
                        html = "<a {0} href=\"{1}&report={2}\">{3}</a>".format("data-bind=\"timeago: '{0}'\"".format(cellValue), path, rowItem.reportId, cellValue);
                    break;
                case "path":
                    html = "<a data-id=\"{0}\" href=\"{1}\">{2}</a>".format(rowItem.parentId, this.folderURL.format(rowItem.parentId), cellValue);
                    break;
            }

            return html;
        };

        RiskExplorerViewModel.prototype.initNav = function () {
            var _this = this;
            this.nav = new NavHistory({
                params: { id: 0 },
                onNavigate: function (navEntry) {
                    _this.gridHelper.setSelectRow(undefined);

                    var id = parseInt(navEntry.params.id);

                    if (!id && _this.isNewGroup()) {
                        _this.currentId = 0;
                        return;
                    } else if (id !== _this.currentId) {
                        _this.grid.search.clear();
                        _this.currentId = id;
                        _this.getItemsRequest(id);
                    }
                }
            }).initialize({ linkToUrl: true });
        };

        RiskExplorerViewModel.prototype.navigateToGroupUrl = function (viewModel) {
            return ag.serviceUrl + '?id=' + ko.unwrap(viewModel.id);
        };

        // Mixin for grid functionality
        RiskExplorerViewModel.prototype.createGridViewModelForBrowse = function (options) {
            var _this = this;
            var gridOptions = $.extend(options, {
                loadImmediately: true,
                pageSize: options.pageSize,
                noItemsMessage: ag.strings.noItems
            }), grid = new ag.GridViewModel(gridOptions);

            grid.getItems = function (params) {
                return _this.getItemsRequest($.extend({ id: _this.nav.current().params.id }, params));
            };

            return grid;
        };

        RiskExplorerViewModel.prototype.getDefaultOptions = function (options) {
            var result = options || {};
            result.serviceUrl = result.serviceUrl || ag.utils.getDefaultServiceUrl();
            result.itemKey = result.itemKey || "";
            return result;
        };

        RiskExplorerViewModel.prototype.getItemsRequest = function (id) {
            var _this = this;
            // prevent any ajax communications if page is still in loading mode
            if (!this.initialiseFinish)
                return $.Deferred().resolve();

            return this.net.getJson("list", $.isPlainObject(id) ? id : { id: id || 0 }).done(function (result) {
                _this.explorerGridViewDataResponseHandler(result);

                _this.setPageTitle();
            }).always(function () {
                _this.initialiseFinish = true;
            });
        };

        RiskExplorerViewModel.prototype.setPageTitle = function () {
            var title;
            if (this.isRoot()) {
                title = this.options.rootTitle;
            } else if (this.isSearchMode()) {
                var parents = this.breadcrumb().parents();
                if (parents.length > 1)
                    title = "{0} - {1} - {2}".format(this.getCurrentItemName(), _.last(this.breadcrumb().parents()).name(), this.options.applicationTitle);
                else
                    title = "{0} - {1}".format(this.getCurrentItemName(), this.options.applicationTitle);
            } else {
                title = "{0} - {1}".format(this.getCurrentItemName(), this.options.applicationTitle);
            }

            document.title = title;
        };

        RiskExplorerViewModel.prototype.explorerGridViewDataResponseHandler = function (explorerGridViewDataResponse) {
            if (explorerGridViewDataResponse.breadcrumbData)
                this.breadcrumb(ko.mapping.fromJS(explorerGridViewDataResponse.breadcrumbData));

            if (explorerGridViewDataResponse.explorerItemData) {
                this.group.init(explorerGridViewDataResponse.explorerItemData);
                this.editingGroup = this.group.current;
            }

            if (explorerGridViewDataResponse.data)
                this.grid.loadGridData(explorerGridViewDataResponse);
            else
                this.grid.reset();
        };

        RiskExplorerViewModel.prototype.resultHandler = function (result, successMessage) {
            if (typeof successMessage === "undefined") { successMessage = undefined; }
            if (result.hasErrors) {
                ag.messages.error(result.errors);
                return;
            }

            this.explorerGridViewDataResponseHandler(result);
            this.nav.navigate({ id: result.id == 0 ? null : result.id });

            if (successMessage)
                ag.messages.success(successMessage);
        };
        return RiskExplorerViewModel;
    })();
    ag.RiskExplorerViewModel = RiskExplorerViewModel;
})(ag || (ag = {}));
