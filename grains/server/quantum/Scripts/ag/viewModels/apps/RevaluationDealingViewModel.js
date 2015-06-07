/// <reference path="../dealingViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var RevaluationDealingViewModel = (function (_super) {
        __extends(RevaluationDealingViewModel, _super);
        function RevaluationDealingViewModel() {
            _super.apply(this, arguments);
        }
        RevaluationDealingViewModel.prototype.link = function (me, domElement) {
            var _this = this;
            var element = $(domElement);
            var linkTo = element.attr("data-link-to");

            if (linkTo == "SubDealAnalysis") {
                me.actions.subDealAnalysis.createCustomPayload = function (data) {
                    return _this.createCustomPayload(data, element);
                };
                me.actions.subDealAnalysis.show(me);
            } else if (linkTo == "DealRevaluationAtDate") {
                me.actions.openAnalyse.createCustomPayload = function (data) {
                    return _this.createApplicationCustomPayload(data, element);
                };
                me.actions.openAnalyse.invoke(me);
            } else if (linkTo == "RateDetailIo") {
                me.actions.ioRateDialog.createCustomPayload = function (data) {
                    return _this.createCustomPayload(data, element);
                };
                me.actions.ioRateDialog.show(me);
            } else if (linkTo == "ZeroCurveDetail") {
                me.actions.zeroCurveDetail.createCustomPayload = function (data) {
                    return _this.createCustomPayload(data, element);
                };
                me.actions.zeroCurveDetail.show(me);
            } else if (linkTo == "ExchangeRateDetail") {
                me.actions.exchangeRateDetail.createCustomPayload = function (data) {
                    return _this.createCustomPayload(data, element);
                };
                me.actions.exchangeRateDetail.show(me);
            } else {
                me.actions.dialogLink.createCustomPayload = function (data) {
                    return _this.createCustomPayload(data, element);
                };
                me.actions.dialogLink.show(me);
            }
            //alert("A link " + element.attr("data-link-to") + element.attr("data-link-id"));
        };

        RevaluationDealingViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.canSaveItem = ko.computed(function () {
                return false;
            });

            var me = this;
            $("#Retrospective").on("click", ".rvLink", function () {
                me.link(me, this);
            });
            $("#Prospective").on("click", ".rvLink", function () {
                me.link(me, this);
            });
            $("#dialogLink").on("click", ".rvLink", function () {
                me.link(me, this);
            });
            $("#Summary").on("click", ".rvLink", function () {
                me.link(me, this);
            });
            $("#DealAnalysis").on("click", ".rvLink", function () {
                me.link(me, this);
            });

            // Subscribe to changes on this
            this.editingItem.payReceive.subscribe(function (newValue) {
                if (!newValue)
                    return;

                _this.editingItem.isSwitching(true);

                // Create links and apply binding to new HTML
                _this.calculate();
            });

            // Create our action for the Deal Analyse modal
            this.actions = this.actions || {};
            var dealAnalyseAction = this.actions["dealAnalyse"] = {
                showDialog: ko.observable(false),
                errorMessage: ko.observable(''),
                model: { dealAnalyse: ko.observable('') }
            };

            // Create action for Linked Deal Analyse modal
            this.actions["linkedDealAnalyse"] = {
                showDialog: ko.observable(false),
                errorMessage: ko.observable(''),
                model: {
                    linkedDealAnalysis: ko.observable(''),
                    linkedDealZeroCurve: ko.observable('')
                }
            };
        };

        RevaluationDealingViewModel.prototype.calculate = function () {
            this.menuCommands.calculateCommand.execute();
        };

        RevaluationDealingViewModel.prototype.itemRequest = function (action, params, isNewItem) {
            var _this = this;
            return this.net.getJson(action, params).then(function (result) {
                _this.loadItem(result, isNewItem);
            });
        };

        RevaluationDealingViewModel.prototype.analyse = function (viewModel, event) {
            var dealAnalyseAction = this.actions["dealAnalyse"];
            dealAnalyseAction.model.dealAnalyse("");

            var action = ag.utils.getDealAnalyseActionFromTarget(event), payload = ag.utils.getDealAnalysePayload(event, ko.mapping.toJS(viewModel.editingItem));

            // we need effectivenessTiming again when analyzing linked deal, so save it here.
            this.editingItem.effectivenessTiming(payload.EffectTiming);

            this.net.getJson(action, payload).then(function (result) {
                dealAnalyseAction.model.dealAnalyse(result.data);
                ag.dom.updateDealAnalysisTitle(result.title);
            });

            dealAnalyseAction.showDialog(true);
        };

        RevaluationDealingViewModel.prototype.linkedDealAnalyse = function (viewModel, event) {
            var linkedDealAnalysisAction = this.actions["linkedDealAnalyse"];

            linkedDealAnalysisAction.model.linkedDealAnalysis("");
            linkedDealAnalysisAction.model.linkedDealZeroCurve("");

            var action = ag.utils.getDealAnalyseActionFromTarget(event);

            if (!action)
                throw new Error("Missing Url");

            var params = ag.utils.getDealAnalysePayload(event, ko.mapping.toJS(viewModel.editingItem));

            this.net.getJson(action, params).then(function (result) {
                linkedDealAnalysisAction.model.linkedDealAnalysis(result.linkedDealAnalysisData);
                linkedDealAnalysisAction.model.linkedDealZeroCurve(result.linkedDealZeroCurveData);

                if (!ag.isNullUndefinedOrEmpty(params.DealNo))
                    ag.dom.updateLinkedDealTitle(params.DealNo);
            });

            this.actions["linkedDealAnalyse"].showDialog(true);
        };

        RevaluationDealingViewModel.prototype.createItem = function () {
            this.navigateToItem(null);
            this.resetEditor();

            return $.Deferred().resolve().promise();
        };

        RevaluationDealingViewModel.prototype.loadItem = function (result, isNewItem) {
            var deffered = _super.prototype.loadItem.call(this, result, isNewItem);

            // When user types into keyfield loadItem is called twice, and on the first will clear the dealnumber.
            // So don't call calculate unless the dealnumber is present. ie. second time.
            if (this.editingItem.dealNumber() && this.editingItem.dealNumber() != 0)
                this.calculate();

            return deffered;
        };

        RevaluationDealingViewModel.prototype.createCustomPayload = function (data, element) {
            return $.extend(ko.mapping.toJS(data || {}), { linkTo: element.attr("data-link-to"), linkId: element.attr("data-link-id"), linkFrom: element.attr("data-link-from") });
        };

        RevaluationDealingViewModel.prototype.createApplicationCustomPayload = function (data, element) {
            var linkId = element.attr("data-link-id");
            var payload = ko.mapping.toJS(data || {});

            payload.positionDate = linkId;

            return payload;
        };
        return RevaluationDealingViewModel;
    })(ag.DealingViewModel);
    ag.RevaluationDealingViewModel = RevaluationDealingViewModel;
})(ag || (ag = {}));
