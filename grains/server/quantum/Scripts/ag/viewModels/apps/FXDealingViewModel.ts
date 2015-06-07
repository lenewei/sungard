module ag
{
   export class FXDealingViewModel extends DealingViewModel
   {
      constructor(public options)
      {
         super(options);
      }

      afterApplyBindings()
      {
         var cmd = this.actions.newExtendPreDeliver;
         var grid = viewModel.actions.newExtendPreDeliver.grids.transactions;

         grid.editor.saveRequest = function ()
         {
            var editor = grid.editor;
            return this.postItem(editor.item(), editor.editPostActionName, editor.closeDialogAndUpdate).done(
               () => {
                  cmd.invokeCommand.execute();
               });
         };
      }
   }
}
 