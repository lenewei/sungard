/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
/// <reference path="../utils/network.ts" />
/// <reference path="../models/MessagesViewModel.ts" />
/// <reference path="baseViewModel.ts" />
/// <reference path="gridViewModel.ts" />
/// <reference path="UpdatingModelHelper.ts" />
/// <reference path="browseEditorViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var ag;
(function (ag) {
    // Very simple ViewModel typically for One-Button-Applications
    //   - No "Browse"
    //   - No "New"
    //   - Single Editor
    //   - One primary action (typically) operating on a single record/values entered
    //   - Or a primary command
    var SimpleViewModel = (function (_super) {
        __extends(SimpleViewModel, _super);
        function SimpleViewModel(options) {
            _super.call(this, options);
            this.options = options;
            this.editingItem = {};
            this.grids = {};
            this.menuCommands = {};
            this.actions = {};
            this.pageTitle = ko.observableArray([{ "keyProperty": ag.strings.newLabel + " " + ag.utils.documentTitle() }]);
            this.keyFields = [];
            this.fieldCategories = {};

            this.updatingModel = ag.createUpdatingModelHelper();
            this.primaryAction = options.primaryAction || "edit";
            this.primaryCommand = options.primaryCommand;
            this.keyFields = options.keyFields;
            this.fieldCategories = options.fieldCategories;
        }
        SimpleViewModel.prototype.init = function (itemModel) {
            this.editingItem = ag.mapFromJStoMetaObservable(itemModel, this.isEditorReadOnly);

            // Add these when we need to support them
            this.initGrids();
            this.initBrowseEditors();
            this.setupApplicationHeaders(this.editingItem, this.options.applicationHeaders);

            // Dependencies needs to come last - after the model has completed initialising
            this.initDependencies(this.editingItem);

            ag.utils.focusForm();
        };

        SimpleViewModel.prototype.beforeApplyBindings = function () {
            var _this = this;
            if (!this.primaryCommand) {
                this.primaryActionCommand = ko.asyncCommand({
                    execute: function (complete) {
                        _this.doPrimaryAction().always(complete);
                    }
                });
            } else {
                var command = this.menuCommands[this.primaryCommand.toCamelCase()];
                if (!command)
                    throw new Error("Unable to find command \"{0}\"".format(this.primaryCommand));

                this.primaryActionCommand = command;
            }
        };

        SimpleViewModel.prototype.initGrids = function () {
            // TODO: Refactor this similar to createBrowseEditors
            // Create GridViewModels for each typeMetadata key
            var typeMetadata = this.options.typeMetadata || {};
            if (typeMetadata && !$.isEmptyObject(typeMetadata)) {
                this.options.typeMetaDataUrl = ag.utils.normalizeUrl(this.options.typeMetaDataUrl);

                // Create GridViewModels as required
                ag.createGridViewModelsFromMetadata(this, typeMetadata, this.editingItem, this.options, this.isEditorReadOnly);
            }
        };

        SimpleViewModel.prototype.initBrowseEditors = function () {
            ag.createBrowseEditors(this, this.options.browseEditors, this.editingItem);
        };

        SimpleViewModel.prototype.doPrimaryAction = function () {
            var _this = this;
            return this.net.validateUnmapAndPostJson(this.primaryAction, this.editingItem).done(function (result) {
                if (result.message)
                    ag.messages.show(result.message, result.messageType);

                _this.updateEditingItem(result.data);
            });
        };

        SimpleViewModel.prototype.updateEditingItem = function (data) {
            try  {
                this.updatingModel(true);

                ko.mapping.fromJS(data, this.editingItem);
                ag.updateGrids(data, this.grids);
            } finally {
                this.updatingModel(false);
            }
        };

        SimpleViewModel.prototype.getModel = function () {
            return this.editingItem;
        };
        return SimpleViewModel;
    })(ag.BaseViewModel);
    ag.SimpleViewModel = SimpleViewModel;
})(ag || (ag = {}));
