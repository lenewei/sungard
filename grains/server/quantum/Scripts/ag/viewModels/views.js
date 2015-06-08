/// <reference path="../../ts/global.d.ts" />
/// <reference path="../proxies/viewsProxy.ts" />
/// <reference path="../models/viewData.ts" />
var ag;
(function (ag) {
    var ViewsViewModel = (function () {
        //#endregion
        //#region constructor
        function ViewsViewModel(views, viewTables, typeName, isLoading) {
            var _this = this;
            this.viewTables = viewTables;
            this.typeName = typeName;
            this.isLoading = isLoading;
            this.isConfigureLoaded = ko.observable(false);
            this.visibleColumns = ko.observableArray();
            this.selectedFields = ko.observableArray();
            //#endregion
            //#region public methods
            this.selectView = function (view) {
                _this.isLoading(true);
                _this.setSelected(view).always(function () {
                    _this.isLoading(false);
                });
            };
            this.toggleConfigure = function () {
                _this.showConfigure(!_this.showConfigure());
            };
            // Create the ViewsProxy (optionally for a given type)
            this.proxy = new ag.ViewsProxy(typeName);

            // Map in the views - only the default view should be complete (have fields and filters etc.)
            this.all = ko.mapping.fromJS(views || [], {
                key: function (item) {
                    // Find by key method for mapping
                    return ko.unwrap(item.key);
                },
                create: function (options) {
                    // Create ViewData objects - usually all will be
                    // "lite"(no fields or filters) other than the default view
                    return ko.mapping.fromJS(new ag.ViewData(options.data, true));
                }
            }) || ko.observableArray([]);

            var defaultView = this.getDefault();
            if (!defaultView)
                throw new Error("No default view appears to exist.");

            this.selected = ko.observable(defaultView);

            ko.computed(function () {
                _this.visibleColumns(_this.calculateVisibleFields(_this.selected()));
            });

            ko.computed(function () {
                _this.selectedFields(_this.selected().fields());
            });

            this.hasAny = ko.computed(function () {
                return _this.all().length > 0;
            });

            this.sorted = ko.computed(function () {
                return _this.all.slice(0).sort(_this.sortViews);
            });

            this.selectedIsCrystal = ko.computed(function () {
                return _this.selected() && _this.selected().viewType() === 1 /* Crystal */;
            });

            this.selectedIsCrystalOrChart = ko.computed(function () {
                return _this.selected() && (_this.selected().viewType() === 1 /* Crystal */ || _this.selected().viewType() === 3 /* Chart */);
            });

            this.selectedIsGrid = ko.computed(function () {
                return _this.selected() && _this.selected().viewType() === 0 /* DataView */;
            });

            this.selectedIsPivot = ko.computed(function () {
                return _this.selected() && ko.unwrap(_this.selected().viewType) === 2 /* Pivot */;
            });

            this.selectedIsChart = ko.computed(function () {
                return _this.selected() && ko.unwrap(_this.selected().viewType) === 3 /* Chart */;
            });

            // Does the selected view have any visible applied fields
            this.selectedHasVisibleAppliedFields = ko.computed(function () {
                // If the selected view is not a grid return
                if (!_this.selectedIsGrid())
                    return false;

                // Check there are any fields and make sure at least one is visible
                var fields = _this.selected().appliedFields();
                return fields.length > 0 && _.any(fields, function (item) {
                    return ko.unwrap(item.hidden) === false;
                });
            });

            this.selectedSortedBy = ko.computed(function () {
                if (!_this.selected())
                    return;

                return _.filter(_this.selected().fields(), function (field) {
                    return field.sortStrategy() > 0;
                });
            });

            this.showConfigure = ko.observable(false).extend({ notify: "always" });
            this.showConfigure.subscribe(function (newValue) {
                if (newValue)
                    _this.isConfigureLoaded(true);
            });

            this.viewTables = ko.mapping.fromJS(viewTables, {
                key: function (item) {
                    return ko.unwrap(item.key);
                }
            });

            this.selectedViewTableName = ko.computed(function () {
                var viewTableKey = ko.unwrap(_this.selected() && _this.selected().viewTableKey), viewTableName = "";

                $.each(_this.viewTables(), function (index, value) {
                    var viewTable = ko.mapping.toJS(value);
                    if (viewTable.key === viewTableKey) {
                        viewTableName = viewTable.name;
                        return false;
                    }
                });

                return viewTableName;
            });

            this.canConfigue = ko.computed(function () {
                if (_this.selectedIsCrystal())
                    return false;
                return true;
            });

            this.canCopy = ko.computed(function () {
                return !_this.selectedIsCrystal() && _this.selected().key();
            });

            this.canDelete = ko.computed(function () {
                return !_this.selected().isSystem() && !_this.selectedIsCrystal();
            });

            this.canSave = ko.computed(function () {
                return !_this.selectedIsCrystal();
            });

            this.viewSelector = new ag.ViewSelectorViewModel(this.sorted, this.viewTables, this.selectView);
        }
        //#endregion
        ViewsViewModel.prototype.getSelectedViewSummary = function (filersViewModel) {
            var selected = ko.unwrap(this.selected);

            // If there is no selected view or selected view does not contain any filters
            // return an empty tooltip
            if (!selected || !selected.filters)
                return "";

            var array = _.map(ko.unwrap(selected.filters), function (filter) {
                return filter.getSummary(filersViewModel);
            });

            return array.join('\n');
        };

        ViewsViewModel.prototype.calculateVisibleFields = function (view) {
            if (!view)
                return [];

            return _.filter(view.appliedFields(), function (field) {
                return field.hidden() === false;
            });
        };

        //#region private methods
        ViewsViewModel.prototype.sortViews = function (a, b) {
            var aIsSystem = ko.unwrap(a.isSystem), bIsSystem = ko.unwrap(b.isSystem), aName = ko.unwrap(a.name).toLowerCase(), bName = ko.unwrap(b.name).toLowerCase();

            if ((aIsSystem && !bIsSystem) || aName < bName) {
                return -1;
            }

            if ((bIsSystem && !aIsSystem) || aName > bName) {
                return 1;
            }

            return 0;
        };

        ViewsViewModel.prototype.getDefault = function () {
            // No view collection so return a default view
            if (this.all().length == 0) {
                return ko.mapping.fromJS(new ag.ViewData({ name: "Default", key: "default", isDefault: true, isSystem: true }));
            }

            return _.find(this.all(), function (view) {
                return view.isDefault();
            });
        };

        ViewsViewModel.prototype.saveTypeGridViewRequest = function (params) {
            var _this = this;
            return this.proxy.createView(params, null, 0 /* POST */).then(function (result) {
                ko.mapping.fromJS(new ag.ViewData(result.data, true), _this.selected());
            });
        };

        ViewsViewModel.prototype.createTypeGridViewRequest = function (params) {
            var _this = this;
            return this.proxy.createView(params).then(function (result) {
                var viewData = new ag.ViewData(result.data, true);
                viewData.key = null;
                _this.addUnsavedView(viewData);
            });
        };

        ViewsViewModel.prototype.editGridViewRequest = function (params) {
            var _this = this;
            return this.proxy.editView(this.selected().key(), params, 0 /* POST */).then(function (result) {
                ko.mapping.fromJS(new ag.ViewData(result.data, true), _this.selected());
            });
        };

        ViewsViewModel.prototype.addViewRequest = function (viewTableKey, viewType) {
            var _this = this;
            if (typeof viewType === "undefined") { viewType = 0; }
            var params = {
                viewType: viewType
            };

            return this.proxy.createView(params, viewTableKey).then(function (result) {
                // Check for unique name
                var views = ko.mapping.toJS(_this.all);
                result.data.name = ag.utils.ensureUniqueName(result.data.name, views, "name");

                // Make observable
                var view = ko.mapping.fromJS(new ag.ViewData(result.data));

                // Add the query to the queries collection
                _this.all.push(view);

                // Update the selected view (we also need to update the editing view here as we're
                // not going to be navigating to an existing view which usually updates editingQuery).
                _this.selected(view);

                if (_this.afterViewCreated)
                    _this.afterViewCreated(view);

                // Show the Configuration area for the new View
                _this.showConfigure(true);
            });
        };

        ViewsViewModel.prototype.deleteViewRequest = function (view) {
            var _this = this;
            // Can't delete the view if it is the system default
            if (view.isSystem()) {
                ag.messages.error(ag.strings.defViewDelete);
                return;
            }

            var resetSelectedView = function () {
                // If we are deleting the currently selected view
                // select a different view (the system default)
                if (view === _this.selected() || view.clientKey() === _this.selected().parentClientKey()) {
                    var systemDefault = _.find(_this.all(), function (view) {
                        // We may have just deleted the Default so select the System Default
                        return view.isSystem();
                    });

                    // Set the default flag back to true
                    systemDefault.isDefault(true);

                    _this.setSelected(systemDefault);
                }
            };

            // Delete an unsaved view
            if (view.key() == null || view.key().length == 0) {
                resetSelectedView();
                this.deleteChildViews(view);
                this.all.remove(view);
                return;
            }

            // Delete a saved view
            return this.proxy.deleteView(view.key()).then(function (result) {
                ag.messages.success(result.message);
                resetSelectedView();
                _this.deleteChildViews(view);
                _this.all.mappedRemove({ key: view.key() });
            });
        };

        ViewsViewModel.prototype.deleteChildViews = function (view) {
            if (view.clientKey() != null)
                this.all.remove(function (i) {
                    return view.clientKey() === i.parentClientKey();
                });
        };

        ViewsViewModel.prototype.setSelected = function (view, forceUpdate) {
            var _this = this;
            if (typeof forceUpdate === "undefined") { forceUpdate = false; }
            if (!view || $.isEmptyObject(view))
                throw new Error("view missing.");

            var key = view.key();

            // Access write permission on view
            this.viewAccessPermission(view);

            // Check if we are a new view with no key
            // could be multiple so need to allow selection
            if (ag.isNullOrUndefined(key)) {
                this.selected(view);
                return $.Deferred().resolve();
            }

            // If we are already on the view nothing to do
            if (key === this.selected().key() && !forceUpdate) {
                return $.Deferred().resolve();
            }

            // Check if we have already completed loaded the view
            if (ko.unwrap(view.isComplete)) {
                this.selected(view);
                return $.Deferred().resolve();
            }

            // Reset all view to not default
            _.each(this.all(), function (viewData) {
                viewData.isDefault(false);
            });

            // Set current view to default view
            view.isDefault(true);

            return this.proxy.editView(key, undefined, 1 /* GET */).then(function (result) {
                // Set the selected view to the mapped object and add to the local cache
                var mapped = ko.mapping.fromJS(new ag.ViewData(result.data, true), view);
                _this.selected(mapped);

                if (_this.afterViewLoaded)
                    _this.afterViewLoaded(mapped);
            });
        };

        ViewsViewModel.prototype.viewAccessPermission = function (view) {
            // Check the Security By User Access Permission on view, if without writable permission then prompt message
            var showMessage = (!ko.unwrap(view.hasWritePermission) && this.viewKey != ko.unwrap(view.key));

            if (showMessage && this.selectedIsGrid())
                ag.messages.show(ag.strings.accessWrite.format("view", "resources", "private copy"), 2);

            this.viewKey = ko.unwrap(view.key);
        };

        ViewsViewModel.prototype.getViewRequest = function (key) {
            return this.proxy.editView(key, undefined, 1 /* GET */).then(function (result) {
                return result.data;
            });
        };

        ViewsViewModel.prototype.findByKey = function (key) {
            if (!this.all())
                return undefined;

            return _.find(this.all(), function (view) {
                return view.key() === key;
            });
        };

        ViewsViewModel.prototype.displayText = function (item) {
            return item.displayName();
        };

        ViewsViewModel.prototype.displayTitle = function (item) {
            var temp = item.displayName();
            var prefix = item.prefixName();
            if (prefix && prefix.length > 0) {
                temp = prefix + '.' + temp;
            }
            return temp;
        };

        ViewsViewModel.prototype.add = function () {
            this.addViewRequest();
        };

        ViewsViewModel.prototype.addPivot = function () {
            this.addViewRequest(undefined, 2);
        };

        ViewsViewModel.prototype.addChart = function () {
            this.addViewRequest(undefined, 3);
        };

        ViewsViewModel.prototype.addForViewTable = function (viewTable) {
            var viewTableJS = ko.mapping.toJS(viewTable);
            this.addViewRequest(viewTableJS.key);
        };

        ViewsViewModel.prototype.addPivotForViewTable = function (viewTable) {
            var viewTableJS = ko.mapping.toJS(viewTable);
            this.addViewRequest(viewTableJS.key, 2);
        };

        ViewsViewModel.prototype.addChartForViewTable = function (viewTable) {
            var viewTableJS = ko.mapping.toJS(viewTable);
            this.addViewRequest(viewTableJS.key, 3);
        };

        ViewsViewModel.prototype.copy = function () {
            // Can only copy saved views
            if (this.selected().key() == null)
                return;

            var viewData = ko.mapping.toJS(this.selected);
            var views = ko.mapping.toJS(this.all);

            viewData.name = ag.utils.ensureUniqueName(viewData.name, views, "name");
            viewData.key = null;
            viewData.isSystem = false;
            viewData.isDefault = false;
            viewData.isPersonal = true;
            viewData.hasWritePermission = true;

            this.addUnsavedView(viewData);
        };

        // NOTE: Are this in use:
        //private getDefaultView(): any
        //{
        //   for (var i = 0; i < this.views.length; i++)
        //   {
        //      if (this.views[i].isSystem)
        //         return this.views[i];
        //   }
        //   return null;
        //}
        //private getAllHiddenFields(defaultViewFields: Array<any>): Array<any>
        //{
        //   var temp: Array<any> = [];
        //   for (var i = 0; i < defaultViewFields.length; i++)
        //   {
        //      var field = defaultViewFields[i];
        //      if (field.hidden)
        //         temp.push(field);
        //   }
        //   return temp;
        //}
        // /NOTE
        ViewsViewModel.prototype.deleteSelected = function () {
            this.deleteView(this.selected());
        };

        ViewsViewModel.prototype.deleteView = function (view) {
            // Not a system view and not a CrystalView
            if (!view.isSystem() && view.viewType() !== 1) {
                this.deleteViewRequest(view);
            }
        };

        ViewsViewModel.prototype.update = function (newViews, newViewTables, forceUpdate, selectViewIdx) {
            var _this = this;
            if (typeof forceUpdate === "undefined") { forceUpdate = false; }
            if (typeof selectViewIdx === "undefined") { selectViewIdx = -1; }
            var keyedViewDataArr, viewToSelect;

            ko.mapping.fromJS(newViewTables, this.viewTables);

            // update views
            // ko.mapping.fromJS can't handle multiple views that has an empty key so insert those manually
            keyedViewDataArr = _.chain(newViews).filter(function (i) {
                return i.key;
            }).map(function (i) {
                return new ag.ViewData(i, true);
            }).value();
            ko.mapping.fromJS(keyedViewDataArr, this.all);
            _.each(newViews, function (view, idx) {
                if (!view.key)
                    _this.all.splice(idx, 0, ko.mapping.fromJS(new ag.ViewData(view, true)));
            });

            viewToSelect = (selectViewIdx >= 0 && selectViewIdx < this.all().length) ? this.all()[selectViewIdx] : this.getDefault();
            this.setSelected(viewToSelect, forceUpdate);
        };

        // Overwrite an exiting view.
        ViewsViewModel.prototype.updateView = function (updatedView) {
            var view = _.find(this.all(), function (item) {
                return item.key() === updatedView.key;
            });

            if (!view)
                return;

            ko.mapping.fromJS(new ag.ViewData(updatedView, true), view);
        };

        ViewsViewModel.prototype.addUnsavedView = function (viewData) {
            var view = ko.mapping.fromJS(viewData);
            this.all.push(view);
            this.selected(view);
            this.showConfigure(true);
        };

        //  public getHiddenFields(): Array<any>
        //{
        //   return _.filter(this.selected().fields(), (item: any) =>
        //   {
        //      return item.hidden();
        //   } );
        //  }
        //#endregion
        ViewsViewModel.prototype.applyViewRequest = function () {
            this.apply();
        };

        ViewsViewModel.prototype.apply = function () {
            var _this = this;
            var view = ko.mapping.toJS(this.selected);
            ag.filters.transformFilters(view.filters);

            return this.proxy.applyView(this.selected().key(), { view: view }).then(function (result) {
                _this.showConfigure(false);
                ag.messages.show(result.message, result.messageType);

                if (_.isArray(result.data.childViews))
                    _this.updateSelectedViewAndChildren(result.data);
                else
                    _this.updateSelectedView(result.data);
            });
        };

        ViewsViewModel.prototype.updateSelectedView = function (data) {
            // Update the selected view (if it is a new view the client key should now be populated)
            ko.mapping.fromJS(new ag.ViewData(data, true), this.selected());
        };

        ViewsViewModel.prototype.updateSelectedViewAndChildren = function (data) {
            var _this = this;
            this.deleteChildViews(this.selected());

            _.each(data.childViews, function (i) {
                _this.all.push(ko.mapping.fromJS(new ag.ViewData(i, true)));
            });

            this.updateSelectedView(data.view);
        };
        return ViewsViewModel;
    })();
    ag.ViewsViewModel = ViewsViewModel;
})(ag || (ag = {}));
