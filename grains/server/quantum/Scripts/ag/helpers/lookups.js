/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    (function (lookups) {
        // Add a global store for local lookups
        lookups.lookupData = ag.lookups.lookupData || {};

        var LookupsViewModelMixin = (function () {
            function LookupsViewModelMixin(options, existingLookups) {
                this.lookups = {};
                this.lookups = existingLookups;
            }
            // Add a lookup dataset to the cache
            LookupsViewModelMixin.prototype.cacheLookup = function (key, data) {
                this.lookups = this.lookups || {};
                this.lookups[key] = data;
            };

            // Get a cached lookup dataset
            LookupsViewModelMixin.prototype.getCachedLookup = function (key) {
                return this.lookups[key];
            };
            return LookupsViewModelMixin;
        })();
        lookups.LookupsViewModelMixin = LookupsViewModelMixin;

        function createLookupsViewModel(options, existingLookups) {
            return new LookupsViewModelMixin($.extend({}, options), existingLookups);
        }
        lookups.createLookupsViewModel = createLookupsViewModel;
    })(ag.lookups || (ag.lookups = {}));
    var lookups = ag.lookups;
})(ag || (ag = {}));
