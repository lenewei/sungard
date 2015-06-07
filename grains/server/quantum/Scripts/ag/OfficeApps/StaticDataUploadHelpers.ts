/// <reference path="./office.ts" />

module ag.staticDataUpload
{
   import Office = Microsoft.Office.WebExtension;

   export class StaticDataType
   {
      binding: Office.TableBinding;
      propertyNameBinding: Office.MatrixBinding;
      dataTypeBinding: Office.MatrixBinding;
      keyBinding: Office.MatrixBinding;
      filters = {};

      constructor(public name: string, public controller?: string, public area?: string)
      {
         if (!controller)
            this.controller = name.toLowerCase();

         if (!area)
            this.area = "static";
      }

      fullName()
      {
         return this.name + "!" + this.name;
      }
   }

   export interface TableLocation
   {
      startRow: number;
      rowCount: number;
   }

   export function updatePayloadWithChildObject(payload: any, name: string, value: any)
   {
      var colonIndex = name.indexOf(':');
      var parentName = name.substring(0, colonIndex).toCamelCase(),
         childName = name.substring(colonIndex + 1).toCamelCase();
      if (!payload[parentName])
         payload[parentName] = {};

      payload[parentName][childName] = value;
   }

   export function getPayload(properties: any[], row, isHeader = false)
   {
      var payload = {};
      _.each(properties, (property, index) =>
      {
         var dataType = property.dataType,
            name: string = property.name,
            value = row[index];

         if (dataType == "Date" && value != '')
            value = office.getDateFromExcelDate(value);

         if (dataType == "Boolean" && value != '')
            value = value == 'Y';

         if (dataType == "Integer" && value == '')
            value = 0;

         if (name.startsWith("AnalysisCode."))
         {
            var analysisCodesName = "analysisCodes";
            if (!payload[analysisCodesName])
               payload[analysisCodesName] = [];

            payload[analysisCodesName].push({ name: name.substring(13), value: value });
         }
         else
         {
            var index = name.indexOf('.');
            if (index >= 0)
               name = name.substring(index + 1);

            var colonIndex = name.indexOf(':');
            if (colonIndex >= 0)
            {
               updatePayloadWithChildObject(payload, name, value);
            }
            else
            {
               payload[name.toCamelCase()] = value;
            }
         }
      });

      if (isHeader)
         payload['stamp'] = -1;

      return payload;
   }

   export function getPropertyNamesAndTypes(type: StaticDataType): JQueryPromise<any[]>
   {
      return $.when(office.getDataFromBinding(type.propertyNameBinding), office.getDataFromBinding(type.dataTypeBinding), office.getDataFromBinding(type.keyBinding))
         .then((names, types, keyValues) =>
         {
            var propertyNames = names[0],
               dataTypes = types[0],
               keys = keyValues[0],
               length = Math.min(propertyNames.length, dataTypes.length),
               result = [];
            for (var i = 0; i < length; i++)
            {
               result.push({ name: propertyNames[i], dataType: dataTypes[i], isKey: keys[i] == 'Key' });
            }
            return result;
         });
   }

   export function getCollections(propertyNames)
   {
      var collections = [],
         collectionNames = [];

      _.each(propertyNames, (property: any, index) =>
      {
         var name = property.name,
            dotIndex = name.indexOf('.');
         if (dotIndex >= 0)
         {
            var name = name.substring(0, dotIndex);
            if (!_.contains(collectionNames, name) && name != 'AnalysisCode')
            {
               collectionNames.push(name);
               collections.push({ name: name, index: index, fieldCount: _.filter(propertyNames, (p: any) => p.name.startsWith(name + '.')).length });
            }
         }
      });

      return collections;
   }

   export function mapDownloadData(properties: any[], result: any): any[]
      {
      // Add the message property in
      properties.push({ name: "Message" });

      // Get the keys of the properties(columns)
      var propertyKeys = _.map<any, string>(properties, "name");

      // Map the data based on the spreadsheet
      return _.map<any, any>(result.data, item =>
      {
         var row = [];
         _.each(propertyKeys, key =>
         {
            var key = key.toCamelCase();

            // Match properties(columns) to the returned dataset, 
            // when no match found enter an empty string.
            row.push(item.hasOwnProperty(key) ? (<any>item)[key] : "");
         });
         return row;
      });
   }

   export function addMatrixBinding(typeName: string, row: number, lastColumnName: string, id: string): JQueryPromise<any>
   {
      return office.addFromNamedItem(office.getRangeAddress(typeName, "B", row, lastColumnName, row), Office.BindingType.Matrix, { id: typeName + id });
   }

   export function modifySelection(selection, headerLength: number): JQueryPromise<any>
   {
      var rowCount = selection.rowCount,
         binding = selection.binding;
      return office.getTableData(binding)
         .then(result =>
         {
            var modifiedStartRow, modifiedRowCount,
               rows = result.rows,
               deferred = $.Deferred<TableLocation>();
            for (var i = selection.startRow; i < rows.length; i++)
            {
               if (typeof modifiedStartRow === 'undefined')
               {
                  if (rowHasValue(rows[i], headerLength))
                     modifiedStartRow = i;
               }

               if (typeof modifiedRowCount === 'undefined' && i >= rowCount - 1 + selection.startRow)
               {
                  if (!rows[i + 1] || rowHasValue(rows[i + 1], headerLength))
                     modifiedRowCount = i + 1 - selection.startRow;
               }
            }

            if (typeof modifiedStartRow != 'undefined' && typeof modifiedRowCount != 'undefined')
            {
               deferred.resolve({ startRow: modifiedStartRow, rowCount: modifiedRowCount });
            }
            else
               deferred.reject();

            return deferred.promise().then((selection) =>
            {
               var startRow = 9 + modifiedStartRow,
                  range = office.getRangeAddress(binding.id, "B", startRow, office.getColumnNameFromNumber(binding.columnCount + 1), startRow + modifiedRowCount - 1);
               office.goTo(range);
               return selection;
            });
         });
   }

   export function rowHasValue(row: any[], headerLength: number)
   {
      for (var i = 1; i <= headerLength; i++)
      {
         if (row[i] != '')
            return true;
      }

      return false;
   }

   export function getAction(status: string, isDelete = false)
   {
      if (isDelete)
         return 'delete';

      if (status == '' || status == 'Insert Error' || status == 'Deleted')
         return 'create';

      return 'edit';
   }

   export function successMessage(action: string)
   {
      if (action == 'delete')
         return 'Deleted';

      if (action == 'create')
         return 'Inserted';

      return 'Updated';
   }

   export function errorMessage(action: string)
   {
      if (action == 'delete')
         return 'Delete Error';

      if (action == 'create')
         return 'Insert Error';

      return 'Update Error';
   }

   export function getStaticDataUploadTypes()
   {
      return [
         new StaticDataType('Currency'),
         new StaticDataType("CurrencyControl"),
         new StaticDataType("Country"),
         new StaticDataType("Location"),
         new StaticDataType("Calendar", 'businessdaycalendar'),
         new StaticDataType("Entity"),
         new StaticDataType("CounterpartyType"),
         new StaticDataType("Counterparty"),
         new StaticDataType("CounterpartyContact"),
         new StaticDataType("CounterpartyRating"),
         new StaticDataType("ExternalMethod"),
         new StaticDataType('BankAccount', 'CashAccount'),
         new StaticDataType('StockAccount'),
         new StaticDataType('BrokerAccount'),
         new StaticDataType('CounterpartyBankAccount'),
         new StaticDataType('CounterpartyStockAccount'),
         new StaticDataType('BankAccountRule', null, 'rules'),
         new StaticDataType('BrokerAccountRule', null, 'rules'),
         new StaticDataType('StockAccountRule', null, 'rules'),
         new StaticDataType('User'),
         new StaticDataType('UserGroup'),
         new StaticDataType('CounterpartyBankAccountRule', 'counterpartycashaccountrule', 'rules'),
         new StaticDataType('CounterpartyStockAccountRule', null, 'rules'),
         new StaticDataType('LimitsDefinition', 'Limits', 'analytics')
      ];
   }
   export function getRatesTransferTypes() {
      return [
         new StaticDataType('FX', 'FXRate', 'rates'),
         new StaticDataType('FXVolatility', 'FXVolatilityRate', 'rates'),
         new StaticDataType('DealMargin', 'DealMargin', 'rates'),
         new StaticDataType('IssuerInstrument', 'IssuerInstrumentRate', 'rates'),
         new StaticDataType('IssuerInstrumentMargin', 'IssuerInstrumentMargin', 'rates'),
         new StaticDataType('Yield', 'YieldRate', 'rates'),
         new StaticDataType('InterestRateOptionVolatility', 'InterestRateOptionVolatilityRate', 'rates'),
         new StaticDataType('ExchangeTradedOption', 'EtoRate', 'rates'),
         new StaticDataType('Futures', 'FuturesRate', 'rates'),
         new StaticDataType('FXVolatility', 'FXVolatilityRate', 'rates'),
         new StaticDataType('ZeroCurveDefinition', 'ZeroCurveDefinition', 'rates'),
         new StaticDataType('ETOVolatility', 'EtoVolatilityRate', 'rates'),
         new StaticDataType('SwaptionVolatility', 'SwaptionVolatilityRate', 'rates'),
         new StaticDataType('AccountInterest', 'AccountInterestRate', 'rates'),
         new StaticDataType('IssuerInstrumentMargin', 'IssuerInstrumentMargin', 'rates'),
         new StaticDataType('DealMargin', 'DealMargin', 'rates'),
         new StaticDataType('Index', 'IndexRate', 'rates'),
         new StaticDataType('ZeroCurve', 'ZeroCurveDefinition', 'rates'),
         // Analytics
         new StaticDataType('CapFloorVolatility', 'capfloorvolatility-analytics', 'rates'),
         new StaticDataType('Correlation', 'correlation-analytics', 'rates'),
         new StaticDataType('DealMargin_Analytics', 'dealrevalmargin-analytics', 'rates'),
         new StaticDataType('FRA', 'fra-analytics', 'rates'),
         new StaticDataType('FuturesOptionVolatility', 'futureoptionvolatility-analytics', 'rates'),
         new StaticDataType('Futures_Analytics', 'futures-analytics', 'rates'),
         new StaticDataType('FuturesOption', 'futuresoption-analytics', 'rates'),
         new StaticDataType('FX_Analytics', 'fx-analytics', 'rates'),
         new StaticDataType('FXVolatility_Analytics', 'fxvolatility-analytics', 'rates'),
         new StaticDataType('Index_Analytics', 'index-analytics', 'rates'),
         new StaticDataType('Security', 'security-analytics', 'rates'),
         new StaticDataType('SecurityMargin', 'securitymargin-analytics', 'rates'),
         new StaticDataType('SecurityVolatility', 'securityvolatility-analytics', 'rates'),
         new StaticDataType('SwaptionVolatility_Analytics', 'swaptionvolatility-analytics', 'rates'),
         new StaticDataType('UnitPrice', 'unitissue-analytics', 'rates'),
         new StaticDataType('YieldMargin', 'YieldMargin-analytics', 'rates'),
         new StaticDataType('Yield_Analytics', 'Yield-analytics', 'rates'),
      ];
   }

}