/// <reference path="../utils/network.ts" />
/// <reference path="../../ts/global.d.ts" />

module ag
{
   export class LookupEditorViewModel 
   {
      private net = new utils.Network();
      showDialog = ko.observable(false);
      isReadOnly = ko.observable(false);
      dialogTitle: any;
      item: any;
      newItem: KoliteCommand;
      createGetActionName: string;
      createPostActionName: string;
      value: any;
      itemKey: string;

      constructor(private options)
      {
         var name = options.name,
            defaultCreateActionName = 'create' + name;

         this.value = options.value;
         this.itemKey = options.itemKey;
         this.createGetActionName = options.createGetActionName || defaultCreateActionName;
         this.createPostActionName = options.createPostActionName || defaultCreateActionName;
         this.net = new ag.utils.Network();
         this.dialogTitle = ko.observable(options.editTitle);
         this.item = ag.mapFromJStoMetaObservable(options.editItem, this.isReadOnly);

         this.newItem = ko.asyncCommand(
            {
               execute: (complete) =>
               {
                  this.showDialog(true);

                  this.net.getJson(this.createGetActionName, {})
                     .done((response) =>
                     {
                        var item = response.data;
                        ko.mapping.fromJS(item, this.item);
                     })
                     .always(complete);
               }
            });
      }

      cancel()
      {
         this.showDialog(false);
      }

      saveItem(): JQueryPromise<any>
      {
         var payload = ko.mapping.toJS(this.item),
            additionalPayload = {};

         if (this.options.additionalFields && this.options.additionalFields.length > 0)
         {
            var additionalFields = this.options.additionalFields.split(",");

            _.each(additionalFields, (field: string) =>
            {
               setProperty(
                  additionalPayload,
                  field,
                  getProperty(this.options.viewModel, field));
            });

            $.extend(payload, ko.mapping.toJS(additionalPayload));
         }

         return this.net.postJson(this.createPostActionName, payload)
            .done((response) =>
            {
               var item = response.data;

               this.value(item[this.itemKey]);
               this.showDialog(false);
            });
      }
   }
}