/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    // Wire up an explorer dialog to the the bound element
    ko.bindingHandlers["explorerToggle"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var target = $(element), searchInput = $($(target.parent().find('input'))[0]), opts = valueAccessor(), allBindings = allBindingsAccessor(), source = opts.source, selectedItems = opts.selectedItems, modal = opts.modal === undefined ? true : opts.modal, keyField = opts.keyField, mode = opts.mode || "multi", useCache = !!opts.useCache, initialRequestDataCallback = opts.initialRequestDataCallback, additionalPayloadData = allBindings.additionalPayloadData, initialValue = opts.initialValue, postRequest = allBindings.postRequest, requestDataCallback = allBindings.requestData, originalSaveCallback = allBindings.saveCallback, saveCallback = originalSaveCallback, optionsText = allBindings.optionsText, optionsTitle = allBindings.optionsTitle, beforeClick = allBindings.beforeClick, lookupDisplayName = target.data("lookup-display-name"), clickBubble = allBindings.clickBubble !== undefined ? ko.unwrap(allBindings.clickBubble) : true, cacheOnClient = !!target.data("lookup-cache-on-client"), updateFields = target.data("lookup-update-fields"), lookupFields = target.data("lookup-lookup-fields"), includeCompleteModel = target.data("lookup-include-complete-model");

            if (!saveCallback)
                throw new Error("The explorerToggle binding requires a saveCallback binding");

            if (mode == "multi" && !selectedItems)
                throw new Error("The explorerToggle binding requires a selectedItems property on the binding value in multiselect mode");

            // Selected items should be either an array, an observable array or a function
            if (!selectedItems || (selectedItems && !(selectedItems.push || typeof selectedItems === "function")))
                throw new Error("The bound value on a collection binding must be an array, an observable array or a function");

            // Source needs to be specified and should be either an array or a URL
            var unwrappedSource = ko.unwrap(source);
            if (!unwrappedSource)
                throw new Error("No local or remote data source specified");
            else if (!(((unwrappedSource.data && unwrappedSource.fields) || unwrappedSource.length) || unwrappedSource.substring))
                throw new Error("data source needs to be a lookup dataset or a string");

            // If the modal option is false (default: true), use the target element as the container
            // otherwise we'll be displaying in a dialog.
            var container = !modal ? target : null;

            // If some update fields were specified and this is a single select, these will need to be updated from the selected lookup item along with the
            // bound field.
            if (mode == "single" && updateFields) {
                updateFields = updateFields.split(',');
                lookupFields = !lookupFields ? updateFields : lookupFields.split(',');

                saveCallback = function (lookupItems) {
                    var lookupItem = lookupItems.shift();
                    if (!lookupItem)
                        return;

                    // Update the extra fields
                    $.each(updateFields, function (ind, fieldPath) {
                        var model = viewModel.getModel ? viewModel.getModel() : viewModel;
                        var field = ag.getProperty(model, fieldPath);

                        //var lookupProperty = fieldPath.split('.').pop();
                        var lookupProperty = lookupFields[ind];

                        if (lookupProperty && field && ko.isObservable(field))
                            field(lookupItem[lookupProperty]);
                    });

                    // Call the original save callback
                    // Single select mode so send the key of the first selected item if the callback is an observable and NOT an array,
                    // otherwise just send the last selected item.
                    if (ko.isObservable(originalSaveCallback) && !$.isArray(originalSaveCallback()))
                        originalSaveCallback(ag.utils.getItemKey(lookupItem));
                    else
                        originalSaveCallback(lookupItem);

                    ag.key.utils.notifyKeyEventChange(target.siblings('input'));
                };
            }

            // Create the explorer. If this is an inline component, include the initialisation options as well
            var setupOptions = {
                rootViewModel: bindingContext.$root,
                modal: modal,
                container: container
            };

            var initOptions = {
                lookupDisplayName: lookupDisplayName,
                target: target,
                source: source,
                view: { fields: [] },
                saveCallback: saveCallback,
                postRequest: postRequest,
                requestDataCallback: requestDataCallback,
                selectedItems: selectedItems,
                initialValue: initialValue,
                optionsText: optionsText,
                optionsTitle: optionsTitle,
                mode: mode,
                pageSize: 10,
                cacheOnClient: cacheOnClient,
                keyField: keyField,
                viewModel: viewModel,
                modal: modal,
                initialRequestDataCallback: initialRequestDataCallback,
                additionalPayloadData: additionalPayloadData,
                useCache: useCache,
                includeCompleteModel: includeCompleteModel,
                onAfterSave: function () {
                    // Raise change on the collection
                    var collection = target.siblings("ul").first();
                    if (collection.length)
                        collection.change();
                }
            };

            var explorer = new ag.components.Explorer(modal ? setupOptions : $.extend(setupOptions, initOptions));

            // Store a reference to the explorer so we can access it programmatically
            $(target).data("explorer", explorer);

            // If we're in inline mode, we don't need to set up any toggle event handling
            // so return now.
            if (!modal) {
                // We also need to indicate that we're controlling
                // our own descendent bindings to stop them being bound in the context of the app model.
                return { controlsDescendantBindings: true };
            }

            var toggleExplorer = function (e) {
                // Reset the search
                initOptions.searchQuery = "";

                // Show the dialog
                explorer.toggle(initOptions);

                if (!clickBubble) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            };

            // Bind the click handler to the explorer toggling
            target.unbind("click");
            ko.utils.registerEventHandler(target, "click", function (e) {
                // TODO: This would be better served as an asyncCommand
                if (target.hasClass("disabled"))
                    return;

                if (beforeClick)
                    var promise = beforeClick(e);

                if (promise) {
                    promise.done(function () {
                        toggleExplorer(e);
                    });
                } else {
                    toggleExplorer(e);
                }
            });

            // Bind a key handler to an associated input for triggering a lookup action
            if (searchInput) {
                var debouncedSearch = _.debounce(function () {
                    explorer.toggle($.extend(initOptions, { searchQuery: searchInput.val() }));

                    // Clear the value
                    searchInput.val("");
                }, 250);

                ko.utils.registerEventHandler(searchInput, "keypress", function (e) {
                    switch (e.keyCode) {
                        case $.ui.keyCode.TAB:
                            break;
                        case $.ui.keyCode.ENTER:
                            explorer.toggle(initOptions);
                            e.stopImmediatePropagation();
                            break;
                        default:
                            // If the user typed an alphanumeric, pass this to the explorer to initialise a search
                            // [AG 11/9/2012] Currently broken in that the observable gets updated but the bound element doesn't
                            var inp = String.fromCharCode(e.which);
                            if (/[a-zA-Z0-9]/.test(inp)) {
                                debouncedSearch();
                                e.stopImmediatePropagation();
                            }
                    }
                });
            }
        }
    };
})(ag || (ag = {}));
