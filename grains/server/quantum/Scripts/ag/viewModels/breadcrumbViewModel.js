var ag;
(function (ag) {
    var BreadcrumbViewModel = (function () {
        function BreadcrumbViewModel(breadcrumb, byId) {
            if (typeof byId === "undefined") { byId = false; }
            this.breadcrumb = breadcrumb;
            this.byId = byId;
            this.cachedParentLocation = ko.observable("");
            this.breadcrumbHasChanged = ko.observable(false);
        }
        BreadcrumbViewModel.prototype.reset = function (parentLocation) {
            this.breadcrumbHasChanged(false);
            this.cachedParentLocation(parentLocation);
        };

        BreadcrumbViewModel.prototype.getNewLocation = function (items, event, model) {
            if (!items || items.length == 0)
                return undefined;

            var targetLocation = ko.mapping.toJS(items[0]), targetLocationIsRoot = targetLocation.name.toLocaleLowerCase() === '-- move to top --', selectedItems = targetLocationIsRoot ? ko.mapping.toJS(model.parents()) : ko.mapping.toJS(model.parents()).concat(targetLocation), newBreadcrumbParents = this.convertDestinationToBreadcrumbParents(selectedItems);

            if (targetLocationIsRoot)
                targetLocation.name = 'ALL';
            targetLocation.isRoot = targetLocationIsRoot;

            // check has cyclic reference
            if (!this.isValidBreadcrumbMovement(newBreadcrumbParents))
                throw new Error(ag.strings.groupCannotMoveToSelectedLocation);

            // if move to the same parents, we stop
            if (this.areSameBreadcrumbParents(newBreadcrumbParents))
                return undefined;

            // update breadcrumb display
            this.breadcrumb.parents(newBreadcrumbParents);

            // update breadcrumbChanged observable
            this.breadcrumbHasChanged(targetLocation[this.byId ? 'id' : 'name'] != this.cachedParentLocation());

            return targetLocation;
        };

        BreadcrumbViewModel.prototype.convertDestinationToBreadcrumbParents = function (items) {
            var newParents = _.map(items, function (item) {
                return {
                    name: item.name || item.displayName,
                    path: null,
                    id: item.key || item.name || item.displayName
                };
            });

            return newParents;
        };

        BreadcrumbViewModel.prototype.areSameBreadcrumbParents = function (newParents) {
            var currentParents = ko.mapping.toJS(this.breadcrumb.parents), currentLength = currentParents.length;

            if (currentLength != newParents.length)
                return false;

            for (var i = 0; i < currentLength; i++) {
                if (currentParents[i].name.toLowerCase() != newParents[i].name.toLowerCase())
                    return false;
            }

            return true;
        };

        BreadcrumbViewModel.prototype.isValidBreadcrumbMovement = function (newBreadcrumbParents) {
            var _this = this;
            var result = true;
            _.each(newBreadcrumbParents, function (parent) {
                if (parent.id == _this.breadcrumb.currentItem.id())
                    result = false;
            });

            return result;
        };
        return BreadcrumbViewModel;
    })();
    ag.BreadcrumbViewModel = BreadcrumbViewModel;
})(ag || (ag = {}));
