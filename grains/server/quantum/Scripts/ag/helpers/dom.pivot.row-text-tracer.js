var ag;
(function (ag) {
    (function (dom) {
        (function (pivot) {
            var RowTextTracer = (function () {
                function RowTextTracer($table, $cloneLeft, $middleDiv) {
                    var _this = this;
                    this.$table = $table;
                    this.$cloneLeft = $cloneLeft;
                    this.$middleDiv = $middleDiv;
                    this.axisY = 0;
                    this.modifiedCells = [];
                    this.trace = function (needShow) {
                        if (!needShow) {
                            _this.clean();
                            return;
                        }

                        var newAxisY = _this.getHighestRowAxisY();
                        if (_this.axisY == newAxisY)
                            return;
                        else {
                            _this.clean();
                            _this.axisY = newAxisY;
                            _this.calculate();
                        }
                    };
                    this.clean = _.debounce(function () {
                        _this.modifiedCells.forEach(function ($element) {
                            $element.children().remove();
                        });
                        _this.modifiedCells = [];
                    }, 150);
                    this.calculate = _.debounce(function () {
                        var target = $(_this.$cloneLeft.find('tbody tr')[_this.axisY - 1]), axisX = target.children().length;

                        var getCellByAxis = function (x, y) {
                            var selector = "tbody tr:nth-child({0}) th:nth-child({1})".format(y, x), $element = _this.$cloneLeft.find(selector);

                            return !$element || $element.text() ? undefined : $element;
                        };

                        var modifyCellText = function ($element, positionX, positionY) {
                            var currentColumnSelector = 'tbody tr th:nth-child({0})'.format(positionX), columns = _this.$cloneLeft.find(currentColumnSelector);

                            for (var j = positionY - 1; j >= 0; j--) {
                                if ($(columns[j]).hasClass('duplicate-row'))
                                    continue;

                                var $span = $('<span style="display:none">{0}</span>'.format($(columns[j]).text()));
                                $element.append($span);
                                $span.fadeTo(400, 0.5);
                                _this.modifiedCells.push($element);
                                break;
                            }
                        };

                        for (var i = axisX - 1; i >= 1; i--) {
                            var $target = getCellByAxis(i, _this.axisY);
                            if ($target)
                                modifyCellText($target, i, _this.axisY);
                        }
                    }, 150);
                    this.getHighestRowAxisY = function () {
                        var array = [];

                        _this.$table.find('tbody tr').each(function (index, elem) {
                            array.push({ isCollision: pivot.collision($(elem), _this.$middleDiv), index: index });
                        });

                        var r = _.findLast(array, function (obj) {
                            return obj.isCollision;
                        });

                        return !r ? 0 : r.index + 1;
                    };
                }
                return RowTextTracer;
            })();
            pivot.RowTextTracer = RowTextTracer;
        })(dom.pivot || (dom.pivot = {}));
        var pivot = dom.pivot;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
