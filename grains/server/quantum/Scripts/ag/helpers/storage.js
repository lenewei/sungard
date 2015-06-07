/// <reference path="../../ts/global.d.ts" />

var ag;
(function (ag) {
    var Storage = (function () {
        // The "topics parameter is an array of topics this instance is interested in.
        // The itemChangedCallback is called whenever a topic of interest has changed
        function Storage(options) {
            this.options = options;
            // Attach a listener to storage events
            $(window).bind("storage", function (event) {
                // Get the storage event
                var storageEvent = event.originalEvent;

                // Check the even is one we are interested in
                if (options.topics.indexOf(storageEvent.key) === -1)
                    return;

                // Deserialize the data
                var dataNew = JSON.parse(storageEvent.newValue), dataPrevious = JSON.parse(storageEvent.oldValue);

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
        Storage.setItem = function (key, data, removeImmediately) {
            if (typeof removeImmediately === "undefined") { removeImmediately = false; }
            // Add or update a value in storage, note setting the same value
            // to a key multiple times will not raise a storage event (only when value has changed)
            window.localStorage.setItem(key, JSON.stringify(data));

            // Cleaning up as we go
            if (removeImmediately)
                Storage.removeItem(key);
        };

        Storage.getItem = function (key) {
            // Get an item from storage
            return JSON.parse(window.localStorage.getItem(key));
        };

        Storage.removeItem = function (key) {
            // Remove a single item from storage
            window.localStorage.removeItem(key);
        };

        Storage.clear = function () {
            // Clear all values in storage
            window.localStorage.clear();
        };
        return Storage;
    })();
    ag.Storage = Storage;
})(ag || (ag = {}));
