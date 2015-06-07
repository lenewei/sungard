var ag;
(function (ag) {
    (function (risk) {
        "use strict";

        function observeProperties(viewModel, serviceUrl) {
            var net = new ag.utils.Network(), observe = function (definitionPath, action, path, tabId) {
                var definition = ag.getProperty(viewModel.applicationOptions.properties, definitionPath);
                definition.subscribe(function (newValue) {
                    $(tabId).parent("li").toggleClass("hide", !newValue);

                    var payload = { name: newValue };

                    net.postJson(action, payload).done(function (response) {
                        ko.mapping.fromJS(response.data, ag.getProperty(viewModel.applicationOptions, path));
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
        risk.observeProperties = observeProperties;

        var gridNames = ['calculated', 'database', 'groupBy', 'movement', 'pointInTime'], currentColumns, updateViewWithCurrentColumns = function (v) {
            if (!_.isUndefined(currentColumns))
                updateView(v, currentColumns);
        };

        function keepColumnsInSync(grids, views) {
            _.each(gridNames, function (gridName) {
                var editor = grids[gridName].editor;
                if (editor) {
                    editor.afterUpdate = function (result) {
                        var columns = result.columns;
                        if (columns) {
                            currentColumns = columns;
                            _.each(views.all(), function (v) {
                                updateView(v, columns);
                            });
                        }
                    };
                }
            });

            views.afterViewLoaded = updateViewWithCurrentColumns;
            views.afterViewCreated = updateViewWithCurrentColumns;
        }
        risk.keepColumnsInSync = keepColumnsInSync;

        function updateView(view, columns) {
            updateFields(view.fields, columns);
            updateFields(view.groupRowsBy, columns);
            updateFields(view.aggregateOn, columns);
            updateFields(view.groupColumnsBy, columns);
        }
        risk.updateView = updateView;

        function updateFields(fields, columns) {
            var itemsToRemove = [];
            _.each(ko.unwrap(fields), function (field) {
                var column = columns[ko.unwrap(field.key)];
                if (column) {
                    field.displayName(column.d);
                    field.dataType(column.t);
                } else {
                    itemsToRemove.push(field);
                }
            });

            _.each(itemsToRemove, function (itemToRemove) {
                fields.remove(itemToRemove);
            });
        }
        risk.updateFields = updateFields;
    })(ag.risk || (ag.risk = {}));
    var risk = ag.risk;
})(ag || (ag = {}));
