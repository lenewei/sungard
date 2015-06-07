module ag 
{
   export class AppViewModel extends BaseViewModel implements IAppViewModel
   {
      static EditMode =
      {
         Insert: 0,
         Update: 1
      };

      static SaveMode =
      {
         Save: 0,
         SaveAndNew: 1
      };

      editPropertyName = "edit";

      actions: any;
      browseEditors = {};
      canDeleteItem = ko.observable(false);
      canSaveItem: KnockoutComputed<boolean>;
      watcherChanged = ko.observable(false);
      editAction: string;
      editingItem: any = {};
      editProperty: string;
      editPropertyFields: any;
      editUrl: string;
      // Browse grid
      grid: BrowseGridViewModel;
      // Sub grids which belong to this app
      grids: any = {};
      initialModel: any = {};
      isDeletedItem = ko.observable(false);
      isNewItem = ko.observable(true);
      isUnapproved: boolean;
      itemKey: string;
      itemKeyFields: string[];
      //items = ko.observableArray();
      itemSaved: any = null;
      itemTypeIsDeal = ko.observable(false);
      keyFields: string[];
      fieldCategories: any;
      viewFieldLookupSource: string;
      views: ViewsViewModel;
      applicationTitle = utils.documentTitle();
      pageTitle = ko.observableArray([{ "keyProperty": strings.newLabel + " " + utils.documentTitle() }]).extend({ rateLimit: 200 });
      dialogOKCommand: KoliteAsyncCommand;
      dialogSaveCommand: KoliteAsyncCommand;
      dialogCancelCommand: KoliteCommand;
      originalKeyStore: any = {};
      copyOriginalKeyCallBack: Function;
      menuCommands: IAppMenuCommand = <any>{};
      actionToInvoke: string;
      actionInvoked = false;
      isSaveAndNewMode = ko.observable(false);
      primarySaveButtonText: KnockoutComputed<string>;
      isSaving: KnockoutComputed<boolean>;
      browseColumnsUseAlphanumSorting: Array<string>;

      // options:
      // itemKey      	- name of the Key Property on the Item (may be single or multipart)
      // editProperty	- name of the Property to use when sending single-part key edit requests (optional, defaults to itemKey if not supplied)
      // serviceUrl  	- base Url of the Service to call when retrieving, editing, and listing Items
      // saveMessage 	- a message to display when an Item is successfully saved, typically comes from server
      // lookups     	- array of lookups passed from the server
      // lookupData  	- array of lookup data

      constructor(public options: IAppViewModelOptions)
      {
         super(options);

         this.itemKey = options.itemKey;
         this.editProperty = options.editProperty || options.itemKey;
         this.viewFieldLookupSource = "/{0}/{1}".format(options.serviceUrl, "getviewfields");
         this.editAction = options.editAction || "edit";
         this.isUnapproved = options.isUnapproved || false;

         // Referenced by bindings 
         this.editUrl = "/{0}/{1}".format(this.serviceUrl, this.editAction);

         this.itemKeyFields = this.itemKey.split(",");
         this.editPropertyFields = this.editProperty.split(",");
         this.keyFields = options.keyFields || [];
         this.fieldCategories = options.fieldCategories || {};
         this.actionToInvoke = options.actionToInvoke;
         this.browseColumnsUseAlphanumSorting = options.browseColumnsUseAlphanumSortingString ? options.browseColumnsUseAlphanumSortingString.split(',') : [];



         // Add a grid view model to all app view models
         if (!options.noBrowseGrid)
         {
            this.grid = this.createGridViewModelForBrowse(options);
            this.views = this.grid.views;
         }
         //ko.utils.extend(this, this.createGridViewModelForBrowse(options));

         // Create dialog commands should only 
         // really be done when in dialog mode
         this.createDialogCommands();

         this.primarySaveButtonText = ko.computed(() =>
         {
            return this.isSaveAndNewMode() ? strings.saveAndNew : strings.save;
         }).extend({ rateLimit: 200 });

         PubSub.subscribe(topics.ApplyWatcherValue,() =>
         {
            this.watcherChanged(false);
         });
         PubSub.subscribe(topics.WatcherValueChanged,() =>
         {
            this.watcherChanged(true);
         });
      }

      private createDialogCommands()
      {
         // The OK command does not attempt to save, it simply 
         // returns the current ViewModel to the opener
         this.dialogOKCommand = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  // This should do a validate of the form
                  // need to extract this out of (this.net).validateAndPostJson
                  // ...

                  if (window.opener && (<any>window.opener).ag && (<any>window.opener).ag.childWindowClosing)
                  {
                     (<any>window.opener).ag.childWindowClosing(this, null, false, window);

                     _.defer(() =>
                     {
                        window.close();
                        complete();
                     });
                  }
               }
            });

         // The Save command saves the deal and if successful closes
         // the window, otherwise the window remains open for the user to 
         // view any errors that were produced. When saved successfully the
         // window closes immediately and the messaage is returned to the opener 
         // to be displayed.
         this.dialogSaveCommand = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  // Save the deal
                  this.saveItem().done((result) =>
                  {
                     // Then close the window and return the result to the opener
                     if (window.opener && (<any>window.opener).ag && (<any>window.opener).ag.childWindowClosing)
                     {
                        (<any>window.opener).ag.childWindowClosing(this, result, true, window);

                        //Give the window some time to display messages and clear fields. 
                        //Should be triggered by the item being cleared rather than a timer
                        setTimeout(() => _.defer(() => { window.close(); }), 3000);

                        return false;
                     }
                  }).always(complete);
               }
            });

         this.dialogCancelCommand = ko.command(
            {
               execute: () =>
               {
                  window.close();
               }
            });
      }

      resetEditor(triggerProperty?)
      {
         // Clear any existing data
         var prop,
            resetValues;

         this.hasErrors(false);

         // Clear any errors on screen
         messages.clearError();

         if (this.editingItem)
         {
            // Restore initial values, optionally keeping the current value of the
            // specified trigger property
            prop = triggerProperty && getProperty(this.editingItem, triggerProperty);
            if (prop)
            {
               resetValues = $.extend({}, this.initialModel);
               setProperty(resetValues, triggerProperty, ko.unwrap(prop));
            }
            else
            {
               resetValues = this.initialModel;
            }

            // Reset item and clear validation
            this.mapJsToEditingItem(resetValues);
         }

         // Re-set the title
         utils.documentTitle(this.applicationTitle);
         this.pageTitle([{ "keyProperty": this.isUnapproved ? "" : strings.newLabel + " " + utils.documentTitle() }]);
      }

      saveItem(clearAfter = false): JQueryPromise<any>
      {
         // Post to Create or Edit
         var action = this.isNewItem() ? "create" : this.editAction;
         this.isSaveAndNewMode(clearAfter);

         return this.net.validateUnmapAndPostJson(action, this.editingItem)
            .done((result: any) => 
         {
            this.saveItemDone(result, clearAfter);
         })
            .fail((reasons: any) =>
         {
            this.saveItemFail(reasons);
         });
      }

      public saveItemDone(result: any, clearAfter: boolean)
      {
         messages.show(result.message, result.messageType);

         // Callback if set
         if (this.itemSaved && _.isFunction(this.itemSaved))
            this.itemSaved(result);

         if (clearAfter)
         {
            // Navigate to "new"
            this.createItem(true);
         }
         else
         {
            this.loadItem(result, false);
            this.navigateToItem(this.getEditingItemNavKey(this.editingItem, this.editPropertyFields, this.editProperty,(v) => v));
            this.refreshGrids(this.grids);
         }
      }

      public saveItemFail(reasons: any)
      {
         if (!reasons)
            return;

         // Exception encountered
         var errorMessages = utils.getErrorsFromResponse(reasons[0]);

         // There is no error messages returned (eg Confirmation Action) so don't 
         // set the "hasErrors" observable value for MessageLog button
         if (errorMessages !== undefined)
         {
            this.hasErrors(true);
            this.errors.removeAll();
            this.errors.push.apply(this.errors, errorMessages);
         }
      }

      private refreshGrids(grids)
      {
         _.each(grids,(g: GridViewModel) =>
         {
            if (_.isFunction(g.refresh))
            {
               g.refresh();
            }
            else
            {
               this.refreshGrids(g);
            }
         });
      }

      private refreshBrowseGrid()
      {
         if (this.grid)
         {
            this.grid.refresh();
         }
      }

      navigateToEmptyItem()
      {
         this.navigateToItem(this.navigateGetParams());
      }

      navigateToItem(keyValue: any)
      {
         if (!this.nav)
            return;

         if (!$.isPlainObject(keyValue))
         {
            var obj = {};
            obj[this.editPropertyName] = keyValue;
            this.nav.navigate(obj);
         }
         else
            this.nav.navigate(keyValue);
      }

      navigateToView(viewKey: string)
      {
         this.nav && this.nav.navigate({ view: viewKey });
      }

      loadItem(result, isNewItem: boolean): JQueryDeferred<any>
      {
         return this.silenceDependency(() =>
         {
            var resultData = result.data,
               resultLookups = result.lookups;

            if (isNewItem)
               this.resetEditor();

            // Select the first visible tab 
            dom.resetTabs();

            // Reset the lookups that may have been filtered
            this.resetLookups();

            // Update any lookups found in the result
            if (resultLookups)
               utils.transformLookups(resultLookups.propertyLookupReferences, resultLookups.lookups);

            // Update the view model
            this.mapJsToEditingItem(resultData);
            this.isNewItem(isNewItem);
            this.isDeletedItem(this.editingItem.deleted ? this.editingItem.deleted() : false);
            this.canDeleteItem(!isNewItem && !this.isDeletedItem());
            this.setSaveAndNewMode();

            // Update any grids
            if (resultData)
            {
               this.updateGrids(resultData);
               this.updateBrowseEditors(resultData);
            }

            if (this.copyOriginalKeyCallBack)
               this.copyOriginalKeyCallBack(isNewItem, this);

            this.invokeAction();

            PubSub.publish(topics.ApplyWatcherValue);
         }, this);
      }

      private setSaveAndNewMode()
      {
         if (this.isNewItemNeedingApproval())
            this.isSaveAndNewMode(true);
      }

      private invokeAction()
      {
         if (this.actionInvoked)
            return;

         if (this.actionToInvoke)
         {
            _.each(this.menuCommands,(command: any) =>
            {
               var commandId = command.id ? command.id.toLowerCase() : '',
                  actionToInvoke = this.actionToInvoke ? this.actionToInvoke.toLowerCase() : '';
               if (commandId === actionToInvoke && command.isVisible() && command.canExecute())
               {
                  command.execute(this);
                  return;
               }
            });
         }

         this.actionInvoked = true;
      }

      updateStatus(): void
      {
         this.isNewItem(true);
         this.isDeletedItem(false);
      }

      private resetEditingItemKey(): void
      {
         $.each(this.editPropertyFields,(index, prop) =>
         {
            this.editingItem[prop](null);
         });
      }

      public translateEditingItemKeyToListKey(editingItemKey)
      {
         return this.translateKey(editingItemKey, this.itemKeyFields);
      }

      private translateItemKeyToEditProperty(itemKey)
      {
         return this.translateKey(itemKey, this.editPropertyFields);
      }

      private translateKey(fromFields, toFields)
      {
         var translatedKey = {},
            index = 0;

         _.each(fromFields,(item) =>
         {
            translatedKey[toFields[index++]] = item;
         });

         return translatedKey;
      }

      private updateBrowseEditors(data) 
      {
         if (!$.isEmptyObject(this.browseEditors))
         {
            $.each(this.browseEditors,(property, browseEditorViewModel: BrowseEditorViewModel) =>
            {
               var item = getProperty(data, property);
               if (item)
                  browseEditorViewModel.updateEditingItem(item);
            });
         }
      }

      private updateGrids(data)
      {
         updateGrids(data, this.grids);
      }

      // Mixin for grid functionality
      private createGridViewModelForBrowse(options): any
      {
         var gridOptions: any = $.extend({}, options);
         gridOptions.loadImmediately = gridOptions.loadImmediately || false;
         gridOptions.pageSize = 20;
         gridOptions.noItemsMessage = strings.noItems;

         var grid = new BrowseGridViewModel(gridOptions, this);

         grid.views.selected.subscribe((newValue) =>
         {
            this.navigateToView(newValue.key());
         });

         // getItems override
         grid.getItems = (params, query?) =>
         {
            return this.loadListItemsRequest(query);
         };

         return grid;
      }

      private loadListItemsRequest(query): JQueryPromise<any>
      {
         var params = {},
            action = "list{0}".format(query);

         return this.net.getJson(action, params).then((result) =>
         {
            this.grid.loadGridData(result);
         });
      }

      // To be overridden
      deleteItemRequest(key): JQueryPromise<any>
      {
         // Post to Delete
         return this.net.postJson("delete", key).then((result) =>
         {
            // Success
            messages.show(result.message, result.messageType);

            // Navigate to "new"
            this.createItem(true);
         });
      }

      createItemRequest(): JQueryPromise<any>
      {
         var params: any = {};

         this.updateCreateItemParams(params);

         return this.itemRequest("create", params, true);
      }

      updateCreateItemParams(params)
      {
      }

      editItemRequest(key: any): JQueryPromise<any>
      {
         var params = $.extend({}, key);

         return this.itemRequest(this.editAction, params, false);
      }

      itemRequest(action, params, isNewItem, byPOST: boolean = false): JQueryPromise<any>
      {
         return this.net[byPOST ? "postJson" : "getJson"](action, params).done((result) =>
         {
            this.loadItem(result, isNewItem);
         });
      }

      getDefaultOptions(options)
      {
         var defaultOptions = super.getDefaultOptions(options);
         defaultOptions.itemKey = defaultOptions.itemKey || "";

         return defaultOptions;
      }

      init(itemModel, ...args: any[])
      {
         this.initialModel = $.extend({}, itemModel);
         this.editingItem = mapFromJStoMetaObservable(itemModel, this.isEditorReadOnly);
         this.initGrids();
         this.initBrowseEditors();
         dom.initHtmlParts(this);
         this.setupApplicationHeaders(this.editingItem, this.options.applicationHeaders);
         this.initDependencies(this.editingItem);
         this.initNav();
         utils.focusForm();

         var itemEditable = ko.observable(true);
         if (this.options.itemEditable)
         {
            var itemEditableFlag = utils.getObjectFromPath(this.editingItem, this.options.itemEditable);
            if (itemEditableFlag && ko.isObservable(itemEditableFlag))
            {
               itemEditable = itemEditableFlag;
            }
         }

         this.canSaveItem = ko.computed(() =>
         {
            return itemEditable() && !(this.isUnapproved && this.isNewItem()) && !this.isDeletedItem();
         });

         this.isEditorReadOnly(!this.canSaveItem());
         this.canSaveItem.subscribe(newValue =>
         {
            this.isEditorReadOnly(!newValue);
         });

         this.createMenuCommands();
         this.setSaveAndNewMode();

         this.hasPendingChanges = ko.computed(() =>
         {
            return !this.isNewItem() && utils.calculateComputedBasedOnProperty("hasUnapprovedChanges", this);
         });

         this.isDeactivated = ko.computed(() =>
         {
            return utils.calculateComputedBasedOnProperty("deactivated", this);
         });

         if (this.grid != undefined)
            this.grid.sorter.columnsNeedToUseAlphanumSort = this.browseColumnsUseAlphanumSorting;
      }

      createMenuCommands()
      {
         var menuCommands = this.menuCommands;
         menuCommands.saveCommand = ko.asyncCommand({
            execute: (complete) =>
            {
               this.saveItem().always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && !this.isNewItemNeedingApproval();
            }
         });

         menuCommands.defaultSaveCommand = ko.asyncCommand({
            execute: (complete) =>
            {
               this.saveItem(this.isSaveAndNewMode()).always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting;
            }
         });

         menuCommands.saveAndNewCommand = ko.asyncCommand({
            execute: (complete) =>
            {
               this.saveItem(true).always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting;
            },
            isVisible: () =>
            {
               return true;
            }
         });

         menuCommands.copyCommand = ko.asyncCommand({
            execute: (complete) =>
            {
               this.copyItem().always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.canCopyItem();
            },
            isVisible: () =>
            {
               return this.copyItemVisible();
            }
         });

         this.isSaving = ko.computed(() =>
         {
            return this.menuCommands.saveCommand.isExecuting() ||
               this.menuCommands.defaultSaveCommand.isExecuting() ||
               this.menuCommands.saveAndNewCommand.isExecuting();
         });
      }

      canCopyItem()
      {
         return this.canSaveItem() && !this.isNewItem();
      }

      copyItemVisible()
      {
         return true;
      }

      isNewItemNeedingApproval()
      {
         return this.isNewItem() && this.isNeedingApproval();
      }

      isNeedingApproval()
      {
         var isAutoApprovalOn = this.editingItem.isAutoApprovalOn;
         return isAutoApprovalOn && !ko.unwrap(isAutoApprovalOn);
      }

      initGrids()
      {
         // Create GridViewModels for each typeMetadata key
         var typeMetadata = this.options.typeMetadata || {};
         if (typeMetadata && !$.isEmptyObject(typeMetadata))
         {
            this.options.typeMetaDataUrl = utils.normalizeUrl(this.options.typeMetaDataUrl);

            // Create GridViewModels as required
            createGridViewModelsFromMetadata(this, typeMetadata, this.editingItem, this.options, this.isEditorReadOnly);
         }
      }

      initBrowseEditors()
      {
         createBrowseEditors(this, this.options.browseEditors, this.editingItem);
      }

      getModel()
      {
         return this.editingItem;
      }

      beforeSendCreateItemRequest(refreshGrid: boolean = false)
      {
         this.updateStatus();

         if (refreshGrid)
            this.refreshBrowseGrid();

         // Clear any current navigation state
         this.navigateToItem(this.navigateGetParams());
      }

      requestNewItem(): JQueryPromise<any>
      {
         return this.createItem(true);
      }

      createItem(refreshGrid = false): JQueryPromise<any>
      {
         // Before send request, it could be required for caching exsiting record,
         // clear the URL, etc.
         this.beforeSendCreateItemRequest(refreshGrid);

         // Send request
         return this.createItemRequest();
      }

      editItem(itemViewModel)
      {
         var params = this.getEditingItemNavKey(itemViewModel);
         this.navigateToItem(params);
      }

      copyItem(): JQueryPromise<any>
      {
         return this.copyItemRequest("copy");
      }

      copyAndApply(): JQueryPromise<any>
      {
         return this.copyItemRequest("copyandapply");
      }

      createCopyRequestParams(): any
      {
         return $.extend({}, ko.mapping.toJS(this.editingItem));
      }

      copyItemRequest(action): JQueryPromise<any>
      {
         // Clone an existing object, maybe it is unnecessary to do this.
         var params = this.createCopyRequestParams();

         this.navigateToEmptyItem();

         return this.itemRequest(action, params, true, true).done(() =>
         {
            this.silenceDependency(() =>
            {
               // Update states
               this.updateStatus();
            }, this);
         });
      }

      refreshItem(): JQueryPromise<any>
      {
         // Reload the editing item
         var key = this.getModelSubset(this.editingItem, this.editProperty);

         if (!key)
            return;

         this.editItemRequest(key);
      }

      deleteItem(): JQueryPromise<any>
      {
         var key = this.getModelSubset(this.editingItem, this.editProperty);

         return this.deleteItemRequest(key);
      }

      getModelSubset(model, properties)
      {
         var subset = {};
         $.each(properties.split(","),(index, prop) =>
         {
            setProperty(subset, prop, getProperty(model, prop));

            // Translate enum value into string
            var porpValue = ko.unwrap(subset[prop]);
            if (ag.lookups.lookupData && _.isNumber(porpValue) && _.has(ag.lookups.lookupData, prop))
            {
               var data = _.find(ko.mapping.toJS(ag.lookups.lookupData[prop]["data"]),(enumData: any) =>
               {
                  if (enumData.value == porpValue)
                  {
                     return true;
                  }
               });
               subset[prop] = data.text;
            }
         });
         return ko.mapping.toJS(subset);
      }

      getEditingItemNavKey(model, keyFields?, key?, translateFn?)
      {
         keyFields = keyFields || this.itemKeyFields;
         key = key || this.itemKey;
         translateFn = translateFn || this.translateItemKeyToEditProperty;

         // Used to get a navigation key from a selected browse list item
         // If this is a single-part key app, use the "?edit={keyvalue}" scheme otherwise the "?key1=val1&key2=val1...&edit=true" scheme
         return !keyFields || keyFields.length == 1 ?
            ko.unwrap(model[key]) :
            $.extend({ edit: true }, translateFn.call(this, this.getModelSubset(model, key)));
      }

      isKeyEqual(key1, key2)
      {
         // We're assuming the keys are objects with the same 
         // properties that might have different values.
         var match = true;

         $.each(key1,(property) =>
         {
            var tempMatch,
               value1 = key1[property],
               value2 = key2[property],
               moment1 = moment.fromISO(value1),
               moment2 = moment.fromISO(value2),
               areValidDates = moment1.isValid() && moment2.isValid()
                  && moment1.withinValidDateRange() && moment2.withinValidDateRange();

            if (areValidDates)
               tempMatch = moment1.isEqual(moment2);
            else
               tempMatch = value1 == value2;

            if (!tempMatch)
            {
               match = tempMatch;
               return false;
            }
         });

         return match;
      }

      viewNavigation(viewKey: string)
      {
         if (!viewKey)
            return;

         var views = this.grid.views;
         if (views.selected() && views.selected().key() !== viewKey)
         {
            var view = views.findByKey(viewKey);
            if (view)
               views.selected(view);
         }
      }

      setPageTitle(viewModel, requestedItemKey)
      {
         // Set the title
         var keyString = "";
         viewModel.pageTitle.removeAll();

         $.each(requestedItemKey,(index, item) =>
         {
            // Attempt to parse as date
            if (dates.isDateISO8601Format(item))
            {
               var date = moment.fromISO(item);
               if (date.isValid())
                  item = date.toEditor();
            }

            if (item.length > 0)
            {
               keyString += (keyString.length > 0) ? " - " + item : item;
               viewModel.pageTitle.push({ "keyProperty": item });
            }
         });

         // Check the value of keyString is number
         var reg = /^\d+$/;
         if (reg.test(keyString))
         {
            viewModel.pageTitle([{ "keyProperty": utils.documentTitle(viewModel.applicationTitle, keyString) }]);
         }
         else
         {
            keyString += " -";
            utils.documentTitle(keyString, viewModel.applicationTitle);
         }
      }

      showGridExportDialog(gridViewModel:GridViewModel, event:JQueryEventObject): void
      {
         ko.contextFor(event.target).$root.exportFileType("csv");
         var $element = $('#exportDialog');
         $element.modal('show');
         $($("#exportDialog label:last")).hide();
         $element.data("gridViewModel", gridViewModel);
      }

      exportView(viewModel:IAppViewModel, event:JQueryEventObject): void
      {
         var $element = $('#exportDialog'),
            gridViewModel = <GridViewModel>$element.data("gridViewModel");
         
         if (gridViewModel)
         {
            $element.removeData("gridViewModel");
            this.exportIndividualGrid(gridViewModel);
         }
         else
         {
            this.exportMainGrid();
         }
      }

      private exportIndividualGrid(gridViewModel: GridViewModel): void
      {
         var url = "/{0}/{1}export".format(this.options.serviceUrl, gridViewModel.options.action),
            params =
            {
               gridExportOptions:
               {
                  typefullname: gridViewModel.options.typeName,
                  viewKey: gridViewModel.views.selected().key(),
                  format: this.exportFileType(),
                  filename: document.title + " - " + gridViewModel.options.name
               },
               options: gridViewModel.getGridViewOptions(),
               data: ag.utils.cleanJSForRequest(ko.mapping.toJS(this.editingItem), this.net.responseOnlyProperties, this.net.postOnlyProperties)
            };

         downloadInvoker.invoke(url, params);  
      }

      private exportMainGrid(): void
      {
         var url = "/{0}/exportview".format(this.options.serviceUrl),
            params =
            {
               typefullname: "",
               viewKey: this.grid.views.selected().key(),
               format: this.exportFileType(),
               title: this.applicationTitle,
               options: this.grid.getGridViewOptions()
            };

         downloadInvoker.invoke(url, params);
      }

      itemSelected(items)
      {
         if (!items || !items.length)
            return;

         this.navigateToItem(this.getEditingItemNavKey(items[0]));
      }

      tidyUpExistingElements(requestedItemKey, currentEditingItemKey)
      {
         if (this.isKeyEqual(requestedItemKey, currentEditingItemKey))
            return;

         // Clear any existing data and form validation
         this.resetEditor();

         // Request the selected item
         this.editItemRequest(requestedItemKey);

         // We've just selected a new item so close the browse list, if any
         this.grid.showList(false);
      }

      mapJsToEditingItem(newValue: any)
      {
         ko.mapping.fromJS(newValue, this.editingItem);
         ag.utils.resetValidation(this.editingItem);
      }

      // To notify all subscribers we are updating the view model
      publishViewModelUpdatingEvent(isUpdatingViewModel: boolean)
      {
         PubSub.publishSync(ag.topics.UpdatingViewModel, { value: isUpdatingViewModel, viewModel: this });
      }

      // LoadAndNavigate
      loadItemThenNavigate(result: any, navObj: any, resetEditor: boolean = true, resetPageTitle: boolean = false)
      {
         this.silenceDependency(() =>
         {
            if (resetEditor)
               this.resetEditor();
            this.loadItem(result, false);
            this.navigateToItem(navObj);
            if (resetPageTitle)
               this.setPageTitle(this, navObj);

            messages.clear();
         }, this);

         this.clearTheRefreshWrapper(this.grids);
      }

      private clearTheRefreshWrapper(grids)
      {
         _.each(grids,(g: GridViewModel) =>
         {
            if (_.isFunction(g.clearTheRefreshWrapper))
            {
               g.clearTheRefreshWrapper();
            }
            else
            {
               this.clearTheRefreshWrapper(g);
            }
         });
      }

      // Toggle the status of the browse grid
      public toggleBrowseGrid()
      {
         this.grid.toggle();
      }

      navigateGetParams(): any
      {
         // Set up the item key fields for navigation
         // If this is a single-part key field, use the editProperty instead.
         // editProperty translates selected browse list columns specified by itemKey so needs to have a matching number of values
         if (this.editProperty && this.itemKey && this.editProperty.split(",").length != this.itemKey.split(",").length)
         {
            throw new Error("Item key and edit property need to have a matching number of delimited values, ItemKey: {0} EditProperty: {1}"
               .format(this.itemKey.split(","), this.editProperty.split(',')));
         }

         var keyParams = {};

         // TODO: perhaps use a single key scheme of "?key1=val1...&edit=true"?
         if (this.editPropertyFields.length > 1)
         {
            $.each(this.editPropertyFields,(index, field) =>
            {
               keyParams[field] = null;
            });
         }
         $.extend(keyParams, { edit: null, view: null, isGroup: null });

         return keyParams;
      }

      navigateDelegator(args: any[], currrentContext: any): void
      {
         var navEntry = args[0];

         var existingKeyValue = navEntry.params[this.editPropertyName];

         if (existingKeyValue)
         {
            // If we are a single-part key app, the edit parameter will contain
            // the key value.
            var currentEditingItemKey = this.getModelSubset(this.editingItem, this.editProperty),
               requestedItemKey = {};

            if (this.editPropertyFields.length == 1)
               requestedItemKey[this.editProperty] = existingKeyValue;
            else
               requestedItemKey = this.getModelSubset(navEntry.params, this.editProperty);

            this.tidyUpExistingElements(requestedItemKey, currentEditingItemKey);

            this.setPageTitle(currrentContext, requestedItemKey);
         }
         else
         {
            this.navigateDelegatorForNewMode();
         }

         this.viewNavigation(navEntry.params.view);
      }

      navigateDelegatorForNewMode()
      {
         this.resetEditor();
         this.actionInvoked = true;
         this.isNewItem(true);
      }
   }
}