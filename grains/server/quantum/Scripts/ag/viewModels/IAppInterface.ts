interface IViewModelOptions
{
   serviceUrl: string
   lookups: Object
   lookupData: Object
   responseOnly: any
   postOnly: any
   dependencies: any
   typeMetaDataUrl: string
   typeMetadata: Object
   tabs: any
   clientSideNavDisabled: boolean
   isReadOnly: boolean
}

interface IAppViewModelOptions extends IViewModelOptions
{
   itemKey: string
   editProperty: string
   editAction: string
   browseEditors: any
   noBrowseGrid: boolean
   applicationHeaders: any
   keyFields: string[]
   fieldCategories: any
   extraPropertyNeedToClearWhenCopy: string
   actionToInvoke: string
   isUnapproved: boolean
   browseColumnsUseAlphanumSortingString: string
   itemEditable: string
}

// Menu command Interface
interface IAppMenuCommand
{
   saveCommand: KoliteAsyncCommand;
   defaultSaveCommand: KoliteAsyncCommand;
   saveAndNewCommand: KoliteAsyncCommand;
   copyCommand: KoliteAsyncCommand;
   deleteCommand: KoliteAsyncCommand;
}

interface IStaticDataUploadMenuCommand extends IAppMenuCommand
{
   uploadCommand: KoliteCommand;
   confirmedDownloadCommand: KoliteCommand;
}

interface IDealingMenuCommand extends IAppMenuCommand
{
   approveCommand: KoliteAsyncCommand;
   rejectCommand: KoliteAsyncCommand;
   auditHistoryCommand: KoliteAsyncCommand;
}

interface IStaticdataMenuCommand extends IAppMenuCommand
{
   deActivateCommand: KoliteAsyncCommand;
   activateCommand: KoliteAsyncCommand;
}

interface IHierarchicalMenuCommand extends IStaticdataMenuCommand
{
   saveGroupCommand: KoliteAsyncCommand;
   copyGroupCommand: KoliteAsyncCommand;
}

// Application View Model
interface IBaseViewModel
{
   options: IViewModelOptions;
   updatingModel: KnockoutComputed<boolean>;

   // Public methods
   resetLookups();
   setupApplicationHeaders(data: any, applicationHeaders: any);
   getDefaultOptions(options);
   initDependencies(editingItem: any);
   exportCrystalReport(reportName);
   initNav();
   silenceDependency(fn: Function, context: any, ...args: any[]): JQueryDeferred<any>;
   getCurrentURLparams(): string;
   filterLookupUrl(filter: any, gridViewModel: ag.GridViewModel, lookupAction: string, controller: string): string;
   afterKeyBindingChangeCallbackFunction(): void;

   // Virtual methods
   exportView(viewModel: IAppViewModel, event: JQueryEventObject): void;
   navigateGetParams(): any;
   navigateDelegator(args: any[], currrentContext: any);
}

interface IAppViewModel extends IBaseViewModel
{
   // Properties
   editingItem: any;
   editUrl: string;
   itemKey: string;
   editProperty: string;
   editPropertyFields: any;
   isNewItem: KnockoutObservable<boolean>;
   originalKeyStore: any;
   copyOriginalKeyCallBack: Function;

   // Public methods
   publishViewModelUpdatingEvent(isUpdatingViewModel: boolean);
   requestNewItem(): JQueryPromise<any>;
   createItem(refreshGrid?): JQueryPromise<any>;
   loadItemThenNavigate(result: any, navObj: any, resetEditor?: boolean, resetPageTitle?: boolean);
   mapJsToEditingItem(newValue: any);
   navigateToEmptyItem();
   copyItem(): JQueryPromise<any>;
   copyAndApply(): JQueryPromise<any>;
   loadItem(result, isNewItem: boolean): JQueryDeferred<any>;
}

interface IStaticDataViewModel extends IAppViewModel
{
   canRenameKeyfields: boolean;
   editParamDelegator: () => any;
   editWithRenameParamDelegator: () => any[];
}

interface IHierarchicalViewModel extends IStaticDataViewModel
{
   groupKey: string;
   currentParentKeyValue: string;
   hierarchicalGroupName: string;
   unapprovedPrefix: string;

   membersGrid: ag.GridViewModel;
   copyMode: ag.HierarchicalCopyMode;
   isUnapprovedApplication: KnockoutComputed<boolean>;
   diagramViewModel: ag.HierarchicalDiagramViewModel;

   isGroup(): boolean;
   navigateToParent();
   navigateToMemberUrl(data);
   navigateToGroupUrl(viewModel);
   getApprovedServiceUrl(): string;
   getKeyQueryString(key);
   navigateToMember(data, event: JQueryEventObject);
   updateBreadcrumb(result);
   editGroupFromBreadcrumb(viewModel, _, e: JQueryEventObject);
   groupKeyValue(viewModel);
   moveItem(items: any[], event, explorerViewModel:ag.components.ExplorerViewModel): void;
   createItemGroup(): JQueryPromise<any>;
   createGroupRequest(): JQueryPromise<any>;
   cacheCurrentParentKeyValue(fromCopy?: boolean, prefix?: string);
}
