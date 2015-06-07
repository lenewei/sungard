module ag
{
   export class HierarchicalViewModel extends StaticDataViewModel implements IHierarchicalViewModel
   {
      groupKey: string;
      currentParentKeyValue: string;
      hierarchicalGroupName: string;
      unapprovedPrefix = "unapproved-";

      membersGrid: GridViewModel;
      copyMode: HierarchicalCopyMode;
      isUnapprovedApplication: KnockoutComputed<boolean>;
      
      isGroup = ko.observable(false);
      breadcrumbViewModel: BreadcrumbViewModel;
      diagramViewModel: HierarchicalDiagramViewModel;

      menuCommands: IHierarchicalMenuCommand;

      constructor(public options)
      {
         super(options);

         this.groupKey = options.groupKey;
         this.hierarchicalGroupName = options.hierarchicalGroupName;
         this.diagramViewModel = new HierarchicalDiagramViewModel(this);
         
         this.isUnapprovedApplication = ko.computed(() =>
         {
            return window.location.pathname.indexOf(this.unapprovedPrefix) != -1;
         });
      }

      afterApplyBindings()
      {
         if (this.options.hasHierarcicalDiagram)
         {
            this.actions.getHierarchicalDiagram["createCustomPayload"] = () =>
            {
               var getLastParent = () =>
               {
                  var last = _.last(this.breadcrumb.parents());
                  return { name: (<any>last).name() };
               }

               if (this.isNewItem())
                  return getLastParent();

               if (this.isGroup())
                  return { name: this.editingItem.name() };
               else
                  return getLastParent();
            };
         }
      }

      init(itemModel)
      {
         super.init(itemModel);

         this.membersGrid = this.grids.members;
         if (this.membersGrid)
         {
            this.membersGrid.getCellLinks = (context: KnockoutBindingContext) =>
            {
               if (ko.unwrap(context.$data.key) === "name")
                  return ['<a href="#" data-bind="click: $root.navigateToMember.bind($root), attr: { href: $root.navigateToMemberUrl($data) }"></a>'];

               return [];
            };
         }

         this.canSaveItem = ko.computed(() =>
         {
            return !(this.isUnapproved && this.isNewItem()) && !this.isDeletedItem() && !ko.unwrap(this.isRoot);
         });

         // calculate if there is a pending changes children
         this.hasPendingChangesInChildren = ko.computed(() =>
         {
            if (!this.membersGrid)
               return false;

            if (!this.membersGrid.items)
               return false;

            var t = _.find(this.membersGrid.items(),(item: any) => { return item.hasPendingChanges; });

            return t != undefined;
         });

         this.breadcrumbViewModel = new BreadcrumbViewModel(this.breadcrumb);
      }

      createMenuCommands()
      {
         super.createMenuCommands();

         this.menuCommands.saveCommand = ko.asyncCommand({
            execute: (complete) =>
            {
               this.saveItem().then(() =>
               {
                  this.hidePageMenuItemSave();
               }).always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && !this.isNewItemNeedingApproval();
            }
         });

         this.menuCommands.saveGroupCommand = ko.asyncCommand({
            execute: (complete) =>
            {
               this.saveItem().always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && !this.isNewItemNeedingApproval();
            },
            isVisible: () =>
            {
               return this.breadcrumb.currentItemIsGroup() && !ko.unwrap(this.isRoot);
            }
         });

         // Override the copy command execute
         this.menuCommands.copyCommand.execute = (complete) =>
         {
            // Set the copy mode
            this.copyMode = HierarchicalCopyMode.Item;
            this.copyItem().always(complete);
         };

         this.menuCommands.copyGroupCommand = ko.asyncCommand({
            execute: (complete) =>
            {
               this.copyMode = HierarchicalCopyMode.Group;
               this.copyItem().always(complete);
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.canCopyItem();
            },
            isVisible: () =>
            {
               return this.breadcrumb.currentItemIsGroup() && !this.isUnapproved && !ko.unwrap(this.isRoot);
            }
         });

         this.menuCommands.saveAndNewCommand = ko.asyncCommand({
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
               return !this.isGroup();
            }
         });

         this.editingItem.groupTransactor.subscribe(() =>
         {
            this.isGroup(this.editingItem.groupTransactor() == GroupTransactor.Group);

            if (this.isGroup())
               this.isSaveAndNewMode(false);
         });
      }

      copyItemVisible()
      {
         return !this.breadcrumb.currentItemIsGroup();
      }

      navigateToParent()
      {
         // Due to there are few applications have two different key binding modes between item and group
         // We can not use navigateToItem generically determine which key navigation method to follow
         // this.navigateToItem((<any>_.last(ag.viewModel.breadcrumb.parents())).name());

         // Temp until two key binding mode resolved.
         dom.hierarchicalNavigateToParent();
      }

      navigateToMemberUrl(data)
      {
         var navKey = this.getEditingItemNavKey(data, this.editPropertyFields, this.editProperty);
         return this.getApprovedServiceUrl() + '?' + this.getKeyQueryString(navKey);
      }

      navigateToGroupUrl(viewModel)
      {
         var groupKey = this.groupKeyValue(viewModel);
         _.each(groupKey,(value, key) =>
         {
            if (value == null) delete groupKey[key];
         });
         return this.getApprovedServiceUrl() + '?' + this.getKeyQueryString(groupKey);
      }

      getApprovedServiceUrl(): string
      {
         if (ag.serviceUrl.indexOf(this.unapprovedPrefix) != -1)
            return ag.serviceUrl.replace(this.unapprovedPrefix, "");

         return ag.serviceUrl;
      }

      getKeyQueryString(key)
      {
         return _.isString(key) ? "edit=" + key : _.map(key,(v, k) => k + '=' + v).join('&');
      }

      navigateToMember(data, event: JQueryEventObject)
      {
         if (dom.isPop(event))
         {
            dom.encodeLinkHref(event);
            return true;
         }

         var key = this.translateEditingItemKeyToListKey(this.getModelSubset(data, this.editProperty));
         this.editItem(key);
      }

      loadItem(result, isNewItem: boolean): JQueryDeferred<any>
      {
         var deffered = super.loadItem(result, isNewItem);
         this.updateBreadcrumb(result);
         this.hidePageMenuItemSave();

         return deffered;
      }

      updateBreadcrumb(result)
      {
         if (result.breadcrumb)
         {
            ko.mapping.fromJS(result.breadcrumb, {}, this.breadcrumb);
            var lastParent = _.last(this.breadcrumb.parents());
            var parent = !lastParent ? undefined : (<any>lastParent).name();
            this.breadcrumbViewModel.reset(parent);
         }
      }

      editGroupFromBreadcrumb(viewModel, _, e: JQueryEventObject)
      {
         if (dom.isPop(e))
            return true;

         if (this.isUnapprovedApplication())
            return true;

         this.navigateToItem(this.groupKeyValue(viewModel));
      }

      groupKeyValue(viewModel)
      {
         var id = ko.unwrap(viewModel.id),
            keyValue: any = id,
            groupKey = this.groupKey;

         if (groupKey)
         {
            keyValue = { edit: true };
            keyValue[groupKey] = id;

            _.each(this.editPropertyFields,(f: string) =>
            {
               if (f != groupKey)
               {
                  keyValue[f] = null;
               }
            });
         }

         return keyValue;
      }

      moveItem(items: ISelectedItem[], event, model: ag.components.ExplorerViewModel)
      {
         var location = this.breadcrumbViewModel.getNewLocation(items, event, model);
         if (!location) return;
         this.editingItem.parentGroup(location.isRoot ? 'None' : location.name);
      }

      createItemGroup(): JQueryPromise<any>
      {
         this.cacheCurrentParentKeyValue();

         this.beforeSendCreateItemRequest();

         // Create Item
         return this.createGroupRequest();
      }

      updateCreateItemParams(params)
      {
         this.updateParamsWithParentData(params, false);
         this.breadcrumb.currentItem.name("");
      }

      updateParamsWithParentData(params, isGroup: boolean)
      {
         if (!this.breadcrumb)
            return;

         params = $.extend(params, { parentGroup: this.currentParentKeyValue });
         params.isGroup = isGroup;
      }

      itemRequest(action, params, isNewItem, byPOST: boolean = false): JQueryPromise<any>
      {
         return super.itemRequest(action, params, isNewItem, byPOST).done(() =>
         {
            if (isNewItem && _.has(params, "isGroup"))
               this.resetPageTitleAndBreadcrumbCurrentItem(params.isGroup);

            this.currentParentKeyValue = "";
         });
      }

      createGroupRequest(): JQueryPromise<any>
      {
         var params: any = {};
         this.updateParamsWithParentData(params, true);

         return this.itemRequest("create", params, true);
      }

      createCopyRequestParams(): any
      {
         var params: any = {};
         this.updateParamsWithParentData(params, this.copyMode == HierarchicalCopyMode.Group);

         return $.extend({}, ko.mapping.toJS(this.editingItem), params);
      }

      copyItem(): JQueryPromise<any>
      {
         this.cacheCurrentParentKeyValue(true);
         return super.copyItem();
      }

      resetPageTitleAndBreadcrumbCurrentItem(isGroup: boolean)
      {
         var title = "{0} {1}".format(strings.newLabel, isGroup ? this.hierarchicalGroupName : this.applicationTitle);
         this.breadcrumb.currentItem.name(title);
      }

      createItem(refreshGrid = false): JQueryPromise<any>
      {
         this.cacheCurrentParentKeyValue();
         return super.createItem(refreshGrid);
      }

      requestNewItem(): JQueryPromise<any>
      {
         if (this.isGroup())
            return this.createItemGroup();

         return this.createItem();
      }

      cacheCurrentParentKeyValue(fromCopy: boolean = false, prefix: string = "name")
      {
         if (fromCopy)
            this.currentParentKeyValue = this.editingItem.parentGroup();
         else if (this.isGroup() && !this.isNewItem())
            this.currentParentKeyValue = ko.unwrap(this.breadcrumb.currentItem[prefix]);
         else
            this.currentParentKeyValue = this.getLastParentName(<Array<Object>>ko.unwrap(this.breadcrumb.parents), prefix);

         // Reset currnet parent to empty if in the contents folder
         if (this.currentParentKeyValue == "All" || this.currentParentKeyValue == "Contents")
            this.currentParentKeyValue = "";
      }

      private getLastParentName(parents: Array<Object>, prefix: string = "name"): string
      {
         var length = parents.length,
            temp = <any>parents[length - 1];

         return temp ? temp[prefix]() : "";
      }

      private hidePageMenuItemSave(): void
      {
         if (this.breadcrumb.currentItemIsGroup())
            $("#pageMenuItemSave").hide();
      }
   }

   export class InstrumentHierarchicalViewModel extends HierarchicalViewModel
   {
      afterKeyBindingChangeCallbackFunction():void
      {
         if (!this.isNewItem())
            return;

         if (!_.isEmpty(ko.unwrap(this.editingItem.description)))
            return;
            
         this.editingItem.description(ko.unwrap(this.editingItem.name));
      }
   }
}