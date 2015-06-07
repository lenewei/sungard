/// <reference path="../staticDataViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var RulesOwnerViewModel = (function (_super) {
        __extends(RulesOwnerViewModel, _super);
        function RulesOwnerViewModel() {
            _super.apply(this, arguments);
        }
        RulesOwnerViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            _.each(this.grids, function (grid) {
                grid.editor.item.subscribe(function (newValue) {
                    var inherited = newValue.inherited() || newValue.deactivated(), tags = newValue.productGeneralLedgerTags;
                    _this.setDefaultingFieldsVisibilityAndAvailability(newValue.defaultingRule.defaultingFields, inherited);
                    if (tags) {
                        _this.setTagsAvailability(tags(), inherited);
                    }
                });

                grid.refreshAllGrids = function () {
                    _.each(_this.grids, function (g) {
                        g.refresh();
                    });
                };
            });
        };

        RulesOwnerViewModel.prototype.setDefaultingFieldsVisibilityAndAvailability = function (fields, inherited) {
            var _this = this;
            var unwrappedFields = fields();
            _.each(unwrappedFields, function (field, index) {
                var metaField = ag.mapFromJStoMetaObservable(field, _this.isEditorReadOnly), isSingle = metaField.isSingleSelect(), hiddenValueField = isSingle ? metaField.valueList : metaField.value, visibleValueField = isSingle ? metaField.value : metaField.valueList;
                unwrappedFields[index] = metaField;
                hiddenValueField.isVisible(false);
                visibleValueField.isAvailable(!inherited);

                if (!inherited) {
                    visibleValueField.subscribe(function () {
                        fields.valueHasMutated();
                    });
                }
            });
        };

        RulesOwnerViewModel.prototype.setTagsAvailability = function (tags, inherited) {
            var _this = this;
            _.each(tags, function (tag, index) {
                var metaTag = ag.mapFromJStoMetaObservable(tag, _this.isEditorReadOnly);
                tags[index] = metaTag;
                metaTag.lookupText.isAvailable(!inherited);
            });
        };
        return RulesOwnerViewModel;
    })(ag.StaticDataViewModel);
    ag.RulesOwnerViewModel = RulesOwnerViewModel;
})(ag || (ag = {}));
