module ag
{
   export class ExtendDealsViewModel extends ReportingViewModel
   {
      constructor(options)
      {
         super(options);
         //for "processing/currency-options-diary" page
         var grid = <GridViewModel>this.grid;
         grid['isAllowRateUpdate'] = () =>
         {
            return this.applicationOptions["allowRateUpdates"]() && this.applicationOptions["details"]() == 0;
         };

         grid['appendApplicationOption'] = (action: Action, payload: any) =>
         {
            var appHeaderData = { appdata: ko.mapping.toJS(this.applicationOptions) };
            $.extend(payload, appHeaderData);
         };

         grid['refreshItem'] = () =>
         {
            var key = this.applicationOptions && ko.unwrap(this.applicationOptions);
            if (!key)
            {
               return;
            }
            return this.runReportRequest(false, 0, this.grid.getGridViewOptionsQueryString(), "refresh"/*, { "retain": true }*/);
         };
      }

      addHoldConstantToPayload(action: Action, payload: any)
      {
         //var holdConstant = _.find(this.reportParameterSummary(), function (s) { return s.key === "HoldConstant"; } ).value;
         var holdConstant = ko.unwrap(this.applicationOptions['holdConstant']);
         payload.holdConstant = holdConstant;
      }

      private attachOptions(data: any, action: Action)
      {
         var additionalOptionFields = {};
         var additionalFields = action['actionDetails']['additionalFields'];
         if (additionalFields)
         {
            _.each(additionalFields.split(','), (element:string) =>
            {
               var fieldToBeAdded = (<any>this.applicationOptions)[element];
               if (fieldToBeAdded)
               {
                  additionalOptionFields[element] = fieldToBeAdded;
               }
            });
         }
         return {
            appOptions: ko.mapping.toJS(additionalOptionFields),
            data: ko.mapping.toJS(data)
         };
      }

      afterApplyBindings()
      {
         var grid = this.grid,
            actions = grid.actions,
            extendAction = <Action>actions.extend,
            ratefixAction = <Action>actions.rateFix,
            rateSetAction = <Action>actions.rateSet,
            reviewRollDealAction = <Action>actions.reviewRollDeal,
            reviewMatureDealDetailsAction = <Action>actions.reviewMatureDealDetails;

        
         if (extendAction)
         {
            extendAction.createCustomPayload = (data) =>
            {
               return this.attachOptions(data, extendAction);
            };
         }

         if (ratefixAction)
         {
            ratefixAction.createCustomPayload = (data) =>
            {
               return this.attachOptions(data, ratefixAction);
            };
         }

         if (rateSetAction)
         {
            rateSetAction.createCustomPayload = (data) =>
            {
               return { appdata: ko.mapping.toJS(this.applicationOptions), data: ko.mapping.toJS(data) };
            };
         }

         if (reviewMatureDealDetailsAction) {
            reviewMatureDealDetailsAction.createCustomPayload = (data) => {
               return { appdata: ko.mapping.toJS(this.applicationOptions), data: ko.mapping.toJS(data) };
            };
         }

         if (reviewRollDealAction)
         {
            reviewRollDealAction.createCustomPayload = (data) =>
            {
               return { appdata: ko.mapping.toJS(this.applicationOptions), data: ko.mapping.toJS(data) };
            };
         }
      }
   }
}
