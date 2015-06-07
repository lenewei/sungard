var ag;
(function (ag) {
    (function (components) {
        var ExplorerViewModelViewExtension = (function () {
            function ExplorerViewModelViewExtension() {
            }
            ExplorerViewModelViewExtension.prototype.buildDisplayDictionary = function (fields) {
                var _this = this;
                this.valueFuncCollection = new Array();

                // initialise the value function collection keys
                _.each(fields, function (value) {
                    if (!value.isRule)
                        return;

                    var valueFun = {
                        canApplyRule: value.canApplyRule.toCamelCase(),
                        column: value.targetColumn,
                        secondaryColumn: undefined,
                        delegator: undefined
                    };

                    switch (value.ruleType) {
                        case 0 /* UpdateCellDisplay */:
                            valueFun.delegator = function (viewModelName, rawRowItem) {
                                if (!rawRowItem)
                                    return undefined;

                                var target = value.targetColumn, thenUse = value.replaceWithProperty, rowItem = ko.mapping.toJS(rawRowItem);

                                if (target != viewModelName)
                                    return undefined;

                                if (rowItem[valueFun.canApplyRule])
                                    return rowItem[thenUse];
                            };
                            break;
                        case 1 /* DisableTheDrillDownAfterSelection */:
                            valueFun.delegator = function (viewModelName, rawRowItem, $currentSelectedCell) {
                                var isSelected = ko.unwrap(rawRowItem.selected), rowItem = ko.unwrap(rawRowItem), rowKey = rowItem["__key__"];

                                // no children no further process
                                if (!rowItem.hasChildren)
                                    return;

                                var explorerViewModel = ko.contextFor($currentSelectedCell[0]).$root, selectedItems = ko.unwrap(explorerViewModel.selectedItems);

                                var checkParents = function (conditionCheckingFunction) {
                                    return _.filter(selectedItems, function (selectedItem) {
                                        if (!_.has(selectedItem, "parents"))
                                            throw new Error("Parents is missing from selected items.");

                                        var a = _.find(Array(selectedItem.parents), function (parent) {
                                            return parent == rowKey;
                                        });

                                        return conditionCheckingFunction(a);
                                    });
                                };

                                if (isSelected) {
                                    $currentSelectedCell.data("disableFolderIcon", true);
                                    explorerViewModel.selectedItems(checkParents(function (a) {
                                        return !a || a.length == 0;
                                    }));
                                    $currentSelectedCell.parent().css("background", "#FFF");
                                } else {
                                    $currentSelectedCell.data("disableFolderIcon", false);
                                    if (checkParents(function (a) {
                                        return a && a.length > 0;
                                    }).length > 0)
                                        $currentSelectedCell.parent().css("background", "#F0FAFC");
                                }
                            };
                            break;
                        case 2 /* UpdateStyle */:
                            throw new Error("Method not been implemented.");
                        default:
                            throw new Error("Unknown rule type.");
                    }

                    _this.valueFuncCollection.push(valueFun);
                });
            };

            ExplorerViewModelViewExtension.prototype.tryGetFunction = function (rowItem, targetColumn) {
                var result = _.findLast(this.valueFuncCollection, function (valueFunc) {
                    if (targetColumn == valueFunc.column)
                        return true;
                });

                if (result)
                    return result.delegator;

                return undefined;
            };
            return ExplorerViewModelViewExtension;
        })();
        components.ExplorerViewModelViewExtension = ExplorerViewModelViewExtension;
    })(ag.components || (ag.components = {}));
    var components = ag.components;
})(ag || (ag = {}));
