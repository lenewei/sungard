/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";
   
   export interface IPagerOptions
   {
      updating: KnockoutObservable<boolean>;
      activeSortColumns: KnockoutObservable<any[]>;
      pageSize: number;
      noItemsMessage?: string;
   }

   export class Pager
   {
      private keepPageTargetsShownFlag = false;

      page = ko.observable(0);
      totalPages = ko.observable(0);
      totalItems = ko.observable(0);
      pageSize: KnockoutObservable<number>;
      itemsShowing: KnockoutComputed<string>;
      hasPages: KnockoutComputed<boolean>;
      loadPreviousPageCommand: KoliteCommand;
      loadNextPageCommand: KoliteCommand;

      pageTargets = ko.observableArray<PageTarget>();
      pageTargetsCenter = ko.observable(0);
      showPageTargets = ko.observable(false);
      hasPageTargets: KnockoutComputed<boolean>;
      pageTargetColumns: KnockoutComputed<any>;
      pageTargetsInnerSize: KnockoutObservable<number>;
      pageTargetsEdgeSize: KnockoutObservable<number>;

      constructor(public options: IPagerOptions)
      {
         this.pageSize = ko.observable(options.pageSize || 20);
         this.pageTargetsInnerSize = ko.observable(2);
         this.pageTargetsEdgeSize = ko.observable(3);

         this.navigateToPage(1);

         this.itemsShowing = ko.computed(() =>
         {
            var total = this.totalItems(),
               pageSize = this.pageSize(),
               page = this.page(),
               to = this.page() * this.pageSize();

            if (total === 0)
               return this.options.noItemsMessage || strings.noItems;

            if (to > total)
               to = total;

            var from = (to > pageSize) ? ((page - 1) * pageSize) + 1 : 1;

            return this.itemsMessage(from, to, total);
         });

         this.hasPages = ko.computed(() =>
         {
            return this.totalPages() > 0;
         });

         this.loadPreviousPageCommand = ko.command({
            execute: () =>
            {
               if (this.showPageTargets())
                  this.snapPageTargetsCenter(this.pageTargetsCenter() - this.getPageTargetsStepSize());
               else
                  this.navigateToPage(this.page() - 1);
            },
            canExecute: () =>
            {
               if (this.options.updating())
                  return false;

               if (this.showPageTargets())
                  return this.pageTargetsCenter() > this.getMinPageTargetsCenter();
               else
                  return this.page() > 1;
            }
         });

         this.loadNextPageCommand = ko.command({
            execute: () =>
            {
               if (this.showPageTargets())
                  this.snapPageTargetsCenter(this.pageTargetsCenter() + this.getPageTargetsStepSize());
               else
                  this.navigateToPage(this.page() + 1);
            },
            canExecute: () =>
            {
               if (this.options.updating())
                  return false;

               if (this.showPageTargets())
                  return this.pageTargetsCenter() < this.getMaxPageTargetsCenter();
               else
                  return this.page() < this.totalPages();
            }
         });

         this.hasPageTargets = ko.computed(() =>
         {
            return !_.isEmpty(this.pageTargets());
         });

         this.pageTargetColumns = ko.computed(() =>
         {
            var columns = [ko.mapping.fromJS(new FieldData({ key: "itemRange", dataType: "string", displayName: "" }))];

            _.each(options.activeSortColumns(), (i) =>
            {
               var newColumn = ko.mapping.fromJS(ko.mapping.toJS(i));
               newColumn.key("firstItem." + newColumn.key());
               columns.push(newColumn);
            });

            return columns;
         });
      }

      itemsMessage(from: number, to: number, total: number)
      {
         if (from === 1 && to === total)
            return "{0} {1}".format(total, strings.items); // "9 items"

         return "{0}-{1} {2} {3}".format(from, to, strings.of, total); // "1-20 of 24"
      }

      // Response is either a GridViewDataResponse or LookupDataResponse
      updateFromResponse(response)
      {
         this.pageTargets(response.pageTargets);

         this.pageSize(response.gridViewOptions.pageSize);
         this.totalItems(response.gridViewOptions.totalItems);
         this.totalPages(response.gridViewOptions.totalPages);
      }

      // Caution! this doesn't reset the page and page targets center
      reset()
      {
         this.totalItems(0);
         this.totalPages(0);
         this.pageTargets.removeAll();
      }

      navigateToPage(page: number)
      {
         this.page(page);
         this.snapPageTargetsCenter(page);
      }

      keepPageTargetsShown()
      {
         // Prevent the page targets dropdown from closing when then next or previous button is clicked
         // Alternative method is to call event.stopPropagation but it is a bad practice and may break other codes
         this.keepPageTargetsShownFlag = this.showPageTargets();
      }

      canPageTargetsHide()
      {
         if (!this.keepPageTargetsShownFlag)
            return true;

         this.keepPageTargetsShownFlag = false;
         return false;
      }

      isPageTargetSelected(pageTarget: PageTarget): boolean
      {
         return pageTarget.page === this.page();
      }

      isPageTargetDivider(pageTarget: PageTarget): boolean
      {
         return pageTarget.page < 1;
      }

      selectPageTarget(pageTarget: PageTarget): void
      {
         if (pageTarget.page >= 1)
            this.navigateToPage(pageTarget.page);
         else
            this.keepPageTargetsShown(); // Prevent dropdown from closing when "..." item is clicked
      }

      private snapPageTargetsCenter(preferredPageTargetsCenter: number)
      {
         this.pageTargetsCenter(Math.max(Math.min(preferredPageTargetsCenter, this.getMaxPageTargetsCenter()), this.getMinPageTargetsCenter()));
      }

      private getMinPageTargetsCenter()
      {
         return this.pageTargetsEdgeSize() + this.pageTargetsInnerSize() + 1;
      }

      private getMaxPageTargetsCenter()
      {
         return this.totalPages() - (this.pageTargetsEdgeSize() + this.pageTargetsInnerSize());
      }

      private getPageTargetsStepSize(): number
      {
         return this.pageTargetsInnerSize() * 2 + 1;
      }
   }
}