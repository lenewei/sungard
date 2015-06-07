/// <reference path="../../ts/global.d.ts" />

module ag 
{
   export class AnalysisFieldData extends FieldData
   {
      index;

      constructor(options)
      {
         super(options);

         this.index = ko.observable(options.index);
      }
   }

   export class AnalysisField
   {
      index: KnockoutObservable<number>;
      fields: KnockoutObservableArray<any>;
      caption: KnockoutObservable<string>;
      fieldName: KnockoutComputed<string>;
      usedSubQueries: KnockoutComputed<string[]>;

      constructor(index: number, fields: any[], analysisFieldCaptions: KnockoutObservableArray<string>, caption = '')
      {
         this.index = ko.observable(index);
         this.fields = ko.observableArray(fields);
         this.caption = ko.observable(caption || '');
         this.caption.subscribe((newValue) =>
         {
            analysisFieldCaptions()[this.index() - 1] = newValue;
         });

         this.fieldName = ko.computed(() =>
         {
            return 'Column ' + this.index();
         });

         this.usedSubQueries = ko.computed(() => 
         {
            return _.map(this.fields(), (f: any) => ko.unwrap(f.subQuery));
         });
      }
   }

   export class AnalysisFieldViewModel
   {
      private analysisFields: KnockoutObservableArray<any>;
      private analysisFieldCaptions: KnockoutObservableArray<string>;
      indexes: KnockoutComputed<any>;
      fields: KnockoutComputed<any>;
      remainingIndexes: KnockoutComputed<any>;
      fieldsTrigger = ko.observable();
      addFieldCommand: KoliteCommand;
      sourceFieldLookupSource: string;
      
      constructor(editingQuery, serviceUrl: string)
      {
         this.analysisFields = editingQuery.analysisFields;
         this.analysisFieldCaptions = editingQuery.analysisFieldCaptions;
         this.sourceFieldLookupSource = "/{0}/{1}".format(serviceUrl, "getanalysissourcefields");

         this.fields = ko.computed(() => 
         {
            var trigger = this.fieldsTrigger();
            var fieldGroups = _.groupBy(this.analysisFields(), (af) => 
            {
               return ko.unwrap(af.index);
            });

            var result = [];
            (<any>_).forOwn(fieldGroups, (value, key) =>
            {
               result.push(new AnalysisField(parseInt(key), value, this.analysisFieldCaptions));
            });

            (<any>_).forEach(this.analysisFieldCaptions(), (value, captionIndex) =>
            {
               var index = captionIndex + 1;
               var existing = _.find(result, (r: AnalysisField) => r.index() === index);
               if (existing)
               {
                  existing.caption(value);
               }
               else if (value !== undefined && value !== null)
               {
                  result.push(new AnalysisField(index, [], this.analysisFieldCaptions, value));
               }
            });

            return _.sortBy(result, (r: AnalysisField) => ko.unwrap(r.index));
         });

         this.indexes = ko.computed(() =>
         {
            return (<any>_).map(this.fields(), (f: any) => ko.unwrap(f.index));
         });
         
         this.remainingIndexes = ko.computed(() =>
         {
            return _.difference(_.range(1, 11), this.indexes());
         });

         this.addFieldCommand = ko.command(
         {
            execute: () => 
            {
               this.addField();
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.remainingIndexes().length > 0;
            }
         });
      }

      addField(index?: number)
      {
         if (index === undefined)
         {
            var remaining = this.remainingIndexes();
            if (remaining.length === 0)
               return;

            index = <number>_.min(remaining);
         }

         var captions = this.analysisFieldCaptions(),
            captionIndex = index - 1,
            caption = captions[captionIndex];
         if (caption !== undefined && caption !== null)
            return;

         captions[captionIndex] = '';
         this.fieldsTrigger.valueHasMutated();
      }
      
      update(items, index: number)
      {
         _.each(items, (item: any) => 
         {
            item['index'] = index; 
            this.analysisFields.push(ko.mapping.fromJS(item));
         });
      }

      remove(item)
      {
         this.analysisFields.remove(item);
      }

      removeField(index: number)
      {
         var toRemove = _.filter(this.analysisFields(), (f: any) => 
         {
            return f.index() === index;
         });

         _.each(toRemove, (f) =>
         {
            this.analysisFields.remove(f);
         });

         this.analysisFieldCaptions()[index - 1] = null;
         this.fieldsTrigger.valueHasMutated();
      }
   }
}
