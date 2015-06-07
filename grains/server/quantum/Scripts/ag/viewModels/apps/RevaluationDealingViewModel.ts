/// <reference path="../dealingViewModel.ts" />

module ag 
{
   export class RevaluationDealingViewModel extends DealingViewModel 
   {
      menuCommands: any;

      link(me, domElement)
      {
         var element = $(domElement);
         var linkTo = element.attr("data-link-to");

         if (linkTo == "SubDealAnalysis")
         {
            me.actions.subDealAnalysis.createCustomPayload = (data) => this.createCustomPayload(data, element);
            me.actions.subDealAnalysis.show(me);
         }
         else if (linkTo == "DealRevaluationAtDate")
         {
            me.actions.openAnalyse.createCustomPayload = (data) => this.createApplicationCustomPayload(data, element);
            me.actions.openAnalyse.invoke(me);
         }
         else if (linkTo == "RateDetailIo")
         {
            me.actions.ioRateDialog.createCustomPayload = (data) => this.createCustomPayload(data, element);
            me.actions.ioRateDialog.show(me);
         }
         else if (linkTo == "ZeroCurveDetail")
         {
            me.actions.zeroCurveDetail.createCustomPayload = (data) => this.createCustomPayload(data, element);
            me.actions.zeroCurveDetail.show(me);
         }
         else if (linkTo == "ExchangeRateDetail")
         {
            me.actions.exchangeRateDetail.createCustomPayload = (data) => this.createCustomPayload(data, element);
            me.actions.exchangeRateDetail.show(me);
         }
         else
         {
            me.actions.dialogLink.createCustomPayload = (data) => this.createCustomPayload(data, element);
            me.actions.dialogLink.show(me);
         }
         //alert("A link " + element.attr("data-link-to") + element.attr("data-link-id"));
      }

      init(itemModel: any)
      {
         super.init(itemModel);

         this.canSaveItem = ko.computed(() =>
         {
            return false;
         });

         var me = this;
         $("#Retrospective").on("click", ".rvLink", function () { me.link(me, this); });
         $("#Prospective").on("click", ".rvLink", function () { me.link(me, this); });
         $("#dialogLink").on("click", ".rvLink", function () { me.link(me, this); });
         $("#Summary").on("click", ".rvLink", function () { me.link(me, this); });
         $("#DealAnalysis").on("click", ".rvLink", function () { me.link(me, this); });

         // Subscribe to changes on this
         this.editingItem.payReceive.subscribe((newValue) =>
         {
            if (!newValue)
               return;

            this.editingItem.isSwitching(true);

            // Create links and apply binding to new HTML
            this.calculate();
         });


         // Create our action for the Deal Analyse modal
         this.actions = this.actions || {};
         var dealAnalyseAction = this.actions["dealAnalyse"] =
            {
               showDialog: ko.observable(false),
               errorMessage: ko.observable(''),
               model: { dealAnalyse: ko.observable('') }
            };

         // Create action for Linked Deal Analyse modal
         this.actions["linkedDealAnalyse"] =
         {
            showDialog: ko.observable(false),
            errorMessage: ko.observable(''),
            model:
            {
               linkedDealAnalysis: ko.observable(''),
               linkedDealZeroCurve: ko.observable('')
            }
         };
      }

      calculate()
      {
         this.menuCommands.calculateCommand.execute();
      }

      itemRequest(action, params, isNewItem): JQueryPromise<any>
      {
         return this.net.getJson(action, params).then((result) =>
         {
            this.loadItem(result, isNewItem);
         });
      }

      analyse(viewModel: RevaluationDealingViewModel, event: JQueryEventObject)
      {
         var dealAnalyseAction = this.actions["dealAnalyse"];
         dealAnalyseAction.model.dealAnalyse("");

         var action = utils.getDealAnalyseActionFromTarget(event),
            payload = utils.getDealAnalysePayload(event, ko.mapping.toJS(viewModel.editingItem));

         // we need effectivenessTiming again when analyzing linked deal, so save it here.
         this.editingItem.effectivenessTiming(payload.EffectTiming);

         this.net.getJson(action, payload).then((result) =>
         {
            dealAnalyseAction.model.dealAnalyse(result.data);
            dom.updateDealAnalysisTitle(result.title);
         });

         dealAnalyseAction.showDialog(true);
      }

      linkedDealAnalyse(viewModel: RevaluationDealingViewModel, event: JQueryEventObject)
      {
         var linkedDealAnalysisAction = this.actions["linkedDealAnalyse"];

         linkedDealAnalysisAction.model.linkedDealAnalysis("");
         linkedDealAnalysisAction.model.linkedDealZeroCurve("");

         var action = utils.getDealAnalyseActionFromTarget(event);

         if (!action)
            throw new Error("Missing Url");

         var params = utils.getDealAnalysePayload(event, ko.mapping.toJS(viewModel.editingItem));

         this.net.getJson(action, params).then((result) =>
         {
            linkedDealAnalysisAction.model.linkedDealAnalysis(result.linkedDealAnalysisData);
            linkedDealAnalysisAction.model.linkedDealZeroCurve(result.linkedDealZeroCurveData);

            if (!isNullUndefinedOrEmpty(params.DealNo))
               dom.updateLinkedDealTitle(params.DealNo);
         });

         this.actions["linkedDealAnalyse"].showDialog(true);
      }

      createItem(): JQueryPromise<any>
      {
         this.navigateToItem(null);
         this.resetEditor();

         return $.Deferred().resolve().promise();
      }

      loadItem(result, isNewItem): JQueryDeferred<any>
      {
         var deffered = super.loadItem(result, isNewItem);
         // When user types into keyfield loadItem is called twice, and on the first will clear the dealnumber.
         // So don't call calculate unless the dealnumber is present. ie. second time.
         if (this.editingItem.dealNumber() && this.editingItem.dealNumber() != 0) this.calculate();

         return deffered;
      }

      createCustomPayload(data, element)
      {
         return $.extend(ko.mapping.toJS(data || {}), { linkTo: element.attr("data-link-to"), linkId: element.attr("data-link-id"), linkFrom: element.attr("data-link-from")});
      }

      createApplicationCustomPayload(data, element) {
         var linkId = element.attr("data-link-id");
         var payload = ko.mapping.toJS(data || {});

         payload.positionDate = linkId;

         return payload;
      }
   }
}