/// <reference path="../../ts/global.d.ts" />

module ag.lookups
{
   // Add a global store for local lookups
   export var lookupData = ag.lookups.lookupData || {};

   export class LookupsViewModelMixin
   {
      lookups = {};

      constructor(options, existingLookups)
      {
         this.lookups = existingLookups;
      }

      // Add a lookup dataset to the cache
      cacheLookup(key, data)
      {
         this.lookups = this.lookups || {};
         this.lookups[key] = data;
      }

      // Get a cached lookup dataset
      getCachedLookup(key)
      {
         return this.lookups[key];
      }
   }

   export function createLookupsViewModel(options, existingLookups)
   {
      return new LookupsViewModelMixin($.extend({}, options), existingLookups);
   }
}
