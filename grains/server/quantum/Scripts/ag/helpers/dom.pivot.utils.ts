module ag.dom.pivot
{
   var $window = $(window);

   export function collision($selector1: JQuery, $selector2: JQuery): boolean
   {
      if ($selector1.length === 0 || $selector2.length === 0)
         return false;

      var getBoundingClient = ($elem:JQuery) =>
      {
         var bc = $elem.data('getBoundingClientRect');
         return bc ? bc : $elem[0].getBoundingClientRect();
      };

      var rect1 = getBoundingClient($selector1),
         rect2 = getBoundingClient($selector2);

      return !(rect1.right < rect2.left
         || rect1.left > rect2.right
         || rect1.bottom < rect2.top
         || rect1.top > rect2.bottom);
   }

   export function isScrolledIntoView(elem, checkPartiallyInTheView: boolean = false): boolean
   {
      var $elem = $(elem);

      if (!$elem || !$elem.offset()) return false;

      var docViewTop = $window.scrollTop(),
         docViewBottom = docViewTop + $window.height(),
         elemTop = $elem.offset().top,
         elemBottom = elemTop + $elem.height();

      if (checkPartiallyInTheView)
         return (elemTop > docViewTop && elemTop < docViewBottom)
            || (elemBottom > docViewTop && elemBottom < docViewBottom)
            || (elemTop < docViewTop && elemBottom > docViewTop)
            || ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));

      return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
   }

   export function removeHoverClass($table: JQuery): void
   {
      var hoverdTR = $table.data('hoverdTR');
      if (hoverdTR)
         hoverdTR.removeClass('hover');
   }

   export var restyle = ($element: JQuery, opacity: number, zIndex: number) =>
   {
      $element.css({
         opacity: opacity,
         zIndex: zIndex,
      });
   };
}