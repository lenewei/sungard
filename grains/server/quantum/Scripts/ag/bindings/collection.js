/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    // A utility binding that adds some additional functionality to each item in a collection
    ko.bindingHandlers["collection"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var list = $(element), selectedItems = valueAccessor(), allBindings = allBindingsAccessor(), optionsTitle = allBindings.optionsTitle, optionsText = allBindings.optionsText, beforeRemoveCallback = allBindings.beforeRemove, bindKeyColumn = !!list.data("lookup-bind-key-column"), keyField = list.data("lookup-key-field");

            // Selected items should be either an array or observable array
            if (!(selectedItems.push || ko.isObservable(selectedItems)))
                throw new Error("The bound value on a collection binding must be an array, observable array or computed observable");

            // Add to each bound observable in the collection the ability to fetch a display name for one of its items.
            // We need to add it to the parent because it will be referenced from a template and needs
            // to have a context to execute in.
            var items = ko.unwrap(selectedItems);

            if (items) {
                _.each(items, function (item) {
                    if (!_.isArray(item) && _.isObject(item))
                        ag.utils.addCollectionExtensionMethods(item, optionsText, optionsTitle, keyField);
                });
            }

            // Add some helper methods to the collection
            addItemSelectionHelpers(selectedItems, bindKeyColumn);

            // Add a delegate to each remove link child in the selected items list
            //ko.utils.registerEventHandler(
            list.on("click", "a.icon-remove, .close.action", function (event) {
                var currentSelectedItems = valueAccessor(), observable = ko.dataFor(event.target);

                // Call an optional callback before the item is removed. If the callback returns
                // false, don't remove the item.
                var doRemove = beforeRemoveCallback ? beforeRemoveCallback(observable) : true;
                doRemove = doRemove !== undefined ? doRemove : true;
                if (doRemove)
                    currentSelectedItems.remove(observable);

                event.stopPropagation();
                event.preventDefault();

                // Raise a change event
                list.change();
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var list = $(element), selectedItems = valueAccessor(), optionsText = allBindingsAccessor().optionsText, optionsTitle = allBindingsAccessor().optionsTitle, bindKeyColumn = !!list.data("lookup-bind-key-column"), keyField = list.data("lookup-key-field");

            var items = ko.unwrap(selectedItems);

            // Add some extension methods to each item in the collection, e.g., to fetch the display name of the item
            if (items) {
                _.each(items, function (item) {
                    if (!_.isArray(item) && _.isObject(item))
                        ag.utils.addCollectionExtensionMethods(item, optionsText, optionsTitle, keyField);
                });
            }

            // Add some helper methods to the collection
            addItemSelectionHelpers(selectedItems, bindKeyColumn);
        }
    };

    // Add some helper methods to an array to support the collection binding
    function addItemSelectionHelpers(selectedItems, bindKeyColumn) {
        if (selectedItems.updateSelectedItems)
            return;

        $.extend(selectedItems, {
            updateSelectedItems: function (items, defaultObject) {
                // TODO: add key-based updating to make this more efficient
                this($.map(items, function (item) {
                    if (_.isObject(item))
                        return bindKeyColumn ? item['__key__'] : ko.mapping.fromJS(defaultObject ? $.extend({}, defaultObject, item) : item);
                    else
                        return item;
                }));
            }
        });
    }

    // Mirror the value of the Source property onto the Destination property
    // Example binding: mirror: { src: value1, dest: value2 }
    ko.bindingHandlers["mirror"] = {
        after: ["collection"],
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var sourceAndDestination = valueAccessor();
            sourceAndDestination.dest(sourceAndDestination.src());
        }
    };
})(ag || (ag = {}));
