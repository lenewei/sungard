/// <reference path="../appViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var InstructionsViewModel = (function (_super) {
        __extends(InstructionsViewModel, _super);
        function InstructionsViewModel(options) {
            options.noBrowseGrid = true;
            _super.call(this, options);
        }
        return InstructionsViewModel;
    })(ag.AppViewModel);
    ag.InstructionsViewModel = InstructionsViewModel;

    var OursInstructionsViewModel = (function (_super) {
        __extends(OursInstructionsViewModel, _super);
        function OursInstructionsViewModel(options) {
            var _this = this;
            options.noBrowseGrid = true;

            this.usedCounterpartyCategoryFilters = ko.computed(function () {
                return _this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters;
            }, this, { deferEvaluation: true });

            _super.call(this, options);
        }
        OursInstructionsViewModel.prototype.updateCounterpartyCategoryFilters = function (items) {
            // The passed items array is a list of new filters to add to the existing collection
            this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters.push.apply(this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters, $.map(items, function (item) {
                return ag.filters.buildFilter(item, true);
            }));
        };

        OursInstructionsViewModel.prototype.getCounterpartyCategoryFilters = function () {
            return this.actions.thirdPartyInstructions.model.counterpartyCategoryFilters;
        };
        return OursInstructionsViewModel;
    })(InstructionsViewModel);
    ag.OursInstructionsViewModel = OursInstructionsViewModel;
})(ag || (ag = {}));
