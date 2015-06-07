/// <reference path="../../ts/global.d.ts" />
/// <reference path="viewData.ts" />

// Definition of LookupData, LookupItem client-side objects 
// Strongly related to server-side versions but allows defaults to be set, and additional functionality added
module ag
{
   "use strict";

   export class LookupData
   {
      data: any;
      fields = [];
      parents: any[];

      constructor(options) 
      {                          
         this.data = options.data;

         if (options.fields && _.isArray(options.fields))
         {
            _.each(options.fields, (item) =>
            {
               this.fields.push(new ag.ViewFieldData(item));
            });
         }

         if (options.parents && _.isArray(options.parents))
         {          
            this.parents = [];  
            _.each(options.parents, (item) =>
            {
               this.parents.push(new LookupItem(item));
            });
         }

         return this;
      }   
   }

   export class LookupDataResponse
   {
      data: any;
      fields: {};
      parents: {};
      gridViewOptions: any;
      pageTargets: PageTarget[];

      constructor(options) 
      {
         this.parents = options.parents;
         this.fields = options.fields;
         this.data = options.data;
         this.gridViewOptions = options.gridViewOptions;
         this.pageTargets = options.pageTargets;

         return this;
      }
   }

   export class LookupItem
   {
      key: any;
      displayName: any;
      hasChildren: boolean;
      isSelectable: boolean;

      constructor(options)
      {
         this.key = options.key;
         this.displayName = options.displayName;
         this.hasChildren = !!options.hasChildren;
         this.isSelectable = _.isUndefined(options.isSelectable) ? true : options.isSelectable;

         return this;
      }
   }

   export class PageTarget
   {
      page: number;
      itemRange: string;
      firstItem: any;
   }

   // Moved this class to viewData.ts
   //export class ViewFieldData extends FieldData
   //{         
   //   format;   
   //   expression;
   //   endTotal: boolean;
   //   resetRunningTotal: boolean;

   //   constructor(options)
   //   {         
   //      super(options);

   //      this.sortStrategy = _.isUndefined(options.sortStrategy) ? ag.constants.SortStrategy.None : options.sortStrategy;
   //      this.sortOrder = _.isUndefined(options.sortOrder) ? 0 : options.sortOrder;
   //      this.hidden = !!options.hidden;
   //      this.format = options.format;
   //      this.groupByLevel = _.isUndefined(options.groupByLevel) ? 0 : options.groupByLevel;
   //      this.expression = options.expression;
   //      this.endTotal = !!options.endTotal;
   //      this.resetRunningTotal = !!options.resetRunningTotal;
   //   }
   //}

   
}