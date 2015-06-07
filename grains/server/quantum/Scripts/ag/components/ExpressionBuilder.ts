/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />

module ag.components
{
   export class ExpressionBuilderViewModel
   {
      SEPARATOR = " ";

      private net: ag.utils.Network;
      private options: KnockoutObservable<any>;

      expression: KnockoutObservable<string>;
      dataType: KnockoutObservable<string>;
      validationMessage: KnockoutObservable<string>;
      validExpression: KnockoutObservable<any>;
      hasValidationExpression: KnockoutComputed<boolean>;
      expressionCursorPosition: KnockoutObservable<number>;
      expressionFocus: KnockoutObservable<boolean>;
      showDialog: KnockoutObservable<boolean>;
      lookupAction: KnockoutComputed<string>;

      constructor()
      {
         this.net = new ag.utils.Network();
         this.expression = ko.observable("");
         this.validationMessage = ko.observable("");
         this.validExpression = ko.observable();
         this.expressionCursorPosition = ko.observable(0);
         this.expressionFocus = ko.observable(true);
         this.showDialog = ko.observable(false);
         this.options = ko.observable({});

         this.expression.subscribe(() =>
         {
            // Clear the validation message if the expression changes
            this.validationMessage("");
         });

         this.hasValidationExpression = ko.computed(() =>
         {
            return this.options().validateAction;
         });

         this.lookupAction = ko.computed(() =>
         {
            return this.options().lookupAction;
         });

         ko.computed(() =>
         {
      	    if(this.showDialog() === false) 
      	    {
               this.options({});
      	    }
         });
      }

      toggle = (options) =>
      {
         if (!ko.isObservable(options.expression))
            throw new Error("No expression observable specified");

         this.showDialog(!this.showDialog());
         if (this.showDialog() === true)
         {
            this.options(options);

            this.expression(this.options().expression() || "");
            this.validationMessage("");
         }
      }

      validateExpression()
      {
         this.validationMessage("");

         var validateExtraRequestDataValue = this.getFunctionOrUnwrapValue(this.options().validateExtraRequestData);
         var validateRequestData = _.extend(this.getBaseRequestData(), validateExtraRequestDataValue);

         this.net.postJson({ url: this.options().validateAction }, validateRequestData).done(result =>
         {
            if (this.showDialog() === true)
            {
               this.validExpression(result.data ? (result.data.valid || false) : true); // result is valid by default
               this.validationMessage(result.message || "");
            }
         });
      }

      saveExpression = () =>
      {
         if (this.options().dataTypeAction)
         {
            var dataTypeExtraRequestDataValue = this.getFunctionOrUnwrapValue(this.options().dataTypeExtraRequestData);
            var dataTypeRequestData = _.extend(this.getBaseRequestData(), dataTypeExtraRequestDataValue);

            this.net.postJson({ url: this.options().dataTypeAction }, dataTypeRequestData).done(dataType =>
            {
               if (this.showDialog() === true)
               {
                  this.options().expression(this.expression());
                  this.options().dataType(dataType);
                  this.showDialog(false);
               }
            });
         }
         else
         {
            this.options().expression(this.expression());
            this.showDialog(false);
         }
      }

      updateExpressionWithSelectedLookupItem(items)
      {
         if (!_.isArray(items) || items.length == 0) return;

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
         _.delay(() =>
         {
            this.expressionFocus(true);
         }, 0);
      }

      getExpressionLookupRequestData = () =>
      {
         var lookupExtraRequestDataValue = this.getFunctionOrUnwrapValue(this.options().lookupExtraRequestData);
         return _.extend(this.getBaseRequestData(), { cursorPosition: this.expressionCursorPosition() }, lookupExtraRequestDataValue);
      }

      private getBaseRequestData(): any
      {
         return _.extend((<any>ag.utils).getAdditionalFields(this.options().target), {
            expression: this.expression()
         });
      }

      private getFunctionOrUnwrapValue(property): any
      {
         return _.isFunction(property) ? property() : ko.unwrap(property);
      }
   }

   export class ExpressionBuilder
   {
      private static expressionBuilderViewModel: ExpressionBuilderViewModel;
      
      static toggle(options)
      {
         if (this.expressionBuilderViewModel == null)
         {
            this.expressionBuilderViewModel = new ExpressionBuilderViewModel();

            var viewtemplate = $('script[id="expressionBuilderDialogTemplate"]');
            if (viewtemplate.length === 0)
            {
               throw new Error("expressionBuilderDialogTemplate must be included in the HTML");
            }

            var $view = $(viewtemplate.html());
            $view.appendTo(document.body);

            ko.applyBindings(this.expressionBuilderViewModel, $view[0]);
         }
         this.expressionBuilderViewModel.toggle(options);
      }
   }
}