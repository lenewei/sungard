var ag;
(function (ag) {
    function MetaObservable(observable, name, owner, handle, readOnlyObservable) {
        var result = observable, initialValue = ko.observable(ko.mapping.toJSON(observable)), processingCallDepth = ko.observable(0), suspendedCallDepth = ko.observable(0), internalIsAvailable = ko.observable(true);

        result.isVisible = ko.observable(true);
        result.isAvailable = ko.computed({
            read: function () {
                return internalIsAvailable() && !readOnlyObservable();
            },
            write: function (value) {
                internalIsAvailable(value);
            },
            owner: this
        });

        result.isKeyField = ko.observable(false);
        result.label = ko.observable(null);
        result.owner = owner;
        result.handle = handle;
        result.fieldName = name;

        function isPropertySet(callDepthCounter) {
            return ko.computed({
                read: function () {
                    return (callDepthCounter() > 0);
                },
                write: function (value) {
                    var currentDepth = callDepthCounter();
                    currentDepth += (value ? 1 : (-1));
                    callDepthCounter(Math.max(currentDepth, 0));
                }
            });
        }

        result.isProcessing = isPropertySet(processingCallDepth);
        result.isSuspended = isPropertySet(suspendedCallDepth);

        result.isDirty = ko.computed(function () {
            return (initialValue() !== ko.mapping.toJSON(observable) && observable() !== undefined);
        });

        result.underlying = observable;
        result.tag = initialValue;
        result.tag(ko.utils.unwrapObservable(observable()));

        result.undo = function () {
            result(JSON.parse(initialValue()));
        };

        result.commit = function () {
            initialValue(ko.toJSON(result));
        };

        result.clear = function () {
            result(null);
        };

        result.copyFrom = function (anotherObservable) {
            result(anotherObservable());
        };

        result.applyFunction = function (fn) {
            result(fn());
        };

        result.reset = function () {
            result.undo();
        };

        return result;
    }
    ag.MetaObservable = MetaObservable;

    function disposeMetaObservable(observable) {
        observable.isAvailable.dispose();
    }
    ag.disposeMetaObservable = disposeMetaObservable;

    function traverseMappedObject(result, observableCallback, notObservableCallback) {
        $.each(result, function (index) {
            if (ko.isObservable(result[index])) {
                result[index] = observableCallback(index, result[index]);
            } else if (index !== '__ko_mapping__') {
                result[index] = notObservableCallback(index, result[index]);
            }
        });
    }

    function mapFromJStoMetaObservable(itemModel, readOnlyObservable, caller) {
        var result = ko.mapping.fromJS(itemModel);

        traverseMappedObject(result, function (index, property) {
            return ag.MetaObservable(property, index, result, caller, readOnlyObservable);
        }, function (index, property) {
            return ag.mapFromJStoMetaObservable(property, readOnlyObservable, index);
        });

        return result;
    }
    ag.mapFromJStoMetaObservable = mapFromJStoMetaObservable;
    ;

    function disposeMappedMetaObservable(mappedModel) {
        traverseMappedObject(mappedModel, function (index, property) {
            if (ag.utils.isMetaObservable(property))
                disposeMetaObservable(property);

            return property;
        }, function (index, property) {
            return disposeMappedMetaObservable(property);
        });

        return mappedModel;
    }
    ag.disposeMappedMetaObservable = disposeMappedMetaObservable;
    ;
})(ag || (ag = {}));
