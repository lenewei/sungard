var ag;
(function (ag) {
    (function (risk) {
        "use strict";

        function matchingCriteria(viewModel, prefix, gridsPrefix) {
            var grids = viewModel.grids, grid = gridsPrefix ? ag.getProperty(grids, gridsPrefix) : grids, mappingProfileDetails = grid.mappingProfileDetails;

            if (!mappingProfileDetails)
                return;

            var observableFields = mappingProfileDetails.views.selected().fields, editItem = ag.getProperty(viewModel, prefix), orderedColumns = editItem.orderedColumns;

            viewModel.matchingCriteria = new function () {
                var _this = this;
                var self = this;

                self.configureViewVisible = ko.observable(false);

                self.toggleConfigureView = function () {
                    _this.configureViewVisible(!_this.configureViewVisible());
                };

                self.closeConfigureView = function () {
                    _this.configureViewVisible(false);
                };
            }();

            mappingProfileDetails.menuCommands.configureViewCommand = ko.command({
                execute: function () {
                    viewModel.matchingCriteria.toggleConfigureView();
                }
            });

            observableFields.subscribe(function (newValue) {
                orderedColumns(_.map(newValue, function (field) {
                    return ko.unwrap(field).key();
                }));
            });

            var setColumns = function (columns) {
                if (columns && columns.length) {
                    var orderedFields = [], fields = observableFields();
                    _.each(columns, function (column) {
                        var field = _.find(fields, function (f) {
                            return f.key() === column;
                        });

                        if (field) {
                            orderedFields.push(field);
                        }
                    });

                    observableFields(orderedFields);
                }
            };

            setColumns(orderedColumns());
        }
        risk.matchingCriteria = matchingCriteria;

        function syncMappingProfileGrids(viewModel, prefix, gridsPrefix) {
            var grids = viewModel.grids, editItem = ag.getProperty(viewModel, prefix);

            if (!editItem || !editItem.mappingProfileDetails)
                return;

            editItem.mappingProfileDetails.subscribe(function () {
                _.each(grids, function (gridNeedRefresh) {
                    if (gridNeedRefresh.refresh)
                        gridNeedRefresh.refresh();
                });
            });
        }
        risk.syncMappingProfileGrids = syncMappingProfileGrids;
    })(ag.risk || (ag.risk = {}));
    var risk = ag.risk;
})(ag || (ag = {}));
