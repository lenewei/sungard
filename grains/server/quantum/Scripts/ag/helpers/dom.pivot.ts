module ag.dom.pivot
{
   var newCSS = 'fb',
      $window = $(window),
      pageTokenId = utils.getPageIdToken(),
      $stickytop = $('<div class="gridtablecontainer pivot-container font-medium" style="position: fixed; top: 40px; overflow: hidden;">'),
      $stickybottom = $('<div style="position: fixed; overflow: hidde; bottom: 0px;">');

   export function render(container: HTMLElement)
   {
      $stickytop.empty();
      $stickybottom.empty();

      var $container = $(container),
         $table = $($container.find('table')),
         $tableTheadRows = $table.find('thead tr'),
         $tableLastRow = $table.find('tbody tr:last-child'),
         $tableHead = $table.find('thead'),
         $navBar = $('div.navbar-fixed-top'),
         rateLimit = 150;

      $navBar.data('getBoundingClientRect', $navBar[0].getBoundingClientRect());

      reformatTableElements($table);
      updateDocumentSize();

      var $cloneTop = buildHeaderTable($table.clone(), 'topTable'),
         $cloneLeft = buildLeftTable($table.clone()),
         $cloneCorner = buildHeaderTable($cloneLeft.clone(), 'cornerTable'),
         $stickyWrapInner = $('<div class="sticky-wrap-inner drop-shadow">'),
         $middleDiv = $('<div style="position: absolute; top: 50%; left: 50%;">'),
         $stickyWrapBottomInner = $('<div class="sticky-wrap-inner" style="display: inline-block">'),
         $bottomDiv = $('<div id="bottomDiv">');

      updateColgroupToMinimumSize($table, $cloneLeft.find('thead tr:last-child').children().length);

      var textTracer = new RowTextTracer($table, $cloneLeft, $middleDiv);
      var leftCss = () => { return $container.offset().left; };

      var resize = () =>
      {
         var makeSame = (rows: JQuery, rowsNeedToUpdate: JQuery) =>
         {
            rows.each((index, th: HTMLElement) =>
            {
               var $s = rowsNeedToUpdate.eq(index), $th = $(th);
               $s.width($th.width());
               $s.height($th.height());
            });
         };

         if (isScrollerVisible())
            $container.addClass('wrap-now');
         else
            $container.removeClass('wrap-now');

         $tableTheadRows.each((i, headRow) =>
         {
            var originalRows = $(headRow).children();
            makeSame(originalRows, $cloneTop.find('thead tr').eq(i).children());
            makeSame(originalRows, $cloneLeft.find('thead tr').eq(i).children());
            makeSame(originalRows, $cloneCorner.find('thead tr').eq(i).children());
         });

         var containerWidth = $container.width(),
            tableWidth = $table.width(),
            tableHeight = $table.height(),
            tableHeadHeight = $tableHead.height();

         $stickytop.width(containerWidth);
         $stickytop.css({ left: leftCss });
         $stickybottom.width(containerWidth);
         $stickybottom.css({ left: leftCss });

         $middleDiv.height(tableHeadHeight / 2 + $table.find('tbody tr:first-child').height() / 2);

         $stickyWrapInner.width(containerWidth);
         $stickyWrapInner.height(tableHeadHeight);

         $stickyWrapBottomInner.width(tableWidth);

         $cloneTop.width(tableWidth);
         $cloneTop.css('min-width', tableWidth);
         $cloneLeft.height(tableHeight);
         $cloneLeft.width($cloneCorner.width());
         

         // we will scroll the whole table if left clone's width is larger than
         // the conatiner's width
         if ($container.width() <= $cloneLeft.width())
         {
            restyle($cloneLeft, 0, -1);
            restyle($cloneCorner, 0, -1);
         }
         else
         {
            restyle($cloneLeft, 1, 3);
            restyle($cloneCorner, 1, 4);
         }
      };

      // header Y reposition
      var repositionYTop = () =>
      {
         if (collision($table, $navBar) && !collision($tableLastRow, $navBar))
         {
            restyle($stickytop, 1, 4);
            return true;
         }
         else
         {
            restyle($stickytop, 0, -1);
            return false;
         }
      }

      var isScrollerVisible = () =>
      {
         return $container[0].scrollWidth > $container.width();
      };

      // scroller Y reposition
      var repositionYBottom = () =>
      {
         var isTableNotInViewport = !isScrolledIntoView($table, true),
            isBottomDivInViewport = isScrolledIntoView($bottomDiv),
            isScrollbartocuhThead = collision($stickybottom, $tableHead),
            isNoScroller = !isScrollerVisible();

         // if the bottomDiv is not visible and container has a scroll bar we need to display the fake scroll bar
         if (isNoScroller || isBottomDivInViewport || isTableNotInViewport || isScrollbartocuhThead)
            restyle($stickybottom, 0, -1);
         else
            restyle($stickybottom, 1, 4);
      }

      var repositionY = () =>
      {
         repositionYBottom();
         var needShow = repositionYTop();
         textTracer.trace(needShow);
      }

      var repositionX = (reverse: boolean = true) =>
      {
         if (!reverse)
            $stickybottom.scrollLeft($container.scrollLeft());
         else
            $container.scrollLeft($stickybottom.scrollLeft());

         $cloneTop.css('left', -$container.scrollLeft());
      }

      var resizeAndRepositionY = (deferred?: JQueryDeferred<any>) =>
      {
         resize();
         repositionY();

         if (deferred)
            deferred.resolve();
      };

      var resizeAndRepositionYDebounced = _.debounce(() =>
      {
         resizeAndRepositionY();
      }, rateLimit);

      // performance need to be improved here
      var registerTableMouseover = () =>
      {
         var sync = ($t1: JQuery, $t2: JQuery) =>
         {
            $t1.find('tbody tr').mouseover((event: JQueryEventObject) =>
            {
               // clear previous cached hoverd tr
               removeHoverClass($t2);

               $t1.find('tbody tr').each((index, tr) =>
               {
                  if (tr == event.currentTarget)
                  {
                     var t2tr = $t2.find('tbody tr').eq(index);
                     t2tr.addClass('hover');
                     $t2.data("hoverdTR", t2tr);
                     return false;
                  }
                  return true;
               });
            });
         }

         sync($cloneLeft, $table);
         sync($table, $cloneLeft);
      }

      var unregisterTableMouseHover = () =>
      {
         $table.find('tbody tr').off('mouseover');
         $cloneLeft.find('tbody tr').off('mouseover');
      };

      var removeHoverHandler = () =>
      {
         removeHoverClass($table);
         removeHoverClass($cloneLeft);
      }

      var windowClickHandler = () =>
      {
         if (!documentSizeHasChanged())
            return;

         _.delay(() =>
         {
            resizeAndRepositionY();
            updateDocumentSize();
         }, 0);
      };

      var containerScrollerHandler = () => { repositionX(false); };
      var vScrollWrapScrollerHandler = () => { repositionX(); };

      var initFun = (): JQueryPromise<any> =>
      {
         var deferred = $.Deferred();
         $cloneLeft.css('opacity', 0);
         
         // structure the table elements
         $stickyWrapInner.append($cloneTop, $cloneCorner);
         $stickytop.append($stickyWrapInner, $middleDiv);
         $container.prepend($cloneLeft);
         $stickybottom.append($stickyWrapBottomInner);

         $('body').append($stickytop, $stickybottom);

         $container.append($bottomDiv);

         // style preparetion
         $cloneTop.addClass('clone-table');
         $cloneLeft.addClass('clone-table br');
         $cloneCorner.addClass('clone-table br');
         $stickybottom.css('overflow-x', 'scroll');

         resizeAndRepositionY(deferred);
         containerScrollerHandler();
         vScrollWrapScrollerHandler();

         return deferred;
      };

      initFun().then(() =>
      {
         $cloneLeft.css('opacity', 1);
      });

      // unregister event listeneres
      $window.off('scroll', $.browser.msie ? repositionY : repositionY)
         .off('resize', resizeAndRepositionYDebounced)
         .off('click', windowClickHandler);

      $container.off('scroll', containerScrollerHandler).off("show",resizeAndRepositionYDebounced);
      $stickybottom.off('scroll', vScrollWrapScrollerHandler);
      unregisterTableMouseHover();
      $cloneLeft.find('tbody').off('mouseleave', removeHoverHandler);
      $table.find('tbody').off('mouseleave', removeHoverHandler);

      // register event listeners
      $window.scroll($.browser.msie ? repositionY : repositionY)
         .resize(resizeAndRepositionYDebounced)
         .click(windowClickHandler);

      $container.scroll(containerScrollerHandler).show(resizeAndRepositionYDebounced);
      $stickybottom.scroll(vScrollWrapScrollerHandler);
      registerTableMouseover();
      $cloneLeft.find('tbody').mouseleave(removeHoverHandler);
      $table.find('tbody').mouseleave(removeHoverHandler);
   }

   function reformatTableElements($table: JQuery): JQuery
   {
      processToken($table, pageTokenId);

      var headerRows = $table.find('thead tr');
      headerRows.each((i, tr: HTMLElement) =>
      {
         var thArray = $(tr).children();
         thArray.each((j, th: HTMLElement) =>
         {
            if ($(th).hasClass(newCSS))
               $(th).attr('colspan', 0);
         });
      });

      return $table;
   }

   function buildHeaderTable($table: JQuery, id: string): JQuery
   {
      $table.find('tbody, tfoot, colgroup').remove();
      $table.attr('id', id);

      return $table;
   }

   function buildLeftTable($table: JQuery): JQuery
   {
      var head = $table.find('thead th');
      head.not('th.' + newCSS).remove();
      var lastIndex = $table.find('thead tr:last-child').children().length;

      $table.find('tbody tr').each((i, tr) =>
      {
         var s = $(tr).children(),
            totalColSpan = 0;
         _.each(s, ele =>
         {
            totalColSpan += parseInt($(ele).attr('colspan')) || 1;
            if (totalColSpan > lastIndex)
               $(ele).remove();
         });
      });

      $table.find('colgroup, tfoot').remove();
      $table.attr('id', 'leftTable');
      return $table;
   }

   function updateColgroupToMinimumSize($table: JQuery, count: number): void
   {
      $table.find('colgroup').each((index, colgroup) =>
      {
         if (index > count - 1)
            return false;

         $(colgroup).css("width", "1%");
         return true;
      });
   }
}