/// <reference path="../../ts/global.d.ts" />

module ag
{
   'use strict';   
   export class GroupEditorViewModel
   {
      init: any;
      current: any;
      net: ag.utils.Network;
      isReadOnly = ko.observable(false);

      // Constructor
      constructor(options: any)
      {
         this.net = options.net || new ag.utils.Network();
         this.init = (model) =>
         {
            if (this.current !== undefined)
            {
               ko.mapping.fromJS(model, this.current);
               ag.utils.resetValidation(this.current);
            }
            else
            {
               this.current = ag.mapFromJStoMetaObservable(model, this.isReadOnly);
            }
         };
      }

      create(parentId: string): JQueryPromise<any>
      {
         return this.net.getJson('createGroup', { parentId: parentId }).done(
            (result) => {
               ko.mapping.fromJS(result.data, this.current);
            } );
      }

      save(group: any, isNew: boolean): JQueryPromise<any>
      {
         return this.net.postJson(isNew ? 'createGroup' : 'editGroup', () => group).done((result) => 
         {
            this.displayMessage(result.message);
         });
      }

      remove(group): JQueryPromise<any>
      {
         return this.net.postJson('deleteGroup', () => group).done((result) => 
         {
            this.displayMessage(result.message);
         });
      }

      copy(group: any): JQueryPromise<any>
      {
         return null;
      }

      move(content: any): JQueryPromise<any>
      {
         return this.net.postJson('moveToGroup', content).done(
            (result) => {
               this.displayMessage(result.message);
            } );
      }

      addSelectedContentToGroup(content: any): JQueryPromise<any>
      {
         return this.net.postJson('addToGroup', content).done(
            (result) => 
            {
               this.displayMessage(result.message);
            });
      }

      displayMessage(message: string): void
      {
         if (!message) 
            return;

         messages.success(message);
      }
   }
}