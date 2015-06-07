module ag
{
   export class LazyDefinitionLoader
   {
      isLoaded: KnockoutComputed<boolean>;
      afterLoadCallback: Function;
      isLoading = ko.observable(false);
      gridsLoaded = false;

      constructor(public options: ILazyDefinitionLoaderOptions)
      {
         // Is definition loaded evaluation
         this.isLoaded = ko.computed(() =>
         {
            return options.headerKey() == options.definitionKey();
         });

         // Reset the gridsLoaded flag whenever isLoaded changes
         this.isLoaded.subscribe(() => this.gridsLoaded = false);

         // Subscribe to changes of the header key (new definition selected)
         options.headerKey.subscribe((newValue) =>
         {
            // This code caused the load
            if (this.isLoading())
               return;

            if (newValue > 0)
               // User selected a different definition
               // indicate loading and clear any grids
               this.isLoading(true);

            this.clearGrids();
         });

         // Subscribe to changes in active status (tab selected)
         options.active.subscribe((newValue) =>
         {
            if (!newValue)
               return;

            this.load(options.headerKey.valueHasMutated, this.isLoaded).then(() =>
            {
               this.loadGrids();
            }).then(() =>
            {
               if(this.options.afterLoadCallback)
                  this.options.afterLoadCallback();
            });
         });
      }

      private clearGrids()
      {
         if (!this.options.grids)
            return;

         $.each(this.options.grids, (index, gridTrigger) =>
         {
            // gridTrigger is usually a property used to trigger 
            // grid refreshes but could be a grid (cascading),
            // hence function checking object before invoking. 
            if (gridTrigger)
               if (gridTrigger.clear)
                  gridTrigger.clear();
               else if (gridTrigger.clearData)
                  gridTrigger.clearData();
         });
      }

      private loadGrids()
      {
         if (!this.options.grids || !ko.unwrap(this.options.active))
            return;

         this.refreshGrids();
      }

      private refreshGrids()
      {
         $.each(this.options.grids, (index, gridTrigger) =>
         {
            gridTrigger.refresh();
         });

         this.gridsLoaded = true;
      }

      private load(loader: Function, isLoaded: Function): JQueryPromise<any>
      {
         var deferred = $.Deferred<any>();

         // If we have already loaded and the grids have been loaded reject 
         // the promise otherwise resolve it (and allow the grids to load)
         if (isLoaded())
         {
            this.isLoading(false);
            return this.gridsLoaded ? deferred.reject() : deferred.resolve();
         }

         // Inidicate we are loading and call the load function
         if (!this.isLoading())
         {
            this.isLoading(true);
            loader();
         }

         // Poll the isLoaded funcion and 
         // when true resolve the promise
         var interval = window.setInterval(() =>
         {
            if (isLoaded())
            {
               window.clearInterval(interval);

               // Loading complete, resolve our promise
               this.isLoading(false);
               deferred.resolve();
            }
         },
            100);

         // Return our promise
         return deferred.promise();
      }
   }
}