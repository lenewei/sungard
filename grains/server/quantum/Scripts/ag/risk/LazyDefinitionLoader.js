var ag;
(function (ag) {
    var LazyDefinitionLoader = (function () {
        function LazyDefinitionLoader(options) {
            var _this = this;
            this.options = options;
            this.isLoading = ko.observable(false);
            this.gridsLoaded = false;
            // Is definition loaded evaluation
            this.isLoaded = ko.computed(function () {
                return options.headerKey() == options.definitionKey();
            });

            // Reset the gridsLoaded flag whenever isLoaded changes
            this.isLoaded.subscribe(function () {
                return _this.gridsLoaded = false;
            });

            // Subscribe to changes of the header key (new definition selected)
            options.headerKey.subscribe(function (newValue) {
                // This code caused the load
                if (_this.isLoading())
                    return;

                if (newValue > 0)
                    // User selected a different definition
                    // indicate loading and clear any grids
                    _this.isLoading(true);

                _this.clearGrids();
            });

            // Subscribe to changes in active status (tab selected)
            options.active.subscribe(function (newValue) {
                if (!newValue)
                    return;

                _this.load(options.headerKey.valueHasMutated, _this.isLoaded).then(function () {
                    _this.loadGrids();
                }).then(function () {
                    if (_this.options.afterLoadCallback)
                        _this.options.afterLoadCallback();
                });
            });
        }
        LazyDefinitionLoader.prototype.clearGrids = function () {
            if (!this.options.grids)
                return;

            $.each(this.options.grids, function (index, gridTrigger) {
                // gridTrigger is usually a property used to trigger
                // grid refreshes but could be a grid (cascading),
                // hence function checking object before invoking.
                if (gridTrigger)
                    if (gridTrigger.clear)
                        gridTrigger.clear();
                    else if (gridTrigger.clearData)
                        gridTrigger.clearData();
            });
        };

        LazyDefinitionLoader.prototype.loadGrids = function () {
            if (!this.options.grids || !ko.unwrap(this.options.active))
                return;

            this.refreshGrids();
        };

        LazyDefinitionLoader.prototype.refreshGrids = function () {
            $.each(this.options.grids, function (index, gridTrigger) {
                gridTrigger.refresh();
            });

            this.gridsLoaded = true;
        };

        LazyDefinitionLoader.prototype.load = function (loader, isLoaded) {
            var _this = this;
            var deferred = $.Deferred();

            // If we have already loaded and the grids have been loaded reject
            // the promise otherwise resolve it (and allow the grids to load)
            if (isLoaded()) {
                this.isLoading(false);
                return this.gridsLoaded ? deferred.reject() : deferred.resolve();
            }

            // Inidicate we are loading and call the load function
            if (!this.isLoading()) {
                this.isLoading(true);
                loader();
            }

            // Poll the isLoaded funcion and
            // when true resolve the promise
            var interval = window.setInterval(function () {
                if (isLoaded()) {
                    window.clearInterval(interval);

                    // Loading complete, resolve our promise
                    _this.isLoading(false);
                    deferred.resolve();
                }
            }, 100);

            // Return our promise
            return deferred.promise();
        };
        return LazyDefinitionLoader;
    })();
    ag.LazyDefinitionLoader = LazyDefinitionLoader;
})(ag || (ag = {}));
