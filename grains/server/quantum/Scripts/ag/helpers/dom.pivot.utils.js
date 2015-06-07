var ag;
(function (ag) {
    (function (dom) {
        (function (pivot) {
            var $window = $(window);

            function collision($selector1, $selector2) {
                if ($selector1.length === 0 || $selector2.length === 0)
                    return false;

                var getBoundingClient = function ($elem) {
                    var bc = $elem.data('getBoundingClientRect');
                    return bc ? bc : $elem[0].getBoundingClientRect();
                };

                var rect1 = getBoundingClient($selector1), rect2 = getBoundingClient($selector2);

                return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
            }
            pivot.collision = collision;

            function isScrolledIntoView(elem, checkPartiallyInTheView) {
                if (typeof checkPartiallyInTheView === "undefined") { checkPartiallyInTheView = false; }
                var $elem = $(elem);

                if (!$elem || !$elem.offset())
                    return false;

                var docViewTop = $window.scrollTop(), docViewBottom = docViewTop + $window.height(), elemTop = $elem.offset().top, elemBottom = elemTop + $elem.height();

                if (checkPartiallyInTheView)
                    return (elemTop > docViewTop && elemTop < docViewBottom) || (elemBottom > docViewTop && elemBottom < docViewBottom) || (elemTop < docViewTop && elemBottom > docViewTop) || ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));

                return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
            }
            pivot.isScrolledIntoView = isScrolledIntoView;

            function removeHoverClass($table) {
                var hoverdTR = $table.data('hoverdTR');
                if (hoverdTR)
                    hoverdTR.removeClass('hover');
            }
            pivot.removeHoverClass = removeHoverClass;

            pivot.restyle = function ($element, opacity, zIndex) {
                $element.css({
                    opacity: opacity,
                    zIndex: zIndex
                });
            };
        })(dom.pivot || (dom.pivot = {}));
        var pivot = dom.pivot;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
