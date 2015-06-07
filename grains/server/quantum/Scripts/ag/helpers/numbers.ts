/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="format.ts" />

module ag
{
   export class NumberCalculator
   {
      static CalculateFinish: string = "CALCULATE_FINISHED_EVENT";

      public pasteCallBack: Function;

      private isPasteKeystroke: boolean;
      private isShortcutKeystroke: boolean;
      private keydownValue: string;
      private operatorKeystroke: string;
      private digitGroupingSymbolRegExp: RegExp;
      private decimalSymbolRegExp: RegExp;
      private shortCutkeyRegExp: RegExp;
      private valueOperatorSeperationRegExp: RegExp;

      constructor()
      {
         // Those regular expressions need to be localised
         this.decimalSymbolRegExp = new RegExp("\\{0}".format(decimalSymbol), "g");
         this.digitGroupingSymbolRegExp = new RegExp("\\{0}".format(digitGroupingSymbol), "g");
         this.shortCutkeyRegExp = new RegExp("[\\d\\{0}]+([hHkKmMbB]{1})".format(decimalSymbol), "g");
         this.valueOperatorSeperationRegExp = new RegExp("^(([\\-]{0,})(\\d*\\{0}*\\d*)?)|([\\+\\-\\*\\/]{1,})|((\\d*)+(\\{0}*\\d*)?)".format(decimalSymbol), "g");
      }

      public registerEvents(target: HTMLElement, pasteCallBackFunction: Function)
      {
         this.pasteCallBack = pasteCallBackFunction;
         var $element = $(target);

         ko.utils.registerEventHandler(target, "keydown", (event: JQueryEventObject) =>
         {
            var keyCode = event.keyCode,
               shiftKey = event.shiftKey,
               value = this.removeDigitGroupingSymbols($element.val());

            // Save a copy if current value is a valid string
            if (this.isValidString(value))
               this.keydownValue = value;

            // COPY PASTE
            // ctrl + c
            if (event.ctrlKey && keyCode === 86)
            {
               // ctrl + v
               this.isPasteKeystroke = true;
            }
            // SHORTCUT KEY 
            else if (keyCode === 72 || keyCode === 75 || keyCode === 77 || keyCode === 66)
            {
               // H/K/M/B
               this.isShortcutKeystroke = true;
            }
            // OPERATORS
            else if (keyCode === 109 || (keyCode === 189 && !shiftKey))
            {
               // -
               this.operatorKeystroke = "-";
            }
            else if (keyCode === 107 || (keyCode === 187 && shiftKey))
            {
               // +
               this.operatorKeystroke = "+";
            }
            else if (keyCode === 106 || (keyCode === 56 && shiftKey))
            {
               // *
               this.operatorKeystroke = "*";
            }
            else if (keyCode === 111 || (keyCode === 191 && !shiftKey))
            {
               // /
               this.operatorKeystroke = "/";
            }
            else if (keyCode === 13 || keyCode === 187 || keyCode === 9)
            {
               // enter = tab
               this.operatorKeystroke = "=";
            }
         });

         ko.utils.registerEventHandler(target, "keyup", () =>
         {
            var value = this.removeDigitGroupingSymbols($element.val());

            if (!this.isValidString(value))
               $element.val(this.keydownValue);

            // Paste => c v
            if (this.isPasteKeystroke)
            {
               $element.val(this.pasteCallBack(value));
               this.isPasteKeystroke = false;
            }
            // Shortcut => h k m b
            else if (this.isShortcutKeystroke)
            {
               this.doShortCutCalculation($element, value);
               this.isShortcutKeystroke = false;
            }
            // Operator => + - * / = enter
            else if (this.operatorKeystroke)
            {
               this.operationWrapper($element, value, false, this.operatorKeystroke);
               this.operatorKeystroke = undefined;
            }

            return true;
         });

         ko.utils.registerEventHandler(target, "blur", () =>
         {
            var value = this.removeDigitGroupingSymbols($element.val());
            this.operationWrapper($element, value);
         });
      }

      private operationWrapper($element: JQuery, inputValue: string, notifyValueBinding: boolean = true, operatorKeystroke: string = ""): void
      {
         this.doCalculation(inputValue)
            .done((result) =>
            {
               $element.val(format.formatNumber(result) + (operatorKeystroke != "=" ? operatorKeystroke : ""));
            })
            .always(() =>
            {
               // Notify the value binding
               if (notifyValueBinding)
                  $element.trigger(NumberCalculator.CalculateFinish);
            });
      }

      private doShortCutCalculation(elem, value): void
      {
         var shortCutValues = value.match(this.shortCutkeyRegExp);

         if (shortCutValues && shortCutValues.length > 0)
         {
            _.forEach(shortCutValues, (shotCutValue: string) =>
            {
               var convertedValue = this.convertValue(shotCutValue.substr(shotCutValue.length - 1, 1),
                  parseFloat(shotCutValue.substr(0, shotCutValue.length - 1)));

               elem.val(value.replace(shortCutValues, convertedValue));
            });
         }
      }

      public convertValue(denominator, value)
      {
         return value * { h: 100, k: 1000, m: 1000000, b: 1000000000 }[denominator.toLowerCase()];
      }

      public doCalculation(value): JQueryDeferred<any>
      {
         // Seperate the value and operators
         var matches = value.match(this.valueOperatorSeperationRegExp),
            tempOperator = "",
            secondMatchSplit = matches[1] ? matches[1].split('') : "",
            operator = secondMatchSplit[0],
            operationStatus = $.Deferred();

         var firstValue = this.tryParseStringIntoFloat(matches[0]);

         if (secondMatchSplit.length > 1)
            tempOperator = secondMatchSplit[secondMatchSplit.length - 1] == "-" ? "-" : "";
         var secondValue = this.tryParseStringIntoFloat(tempOperator + matches[2]);

         if (isNaN(secondValue) || isNaN(firstValue))
            return operationStatus.reject();

         return operationStatus.resolve(this.calculate(firstValue, secondValue, operator));
      }

      private tryParseStringIntoFloat(value): number
      {
         if (value)
            return parseFloat(value.replace(this.decimalSymbolRegExp, "."));

         return NaN;
      }

      private calculate(value1, value2, operator: string)
      {
         if (operator === null || operator === undefined)
            return "";

         switch (operator.toLowerCase())
         {
            case "+":
               return value1 + value2;
            case "-":
               return value1 - value2;
            case "*":
               return value1 * value2;
            case "/":
               return value1 / value2;
            default:
               return "";
         }
      }

      private isValidString(value: string): boolean
      {
         var invalidChars = value.match(/[^\dkKmMhHbB\-+*/.,=]/g);
         if (invalidChars && invalidChars.length > 0)
            return false;

         invalidChars = value.match(/[\.,]{2,}/g);

         if (invalidChars && invalidChars.length > 0)
            return false;

         return true;
      }

      private removeDigitGroupingSymbols(value: string): string
      {
         return value.replace(this.digitGroupingSymbolRegExp, "");
      }
   }
}