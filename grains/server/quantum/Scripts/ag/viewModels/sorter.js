/// <reference path="views.ts" />
/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    var SorterViewModel = (function () {
        function SorterViewModel(views, gridMode) {
            var _this = this;
            this.views = views;
            this.gridMode = gridMode;
            this.changed = ko.observable(+new Date());
            this.gridSortOn = ko.observable("");
            this.gridSortDesc = ko.observable(false);
            this.gridAlphanumSort = ko.observable(false);
            this.gridSortMode = ko.observable(gridMode);

            if (views === undefined || views === null)
                return;

            this.sortFields = ko.observableArray(this.calculateSortFields());
            this.visibleFields = ko.observableArray(this.calculateVisibleFields());

            this.refreshColumnsComputed = ko.computed(function () {
                if (!_this.views.selected())
                    return;
                _this.sortFields(_this.calculateSortFields());
                _this.visibleFields(_this.calculateVisibleFields());
            }).extend({ rateLimit: ag.utils.getRateLimitOption() });

            this.activeSortFields = ko.computed(function () {
                if (_this.gridSortMode()) {
                    if (_this.views)
                        return _.filter(_this.views.selectedFields(), function (i) {
                            return i.key() === _this.gridSortOn();
                        });

                    return [];
                }
                return _this.sortFields();
            });
        }
        SorterViewModel.prototype.updateUnderlyingFields = function (sortedFields) {
            var _this = this;
            var mappedFields = _.map(sortedFields, function (field) {
                var mappedField = {
                    key: ko.unwrap(field.key),
                    sortStrategy: ko.unwrap(field.sortStrategy)
                };
                return mappedField;
            });

            // Reset the sorting on view fields
            _.each(this.views.selected().fields(), function (field) {
                field.sortStrategy(0);
                field.sortOrder(0);
            });

            // Set the sorting properties from the current set of selected sort fields
            _.each(mappedFields, function (field, index) {
                var fieldKey = field.key;
                var selectedField = _.find(_this.views.selected().fields(), function (f) {
                    return f.key() === fieldKey;
                });

                if (selectedField) {
                    selectedField.sortStrategy(field.sortStrategy);
                    selectedField.sortOrder(index);
                }
            });
        };

        SorterViewModel.prototype.updateSortFields = function (fields) {
            var _this = this;
            if (this.views === undefined || this.views === null)
                return;

            //selected fields
            _.each(fields, function (field) {
                var unwrappedField = ko.mapping.toJS(field);
                var selectedField = _.find(_this.views.selected().fields(), function (f) {
                    return ko.unwrap(f.key) === unwrappedField.key;
                });

                if (selectedField === undefined) {
                    field.hidden = true;
                    field.sortStrategy = 1;
                    field.sortOrder = 0;
                    _this.views.selected().fields.push(ko.mapping.fromJS(new ag.FieldData(field)));
                } else {
                    if (field.sortStrategy === undefined) {
                        field.sortStrategy = ko.observable(1);
                    } else if (ko.isObservable(field.sortStrategy)) {
                        field.sortStrategy(1);
                    } else
                        field.sortStrategy = 1;
                }
            });

            //deselected fields
            _.each(this.views.selected().fields().slice(0), function (field) {
                var unwrappedField = ko.mapping.toJS(field);
                var selectedField = _.find(fields, function (f) {
                    return ko.unwrap(f.key) === unwrappedField.key;
                });

                if (selectedField === undefined) {
                    if (field.hidden() === true) {
                        _this.views.selected().fields.remove(field);
                    }
                }
            });

            this.updateUnderlyingFields(fields);
            this.refreshColumnsComputed();
            this.sortChanged();
        };

        SorterViewModel.prototype.updateVisibleFields = function (fields) {
            var _this = this;
            if (this.views == null)
                return;

            //selected fields
            _.each(fields, function (field) {
                var unwrappedField = ko.mapping.toJS(field);
                var selectedField = _.find(_this.views.selected().fields(), function (f) {
                    return ko.unwrap(f.key) === unwrappedField.key;
                });

                if (selectedField == null) {
                    unwrappedField.sortStrategy = 0;
                    unwrappedField.sortOrder = 0;
                    unwrappedField.hidden = false;
                    _this.views.selected().fields.push(ko.mapping.fromJS(new ag.FieldData(unwrappedField)));
                } else {
                    selectedField.hidden(false);
                }
            });

            //deselected fields
            _.each(this.views.selected().fields().slice(0), function (field) {
                var unwrappedField = ko.mapping.toJS(field);
                var selectedField = _.find(fields, function (f) {
                    return ko.unwrap(f.key) === unwrappedField.key;
                });

                if (selectedField === undefined) {
                    if (field.sortStrategy() > 0) {
                        field.hidden(true);
                    } else {
                        _this.views.selected().fields.remove(field);
                    }
                }
            });

            this.refreshColumnsComputed();
        };

        SorterViewModel.prototype.changeDesc = function (field) {
            var sortFields = this.calculateSortFields();
            var sortField = _.find(sortFields, function (f) {
                return f.key() === field.key();
            });

            if (sortField) {
                var previous = sortField.sortStrategy();
                sortField.sortStrategy(previous === 1 ? 2 : 1);

                this.updateUnderlyingFields(sortFields);
                this.refreshColumnsComputed();
            }
        };

        SorterViewModel.prototype.calculateSortFields = function () {
            if (this.views !== undefined && this.views !== null && !this.views.selected())
                return [];

            return _.chain(this.views.selected().fields()).filter(function (field) {
                return field.sortStrategy() > 0;
            }).sortBy(function (field) {
                return field.sortOrder();
            }).value();
        };

        SorterViewModel.prototype.calculateVisibleFields = function () {
            if (this.views !== undefined && this.views !== null && !this.views.selected())
                return [];

            return _.filter(this.views.selected().fields(), function (field) {
                return !field.hidden();
            });
        };

        SorterViewModel.prototype.removeVisibleField = function (fieldToRemove) {
            if (fieldToRemove.sortStrategy() > 0) {
                // just hide it
                fieldToRemove.hidden(true);
            } else {
                this.views.selected().fields.remove(fieldToRemove);
            }
            this.refreshColumnsComputed();
            return false;
        };

        SorterViewModel.prototype.removeSortField = function (fieldToRemove) {
            this.sortFields.remove(fieldToRemove);
            if (fieldToRemove.hidden() === true) {
                this.views.selected().fields.remove(fieldToRemove);
            }

            this.updateUnderlyingFields(this.sortFields());
            this.refreshColumnsComputed();
            this.sortChanged();

            return false;
        };

        SorterViewModel.prototype.sortOptions = function () {
            var _this = this;
            if (this.gridSortMode()) {
                var fieldData;
                if (this.views) {
                    var unwrapfields = ko.mapping.toJS(this.views.selectedFields());
                    fieldData = _.find(unwrapfields, function (field) {
                        if (field.key == _this.gridSortOn())
                            return true;
                    });
                }

                return {
                    'sortOptions[0].key': fieldData ? (fieldData.sortBy || this.gridSortOn()) : this.gridSortOn(),
                    'sortOptions[0].desc': this.gridSortDesc(),
                    'sortOptions[0].useAlphanumSorting': this.gridAlphanumSort()
                };
            }

            var result = {};

            if (this.sortFields) {
                _.each(this.sortFields(), function (column, index) {
                    result['sortOptions[' + index + '].key'] = column.sortBy() || column.key();
                    result['sortOptions[' + index + '].desc'] = column.sortStrategy() === 2;
                });
            }

            return result;
        };

        SorterViewModel.prototype.sortColumn = function (columnName) {
            if (this.gridSortMode() && this.gridSortDesc() && this.views) {
                this.gridSortMode(false);
                this.gridSortOn('');
                this.sortChanged();
                return;
            }

            this.gridSortMode(true);

            // Reset to first Page
            //self.pager.page(1);
            // Toggle sort direction or reset
            if (this.gridSortOn() === columnName)
                this.gridSortDesc(!this.gridSortDesc());
            else
                this.gridSortDesc(false);

            // Set the sort on column
            this.gridSortOn(columnName);
            this.gridAlphanumSort(_.indexOf(this.columnsNeedToUseAlphanumSort, columnName) != -1);
            this.sortChanged();
        };

        SorterViewModel.prototype.includesColumn = function (columnKey) {
            return _.any(this.activeSortFields(), function (field) {
                return field.key() === columnKey;
            });
        };

        SorterViewModel.prototype.sortChanged = function () {
            this.changed(+new Date());
        };

        SorterViewModel.prototype.afterVisibleMove = function (args, event, ui) {
            if (args.sourceParent !== args.targetParent)
                return;
            this.views.selected().fields.remove(args.item);
            this.views.selected().fields.splice(args.targetIndex, 0, args.item);
        };

        SorterViewModel.prototype.afterSortMove = function (args, event, ui) {
            if (args.sourceParent !== args.targetParent)
                return;
            _.each(this.sortFields(), function (column, index) {
                column.sortOrder(index);
            });
            this.sortChanged();
        };
        return SorterViewModel;
    })();
    ag.SorterViewModel = SorterViewModel;
})(ag || (ag = {}));
