/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
var ag;
(function (ag) {
    (function (components) {
        var ExpressionBuilderViewModel = (function () {
            function ExpressionBuilderViewModel() {
                var _this = this;
                this.SEPARATOR = " ";
                this.toggle = function (options) {
                    if (!ko.isObservable(options.expression))
                        throw new Error("No expression observable specified");

                    _this.showDialog(!_this.showDialog());
                    if (_this.showDialog() === true) {
                        _this.options(options);

                        _this.expression(_this.options().expression() || "");
                        _this.validationMessage("");
                    }
                };
                this.saveExpression = function () {
                    if (_this.options().dataTypeAction) {
                        var dataTypeExtraRequestDataValue = _this.getFunctionOrUnwrapValue(_this.options().dataTypeExtraRequestData);
                        var dataTypeRequestData = _.extend(_this.getBaseRequestData(), dataTypeExtraRequestDataValue);

                        _this.net.postJson({ url: _this.options().dataTypeAction }, dataTypeRequestData).done(function (dataType) {
                            if (_this.showDialog() === true) {
                                _this.options().expression(_this.expression());
                                _this.options().dataType(dataType);
                                _this.showDialog(false);
                            }
                        });
                    } else {
                        _this.options().expression(_this.expression());
                        _this.showDialog(false);
                    }
                };
                this.getExpressionLookupRequestData = function () {
                    var lookupExtraRequestDataValue = _this.getFunctionOrUnwrapValue(_this.options().lookupExtraRequestData);
                    return _.extend(_this.getBaseRequestData(), { cursorPosition: _this.expressionCursorPosition() }, lookupExtraRequestDataValue);
                };
                this.net = new ag.utils.Network();
                this.expression = ko.observable("");
                this.validationMessage = ko.observable("");
                this.validExpression = ko.observable();
                this.expressionCursorPosition = ko.observable(0);
                this.expressionFocus = ko.observable(true);
                this.showDialog = ko.observable(false);
                this.options = ko.observable({});

                this.expression.subscribe(function () {
                    // Clear the validation message if the expression changes
                    _this.validationMessage("");
                });

                this.hasValidationExpression = ko.computed(function () {
                    return _this.options().validateAction;
                });

                this.lookupAction = ko.computed(function () {
                    return _this.options().lookupAction;
                });

                ko.computed(function () {
                    if (_this.showDialog() === false) {
                        _this.options({});
                    }
                });
            }
            ExpressionBuilderViewModel.prototype.validateExpression = function () {
                var _this = this;
                this.validationMessage("");

                var validateExtraRequestDataValue = this.getFunctionOrUnwrapValue(this.options().validateExtraRequestData);
                var validateRequestData = _.extend(this.getBaseRequestData(), validateExtraRequestDataValue);

                this.net.postJson({ url: this.options().validateAction }, validateRequestData).done(function (result) {
                    if (_this.showDialog() === true) {
                        _this.validExpression(result.data ? (result.data.valid || false) : true); // result is valid by default
                        _this.validationMessage(result.message || "");
                    }
                });
            };

            ExpressionBuilderViewModel.prototype.updateExpressionWithSelectedLookupItem = function (items) {
                var _this = this;
                if (!_.isArray(items) || items.length == 0)
                    return;

                var item = items[0];

                // Old lookup implementations don't provide an expression so fallback to key
                var itemExpression = !_.isUndefined(item.expression) ? item.expression : ag.utils.getItemKey(item);

                // Get expression string before cursor position
                var stringBeforeCursorPosition = this.expression().substring(0, this.expressionCursorPosition());
                var stringAfterCursorPosition = this.expression().substring(this.expressionCursorPosition());

                // Update the expression with the modified text and set the new cursor position
                var newExpression = stringBeforeCursorPosition + itemExpression + this.SEPARATOR + stringAfterCursorPosition;
                this.expression(newExpression);
                this.expressionCursorPosition(newExpression.length - stringAfterCursorPosition.length);

                // Focus
                _.delay(function () {
                    _this.expressionFocus(true);
                }, 0);
            };

            ExpressionBuilderViewModel.prototype.getBaseRequestData = function () {
                return _.extend(ag.utils.getAdditionalFields(this.options().target), {
                    expression: this.expression()
                });
            };

            ExpressionBuilderViewModel.prototype.getFunctionOrUnwrapValue = function (property) {
                return _.isFunction(property) ? property() : ko.unwrap(property);
            };
            return ExpressionBuilderViewModel;
        })();
        components.ExpressionBuilderViewModel = ExpressionBuilderViewModel;

        var ExpressionBuilder = (function () {
            function ExpressionBuilder() {
            }
            ExpressionBuilder.toggle = function (options) {
                if (this.expressionBuilderViewModel == null) {
                    this.expressionBuilderViewModel = new ExpressionBuilderViewModel();

                    var viewtemplate = $('script[id="expressionBuilderDialogTemplate"]');
                    if (viewtemplate.length === 0) {
                        throw new Error("expressionBuilderDialogTemplate must be included in the HTML");
                    }

                    var $view = $(viewtemplate.html());
                    $view.appendTo(document.body);

                    ko.applyBindings(this.expressionBuilderViewModel, $view[0]);
                }
                this.expressionBuilderViewModel.toggle(options);
            };
            return ExpressionBuilder;
        })();
        components.ExpressionBuilder = ExpressionBuilder;
    })(ag.components || (ag.components = {}));
    var components = ag.components;
})(ag || (ag = {}));
