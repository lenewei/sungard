var ag;
(function (ag) {
    ko.bindingHandlers["dropdown"] = {
        init: function (element, valueAccessor, allBindings, viewModel) {
            var options = valueAccessor(), $element = $(element), $parent = $element.parent();

            $element.dropdown();

            if (ko.isObservable(options.show)) {
                ko.utils.registerEventHandler($parent, "shown.bs.dropdown", function () {
                    options.show(true);
                });

                ko.utils.registerEventHandler($parent, "hidden.bs.dropdown", function () {
                    options.show(false);
                });
            }

            if (_.isFunction(options.canHide)) {
                ko.utils.registerEventHandler($parent, "hide.bs.dropdown", function (e) {
                    if (!options.canHide.call(viewModel))
                        e.preventDefault();
                });
            }

            ko.computed(function () {
                var value = ko.unwrap(options.show);
                $element.dropdown("toggle", value);
            }, null, { disposeWhenNodeIsRemoved: element });

            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                $element.dropdown("destroy");
            });
        }
    };
})(ag || (ag = {}));
