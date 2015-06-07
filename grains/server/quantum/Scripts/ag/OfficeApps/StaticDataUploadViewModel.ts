/// <reference path="./office.ts" />

module ag 
{
   import Office = Microsoft.Office.WebExtension;
   import StaticDataType = staticDataUpload.StaticDataType;

   export class StaticDataUploadViewModel extends ExcelBaseViewModel
   {
      initializeOffice(): JQueryPromise<void>
      {
         return super.initializeOffice()
            .then(() =>
            {

            });
      }

      getTransferTypes()
      {
         return staticDataUpload.getStaticDataUploadTypes();
      }
   }
}