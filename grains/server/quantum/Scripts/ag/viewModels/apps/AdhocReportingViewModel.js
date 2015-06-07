/// <reference path="../simpleViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var AdhocReportingViewModel = (function (_super) {
        __extends(AdhocReportingViewModel, _super);
        function AdhocReportingViewModel() {
            _super.apply(this, arguments);
            this.query = ko.observable();
            this.adhocViewerLoading = ko.observable(false);
        }
        AdhocReportingViewModel.prototype.init = function (itemModel, parent) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);
            this.parent = parent;

            this.updatePageTitle("");

            this.adhocViewerLoading(this.editingItem.displayAdhoc());

            this.adhocUrl = ko.computed(function () {
                return _this.editingItem.displayAdhoc() && _this.editingItem.reportUrl() ? "{0}/{1}".format(_this.editingItem.reportUrl(), _this.query()) : null;
            }).extend({ notify: 'always' });

            this.isReport = ko.computed(function () {
                return ko.unwrap(_this.editingItem.currentQuery) ? !!ko.unwrap(_this.editingItem.reportId) : false;
            });

            if (itemModel.reportParameters) {
                this.query('?' + $.param(ko.unwrap(itemModel.reportParameters)));
            }
            ;

            window.addEventListener("message", this.receiveMessage.bind(this), false);

            $(document.body).toggleClass("hide-container", !this.editingItem.displayAdhoc());
        };

        AdhocReportingViewModel.prototype.adhocLoaded = function () {
            this.adhocViewerLoading(false);
        };

        AdhocReportingViewModel.prototype.adhocError = function (reasons) {
            this.adhocViewerLoading(false);
        };

        AdhocReportingViewModel.prototype.setQuery = function (value) {
            this.query(value);
        };

        AdhocReportingViewModel.prototype.currentReport = function () {
            return ko.unwrap(this.editingItem.reportId);
        };

        AdhocReportingViewModel.prototype.resetQuery = function () {
            if (ko.unwrap(this.query)) {
                this.query(null);
            } else {
                this.query.valueHasMutated();
            }
        };

        AdhocReportingViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            var modifyInvoke = function (action) {
                if (action) {
                    action.invoke = function (app, event, complete) {
                        _this.resetQuery();
                        complete();
                        return complete;
                    };
                }
            };
            modifyInvoke(this.actions.reportManagement);
        };

        AdhocReportingViewModel.prototype.receiveMessage = function (event) {
            if (event.data && window.location.search != event.data) {
                var data = $.isPlainObject(event.data) ? event.data : $.parseJSON(event.data);
                if (!data.query)
                    return;

                var editingItem = this.editingItem;
                editingItem.reportName(data.name);
                editingItem.reportId(data.id);
                editingItem.reportTitle(data.title);

                if (this.editingItem.showQueryString()) {
                    History.replaceState('', '', data.query);
                } else {
                    this.updatePageTitle(this.editingItem.reportName());
                }

                editingItem.currentQuery(data.query);
            }
        };

        AdhocReportingViewModel.prototype.updatePageTitle = function (title) {
            var viewModel = this.parent || this;
            viewModel.pageTitle.removeAll();
            viewModel.pageTitle.push({ keyProperty: title });
        };

        AdhocReportingViewModel.prototype.getParameterByName = function (name, querystring) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(querystring);
            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        };
        return AdhocReportingViewModel;
    })(ag.SimpleViewModel);
    ag.AdhocReportingViewModel = AdhocReportingViewModel;
})(ag || (ag = {}));
