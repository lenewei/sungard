var ag;
(function (ag) {
    "use strict";

    var FiltersViewModel = (function () {
        function FiltersViewModel(options) {
            this.options = options;
            this.selectedFilter = ko.observable();
            this.selectedFilterGroup = ko.observable();
            this.filterToFocus = ko.observable();
            this.availableOperators = options.availableOperators || {};

            this.selectedFilter.equalityComparer = ag.utils.strictEqualityComparer;
            this.selectedFilterGroup.equalityComparer = ag.utils.strictEqualityComparer;

            this.selectedFilters = ko.computed(this.computeSelectedFilters, this).extend({ rateLimit: ag.utils.getRateLimitOption() });
        }
        FiltersViewModel.prototype.computeSelectedFilters = function () {
            return this.selectedFilterGroup() ? this.getFilters(this.selectedFilterGroup()) : [];
        };

        FiltersViewModel.prototype.updateOperator = function (newValue) {
            // "this" is effectively a FilterData object
            var oldValue = this.operator.peek(), multiValueOperators = [ag.constants.OperatorType.OneOf, ag.constants.OperatorType.NotOneOf];

            // If the operator changes and we are going from a single-select style operator
            // to a mult-select style (or vice versa) update the values of the value1 and multiValue1 appropriately.
            var oldWasMulti = multiValueOperators.indexOf(oldValue) > -1, newIsMulti = multiValueOperators.indexOf(newValue) > -1;

            // single-value => multi-value
            if (!oldWasMulti && newIsMulti) {
                // Convert value1 to an array (if not already) and set at the value of multiValue1
                var newMultiValue1 = this.value1.peek();
                if (_.isArray(newMultiValue1))
                    this.multiValue1(newMultiValue1);
                else
                    this.multiValue1((!ag.isNullOrUndefined(newMultiValue1) ? [newMultiValue1] : []));
            }

            // multi-value => single-value
            if (oldWasMulti && !newIsMulti) {
                var newValue1 = null, multiValue1 = this.multiValue1.peek();

                // If there are any values in the multiValue1 take the first and put it in value1
                if (multiValue1.length > 0)
                    newValue1 = multiValue1[0];

                this.value1(newValue1);
            }

            // Set the new value
            this.operator(newValue);
        };

        FiltersViewModel.isEnum = function (filter) {
            return ko.unwrap(filter.dataType) === "enum";
        };

        FiltersViewModel.prototype.singleValueSelected = function (data) {
            var isEnum = FiltersViewModel.isEnum(this), prop = "name", newValue = data, getValueFromObject = function (item) {
                if (isEnum)
                    return item;

                if (_.isObject(item) && item[prop])
                    return item[prop];

                return null;
            };

            if (_.isArray(data) && data.length > 0)
                newValue = getValueFromObject(data[0]);
            else if (_.isObject(data))
                newValue = getValueFromObject(data);
            else if (newValue === "")
                newValue = null;

            // "this" is effectively a FilterData object
            this.value1(newValue);

            // New single value selected, clear the multi value
            this.multiValue1([]);
        };

        FiltersViewModel.prototype.isSingleValueOperator = function (operatorObs) {
            var operatorType = ag.constants.OperatorType, operator = ko.unwrap(operatorObs);

            return operator === operatorType.EqualTo || operator === operatorType.NotEqualTo || operator === operatorType.LessThan || operator === operatorType.NotLessThan || operator === operatorType.GreaterThan || operator === operatorType.NotGreaterThan || operator === operatorType.Contains || operator === operatorType.DoesNotContain || operator === operatorType.OneOfData || operator === operatorType.NotOneOfData;
        };

        FiltersViewModel.prototype.isRangeOperator = function (operatorObs) {
            var operatorType = ag.constants.OperatorType, operator = ko.unwrap(operatorObs);

            return operator === operatorType.Between || operator === operatorType.NotBetween;
        };

        FiltersViewModel.prototype.isSelectionOperator = function (operatorObs) {
            var operatorType = ag.constants.OperatorType, operator = ko.unwrap(operatorObs);

            return operator === operatorType.OneOf || operator === operatorType.NotOneOf;
        };

        FiltersViewModel.prototype.isStringLookup = function (data) {
            if (ko.unwrap(data.dataType) === 'string') {
                var operatorVal = ko.unwrap(data.operator);
                if (operatorVal == ag.constants.OperatorType.OneOfData || operatorVal == ag.constants.OperatorType.NotOneOfData)
                    return true;
            }

            return false;
        };

        FiltersViewModel.prototype.getOperatorLabel = function (operator) {
            return this.availableOperators[ko.unwrap(operator)];
        };

        FiltersViewModel.prototype.setMatchAll = function (parents, filterGroup) {
            if (this.isDescendant(parents))
                filterGroup.all(true);
        };

        FiltersViewModel.prototype.setMatchAny = function (parents, filterGroup) {
            if (this.isDescendant(parents))
                filterGroup.all(false);
        };

        FiltersViewModel.prototype.removeBranch = function (parents, filterGroup) {
            if (!this.isDescendant(parents))
                return;

            this.selectedFilterGroup(null);
            parents[0].matches.remove(filterGroup);
        };

        FiltersViewModel.prototype.addBranch = function () {
            var newFilterGroup = this.createFilterGroup(!this.selectedFilterGroup().all());
            this.addToSelectedFilterGroup([newFilterGroup]);
        };

        FiltersViewModel.prototype.createFilterGroup = function (all) {
            if (typeof all === "undefined") { all = false; }
            return ko.mapping.fromJS({
                all: all,
                matches: []
            });
        };

        FiltersViewModel.prototype.addFilters = function (explorerItems) {
            this.addToSelectedFilterGroup(_.map(explorerItems, function (item) {
                item.key = item.internalName;
                item.displayName = item.fullDisplayName;
                item.dataType = item.fieldType.toLowerCase();
                item.isLink = false;
                item.subQueryName = '';

                return ag.filters.buildFilter(item, true);
            }));
        };

        FiltersViewModel.prototype.addFilterLinks = function (explorerItems) {
            this.addToSelectedFilterGroup(_.map(explorerItems, function (item) {
                item.key = item.internalName;
                item.isLink = true;
                item.operator = 0;
                item.dataType = '';
                item.isParameter = true;
                item.subQueryName = '';

                return ko.mapping.fromJS(item);
            }));
        };

        FiltersViewModel.prototype.addToSelectedFilterGroup = function (items) {
            var selectedFilterGroup = this.selectedFilterGroup(), lastItem = _.last(items);

            _.each(items, function (item) {
                selectedFilterGroup.matches.push(item);
            });

            if (lastItem) {
                if (this.isFilterGroup(lastItem))
                    this.selectMatch(lastItem, null);
                else
                    this.selectMatch(selectedFilterGroup, lastItem);
            }
        };

        FiltersViewModel.prototype.selectMatch = function (group, filter) {
            this.selectedFilterGroup(group);
            this.selectedFilter(filter);
            this.filterToFocus(filter);
        };

        FiltersViewModel.prototype.isDescendant = function (parents) {
            return parents.length > 1;
        };

        FiltersViewModel.prototype.getFilters = function (group) {
            var _this = this;
            var result = [];

            _.each(group.matches(), function (match) {
                if (_this.isFilterGroup(match)) {
                    _.each(_this.getFilters(match), function (m) {
                        result.push(m);
                    });
                } else {
                    result.push(match);
                }
            });

            return result;
        };

        FiltersViewModel.prototype.isFilterGroup = function (item) {
            return !_.isUndefined(item.all);
        };

        FiltersViewModel.prototype.isSelectedGroup = function (group) {
            if (this.selectedFilter()) {
                return false;
            }

            if (this.selectedFilterGroup()) {
                return this.selectedFilterGroup() === group;
            }

            return false;
        };

        FiltersViewModel.prototype.isSelected = function (filter) {
            if (this.selectedFilter()) {
                return this.selectedFilter().key() === filter.key();
            }

            return false;
        };

        FiltersViewModel.prototype.getFieldsUrl = function () {
            return "{0}{1}/{2}/{3}".format(ag.siteRoot, this.options.area || ag.area, this.options.controller || ag.controller, this.options.fieldsAction || "getQueryFields");
        };

        FiltersViewModel.prototype.getLinksUrl = function () {
            return "{0}{1}/{2}/{3}".format(ag.siteRoot, this.options.area || ag.area, this.options.controller || ag.controller, this.options.linksAction || "getFilterLinks");
        };

        FiltersViewModel.prototype.getFilterDisplayValue = function (filter) {
            return this.isRangeOperator(filter.operator) ? ag.filters.getRangeFilterDisplayValue(ko.unwrap(filter.value1), ko.unwrap(filter.value2), ko.unwrap(filter.dataType)) : ag.filters.getSingleFilterDisplayValue(ko.unwrap(filter.value1), ko.unwrap(filter.dataType));
        };

        FiltersViewModel.prototype.createFocusHandler = function (filter, parent, element) {
            var _this = this;
            if (!this.isFilterGroup(parent))
                return false;

            return ko.computed({
                read: function () {
                    return _this.filterToFocus() === filter;
                },
                write: function (hasFocus) {
                    if (hasFocus)
                        _this.selectMatch(parent, filter);
                },
                disposeWhenNodeIsRemoved: element
            }).extend({ notify: 'always' });
        };
        return FiltersViewModel;
    })();
    ag.FiltersViewModel = FiltersViewModel;
})(ag || (ag = {}));
