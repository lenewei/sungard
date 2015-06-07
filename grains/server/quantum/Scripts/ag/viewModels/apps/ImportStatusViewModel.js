/// <reference path="../simpleViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var ImportStatusViewModel = (function (_super) {
        __extends(ImportStatusViewModel, _super);
        function ImportStatusViewModel() {
            _super.apply(this, arguments);
        }
        ImportStatusViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.pageTitle([{ keyProperty: ag.utils.documentTitle() }]);

            this.pendingFilesGridViewModel = this.grids.pendingFiles;
            this.processingFilesGridViewModel = this.grids.processingFiles;
            this.errorFilesGridViewModel = this.grids.errorFiles;
            this.processedFilesGridViewModel = this.grids.processedFiles;

            this.editingItem.summaryCounts = {};

            this.editingItem.summaryCounts.pendingCount = ko.computed(function () {
                return _this.pendingFilesGridViewModel.pager.totalItems();
            }, this);

            this.editingItem.summaryCounts.processingCount = ko.computed(function () {
                return _this.processingFilesGridViewModel.pager.totalItems();
            }, this);

            this.editingItem.summaryCounts.errorCount = ko.computed(function () {
                return _this.errorFilesGridViewModel.pager.totalItems();
            }, this);

            this.editingItem.summaryCounts.processedCount = ko.computed(function () {
                return _this.processedFilesGridViewModel.pager.totalItems();
            }, this);

            this.errorFilesGridViewModel.__updatePendingFileGrid = this.updatePendingFileGrid.bind(this);
            this.processedFilesGridViewModel.__updatePendingFileGrid = this.updatePendingFileGrid.bind(this);
        };

        ImportStatusViewModel.prototype.updatePendingFileGrid = function () {
            this.pendingFilesGridViewModel.refresh();
        };
        return ImportStatusViewModel;
    })(ag.SimpleViewModel);
    ag.ImportStatusViewModel = ImportStatusViewModel;
})(ag || (ag = {}));
