/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="key.ts" />
var ag;
(function (ag) {
    var currentKeyStore = {}, silenceMultikeyChangeEvent = false;

    ko.bindingHandlers["multikey"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var rootViewModel = bindingContext.$root, applyBindingDoneSubToken;

            rootViewModel.copyOriginalKeyCallBack = ag.key.utils.copyOriginalKey;

            applyBindingDoneSubToken = PubSub.subscribe(ag.topics.ApplyBindingDone, function () {
                ko.utils.registerEventHandler(element, "change", function () {
                    if (ko.unwrap(rootViewModel.updatingModel) || silenceMultikeyChangeEvent)
                        return;

                    // For radio button group, the CHANGE event fires before the binding finish
                    // temp delay this value
                    _.delay(function () {
                        currentKeyStore = ag.key.utils.syncKeysStoreWithViewModel(rootViewModel);

                        rootViewModel.publishViewModelUpdatingEvent(true);
                        getEntity(rootViewModel, currentKeyStore).always(function () {
                            rootViewModel.publishViewModelUpdatingEvent(false);
                        });
                    }, 100);
                });
            });

            // Dispose
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                PubSub.unsubscribe(applyBindingDoneSubToken);
            });
        }
    };

    function getEntity(model, keysObject) {
        if (model.editUrl && model.itemKey) {
            var postData = { throwOnNotFound: false, edit: true }, net = model.net;

            $.extend(postData, keysObject);

            var deferred = $.Deferred();
            var promise = net.getJson({ url: model.editUrl }, postData).done(function (result) {
                var isNewItem = model.isNewItem();

                // If a matching entity was found, load it and then navigate to it
                // (navigating won't cause it to be reloaded)
                if (result && result.data) {
                    model.loadItemThenNavigate(result, postData, true, true);
                } else if (!isNewItem) {
                    ag.keyChangeConfirmationViewModel.init({
                        deferred: deferred,
                        confirmationId: null,
                        messages: [ag.strings.keyChange1, ag.strings.keyChange2],
                        action: "",
                        data: null,
                        net: net
                    });
                }
            });

            // chain the deferred object if the status has been changed
            processKeyChangeHandler(deferred, model);

            return promise;
        }

        return $.Deferred().resolve();
    }

    function processKeyChangeHandler(deferred, model) {
        deferred.done(function (result) {
            silenceMultikeyChangeEvent = true;
            switch (result) {
                case "doNew":
                    model.createItem(true).done(function () {
                        model.silenceDependency(function () {
                            model.mapJsToEditingItem(currentKeyStore);
                        }, model);
                    });
                    break;
                case "doCopy":
                    model.copyAndApply();
                    break;
                case "doCancel":
                    model.silenceDependency(function () {
                        //reset back to the old keys
                        model.mapJsToEditingItem(model.originalKeyStore);
                    }, model);
                    break;
            }
            silenceMultikeyChangeEvent = false;
        });
    }
})(ag || (ag = {}));
