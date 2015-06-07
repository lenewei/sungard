module ag.risk
{
   "use strict";

   export function observeProperties(viewModel, serviceUrl)
   {
      var net = new ag.utils.Network(),
         observe = (definitionPath, action, path, tabId) =>
         {
            var definition = getProperty(viewModel.applicationOptions.properties, definitionPath);
            definition.subscribe((newValue) =>
            {
               $(tabId).parent("li").toggleClass("hide", !newValue);

               var payload = { name: newValue };

               net.postJson(action, payload).done((response) => 
               {
                  ko.mapping.fromJS(response.data, getProperty(viewModel.applicationOptions, path));
               });
            });
         };

      observe('assumptionsDefinition', 'loadassumption', 'assumptions', '#reportingRiskAssumptionsTabHeader');
      observe('columnsDefinition', 'loadcolumns', 'columnSets', '#reportingRiskColumnsTabHeader');
      observe('selectionsDefinition', 'loadfilters', 'filters', '#reportingRiskFiltersTabHeader');
      observe('mappingProfileDefinition', 'loadmappingprofile', 'mapProfile', '#reportingMappingProfileTabHeader');
      observe('timeProfileDefinition', 'loadtimeprofile', 'timeProfile', '#reportingRiskTimeProfileTabHeader');
      observe('scenarioDefinition', 'loadscenario', 'scenario', '#reportingRiskScenaroiTabHeader');
      observe('limitDefinition', 'loadlimit', 'limits', '#reportingRiskLimitsTabHeader');
      observe('alertDefinition', 'loadalert', 'alerts', '#reportingRiskAlertTabHeader');
      observe('bankBalancesDefinition', 'loadbalances', 'balances', '#reportingRiskBalancesTabHeader');
   }

   var gridNames = ['calculated', 'database', 'groupBy', 'movement', 'pointInTime'],
      currentColumns,
      updateViewWithCurrentColumns = (v) =>
      {
         if (!_.isUndefined(currentColumns))
            updateView(v, currentColumns);
      };


   export function keepColumnsInSync(grids, views: ViewsViewModel)
   {     
      _.each(gridNames, gridName =>
      {
         var editor = grids[gridName].editor;
         if (editor)
         {
            editor.afterUpdate = result =>
            {
               var columns = result.columns;
               if (columns)
               {
                  currentColumns = columns;
                  _.each(views.all(), (v: any) =>
                  {
                     updateView(v, columns);
                  });
               }
            };
         }
      });

      views.afterViewLoaded = updateViewWithCurrentColumns; 
      views.afterViewCreated = updateViewWithCurrentColumns; 
   }

   export function updateView(view, columns)
   {
      updateFields(view.fields, columns);
      updateFields(view.groupRowsBy, columns);
      updateFields(view.aggregateOn, columns);
      updateFields(view.groupColumnsBy, columns);
   }

   export function updateFields(fields, columns)
   {
      var itemsToRemove = [];
      _.each(ko.unwrap(fields), (field: any) =>
      {
         var column = columns[ko.unwrap(field.key)];
         if (column)
         {
            field.displayName(column.d);
            field.dataType(column.t);
         }
         else
         {
            itemsToRemove.push(field);
         }
      });

      _.each(itemsToRemove, function (itemToRemove)
      {
         fields.remove(itemToRemove);
      });
   }
}