module ag.risk
{
   "use strict";

   export function matchingCriteria(viewModel: any, prefix: any, gridsPrefix: any)
   {
      var grids = viewModel.grids,
         grid = gridsPrefix ? ag.getProperty(grids, gridsPrefix) : grids,
         mappingProfileDetails = grid.mappingProfileDetails;

      if (!mappingProfileDetails)
         return;

      var observableFields = mappingProfileDetails.views.selected().fields,
         editItem = ag.getProperty(viewModel, prefix),
         orderedColumns = editItem.orderedColumns;

      viewModel.matchingCriteria = new function ()
      {
         var self = this;

         self.configureViewVisible = ko.observable(false);

         self.toggleConfigureView = () =>
         {
            this.configureViewVisible(!this.configureViewVisible());
         };

         self.closeConfigureView = () =>
         {
            this.configureViewVisible(false);
         };
      } ();

      mappingProfileDetails.menuCommands.configureViewCommand = ko.command(
         {
            execute: () =>
            {
               viewModel.matchingCriteria.toggleConfigureView();
            }
         });

      observableFields.subscribe(newValue=>
      {
         orderedColumns(_.map(newValue, field=> ko.unwrap(field).key()));
      });

      var setColumns = columns =>
      {
         if (columns && columns.length)
         {
            var orderedFields = [],
               fields = observableFields();
            _.each(columns, column =>
            {
               var field = _.find(fields, (f: any) => f.key() === column);

               if (field)
               {
                  orderedFields.push(field);
               }
            });

            observableFields(orderedFields);
         }
      };

      setColumns(orderedColumns());
   }

   export function syncMappingProfileGrids(viewModel: any, prefix: any, gridsPrefix: any)
   {
      var grids = viewModel.grids,
         editItem = ag.getProperty(viewModel, prefix);

      if (!editItem || !editItem.mappingProfileDetails)
         return;

      editItem.mappingProfileDetails.subscribe(() =>
      {
         _.each(grids, (gridNeedRefresh: any) =>
         {
            if (gridNeedRefresh.refresh)
               gridNeedRefresh.refresh();
         });
      });
   }
}
