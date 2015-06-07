module ag
{  
   export interface INavigationGroup
   {
      key: string;
      params: Array<any>;
   }

   export interface IDataTranslationModel
   {
      parentName: string;
      displayName: string;
      currency: string;
      account: string;
      approvalStatus: string;
   }

   export class ModelNavigationKeyValuePair
   {
      parentType = "parentName";
      name = "displayName";
      currency = "currency";
      account = "account";
      approvalStatus = "approvalStatus";
   }

   export class DataTranslationViewModel extends StaticDataViewModel
   {
      navigationGroups: Array<INavigationGroup>;
      modelNavigationKeyValuePair = new ModelNavigationKeyValuePair();

      constructor(options)
      {
         super(options);

         this.navigationGroups =
         [
            {
               key: "Bank Account",
               params: ["parentType", "name", "approvalStatus"]
            },
            {
               key: "Counterparty",
               params: ["parentType", "name", "approvalStatus"]
            },
            {
               key: "Counterparty Delivery Instruction",
               params: ["parentType", "name", "currency", "account", "approvalStatus"]
            },
            {
               key: "Country",
               params: ["parentType", "name"]
            },
            {
               key: "Entity",
               params: ["parentType", "name"]
            },
            {
               key: "Instrument",
               params: ["parentType", "name"]
            },
            {
               key: "Location",
               params: ["parentType", "name"]
            }
         ];
      }

      getEditingItemNavKey(model:IDataTranslationModel, keyFields?, key?, translateFn?)
      {
         var value = _.find(this.navigationGroups, (navigationGroup: INavigationGroup) =>
         {
            return navigationGroup.key == model.parentName;
         });

         var params = this.navigateGetParams();

         $.each(value.params, (propertyValue, propertyName) =>
         {
            params[propertyName] = model[this.modelNavigationKeyValuePair[propertyName]];
         });

         params.edit = true;
         return params;
      }

   }
}