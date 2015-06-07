/// <reference path="../../ts/global.d.ts" />\
var ag;
(function (ag) {
    var ColumnsEditorViewModel = (function () {
        function ColumnsEditorViewModel(selectedView, opts, reportProxy) {
            if (typeof reportProxy === "undefined") { reportProxy = new ag.ReportProxy(); }
            this.selectedView = selectedView;
            this.reportProxy = reportProxy;
            this.trackUnusedCalculatedFieldsEnabled = true;
            this.options = _.extend({}, { hasCalculatedFields: false }, opts);

            this.trackUnusedCalculatedFields(); //do this before the lines below to prevent the computed from being called multiple times

            this.hasCalculatedFields = this.options.hasCalculatedFields;
            this.queryFields = ko.computed(this.computeQueryFields, this);
            this.calculatedFields = ko.computed(this.computeCalculatedFields, this);
        }
        ColumnsEditorViewModel.prototype.trackUnusedCalculatedFields = function () {
            var _this = this;
            //ugly solution for storing unused calculated fields so that the user can use it in a dimension later
            //When a calculated field is removed from a dimension, it is added to the unused calculated fields collection
            //When a calculated field is added to a dimension, it is removed from the unused calculated fields collection
            if (this.options.hasCalculatedFields) {
                ko.computed(function () {
                    //we know/assume that the view type never changes
                    _.each(ag.ViewData.getVisibleDimensions(_this.selectedView()), function (dimension) {
                        _this.trackUnusedCalculatedFieldsInDimension(dimension);
                    });
                });
            }
        };

        ColumnsEditorViewModel.prototype.trackUnusedCalculatedFieldsInDimension = function (dimension) {
            var _this = this;
            //no need to unsubscribe since ColumnsEditorsViewModel outlives the selected view
            dimension.subscribe(function (changes) {
                if (_this.trackUnusedCalculatedFieldsEnabled) {
                    _.each(changes, function (change) {
                        if (!change.moved && ko.unwrap(change.value.calculatedField) === true) {
                            if (change.status === "deleted") {
                                //calculated field is no longer used. create a copy then add it to unusedCalculatedFields
                                _this.createAndAddUnusedCalculatedField(change.value);
                            } else if (change.status === "added") {
                                //calculated field with same key is added. remove the field that has the same key from unusedCalculatedFields
                                _this.removeUnusedCalculatedFieldByKey(change.value.key());
                            }
                        }
                    });
                }
            }, null, "arrayChange");
        };

        ColumnsEditorViewModel.prototype.createAndAddUnusedCalculatedField = function (field) {
            var downcastedField = ko.mapping.fromJS(new ag.FieldData(ko.mapping.toJS(field)));
            var view = this.selectedView();

            var existingField = _.find(view.unusedCalculatedFields(), function (i) {
                return i.key() === downcastedField.key();
            });
            if (!_.isUndefined(existingField)) {
                view.unusedCalculatedFields.replace(existingField, downcastedField);
            } else {
                view.unusedCalculatedFields.push(downcastedField);
            }
        };

        ColumnsEditorViewModel.prototype.removeUnusedCalculatedFieldByKey = function (fieldKey) {
            this.selectedView().unusedCalculatedFields.remove(function (i) {
                return i.key() === fieldKey;
            });
        };

        ColumnsEditorViewModel.prototype.computeQueryFields = function () {
            var includeHiddenFields = this.selectedView().viewType() !== 0 /* DataView */;
            var queryFields = _.filter(ag.ViewData.getSelectedFields(this.selectedView()), function (field) {
                return (includeHiddenFields || !field.hidden()) && !field.calculatedField();
            });

            return _.sortBy(queryFields, function (field) {
                var expression = ko.unwrap(field.expression);
                return expression && expression.toLowerCase();
            });
        };

        ColumnsEditorViewModel.prototype.computeCalculatedFields = function () {
            var view = this.selectedView();
            var calculatedFields = ag.ViewData.getCalculatedFields(view);

            //when loading for the first time, sort the fields by display name
            if (view.sortedCalculatedFieldKeys() == null) {
                view.sortedCalculatedFieldKeys(this.sortFieldKeysByDisplayName(calculatedFields));
            }

            //if not first load, retain the previous sort. New fields are added at the bottom
            return _.sortBy(calculatedFields, function (field) {
                var index = _.findIndex(view.sortedCalculatedFieldKeys(), function (key) {
                    return key === field.key();
                });
                return index > -1 ? index : field.key();
            });
        };

        ColumnsEditorViewModel.prototype.sortFieldKeysByDisplayName = function (fields) {
            //TODO: support localization in the sorting?
            var sortedFields = _.sortBy(fields, function (field) {
                return field.displayName().toLowerCase();
            });
            return _.map(sortedFields, function (field) {
                return field.key();
            });
        };

        ColumnsEditorViewModel.prototype.addNewCalculatedField = function () {
            var _this = this;
            var view = this.selectedView();

            if (view.viewType() === 0 /* DataView */) {
                this.reportProxy.getCalculatedFieldTemplate().then(function (fieldOptionsTemplate) {
                    view.fields.push(ko.mapping.fromJS(new ag.FieldData(_this.addUniqueFieldOptions(fieldOptionsTemplate))));
                });
            } else if (view.viewType() === 2 /* Pivot */ || view.viewType() === 3 /* Chart */) {
                this.reportProxy.getCalculatedAggregateFieldTemplate().then(function (fieldOptionsTemplate) {
                    view.aggregateOn.push(ko.mapping.fromJS(new ag.AggregateFieldData(_this.addUniqueFieldOptions(fieldOptionsTemplate))));
                });
            } else {
                throw new Error("Unknown view type");
            }
        };

        ColumnsEditorViewModel.prototype.addUniqueFieldOptions = function (fieldOptions) {
            fieldOptions.displayName = ag.utils.ensureUniqueName(ag.strings.untitledColumn, ko.mapping.toJS(this.calculatedFields()), "displayName");
            fieldOptions.key = this.generateNextCalculatedFieldKey();
            return fieldOptions;
        };

        ColumnsEditorViewModel.prototype.generateNextCalculatedFieldKey = function () {
            //First character in key must be lowercase and not be a number!
            //Key must contain parenthesis so that it will be parsed by the system.
            //Temporary workaround until system can accept calculated fields with arbitrary keys
            var calculatedFields = ag.ViewData.getCalculatedFields(this.selectedView());

            var identities = _.map(calculatedFields, function (i) {
                var match = /^c\((\d+)$/.exec(i.key());
                return match != null ? _.parseInt(match[1]) : 0;
            });

            var highestIdentity = _.chain(identities).sortBy(function (i) {
                return i;
            }).last().value();
            var nextIdentity = (highestIdentity || 0) + 1;

            var zeros = "0000000";
            return "c(" + (zeros + nextIdentity).slice(zeros.length * -1);
        };

        //really remove the calculated field
        ColumnsEditorViewModel.prototype.removeCalculatedField = function (field) {
            try  {
                this.trackUnusedCalculatedFieldsEnabled = false;

                _.each(ag.ViewData.getVisibleDimensions(this.selectedView()), function (dimension) {
                    dimension.remove(field);
                });
            } finally {
                this.trackUnusedCalculatedFieldsEnabled = true;
            }

            this.removeUnusedCalculatedFieldByKey(field.key());
        };

        //used in expression dialog
        ColumnsEditorViewModel.prototype.getExpressionValidateExtraRequestData = function (field) {
            return ko.mapping.toJS({
                viewTableKey: this.selectedView().viewTableKey,
                otherFields: _.xor(_.union(ag.ViewData.getSelectedFields(this.selectedView()), this.selectedView().unusedCalculatedFields()), [field])
            });
        };

        //used in expression dialog
        ColumnsEditorViewModel.prototype.getExpressionDataTypeExtraRequestData = function () {
            return ko.mapping.toJS({
                viewTableKey: this.selectedView().viewTableKey
            });
        };

        //used in expression dialog
        ColumnsEditorViewModel.prototype.getExpressionLookupExtraRequestData = function () {
            return ko.mapping.toJS({
                viewTableKey: this.selectedView().viewTableKey,
                selectedQueryFields: ag.ViewData.getSelectedFields(this.selectedView())
            });
        };
        return ColumnsEditorViewModel;
    })();
    ag.ColumnsEditorViewModel = ColumnsEditorViewModel;
})(ag || (ag = {}));
