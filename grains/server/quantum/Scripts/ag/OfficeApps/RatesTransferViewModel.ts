/// <reference path="./office.ts" />

module ag 
{
   import Office = Microsoft.Office.WebExtension;
   import StaticDataType = staticDataUpload.StaticDataType;

   export class RatesTransferViewModel extends ExcelBaseViewModel
   {
      allFilters = ["RateName", "Name", "RateType", "Currency", "ReferenceCcy", "DealCurrency", "CurrencyPair", "LegTwoCurrency", "RateDate", "Contract", "Exchange", "CallPut", "CapFloor", "InputType", "BankAccount", "PayerReceiver", "Frequency"];
      noneForceUpdateRates = [ "Index" ];
      updatingFilters = ko.observable(false);

      availableFilters: KnockoutObservable<any>;
      filterNames = ko.observable([]);
      forceUpdateAvailable: KnockoutComputed<boolean>;

      init(itemModel: any)
      {
         super.init(itemModel);

         this.forceUpdateAvailable = ko.computed(() =>
         {
            this.editingItem.forceUpdate(false);
            return !_.contains(this.noneForceUpdateRates, this.selectedType().name);
         });

         this.selectedType.subscribe((type: any) =>
         {
            this.editingItem.area(type.area);
            this.editingItem.controller(type.controller);

            this.updatingFilters(true);

            _.each(this.allFilters, f =>
            {
               this.editingItem[f.toCamelCase()]('');
            });

            var filters = type.filters;
            if (filters)
            {
               _.each(filters, (value, key) =>
               {
                  this.editingItem[key.toCamelCase()](value);
               });
            }

            this.updatingFilters(false);
         });

         _.each(this.allFilters, f =>
         {
            this.editingItem[f.toCamelCase()].subscribe(newValue =>
            {
               if (!this.updatingFilters())
               {
                  var type: any = this.selectedType();
                  if (!type.filters)
                  {
                     type.filters = {};
                  }

                  type.filters[f] = newValue;
               }
            });
         });
      }

      initializeOffice(): JQueryPromise<void>
      {
         return super.initializeOffice()
            .then(() =>
            {

               this.availableFilters = ko.asyncComputed(() =>
               {
                  return staticDataUpload.getPropertyNamesAndTypes(this.selectedType())
                     .then(properties =>
                     {
                        return _.filter(properties, p => p.isKey);
                     });
               }, this);

               this.availableFilters.subscribe(newValue =>
               {
                  this.filterNames(_.pluck(this.availableFilters(), 'name'));
               });
            });
      }

      getTransferTypes()
      {
         return staticDataUpload.getRatesTransferTypes();
      }

      getDownloadPayload()
      {
         var payload: any = {},
            filters = {};
         payload.filters = filters;

         _.each(this.selectedType().filters, (value, key) =>
         {
            if (value !== '')
            {
               filters[key] = value;
            }
         });

         return payload;
      }

      modifyUploadPayload(payload)
      {
         var forceUpdate = this.editingItem.forceUpdate;
         if (forceUpdate)
            payload.forceUpdate = ko.unwrap(forceUpdate);
      }
   }
}