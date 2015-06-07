/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
var ag;
(function (ag) {
    "use strict";

    var curlyBracketPairRegex = /[^{}]+/;
    var curlyBrackertContentRegex = /\{([^}]+)\}/g;

    ko.bindingHandlers["statuslabel"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var $element = $(element), expression = valueAccessor();

            registerEventListeners(expression, $element, bindingContext);
        }
    };

    function registerEventListeners(expression, $element, bindingContext) {
        _.each(expression.match(curlyBrackertContentRegex), function (matchString) {
            var stringSelector = matchString.match(curlyBracketPairRegex)[0];

            if (stringSelector.indexOf("#") == 0) {
                if ($(stringSelector).length == 0)
                    return;

                ko.utils.registerEventHandler($(stringSelector), "change", function () {
                    updateStatusLabel($element, expression, bindingContext);
                });
            } else {
                var prop = ag.utils.getObjectPropertyByString(bindingContext.$root, stringSelector);

                if (!prop)
                    return;

                prop.subscribe(function () {
                    updateStatusLabel($element, expression, bindingContext);
                });
            }
        });

        bindingContext.$root.updatingModel.subscribe(function (result) {
            if (!result)
                updateStatusLabel($element, expression, bindingContext);
        });
    }

    function updateStatusLabel($element, expression, bindingContext) {
        _.delay(function () {
            var s = expression.replace(curlyBrackertContentRegex, function (singleExpression) {
                var target = singleExpression.match(curlyBracketPairRegex)[0], stringResult;

                if (target.indexOf("#") == 0 && $(target).length > 0)
                    stringResult = $(target).val() || $(target).text();
                else
                    stringResult = ko.unwrap(ag.utils.getObjectPropertyByString(bindingContext.$root, target));

                if (stringResult)
                    return stringResult;
                else
                    return "";
            });

            $element.text(s);
        }, 100);
    }
})(ag || (ag = {}));
