/// <reference path="../../ts/global.d.ts" />\
module ag
{
   export class ColumnsEditorViewModel
   {
      private trackUnusedCalculatedFieldsEnabled: boolean;
      private options: any;

      //contains all query fields in the view
      queryFields: KnockoutComputed<any[]>;

      //contains all calculated fields in the view including unused onces
      calculatedFields: KnockoutComputed<any[]>;

      hasCalculatedFields: boolean;

      constructor(private selectedView: KnockoutObservable<any>, opts: any, private reportProxy: IReportProxy = new ReportProxy())
      {
         this.trackUnusedCalculatedFieldsEnabled = true;
         this.options = _.extend({}, { hasCalculatedFields: false }, opts);
         
         this.trackUnusedCalculatedFields(); //do this before the lines below to prevent the computed from being called multiple times

         this.hasCalculatedFields = this.options.hasCalculatedFields;
         this.queryFields = ko.computed(this.computeQueryFields, this);
         this.calculatedFields = ko.computed(this.computeCalculatedFields, this);
      }

      private trackUnusedCalculatedFields()
      {
         //ugly solution for storing unused calculated fields so that the user can use it in a dimension later
         //When a calculated field is removed from a dimension, it is added to the unused calculated fields collection
         //When a calculated field is added to a dimension, it is removed from the unused calculated fields collection
         if (this.options.hasCalculatedFields)
         {
            ko.computed(() =>
            {
               //we know/assume that the view type never changes
               _.each(ViewData.getVisibleDimensions(this.selectedView()), (dimension: KnockoutObservableArray<any>) =>
               {
                  this.trackUnusedCalculatedFieldsInDimension(dimension);
               });
            });
         }
      }

      private trackUnusedCalculatedFieldsInDimension(dimension: KnockoutObservableArray<any>)
      {
         //no need to unsubscribe since ColumnsEditorsViewModel outlives the selected view
         dimension.subscribe((changes) =>
         {
            if (this.trackUnusedCalculatedFieldsEnabled)
            {
               _.each(changes, (change: any) =>
               {
                  if (!change.moved && ko.unwrap(change.value.calculatedField) === true)
                  {
                     if (change.status === "deleted")
                     {
                        //calculated field is no longer used. create a copy then add it to unusedCalculatedFields
                        this.createAndAddUnusedCalculatedField(change.value);
                     }
                     else if (change.status === "added")
                     {
                        //calculated field with same key is added. remove the field that has the same key from unusedCalculatedFields
                        this.removeUnusedCalculatedFieldByKey(change.value.key());
                     }
                  }
               });
            }
         }, null, "arrayChange");
      }

      private createAndAddUnusedCalculatedField(field: any)
      {
         var downcastedField = ko.mapping.fromJS(new FieldData(ko.mapping.toJS(field))); //unusedCalculatedFields can only contain the base class because the server can't deserialize derived classes
         var view = this.selectedView();

         var existingField = _.find(view.unusedCalculatedFields(), (i: any) => i.key() === downcastedField.key());
         if (!_.isUndefined(existingField))
         {
            view.unusedCalculatedFields.replace(existingField, downcastedField);
         }
         else
         {
            view.unusedCalculatedFields.push(downcastedField);
         }
      }

      private removeUnusedCalculatedFieldByKey(fieldKey: string)
      {
         this.selectedView().unusedCalculatedFields.remove((i: any) => i.key() === fieldKey);
      }
      
      private computeQueryFields(): any[]
      {
         var includeHiddenFields = this.selectedView().viewType() !== ViewType.DataView;
         var queryFields = _.filter(ViewData.getSelectedFields(this.selectedView()), (field: any) => (includeHiddenFields || !field.hidden()) && !field.calculatedField());

         return _.sortBy(queryFields, (field: any) => 
         {
            var expression = ko.unwrap(field.expression);
            return expression && expression.toLowerCase();
         });  
      }

      private computeCalculatedFields(): any[]
      {
         var view = this.selectedView();
         var calculatedFields = ViewData.getCalculatedFields(view);

         //when loading for the first time, sort the fields by display name
         if (view.sortedCalculatedFieldKeys() == null)
         {
            view.sortedCalculatedFieldKeys(this.sortFieldKeysByDisplayName(calculatedFields));
         }
            
         //if not first load, retain the previous sort. New fields are added at the bottom
         return _.sortBy(calculatedFields, (field: any) =>
         {
            var index = _.findIndex(view.sortedCalculatedFieldKeys(), (key: any) => key === field.key());
            return index > -1 ? index : field.key();
         });
      }
      
      private sortFieldKeysByDisplayName(fields: any[]): string[]
      {
         //TODO: support localization in the sorting?
         var sortedFields = _.sortBy(fields, (field: any) => field.displayName().toLowerCase());
         return  _.map(sortedFields, (field: any) => field.key());
      }

      public addNewCalculatedField()
      {
         var view = this.selectedView();

         if (view.viewType() === ViewType.DataView)
         {
            this.reportProxy.getCalculatedFieldTemplate().then((fieldOptionsTemplate) =>
            {
               view.fields.push(ko.mapping.fromJS(new FieldData(this.addUniqueFieldOptions(fieldOptionsTemplate))));
            });
         }
         else if (view.viewType() === ViewType.Pivot || view.viewType() === ViewType.Chart)
         {
            this.reportProxy.getCalculatedAggregateFieldTemplate().then((fieldOptionsTemplate) =>
            {
               view.aggregateOn.push(ko.mapping.fromJS(new AggregateFieldData(this.addUniqueFieldOptions(fieldOptionsTemplate))));
            });
         }
         else
         {
            throw new Error("Unknown view type");   
         }
      }

      private addUniqueFieldOptions(fieldOptions: any) : any
      {
         fieldOptions.displayName = utils.ensureUniqueName(ag.strings.untitledColumn, ko.mapping.toJS(this.calculatedFields()), "displayName");
         fieldOptions.key = this.generateNextCalculatedFieldKey();
         return fieldOptions;
      }

      private generateNextCalculatedFieldKey(): string
      {
         //First character in key must be lowercase and not be a number!
         //Key must contain parenthesis so that it will be parsed by the system.
         //Temporary workaround until system can accept calculated fields with arbitrary keys

         var calculatedFields = ViewData.getCalculatedFields(this.selectedView());

         var identities = _.map(calculatedFields, (i) =>
         {
            var match = /^c\((\d+)$/.exec(i.key());
            return match != null ? _.parseInt(match[1]) : 0;
         });

         var highestIdentity = (<any>_.chain(identities)).sortBy((i) => i).last().value();
         var nextIdentity = (highestIdentity || 0) + 1;

         var zeros = "0000000";
         return "c(" + (zeros + nextIdentity).slice(zeros.length * -1);
      }

      //really remove the calculated field
      public removeCalculatedField(field)
      {
         try
         {
            this.trackUnusedCalculatedFieldsEnabled = false;

            _.each(ViewData.getVisibleDimensions(this.selectedView()), (dimension: KnockoutObservableArray<any>) =>
            {
               dimension.remove(field);
            });
         }
         finally
         {
            this.trackUnusedCalculatedFieldsEnabled = true;
         }

         this.removeUnusedCalculatedFieldByKey(field.key());
      }
      
      //used in expression dialog
      public getExpressionValidateExtraRequestData(field): any
      {
         return ko.mapping.toJS({
            viewTableKey: this.selectedView().viewTableKey,
            otherFields: _.xor(_.union(ViewData.getSelectedFields(this.selectedView()), this.selectedView().unusedCalculatedFields()), [ field ])
         });
      }

      //used in expression dialog
      public getExpressionDataTypeExtraRequestData(): any
      {
         return ko.mapping.toJS({
            viewTableKey: this.selectedView().viewTableKey
         });
      }

      //used in expression dialog
      public getExpressionLookupExtraRequestData(): any
      {
         return ko.mapping.toJS({
            viewTableKey: this.selectedView().viewTableKey,
            selectedQueryFields: ViewData.getSelectedFields(this.selectedView())
         });
      }
   }
}