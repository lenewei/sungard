var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var AppViewModel = (function (_super) {
        __extends(AppViewModel, _super);
        // options:
        // itemKey      	- name of the Key Property on the Item (may be single or multipart)
        // editProperty	- name of the Property to use when sending single-part key edit requests (optional, defaults to itemKey if not supplied)
        // serviceUrl  	- base Url of the Service to call when retrieving, editing, and listing Items
        // saveMessage 	- a message to display when an Item is successfully saved, typically comes from server
        // lookups     	- array of lookups passed from the server
        // lookupData  	- array of lookup data
        function AppViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            this.editPropertyName = "edit";
            this.browseEditors = {};
            this.canDeleteItem = ko.observable(false);
            this.watcherChanged = ko.observable(false);
            this.editingItem = {};
            // Sub grids which belong to this app
            this.grids = {};
            this.initialModel = {};
            this.isDeletedItem = ko.observable(false);
            this.isNewItem = ko.observable(true);
            //items = ko.observableArray();
            this.itemSaved = null;
            this.itemTypeIsDeal = ko.observable(false);
            this.applicationTitle = ag.utils.documentTitle();
            this.pageTitle = ko.observableArray([{ "keyProperty": ag.strings.newLabel + " " + ag.utils.documentTitle() }]).extend({ rateLimit: 200 });
            this.originalKeyStore = {};
            this.menuCommands = {};
            this.actionInvoked = false;
            this.isSaveAndNewMode = ko.observable(false);

            this.itemKey = options.itemKey;
            this.editProperty = options.editProperty || options.itemKey;
            this.viewFieldLookupSource = "/{0}/{1}".format(options.serviceUrl, "getviewfields");
            this.editAction = options.editAction || "edit";
            this.isUnapproved = options.isUnapproved || false;

            // Referenced by bindings
            this.editUrl = "/{0}/{1}".format(this.serviceUrl, this.editAction);

            this.itemKeyFields = this.itemKey.split(",");
            this.editPropertyFields = this.editProperty.split(",");
            this.keyFields = options.keyFields || [];
            this.fieldCategories = options.fieldCategories || {};
            this.actionToInvoke = options.actionToInvoke;
            this.browseColumnsUseAlphanumSorting = options.browseColumnsUseAlphanumSortingString ? options.browseColumnsUseAlphanumSortingString.split(',') : [];

            // Add a grid view model to all app view models
            if (!options.noBrowseGrid) {
                this.grid = this.createGridViewModelForBrowse(options);
                this.views = this.grid.views;
            }

            //ko.utils.extend(this, this.createGridViewModelForBrowse(options));
            // Create dialog commands should only
            // really be done when in dialog mode
            this.createDialogCommands();

            this.primarySaveButtonText = ko.computed(function () {
                return _this.isSaveAndNewMode() ? ag.strings.saveAndNew : ag.strings.save;
            }).extend({ rateLimit: 200 });

            PubSub.subscribe(ag.topics.ApplyWatcherValue, function () {
                _this.watcherChanged(false);
            });
            PubSub.subscribe(ag.topics.WatcherValueChanged, function () {
                _this.watcherChanged(true);
            });
        }
        AppViewModel.prototype.createDialogCommands = function () {
            var _this = this;
            // The OK command does not attempt to save, it simply
            // returns the current ViewModel to the opener
            this.dialogOKCommand = ko.asyncCommand({
                execute: function (complete) {
                    // This should do a validate of the form
                    // need to extract this out of (this.net).validateAndPostJson
                    // ...
                    if (window.opener && window.opener.ag && window.opener.ag.childWindowClosing) {
                        window.opener.ag.childWindowClosing(_this, null, false, window);

                        _.defer(function () {
                            window.close();
                            complete();
                        });
                    }
                }
            });

            // The Save command saves the deal and if successful closes
            // the window, otherwise the window remains open for the user to
            // view any errors that were produced. When saved successfully the
            // window closes immediately and the messaage is returned to the opener
            // to be displayed.
            this.dialogSaveCommand = ko.asyncCommand({
                execute: function (complete) {
                    // Save the deal
                    _this.saveItem().done(function (result) {
                        // Then close the window and return the result to the opener
                        if (window.opener && window.opener.ag && window.opener.ag.childWindowClosing) {
                            window.opener.ag.childWindowClosing(_this, result, true, window);

                            //Give the window some time to display messages and clear fields.
                            //Should be triggered by the item being cleared rather than a timer
                            setTimeout(function () {
                                return _.defer(function () {
                                    window.close();
                                });
                            }, 3000);

                            return false;
                        }
                    }).always(complete);
                }
            });

            this.dialogCancelCommand = ko.command({
                execute: function () {
                    window.close();
                }
            });
        };

        AppViewModel.prototype.resetEditor = function (triggerProperty) {
            // Clear any existing data
            var prop, resetValues;

            this.hasErrors(false);

            // Clear any errors on screen
            ag.messages.clearError();

            if (this.editingItem) {
                // Restore initial values, optionally keeping the current value of the
                // specified trigger property
                prop = triggerProperty && ag.getProperty(this.editingItem, triggerProperty);
                if (prop) {
                    resetValues = $.extend({}, this.initialModel);
                    ag.setProperty(resetValues, triggerProperty, ko.unwrap(prop));
                } else {
                    resetValues = this.initialModel;
                }

                // Reset item and clear validation
                this.mapJsToEditingItem(resetValues);
            }

            // Re-set the title
            ag.utils.documentTitle(this.applicationTitle);
            this.pageTitle([{ "keyProperty": this.isUnapproved ? "" : ag.strings.newLabel + " " + ag.utils.documentTitle() }]);
        };

        AppViewModel.prototype.saveItem = function (clearAfter) {
            var _this = this;
            if (typeof clearAfter === "undefined") { clearAfter = false; }
            // Post to Create or Edit
            var action = this.isNewItem() ? "create" : this.editAction;
            this.isSaveAndNewMode(clearAfter);

            return this.net.validateUnmapAndPostJson(action, this.editingItem).done(function (result) {
                _this.saveItemDone(result, clearAfter);
            }).fail(function (reasons) {
                _this.saveItemFail(reasons);
            });
        };

        AppViewModel.prototype.saveItemDone = function (result, clearAfter) {
            ag.messages.show(result.message, result.messageType);

            // Callback if set
            if (this.itemSaved && _.isFunction(this.itemSaved))
                this.itemSaved(result);

            if (clearAfter) {
                // Navigate to "new"
                this.createItem(true);
            } else {
                this.loadItem(result, false);
                this.navigateToItem(this.getEditingItemNavKey(this.editingItem, this.editPropertyFields, this.editProperty, function (v) {
                    return v;
                }));
                this.refreshGrids(this.grids);
            }
        };

        AppViewModel.prototype.saveItemFail = function (reasons) {
            if (!reasons)
                return;

            // Exception encountered
            var errorMessages = ag.utils.getErrorsFromResponse(reasons[0]);

            // There is no error messages returned (eg Confirmation Action) so don't
            // set the "hasErrors" observable value for MessageLog button
            if (errorMessages !== undefined) {
                this.hasErrors(true);
                this.errors.removeAll();
                this.errors.push.apply(this.errors, errorMessages);
            }
        };

        AppViewModel.prototype.refreshGrids = function (grids) {
            var _this = this;
            _.each(grids, function (g) {
                if (_.isFunction(g.refresh)) {
                    g.refresh();
                } else {
                    _this.refreshGrids(g);
                }
            });
        };

        AppViewModel.prototype.refreshBrowseGrid = function () {
            if (this.grid) {
                this.grid.refresh();
            }
        };

        AppViewModel.prototype.navigateToEmptyItem = function () {
            this.navigateToItem(this.navigateGetParams());
        };

        AppViewModel.prototype.navigateToItem = function (keyValue) {
            if (!this.nav)
                return;

            if (!$.isPlainObject(keyValue)) {
                var obj = {};
                obj[this.editPropertyName] = keyValue;
                this.nav.navigate(obj);
            } else
                this.nav.navigate(keyValue);
        };

        AppViewModel.prototype.navigateToView = function (viewKey) {
            this.nav && this.nav.navigate({ view: viewKey });
        };

        AppViewModel.prototype.loadItem = function (result, isNewItem) {
            var _this = this;
            return this.silenceDependency(function () {
                var resultData = result.data, resultLookups = result.lookups;

                if (isNewItem)
                    _this.resetEditor();

                // Select the first visible tab
                ag.dom.resetTabs();

                // Reset the lookups that may have been filtered
                _this.resetLookups();

                // Update any lookups found in the result
                if (resultLookups)
                    ag.utils.transformLookups(resultLookups.propertyLookupReferences, resultLookups.lookups);

                // Update the view model
                _this.mapJsToEditingItem(resultData);
                _this.isNewItem(isNewItem);
                _this.isDeletedItem(_this.editingItem.deleted ? _this.editingItem.deleted() : false);
                _this.canDeleteItem(!isNewItem && !_this.isDeletedItem());
                _this.setSaveAndNewMode();

                // Update any grids
                if (resultData) {
                    _this.updateGrids(resultData);
                    _this.updateBrowseEditors(resultData);
                }

                if (_this.copyOriginalKeyCallBack)
                    _this.copyOriginalKeyCallBack(isNewItem, _this);

                _this.invokeAction();

                PubSub.publish(ag.topics.ApplyWatcherValue);
            }, this);
        };

        AppViewModel.prototype.setSaveAndNewMode = function () {
            if (this.isNewItemNeedingApproval())
                this.isSaveAndNewMode(true);
        };

        AppViewModel.prototype.invokeAction = function () {
            var _this = this;
            if (this.actionInvoked)
                return;

            if (this.actionToInvoke) {
                _.each(this.menuCommands, function (command) {
                    var commandId = command.id ? command.id.toLowerCase() : '', actionToInvoke = _this.actionToInvoke ? _this.actionToInvoke.toLowerCase() : '';
                    if (commandId === actionToInvoke && command.isVisible() && command.canExecute()) {
                        command.execute(_this);
                        return;
                    }
                });
            }

            this.actionInvoked = true;
        };

        AppViewModel.prototype.updateStatus = function () {
            this.isNewItem(true);
            this.isDeletedItem(false);
        };

        AppViewModel.prototype.resetEditingItemKey = function () {
            var _this = this;
            $.each(this.editPropertyFields, function (index, prop) {
                _this.editingItem[prop](null);
            });
        };

        AppViewModel.prototype.translateEditingItemKeyToListKey = function (editingItemKey) {
            return this.translateKey(editingItemKey, this.itemKeyFields);
        };

        AppViewModel.prototype.translateItemKeyToEditProperty = function (itemKey) {
            return this.translateKey(itemKey, this.editPropertyFields);
        };

        AppViewModel.prototype.translateKey = function (fromFields, toFields) {
            var translatedKey = {}, index = 0;

            _.each(fromFields, function (item) {
                translatedKey[toFields[index++]] = item;
            });

            return translatedKey;
        };

        AppViewModel.prototype.updateBrowseEditors = function (data) {
            if (!$.isEmptyObject(this.browseEditors)) {
                $.each(this.browseEditors, function (property, browseEditorViewModel) {
                    var item = ag.getProperty(data, property);
                    if (item)
                        browseEditorViewModel.updateEditingItem(item);
                });
            }
        };

        AppViewModel.prototype.updateGrids = function (data) {
            ag.updateGrids(data, this.grids);
        };

        // Mixin for grid functionality
        AppViewModel.prototype.createGridViewModelForBrowse = function (options) {
            var _this = this;
            var gridOptions = $.extend({}, options);
            gridOptions.loadImmediately = gridOptions.loadImmediately || false;
            gridOptions.pageSize = 20;
            gridOptions.noItemsMessage = ag.strings.noItems;

            var grid = new ag.BrowseGridViewModel(gridOptions, this);

            grid.views.selected.subscribe(function (newValue) {
                _this.navigateToView(newValue.key());
            });

            // getItems override
            grid.getItems = function (params, query) {
                return _this.loadListItemsRequest(query);
            };

            return grid;
        };

        AppViewModel.prototype.loadListItemsRequest = function (query) {
            var _this = this;
            var params = {}, action = "list{0}".format(query);

            return this.net.getJson(action, params).then(function (result) {
                _this.grid.loadGridData(result);
            });
        };

        // To be overridden
        AppViewModel.prototype.deleteItemRequest = function (key) {
            var _this = this;
            // Post to Delete
            return this.net.postJson("delete", key).then(function (result) {
                // Success
                ag.messages.show(result.message, result.messageType);

                // Navigate to "new"
                _this.createItem(true);
            });
        };

        AppViewModel.prototype.createItemRequest = function () {
            var params = {};

            this.updateCreateItemParams(params);

            return this.itemRequest("create", params, true);
        };

        AppViewModel.prototype.updateCreateItemParams = function (params) {
        };

        AppViewModel.prototype.editItemRequest = function (key) {
            var params = $.extend({}, key);

            return this.itemRequest(this.editAction, params, false);
        };

        AppViewModel.prototype.itemRequest = function (action, params, isNewItem, byPOST) {
            var _this = this;
            if (typeof byPOST === "undefined") { byPOST = false; }
            return this.net[byPOST ? "postJson" : "getJson"](action, params).done(function (result) {
                _this.loadItem(result, isNewItem);
            });
        };

        AppViewModel.prototype.getDefaultOptions = function (options) {
            var defaultOptions = _super.prototype.getDefaultOptions.call(this, options);
            defaultOptions.itemKey = defaultOptions.itemKey || "";

            return defaultOptions;
        };

        AppViewModel.prototype.init = function (itemModel) {
            var _this = this;
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            this.initialModel = $.extend({}, itemModel);
            this.editingItem = ag.mapFromJStoMetaObservable(itemModel, this.isEditorReadOnly);
            this.initGrids();
            this.initBrowseEditors();
            ag.dom.initHtmlParts(this);
            this.setupApplicationHeaders(this.editingItem, this.options.applicationHeaders);
            this.initDependencies(this.editingItem);
            this.initNav();
            ag.utils.focusForm();

            var itemEditable = ko.observable(true);
            if (this.options.itemEditable) {
                var itemEditableFlag = ag.utils.getObjectFromPath(this.editingItem, this.options.itemEditable);
                if (itemEditableFlag && ko.isObservable(itemEditableFlag)) {
                    itemEditable = itemEditableFlag;
                }
            }

            this.canSaveItem = ko.computed(function () {
                return itemEditable() && !(_this.isUnapproved && _this.isNewItem()) && !_this.isDeletedItem();
            });

            this.isEditorReadOnly(!this.canSaveItem());
            this.canSaveItem.subscribe(function (newValue) {
                _this.isEditorReadOnly(!newValue);
            });

            this.createMenuCommands();
            this.setSaveAndNewMode();

            this.hasPendingChanges = ko.computed(function () {
                return !_this.isNewItem() && ag.utils.calculateComputedBasedOnProperty("hasUnapprovedChanges", _this);
            });

            this.isDeactivated = ko.computed(function () {
                return ag.utils.calculateComputedBasedOnProperty("deactivated", _this);
            });

            if (this.grid != undefined)
                this.grid.sorter.columnsNeedToUseAlphanumSort = this.browseColumnsUseAlphanumSorting;
        };

        AppViewModel.prototype.createMenuCommands = function () {
            var _this = this;
            var menuCommands = this.menuCommands;
            menuCommands.saveCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.saveItem().always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && !_this.isNewItemNeedingApproval();
                }
            });

            menuCommands.defaultSaveCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.saveItem(_this.isSaveAndNewMode()).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting;
                }
            });

            menuCommands.saveAndNewCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.saveItem(true).always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting;
                },
                isVisible: function () {
                    return true;
                }
            });

            menuCommands.copyCommand = ko.asyncCommand({
                execute: function (complete) {
                    _this.copyItem().always(complete);
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.canCopyItem();
                },
                isVisible: function () {
                    return _this.copyItemVisible();
                }
            });

            this.isSaving = ko.computed(function () {
                return _this.menuCommands.saveCommand.isExecuting() || _this.menuCommands.defaultSaveCommand.isExecuting() || _this.menuCommands.saveAndNewCommand.isExecuting();
            });
        };

        AppViewModel.prototype.canCopyItem = function () {
            return this.canSaveItem() && !this.isNewItem();
        };

        AppViewModel.prototype.copyItemVisible = function () {
            return true;
        };

        AppViewModel.prototype.isNewItemNeedingApproval = function () {
            return this.isNewItem() && this.isNeedingApproval();
        };

        AppViewModel.prototype.isNeedingApproval = function () {
            var isAutoApprovalOn = this.editingItem.isAutoApprovalOn;
            return isAutoApprovalOn && !ko.unwrap(isAutoApprovalOn);
        };

        AppViewModel.prototype.initGrids = function () {
            // Create GridViewModels for each typeMetadata key
            var typeMetadata = this.options.typeMetadata || {};
            if (typeMetadata && !$.isEmptyObject(typeMetadata)) {
                this.options.typeMetaDataUrl = ag.utils.normalizeUrl(this.options.typeMetaDataUrl);

                // Create GridViewModels as required
                ag.createGridViewModelsFromMetadata(this, typeMetadata, this.editingItem, this.options, this.isEditorReadOnly);
            }
        };

        AppViewModel.prototype.initBrowseEditors = function () {
            ag.createBrowseEditors(this, this.options.browseEditors, this.editingItem);
        };

        AppViewModel.prototype.getModel = function () {
            return this.editingItem;
        };

        AppViewModel.prototype.beforeSendCreateItemRequest = function (refreshGrid) {
            if (typeof refreshGrid === "undefined") { refreshGrid = false; }
            this.updateStatus();

            if (refreshGrid)
                this.refreshBrowseGrid();

            // Clear any current navigation state
            this.navigateToItem(this.navigateGetParams());
        };

        AppViewModel.prototype.requestNewItem = function () {
            return this.createItem(true);
        };

        AppViewModel.prototype.createItem = function (refreshGrid) {
            if (typeof refreshGrid === "undefined") { refreshGrid = false; }
            // Before send request, it could be required for caching exsiting record,
            // clear the URL, etc.
            this.beforeSendCreateItemRequest(refreshGrid);

            // Send request
            return this.createItemRequest();
        };

        AppViewModel.prototype.editItem = function (itemViewModel) {
            var params = this.getEditingItemNavKey(itemViewModel);
            this.navigateToItem(params);
        };

        AppViewModel.prototype.copyItem = function () {
            return this.copyItemRequest("copy");
        };

        AppViewModel.prototype.copyAndApply = function () {
            return this.copyItemRequest("copyandapply");
        };

        AppViewModel.prototype.createCopyRequestParams = function () {
            return $.extend({}, ko.mapping.toJS(this.editingItem));
        };

        AppViewModel.prototype.copyItemRequest = function (action) {
            var _this = this;
            // Clone an existing object, maybe it is unnecessary to do this.
            var params = this.createCopyRequestParams();

            this.navigateToEmptyItem();

            return this.itemRequest(action, params, true, true).done(function () {
                _this.silenceDependency(function () {
                    // Update states
                    _this.updateStatus();
                }, _this);
            });
        };

        AppViewModel.prototype.refreshItem = function () {
            // Reload the editing item
            var key = this.getModelSubset(this.editingItem, this.editProperty);

            if (!key)
                return;

            this.editItemRequest(key);
        };

        AppViewModel.prototype.deleteItem = function () {
            var key = this.getModelSubset(this.editingItem, this.editProperty);

            return this.deleteItemRequest(key);
        };

        AppViewModel.prototype.getModelSubset = function (model, properties) {
            var subset = {};
            $.each(properties.split(","), function (index, prop) {
                ag.setProperty(subset, prop, ag.getProperty(model, prop));

                // Translate enum value into string
                var porpValue = ko.unwrap(subset[prop]);
                if (ag.lookups.lookupData && _.isNumber(porpValue) && _.has(ag.lookups.lookupData, prop)) {
                    var data = _.find(ko.mapping.toJS(ag.lookups.lookupData[prop]["data"]), function (enumData) {
                        if (enumData.value == porpValue) {
                            return true;
                        }
                    });
                    subset[prop] = data.text;
                }
            });
            return ko.mapping.toJS(subset);
        };

        AppViewModel.prototype.getEditingItemNavKey = function (model, keyFields, key, translateFn) {
            keyFields = keyFields || this.itemKeyFields;
            key = key || this.itemKey;
            translateFn = translateFn || this.translateItemKeyToEditProperty;

            // Used to get a navigation key from a selected browse list item
            // If this is a single-part key app, use the "?edit={keyvalue}" scheme otherwise the "?key1=val1&key2=val1...&edit=true" scheme
            return !keyFields || keyFields.length == 1 ? ko.unwrap(model[key]) : $.extend({ edit: true }, translateFn.call(this, this.getModelSubset(model, key)));
        };

        AppViewModel.prototype.isKeyEqual = function (key1, key2) {
            // We're assuming the keys are objects with the same
            // properties that might have different values.
            var match = true;

            $.each(key1, function (property) {
                var tempMatch, value1 = key1[property], value2 = key2[property], moment1 = moment.fromISO(value1), moment2 = moment.fromISO(value2), areValidDates = moment1.isValid() && moment2.isValid() && moment1.withinValidDateRange() && moment2.withinValidDateRange();

                if (areValidDates)
                    tempMatch = moment1.isEqual(moment2);
                else
                    tempMatch = value1 == value2;

                if (!tempMatch) {
                    match = tempMatch;
                    return false;
                }
            });

            return match;
        };

        AppViewModel.prototype.viewNavigation = function (viewKey) {
            if (!viewKey)
                return;

            var views = this.grid.views;
            if (views.selected() && views.selected().key() !== viewKey) {
                var view = views.findByKey(viewKey);
                if (view)
                    views.selected(view);
            }
        };

        AppViewModel.prototype.setPageTitle = function (viewModel, requestedItemKey) {
            // Set the title
            var keyString = "";
            viewModel.pageTitle.removeAll();

            $.each(requestedItemKey, function (index, item) {
                // Attempt to parse as date
                if (ag.dates.isDateISO8601Format(item)) {
                    var date = moment.fromISO(item);
                    if (date.isValid())
                        item = date.toEditor();
                }

                if (item.length > 0) {
                    keyString += (keyString.length > 0) ? " - " + item : item;
                    viewModel.pageTitle.push({ "keyProperty": item });
                }
            });

            // Check the value of keyString is number
            var reg = /^\d+$/;
            if (reg.test(keyString)) {
                viewModel.pageTitle([{ "keyProperty": ag.utils.documentTitle(viewModel.applicationTitle, keyString) }]);
            } else {
                keyString += " -";
                ag.utils.documentTitle(keyString, viewModel.applicationTitle);
            }
        };

        AppViewModel.prototype.showGridExportDialog = function (gridViewModel, event) {
            ko.contextFor(event.target).$root.exportFileType("csv");
            var $element = $('#exportDialog');
            $element.modal('show');
            $($("#exportDialog label:last")).hide();
            $element.data("gridViewModel", gridViewModel);
        };

        AppViewModel.prototype.exportView = function (viewModel, event) {
            var $element = $('#exportDialog'), gridViewModel = $element.data("gridViewModel");

            if (gridViewModel) {
                $element.removeData("gridViewModel");
                this.exportIndividualGrid(gridViewModel);
            } else {
                this.exportMainGrid();
            }
        };

        AppViewModel.prototype.exportIndividualGrid = function (gridViewModel) {
            var url = "/{0}/{1}export".format(this.options.serviceUrl, gridViewModel.options.action), params = {
                gridExportOptions: {
                    typefullname: gridViewModel.options.typeName,
                    viewKey: gridViewModel.views.selected().key(),
                    format: this.exportFileType(),
                    filename: document.title + " - " + gridViewModel.options.name
                },
                options: gridViewModel.getGridViewOptions(),
                data: ag.utils.cleanJSForRequest(ko.mapping.toJS(this.editingItem), this.net.responseOnlyProperties, this.net.postOnlyProperties)
            };

            ag.downloadInvoker.invoke(url, params);
        };

        AppViewModel.prototype.exportMainGrid = function () {
            var url = "/{0}/exportview".format(this.options.serviceUrl), params = {
                typefullname: "",
                viewKey: this.grid.views.selected().key(),
                format: this.exportFileType(),
                title: this.applicationTitle,
                options: this.grid.getGridViewOptions()
            };

            ag.downloadInvoker.invoke(url, params);
        };

        AppViewModel.prototype.itemSelected = function (items) {
            if (!items || !items.length)
                return;

            this.navigateToItem(this.getEditingItemNavKey(items[0]));
        };

        AppViewModel.prototype.tidyUpExistingElements = function (requestedItemKey, currentEditingItemKey) {
            if (this.isKeyEqual(requestedItemKey, currentEditingItemKey))
                return;

            // Clear any existing data and form validation
            this.resetEditor();

            // Request the selected item
            this.editItemRequest(requestedItemKey);

            // We've just selected a new item so close the browse list, if any
            this.grid.showList(false);
        };

        AppViewModel.prototype.mapJsToEditingItem = function (newValue) {
            ko.mapping.fromJS(newValue, this.editingItem);
            ag.utils.resetValidation(this.editingItem);
        };

        // To notify all subscribers we are updating the view model
        AppViewModel.prototype.publishViewModelUpdatingEvent = function (isUpdatingViewModel) {
            PubSub.publishSync(ag.topics.UpdatingViewModel, { value: isUpdatingViewModel, viewModel: this });
        };

        // LoadAndNavigate
        AppViewModel.prototype.loadItemThenNavigate = function (result, navObj, resetEditor, resetPageTitle) {
            var _this = this;
            if (typeof resetEditor === "undefined") { resetEditor = true; }
            if (typeof resetPageTitle === "undefined") { resetPageTitle = false; }
            this.silenceDependency(function () {
                if (resetEditor)
                    _this.resetEditor();
                _this.loadItem(result, false);
                _this.navigateToItem(navObj);
                if (resetPageTitle)
                    _this.setPageTitle(_this, navObj);

                ag.messages.clear();
            }, this);

            this.clearTheRefreshWrapper(this.grids);
        };

        AppViewModel.prototype.clearTheRefreshWrapper = function (grids) {
            var _this = this;
            _.each(grids, function (g) {
                if (_.isFunction(g.clearTheRefreshWrapper)) {
                    g.clearTheRefreshWrapper();
                } else {
                    _this.clearTheRefreshWrapper(g);
                }
            });
        };

        // Toggle the status of the browse grid
        AppViewModel.prototype.toggleBrowseGrid = function () {
            this.grid.toggle();
        };

        AppViewModel.prototype.navigateGetParams = function () {
            // Set up the item key fields for navigation
            // If this is a single-part key field, use the editProperty instead.
            // editProperty translates selected browse list columns specified by itemKey so needs to have a matching number of values
            if (this.editProperty && this.itemKey && this.editProperty.split(",").length != this.itemKey.split(",").length) {
                throw new Error("Item key and edit property need to have a matching number of delimited values, ItemKey: {0} EditProperty: {1}".format(this.itemKey.split(","), this.editProperty.split(',')));
            }

            var keyParams = {};

            // TODO: perhaps use a single key scheme of "?key1=val1...&edit=true"?
            if (this.editPropertyFields.length > 1) {
                $.each(this.editPropertyFields, function (index, field) {
                    keyParams[field] = null;
                });
            }
            $.extend(keyParams, { edit: null, view: null, isGroup: null });

            return keyParams;
        };

        AppViewModel.prototype.navigateDelegator = function (args, currrentContext) {
            var navEntry = args[0];

            var existingKeyValue = navEntry.params[this.editPropertyName];

            if (existingKeyValue) {
                // If we are a single-part key app, the edit parameter will contain
                // the key value.
                var currentEditingItemKey = this.getModelSubset(this.editingItem, this.editProperty), requestedItemKey = {};

                if (this.editPropertyFields.length == 1)
                    requestedItemKey[this.editProperty] = existingKeyValue;
                else
                    requestedItemKey = this.getModelSubset(navEntry.params, this.editProperty);

                this.tidyUpExistingElements(requestedItemKey, currentEditingItemKey);

                this.setPageTitle(currrentContext, requestedItemKey);
            } else {
                this.navigateDelegatorForNewMode();
            }

            this.viewNavigation(navEntry.params.view);
        };

        AppViewModel.prototype.navigateDelegatorForNewMode = function () {
            this.resetEditor();
            this.actionInvoked = true;
            this.isNewItem(true);
        };
        AppViewModel.EditMode = {
            Insert: 0,
            Update: 1
        };

        AppViewModel.SaveMode = {
            Save: 0,
            SaveAndNew: 1
        };
        return AppViewModel;
    })(ag.BaseViewModel);
    ag.AppViewModel = AppViewModel;
})(ag || (ag = {}));
