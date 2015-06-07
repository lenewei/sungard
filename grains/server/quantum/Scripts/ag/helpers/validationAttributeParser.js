/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    // Parses the element validation attributes generate by MVC into knockout validation rules
    (function (validationAttributeParser) {
        "use strict";

        ;

        var adapters = {};

        // Add the corresponsing knockout validation rules to the observable.
        //
        // All rules are only evaluated if the field is visible and available.
        // This behavior is different from server-side validation where only
        // IEditableAwareValidation take visibilty and availabilty into account.
        function attachAttributes(id, observable, viewModel) {
            var config = ag.config.validation[id.toCamelCase()];
            if (config)
                addRulesToObservable(config, observable, viewModel);
        }
        validationAttributeParser.attachAttributes = attachAttributes;

        function addRulesToObservable(config, observable, viewModel) {
            var editableCondition = ag.utils.createEditableCondition(observable);

            _.each(adapters, function (adapter, adapterName) {
                var message = config[adapterName], rules;

                if (_.isUndefined(message))
                    return;

                rules = adapter(adapterName, readParamAttributes(config, adapterName), observable, viewModel);
                _.each(rules, function (rule) {
                    if (message)
                        rule.message = message;

                    if (editableCondition)
                        rule.condition = editableCondition;

                    ko.validation.addRule(observable, rule);
                });
            });
        }

        function readParamAttributes(config, attributePrefix) {
            var paramAttributePrefix = attributePrefix + "-", paramLength = paramAttributePrefix.length, paramAttributes = _.filter(_.keys(config), function (i) {
                return i.startsWith(paramAttributePrefix);
            }), result = {};

            _.each(paramAttributes, function (i) {
                return result[i.substr(paramLength)] = config[i];
            });

            return result;
        }

        function addAdapter(adapterName, adapter) {
            adapters[adapterName] = adapter;
        }

        function createParamlessAdapter(ruleName) {
            return function (adapterName) {
                return [{ rule: ruleName || adapterName, params: true }];
            };
        }

        function createSimpleNumberAdapter() {
            return function (adapterName, paramAttributes) {
                return [{ rule: adapterName, params: paramAttributes["acceptzero"] === "true" }];
            };
        }

        function createMinMaxAdapter(ruleNamePostfix) {
            return function (adapterName, paramAttributes) {
                var rules = [];
                _.each(["min", "max"], function (paramAttributeName) {
                    if (paramAttributes.hasOwnProperty(paramAttributeName))
                        rules.push({ rule: paramAttributeName + (ruleNamePostfix || ''), params: Number(paramAttributes[paramAttributeName]) });
                });
                return rules;
            };
        }

        addAdapter("required", createParamlessAdapter());
        addAdapter("requiredwhendynamic", createParamlessAdapter("required"));
        addAdapter("email", createParamlessAdapter());
        addAdapter("positive", createSimpleNumberAdapter());
        addAdapter("negative", createSimpleNumberAdapter());
        addAdapter("length", createMinMaxAdapter("Length"));
        addAdapter("range", createMinMaxAdapter());

        addAdapter("mincount", function (adapterName, paramAttributes) {
            return [{ rule: "minLength", params: Number(paramAttributes["count"]) }];
        });
    })(ag.validationAttributeParser || (ag.validationAttributeParser = {}));
    var validationAttributeParser = ag.validationAttributeParser;
})(ag || (ag = {}));
