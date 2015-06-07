/// <reference path="../staticDataViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var AccountingTypeViewModel = (function (_super) {
        __extends(AccountingTypeViewModel, _super);
        function AccountingTypeViewModel() {
            _super.apply(this, arguments);
        }
        return AccountingTypeViewModel;
    })(ag.StaticDataViewModel);
    ag.AccountingTypeViewModel = AccountingTypeViewModel;

    // TODO: this should be moved into its own file, but no installer changes currently possible.
    var GeneralLedgerAccountTemplatesViewModel = (function (_super) {
        __extends(GeneralLedgerAccountTemplatesViewModel, _super);
        function GeneralLedgerAccountTemplatesViewModel() {
            _super.apply(this, arguments);
        }
        GeneralLedgerAccountTemplatesViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            var canFn = function () {
                return _this.editingItem.parentType() != "Entity";
            };

            var editor = this.grids.accountTemplates.editor;
            editor.canCreateFn = canFn;
            editor.canDeleteFn = canFn;
            editor.canCopyFn = canFn;
            editor.canSaveFn = canFn;
        };
        return GeneralLedgerAccountTemplatesViewModel;
    })(ag.StaticDataViewModel);
    ag.GeneralLedgerAccountTemplatesViewModel = GeneralLedgerAccountTemplatesViewModel;
})(ag || (ag = {}));
