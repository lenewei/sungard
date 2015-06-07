/// <reference path="appViewModel.ts" />
/// <reference path="groupEditor.ts" />
/// <reference path="../utils/network.ts" />

module ag
{
   export class AnalyticsDefinitionViewModel extends HierarchicalViewModel
   {
      subType: number;

      // set page title by using the name field.
      resetTitle = () =>
      {
         if (this.isNewItem())
            return;

         this.setPageTitle(this, { name: ko.unwrap(this.editingItem.name) });
      };

      constructor(public options)
      {
         super(options);
         this.editPropertyName = "id";
      }

      cacheCurrentParentKeyValue(fromCopy: boolean = false)
      {
         super.cacheCurrentParentKeyValue(fromCopy, "id");
         this.subType = ko.unwrap(this.editingItem.subType);
      }

      createNewItem(subType): JQueryPromise<any>
      {
         this.cacheCurrentParentKeyValue();
         this.beforeSendCreateItemRequest();

         var params: any = { subType: !_.isUndefined(subType) ? subType : false };
         this.updateCreateItemParams(params);

         return this.itemRequest("createsubtype", params, true);
      }

      updateCreateItemParams(params): void
      {
         super.updateCreateItemParams(params);
         if (!_.has(params, "subType"))
            $.extend(params, { subType: this.subType });
      }

      getKeyQueryString(key): string
      {
         return "id=" + key;
      }

      navigateGetParams(): any
      {
         return { id: null };
      }

      navigateToParent()
      {
         this.navigateToItem((<any>_.last(ag.viewModel.breadcrumb.parents())).id());
      }

      itemRequest(action, params, isNewItem, byPOST: boolean = false): JQueryPromise<any>
      {
         return super.itemRequest(action, params, isNewItem, byPOST).then(this.resetTitle);
      }

      saveItem(clearAfter = false): JQueryPromise<any>
      {
         return super.saveItem(clearAfter).done(this.resetTitle);
      }
   }

   export class SecurityDefintionViewModel extends AnalyticsDefinitionViewModel
   {
      constructor(public options)
      {
         super(options);
         this.hasRootEditor = false;
      }

      afterApplyBindings()
      {
         this.isNewItem(false);
         // always make sure isNewItem is false
         this.isNewItem.subscribe((value) =>
         {
            if (value)
               this.isNewItem(false);
         });
      }

   }

   export class ColumnDefinitionViewModel extends AnalyticsDefinitionViewModel
   {
      beforeApplyBindings()
      {
         ColumnDefinitionViewModel.initialise(this.grids.calculated);
      }

      static initialise(grid: any)
      {
         (<GridEditorViewModel>grid.editor).canCreateFn = ko.computed(() =>
         {
            var items = grid.items;

            if (!items || ko.unwrap(items).length == 0)
               return true;

            return false;
         });
      }

      static getExpressionValidateExtraRequestData(calculatedColumn: any, calculatedColumnSet: any): any
      {
         return {
            actualName: calculatedColumn.actualName(),
            calculatedColumnSet: ko.mapping.toJS(calculatedColumnSet)
         };
      }
   }

   export class AlertDefinitionViewModel extends AnalyticsDefinitionViewModel
   {
      afterApplyBindings()
      {
         AlertDefinitionViewModel.initialise(this.grids, this.editingItem);
      }

      static initialise(grids: any, editingItem: any)
      {
         var alertsGrid: GridViewModel = grids.alertsDefinitions,
            messagesGrid: GridViewModel = grids.currentMessages;

         messagesGrid.isVisible(false);

         alertsGrid.selected.item.subscribe((value) =>
         {
            if (value)
            {
               messagesGrid.isVisible(true);
               messagesGrid.refreshData(false, { selectedItem: value });
            }
         });
      }
   }

   export class MappingProfilesHierarchicalViewModel extends AnalyticsDefinitionViewModel
   {
      static matchingCriteriaOrderedColumns: any;
      static positionKeyDictionary = [
         { key: "counterparty", value: "counterpartyPosition" },
         { key: "currency", value: "currencyPosition" },
         { key: "entity", value: "entityPosition" },
         { key: "instrument", value: "instrumentPosition" },
         { key: "transactionType", value: "transactionTypePosition" },
         { key: "yieldCurve", value: "yieldCurvePosition" },
         { key: "issuer", value: "issuerPosition" },
         { key: "unitIssue", value: "unitIssuePosition" }
      ]

      afterApplyBindings(): void
      {
         MappingProfilesHierarchicalViewModel.initialise(this.grids, this.editingItem);
      }

      loadItem(result, isNewItem: boolean): JQueryDeferred<any>
      {
         var deffered = super.loadItem(result, isNewItem);

         deffered.always(() =>
         {
            MappingProfilesHierarchicalViewModel.matchingCriteriaStaticInit(this.grids.matchingCriteria);
         });

         return deffered;
      }

      static matchingCriteriaStaticInit(matchingCriteria: GridViewModel)
      {
         MappingProfilesHierarchicalViewModel.reorderTheMatchingCriteriaColumns(matchingCriteria);
         MappingProfilesHierarchicalViewModel.matchingCriteriaOrderedColumns = ko.mapping.toJS(matchingCriteria.views.visibleColumns.slice(1));
      }

      static initialise(grids: any, gridViewModelContext)
      {
         var matchingCriteria: GridViewModel = grids.matchingCriteria,
            settings: GridViewModel = grids.settings;

         // Update grid context
         matchingCriteria.viewModel = gridViewModelContext;
         settings.viewModel = gridViewModelContext;

         matchingCriteria.editor.afterUpdate = () => { settings.refresh(); };
         MappingProfilesHierarchicalViewModel.matchingCriteriaOrderedColumns = ko.mapping.toJS(matchingCriteria.views.visibleColumns.slice(1));
         matchingCriteria["reorderColumnsAfterInvokeCallback"] = () =>
         {
            matchingCriteria.views.visibleColumns(
               [ko.mapping.toJS(matchingCriteria.views.visibleColumns()[0])]
                  .concat(ko.mapping.toJS(MappingProfilesHierarchicalViewModel.matchingCriteriaOrderedColumns))
               );

            // Update the latest position value into the editingItem
            _.each(ko.mapping.toJS(matchingCriteria.columns).slice(1),(item: any, index) =>
            {
               _.each(MappingProfilesHierarchicalViewModel.positionKeyDictionary,(keyValue) =>
               {
                  if (keyValue.key == item.key)
                     matchingCriteria.viewModel[keyValue.value](index + 1);
               });
            });
         };
      }

      static reorderTheMatchingCriteriaColumns(matchingCriteria: GridViewModel)
      {
         var findPosition = (columnObservable: any) =>
         {
            var keyValueObj = undefined;
            _.find(MappingProfilesHierarchicalViewModel.positionKeyDictionary,(keyValue) =>
            {
               if (keyValue.key == ko.unwrap(columnObservable.key))
               {
                  keyValueObj = keyValue;
                  return true;
               }
               return false;
            });

            if (!keyValueObj)
               return 0;

            return matchingCriteria.viewModel[keyValueObj.value]();

         };

         matchingCriteria.views.visibleColumns.sort((left: any, right: any) =>
         {
            var leftPositionIndex = findPosition(left);
            var rightPositionIndex = findPosition(right);

            return leftPositionIndex == rightPositionIndex ? 0 : leftPositionIndex < rightPositionIndex ? -1 : 1;
         });
      }
   }

   export class ScenarioDefinitionViewModel extends AnalyticsDefinitionViewModel
   {
      beforeApplyBindings()
      {
         ScenarioDefinitionViewModel.initialise(this.grids, this.editingItem, this);
      }

      static initialise(grids: any, editingItem: any, viewModel)
      {
         var scenarioGrid: GridViewModel = grids.scenarioDefinitions,
            curveGrid: GridViewModel = grids.currentCurves,
            pointGrid: GridViewModel = grids.currentPoints;

         curveGrid.viewModel = editingItem;

         curveGrid.isVisible(false);
         pointGrid.isVisible(false);

         scenarioGrid.items.subscribe((value) =>
         {
            if (value.length === 0)
            {
               curveGrid.isVisible(false);
               pointGrid.isVisible(false);
            }
         });

         scenarioGrid.selected.item.subscribe((value: any) => 
         {
            if (!value)
               return;

            if (editingItem.currentDefinitionKey() == value.key)
               return;

            editingItem.currentDefinitionKey(value.key);

            curveGrid.isVisible(true);
            curveGrid.clearData();
            curveGrid.reset();
            curveGrid.refreshData(false, { selectedItem: value });
            pointGrid.isVisible(false);
            pointGrid.clearData();
         });

         curveGrid.items.subscribe((value) =>
         {
            if (value.length === 0)
            {
               pointGrid.isVisible(false);
            }
         });

         curveGrid.selected.item.subscribe((value: any) =>
         {
            if (value)
            {
               if (editingItem.currentCurveKey() === value.key)
                  return;

               editingItem.currentCurveKey(value.key);
               pointGrid.isVisible(true);
               pointGrid.reset();
               pointGrid.refreshData(false, { selectedItem: value });
               $('#ratesTabHeader a').click();
            }
         });

         var curveGridEditor = curveGrid.editor,
            pointGridEditor = pointGrid.editor,
            scenarioGridEditor = scenarioGrid.editor,
            interpolateAction = pointGrid.actions.interpolate;

         scenarioGridEditor.afterUpdate = () => 
         {
            pointGrid.refresh(false);
            $('#ratesTabHeader a').click();
         };

         curveGridEditor.afterUpdate = () =>
         {
            pointGrid.refresh();
            $('#ratesTabHeader a').click();
         };

         pointGridEditor.afterUpdate = () =>
         {
            curveGrid.refresh();
         };

         interpolateAction.afterInvoke = () =>
         {
            curveGrid.refresh();
         };

         viewModel.scenarioGraph = new ag.risk.ScenarioGraphViewModel(pointGrid);
      }
   }

   export class FiltersDefinitionViewModel extends AnalyticsDefinitionViewModel
   {
      saveItem(clearAfter = false): JQueryPromise<any>
      {
         return super.saveItem(clearAfter).done(() =>
         {
            if (!clearAfter)
               return;

            this.filters.selectedFilters([]);
            var g = <any>this.filters.selectedFilterGroup();
            <any>g.matches([]);
            $('a[data-bind*="filters.getFieldsUrl"].btn').closest('div.filter').remove();
            $('label[data-bind*="filters.selectMatch"]').removeClass('selected');
         });
      }
   }

   export interface IHedgeEquivalent
   {
      currency: string;
      entity: string;
      id: number;
      instrument: string;
      numberOfBuckets: number;
      sequenceNumber: number;
   }

   export class TimeProfilesHierarchicalViewModel extends AnalyticsDefinitionViewModel
   {
      afterApplyBindings(): void
      {
         TimeProfilesHierarchicalViewModel.initialise(this.editingItem);
      }

      static initialise(editingItem: any)
      {
         var delegate = () =>
         {
            _.each($("#hedgeEquivalents tr td:last-child"),(td: HTMLElement) =>
            {
               $(td).children("button").show();
               $(td).children("i").hide();
            });

            var disabledValues = _.map(editingItem.bucketDefinitions(),(timeProfileRowInner: any) =>
            {
               return timeProfileRowInner.hedge();
            });

            disabledValues = _.filter(disabledValues,(target: any) =>
            {
               return parseInt(target) !== NaN;
            });

            _.each($("#hedgeEquivalents tr input[data-bind*='numberOfBuckets']"),(input: HTMLElement) =>
            {
               var value = $(input).val(),
                  match = _.find(disabledValues,(disabledValue) =>
                  {
                     return value == disabledValue;
                  });

               if (!match) return;

               var lasttd = $(input).closest("td").next("td");
               lasttd.children("button").hide();
               lasttd.children("i").show();
            });
         }

         editingItem.hedgeEquivalents.subscribeChanged((newValues, oldValues) =>
         {
            // remove item, we don't need do anything
            if (oldValues.length > newValues.length)
               return;

            var array = <Array<IHedgeEquivalent>>ko.mapping.toJS(newValues);

            if (!array || array.length == 0 || array.length == 1)
               return;

            if (newValues[array.length - 1].numberOfBuckets() != 1)
               return;

            var currentMaxNumberOfBuckets = _.max(array,(temp: IHedgeEquivalent) =>
            {
               return temp.numberOfBuckets;
            });

            newValues[array.length - 1].numberOfBuckets(currentMaxNumberOfBuckets.numberOfBuckets + 1);
         });

         editingItem.bucketDefinitions.subscribe((values) =>
         {
            _.each(values,(timeProfileRow: any) =>
            {
               timeProfileRow.hedge.subscribe(() =>
               {
                  delegate();
               });
            });

            delegate();
         });
      }
   }
}