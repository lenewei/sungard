/// <reference path="../simpleViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var FileExplorerViewModel = (function (_super) {
        __extends(FileExplorerViewModel, _super);
        function FileExplorerViewModel() {
            _super.apply(this, arguments);
        }
        FileExplorerViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);
        };
        return FileExplorerViewModel;
    })(ag.HierarchicalViewModel);
    ag.FileExplorerViewModel = FileExplorerViewModel;
})(ag || (ag = {}));
