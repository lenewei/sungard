/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../ag.ts" />
/// <reference path="../../utils/network.ts" />
/// <reference path="../UpdatingModelHelper.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../baseViewModel.ts" />

module ag
{
   "use strict";

   export class UploadApplicationAction extends DialogApplicationAction
   {
      okButton: any;

      constructor(public options: IActionOptions, public isSubAction = false)
      {
         super(options, isSubAction);

         this.invokeCommand = ko.asyncCommand(
            {
               execute: (parentViewModel, event, complete) =>
               {
                  this.okButton = $(event.target);
                  this.invoke(parentViewModel, event, complete);
               }
            });
      }

      invoke(parentViewModel, event : JQueryEventObject, complete)
      {
         return super.invoke(parentViewModel, event, complete);
      }

      private rejectAndShowMessage(data: any, deferred: any)
      {
         this.getMessageFromResponse(data);
         deferred.reject(data);
      }

      public sendRequest(payload: any): JQueryPromise<any>
      {
         var form = this.okButton.closest('form'),
            deferred = $.Deferred();

         form.attr('method', 'post');  // IE9 work around
         form.attr('enctype', 'multipart/form=data');

         // Attach parameter information
         var extraData =
         {
            "__PageIdToken": $("input[name='__PageIdToken']").val(),
            "__RequestVerificationToken": $("input[name='__RequestVerificationToken']").val()
         };
         _.each($.toDictionary(payload), (nameValuePair: any) =>
         {
            extraData[nameValuePair.name] = nameValuePair.value;
         });

         // this can be replaced with HTML5 FormData
         form.ajaxForm({
            url: utils.createUrlForRequest(this.actionDetails),
            data: extraData,
            success: (data) =>
            {
               // check error message
               var result = ko.toJS(data);
               if (result.hasErrors)
               {
                  this.rejectAndShowMessage(data, deferred);
               }
               else
               {
                  form.find("input[type='file']").val("");
                  form.find("input[class*='fakeFileInput']").val("");
                  deferred.resolve(data);
               }

            },
            error: (jqXHR: JQueryXHR) =>
            {
               var s;
               try
               {
                  s = $.parseJSON(jqXHR.responseText);
               }
               catch (e)
               {
                  s = { errors: [strings.invalidFileType], hasErrors: true };
               }
               this.rejectAndShowMessage(s, deferred);
            }
         }).submit();

         return deferred.promise();
      }
   }
}