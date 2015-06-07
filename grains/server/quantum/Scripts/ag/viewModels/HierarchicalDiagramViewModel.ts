module ag
{
   export class HierarchicalDiagramViewModel
   {
      kendoDiagram: any;
      initialZoomValue: number;
      cancelButton: JQuery;

      constructor(public hierarchicalViewModel: HierarchicalViewModel) { }

      init($diagramElement: JQuery, kendoDiagram: any)
      {
         var buttonsHolder = $diagramElement.parent().siblings("div.modal-footer");

         this.kendoDiagram = kendoDiagram;
         this.initialZoomValue = kendoDiagram.zoom();
         this.cancelButton = buttonsHolder.find("a:contains('Close')");
         this.registerEventHandlers($diagramElement, buttonsHolder.children());
         $diagramElement.parent().focus();
      }

      private registerEventHandlers($diagramElement: JQuery, controlButtons: JQuery): void
      {
         ko.utils.registerEventHandler(controlButtons, "click",
            (event:JQueryEventObject) =>
            {
               var type = $(event.currentTarget).text();
               switch (type)
               {
                  case "Reset Zoom":
                     this.redraw();
                     break;
               }
            });
      }

      public doNavigation(item:any)
      {
         if (item.dataItem)
         {
            this.navigateToItem(item.dataItem);
            this.cancelButton.click();
         }
      }

      private redraw()
      {
         this.kendoDiagram.bringIntoView(this.kendoDiagram.shapes);
         this.kendoDiagram.zoom(this.initialZoomValue);
      }

      private navigateToItem(dataItem): void
      {
         var key = dataItem.name;
         if (key == "Contents")
            key = "all";

         this.hierarchicalViewModel.navigateToItem(key);
      }
   }
}
