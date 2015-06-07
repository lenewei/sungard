/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../ag.ts" />
/// <reference path="../../utils/network.ts" />
/// <reference path="../UpdatingModelHelper.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../baseViewModel.ts" />

module ag
{
   "use strict";

   export class PerformActionBeforeNavigationAction extends Action
   {
      public performActionBeforeNavigation: boolean;

      constructor(public options: IActionOptions, public isSubAction = false)
      {
         super(options, isSubAction);
         this.performActionBeforeNavigation = !!options.performActionBeforeNavigation;
      }
   }
}