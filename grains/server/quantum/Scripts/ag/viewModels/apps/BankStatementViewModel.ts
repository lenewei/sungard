/// <reference path="../appViewModel.ts" />

module ag 
{
   export class BankStatementViewModel extends AppViewModel
   {      
      init(itemModel: any)
      {
         super.init(itemModel);
         
         this.updatePageTitle(strings.bankStatement);        

         // Get the Account from the querystring, if it has been 
         // supplied show the browse
         var account = utils.getQueryStringParameterByName("account", window.location.search);         
         if (!isNullUndefinedOrEmpty(account))
         {
            this.grid.toggleList();
         }
      }

      private updatePageTitle(title?: string)
      {         
         this.pageTitle.removeAll();
         this.pageTitle.push({ keyProperty: title });
      }      
   }
}
