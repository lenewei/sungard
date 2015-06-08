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
        RevaluationDealingViewModel.prototype.link = function (element) {
            var _this = this;
            var $element = $(element), linkTo = $element.attr("data-link-to");

            if (linkTo == "DealRevaluationAtDate") {
                this.actions.openAnalyse.createCustomPayload = function (data) {
                    return _this.createApplicationCustomPayload(data, $element);
                };
                this.actions.openAnalyse.invoke(this);
                return;
            }

            var action = this.getAction(linkTo);
            action.createCustomPayload = function (data) {
                return _this.createCustomPayload(data, $element);
            };
            action.show(this);
        };

        RevaluationDealingViewModel.prototype.getAction = function (linkTo) {
            switch (linkTo) {
                case 'SubDealAnalysis':
                    return this.actions.subDealAnalysis;
                case 'RateDetailIo':
                    return this.actions.ioRateDialog;
                case 'ZeroCurveDetail':
                    return this.actions.zeroCurveDetail;
                case 'ExchangeRateDetail':
                    return this.actions.exchangeRateDetail;
                default:
                    return this.actions.dialogLink;
            }
        };

        RevaluationDealingViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.canSaveItem = ko.computed(function () {
                return false;
            });

            $(document).on('click', '.rvLink', function (e) {
                _this.link(e.currentTarget);
                return false;
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
