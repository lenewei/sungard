/// <reference path="../simpleViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var HomeViewModel = (function (_super) {
        __extends(HomeViewModel, _super);
        function HomeViewModel() {
            _super.apply(this, arguments);
        }
        HomeViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);
            this.adhocViewModel = new ag.AdhocReportingViewModel(this.options);
            this.adhocViewModel.init(itemModel.landingPage, this);

            this.adhocUrl = ko.computed(function () {
                return _this.adhocViewModel.adhocUrl();
            }).extend({ notify: 'always' });

            this.adhocViewerLoading = ko.computed(function () {
                return _this.adhocViewModel.adhocViewerLoading();
            });
        };

        HomeViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            var createPayload = function (action) {
                if (action) {
                    action.createCustomPayload = function () {
                        return {
                            landingPage: _this.adhocViewModel.currentReport()
                        };
                    };
                }
            };
            createPayload(this.actions.removeLandingPage);
        };
        HomeViewModel.prototype.adhocLoaded = function () {
            this.adhocViewModel.adhocLoaded();
        };

        HomeViewModel.prototype.adhocError = function (reasons) {
            this.adhocViewModel.adhocError(reasons);
        };

        HomeViewModel.prototype.landingPageRequest = function (name) {
            var _this = this;
            return this.net.postJson('setLandingPage', { landingPage: name }).then(function (result) {
                var info = result.Data;
                if (info) {
                    _this.adhocViewModel.setQuery(info);
                }
            });
        };
        return HomeViewModel;
    })(ag.SimpleViewModel);
    ag.HomeViewModel = HomeViewModel;
})(ag || (ag = {}));
