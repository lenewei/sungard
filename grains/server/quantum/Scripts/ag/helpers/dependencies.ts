/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />

module ag.dependencies
{
   "use strict";

   //#region Information
   /*
  Provides a centralised place to handle UI related dependecies. These dependencies are derived form the models
  meta data attributes. These attributes are then serialized into JSON objects to be consumed by the 
  following functions.
   
  //#region Field Dependencies
      
  Field Dependencies

  An 'Availability' dependency condition makes the field available : i.e. not read only
  A 'Visibility' condition makes the field visible
  A 'Value' condition can determine the field's value
  A 'State' condition encompasses all the previois conditions
  A 'Refresh' condition causes the model to be refreshed from the server

  All 'Availability' \ 'Visibility' conditions have the following properties:

  Who:
        
  string       dependent      - who is affected
  string       dependsOn      - who the dependent needs to be aware of, i.e. who triggers a change in state
        
  When:

  enum         condition      - what condition need to be met, i.e. does x == y    
  any type     compareValue   - the value to compare with
  string       compareTo      - compare with the value of another property

  Action: If so then perform an action, i.e. set the dependent property to invisible

  bool         value          - true \ false

  Miscellaneous

  bool         applyAtStartUp - Check this rule \ condition when the page loads

  'Value', State' conditions have the following extra modified properties:

  enum         action         - possible actions, e.g. Set value, reset property, call a custom function
  any type     value          - Sets the property value
  string       functionName   - function to call
         
  'State' conditions only

  bool         available      - Set Availablity to true \ false
  bool         visible        - Set Visibility to true \ false

  'Refresh'

  string      trigger         - who triggers the refresh
  string      action          - action that is to be performed at the server
  string      associatedFields - list of fields that are affected by the refresh 
  string      associatedLookups - list of prefetched lookups that are affected by the refresh 

  //#endregion

  //#region Complex Dependencies
      
  Complex Dependencies

  A complex dependency a a dependency between fields that is best modelled using specific js code. This
  code should generic and could be used in a number of circumstances.

  In the included examples the following relationships are modelled:

  TermRelationship
  Changing 'Deal Date' affects 'Term'       ('Term' = 'Settlement Date' - 'Deal Date')  
  Changing 'Settlement Date' affects 'Term' ('Term' = 'Settlement Date' - 'Deal Date')
  Changing 'Term' value affects 'Settlement Date' ('Settlement Date' = 'Deal Date' + 'Term')

  SyncRelationship
  Changing 'Settlement Date' modified 'Bank Value Date'

  CycleBasisAndDateRelationship
  Changing 'Frequency' to 'Monthly' and 'CycleBasis' to 'END OF MONTH' sets 'Settlement Date' the end of the month
  Changing 'Settlement Date' affects 'CycleBasis'. When 'CycleBasis' is 'END OF MONTH' and 'Settlement Date' is not the end of the month then set 'CycleBasis' as 'DAY OF MONTH'.

  //#endregion
  */

   //#endregion

   // Actions that can be applied to a property
   // This enum needs to be kept in sync with the the 'PerformAction' enum on the server
   enum performAction
   {
      None = 0,
      Clear = 1, // Clear Property
      Reset = 2, // Reset Property
      SetValue = 3, // Set Value
      CopyFrom = 4, // Copy from another property
      CustomFunction = 5, // Apply a function to a property, e.g. GetDate
      Refresh = 6, // Refresh from server
      ResetModel = 7, // Reset Property
   };

   enum applyCondition
   {
      AllTheTime = 0,
      OnlyWhenTheGivenPropertyIsModified = 1,
      OnlyWhenTheGivenPropertyIsNotModified = 2,
      OnlyWhenTheGivenPropertyIsModifiedByUser = 3,
      OnlyAtStartup = 4,
      OnlyWhenKeyHasChanged = 5
   };

   export function init(viewModel, models, options, app, startInUpdateMode: boolean = true): IDependenciesHandle
   {
      var result = new DependencyFactory();
      return result.init(viewModel, models, options, app, startInUpdateMode);
   }

   interface IViewModelInformation
   {
      options: any;
      viewModel: any;
      app: any;
      keyFields: any;
   }

   interface IDependencyPath
   {
      isAction: boolean;
      isCollection: boolean;
      path: string[];
   }

   export interface IMetaObservable extends KnockoutObservable<any>
   {
      applyFunction(any): void;
      clear(): void;
      copyFrom(metaObservable: IMetaObservable): void;
      isAvailable: KnockoutComputed<boolean>;
      isVisible: KnockoutObservable<boolean>;
      isProcessing: KnockoutComputed<boolean>;
      label: KnockoutObservable<string>;
      isKeyField: KnockoutObservable<boolean>;
      isSuspended: KnockoutComputed<boolean>;
      isDirty: KnockoutComputed<boolean>;
      refresh(revert: boolean, additionalFields: string)
      reset();
      removeAll();
      void;
   }

   interface IDependencyBaseRule
   {
      additionalFields: string;
      alsoDependsOn: string;
      alsoDependsOnObservable: IMetaObservable;
      applyAtStartUp: boolean;
      applyAtStartupForTheseFields: string[];
      applyCondition: applyCondition;
      associatedFields: string;
      associatedLookups: string;
      category: string;
      compareObservable: IMetaObservable;
      compareValue: any;
      compareTo: string;
      byCopyingFrom: string;
      byCopyingFromObservable;
      condition: conditionEnum;
      controller: string;
      dependent: string;
      dependentCondition: conditionEnum;
      dependentObservable: IMetaObservable;
      dependsOn: string;
      functionName: string;
      hasOwnFunctions: boolean;
      includeModelData: boolean;
      id: number;
      observable: IMetaObservable;
      oneWay: boolean;
      path: IDependencyPath;
      remoteAction: string;
      suspendFields: string;
      value: any;
      whenTheseFieldsHaveChanged: string[];
      priority: number;
   }

   interface IDependencyRule extends IDependencyBaseRule
   {
      action: performAction;
      withAnotherCompareValue: any;
      anotherCondition: conditionEnum;
      secondaryConditionIsOr: boolean;
   }

   interface IDependencyRefreshRule extends IDependencyBaseRule
   {
      action: string;
   }

   interface IDependencyStateRule extends IDependencyRule
   {
      available: boolean;
      visible: boolean;
      label: string;
   }

   interface IDependencyModel
   {
      complex: IDependencyComplex[];
      paths: IDependencyPath[];
      field: string;
   }

   interface IDependencyComplex
   {
      name: string;
      parameters: Array<any>;
   }

   export interface IDependenciesHandle
   {
      dispose(): void;
   }

   interface IDependencyCategory
   {
      type: string; //Dependency Type, availability etc
      propertyMethod: string; // Property on the meta observable field, e.g. isVisible etc.
      handler: (rule: IDependencyRule) => void; //Method that needs to be fired when the 'dependsOn' field changes
   }

   class DependencyCategory implements IDependencyCategory
   {
      type: string;
      propertyMethod: string;
      handler: (rule: IDependencyRule) => void;
      ignoreIfSuspended: boolean;

      constructor(type: string, propertyMethod: string, handle: (rule: IDependencyRule) => void, ignoreIfSuspended: boolean)
      {
         this.type = type;
         this.propertyMethod = propertyMethod;
         this.handler = handle;
         this.ignoreIfSuspended = ignoreIfSuspended;
      }
   }

   class Task
   {
      callee: IMetaObservable;
      id: number;
      handler: Function;
      updatingModel: boolean;
      ignoreWhenSuspended: boolean;
      context: FieldDependencies;
      rules: TaskRulesBase;
      triggers: string[];
      allowMultipleTriggers: boolean;
   }

   class TaskRulesBase
   {
      trigger: string;
   }

   class TaskRulesRefresh extends TaskRulesBase
   {
      context: FieldDependencies;
      rule: IDependencyRefreshRule;
      path: IDependencyPath;
   }

   class TaskRulesDependencies extends TaskRulesBase
   {
      dependentName: string;
      rules: Array<IDependencyRule>;
      matchedRuleHandler: (any) => void;
   }

   class DependencyFactory
   {
      constructor()
      {
      }

      // initialize dependencies
      init(viewModel, models: any, options, app, startInUpdateMode: boolean): DependenciesHandle
      {
         if (!models || _.size(models) === 0) return new DependenciesHandle();

         var viewModelInfo: IViewModelInformation =
            {
               options: options,
               viewModel: viewModel,
               app: app,
               keyFields: app.fieldCategories ? app.fieldCategories.keyFields || [] : [],
            };

         var dependenciesHandle = new DependenciesHandle();
         var fieldDependencyRule = new FieldDependencies(app, startInUpdateMode);
         
         dependenciesHandle.addDependency(fieldDependencyRule);

         $.each(models, (i: number, model: IDependencyModel) =>
         {
            // Set up all the field Dependencies
            this.createFieldDependencyRules(fieldDependencyRule, i, viewModelInfo, model, app.fieldCategories);

            // Set up all the complex Dependencies
            dependenciesHandle.addDependencyRange(this.createComplexDependencyRules(app, viewModelInfo, model, startInUpdateMode));
         });

         return dependenciesHandle;
      }


      private createComplexDependencyRules(app: any, viewModel: any, model: IDependencyModel, startInUpdateMode: boolean): ComplexDependency[]
      {
         if (model == null)
            return [];

         var items = model.complex;
         if (items == null || !$.isArray(items)) return [];

         var dependencyFactory = new ComplexDependencyFactory(app, startInUpdateMode),
            dependencies = [];

         $.each(model.paths, (i, path: IDependencyPath) =>
         {
            $.each(model.complex, (j, rule: IDependencyComplex) =>
            {
               dependencies.push(dependencyFactory.create(rule.name, rule.parameters, path, viewModel));
            });
         });

         return dependencies;
      }

      private createFieldDependencyRules(fieldRules: FieldDependencies, id: number, viewModelInfo: IViewModelInformation, model: IDependencyModel, fieldCategories)
      {
         fieldRules.create(id, viewModelInfo, model, fieldCategories);
      }
   }


   class DependencyBase
   {
      app: any;
      updatingModel: KnockoutComputed<boolean>;
      ignoreCallee: any;

      private updatingViewModel: KnockoutObservable<boolean>;
      private loadingViewModel: KnockoutComputed<boolean>;
      private releaseTasks: KnockoutComputed<void>;
      private subTokens = [];
      actionQueue: KnockoutObservableArray<Task>;
      viewModel: any;
      public runningId: number = 0;

      private updatingCount: KnockoutObservable<number>;


      constructor(app: any, startInUpdateMode: boolean)
      {
         this.actionQueue = ko.observableArray([]);
         this.updatingCount = ko.observable(0);
         this.updatingViewModel = ko.observable(startInUpdateMode);
         this.app = app;

         this.updatingModel = ko.computed
            (
            {
               read: () =>
               {
                  var result: boolean = (this.updatingCount() > 0 || (this.loadingViewModel && this.loadingViewModel()));
                  return result;
               },
               write: (value: boolean) =>
               {
                  var currentDepth = this.updatingCount();
                  currentDepth += (value ? 1 : (-1));
                  this.updatingCount(Math.max(currentDepth, 0));
               }
            }
            );

         this.loadingViewModel = ko.computed
            (
            {
               read: () =>
               {
                  var result = <boolean>(this.app ? this.app.updatingModel() : false) || this.updatingViewModel();

                  return result;
               },
            }
            );

         this.subscribeToTopic(ag.topics.UpdatingViewModel, (msg, data) =>
         {
            if (data.viewModel == this.app)
            {
               this.updatingViewModel(data.value);
            }
         });

         this.subscribeToTopic(ag.topics.ApplyBindingDone, () =>
         {
            this.updatingViewModel(false);
         });

         this.releaseTasks = ko.computed(() =>
         {
            if (!this.loadingViewModel() && this.actionQueue().length > 0)
            {
               while (this.releaseTask())
               {
               }
            }
         }).extend({ rateLimit: { timeout: 50, method: "notifyWhenChangesStop" } });
      }

      subscribeToTopic (topic: string, callback: (msg, data) => void): void
      {
         this.subTokens.push(PubSub.subscribe(topic, callback));
      }

      dispose(): void
      {
         _.each(this.subTokens, (token) =>
         {
            PubSub.unsubscribe(token);
         });

         this.loadingViewModel.dispose();

         // nice to have: dispose the subscription in addTask. This is a low priority since the
         // dereferencing the model also marks the subscription for garbage collection.
      }

      checkDuplicateTask(task: Task): void
      {
         var id: number = task.id;
         var items: Task[] = this.actionQueue.remove((y) => y.id == id);

         if (items.length > 0 && task.allowMultipleTriggers)
         {
            _.forEach(items, removedItem =>
            {
               task.triggers = _.union(task.triggers, removedItem.triggers);
            });
         }
         this.actionQueue.push(task);
      }

      addTask(id: number, context: any, callee: any, fn: any, rules: TaskRulesBase, ignoreIfAlreadyUpdating: boolean = false, ignoreIfSuspended: boolean = false, allowMultipleTriggers: boolean = false)
      {
         var applyTask: any = (updatingModel: boolean) =>
         {

            var task: Task = {
               id: id, context: context, callee: callee, handler: fn, rules: rules,
               updatingModel: updatingModel, ignoreWhenSuspended: ignoreIfSuspended,
               triggers: [rules.trigger], allowMultipleTriggers: allowMultipleTriggers
            };
            this.checkDuplicateTask(task);

         };
         if (callee)
         {
            callee.subscribe(() =>
            {
               var updatingModel: boolean = ko.unwrap(this.updatingModel);
               if (this.ignoreCallee === callee) return;
               if (ignoreIfAlreadyUpdating && updatingModel) return;
               if (ignoreIfSuspended && ko.unwrap(callee.isSuspended)) return;
               applyTask.call(context, updatingModel);
            });
         }
         else
         {
            applyTask.call(context, ko.unwrap(this.updatingModel));
         };
      }

      private releaseTask(): boolean
      {
         if (!this.actionQueue || ko.unwrap(this.actionQueue).length == 0) return false;

         var action: Task = this.actionQueue.shift(),
            callee = action.callee,
            handler = action.handler,
            context = action.context,
            rules = action.rules;

         var ignoreIfSuspended = action.ignoreWhenSuspended;

         if (callee == null || !ignoreIfSuspended || !ko.unwrap(callee.isSuspended))
         {
            handler.call(context, rules, action.updatingModel, action.triggers);
         }
         return (this.actionQueue().length > 0);
      }

        public handleRefreshDependency = (taskRule: TaskRulesRefresh, updatingModel: boolean) =>
      {
         var trigger: string = taskRule.trigger, rule: IDependencyRefreshRule = taskRule.rule, path: IDependencyPath = taskRule.path;

         var observable: IMetaObservable = this.getObservableFromPath(taskRule.context, path, trigger);
         if (observable && !observable.isSuspended())
         {
            if (this.applyRuleOnUpdate(updatingModel, rule, trigger)) return false;

            if (rule.dependentCondition === conditionEnum.Modified || (is(observable(), rule.dependentCondition, null, false)))
               this.handleRefresh(rule.id, taskRule.context, observable, rule.dependent, rule.action, rule.associatedFields, rule.associatedLookups,
                  rule.additionalFields, rule.suspendFields, path, rule.includeModelData, rule.controller, rule.oneWay);
         }
         return true;
      }

        /// handleRefresh
        /// Initiate call back to the server
        /// Update necessary fields
        handleRefresh(id: number, viewModel: any, source: IMetaObservable,
         sourceName: string, action: string, fields: string, updateLookups: string,
         additionalFields: string, suspendFields: string, path: IDependencyPath,
         includeCompleteModel: boolean, controller: string, oneWay: boolean)
      {
         var params,
            data: any = {};

         var fn = value => this.getObservableFromPath(viewModel, path, value),
            updateAllFields = !oneWay && isBlank(fields),
            fieldsToUpdate = (!oneWay ? toArray(fields, true) : []),
            fieldsToObserve = (!oneWay ? toArray(fields, true, fn) : []),
            prefix = $.map(path.path, n => n.toCamelCase() + ".").join(""),
            suspensions = !oneWay ? toArray(suspendFields, true, fn) : [];

         if (source && sourceName)
         {
            sourceName = prefix + sourceName.toCamelCase();
            data[sourceName] = source();
         }

         if (includeCompleteModel)
         {
            data = ko.mapping.toJS(viewModel);
         }
         else
         {
            if (additionalFields)
            {
               var additions: Array<string> = $.map(additionalFields.split(","), value => value.trim().toCamelCase());
               var temp = additions; //.filter(fn);

               if (temp.length > 0)
               {
                  $.each(temp, (ii, j) =>
                  {
                     data[prefix + j] = this.getObservableFromPath(viewModel, path, j);
                  });
               }
            }
         }
         data["lookupsToUpdate"] = updateLookups;

         // Add the name of the property that was changed to cause the refresh to occur
         data.changedProperty = sourceName;

         params = ko.toJSON(data);

         this.setProcessing(fieldsToObserve, true);
         this.setSuspended(suspensions, true);

         this.app.net.postJson({ action: action, controller: controller }, params).done(result =>
         {
            // Success
            // [AG 4/4/2013] The result may be a DataResponse, an ActionDataResponse or a serialised view model
            if (data.lookupsToUpdate && data.lookupsToUpdate.indexOf("ag.lookups.lookupData") === 0)
            {
               var lookupData: LookupData = ag.utils.transformLookup(result),
                  lookupDataObservable = ag.utils.getObjectPropertyByString(window, data.lookupsToUpdate).data;
               lookupDataObservable(lookupData.data);
            }
            else
            {
               this.setLookups(result.lookups || (result.actionData && result.actionData.lookups), path);
            }

            this.setFields(updateAllFields, id, viewModel, fieldsToUpdate, result.data || result.actionData || result, path, source);
            this.setProcessing(fieldsToObserve, false);
            this.setSuspended(suspensions, false);

            // send out the event to subscribers to update watchers' value
            PubSub.publish(topics.ApplyWatcherValue);
         },
            () =>
            {
               this.setProcessing(fieldsToObserve, false);
               this.setSuspended(suspensions, false);
            });

         return true;
      }

      handleNavigateDependency(taskRule: TaskRulesRefresh, updatingModel: boolean)
      {
         var trigger: string = taskRule.trigger, rule: IDependencyRefreshRule = taskRule.rule, path: IDependencyPath = taskRule.path;
         var observable: IMetaObservable = this.getObservableFromPath(viewModel, path, trigger);
         if (observable.isDirty() && !observable.isSuspended())
         {
            if (this.updatingModel() && !rule.applyAtStartUp) return false;

            if (is(observable(), rule.dependentCondition, null, true))
               this.handleNavigate(rule.id, viewModel, observable, rule.dependent, rule.action, rule.associatedFields, rule.additionalFields, rule.suspendFields, path);
         }

         return true;
      }

      /// handleNavigate
      /// Initiate call back to the server
      /// If a record is found matching the provided key values, do a navigate
      private handleNavigate(id, viewModel, source, sourceName, action, keyFields, additionalFields, suspendFields, path)
      {
         var params,
            data: any = {};

         var fn = value => this.getObservableFromPath(viewModel, path, value);

         keyFields = toArray(keyFields, true, fn);

         var prefix = $.map(path.path, n => n.toCamelCase() + ".").join();

         var suspensions = toArray(suspendFields, true, fn);

         sourceName = prefix + sourceName.toCamelCase();
         data[sourceName] = source();

         // Add the name of the property that was changed to cause the refresh to occur
         data.changedProperty = sourceName;
         data["throwOnNotFound"] = false;

         if (additionalFields)
         {
            var additions = $.map(additionalFields.split(","), value => value.trim().toCamelCase());
            var temp = additions.filter(fn);

            if (temp.length > 0)
            {
               $.each(temp, (ii, j) =>
               {
                  data[prefix + j] = this.getObservableFromPath(viewModel, path, j);
               });
            }
         }

         params = ko.toJS(data);

         // If any of the key fields are null, do nothing 
         if (_.any(params, (val: any) =>
         {
            var type = $.type(val);
            switch (type)
            {
               case 'null':
               case 'undefined':
                  return true;
               case 'number':
                  return val === 0;
               case 'string':
                  return val.trim() === '';
               default:
                  return false;
            }
         }))
         {
            return;
         }

         this.setProcessing(keyFields, true);
         this.setSuspended(suspensions, true);

         this.app.net.getJson(action, params).then(result =>
         {
            // Success
            if (result && result.data && !result.hasErrors)
            {
               // If a matching entity was found, load it and then navigate to it
               // (navigating won't cause it to be reloaded)
               this.app.loadItem && this.app.loadItem(result, false);
               this.app.navigateToItem($.extend({ edit: 'existing' }, params));
            }

            this.setProcessing(keyFields, false);
            this.setSuspended(suspensions, false);
         },
            result =>
            {
               // Error thrown (not wrapped in response as should be)
               if (result && result.statusText)
                  messages.error(result.statusText);

               this.setProcessing(keyFields, false);
               this.setSuspended(suspensions, false);
               this.updatingModel(true);
            });
      }

      getObservableFromPath(viewModel: any, path: IDependencyPath, name: string): IMetaObservable
      {
         var x: string = this.getPropertyPath(path, name),
            pos = this.getObservable(x, viewModel);

         if (!pos || (typeof (pos) === "object" && !ko.isObservable(pos)))
            pos = this.getObservableLegacy(viewModel, path, name);

         return pos;
      }

      getObservablesFromPath(viewModel: any, path: IDependencyPath, name: string): IMetaObservable[]
      {
         var x: string = this.getPropertyPath(path, name),
            splitPropPaths = x.split("[].");

         // For compatibility
         if(splitPropPaths.length == 1)
            return [ this.getObservableFromPath(viewModel, path, name) ];

         if(splitPropPaths.length != 2)
            throw new Error("Only one level deep array is supported");
     
         return _.map(ko.unwrap(this.getObservable(splitPropPaths[0], viewModel)), (i) => ag.getProperty(i, splitPropPaths[1]));
      }

      getValueFromPath(model: any, path: IDependencyPath, name: string): any
      {
         return getProperty(model, this.getPropertyPath(path, name));
      }
      
      getPropertyPath(path: IDependencyPath, name: string): string
      {
         var x: string = path.path.join(".");
         x = (!x || x.length == 0) ? name : x + "." + name;
         return x.toCamelCase();
      }

      private getObservable = _.memoize((name, viewModel) =>
      {
         return getProperty(viewModel, name);
      })

      private getObservableLegacy(viewModel: any, path: IDependencyPath, name: string)
      {
         var pos = viewModel;

         $.each(path.path, function (i1, node)
         {
            pos = pos[node.toCamelCase()];
         });

         var field = name.split(".");
         var length = field.length - 1;
         for (var i = 0; i < length; ++i)
         {
            if (pos === undefined) return false;
            pos = pos[field[i].toCamelCase()];
         }

         // [AG 10/4/2013] It's possible that the dependent field name has been configured incorrectly and
         // does not correspond to a property on the view model.
         if (pos === undefined) return null;

         var obsProp = field[length].toCamelCase();
         if (typeof (pos) === "object" && !ko.isObservable(pos) && !(obsProp in pos))
            throw new Error("Unable to resolve property on view model: " + name);


         return pos[obsProp];
      }

      setProperty(property, newValue)
      {
         var currentCompareValue = property(),
            newCompareValue = newValue;

         if (newValue && _.isDate(newValue))
         {
            // Setup dates for an ISO comparison 
            if (currentCompareValue && _.isDate(currentCompareValue))
               currentCompareValue = moment.utc(currentCompareValue).toISO();

            // Get the ISO string of the newValue as we don't 
            // want to set Date object onto ViewModel (and use for comparison)
            newValue = newCompareValue = moment.utc(newValue).toISO();
         }

         // Update property if there has been a change
         if (currentCompareValue !== newCompareValue)
         {
            property(newValue);
         }
      }

      /// setLookups
      /// Update any lookup datasets on the model
      private setLookups(lookups, path)
      {
         if (!lookups)
            return;

         ag.utils.transformLookups(lookups.propertyLookupReferences, lookups.lookups, path.path);
      }

      /// setProcessing
      /// Set properties processing flag on or off.
      /// This will provide an indication to the user that processing is occurring
      setProcessing(items, flag)
      {
         this.setState(items, "isProcessing", flag);
      }

      /// setSuspended
      /// Set properties suspended flag on or off.
      /// This will provide an indication to the user that processing is occurring
      setSuspended(items, flag)
      {
         this.setState(items, "isSuspended", flag);
      }

      /// setState
      /// Set properties on Meta Observable flag.
      setState(items, method, flag)
      {
         $.each(items, (index, observable) =>
         {
            if (ko.isObservable(observable))
               observable[method](flag);
         });
      }

      /// setFields
      /// Either update selected fields or all associated fields in model
      private setFields(updateAllFields, id, viewModel, fields, model, path, source: IMetaObservable)
      {
         if (updateAllFields)
         {
            try
            {
               /// Don't execute dependencies for the callee/source again even if the value changes
               this.ignoreCallee = source;

               /// If all fields are going to be updated then only apply the dependencies that are required during a start up.
               /// Normally this would only be so set visible and available fields - not field values.
               /// if rqeuired this could be made more granular by adding new attributes.
               this.updatingModel(true);

               ko.mapping.fromJS(model, viewModel);

               utils.resetValidationIfEmpty(viewModel, [source]);
            }
            finally
            {
               this.ignoreCallee = null;
               this.updatingModel(false);
            }
         }
         else
         {
            if (fields && $.isArray(fields) && fields.length > 0)
            {
               $.each(fields, (index, field) =>
               {
                  var dest = this.getValueFromPath(viewModel, path, field);
                  if (dest.refresh)
                  {
                     dest.refresh();
                  }
                  else
                  {
                     ko.mapping.fromJS(this.getValueFromPath(model, path, field), {}, dest);
                     utils.resetValidationIfEmpty(dest);
                  }

               });
            }
         }
      }

      applyRuleOnUpdate(updatingModel: boolean, rule: IDependencyBaseRule, dependsOn: string)
      {
         if (updatingModel && !rule.applyAtStartUp
            && (!rule.applyAtStartupForTheseFields || ($.inArray(dependsOn, rule.applyAtStartupForTheseFields) < 0)))
            return true;
         return false;
      }
   }

   //#region Field Dependencies

   /* Field rules are serialized to client in the following object structure:

  availability
     dependent 1
        condition 1
        condition 2
        condition n
     dependent 2
        condition 1
  visibility
     dependent 2
        condition 1
  value
     dependent 1
        condition 1
  refresh
     dependent 1
        condition 1

  addFieldDependencyRules navigates this structure to determine which knockout subscriptions
  need to be applied.
  */
   class FieldDependencies extends DependencyBase
   {
      private key: KnockoutComputed<any>;
      private keyFields: string[];

      constructor(app: any, updatingModel: boolean)
      {
         super(app, updatingModel);
         this.registerAll();
      }

      generateComputedfields(fields: string[]): KnockoutComputed<any>
      {
         var fieldObject = _.map(fields, (name: string) => ag.getProperty(this.viewModel, name.toCamelCase()));
         var result = ko.computed(() =>
         {
            return ko.toJSON(_.map(ko.toJS(fieldObject), name => String(name).toLowerCase()));
         });

         (<any>result).fieldName = fields.join(",");
         return result;
      }

      create(id: number, viewModelInfo: IViewModelInformation, model: IDependencyModel, fieldCategories: string[])
      {
         var viewModel = this.viewModel = viewModelInfo.viewModel;
         this.keyFields = viewModelInfo.keyFields;
         this.key = this.generateComputedfields(viewModelInfo.keyFields);
         if ($.isEmptyObject(model) || !model)
            return false;

         try
         {
            this.updatingModel(true);
            this.initialise(id, viewModel, model, fieldCategories);
         }
         finally
         {
            this.updatingModel(false);
         }
      }

      initialise(id: number, viewModel: any, model: IDependencyModel, fieldCategories: string[])
      {
         // dependencyTypes
         var dependencyCategories: DependencyCategory[] = [
            new DependencyCategory("availability", "underlying", this.handleAccessabilityProperty, false),
            new DependencyCategory("visibility", "underlying", this.handleVisibilityProperty, false),
            new DependencyCategory("dynamicLabel", "underlying", this.handleDynamicLabelProperty, false),
            new DependencyCategory("value", "underlying", this.handleValueProperty, true),
            new DependencyCategory("fieldRefresh", "underlying", this.handleValueProperty, true),
            new DependencyCategory("state", "underlying", this.handleStateProperty, true),
            new DependencyCategory("resetModel", null, null, true), //, false, this.applyResetModelFields],
            new DependencyCategory("refresh", null, null, true) //, false, this.applyRefreshFields]
         ];

         if (model.field != null && !$.isEmptyObject(model.field))
         {
            $.each(dependencyCategories, (i, dependencyType: DependencyCategory) =>
            {
               $.each(model.paths, (j, path: IDependencyPath) =>
               {
                  if (path.isCollection)
                     return true;

                  path.path = _.map(path.path, (item: string) => { return item.toCamelCase(); });
                  if (dependencyType.propertyMethod !== null) // Apply all conditional field rules, availability, visibility, value and state
                  {
                     if (model.field[dependencyType.type])
                     {
                        $.each(model.field[dependencyType.type], (dependentName: string, dependencyRules) =>
                        {
                           $.each(toArray(dependentName, true), (index, item) =>
                           {
                              // obtain the field or field's property that could be affected.
                              var observable: IMetaObservable = this.getObservableFromPath(viewModel, path, item);
                              observable = observable && observable[dependencyType.propertyMethod];


                              if (observable)
                              {
                                 var rules: IDependencyRule[] = $.extend(true, [], dependencyRules);
                                 var applyFieldMethod = dependencyType.type == "fieldRefresh" ? this.applyFieldRefreshRules : this.applyConditionalFieldRules;
                                 applyFieldMethod.call(this, id, viewModel, rules, observable, item,
                                    dependencyType.propertyMethod, dependencyType.handler, path, this.handleRuleDependency, fieldCategories, dependencyType.ignoreIfSuspended);
                              }
                           });
                        });
                     }
                  }
                  else // Apply all refresh and reset field conditions
                  {
                     if (model.field[dependencyType.type])
                     {
                        if (dependencyType.type == "refresh")
                           this.applyRefreshFields.call(this, id, viewModel, model.field[dependencyType.type], path);
                        else if (dependencyType.type == "resetModel")
                           this.applyResetModelFields.call(this, id, viewModel, model.field[dependencyType.type], path);
                     }
                  }
               });
            });
         }
         return true;
      }


      private applyFieldRefreshRules(id: number, viewModel: any, dependencyRules: IDependencyRule[], observable: IMetaObservable,
         dependentName: string, fnName: string, fn: (any) => void, path: IDependencyPath,
         fnHandle: (dependsOn: string, dependentName: string,
         fieldRules: IDependencyRule[], handler: (any) => void, updatingModel: boolean) => any,
         fieldCategories: string[])
      {
         if (dependencyRules && dependencyRules.length > 0)
         {
            var category = dependencyRules[0].category;
            if (!dependencyRules[0].dependsOn && category)
            {
               var list: Array<IDependencyRule> = [];
               var rule: IDependencyRule = $.extend({}, dependencyRules[0]);
               var dependencyList;
               list.push(rule);

               this.populateRuleProperty(id, rule, observable, dependentName, viewModel, path, []);
               rule.action = performAction.Refresh;
               rule.applyAtStartUp = true;

               if (this.keyFields.length > 0)
               {
                  // observable to suppress and delay change notifications for a specified period of time
                  // this.key.extend({ rateLimit: 50 });
                  dependencyList = this.clone(list);
                  dependencyList[0].applyAtStartUp = true;
                  dependencyList[0].applyCondition = applyCondition.OnlyAtStartup;
                  dependencyList[0].dependsOn = "";
                  dependencyList[0].action = performAction.Refresh;
                  this.addTask(this.runningId++, this, this.key, fnHandle, { trigger: null, dependentName: dependentName, rules: dependencyList, matchedRuleHandler: fn });
               }
               var applyRefreshNow = category.toLowerCase() === "keyfield";

               var linkedFields = applyRefreshNow ? null : fieldCategories[category.toCamelCase()];

               if (linkedFields && linkedFields.length > 0)
               {
                  applyRefreshNow = true;
                  dependencyList = this.clone(list);
                  dependencyList[0].applyAtStartUp = false;
                  dependencyList[0].applyCondition = applyCondition.AllTheTime;
                  dependencyList[0].dependsOn = linkedFields.join(",");
                  dependencyList[0].action = performAction.Refresh;
                  var observe = this.generateComputedfields(linkedFields);
                  this.addTask(this.runningId++, this, observe, fnHandle, { trigger: null, dependentName: dependentName, rules: dependencyList, matchedRuleHandler: fn });
               }

               dependencyRules.shift();
               applyRefreshNow = applyRefreshNow && !path.isAction;
               if (applyRefreshNow)
               {
                  this.addTask(this.runningId++, this, null, fnHandle, { trigger: null, dependentName: dependentName, rules: list, matchedRuleHandler: fn }, false, true);
               }
            }

            // Expand dependentName to include full path - this is to ensure that observables have the full path in this scenario
            // This is because field categories have the full path and the path variable can be reset.
            var newDependentName = $.map(path.path, n => n.toCamelCase() + ".").join("") + dependentName;

            // Reset path so that it is not used to work out observable -- as field category already uses full path name
            var newPath = { path: [], isAction: path.isAction, isCollection: path.isCollection };

            this.applyConditionalFieldRules(id, viewModel, dependencyRules, observable, newDependentName, fnName, fn, newPath, fnHandle);
         }
      }


      /// applyConditionalFieldRules
      /// Group all the fields that trigger a change (dependsOn), attach all the conditions
      /// associated with the affected field and subscribe accordingly.
      ///
      /// Note: 
      /// Once a field triggers a possible change - then all conditions associated with an
      /// affected field are checked. This is done to ensure the affected field is in the coarrect state   
      private applyConditionalFieldRules(id: number, viewModel: any, dependent: IDependencyRule[], observable: IMetaObservable,
         dependentName: string, fnName: string, fn: (any) => void, path: IDependencyPath,
         fnHandle: (dependsOn: string, dependentName: string, fieldRules: IDependencyRule[], handler: (any) => void, updatingModel: boolean) => any,
         fieldCategories?: string[], ignoreIfSuspended: boolean = false)
      {
         var fieldRules = [];

         var clonedDependent: IDependencyRule[] = this.clone(dependent);

         // find all the 'dependsOn' property names
         $.each(clonedDependent, (i1, rule: IDependencyRule) =>
         {
            this.populateRuleProperty(id, rule, observable, dependentName, viewModel, path, fieldRules);
         });

         // Apply subcriptions to all the 'dependsOn' properties
         $.each(fieldRules, (i1, dependsOn) =>
         {
            try
            {
               if (dependsOn) dependsOn = dependsOn.toCamelCase();
               var t1 = this.getObservableFromPath(viewModel, path, dependsOn);
               this.addTask(this.runningId, this, t1, fnHandle, { trigger: dependsOn, dependentName: dependentName, rules: clonedDependent, matchedRuleHandler: fn }, false, ignoreIfSuspended, true);
            }
            catch (e)
            {
               messages.error("The property '" + dependsOn + "', does not exist.");
            }
         });

         this.runningId++;
         this.addTask(this.runningId++, this, null, fnHandle, { trigger: null, dependentName: dependentName, rules: clonedDependent, matchedRuleHandler: fn }, false, ignoreIfSuspended, true);

         return fieldRules;
      }

      /// populateRuleProperty
      /// Group all the fields that trigger a change (dependsOn), attach all the conditions
      /// associated with the affected field and subscribe accordingly.
      private populateRuleProperty(id: number, rule: IDependencyRule, observable: IMetaObservable, dependentName: string, viewModel: any, path: IDependencyPath, fieldRules: string[])
      {
         rule.id = id;
         rule.observable = observable;
         rule.dependent = dependentName;
         rule.path = path;

         if (!rule.condition) rule.condition = conditionEnum.Modified;

         if (rule.dependsOn !== undefined && rule.dependsOn != null)
         {
            rule.dependsOn = $.trim(rule.dependsOn).toCamelCase();
            rule.dependentObservable = this.getObservableFromPath(viewModel, path, rule.dependsOn);

            rule.compareObservable = null;

            var fields = toArray(rule.dependsOn, true);

            if (isNotBlank(rule.whenTheseFieldsHaveChanged))
            {
               rule.whenTheseFieldsHaveChanged = toArray(rule.whenTheseFieldsHaveChanged, true);
               fields = fields.concat(rule.whenTheseFieldsHaveChanged);
            }
            else if (rule.applyCondition == applyCondition.OnlyWhenTheGivenPropertyIsModified)
            {
               fields = fields.concat(toArray(rule.byCopyingFrom, true));
               rule.whenTheseFieldsHaveChanged = fields;
            }

            if (rule.action == performAction.CopyFrom && isBlank(rule.byCopyingFrom))
            {
               rule.byCopyingFrom = rule.dependsOn;
            }

            if (!isBlank(rule.applyAtStartupForTheseFields))
            {
               rule.applyAtStartupForTheseFields = toArray(rule.applyAtStartupForTheseFields, true);
            }

            if (isNotBlank(rule.compareTo))
            {
               rule.compareObservable = this.getObservableFromPath(viewModel, path, rule.compareTo);
               fields = fields.concat(toArray(rule.compareTo));
            }

            if (isNotBlank(rule.byCopyingFrom))
            {
               rule.byCopyingFromObservable = this.getObservableFromPath(viewModel, path, rule.byCopyingFrom);
               fields = fields.concat(toArray(rule.byCopyingFrom));
            }


            if (isNotBlank(rule.alsoDependsOn))
            {
               rule.alsoDependsOnObservable = this.getObservableFromPath(viewModel, path, rule.alsoDependsOn);
               fields = fields.concat(toArray(rule.alsoDependsOn));
            }

            $.each(fields, (index, item: string) =>
            {
               if ($.inArray(item, fieldRules) < 0)
               {
                  fieldRules.push(item);
               }
            });
         }
         return rule;
      }

      private clone(dependencyRules: IDependencyRule[]): IDependencyRule[]
      {
         var clonedObject: IDependencyRule[] = [];
         var priority: number = 1;

         $.each(dependencyRules, (i1, rule: IDependencyRule) =>
         {
            rule.priority = priority++;
            if (rule.dependsOn !== undefined && rule.dependsOn != null)
            {
               var propertiesDependsOn = rule.dependsOn.split(",");

               $.each(propertiesDependsOn, (value, dependsOnPropertyName) =>
               {
                  var cloneProperty = _.clone(rule); //shallow copy
                  cloneProperty.dependsOn = $.trim(dependsOnPropertyName).toCamelCase();
                  clonedObject.push(cloneProperty);
               });
            }
            else
            {
               clonedObject.push(rule);
            }
         });

         return clonedObject;
      }

      private compareRuleOutcome(previous: IDependencyStateRule, current: IDependencyStateRule): boolean
      {
         if (previous && (previous.value === current.value &&
            previous.action === current.action &&
            previous.available === current.available &&
            previous.visible === current.visible &&
            previous.label === current.label)) return true;
      }

      /// handlePropertyDependency
      /// Used to determine if a dependency condition has been met
      /// if so then perform the necessary action
      private handleRuleDependency(taskRule: TaskRulesDependencies, updatingModel: boolean, triggers: string[])
      {
         var triggers: string[] = triggers ? triggers : toArray(taskRule.trigger),
            fieldRules: IDependencyRule[] = taskRule.rules,
            handler: (any) => void = taskRule.matchedRuleHandler;

         if (!fieldRules) return;

         var currValue: IDependencyStateRule;
         var cloneRule: boolean = triggers.length > 1;
         var currentTrigger: string;

         $.each(fieldRules, (value, rule) =>
         {
            if (this.compareRuleOutcome(currValue, rule)) return true;

            _.forEach(triggers, trigger =>
            {
               if (this.doesRuleMatch(trigger, rule, updatingModel))
               {
                  if (!currValue || (currValue.priority < rule.priority))
                  {
                     currValue = rule;
                     cloneRule = currValue.dependsOn != trigger;
                     currentTrigger = trigger;
                  }
               }
            });
         });

         if (currValue)
         {
            if (cloneRule)
            {
               currValue = _.clone(currValue);
               currValue.dependsOn = currentTrigger;
            }
            handler.call(this, currValue);
         }
      }


      private doesRuleMatch(dependsOn: string, rule: IDependencyRule, updatingModel: boolean): any
      {
         if (!dependsOn) dependsOn = rule.dependsOn;

         /// if the page is refreshed and the condition is apply rule at start up then move on to next loop
         if (this.applyRuleOnUpdate(updatingModel, rule, dependsOn)) return false;

         /// check if the rule should only apply at startup
         if (!updatingModel && rule.applyCondition === applyCondition.OnlyAtStartup) return false;

         /// check if the rule should applies only when the rule is in the whenTheseFieldsHaveChanged list
         /// return if the item is in the list
         if (isNotBlank(rule.whenTheseFieldsHaveChanged))
         {
            if ($.inArray(dependsOn, rule.whenTheseFieldsHaveChanged) < 0)
               return false;
         }

         var result = (rule.condition === conditionEnum.Modified ? true : false);

         if (!result)
         {
            var compareCtrl = (rule.dependsOn !== null ? rule.dependentObservable : rule.observable);
            var compareValue = (rule.compareObservable ? rule.compareObservable() : rule.compareValue);
            result = is(compareCtrl(), rule.condition, compareValue, false);
         }

         if (rule.alsoDependsOn && ((result && !rule.secondaryConditionIsOr) || (!result && rule.secondaryConditionIsOr)))
         {
            // is the rule and 'and' (!rule.secondaryConditionIsOr) or and 'Or' (rule.secondaryConditionIsOr)
            if (rule.alsoDependsOnObservable)
            {
               result = rule.anotherCondition === conditionEnum.Modified ? true :
               is(rule.alsoDependsOnObservable(), rule.anotherCondition, rule.withAnotherCompareValue, false);
            }
            else result = false;
         }

         /// Check to see if dependent rule is not a blank condition, ie. Only perform action if the dependent is blank.
         return (result && rule.dependentCondition === conditionEnum.IsBlank ? isBlank(rule.observable()) : result);

      }

      /// handleAccessabilityProperty
      /// Turn on / off accessability on the underlying property
      private handleAccessabilityProperty(rule: IDependencyRule): void
      {
         rule.observable.isAvailable(rule.value);
      }

      private handleVisibilityProperty(rule: IDependencyRule): void
      {
         rule.observable.isVisible(rule.value);
      }

      /// handleDynamicLabelProperty
      /// Turn on / off accessability on the underlying propert
      private handleDynamicLabelProperty(rule: IDependencyRule)
      {
         var observable = this.getObservableFromPath(this.viewModel, rule.path, rule.dependent);
         switch (rule.action)
         {
            case performAction.CopyFrom:
               observable.label(ko.unwrap(rule.byCopyingFromObservable));
               break;
            default:
               observable.label(rule.value);
               break;
         }
      }

      /// handleValueProperty
      /// Apply an action which populates the value of a property
      private handleValueProperty(rule: IDependencyRule): boolean
      {
         var observable: IMetaObservable = this.getObservableFromPath(this.viewModel, rule.path, rule.dependent);
         switch (rule.action)
         {
            case performAction.Clear:
               if (_.isArray(ko.unwrap(observable)))
                  observable.removeAll();
               else
                  observable.clear();
               utils.resetValidationIfEmpty(observable);
               break;
            case performAction.CopyFrom:
               observable.copyFrom(rule.byCopyingFromObservable);
               utils.resetValidationIfEmpty(observable);
               break;
            case performAction.CustomFunction:
               observable.applyFunction(this.customFunctionFactory.get(rule.functionName)());
               utils.resetValidationIfEmpty(observable);
               break;
            case performAction.Reset:
               observable.reset();
               utils.resetValidationIfEmpty(observable);
               break;
            case performAction.SetValue:
               observable(rule.value);
               utils.resetValidationIfEmpty(observable);
               break;
            case performAction.Refresh:
               if (observable.refresh)
               {
                  observable.refresh(true, rule.additionalFields);
                  return true;
               }

               // Composite Elements (controls such as Grids) have their own functions so 
               // don't fall back to using the default implementation in these cases 
               // (the condition above may not be satisfied if the Grid is not actually in the View - but dependencies exist)
               if (!rule.hasOwnFunctions)
                  this.handleRefresh(rule.id, this.viewModel, rule.dependentObservable,
                     rule.dependsOn, (rule.remoteAction ? rule.remoteAction : "get" + rule.dependent),
                     rule.dependent, null, rule.additionalFields, rule.suspendFields, rule.path,
                     rule.includeModelData, rule.controller, rule.oneWay);

               break;
            case performAction.ResetModel:
               this.app.resetEditor();
               break;
         }
         return true;
      }

      /// handleStateProperty
      /// Extension to the Value Condition Handler.
      /// Enables visibility and Availability to be set
      private handleStateProperty(rule: IDependencyStateRule): boolean
      {
         if (!isBlank(rule.available)) rule.observable.isAvailable(rule.available);
         if (!isBlank(rule.visible)) rule.observable.isVisible(rule.visible);
         if (!isBlank(rule.label)) rule.observable.label(rule.label);
         return this.handleValueProperty(rule);
      }


      /// applyResetModelFields
      /// Subscribe to fields that trigger a model reset
      private applyResetModelFields(id: number, viewModel: any, refreshRules: any[], path: IDependencyPath)
      {
         this.applyActionOnFields(id, viewModel, refreshRules, path, this.handleResetModelDependency, conditionEnum.Modified);
      }

      /// applyRefreshFields
      /// Subscribe to fields that trigger a refresh.
      private applyRefreshFields(id: number, viewModel: any, refreshRules: any[], path: IDependencyPath)
      {
         this.applyActionOnFields(id, viewModel, refreshRules, path, this.handleRefreshDependency, conditionEnum.IsNotBlank);
      }

      private applyActionOnFields(id: number, viewModel: any, refreshRules: any[], path: IDependencyPath,
         handler: (taskRule: TaskRulesRefresh, updatingModel: boolean) => void, condition: conditionEnum)
      {
         if (refreshRules === undefined)
            return;
         $.each(refreshRules, (trigger, rules: IDependencyRule[]) =>
         {
            $.each(rules, (i1, rule: IDependencyRule) =>
            {
               rule.id = id;
               if (!rule.condition) rule.condition = condition;
               var observable = this.getObservableFromPath(viewModel, path, trigger);

               if (observable && ko.isObservable(observable))
               {
                  this.addTask(this.runningId, this, observable, handler, { context: viewModel, trigger: trigger, rule: rule, path: path }, false, true);
               }
               this.addTask(this.runningId++, this, null, handler, { context: viewModel, trigger: trigger, rule: rule, path: path }, false, true);
            });
         });
      }

        private handleResetModelDependency = (taskRule: TaskRulesRefresh, updatingModel: boolean) =>
      {
         var trigger: string = taskRule.trigger, rule: IDependencyRefreshRule = taskRule.rule, path: IDependencyPath = taskRule.path;
         var observable = this.getObservableFromPath(viewModel, path, trigger),
            triggerPropertyPath = ag.utils.getDelimitedPath(trigger, path.path);

         if (!observable.isSuspended())
         {
            if (updatingModel && !rule.applyAtStartUp) return false;

            try
            {
               this.updatingModel(true);
               this.app.resetEditor && this.app.resetEditor(triggerPropertyPath);
            }
            finally
            {
               this.updatingModel(false);
            }
         }
         return true;
      }


///#endregion


//#region Factories
        private customFunctionFactory = (() =>
      {
         var functions = {};
         return {
            get: (type) =>
            {
               return functions[type];
            },
            register: (type, rule) =>
            {
               functions[type] = rule;
               return this.dependencyFactory;
            }
         };
      })();


      private dependencyFactory = (() =>
      {
         var types = {},
            Dependency,
            result;

         return {
            create: function (id, type, parameters, path)
            {
               Dependency = types[type];
               result = (Dependency ? new Dependency() : null);

               if (result != null && parameters != undefined)
               {
                  $.each(parameters, function (i, param)
                  {
                     result[i] = param;
                  });
                  result._init(id, path);
               }
               return result;
            },
            register: function (type, rule)
            {
               types[type] = rule;
               return this.dependencyFactory;
            }
         };
      })();

      //#endregion

      //#region Supported custom functions - Consider moving them to there own file at some point

      private getDateString = () => dates.today();

      //#endregion

      // register custom functions

      private registerAll()
      {
         this.customFunctionFactory.register("GetDate", this.getDateString);
         this.customFunctionFactory.register("GetDateString", this.getDateString);
      }
   }

   class ComplexDependencyFactory
   {
      private types: Array<typeof ComplexDependency> = [];
      private app: any;
      private updatingModel: boolean;

      constructor(app: any, updatingModel: boolean)
      {
         this.app = app;
         this.updatingModel = updatingModel;
         this.registerAll();
      }

      create(type: string, parameters: Array<any>, path: IDependencyPath, viewModelContainer: IViewModelInformation): ComplexDependency
      {
         var dependency: typeof ComplexDependency = this.types[type];
         var result: ComplexDependency = (dependency ? new dependency(this.app, this.updatingModel) : null);

         if (result != null && parameters != undefined)
         {
            $.each(parameters, (i, param) =>
            {
               result[i] = param;
            });
            result.init(path, viewModelContainer);
            result.complete();
         }

         return result;
      }

      private registerAll()
      {
         this.register("TermRelationship", TermRelationship);
         this.register("SyncRelationship", SyncRelationship);
         this.register("CycleBasisAndDateRelationship", CycleBasisAndDateRelationship);
         this.register("DateRangeRelationship", DateRangeRelationship);
         this.register("RefreshGroup", RefreshGroup);
         this.register("OnGroupChange", RefreshGroup);
         this.register("OnGroupChangeNotifyOnly", RefreshGroup);
         this.register("OnCategoryChangeNotifyOnly", RefreshGroup);
         this.register("KeyGroup", KeyGroup);
      }

      private register(type: string, rule: typeof ComplexDependency)
      {
         this.types[type] = rule;
         return this;
      }
   }


   interface IComplexDependency
   {
      fire(rule: TaskRulesBase, updatingModel: boolean);
   }


   class ComplexDependency extends DependencyBase implements IComplexDependency
   {
      triggers: string[] = [];
      path: IDependencyPath = null;
      viewModel: any;
      viewModelContainer: IViewModelInformation;

      constructor(app, updatingModel: boolean)
      {
         super(app, updatingModel);
      }

      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         this.path = path;
         this.viewModel = viewModelContainer.viewModel;
         this.viewModelContainer = viewModelContainer;
         this.app = viewModelContainer.app;
      }

      complete()
      {
         try
         {
            this.updatingModel(true);
            this.runningId++;
            $.each(this.triggers, index =>
            {
               this.addPropertyChanged(this.runningId, this.triggers[index], this.path);
            });
         }
         finally
         {
            this.updatingModel(false);
         }
      }

      private addPropertyChanged(id: number, propertyName: string, path: IDependencyPath)
      {
         var property = this.getObservableFromPath(this.viewModel, path, propertyName);
         if (ko.isObservable(property) && !$.isArray(property))
         {
            this.addTask(id, this, property, this.fire, { trigger: propertyName }, false, true);
         }
      }


      fire(rule: TaskRulesBase, updatingModel: boolean)
      {
      }
   }

   class TermRelationship extends ComplexDependency
   {
      private term: string = '';
      private dealDate: string = '';
      private settleDate: string = '';

      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         super.init(path, viewModelContainer);
         this.term = this.term.toCamelCase();
         this.dealDate = this.dealDate.toCamelCase();
         this.settleDate = this.settleDate.toCamelCase();
         this.triggers = [this.term, this.dealDate, this.settleDate];
      }

      fire(rule: TaskRulesBase)
      {
         var dealDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.dealDate))),
            term = parseInt(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.term))),
            settleDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.settleDate)));

         if (!dealDate) return;

         if (rule.trigger === this.term)
         {
            if (!ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, rule.trigger)))
            {
               term = 0;
            }
            var newDate = dealDate.add("d", term).toISO();
            this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.settleDate), newDate);
         }
         else
         {
            if (rule.trigger === this.dealDate || rule.trigger === this.settleDate)
            {
               if (ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, rule.trigger)))
               {
                  if (!settleDate) return;
                  var days = Math.round(((<any>settleDate - <any>dealDate) / 86400000));
                  if (!isNaN(days)) this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.term), days);
               }
            }
         }
      }
   }

   class SyncRelationship extends ComplexDependency
   {
      valueA = '';
      valueB = '';
      oneWay = false;

      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         super.init(path, viewModelContainer);
         this.valueA = this.valueA.toCamelCase();
         this.valueB = this.valueB.toCamelCase();
         this.triggers = [this.valueA, this.valueB];
      }

      fire(rule: TaskRulesBase)
      {
         if (rule.trigger == this.valueA)
         {
            var value = ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.valueA));
            _.each(this.getObservablesFromPath(this.viewModel, this.path, this.valueB), observable =>
            {
               this.setProperty(observable, value);
            });
         }
         else
         {
            if (!this.oneWay)
               this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.valueA),
                  ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.valueB)));
         }
      }
   }

   class CycleBasisAndDateRelationship extends ComplexDependency
   {
      theDate = '';
      frequency = '';
      cycleBasis = '';

      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         super.init(path, viewModelContainer);
         this.theDate = this.theDate.toCamelCase();
         this.frequency = this.frequency.toCamelCase();
         this.cycleBasis = this.cycleBasis.toCamelCase();
         this.triggers = [this.theDate, this.frequency, this.cycleBasis];
      }

      fire(rule: TaskRulesBase)
      {
         if (rule.trigger == this.frequency || rule.trigger == this.cycleBasis)
         {
            if (this.isMonthTypeFrequency(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.frequency))) &&
               this.isEndOfMonthCycleBasis(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.cycleBasis))))
            {
               var currentDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.theDate)));
               if (currentDate)
               {
                  this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.theDate),
                     currentDate.endOf('month').toISO());
               }
            }
         }
         if (rule.trigger == this.theDate)
         {
            var currentDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.theDate)));
            if (!this.isEndOfMonth(currentDate))
            {
               this.setProperty(this.getObservableFromPath(this.viewModel, this.path, this.cycleBasis), 'DAY OF MONTH');
            }
         }
      }

      private isEndOfMonthCycleBasis(value): boolean
      {
         return ($.inArray(value, ['END OF MONTH', 'EOM - NON LEAP YEAR']) > -1);
      }

      private TypeFrequency(frequency): boolean
      {
         return ($.inArray(frequency, ['MONTHLY', 'QUARTERLY', 'SEMI ANNUAL', 'ANNUAL']) > -1);
      }

      private isEndOfMonth(value: Moment): boolean
      {
         if (!value) return false;

         var endDate = value.clone().endOf('month');
         return (value.isSame(endDate));
      }

      private isMonthTypeFrequency(frequency): boolean
      {
         return ($.inArray(frequency, ['MONTHLY', 'QUARTERLY', 'SEMI ANNUAL', 'ANNUAL']) > -1);
      }
   }

   class DateRangeRelationship extends ComplexDependency
   {
      fromDate = '';
      toDate = '';
      daysToDefault = 0;
      passIfNull = true;

      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         super.init(path, viewModelContainer);
         this.fromDate = this.fromDate.toCamelCase();
         this.toDate = this.toDate.toCamelCase();
         this.triggers = [this.fromDate, this.toDate];
      }

      fire(rule: TaskRulesBase)
      {
         var fromDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.fromDate))),
            toDate = moment.fromISO(ko.unwrap(this.getObservableFromPath(this.viewModel, this.path, this.toDate))),
            otherField,
            triggerField,
            nottrigger;

         if (rule.trigger == this.fromDate)
         {
            triggerField = fromDate;
            otherField = toDate;
            nottrigger = this.toDate;
         }
         else
         {
            triggerField = toDate;
            otherField = fromDate;
            nottrigger = this.fromDate;
         }

         if (((this.passIfNull && !otherField) || !triggerField) || (!fromDate.isValid() || !toDate.isValid())) return;

         if (triggerField && (fromDate.isAfter(toDate) || !otherField))
            this.setProperty(this.getObservableFromPath(this.viewModel, this.path, nottrigger), triggerField.add("d", this.daysToDefault).toISO());
      }
   }

   class ComplexDependencyGroup extends ComplexDependency
   {
      dependentCondition = null;
      method: any;
      fields: any;
      oneWay: boolean;
      action: string;
      applyAtStartUp: boolean;
      category: string;

      property: any = {};
      exitOnStartUp: () => any;

      handler: (taskRules: TaskRulesRefresh, updatingModel: boolean) => void;

      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         super.init(path, viewModelContainer);

         this.property.applyAtStartUp = this.applyAtStartUp;
         this.property.dependentCondition = this.dependentCondition;
         this.property.dependent = '';
         this.property.action = this.action;
         this.method = this.action;
         this.property.associatedFields = this.fields;
         this.property.additionalFields = this.fields;
         this.property.suspendFields = this.fields;
         this.property.oneWay = this.oneWay;

         this.triggers = toArray(this.fields, true);
         this.exitOnStartUp = () => { return !this.applyAtStartUp && this.updatingModel(); };
      }

      fire(rule: TaskRulesBase, updatingModel: boolean)
      {
         if (this.method === null) return false;
         if (this.exitOnStartUp()) return false;
         this.property.dependent = rule.trigger;
         if (this.handler) this.handler({ context: this.viewModel, trigger: rule.trigger, rule: this.property, path: this.path }, updatingModel);
      }
   }

   class RefreshGroup extends ComplexDependencyGroup
   {
      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         if (this.category)
         {
            var temp = viewModelContainer.app.fieldCategories[this.category.toCamelCase()];
            this.fields = temp && temp.length > 0 ? temp.join(",") : this.fields;
         }

         super.init(path, viewModelContainer);
         this.handler = this.handleRefreshDependency;
      }
   }

   class KeyGroup extends ComplexDependencyGroup
   {
      init(path: IDependencyPath, viewModelContainer: IViewModelInformation)
      {
         super.init(path, viewModelContainer);

         // Set the key field property on each related observable
         _.forEach(this.fields.split(','), (trigger: string) =>
         {
            var observable: IMetaObservable = this.getObservableFromPath(this.viewModel, this.path, trigger);
            observable.isKeyField(true);
         });

         this.handler = this.handleNavigateDependency;
      }
   }

   class DependenciesHandle implements IDependenciesHandle
   {
      private dependencies:DependencyBase[] = [];

      addDependency(dependency: DependencyBase)
      {
         this.dependencies.push(dependency);
      }

      addDependencyRange(dependencies: DependencyBase[])
      {
         _.each(dependencies, (dependency) =>
         {
            this.addDependency(dependency);
         });
      }

      dispose()
      {
         _.each(this.dependencies, (dependency) =>
         {
            dependency.dispose();
         });
      }
   }

   //#region Conditions

   enum conditionEnum
   {
      Modified = 0,
      EqualTo = 1,
      NotEqualTo = 2,
      GreaterThan = 3,
      GreaterThanOrEqualTo = 4,
      LessThan = 5,
      LessThanOrEqualTo = 6,
      StringContains = 7,
      StringDoesNotContain = 8,
      IsBlank = 9,
      IsNotBlank = 10,
      RegexMatch = 11,
      NotRegexMatch = 12,
      IsInList = 13,
      IsNotInList = 14,
      BitwiseAnd = 15,
      BitwiseOr = 16
   }

   var equalTo = (value1, value2) => (value1 == value2);

   var notEqualTo = (value1, value2) => (value1 != value2);

   var greaterThan = (value1, value2) => (+value1 > value2);

   var greaterThanOrEqualTo = (value1, value2) => (+value1 >= value2);

   var lessThan = (value1, value2) => (+value1 < value2);

   var lessThanOrEqualTo = (value1, value2) => (+value1 <= value2);

   var stringContains = (value1, value2) => (value1 ? (value1.indexOf(value2) != -1) : false);

   var stringDoesNotContain = (value1, value2) => (!stringContains(value1, value2));

   var isBlank = (value1?, value2?) => (value1 === undefined || value1 === null || value1 === "");

   var isNotBlank = (value1?, value2?) => (!isBlank(value1, value2));

   var defaultTrue = (value1, value2) => (true);

   var regExMatch = (value1, value2) => (new RegExp(value2)).test(value1);

   var notRegexMatch = (value1, value2) => (!regExMatch(value1, value2));

   var isInList = (value1, value2) =>
   {
      if (!$.isArray(value2))
      {
         value2 = toArray(value2);
      }
      return ($.inArray(value1, value2) > -1);
   };

   var isNotInList = (value1, value2) => !(isInList(value1, value2));

   var bitwiseAnd = (value1, value2) => (value1 & value2);

   var bitwiseOr = (value1, value2) => (value1 | value2);

   function conditionFactory(condition): Function
   {
      switch (condition)
      {
         case conditionEnum.EqualTo:
            return equalTo;
         case conditionEnum.NotEqualTo:
            return notEqualTo;
         case conditionEnum.GreaterThan:
            return greaterThan;
         case conditionEnum.GreaterThanOrEqualTo:
            return greaterThanOrEqualTo;
         case conditionEnum.LessThan:
            return lessThan;
         case conditionEnum.LessThanOrEqualTo:
            return lessThanOrEqualTo;
         case conditionEnum.StringContains:
            return stringContains;
         case conditionEnum.StringDoesNotContain:
            return stringDoesNotContain;
         case conditionEnum.IsBlank:
            return isBlank;
         case conditionEnum.IsNotBlank:
            return isNotBlank;
         case conditionEnum.RegexMatch:
            return regExMatch;
         case conditionEnum.NotRegexMatch:
            return notRegexMatch;
         case conditionEnum.IsInList:
            return isInList;
         case conditionEnum.IsNotInList:
            return isNotInList;
         case conditionEnum.BitwiseAnd:
            return bitwiseAnd;
         case conditionEnum.BitwiseOr:
            return bitwiseOr;
         default:
            return defaultTrue;
      }
   };

   var is = (value1, operator, value2, ignoreIfBlank) =>
   {
      if (!ignoreIfBlank || !isBlank(value1))
      {
         var fn = value => (dates.isValidDate(value) ? value.valueOf() : value);
         return conditionFactory(operator)(fn(value1), fn(value2));
      }
      return false;
   };

   var toArray = (fields, convertToCamelCase?, fn?, delimiter = ",") =>
   {
      return (!fields ? [] : $.map(fields.split(delimiter), (value) =>
      {
         var result = $.trim(value);
         if (convertToCamelCase)
            result = result.toCamelCase();

         if (fn)
            result = fn(result);

         return result;
      }));
   };

   //#endregion
}

