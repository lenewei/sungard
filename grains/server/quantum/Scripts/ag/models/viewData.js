var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// Definition of ViewData, FieldData, FilterData client-side objects
// Strongly related to server-side versions but allows defaults to be set, and additional functionality added
var ag;
(function (ag) {
    function flagsTest(flagsValue, flag) {
        return (flagsValue & flag) == flag;
    }
    ag.flagsTest = flagsTest;

    var ViewData = (function () {
        function ViewData(options, retainHiddenFields) {
            if (typeof retainHiddenFields === "undefined") { retainHiddenFields = false; }
            var _this = this;
            this.key = options.key;
            this.clientKey = options.clientKey || options.key;
            this.parentKey = options.parentKey;
            this.parentClientKey = options.parentClientKey || options.parentKey;
            this.name = options.name;
            this.isComplete = options.isComplete || false;
            this.isDefault = options.isDefault || false;
            this.isSystem = options.isSystem || false;
            this.isPersonal = options.isPersonal || false;
            this.isGroup = options.isGroup || false;
            this.isPivot = options.isPivot || false;
            this.viewType = options.viewType || 0;
            this.viewTableKey = options.viewTableKey || "";
            this.showColumnGrandTotals = options.showColumnGrandTotals || false;
            this.showRowGrandTotals = options.showRowGrandTotals || false;
            this.visualisations = options.visualisations || [];
            this.outputToDatabase = options.outputToDatabase || false;
            this.tableName = options.tableName || '';
            this.failOnColumnMismatch = options.failOnColumnMismatch || false;
            this.failOnStringTruncation = options.failOnStringTruncation || false;
            this.keepLatestResultOnly = options.keepLatestResultOnly || false;
            this.skipMapTables = options.skipMapTables || false;
            this.crystalReports = [];
            this.chartType = options.chartType || 0;
            this.reportFileName = options.reportFileName || "";
            this.description = options.description || "";
            this.hasWritePermission = options.hasWritePermission;

            mapCollection(options.crystalReports, this.crystalReports, function (item) {
                return new RiskCrystalDefinition(item);
            });

            this.fields = [];
            if (_.isArray(options.fields) && options.fields.length > 0) {
                // Load the fields
                var fieldsTemp = options.fields;

                // Filter out hidden fields by default
                if (!retainHiddenFields) {
                    fieldsTemp = _.filter(fieldsTemp, function (item) {
                        return !item.hidden;
                    });
                }

                _.each(fieldsTemp, function (item) {
                    _this.fields.push(new FieldData(item));
                });
            }

            this.appliedFields = _.isArray(options.appliedFields) ? _.map(options.appliedFields, function (i) {
                return new FieldData(i);
            }) : _.cloneDeep(this.fields);

            this.filters = [];
            mapCollection(options.filters, this.filters, function (item) {
                return new FilterData(item);
            });

            this.groupColumnsBy = [];
            mapCollection(options.groupColumnsBy, this.groupColumnsBy, function (item) {
                return new ViewFieldData(item);
            });

            this.groupRowsBy = [];
            mapCollection(options.groupRowsBy, this.groupRowsBy, function (item) {
                return new ViewFieldData(item);
            });

            this.aggregateOn = [];
            mapCollection(options.aggregateOn, this.aggregateOn, function (item) {
                return new AggregateFieldData(item);
            });

            this.unusedCalculatedFields = [];
            mapCollection(options.unusedCalculatedFields, this.unusedCalculatedFields, function (item) {
                return new FieldData(item);
            });

            this.sortedCalculatedFieldKeys = options.sortedCalculatedFieldKeys;

            this.profileBy = ko.observable(options.profileBy ? new FieldData(options.profileBy) : null);

            this.profilePeriods = [];
            mapCollection(options.profilePeriods, this.profilePeriods, function (item) {
                return new ProfileData(item);
            });

            return this;
        }
        ViewData.updateGroupRowsBy = function (groupBy, items) {
            groupBy.removeAll();
            mapCollection(items, groupBy, function (item) {
                return ko.mapping.fromJS(new ViewFieldData(ko.mapping.toJS(item)));
            });
        };

        ViewData.updateAggregateOn = function (aggregateOn, items) {
            aggregateOn.removeAll();
            mapCollection(items, aggregateOn, function (item) {
                return ko.mapping.fromJS(new AggregateFieldData(ko.mapping.toJS(item)));
            });
        };

        ViewData.cssClassesForField = function (styleFlags) {
            if (!styleFlags)
                return "";

            var styles = [];
            if (flagsTest(styleFlags, 1 /* WrapText */))
                styles.push("wrap");

            if (flagsTest(styleFlags, 2 /* BorderLeft */))
                styles.push("border-left");

            if (flagsTest(styleFlags, 4 /* BorderRight */))
                styles.push("border-right");

            return styles.join(" ");
        };

        //get all calculated fields. including selected and unselected fields.
        ViewData.getCalculatedFields = function (view) {
            var usedCalculatedFields = _.filter(ViewData.getSelectedFields(view), function (field) {
                return field.calculatedField();
            });
            return _.union(usedCalculatedFields, view.unusedCalculatedFields());
        };

        //get all selected (but not applied) fields in the view.
        ViewData.getSelectedFields = function (view) {
            var dimensionValues = _.map(ViewData.getVisibleDimensions(view), function (dimension) {
                return dimension();
            });
            return _.union.apply(_, dimensionValues);
        };

        ViewData.getVisibleDimensions = function (view) {
            switch (view.viewType()) {
                case 0 /* DataView */:
                    return [view.fields];
                case 2 /* Pivot */:
                    return [view.aggregateOn, view.groupRowsBy, view.groupColumnsBy];
                case 3 /* Chart */:
                    return [view.aggregateOn, view.groupRowsBy];
            }
            return [];
        };
        return ViewData;
    })();
    ag.ViewData = ViewData;

    function mapCollection(from, to, createFn) {
        if (from && _.isArray(from)) {
            _.each(from, function (item) {
                to.push(createFn(item));
            });
        }
    }
    ag.mapCollection = mapCollection;

    var RiskCrystalDefinition = (function () {
        function RiskCrystalDefinition(options) {
            this.crystalName = options.crystalName || '';
            this.crystalFile = options.crystalFile || '';
        }
        return RiskCrystalDefinition;
    })();
    ag.RiskCrystalDefinition = RiskCrystalDefinition;

    (function (FieldStyle) {
        FieldStyle[FieldStyle["None"] = 0] = "None";
        FieldStyle[FieldStyle["WrapText"] = 1] = "WrapText";
        FieldStyle[FieldStyle["BorderLeft"] = 2] = "BorderLeft";
        FieldStyle[FieldStyle["BorderRight"] = 4] = "BorderRight";
    })(ag.FieldStyle || (ag.FieldStyle = {}));
    var FieldStyle = ag.FieldStyle;

    var FieldData = (function () {
        function FieldData(options) {
            this.key = options.key;
            this.isKey = !!options.isKey;
            this.displayName = options.displayName;
            this.dataType = options.dataType;
            this.format = options.format || "";
            this.linkFieldKey = options.linkFieldKey || "";
            this.hidden = options.hidden || false;
            this.sortStrategy = options.sortStrategy || 0;
            this.sortOrder = options.sortOrder || 0;
            this.prefixName = options.prefixName || "";
            this.relatedFields = options.relatedFields || [];
            this.subQuery = options.subQuery || "";
            this.subQueryName = options.subQueryName || "";
            this.groupByLevel = options.groupByLevel || 0;
            this.relativeSize = options.relativeSize || 0;
            this.css = ViewData.cssClassesForField(options.styles || 0);
            this.expression = options.expression || "";
            this.calculatedField = !!options.calculatedField;
            this.linksTo = options.linksTo;
            this.sortBy = options.sortBy || "";
        }
        return FieldData;
    })();
    ag.FieldData = FieldData;

    var FilterData = (function (_super) {
        __extends(FilterData, _super);
        function FilterData(options) {
            _super.call(this, options);

            this.operator = ko.observable(options.operator);
            this.value1 = ko.observable(options.value1);
            this.multiValue1 = _.isArray(options.value1) ? options.value1 : [];
            this.value2 = _.isUndefined(options.value2) ? null : options.value2;
            this.hasLookup = !!options.hasLookup;
            this.isParameter = !!options.isParameter;
        }
        FilterData.prototype.getSummary = function (filtersViewModel) {
            var unmapped = ko.mapping.toJS(this);

            if (unmapped.dataType == "boolean")
                return "{0}: {1}".format(unmapped.displayName, filtersViewModel.getFilterDisplayValue(unmapped));

            return "{0} {1}: {2}".format(unmapped.displayName, filtersViewModel.getOperatorLabel(unmapped.operator), filtersViewModel.getFilterDisplayValue(unmapped));
        };
        return FilterData;
    })(FieldData);
    ag.FilterData = FilterData;

    var ViewFieldData = (function (_super) {
        __extends(ViewFieldData, _super);
        function ViewFieldData(options) {
            _super.call(this, options);

            this.sortStrategy = _.isUndefined(options.sortStrategy) ? ag.constants.SortStrategy.None : options.sortStrategy;
            this.sortOrder = _.isUndefined(options.sortOrder) ? 0 : options.sortOrder;
            this.hidden = !!options.hidden;
            this.groupByLevel = _.isUndefined(options.groupByLevel) ? 0 : options.groupByLevel;
            this.subTotal = !!options.subTotal;
            this.endTotal = !!options.endTotal;
            this.resetRunningTotals = !!options.resetRunningTotals;
            this.formatMask = options.formatMask;

            if (options.isRule) {
                this.hidden = true;
                this.isRule = options.isRule;
                this.ruleType = options.ruleType || 0 /* UpdateCellDisplay */;
                this.targetColumn = options.targetColumn;
                this.replaceWithProperty = options.replaceWithProperty;
                this.canApplyRule = options.canApplyRule;
            }
        }
        ViewFieldData.prototype.canEditFormatMask = function () {
            return _.contains(['datetime', 'decimal', 'integer'], ko.unwrap(this.dataType));
        };

        // This is needed as a placeholder until the collection editor adds its own version
        ViewFieldData.prototype.getDisplayName = function () {
            return ko.unwrap(this.displayName);
        };

        // This is needed as a placeholder until the collection editor adds its own version
        ViewFieldData.prototype.getTitle = function () {
            return ko.unwrap(this.displayName);
        };
        return ViewFieldData;
    })(FieldData);
    ag.ViewFieldData = ViewFieldData;

    var AggregateFieldData = (function (_super) {
        __extends(AggregateFieldData, _super);
        function AggregateFieldData(options) {
            _super.call(this, options);

            this.operator = ko.observable(options.operator);
            this.totalOperator = ko.observable(options.totalOperator);
            this.label = ko.observable(options.label);
        }
        return AggregateFieldData;
    })(ViewFieldData);
    ag.AggregateFieldData = AggregateFieldData;

    var ProfileData = (function () {
        function ProfileData(options) {
            this.occurences = options.occurences || 0;
            this.size = options.size || 0;
            this.unit = options.unit || 0;
            this.method = options.method || 0;
            this.startOn = options.startOn || 0;
            this.total = options.total || false;
        }
        return ProfileData;
    })();
    ag.ProfileData = ProfileData;
})(ag || (ag = {}));
