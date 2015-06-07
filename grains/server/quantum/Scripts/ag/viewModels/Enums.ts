module ag
{
   export enum HTTPType 
   {
      POST,
      GET
   }

   export enum RuleType
   {
      UpdateCellDisplay,
      DisableTheDrillDownAfterSelection,
      UpdateStyle
   }

   export enum ViewType
   {
      DataView,
      Crystal,
      Pivot,
      Chart,
   }

   export enum HierarchicalCopyMode
   {
      Item,
      Group
   }

   export enum GroupTransactor
   {
      None,
      Group,
      Transaction,
   }

   export enum DealMapMode
   {
      Init = -1,
      None = 0,
      Profiler = 1,
      Customizer = 2,
      Scheduler = 3,
   }

   export enum ViewRequestType 
   {
      CreateTypeView,
      SaveTypeView,
      EditView
   }

   export enum GridStyleType
   {
      Default,
      NotAvailable,
      Important,
      Error,
      FolderIcon,
      //ItemIcon,
      Pending,
      Indent1,
      Indent2,
      Indent3,
      Indent4,
      Indent5,
      Indent6,
      Indent7,
      Indent8,
      Indent9,
      Indent10,
   }

   // Client-side equivalent of RoundTypeEnum
   export enum RoundType
   {
      notApplicable = 0,
      none = 10210001,
      fiveFour = 10210002,
      up = 10210003,
      down = 10210004
   }
}