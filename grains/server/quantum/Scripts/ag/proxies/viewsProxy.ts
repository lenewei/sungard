module ag 
{  
   export class ViewsProxy extends ControllerProxy 
   {
      // typeName is provided when this is being 
      // used for type based views, otherwise null
      constructor(public typeName?: string)
      {
         super();
      }

      editView(key: string, params: any = {}, httpType: HTTPType = HTTPType.GET): JQueryPromise<any>
      {
         return this.sendRequest("editview", key, params, httpType);
      }

      createView(params: any = {}, viewTableKey: string = null, httpType: HTTPType = HTTPType.GET): JQueryPromise<any>
      {
         if (!isNullUndefinedOrEmpty(viewTableKey))
            params.viewTableKey = viewTableKey;

         return this.sendRequest("createview", null, params, httpType);
      }

      deleteView(key: string, params: any = {}): JQueryPromise<any>
      {
         return this.sendRequest("deleteview", key, params);
      }

      applyView(key: string, params: any = {}): JQueryPromise<any>
      {
         return this.sendRequest("applyview", key, params);
      }

      private sendRequest(action: string, key: string, params: any = {}, httpType: HTTPType = HTTPType.POST): JQueryPromise<any>
      {
         params.key = key;    
         if (!isNullUndefinedOrEmpty(this.typeName))
            params.typeName = this.typeName;

         var actionToPerform = this.createAction(action);

         if (httpType === HTTPType.GET)
            return this.net.getJson(actionToPerform, params);

         return this.net.postJson(actionToPerform, params);
      }

      private createAction(action: string): any
      {
         // Type based views
         if (!isNullUndefinedOrEmpty(this.typeName))          
            return { area: "", action: action, controller: "typedataview" };         

         // Controller based views (browse and reporting results)
         return action;
      }
   }
}
