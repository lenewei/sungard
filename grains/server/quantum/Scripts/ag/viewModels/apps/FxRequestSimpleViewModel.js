/// <reference path="../simpleViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var ag;
(function (ag) {
    var FxRequestSimpleViewModel = (function (_super) {
        __extends(FxRequestSimpleViewModel, _super);
        function FxRequestSimpleViewModel() {
            _super.apply(this, arguments);
        }
        FxRequestSimpleViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.updatePageTitle(this.editingItem.site());

            _.each(this.grids, function (grid) {
                var editor = grid.editor;
                if (editor) {
                    editor.afterUpdate = function (result) {
                        _this.refreshAllGrids();
                    };
                }

                grid['refreshAllGrids'] = function () {
                    _this.refreshAllGrids();
                };
            });
        };

        FxRequestSimpleViewModel.prototype.refreshAllGrids = function () {
            _.each(this.grids, function (grid) {
                grid.refresh();
            });
        };

        FxRequestSimpleViewModel.prototype.getNewRequestsForSite = function () {
            var _this = this;
            var params = { site: ko.unwrap(this.editingItem.site) };

            this.net.getJson("getnewrequestsfromsite", params).then(function (result) {
                // Map the result over the current item
                _this.updatingModel(true);
                _this.editingItem.failedCount(result.data.failedCount);
                _this.refreshAllGrids();
                _this.updatingModel(false);
            });
        };

        FxRequestSimpleViewModel.prototype.requestSelected = function (selections) {
            var _this = this;
            if (selections && $.isArray(selections) && selections.length > 0) {
                var selectedRequest = selections[0];
                var params = {
                    key: selectedRequest.key, name: selectedRequest.name, currency: selectedRequest.currency,
                    lowThreshold: selectedRequest.lowThreshold, highThreshold: selectedRequest.highThreshold, movement: selectedRequest.dateRange
                };

                this.net.getJson("getfxrequests", params).then(function (result) {
                    // Map the result over the current item
                    _this.updatingModel(true);

                    ko.mapping.fromJS(result.data, _this.editingItem);
                    _this.editingItem.site(selectedRequest.name);

                    // Refresh the all grids
                    _this.refreshAllGrids();
                    _this.updatingModel(false);
                    _this.updatePageTitle();
                });
            }
        };

        FxRequestSimpleViewModel.prototype.updatePageTitle = function (siteName) {
            var name = siteName || this.editingItem.site();
            this.pageTitle.removeAll();
            this.pageTitle.push({ keyProperty: name });
        };
        return FxRequestSimpleViewModel;
    })(ag.SimpleViewModel);
    ag.FxRequestSimpleViewModel = FxRequestSimpleViewModel;
})(ag || (ag = {}));
