/// <reference path="../appViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var BankStatementViewModel = (function (_super) {
        __extends(BankStatementViewModel, _super);
        function BankStatementViewModel() {
            _super.apply(this, arguments);
        }
        BankStatementViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);

            this.updatePageTitle(ag.strings.bankStatement);

            // Get the Account from the querystring, if it has been
            // supplied show the browse
            var account = ag.utils.getQueryStringParameterByName("account", window.location.search);
            if (!ag.isNullUndefinedOrEmpty(account)) {
                this.grid.toggleList();
            }
        };

        BankStatementViewModel.prototype.updatePageTitle = function (title) {
            this.pageTitle.removeAll();
            this.pageTitle.push({ keyProperty: title });
        };
        return BankStatementViewModel;
    })(ag.AppViewModel);
    ag.BankStatementViewModel = BankStatementViewModel;
})(ag || (ag = {}));
