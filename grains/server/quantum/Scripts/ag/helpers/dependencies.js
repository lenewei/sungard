/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    (function (_dependencies) {
        "use strict";

        //#region Information
        /*
        Provides a centralised place to handle UI related dependecies. These dependencies are derived form the models
        meta data attributes. These attributes are then serialized into JSON objects to be consumed by the
        following functions.
        
        //#region Field Dependencies
        
        Field Dependencies
        
        An 'Availability' dependency condition makes the field available : i.e. not read only
        A 'Visibility' condition makes the field visible
        A 'Value' condition can determine the field's value
        A 'State' condition encompasses all the previois conditions
        A 'Refresh' condition causes the model to be refreshed from the server
        
        All 'Availability' \ 'Visibility' conditions have the following properties:
        
        Who:
        
        string       dependent      - who is affected
        string       dependsOn      - who the dependent needs to be aware of, i.e. who triggers a change in state
        
        When:
        
        enum         condition      - what condition need to be met, i.e. does x == y
        any type     compareValue   - the value to compare with
        string       compareTo      - compare with the value of another property
        
        Action: If so then perform an action, i.e. set the dependent property to invisible
        
        bool         value          - true \ false
        
        Miscellaneous
        
        bool         applyAtStartUp - Check this rule \ condition when the page loads
        
        'Value', State' conditions have the following extra modified properties:
        
        enum         action         - possible actions, e.g. Set value, reset property, call a custom function
        any type     value          - Sets the property value
        string       functionName   - function to call
        
        'State' conditions only
        
        bool         available      - Set Availablity to true \ false
        bool         visible        - Set Visibility to true \ false
        
        'Refresh'
        
        string      trigger         - who triggers the refresh
        string      action          - action that is to be performed at the server
        string      associatedFields - list of fields that are affected by the refresh
        string      associatedLookups - list of prefetched lookups that are affected by the refresh
        
        //#endregion
        
        //#region Complex Dependencies
        
        Complex Dependencies
        
        A complex dependency a a dependency between fields that is best modelled using specific js code. This
        code should generic and could be used in a number of circumstances.
        
        In the included examples the following relationships are modelled:
        
        TermRelationship
        Changing 'Deal Date' affects 'Term'       ('Term' = 'Settlement Date' - 'Deal Date')
        Changing 'Settlement Date' affects 'Term' ('Term' = 'Settlement Date' - 'Deal Date')
        Changing 'Term' value affects 'Settlement Date' ('Settlement Date' = 'Deal Date' + 'Term')
        
        SyncRelationship
        Changing 'Settlement Date' modified 'Bank Value Date'
        
        CycleBasisAndDateRelationship
        Changing 'Frequency' to 'Monthly' and 'CycleBasis' to 'END OF MONTH' sets 'Settlement Date' the end of the month
        Changing 'Settlement Date' affects 'CycleBasis'. When 'CycleBasis' is 'END OF MONTH' and 'Settlement Date' is not the end of the month then set 'CycleBasis' as 'DAY OF MONTH'.
        
        //#endregion
        */
        //#endregion
        // Actions that can be applied to a property
        // This enum needs to be kept in sync with the the 'PerformAction' enum on the server
        var performAction;
        (function (performAction) {
            performAction[performAction["None"] = 0] = "None";
            performAction[performAction["Clear"] = 1] = "Clear";
            performAction[performAction["Reset"] = 2] = "Reset";
            performAction[performAction["SetValue"] = 3] = "SetValue";
            performAction[performAction["CopyFrom"] = 4] = "CopyFrom";
            performAction[performAction["CustomFunction"] = 5] = "CustomFunction";
            performAction[performAction["Refresh"] = 6] = "Refresh";
            performAction[performAction["ResetModel"] = 7] = "ResetModel";
        })(performAction || (performAction = {}));
        ;

        var applyCondition;
        (function (applyCondition) {
            applyCondition[applyCondition["AllTheTime"] = 0] = "AllTheTime";
            applyCondition[applyCondition["OnlyWhenTheGivenPropertyIsModified"] = 1] = "OnlyWhenTheGivenPropertyIsModified";
            applyCondition[applyCondition["OnlyWhenTheGivenPropertyIsNotModified"] = 2] = "OnlyWhenTheGivenPropertyIsNotModified";
            applyCondition[applyCondition["OnlyWhenTheGivenPropertyIsModifiedByUser"] = 3] = "OnlyWhenTheGivenPropertyIsModifiedByUser";
            applyCondition[applyCondition["OnlyAtStartup"] = 4] = "OnlyAtStartup";
            applyCondition[applyCondition["OnlyWhenKeyHasChanged"] = 5] = "OnlyWhenKeyHasChanged";
        })(applyCondition || (applyCondition = {}));
        ;

        function init(viewModel, models, options, app, startInUpdateMode) {
            if (typeof startInUpdateMode === "undefined") { startInUpdateMode = true; }
            var result = new DependencyFactory();
            return result.init(viewModel, models, options, app, startInUpdateMode);
        }
        _dependencies.init = init;

        var DependencyCategory = (function () {
            function DependencyCategory(type, propertyMethod, handle, ignoreIfSuspended) {
                this.type = type;
                this.propertyMethod = propertyMethod;
                this.handler = handle;
                this.ignoreIfSuspended = ignoreIfSuspended;
            }
            return DependencyCategory;
        })();

        var Task = (function () {
            function Task() {
            }
            return Task;
        })();

        var TaskRulesBase = (function () {
            function TaskRulesBase() {
            }
            return TaskRulesBase;
        })();

        var TaskRulesRefresh = (function (_super) {
            __extends(TaskRulesRefresh, _super);
            function TaskRulesRefresh() {
                _super.apply(this, arguments);
            }
            return TaskRulesRefresh;
        })(TaskRulesBase);

        var TaskRulesDependencies = (function (_super) {
            __extends(TaskRulesDependencies, _super);
            function TaskRulesDependencies() {
                _super.apply(this, arguments);
            }
            return TaskRulesDependencies;
        })(TaskRulesBase);

        var DependencyFactory = (function () {
            function DependencyFactory() {
            }
            // initialize dependencies
            DependencyFactory.prototype.init = function (viewModel, models, options, app, startInUpdateMode) {
                var _this = this;
                if (!models || _.size(models) === 0)
                    return new DependenciesHandle();

                var viewModelInfo = {
                    options: options,
                    viewModel: viewModel,
                    app: app,
                    keyFields: app.fieldCategories ? app.fieldCategories.keyFields || [] : []
                };

                var dependenciesHandle = new DependenciesHandle();
                var fieldDependencyRule = new FieldDependencies(app, startInUpdateMode);

                dependenciesHandle.addDependency(fieldDependencyRule);

                $.each(models, function (i, model) {
                    // Set up all the field Dependencies
                    _this.createFieldDependencyRules(fieldDependencyRule, i, viewModelInfo, model, app.fieldCategories);

                    // Set up all the complex Dependencies
                    dependenciesHandle.addDependencyRange(_this.createComplexDependencyRules(app, viewModelInfo, model, startInUpdateMode));
                });

                return dependenciesHandle;
            };

            DependencyFactory.prototype.createComplexDependencyRules = function (app, viewModel, model, startInUpdateMode) {
                if (model == null)
                    return [];

                var items = model.complex;
                if (items == null || !$.isArray(items))
                    return [];

                var dependencyFactory = new ComplexDependencyFactory(app, startInUpdateMode), dependencies = [];

                $.each(model.paths, function (i, path) {
                    $.each(model.complex, function (j, rule) {
                        dependencies.push(dependencyFactory.create(rule.name, rule.parameters, path, viewModel));
                    });
                });

                return dependencies;
            };

            DependencyFactory.prototype.createFieldDependencyRules = function (fieldRules, id, viewModelInfo, model, fieldCategories) {
                fieldRules.create(id, viewModelInfo, model, fieldCategories);
            };
            return DependencyFactory;
        })();

        var DependencyBase = (function () {
            function DependencyBase(app, startInUpdateMode) {
                var _this = this;
                this.subTokens = [];
                this.runningId = 0;
                this.handleRefreshDependency = function (taskRule, updatingModel) {
                    var trigger = taskRule.trigger, rule = taskRule.rule, path = taskRule.path;

                    var observable = _this.getObservableFromPath(taskRule.context, path, trigger);
                    if (observable && !observable.isSuspended()) {
                        if (_this.applyRuleOnUpdate(updatingModel, rule, trigger))
                            return false;

                        if (rule.dependentCondition === 0 /* Modified */ || (is(observable(), rule.dependentCondition, null, false)))
                            _this.handleRefresh(rule.id, taskRule.context, observable, rule.dependent, rule.action, rule.associatedFields, rule.associatedLookups, rule.additionalFields, rule.suspendFields, path, rule.includeModelData, rule.controller, rule.oneWay);
                    }
                    return true;
                };
                this.getObservable = _.memoize(function (name, viewModel) {
                    return ag.getProperty(viewModel, name);
                });
                this.actionQueue = ko.observableArray([]);
                this.updatingCount = ko.observable(0);
                this.updatingViewModel = ko.observable(startInUpdateMode);
                this.app = app;

                this.updatingModel = ko.computed({
                    read: function () {
                        var result = (_this.updatingCount() > 0 || (_this.loadingViewModel && _this.loadingViewModel()));
                        return result;
                    },
                    write: function (value) {
                        var currentDepth = _this.updatingCount();
                        currentDepth += (value ? 1 : (-1));
                        _this.updatingCount(Math.max(currentDepth, 0));
                    }
                });

                this.loadingViewModel = ko.computed({
                    read: function () {
                        var result = (_this.app ? _this.app.updatingModel() : false) || _this.updatingViewModel();

                        return result;
                    }
                });

                this.subscribeToTopic(ag.topics.UpdatingViewModel, function (msg, data) {
                    if (data.viewModel == _this.app) {
                        _this.updatingViewModel(data.value);
                    }
                });

                this.subscribeToTopic(ag.topics.ApplyBindingDone, function () {
                    _this.updatingViewModel(false);
                });

                this.releaseTasks = ko.computed(function () {
                    if (!_this.loadingViewModel() && _this.actionQueue().length > 0) {
                        while (_this.releaseTask()) {
                        }
                    }
                }).extend({ rateLimit: { timeout: 50, method: "notifyWhenChangesStop" } });
            }
            DependencyBase.prototype.subscribeToTopic = function (topic, callback) {
                this.subTokens.push(PubSub.subscribe(topic, callback));
            };

            DependencyBase.prototype.dispose = function () {
                _.each(this.subTokens, function (token) {
                    PubSub.unsubscribe(token);
                });

                this.loadingViewModel.dispose();
                // nice to have: dispose the subscription in addTask. This is a low priority since the
                // dereferencing the model also marks the subscription for garbage collection.
            };

            DependencyBase.prototype.checkDuplicateTask = function (task) {
                var id = task.id;
                var items = this.actionQueue.remove(function (y) {
                    return y.id == id;
                });

                if (items.length > 0 && task.allowMultipleTriggers) {
                    _.forEach(items, function (removedItem) {
                        task.triggers = _.union(task.triggers, removedItem.triggers);
                    });
                }
                this.actionQueue.push(task);
            };

            DependencyBase.prototype.addTask = function (id, context, callee, fn, rules, ignoreIfAlreadyUpdating, ignoreIfSuspended, allowMultipleTriggers) {
                var _this = this;
                if (typeof ignoreIfAlreadyUpdating === "undefined") { ignoreIfAlreadyUpdating = false; }
                if (typeof ignoreIfSuspended === "undefined") { ignoreIfSuspended = false; }
                if (typeof allowMultipleTriggers === "undefined") { allowMultipleTriggers = false; }
                var applyTask = function (updatingModel) {
                    var task = {
                        id: id, context: context, callee: callee, handler: fn, rules: rules,
                        updatingModel: updatingModel, ignoreWhenSuspended: ignoreIfSuspended,
                        triggers: [rules.trigger], allowMultipleTriggers: allowMultipleTriggers
                    };
                    _this.checkDuplicateTask(task);
                };
                if (callee) {
                    callee.subscribe(function () {
                        var updatingModel = ko.unwrap(_this.updatingModel);
                        if (_this.ignoreCallee === callee)
                            return;
                        if (ignoreIfAlreadyUpdating && updatingModel)
                            return;
                        if (ignoreIfSuspended && ko.unwrap(callee.isSuspended))
                            return;
                        applyTask.call(context, updatingModel);
                    });
                } else {
                    applyTask.call(context, ko.unwrap(this.updatingModel));
                }
                ;
            };

            DependencyBase.prototype.releaseTask = function () {
                if (!this.actionQueue || ko.unwrap(this.actionQueue).length == 0)
                    return false;

                var action = this.actionQueue.shift(), callee = action.callee, handler = action.handler, context = action.context, rules = action.rules;

                var ignoreIfSuspended = action.ignoreWhenSuspended;

                if (callee == null || !ignoreIfSuspended || !ko.unwrap(callee.isSuspended)) {
                    handler.call(context, rules, action.updatingModel, action.triggers);
                }
                return (this.actionQueue().length > 0);
            };

            /// handleRefresh
            /// Initiate call back to the server
            /// Update necessary fields
            DependencyBase.prototype.handleRefresh = function (id, viewModel, source, sourceName, action, fields, updateLookups, additionalFields, suspendFields, path, includeCompleteModel, controller, oneWay) {
                var _this = this;
                var params, data = {};

                var fn = function (value) {
                    return _this.getObservableFromPath(viewModel, path, value);
                }, updateAllFields = !oneWay && isBlank(fields), fieldsToUpdate = (!oneWay ? toArray(fields, true) : []), fieldsToObserve = (!oneWay ? toArray(fields, true, fn) : []), prefix = $.map(path.path, function (n) {
                    return n.toCamelCase() + ".";
                }).join(""), suspensions = !oneWay ? toArray(suspendFields, true, fn) : [];

                if (source && sourceName) {
                    sourceName = prefix + sourceName.toCamelCase();
                    data[sourceName] = source();
                }

                if (includeCompleteModel) {
                    data = ko.mapping.toJS(viewModel);
                } else {
                    if (additionalFields) {
                        var additions = $.map(additionalFields.split(","), function (value) {
                            return value.trim().toCamelCase();
                        });
                        var temp = additions;

                        if (temp.length > 0) {
                            $.each(temp, function (ii, j) {
                                data[prefix + j] = _this.getObservableFromPath(viewModel, path, j);
                            });
                        }
                    }
                }
                data["lookupsToUpdate"] = updateLookups;

                // Add the name of the property that was changed to cause the refresh to occur
                data.changedProperty = sourceName;

                params = ko.toJSON(data);

                this.setProcessing(fieldsToObserve, true);
                this.setSuspended(suspensions, true);

                this.app.net.postJson({ action: action, controller: controller }, params).done(function (result) {
                    // Success
                    // [AG 4/4/2013] The result may be a DataResponse, an ActionDataResponse or a serialised view model
                    if (data.lookupsToUpdate && data.lookupsToUpdate.indexOf("ag.lookups.lookupData") === 0) {
                        var lookupData = ag.utils.transformLookup(result), lookupDataObservable = ag.utils.getObjectPropertyByString(window, data.lookupsToUpdate).data;
                        lookupDataObservable(lookupData.data);
                    } else {
                        _this.setLookups(result.lookups || (result.actionData && result.actionData.lookups), path);
                    }

                    _this.setFields(updateAllFields, id, viewModel, fieldsToUpdate, result.data || result.actionData || result, path, source);
                    _this.setProcessing(fieldsToObserve, false);
                    _this.setSuspended(suspensions, false);

                    // send out the event to subscribers to update watchers' value
                    PubSub.publish(ag.topics.ApplyWatcherValue);
                }, function () {
                    _this.setProcessing(fieldsToObserve, false);
                    _this.setSuspended(suspensions, false);
                });

                return true;
            };

            DependencyBase.prototype.handleNavigateDependency = function (taskRule, updatingModel) {
                var trigger = taskRule.trigger, rule = taskRule.rule, path = taskRule.path;
                var observable = this.getObservableFromPath(ag.viewModel, path, trigger);
                if (observable.isDirty() && !observable.isSuspended()) {
                    if (this.updatingModel() && !rule.applyAtStartUp)
                        return false;

                    if (is(observable(), rule.dependentCondition, null, true))
                        this.handleNavigate(rule.id, ag.viewModel, observable, rule.dependent, rule.action, rule.associatedFields, rule.additionalFields, rule.suspendFields, path);
                }

                return true;
            };

            /// handleNavigate
            /// Initiate call back to the server
            /// If a record is found matching the provided key values, do a navigate
            DependencyBase.prototype.handleNavigate = function (id, viewModel, source, sourceName, action, keyFields, additionalFields, suspendFields, path) {
                var _this = this;
                var params, data = {};

                var fn = function (value) {
                    return _this.getObservableFromPath(viewModel, path, value);
                };

                keyFields = toArray(keyFields, true, fn);

                var prefix = $.map(path.path, function (n) {
                    return n.toCamelCase() + ".";
                }).join();

                var suspensions = toArray(suspendFields, true, fn);

                sourceName = prefix + sourceName.toCamelCase();
                data[sourceName] = source();

                // Add the name of the property that was changed to cause the refresh to occur
                data.changedProperty = sourceName;
                data["throwOnNotFound"] = false;

                if (additionalFields) {
                    var additions = $.map(additionalFields.split(","), function (value) {
                        return value.trim().toCamelCase();
                    });
                    var temp = additions.filter(fn);

                    if (temp.length > 0) {
                        $.each(temp, function (ii, j) {
                            data[prefix + j] = _this.getObservableFromPath(viewModel, path, j);
                        });
                    }
                }

                params = ko.toJS(data);

                // If any of the key fields are null, do nothing
                if (_.any(params, function (val) {
                    var type = $.type(val);
                    switch (type) {
                        case 'null':
                        case 'undefined':
                            return true;
                        case 'number':
                            return val === 0;
                        case 'string':
                            return val.trim() === '';
                        default:
                            return false;
                    }
                })) {
                    return;
                }

                this.setProcessing(keyFields, true);
                this.setSuspended(suspensions, true);

                this.app.net.getJson(action, params).then(function (result) {
                    // Success
                    if (result && result.data && !result.hasErrors) {
                        // If a matching entity was found, load it and then navigate to it
                        // (navigating won't cause it to be reloaded)
                        _this.app.loadItem && _this.app.loadItem(result, false);
                        _this.app.navigateToItem($.extend({ edit: 'existing' }, params));
                    }

                    _this.setProcessing(keyFields, false);
                    _this.setSuspended(suspensions, false);
                }, function (result) {
                    // Error thrown (not wrapped in response as should be)
                    if (result && result.statusText)
                        ag.messages.error(result.statusText);

                    _this.setProcessing(keyFields, false);
                    _this.setSuspended(suspensions, false);
                    _this.updatingModel(true);
                });
            };

            DependencyBase.prototype.getObservableFromPath = function (viewModel, path, name) {
                var x = this.getPropertyPath(path, name), pos = this.getObservable(x, viewModel);

                if (!pos || (typeof (pos) === "object" && !ko.isObservable(pos)))
                    pos = this.getObservableLegacy(viewModel, path, name);

                return pos;
            };

            DependencyBase.prototype.getObservablesFromPath = function (viewModel, path, name) {
                var x = this.getPropertyPath(path, name), splitPropPaths = x.split("[].");

                // For compatibility
                if (splitPropPaths.length == 1)
                    return [this.getObservableFromPath(viewModel, path, name)];

                if (splitPropPaths.length != 2)
                    throw new Error("Only one level deep array is supported");

                return _.map(ko.unwrap(this.getObservable(splitPropPaths[0], viewModel)), function (i) {
                    return ag.getProperty(i, splitPropPaths[1]);
                });
            };

            DependencyBase.prototype.getValueFromPath = function (model, path, name) {
                return ag.getProperty(model, this.getPropertyPath(path, name));
            };

            DependencyBase.prototype.getPropertyPath = function (path, name) {
                var x = path.path.join(".");
                x = (!x || x.length == 0) ? name : x + "." + name;
                return x.toCamelCase();
            };

            DependencyBase.prototype.getObservableLegacy = function (viewModel, path, name) {
                var pos = viewModel;

                $.each(path.path, function (i1, node) {
                    pos = pos[node.toCamelCase()];
                });

                var field = name.split(".");
                var length = field.length - 1;
                for (var i = 0; i < length; ++i) {
                    if (pos === undefined)
                        return false;
                    pos = pos[field[i].toCamelCase()];
                }

                // [AG 10/4/2013] It's possible that the dependent field name has been configured incorrectly and
                // does not correspond to a property on the view model.
                if (pos === undefined)
                    return null;

                var obsProp = field[length].toCamelCase();
                if (typeof (pos) === "object" && !ko.isObservable(pos) && !(obsProp in pos))
                    throw new Error("Unable to resolve property on view model: " + name);

                return pos[obsProp];
            };

            DependencyBase.prototype.setProperty = function (property, newValue) {
                var currentCompareValue = property(), newCompareValue = newValue;

                if (newValue && _.isDate(newValue)) {
                    // Setup dates for an ISO comparison
                    if (currentCompareValue && _.isDate(currentCompareValue))
                        currentCompareValue = moment.utc(currentCompareValue).toISO();

                    // Get the ISO string of the newValue as we don't
                    // want to set Date object onto ViewModel (and use for comparison)
                    newValue = newCompareValue = moment.utc(newValue).toISO();
                }

                // Update property if there has been a change
                if (currentCompareValue !== newCompareValue) {
                    property(newValue);
                }
            };

            /// setLookups
            /// Update any lookup datasets on the model
            DependencyBase.prototype.setLookups = function (lookups, path) {
                if (!lookups)
                    return;

                ag.utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups, path.path);
            };

            /// setProcessing
            /// Set properties processing flag on or off.
            /// This will provide an indication to the user that processing is occurring
            DependencyBase.prototype.setProcessing = function (items, flag) {
                this.setState(items, "isProcessing", flag);
            };

            /// setSuspended
            /// Set properties suspended flag on or off.
            /// This will provide an indication to the user that processing is occurring
            DependencyBase.prototype.setSuspended = function (items, flag) {
                this.setState(items, "isSuspended", flag);
            };

            /// setState
            /// Set properties on Meta Observable flag.
            DependencyBase.prototype.setState = function (items, method, flag) {
                $.each(items, function (index, observable) {
                    if (ko.isObservable(observable))
                        observable[method](flag);
                });
            };

            /// setFields
            /// Either update selected fields or all associated fields in model
            DependencyBase.prototype.setFields = function (updateAllFields, id, viewModel, fields, model, path, source) {
                var _this = this;
                if (updateAllFields) {
                    try  {
                        /// Don't execute dependencies for the callee/source again even if the value changes
                        this.ignoreCallee = source;

                        /// If all fields are going to be updated then only apply the dependencies that are required during a start up.
                        /// Normally this would only be so set visible and available fields - not field values.
                        /// if rqeuired this could be made more granular by adding new attributes.
                        this.updatingModel(true);

                        ko.mapping.fromJS(model, viewModel);

                        ag.utils.resetValidationIfEmpty(viewModel, [source]);
                    } finally {
                        this.ignoreCallee = null;
                        this.updatingModel(false);
                    }
                } else {
                    if (fields && $.isArray(fields) && fields.length > 0) {
                        $.each(fields, function (index, field) {
                            var dest = _this.getValueFromPath(viewModel, path, field);
                            if (dest.refresh) {
                                dest.refresh();
                            } else {
                                ko.mapping.fromJS(_this.getValueFromPath(model, path, field), {}, dest);
                                ag.utils.resetValidationIfEmpty(dest);
                            }
                        });
                    }
                }
            };

            DependencyBase.prototype.applyRuleOnUpdate = function (updatingModel, rule, dependsOn) {
                if (updatingModel && !rule.applyAtStartUp && (!rule.applyAtStartupForTheseFields || ($.inArray(dependsOn, rule.applyAtStartupForTheseFields) < 0)))
                    return true;
                return false;
            };
            return DependencyBase;
        })();

        //#region Field Dependencies
        /* Field rules are serialized to client in the following object structure:
        
        availability
        dependent 1
        condition 1
        condition 2
        condition n
        dependent 2
        condition 1
        visibility
        dependent 2
        condition 1
        value
        dependent 1
        condition 1
        refresh
        dependent 1
        condition 1
        
        addFieldDependencyRules navigates this structure to determine which knockout subscriptions
        need to be applied.
        */
        var FieldDependencies = (function (_super) {
            __extends(FieldDependencies, _super);
            function FieldDependencies(app, updatingModel) {
                var _this = this;
                _super.call(this, app, updatingModel);
                this.handleResetModelDependency = function (taskRule, updatingModel) {
                    var trigger = taskRule.trigger, rule = taskRule.rule, path = taskRule.path;
                    var observable = _this.getObservableFromPath(ag.viewModel, path, trigger), triggerPropertyPath = ag.utils.getDelimitedPath(trigger, path.path);

                    if (!observable.isSuspended()) {
                        if (updatingModel && !rule.applyAtStartUp)
                            return false;

                        try  {
                            _this.updatingModel(true);
                            _this.app.resetEditor && _this.app.resetEditor(triggerPropertyPath);
                        } finally {
                            _this.updatingModel(false);
                        }
                    }
                    return true;
                };
                ///#endregion
                //#region Factories
                this.customFunctionFactory = (function () {
                    var functions = {};
                    return {
                        get: function (type) {
                            return functions[type];
                        },
                        register: function (type, rule) {
                            functions[type] = rule;
                            return _this.dependencyFactory;
                        }
                    };
                })();
                this.dependencyFactory = (function () {
                    var types = {}, Dependency, result;

                    return {
                        create: function (id, type, parameters, path) {
                            Dependency = types[type];
                            result = (Dependency ? new Dependency() : null);

                            if (result != null && parameters != undefined) {
                                $.each(parameters, function (i, param) {
                                    result[i] = param;
                                });
                                result._init(id, path);
                            }
                            return result;
                        },
                        register: function (type, rule) {
                            types[type] = rule;
                            return this.dependencyFactory;
                        }
                    };
                })();
                //#endregion
                //#region Supported custom functions - Consider moving them to there own file at some point
                this.getDateString = function () {
                    return ag.dates.today();
                };
                this.registerAll();
            }
            FieldDependencies.prototype.generateComputedfields = function (fields) {
                var _this = this;
                var fieldObject = _.map(fields, function (name) {
                    return ag.getProperty(_this.viewModel, name.toCamelCase());
                });
                var result = ko.computed(function () {
                    return ko.toJSON(_.map(ko.toJS(fieldObject), function (name) {
                        return String(name).toLowerCase();
                    }));
                });

                result.fieldName = fields.join(",");
                return result;
            };

            FieldDependencies.prototype.create = function (id, viewModelInfo, model, fieldCategories) {
                var viewModel = this.viewModel = viewModelInfo.viewModel;
                this.keyFields = viewModelInfo.keyFields;
                this.key = this.generateComputedfields(viewModelInfo.keyFields);
                if ($.isEmptyObject(model) || !model)
                    return false;

                try  {
                    this.updatingModel(true);
                    this.initialise(id, viewModel, model, fieldCategories);
                } finally {
                    this.updatingModel(false);
                }
            };

            FieldDependencies.prototype.initialise = function (id, viewModel, model, fieldCategories) {
                var _this = this;
                // dependencyTypes
                var dependencyCategories = [
                    new DependencyCategory("availability", "underlying", this.handleAccessabilityProperty, false),
                    new DependencyCategory("visibility", "underlying", this.handleVisibilityProperty, false),
                    new DependencyCategory("dynamicLabel", "underlying", this.handleDynamicLabelProperty, false),
                    new DependencyCategory("value", "underlying", this.handleValueProperty, true),
                    new DependencyCategory("fieldRefresh", "underlying", this.handleValueProperty, true),
                    new DependencyCategory("state", "underlying", this.handleStateProperty, true),
                    new DependencyCategory("resetModel", null, null, true),
                    new DependencyCategory("refresh", null, null, true)
                ];

                if (model.field != null && !$.isEmptyObject(model.field)) {
                    $.each(dependencyCategories, function (i, dependencyType) {
                        $.each(model.paths, function (j, path) {
                            if (path.isCollection)
                                return true;

                            path.path = _.map(path.path, function (item) {
                                return item.toCamelCase();
                            });
                            if (dependencyType.propertyMethod !== null) {
                                if (model.field[dependencyType.type]) {
                                    $.each(model.field[dependencyType.type], function (dependentName, dependencyRules) {
                                        $.each(toArray(dependentName, true), function (index, item) {
                                            // obtain the field or field's property that could be affected.
                                            var observable = _this.getObservableFromPath(viewModel, path, item);
                                            observable = observable && observable[dependencyType.propertyMethod];

                                            if (observable) {
                                                var rules = $.extend(true, [], dependencyRules);
                                                var applyFieldMethod = dependencyType.type == "fieldRefresh" ? _this.applyFieldRefreshRules : _this.applyConditionalFieldRules;
                                                applyFieldMethod.call(_this, id, viewModel, rules, observable, item, dependencyType.propertyMethod, dependencyType.handler, path, _this.handleRuleDependency, fieldCategories, dependencyType.ignoreIfSuspended);
                                            }
                                        });
                                    });
                                }
                            } else {
                                if (model.field[dependencyType.type]) {
                                    if (dependencyType.type == "refresh")
                                        _this.applyRefreshFields.call(_this, id, viewModel, model.field[dependencyType.type], path);
                                    else if (dependencyType.type == "resetModel")
                                        _this.applyResetModelFields.call(_this, id, viewModel, model.field[dependencyType.type], path);
                                }
                            }
                        });
                    });
                }
                return true;
            };

            FieldDependencies.prototype.applyFieldRefreshRules = function (id, viewModel, dependencyRules, observable, dependentName, fnName, fn, path, fnHandle, fieldCategories) {
                if (dependencyRules && dependencyRules.length > 0) {
                    var category = dependencyRules[0].category;
                    if (!dependencyRules[0].dependsOn && category) {
                        var list = [];
                        var rule = $.extend({}, dependencyRules[0]);
                        var dependencyList;
                        list.push(rule);

                        this.populateRuleProperty(id, rule, observable, dependentName, viewModel, path, []);
                        rule.action = 6 /* Refresh */;
                        rule.applyAtStartUp = true;

                        if (this.keyFields.length > 0) {
                            // observable to suppress and delay change notifications for a specified period of time
                            // this.key.extend({ rateLimit: 50 });
                            dependencyList = this.clone(list);
                            dependencyList[0].applyAtStartUp = true;
                            dependencyList[0].applyCondition = 4 /* OnlyAtStartup */;
                            dependencyList[0].dependsOn = "";
                            dependencyList[0].action = 6 /* Refresh */;
                            this.addTask(this.runningId++, this, this.key, fnHandle, { trigger: null, dependentName: dependentName, rules: dependencyList, matchedRuleHandler: fn });
                        }
                        var applyRefreshNow = category.toLowerCase() === "keyfield";

                        var linkedFields = applyRefreshNow ? null : fieldCategories[category.toCamelCase()];

                        if (linkedFields && linkedFields.length > 0) {
                            applyRefreshNow = true;
                            dependencyList = this.clone(list);
                            dependencyList[0].applyAtStartUp = false;
                            dependencyList[0].applyCondition = 0 /* AllTheTime */;
                            dependencyList[0].dependsOn = linkedFields.join(",");
                            dependencyList[0].action = 6 /* Refresh */;
                            var observe = this.generateComputedfields(linkedFields);
                            this.addTask(this.runningId++, this, observe, fnHandle, { trigger: null, dependentName: dependentName, rules: dependencyList, matchedRuleHandler: fn });
                        }

                        dependencyRules.shift();
                        applyRefreshNow = applyRefreshNow && !path.isAction;
                        if (applyRefreshNow) {
                            this.addTask(this.runningId++, this, null, fnHandle, { trigger: null, dependentName: dependentName, rules: list, matchedRuleHandler: fn }, false, true);
                        }
                    }

                    // Expand dependentName to include full path - this is to ensure that observables have the full path in this scenario
                    // This is because field categories have the full path and the path variable can be reset.
                    var newDependentName = $.map(path.path, function (n) {
                        return n.toCamelCase() + ".";
                    }).join("") + dependentName;

                    // Reset path so that it is not used to work out observable -- as field category already uses full path name
                    var newPath = { path: [], isAction: path.isAction, isCollection: path.isCollection };

                    this.applyConditionalFieldRules(id, viewModel, dependencyRules, observable, newDependentName, fnName, fn, newPath, fnHandle);
                }
            };

            /// applyConditionalFieldRules
            /// Group all the fields that trigger a change (dependsOn), attach all the conditions
            /// associated with the affected field and subscribe accordingly.
            ///
            /// Note:
            /// Once a field triggers a possible change - then all conditions associated with an
            /// affected field are checked. This is done to ensure the affected field is in the coarrect state
            FieldDependencies.prototype.applyConditionalFieldRules = function (id, viewModel, dependent, observable, dependentName, fnName, fn, path, fnHandle, fieldCategories, ignoreIfSuspended) {
                var _this = this;
                if (typeof ignoreIfSuspended === "undefined") { ignoreIfSuspended = false; }
                var fieldRules = [];

                var clonedDependent = this.clone(dependent);

                // find all the 'dependsOn' property names
                $.each(clonedDependent, function (i1, rule) {
                    _this.populateRuleProperty(id, rule, observable, dependentName, viewModel, path, fieldRules);
                });

                // Apply subcriptions to all the 'dependsOn' properties
                $.each(fieldRules, function (i1, dependsOn) {
                    try  {
                        if (dependsOn)
                            dependsOn = dependsOn.toCamelCase();
                        var t1 = _this.getObservableFromPath(viewModel, path, dependsOn);
                        _this.addTask(_this.runningId, _this, t1, fnHandle, { trigger: dependsOn, dependentName: dependentName, rules: clonedDependent, matchedRuleHandler: fn }, false, ignoreIfSuspended, true);
                    } catch (e) {
                        ag.messages.error("The property '" + dependsOn + "', does not exist.");
                    }
                });

                this.runningId++;
                this.addTask(this.runningId++, this, null, fnHandle, { trigger: null, dependentName: dependentName, rules: clonedDependent, matchedRuleHandler: fn }, false, ignoreIfSuspended, true);

                return fieldRules;
            };

            /// populateRuleProperty
            /// Group all the fields that trigger a change (dependsOn), attach all the conditions
            /// associated with the affected field and subscribe accordingly.
            FieldDependencies.prototype.populateRuleProperty = function (id, rule, observable, dependentName, viewModel, path, fieldRules) {
                rule.id = id;
                rule.observable = observable;
                rule.dependent = dependentName;
                rule.path = path;

                if (!rule.condition)
                    rule.condition = 0 /* Modified */;

                if (rule.dependsOn !== undefined && rule.dependsOn != null) {
                    rule.dependsOn = $.trim(rule.dependsOn).toCamelCase();
                    rule.dependentObservable = this.getObservableFromPath(viewModel, path, rule.dependsOn);

                    rule.compareObservable = null;

                    var fields = toArray(rule.dependsOn, true);

                    if (isNotBlank(rule.whenTheseFieldsHaveChanged)) {
                        rule.whenTheseFieldsHaveChanged = toArray(rule.whenTheseFieldsHaveChanged, true);
                        fields = fields.concat(rule.whenTheseFieldsHaveChanged);
                    } else if (rule.applyCondition == 1 /* OnlyWhenTheGivenPropertyIsModified */) {
                        fields = fields.concat(toArray(rule.byCopyingFrom, true));
                        rule.whenTheseFieldsHaveChanged = fields;
                    }

                    if (rule.action == 4 /* CopyFrom */ && isBlank(rule.byCopyingFrom)) {
                        rule.byCopyingFrom = rule.dependsOn;
                    }

                    if (!isBlank(rule.applyAtStartupForTheseFields)) {
                        rule.applyAtStartupForTheseFields = toArray(rule.applyAtStartupForTheseFields, true);
                    }

                    if (isNotBlank(rule.compareTo)) {
                        rule.compareObservable = this.getObservableFromPath(viewModel, path, rule.compareTo);
                        fields = fields.concat(toArray(rule.compareTo));
                    }

                    if (isNotBlank(rule.byCopyingFrom)) {
                        rule.byCopyingFromObservable = this.getObservableFromPath(viewModel, path, rule.byCopyingFrom);
                        fields = fields.concat(toArray(rule.byCopyingFrom));
                    }

                    if (isNotBlank(rule.alsoDependsOn)) {
                        rule.alsoDependsOnObservable = this.getObservableFromPath(viewModel, path, rule.alsoDependsOn);
                        fields = fields.concat(toArray(rule.alsoDependsOn));
                    }

                    $.each(fields, function (index, item) {
                        if ($.inArray(item, fieldRules) < 0) {
                            fieldRules.push(item);
                        }
                    });
                }
                return rule;
            };

            FieldDependencies.prototype.clone = function (dependencyRules) {
                var clonedObject = [];
                var priority = 1;

                $.each(dependencyRules, function (i1, rule) {
                    rule.priority = priority++;
                    if (rule.dependsOn !== undefined && rule.dependsOn != null) {
                        var propertiesDependsOn = rule.dependsOn.split(",");

                        $.each(propertiesDependsOn, function (value, dependsOnPropertyName) {
                            var cloneProperty = _.clone(rule);
                            cloneProperty.dependsOn = $.trim(dependsOnPropertyName).toCamelCase();
                            clonedObject.push(cloneProperty);
                        });
                    } else {
                        clonedObject.push(rule);
                    }
                });

                return clonedObject;
            };

            FieldDependencies.prototype.compareRuleOutcome = function (previous, current) {
                if (previous && (previous.value === current.value && previous.action === current.action && previous.available === current.available && previous.visible === current.visible && previous.label === current.label))
                    return true;
            };

            /// handlePropertyDependency
            /// Used to determine if a dependency condition has been met
            /// if so then perform the necessary action
            FieldDependencies.prototype.handleRuleDependency = function (taskRule, updatingModel, triggers) {
                var _this = this;
                var triggers = triggers ? triggers : toArray(taskRule.trigger), fieldRules = taskRule.rules, handler = taskRule.matchedRuleHandler;

                if (!fieldRules)
                    return;

                var currValue;
                var cloneRule = triggers.length > 1;
                var currentTrigger;

                $.each(fieldRules, function (value, rule) {
                    if (_this.compareRuleOutcome(currValue, rule))
                        return true;

                    _.forEach(triggers, function (trigger) {
                        if (_this.doesRuleMatch(trigger, rule, updatingModel)) {
                            if (!currValue || (currValue.priority < rule.priority)) {
                                currValue = rule;
                                cloneRule = currValue.dependsOn != trigger;
                                currentTrigger = trigger;
                            }
                        }
                    });
                });

                if (currValue) {
                    if (cloneRule) {
                        currValue = _.clone(currValue);
                        currValue.dependsOn = currentTrigger;
                    }
                    handler.call(this, currValue);
                }
            };

            FieldDependencies.prototype.doesRuleMatch = function (dependsOn, rule, updatingModel) {
                if (!dependsOn)
                    dependsOn = rule.dependsOn;

                /// if the page is refreshed and the condition is apply rule at start up then move on to next loop
                if (this.applyRuleOnUpdate(updatingModel, rule, dependsOn))
                    return false;

                /// check if the rule should only apply at startup
                if (!updatingModel && rule.applyCondition === 4 /* OnlyAtStartup */)
                    return false;

                /// check if the rule should applies only when the rule is in the whenTheseFieldsHaveChanged list
                /// return if the item is in the list
                if (isNotBlank(rule.whenTheseFieldsHaveChanged)) {
                    if ($.inArray(dependsOn, rule.whenTheseFieldsHaveChanged) < 0)
                        return false;
                }

                var result = (rule.condition === 0 /* Modified */ ? true : false);

                if (!result) {
                    var compareCtrl = (rule.dependsOn !== null ? rule.dependentObservable : rule.observable);
                    var compareValue = (rule.compareObservable ? rule.compareObservable() : rule.compareValue);
                    result = is(compareCtrl(), rule.condition, compareValue, false);
                }

                if (rule.alsoDependsOn && ((result && !rule.secondaryConditionIsOr) || (!result && rule.secondaryConditionIsOr))) {
                    // is the rule and 'and' (!rule.secondaryConditionIsOr) or and 'Or' (rule.secondaryConditionIsOr)
                    if (rule.alsoDependsOnObservable) {
                        result = rule.anotherCondition === 0 /* Modified */ ? true : is(rule.alsoDependsOnObservable(), rule.anotherCondition, rule.withAnotherCompareValue, false);
                    } else
                        result = false;
                }

                /// Check to see if dependent rule is not a blank condition, ie. Only perform action if the dependent is blank.
                return (result && rule.dependentCondition === 9 /* IsBlank */ ? isBlank(rule.observable()) : result);
            };

            /// handleAccessabilityProperty
            /// Turn on / off accessability on the underlying property
            FieldDependencies.prototype.handleAccessabilityProperty = function (rule) {
                rule.observable.isAvailable(rule.value);
            };

            FieldDependencies.prototype.handleVisibilityProperty = function (rule) {
                rule.observable.isVisible(rule.value);
            };

            /// handleDynamicLabelProperty
            /// Turn on / off accessability on the underlying propert
            FieldDependencies.prototype.handleDynamicLabelProperty = function (rule) {
                var observable = this.getObservableFromPath(this.viewModel, rule.path, rule.dependent);
                switch (rule.action) {
                    case 4 /* CopyFrom */:
                        observable.label(ko.unwrap(rule.byCopyingFromObservable));
                        break;
                    default:
                        observable.label(rule.value);
                        break;
                }
            };

            /// handleValueProperty
            /// Apply an action which populates the value of a property
            FieldDependencies.prototype.handleValueProperty = function (rule) {
                var observable = this.getObservableFromPath(this.viewModel, rule.path, rule.dependent);
                switch (rule.action) {
                    case 1 /* Clear */:
                        if (_.isArray(ko.unwrap(observable)))
                            observable.removeAll();
                        else
                            observable.clear();
                        ag.utils.resetValidationIfEmpty(observable);
                        break;
                    case 4 /* CopyFrom */:
                        observable.copyFrom(rule.byCopyingFromObservable);
                        ag.utils.resetValidationIfEmpty(observable);
                        break;
                    case 5 /* CustomFunction */:
                        observable.applyFunction(this.customFunctionFactory.get(rule.functionName)());
                        ag.utils.resetValidationIfEmpty(observable);
                        break;
                    case 2 /* Reset */:
                        observable.reset();
                        ag.utils.resetValidationIfEmpty(observable);
                        break;
                    case 3 /* SetValue */:
                        observable(rule.value);
                        ag.utils.resetValidationIfEmpty(observable);
                        break;
                    case 6 /* Refresh */:
                        if (observable.refresh) {
                            observable.refresh(true, rule.additionalFields);
                            return true;
                        }

                        // Composite Elements (controls such as Grids) have their own functions so
                        // don't fall back to using the default implementation in these cases
                        // (the condition above may not be satisfied if the Grid is not actually in the View - but dependencies exist)
                        if (!rule.hasOwnFunctions)
                            this.handleRefresh(rule.id, this.viewModel, rule.dependentObservable, rule.dependsOn, (rule.remoteAction ? rule.remoteAction : "get" + rule.dependent), rule.dependent, null, rule.additionalFields, rule.suspendFields, rule.path, rule.includeModelData, rule.controller, rule.oneWay);

                        break;
                    case 7 /* ResetModel */:
                        this.app.resetEditor();
                        break;
                }
                return true;
            };

            /// handleStateProperty
            /// Extension to the Value Condition Handler.
            /// Enables visibility and Availability to be set
            FieldDependencies.prototype.handleStateProperty = function (rule) {
                if (!isBlank(rule.available))
                    rule.observable.isAvailable(rule.available);
                if (!isBlank(rule.visible))
                    rule.observable.isVisible(rule.visible);
                if (!isBlank(rule.label))
                    rule.observable.label(rule.label);
                return this.handleValueProperty(rule);
            };

            /// applyResetModelFields
            /// Subscribe to fields that trigger a model reset
            FieldDependencies.prototype.applyResetModelFields = function (id, viewModel, refreshRules, path) {
                this.applyActionOnFields(id, viewModel, refreshRules, path, this.handleResetModelDependency, 0 /* Modified */);
            };

            /// applyRefreshFields
            /// Subscribe to fields that trigger a refresh.
            FieldDependencies.prototype.applyRefreshFields = function (id, viewModel, refreshRules, path) {
                this.applyActionOnFields(id, viewModel, refreshRules, path, this.handleRefreshDependency, 10 /* IsNotBlank */);
            };

            FieldDependencies.prototype.applyActionOnFields = function (id, viewModel, refreshRules, path, handler, condition) {
                var _this = this;
                if (refreshRules === undefined)
                    return;
                $.each(refreshRules, function (trigger, rules) {
                    $.each(rules, function (i1, rule) {
                        rule.id = id;
                        if (!rule.condition)
                            rule.condition = condition;
                        var observable = _this.getObservableFromPath(viewModel, path, trigger);

                        if (observable && ko.isObservable(observable)) {
                            _this.addTask(_this.runningId, _this, observable, handler, { context: viewModel, trigger: trigger, rule: rule, path: path }, false, true);
                        }
                        _this.addTask(_this.runningId++, _this, null, handler, { context: viewModel, trigger: trigger, rule: rule, path: path }, false, true);
                    });
                });
            };

            //#endregion
            // register custom functions
            FieldDependencies.prototype.registerAll = function () {
                this.customFunctionFactory.register("GetDate", this.getDateString);
                this.customFunctionFactory.register("GetDateString", this.getDateString);
            };
            return FieldDependencies;
        })(DependencyBase);

        var ComplexDependencyFactory = (function () {
            function ComplexDependencyFactory(app, updatingModel) {
                this.types = [];
                this.app = app;
                this.updatingModel = updatingModel;
                this.registerAll();
            }
            ComplexDependencyFactory.prototype.create = function (type, parameters, path, viewModelContainer) {
                var dependency = this.types[type];
                var result = (dependency ? new dependency(this.app, this.updatingModel) : null);

                if (result != null && parameters != undefined) {
                    $.each(parameters, function (i, param) {
                        result[i] = param;
                    });
                    result.init(path, viewModelContainer);
                    result.complete();
                }

                return result;
            };

            ComplexDependencyFactory.prototype.registerAll = function () {
                this.register("TermRelationship", TermRelationship);
                this.register("SyncRelationship", SyncRelationship);
                this.register("CycleBasisAndDateRelationship", CycleBasisAndDateRelationship);
                this.register("DateRangeRelationship", DateRangeRelationship);
                this.register("RefreshGroup", RefreshGroup);
                this.register("OnGroupChange", RefreshGroup);
                this.register("OnGroupChangeNotifyOnly", RefreshGroup);
                this.register("OnCategoryChangeNotifyOnly", RefreshGroup);
                this.register("KeyGroup", KeyGroup);
            };

            ComplexDependencyFactory.prototype.register = function (type, rule) {
                this.types[type] = rule;
                return this;
            };
            return ComplexDependencyFactory;
        })();

        var ComplexDependency = (function (_super) {
            __extends(ComplexDependency, _super);
            function ComplexDependency(app, updatingModel) {
                _super.call(this, app, updatingModel);
                this.triggers = [];
                this.path = null;
            }
            ComplexDependency.prototype.init = function (path, viewModelContainer) {
                this.path = path;
                this.viewModel = viewModelContainer.viewModel;
                this.viewModelContainer = viewModelContainer;
                this.app = viewModelContainer.app;
            };

            ComplexDependency.prototype.complete = function () {
                var _this = this;
                try  {
                    this.updatingModel(true);
                    this.runningId++;
                    $.each(this.triggers, function (index) {
                        _this.addPropertyChanged(_this.runningId, _this.triggers[index], _this.path);
                    });
                } finally {
                    this.updatingModel(false);
                }
            };

            ComplexDependency.prototype.addPropertyChanged = function (id, propertyName, path) {
                var property = this.getObservableFromPath(this.viewModel, path, propertyName);
                if (ko.isObservable(property) && !$.isArray(property)) {
                    this.addTask(id, this, property, this.fire, { trigger: propertyName }, false, true);
                }
            };

            ComplexDependency.prototype.fire = function (rule, updatingModel) {
            };
            return ComplexDependency;
        })(DependencyBase);

        var TermRelationship = (function (_super) {
            __extends(TermRelationship, _super);
            function TermRelationship() {
                _super.apply(this, arguments);
                this.term = '';
                this.dealDate = '';
                this.settleDate = '';
            }
            TermRelationship.prototype.init = function (path, viewModelContainer) {
                _super.prototype.init.call(this, path, viewModelContainer);
                this.term = this.term.toCamelCase();
                this.dealDate = this.dealDate.toCamelCase();
                this.settleDate = this.settleDate.toCamelCase();
                this.triggers = [this.term, this.dealDate, this.settleDate];
            };

            TermRelationship.prototype.fire = function (rule) {
                var dealDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.dealDate))), term = parseInt(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.term))), settleDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.settleDate)));

                if (!dealDate)
                    return;

                if (rule.trigger === this.term) {
                    if (!ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, rule.trigger))) {
                        term = 0;
                    }
                    var newDate = dealDate.add("d", term).toISO();
                    this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.settleDate), newDate);
                } else {
                    if (rule.trigger === this.dealDate || rule.trigger === this.settleDate) {
                        if (ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, rule.trigger))) {
                            if (!settleDate)
                                return;
                            var days = Math.round(((settleDate - dealDate) / 86400000));
                            if (!isNaN(days))
                                this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.term), days);
                        }
                    }
                }
            };
            return TermRelationship;
        })(ComplexDependency);

        var SyncRelationship = (function (_super) {
            __extends(SyncRelationship, _super);
            function SyncRelationship() {
                _super.apply(this, arguments);
                this.valueA = '';
                this.valueB = '';
                this.oneWay = false;
            }
            SyncRelationship.prototype.init = function (path, viewModelContainer) {
                _super.prototype.init.call(this, path, viewModelContainer);
                this.valueA = this.valueA.toCamelCase();
                this.valueB = this.valueB.toCamelCase();
                this.triggers = [this.valueA, this.valueB];
            };

            SyncRelationship.prototype.fire = function (rule) {
                var _this = this;
                if (rule.trigger == this.valueA) {
                    var value = ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.valueA));
                    _.each(this.getObservablesFromPath(this.viewModel, this.path, this.valueB), function (observable) {
                        _this.setProperty(observable, value);
                    });
                } else {
                    if (!this.oneWay)
                        this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.valueA), ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.valueB)));
                }
            };
            return SyncRelationship;
        })(ComplexDependency);

        var CycleBasisAndDateRelationship = (function (_super) {
            __extends(CycleBasisAndDateRelationship, _super);
            function CycleBasisAndDateRelationship() {
                _super.apply(this, arguments);
                this.theDate = '';
                this.frequency = '';
                this.cycleBasis = '';
            }
            CycleBasisAndDateRelationship.prototype.init = function (path, viewModelContainer) {
                _super.prototype.init.call(this, path, viewModelContainer);
                this.theDate = this.theDate.toCamelCase();
                this.frequency = this.frequency.toCamelCase();
                this.cycleBasis = this.cycleBasis.toCamelCase();
                this.triggers = [this.theDate, this.frequency, this.cycleBasis];
            };

            CycleBasisAndDateRelationship.prototype.fire = function (rule) {
                if (rule.trigger == this.frequency || rule.trigger == this.cycleBasis) {
                    if (this.isMonthTypeFrequency(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.frequency))) && this.isEndOfMonthCycleBasis(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.cycleBasis)))) {
                        var currentDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.theDate)));
                        if (currentDate) {
                            this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.theDate), currentDate.endOf('month').toISO());
                        }
                    }
                }
                if (rule.trigger == this.theDate) {
                    var currentDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.theDate)));
                    if (!this.isEndOfMonth(currentDate)) {
                        this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.cycleBasis), 'DAY OF MONTH');
                    }
                }
            };

            CycleBasisAndDateRelationship.prototype.isEndOfMonthCycleBasis = function (value) {
                return ($.inArray(value, ['END OF MONTH', 'EOM - NON LEAP YEAR']) > -1);
            };

            CycleBasisAndDateRelationship.prototype.TypeFrequency = function (frequency) {
                return ($.inArray(frequency, ['MONTHLY', 'QUARTERLY', 'SEMI ANNUAL', 'ANNUAL']) > -1);
            };

            CycleBasisAndDateRelationship.prototype.isEndOfMonth = function (value) {
                if (!value)
                    return false;

                var endDate = value.clone().endOf('month');
                return (value.isSame(endDate));
            };

            CycleBasisAndDateRelationship.prototype.isMonthTypeFrequency = function (frequency) {
                return ($.inArray(frequency, ['MONTHLY', 'QUARTERLY', 'SEMI ANNUAL', 'ANNUAL']) > -1);
            };
            return CycleBasisAndDateRelationship;
        })(ComplexDependency);

        var DateRangeRelationship = (function (_super) {
            __extends(DateRangeRelationship, _super);
            function DateRangeRelationship() {
                _super.apply(this, arguments);
                this.fromDate = '';
                this.toDate = '';
                this.daysToDefault = 0;
                this.passIfNull = true;
            }
            DateRangeRelationship.prototype.init = function (path, viewModelContainer) {
                _super.prototype.init.call(this, path, viewModelContainer);
                this.fromDate = this.fromDate.toCamelCase();
                this.toDate = this.toDate.toCamelCase();
                this.triggers = [this.fromDate, this.toDate];
            };

            DateRangeRelationship.prototype.fire = function (rule) {
                var fromDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.fromDate))), toDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.toDate))), otherField, triggerField, nottrigger;

                if (rule.trigger == this.fromDate) {
                    triggerField = fromDate;
                    otherField = toDate;
                    nottrigger = this.toDate;
                } else {
                    triggerField = toDate;
                    otherField = fromDate;
                    nottrigger = this.fromDate;
                }

                if (((this.passIfNull && !otherField) || !triggerField) || (!fromDate.isValid() || !toDate.isValid()))
                    return;

                if (triggerField && (fromDate.isAfter(toDate) || !otherField))
                    this.setProperty(this.getObservableFromPath(this.viewModel, this.path, nottrigger), triggerField.add("d", this.daysToDefault).toISO());
            };
            return DateRangeRelationship;
        })(ComplexDependency);

        var ComplexDependencyGroup = (function (_super) {
            __extends(ComplexDependencyGroup, _super);
            function ComplexDependencyGroup() {
                _super.apply(this, arguments);
                this.dependentCondition = null;
                this.property = {};
            }
            ComplexDependencyGroup.prototype.init = function (path, viewModelContainer) {
                var _this = this;
                _super.prototype.init.call(this, path, viewModelContainer);

                this.property.applyAtStartUp = this.applyAtStartUp;
                this.property.dependentCondition = this.dependentCondition;
                this.property.dependent = '';
                this.property.action = this.action;
                this.method = this.action;
                this.property.associatedFields = this.fields;
                this.property.additionalFields = this.fields;
                this.property.suspendFields = this.fields;
                this.property.oneWay = this.oneWay;

                this.triggers = toArray(this.fields, true);
                this.exitOnStartUp = function () {
                    return !_this.applyAtStartUp && _this.updatingModel();
                };
            };

            ComplexDependencyGroup.prototype.fire = function (rule, updatingModel) {
                if (this.method === null)
                    return false;
                if (this.exitOnStartUp())
                    return false;
                this.property.dependent = rule.trigger;
                if (this.handler)
                    this.handler({ context: this.viewModel, trigger: rule.trigger, rule: this.property, path: this.path }, updatingModel);
            };
            return ComplexDependencyGroup;
        })(ComplexDependency);

        var RefreshGroup = (function (_super) {
            __extends(RefreshGroup, _super);
            function RefreshGroup() {
                _super.apply(this, arguments);
            }
            RefreshGroup.prototype.init = function (path, viewModelContainer) {
                if (this.category) {
                    var temp = viewModelContainer.app.fieldCategories[this.category.toCamelCase()];
                    this.fields = temp && temp.length > 0 ? temp.join(",") : this.fields;
                }

                _super.prototype.init.call(this, path, viewModelContainer);
                this.handler = this.handleRefreshDependency;
            };
            return RefreshGroup;
        })(ComplexDependencyGroup);

        var KeyGroup = (function (_super) {
            __extends(KeyGroup, _super);
            function KeyGroup() {
                _super.apply(this, arguments);
            }
            KeyGroup.prototype.init = function (path, viewModelContainer) {
                var _this = this;
                _super.prototype.init.call(this, path, viewModelContainer);

                // Set the key field property on each related observable
                _.forEach(this.fields.split(','), function (trigger) {
                    var observable = _this.getObservableFromPath(_this.viewModel, _this.path, trigger);
                    observable.isKeyField(true);
                });

                this.handler = this.handleNavigateDependency;
            };
            return KeyGroup;
        })(ComplexDependencyGroup);

        var DependenciesHandle = (function () {
            function DependenciesHandle() {
                this.dependencies = [];
            }
            DependenciesHandle.prototype.addDependency = function (dependency) {
                this.dependencies.push(dependency);
            };

            DependenciesHandle.prototype.addDependencyRange = function (dependencies) {
                var _this = this;
                _.each(dependencies, function (dependency) {
                    _this.addDependency(dependency);
                });
            };

            DependenciesHandle.prototype.dispose = function () {
                _.each(this.dependencies, function (dependency) {
                    dependency.dispose();
                });
            };
            return DependenciesHandle;
        })();

        //#region Conditions
        var conditionEnum;
        (function (conditionEnum) {
            conditionEnum[conditionEnum["Modified"] = 0] = "Modified";
            conditionEnum[conditionEnum["EqualTo"] = 1] = "EqualTo";
            conditionEnum[conditionEnum["NotEqualTo"] = 2] = "NotEqualTo";
            conditionEnum[conditionEnum["GreaterThan"] = 3] = "GreaterThan";
            conditionEnum[conditionEnum["GreaterThanOrEqualTo"] = 4] = "GreaterThanOrEqualTo";
            conditionEnum[conditionEnum["LessThan"] = 5] = "LessThan";
            conditionEnum[conditionEnum["LessThanOrEqualTo"] = 6] = "LessThanOrEqualTo";
            conditionEnum[conditionEnum["StringContains"] = 7] = "StringContains";
            conditionEnum[conditionEnum["StringDoesNotContain"] = 8] = "StringDoesNotContain";
            conditionEnum[conditionEnum["IsBlank"] = 9] = "IsBlank";
            conditionEnum[conditionEnum["IsNotBlank"] = 10] = "IsNotBlank";
            conditionEnum[conditionEnum["RegexMatch"] = 11] = "RegexMatch";
            conditionEnum[conditionEnum["NotRegexMatch"] = 12] = "NotRegexMatch";
            conditionEnum[conditionEnum["IsInList"] = 13] = "IsInList";
            conditionEnum[conditionEnum["IsNotInList"] = 14] = "IsNotInList";
            conditionEnum[conditionEnum["BitwiseAnd"] = 15] = "BitwiseAnd";
            conditionEnum[conditionEnum["BitwiseOr"] = 16] = "BitwiseOr";
        })(conditionEnum || (conditionEnum = {}));

        var equalTo = function (value1, value2) {
            return (value1 == value2);
        };

        var notEqualTo = function (value1, value2) {
            return (value1 != value2);
        };

        var greaterThan = function (value1, value2) {
            return (+value1 > value2);
        };

        var greaterThanOrEqualTo = function (value1, value2) {
            return (+value1 >= value2);
        };

        var lessThan = function (value1, value2) {
            return (+value1 < value2);
        };

        var lessThanOrEqualTo = function (value1, value2) {
            return (+value1 <= value2);
        };

        var stringContains = function (value1, value2) {
            return (value1 ? (value1.indexOf(value2) != -1) : false);
        };

        var stringDoesNotContain = function (value1, value2) {
            return (!stringContains(value1, value2));
        };

        var isBlank = function (value1, value2) {
            return (value1 === undefined || value1 === null || value1 === "");
        };

        var isNotBlank = function (value1, value2) {
            return (!isBlank(value1, value2));
        };

        var defaultTrue = function (value1, value2) {
            return (true);
        };

        var regExMatch = function (value1, value2) {
            return (new RegExp(value2)).test(value1);
        };

        var notRegexMatch = function (value1, value2) {
            return (!regExMatch(value1, value2));
        };

        var isInList = function (value1, value2) {
            if (!$.isArray(value2)) {
                value2 = toArray(value2);
            }
            return ($.inArray(value1, value2) > -1);
        };

        var isNotInList = function (value1, value2) {
            return !(isInList(value1, value2));
        };

        var bitwiseAnd = function (value1, value2) {
            return (value1 & value2);
        };

        var bitwiseOr = function (value1, value2) {
            return (value1 | value2);
        };

        function conditionFactory(condition) {
            switch (condition) {
                case 1 /* EqualTo */:
                    return equalTo;
                case 2 /* NotEqualTo */:
                    return notEqualTo;
                case 3 /* GreaterThan */:
                    return greaterThan;
                case 4 /* GreaterThanOrEqualTo */:
                    return greaterThanOrEqualTo;
                case 5 /* LessThan */:
                    return lessThan;
                case 6 /* LessThanOrEqualTo */:
                    return lessThanOrEqualTo;
                case 7 /* StringContains */:
                    return stringContains;
                case 8 /* StringDoesNotContain */:
                    return stringDoesNotContain;
                case 9 /* IsBlank */:
                    return isBlank;
                case 10 /* IsNotBlank */:
                    return isNotBlank;
                case 11 /* RegexMatch */:
                    return regExMatch;
                case 12 /* NotRegexMatch */:
                    return notRegexMatch;
                case 13 /* IsInList */:
                    return isInList;
                case 14 /* IsNotInList */:
                    return isNotInList;
                case 15 /* BitwiseAnd */:
                    return bitwiseAnd;
                case 16 /* BitwiseOr */:
                    return bitwiseOr;
                default:
                    return defaultTrue;
            }
        }
        ;

        var is = function (value1, operator, value2, ignoreIfBlank) {
            if (!ignoreIfBlank || !isBlank(value1)) {
                var fn = function (value) {
                    return (ag.dates.isValidDate(value) ? value.valueOf() : value);
                };
                return conditionFactory(operator)(fn(value1), fn(value2));
            }
            return false;
        };

        var toArray = function (fields, convertToCamelCase, fn, delimiter) {
            if (typeof delimiter === "undefined") { delimiter = ","; }
            return (!fields ? [] : $.map(fields.split(delimiter), function (value) {
                var result = $.trim(value);
                if (convertToCamelCase)
                    result = result.toCamelCase();

                if (fn)
                    result = fn(result);

                return result;
            }));
        };
    })(ag.dependencies || (ag.dependencies = {}));
    var dependencies = ag.dependencies;
})(ag || (ag = {}));
