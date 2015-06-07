var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var FXDealingViewModel = (function (_super) {
        __extends(FXDealingViewModel, _super);
        function FXDealingViewModel(options) {
            _super.call(this, options);
            this.options = options;
        }
        FXDealingViewModel.prototype.afterApplyBindings = function () {
            var cmd = this.actions.newExtendPreDeliver;
            var grid = ag.viewModel.actions.newExtendPreDeliver.grids.transactions;

            grid.editor.saveRequest = function () {
                var editor = grid.editor;
                return this.postItem(editor.item(), editor.editPostActionName, editor.closeDialogAndUpdate).done(function () {
                    cmd.invokeCommand.execute();
                });
            };
        };
        return FXDealingViewModel;
    })(ag.DealingViewModel);
    ag.FXDealingViewModel = FXDealingViewModel;
})(ag || (ag = {}));
