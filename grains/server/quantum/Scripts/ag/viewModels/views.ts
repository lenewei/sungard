/// <reference path="../../ts/global.d.ts" />
/// <reference path="../proxies/viewsProxy.ts" />
/// <reference path="../models/viewData.ts" />

module ag 
{

   export interface IViewsViewModel
   {
      canConfigue: KnockoutComputed<boolean>;
      canCopy: KnockoutComputed<boolean>;
      canDelete: KnockoutComputed<boolean>;
      canSave: KnockoutComputed<boolean>;
   }

   export class ViewsViewModel implements IViewsViewModel
   {
      //#region parameters

      all: any;
      hasAny: KnockoutComputed<any>;
      sorted: KnockoutComputed<any>;
      selected: KnockoutObservable<any>;
      selectedHasVisibleAppliedFields: KnockoutComputed<boolean>;
      selectedIsCrystal: KnockoutComputed<boolean>;
      selectedIsCrystalOrChart: KnockoutComputed<boolean>;
      selectedIsGrid: KnockoutComputed<boolean>;
      selectedIsPivot: KnockoutComputed<boolean>;
      selectedIsChart: KnockoutComputed<boolean>;
      selectedSortedBy: KnockoutComputed<any>;
      showConfigure: KnockoutObservable<any>;
      isConfigureLoaded = ko.observable(false);
      selectedViewTableName: KnockoutComputed<any>;

      canConfigue: KnockoutComputed<boolean>;
      canCopy: KnockoutComputed<boolean>;
      canDelete: KnockoutComputed<boolean>;
      canSave: KnockoutComputed<boolean>;

      afterViewLoaded: (v) => void;
      afterViewCreated: (v) => void;

      visibleColumns = ko.observableArray();
      selectedFields = ko.observableArray();
      viewKey: any;
      viewSelector: ViewSelectorViewModel;

      private proxy: ViewsProxy;

      //#endregion

      //#region constructor
      constructor(views: any, public viewTables: any, public typeName: string, public isLoading: KnockoutObservable<boolean>)
      {
         // Create the ViewsProxy (optionally for a given type)
         this.proxy = new ViewsProxy(typeName);

         // Map in the views - only the default view should be complete (have fields and filters etc.)
         this.all = ko.mapping.fromJS(views || [], {
            key: (item) =>
            {
               // Find by key method for mapping
               return ko.unwrap(item.key);
            },
            create: (options) =>
            {
               // Create ViewData objects - usually all will be 
               // "lite"(no fields or filters) other than the default view
               return ko.mapping.fromJS(new ViewData(options.data, true));
            }
         }) || ko.observableArray([]);

         var defaultView = this.getDefault();
         if (!defaultView)
            throw new Error("No default view appears to exist.");
    
         this.selected = ko.observable(defaultView);
    
         ko.computed(() =>
         {
            this.visibleColumns(this.calculateVisibleFields(this.selected()));
         });

         ko.computed(() =>
         {
            this.selectedFields(this.selected().fields());
         });

         this.hasAny = ko.computed(() =>
         {
            return this.all().length > 0;
         });

         this.sorted = ko.computed(() =>
         {
            return this.all.slice(0).sort(this.sortViews);
         });

         this.selectedIsCrystal = ko.computed(() =>
         {
            return this.selected() && this.selected().viewType() === ViewType.Crystal;
         });

         this.selectedIsCrystalOrChart = ko.computed(() =>
         {
            return this.selected() && (this.selected().viewType() === ViewType.Crystal || this.selected().viewType() === ViewType.Chart);
         });

         this.selectedIsGrid = ko.computed(() =>
         {
            return this.selected() && this.selected().viewType() === ViewType.DataView;
         });

         this.selectedIsPivot = ko.computed(() =>
         {
            return this.selected() && ko.unwrap(this.selected().viewType) === ViewType.Pivot;
         });

         this.selectedIsChart = ko.computed(() =>
         {
            return this.selected() && ko.unwrap(this.selected().viewType) === ViewType.Chart;
         });

         // Does the selected view have any visible applied fields
         this.selectedHasVisibleAppliedFields = ko.computed(() =>
         {
            // If the selected view is not a grid return
            if (!this.selectedIsGrid())
               return false;

            // Check there are any fields and make sure at least one is visible
            var fields = this.selected().appliedFields();
            return fields.length > 0 && _.any(fields, (item: any) => ko.unwrap(item.hidden) === false);
         });

         this.selectedSortedBy = ko.computed(() =>
         {
            if (!this.selected())
               return;

            return _.filter(this.selected().fields(), (field: any) =>
            {
               return field.sortStrategy() > 0;
            });
         });

         this.showConfigure = ko.observable(false).extend({ notify: "always" });
         this.showConfigure.subscribe(newValue =>
         {
            if (newValue)
               this.isConfigureLoaded(true);
         });

         this.viewTables = ko.mapping.fromJS(viewTables,
            {
               key: (item) =>
               {
                  return ko.unwrap(item.key);
               }
            });

         this.selectedViewTableName = ko.computed(() =>
         {
            var viewTableKey = ko.unwrap(this.selected()
               && this.selected().viewTableKey),
               viewTableName = "";

            $.each(this.viewTables(), (index, value) =>
            {
               var viewTable = ko.mapping.toJS(value);
               if (viewTable.key === viewTableKey)
               {
                  viewTableName = viewTable.name;
                  return false;
               }
            });

            return viewTableName;
         });

         this.canConfigue = ko.computed(() =>
         {
            if (this.selectedIsCrystal())
               return false;
            return true;
         });

         this.canCopy = ko.computed(() =>
         {
            return !this.selectedIsCrystal() && this.selected().key();
         });

         this.canDelete = ko.computed(() =>
         {
            return !this.selected().isSystem() && !this.selectedIsCrystal();
         });

         this.canSave = ko.computed(() =>
         {
            return !this.selectedIsCrystal();
         });       
         
         this.viewSelector = new ViewSelectorViewModel(this.sorted, this.viewTables, this.selectView);  
      }

      //#endregion

      public getSelectedViewSummary(filersViewModel:FiltersViewModel): string
      {
         var selected = ko.unwrap(this.selected);

         // If there is no selected view or selected view does not contain any filters
         // return an empty tooltip
         if (!selected || !selected.filters)
            return "";

         var array = _.map(ko.unwrap(selected.filters), (filter: FilterData) =>
         {
            return filter.getSummary(filersViewModel);
         });

         return array.join('\n');
      }


      private calculateVisibleFields(view)
      {
         if (!view)
            return [];

         return _.filter(view.appliedFields(), (field: any) => field.hidden() === false);
      }

      //#region private methods
      private sortViews(a: any, b: any)
      {
         var aIsSystem = ko.unwrap(a.isSystem),
            bIsSystem = ko.unwrap(b.isSystem),
            aName = ko.unwrap(a.name).toLowerCase(),
            bName = ko.unwrap(b.name).toLowerCase();

         if ((aIsSystem && !bIsSystem) || aName < bName)
         {
            return -1;
         }

         if ((bIsSystem && !aIsSystem) || aName > bName)
         {
            return 1;
         }

         return 0;
      }

      private getDefault()
      {
         // No view collection so return a default view
         if (this.all().length == 0)
         {
            return ko.mapping.fromJS(new ViewData({ name: "Default", key: "default", isDefault: true, isSystem: true }));
         }

         return _.find(this.all(), (view: any) =>
         {
            return view.isDefault();
         });
      }

      public saveTypeGridViewRequest(params): JQueryPromise<any>
      {
         return this.proxy.createView(params, null, HTTPType.POST).then((result) =>
         {
            ko.mapping.fromJS(new ViewData(result.data, true), this.selected());
         });
      }

      public createTypeGridViewRequest(params): JQueryPromise<any>
      {
         return this.proxy.createView(params).then((result) =>
         {
            var viewData = new ViewData(result.data, true);
            viewData.key = null;
            this.addUnsavedView(viewData);
         });
      }

      public editGridViewRequest(params): JQueryPromise<any>
      {
         return this.proxy.editView(this.selected().key(), params, HTTPType.POST).then((result) =>
         {
            ko.mapping.fromJS(new ViewData(result.data, true), this.selected());
         });
      }

      private addViewRequest(viewTableKey?: any, viewType = 0): JQueryPromise<any>
      {
         var params =
         {
            viewType: viewType
         };

         return this.proxy.createView(params, viewTableKey).then((result) =>
         {
            // Check for unique name
            var views = ko.mapping.toJS(this.all);
            result.data.name = utils.ensureUniqueName(result.data.name, views, "name");

            // Make observable
            var view = ko.mapping.fromJS(new ViewData(result.data));

            // Add the query to the queries collection
            this.all.push(view);

            // Update the selected view (we also need to update the editing view here as we're
            // not going to be navigating to an existing view which usually updates editingQuery).
            this.selected(view);

            if (this.afterViewCreated)
               this.afterViewCreated(view);

            // Show the Configuration area for the new View
            this.showConfigure(true);
         });
      }

      private deleteViewRequest(view: any): JQueryPromise<any>
      {
         // Can't delete the view if it is the system default
         if (view.isSystem())
         {
            messages.error(strings.defViewDelete);
            return;
         }

         var resetSelectedView = () =>
         {
            // If we are deleting the currently selected view
            // select a different view (the system default)
            if (view === this.selected() || view.clientKey() === this.selected().parentClientKey())
            {
               var systemDefault = _.find(this.all(), (view: any) =>
               {
                  // We may have just deleted the Default so select the System Default
                  return view.isSystem();
               });

               // Set the default flag back to true
               systemDefault.isDefault(true);

               this.setSelected(systemDefault);
            }
         };

         // Delete an unsaved view
         if (view.key() == null || view.key().length == 0)
         {            
            resetSelectedView();
            this.deleteChildViews(view);
            this.all.remove(view);
            return;
         }

         // Delete a saved view
         return this.proxy.deleteView(view.key()).then((result) =>
         {
            messages.success(result.message);
            resetSelectedView();
            this.deleteChildViews(view);
            this.all.mappedRemove({ key: view.key() });
         });
      }

      deleteChildViews(view: any)
      {
         if (view.clientKey() != null)
            this.all.remove((i) => view.clientKey() === i.parentClientKey());
      }

      //#endregion

      //#region public methods

      selectView = (view) =>
      {
         this.isLoading(true);
         this.setSelected(view).always(() =>
         {
            this.isLoading(false);
         });
      }

      setSelected(view: any, forceUpdate: boolean = false): JQueryPromise<any>
      {
         if (!view || $.isEmptyObject(view))
            throw new Error("view missing.");

         var key = view.key();
         
         // Access write permission on view
         this.viewAccessPermission(view);

         // Check if we are a new view with no key
         // could be multiple so need to allow selection
         if (isNullOrUndefined(key))
         {
            this.selected(view);
            return $.Deferred().resolve();
         }

         // If we are already on the view nothing to do
         if (key === this.selected().key() && !forceUpdate)
         {
            return $.Deferred().resolve();
         }

         // Check if we have already completed loaded the view
         if (ko.unwrap(view.isComplete))
         {
            this.selected(view);
            return $.Deferred().resolve();
         }

         // Reset all view to not default
         _.each(this.all(), (viewData: any) =>
         {
            viewData.isDefault(false);
         });

         // Set current view to default view
         view.isDefault(true);
         
         return this.proxy.editView(key, undefined, HTTPType.GET).then((result) =>
         {
            // Set the selected view to the mapped object and add to the local cache
            var mapped = ko.mapping.fromJS(new ViewData(result.data, true), view);
            this.selected(mapped);            

            if (this.afterViewLoaded)
               this.afterViewLoaded(mapped);
         });
      }
      
      viewAccessPermission(view: any)
      {
         // Check the Security By User Access Permission on view, if without writable permission then prompt message                                            
         var showMessage = (!ko.unwrap(view.hasWritePermission) && this.viewKey != ko.unwrap(view.key));

         if (showMessage && this.selectedIsGrid())         
            messages.show(strings.accessWrite.format("view", "resources", "private copy"), 2);            
         
         this.viewKey = ko.unwrap(view.key);
      }

      getViewRequest(key: any): JQueryPromise<any>
      {         
         return this.proxy.editView(key, undefined, HTTPType.GET).then((result) =>
         {                        
            return result.data;
         });         
      }

      toggleConfigure = () =>
      {
         this.showConfigure(!this.showConfigure());
      }

      findByKey(key: any)
      {
         if (!this.all())
            return undefined;

         return _.find(this.all(), (view: any) =>
         {
            return view.key() === key;
         });
      }

      displayText(item: any)
      {
         return item.displayName();
      }

      displayTitle(item: any)
      {
         var temp = item.displayName();
         var prefix = item.prefixName();
         if (prefix && prefix.length > 0)
         {
            temp = prefix + '.' + temp;
         }
         return temp;
      }

      add()
      {
         this.addViewRequest();
      }

      addPivot()
      {
         this.addViewRequest(undefined, 2);
      }

      addChart()
      {
         this.addViewRequest(undefined, 3);
      }

      addForViewTable(viewTable: any)
      {
         var viewTableJS = ko.mapping.toJS(viewTable);
         this.addViewRequest(viewTableJS.key);
      }

      addPivotForViewTable(viewTable: any)
      {
         var viewTableJS = ko.mapping.toJS(viewTable);
         this.addViewRequest(viewTableJS.key, 2);
      }

      addChartForViewTable(viewTable: any)
      {
         var viewTableJS = ko.mapping.toJS(viewTable);
         this.addViewRequest(viewTableJS.key, 3);
      }

      copy()
      {
         // Can only copy saved views
         if (this.selected().key() == null)
            return;

         var viewData = ko.mapping.toJS(this.selected);
         var views = ko.mapping.toJS(this.all);

         viewData.name = utils.ensureUniqueName(viewData.name, views, "name");
         viewData.key = null;
         viewData.isSystem = false;
         viewData.isDefault = false;
         viewData.isPersonal = true;
         viewData.hasWritePermission = true; 

         this.addUnsavedView(viewData);
      }

      // NOTE: Are this in use:
      //private getDefaultView(): any
      //{
      //   for (var i = 0; i < this.views.length; i++)
      //   {
      //      if (this.views[i].isSystem)
      //         return this.views[i];
      //   }
      //   return null;
      //}

      //private getAllHiddenFields(defaultViewFields: Array<any>): Array<any>
      //{
      //   var temp: Array<any> = [];
      //   for (var i = 0; i < defaultViewFields.length; i++)
      //   {
      //      var field = defaultViewFields[i];
      //      if (field.hidden)
      //         temp.push(field);
      //   }
      //   return temp;
      //}
      // /NOTE

      deleteSelected()
      {
         this.deleteView(this.selected());
      }

      deleteView(view: any)
      {
         // Not a system view and not a CrystalView
         if (!view.isSystem() && view.viewType() !== 1)
         {
            this.deleteViewRequest(view);
         }
      }

      update(newViews: any[], newViewTables: any[], forceUpdate: boolean = false, selectViewIdx: number = -1)
      {
         var keyedViewDataArr,
            viewToSelect;

         ko.mapping.fromJS(newViewTables, this.viewTables);
         
         // update views
         // ko.mapping.fromJS can't handle multiple views that has an empty key so insert those manually
         keyedViewDataArr = _.chain(newViews).filter((i) => i.key).map((i) => new ViewData(i, true)).value();
         ko.mapping.fromJS(keyedViewDataArr, this.all);
         _.each(newViews, (view, idx) =>
         {
            if (!view.key)
               this.all.splice(idx, 0, ko.mapping.fromJS(new ViewData(view, true)));
         });

         viewToSelect = (selectViewIdx >= 0 && selectViewIdx < this.all().length) ? this.all()[selectViewIdx] : this.getDefault();
         this.setSelected(viewToSelect, forceUpdate);
      }

      // Overwrite an exiting view.
      updateView(updatedView: any)
      {
         var view = _.find(this.all(), (item: any) =>
         {
            return item.key() === updatedView.key;
         });

         if (!view)
            return;

         ko.mapping.fromJS(new ViewData(updatedView, true), view);
      }

      private addUnsavedView(viewData: any)
      {
         var view = ko.mapping.fromJS(viewData);
         this.all.push(view);
         this.selected(view);
         this.showConfigure(true);
      }

      //  public getHiddenFields(): Array<any>
      //{
      //   return _.filter(this.selected().fields(), (item: any) =>
      //   {
      //      return item.hidden();
      //   } );
      //  }

      //#endregion

      applyViewRequest()
      {
         this.apply();
      }

      apply()
      {
         var view = ko.mapping.toJS(this.selected);
         filters.transformFilters(view.filters);

         return this.proxy.applyView(this.selected().key(), { view: view }).then((result) =>
         {
            this.showConfigure(false);
            messages.show(result.message, result.messageType);

            if (_.isArray(result.data.childViews))
               this.updateSelectedViewAndChildren(result.data);
            else
               this.updateSelectedView(result.data);
         });
      }

      updateSelectedView(data)
      {
         // Update the selected view (if it is a new view the client key should now be populated)
         ko.mapping.fromJS(new ViewData(data, true), this.selected());    
      }

      updateSelectedViewAndChildren(data)
      {
         this.deleteChildViews(this.selected());

         _.each(data.childViews, (i) =>
         {
            this.all.push(ko.mapping.fromJS(new ViewData(i, true)));
         });

         this.updateSelectedView(data.view);
      }
   }
}