/// <reference path="../../ts/global.d.ts" />

// Parses the element validation attributes generate by MVC into knockout validation rules
module ag.validationAttributeParser
{
   "use strict";

   interface IValidationAttributeAdapter
   {
      (adapterName: string, paramAttributes: { [key: string]: string }, observable: KnockoutObservable<any>, viewModel: any): KnockoutValidationRule[];
   };

   var adapters: { [baseAttributeName: string]: IValidationAttributeAdapter } = {};

   // Add the corresponsing knockout validation rules to the observable.
   //
   // All rules are only evaluated if the field is visible and available.
   // This behavior is different from server-side validation where only
   // IEditableAwareValidation take visibilty and availabilty into account.
   export function attachAttributes(id: string, observable: KnockoutObservable<any>, viewModel: any): void
   {
      var config = (<any>ag).config.validation[id.toCamelCase()];
      if (config)
         addRulesToObservable(config, observable, viewModel);
   }

   function addRulesToObservable(config: any, observable: KnockoutObservable<any>, viewModel: any)
   {
      var editableCondition = utils.createEditableCondition(observable);

      _.each(adapters, (adapter: IValidationAttributeAdapter, adapterName: string) =>
      {
         var message = config[adapterName],
            rules: KnockoutValidationRule[];

         if (_.isUndefined(message))
            return;
         
         rules = adapter(adapterName, readParamAttributes(config, adapterName), observable, viewModel);
         _.each(rules, (rule) =>
         {
            if (message)
               rule.message = message;

            if (editableCondition)
               rule.condition = editableCondition;

            ko.validation.addRule(observable, rule);
         });
      });
   }

   function readParamAttributes(config: any, attributePrefix: string): { [key: string]: string }
   {
      var paramAttributePrefix = attributePrefix + "-",
         paramLength = paramAttributePrefix.length,
         paramAttributes = _.filter(_.keys(config), i => i.startsWith(paramAttributePrefix)),
         result: { [key: string]: string } = { };

      _.each(paramAttributes, i => result[i.substr(paramLength)] = config[i]);

      return result;
   }

   function addAdapter(adapterName: string, adapter: IValidationAttributeAdapter): void
   {
      adapters[adapterName] = adapter;
   }

   function createParamlessAdapter(ruleName?: string): IValidationAttributeAdapter
   {
      return (adapterName: string) => [{ rule: ruleName || adapterName, params: true }];
   }

   function createSimpleNumberAdapter(): IValidationAttributeAdapter
   {
      return (adapterName: string, paramAttributes: { [key: string]: string }) => [{ rule: adapterName, params: paramAttributes["acceptzero"] === "true" }];
   }

   function createMinMaxAdapter(ruleNamePostfix?: string): IValidationAttributeAdapter
   {
      return (adapterName: string, paramAttributes: { [key: string]: string }) =>
      {
         var rules = [];
         _.each(["min", "max"], (paramAttributeName) =>
         {
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
   
   addAdapter("mincount", (adapterName: string, paramAttributes: { [key: string]: string }) =>
   {
      return [{ rule: "minLength", params: Number(paramAttributes["count"]) }];
   });
}