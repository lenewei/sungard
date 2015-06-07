/// <reference path="jquery.d.ts" />
/// <reference path="knockout.d.ts" />
/// <reference path="knockout.mapping.d.ts" />
/// <reference path="lodash.d.ts" />
/// <reference path="kolite.d.ts" />
/// <reference path="signalr.d.ts" />
/// <reference path="moment.d.ts" />
/// <reference path="../ag/viewModels/confirmationViewModel.ts" />
/// <reference path="../ag/helpers/numbers.ts" />
/// <reference path="strings.d.ts" />
/// <reference path="Office.d.ts" />

interface MomentStatic
{
   fn: any;
   fromISO(value: string, useFullTime?: boolean): Moment;
   fromEditor(value: string, format?: string): Moment;
   areEqual(value1: string, value2: string): boolean
}

interface Moment
{
   toDisplay(): string;
   toFullDisplay(): string;
   toMonthYearDateTimeDisplay(): string;
   toEditor(format?: string): string;
   toISO(): string;
   toDateZeroTime(): Date;
   isEqual(value: string): boolean;
   isEqual(value: Moment): boolean;
   withinValidDateRange(): boolean;
}

// JQueryStatic interface extensions (typically plugins that add utility methods)
interface JQueryStatic
{
   toDictionary(...args: any[]): any;
   debounce(...args: any[]): any;
   active: number;
   connections: any;
   cookie(...args: any[]);
   ui: any;
   browser: any;
}

interface ICaret extends JQuery
{
   start: any;
}

interface IButton extends JQuery
{
   value: any;
}

// JQuery interface extensions (typically plugins that add functionality)
interface JQuery
{
   caret(options: any): ICaret;
   caret(): ICaret;
   button(value: any): IButton;
   tooltip(...args: any[]): JQuery;
   livestamp(...args: any[]): JQuery;
   slider(...args: any[]): JQuery;
   sparkline(...args: any[]): JQuery;
   notify(...args: any[]): JQuery;
   modal(...args: any[]): any;
   removeHighlight(): JQuery;
   highlight(pat: any): JQuery;
   tab(...args: any[]): any;
   equalize();
   live(...args: any[]);
   draggable(...args: any[]);
   popover(...args: any[]);
   modalmanager(option: string);
   datepicker(...args: any[]);
   typeahead(...args: any[]);
   redactor(...args: any[]);
   sortable(...args: any[]);
   dotdotdot(...args: any[]): JQuery;
   dropdown(...args: any[]): JQuery;
}

interface INavEntry
{
   params: any;
}

interface INavInfo
{
   isBack: boolean;
   isFirst: boolean;
   isForward: boolean;
}

//interface KnockoutStatic
//{
//   asyncCommand: any;
//   command: any;
//   DirtyFlag: any;
//}

// String interface extensions (where base prototype extensions have been made)
interface String
{
   format(...args: any[]): string;
   isWhitespace(): boolean;
   startsWith(s: string): boolean;
   endsWith(s: string): boolean;
   toCamelCase(): string;
   capitaliseFirstLetter(): string;
   replaceAll(find: string, replaceWith: string): string;
   isNullOrEmpty(): boolean;
   getHashCode(): number;
   shrinkFromMiddle(shinkTo: number): string;
}

interface Array<T>
{
   difference(...args: any[]): any;
}

interface IStringBuilder
{
   append(s: string, args: any[]): IStringBuilder;
   toString(): string;
}

interface IAttributeBuilder
{
   add(s: string): IAttributeBuilder;
   toString(): string;
}

declare var PubSub: any;
declare var NavHistory: any;
declare var Tour: any;
declare var toastr: any;
declare var kendo: any;

declare module ag
{
   // Global ag namespace variables
   var siteRoot: string;
   var applicationPath: string;
   var serviceUrl: string;
   var action: string;
   var controller: string;
   var area: string;
   var menu: any;
   var perspective: string;
   var confirmationViewModel: ConfirmationViewModel;
   var keyChangeConfirmationViewModel: KeyChangeConfirmationViewModel;
   var contstants: any;
   var ajaxActive: boolean;
   var ajaxStatusCode: number;
   var windows: any[];
   var isNavigation: boolean;
   var dateShortFormat: string;
   var decimalSymbol: string;
   var digitGroupingSymbol: string;
   var calculator: NumberCalculator;
   var leaveBodyIntact: boolean;
   var pageClosing: boolean;
   var config: any;

   // Very basic behaviour changes can be based off 
   // this if required, definitely no real security
   var authenticated: boolean;

   // Global viewModel for debugging purposes only
   var viewModel: any;

   // Functions, Modules and Classes not yet converted (or optionally implemented at runtime)
   function childWindowOpened(viewModel: any, windowHandle: Window);
   function childWindowClosing(viewModel: any, result: any, saved: boolean, windowHandle: Window): boolean;
}

interface Window
{
   ko: KnockoutStatic;
   isDebug: boolean;
   toastr: any;
   _lastError: any;
}

interface KnockoutObservableFunctions<T>
{   
   subscribeChanged<T>(callback: (newValue: T, oldvalue: T) => void, target?: any, event?: string): KnockoutSubscription;
}

interface KnockoutStatic
{
   asyncComputed<T>(evaluator, owner): KnockoutObservable<T>;
}