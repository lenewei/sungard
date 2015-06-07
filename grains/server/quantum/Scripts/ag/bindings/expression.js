/// <reference path="../../ts/global.d.ts" />
// For binding an expression builder to a control
var ag;
(function (ag) {
    "use strict";

    ko.bindingHandlers["expression"] = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            var target = $(element), control = target.closest('.field'), opts = valueAccessor(), valueBindingAccessor = allBindingsAccessor().value || (allBindingsAccessor().placeholder && allBindingsAccessor().placeholder.value);

            if (!valueBindingAccessor)
                throw new Error("The expression binding requires a value or placeholder binding");

            if (control.length == 0)
                throw new Error("The expression binding must be used within an editor field container");

            ko.utils.registerEventHandler(target, "click", function (evt) {
                var expressionBuilderOpts = _.extend(opts, {
                    expression: valueBindingAccessor,
                    target: target
                });

                ag.components.ExpressionBuilder.toggle(expressionBuilderOpts);

                evt.stopImmediatePropagation();
                evt.preventDefault();
            });
        }
    };
})(ag || (ag = {}));
