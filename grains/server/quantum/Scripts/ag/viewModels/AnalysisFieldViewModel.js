/// <reference path="../../ts/global.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var AnalysisFieldData = (function (_super) {
        __extends(AnalysisFieldData, _super);
        function AnalysisFieldData(options) {
            _super.call(this, options);

            this.index = ko.observable(options.index);
        }
        return AnalysisFieldData;
    })(ag.FieldData);
    ag.AnalysisFieldData = AnalysisFieldData;

    var AnalysisField = (function () {
        function AnalysisField(index, fields, analysisFieldCaptions, caption) {
            if (typeof caption === "undefined") { caption = ''; }
            var _this = this;
            this.index = ko.observable(index);
            this.fields = ko.observableArray(fields);
            this.caption = ko.observable(caption || '');
            this.caption.subscribe(function (newValue) {
                analysisFieldCaptions()[_this.index() - 1] = newValue;
            });

            this.fieldName = ko.computed(function () {
                return 'Column ' + _this.index();
            });

            this.usedSubQueries = ko.computed(function () {
                return _.map(_this.fields(), function (f) {
                    return ko.unwrap(f.subQuery);
                });
            });
        }
        return AnalysisField;
    })();
    ag.AnalysisField = AnalysisField;

    var AnalysisFieldViewModel = (function () {
        function AnalysisFieldViewModel(editingQuery, serviceUrl) {
            var _this = this;
            this.fieldsTrigger = ko.observable();
            this.analysisFields = editingQuery.analysisFields;
            this.analysisFieldCaptions = editingQuery.analysisFieldCaptions;
            this.sourceFieldLookupSource = "/{0}/{1}".format(serviceUrl, "getanalysissourcefields");

            this.fields = ko.computed(function () {
                var trigger = _this.fieldsTrigger();
                var fieldGroups = _.groupBy(_this.analysisFields(), function (af) {
                    return ko.unwrap(af.index);
                });

                var result = [];
                _.forOwn(fieldGroups, function (value, key) {
                    result.push(new AnalysisField(parseInt(key), value, _this.analysisFieldCaptions));
                });

                _.forEach(_this.analysisFieldCaptions(), function (value, captionIndex) {
                    var index = captionIndex + 1;
                    var existing = _.find(result, function (r) {
                        return r.index() === index;
                    });
                    if (existing) {
                        existing.caption(value);
                    } else if (value !== undefined && value !== null) {
                        result.push(new AnalysisField(index, [], _this.analysisFieldCaptions, value));
                    }
                });

                return _.sortBy(result, function (r) {
                    return ko.unwrap(r.index);
                });
            });

            this.indexes = ko.computed(function () {
                return _.map(_this.fields(), function (f) {
                    return ko.unwrap(f.index);
                });
            });

            this.remainingIndexes = ko.computed(function () {
                return _.difference(_.range(1, 11), _this.indexes());
            });

            this.addFieldCommand = ko.command({
                execute: function () {
                    _this.addField();
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.remainingIndexes().length > 0;
                }
            });
        }
        AnalysisFieldViewModel.prototype.addField = function (index) {
            if (index === undefined) {
                var remaining = this.remainingIndexes();
                if (remaining.length === 0)
                    return;

                index = _.min(remaining);
            }

            var captions = this.analysisFieldCaptions(), captionIndex = index - 1, caption = captions[captionIndex];
            if (caption !== undefined && caption !== null)
                return;

            captions[captionIndex] = '';
            this.fieldsTrigger.valueHasMutated();
        };

        AnalysisFieldViewModel.prototype.update = function (items, index) {
            var _this = this;
            _.each(items, function (item) {
                item['index'] = index;
                _this.analysisFields.push(ko.mapping.fromJS(item));
            });
        };

        AnalysisFieldViewModel.prototype.remove = function (item) {
            this.analysisFields.remove(item);
        };

        AnalysisFieldViewModel.prototype.removeField = function (index) {
            var _this = this;
            var toRemove = _.filter(this.analysisFields(), function (f) {
                return f.index() === index;
            });

            _.each(toRemove, function (f) {
                _this.analysisFields.remove(f);
            });

            this.analysisFieldCaptions()[index - 1] = null;
            this.fieldsTrigger.valueHasMutated();
        };
        return AnalysisFieldViewModel;
    })();
    ag.AnalysisFieldViewModel = AnalysisFieldViewModel;
})(ag || (ag = {}));
