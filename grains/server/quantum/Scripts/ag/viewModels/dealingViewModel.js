/// <reference path="../../ts/global.d.ts" />
/// <reference path="dealMap.ts" />
/// <reference path="appViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var DealingViewModel = (function (_super) {
        __extends(DealingViewModel, _super);
        function DealingViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            this.itemTypeIsDeal = ko.observable(true);
            this.analysisCodesNeedUpdate = ko.observable(false);
            this.isEditorLoaded = ko.observable(false);
            this.subscribeAnalysisCodes = function () {
                var call = function (obj, property) {
                    if (property.toLowerCase() != "analysiscodes")
                        return false;

                    var codes = ko.unwrap(obj[property]);
                    if (!_.isArray(codes))
                        return false;

                    _.forEach(codes, function (code) {
                        code.valueAsObject.subscribe(function () {
                            obj[property].valueHasMutated();
                        });
                    });

                    return false;
                };

                ag.utils.walkObject(_this.editingItem, call);
            };

            // Register ChildWindow Opened and Closing handlers to be overridden in viewModels
            // Wouldn't have thought that the inline cast would be required for this
            // could be something that is resolved in a later version of TS
            ag.childWindowOpened = function (viewModel, windowHandle) {
                _this.childWindowOpened(viewModel, windowHandle);
            };

            ag.childWindowClosing = function (viewModel, result, saved, windowHandle) {
                _this.childWindowClosing(viewModel, result, saved, windowHandle);
            };
        }
        DealingViewModel.prototype.childWindowOpened = function (viewModel, windowHandle) {
            // Example implementation:
            // Convert to JS
            //var data = ko.mapping.toJS(this.editingItem);
            // Execute mapping in context of child window
            //windowHandle.ko.mapping.fromJS(data, viewModel.editingItem);
        };

        DealingViewModel.prototype.childWindowClosing = function (viewModel, result, saved, windowHandle) {
            // Given a result from a child window display it
            if (result && result.message)
                ag.messages.show(result.message, result.messageType);

            return true;
        };

        DealingViewModel.prototype.editItemRequest = function (key) {
            var params = {};
            params[this.editProperty] = key;

            return this.itemRequest("edit", params, false);
        };

        // virtual method for RepoDealingViewModel
        DealingViewModel.prototype.dealNumberChanged = function (dealNumber) {
        };

        DealingViewModel.prototype.init = function (itemModel) {
            _super.prototype.init.call(this, itemModel);

            this.initAnalysisCodeDefaulting();
            this.setupDealMapGrid();

            // Notify opener
            if (window.opener && window.opener.ag && window.opener.ag.childWindowOpened)
                window.opener.ag.childWindowOpened(this, window);
        };

        DealingViewModel.prototype.initDependencies = function (editingItem) {
            var _this = this;
            var instrument = this.editingItem.instrument, loadEditor = function () {
                if (!_this.isEditorLoaded() && !_this.updatingModel()) {
                    _this.updatingModel(true);
                    _this.isEditorLoaded(true);
                    _this.updatingModel(false);
                }
            };
            if (instrument) {
                if (instrument()) {
                    loadEditor();
                } else {
                    instrument.subscribe(function () {
                        loadEditor();
                    });
                }
            }

            _super.prototype.initDependencies.call(this, editingItem);
        };

        DealingViewModel.prototype.beforeApplyBindings = function () {
            var _this = this;
            var dealMapGrid = this.grids.dealMap;
            if (dealMapGrid) {
                var dealMapActions = dealMapGrid.actions;
                if (dealMapActions) {
                    _.each(dealMapActions, function (action) {
                        var afterInvokeFn = action.afterInvoke;
                        action.afterInvoke = function (result, parentViewModel) {
                            action.updateItem(result, _this);
                            afterInvokeFn(result, parentViewModel);
                        };
                    });

                    var appendFunction = 'appendDealMapId';
                    dealMapGrid[appendFunction] = function (action, payload) {
                        var selectedItem = dealMapGrid.selected.item();
                        if (selectedItem)
                            payload['dealMapId'] = ko.unwrap(selectedItem.dealMapId);
                    };

                    var bulkReplaceAction = dealMapActions.replaceDealMap;
                    if (bulkReplaceAction) {
                        bulkReplaceAction.createCustomPayload = function (data) {
                            var payload = {};

                            var selectedItem = dealMapGrid.selected.item();
                            if (selectedItem)
                                payload['dealMapId'] = ko.unwrap(selectedItem.dealMapId);

                            return payload;
                        };
                        bulkReplaceAction.beforeInvokeCallbackFunction = appendFunction;
                    }
                }
            }
        };

        DealingViewModel.prototype.initAnalysisCodeDefaulting = function () {
            var _this = this;
            var leftLeg = this.editingItem.leftLeg, rightLeg = this.editingItem.rightLeg, analysisCodes = this.editingItem.analysisCodes || (leftLeg ? leftLeg.analysisCodes : undefined);
            if (analysisCodes) {
                analysisCodes.refresh = function () {
                    _this.analysisCodesNeedUpdate(true);
                    return true;
                };

                if (rightLeg && rightLeg.analysisCodes) {
                    rightLeg.analysisCodes.refresh = function () {
                        _this.analysisCodesNeedUpdate(true);
                        return true;
                    };
                }

                var analysisCodesActive = this.tabs.analysisCodes;
                if (analysisCodesActive) {
                    analysisCodesActive.subscribe(function (value) {
                        if (value && _this.analysisCodesNeedUpdate()) {
                            _this.net.postJson("updateAnalysisCodes", function () {
                                return ko.mapping.toJS(_this.editingItem);
                            }).then(function (result) {
                                var data = result.data;
                                if (data) {
                                    if (data.analysisCodes) {
                                        _this.editingItem.analysisCodes(ko.unwrap(ko.mapping.fromJS(data.analysisCodes)));
                                    }

                                    if (data.leftLeg && data.leftLeg.analysisCodes) {
                                        _this.editingItem.leftLeg.analysisCodes(ko.unwrap(ko.mapping.fromJS(data.leftLeg.analysisCodes)));
                                    }

                                    if (data.rightLeg && data.rightLeg.analysisCodes) {
                                        _this.editingItem.rightLeg.analysisCodes(ko.unwrap(ko.mapping.fromJS(data.rightLeg.analysisCodes)));
                                    }
                                }

                                _this.analysisCodesNeedUpdate(false);
                            });
                        }
                    });
                }
            }
        };

        DealingViewModel.prototype.setupDealMapGrid = function () {
            var dealMapGrid = this.grids.dealMap;
            if (dealMapGrid) {
                var dealMap = new ag.DealMapViewModel(this.editingItem, dealMapGrid, this.isNewItem);
                dealMapGrid.menuCommands.customizeCommand = ko.command({
                    execute: function () {
                        dealMap.customize();
                    },
                    isVisible: function () {
                        return dealMap.customizeVisible();
                    }
                });

                var editor = dealMapGrid.editor;
                if (editor) {
                    dealMapGrid.dealMap = dealMap;
                    editor.canCreateFn = dealMap.canCreate;
                    editor.canEditFn = dealMap.canEdit;
                    editor.canDeleteFn = dealMap.canDelete;
                    editor.canCopyFn = dealMap.canCopy;
                }
            }
        };

        DealingViewModel.prototype.editItem = function (itemViewModel) {
            if (itemViewModel.dealNumber)
                this.navigateToItem(itemViewModel.dealNumber);
        };

        DealingViewModel.prototype.navigateToItem = function (keyValue) {
            if (!$.isPlainObject(keyValue))
                this.nav.navigate({ dealNumber: keyValue });
            else
                this.nav.navigate(keyValue);
        };

        DealingViewModel.prototype.refreshItem = function () {
            // Reload the editing item
            var key = (this.editingItem && this.editingItem[this.editProperty]) ? ko.unwrap(this.editingItem[this.editProperty]) : null;

            if (!key)
                throw Error("missing key field");

            return this.editItemRequest(key);
        };

        DealingViewModel.prototype.refreshPageTitle = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            // Get the dealNumber off the editing item,
            // or what was passed to us.
            var dealNumber = this.editingItem.dealNumber();
            if (args && args.length === 1)
                dealNumber = args[0];

            // Add the Image number if viewing an image
            if (_.has(this.editingItem, "usingImage") && this.editingItem.usingImage())
                dealNumber += " - " + ag.strings.image + " " + this.editingItem.imageNumber();

            // Refresh the page title
            this.pageTitle([{ "keyProperty": ag.utils.documentTitle(this.applicationTitle, dealNumber) }]);
        };

        DealingViewModel.prototype.navigateGetParams = function () {
            return { dealNumber: null, view: null, copy: null };
        };

        DealingViewModel.prototype.navigateDelegator = function (args, currrentContext) {
            var navEntry = args[0];
            var dealNumber = navEntry.params.dealNumber;

            if (dealNumber) {
                // If not already loaded, load the deal
                if (parseInt(dealNumber) !== this.editingItem.dealNumber()) {
                    // Clear any existing data and form validation
                    this.resetEditor();

                    // Request the selected item
                    this.editItemRequest(dealNumber);

                    // We've just selected a new item so close the browse list, if any
                    this.grid.showList(false);
                }

                // Set the title
                this.refreshPageTitle(dealNumber);
            } else {
                this.resetEditor();
                this.actionInvoked = true;
            }

            this.viewNavigation(navEntry.params.view);
        };

        DealingViewModel.prototype.loadItem = function (result, isNewItem) {
            if (!this.isEditorLoaded() && !isNewItem) {
                this.updatingModel(true);
                this.isEditorLoaded(true);
                this.updatingModel(false);
            }

            var deferred = _super.prototype.loadItem.call(this, result, isNewItem);
            this.analysisCodesNeedUpdate(false);
            deferred.then(this.subscribeAnalysisCodes);

            return deferred.resolve();
        };

        DealingViewModel.prototype.analyseSubActionCallback = function (model, actionData) {
            //This is an InvokeCallbackFunction for Unwind SubAction
            model.data = actionData;
        };
        return DealingViewModel;
    })(ag.AppViewModel);
    ag.DealingViewModel = DealingViewModel;
})(ag || (ag = {}));
