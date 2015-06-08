/// <reference path="../dealingViewModel.ts" />

module ag 
{
   export class RevaluationDealingViewModel extends DealingViewModel 
   {
      menuCommands: any;

      link(element: EventTarget)
      {
         var $element = $(element),
            linkTo = $element.attr("data-link-to");

         if (linkTo == "DealRevaluationAtDate")
         {
            this.actions.openAnalyse.createCustomPayload = (data) => this.createApplicationCustomPayload(data, $element);
            this.actions.openAnalyse.invoke(this);
            return;
         }

         var action = this.getAction(linkTo);
         action.createCustomPayload = (data) => this.createCustomPayload(data, $element);
         action.show(this);
      }

      getAction(linkTo: string): Action
      {
         switch (linkTo) 
         {
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
      }

      init(itemModel: any)
      {
         super.init(itemModel);

         this.canSaveItem = ko.computed(() =>
         {
            return false;
         });

         $(document).on('click', '.rvLink', (e: JQueryEventObject) => { this.link(e.currentTarget); return false; });

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

      createCustomPayload(data, element: JQuery)
      {
         return $.extend(ko.mapping.toJS(data || {}), { linkTo: element.attr("data-link-to"), linkId: element.attr("data-link-id"), linkFrom: element.attr("data-link-from")});
      }

      createApplicationCustomPayload(data, element: JQuery) {
         var linkId = element.attr("data-link-id");
         var payload = ko.mapping.toJS(data || {});

         payload.positionDate = linkId;

         return payload;
      }
   }
}