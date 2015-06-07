module ag.risk
{
   var workbookUrl = "/analytics/explorer";

   // Mixin methods for navigating back to workbooks in Explorer
   export function setupNavigation(viewModel)
   {
      viewModel.navigateToWorkbook = item =>
      {
         ag.utils.navToEntity(workbookUrl, { id: ko.unwrap(item.id) });
      };
   };
}