/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />

module ag 
{
   "use strict";

   var curlyBracketPairRegex = /[^{}]+/;
   var curlyBrackertContentRegex = /\{([^}]+)\}/g;

   ko.bindingHandlers["statuslabel"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var $element = $(element),
            expression = <string>valueAccessor();

         registerEventListeners(expression, $element, bindingContext);
      }
   };

   function registerEventListeners(expression: string, $element: JQuery, bindingContext: any)
   {
      _.each(expression.match(curlyBrackertContentRegex), (matchString: string) =>
      {
         var stringSelector = matchString.match(curlyBracketPairRegex)[0];

         if (stringSelector.indexOf("#") == 0)
         {
            if ($(stringSelector).length == 0)
               return;

            ko.utils.registerEventHandler($(stringSelector), "change", () =>
            {
               updateStatusLabel($element, expression, bindingContext);
            });
         }
         else
         {
            var prop = ag.utils.getObjectPropertyByString(bindingContext.$root, stringSelector);

            if (!prop)
               return;

            prop.subscribe(() =>
            {
               updateStatusLabel($element, expression, bindingContext);
            });
         }
      });

      bindingContext.$root.updatingModel.subscribe((result) =>
      {
         if (!result)
            updateStatusLabel($element, expression, bindingContext);
      });
   }

   function updateStatusLabel($element: JQuery, expression: string, bindingContext: any)
   {
      _.delay(() =>
      {
         var s = expression.replace(curlyBrackertContentRegex, (singleExpression: string) =>
         {
            var target = singleExpression.match(curlyBracketPairRegex)[0],
               stringResult;

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
}