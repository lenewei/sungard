module ag.components
{
   export interface IRuleValueFunc
   {
      column: string
      canApplyRule: string
      delegator: Function
   }

   export interface CellFormatter
   {
      type: RuleType
      value: boolean
   }

   export class ExplorerViewModelViewExtension
   {
      valueFuncCollection: Array<IRuleValueFunc>;

      buildDisplayDictionary(fields: Array<ViewFieldData>)
      {
         this.valueFuncCollection = new Array<IRuleValueFunc>();

         // initialise the value function collection keys
         _.each(fields, (value) =>
         {
            if (!value.isRule) return;

            var valueFun: IRuleValueFunc =
               {
                  canApplyRule: value.canApplyRule.toCamelCase(),
                  column: value.targetColumn,
                  secondaryColumn: undefined,
                  delegator: undefined,
               };

            // depends on the rule type we are looking for the updating method
            switch (value.ruleType)
            {
               case RuleType.UpdateCellDisplay:
                  valueFun.delegator = (viewModelName, rawRowItem) =>
                  {
                     if (!rawRowItem)
                        return undefined;

                     var target = value.targetColumn,
                        thenUse = value.replaceWithProperty,
                        rowItem = ko.mapping.toJS(rawRowItem);

                     if (target != viewModelName)
                        return undefined;

                     if (rowItem[valueFun.canApplyRule])
                        return rowItem[thenUse];
                  };
                  break;
               case RuleType.DisableTheDrillDownAfterSelection:
                  valueFun.delegator = (viewModelName, rawRowItem, $currentSelectedCell: JQuery) =>
                  {
                     var isSelected = ko.unwrap(rawRowItem.selected),
                        rowItem = ko.unwrap(rawRowItem),
                        rowKey = rowItem["__key__"];

                     // no children no further process
                     if (!rowItem.hasChildren)
                        return;

                     var explorerViewModel = <ExplorerViewModel>ko.contextFor($currentSelectedCell[0]).$root,
                        selectedItems = ko.unwrap(explorerViewModel.selectedItems);

                     var checkParents = (conditionCheckingFunction: Function) =>
                     {
                        return _.filter(selectedItems, (selectedItem: any) =>
                        {
                           if (!_.has(selectedItem, "parents"))
                              throw new Error("Parents is missing from selected items.");

                           var a = _.find(Array<string>(selectedItem.parents), (parent: string) =>
                           {
                              return parent == rowKey;
                           });

                           return conditionCheckingFunction(a);
                        });
                     };

                     if (isSelected)
                     {
                        $currentSelectedCell.data("disableFolderIcon", true);
                        explorerViewModel.selectedItems(checkParents((a: Array<any>) => { return !a || a.length == 0; }));
                        $currentSelectedCell.parent().css("background", "#FFF");
                     }
                     else
                     {
                        $currentSelectedCell.data("disableFolderIcon", false);
                        if (checkParents((a: Array<any>) => { return a && a.length > 0; }).length > 0)
                           $currentSelectedCell.parent().css("background", "#F0FAFC");
                     }
                  }
                  break;
               case RuleType.UpdateStyle:
                  throw new Error("Method not been implemented.");
               default:
                  throw new Error("Unknown rule type.");
            }

            this.valueFuncCollection.push(valueFun);
         });
      }

      public tryGetFunction(rowItem, targetColumn)
      {
         var result = _.findLast(this.valueFuncCollection, (valueFunc) =>
         {
            if (targetColumn == valueFunc.column)
               return true;
         });

         if (result)
            return result.delegator;

         return undefined;
      }
   }
}