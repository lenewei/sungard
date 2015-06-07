var ag;
(function (ag) {
    (function (dom) {
        (function (pivot) {
            var newCSS = 'fb', $window = $(window), pageTokenId = ag.utils.getPageIdToken(), $stickytop = $('<div class="gridtablecontainer pivot-container font-medium" style="position: fixed; top: 40px; overflow: hidden;">'), $stickybottom = $('<div style="position: fixed; overflow: hidde; bottom: 0px;">');

            function render(container) {
                $stickytop.empty();
                $stickybottom.empty();

                var $container = $(container), $table = $($container.find('table')), $tableTheadRows = $table.find('thead tr'), $tableLastRow = $table.find('tbody tr:last-child'), $tableHead = $table.find('thead'), $navBar = $('div.navbar-fixed-top'), rateLimit = 150;

                $navBar.data('getBoundingClientRect', $navBar[0].getBoundingClientRect());

                reformatTableElements($table);
                pivot.updateDocumentSize();

                var $cloneTop = buildHeaderTable($table.clone(), 'topTable'), $cloneLeft = buildLeftTable($table.clone()), $cloneCorner = buildHeaderTable($cloneLeft.clone(), 'cornerTable'), $stickyWrapInner = $('<div class="sticky-wrap-inner drop-shadow">'), $middleDiv = $('<div style="position: absolute; top: 50%; left: 50%;">'), $stickyWrapBottomInner = $('<div class="sticky-wrap-inner" style="display: inline-block">'), $bottomDiv = $('<div id="bottomDiv">');

                updateColgroupToMinimumSize($table, $cloneLeft.find('thead tr:last-child').children().length);

                var textTracer = new pivot.RowTextTracer($table, $cloneLeft, $middleDiv);
                var leftCss = function () {
                    return $container.offset().left;
                };

                var resize = function () {
                    var makeSame = function (rows, rowsNeedToUpdate) {
                        rows.each(function (index, th) {
                            var $s = rowsNeedToUpdate.eq(index), $th = $(th);
                            $s.width($th.width());
                            $s.height($th.height());
                        });
                    };

                    $tableTheadRows.each(function (i, headRow) {
                        var originalRows = $(headRow).children();
                        makeSame(originalRows, $cloneTop.find('thead tr').eq(i).children());
                        makeSame(originalRows, $cloneLeft.find('thead tr').eq(i).children());
                        makeSame(originalRows, $cloneCorner.find('thead tr').eq(i).children());
                    });

                    var containerWidth = $container.width(), tableWidth = $table.width(), tableHeight = $table.height(), tableHeadHeight = $tableHead.height();

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

                    // we will scroll the whole table if left clone's width is larger than
                    // the conatiner's width
                    if ($container.width() <= $cloneLeft.width()) {
                        pivot.restyle($cloneLeft, 0, -1);
                        pivot.restyle($cloneCorner, 0, -1);
                    } else {
                        pivot.restyle($cloneLeft, 1, 3);
                        pivot.restyle($cloneCorner, 1, 4);
                    }
                };

                // header Y reposition
                var repositionYTop = function () {
                    if (pivot.collision($table, $navBar) && !pivot.collision($tableLastRow, $navBar)) {
                        pivot.restyle($stickytop, 1, 4);
                        return true;
                    } else {
                        pivot.restyle($stickytop, 0, -1);
                        return false;
                    }
                };

                // scroller Y reposition
                var repositionYBottom = function () {
                    var isTableNotInViewport = !pivot.isScrolledIntoView($table, true), isBottomDivInViewport = pivot.isScrolledIntoView($bottomDiv), isScrollbartocuhThead = pivot.collision($stickybottom, $tableHead), isNoScroller = $container[0].scrollWidth <= $container.width();

                    // if the bottomDiv is not visible and container has a scroll bar we need to display the fake scroll bar
                    if (isNoScroller || isBottomDivInViewport || isTableNotInViewport || isScrollbartocuhThead)
                        pivot.restyle($stickybottom, 0, -1);
                    else
                        pivot.restyle($stickybottom, 1, 4);
                };

                var repositionY = function () {
                    repositionYBottom();
                    var needShow = repositionYTop();
                    textTracer.trace(needShow);
                };

                var repositionX = function (reverse) {
                    if (typeof reverse === "undefined") { reverse = true; }
                    if (!reverse)
                        $stickybottom.scrollLeft($container.scrollLeft());
                    else
                        $container.scrollLeft($stickybottom.scrollLeft());

                    $cloneTop.css('left', -$container.scrollLeft());
                };

                var resizeAndRepositionY = function (deferred) {
                    resize();
                    repositionY();

                    if (deferred)
                        deferred.resolve();
                };

                var resizeAndRepositionYDebounced = _.debounce(function () {
                    resizeAndRepositionY();
                }, rateLimit);

                // performance need to be improved here
                var registerTableMouseover = function () {
                    var sync = function ($t1, $t2) {
                        $t1.find('tbody tr').mouseover(function (event) {
                            // clear previous cached hoverd tr
                            pivot.removeHoverClass($t2);

                            $t1.find('tbody tr').each(function (index, tr) {
                                if (tr == event.currentTarget) {
                                    var t2tr = $t2.find('tbody tr').eq(index);
                                    t2tr.addClass('hover');
                                    $t2.data("hoverdTR", t2tr);
                                    return false;
                                }
                                return true;
                            });
                        });
                    };

                    sync($cloneLeft, $table);
                    sync($table, $cloneLeft);
                };

                var unregisterTableMouseHover = function () {
                    $table.find('tbody tr').off('mouseover');
                    $cloneLeft.find('tbody tr').off('mouseover');
                };

                var removeHoverHandler = function () {
                    pivot.removeHoverClass($table);
                    pivot.removeHoverClass($cloneLeft);
                };

                var windowClickHandler = function () {
                    if (!pivot.documentSizeHasChanged())
                        return;

                    _.delay(function () {
                        resizeAndRepositionY();
                        pivot.updateDocumentSize();
                    }, 0);
                };

                var containerScrollerHandler = function () {
                    repositionX(false);
                };
                var vScrollWrapScrollerHandler = function () {
                    repositionX();
                };

                var initFun = function () {
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

                initFun().then(function () {
                    $cloneLeft.css('opacity', 1);
                });

                // unregister event listeneres
                $window.off('scroll', $.browser.msie ? repositionY : repositionY).off('resize', resizeAndRepositionYDebounced).off('click', windowClickHandler);

                $container.off('scroll', containerScrollerHandler).off("show", resizeAndRepositionYDebounced);
                $stickybottom.off('scroll', vScrollWrapScrollerHandler);
                unregisterTableMouseHover();
                $cloneLeft.find('tbody').off('mouseleave', removeHoverHandler);
                $table.find('tbody').off('mouseleave', removeHoverHandler);

                // register event listeners
                $window.scroll($.browser.msie ? repositionY : repositionY).resize(resizeAndRepositionYDebounced).click(windowClickHandler);

                $container.scroll(containerScrollerHandler).show(resizeAndRepositionYDebounced);
                $stickybottom.scroll(vScrollWrapScrollerHandler);
                registerTableMouseover();
                $cloneLeft.find('tbody').mouseleave(removeHoverHandler);
                $table.find('tbody').mouseleave(removeHoverHandler);
            }
            pivot.render = render;

            function reformatTableElements($table) {
                pivot.processToken($table, pageTokenId);

                var headerRows = $table.find('thead tr');
                headerRows.each(function (i, tr) {
                    var thArray = $(tr).children();
                    thArray.each(function (j, th) {
                        if ($(th).hasClass(newCSS))
                            $(th).attr('colspan', 0);
                    });
                });

                return $table;
            }

            function buildHeaderTable($table, id) {
                $table.find('tbody, tfoot, colgroup').remove();
                $table.attr('id', id);

                return $table;
            }

            function buildLeftTable($table) {
                var head = $table.find('thead th');
                head.not('th.' + newCSS).remove();
                var lastIndex = $table.find('thead tr:last-child').children().length;

                $table.find('tbody tr').each(function (i, tr) {
                    var s = $(tr).children(), totalColSpan = 0;
                    _.each(s, function (ele) {
                        totalColSpan += parseInt($(ele).attr('colspan')) || 1;
                        if (totalColSpan > lastIndex)
                            $(ele).remove();
                    });
                });

                $table.find('colgroup, tfoot').remove();
                $table.attr('id', 'leftTable');
                return $table;
            }

            function updateColgroupToMinimumSize($table, count) {
                $table.find('colgroup').each(function (index, colgroup) {
                    if (index > count - 1)
                        return false;

                    $(colgroup).css("width", "1%");
                    return true;
                });
            }
        })(dom.pivot || (dom.pivot = {}));
        var pivot = dom.pivot;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
