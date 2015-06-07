/// <reference path="../ts/global.d.ts" />
/// <reference path="helpers/lookups.ts" />
/// <reference path="models/lookupData.ts" />
/// <reference path="helpers/WindowManager.ts" />
"use strict";
//#region Prototype extensions
if (!Array.prototype.filter) {
    Array.prototype.filter = function (callback /*, thisp*/ ) {
        "use strict";

        if (this == null)
            throw new TypeError();

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof callback != "function")
            throw new TypeError();

        var result = [];
        var thisp = arguments[1];
        var i;
        for (i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i];
                if (callback.call(thisp, val, i, t))
                    result.push(val);
            }
        }

        return result;
    };
}

//For knockout oberservable array
Function.prototype["pushApply"] = function (b) {
    ag.utils.pushApply(this, b);
};

String.prototype["replaceAll"] = function (find, replaceWith) {
    return this.split(find).join(replaceWith);
};

String.prototype["format"] = function () {
    var s = this, i = arguments.length;

    while (i--)
        s = s.replace(new RegExp("\\{" + i + "\\}", "gm"), arguments[i] !== undefined ? arguments[i] : "");

    return s;
};

String.prototype["trim"] = function () {
    return this.replace(/^\s+|\s+$/g, "");
};

String.prototype["isWhitespace"] = function () {
    return /^\s+$/.test(this);
};

String.prototype["startsWith"] = function (s) {
    s = s || "";
    if (s.length > this.length)
        return false;

    return this.substring(0, s.length) === s;
};

String.prototype["endsWith"] = function (s) {
    s = s || "";
    if (s.length > this.length)
        return false;

    return this.substr(-s.length) === s;
};

String.prototype["toCamelCase"] = function () {
    var camelCase = function (s) {
        var isUpper = function (c) {
            return c.toUpperCase() === c;
        };

        if (s === null || s === undefined || s.length == 0)
            return s;

        if (!isUpper(s[0]))
            return s;

        var sb = "", sl = s.length;

        for (var i = 0; i < sl; i++) {
            var hasNext = (i + 1) < sl;
            if ((i == 0 || !hasNext) || isUpper(s[i + 1])) {
                sb += s[i].toLowerCase();
            } else {
                sb += s.substring(i);
                break;
            }
        }
        return sb;
    };

    return this.split(".").map(camelCase).join(".");
};

String.prototype["capitaliseFirstLetter"] = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype["isNullOrEmpty"] = function () {
    return !this || this.isWhitespace();
};

String.prototype["getHashCode"] = function () {
    // From: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
    var hash = 0, i, char, l;
    if (this.length == 0)
        return hash;

    for (i = 0, l = this.length; i < l; i++) {
        char = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }

    return hash;
};

// Will change the text from eg. EFT Corporation Level 2 -> EFT Cor...Level 2
String.prototype["shrinkFromMiddle"] = function (value) {
    if (this.length > value) {
        var halfLength = this.length / 2, diff = this.length - value, firstPartLength = halfLength - diff / 2, secondPartLength = halfLength + diff / 2;

        return "{0}...{1}".format(this.substr(0, firstPartLength).trim(), this.substring(secondPartLength).trim());
    }
    return this;
};

//#endregion
//#region Window Extensions
window["log"] = function () {
    var log = {};
    log.history = log.history || []; // store logs to an array for reference
    log.history.push(arguments);

    var args = Array.prototype.slice.call(arguments), msg = args.shift();

    if (window.console)
        console.log(msg, args);
};

//#endregion
//#region ag namespace
var ag;
(function (ag) {
    //#region Private Properites and Initialisation
    // Private Properties
    var consts = {
        viewModelContainerAttribute: "data-ag-viewmodel-container"
    };

    function closeWindows() {
        if (ag.windows && ag.windows.length) {
            var handle;
            while (handle = ag.windows.pop()) {
                if (handle.close)
                    handle.close();
            }
            ;
        }
    }

    function onNavigate() {
        if (ag.authenticated && location.href.toLowerCase().indexOf("/account/logon") == -1) {
            // Let the server know we're leaving - pageId will be a header
            $.ajaxSettings.async = false;
            utils.postJson({ controller: "ui", action: "pageClosed", area: "" }, null, false, false);
            ag.pageClosing = true;
        }
    }

    function init(container) {
        // Loading - default isNavigation to true
        ag.isNavigation = true;

        // Check if there are any pending requests,
        // if there is seek confirmation from the user
        // before they navigate away or close the browser
        window.onbeforeunload = function () {
            if ($.active) {
                return ag.strings.reqInProgress;
            } else {
                // If we're actually navigating away, close up the page
                if (ag.isNavigation) {
                    // By default, indicate navigation, close windows, cleanup dom
                    // and replace body with a fake body between page loads
                    if (!ag.leaveBodyIntact) {
                        onNavigate();

                        // Close any windows opened by this window
                        closeWindows();

                        // Keep the body classes for the colour of the page
                        var body = $("body"), bodyClass = body.attr("class");

                        // Cleanup
                        cleanUpDom(body);

                        // Create a complete new body
                        var newbody = document.createElement("body"), year = new Date().getFullYear();

                        $(newbody).attr("class", bodyClass).html('<div class="page-container loading"><div class="navbar navbar-fixed-top"><div class="navbar-inner container-fluid"><div class="restrict transition"><div class="nav dropdown"><div class="brand"><div class="hamburger"><div class="icon-bar"></div><div class="icon-bar"></div><div class="icon-bar"></div></div><h1>Quantum</h1></div></div><ul class="nav pull-right"><li><a id="pageWidthToggle"><i class="icon-fullscreen icon-white"></i></a></li><li><a><i class="icon-question-sign icon-white"></i></a></li></ul></div></div></div><div class="app-container"><div id="loading-page" class="container-fluid"><div class="restrict page breadcrumb transition"><i class="icon-refresh" style="opacity: 0.5;"></i></div></div></div></div><footer class="container-fluid"><div class="restrict transition"><span>&copy; ' + year + ' SunGard</span></div></footer>');
                        $("html").append(newbody);
                    }
                } else {
                    // Reset - assume next navigation is truely a navigation
                    ag.isNavigation = true;
                }

                return undefined;
            }
        };

        function cleanUpDom($node) {
            var _this = this;
            // Detach all event handlers
            $node.find("*").each(function () {
                $(_this).unbind();
            });

            // Knockout cleanup
            ko.removeNode($node[0]);

            purge(document);
        }

        //http://javascript.crockford.com/memory/leak.html
        //Break IE's circular reference
        function purge(d) {
            var a = d.attributes, i, l, n;
            if (a) {
                for (i = a.length - 1; i >= 0; i -= 1) {
                    n = a[i].name;
                    if (typeof d[n] === 'function') {
                        d[n] = null;
                    }
                }
            }
            a = d.childNodes;
            if (a) {
                l = a.length;
                for (i = 0; i < l; i += 1) {
                    purge(d.childNodes[i]);
                }
            }
        }

        utils.focusForm(container || document);
    }
    ag.init = init;

    //#endregion
    //#region Public Properties
    // This will be set in our View from the server
    ag.siteRoot = "/";
    ag.controller = "";
    ag.area = "";

    // Default to new Date() but will be supplied from server
    // (for the location the user is assigned to)
    ag.userLocationToday = moment(new Date());

    //#endregion
    //#region Publish/subscribe topics
    ag.topics = {
        ApplyBindingDone: "KO_APPLY_BINDING_DONE",
        UpdatingViewModel: "UPDATING_VIEW_MODEL",
        Logon: "LOGON",
        ActivityCompleted: "ACTIVITY_COMPLETED",
        UpdateUIHtml: "UPDATE_UI_HTML",
        ApplyWatcherValue: "ApplyWatcherValue",
        WatcherValueChanged: "WatcherValueChanged"
    };

    //#endregion
    //#region Top Level functions
    function initExpiry(expiry, logonUrl) {
        var expiryCookieExists = function () {
            // Used for some very basic behaviour changes if required,
            // definitely not any real security
            return ag.authenticated = document.cookie.indexOf(expiry) !== -1;
        };

        // Watch for session expiry
        if (expiryCookieExists()) {
            var authExpiry = window.setInterval(function () {
                if (!expiryCookieExists()) {
                    window.clearInterval(authExpiry);

                    // Close any windows we opened
                    closeWindows();

                    // Make sure active checking doesn't stop the redirect
                    $.active = 0;

                    // Redirect to logon redirect (if the user hasn't already invoked a navigation)
                    if (!ag.pageClosing)
                        ag.navigate("{0}?ReturnUrl={1}{2}&expired=1".format(logonUrl + "redirect", encodeURIComponent(document.location.pathname), encodeURIComponent(document.location.search)));
                }
            }, 1000);
        } else {
            // Only check for auth if on logon page
            if (document.location.pathname !== logonUrl)
                return;

            var authRevive = window.setInterval(function () {
                // If we are on the logon page and the cookie now exists
                // attempt a redirect to the ReturnUrl value
                if (expiryCookieExists()) {
                    // Clear so we don't get multiple hits due to the delay
                    window.clearInterval(authRevive);

                    // Delay the attempt to redirect so if there are a lot of
                    // tabs open they don't all attempt to open at once
                    _.delay(function () {
                        // Parse url for ReturnUrl and redirect accordingly
                        var queryString = document.location.search;
                        document.location.href = (queryString) ? utils.getQueryStringParameterByName("ReturnUrl", queryString) : ag.siteRoot;
                    }, _.random(2000));
                }
            }, 2000);

            // Avoid performing redirect from page that has
            // been used to logon - server will perform this action
            $("#logonButton").on("click", function () {
                window.clearInterval(authRevive);
            });
        }
    }
    ag.initExpiry = initExpiry;

    function isNullOrUndefined(value) {
        return _.isNull(value) || _.isUndefined(value);
    }
    ag.isNullOrUndefined = isNullOrUndefined;

    function isNullUndefinedOrEmpty(value) {
        return isNullOrUndefined(value) || value === "";
    }
    ag.isNullUndefinedOrEmpty = isNullUndefinedOrEmpty;

    // get decscendant property (using dot notation string)
    function getProperty(objectInstance, propertyPath) {
        var arr = propertyPath.split(".");
        while (arr.length && (objectInstance = objectInstance[arr.shift()]))
            ;

        return objectInstance;
    }
    ag.getProperty = getProperty;

    // set decscendant property (using dot notation string)
    function setProperty(objectInstance, propertyPath, value) {
        var parts = propertyPath.split(".");
        while (parts.length > 1) {
            var propertyName = parts.shift();
            if (!(propertyName in objectInstance)) {
                objectInstance[propertyName] = {};
            }

            objectInstance = objectInstance[propertyName];
        }

        objectInstance[parts[0]] = value;
    }
    ag.setProperty = setProperty;

    //#endregion
    (function (momentExtensions) {
        momentExtensions.Format = {
            ISO: "YYYY-MM-DD",
            Display: "D MMM YYYY",
            ISOFull: "YYYY-MM-DDTHH:mm:ssZ",
            FullDisplay: "D MMM YYYY HH:mm:ss",
            MonthYearDateTimeDisplay: "MMM YYYY"
        };

        // Utility functions - added to moment prototype
        function fromISO(value, useFullTime) {
            // Expecting ISO formatted date string: "2014-05-22T13:00:00+12:00"
            // but we will only parse the first 10 characters (don't want time)
            if (!value || !value.length || value.length < momentExtensions.Format.ISO.length)
                return moment.utc(null);

            if (useFullTime)
                return moment.utc(value, momentExtensions.Format.ISOFull, true);

            // Using strict parsing, from ISO to moment
            return moment.utc(value.substring(0, momentExtensions.Format.ISO.length), momentExtensions.Format.ISO, true);
        }

        function areEqual(value1, value2) {
            // Ensure parsing is required
            if (value1 === value2)
                return true;

            // Convert to moments
            var moment1 = fromISO(value1), moment2 = fromISO(value2);

            // If valid test using string compare with ISO format
            if (moment1.isValid() && moment2.isValid()) {
                return moment1.format(momentExtensions.Format.ISO) === moment2.format(momentExtensions.Format.ISO);
            }

            return false;
        }

        // Instance functions "this" is the current moment
        function withinValidDateRange() {
            var year = this.year();
            return year >= ag.constants.MinimumDate.getFullYear() && year <= ag.constants.MaximumDate.getFullYear();
        }

        function toMonthYearDateTimeDisplay() {
            if (this.isValid())
                return this.format(momentExtensions.Format.MonthYearDateTimeDisplay);

            return "";
        }

        function toFullDisplay() {
            if (this.isValid())
                return this.format(momentExtensions.Format.FullDisplay);

            return "";
        }

        function toDisplay() {
            if (this.isValid())
                return this.format(momentExtensions.Format.Display);

            return "";
        }

        function toEditor(format) {
            // Ensure we have a valid date
            if (!this.isValid())
                return "";

            // Use a supplied format
            if (format)
                return this.format(format);

            // Use the global format
            return this.format(ag.dateShortFormat);
        }

        function fromEditor(value, format) {
            if (typeof format === "undefined") { format = ag.dateShortFormat; }
            return moment.utc(value, format, true);
        }

        function toISO() {
            if (!this.isValid())
                return "";

            return this.format(momentExtensions.Format.ISO);
        }

        function toDateZeroTime() {
            return new Date(this.year(), this.month(), this.date(), 0, 0, 0, 0);
        }

        function isEqual(value) {
            // Convert to moment if not already
            var date = moment.isMoment(value) ? value : fromISO(value);

            // If valid test using string compare with ISO format
            if (this.isValid() && date.isValid())
                return this.format(momentExtensions.Format.ISO) === date.format(momentExtensions.Format.ISO);

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
    })(ag.momentExtensions || (ag.momentExtensions = {}));
    var momentExtensions = ag.momentExtensions;

    //#region Utils namespace
    (function (utils) {
        var DebugExtensions = (function () {
            function DebugExtensions(componentName, debug, includeTimings) {
                if (typeof debug === "undefined") { debug = false; }
                if (typeof includeTimings === "undefined") { includeTimings = false; }
                this.componentName = componentName;
                this.debug = debug;
                this.includeTimings = includeTimings;
            }
            DebugExtensions.prototype.log = function () {
                var args = [];
                for (var _i = 0; _i < (arguments.length - 0); _i++) {
                    args[_i] = arguments[_i + 0];
                }
                if (!this.debug)
                    return;

                try  {
                    var component = this.componentName;
                    if (this.includeTimings) {
                        var now = new Date();
                        component += " " + now.toLocaleTimeString() + ":" + now.getMilliseconds();
                    }

                    args.unshift("[" + component + "]");
                    if (window.console.debug)
                        console.debug.apply(console, args);
                    else if (window.console.log)
                        console.log.apply(console, args);
                } catch (e) {
                }
            };

            // Use this sparingly!
            DebugExtensions.prototype.documentTitle = function (title) {
                if (!this.debug)
                    return;

                try  {
                    document.title = title;
                } catch (e) {
                }
            };
            return DebugExtensions;
        })();
        utils.DebugExtensions = DebugExtensions;

        //#region General Utils
        function checkConfigExists() {
            if (!ag.config)
                throw new Error("Page configuration is missing. Please reload the page.");
        }
        utils.checkConfigExists = checkConfigExists;
        ;

        function addOptionalClasses(element) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            $.each(args, function (index, item) {
                if (!isNullOrUndefined(item))
                    element.addClass(item);
            });
        }
        utils.addOptionalClasses = addOptionalClasses;

        function htmlEncode(value) {
            // Only encode non empty, null, or undefined strings
            if (!value || typeof value != "string")
                return value;

            // Create a in-memory div, set it's inner text (which jQuery automatically encodes)
            // then grab the encoded contents back out.  The div never exists on the page.
            return $("<div/>").text(value).html();
        }
        utils.htmlEncode = htmlEncode;

        function htmlDecode(value) {
            if (!value || typeof value != "string")
                return value;

            return $("<div>{0}</div>".format(value)).text();
        }
        utils.htmlDecode = htmlDecode;

        // Get a parameter out of the queryString, either for the current
        // page / location, or pass in a queryString to be parsed
        function getQueryStringParameterByName(name, queryString) {
            var parameterName = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regex = new RegExp("[\\?&]" + parameterName + "=([^&#]*)"), results = regex.exec(queryString || location.search);

            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }
        utils.getQueryStringParameterByName = getQueryStringParameterByName;

        function getConstructorName(object) {
            if (!object)
                return "";

            var functionNameRegex = /function (.{1,})\(/, results = (functionNameRegex).exec((object).constructor.toString());

            return (results && results.length > 1) ? results[1] : "";
        }
        utils.getConstructorName = getConstructorName;

        // For splitting additional fields attributes
        function splitAndTrim(value) {
            return value.replace(/^\s+|\s+$/g, "").split(/\s*,\s*/g);
        }
        utils.splitAndTrim = splitAndTrim;

        // For appending a model prefix to an additional field name
        function appendModelPrefix(value, prefix) {
            if (value.indexOf("*.") === 0) {
                value = value.replace("*.", prefix);
            }
            return value;
        }
        utils.appendModelPrefix = appendModelPrefix;

        function callDescendantFunction(obj, desc) {
            var arr = desc.split(".");
            while (arr.length > 1) {
                obj = obj[arr.shift()];
            }

            return obj[arr[0]].call(obj);
        }
        utils.callDescendantFunction = callDescendantFunction;

        // Return the nearest container of this element bound to an application (top level) view model.
        function getModelContainer(element) {
            var result = element.closest("form[" + consts.viewModelContainerAttribute + "],div[" + consts.viewModelContainerAttribute + "]");
            if (result.length == 0)
                result = $(window.document.body);

            return result;
        }
        utils.getModelContainer = getModelContainer;

        function getAppViewModel(element) {
            if (!element)
                return null;

            var modelContainer = getModelContainer(element), viewModel = modelContainer.length > 0 ? ko.dataFor(modelContainer[0]) : null;

            return viewModel && viewModel.getModel && viewModel.getModel();
        }
        utils.getAppViewModel = getAppViewModel;

        function validateAndShowMessages(obj) {
            var deferred = $.Deferred(), errors = validate(obj);

            if (errors.length > 0) {
                var validationResult = { hasErrors: true, errors: errors };
                utils.showErrorsFromResult(validationResult);
                deferred.reject(validationResult);
            } else {
                deferred.resolve(obj);
            }

            return deferred.promise();
        }
        utils.validateAndShowMessages = validateAndShowMessages;

        // equivalent to ko.validation.group.showAllMessages(true)
        // but doesn't make all observables validatable which saves us memory
        function validate(obj) {
            var errors = [];
            traverseValidatables(obj, function (prop) {
                prop.isModified(true);

                var error = prop.error();
                if (error)
                    errors.push(error);
            });
            return errors;
        }
        utils.validate = validate;

        // equivalent to ko.validation.group.showAllMessages(false)
        // but doesn't make all observables validatable which saves us memory
        function resetValidation(obj) {
            traverseValidatables(obj, function (prop) {
                prop.isModified(false);
            });
        }
        utils.resetValidation = resetValidation;

        //hide the message of all observables where it's value is undefined, null, empty string or empty array
        function resetValidationIfEmpty(obj, ignore) {
            traverseValidatables(obj, function (prop, path) {
                var value;
                if (!_.contains(ignore, path)) {
                    value = prop();
                    if (isNullUndefinedOrEmpty(value) || (_.isArray(value) && _.isEmpty(value)))
                        prop.isModified(false);
                }
            });
        }
        utils.resetValidationIfEmpty = resetValidationIfEmpty;

        function traverseValidatables(obj, callback, parentPath) {
            if (ko.isObservable(obj) && isValidatable(obj))
                callback(obj, parentPath || "");

            var value = ko.unwrap(obj);
            if (_.isPlainObject(value) || _.isArray(value)) {
                _.each(value, function (memberValue, propNameOrIndex) {
                    traverseValidatables(memberValue, callback, (parentPath ? parentPath + "." + propNameOrIndex : propNameOrIndex)); //the path generated here is same as Knockout Mapping
                });
            }
        }

        // add an anonymous rule to the observable which is automatically removed when the element is disposed
        // addDisposeCallback is for unit testing
        function registerBindingRule(element, observable, rule, addDisposeCallback) {
            if (typeof addDisposeCallback === "undefined") { addDisposeCallback = ko.utils.domNodeDisposal.addDisposeCallback; }
            if (!_.isObject(rule))
                throw Error("invalid rule");
            if (rule.rule)
                throw Error("rule must be anonymous");

            // rules so this method only accept anonymous rules
            var condition = createEditableCondition(observable, rule.condition);

            if (condition)
                rule.condition = condition;

            ko.validation.addRule(observable, rule);

            addDisposeCallback(element, function () {
                observable.rules.remove(function (i) {
                    return i == rule;
                });
            });
        }
        utils.registerBindingRule = registerBindingRule;

        function addWarning(observable) {
            if (!observable.warning)
                observable.warning = ko.observable();
        }
        utils.addWarning = addWarning;

        // add a warning rule to the observable which is automatically removed when the element is disposed
        // addDisposeCallback is for unit testing
        // CAUTION: only one warning rule can be registered per observable
        // A better implementation is to extend Knockout Validation to support warnings
        // https://github.com/Knockout-Contrib/Knockout-Validation/issues/136
        function registerBindingWarningRule(element, observable, rule, addDisposeCallback) {
            if (typeof addDisposeCallback === "undefined") { addDisposeCallback = ko.utils.domNodeDisposal.addDisposeCallback; }
            if (!_.isFunction(rule))
                throw Error("invalid rule");

            addWarning(observable);

            var ruleRunner = createWarningRuleRunner(observable, rule, createEditableCondition(observable));
            addDisposeCallback(element, function () {
                ruleRunner.dispose();
            });
        }
        utils.registerBindingWarningRule = registerBindingWarningRule;

        function createWarningRuleRunner(observable, rule, condition) {
            var latestRunId = 0;

            return ko.computed(function () {
                latestRunId++;

                observable.warning('');

                if (condition && !condition())
                    return;

                var runId = latestRunId;
                rule(function (message) {
                    if (runId === latestRunId)
                        observable.warning(message);
                });
            });
        }
        utils.createWarningRuleRunner = createWarningRuleRunner;

        function createEditableCondition(observable, originalCondition) {
            if (!isMetaObservable(observable))
                return originalCondition;

            if (_.isFunction(originalCondition))
                return function () {
                    return isEditable(observable) && originalCondition();
                };

            return function () {
                return isEditable(observable);
            };
        }
        utils.createEditableCondition = createEditableCondition;

        function isMetaObservable(obj) {
            return obj && obj.isAvailable && obj.isVisible;
        }
        utils.isMetaObservable = isMetaObservable;

        function isValidatable(obj) {
            return obj && obj.isValid && obj.isModified && obj.rules;
        }
        utils.isValidatable = isValidatable;

        function isEditable(metaObservable) {
            return metaObservable.isVisible() && metaObservable.isAvailable();
        }
        utils.isEditable = isEditable;

        function isVisibleOrNotMetaObservable(obj) {
            return !isMetaObservable(obj) || obj.isVisible();
        }
        utils.isVisibleOrNotMetaObservable = isVisibleOrNotMetaObservable;

        function getParentTabHeaders($source) {
            var tabHeaders = [];
            _.each($source.parents("div.tab-pane"), function (tabPane) {
                pushApply(tabHeaders, $("#" + $(tabPane).attr("id") + "TabHeader"));
            });
            return $(tabHeaders);
        }
        utils.getParentTabHeaders = getParentTabHeaders;

        function focusForm(container) {
            // Focus on the first form input/select/textarea in the container
            var containerElement = container ? $(container) : $("form").first();
            if (!containerElement.length)
                containerElement = $(document);

            containerElement.find(":input:visible:not(.disabled):not(button):first").focus();
        }
        utils.focusForm = focusForm;

        function applyBindings(app, element, addContainerAttribute) {
            if (typeof addContainerAttribute === "undefined") { addContainerAttribute = true; }
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

            if (addContainerAttribute) {
                // Attribute the model container so we can find it easily from the context of a control
                $(element).attr(consts.viewModelContainerAttribute, true);

                // Signal that bindings have been processed
                // Restrict to container elements only - review of this maybe required
                PubSub.publishSync(ag.topics.ApplyBindingDone);
            }
            // Signal that bindings have been processed
            //$(document).trigger(topics.ApplyBindingDone);
        }
        utils.applyBindings = applyBindings;

        // Case-Insensitive hasOwnProperty method, returns the property
        // in its correct case if found or undefined if not
        function hasOwnPropertyCI(obj, property) {
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
        utils.hasOwnPropertyCI = hasOwnPropertyCI;

        function normalizeUrl(url) {
            if (url.startsWith("//"))
                url = url.substr(2);
            else if (url.startsWith("/"))
                url = url.substr(1);

            if (url.endsWith("/"))
                url = url.substring(0, url.length - 1);

            return url;
        }
        utils.normalizeUrl = normalizeUrl;

        // Get a Service Url based on the current location
        // should only used temporarily, should come
        // from server via @Request.GetSanitizedPath()
        function getDefaultServiceUrl() {
            return window.document.location.pathname;
        }
        utils.getDefaultServiceUrl = getDefaultServiceUrl;

        // Faster method for concatenating strings with support for format()
        // for ex:  var sb = new utils.StringBuilder();
        //          sb.append("hello").append(" ").append("there {0}", "bob");
        //          sb.toString(); => "hello there bob"
        var StringBuilder = (function () {
            function StringBuilder() {
                this.strings = [];
            }
            StringBuilder.prototype.append = function (s, args) {
                if (!args)
                    this.strings.push(s);
                else
                    this.strings.push(s.format(args));

                // allow chaining
                return this;
            };

            StringBuilder.prototype.toString = function () {
                return this.strings.join("");
            };
            return StringBuilder;
        })();
        utils.StringBuilder = StringBuilder;

        // Creates an attribute with unique values, useful for building Css Class
        // for ex:  var ab = new a.utils.AttributeBuilder("class");
        //          ab.append("small").append("column").append("column");
        //          ab.toString(); => class="small column"
        // Can also omit the attribute name to simply retrieve unique values
        var AttributeBuilder = (function () {
            function AttributeBuilder(attr) {
                this.attr = attr;
                this.strings = [];
            }
            AttributeBuilder.prototype.add = function (s) {
                // check existence of attribute
                if ($.inArray(s, this.strings) === -1)
                    this.strings.push(s);

                // allow chaining
                return this;
            };

            AttributeBuilder.prototype.toString = function () {
                // return attr="values" if attr supplied
                // otherwise just return unique values
                if (this.attr)
                    return "{0}=\"{1}\"".format(this.attr, this.strings.join(" "));
                else
                    return this.strings.join(" ");
            };
            return AttributeBuilder;
        })();
        utils.AttributeBuilder = AttributeBuilder;

        // Creates named template elements from the provided map of {name, content} pairs. These template elements can
        // then be referenced by Knockout bindings. Templates will be created only once.
        function createTemplateElements(templateMap) {
            for (var templateName in templateMap) {
                if ($("#" + templateName).length == 0) {
                    $('<script type="text/html"></script>').attr("id", templateName).html(templateMap[templateName]).appendTo($("body"));
                }
            }
        }
        utils.createTemplateElements = createTemplateElements;

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
        function ensureUniqueName(name, existingNames, nameProperty) {
            if (!name || name.trim() === "")
                throw new Error("name argument missing or empty.");

            var getMatchingNames = function (nameToMatch) {
                var matches = existingNames.filter(function (item) {
                    var compareName = item;
                    if (typeof compareName === "object") {
                        if (!nameProperty)
                            throw new Error("nameProperty argument missing, required when existingNames contains objects.");

                        compareName = compareName[nameProperty];
                    }

                    return compareName.toLowerCase() === nameToMatch;
                });

                return (matches && matches.length > 0) ? matches[0] : null;
            };

            var uniqueName = name, i = 2;
            while (getMatchingNames(uniqueName.toLowerCase())) {
                uniqueName = "{0} ({1})".format(name, i++);
            }

            return uniqueName;
        }
        utils.ensureUniqueName = ensureUniqueName;

        function getKeyFieldKey(fields) {
            var keyField = ko.utils.arrayFirst(fields, function (field) {
                return field.isKey;
            });
            return keyField && keyField.key;
        }
        utils.getKeyFieldKey = getKeyFieldKey;

        function getDisplayFieldKey(fields) {
            // Make sure we have at least one displayable field other than the selectable field (use the key
            // field if no other field is displayable).
            var displayField = null;
            var keyField = null;

            var displayableFields = $.map(fields, function (field) {
                if (!field.hidden && !displayField)
                    displayField = field;
                if (field.isKey && !keyField)
                    keyField = field;
                return !field.hidden;
            }).length;

            if (displayableFields == 0 && keyField) {
                // No displayable fields so return our key field as the display field.
                displayField = keyField;
            }

            return displayField && displayField.key;
        }
        utils.getDisplayFieldKey = getDisplayFieldKey;

        function getItemKey(item) {
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
        utils.getItemKey = getItemKey;

        function transformLookup(lookup) {
            if (!lookup.data)
                return lookup;

            // Flesh out probably sparse lookup data with defaults from a client-side representation of LookupData
            var newLookup = new ag.LookupData(lookup), keyFieldKey = getKeyFieldKey(newLookup.fields), displayFieldKey = getDisplayFieldKey(newLookup.fields) || keyFieldKey;

            if (displayFieldKey && keyFieldKey) {
                var filteredData = $.map(newLookup.data, function (item) {
                    var key = getPropertyByCaseInsensitiveName(item, ko.unwrap(keyFieldKey));
                    var text = getPropertyByCaseInsensitiveName(item, ko.unwrap(displayFieldKey));

                    return $.extend(item, {
                        "__key__": key,
                        "__text__": text
                    });
                });

                newLookup.data = filteredData;
            } else
                throw new Error("A lookup dataset needs to contain a key field and at least one displayable field");

            return newLookup;
        }
        utils.transformLookup = transformLookup;

        function transformLookups(references, data, path) {
            insertDefaultValueForLookupData(data);

            // Transform any named lookup references and lookup data mapping
            var lookupReferences = $.extend({}, references);

            $.each(lookupReferences, function (lookupRef, lookupDataRef) {
                if (typeof lookupDataRef !== "string")
                    return;

                delete references[lookupRef];

                // Store lookup data globally
                // We need to make the lookup observable because it can be modified programatically after binding
                createValueAtPath(ag.lookups.lookupData, getDelimitedPath(lookupRef, path), transformLookup(data[lookupDataRef]));
            });
        }
        utils.transformLookups = transformLookups;

        function insertDefaultValueForLookupData(lookupDatas) {
            if (!lookupDatas)
                return;

            _.each(lookupDatas, function (value) {
                var findDefault = false;
                _.each(value.data, function (obj) {
                    if (obj.value == 0)
                        findDefault = true;
                });
                if (!findDefault)
                    value.data.unshift({ value: 0, text: "" });
            });
        }

        // Traverses an object hierarchy on the specified root corresponding to the specified path,
        // creating nodes if they don't exist, and sets the value
        function createValueAtPath(root, path, value) {
            var parts = path.split(/[\[\]\.]+/), next, current = root;

            while (parts.length && (next = parts.shift())) {
                if (parts.length > 0) {
                    if (current[next] === undefined)
                        current[next] = {};
                    current = current[next];
                } else {
                    var mappingOptions = {
                        fields: { create: function (options) {
                                return options.data;
                            } },
                        data: { create: function (options) {
                                return options.data;
                            } }
                    };

                    // If the value already exists at this path, check whether it's an observable or mapped
                    if (current[next] && (ko.isObservable(current[next]) || ko.mapping.isMapped(current[next]))) {
                        // Updating
                        ko.mapping.fromJS(value, mappingOptions, current[next]);
                    } else {
                        // Creating
                        current[next] = ko.mapping.fromJS(value, mappingOptions);
                    }
                }
            }
        }
        utils.createValueAtPath = createValueAtPath;

        function getValueFromAccessor(item, accessor) {
            // Accessor is either a function or the name of an item property
            var val = typeof (accessor) == "function" ? accessor(item) : getPropertyByCaseInsensitiveName(item, accessor);
            return ko.unwrap(val);
        }
        utils.getValueFromAccessor = getValueFromAccessor;

        function getPropertyByCaseInsensitiveName(obj, name) {
            // Try the case-sensitive match first
            var val = obj[name];

            // No match, so try it case-insensitive
            if (!val) {
                var lcaseName = name.toLowerCase();
                for (var prop in obj) {
                    if (obj.hasOwnProperty(prop) && lcaseName == prop.toLowerCase())
                        return obj[prop];
                }
            }
            return val;
        }
        utils.getPropertyByCaseInsensitiveName = getPropertyByCaseInsensitiveName;

        function getObjectFromPath(parent, path) {
            // Retrieve the object at the specified child path.
            if (!path)
                return parent;

            var next = parent;

            path = path.split(/[\[\]\.]+/);

            if (path[path.length - 1] == "") {
                path.pop();
            }

            while (path.length && (next = next[path.shift()]) && next !== null)
                ;

            return path.length ? undefined : next;
        }
        utils.getObjectFromPath = getObjectFromPath;

        // TODO: merge this and getObjectFromPath
        function getObjectFromPathWithTest(parent, path, cb) {
            // Traverse the viewModel down the specified path and return the object for which
            // our callback returns true.
            // Do the test on the root
            if (cb && cb(parent)) {
                return parent;
            }

            // Continue testing child objects
            var next = parent;
            path = path.split(/[\[\]\.]+/);

            if (path[path.length - 1] == "") {
                path.pop();
            }

            while (path.length && (next = ko.unwrap(next)[path.shift()]) && next !== null && typeof ko.unwrap(next) === "object") {
                if (cb && cb(next)) {
                    return next;
                }
            }

            return path.length ? undefined : next;
        }
        utils.getObjectFromPathWithTest = getObjectFromPathWithTest;

        function addCollectionExtensionMethods(item, optionsText, optionsTitle, keyField) {
            $.extend(item, {
                getDisplayName: function () {
                    if (typeof item === "object") {
                        return optionsText ? getValueFromAccessor(item, optionsText) : getFirstObservableProperty(item);
                    } else {
                        return item;
                    }
                },
                getTitle: function () {
                    return typeof item === "object" && optionsTitle ? getValueFromAccessor(item, optionsTitle) : item;
                },
                __key__: keyField && getValueFromAccessor(item, keyField)
            });
        }
        utils.addCollectionExtensionMethods = addCollectionExtensionMethods;

        function getFirstObservableProperty(item) {
            var val = null;
            _.forEach(item, function (value) {
                if (ko.isObservable(value)) {
                    val = value();
                    return false;
                }
                return true;
            });
            return val;
        }
        utils.getFirstObservableProperty = getFirstObservableProperty;

        function getDelimitedPath(name, path) {
            if (!path)
                return name;
            return path.concat([name]).join(".");
        }
        utils.getDelimitedPath = getDelimitedPath;
        ;

        function navToEntity(actionUrl, params) {
            // Navigate to an entity on the site using an action URL and a set of parameters
            var url = "{0}{1}?{2}".format(ag.siteRoot, normalizeUrl(actionUrl), $.param(cleanJSForRequest(params)));
            ag.navigate(url);
        }
        utils.navToEntity = navToEntity;

        function getAdditionalFieldsFromModel(additionalFields, viewModel) {
            var additionalFieldsData = {}, fieldNames = $.map(splitAndTrim(additionalFields), function (item) {
                return appendModelPrefix(item, "");
            }), unwrappedViewModel = ko.unwrap(viewModel);

            // Set the filter value to the value of the Knockout observable bound to the additional field.
            // If the additional field is a dotted path, find the relevant path from the current level.
            $.each(fieldNames, function (index, item) {
                var pathValue = getObjectFromPath(unwrappedViewModel, item);
                if (typeof pathValue === "undefined")
                    throw new Error("Could not find property at path '{0}' on data model".format(item));

                if (isNullOrUndefined(pathValue)) {
                    return pathValue;
                }

                if (ko.isObservable(pathValue)) {
                    var unwrapped = ko.unwrap(pathValue);
                    if (isNullOrUndefined(unwrapped))
                        return unwrapped;
                }

                createValueAtPath(additionalFieldsData, item, ko.mapping.toJS(pathValue));
            });

            return ko.mapping.toJS(additionalFieldsData);
        }
        utils.getAdditionalFieldsFromModel = getAdditionalFieldsFromModel;

        // Utility method to get any additional fields required for a lookup action.
        function getAdditionalFields(target, viewModel, rootViewModel, containingModel) {
            var includeCompleteModel = !!target.data("lookup-include-complete-model"), completeModelPath = target.data("lookup-complete-model-path"), includeParentObject = !!target.data("lookup-include-parent-object"), additionalFieldsData = target.data("lookup-additional-fields"), useAppModelAsParent = !!target.data("lookup-use-app-model-as-parent"), bindingContext = ko.contextFor(target[0]), prefix = target.data("prefix") || "", additionalFields = {}, appModel = viewModel, rootModel = rootViewModel || (bindingContext && bindingContext.$root), parentModel = viewModel;

            containingModel = containingModel || ko.dataFor($(target)[0]);

            // Look for the application view model data at (in order of preference) the property on the root model defined by the prefix; the getModel method
            // on the root model; the getModel method on some containing view model (perhaps not the root model).
            if (!appModel) {
                if (!rootModel)
                    throw new Error("No root model available");

                appModel = prefix.length > 0 ? getProperty(rootModel, prefix) || getProperty(containingModel, prefix) : (rootModel && rootModel.getModel && rootModel.getModel());

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

            if (includeCompleteModel) {
                var modelValue;
                if (completeModelPath)
                    modelValue = getProperty(appModel, completeModelPath);

                if (modelValue)
                    additionalFields.data = ko.mapping.toJS(modelValue);
                else
                    additionalFields.data = ko.mapping.toJS(appModel);
            }

            if (includeParentObject) {
                // Return the immediate parent of the bound property
                additionalFields.contextModel = ko.mapping.toJS(parentModel);
            }

            // No individual additional fields specified so just return with any data or parent models
            if (!additionalFieldsData)
                return additionalFields;

            return { data: getAdditionalFieldsFromModel(additionalFieldsData, parentModel) };
        }
        utils.getAdditionalFields = getAdditionalFields;

        // Iterate an objects properties (and arrays and sub-objects)
        // deleting any properties that are null as for a Get request
        // data is sent on the Url and the MVC model binder cannot tell
        // that &name=null should set the Name property to null versus "null"
        // as a valid value would look the same &name=fred
        function cleanJSForRequest(vm, responseOnlyProperties, postOnlyProperties) {
            if (responseOnlyProperties)
                utils.clearProperties(responseOnlyProperties, vm);

            if (postOnlyProperties)
                utils.clearProperties(postOnlyProperties, vm);

            return walkObject(vm, function (obj, property) {
                var value = obj[property];
                if (value === null || _.isFunction(value)) {
                    delete obj[property];
                    return true;
                }

                return false;
            });
        }
        utils.cleanJSForRequest = cleanJSForRequest;

        function getObjectPropertyByString(o, s) {
            s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
            s = s.replace(/^\./, ''); // strip a leading dot
            var a = s.split('.');
            while (a.length) {
                var n = a.shift().toCamelCase();
                if (n in o) {
                    o = o[n];
                } else {
                    return undefined;
                }
            }
            return o;
        }
        utils.getObjectPropertyByString = getObjectPropertyByString;

        function getModelPrefix(fieldName) {
            return fieldName.substr(0, fieldName.lastIndexOf(".") + 1);
        }
        utils.getModelPrefix = getModelPrefix;

        function walkObject(obj, callback) {
            var forEachFn = function (index, property) {
                walkObject(property, callback);
            };

            for (var p in obj) {
                if (!obj.hasOwnProperty(p))
                    continue;

                var property = ko.unwrap(obj[p]);

                //  Callback can decide what to do with
                // Functions but they will not be walked
                if (callback(obj, p) || _.isFunction(property))
                    continue;

                if (_.isArray(property)) {
                    if (!_.isEmpty(property))
                        $.each(property, forEachFn);
                    else
                        callback(obj, p);
                } else if (_.isObject(property) && !_.isEmpty(property)) {
                    walkObject(property, callback);
                }
            }

            return obj;
        }
        utils.walkObject = walkObject;

        function getDealAnalyseActionFromTarget(event) {
            var url = $(event.target).closest("td[data-detail-url],tr[data-detail-url]").data("detail-url");
            var index = url.lastIndexOf("/");
            return url.substr(index + 1);
        }
        utils.getDealAnalyseActionFromTarget = getDealAnalyseActionFromTarget;

        function getDealAnalysePayload(event, model) {
            var target = $(event.target).closest("td[data-detail-url],tr[data-detail-url]"), values = target.data("detail-values"), includeModel = target.data("detail-include-complete-model"), params = values || {};

            if (includeModel)
                params = $.extend(values, ko.mapping.toJS(model || {}));

            return params;
        }
        utils.getDealAnalysePayload = getDealAnalysePayload;

        function openApplicationFromEventTarget(event) {
            // Open Deals in a new window or allow natural link
            // navigation if CTRL or SHIFT is down (new browser tab)
            // Center mouse button will open new browser tab too
            if (event.ctrlKey || event.shiftKey)
                return true;

            openApplicationWindow($(event.currentTarget).attr("href"));
            return false;
        }
        utils.openApplicationFromEventTarget = openApplicationFromEventTarget;

        function openApplicationWindow(path, data, responseOnlyProperties, postOnlyProperties, navigate) {
            if (typeof navigate === "undefined") { navigate = false; }
            if (data) {
                path += path.indexOf("?") !== -1 ? "&" : "?";
                path += $.param(cleanJSForRequest(data, responseOnlyProperties, postOnlyProperties));
            }

            return new ag.WindowManager({ url: path, navigate: navigate });
        }
        utils.openApplicationWindow = openApplicationWindow;

        function openApplicationWindowPromise(path, data, navigate, responseOnly) {
            return openApplicationWindow(path, data, responseOnly, null, navigate).promise;
        }
        utils.openApplicationWindowPromise = openApplicationWindowPromise;

        function documentTitle() {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            if (args && args.length > 0) {
                var title = args[0], keyValue;

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
        utils.documentTitle = documentTitle;

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
        function flattenDictionary(collection, fnCondition, prefix, result) {
            var _this = this;
            result = result || {};

            prefix = prefix ? prefix + "." : "";
            $.each(collection, function (propertyName, item) {
                var name = prefix + propertyName;
                if (fnCondition && fnCondition(item)) {
                    result[name] = item;
                } else {
                    _this.flattenDictionary(item, fnCondition, name, result);
                }
            });
            return result;
        }
        utils.flattenDictionary = flattenDictionary;

        function getPageIdToken() {
            return $("input[name='__PageIdToken']").val();
        }
        utils.getPageIdToken = getPageIdToken;

        function getRequestVerificationToken() {
            return $("input[name='__RequestVerificationToken']").val();
        }
        utils.getRequestVerificationToken = getRequestVerificationToken;

        function exportCrystalReport(serviceUrl, reportName, selectedItemKeyValue, pageIdToken) {
            utils.openApplicationWindow("/{0}/exportcrystalreport/?reportName={1}&keyValue={2}&__PageIdToken={3}".format(serviceUrl, reportName, selectedItemKeyValue, pageIdToken), null, null, null, false);
        }
        utils.exportCrystalReport = exportCrystalReport;

        function findHighestDivZIndex() {
            var s = 0;
            _.each($("div"), function (target) {
                var temp = $(target).css("z-index");
                if (temp != "auto") {
                    if (parseInt(temp) > s)
                        s = parseInt(temp);
                }
            });
            return s;
        }
        utils.findHighestDivZIndex = findHighestDivZIndex;

        // Best practise for push apply - http://jsperf.com/array-prototype-push-apply-vs-concat/5
        function pushApply(a, b) {
            var i = 0, c = b.length;

            for (; i < c; ++i) {
                a.push(b[i]);
            }
        }
        utils.pushApply = pushApply;

        // Remove the option if its value = 0 && text = ""
        function optionsAfterRender(element, data) {
            var ele = $(element);
            if (data.value == 0 && data.text === "") {
                ele.hide();
                ele.attr('disabled', 'disabled');
                ele.val('.');
            }
        }
        utils.optionsAfterRender = optionsAfterRender;

        function radioButtonGroupOptionsAfterRender(element, data) {
            optionsAfterRender(element, data);

            var parent = $(element).parent(), emptylabeladded = "emptyLabelAdded";

            if (parent.data(emptylabeladded))
                return;

            if (data.value === 0 && data.text !== "") {
                var labelElement = document.createElement("label");

                $(labelElement).hide();
                $(labelElement).attr('disabled', 'disabled');
                parent.prepend(labelElement);

                parent.data(emptylabeladded, true);
            }
        }
        utils.radioButtonGroupOptionsAfterRender = radioButtonGroupOptionsAfterRender;

        function updateQuickMenuPosition(event) {
            var ele = $(event.currentTarget), positionLeft = ele.position().left, menuWidth = ele.siblings('ul').width(), leftOffset = $(document).width() - menuWidth - event.pageX;

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
        utils.updateQuickMenuPosition = updateQuickMenuPosition;

        function getRateLimitOption(timeout, isDebounced) {
            if (typeof timeout === "undefined") { timeout = 1; }
            if (typeof isDebounced === "undefined") { isDebounced = true; }
            if (!isDebounced)
                return { timeout: timeout };

            return {
                timeout: timeout,
                method: "notifyWhenChangesStop"
            };
        }
        utils.getRateLimitOption = getRateLimitOption;

        function calculateComputedBasedOnProperty(property, context) {
            if (_.isNull(context.editingItem))
                return false;

            if (!_.has(context.editingItem, property))
                return false;

            return ko.unwrap(context.editingItem[property]);
        }
        utils.calculateComputedBasedOnProperty = calculateComputedBasedOnProperty;

        function getNumberHelper() {
            if (!ag.calculator)
                ag.calculator = new ag.NumberCalculator();

            return ag.calculator;
        }
        utils.getNumberHelper = getNumberHelper;

        function isValidURL(url) {
            var temp = url.match(/((?:https?\:\/\/|www\.)(?:[-a-z0-9]+\.)*[-a-z0-9]+.*)/ig);
            return temp ? temp.length > 0 : false;
        }
        utils.isValidURL = isValidURL;

        function inflateCurrencies(currencies) {
            var result = {};

            $.each(currencies, function (index, item) {
                result[item[0]] = { amountDp: item[1], fxDp: item[2], intDp: item[3], roundType: item[4] };
            });

            return result;
        }
        utils.inflateCurrencies = inflateCurrencies;

        function escapeRegexChars(str) {
            return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
        }
        utils.escapeRegexChars = escapeRegexChars;

        //custom observable equalityComparer
        function strictEqualityComparer(a, b) {
            return a === b;
        }
        utils.strictEqualityComparer = strictEqualityComparer;
    })(ag.utils || (ag.utils = {}));
    var utils = ag.utils;

    //#endregion
    (function (mathEx) {
        function round(value, decimalPlaces) {
            return decimalAdjust('round', value, decimalPlaces);
        }
        mathEx.round = round;

        function floor(value, decimalPlaces) {
            return decimalAdjust('floor', value, decimalPlaces);
        }
        mathEx.floor = floor;

        function ceil(value, decimalPlaces) {
            return decimalAdjust('ceil', value, decimalPlaces);
        }
        mathEx.ceil = ceil;

        // Precise rounding
        // Inspired by https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
        function decimalAdjust(type, value, decimalPlaces) {
            if (!isFinite(value))
                return value;

            var exp = decimalPlaces > 0 ? decimalPlaces * -1 : 0;

            if (exp === 0)
                return Math[type](value);

            // Shift
            var ret = value.toExponential().split('e');
            ret = Math[type](Number(ret[0] + 'e' + (Number(ret[1]) - exp)));

            // Shift back
            ret = ret.toExponential().split('e');
            return Number(ret[0] + 'e' + (Number(ret[1]) + exp));
        }

        // Count the fractional digits
        function fractionDigits(value) {
            if (!isFinite(value))
                return NaN;

            var match = /(\d+)(\.(\d+))?e(.+)/.exec(value.toExponential());
            return Math.max((!match[3] ? 0 : match[3].length) - Number(match[4]), 0);
        }
        mathEx.fractionDigits = fractionDigits;

        // Chop off the fractional part
        function trunc(x) {
            return x < 0 ? Math.ceil(x) : Math.floor(x);
        }
        mathEx.trunc = trunc;
    })(ag.mathEx || (ag.mathEx = {}));
    var mathEx = ag.mathEx;

    // Init self
    init(self);
})(ag || (ag = {}));
//#endregion
