/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />

module ag
{
   "use strict";

   //#region Private variables

   // A simple in-memory cache for now
   var cache = {
      store: {},
      get: function (key)
      {
         return this.store[key];
      },
      set: function (key, data)
      {
         if (!key) return;
         this.store[key] = data;
      }
   }

   var net = new ag.utils.Network();

   // Page, filter and sort data
   // [AG 14/1/2013] Just doing paging for now.
   // This presupposes input data is a LookupDataResponse:
   // 
   // - data
   // - fields
   // - parents
   // - gridViewOptions
   // - pageTargets
   //
   // TODO: this processing should really be done somewhere else to keep ag.data generic 
   var process = (lookupDataResponse, options) =>
   {
      if (!lookupDataResponse) return null;
      var dataRows = lookupDataResponse.data;

      var totalItems = ko.unwrap(dataRows).length,
         start = 0,
         end = totalItems;

      // Paging
      if (totalItems > 0 && options.pageSize && options.page)
      {
         start = options.pageSize * (options.page - 1);
         end = start + options.pageSize;
         if (start > totalItems - 1)
         {
            start = -1;
            end = -1;
         }
         else if (end > totalItems)
         {
            end = totalItems;
         }
      }

      var outputData = start >= 0 && end > start ? ko.unwrap(dataRows).slice(start, end) : [];

      // Merge the data and options to make sure we're returning a LookupDataResponse
      return new ag.LookupDataResponse($.extend({}, lookupDataResponse, {
         data: outputData,
         gridViewOptions: lookupDataResponse.gridViewOptions || $.extend({ totalItems: totalItems }, options)
      }));
   }

   // Retrieve data
   var getData = function (source, options, success, error)
   {
      // The datasource can either be remote or local.
      var unwrappedSource = ko.unwrap(source);
      if (typeof unwrappedSource == "string")
      {
         var requestData = $.extend({}, options);

         // If we're using caching and have a cached version of this lookup data, treat it as a local datasource
         var cacheKey, cachedData;
         if (options.useCache)
         {
            cacheKey = unwrappedSource + "?" + $.param(ag.utils.cleanJSForRequest(requestData));
            cachedData = options.useCache && cache.get(cacheKey);
         }

         if (cachedData)
         {
            // [AG 29/11/2012] We need to return a deep copy of the cached data otherwise any changes to the object
            // will overwrite the cached version.
            success($.extend(true, {}, cachedData));
         }
         else
         {
            net.postJson({ url: unwrappedSource }, requestData).then(response =>
            {
               // [AG 13/7/2012] If the returned data is a string, try to parse it as JSON
               if (typeof response === "string")
               {
                  response = $.parseJSON(response);
               }

               // Cache a copy of the remote dataset locally if required
               if (options.useCache) cache.set(cacheKey, response);

               // TODO: If we're not filtering on the server do any paging, sorting, searching, etc., here.
               if (options.cacheOnClient) response = process(response, response.gridViewOptions);

               // Call the lookupControl callback with the results
               var ret = $.extend(true, {}, response);
               success(ret);
            }, error);
         }
      }
      else
      {
         // Process the data source with the provided options and return to the callback
         if (!unwrappedSource) return null;
         var result = process(unwrappedSource, options);
         success(result);
      }
   }

   //#endregion

   // Create the "data" namespace
   export module data
   {
      //#region Static members
    
      export var get = (source, options, cb) =>
      {
         var error: any;
         getData(source, options, cb, error);
      }

      //#endregion
   }

}