/// <reference path="../../ts/global.d.ts" />

module ag 
{
   "use strict";

   export enum SelectMode 
   {
      None = 0,
      Single = 1,
      Multi = 2
   }

   export class SelectedViewModel 
   {
      selectedField =
      {
         key: "selected",
         isKey: false,
         displayName: "",
         dataType: "checkbox",
         relativeSize: 1,
         sortable: false,
         hidden: false,
         sortStrategy: ko.observable(0)
      };

      mode: KnockoutObservable<number>;
      showAllButton = ko.observable(true);
      all = ko.observable(false);
      keys = ko.observableArray();
      item = ko.observable();

      columns: KnockoutComputed<any>;
      css: KnockoutComputed<any>;

      singleSelect: Function;
      isSelected: Function;
      model: KnockoutComputed<any>;
      isSingle: KnockoutComputed<any>;
      isMulti: KnockoutComputed<any>;

      constructor(selectMode: SelectMode, public itemKey: string)
      {
         this.mode = ko.observable(selectMode);

         this.columns = ko.computed(() =>
         {
            if (this.mode() != SelectMode.Multi)
               return [];
            return [this.selectedField];
         });

         this.isSingle = ko.computed(() =>
         {
            return this.mode() === SelectMode.Single;
         });

         this.isMulti = ko.computed(() =>
         {
            return this.mode() === SelectMode.Multi;
         });

         this.css = ko.computed(() =>
         {
            return {
               'single-select': this.isSingle(),
               'multi-select': this.isMulti()
            };
         });

         this.all.subscribe(() =>
         {
            this.item(undefined);
            this.keys.removeAll();
         });

         this.singleSelect = (item) =>
         {
            if (this.mode() === SelectMode.Single)
            {
               this.item(item);
               this.keys([ko.unwrap(item[itemKey])]);
            }
            return true;
         };

         this.isSelected = (item) =>
         {
            var keyValue = ko.unwrap(item[itemKey]);
            return _.any(this.keys(), key=> key === keyValue);
         };

         this.model = ko.computed(() =>
         {
            return {
               all: this.all(),
               keys: this.keys()
            };
         });
      }

      updateSelectedItem(items: any[])
      {
         if (this.mode() === SelectMode.Single)
            this.item(_.chain(items).filter((i) => _.contains(this.keys(), i[this.itemKey])).first().value());
      }

      toggleAll()
      {
         var currentAllStatus = this.showAllButton();
         this.all(currentAllStatus);
         this.showAllButton(!currentAllStatus);
      }

      refresh()
      {
         // Refresh selections
         if (this.isSingle || this.isMulti)
            this.keys.valueHasMutated();
      }

      reset()
      {
         // Clear the currently selected item
         this.item(null);

         // Reset the all flag
         this.all(false);

         // Clear any keys
         this.keys.removeAll();
      }

      load(selections: any)
      {
         this.all(ko.unwrap(selections.all));
         this.showAllButton(!this.all());

         var selectionsKeys = ko.unwrap(selections.keys);
         if (selectionsKeys && $.isArray(selectionsKeys))
            this.keys(selectionsKeys);
      }

      selectKey(key: any)
      {
         var index = ko.utils.arrayIndexOf(this.keys(), key);

         if (index < 0)
            this.keys.push(key);
         else if (index >= 0)
            this.keys.splice(index, 1);
      }
   }
}

