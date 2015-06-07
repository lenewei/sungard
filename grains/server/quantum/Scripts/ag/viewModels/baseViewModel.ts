module ag
{
   export class BaseViewModel implements IBaseViewModel
   {
      serviceUrl: string;
      lookupData: any;
      lookups: any;
      clonedLookupData: any;
      clonedLookups: any;
      nav: any;
      net: utils.Network;
      responseOnly: any;
      postOnly: any;
      filters: FiltersViewModel;
      filterOptions: any;
      errors = ko.observableArray();
      hasErrors = ko.observable(false);
      exportFileType = ko.observable("csv");
      typeMetaDataUrl: string;
      typeMetadata: Object;
      tabs: any = {};
      updatingModel: KnockoutComputed<boolean>;
      hasPendingChanges: KnockoutComputed<boolean>;
      hasPendingChangesInChildren: KnockoutComputed<boolean>;
      isDeactivated: KnockoutComputed<boolean>;
      activityId: any;

      breadcrumb: IBreadcrumb;
      isSearchMode = ko.observable(false);
      isEditorReadOnly = ko.observable(false);

      constructor(public options: IViewModelOptions)
      {
         options = this.getDefaultOptions(options);
         options.serviceUrl = ag.utils.normalizeUrl(options.serviceUrl);

         this.serviceUrl = options.serviceUrl;
         this.lookups = options.lookups || {};
         this.lookupData = options.lookupData || {};
         this.responseOnly = options.responseOnly;
         this.postOnly = options.postOnly;
         this.updatingModel = createUpdatingModelHelper();

         this.net = new utils.Network({ area: ag.area, controller: ag.controller, responseOnly: this.responseOnly, postOnly: this.postOnly });

         this.typeMetaDataUrl = options.typeMetaDataUrl;

         // Extend ourselves with lookups functionality
         ko.utils.extend(this, ag.lookups.createLookupsViewModel(options, this.lookups));

         // Take a copy of the lookup info so we can reset after filtering
         this.clonedLookups = $.extend(true, {}, this.lookups);
         this.clonedLookupData = $.extend(true, {}, this.lookupData);

         // Transform any named lookup references
         ag.utils.transformLookups(this.lookups, this.lookupData);

         // Initialise tabs
         if (options.tabs && options.tabs.length)
         {
            // formatted as tabs.tab1 and tabs.tab1.tabs.nestedTab1 
            $.each(options.tabs,(index, item) =>
            {
               // Get the parts without the first "tabs" segment
               var parts = item.split(".").slice(1);
               setProperty(this.tabs, parts.join("."), ko.observable(false));
            });
         }

         this.filterOptions = $.extend({}, options);
         this.filters = new FiltersViewModel(this.filterOptions);
         this.hasPendingChanges = ko.computed(() => { return false; });
         this.hasPendingChangesInChildren = ko.computed(() => { return false; });
         this.isDeactivated = ko.computed(() => { return false; });
         this.isEditorReadOnly(options.isReadOnly);

         // Subscribe to activity completion
         PubSub.subscribe(topics.ActivityCompleted, (topic, activityId) =>
         {
            // Any response with an activityId means there are some activities logged            
            if (!isNullUndefinedOrEmpty(activityId))
            {
               this.activityId = activityId;                        
               this.hasErrors(true);
            }
         });

         // Set the global viewModel for debugging purposes only
         ag.viewModel = this;
      }

      showExportDialog(): void
      {
         var $element = $('#exportDialog');
         $element.modal('show');
         $($("#exportDialog label:last")).show();
         this.exportFileType("csv");
      }

      resetLookups()
      {
         // Overwrite the current lookup state with the original (un-filtered state)
         // Must supply clones to the transformLookups method otherwise it squashes the referenced objects
         utils.transformLookups($.extend(true, {}, this.clonedLookups), $.extend(true, {}, this.clonedLookupData));
      }

      setupApplicationHeaders(data: any, applicationHeaders: any)
      {
         if (!applicationHeaders || $.isEmptyObject(applicationHeaders))
            return;

         utils.registerHeaderSetter((headers) =>
         {
            for (var property in applicationHeaders)
            {
               var value = ko.unwrap(getProperty(data, applicationHeaders[property]));
               if (!_.isNull(value) && !_.isUndefined(value))
                  headers[property] = value;
            }
         });
      }

      getDefaultOptions(options)
      {
         var result = options || {};
         result.serviceUrl = result.serviceUrl || ag.utils.getDefaultServiceUrl();

         return result;
      }

      initDependencies(editingItem: any)
      {
         // Dependencies needs to come last - after the model has completed initialising
         if (!$.isEmptyObject(this.options.dependencies))
            ag.dependencies.init(editingItem, this.options.dependencies, this.options, this);
      }

      // Export a Crystal Report to PDF
      exportCrystalReport(reportName)
      {
         utils.exportCrystalReport(this.serviceUrl, reportName, "all", ag.utils.getPageIdToken());
      }
      
      initNav()
      {
         if (!this.options.clientSideNavDisabled)
         {
            // Create the nav object
            this.nav = new NavHistory(
               {
                  params: this.navigateGetParams(),
                  onNavigate: (navEntry, navInfo) =>
                  {
                     this.silenceDependency(this.navigateDelegator, this, navEntry, navInfo);
                  }
               }).initialize({ linkToUrl: true });
         }
      }

      silenceDependency(fn: Function, context: any, ...args: any[]): JQueryDeferred<any>
      {
         var deferred = $.Deferred();

         this.updatingModel(true);
         var fnObj = fn.call(context, args, context);

         // Fn -> possible return a JQueryDeferred object
         // if so chain the event
         if (fnObj && _.isObject(fnObj) && _.has(fnObj, 'always'))
         {
            (<JQueryDeferred<any>>fnObj).always(() =>
            {
               this.updatingModel(false);
               deferred.resolve();
            });
         }
         else
         {
            this.updatingModel(false);
            deferred.resolve();
         }

         return deferred;
      }

      getCurrentURLparams(): string
      {
         if (!this.nav)
            return "";

         var temp = this.nav.params(),
            urlString = "";

         $.each(temp, (property, value) =>
         {
            if (value)
               urlString += encodeURI(property + "=" + value) + "&";
         });

         return urlString.substring(0, urlString.length - 1);
      }

     
      filterLookupUrl(filter: any, gridViewModel: GridViewModel, lookupAction: string, controller: string): string
      {
         var url = "{0}{1}/{2}/".format(ag.siteRoot, ag.area, controller || ag.controller),
            key = ko.unwrap(filter.key),
            isTypeViewFilter = gridViewModel.views && gridViewModel.views.typeName != null;

         if (!isTypeViewFilter)
         {
            lookupAction = lookupAction ? lookupAction : "viewfilterlookup";
            url += "{0}?fieldKey={1}".format(lookupAction, key);
         }
         else
         {
            url += "get{0}viewfilterlookup".format(key);
         }

         return url;
      }

      afterKeyBindingChangeCallbackFunction(): void
      {
      }

      // Virtual methods
      exportView(viewModel: IAppViewModel, event: JQueryEventObject): void
      {
         throw new Error("Derived class need override this method");
      }

      navigateGetParams(): any
      {
         throw new Error("Derived class need override this method");
      }

      navigateDelegator(args: any[], currrentContext: any)
      {
         throw new Error("Derived class need override this method");
      }
   }
}