var ag;
(function (ag) {
    var DealMapViewModel = (function () {
        function DealMapViewModel(editingItem, gridItem, isNewItem) {
            var _this = this;
            this.mode = ko.observable(-1 /* Init */);
            editingItem.dealMapWorkingMode(-1 /* Init */);

            editingItem.dealMapEditMode.subscribe(function () {
                dealChanged();
            });

            if (gridItem.editor) {
                gridItem.editor.unsavedChanges.subscribe(function () {
                    if (gridItem.editor.unsavedChanges())
                        editingItem.dealMapWorkingMode(_this.mode);
                    else
                        editingItem.dealMapWorkingMode(-1 /* Init */);
                });
            }

            this.canCreate = ko.computed(function () {
                var mode = _this.mode();
                return !isNewItem() && (mode === 2 /* Customizer */ || mode === 1 /* Profiler */);
            });

            this.canEdit = ko.computed(function () {
                var mode = _this.mode();
                return !isNewItem() && (mode === 2 /* Customizer */ || mode === 3 /* Scheduler */);
            });

            this.canDelete = ko.computed(function () {
                var mode = _this.mode();
                return !isNewItem() && (mode === 2 /* Customizer */ || mode === 1 /* Profiler */);
            });

            this.canCopy = ko.computed(function () {
                return !isNewItem() && _this.mode() === 2 /* Customizer */;
            });

            this.customize = function () {
                if (editingItem.canCustomizeDeal()) {
                    _this.mode(2 /* Customizer */);
                    editingItem.dealMapEditMode(_this.mode());
                    editingItem.dealMap.refresh(true);
                }
            };

            this.customizeVisible = ko.computed(function () {
                return _this.mode() === 1 /* Profiler */ && editingItem.canCustomizeDeal && editingItem.canCustomizeDeal();
            });

            var dealChanged = function () {
                _this.mode(editingItem.dealMapEditMode());
            };
        }
        return DealMapViewModel;
    })();
    ag.DealMapViewModel = DealMapViewModel;
})(ag || (ag = {}));
