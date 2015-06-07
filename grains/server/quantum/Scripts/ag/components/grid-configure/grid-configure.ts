module ag 
{
   export class GridConfigureViewModel
   {
      id: string;
      hasFilters: boolean;

      layoutId: string;
      filtersId: string;
      propertiesId: string;

      layoutHref: string;
      filtersHref: string;
      propertiesHref: string;

      layoutTabId: string;
      filtersTabId: string;
      propertiesTabId: string;

      accessPermissionsName: string;

      views: ViewsViewModel;
      sorter: SorterViewModel;

      usedViewFilters: KnockoutComputed<any>;
      private viewFieldLookupSource: string;

      constructor(params)
      {
         this.id = params.id;
         this.hasFilters = params.hasFilters || false;

         this.layoutId = this.id + "viewlayout";
         this.filtersId = this.id + "viewfilters";
         this.propertiesId = this.id + "viewproperties";

         this.layoutHref = '#' + this.layoutId;
         this.filtersHref = '#' + this.filtersId;
         this.propertiesHref = '#' + this.propertiesId;

         this.layoutTabId = this.id + "viewLayoutTabToggle";
         this.filtersTabId = this.id + "viewFiltersTabToggle";
         this.propertiesTabId = this.id + "viewPropertiesTabToggle";

         this.accessPermissionsName = this.id + "AccessPermissions";

         this.views = params.views;
         this.sorter = params.sorter;

         this.viewFieldLookupSource = params.viewFieldLookupSource;

         this.usedViewFilters = ko.computed(() =>
         {
            return this.views.selected() && this.views.selected().filters;
         });
      }

      getViewFieldLookupSource()
      {
         return this.viewFieldLookupSource;
      }

      getViewFilters()
      {
         return this.views.selected().filters;
      }

      updateViewFilters(items)
      {
         utils.pushApply(this.views.selected().filters, $.map(items, (filter) =>
         {
            return filters.buildFilter(filter, true);
         }));
      }

      removeViewFilter(item)
      {
         this.views.selected().filters.remove(item);
      }
   }
}