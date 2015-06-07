module ag
{
   "use strict";

   export class FiltersViewModel
   {
      availableOperators: any;
      selectedFilters: KnockoutComputed<any>;
      selectedFilter = ko.observable();
      selectedFilterGroup = ko.observable<any>();
      filterToFocus = ko.observable();

      constructor(public options)
      {
         this.availableOperators = options.availableOperators || {};

         this.selectedFilter.equalityComparer = ag.utils.strictEqualityComparer;
         this.selectedFilterGroup.equalityComparer = ag.utils.strictEqualityComparer;

         this.selectedFilters = ko.computed(this.computeSelectedFilters, this).extend({ rateLimit: ag.utils.getRateLimitOption() });
      }

      private computeSelectedFilters()
      {
         return this.selectedFilterGroup() ? this.getFilters(this.selectedFilterGroup()) : [];
      }

      updateOperator(newValue)
      {
         // "this" is effectively a FilterData object
         var oldValue = (<any>this).operator.peek(),
            multiValueOperators = [constants.OperatorType.OneOf, constants.OperatorType.NotOneOf];  

         // If the operator changes and we are going from a single-select style operator
         // to a mult-select style (or vice versa) update the values of the value1 and multiValue1 appropriately.
         var oldWasMulti = multiValueOperators.indexOf(oldValue) > -1,
            newIsMulti = multiValueOperators.indexOf(newValue) > -1;

         // single-value => multi-value
         if (!oldWasMulti && newIsMulti)
         {
            // Convert value1 to an array (if not already) and set at the value of multiValue1
            var newMultiValue1 = (<any>this).value1.peek();
            if (_.isArray(newMultiValue1))
               (<any>this).multiValue1(newMultiValue1);
            else
               (<any>this).multiValue1((!isNullOrUndefined(newMultiValue1) ? [newMultiValue1] : []));
         }

         // multi-value => single-value
         if (oldWasMulti && !newIsMulti)
         {
            var newValue1 = null,
               multiValue1 = (<any>this).multiValue1.peek();

            // If there are any values in the multiValue1 take the first and put it in value1
            if (multiValue1.length > 0)
               newValue1 = multiValue1[0];
               
            (<any>this).value1(newValue1);
         }

         // Set the new value    
         (<any>this).operator(newValue);
      }

      static isEnum(filter: any): boolean
      {
         return ko.unwrap(filter.dataType) === "enum";
      }

      singleValueSelected(data)
      {
         var isEnum =  FiltersViewModel.isEnum(this),
            prop = "name",
            newValue = data,
            getValueFromObject = item => 
            { 
               if (isEnum)
                  return item;

               if (_.isObject(item) && item[prop])
                  return item[prop];
               
               return null;
            };

         if (_.isArray(data) && data.length > 0)
            newValue = getValueFromObject(data[0]);
         else if (_.isObject(data))
            newValue = getValueFromObject(data);
         else if (newValue === "")
            newValue = null;

         // "this" is effectively a FilterData object
         (<any>this).value1(newValue);

         // New single value selected, clear the multi value
         (<any>this).multiValue1([]);
      }

      isSingleValueOperator(operatorObs)
      {
         var operatorType = ag.constants.OperatorType,
            operator = ko.unwrap(operatorObs);

         return operator === operatorType.EqualTo ||
            operator === operatorType.NotEqualTo ||
            operator === operatorType.LessThan ||
            operator === operatorType.NotLessThan ||
            operator === operatorType.GreaterThan ||
            operator === operatorType.NotGreaterThan ||
            operator === operatorType.Contains ||
            operator === operatorType.DoesNotContain ||
            operator === operatorType.OneOfData ||
            operator === operatorType.NotOneOfData;
      }

      isRangeOperator(operatorObs)
      {
         var operatorType = ag.constants.OperatorType,
            operator = ko.unwrap(operatorObs);

         return operator === operatorType.Between || operator === operatorType.NotBetween;
      }

      isSelectionOperator(operatorObs)
      {
         var operatorType = ag.constants.OperatorType,
            operator = ko.unwrap(operatorObs);

         return operator === operatorType.OneOf || operator === operatorType.NotOneOf;
      }

      isStringLookup(data: FilterData): boolean
      {
         if (ko.unwrap(data.dataType) === 'string')
         {
            var operatorVal = ko.unwrap(data.operator);
            if (operatorVal == constants.OperatorType.OneOfData || operatorVal == constants.OperatorType.NotOneOfData)
               return true;
         }

         return false;
      }

      getOperatorLabel(operator)
      {
         return this.availableOperators[ko.unwrap(operator)];
      }

      setMatchAll(parents, filterGroup)
      {
         if (this.isDescendant(parents))
            filterGroup.all(true);
      }

      setMatchAny(parents, filterGroup)
      {
         if (this.isDescendant(parents))
            filterGroup.all(false);
      }
      
      removeBranch(parents, filterGroup)
      {
         if (!this.isDescendant(parents))
            return;

         this.selectedFilterGroup(null);
         parents[0].matches.remove(filterGroup);
      }

      addBranch()
      {
         var newFilterGroup = this.createFilterGroup(!this.selectedFilterGroup().all());
         this.addToSelectedFilterGroup([newFilterGroup]);
      }

      createFilterGroup(all: boolean = false)
      {
         return ko.mapping.fromJS(
         {
            all: all,
            matches: []
         });
      }

      addFilters(explorerItems: any): void
      {
         this.addToSelectedFilterGroup(_.map(explorerItems, (item: any) =>
         {
            item.key = item.internalName;
            item.displayName = item.fullDisplayName;
            item.dataType = item.fieldType.toLowerCase();
            item.isLink = false;
            item.subQueryName = '';

            return ag.filters.buildFilter(item, true);
         }));
      }

      addFilterLinks(explorerItems: any): void
      {
         this.addToSelectedFilterGroup(_.map(explorerItems, (item: any) =>
         {
            item.key = item.internalName;
            item.isLink = true;
            item.operator = 0;
            item.dataType = '';
            item.isParameter = true;
            item.subQueryName = '';

            return ko.mapping.fromJS(item);
         }));
      }

      private addToSelectedFilterGroup(items: any[])
      {
         var selectedFilterGroup = this.selectedFilterGroup(),
            lastItem = _.last(items);

         _.each(items, (item: any) =>
         {
            selectedFilterGroup.matches.push(item);
         });

         if (lastItem)
         {
            if (this.isFilterGroup(lastItem))
               this.selectMatch(lastItem, null);
            else
               this.selectMatch(selectedFilterGroup, lastItem);
         }
      }

      selectMatch(group, filter)
      {
         this.selectedFilterGroup(group);
         this.selectedFilter(filter);
         this.filterToFocus(filter);
      }

      isDescendant(parents)
      {
         return parents.length > 1;
      }

      private getFilters(group)
      {
         var result = [];

         _.each(group.matches(), (match: any) =>
         {
            if (this.isFilterGroup(match))
            {
               _.each(this.getFilters(match), m=>
               {
                  result.push(m);
               });
               
            }
            else
            {
               result.push(match);
            }
         });

         return result;
      }

      isFilterGroup(item: any): boolean
      {
         return !_.isUndefined(item.all);
      }

      isSelectedGroup(group)
      {
         if (this.selectedFilter())
         {
            return false;
         }

         if (this.selectedFilterGroup())
         {
            return this.selectedFilterGroup() === group;
         }

         return false;
      }

      isSelected(filter)
      {
         if (this.selectedFilter())
         {
            return (<any>this.selectedFilter()).key() === filter.key();
         }

         return false;
      }

      getFieldsUrl()
      {
         return "{0}{1}/{2}/{3}".format(
            ag.siteRoot,
            this.options.area || ag.area,
            this.options.controller || ag.controller,
            this.options.fieldsAction || "getQueryFields");
      }

      getLinksUrl()
      {
         return "{0}{1}/{2}/{3}".format(
            ag.siteRoot,
            this.options.area || ag.area,
            this.options.controller || ag.controller,
            this.options.linksAction || "getFilterLinks");
      }

      getFilterDisplayValue(filter: FilterData): string
      {
         return this.isRangeOperator(filter.operator)
            ? filters.getRangeFilterDisplayValue(ko.unwrap(filter.value1), ko.unwrap(filter.value2), ko.unwrap(filter.dataType))
            : filters.getSingleFilterDisplayValue(ko.unwrap(filter.value1), ko.unwrap(filter.dataType));
      }

      createFocusHandler(filter: any, parent: any, element: Element): any
      {
         if (!this.isFilterGroup(parent))
            return false; //do nothing if the filter's aren't hierarchical

         return ko.computed<boolean>(
         {
            read: () =>
            {
               return this.filterToFocus() === filter;
            },
            write: (hasFocus: boolean) =>
            {
               if (hasFocus)
                  this.selectMatch(parent /* currently selected group */, filter);
            },
            disposeWhenNodeIsRemoved: element
         }).extend({ notify: 'always' });
      }
   }
}