interface IAction
{
   url?: string;
   action?: string;
   controller?: string;
   area?: string;
}

interface INetworkOptions
{
   area: string;
   controller: string;
   responseOnly: string;
   postOnly: string;
}

module ag.utils 
{
   export class Network 
   {
      private _headerFunctions: Function[];

      addHeaderCallBack(aFunction: Function)
      {
         this._headerFunctions.push(aFunction);
      }

      public static headerSetterCallbacks: Function[];

      private actionOptions = {};
      responseOnlyProperties: string[];
      postOnlyProperties: string[];

      constructor(public options: INetworkOptions = { area: ag.area, controller: ag.controller, responseOnly: "", postOnly: "" })
      {
         this._headerFunctions = new Array<Function>();

         this.actionOptions =
         {
            area: options.area,
            controller: options.controller
         };

         this.responseOnlyProperties = options.responseOnly && options.responseOnly.split ? options.responseOnly.split(",") : [];
         this.postOnlyProperties = options.postOnly && options.postOnly.split ? options.postOnly.split(",") : [];
      }

      private requestData(method: string, dataType: string, action: string,
         data: any, cache?: boolean, global?: boolean): JQueryPromise<any>
      {
         // Only clear post only properties for a GET request, AccessSettings etc.
         if (this.postOnlyProperties && method === "GET")
            clearProperties(this.postOnlyProperties, data);

         // Always clear response only properties (GET or POST), RepoSummary etc.
         clearProperties(this.responseOnlyProperties, data);

         var actionObject: any = typeof action === "string" ?
            $.extend({}, this.actionOptions, { action: action }) :
            $.extend({}, this.actionOptions, action);

         return requestData(method, dataType, actionObject, data, cache, global, this._headerFunctions).fail((jqxhr) =>
         {
            // This is to handle when a user decides to leave the page
            // while a request is still pending, won't catch all instances
            // but the majority.
            if (jqxhr.readyState == 0)
               return undefined;

            // Always show errors from the result
            utils.showErrorsFromResult(jqxhr);
         });
      }
      
      // Convenience/shortcut function that calls validateAndShowMessages, un-maps then post the data
      validateUnmapAndPostJson(action: any, data: any): JQueryPromise<any>
      {
         return ag.utils.validateAndShowMessages(data)
            .then(() =>
            {
               var unmapper = () => ko.mapping.toJS(data);
               return this.postJson(action, unmapper);
            });
      }
      
      postJson(action: string, data: any, existingDeferred?: any): JQueryPromise<any>;
      postJson(action: IAction, data: any, existingDeferred?: any): JQueryPromise<any>;
      postJson(action: any, data: any, existingDeferred?: any): JQueryPromise<any>
      {
         var deferred = existingDeferred ? existingDeferred : $.Deferred();

         this.requestData("POST", "json", action, data, true, true).then((result) =>
         {
            // Done
            if (result == null)
            {
               // Empty response returned from server - should not be happening
               deferred.reject({ hasErrors: true, errors: [strings.emptyResponse] });
               return;
            }

            if (result.isConfirmation)
            {
               // Promise succeeded and confirmation of action is required
               var options = $.extend(result, { net: this, deferred: deferred, data: data, action: action });
               confirmationViewModel.init(<IConfirmationInitOptions>options);
            }
            else
            {
               // Promise succeeded
               this.checkResponseForActivity(result);
               deferred.resolve(result);
            }
         },
            (...reasons: any[]) =>
            {
               // Failed
               this.checkResponseForActivity(reasons);
               deferred.reject(reasons);
            });

         return deferred.promise();
      }

      checkResponseForActivity(result: any): boolean
      {
         if (result && !isNullUndefinedOrEmpty(result.activityId))
         {
            // Publish an activity has completed and pass the activityId
            PubSub.publish(topics.ActivityCompleted, result.activityId);
            return true;
         }

         return false;
      }

      getJson(action: string, data: any, cache?: boolean, global?: boolean): JQueryPromise<any>;
      getJson(action: IAction, data: any, cache?: boolean, global?: boolean): JQueryPromise<any>;
      getJson(action: any, data: any, cache?: boolean, global?: boolean): JQueryPromise<any>
      {
         return this.requestData("GET", "json", action, data, cache, global);
      }

      getHtml(action: string, data: any, cache?: boolean, global?: boolean): JQueryPromise<any>;
      getHtml(action: IAction, data: any, cache?: boolean, global?: boolean): JQueryPromise<any>;
      getHtml(action: any, data: any, cache?: boolean, global?: boolean): JQueryPromise<any>
      {
         return this.requestData("GET", "html", action, data, cache, global);
      }
   }

   export function getErrorsFromResponse(response): string[]
   {
      var errorResponse = response,
         messages = [];

      // When we explicit reject the deferred object, there is no error
      // response we want to show here.
      if (!response)
         return;

      // response should be an XHR - parse responseText into error response
      if (response.responseText)
      {
         try
         {
            errorResponse = $.parseJSON(response.responseText);
         }
         catch (e)
         {
            if (response.status === 404 || response.status == 503)
            {
               errorResponse.hasErrors = true;
               errorResponse.errors = [response.status === 404 ? "Controller Action Not Found." : response.statusText];
            }
            else if (response.responseText.trim().startsWith("<"))
            {
               // If the responseText is HTML the application might not configured correctly
               // in the web.config httpErrors should be set to:
               // <configuration>
               //    <system.webServer>
               //       <httpErrors existingResponse="PassThrough" />
               errorResponse.hasErrors = true;
               errorResponse.errors = [strings.badResponse];
            }
         }
      }

      // error response
      if (errorResponse.hasErrors)
      {
         if (errorResponse.errors)
            $.each(errorResponse.errors, (i, item) => { messages.push(item); });

         if (errorResponse.modelErrors)
            $.each(errorResponse.modelErrors, (i, item) => { messages.push(item.error); });
      }
      else
      {
         messages.push(strings.unknownSvrErr);
      }

      return messages;
   }

   export function showErrorsFromResult(result): boolean
   {
      messages.error(getErrorsFromResponse(result).join("\r\n"));
      return false;
   }

   export function getJson(action: string, data: any, cache?: boolean, global?: boolean, headerFunctions?: Array<Function>);
   export function getJson(action: IAction, data: any, cache?: boolean, global?: boolean, headerFunctions?: Array<Function>);
   export function getJson(action: any, data: any, cache?: boolean, global?: boolean, headerFunctions?: Array<Function>)
   {
      return requestData("GET", "json", action, data, cache, global, headerFunctions);
   }

   export function postJson(action: IAction, data: any, cache?: boolean, global?: boolean, headerFunctions?: Array<Function>);
   export function postJson(action: string, data: any, cache?: boolean, global?: boolean, headerFunctions?: Array<Function>)
   export function postJson(action: any, data: any, cache?: boolean, global?: boolean, headerFunctions?: Array<Function>)
   {
      return requestData("POST", "json", action, data, cache, global, headerFunctions);
   }

   export function getHtml(action: string, data: any, cache?: boolean, global?: boolean, headerFunctions?: Array<Function>)
   {
      return requestData("GET", "html", action, data, cache, global, headerFunctions);
   }

   function generateUrlByOptions(applicationPath: string, area: string, controller: string, action: string): string
   {
      // If area is null or empty does not include area property
      if (area.isNullOrEmpty())
         return "{0}/{1}/{2}".format(applicationPath, controller, action);

      return "{0}/{1}/{2}/{3}".format(applicationPath, area, controller, action);
   }

   function requestData(method: string, dataType: string, action: any, data: any, cache = false, global = true,
      headerFunctionsPerRequest: Array<Function> = undefined)
   {
      var headers: { [key: string]: any } = {};
      formHeaders(headerFunctionsPerRequest, headers);
      $.extend(headers, getHeadersForRequest(method));

      var request = () => $.ajax(
         {
            cache: cache,
            global: global,
            dataType: dataType,
            type: method,
            headers: headers,
            data: getPayloadForRequest(method, data),
            contentType: method !== "POST" ? "application/x-www-form-urlencoded" : "application/json; charset=utf-8",
            url: createUrlForRequest(action),
            success: (data, textStatus, jqXHR) =>
            {
               // Check for redirection
               if (!isNullOrUndefined(data) && data.redirect)
                  navigate(data.redirect, false);

               // Get the current "today" value for the location the 
               // user is assigned to (if supplied)
               var today = jqXHR.getResponseHeader("User-Location-Today");
               if (today && today.length)
                  userLocationToday = moment.fromISO(today);
            }
         }).fail((jqxhr) =>
         {
            if (jqxhr.status == 401)
               $("#authenticationErrorDialog").modal({ backdrop: "static", keyboard: false, show: true });
         });

      // If a POST has data expressed as a function this indicates it should be deferred 
      // (and the data function invoked when the request is performed)
      if (method === "POST" && typeof data === "function")
         return deferRequest(request);

      // Invoke request immediately
      return request();
   }

   export function createUrlForRequest(action: any)
   {
      var defaultActionOptions =
         {
            area: ag.area,
            controller: ag.controller
         };

      var actionObject: any = typeof action === "string" ?
         $.extend({}, defaultActionOptions, { action: action }) :
         $.extend({}, defaultActionOptions, action);

      var applicationPath = ag.applicationPath;
      if (applicationPath === "/")
         applicationPath = "";

      return actionObject.url || generateUrlByOptions(applicationPath, actionObject.area, actionObject.controller, actionObject.action);
   }

   export function getPayloadForRequest(method: string, data: any, responseOnlyProperties?: string[], postOnlyProperties?: string[])
   {
      // For GET requests, transform any complex objects or arrays in the request data to 
      // key/value pairs that MVC will understand. For more details see:
      // http://erraticdev.blogspot.com.au/2010/12/sending-complex-json-objects-to-aspnet.html
      if (method === "GET")
      {
         // Clean all GET requests
         return $.toDictionary(utils.cleanJSForRequest(data, responseOnlyProperties, postOnlyProperties));
      }
      else
      {
         if (typeof data === "object")
         {
            // Stringify POST data
            return JSON.stringify(data, (key, value) =>
            {
               if (typeof value === "number")
                  return value.toString();

               return value;
            });
         }
         else if (typeof data === "function")
         {
            return getPayloadForRequest(method, data());
         }
      }

      return data;
   }

   function getHeadersForRequest(method: string): any
   {
      // Include Page Id Token
      var headers = {};

      // Always add the pageId
      headers["__PageIdToken"] = utils.getPageIdToken();

      if (method === "POST")
      {
         // Include Anti-Forgery Token
         headers["__RequestVerificationToken"] = utils.getRequestVerificationToken();
      }

      // Get any custom headers for the request
      getCustomHeadersForRequest(headers);

      return headers;
   }

   function getCustomHeadersForRequest(headers: any)
   {
      // If header setting callbacks have been registered call them
      // to allow them to add to the headers object
      formHeaders(Network.headerSetterCallbacks, headers);
   }

   function formHeaders(headerSetterCallbacks: any, headers: any)
   {
      if (!headerSetterCallbacks || headerSetterCallbacks.length <= 0)
         return;

      $.each(headerSetterCallbacks, (index, callback) =>
      {
         callback(headers);
      });
   }

   export function deferRequest(request: () => JQueryPromise<any>, timeoutMilliseconds = 5000): JQueryPromise<any>
   {
      // Defer the request to allow dependencies to complete before continuing.
      // Timeout available to ensure we don't hang around indefinitely.
      var deferred = $.Deferred(),
         intervalTimeout = 20,
         maxAttempts = Math.round(timeoutMilliseconds / intervalTimeout),
         interval = window.setInterval(() =>
         {
            // Check if there are any pending operations, 
            // if so return and wait another interval
            if ($.active && maxAttempts-- > 0)
               return;

            // Clear the timer
            window.clearInterval(interval);

            // Perform the request and resolve our promise
            request().done(deferred.resolve).fail(deferred.reject);
         },
            intervalTimeout);

      // Return our promise to be resolved when activity subsides
      return deferred.promise();
   }

   export function clearProperties(properties: Array<string>, data: any)
   {
      if (!properties || properties.length === 0)
         return;

      var isFunction = _.isFunction(data),
         dataPayload = data;

      // We need to unwrap the data payload first before
      // clear the properties
      if (isFunction)
         dataPayload = data();

      clearPropertiesInner(properties, dataPayload);

      if (isFunction)
         data = () => { return dataPayload; };
   }

   export function clearPropertiesInner(properties: Array<string>, data: any)
   {
      if (!data || !$.isPlainObject(data) || $.isEmptyObject(data))
         return;

      $.each(properties, (index, property) =>
      {
         // Only set property to null if found in data
         var propertyCamelCase = property.toCamelCase();
         if (!isNullOrUndefined(getProperty(data, propertyCamelCase)))
            setProperty(data, propertyCamelCase, null);
      });
   }

   export function registerHeaderSetter(callBack: Function)
   {
      if (!Network.headerSetterCallbacks)
         Network.headerSetterCallbacks = [];

      Network.headerSetterCallbacks.push(callBack);
   }
}
