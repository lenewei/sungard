var ag;
(function (ag) {
    (function (dom) {
        (function (pivot) {
            pivot.processToken = function ($table, pageTokenId) {
                _.delay(function () {
                    var tbodyTr = $table.find('tbody tr');

                    var tagFormatter = function ($tag, token, worker) {
                        var hasToken = $tag.attr(token);
                        if (hasToken !== undefined) {
                            $tag.removeAttr(token);
                            worker();
                        }
                    };

                    tbodyTr.find('td a').each(function (i, aTag) {
                        var $aTag = $(aTag), href = $aTag.attr('href');

                        $aTag.attr('target', '_blank');

                        if (href !== undefined && href !== null) {
                            href = href.replace('$1', '&edit=').replace('$2', '&columnKey=').replace('$3', '&pageId=' + pageTokenId);
                            $aTag.attr('href', href);
                        } else {
                            $aTag.attr('href', '#');
                        }

                        tagFormatter($aTag, '$4', function () {
                            $aTag.attr('onclick', "ag.contextMenu.positionPivotCellLinks(event)");
                            $aTag.attr('data-toggle', 'dropdown');
                            $aTag.addClass('dropdown-toggle');

                            var parent = $aTag.parent();
                            var contextMenu = $('<div class="dropdown context-menu\"></div>');
                            contextMenu.append($aTag);
                            parent.append(contextMenu);
                        });
                    });
                }, 0);
            };
        })(dom.pivot || (dom.pivot = {}));
        var pivot = dom.pivot;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
