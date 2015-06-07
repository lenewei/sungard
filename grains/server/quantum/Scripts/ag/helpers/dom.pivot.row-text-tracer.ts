module ag.dom.pivot
{
   export class RowTextTracer
   {
      axisY = 0;
      modifiedCells = [];

      constructor(public $table, public $cloneLeft: JQuery, public $middleDiv) { }

      trace = (needShow: boolean) =>
      {
         if (!needShow)
         {
            this.clean();
            return;
         }

         var newAxisY = this.getHighestRowAxisY();
         if (this.axisY == newAxisY)
            return;
         else
         {
            this.clean();
            this.axisY = newAxisY;
            this.calculate();
         }
      }

      clean = _.debounce(() =>
      {
         this.modifiedCells.forEach(($element: JQuery) =>
         {
            $element.children().remove();
         });
         this.modifiedCells = [];
      }, 150);

      calculate = _.debounce(() =>
      {
         var target = $(this.$cloneLeft.find('tbody tr')[this.axisY - 1]),
            axisX = target.children().length;

         var getCellByAxis = (x: number, y: number) =>
         {
            var selector = "tbody tr:nth-child({0}) th:nth-child({1})".format(y, x),
               $element = this.$cloneLeft.find(selector);

            return !$element || $element.text() ? undefined : $element;
         };

         var modifyCellText = ($element: JQuery, positionX, positionY) =>
         {
            var currentColumnSelector = 'tbody tr th:nth-child({0})'.format(positionX),
               columns = this.$cloneLeft.find(currentColumnSelector);

            for (var j = positionY - 1; j >= 0; j--)
            {
               if ($(columns[j]).hasClass('duplicate-row'))
                  continue;

               var $span = $('<span style="display:none">{0}</span>'.format($(columns[j]).text()));
               $element.append($span);
               $span.fadeTo(400, 0.5);
               this.modifiedCells.push($element);
               break;
            }
         };

         for (var i = axisX - 1; i >= 1; i--)
         {
            var $target = getCellByAxis(i, this.axisY);
            if ($target)
               modifyCellText($target, i, this.axisY);
         }
      }, 150);

      getHighestRowAxisY = () =>
      {
         var array = [];

         this.$table.find('tbody tr').each((index, elem: HTMLElement) =>
         {
            array.push({ isCollision: collision($(elem), this.$middleDiv), index: index });
         });

         var r = _.findLast(array,(obj) =>
         {
            return obj.isCollision;
         });

         return !r ? 0 : r.index + 1;
      };
   }
}
