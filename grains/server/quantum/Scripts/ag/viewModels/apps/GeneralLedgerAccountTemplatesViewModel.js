///// <reference path="../staticDataViewModel.ts" />
//module ag
//{
//   export class GeneralLedgerAccountTemplatesViewModel extends StaticDataViewModel
//   {
//      init(itemModel)
//      {
//         super.init(itemModel);
//         var canFn = () =>
//         {
//            return this.editingItem.parentType() != "Entity";
//         };
//         var editor = this.grids.accountTemplates.editor;
//         editor.canCreateFn = canFn;
//         editor.canDeleteFn = canFn;
//         editor.canCopyFn = canFn;
//         editor.canSaveFn = canFn;
//      }
//   }
//}
