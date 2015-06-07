var ag;
(function (ag) {
    var BaseViewModel = (function () {
        function BaseViewModel(options) {
            var _this = this;
            this.options = options;
            this.errors = ko.observableArray();
            this.hasErrors = ko.observable(false);
            this.exportFileType = ko.observable("csv");
            this.tabs = {};
            this.isSearchMode = ko.observable(false);
            this.isEditorReadOnly = ko.observable(false);
            options = this.getDefaultOptions(options);
            options.serviceUrl = ag.utils.normalizeUrl(options.serviceUrl);

            this.serviceUrl = options.serviceUrl;
            this.lookups = options.lookups || {};
            this.lookupData = options.lookupData || {};
            this.responseOnly = options.responseOnly;
            this.postOnly = options.postOnly;
            this.updatingModel = ag.createUpdatingModelHelper();

            this.net = new ag.utils.Network({ area: ag.area, controller: ag.controller, responseOnly: this.responseOnly, postOnly: this.postOnly });

            this.typeMetaDataUrl = options.typeMetaDataUrl;

            // Extend ourselves with lookups functionality
            ko.utils.extend(this, ag.lookups.createLookupsViewModel(options, this.lookups));

            // Take a copy of the lookup info so we can reset after filtering
            this.clonedLookups = $.extend(true, {}, this.lookups);
            this.clonedLookupData = $.extend(true, {}, this.lookupData);

            // Transform any named lookup references
            ag.utils.transformLookups(this.lookups, this.lookupData);

            // Initialise tabs
            if (options.tabs && options.tabs.length) {
                // formatted as tabs.tab1 and tabs.tab1.tabs.nestedTab1
                $.each(options.tabs, function (index, item) {
                    // Get the parts without the first "tabs" segment
                    var parts = item.split(".").slice(1);
                    ag.setProperty(_this.tabs, parts.join("."), ko.observable(false));
                });
            }

            this.filterOptions = $.extend({}, options);
            this.filters = new ag.FiltersViewModel(this.filterOptions);
            this.hasPendingChanges = ko.computed(function () {
                return false;
            });
            this.hasPendingChangesInChildren = ko.computed(function () {
                return false;
            });
            this.isDeactivated = ko.computed(function () {
                return false;
            });
            this.isEditorReadOnly(options.isReadOnly);

            // Subscribe to activity completion
            PubSub.subscribe(ag.topics.ActivityCompleted, function (topic, activityId) {
                // Any response with an activityId means there are some activities logged
                if (!ag.isNullUndefinedOrEmpty(activityId)) {
                    _this.activityId = activityId;
                    _this.hasErrors(true);
                }
            });

            // Set the global viewModel for debugging purposes only
            ag.viewModel = this;
        }
        BaseViewModel.prototype.showExportDialog = function () {
            var $element = $('#exportDialog');
            $element.modal('show');
            $($("#exportDialog label:last")).show();
            this.exportFileType("csv");
        };

        BaseViewModel.prototype.resetLookups = function () {
            // Overwrite the current lookup state with the original (un-filtered state)
            // Must supply clones to the transformLookups method otherwise it squashes the referenced objects
            ag.utils.transformLookups($.extend(true, {}, this.clonedLookups), $.extend(true, {}, this.clonedLookupData));
        };

        BaseViewModel.prototype.setupApplicationHeaders = function (data, applicationHeaders) {
            if (!applicationHeaders || $.isEmptyObject(applicationHeaders))
                return;

            ag.utils.registerHeaderSetter(function (headers) {
                for (var property in applicationHeaders) {
                    var value = ko.unwrap(ag.getProperty(data, applicationHeaders[property]));
                    if (!_.isNull(value) && !_.isUndefined(value))
                        headers[property] = value;
                }
            });
        };

        BaseViewModel.prototype.getDefaultOptions = function (options) {
            var result = options || {};
            result.serviceUrl = result.serviceUrl || ag.utils.getDefaultServiceUrl();

            return result;
        };

        BaseViewModel.prototype.initDependencies = function (editingItem) {
            // Dependencies needs to come last - after the model has completed initialising
            if (!$.isEmptyObject(this.options.dependencies))
                ag.dependencies.init(editingItem, this.options.dependencies, this.options, this);
        };

        // Export a Crystal Report to PDF
        BaseViewModel.prototype.exportCrystalReport = function (reportName) {
            ag.utils.exportCrystalReport(this.serviceUrl, reportName, "all", ag.utils.getPageIdToken());
        };

        BaseViewModel.prototype.initNav = function () {
            var _this = this;
            if (!this.options.clientSideNavDisabled) {
                // Create the nav object
                this.nav = new NavHistory({
                    params: this.navigateGetParams(),
                    onNavigate: function (navEntry, navInfo) {
                        _this.silenceDependency(_this.navigateDelegator, _this, navEntry, navInfo);
                    }
                }).initialize({ linkToUrl: true });
            }
        };

        BaseViewModel.prototype.silenceDependency = function (fn, context) {
            var _this = this;
            var args = [];
            for (var _i = 0; _i < (arguments.length - 2); _i++) {
                args[_i] = arguments[_i + 2];
            }
            var deferred = $.Deferred();

            this.updatingModel(true);
            var fnObj = fn.call(context, args, context);

            // Fn -> possible return a JQueryDeferred object
            // if so chain the event
            if (fnObj && _.isObject(fnObj) && _.has(fnObj, 'always')) {
                fnObj.always(function () {
                    _this.updatingModel(false);
                    deferred.resolve();
                });
            } else {
                this.updatingModel(false);
                deferred.resolve();
            }

            return deferred;
        };

        BaseViewModel.prototype.getCurrentURLparams = function () {
            if (!this.nav)
                return "";

            var temp = this.nav.params(), urlString = "";

            $.each(temp, function (property, value) {
                if (value)
                    urlString += encodeURI(property + "=" + value) + "&";
            });

            return urlString.substring(0, urlString.length - 1);
        };

        BaseViewModel.prototype.filterLookupUrl = function (filter, gridViewModel, lookupAction, controller) {
            var url = "{0}{1}/{2}/".format(ag.siteRoot, ag.area, controller || ag.controller), key = ko.unwrap(filter.key), isTypeViewFilter = gridViewModel.views && gridViewModel.views.typeName != null;

            if (!isTypeViewFilter) {
                lookupAction = lookupAction ? lookupAction : "viewfilterlookup";
                url += "{0}?fieldKey={1}".format(lookupAction, key);
            } else {
                url += "get{0}viewfilterlookup".format(key);
            }

            return url;
        };

        BaseViewModel.prototype.afterKeyBindingChangeCallbackFunction = function () {
        };

        // Virtual methods
        BaseViewModel.prototype.exportView = function (viewModel, event) {
            throw new Error("Derived class need override this method");
        };

        BaseViewModel.prototype.navigateGetParams = function () {
            throw new Error("Derived class need override this method");
        };

        BaseViewModel.prototype.navigateDelegator = function (args, currrentContext) {
            throw new Error("Derived class need override this method");
        };
        return BaseViewModel;
    })();
    ag.BaseViewModel = BaseViewModel;
})(ag || (ag = {}));
