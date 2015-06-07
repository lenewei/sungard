// Action definition and any related functionality
var ag;
(function (ag) {
    "use strict";

    var Action = (function () {
        function Action(options, isSubAction) {
            if (typeof isSubAction === "undefined") { isSubAction = false; }
            this.options = options;
            this.isSubAction = isSubAction;
            this.actionInvoked = false;
            this.model = {};
            this.grids = {};
            this.showDialog = ko.observable(false);
            this.updatingModel = ag.createUpdatingModelHelper();
            this.subActions = {};
            this.isEditorReadOnly = ko.observable(false);
            this.isLoaded = ko.observable(false);
            this.invokeCompletedAction = function () {
                if (!this.completedAction)
                    throw new Error("completedBehaviour is set to \"call\" but no completedAction has been specified.");

                if (!this.actions[this.completedAction])
                    throw new Error("The action \"" + this.completedAction + "\" specified for the completedAction cannot be found.");

                this.actions[this.completedAction]();
            };
            this.actionDetails = typeof (options.action) === "string" ? { "action": options.action } : options.action;
            this.data = options.data;

            // What to do when the Action completes successfully
            this.completedBehaviour = this.actionDetails.completed;
            if (isSubAction)
                this.completedBehaviour = options.completed;

            // Action to call on completion on this action if
            // completedBehaviour is set to "call" or "updateAndCall"
            this.isCopyAction = this.actionDetails.isCopyAction;
            this.completedAction = this.actionDetails.completedAction;
            this.beforeInvokeCallbackFunction = this.actionDetails.beforeInvokeCallbackFunction;
            this.afterInvokeCallbackFunction = this.actionDetails.afterInvokeCallbackFunction;
            this.lookups = options.lookups || {};
            this.lookupData = options.lookupData || {};
            this.responseOnly = options.responseOnly;
            this.postOnly = options.postOnly;
            this.fieldCategories = options.fieldCategories || {};

            // Create our network util instance
            this.net = new ag.utils.Network({ area: ag.area, controller: ag.controller, responseOnly: this.responseOnly, postOnly: this.postOnly });

            // Initialise
            this.createViewModel();

            // Initalise action invoke command
            this.initInvokeCommand(options);
        }
        Action.prototype.findPrimaryBtn = function (buttons) {
            if (!buttons)
                return undefined;

            var target;
            _.each(buttons, function (b) {
                if (_.has(b, 'isPrimary') && b['isPrimary'] == true) {
                    target = b;
                    return false;
                }
            });
            return target;
        };

        Action.prototype.initInvokeCommand = function (options) {
            var _this = this;
            // Get the primary button and see if a disabled condition has been supplied.
            // Create a canExecute if supplied.
            var canExecute, canVisible, primaryButton = this.findPrimaryBtn(options.action.buttons), wrapFunction = function (model, modelLogic) {
                return eval(modelLogic);
            };

            if (primaryButton) {
                var disabledString = primaryButton.disabled;
                if (disabledString)
                    canExecute = function (isExecuting) {
                        return !isExecuting && wrapFunction(_this.model, disabledString);
                    };

                var visibleString = primaryButton.visible;
                if (visibleString)
                    canVisible = function () {
                        return wrapFunction(_this.model, visibleString);
                    };
            }

            this.invokeCommand = ko.asyncCommand({
                execute: function (parentViewModel, event, complete) {
                    if (_this.options.beforeInvokeCallbackFunction) {
                        var payload = ko.mapping.toJS(ko.unwrap(_this.model) || {});
                        _this.customCallback(_this.options.beforeInvokeCallbackFunction, payload, parentViewModel);
                    }

                    _this.invoke(parentViewModel, event, complete);
                },
                canExecute: function (isExecuting) {
                    // Check if a user supplied canExecute has been supplied
                    return canExecute ? canExecute(isExecuting) : !isExecuting;
                },
                isVisible: function () {
                    // Check if a user supplied canVisible has been supplied
                    return canVisible ? canVisible() : true;
                }
            });
        };

        Action.prototype.updateActionItem = function (result) {
            var deferred = $.Deferred();
            try  {
                // Needed so that dependencies know not to fire
                this.updatingModel(true);

                var actionModel = this.model;
                if (!$.isEmptyObject(actionModel) && result.actionData) {
                    ko.mapping.fromJS(result.actionData, actionModel);
                    ag.utils.resetValidation(actionModel);

                    ag.updateGrids(result.actionData, this.grids);

                    return deferred.resolve().promise();
                }
            } finally {
                this.updatingModel(false);
            }
            return deferred.resolve().reject();
        };

        Action.prototype.show = function (parentViewModel) {
            // Check if a condition is in play for the dialogs display,
            // if not required invoke the action immediately.
            var requiredWhen = this.options.dialogRequiredWhen;
            if (_.isFunction(requiredWhen) && !requiredWhen())
                return this.invokeCommand.execute(parentViewModel);

            if (this.options.performGetRequestOnShow) {
                // On showing the dialog retrieve the
                // default values for action viewmodel
                this.actionInitialRequest(parentViewModel);
            } else {
                ag.utils.resetValidation(this.model);
                this.isLoaded(true);
                this.showDialog(true);
            }
        };

        Action.prototype.updateItem = function (result, parentViewModel) {
            try  {
                // Needed so that dependencies know not to fire
                if (parentViewModel.updatingModel)
                    parentViewModel.updatingModel(true);

                // Action model updating
                this.updatingModel(true);

                ko.mapping.fromJS(result.data, this.data);
                ag.utils.resetValidation(this.data);

                ag.updateGrids(result.data, parentViewModel.grids);

                // Refresh the pageTitle if the method is available
                if (parentViewModel.refreshPageTitle)
                    parentViewModel.refreshPageTitle();

                this.updateActionItem(result);
            } finally {
                this.updatingModel(false);
                if (parentViewModel.updatingModel)
                    parentViewModel.updatingModel(false);
            }
        };

        Action.prototype.clearItem = function (result, parentViewModel) {
            if (parentViewModel && parentViewModel.createItem)
                parentViewModel.createItem(true);
        };

        Action.prototype.navigateToParent = function (result, parentViewModel) {
            if (parentViewModel && parentViewModel.navigateToParent)
                parentViewModel.navigateToParent();
        };

        Action.prototype.refreshPage = function (result, parentViewModel) {
            // reset the current page into an empty status
            if (parentViewModel && parentViewModel.navigateToEmptyItem)
                parentViewModel.navigateToEmptyItem();

            _.delay(function () {
                window.location.reload();
            }, 1000);
        };

        Action.prototype.refreshItem = function (result, parentViewModel) {
            if (parentViewModel && parentViewModel.refreshItem)
                parentViewModel.refreshItem();
        };

        Action.prototype.updateGrid = function (result, parentViewModel) {
            if (parentViewModel && parentViewModel.loadGridData)
                parentViewModel.loadGridData(result);
        };

        Action.prototype.resetAndUpdateItem = function (result, parentViewModel) {
            // Reset and then update
            if (parentViewModel && parentViewModel.resetEditor)
                parentViewModel.resetEditor();

            this.updateItem(result, parentViewModel);
        };

        Action.prototype.customCallback = function (callback, data, parentViewModel) {
            if (callback.endsWith(")") || callback.endsWith(";"))
                throw new Error("CallbackFunctions should only contain the name of the function to be invoked without parentheses or a semi-colon.");

            // Validate the callback can be found
            var callbackFunction = parentViewModel[callback];
            if (!callbackFunction)
                throw new Error("CallbackFunction \"" + callback + "\" not found on " + ag.utils.getConstructorName(parentViewModel));

            // Invoke the callback:
            // - this is the current action
            // - data is the payload being sent if calling a "before" callback
            // and for an "after" callback it is the result of the post
            callbackFunction.call(parentViewModel, this, data);
            //callbackFunction(this, data);
        };

        Action.prototype.getMessageFromResponse = function (result) {
            if (!result)
                return;

            if (result.hasErrors) {
                ag.messages.error(result.errors[0]);
            } else {
                if (result.message != null)
                    ag.messages.show(result.message, result.messageType);
            }
        };

        Action.prototype.actionRequest = function (parentViewModel, event) {
            var _this = this;
            var requestMethod = this.actionDetails.actionRequestMethod || "post";
            if (requestMethod === "post") {
                return ag.utils.validateAndShowMessages(this.model).then(function () {
                    return _this.processActionRequest(parentViewModel, requestMethod);
                });
            }
            return this.processActionRequest(parentViewModel, requestMethod);
        };

        Action.prototype.processActionRequest = function (parentViewModel, requestMethod) {
            var _this = this;
            var payload = ko.mapping.toJS(ko.unwrap(this.data) || {});
            parentViewModel = this.options.parentViewModel;

            if (!$.isEmptyObject(this.model))
                payload = { data: payload, actionData: ko.mapping.toJS(this.model) };

            if (parentViewModel.customizeActionPayload)
                parentViewModel.customizeActionPayload(payload);

            if (this.beforeInvokeCallbackFunction)
                this.customCallback(this.beforeInvokeCallbackFunction, payload, parentViewModel);

            var completed = function (result) {
                _this.getMessageFromResponse(result);

                if (_this.isSubAction && _this.options.closeParentDialogWhenComplete) {
                    var parentAction = _this.options.parentAction;
                    if (parentAction) {
                        parentAction.actionInvoked = true;
                        parentAction.showDialog(false);
                    }
                }

                // This will need extending to handle other variations
                // of completed behaviour but for now this is enough
                if (_this.completedBehaviour === "updateItem")
                    _this.updateItem(result, parentViewModel);
                else if (_this.completedBehaviour === "clearItem")
                    _this.clearItem(result, parentViewModel);
                else if (_this.completedBehaviour === "refreshItem")
                    _this.refreshItem(result, parentViewModel);
                else if (_this.completedBehaviour === "updateGrid")
                    _this.updateGrid(result, parentViewModel);
                else if (_this.completedBehaviour === "resetAndUpdateItem")
                    _this.resetAndUpdateItem(result, parentViewModel);
                else if (_this.completedBehaviour == "refreshPage")
                    _this.refreshPage(result, parentViewModel);
                else if (_this.completedBehaviour == "navigateToParent")
                    _this.navigateToParent(result, parentViewModel);

                // Not supported yet
                //else if (completedBehaviour === "call")
                // invokeCompletedAction(result);
                //else if (completedBehaviour === "updateAndCall")
                //{
                // updateItem(result);
                // invokeCompletedAction(result);
                //}
                if (_this.afterInvokeCallbackFunction)
                    _this.customCallback(_this.afterInvokeCallbackFunction, result, parentViewModel);

                if (_this.afterInvoke)
                    _this.afterInvoke(result, parentViewModel);

                return result;
            };

            if (this.isCopyAction && parentViewModel.copyItemRequest)
                return parentViewModel.copyItemRequest(this.actionDetails.action);

            return this.sendRequest(payload, requestMethod).then(completed);
        };

        Action.prototype.sendRequest = function (payload, requestMethod) {
            // Default
            if (requestMethod === "post")
                return this.net.postJson(this.actionDetails, function () {
                    return payload;
                });

            if (requestMethod === "get") {
                // Allowing a requestMethod of GET can only be done if the
                // performGetRequestOnShow is false, as MVC will not like 2 GET methods
                // where the only difference is parameters and not http verb.
                if (this.options.performGetRequestOnShow)
                    throw new Error("Cannot perform a GET request when this Action already calls a GET action with the same name.");

                return this.net.getJson(this.actionDetails.action, payload);
            }

            throw new Error("{0} is an unknown request method.".format(requestMethod));
        };

        Action.prototype.actionInitialRequest = function (parentViewModel) {
            var _this = this;
            var action = this.getAction();
            ag.dom.displayModalLoading();
            this.isLoaded(true);

            return this.net.getJson(action, this.getParams(parentViewModel)).done(function (result) {
                // Check response to see if showing the dialog is actually
                // required as we may be able to perform the acion sans dialog.
                if (result.dialogNotRequired)
                    return _this.invokeCommand.execute(parentViewModel);

                _this.updateActionItem(result);
                _this.showDialog(true);
            }).always(ag.dom.hideModalLoading);
        };

        Action.prototype.getAction = function () {
            return this.actionDetails.controller || this.actionDetails.area ? {
                controller: this.actionDetails.controller || ag.controller,
                area: this.actionDetails.area || ag.area,
                action: this.actionDetails.action
            } : this.actionDetails.action;
        };

        // Initialization
        Action.prototype.createViewModel = function () {
            var _this = this;
            // If a model has been supplied and we are not a subAction create an observable model
            // If we are a subAction simply use the model passed to us (as will already be observable)
            if (this.options.model)
                this.model = !this.isSubAction ? ag.mapFromJStoMetaObservable(this.options.model, this.isEditorReadOnly) : this.options.model;

            if (this.options.action.controller != undefined)
                this.actionDetails.controller = this.options.action.controller;

            if (this.options.action.area != undefined)
                this.actionDetails.area = this.options.action.area;

            // Transform any named lookup references
            ag.utils.transformLookups(this.lookups, this.lookupData);

            // Create any supplied subActions
            if (!this.isSubAction && this.options.subActions && _.isArray(this.options.subActions)) {
                _.forEach(this.options.subActions, function (subAction) {
                    var subActionOptions = $.extend({}, _this.options);

                    subActionOptions.action = subAction.action;
                    subActionOptions.path = subAction.path;
                    subActionOptions.includeCompleteModel = subAction.includeCompleteModel;
                    subActionOptions.additionalFields = subAction.additionalFields;
                    subActionOptions.isOpenAction = subAction.isOpenAction;
                    subActionOptions.completed = subAction.completed;
                    subActionOptions.performActionBeforeNavigation = subAction.performActionBeforeNavigation;
                    subActionOptions.beforeInvokeCallbackFunction = subAction.beforeInvokeCallbackFunction;
                    subActionOptions.closeParentDialogWhenComplete = subAction.closeParentDialogWhenComplete;

                    subActionOptions.parentAction = _this;

                    // Set the parent model (already observable) onto the subActionOptions
                    // This model will then be used rather than creating new models
                    subActionOptions.model = _this.model;

                    // Clear subActions to avoid endless-loop
                    subActionOptions.subActions = [];

                    // Create and attach subAction to main Action
                    _this.subActions[subAction.action] = _this.createSubAction(subAction, subActionOptions);
                });
            }

            if (this.options.typeMetadata && !$.isEmptyObject(this.options.typeMetadata)) {
                // Store any type metadata
                this.typeMetadata = this.options.typeMetadata;

                // Create GridViewModels as required
                this.options.typeMetaDataUrl = ag.utils.normalizeUrl(this.options.typeMetaDataUrl);
                ag.createGridViewModelsFromMetadata(this, this.typeMetadata, this.options.data, this.options, this.isEditorReadOnly, this.model);
            }

            if (!this.isSubAction && this.options.dependencies)
                ag.dependencies.init(this.model, this.options.dependencies, this.options, this);
        };

        Action.prototype.createSubAction = function (subAction, subActionOptions) {
            if (subAction.isOpenAction) {
                return new ag.OpenApplicationAction(subActionOptions, true);
            } else if (subAction.isDownloadAction) {
                return new ag.DownloadApplicationAction(subActionOptions, true);
            } else if (subAction.isDialogAction) {
                return new ag.DialogApplicationAction(subActionOptions, true);
            } else {
                return new Action(subActionOptions, true);
            }
        };

        Action.prototype.resolveThePromise = function (complete) {
            var promise = $.Deferred();
            promise.always(complete);
            return promise.resolve().promise();
        };

        Action.prototype.getPathFromResult = function (result) {
            if (result.path && result.path.trim() !== "")
                return result.path;

            if (result.url && result.url.trim() !== "")
                return result.url;

            if (result.uri && result.uri.trim() !== "")
                return result.uri;

            if (result.data && result.data.trim() !== "")
                return result.data;

            return undefined;
        };

        Action.prototype.invoke = function (parentViewModel, event, complete) {
            return this.actionRequest(parentViewModel || this, event).always(complete);
        };

        Action.prototype.getModel = function () {
            return this.model;
        };

        Action.prototype.getParams = function (parentViewModel) {
            var payload = {};

            if (this.createCustomPayload)
                payload = this.createCustomPayload(this.data);
            else if (this.options.additionalFields)
                payload = ag.utils.getAdditionalFieldsFromModel(this.options.additionalFields, this.data);
            else if (this.options.includeCompleteModel)
                payload = ko.mapping.toJS(this.data || {});

            if (parentViewModel && parentViewModel.customizeActionPayload)
                parentViewModel.customizeActionPayload(payload);

            return payload;
        };

        Action.prototype.updateData = function (data, columnName) {
            this.data = data;
            this.columnName = columnName;
            _.each(this.subActions, function (subAction) {
                subAction.data = data;
                subAction.columnName = columnName;
            });
        };
        return Action;
    })();
    ag.Action = Action;
})(ag || (ag = {}));
