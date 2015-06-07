var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    "use strict";

    var DialogApplicationAction = (function (_super) {
        __extends(DialogApplicationAction, _super);
        function DialogApplicationAction(options, isSubAction) {
            if (typeof isSubAction === "undefined") { isSubAction = false; }
            _super.call(this, options, isSubAction);
            this.options = options;
            this.isSubAction = isSubAction;
            this.modelValueUpdated = ko.observable(false);
            this.showDialog.subscribe(function () {
                return;
            });
        }
        DialogApplicationAction.prototype.invoke = function (parentViewModel, event, complete) {
            var _this = this;
            return _super.prototype.invoke.call(this, parentViewModel, event, complete).then(function (result) {
                _this.actionInvoked = true;
                _this.showDialog(false);

                var parentAction = _this.options.parentAction;
                if (parentAction) {
                    parentAction.actionInvoked = true;
                    parentAction.showDialog(false);
                }

                return result;
            });
        };

        DialogApplicationAction.prototype.updateActionItem = function (result) {
            var _this = this;
            return _super.prototype.updateActionItem.call(this, result).done(function () {
                _this.modelValueUpdated.valueHasMutated();
            });
        };
        return DialogApplicationAction;
    })(ag.Action);
    ag.DialogApplicationAction = DialogApplicationAction;

    var BulkUpdateApplicationAction = (function (_super) {
        __extends(BulkUpdateApplicationAction, _super);
        function BulkUpdateApplicationAction(options, isSubAction) {
            if (typeof isSubAction === "undefined") { isSubAction = false; }
            _super.call(this, options, isSubAction);
            this.options = options;
            this.isSubAction = isSubAction;

            this.afterInvoke = function (result, parentViewModel) {
                var insertAction = parentViewModel.actions["insertError" + parentViewModel.options.name], actionData = result.actionData;

                if (actionData && actionData.errorCount > 0) {
                    insertAction.model.text(actionData.replaceContent);
                    insertAction.show(parentViewModel);
                }

                if (parentViewModel.refresh) {
                    parentViewModel.refresh();
                }

                return result;
            };
        }
        return BulkUpdateApplicationAction;
    })(DialogApplicationAction);
    ag.BulkUpdateApplicationAction = BulkUpdateApplicationAction;
})(ag || (ag = {}));
