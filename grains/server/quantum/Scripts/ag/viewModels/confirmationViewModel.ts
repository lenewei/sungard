/// <reference path="../../ts/global.d.ts" />
/// <reference path="../utils/network.ts" />

interface IConfirmationInitOptions
{
   deferred: JQueryDeferred<any>;
   net: ag.utils.Network;
   messages: Array<any>;
   confirmationId: string;
   action: any;
   data: any;
}

module ag
{
   export class BaseConfirmationViewModel
   {
      options: IConfirmationInitOptions;
      actions: any;

      constructor()
      {
         this.actions =
         {
            confirmation:
            {
               showDialog: ko.observable(false),
               model:
               {
                  messages: ko.observableArray([])
               },
               isLoaded: ko.observable(false)
            }
         };
      }

      reInitialiseOptions(): IConfirmationInitOptions
      {
         return { deferred: null, action: null, confirmationId: null, data: null, messages: null, net: null };
      }

      init(options: IConfirmationInitOptions)
      {
         this.reInitialiseOptions();

         // Update observable
         this.actions.confirmation.model.messages(options.messages);

         // Copy over options
         this.options = $.extend(this.options, options);

         // Display the dialog
         this.actions.confirmation.isLoaded(true);
         this.actions.confirmation.showDialog(true);
      }
   }

   export class ConfirmationViewModel extends BaseConfirmationViewModel
   {
      constructor()
      {
         super();

         this.actions.confirmation['invokeCommand'] = ko.command({
            execute: () =>
            {
               if (!this.options.deferred)
                  throw new Error("deferred not set on ConfirmationViewModel");

               var payload = this.options.data;
               if (_.isFunction(payload))
               {
                  // Invoke our function to get the data
                  payload = payload();
               }
               else if (_.isString(payload))
               {
                  // Convert a string into object
                  payload = $.parseJSON(payload);
               }

               // Add confirmationId to payload
               $.extend(payload, { __confirmationId: this.options.confirmationId });

               this.options.net.postJson(<any>this.options.action, <any>payload, <any>this.options.deferred).done(
                  (result) =>
                  {
                     this.options.deferred.resolve(result);
                  },
                  (...result: any[]) =>
                  {
                     this.options.deferred.fail(result);
                  })
                  .always(() =>
                  {
                     this.actions.confirmation.showDialog(false);
                  });
            }
         });

         this.actions.confirmation.showDialog.subscribe((newValue) =>
         {
            if (!newValue)
               this.options.deferred.reject();
         });
      }

      init(options: IConfirmationInitOptions)
      {
         super.init(options);

         if (!options.messages || !$.isArray(options.messages))
            throw new Error("confirmation messages missing");

         if (!options.confirmationId)
            throw new Error("confirmationId missing");

         if (!options.deferred)
            throw new Error("deferred missing");

         if (!options.data)
            throw new Error("data missing");

         if (!options.net)
            throw new Error("net missing");
      }
   }

   export class KeyChangeConfirmationViewModel extends BaseConfirmationViewModel
   {
      // Commands for KeyChangeConfirmationViewModel
      commands: string[] = ["doNew", "doCopy", "doCancel"]

      constructor()
      {
         super();

         _.each(this.commands, (value) =>
         {
            this.buildKoLiteCommands(value);
         });
      }

      private buildKoLiteCommands(type: string): void
      {
         var confirmationAction = this.actions.confirmation;
         if (confirmationAction)
         {
            var subActions = confirmationAction.subActions;
            if (_.isUndefined(subActions))
            {
               confirmationAction.subActions = {};
            }

            confirmationAction.subActions[type] = {
               invokeCommand: ko.command({
                  execute: (): JQueryPromise<any>=>
                  {
                     this.actions.confirmation.showDialog(false);
                     return this.options.deferred.resolve(type);
                  }
               })
            };
         }
      }
   }

   // apply the binding under the ag namespace
   ag.confirmationViewModel = new ConfirmationViewModel();
   ag.keyChangeConfirmationViewModel = new KeyChangeConfirmationViewModel();
}