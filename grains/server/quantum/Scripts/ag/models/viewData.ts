// Definition of ViewData, FieldData, FilterData client-side objects 
// Strongly related to server-side versions but allows defaults to be set, and additional functionality added
module ag 
{
   export function flagsTest(flagsValue, flag)
   {
      return (flagsValue & flag) == flag;
   }

   export class ViewData
   {
      key: string;
      parentKey: string;
      clientKey: string;
      parentClientKey: string;
      name: string;
      isComplete: boolean;
      isDefault: boolean;
      isSystem: boolean;
      isPersonal: boolean;
      isGroup: boolean;
      isPivot: boolean;
      viewType: any;
      viewTableKey: string;
      showColumnGrandTotals: boolean;
      showRowGrandTotals: boolean;
      visualisations: any;
      fields: any;
      appliedFields: any;
      displayFields: any;
      filters: any;
      groupColumnsBy: any;
      groupRowsBy: any;
      aggregateOn: any;
      outputToDatabase: boolean;
      tableName: string;
      failOnColumnMismatch: boolean;
      failOnStringTruncation: boolean;
      keepLatestResultOnly: boolean;
      skipMapTables: boolean;
      crystalReports: any[];
      chartType: number;
      reportFileName: string;
      description: string;
      
      //contains all deleted calculated fields.
      //deleted calculated field are kept so that the user can re-add them later
      unusedCalculatedFields: any[];

      sortedCalculatedFieldKeys: string[];

      profileBy: KnockoutObservable<FieldData>;
      profilePeriods: any;
      hasWritePermission: any;

      constructor(options, retainHiddenFields = false)
      {
         this.key = options.key;
         this.clientKey = options.clientKey || options.key;
         this.parentKey = options.parentKey;
         this.parentClientKey = options.parentClientKey || options.parentKey;
         this.name = options.name;
         this.isComplete = options.isComplete || false;
         this.isDefault = options.isDefault || false;
         this.isSystem = options.isSystem || false;
         this.isPersonal = options.isPersonal || false;
         this.isGroup = options.isGroup || false;
         this.isPivot = options.isPivot || false;
         this.viewType = options.viewType || 0;
         this.viewTableKey = options.viewTableKey || "";
         this.showColumnGrandTotals = options.showColumnGrandTotals || false;
         this.showRowGrandTotals = options.showRowGrandTotals || false;
         this.visualisations = options.visualisations || [];
         this.outputToDatabase = options.outputToDatabase || false;
         this.tableName = options.tableName || '';
         this.failOnColumnMismatch = options.failOnColumnMismatch || false;
         this.failOnStringTruncation = options.failOnStringTruncation || false;
         this.keepLatestResultOnly = options.keepLatestResultOnly || false;
         this.skipMapTables = options.skipMapTables || false;
         this.crystalReports = [];
         this.chartType = options.chartType || 0;
         this.reportFileName = options.reportFileName || "";
         this.description = options.description || "";         
         this.hasWritePermission = options.hasWritePermission;
                  
         mapCollection(options.crystalReports, this.crystalReports, (item) =>
         {
            return new RiskCrystalDefinition(item);
         });

         this.fields = [];
         if (_.isArray(options.fields) && options.fields.length > 0)
         {
            // Load the fields
            var fieldsTemp = options.fields;

            // Filter out hidden fields by default
            if (!retainHiddenFields)
            {
               fieldsTemp = _.filter(fieldsTemp, (item: any) =>
               {
                  return !item.hidden;
               });
            }

            _.each(fieldsTemp, (item) =>
            {
               this.fields.push(new FieldData(item));
            });
         }

         this.appliedFields = _.isArray(options.appliedFields) ? _.map(options.appliedFields, (i) => new FieldData(i)) : _.cloneDeep(this.fields);

         this.filters = [];
         mapCollection(options.filters, this.filters, (item) =>
         {
            return new FilterData(item);
         });

         this.groupColumnsBy = [];
         mapCollection(options.groupColumnsBy, this.groupColumnsBy, (item) =>
         {
            return new ViewFieldData(item);
         });

         this.groupRowsBy = [];
         mapCollection(options.groupRowsBy, this.groupRowsBy, (item) =>
         {
            return new ViewFieldData(item);
         });

         this.aggregateOn = [];
         mapCollection(options.aggregateOn, this.aggregateOn, (item) =>
         {
            return new AggregateFieldData(item);
         });

         this.unusedCalculatedFields = [];
         mapCollection(options.unusedCalculatedFields, this.unusedCalculatedFields, (item) =>
         {
            return new FieldData(item);
         });

         this.sortedCalculatedFieldKeys = options.sortedCalculatedFieldKeys;

         this.profileBy = ko.observable(options.profileBy ? new FieldData(options.profileBy) : null);

         this.profilePeriods = [];
         mapCollection(options.profilePeriods, this.profilePeriods, (item) =>
         {
            return new ProfileData(item);
         });

         return this;
      }

      static updateGroupRowsBy(groupBy, items)
      {
         groupBy.removeAll();
         mapCollection(items, groupBy, (item) =>
         {
            return ko.mapping.fromJS(new ViewFieldData(ko.mapping.toJS(item)));
         });
      }

      static updateAggregateOn(aggregateOn, items)
      {
         aggregateOn.removeAll();
         mapCollection(items, aggregateOn, (item) =>
         {
            return ko.mapping.fromJS(new AggregateFieldData(ko.mapping.toJS(item)));
         });
      }

      static cssClassesForField(styleFlags: number): string
      {
         if (!styleFlags)
            return "";

         var styles = [];
         if (flagsTest(styleFlags, FieldStyle.WrapText))
            styles.push("wrap");

         if (flagsTest(styleFlags, FieldStyle.BorderLeft))
            styles.push("border-left");

         if (flagsTest(styleFlags, FieldStyle.BorderRight))
            styles.push("border-right");

         return styles.join(" ");
      }

      //get all calculated fields. including selected and unselected fields.
      static getCalculatedFields(view: any): any[]
      {
         var usedCalculatedFields = _.filter(ViewData.getSelectedFields(view), (field: any) => field.calculatedField());
         return _.union(usedCalculatedFields, view.unusedCalculatedFields());
      }

      //get all selected (but not applied) fields in the view.
      static getSelectedFields(view: any): any[]
      {
         var dimensionValues = _.map(ViewData.getVisibleDimensions(view), (dimension: KnockoutObservableArray<any>) => dimension());
         return _.union.apply(_, dimensionValues);
      }

      static getVisibleDimensions(view: any): KnockoutObservableArray<any>[]
      {
         switch (view.viewType())
         {
            case ViewType.DataView:
               return [view.fields];
            case ViewType.Pivot:
               return [view.aggregateOn, view.groupRowsBy, view.groupColumnsBy];
            case ViewType.Chart:
               return [view.aggregateOn, view.groupRowsBy];
         }
         return [];
      }
   }

   export function mapCollection(from, to, createFn)
   {
      if (from && _.isArray(from))
      {
         _.each(from, (item) =>
         {
            to.push(createFn(item));
         });
      }
   }

   export class RiskCrystalDefinition
   {
      crystalName: string;
      crystalFile: string;

      constructor(options)
      {
         this.crystalName = options.crystalName || '';
         this.crystalFile = options.crystalFile || '';
      }
   }

   export enum FieldStyle
   {
      None = 0,
      WrapText = 1,
      BorderLeft = 2,
      BorderRight = 4
   }

   export class FieldData 
   {
      key: string;
      isKey: boolean;
      displayName: any;
      dataType: any;
      format: string;
      linkFieldKey: string;
      hidden: boolean;
      sortStrategy: number;
      sortOrder: number;
      prefixName: string;
      relatedFields: Array<any>;
      subQuery: string;
      subQueryName: string;
      groupByLevel: number;
      relativeSize: number;
      css: string;
      expression: string;
      calculatedField: boolean;
      linksTo: any;
      sortBy: string;

      constructor(options)
      {
         this.key = options.key;
         this.isKey = !!options.isKey;
         this.displayName = options.displayName;
         this.dataType = options.dataType;
         this.format = options.format || "";
         this.linkFieldKey = options.linkFieldKey || "";
         this.hidden = options.hidden || false;
         this.sortStrategy = options.sortStrategy || 0;
         this.sortOrder = options.sortOrder || 0;
         this.prefixName = options.prefixName || "";
         this.relatedFields = options.relatedFields || [];
         this.subQuery = options.subQuery || "";
         this.subQueryName = options.subQueryName || "";
         this.groupByLevel = options.groupByLevel || 0;
         this.relativeSize = options.relativeSize || 0;
         this.css = ViewData.cssClassesForField(options.styles || 0);
         this.expression = options.expression || "";
         this.calculatedField = !!options.calculatedField;
         this.linksTo = options.linksTo;
         this.sortBy = options.sortBy || "";
      }
   }

   export class FilterData extends FieldData 
   {
      operator: any;
      value1: any;
      multiValue1: Array<any>;
      value2: any;
      isParameter: boolean;
      hasLookup: boolean;

      constructor(options)
      {
         super(options);

         this.operator = ko.observable(options.operator);
         this.value1 = ko.observable(options.value1);
         this.multiValue1 = _.isArray(options.value1) ? options.value1 : [];
         this.value2 = _.isUndefined(options.value2) ? null : options.value2;
         this.hasLookup = !!options.hasLookup;
         this.isParameter = !!options.isParameter;
      }

      public getSummary(filtersViewModel: FiltersViewModel): string
      {
         var unmapped = ko.mapping.toJS(this);

         if (unmapped.dataType == "boolean")
            return "{0}: {1}".format(unmapped.displayName, filtersViewModel.getFilterDisplayValue(unmapped));

         return "{0} {1}: {2}".format(unmapped.displayName, filtersViewModel.getOperatorLabel(unmapped.operator), filtersViewModel.getFilterDisplayValue(unmapped));
      }
   }

   export class ViewFieldData extends FieldData 
   {
      endTotal: boolean;
      subTotal: boolean;
      resetRunningTotals: boolean;
      formatMask: string;

      // custom rule for view field display
      isRule: boolean;
      ruleType: RuleType;
      replaceWithProperty: string;
      targetColumn: string;
      canApplyRule: string;

      constructor(options)
      {
         super(options);

         this.sortStrategy = _.isUndefined(options.sortStrategy) ? constants.SortStrategy.None : options.sortStrategy;
         this.sortOrder = _.isUndefined(options.sortOrder) ? 0 : options.sortOrder;
         this.hidden = !!options.hidden;
         this.groupByLevel = _.isUndefined(options.groupByLevel) ? 0 : options.groupByLevel;
         this.subTotal = !!options.subTotal;
         this.endTotal = !!options.endTotal;
         this.resetRunningTotals = !!options.resetRunningTotals;
         this.formatMask = options.formatMask;

         if (options.isRule)
         {
            this.hidden = true;
            this.isRule = options.isRule;
            this.ruleType = options.ruleType || RuleType.UpdateCellDisplay;
            this.targetColumn = options.targetColumn;
            this.replaceWithProperty = options.replaceWithProperty;
            this.canApplyRule = options.canApplyRule;
         }
      }

      canEditFormatMask()
      {
         return _.contains(['datetime', 'decimal', 'integer'], ko.unwrap(this.dataType));
      }

      // This is needed as a placeholder until the collection editor adds its own version
      getDisplayName()
      {
         return ko.unwrap(this.displayName);
      }

      // This is needed as a placeholder until the collection editor adds its own version
      getTitle()
      {
         return ko.unwrap(this.displayName);
      }
   }

   export class AggregateFieldData extends ViewFieldData 
   {
      operator;
      totalOperator;
      label;

      constructor(options)
      {
         super(options);

         this.operator = ko.observable(options.operator);
         this.totalOperator = ko.observable(options.totalOperator);
         this.label = ko.observable(options.label);
      }
   }

   export class ProfileData
   {
      occurences: number;
      size: number;
      unit: number;
      method: number;
      startOn: number;
      total: boolean;

      constructor(options)
      {
         this.occurences = options.occurences || 0;
         this.size = options.size || 0;
         this.unit = options.unit || 0;
         this.method = options.method || 0;
         this.startOn = options.startOn || 0;
         this.total = options.total || false;


      }


   }
}