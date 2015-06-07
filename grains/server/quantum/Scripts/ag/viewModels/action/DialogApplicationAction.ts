module ag
{
   "use strict";

   export class DialogApplicationAction extends Action
   {
      modelValueUpdated = ko.observable(false);

      constructor(public options: IActionOptions, public isSubAction = false)
      {
         super(options, isSubAction);
         this.showDialog.subscribe(() => { return; });
      }

      invoke(parentViewModel, event: JQueryEventObject, complete)
      {
         return super.invoke(parentViewModel, event, complete).then((result) =>
         {
            this.actionInvoked = true;
            this.showDialog(false);

            var parentAction = this.options.parentAction;
            if (parentAction)
            {
               parentAction.actionInvoked = true;
               parentAction.showDialog(false);
            }

            return result;
         });
      }

      public updateActionItem(result): JQueryPromise<any>
      {
         return super.updateActionItem(result).done(() =>
         {
            this.modelValueUpdated.valueHasMutated();
         });
      }
   }

   export class BulkUpdateApplicationAction extends DialogApplicationAction
   {
      constructor(public options: IActionOptions, public isSubAction = false)
      {
         super(options, isSubAction);

         this.afterInvoke = (result, parentViewModel) =>
         {
            var insertAction = parentViewModel.actions["insertError" + parentViewModel.options.name],
               actionData = result.actionData;

            if (actionData && actionData.errorCount > 0)
            {
               insertAction.model.text(actionData.replaceContent);
               insertAction.show(parentViewModel);
            }

            if (parentViewModel.refresh)
            {
               parentViewModel.refresh();
            }

            return result;
         };
      }
   }
}