module ag 
{
   export module office
   {
      import Office = Microsoft.Office.WebExtension;

      export function initialize(): JQueryPromise<any>
      {
         return $.Deferred(deferred =>
         {
            // The initialize function must be run each time a new page is loaded
            Office.initialize = (reason) =>
            {
               deferred.resolve();
            };
         }).promise();
      }

      export function addTable(name: string, id: string): JQueryPromise<Office.TableBinding>
      {
         return addFromNamedItem(name, Office.BindingType.Table, { id: id });
      }

      export function initializeTableBinding(name: string, id: string): JQueryPromise<Office.TableBinding>
      {
         return $.Deferred(deferred =>
         {
            // The initialize function must be run each time a new page is loaded
            Office.initialize = (reason) =>
            {
               addFromNamedItem(name, Office.BindingType.Table, { id: id }).then(value => deferred.resolve(value));
            };
         }).promise();
      }

      export function goTo(name: string): JQueryPromise<any> 
      {
         return $.Deferred(d => Office.context.document.goToByIdAsync(name, Office.GoToType.NamedItem, handleCallback(d))).promise();
      }

      export function getDateFromExcelDate(excelDate: number): Date
      {
         return new Date((excelDate - 25569) * 86400000);
      }

      export function getRangeAddress(sheet: string, startColumn: string, startRow: number, endColumn: string, endRow: number): string
      {
         return sheet + "!" + startColumn + startRow + ":" + endColumn + endRow;
      }

      export function getColumnNameFromNumber(columnNumber: number)
      {
         var dividend = columnNumber,
            columnName = '',
            modulo: number;

         while (dividend > 0)
         {
            modulo = (dividend - 1) % 26;
            columnName = String.fromCharCode(65 + modulo).toString() + columnName;
            dividend = parseInt(((dividend - modulo) / 26).toString());
         }

         return columnName;
      }

      export function addFromNamedItem(itemName: string, bindingType: Office.BindingType, options?: { id?: string; asyncContext?: any; }): JQueryPromise<any>
      {
         return $.Deferred(d => Office.context.document.bindings.addFromNamedItemAsync(itemName, bindingType, options, handleCallback(d))).promise();
      }

      export function getData(selector: string): JQueryPromise<any>
      {
         return $.Deferred(d => Office.select(selector, d.reject).getDataAsync(handleCallback(d))).promise();
      }

      export function getDataFromBinding(binding: Office.Binding): JQueryPromise<any>
      {
         return $.Deferred(d => binding.getDataAsync(handleCallback(d))).promise();
      }

      export function getTableData(tableBinding: Office.TableBinding, startRow = 0, rowCount?: number): JQueryPromise<any>
      {
         var options = { coercionType: Office.CoercionType.Table, startRow: startRow };

         if (rowCount)
            options['rowCount'] = rowCount;

         return $.Deferred(d => tableBinding.getDataAsync(options, handleCallback(d))).promise();
      }

      export function clearTable(tableBinding: Office.TableBinding): JQueryPromise<any>
      {
         return $.Deferred(deferred => tableBinding.deleteAllDataValuesAsync(handleCallback(deferred))).promise();
      }

      export function addRows(tableBinding: Office.TableBinding, rows: any): JQueryPromise <any>
      {
         return $.Deferred(deferred => tableBinding.addRowsAsync(rows, handleCallback(deferred))).promise();
      }

      export function setTableData(tableBinding: Office.TableBinding, table: Office.TableData, dataTypes?: string[]): JQueryPromise <any>
      {
         return clearTable(tableBinding).then(() =>
         {
            if (table.rows.length > 0)
            {
               return addRows(tableBinding, convertToDates(replaceNullsInArray(table.rows, ""), dataTypes));
            }
         });
      }

      export function setCellData(tableBinding: Office.TableBinding, value: string, row: number, column: number): JQueryPromise<any>
      {
         var tableData = new Office.TableData();
         tableData.rows = [[value]];
         return $.Deferred(d => tableBinding.setDataAsync(tableData, { coercionType: Office.CoercionType.Table, startRow: row, startColumn: column }, handleCallback(d))).promise();
      }

      export function getBindingValue(tableBinding: Office.TableBinding, name: string): JQueryPromise<any> 
      {
         return $.Deferred((dfd) => Office.select('bindings#' + name, undefined).getDataAsync(handleCallback(dfd))).promise();
      }

      export function setBindingValue(tableBinding: Office.TableBinding, name: string, value): JQueryPromise<any> 
      {
         return $.Deferred((dfd) => Office.select('bindings#' + name, undefined).setDataAsync(value, handleCallback(dfd))).promise();
      }

      export function tryDisplayError(result: any)
      {
         if (!window.isDebug || !result)
            return;

         // Check shape of response for office error properties
         var isOfficeAPIError = result.code && result.name && result.message;

         if (isOfficeAPIError)
            return messages.error("{0} (Office API: {1})\n{2}".format(result.name, result.code, result.message));
      }

      function handleCallback(deferred: JQueryDeferred<any>): (AsyncResult) => void
      {
         return (result: Office.AsyncResult) =>
         {
            if (result.status == Office.AsyncResultStatus.Succeeded)
            {
               deferred.resolve(result.value);
               return;
            }

            deferred.reject(result.error);
         };
      }

      function replaceNullsInArray(data: Array<any[]>, replacement)
      {  
         // Iterate over each element in the array replacing any nulls 
         // on each child array with an empty string as Excel doesn't like nulls.
         _.each(data, element => 
         {
            for (var i = 0; i < element.length; i++)
            {
               if (element[i] === null)
                  element[i] = replacement;
            }
         });

         return data;
      }

      function convertToDates(data: Array<any[]>, dataTypes: string[])
      {
         if (!dataTypes || dataTypes.length == 0)
            return data;

         _.each(data, element =>
         {
            for (var i = 0; i < element.length; i++)
            {
               var dataType = dataTypes[i];
               if (dataType && dataType == 'Date')
               {
                  var value = element[i];
                  if (value)
                     element[i] = moment.fromISO(value).toDateZeroTime();
               }
            }
         });

         return data;
      }
   }
}