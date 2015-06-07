
interface ISelectedItem
{
   key: string;
   displayName?: string;
   name?: string;
   hasChildren: boolean;
   isSelectedable: boolean;
   selected?: Function;

}

module ag.components
{
   export class ExplorerViewModel
   {
      self = this;
      initializing = true;
      doingInit = false;
      SEARCH_KEY_PREFIX = "search:";
      rootViewModel = this.options.rootViewModel

      mode = ko.observable(this.options.mode || "multi"); // "single" or "multi"
      lookupDisplayName = ko.observable(this.options.lookupDisplayName || strings.browse);
      itemKey = this.options.itemKey || "";
      view = ko.observable(ko.mapping.fromJS(this.options.view || { fields: [] }));
      parents = ko.observableArray<ISelectedItem>();
      emptyParent = { key: null, displayName: "", '__key__': null };
      items = ko.observableArray();
      source = this.options.source;
      saveCallback: Function = this.options.saveCallback;
      onCompletionCallback = null;
      requestDataCallback = this.options.requestDataCallback;
      initialRequestData = null;
      target = this.options.target;
      search = new SearchViewModel();
      initialValue = this.initialValue;
      loadListComputed: any;
      navigateToParent: any;
      updating = ko.observable(false);
      onBeforeSave = this.options.onBeforeSave;
      onAfterSave = this.options.onAfterSave;
      pager = new Pager({ updating: this.updating, pageSize: this.options.pageSize || 10, noItemsMessage: strings.noItems, activeSortColumns: ko.computed(this.getActiveSortColumns, this) });
      sorter = new SorterViewModel(null, true);

      viewExtension = new ExplorerViewModelViewExtension();

      constructor(public options: any)
      {
         this.view().displayFields = ko.computed(() =>
         {
            var fields = ko.unwrap(this.view().fields);

            // Remove fields that are marked as not displayable
            return fields.filter(field => !field.hidden);
         });

         this.view().fields.subscribe(() =>
         {
            this.viewExtension.buildDisplayDictionary(<Array<ViewFieldData>>this.view().fields());
         });

         this.throttledSearchQuery.subscribe(() =>
         {
            // Search query has changed so reset the paging
            this.pager.navigateToPage(1);

            // If the search query is empty, remove the last parent from the list
            // if it's a search.
            var searchText = this.search.text();
            if (!searchText || !searchText.trim())
            {
               if (this.parents().length > 0 && this.isSearchParent(this.parents().slice(-1)[0])) this.parents.pop();
            }
         });

         this.sorter.gridSortOn(options.sortOn || this.itemKey);

         this.loadListComputed = ko.computed(() =>
         {
            this.refreshList();
         },
            self).extend({ rateLimit: 1 });

         this.navigateToParent = (navParent) =>
         {
            // Find out where this parent is in the stack
            var parentIndex = -1;
            $.each(this.parents(), (ind, parent) =>
            {
               if (utils.getItemKey(parent) === utils.getItemKey(navParent))
               {
                  parentIndex = ind;
                  return false;
               }
               return true;
            });

            // If the new parent has no key field, make sure we reset the key on the immediate parent
            if (!utils.getItemKey(navParent))
               navParent['__key__'] = null;

            // Clear the search query and reset paging
            this.search.clear();
            this.pager.navigateToPage(1);

            // Pop all later parents off the stack.
            while (parentIndex + 1 < this.parents().length && this.parents().length > 0)
               this.parents.pop();

            // [AG 7/12/2012] We need to explicitly trigger a refresh here because we've removed the refreshList
            // dependency on parents.
            this.refreshList();
         }
      }

      isSearchParent(parent)
      {
         var key = utils.getItemKey(parent);
         return key && key.startsWith && key.startsWith(this.SEARCH_KEY_PREFIX);
      }

      navigableParents()
      {
         // Returns ag list of all except the last parent
         return this.parents().slice(0, -1);
      }

      immediateParent()
      {
         // Returns the last parent
         var immediateParent = this.parents().slice(-1);
         return immediateParent && immediateParent[0];
      }

      selectedItems = ko.mapping.fromJS([],
         {
            key: item => (utils.getItemKey(item) || '').toString()
         });

      throttledSearchQuery = ko.computed(this.search.text).extend({ rateLimit: 300 });
      keyFieldKey = null;
      collectionItemText = this.options.optionsText;
      collectionItemTitle = this.options.optionsTitle;

      getCollectionItemText(item)
      {
         return utils.getValueFromAccessor(item, this.collectionItemText) || item;
      }

      getItemsRequest(searchText)
      {
         // If we're in the process of initialising the lookup, pass in the initial value
         // so the lookup action can initialise the data if necessary
         var requestData =
            {
               searchText: encodeURIComponent(searchText),
               page: this.pager.page(),
               pageSize: this.pager.pageSize(),
               pageTargetsCenter: this.pager.pageTargetsCenter(),
               pageTargetsInnerSize: this.pager.pageTargetsInnerSize(),
               pageTargetsEdgeSize: this.pager.pageTargetsEdgeSize(),
               sortOn: this.sorter.gridSortOn(),
               sortDesc: this.sorter.gridSortDesc(),
               useCache: this.options.useCache,
               initialValue: this.doingInit ? (this.initialValue && ko.mapping.toJS(this.initialValue)) : null,
               parents: $.map(this.parents(), parent => utils.getItemKey(parent))
            };

         // Add sort options
         $.extend(requestData, this.sorter.sortOptions());

         // Provide any additional field values required. If additional field names have been specified,
         // they will be expected to exist on an object on the associated view model with the name specified in
         // the "data-prefix" attribute.
         $.extend(requestData, utils.getAdditionalFields(this.options.target, undefined, this.rootViewModel, this.options.viewModel));

         // Add any additional request data
         if (this.requestDataCallback)
            $.extend(requestData, this.requestDataCallback.call(this.rootViewModel));

         var additionalPayloadData = this.options.additionalPayloadData;
         if (additionalPayloadData)
            $.extend(requestData, { additionalData: ko.mapping.toJS(additionalPayloadData) });

         // Add any initial request data and then clear it (because we only want to provide this on the first
         // request after a reset).
         if (this.initialRequestData)
         {
            $.extend(requestData, this.initialRequestData);
            this.initialRequestData = null;
         }

         // Need include the typename if there is one for the 
         // typeview add filter button
         requestData = $.extend(requestData, {
            typename: this.options.viewModel && this.options.viewModel.views && this.options.viewModel.views.typeName
         });

         // About to request
         this.updating(true);

         // Fetch the data
         data.get(ko.unwrap(this.options.source), requestData, (result: any) =>
         {
            // Make sure there is some data to be displayed
            if (result.data && $.isArray(result.data))
               this.processLookup(result);

            // If we're in the process of initialising the lookup, flag that it has now been done.
            this.doingInit = false;

            // Done
            this.updating(false);
         });
      }

      parentsChanged(parents)
      {
         parents = parents || [];
         if (parents.length !== this.parents().length) return true;

         // Same number of parents so check to see if any keys don't match
         var changed = false;
         $.each(parents, (ind, item) =>
         {
            if (item.key !== utils.getItemKey(this.parents()[ind]))
            {
               changed = true;
               return false;
            }
            return true;
         });

         return changed;
      }

      processLookup(result)
      {
         // Add extra key field and text attributes to lookup data
         var lookup = utils.transformLookup(result);

         // [AG 18/10/2012] If the response wants to change the parent context it provides a parent
         // context. Otherwise, we assume that the parent context is unchanged. Also, we check that the
         // parents have actually changed before clearing and repopulating them to avoid a dependendent
         // observable loop.
         if (lookup.parents && this.parentsChanged(lookup.parents))
         {
            // Duplicate the parent display name as the __text__ property
            // to make it easier to navigate the parent structure
            lookup.parents = $.map(lookup.parents, parent => $.extend(parent, { '__text__': parent.displayName }));

            this.parents.removeAll();
            this.parents.push.apply(this.parents, ko.mapping.fromJS(lookup.parents)());
         }

         // If we don't have any parents currently and none were provided, throw an error.
         if (!lookup.parents && !this.parents())
            throw new Error("No parents were provided");

         // Clear the current lists
         this.items.removeAll();

         // Clear the fields collection
         this.view().fields.removeAll();

         // Add a dummy field to contain the selection state if this is a multiselect
         if (this.mode() === "multi")
         {
            this.view().fields.push({
               key: "selected",
               isKey: false,
               displayName: "",
               dataType: "checkbox",
               relativeSize: 1, /* x-small */
               sortable: false,
               hidden: false
            });
         }

         // Make sure we have at least one displayable field other than the selectable field (use the key
         // field if no other field is displayable).
         var displayableFields = 0;
         var keyField = null;

         _.each(lookup.fields, (field: any) =>
         {
            if (field.isKey)
            {
               keyField = field;
            }
            else
            {
               if (field.hidden === undefined)
                  field.displayable = true;
            }
            if (!field.hidden)
               displayableFields++;
         });

         if (displayableFields === 0 && keyField)
         {
            // No displayable fields so make our key field displayable
            keyField.hidden = false;
         }

         // Add the rest of the lookup fields
         this.view().fields.push.apply(this.view().fields, lookup.fields);

         // If the item is selectable, augment the lookup data with a "selected" property for rendering the selection status in the grid
         lookup.data = $.map(lookup.data, (item) =>
         {
            if (item.isSelectable !== undefined && !item.isSelectable) return item;

            var selected = this.selectedItems.mappedIndexOf({ '__key__': utils.getItemKey(item) }) >= 0;

            var newItem = $.extend(item, {
               selected: ko.observable(selected)
            });

            // Add a subscription for selecting/deselecting items based on the state of the selected observable
            newItem.selected.subscribe((newValue) =>
            {
               this.selectItem(item, newValue);
            });

            return newItem;
         });

         // Load the new items in one hit
         this.items.push.apply(this.items, lookup.data);

         // Update pager
         this.pager.updateFromResponse(result);

         // update search
         this.search.searchTerms(result.gridViewOptions.searchTerms);
      }

      refreshList()
      {
         // Observes changes to variables and invokes a request
         // when changes occur, with throttling enabled multiple
         // changes can be made and a single request will be made
         this.pager.page();
         this.pager.pageSize();
         this.pager.pageTargetsCenter();
         this.pager.pageTargetsEdgeSize();
         this.pager.pageTargetsInnerSize();
         this.sorter.gridSortOn();
         this.sorter.gridSortDesc();
         this.throttledSearchQuery();
         this.sorter.sortOptions();

         // First time the computed is evaluated we are simply 
         // initializing values and don't want to call getItems()
         if (this.initializing)
            return;

         // Load the items - needs to be wrapped in setTimeout to 
         // avoid new dependencies being added to this computed
         _.delay(() => { this.getItemsRequest(this.search.text()); }, 0);
      }

      getItemDisplayName(item)
      {
         return _.isObject(item) ? ko.unwrap(item['__text__']) : item;
      }

      isAll(item)
      {
         var displayName = this.getItemDisplayName(item);
         if (_.isString(displayName))
            return this.getItemDisplayName(item).toUpperCase() === 'ALL';

         return false;
      }

      selectItem(item, selected)
      {
         // Add or remove an item from selectedItems
         if (selected)
         {
            if (this.isAll(item))
               this.selectALLItem();
            else
               this.unselectALLItem();

            this.selectedItems.push(item);
         }
         else
         {
            this.selectedItems.mappedRemove({ '__key__': (utils.getItemKey(item) || '').toString() });
         }
      }

      selectALLItem()
      {
         // Clear bottom tooltips
         this.selectedItems([]);

         // A selected item might not be in the currently displayed set of lookup items. If it isn't
         // we need to remove it from the list of selected items directly.
         var tempItems = this.items();
         var tempSelectItems = ko.toJS(this.selectedItems);
         var tempItemsLength = tempItems.length;

         for (var i = 0; i < tempItemsLength; i++)
         {
            var tempItem = tempItems[i];
            if (this.isAll(tempItem))
               continue;

            (<any>tempItem).selected(false);
            this.selectedItems.mappedRemove({ '__key__': (utils.getItemKey(tempSelectItems[i]) || '').toString() });
         }
      }

      unselectALLItem()
      {
         // Unselect ALL from Table list
         _.each(this.items(), (selectedItem: any) =>
         {
            if (this.isAll(selectedItem))
            {
               if (!_.isString(selectedItem))
                  selectedItem.selected(false);

               return false;
            }
            return true;
         });

         // Unselect ALL from bottom tooltips
         if (_.contains(this.selectedItems(), "ALL"))
            this.selectedItems([]);
      }

      isSelected(item)
      {
         return this.selectedItems.mappedIndexOf({ '__key__': (utils.getItemKey(item) || '').toString() }) >= 0;
      }

      getParentItemDisplayName(item)
      {
         var obs = ko.mapping.toJS(item);
         return obs && _.isObject(obs) ? obs.displayName || obs['__text__'] : obs;
      }

      saveSelection(data, event)
      {
         // Hook for anything that needs to be done before saving the updated value(s)
         if (this.onBeforeSave)
            this.onBeforeSave();

         if (this.saveCallback)
         {
            // If a key field has been specified, make sure each returned item has this set from the lookup item key
            // (the lookup data might only have a single column which we're treating as the key)
            var items = ko.unwrap(this.selectedItems);
            if (this.options.keyField)
            {
               _.each(items, (item: any) =>
               {
                  // If the specified key already exists on the item (albeit in a different case) set
                  // it to the key value from the lookup item otherwise use the new key field.
                  var key = null;
                  if (_.isObject(item))
                  {
                     var keys = $.map(item, (val, prop) => prop);
                     var matchKey = this.options.keyField.toLowerCase();
                     key = _.find(keys, (itemKey: any) => itemKey.toLowerCase() === matchKey);

                     item[key || this.options.keyField] = utils.getItemKey(item);
                  }
               });
            }

            var completeModel = undefined;
            // If we're in single select mode, just return the first item.
            if (this.mode() === "multi")
            {
               if (this.options.includeCompleteModel)
               {
                  if (_.has(this.rootViewModel, "editingItem"))
                     completeModel = ko.mapping.toJS(this.rootViewModel.editingItem);
               }

               this.saveCallback.call(this.rootViewModel, items, event, completeModel);
            }
            else
            {
               // Single select mode so send the key of the first selected item if the callback is an observable and NOT an array,
               // otherwise just send the last selected item.
               var singleItem;

               if (ko.isObservable(this.saveCallback) && !$.isArray(this.saveCallback()))
               {
                  var itemObject = items[0];
                  singleItem = items.length > 0 && utils.getItemKey(itemObject);

                  // Update the UI hint directly from the lookup
                  if (this.hasHintToUpdate() && _.isObject(itemObject) && _.has(itemObject, this.options.hintSource))
                  {
                     var property = ag.getProperty(this.rootViewModel[this.options.prefix], this.options.hintTarget);
                     if (property) property(itemObject[this.options.hintSource]);
                  }
               }

               else
                  singleItem = items.slice(items.length - 1);

               // Update the observable
               this.saveCallback.call(this.rootViewModel, singleItem, event, this);
            }
         }

         // Hook for anything that needs to be done after saving the updated value(s)
         if (this.onAfterSave)
            this.onAfterSave();
      }

      private hasHintToUpdate(): boolean
      {
         if (!_.has(this.options, "hintSource") || !_.has(this.options, "hintTarget"))
            return false;

         if (!this.options.hintSource || !this.options.hintTarget)
            return false;

         return true;
      }

      iconFromType(viewModel)
      {
         // We are basing icons on the hasChildren property
         if (viewModel.hasChildren)
            return "has-children icon icon-folder-close";
         else
            return "";
      }

      getIconFieldKey()
      {
         // Get the first displayable field as the icon field (excluding the selectable field)
         var displayField = ko.utils.arrayFirst(this.view().displayFields(), (field: any) => field.key !== "selected");
         return displayField ? displayField.key : "";
      }

      formatGridCell(cellValue, viewModel, $element:JQuery, rowItem, viewModelName)
      {
         var cellFormatFunction = this.viewExtension.tryGetFunction(rowItem, viewModelName);

         var formattedCellValue = cellFormatFunction ? cellFormatFunction(viewModelName, rowItem, $element) : undefined,
            isSelectable = (rowItem.isSelectable === undefined || rowItem.isSelectable);

         // If this is the selector column, disable it if the row is not selectable
         if (viewModelName === "selected")
            return isSelectable ? undefined : '';

         cellValue = formattedCellValue ? formattedCellValue : cellValue;

         $element.data("cellDisplay", cellValue);

         // We only want to format the first displayable cell of rows with children
         var result = ko.unwrap(rowItem.hasChildren) && viewModelName === this.getIconFieldKey() ?
            "<a class='parent" + (isSelectable ? "" : " no-select") + "'><i class='icon icon-folder-close'></i></a>{0}".format(cellValue)
            : undefined;

         if (formattedCellValue && !result)
            return "<span>{0}</span>".format(cellValue);

         return result;
      }

      reset()
      {
         // Reset the state
         this.initializing = true;

         this.sorter.gridSortOn(this.options.sortOn || this.itemKey);
         this.sorter.gridSortDesc(false);
         this.pager.navigateToPage(1);
         this.pager.reset();
         this.items.removeAll();

         // [AG 26/2/2013] Had to add the test to prevent the target input field being cleared when transitioning from
         // an autocomplete to a multicolumn dialog.
         if (this.selectedItems && this.selectedItems().length > 0) this.selectedItems.removeAll();
         this.parents.removeAll();

         // Populate the initial request data

         if (this.options.initialRequestDataCallback)
            this.initialRequestData = this.options.initialRequestDataCallback.call(this.rootViewModel);
      }

      setOptions(opt: IExplorerOption)
      {
         this.options = opt;
      }

      init(initOpts)
      {
         if (initOpts)
            this.options = initOpts;

         this.doingInit = true;

         this.mode(this.options.mode); // "single" or "multi"
         this.lookupDisplayName(this.options.lookupDisplayName || strings.browse);
         this.itemKey = this.options.itemKey || "";
         this.source = this.options.source;
         this.saveCallback = this.options.saveCallback;
         this.requestDataCallback = this.options.requestDataCallback;
         this.target = this.options.target;
         this.collectionItemText = this.options.optionsText;
         this.collectionItemTitle = this.options.optionsTitle;
         this.sorter.gridSortOn(this.options.sortOn || this.itemKey);
         this.onBeforeSave = this.options.onBeforeSave;
         this.onAfterSave = this.options.onAfterSave;
         this.pager.pageSize(this.options.pageSize);
         this.initialValue = this.options.initialValue;

         // For each selected item, add our display and key fields using the optionsText bindings from the collection
         if (this.options.selectedItems)
         {
            var unwrappedItems = $.isFunction(this.options.selectedItems) ? ko.unwrap(this.options.selectedItems.call(this.rootViewModel)) : this.options.selectedItems;

            var updatedItems = $.map(unwrappedItems || [], (item) =>
            {
               if (item && _.isObject(item) && !item.__text__)
               {
                  $.extend(item, {
                     __text__: utils.getValueFromAccessor(item, this.collectionItemText)
                  });

                  // Extend each item with some helper methods for collections
                  if (this.options.keyField)
                  {
                     utils.addCollectionExtensionMethods(item, this.options.optionsText, this.options.optionsTitle, this.options.keyField);
                  }
               }
               return item;
            });

            // Populate the dialog selected items from the target items
            this.selectedItems.removeAll();
            ko.mapping.fromJS(ko.unwrap(updatedItems), {}, this.selectedItems);
         }

         // Refresh the list
         this.initializing = false;
         this.refreshList();
      }

      onHide()
      {
         if (this.options.onClose)
            this.options.onClose();

         this.search.clear();

         // Execute the on completion callback, which will typically do any selection saving after the dialog has destroyed
         if (this.onCompletionCallback)
         {
            // [AG 28/3/2013] This needs to be done in a timeout so that it executes immediately after the calling block has finished
            setTimeout(() =>
            {
               this.onCompletionCallback();
               delete this.onCompletionCallback;
            }, 0);
         }
      }

      beforeRemoveSelected = itemToRemove =>
      {
         // The item is being removed from the collection so set its selected status to false in the lookup data.
         _.each(this.items(), (item: any) =>
         {
            if (utils.getItemKey(item) === utils.getItemKey(itemToRemove))
            {
               item.selected(false);
               return false;
            }

            return true;
         });
      }

      sort(context)
      {
         if (context.$parent && context.$parent.sorter)
            context.$parent.sorter.sortColumn(ko.unwrap(context.$data.key));
      }

      processParentSelection(context)
      {
         var item = context.$data;

         if (item.hasChildren)
         {
            // If the clicked item has children, set it as the immediate parent and reset paging
            this.pager.navigateToPage(1);
            this.search.clear();

            // Push the selected item onto the parent stack, removing any non-navigable items (e.g., search parents) first
            _.each(this.parents(), parent =>
            {
               if (this.isSearchParent(parent))
               {
                  this.parents.remove(parent);
               }
            });

            this.parents.push(ko.mapping.fromJS(item));

            // [AG 7/12/2012] We need to explicitly trigger a refresh here because we've removed the refreshList
            // dependency on parents.
            this.refreshList();
         }
      }

      processItemSelection(context, event)
      {
         var item = context.$data;
         var itemIsSelectable = item.isSelectable === undefined || ko.unwrap(item.isSelectable);

         // If this is a non-selectable parent and we're in single select mode, navigate to it.
         if (item.hasChildren && !itemIsSelectable && this.mode() === "single")
         {
            this.processParentSelection(context);
            return { close: false };
         }

         // If the item is selectable (but not already selected),
         // add the selected item to the collection.
         if (itemIsSelectable)
         {
            if (this.mode() === "single" && !context.$root.isSelected(item))
            {
               this.selectedItems.push(item);
               this.onCompletionCallback = () =>
               {
                  this.saveSelection(item, event);
               };
               return { close: true };
            }
            else if (this.mode() === "multi")
            {
               item.selected(!item.selected());
               return { close: false };
            }
         }
      }

      private getActiveSortColumns()
      {
         // Explorer uses the SorterViewModel differently from Grid so I can't get the field from the sorter!
         // It would be great if we can standardize the behavior
         return _.filter(ko.unwrap(this.view().fields()), (i: any) => i.key === this.sorter.gridSortOn());
      }
   }
}