/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    (function (SelectMode) {
        SelectMode[SelectMode["None"] = 0] = "None";
        SelectMode[SelectMode["Single"] = 1] = "Single";
        SelectMode[SelectMode["Multi"] = 2] = "Multi";
    })(ag.SelectMode || (ag.SelectMode = {}));
    var SelectMode = ag.SelectMode;

    var SelectedViewModel = (function () {
        function SelectedViewModel(selectMode, itemKey) {
            var _this = this;
            this.itemKey = itemKey;
            this.selectedField = {
                key: "selected",
                isKey: false,
                displayName: "",
                dataType: "checkbox",
                relativeSize: 1,
                sortable: false,
                hidden: false,
                sortStrategy: ko.observable(0)
            };
            this.showAllButton = ko.observable(true);
            this.all = ko.observable(false);
            this.keys = ko.observableArray();
            this.item = ko.observable();
            this.mode = ko.observable(selectMode);

            this.columns = ko.computed(function () {
                if (_this.mode() != 2 /* Multi */)
                    return [];
                return [_this.selectedField];
            });

            this.isSingle = ko.computed(function () {
                return _this.mode() === 1 /* Single */;
            });

            this.isMulti = ko.computed(function () {
                return _this.mode() === 2 /* Multi */;
            });

            this.css = ko.computed(function () {
                return {
                    'single-select': _this.isSingle(),
                    'multi-select': _this.isMulti()
                };
            });

            this.all.subscribe(function () {
                _this.item(undefined);
                _this.keys.removeAll();
            });

            this.singleSelect = function (item) {
                if (_this.mode() === 1 /* Single */) {
                    _this.item(item);
                    _this.keys([ko.unwrap(item[itemKey])]);
                }
                return true;
            };

            this.isSelected = function (item) {
                var keyValue = ko.unwrap(item[itemKey]);
                return _.any(_this.keys(), function (key) {
                    return key === keyValue;
                });
            };

            this.model = ko.computed(function () {
                return {
                    all: _this.all(),
                    keys: _this.keys()
                };
            });
        }
        SelectedViewModel.prototype.updateSelectedItem = function (items) {
            var _this = this;
            if (this.mode() === 1 /* Single */)
                this.item(_.chain(items).filter(function (i) {
                    return _.contains(_this.keys(), i[_this.itemKey]);
                }).first().value());
        };

        SelectedViewModel.prototype.toggleAll = function () {
            var currentAllStatus = this.showAllButton();
            this.all(currentAllStatus);
            this.showAllButton(!currentAllStatus);
        };

        SelectedViewModel.prototype.refresh = function () {
            // Refresh selections
            if (this.isSingle || this.isMulti)
                this.keys.valueHasMutated();
        };

        SelectedViewModel.prototype.reset = function () {
            // Clear the currently selected item
            this.item(null);

            // Reset the all flag
            this.all(false);

            // Clear any keys
            this.keys.removeAll();
        };

        SelectedViewModel.prototype.load = function (selections) {
            this.all(ko.unwrap(selections.all));
            this.showAllButton(!this.all());

            var selectionsKeys = ko.unwrap(selections.keys);
            if (selectionsKeys && $.isArray(selectionsKeys))
                this.keys(selectionsKeys);
        };

        SelectedViewModel.prototype.selectKey = function (key) {
            var index = ko.utils.arrayIndexOf(this.keys(), key);

            if (index < 0)
                this.keys.push(key);
            else if (index >= 0)
                this.keys.splice(index, 1);
        };
        return SelectedViewModel;
    })();
    ag.SelectedViewModel = SelectedViewModel;
})(ag || (ag = {}));
