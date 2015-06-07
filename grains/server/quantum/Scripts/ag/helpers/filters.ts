/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="constants.ts" />

module ag.filters
{
   var allOperators = ag.constants.OperatorType;

   //#region Operators

   export var otherOperators = [
      allOperators.OneOf,
      allOperators.NotOneOf,
      allOperators.EqualTo,
      allOperators.NotEqualTo,
      allOperators.LessThan,
      allOperators.NotLessThan,
      allOperators.GreaterThan,
      allOperators.NotGreaterThan,
      allOperators.Between,
      allOperators.NotBetween
   ];

   export var numberOperators = otherOperators;

   export var stringOperators = [
      allOperators.Contains,
      allOperators.DoesNotContain,
      allOperators.EqualTo,
      allOperators.NotEqualTo,
      allOperators.OneOf,
      allOperators.NotOneOf,
      allOperators.OneOfData,
      allOperators.NotOneOfData
   ];

   export var stringOperatorsWithoutLookup = [
      allOperators.Contains,
      allOperators.DoesNotContain,
      allOperators.EqualTo,
      allOperators.NotEqualTo,
      allOperators.OneOf,
      allOperators.NotOneOf
   ];

   export var lookupOperators = [
      allOperators.OneOf,
      allOperators.NotOneOf,
      allOperators.EqualTo,
      allOperators.NotEqualTo
   ];

   export var dateOperators = [
      allOperators.EqualTo,
      allOperators.NotEqualTo,
      allOperators.LessThan,
      allOperators.NotLessThan,
      allOperators.GreaterThan,
      allOperators.NotGreaterThan,
      allOperators.Between,
      allOperators.NotBetween
   ];

   export var filterLinkOperators = [
      allOperators.EqualTo,
      allOperators.NotEqualTo
   ];

   //#endregion

   export function isMultiSelect(dataType: string)
   {
      return dataType === "lookup" || dataType === "enum";
   }

   export function buildFilter(item, isParameter: boolean)
   {
      var itemDataType = ko.unwrap(item.dataType),
         initialValue = itemDataType === "datetime" ? <any>ag.dates.today() : (isMultiSelect(itemDataType) ? <any>[] : null);

      var filterData = new FilterData(item);

      filterData.operator = getDefaultOperatorForDataType(itemDataType);
      filterData.value1 = initialValue;
      filterData.value2 = initialValue;
      filterData.isParameter = !!isParameter;

      return ko.mapping.fromJS(filterData);
   }

   export function getFilterLinkOperators()
   {
      return filterLinkOperators;
   }

   export function getOperators(data: FilterData)
   {
      var dataType = ko.unwrap(data.dataType);

      switch (dataType)
      {
         case "string":
            if (_.has(data, "hasLookup") && ko.unwrap(data.hasLookup))
               return stringOperators;
            return stringOperatorsWithoutLookup;
         case "lookup":
         case "enum":
            return lookupOperators;
         case "datetime":
            return dateOperators;
         case "integer":
         case "decimal":
            return numberOperators;
         default:
            return otherOperators;
      }
   }

   export function getDefaultOperatorForDataType(dataType: string)
   {
      switch (dataType)
      {
         case "string":
            return stringOperators[0];
         case "integer":
         case "decimal":
            return numberOperators[0];
         case "datetime":
            return dateOperators[0];
         default:
            return isMultiSelect(dataType) ? lookupOperators[0] : otherOperators[0];
      }
   }

   /// Finds an item in the specified list of lists.
   export function getItemByKey(testItem, selectedItemsList)
   {
      var selected = false,
         testKey = ko.unwrap(testItem.key).toLowerCase();

      $.each(selectedItemsList, (outer, selectedItems) =>
      {
         var done = false;
         $.each(ko.unwrap(selectedItems), (inner, item) =>
         {
            selected = ko.unwrap(item.key).toLowerCase() == testKey;
            if (selected)
            {
               done = true;
               return false;
            }
            return true;
         });

         if (done) 
            return false;

         return true;
      });

      return selected;
   }

   export function transformFilters(filters)
   {
      // Function for attempting to extract values from objects.
      // If not an object do nothing (original filter value will remain).
      var getValueFromEnumObject = (item: any, setterFn: (value: any) => void, prop: string) =>
      {
         if ($.isPlainObject(item) && item.hasOwnProperty(prop))
            setterFn(item[prop]);
      };

      // Transform filter values and tidy-up ready for request
      $.each(filters, (i, filter: FilterData) =>
      {
         // Only enums require transforming
         if (ko.unwrap(filter.dataType) === "enum")
         {
            if ($.isArray(filter.value1))
            {                       
               // Get values from array "one of" operator etc.
               // This will set the filter value1 to an array of numbers e.g. [1, 4, 7]
               $.each(filter.value1, (j, item) =>
               {
                  getValueFromEnumObject(item, value => filters[i].value1[j] = value, "value");
               });
            }
            else
            {
               // Single value "equal to" operator etc. 
               // Currently these type of enum filters want the text value e.g. "Actual Cashflows"
               // which will then be transformed on the server. This is inconsistent and should be fixed.
               getValueFromEnumObject(filter.value1, value => filter.value1 = value, "text");
            }
         }

         // While we're here remove all multiValue1 properties 
         // as these are only there for the UI.
         delete filter.multiValue1;
      });
   }

   export function getRangeFilterDisplayValue(value1: any, value2: any, dataType: string)
   {
      return getSingleFilterDisplayValue(value1, dataType) + " - " + getSingleFilterDisplayValue(value2, dataType);
   }

   export function getSingleFilterDisplayValue(value: any, dataType: string)
   {
      if (dataType === "datetime")
      {
         var date = moment.fromISO(value);
         if (date.isValid())
            return date.toDisplay();
      }

      if (dataType === "enum")
      {
         if (_.isArray(value))
            return _.map(value, (v: any) => v.text).join(", ");

         if (!value)
            return "";

         return value.text;
      }

      if (dataType === "lookup" && $.isArray(value) && value.length > 0)
      {
         return value.join(", ");
      }

      return value;
   }
}