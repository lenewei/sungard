module ag
{
   export interface IBreadcrumb
   {
      parents: any;
      currentItem: any;
      currentItemIsGroup: any;
   }

   export interface IBreadcrumbItem
   {
      id: any;
      name: string;
      isRoot: boolean;
   }

   export class BreadcrumbViewModel
   {
      breadcrumbHasChanged: KnockoutObservable<boolean>;
      cachedParentLocation = ko.observable("");
      
      constructor(public breadcrumb: any, public byId:boolean = false)
      {
         this.breadcrumbHasChanged = ko.observable(false);
      }

      public reset(parentLocation:string)
      {
         this.breadcrumbHasChanged(false);
         this.cachedParentLocation(parentLocation);
      }

      public getNewLocation(items: ISelectedItem[], event, model: ag.components.ExplorerViewModel): IBreadcrumbItem
      {
         if (!items || items.length == 0)
            return undefined;

         var targetLocation: IBreadcrumbItem = ko.mapping.toJS(items[0]),
            targetLocationIsRoot = targetLocation.name.toLocaleLowerCase() === '-- move to top --',
            selectedItems = targetLocationIsRoot ? ko.mapping.toJS(model.parents()) : ko.mapping.toJS(model.parents()).concat(targetLocation),
            newBreadcrumbParents = this.convertDestinationToBreadcrumbParents(selectedItems);

         if (targetLocationIsRoot)
            targetLocation.name = 'ALL';
         targetLocation.isRoot = targetLocationIsRoot;

         // check has cyclic reference
         if (!this.isValidBreadcrumbMovement(newBreadcrumbParents))
            throw new Error(strings.groupCannotMoveToSelectedLocation);

         // if move to the same parents, we stop
         if (this.areSameBreadcrumbParents(newBreadcrumbParents))
            return undefined;
         
         // update breadcrumb display
         this.breadcrumb.parents(newBreadcrumbParents);

         // update breadcrumbChanged observable
         this.breadcrumbHasChanged(targetLocation[this.byId ? 'id' : 'name'] != this.cachedParentLocation());

         return targetLocation;
      }

      private convertDestinationToBreadcrumbParents(items: ISelectedItem[])
      {
         var newParents = _.map(items,(item) =>
         {
            return {
               name: item.name || item.displayName,
               path: null,
               id: item.key || item.name || item.displayName
            };
         });

         return newParents;
      }

      private areSameBreadcrumbParents(newParents: Array<any>): boolean
      {
         var currentParents = ko.mapping.toJS(this.breadcrumb.parents),
            currentLength = currentParents.length;

         if (currentLength != newParents.length)
            return false;

         for (var i = 0; i < currentLength; i++)
         {
            if (currentParents[i].name.toLowerCase() != newParents[i].name.toLowerCase())
               return false;
         }

         return true;
      }

      private isValidBreadcrumbMovement(newBreadcrumbParents): boolean
      {
         var result = true;
         _.each(newBreadcrumbParents,(parent: any) =>
         {
            if (parent.id == this.breadcrumb.currentItem.id())
               result = false;
         });

         return result;
      }
   }
}
