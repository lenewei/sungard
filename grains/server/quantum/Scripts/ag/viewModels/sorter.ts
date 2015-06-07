/// <reference path="views.ts" />
/// <reference path="../../ts/global.d.ts" />

module ag
{
   export class SorterViewModel
   {
      changed = ko.observable(+new Date());
      gridSortOn = ko.observable("");
      gridSortDesc = ko.observable(false);
      gridAlphanumSort = ko.observable(false);
      gridSortMode: KnockoutObservable<boolean>;
      refreshColumnsComputed: KnockoutComputed<any>;
      sortFields: KnockoutObservableArray<any>;
      activeSortFields: KnockoutComputed<any[]>; // The sort fields that is currently active/selected. May not be same as sortFields
      visibleFields: KnockoutObservableArray<any>;
      columnsNeedToUseAlphanumSort: Array<string>;

      constructor(public views: ViewsViewModel, public gridMode: boolean)
      {
         this.gridSortMode = ko.observable(gridMode);

         if (views === undefined || views === null)
            return;

         this.sortFields = ko.observableArray(<any>this.calculateSortFields());
         this.visibleFields = ko.observableArray(<any>this.calculateVisibleFields());

         this.refreshColumnsComputed = ko.computed(() =>
         {
            if (!this.views.selected()) return;
            this.sortFields(<any>this.calculateSortFields());
            this.visibleFields(<any>this.calculateVisibleFields());
         }).extend({ rateLimit: ag.utils.getRateLimitOption() });

         this.activeSortFields = ko.computed(() =>
         {
            if (this.gridSortMode())
            {
               if (this.views)
                  return _.filter(this.views.selectedFields(), (i:any) => i.key() === this.gridSortOn());

               return [];
            }            
            return this.sortFields();
         });
      }

      updateUnderlyingFields(sortedFields)
      {
         var mappedFields = _.map(sortedFields, (field: any) =>
         {
            var mappedField =
               {
                  key: ko.unwrap(field.key),
                  sortStrategy: ko.unwrap(field.sortStrategy)
               };
            return mappedField;
         });

         // Reset the sorting on view fields
         _.each(this.views.selected().fields(), (field: any) =>
         {
            field.sortStrategy(0);
            field.sortOrder(0);
         });

         // Set the sorting properties from the current set of selected sort fields
         _.each(mappedFields, (field: any, index: number) =>
         {
            var fieldKey = field.key;
            var selectedField = _.find(this.views.selected().fields(),
               (f: any) => f.key() === fieldKey);

            if (selectedField)
            {
               selectedField.sortStrategy(field.sortStrategy);
               selectedField.sortOrder(index);
            }
         });
      }

      updateSortFields(fields)
      {
         if (this.views === undefined || this.views === null)
            return;

         //selected fields
         _.each(fields, (field: any) =>
         {
            var unwrappedField = ko.mapping.toJS(field);
            var selectedField = _.find(this.views.selected().fields(),
               (f: any) => ko.unwrap(f.key) === unwrappedField.key);

            if (selectedField === undefined)
            {
               field.hidden = true;
               field.sortStrategy = 1;
               field.sortOrder = 0;
               this.views.selected().fields.push(ko.mapping.fromJS(new FieldData(field)));
            }
            else
            {
               if (field.sortStrategy === undefined)
               {
                  field.sortStrategy = ko.observable(1);
               }
               else if (ko.isObservable(field.sortStrategy))
               {
                  field.sortStrategy(1);
               }
               else
                  field.sortStrategy = 1;
            }
         });
         
         //deselected fields
         _.each(this.views.selected().fields().slice(0), (field: any) =>
         {
            var unwrappedField = ko.mapping.toJS(field);
            var selectedField = _.find(fields, (f: any) => ko.unwrap(f.key) === unwrappedField.key);

            if (selectedField === undefined)
            {
               if (field.hidden() === true)
               {
                  this.views.selected().fields.remove(field);
               }
            }
         });

         this.updateUnderlyingFields(fields);
         this.refreshColumnsComputed();
         this.sortChanged();
      }

      updateVisibleFields(fields: any)
      {
         if (this.views == null)
            return;

         //selected fields
         _.each(fields, (field: any) =>
         {
            var unwrappedField = ko.mapping.toJS(field);
            var selectedField = _.find(this.views.selected().fields(), (f: any) => ko.unwrap(f.key) === unwrappedField.key);

            if (selectedField == null)
            {
               unwrappedField.sortStrategy = 0;
               unwrappedField.sortOrder = 0;
               unwrappedField.hidden = false;
               this.views.selected().fields.push(ko.mapping.fromJS(new FieldData(unwrappedField)));
            }
            else
            {
               selectedField.hidden(false);
            }
         });

         //deselected fields
         _.each(this.views.selected().fields().slice(0), (field: any) =>
         {
            var unwrappedField = ko.mapping.toJS(field);
            var selectedField = _.find(fields, (f: any) => ko.unwrap(f.key) === unwrappedField.key);

            if (selectedField === undefined)
            {
               if (field.sortStrategy() > 0)
               {
                  field.hidden(true);
               }
               else
               {
                  this.views.selected().fields.remove(field);
               }
            }
         });

         this.refreshColumnsComputed();
      }

      changeDesc(field: any)
      {
         var sortFields = this.calculateSortFields();
         var sortField = _.find(sortFields, (f: any) => f.key() === field.key());

         if (sortField)
         {
            var previous = sortField.sortStrategy();
            sortField.sortStrategy(previous === 1 ? 2 : 1);

            this.updateUnderlyingFields(sortFields);
            this.refreshColumnsComputed();
         }
      }

      calculateSortFields()
      {
         if (this.views !== undefined && this.views !== null && !this.views.selected())
            return [];

         return _.chain(<any[]>this.views.selected().fields()).filter(
            (field: any) => field.sortStrategy() > 0)
            .sortBy((field: any) => field.sortOrder()).value();
      }

      calculateVisibleFields(): any[]
      {
         if (this.views !== undefined && this.views !== null && !this.views.selected())
            return [];

         return _.filter(<any[]>this.views.selected().fields(), (field: any) => !field.hidden());
      }

      removeVisibleField(fieldToRemove: any)
      {
         if (fieldToRemove.sortStrategy() > 0)
         {
            // just hide it
            fieldToRemove.hidden(true);
         }
         else
         {
            this.views.selected().fields.remove(fieldToRemove);
         }
         this.refreshColumnsComputed();
         return false;
      }

      removeSortField(fieldToRemove: any)
      {
         this.sortFields.remove(fieldToRemove);
         if (fieldToRemove.hidden() === true)
         {
            this.views.selected().fields.remove(fieldToRemove);
         }

         this.updateUnderlyingFields(this.sortFields());
         this.refreshColumnsComputed();
         this.sortChanged();

         return false;
      }

      sortOptions()
      {
         if (this.gridSortMode())
         {
            var fieldData;
            if (this.views)
            {
               var unwrapfields = ko.mapping.toJS(this.views.selectedFields());
               fieldData = _.find(unwrapfields,(field: FieldData) =>
               {
                  if (field.key == this.gridSortOn())
                     return true;
               });
            }
          
            return {
               'sortOptions[0].key': fieldData ? (fieldData.sortBy || this.gridSortOn()) : this.gridSortOn(),
               'sortOptions[0].desc': this.gridSortDesc(),
               'sortOptions[0].useAlphanumSorting': this.gridAlphanumSort(),
            };
         }

         var result = {};

         if (this.sortFields)
         {
            _.each(this.sortFields(),(column: any, index: number) => 
            {
               result['sortOptions[' + index + '].key'] = column.sortBy() || column.key();
               result['sortOptions[' + index + '].desc'] = column.sortStrategy() === 2;
            });
         }

         return result;
      }

      sortColumn(columnName: string)
      {
         if (this.gridSortMode() && this.gridSortDesc() && this.views)
         {
            this.gridSortMode(false);
            this.gridSortOn('');
            this.sortChanged();
            return;
         }

         this.gridSortMode(true);

         // Reset to first Page
         //self.pager.page(1);

         // Toggle sort direction or reset
         if (this.gridSortOn() === columnName)
            this.gridSortDesc(!this.gridSortDesc());
         else
            this.gridSortDesc(false);

         // Set the sort on column
         this.gridSortOn(columnName);
         this.gridAlphanumSort(_.indexOf(this.columnsNeedToUseAlphanumSort, columnName) != -1);
         this.sortChanged();
      }

      includesColumn(columnKey)
      {
         return _.any(this.activeSortFields(), (field: any) => field.key() === columnKey);
      }

      sortChanged()
      {
         this.changed(+new Date());
      }

      afterVisibleMove(args, event, ui)
      {
         if (args.sourceParent !== args.targetParent)
            return;
         this.views.selected().fields.remove(args.item);
         this.views.selected().fields.splice(args.targetIndex, 0, args.item);
      }

      afterSortMove(args, event, ui)
      {
         if (args.sourceParent !== args.targetParent)
            return;
         _.each(this.sortFields(), (column: any, index: number) =>
         {
            column.sortOrder(index);
         });
         this.sortChanged();
      }
   }
}