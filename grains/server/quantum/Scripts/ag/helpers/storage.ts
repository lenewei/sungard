/// <reference path="../../ts/global.d.ts" />

interface IStorageOptions
{
   topics: Array<string>;
   itemChangedCallback(key: string, data: any, dataPrevious: any): void;
}

module ag
{   
   export class Storage
   {
      // The "topics parameter is an array of topics this instance is interested in.
      // The itemChangedCallback is called whenever a topic of interest has changed
      constructor(public options: IStorageOptions)
      {
         // Attach a listener to storage events
         $(window).bind("storage", (event) =>
         {
            // Get the storage event
            var storageEvent = <StorageEvent>event.originalEvent;

            // Check the even is one we are interested in
            if (options.topics.indexOf(storageEvent.key) === -1)
               return;

            // Deserialize the data
            var dataNew = JSON.parse(storageEvent.newValue),
               dataPrevious = JSON.parse(storageEvent.oldValue);

            //// IE recieves all storage events so we need to filter
            //// out those raised by the current page (to be like other browsers)
            //if (dataNew.pageId === utils.getPageIdToken())
            //   return;

            //// IE also raises a storage event when the value 
            //// hasn't actually changed (other browsers don't do this)
            //if (storageEvent.newValue === storageEvent.oldValue)
            //   return;

            // Raise the storage event of interest
            options.itemChangedCallback(storageEvent.key, dataNew, dataPrevious);
         });
      }

      static setItem(key: string, data: any, removeImmediately = false)
      {
         // Add or update a value in storage, note setting the same value 
         // to a key multiple times will not raise a storage event (only when value has changed)
         window.localStorage.setItem(key, JSON.stringify(data));

         // Cleaning up as we go
         if (removeImmediately)
            Storage.removeItem(key);
      }

      static getItem(key: string)
      {
         // Get an item from storage
         return JSON.parse(window.localStorage.getItem(key));
      }

      static removeItem(key: string)
      {
         // Remove a single item from storage
         window.localStorage.removeItem(key);
      }

      static clear()
      {
         // Clear all values in storage
         window.localStorage.clear();
      }
   }
}