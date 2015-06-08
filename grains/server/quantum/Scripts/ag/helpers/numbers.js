var ag;
(function (ag) {
    var NumberCalculator = (function () {
        function NumberCalculator() {
            // Those regular expressions need to be localised
            this.decimalSymbolRegExp = new RegExp("\\{0}".format(ag.decimalSymbol), "g");
            this.digitGroupingSymbolRegExp = new RegExp("\\{0}".format(ag.digitGroupingSymbol), "g");
            this.shortCutkeyRegExp = new RegExp("[\\d\\{0}]+([hHkKmMbB]{1})".format(ag.decimalSymbol), "g");
            this.valueOperatorSeperationRegExp = new RegExp("^(([\\-]{0,})(\\d*\\{0}*\\d*)?)|([\\+\\-\\*\\/]{1,})|((\\d*)+(\\{0}*\\d*)?)".format(ag.decimalSymbol), "g");
        }
        // Temp solution here - don't know why Eric want to have this
        NumberCalculator.prototype.isValidKeyCodeEvent = function (event) {
            var keyCode = event.which;

            if (event.ctrlKey && (keyCode == 88 || keyCode == 86 || keyCode == 67)) {
                return true;
            } else if (event.shiftKey && (keyCode == 48 || keyCode == 49 || keyCode == 50 || keyCode == 51 || keyCode == 51 || keyCode == 52 || keyCode == 53 || keyCode == 54 || keyCode == 55 || keyCode == 55 || keyCode == 57 || keyCode == 189 || keyCode == 192 || keyCode == 188 || keyCode == 190 || keyCode == 191)) {
                return false;
            } else if (keyCode >= 65 && keyCode <= 90) {
                if (keyCode != 66 && keyCode != 72 && keyCode != 75 && keyCode != 77) {
                    return false;
                }
            } else if (keyCode == 192 || keyCode == 219 || keyCode == 221 || keyCode == 220 || keyCode == 186 || keyCode == 32 || keyCode == 222) {
                return false;
            }

            return true;
        };

        NumberCalculator.prototype.registerEvents = function (target, pasteCallBackFunction) {
            var _this = this;
            this.pasteCallBack = pasteCallBackFunction;
            var $element = $(target);

            ko.utils.registerEventHandler(target, "keydown", function (event) {
                var keyCode = event.which, shiftKey = event.shiftKey, value = _this.removeDigitGroupingSymbols($element.val());

                if (!_this.isValidKeyCodeEvent(event))
                    return false;

                // Save a copy if current value is a valid string
                if (_this.isValidString(value))
                    _this.keydownValue = value;

                // COPY PASTE
                // ctrl + c
                if (event.ctrlKey && keyCode === 86) {
                    // ctrl + v
                    _this.isPasteKeystroke = true;
                } else if (keyCode === 72 || keyCode === 75 || keyCode === 77 || keyCode === 66) {
                    // H/K/M/B
                    _this.isShortcutKeystroke = true;
                } else if (keyCode === 109 || (keyCode === 189 && !shiftKey)) {
                    // -
                    _this.operatorKeystroke = "-";
                } else if (keyCode === 107 || (keyCode === 187 && shiftKey)) {
                    // +
                    _this.operatorKeystroke = "+";
                } else if (keyCode === 106 || (keyCode === 56 && shiftKey)) {
                    // *
                    _this.operatorKeystroke = "*";
                } else if (keyCode === 111 || (keyCode === 191 && !shiftKey)) {
                    // /
                    _this.operatorKeystroke = "/";
                } else if (keyCode === 13 || keyCode === 187 || keyCode === 9) {
                    // enter = tab
                    _this.operatorKeystroke = "=";
                }
            });

            ko.utils.registerEventHandler(target, "keyup", function () {
                var value = _this.removeDigitGroupingSymbols($element.val());

                if (!_this.isValidString(value))
                    $element.val(_this.keydownValue);

                // Paste => c v
                if (_this.isPasteKeystroke) {
                    $element.val(_this.pasteCallBack(value));
                    _this.isPasteKeystroke = false;
                } else if (_this.isShortcutKeystroke) {
                    _this.doShortCutCalculation($element, value);
                    _this.isShortcutKeystroke = false;
                } else if (_this.operatorKeystroke) {
                    _this.operationWrapper($element, value, false, _this.operatorKeystroke);
                    _this.operatorKeystroke = undefined;
                }

                return true;
            });

            ko.utils.registerEventHandler(target, "blur", function () {
                var value = _this.removeDigitGroupingSymbols($element.val());
                _this.operationWrapper($element, value);
            });
        };

        NumberCalculator.prototype.operationWrapper = function ($element, inputValue, notifyValueBinding, operatorKeystroke) {
            if (typeof notifyValueBinding === "undefined") { notifyValueBinding = true; }
            if (typeof operatorKeystroke === "undefined") { operatorKeystroke = ""; }
            this.doCalculation(inputValue).done(function (result) {
                $element.val(ag.format.formatNumber(result) + (operatorKeystroke != "=" ? operatorKeystroke : ""));
            }).always(function () {
                // Notify the value binding
                if (notifyValueBinding)
                    $element.trigger(NumberCalculator.CalculateFinish);
            });
        };

        NumberCalculator.prototype.doShortCutCalculation = function (elem, value) {
            var _this = this;
            var shortCutValues = value.match(this.shortCutkeyRegExp);

            if (shortCutValues && shortCutValues.length > 0) {
                _.forEach(shortCutValues, function (shotCutValue) {
                    var convertedValue = _this.convertValue(shotCutValue.substr(shotCutValue.length - 1, 1), _this.tryParseStringIntoFloat(shotCutValue.substr(0, shotCutValue.length - 1)));

                    elem.val(value.replace(shortCutValues, convertedValue));
                });
            }
        };

        NumberCalculator.prototype.convertValue = function (denominator, value) {
            return value * { h: 100, k: 1000, m: 1000000, b: 1000000000 }[denominator.toLowerCase()];
        };

        NumberCalculator.prototype.doCalculation = function (value) {
            // Seperate the value and operators
            var matches = value.match(this.valueOperatorSeperationRegExp), tempOperator = "", secondMatchSplit = matches[1] ? matches[1].split('') : "", operator = secondMatchSplit[0], operationStatus = $.Deferred();

            var firstValue = this.tryParseStringIntoFloat(matches[0]);

            if (secondMatchSplit.length > 1)
                tempOperator = secondMatchSplit[secondMatchSplit.length - 1] == "-" ? "-" : "";
            var secondValue = this.tryParseStringIntoFloat(tempOperator + matches[2]);

            if (isNaN(secondValue) || isNaN(firstValue))
                return operationStatus.reject();

            return operationStatus.resolve(this.calculate(firstValue, secondValue, operator));
        };

        NumberCalculator.prototype.tryParseStringIntoFloat = function (value) {
            if (value)
                return parseFloat(value.replace(this.decimalSymbolRegExp, "."));

            return NaN;
        };

        NumberCalculator.prototype.calculate = function (value1, value2, operator) {
            if (operator === null || operator === undefined)
                return "";

            switch (operator.toLowerCase()) {
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
        };

        NumberCalculator.prototype.isValidString = function (value) {
            var invalidChars = value.match(/[^\dkKmMhHbB\-+*/.,=]/g);
            if (invalidChars && invalidChars.length > 0)
                return false;

            invalidChars = value.match(/[\.,]{2,}/g);

            if (invalidChars && invalidChars.length > 0)
                return false;

            return true;
        };

        NumberCalculator.prototype.removeDigitGroupingSymbols = function (value) {
            return value.replace(this.digitGroupingSymbolRegExp, "");
        };
        NumberCalculator.CalculateFinish = "CALCULATE_FINISHED_EVENT";
        return NumberCalculator;
    })();
    ag.NumberCalculator = NumberCalculator;
})(ag || (ag = {}));
