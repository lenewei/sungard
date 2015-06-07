var ag;
(function (ag) {
    ko.bindingHandlers["key"] = {
        init: function (element, valueAccessor, allBindingsAccessor, appViewModel) {
            var $element = $(element), readOnly = $element.data("read-only");

            if (!(appViewModel instanceof ag.AppViewModel) && !readOnly)
                throw new Error("KeyBinding is used incorrectly.");

            appViewModel.copyOriginalKeyCallBack = key.utils.copyOriginalKey;

            var retriever = function () {
                if (appViewModel.updatingModel())
                    return;

                // Notify the UIHtml to update when key value changed
                PubSub.publish(ag.topics.UpdateUIHtml);

                appViewModel.publishViewModelUpdatingEvent(true);
                getEntity($element, valueAccessor, appViewModel, !!readOnly).always(function () {
                    appViewModel.publishViewModelUpdatingEvent(false);
                });
            };

            ko.utils.registerEventHandler(element, "change", retriever);

            // IE specific
            if ($.browser.msie) {
                ko.utils.registerEventHandler(element, "paste", function () {
                    $element.data("ieRetrieve", true);
                });

                ko.utils.registerEventHandler(element, "keyup", function (event) {
                    if (event.keyCode !== 13)
                        return;

                    // if this event is from typehead select we won't fire
                    var typehead = $element.data("typeahead");
                    if (typehead && typehead.shown)
                        return;

                    retriever();
                });

                ko.utils.registerEventHandler(element, "blur", function () {
                    if ($element.data("ieRetrieve"))
                        retriever();

                    $element.data("ieRetrieve", false);
                });
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor) {
            var keyOld = $(element).val(), keyNew = ko.unwrap(valueAccessor());

            if (key.utils.isSameKeyValue(keyNew, keyOld))
                return;

            // Stop updating the value if this field conatins the relativedatepicker binding,
            // it will casue date format display issue
            if (!allBindingsAccessor().date)
                $(element).val(keyNew);
        }
    };

    function getEntity($element, valueAccessor, model, throwOnNotFound) {
        var temp = $.Deferred();

        if (!model.editUrl || !model.itemKey)
            return temp.resolve();

        if (!key.utils.isTryRetrieveOnce($element) && ko.unwrap(valueAccessor()) == $element.val())
            return temp.resolve();

        var postData = { throwOnNotFound: throwOnNotFound }, net = new ag.utils.Network(), keyValue = $element.val();

        if (!keyValue)
            return temp.resolve();

        postData[model.editProperty] = keyValue;

        return net.getJson({ url: model.editUrl }, postData).done(function (result) {
            // If a matching entity was found, load it and then navigate to it
            if (result && result.data)
                model.loadItemThenNavigate(result, keyValue, false);
            else {
                var newlyInputValue = $element.val();
                if (model.isNewItem()) {
                    valueAccessor()(newlyInputValue);
                } else {
                    if (model.editingItem.canRename && model.editingItem.canRename()) {
                        // if model canRename, so we won't fire new item request
                        valueAccessor()(newlyInputValue);
                    } else {
                        model.requestNewItem().done(function () {
                            valueAccessor()(newlyInputValue);
                        });
                    }
                }

                model.afterKeyBindingChangeCallbackFunction();
            }
        }).fail(function () {
            var editPropertyObserverable = model.editingItem[model.editProperty];
            if (model.isNewItem()) {
                $($element).focus().select();
            } else {
                model.silenceDependency(function () {
                    model.mapJsToEditingItem(model.originalKeyStore);

                    // Force the UI update it again
                    editPropertyObserverable.valueHasMutated();
                    $($element).focus().select();
                }, model);
            }
        });
    }

    (function (key) {
        // Extension method for key/multikey
        (function (utils) {
            utils.TRY_RETRIEVE_KEY_ONCE = "TRY_RETRIEVE_KEY_ONCE";

            function syncKeysStoreWithViewModel(model) {
                return copyKey(model);
            }
            utils.syncKeysStoreWithViewModel = syncKeysStoreWithViewModel;

            function copyOriginalKey(isNewItem, model) {
                if (isNewItem)
                    return {};

                model.originalKeyStore = copyKey(model);
            }
            utils.copyOriginalKey = copyOriginalKey;

            function isTryRetrieveOnce($target) {
                var val = $target.data(utils.TRY_RETRIEVE_KEY_ONCE);

                //reset back it to undefined so will only call once
                $target.data(utils.TRY_RETRIEVE_KEY_ONCE, undefined);

                return val;
            }
            utils.isTryRetrieveOnce = isTryRetrieveOnce;

            function isSameKeyValue(keyNew, keyOld) {
                if (keyNew == keyOld)
                    return true;

                if (keyNew != null && keyOld != null)
                    if (keyNew.toString().toLowerCase() == keyOld.toString().toLowerCase())
                        return true;

                return false;
            }
            utils.isSameKeyValue = isSameKeyValue;

            function copyKey(model) {
                var temp = {};
                _.each(model.editPropertyFields, function (property) {
                    temp[property] = ko.unwrap(model.editingItem[property]);
                });
                return temp;
            }

            // I am trying to not expand the code base of explorerToggle and filter binding
            // due to we are going to rewrite it.
            function notifyKeyEventChange(target) {
                var bindInfo = target.data("bind");
                if (bindInfo && (bindInfo.indexOf("key:") != -1 || bindInfo.indexOf("multikey:") != -1)) {
                    // key binding change fire once
                    target.data(utils.TRY_RETRIEVE_KEY_ONCE, true);

                    // Fire the change event so bindings
                    target.change();
                }
            }
            utils.notifyKeyEventChange = notifyKeyEventChange;
        })(key.utils || (key.utils = {}));
        var utils = key.utils;
    })(ag.key || (ag.key = {}));
    var key = ag.key;
})(ag || (ag = {}));
