/// <reference path="../ts/global.d.ts" />
/// <reference path="helpers/lookups.ts" />
/// <reference path="models/lookupData.ts" />
/// <reference path="helpers/WindowManager.ts" />

"use strict";

//#region Prototype extensions

if (!Array.prototype.filter)
{
   Array.prototype.filter = function (callback /*, thisp*/)
   {
      "use strict";

      if (this == null)
         throw new TypeError();

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof callback != "function")
         throw new TypeError();

      var result = [];
      var thisp = arguments[1];
      var i: any;
      for (i = 0; i < len; i++)
      {
         if (i in t)
         {
            var val = t[i]; // in case function mutates this
            if (callback.call(thisp, val, i, t))
               result.push(val);
         }
      }

      return result;
   };
}

//For knockout oberservable array
Function.prototype["pushApply"] = function (b)
{
   ag.utils.pushApply(this, b);
};

String.prototype["replaceAll"] = function (find, replaceWith)
{
   return this.split(find).join(replaceWith);
};

String.prototype["format"] = function ()
{
   var s = this,
      i = arguments.length;

   while (i--)
      s = s.replace(new RegExp("\\{" + i + "\\}", "gm"), arguments[i] !== undefined ? arguments[i] : "");

   return s;
};

String.prototype["trim"] = function ()
{
   return this.replace(/^\s+|\s+$/g, "");
};

String.prototype["isWhitespace"] = function ()
{
   return /^\s+$/.test(this);
};

String.prototype["startsWith"] = function (s)
{
   s = s || "";
   if (s.length > this.length)
      return false;

   return this.substring(0, s.length) === s;
};

String.prototype["endsWith"] = function (s)
{
   s = s || "";
   if (s.length > this.length)
      return false;

   return this.substr(-s.length) === s;
};

String.prototype["toCamelCase"] = function ()
{
   var camelCase = (s) =>
   {
      var isUpper = (c: string) =>
      {
         return c.toUpperCase() === c;
      };

      if (s === null || s === undefined || s.length == 0)
         return s;

      if (!isUpper(s[0]))
         return s;

      var sb: string = "",
         sl = s.length;

      for (var i = 0; i < sl; i++)
      {
         var hasNext = (i + 1) < sl;
         if ((i == 0 || !hasNext) || isUpper(s[i + 1]))
         {
            sb += s[i].toLowerCase();
         }
         else
         {
            sb += s.substring(i);
            break;
         }
      }
      return sb;
   };

   return this.split(".").map(camelCase).join(".");
};

String.prototype["capitaliseFirstLetter"] = function ()
{
   return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype["isNullOrEmpty"] = function ()
{
   return !this || this.isWhitespace();
};

String.prototype["getHashCode"] = function ()
{
   // From: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
   var hash = 0, i, char, l;
   if (this.length == 0)
      return hash;

   for (i = 0, l = this.length; i < l; i++)
   {
      char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
   }

   return hash;
};

// Will change the text from eg. EFT Corporation Level 2 -> EFT Cor...Level 2
String.prototype["shrinkFromMiddle"] = function (value: number)
{
   if (this.length > value)
   {
      var halfLength = this.length / 2,
         diff = this.length - value,
         firstPartLength = halfLength - diff / 2,
         secondPartLength = halfLength + diff / 2;
      
      return "{0}...{1}".format(this.substr(0, firstPartLength).trim(), this.substring(secondPartLength).trim());
   }
   return this;
};

//#endregion

//#region Window Extensions

window["log"] = () => 
{
   var log: any = {};
   log.history = log.history || []; // store logs to an array for reference
   log.history.push(arguments);

   var args = Array.prototype.slice.call(arguments),
      msg = args.shift();

   if (window.console)
      console.log(msg, args);
};

//#endregion

//#region ag namespace

module ag 
{
   //#region Private Properites and Initialisation

   // Private Properties
   var consts =
   {
      viewModelContainerAttribute: "data-ag-viewmodel-container"
   };

   function closeWindows()
   {
      if (windows && windows.length)
      {
         var handle;
         while (handle = windows.pop())
         {
            if (handle.close)
               handle.close();
         };
      }
   }

   function onNavigate()
   {
      if (authenticated && location.href.toLowerCase().indexOf("/account/logon") == -1)
      {
         // Let the server know we're leaving - pageId will be a header
         $.ajaxSettings.async = false;
         utils.postJson({ controller: "ui", action: "pageClosed", area: "" }, null, false, false);
         pageClosing = true;
      }
   }

   export function init(container)
   {
      // Loading - default isNavigation to true
      isNavigation = true;

      // Check if there are any pending requests,
      // if there is seek confirmation from the user
      // before they navigate away or close the browser
      window.onbeforeunload = () =>
      {
         if ($.active) 
         {
            return strings.reqInProgress;
         }
         else 
         {          
            // If we're actually navigating away, close up the page
            if (isNavigation)
            {
               // By default, indicate navigation, close windows, cleanup dom 
               // and replace body with a fake body between page loads
               if (!leaveBodyIntact)
               {
                  onNavigate();

                  // Close any windows opened by this window
                  closeWindows();

                  // Keep the body classes for the colour of the page
                  var body = $("body"), 
                     bodyClass = body.attr("class");

                  // Cleanup
                  cleanUpDom(body);

                  // Create a complete new body
                  var newbody = document.createElement("body"),
                     year = new Date().getFullYear();

                  $(newbody).attr("class", bodyClass).html('<div class="page-container loading"><div class="navbar navbar-fixed-top"><div class="navbar-inner container-fluid"><div class="restrict transition"><div class="nav dropdown"><div class="brand"><div class="hamburger"><div class="icon-bar"></div><div class="icon-bar"></div><div class="icon-bar"></div></div><h1>Quantum</h1></div></div><ul class="nav pull-right"><li><a id="pageWidthToggle"><i class="icon-fullscreen icon-white"></i></a></li><li><a><i class="icon-question-sign icon-white"></i></a></li></ul></div></div></div><div class="app-container"><div id="loading-page" class="container-fluid"><div class="restrict page breadcrumb transition"><i class="icon-refresh" style="opacity: 0.5;"></i></div></div></div></div><footer class="container-fluid"><div class="restrict transition"><span>&copy; ' + year + ' SunGard</span></div></footer>');
                  $("html").append(newbody);
               }
            }
            else
            {
               // Reset - assume next navigation is truely a navigation
               isNavigation = true;
            }

            return undefined;
         }
      }

      function cleanUpDom($node)
      {
         // Detach all event handlers
         $node.find("*").each(() =>
         {
            $(this).unbind();
         });

         // Knockout cleanup
         ko.removeNode($node[0]);

         purge(document);
      }

      //http://javascript.crockford.com/memory/leak.html
      //Break IE's circular reference
      function purge(d)
      {
         var a = d.attributes, i, l, n;
         if (a)
         {
            for (i = a.length - 1; i >= 0; i -= 1)
            {
               n = a[i].name;
               if (typeof d[n] === 'function')
               {
                  d[n] = null;
               }
            }
         }
         a = d.childNodes;
         if (a)
         {
            l = a.length;
            for (i = 0; i < l; i += 1)
            {
               purge(d.childNodes[i]);
            }
         }
      }

      utils.focusForm(container || document);
   }

   //#endregion

   //#region Public Properties

   // This will be set in our View from the server
   siteRoot = "/";
   controller = "";
   area = "";

   // Default to new Date() but will be supplied from server 
   // (for the location the user is assigned to)
   export var userLocationToday: Moment = moment(new Date());

   //#endregion

   //#region Publish/subscribe topics

   export var topics =
   {
      ApplyBindingDone: "KO_APPLY_BINDING_DONE",
      UpdatingViewModel: "UPDATING_VIEW_MODEL",
      Logon: "LOGON",
      ActivityCompleted: "ACTIVITY_COMPLETED",
      UpdateUIHtml: "UPDATE_UI_HTML",
      ApplyWatcherValue: "ApplyWatcherValue",
      WatcherValueChanged: "WatcherValueChanged",
   }

   //#endregion

   //#region Top Level functions

   export function initExpiry(expiry: string, logonUrl: string)
   {
      var expiryCookieExists = () =>
      {
         // Used for some very basic behaviour changes if required,
         // definitely not any real security
         return authenticated = document.cookie.indexOf(expiry) !== -1;
      };

      // Watch for session expiry
      if (expiryCookieExists())
      {
         var authExpiry = window.setInterval(() =>
         {
            if (!expiryCookieExists())
            {
               window.clearInterval(authExpiry);

               // Close any windows we opened
               closeWindows();

               // Make sure active checking doesn't stop the redirect 
               $.active = 0;

               // Redirect to logon redirect (if the user hasn't already invoked a navigation)
               if (!pageClosing)
                  navigate("{0}?ReturnUrl={1}{2}&expired=1".format(logonUrl + "redirect", encodeURIComponent(document.location.pathname), encodeURIComponent(document.location.search)));
            }
         }, 1000);
      }
      else
      {
         // Only check for auth if on logon page
         if (document.location.pathname !== logonUrl)
            return;

         var authRevive = window.setInterval(() =>
         {
            // If we are on the logon page and the cookie now exists
            // attempt a redirect to the ReturnUrl value
            if (expiryCookieExists())
            {
               // Clear so we don't get multiple hits due to the delay
               window.clearInterval(authRevive);

               // Delay the attempt to redirect so if there are a lot of
               // tabs open they don't all attempt to open at once
               _.delay(() =>
               {
                  // Parse url for ReturnUrl and redirect accordingly
                  var queryString = document.location.search;
                  document.location.href = (queryString) ? utils.getQueryStringParameterByName("ReturnUrl", queryString) : siteRoot;
               }, _.random(2000));
            }
         }, 2000);

         // Avoid performing redirect from page that has
         // been used to logon - server will perform this action
         $("#logonButton").on("click", () =>
         {
            window.clearInterval(authRevive);
         });
      }
   }

   export function isNullOrUndefined(value: any): boolean
   {
      return _.isNull(value) || _.isUndefined(value);
   }

   export function isNullUndefinedOrEmpty(value: any): boolean
   {
      return isNullOrUndefined(value) || value === "";
   }

   // get decscendant property (using dot notation string)
   export function getProperty(objectInstance: any, propertyPath: string)
   {
      var arr = propertyPath.split(".");
      while (arr.length && (objectInstance = objectInstance[arr.shift()]));

      return objectInstance;
   }

   // set decscendant property (using dot notation string)
   export function setProperty(objectInstance: any, propertyPath: string, value: any)
   {
      var parts = propertyPath.split(".");
      while (parts.length > 1)
      {
         var propertyName = <string>parts.shift();
         if (!(propertyName in objectInstance))
         {
            objectInstance[propertyName] = {};
         }

         objectInstance = objectInstance[propertyName];
      }

      objectInstance[parts[0]] = value;
   }

   //#endregion

   export module momentExtensions
   {
      export var Format =
      {
         ISO: "YYYY-MM-DD",
         Display: "D MMM YYYY",
         ISOFull: "YYYY-MM-DDTHH:mm:ssZ",
         FullDisplay: "D MMM YYYY HH:mm:ss",
         MonthYearDateTimeDisplay: "MMM YYYY",
      }

      // Utility functions - added to moment prototype
      function fromISO(value: string, useFullTime?:boolean): Moment
      {
         // Expecting ISO formatted date string: "2014-05-22T13:00:00+12:00"
         // but we will only parse the first 10 characters (don't want time)
         if (!value || !value.length || value.length < Format.ISO.length)
            return moment.utc(null);

         if (useFullTime)
            return moment.utc(value, Format.ISOFull, true);

         // Using strict parsing, from ISO to moment
         return moment.utc(value.substring(0, Format.ISO.length), Format.ISO, /*strict*/ true);
      }

      function areEqual(value1: string, value2: string): boolean
      {
         // Ensure parsing is required
         if (value1 === value2)
            return true;

         // Convert to moments
         var moment1 = fromISO(value1),
            moment2 = fromISO(value2);

         // If valid test using string compare with ISO format
         if (moment1.isValid() && moment2.isValid())
         {
            return moment1.format(Format.ISO) === moment2.format(Format.ISO);
         }

         return false;
      }

      // Instance functions "this" is the current moment
      function withinValidDateRange(): boolean
      {
         var year = this.year();
         return year >= constants.MinimumDate.getFullYear() && year <= constants.MaximumDate.getFullYear();
      }

      function toMonthYearDateTimeDisplay(): string
      {
         if (this.isValid())
            return this.format(Format.MonthYearDateTimeDisplay);

         return "";
      }

      function toFullDisplay(): string
      {
         if (this.isValid())
            return this.format(Format.FullDisplay);

         return "";
      }

      function toDisplay(): string
      {
         if (this.isValid())
            return this.format(Format.Display);

         return "";
      }

      function toEditor(format?: string): string
      {
         // Ensure we have a valid date
         if (!this.isValid())
            return "";

         // Use a supplied format
         if (format)
            return this.format(format);

         // Use the global format
         return this.format(dateShortFormat);
      }

      function fromEditor(value: string, format = dateShortFormat): Moment
      {
         return moment.utc(value, format, /*strict*/ true);
      }

      function toISO(): string
      {
         if (!this.isValid())
            return "";

         return this.format(Format.ISO);
      }

      function toDateZeroTime()
      {
         return new Date(this.year(), this.month(), this.date(), 0, 0, 0, 0);
      }

      function isEqual(value: Moment): boolean
      function isEqual(value: string): boolean;
      function isEqual(value: any): boolean
      {
         // Convert to moment if not already
         var date = moment.isMoment(value) ? value : fromISO(value);

         // If valid test using string compare with ISO format
         if (this.isValid() && date.isValid())
            return this.format(Format.ISO) === date.format(Format.ISO);

         return false;
      }

      // Utility - add to static
      moment["fromISO"] = fromISO;
      moment["fromEditor"] = fromEditor;
      moment["areEqual"] = areEqual;
      
      // Instance - add to prototype
      moment.fn.toDisplay = toDisplay;
      moment.fn.toFullDisplay = toFullDisplay;
      moment.fn.toMonthYearDateTimeDisplay = toMonthYearDateTimeDisplay;
      moment.fn.toEditor = toEditor;
      moment.fn.toISO = toISO;
      moment.fn.toDateZeroTime = toDateZeroTime;
      moment.fn.isEqual = isEqual;
      moment.fn.withinValidDateRange = withinValidDateRange;
   }

   //#region Utils namespace
   export module utils 
   {
      export class DebugExtensions
      {
         constructor(private componentName: string, private debug = false, private includeTimings = false)
         { }

         log(...args: any[])
         {
            if (!this.debug)
               return;

            try
            {
               var component = this.componentName;
               if (this.includeTimings)
               {
                  var now = new Date();
                  component += " " + now.toLocaleTimeString() + ":" + now.getMilliseconds();
               }

               args.unshift("[" + component + "]");
               if (window.console.debug)
                  console.debug.apply(console, args);
               else if (window.console.log)
                  console.log.apply(console, args);
            }
            catch (e)
            { }
         }

         // Use this sparingly!
         documentTitle(title: string)
         {
            if (!this.debug)
               return;

            try
            {
               document.title = title;
            }
            catch (e)
            { }
         }
      }

      //#region General Utils

      export function checkConfigExists()
      {
         if (!ag.config)
            throw new Error("Page configuration is missing. Please reload the page.");
      };

      export function addOptionalClasses(element: JQuery, ...args: string[])
      {
         $.each(args, (index, item) =>
         {
            if (!isNullOrUndefined(item))
               element.addClass(item);
         });
      }

      export function htmlEncode(value: any): any
      {
         // Only encode non empty, null, or undefined strings
         if (!value || typeof value != "string")
            return value;

         // Create a in-memory div, set it's inner text (which jQuery automatically encodes)
         // then grab the encoded contents back out.  The div never exists on the page.
         return $("<div/>").text(value).html();
      }

      export function htmlDecode(value: any): any
      {
         if (!value || typeof value != "string")
            return value;

         return $("<div>{0}</div>".format(value)).text();
      }

      // Get a parameter out of the queryString, either for the current 
      // page / location, or pass in a queryString to be parsed
      export function getQueryStringParameterByName(name: string, queryString?: string)
      {
         var parameterName = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
         var regex = new RegExp("[\\?&]" + parameterName + "=([^&#]*)"),
            results = regex.exec(queryString || location.search);

         return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
      }

      export function getConstructorName(object): string
      {
         if (!object)
            return "";

         var functionNameRegex = /function (.{1,})\(/,
            results = (functionNameRegex).exec((object).constructor.toString());

         return (results && results.length > 1) ? results[1] : "";
      }

      // For splitting additional fields attributes
      export function splitAndTrim(value: string): string[]
      {
         return value.replace(/^\s+|\s+$/g, "").split(/\s*,\s*/g);
      }

      // For appending a model prefix to an additional field name
      export function appendModelPrefix(value, prefix)
      {
         if (value.indexOf("*.") === 0)
         {
            value = value.replace("*.", prefix);
         }
         return value;
      }

      export function callDescendantFunction(obj, desc: string)
      {
         var arr = desc.split(".");
         while (arr.length > 1)
         {
            obj = obj[arr.shift()];
         }

         return obj[arr[0]].call(obj);
      }

      // Return the nearest container of this element bound to an application (top level) view model. 
      export function getModelContainer(element): JQuery
      {
         var result = element.closest("form[" + consts.viewModelContainerAttribute + "],div[" + consts.viewModelContainerAttribute + "]");
         if (result.length == 0)
            result = $(window.document.body);

         return result;
      }

      export function getAppViewModel(element)
      {
         if (!element)
            return null;

         var modelContainer = getModelContainer(element),
            viewModel = modelContainer.length > 0 ? ko.dataFor(modelContainer[0]) : null;

         return viewModel && viewModel.getModel && viewModel.getModel();
      }

      export function validateAndShowMessages(obj: any): JQueryPromise<any>
      {
         var deferred = $.Deferred(),
            errors = validate(obj);

         if (errors.length > 0)
         {
            var validationResult = { hasErrors: true, errors: errors };
            showErrorsFromResult(validationResult);
            deferred.reject(validationResult);
         }
         else
         {
            deferred.resolve(obj);
         }

         return deferred.promise();
      }

      // equivalent to ko.validation.group.showAllMessages(true)
      // but doesn't make all observables validatable which saves us memory
      export function validate(obj:any): string[]
      {
         var errors = [];
         traverseValidatables(obj, (prop) =>
         {
            prop.isModified(true);

            var error = prop.error();
            if(error)
               errors.push(error);
         });
         return errors;
      }
      
      // equivalent to ko.validation.group.showAllMessages(false)
      // but doesn't make all observables validatable which saves us memory
      export function resetValidation(obj:any)
      {
         traverseValidatables(obj, (prop) =>
         {
            prop.isModified(false);
         });
      }
      
      //hide the message of all observables where it's value is undefined, null, empty string or empty array
      export function resetValidationIfEmpty(obj:any, ignore?: string[])
      {
         traverseValidatables(obj, (prop, path) =>
         {
            var value;
            if (!_.contains(ignore, path))
            {
               value = prop();
               if (isNullUndefinedOrEmpty(value) || (_.isArray(value) && _.isEmpty(value)))
                  prop.isModified(false);
            }
         });
      }

      function traverseValidatables(obj: any, callback: (any, string) => void, parentPath?: string)
      {
         if(ko.isObservable(obj) && isValidatable(obj))
            callback(obj, parentPath || "");

         var value = ko.unwrap(obj);
         if (_.isPlainObject(value) || _.isArray(value))
         {
            _.each(value, (memberValue, propNameOrIndex) =>
            {
               traverseValidatables(memberValue, callback, (parentPath ? parentPath + "." + propNameOrIndex : propNameOrIndex)); //the path generated here is same as Knockout Mapping
            });
         }
      }

      // add an anonymous rule to the observable which is automatically removed when the element is disposed
      // addDisposeCallback is for unit testing
      export function registerBindingRule<T>(element: Element, observable: KnockoutObservable<T>, rule: KnockoutValidationRule, addDisposeCallback: (element: Element, callback: Function)=>void = ko.utils.domNodeDisposal.addDisposeCallback): void
      {
         if (!_.isObject(rule)) throw Error("invalid rule");
         if (rule.rule) throw Error("rule must be anonymous"); // Knockout Validation doesn't allow duplicate named
                                                               // rules so this method only accept anonymous rules

         var condition = createEditableCondition(observable, rule.condition);

         if (condition)
            rule.condition = condition;

         ko.validation.addRule(observable, rule);

         addDisposeCallback(element, () =>
         {
            observable.rules.remove((i) => i == rule);
         });
      }

      export function addWarning<T>(observable: KnockoutObservable<T>): void
      {
         if (!(<any>observable).warning)
            (<any>observable).warning = ko.observable();
      }

      // add a warning rule to the observable which is automatically removed when the element is disposed
      // addDisposeCallback is for unit testing
      // CAUTION: only one warning rule can be registered per observable
      // A better implementation is to extend Knockout Validation to support warnings
      // https://github.com/Knockout-Contrib/Knockout-Validation/issues/136
      export function registerBindingWarningRule<T>(element: Element, observable: KnockoutObservable<T>, rule: (resultCallback: (message:string)=>void )=>void, addDisposeCallback: (element: Element, callback: Function)=>void = ko.utils.domNodeDisposal.addDisposeCallback): void
      {
         if (!_.isFunction(rule)) throw Error("invalid rule");

         addWarning(observable);

         var ruleRunner = createWarningRuleRunner(observable, rule, createEditableCondition(observable));
         addDisposeCallback(element, () =>
         {
            ruleRunner.dispose();
         });
      }

      export function createWarningRuleRunner<T>(observable: KnockoutObservable<T>, rule: (resultCallback: (message:string)=>void )=>void, condition: ()=>boolean)
      {
         var latestRunId = 0;

         return ko.computed(() =>
         {
            latestRunId++;

            (<any>observable).warning('');

            if (condition && !condition())
               return;

            var runId = latestRunId;
            rule((message) =>
            {
               if (runId === latestRunId) // ignore the result of previous runs
                  (<any>observable).warning(message);
            });
         });
      }

      export function createEditableCondition<T>(observable: KnockoutObservable<T>, originalCondition?: ()=>boolean): ()=>boolean
      {
         if (!isMetaObservable(observable))
            return originalCondition;
         
         if (_.isFunction(originalCondition))
            return () => isEditable(<dependencies.IMetaObservable>observable) && originalCondition();
         
         return () => isEditable(<dependencies.IMetaObservable>observable);
      }

      export function isMetaObservable(obj: any): boolean
      {
         return obj && obj.isAvailable && obj.isVisible;
      }

      export function isValidatable(obj: any): boolean
      {
         return obj && obj.isValid && obj.isModified && obj.rules;
      }

      export function isEditable(metaObservable: dependencies.IMetaObservable)
      {
         return metaObservable.isVisible() && metaObservable.isAvailable();
      }

      export function isVisibleOrNotMetaObservable(obj: any)
      {
         return !isMetaObservable(obj) || (<dependencies.IMetaObservable>obj).isVisible();
      }

      export function getParentTabHeaders($source: JQuery): JQuery
      {
         var tabHeaders = [];
         _.each($source.parents("div.tab-pane"), (tabPane) =>
         {
            pushApply(tabHeaders, $("#" + $(tabPane).attr("id") + "TabHeader"));
         });
         return $(tabHeaders);
      }

      export function focusForm(container?: HTMLElement)
      {
         // Focus on the first form input/select/textarea in the container
         var containerElement = container ? $(container) : $("form").first();
         if (!containerElement.length)
            containerElement = $(document);

         containerElement.find(":input:visible:not(.disabled):not(button):first").focus();
      }

      export function applyBindings(app, element, addContainerAttribute = true)
      {
         if (app.beforeApplyBindings)
            app.beforeApplyBindings();

         // If a bound element has not been specified, use a top level .container element
         // specified in the layout.
         // [AG 28/9/2012] We do this because some elements attached to the body, e.g., dialogs
         // are bound to different view models.
         element = element || $("body > .page-container > .app-container")[0];

         // Apply bindings
         ko.applyBindings(app, element);

         if (app.afterApplyBindings)
            app.afterApplyBindings();

         if (addContainerAttribute)
         {
            // Attribute the model container so we can find it easily from the context of a control
            $(element).attr(consts.viewModelContainerAttribute, true);

            // Signal that bindings have been processed
            // Restrict to container elements only - review of this maybe required
            PubSub.publishSync(topics.ApplyBindingDone);
         }

         // Signal that bindings have been processed
         //$(document).trigger(topics.ApplyBindingDone);
      }

      // Case-Insensitive hasOwnProperty method, returns the property
      // in its correct case if found or undefined if not
      export function hasOwnPropertyCI(obj, property: string)
      {
         var props = [];
         for (var i in obj)
            if (obj.hasOwnProperty(i))
               props.push(i);

         var prop;
         while (prop = props.pop())
            if (prop.toLowerCase() === property.toLowerCase())
               return prop;

         return null;
      }

      export function normalizeUrl(url: string): string
      {
         if (url.startsWith("//"))
            url = url.substr(2);
         else if (url.startsWith("/"))
            url = url.substr(1);

         if (url.endsWith("/"))
            url = url.substring(0, url.length - 1);

         return url;
      }

      // Get a Service Url based on the current location
      // should only used temporarily, should come 
      // from server via @Request.GetSanitizedPath()
      export function getDefaultServiceUrl(): string
      {
         return window.document.location.pathname;
      }

      // Faster method for concatenating strings with support for format()
      // for ex:  var sb = new utils.StringBuilder();
      //          sb.append("hello").append(" ").append("there {0}", "bob");
      //          sb.toString(); => "hello there bob"
      export class StringBuilder implements IStringBuilder
      {
         private strings = [];

         constructor()
         {
         }

         append(s: string, args: any[]): IStringBuilder
         {
            if (!args)
               this.strings.push(s);
            else
               this.strings.push(s.format(args));

            // allow chaining
            return this;
         }

         toString(): string
         {
            return this.strings.join("");
         }
      }

      // Creates an attribute with unique values, useful for building Css Class
      // for ex:  var ab = new a.utils.AttributeBuilder("class"); 
      //          ab.append("small").append("column").append("column");
      //          ab.toString(); => class="small column"
      // Can also omit the attribute name to simply retrieve unique values
      export class AttributeBuilder implements IAttributeBuilder
      {
         strings = [];

         constructor(public attr: string)
         {
         }

         add(s): IAttributeBuilder
         {
            // check existence of attribute   
            if ($.inArray(s, this.strings) === -1)
               this.strings.push(s);

            // allow chaining
            return this;
         }

         toString()
         {
            // return attr="values" if attr supplied
            // otherwise just return unique values
            if (this.attr)
               return "{0}=\"{1}\"".format(this.attr, this.strings.join(" "));
            else
               return this.strings.join(" ");
         }
      }

      // Creates named template elements from the provided map of {name, content} pairs. These template elements can
      // then be referenced by Knockout bindings. Templates will be created only once.
      export function createTemplateElements(templateMap)
      {
         for (var templateName in templateMap)
         {
            if ($("#" + templateName).length == 0)
            {
               $('<script type="text/html"></script>')
                  .attr("id", templateName)
                  .html(templateMap[templateName])
                  .appendTo($("body"));
            }
         }
      }

      // Get the time difference between this and the last call   
      //export function getTimeDiff()
      //{
      //   var lastTime: any;
      //   lastTime = (new Date()).getTime;
      //   var newTime = new Date().getTime();
      //   var diff = newTime - lastTime;
      //   lastTime = newTime;
      //   return diff;
      //}

      export function ensureUniqueName(name: string, existingNames, nameProperty: string)
      {
         if (!name || name.trim() === "")
            throw new Error("name argument missing or empty.");

         var getMatchingNames = nameToMatch=>
         {
            var matches = existingNames.filter(item=>
            {
               var compareName = item;
               if (typeof compareName === "object")
               {
                  if (!nameProperty)
                     throw new Error("nameProperty argument missing, required when existingNames contains objects.");

                  compareName = compareName[nameProperty];
               }

               return compareName.toLowerCase() === nameToMatch;
            });

            return (matches && matches.length > 0) ? matches[0] : null;
         };

         var uniqueName = name, i = 2;
         while (getMatchingNames(uniqueName.toLowerCase()))
         {
            uniqueName = "{0} ({1})".format(name, i++);
         }

         return uniqueName;
      }

      export function getKeyFieldKey(fields): string
      {
         var keyField = ko.utils.arrayFirst(fields, (field: any) => field.isKey);
         return keyField && keyField.key;
      }

      export function getDisplayFieldKey(fields): string
      {
         // Make sure we have at least one displayable field other than the selectable field (use the key
         // field if no other field is displayable).
         var displayField = null;
         var keyField = null;

         var displayableFields = $.map(fields, field =>
         {
            if (!field.hidden && !displayField) displayField = field;
            if (field.isKey && !keyField) keyField = field;
            return !field.hidden;
         }).length;

         if (displayableFields == 0 && keyField)
         {
            // No displayable fields so return our key field as the display field.
            displayField = keyField;
         }

         return displayField && displayField.key;
      }

      export function getItemKey(item)
      {
         // If the item is not an object, use it as the key
         // [AG 11/10/2012] The item might be a parent with a "key" property
         var itemValue = ko.unwrap(item);
         if (typeof itemValue !== "object")
            return itemValue;

         var key = ko.unwrap(itemValue['__key__']);
         if (key || key === 0)
            return key;

         return ko.unwrap(itemValue.key);
      }

      export function transformLookup(lookup)
      {
         if (!lookup.data) 
            return lookup; // Nothing to do

         // Flesh out probably sparse lookup data with defaults from a client-side representation of LookupData
         var newLookup = new LookupData(lookup),
            keyFieldKey = getKeyFieldKey(newLookup.fields),
            displayFieldKey = getDisplayFieldKey(newLookup.fields) || keyFieldKey;

         if (displayFieldKey && keyFieldKey)
         {
            var filteredData = $.map(newLookup.data, item =>
            {
               var key = getPropertyByCaseInsensitiveName(item, ko.unwrap(keyFieldKey));
               var text = getPropertyByCaseInsensitiveName(item, ko.unwrap(displayFieldKey));

               return $.extend(item, {
                  "__key__": key,
                  "__text__": text
               });
            });

            newLookup.data = filteredData;
         }
         else
            throw new Error("A lookup dataset needs to contain a key field and at least one displayable field");

         return newLookup;
      }

      export function transformLookups(references, data, path?: string[])
      {
         insertDefaultValueForLookupData(data);

         // Transform any named lookup references and lookup data mapping
         var lookupReferences = $.extend({}, references);

         $.each(lookupReferences, (lookupRef, lookupDataRef) =>
         {
            if (typeof lookupDataRef !== "string")
               return; // has already been transformed

            delete references[lookupRef];

            // Store lookup data globally
            // We need to make the lookup observable because it can be modified programatically after binding
            createValueAtPath(lookups.lookupData, getDelimitedPath(lookupRef, path), transformLookup(data[lookupDataRef]));
         });
      }

      function insertDefaultValueForLookupData(lookupDatas)
      {
         if (!lookupDatas) return;

         _.each(lookupDatas, (value: any) =>
         {
            var findDefault = false;
            _.each(value.data, (obj: any) =>
            {
               if (obj.value == 0)
                  findDefault = true;
            });
            if (!findDefault)
               value.data.unshift({ value: 0, text: "" });
         });
      }

      // Traverses an object hierarchy on the specified root corresponding to the specified path,
      // creating nodes if they don't exist, and sets the value 
      export function createValueAtPath(root, path, value)
      {
         var parts = path.split(/[\[\]\.]+/),
            next,
            current = root;

         while (parts.length && (next = parts.shift()))
         {
            if (parts.length > 0)
            {
               if (current[next] === undefined) current[next] = {};
               current = current[next];
            }
            else
            {
               var mappingOptions =
               {
                  fields: { create: options => options.data },
                  data: { create: options => options.data }
               }

               // If the value already exists at this path, check whether it's an observable or mapped
               if (current[next] && (ko.isObservable(current[next]) || ko.mapping.isMapped(current[next])))
               {
                  // Updating
                  ko.mapping.fromJS(value, mappingOptions, current[next]);
               }
               else
               {
                  // Creating
                  current[next] = ko.mapping.fromJS(value, mappingOptions);
               }
            }
         }
      }

      export function getValueFromAccessor(item, accessor)
      {
         // Accessor is either a function or the name of an item property
         var val = typeof (accessor) == "function" ? accessor(item) : getPropertyByCaseInsensitiveName(item, accessor);
         return ko.unwrap(val);
      }

      export function getPropertyByCaseInsensitiveName(obj, name)
      {
         // Try the case-sensitive match first
         var val = obj[name];

         // No match, so try it case-insensitive
         if (!val)
         {
            var lcaseName = name.toLowerCase();
            for (var prop in obj)
            {
               if (obj.hasOwnProperty(prop) && lcaseName == prop.toLowerCase()) return obj[prop];
            }
         }
         return val;
      }

      export function getObjectFromPath(parent, path)
      {
         // Retrieve the object at the specified child path.
         if (!path)
            return parent;

         var next = parent;

         path = path.split(/[\[\]\.]+/);

         if (path[path.length - 1] == "")
         {
            path.pop();
         }

         while (path.length && (next = next[path.shift()]) && next !== null);

         return path.length ? undefined : next;
      }

      // TODO: merge this and getObjectFromPath
      export function getObjectFromPathWithTest(parent, path, cb)
      {
         // Traverse the viewModel down the specified path and return the object for which
         // our callback returns true.
         // Do the test on the root
         if (cb && cb(parent))
         {
            return parent;
         }

         // Continue testing child objects
         var next = parent;
         path = path.split(/[\[\]\.]+/);

         if (path[path.length - 1] == "")
         {
            path.pop();
         }

         while (path.length && (next = ko.unwrap(next)[path.shift()]) && next !== null && typeof ko.unwrap(next) === "object")
         {
            if (cb && cb(next))
            {
               return next;
            }
         }

         return path.length ? undefined : next;
      }

      export function addCollectionExtensionMethods(item, optionsText, optionsTitle, keyField)
      {
         $.extend(item, {
            getDisplayName: () =>
            {
               if (typeof item === "object")
               {
                  return optionsText ? getValueFromAccessor(item, optionsText) : getFirstObservableProperty(item);
               }
               else
               {
                  return item;
               }
            },
            getTitle: () => typeof item === "object" && optionsTitle ? getValueFromAccessor(item, optionsTitle) : item,
            __key__: keyField && getValueFromAccessor(item, keyField)
         });
      }

      export function getFirstObservableProperty(item)
      {
         var val = null;
         _.forEach(item, (value: any) =>
         {
            if (ko.isObservable(value))
            {
               val = value();
               return false;
            }
            return true;
         });
         return val;
      }

      export function getDelimitedPath(name: string, path?: string[])
      {
         if (!path) return name;
         return path.concat([name]).join(".");
      };

      export function navToEntity(actionUrl, params)
      {
         // Navigate to an entity on the site using an action URL and a set of parameters
         var url = "{0}{1}?{2}".format(siteRoot, normalizeUrl(actionUrl), $.param(cleanJSForRequest(params)));
         navigate(url);
      }

      export function getAdditionalFieldsFromModel(additionalFields: string, viewModel): Object
      {
         var additionalFieldsData = {},
            // Strip off the "*." prefix from all additional fields
            fieldNames = $.map(splitAndTrim(additionalFields), (item) =>
            {
               return appendModelPrefix(item, "");
            }),
            unwrappedViewModel = ko.unwrap(viewModel);

         // Set the filter value to the value of the Knockout observable bound to the additional field.
         // If the additional field is a dotted path, find the relevant path from the current level.
         $.each(fieldNames, (index, item) =>
         {
            var pathValue = getObjectFromPath(unwrappedViewModel, item);
            if (typeof pathValue === "undefined")
               throw new Error("Could not find property at path '{0}' on data model".format(item));

            if (isNullOrUndefined(pathValue))
            {
               return pathValue;
            }

            if (ko.isObservable(pathValue))
            {
               var unwrapped = ko.unwrap(pathValue);
               if (isNullOrUndefined(unwrapped))
                  return unwrapped;
            }

            createValueAtPath(additionalFieldsData, item, ko.mapping.toJS(pathValue));
            
         });

         return ko.mapping.toJS(additionalFieldsData);
      }

      // Utility method to get any additional fields required for a lookup action.
      export function getAdditionalFields(target: JQuery, viewModel, rootViewModel, containingModel)
      {
         var includeCompleteModel = !!target.data("lookup-include-complete-model"),
            completeModelPath = target.data("lookup-complete-model-path"),
            includeParentObject = !!target.data("lookup-include-parent-object"),
            additionalFieldsData = target.data("lookup-additional-fields"),
            useAppModelAsParent = !!target.data("lookup-use-app-model-as-parent"),
            bindingContext = ko.contextFor(target[0]),
            prefix = target.data("prefix") || "",
            additionalFields: any = {},
            appModel = viewModel,
            rootModel = rootViewModel || (bindingContext && bindingContext.$root),
            parentModel = viewModel;

         containingModel = containingModel || ko.dataFor($(target)[0]);

         // Look for the application view model data at (in order of preference) the property on the root model defined by the prefix; the getModel method
         // on the root model; the getModel method on some containing view model (perhaps not the root model).
         if (!appModel)
         {
            if (!rootModel)
               throw new Error("No root model available");

            appModel = prefix.length > 0 ?
            getProperty(rootModel, prefix) || getProperty(containingModel, prefix) :
            (rootModel && rootModel.getModel && rootModel.getModel());

            if (!appModel)
               appModel = getAppViewModel(target);

            if (!appModel)
               throw new Error("No application model data available");

            // If the binding context has a $parent then use $data as the parent model,
            // otherwise we're at the root level so use the appModel.
            parentModel = bindingContext && bindingContext.$parent && !useAppModelAsParent ? bindingContext.$data : appModel;

            // make sure we are using the actual model
            if (parentModel && parentModel.getModel)
               parentModel = parentModel.getModel();
         }

         if (includeCompleteModel)
         {
            var modelValue;
            if (completeModelPath)
               modelValue = getProperty(appModel, completeModelPath);

            if (modelValue)
               additionalFields.data = ko.mapping.toJS(modelValue);

            else
               additionalFields.data = ko.mapping.toJS(appModel);
         }

         if (includeParentObject)
         {
            // Return the immediate parent of the bound property
            additionalFields.contextModel = ko.mapping.toJS(parentModel);
         }

         // No individual additional fields specified so just return with any data or parent models
         if (!additionalFieldsData)
            return additionalFields;

         return { data: getAdditionalFieldsFromModel(additionalFieldsData, parentModel) };
      }

      // Iterate an objects properties (and arrays and sub-objects)
      // deleting any properties that are null as for a Get request
      // data is sent on the Url and the MVC model binder cannot tell
      // that &name=null should set the Name property to null versus "null"
      // as a valid value would look the same &name=fred
      export function cleanJSForRequest(vm: any, responseOnlyProperties?: string[], postOnlyProperties?: string[]): any
      {
         if (responseOnlyProperties)
            clearProperties(responseOnlyProperties, vm);

         if (postOnlyProperties)
            clearProperties(postOnlyProperties, vm);

         return walkObject(vm, (obj, property) =>
         {
            var value = obj[property];
            if (value === null || _.isFunction(value))
            {
               delete obj[property];
               return true;
            }

            return false;
         });
      }

      export function getObjectPropertyByString(o, s)
      {
         s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
         s = s.replace(/^\./, ''); // strip a leading dot
         var a = s.split('.');
         while (a.length)
         {
            var n = a.shift().toCamelCase();
            if (n in o)
            {
               o = o[n];
            }
            else
            {
               return undefined;
            }
         }
         return o;
      }

      export function getModelPrefix(fieldName)
      {
         return fieldName.substr(0, fieldName.lastIndexOf(".") + 1);
      }

      export function walkObject(obj, callback)
      {
         var forEachFn = (index, property) =>
         {
            walkObject(property, callback);
         };

         for (var p in obj)
         {
            if (!obj.hasOwnProperty(p))
               continue;

            var property = ko.unwrap(obj[p]);

            //  Callback can decide what to do with 
            // Functions but they will not be walked
            if (callback(obj, p) || _.isFunction(property))
               continue;

            if (_.isArray(property))
            {
               if (!_.isEmpty(property))
                  $.each(property, forEachFn);
               else
                  callback(obj, p);
            }
            else if (_.isObject(property) && !_.isEmpty(property))
            {
               walkObject(property, callback);
            }
         }

         return obj;
      }

      export function getDealAnalyseActionFromTarget(event: JQueryEventObject)
      {
         var url = $(event.target).closest("td[data-detail-url],tr[data-detail-url]").data("detail-url");
         var index = url.lastIndexOf("/");
         return url.substr(index + 1);
      }

      export function getDealAnalysePayload(event: JQueryEventObject, model: any)
      {
         var target = $(event.target).closest("td[data-detail-url],tr[data-detail-url]"),
            values = target.data("detail-values"),
            includeModel = target.data("detail-include-complete-model"),
            params = values || {};

         if (includeModel)
            params = $.extend(values, ko.mapping.toJS(model || {}));

         return params;
      }

      export function openApplicationFromEventTarget(event: JQueryEventObject): boolean
      {
         // Open Deals in a new window or allow natural link 
         // navigation if CTRL or SHIFT is down (new browser tab)
         // Center mouse button will open new browser tab too
         if (event.ctrlKey || event.shiftKey)
            return true;

         openApplicationWindow($(event.currentTarget).attr("href"));
         return false;
      }

      export function openApplicationWindow(path: string, data?, responseOnlyProperties?: string[], postOnlyProperties?: string[], navigate: boolean = false): WindowManager
      {
         if (data)
         {
            path += path.indexOf("?") !== -1 ? "&" : "?";
            path += $.param(cleanJSForRequest(data, responseOnlyProperties, postOnlyProperties));
         }

         return new WindowManager({ url: path, navigate: navigate });
      }

      export function openApplicationWindowPromise(path: string, data?, navigate?, responseOnly?): JQueryPromise<any>
      {
         return openApplicationWindow(path, data, responseOnly, null, navigate).promise;
      }

      export function documentTitle(title: string, keyValue: any, extraKeyValue: any): string;
      export function documentTitle(title: string, keyValue: any): string;
      export function documentTitle(title: string): string;
      export function documentTitle(): string;
      export function documentTitle(...args: any[]): string
      {
         if (args && args.length > 0)
         {
            var title = args[0],
               keyValue;

            if (args.length > 1)
               keyValue = args[1];

            if (keyValue)
               document.title = "{0} {1}".format(title, keyValue);
            else
               document.title = title;

            if (args.length == 3)
               document.title = "{0} {1} - {2}".format(args[0], args[2], args[1]);
         }

         return document.title;
      }
      //#endregion   


      // Simple method to walk an object model and produce a dictionary object.
      //
      // var input =  { a : { name : "bob" },
      //          b: { c: { name: "john" }},
      //          d: { e: { f: { name: "bob" } } } 
      //         }
      //
      // If we have the fn = function (y) => y instanceof hasOwnProperty('name') to indicate which items are the leaf object
      //
      // call the method:
      // 
      //        var output =  flattenDictionary(input, fn)
      //
      // And the following output is produced:
      //
      //        
      //   { "a" :     { name : "bob" }
      //     "b.c:" :  { name : "john" }
      //     "d.e.f" : { name : "bob" } }
      //
      export function flattenDictionary(collection: any, fnCondition: (item: any) => boolean, prefix?: string, result?: any): any
      {
         result = result || {};

         prefix = prefix ? prefix + "." : "";
         $.each(collection, (propertyName, item) =>
         {
            var name = prefix + propertyName;
            if (fnCondition && fnCondition(item))
            {
               result[name] = item;
            }
            else
            {
               this.flattenDictionary(item, fnCondition, name, result);
            }

         });
         return result;
      }

      export function getPageIdToken()
      {
         return $("input[name='__PageIdToken']").val();
      }

      export function getRequestVerificationToken()
      {
         return $("input[name='__RequestVerificationToken']").val();
      }

      export function exportCrystalReport(serviceUrl, reportName, selectedItemKeyValue, pageIdToken)
      {       
         utils.openApplicationWindow("/{0}/exportcrystalreport/?reportName={1}&keyValue={2}&__PageIdToken={3}".format(serviceUrl, reportName, selectedItemKeyValue, pageIdToken), null, null, null, false);
      }

      export function findHighestDivZIndex(): number
      {
         var s = 0;
         _.each($("div"), target =>
         {
            var temp = $(target).css("z-index");
            if (temp != "auto")
            {
               if (parseInt(temp) > s)
                  s = parseInt(temp);
            }
         });
         return s;
      }

      // Best practise for push apply - http://jsperf.com/array-prototype-push-apply-vs-concat/5
      export function pushApply(a, b)
      {
         var i = 0,
            c = b.length;

         for (; i < c; ++i)
         {
            a.push(b[i]);
         }
      }

      // Remove the option if its value = 0 && text = ""
      export function optionsAfterRender(element, data)
      {
         var ele = $(element);
         if (data.value == 0 && data.text === "")
         {
            ele.hide();
            ele.attr('disabled', 'disabled');
            ele.val('.');
         }
      }

      export function radioButtonGroupOptionsAfterRender(element, data)
      {
         optionsAfterRender(element, data);

         var parent = $(element).parent(),
            emptylabeladded = "emptyLabelAdded";

         if (parent.data(emptylabeladded))
            return;

         if (data.value === 0 && data.text !== "")
         {
            var labelElement = document.createElement("label");

            $(labelElement).hide();
            $(labelElement).attr('disabled', 'disabled');
            parent.prepend(labelElement);

            parent.data(emptylabeladded, true);
         }
      }

      export function updateQuickMenuPosition(event)
      {
         var ele = $(event.currentTarget),
            positionLeft = ele.position().left,
            menuWidth = ele.siblings('ul').width(),
            leftOffset = $(document).width() - menuWidth - event.pageX;

         if (leftOffset < 0)
            ele.siblings('ul').css('left', positionLeft - menuWidth + ele.width());
         else
            ele.siblings('ul').css('left', positionLeft);

         //var positionTop = ele.position().top;
         //var menuHeight = ele.siblings('ul').height();
         //var topOffset = $(document).height() - menuHeight - event.pageY;
         //if (topOffset < 100)
         //{
         //   ele.siblings('ul').css('top', positionTop - menuHeight - ele.height());
         //}
      }

      export function getRateLimitOption(timeout: number = 1, isDebounced: boolean = true)
      {
         if (!isDebounced)
            return { timeout: timeout }

         return {
            timeout: timeout,
            method: "notifyWhenChangesStop"
         };
      }

      export function calculateComputedBasedOnProperty(property: string, context: AppViewModel): boolean
      {
         if (_.isNull(context.editingItem))
            return false;

         if (!_.has(context.editingItem, property))
            return false;

         return ko.unwrap(context.editingItem[property]);
      }

      export function getNumberHelper(): NumberCalculator
      {
         if (!calculator)
            calculator = new NumberCalculator();

         return calculator;
      }

      export function isValidURL(url: string): boolean
      {
         var temp = url.match(/((?:https?\:\/\/|www\.)(?:[-a-z0-9]+\.)*[-a-z0-9]+.*)/ig);
         return temp ?  temp.length > 0 : false;
      }

      export function inflateCurrencies(currencies: Array<any>)
      {
         var result = {};

         $.each(currencies, (index, item) =>
         {
            result[item[0]] = { amountDp: item[1], fxDp: item[2], intDp: item[3], roundType: item[4] }
         });

         return result;
      }

      export function escapeRegexChars(str: string): string
      {
         return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
      }

      //custom observable equalityComparer
      export function strictEqualityComparer(a: any, b: any): boolean
      {
         return a === b;
      }
   }
   //#endregion

   export module mathEx
   {
      export function round(value: number, decimalPlaces: number)
      {
         return decimalAdjust('round', value, decimalPlaces);
      }

      export function floor(value: number, decimalPlaces: number)
      {
         return decimalAdjust('floor', value, decimalPlaces);
      }

      export function ceil(value: number, decimalPlaces: number)
      {
         return decimalAdjust('ceil', value, decimalPlaces);
      }

      // Precise rounding
      // Inspired by https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
      function decimalAdjust(type: string, value: number, decimalPlaces: number) 
      {
         if (!isFinite(value))
            return value;

         var exp = decimalPlaces > 0 ? decimalPlaces * -1 : 0;

         if (exp === 0)
            return Math[type](value);
    
         // Shift
         var ret:any = value.toExponential().split('e');
         ret = Math[type](Number(ret[0] + 'e' + (Number(ret[1]) - exp)));

         // Shift back
         ret = ret.toExponential().split('e');
         return Number(ret[0] + 'e' + (Number(ret[1]) + exp));
      }

      // Count the fractional digits
      export function fractionDigits(value: number)
      {
         if (!isFinite(value))
            return NaN;

         var match = /(\d+)(\.(\d+))?e(.+)/.exec(value.toExponential());
         return Math.max((!match[3] ? 0 : match[3].length) - Number(match[4]), 0);
      }

      // Chop off the fractional part
      export function trunc(x)
      {
         return x < 0 ? Math.ceil(x) : Math.floor(x);
      }
   }

   // Init self
   init(self);
}
//#endregion