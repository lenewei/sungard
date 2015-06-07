/// <reference path="appViewModel.ts" />
/// <reference path="groupEditor.ts" />
/// <reference path="../utils/network.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var AnalyticsDefinitionViewModel = (function (_super) {
        __extends(AnalyticsDefinitionViewModel, _super);
        function AnalyticsDefinitionViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            // set page title by using the name field.
            this.resetTitle = function () {
                if (_this.isNewItem())
                    return;

                _this.setPageTitle(_this, { name: ko.unwrap(_this.editingItem.name) });
            };
            this.editPropertyName = "id";
        }
        AnalyticsDefinitionViewModel.prototype.cacheCurrentParentKeyValue = function (fromCopy) {
            if (typeof fromCopy === "undefined") { fromCopy = false; }
            _super.prototype.cacheCurrentParentKeyValue.call(this, fromCopy, "id");
            this.subType = ko.unwrap(this.editingItem.subType);
        };

        AnalyticsDefinitionViewModel.prototype.createNewItem = function (subType) {
            this.cacheCurrentParentKeyValue();
            this.beforeSendCreateItemRequest();

            var params = { subType: !_.isUndefined(subType) ? subType : false };
            this.updateCreateItemParams(params);

            return this.itemRequest("createsubtype", params, true);
        };

        AnalyticsDefinitionViewModel.prototype.updateCreateItemParams = function (params) {
            _super.prototype.updateCreateItemParams.call(this, params);
            if (!_.has(params, "subType"))
                $.extend(params, { subType: this.subType });
        };

        AnalyticsDefinitionViewModel.prototype.getKeyQueryString = function (key) {
            return "id=" + key;
        };

        AnalyticsDefinitionViewModel.prototype.navigateGetParams = function () {
            return { id: null };
        };

        AnalyticsDefinitionViewModel.prototype.navigateToParent = function () {
            this.navigateToItem(_.last(ag.viewModel.breadcrumb.parents()).id());
        };

        AnalyticsDefinitionViewModel.prototype.itemRequest = function (action, params, isNewItem, byPOST) {
            if (typeof byPOST === "undefined") { byPOST = false; }
            return _super.prototype.itemRequest.call(this, action, params, isNewItem, byPOST).then(this.resetTitle);
        };

        AnalyticsDefinitionViewModel.prototype.saveItem = function (clearAfter) {
            if (typeof clearAfter === "undefined") { clearAfter = false; }
            return _super.prototype.saveItem.call(this, clearAfter).done(this.resetTitle);
        };
        return AnalyticsDefinitionViewModel;
    })(ag.HierarchicalViewModel);
    ag.AnalyticsDefinitionViewModel = AnalyticsDefinitionViewModel;

    var SecurityDefintionViewModel = (function (_super) {
        __extends(SecurityDefintionViewModel, _super);
        function SecurityDefintionViewModel(options) {
            _super.call(this, options);
            this.options = options;
            this.hasRootEditor = false;
        }
        SecurityDefintionViewModel.prototype.afterApplyBindings = function () {
            var _this = this;
            this.isNewItem(false);

            // always make sure isNewItem is false
            this.isNewItem.subscribe(function (value) {
                if (value)
                    _this.isNewItem(false);
            });
        };
        return SecurityDefintionViewModel;
    })(AnalyticsDefinitionViewModel);
    ag.SecurityDefintionViewModel = SecurityDefintionViewModel;

    var ColumnDefinitionViewModel = (function (_super) {
        __extends(ColumnDefinitionViewModel, _super);
        function ColumnDefinitionViewModel() {
            _super.apply(this, arguments);
        }
        ColumnDefinitionViewModel.prototype.beforeApplyBindings = function () {
            ColumnDefinitionViewModel.initialise(this.grids.calculated);
        };

        ColumnDefinitionViewModel.initialise = function (grid) {
            grid.editor.canCreateFn = ko.computed(function () {
                var items = grid.items;

                if (!items || ko.unwrap(items).length == 0)
                    return true;

                return false;
            });
        };

        ColumnDefinitionViewModel.getExpressionValidateExtraRequestData = function (calculatedColumn, calculatedColumnSet) {
            return {
                actualName: calculatedColumn.actualName(),
                calculatedColumnSet: ko.mapping.toJS(calculatedColumnSet)
            };
        };
        return ColumnDefinitionViewModel;
    })(AnalyticsDefinitionViewModel);
    ag.ColumnDefinitionViewModel = ColumnDefinitionViewModel;

    var AlertDefinitionViewModel = (function (_super) {
        __extends(AlertDefinitionViewModel, _super);
        function AlertDefinitionViewModel() {
            _super.apply(this, arguments);
        }
        AlertDefinitionViewModel.prototype.afterApplyBindings = function () {
            AlertDefinitionViewModel.initialise(this.grids, this.editingItem);
        };

        AlertDefinitionViewModel.initialise = function (grids, editingItem) {
            var alertsGrid = grids.alertsDefinitions, messagesGrid = grids.currentMessages;

            messagesGrid.isVisible(false);

            alertsGrid.selected.item.subscribe(function (value) {
                if (value) {
                    messagesGrid.isVisible(true);
                    messagesGrid.refreshData(false, { selectedItem: value });
                }
            });
        };
        return AlertDefinitionViewModel;
    })(AnalyticsDefinitionViewModel);
    ag.AlertDefinitionViewModel = AlertDefinitionViewModel;

    var MappingProfilesHierarchicalViewModel = (function (_super) {
        __extends(MappingProfilesHierarchicalViewModel, _super);
        function MappingProfilesHierarchicalViewModel() {
            _super.apply(this, arguments);
        }
        MappingProfilesHierarchicalViewModel.prototype.afterApplyBindings = function () {
            MappingProfilesHierarchicalViewModel.initialise(this.grids, this.editingItem);
        };

        MappingProfilesHierarchicalViewModel.prototype.loadItem = function (result, isNewItem) {
            var _this = this;
            var deffered = _super.prototype.loadItem.call(this, result, isNewItem);

            deffered.always(function () {
                MappingProfilesHierarchicalViewModel.matchingCriteriaStaticInit(_this.grids.matchingCriteria);
            });

            return deffered;
        };

        MappingProfilesHierarchicalViewModel.matchingCriteriaStaticInit = function (matchingCriteria) {
            MappingProfilesHierarchicalViewModel.reorderTheMatchingCriteriaColumns(matchingCriteria);
            MappingProfilesHierarchicalViewModel.matchingCriteriaOrderedColumns = ko.mapping.toJS(matchingCriteria.views.visibleColumns.slice(1));
        };

        MappingProfilesHierarchicalViewModel.initialise = function (grids, gridViewModelContext) {
            var matchingCriteria = grids.matchingCriteria, settings = grids.settings;

            // Update grid context
            matchingCriteria.viewModel = gridViewModelContext;
            settings.viewModel = gridViewModelContext;

            matchingCriteria.editor.afterUpdate = function () {
                settings.refresh();
            };
            MappingProfilesHierarchicalViewModel.matchingCriteriaOrderedColumns = ko.mapping.toJS(matchingCriteria.views.visibleColumns.slice(1));
            matchingCriteria["reorderColumnsAfterInvokeCallback"] = function () {
                matchingCriteria.views.visibleColumns([ko.mapping.toJS(matchingCriteria.views.visibleColumns()[0])].concat(ko.mapping.toJS(MappingProfilesHierarchicalViewModel.matchingCriteriaOrderedColumns)));

                // Update the latest position value into the editingItem
                _.each(ko.mapping.toJS(matchingCriteria.columns).slice(1), function (item, index) {
                    _.each(MappingProfilesHierarchicalViewModel.positionKeyDictionary, function (keyValue) {
                        if (keyValue.key == item.key)
                            matchingCriteria.viewModel[keyValue.value](index + 1);
                    });
                });
            };
        };

        MappingProfilesHierarchicalViewModel.reorderTheMatchingCriteriaColumns = function (matchingCriteria) {
            var findPosition = function (columnObservable) {
                var keyValueObj = undefined;
                _.find(MappingProfilesHierarchicalViewModel.positionKeyDictionary, function (keyValue) {
                    if (keyValue.key == ko.unwrap(columnObservable.key)) {
                        keyValueObj = keyValue;
                        return true;
                    }
                    return false;
                });

                if (!keyValueObj)
                    return 0;

                return matchingCriteria.viewModel[keyValueObj.value]();
            };

            matchingCriteria.views.visibleColumns.sort(function (left, right) {
                var leftPositionIndex = findPosition(left);
                var rightPositionIndex = findPosition(right);

                return leftPositionIndex == rightPositionIndex ? 0 : leftPositionIndex < rightPositionIndex ? -1 : 1;
            });
        };
        MappingProfilesHierarchicalViewModel.positionKeyDictionary = [
            { key: "counterparty", value: "counterpartyPosition" },
            { key: "currency", value: "currencyPosition" },
            { key: "entity", value: "entityPosition" },
            { key: "instrument", value: "instrumentPosition" },
            { key: "transactionType", value: "transactionTypePosition" },
            { key: "yieldCurve", value: "yieldCurvePosition" },
            { key: "issuer", value: "issuerPosition" },
            { key: "unitIssue", value: "unitIssuePosition" }
        ];
        return MappingProfilesHierarchicalViewModel;
    })(AnalyticsDefinitionViewModel);
    ag.MappingProfilesHierarchicalViewModel = MappingProfilesHierarchicalViewModel;

    var ScenarioDefinitionViewModel = (function (_super) {
        __extends(ScenarioDefinitionViewModel, _super);
        function ScenarioDefinitionViewModel() {
            _super.apply(this, arguments);
        }
        ScenarioDefinitionViewModel.prototype.beforeApplyBindings = function () {
            ScenarioDefinitionViewModel.initialise(this.grids, this.editingItem, this);
        };

        ScenarioDefinitionViewModel.initialise = function (grids, editingItem, viewModel) {
            var scenarioGrid = grids.scenarioDefinitions, curveGrid = grids.currentCurves, pointGrid = grids.currentPoints;

            curveGrid.viewModel = editingItem;

            curveGrid.isVisible(false);
            pointGrid.isVisible(false);

            scenarioGrid.items.subscribe(function (value) {
                if (value.length === 0) {
                    curveGrid.isVisible(false);
                    pointGrid.isVisible(false);
                }
            });

            scenarioGrid.selected.item.subscribe(function (value) {
                if (!value)
                    return;

                if (editingItem.currentDefinitionKey() == value.key)
                    return;

                editingItem.currentDefinitionKey(value.key);

                curveGrid.isVisible(true);
                curveGrid.clearData();
                curveGrid.reset();
                curveGrid.refreshData(false, { selectedItem: value });
                pointGrid.isVisible(false);
                pointGrid.clearData();
            });

            curveGrid.items.subscribe(function (value) {
                if (value.length === 0) {
                    pointGrid.isVisible(false);
                }
            });

            curveGrid.selected.item.subscribe(function (value) {
                if (value) {
                    if (editingItem.currentCurveKey() === value.key)
                        return;

                    editingItem.currentCurveKey(value.key);
                    pointGrid.isVisible(true);
                    pointGrid.reset();
                    pointGrid.refreshData(false, { selectedItem: value });
                    $('#ratesTabHeader a').click();
                }
            });

            var curveGridEditor = curveGrid.editor, pointGridEditor = pointGrid.editor, scenarioGridEditor = scenarioGrid.editor, interpolateAction = pointGrid.actions.interpolate;

            scenarioGridEditor.afterUpdate = function () {
                pointGrid.refresh(false);
                $('#ratesTabHeader a').click();
            };

            curveGridEditor.afterUpdate = function () {
                pointGrid.refresh();
                $('#ratesTabHeader a').click();
            };

            pointGridEditor.afterUpdate = function () {
                curveGrid.refresh();
            };

            interpolateAction.afterInvoke = function () {
                curveGrid.refresh();
            };

            viewModel.scenarioGraph = new ag.risk.ScenarioGraphViewModel(pointGrid);
        };
        return ScenarioDefinitionViewModel;
    })(AnalyticsDefinitionViewModel);
    ag.ScenarioDefinitionViewModel = ScenarioDefinitionViewModel;

    var FiltersDefinitionViewModel = (function (_super) {
        __extends(FiltersDefinitionViewModel, _super);
        function FiltersDefinitionViewModel() {
            _super.apply(this, arguments);
        }
        FiltersDefinitionViewModel.prototype.saveItem = function (clearAfter) {
            var _this = this;
            if (typeof clearAfter === "undefined") { clearAfter = false; }
            return _super.prototype.saveItem.call(this, clearAfter).done(function () {
                if (!clearAfter)
                    return;

                _this.filters.selectedFilters([]);
                var g = _this.filters.selectedFilterGroup();
                g.matches([]);
                $('a[data-bind*="filters.getFieldsUrl"].btn').closest('div.filter').remove();
                $('label[data-bind*="filters.selectMatch"]').removeClass('selected');
            });
        };
        return FiltersDefinitionViewModel;
    })(AnalyticsDefinitionViewModel);
    ag.FiltersDefinitionViewModel = FiltersDefinitionViewModel;

    var TimeProfilesHierarchicalViewModel = (function (_super) {
        __extends(TimeProfilesHierarchicalViewModel, _super);
        function TimeProfilesHierarchicalViewModel() {
            _super.apply(this, arguments);
        }
        TimeProfilesHierarchicalViewModel.prototype.afterApplyBindings = function () {
            TimeProfilesHierarchicalViewModel.initialise(this.editingItem);
        };

        TimeProfilesHierarchicalViewModel.initialise = function (editingItem) {
            var delegate = function () {
                _.each($("#hedgeEquivalents tr td:last-child"), function (td) {
                    $(td).children("button").show();
                    $(td).children("i").hide();
                });

                var disabledValues = _.map(editingItem.bucketDefinitions(), function (timeProfileRowInner) {
                    return timeProfileRowInner.hedge();
                });

                disabledValues = _.filter(disabledValues, function (target) {
                    return parseInt(target) !== NaN;
                });

                _.each($("#hedgeEquivalents tr input[data-bind*='numberOfBuckets']"), function (input) {
                    var value = $(input).val(), match = _.find(disabledValues, function (disabledValue) {
                        return value == disabledValue;
                    });

                    if (!match)
                        return;

                    var lasttd = $(input).closest("td").next("td");
                    lasttd.children("button").hide();
                    lasttd.children("i").show();
                });
            };

            editingItem.hedgeEquivalents.subscribeChanged(function (newValues, oldValues) {
                // remove item, we don't need do anything
                if (oldValues.length > newValues.length)
                    return;

                var array = ko.mapping.toJS(newValues);

                if (!array || array.length == 0 || array.length == 1)
                    return;

                if (newValues[array.length - 1].numberOfBuckets() != 1)
                    return;

                var currentMaxNumberOfBuckets = _.max(array, function (temp) {
                    return temp.numberOfBuckets;
                });

                newValues[array.length - 1].numberOfBuckets(currentMaxNumberOfBuckets.numberOfBuckets + 1);
            });

            editingItem.bucketDefinitions.subscribe(function (values) {
                _.each(values, function (timeProfileRow) {
                    timeProfileRow.hedge.subscribe(function () {
                        delegate();
                    });
                });

                delegate();
            });
        };
        return TimeProfilesHierarchicalViewModel;
    })(AnalyticsDefinitionViewModel);
    ag.TimeProfilesHierarchicalViewModel = TimeProfilesHierarchicalViewModel;
})(ag || (ag = {}));
