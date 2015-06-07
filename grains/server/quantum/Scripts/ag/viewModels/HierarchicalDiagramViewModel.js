var ag;
(function (ag) {
    var HierarchicalDiagramViewModel = (function () {
        function HierarchicalDiagramViewModel(hierarchicalViewModel) {
            this.hierarchicalViewModel = hierarchicalViewModel;
        }
        HierarchicalDiagramViewModel.prototype.init = function ($diagramElement, kendoDiagram) {
            var buttonsHolder = $diagramElement.parent().siblings("div.modal-footer");

            this.kendoDiagram = kendoDiagram;
            this.initialZoomValue = kendoDiagram.zoom();
            this.cancelButton = buttonsHolder.find("a:contains('Close')");
            this.registerEventHandlers($diagramElement, buttonsHolder.children());
            $diagramElement.parent().focus();
        };

        HierarchicalDiagramViewModel.prototype.registerEventHandlers = function ($diagramElement, controlButtons) {
            var _this = this;
            ko.utils.registerEventHandler(controlButtons, "click", function (event) {
                var type = $(event.currentTarget).text();
                switch (type) {
                    case "Reset Zoom":
                        _this.redraw();
                        break;
                }
            });
        };

        HierarchicalDiagramViewModel.prototype.doNavigation = function (item) {
            if (item.dataItem) {
                this.navigateToItem(item.dataItem);
                this.cancelButton.click();
            }
        };

        HierarchicalDiagramViewModel.prototype.redraw = function () {
            this.kendoDiagram.bringIntoView(this.kendoDiagram.shapes);
            this.kendoDiagram.zoom(this.initialZoomValue);
        };

        HierarchicalDiagramViewModel.prototype.navigateToItem = function (dataItem) {
            var key = dataItem.name;
            if (key == "Contents")
                key = "all";

            this.hierarchicalViewModel.navigateToItem(key);
        };
        return HierarchicalDiagramViewModel;
    })();
    ag.HierarchicalDiagramViewModel = HierarchicalDiagramViewModel;
})(ag || (ag = {}));
