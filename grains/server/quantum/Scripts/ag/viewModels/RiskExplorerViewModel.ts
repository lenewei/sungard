/// <reference path="../helpers/dom.ts" />
/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../helpers/lookups.ts" />
/// <reference path="../models/messagesViewModel.ts" />
/// <reference path="sorter.ts" />
/// <reference path="groupEditor.ts" />
/// <reference path="gridViewModel.ts" />

module ag
{
   "use strict";

   export interface IRiskExplorerViewModelOption
   {
      currentId: number;
      folderURL: string;
      itemKey: string;
      listMetaData: {};
      serviceUrl: string;
      typeMetaDataUrl: string;
      queryURL: string;
      applicationTitle: string;
      rootTitle: string;
   }

   export class RiskExplorerGridHelper
   {
      isSelected = ko.observable(false);
      selected: JQuery;

      constructor(public selectableType: string = "Query")
      {
         ko.utils.registerEventHandler($("#queryExplorerGridTable tbody"), "click", (event: JQueryEventObject) =>
         {
            var clickedRow,
               $target = $(event.target);

            if ($target.is("tr"))
               clickedRow = $target;
            else
               clickedRow = $target.closest("tr");

            this.selectRow(clickedRow);
         });
      }

      selectRow(tr: JQuery): void
      {
         if (!tr)
            return;

         if (this.selected && tr[0] == this.selected[0])
         {
            this.deselectRow();
         }
         else
         {
            this.deselectRow();
            if (!this.isSelectable(tr))
               return;
            this.setSelectRow(tr);
         }
      }

      deselectRow(): void
      {
         if (!this.selected)
            return;

         this.selected.removeClass("selected");
         this.setSelectRow(undefined);
      }

      isSelectable(tr: JQuery): boolean
      {
         if (tr && tr[0] !== undefined)
            return ko.unwrap(ko.dataFor(tr[0]).itemType) == this.selectableType;
         return false;
      }

      setSelectRow(tr: JQuery)
      {
         this.selected = tr;
         this.isSelected(tr !== undefined);

         if (tr)
            tr.addClass("selected");
      }

      selectedRowViewModel(): any
      {
         return ko.dataFor(this.selected[0]);
      }
   }

   export class RiskExplorerViewModel
   {
      actions: any;
      nav: any;
      net = new ag.utils.Network();
      itemKey: string;
      folderURL: string;
      queryURL: string;
      items = ko.observableArray();
      currentId: number = 0;
      breadcrumb: any = ko.observable();
      typeMetaDataUrl: string;
      initialiseFinish: boolean = false;

      // Command
      newGroupCommand: KoliteCommand;
      newGroupCommandOptions: any;
      deleteGroupCommand: KoliteCommand;
      deleteGroupCommandOptions: any;
      saveGroupCommand: KoliteCommand;
      saveGroupCommandOptions: any;
      exportCommand: KoliteCommand;
      exportCommandOptions: any;
      runAllCommand: KoliteCommand;
      runAllCommandOptions: any;
      runCommand: KoliteCommand;
      runCommandOptions: any;

      group: GroupEditorViewModel;
      editingGroup: any;
      isGroup = ko.observable(false);
      isGroupEditable: KnockoutComputed<any>;
      isNewGroup: KnockoutComputed<any>;
      isSearchMode: KnockoutComputed<boolean>;
      isRoot: KnockoutComputed<boolean>;
      isNewItem = ko.observable(false);

      // Main Explorer Grid
      grid: GridViewModel;
      gridHelper: RiskExplorerGridHelper;
      gridHelperIsSelected = ko.observable(false);

      hasErrors = ko.observable(false);
      breadcrumbViewModel: BreadcrumbViewModel;

      constructor(public options: IRiskExplorerViewModelOption)
      {
         options = this.getDefaultOptions(options);
         options.serviceUrl = ag.utils.normalizeUrl(options.serviceUrl);

         this.folderURL = options.folderURL;
         this.queryURL = options.queryURL;
         this.itemKey = options.itemKey || "";
         this.currentId = options.currentId;
         this.grid = this.createGridViewModelForBrowse($.extend(options, { hasDependentColumns: true }));
         this.typeMetaDataUrl = options.typeMetaDataUrl;

         this.gridHelper = new RiskExplorerGridHelper("Query");
         this.gridHelperIsSelected = ko.observable(this.gridHelper.isSelected());

         this.isNewGroup = ko.computed(() =>
         {
            return this.group && this.group.current && this.group.current.id() === 0;
         }, this, { deferEvaluation: true });

         // You can not modify root folder.
         this.isGroupEditable = ko.computed(() =>
         {
            // new group should always be editable
            if (ko.unwrap(this.isNewGroup()))
               return true;

            var breadcrumb = ko.unwrap(this.breadcrumb);
            if (!_.has(breadcrumb, "parents"))
               return false;

            var factor = this.isSearchMode() ? -1 : 0;

            return breadcrumb.parents().length + factor > 0;

         }, this, { deferEvaluation: true });

         this.isSearchMode = ko.computed(() =>
         {
            var breadcrumb = ko.unwrap(this.breadcrumb);
            if (!breadcrumb || !_.has(breadcrumb, "currentItem"))
               return false;

            return breadcrumb.currentItem.id() == 0;
         });

         // Actions commands
         this.newGroupCommandOptions =
         {
            canExecute: () => { return !this.isNewGroup(); },
            execute: () => { this.newGroup(); },
         };

         this.saveGroupCommandOptions =
         {
            canExecute: (isExecuting) => { return !isExecuting && this.isGroupEditable(); },
            execute: (completed) => { this.saveItem().always(completed); }
         };

         this.deleteGroupCommandOptions =
         {
            canExecute: (isExecuting) => { return !isExecuting && !this.isNewGroup() && this.isGroupEditable(); },
            execute: (completed) => { this.deleteItem().always(completed); }
         };

         this.exportCommandOptions =
         {
            canExecute: () => { return !this.isNewGroup() && this.isGroupEditable(); },
            execute: () => { this.exportView(); }
         };

         this.runAllCommandOptions =
         {
            canExecute: () => { return true; },
            execute: () => { this.runAll(); }
         };

         this.runCommandOptions =
         {
            canExecute: () =>
            {
               return this.gridHelper.isSelected();
            },
            execute: () =>
            {
               window.open(this.queryURL.format(this.gridHelper.selectedRowViewModel().id) + "&autorun=true");
            }
         }

         this.group = new ag.GroupEditorViewModel(options);
         this.editingGroup = null;

         ag.viewModel = this;

         this.breadcrumbViewModel = new BreadcrumbViewModel(this.breadcrumb);
      }

      init(result: any)
      {
         this.explorerGridViewDataResponseHandler(result);

         // Initialise group commands (that rely on data structure)
         this.deleteGroupCommand = ko.asyncCommand(this.deleteGroupCommandOptions);
         this.saveGroupCommand = ko.asyncCommand(this.saveGroupCommandOptions);
         this.newGroupCommand = ko.asyncCommand(this.newGroupCommandOptions);
         this.exportCommand = ko.asyncCommand(this.exportCommandOptions);
         this.runAllCommand = ko.asyncCommand(this.runAllCommandOptions);
         this.runCommand = ko.asyncCommand(this.runCommandOptions);

         this.initNav();
         this.initialiseFinish = true;

         this.isRoot = ko.computed(() =>
         {
            var breadcrumb = ko.unwrap(this.breadcrumb);

            if (!breadcrumb)
               return false;

            if (breadcrumb.parents && ko.unwrap(breadcrumb.parents).length > 0)
               return false;

            return true;
         });
      }

      loadGridData(result: any): void
      {
         this.grid.loadGridData(result, true);
      }

      // Explort content
      exportView()
      {
         downloadInvoker.invoke(ag.serviceUrl + "/exportContent", ko.mapping.toJS(this.editingGroup));
      }

      getModel()
      {
         return this.editingGroup;
      }

      getCurrentItemName()
      {
         if (this.breadcrumb())
            return this.breadcrumb().currentItem.name();
      }

      // explorer call back
      getParentContext()
      {
         return { parentId: this.currentId };
      }

      // select item
      itemSelected(params)
      {
         var temp = params[0];
         if (temp.itemType === "Query")
            navigate(this.queryURL.format(temp.id));
         else
            this.nav.navigate(temp);
      }

      // navigate to new query item
      navigateToNewItem(type: string): void
      {
         var link = this.queryURL.replace('query={0}', '') + 'parentid={0}&querytype={1}'.format(this.currentId, type);
         navigate(link);
      }

      // server side handlers
      addSelectedContentToGroup(selected): JQueryPromise<any>
      {
         $.each(selected, (index, value) =>
         {
            value.parentId = this.currentId;
            value.name = value.getDisplayName();
         });

         return this.group.addSelectedContentToGroup(selected).done((result) =>
         {
            this.resultHandler(result, strings.folderUpd);
         });
      }

      moveToGroup(selected): JQueryPromise<any>
      {
         $.each(selected, (index, value) =>
         {
            value.parentId = this.currentId;
         });

         return this.group.move(selected).done((result) =>
         {
            this.resultHandler(result, strings.folderUpd);
         });
      }

      newGroup(): JQueryPromise<any>
      {
         // Group mode
         this.isGroup(true);

         // If on a new group return the parent Id, otherwise return the id of the current editing group
         return this.group.create(this.editingGroup.id()).done(
            (result) =>
            {
               this.resultHandler(result);
            });
      }

      deleteItem(): JQueryPromise<any>
      {
         return this.group.remove(ko.mapping.toJS(this.editingGroup)).done(
            (result) =>
            {
               this.resultHandler(result, strings.folderDel);
            });
      }

      saveItem(): JQueryPromise<any>
      {
         return ag.utils.validateAndShowMessages(this.editingGroup)
            .then(() =>
            {
               return this.group.save(ko.mapping.toJS(this.editingGroup), this.isNewGroup())
                  .done((result) =>
                  {
                     this.resultHandler(result, strings.folderSaved);
                  });
            });
      }

      editGroupFromBreadcrumb(viewModel): void
      {
         var id = viewModel[this.itemKey](),
            params = { id: id };

         // if the breadcrumb current item id == 0, means it's under search mode
         // so we just need to clear the search text, it will simply navigate us 
         // to the current item
         if (this.isSearchMode() && this.nav.current().params.id == id)
            this.grid.search.clear();
         else
            this.nav.navigate(params);
      }

      editItem(itemViewModel, anchorTarget: boolean, event: JQueryEventObject)
      {
         if (dom.isPop(event))
            return true;

         var id = $(event.target).data("id");
         if (id)
         {
            if (this.nav.current().params.id == id)
               this.grid.search.clear();

            this.nav.navigate({ id: id });
            return false;
         }

         if (this.navigateToWorksheet(itemViewModel))
            return false;

         if (itemViewModel[this.itemKey])
            this.nav.navigate({ id: itemViewModel[this.itemKey] });

         // Important to do this and stop event propagation
         return false;
      }

      runAll()
      {
         this.net.postJson("runAll", { id: this.currentId || 0 }).done((result) =>
         {
            this.resultHandler(result);
         });
      }

      iconFromType(viewModel)
      {
         // We are basing icons on the "type" property of the item
         var iconType = viewModel.itemType;

         if (iconType === "Query")
            return "";
         else if (iconType === "Folder")
            return "icon-folder-close";
         else
            return "";
      }

      navigateToWorksheet(viewModel)
      {
         // In case the row was clicked and is worksheet (a tag click will do this anyway)
         var isWorksheet = viewModel.itemType === "Query";
         if (isWorksheet)
            navigate(this.queryURL.format(viewModel.id));

         // Allow natural link navigation if a worksheet 
         return isWorksheet;
      }

      formatter(cellValue, viewModel, elm, rowItem, columnName)
      {
         var html = cellValue,
            isQuery = rowItem.itemType === "Query",
            path = isQuery ? this.queryURL.format(rowItem.id) : this.folderURL.format(rowItem.id);

         switch (columnName)
         {
            case "name":
               html = "<a href=\"{0}\">{1}</a>".format(path, cellValue);
               break;
            case "lastRunTime":
               if (cellValue)
                  html = "<a {0} href=\"{1}&report={2}\">{3}</a>".format(
                     "data-bind=\"timeago: '{0}'\"".format(cellValue), path, rowItem.reportId, cellValue);
               break;
            case "path":
               html = "<a data-id=\"{0}\" href=\"{1}\">{2}</a>".format(
                  rowItem.parentId, this.folderURL.format(rowItem.parentId), cellValue);
               break;
         }

         return html;
      }

      initNav()
      {
         this.nav = new NavHistory(
            {
               params: { id: 0 },
               onNavigate: (navEntry) =>
               {
                  this.gridHelper.setSelectRow(undefined);

                  var id: number = parseInt(navEntry.params.id);

                  if (!id && this.isNewGroup())
                  {
                     this.currentId = 0;
                     return;
                  }
                  else if (id !== this.currentId)
                  {
                     this.grid.search.clear();
                     this.currentId = id;
                     this.getItemsRequest(id);
                  }
               }
            }).initialize({ linkToUrl: true });
      }

      navigateToGroupUrl(viewModel)
      {
         return ag.serviceUrl + '?id=' + ko.unwrap(viewModel.id);
      }

      // Mixin for grid functionality
      private createGridViewModelForBrowse(options): any
      {
         var gridOptions: any = $.extend(options, {
            loadImmediately: true,
            pageSize: options.pageSize,
            noItemsMessage: strings.noItems
         }),
            grid = new GridViewModel(gridOptions);

         grid.getItems = (params) =>
         {
            return this.getItemsRequest($.extend({ id: this.nav.current().params.id }, params));
         };

         return grid;
      }

      private getDefaultOptions(options)
      {
         var result = options || {};
         result.serviceUrl = result.serviceUrl || ag.utils.getDefaultServiceUrl();
         result.itemKey = result.itemKey || "";
         return result;
      }

      private getItemsRequest(id): JQueryPromise<any>
      {
         // prevent any ajax communications if page is still in loading mode
         if (!this.initialiseFinish)
            return $.Deferred().resolve();

         return this.net.getJson("list", $.isPlainObject(id) ? id : { id: id || 0 })
            .done((result) =>
            {
               this.explorerGridViewDataResponseHandler(result);

               this.setPageTitle();
            }).always(() =>
            {
               this.initialiseFinish = true;
            });
      }

      private setPageTitle()
      {
         var title;
         if (this.isRoot())
         {
            title = this.options.rootTitle;
         }
         else if (this.isSearchMode())
         {
            var parents = this.breadcrumb().parents();
            if (parents.length > 1)
               title = "{0} - {1} - {2}".format(this.getCurrentItemName(), (<any>_.last(this.breadcrumb().parents())).name(), this.options.applicationTitle);
            else
               title = "{0} - {1}".format(this.getCurrentItemName(), this.options.applicationTitle);
         }
         else
         {
            title = "{0} - {1}".format(this.getCurrentItemName(), this.options.applicationTitle);
         }

         document.title = title;
      }

      private explorerGridViewDataResponseHandler(explorerGridViewDataResponse: any)
      {
         if (explorerGridViewDataResponse.breadcrumbData)
            this.breadcrumb(ko.mapping.fromJS(explorerGridViewDataResponse.breadcrumbData));

         if (explorerGridViewDataResponse.explorerItemData)
         {
            this.group.init(explorerGridViewDataResponse.explorerItemData);
            this.editingGroup = this.group.current;
         }

         if (explorerGridViewDataResponse.data)
            this.grid.loadGridData(explorerGridViewDataResponse);
         else
            this.grid.reset();
      }

      private resultHandler(result: any, successMessage: string = undefined)
      {
         if (result.hasErrors)
         {
            messages.error(result.errors);
            return;
         }

         this.explorerGridViewDataResponseHandler(result);
         this.nav.navigate({ id: result.id == 0 ? null : result.id });

         if (successMessage)
            messages.success(successMessage);
      }
   }
}