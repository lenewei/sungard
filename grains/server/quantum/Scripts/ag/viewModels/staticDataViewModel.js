var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var StaticDataViewModel = (function (_super) {
        __extends(StaticDataViewModel, _super);
        function StaticDataViewModel() {
            _super.apply(this, arguments);
            var _this = this;
            this.editParamDelegator = function () {
                return ko.mapping.toJS(_this.editingItem);
            };
            this.editWithRenameParamDelegator = function () {
                return [ko.mapping.toJS(_this.editingItem), _this.originalKeyStore];
            };
            this.canRenameKeyfields = false;
            this.hasRootEditor = true;
        }
        StaticDataViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.isRoot = ko.computed(function () {
                var isNewItem = ko.unwrap(_this.isNewItem());
                if (isNewItem)
                    return false;

                var breadcrumb = _this.breadcrumb;

                if (!breadcrumb)
                    return false;

                if (breadcrumb.parents && ko.unwrap(breadcrumb.parents).length > 0)
                    return false;

                return true;
            });
        };

        StaticDataViewModel.prototype.copyItem = function () {
            var _this = this;
            return _super.prototype.copyItem.call(this).always(function () {
                _this.editingItem.currentMode && _this.editingItem.currentMode(StaticDataViewModel.EditMode.Insert);
            });
        };

        StaticDataViewModel.prototype.copyAndApply = function () {
            var _this = this;
            return _super.prototype.copyAndApply.call(this).always(function () {
                _this.editingItem.currentMode && _this.editingItem.currentMode(StaticDataViewModel.EditMode.Insert);
            });
        };

        StaticDataViewModel.prototype.loadItem = function (result, isNewItem) {
            var _this = this;
            return _super.prototype.loadItem.call(this, result, isNewItem).always(function () {
                if (_.has(_this.editingItem, "canRename")) {
                    _this.canRenameKeyfields = ko.unwrap(_this.editingItem.canRename);
                }
            });
        };

        StaticDataViewModel.prototype.navigateToEmptyItem = function (fromKeyFieldChange) {
            if (typeof fromKeyFieldChange === "undefined") { fromKeyFieldChange = false; }
            if (fromKeyFieldChange && this.canRenameKeyfields) {
                // If the key field changed and this app which allow rename key fields
                // we don't navigate into new status
            } else {
                // navigate into new status
                this.navigateToItem(this.navigateGetParams());
            }
        };

        StaticDataViewModel.prototype.saveItem = function (clearAfter) {
            var _this = this;
            if (typeof clearAfter === "undefined") { clearAfter = false; }
            return ag.utils.validateAndShowMessages(this.editingItem).then(function () {
                // Post to Create or Edit or EditRename
                var action = _this.isNewItem() ? "create" : _this.getEditAction(), params = (_this.isNewItem() || !_this.canRenameKeyfields) ? _this.editParamDelegator : _this.editWithRenameParamDelegator;

                _this.isSaveAndNewMode(clearAfter);

                return _this.net.validateUnmapAndPostJson(action, params).done(function (result) {
                    _this.saveItemDone(result, clearAfter);
                }).fail(function (reasons) {
                    _this.saveItemFail(reasons);
                });
            });
        };

        StaticDataViewModel.prototype.getEditAction = function () {
            if (this.canRenameKeyfields)
                return this.editAction + "WithRename";
            else
                return this.editAction;
        };
        StaticDataViewModel.EditMode = {
            Insert: 0,
            Update: 1
        };
        return StaticDataViewModel;
    })(ag.AppViewModel);
    ag.StaticDataViewModel = StaticDataViewModel;
})(ag || (ag = {}));
