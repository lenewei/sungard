module ag
{
   export function MetaObservable(observable, name, owner, handle, readOnlyObservable: KnockoutObservable<boolean>): any
   {
      var result = observable,
         initialValue = ko.observable(ko.mapping.toJSON(observable)),
         processingCallDepth = ko.observable(0),
         suspendedCallDepth = ko.observable(0),
         internalIsAvailable = ko.observable(true);

      result.isVisible = ko.observable(true);
      result.isAvailable = ko.computed(
      {
         read: () =>
         {
            return internalIsAvailable() && !readOnlyObservable();
         },
         write: (value: boolean) =>
         {
            internalIsAvailable(value);
         },
         owner: this
      });

      result.isKeyField = ko.observable(false);
      result.label = ko.observable(null);
      result.owner = owner;
      result.handle = handle;
      result.fieldName = name;

      function isPropertySet(callDepthCounter)
      {
         return ko.computed(
            {
               read: () => (callDepthCounter() > 0),
               write: value =>
               {
                  var currentDepth = callDepthCounter();
                  currentDepth += (value ? 1 : (-1));
                  callDepthCounter(Math.max(currentDepth, 0));
               }
            });
      }

      result.isProcessing = isPropertySet(processingCallDepth);
      result.isSuspended = isPropertySet(suspendedCallDepth);

      result.isDirty = ko.computed(() => (initialValue() !== ko.mapping.toJSON(observable) && observable() !== undefined));

      result.underlying = observable;
      result.tag = initialValue;
      result.tag(ko.utils.unwrapObservable(observable()));

      result.undo = () =>
      {
         result(JSON.parse(initialValue()));
      };

      result.commit = () =>
      {
         initialValue(ko.toJSON(result));
      };

      result.clear = () => { result(null); };

      result.copyFrom = anotherObservable =>
      {
         result(anotherObservable());
      };

      result.applyFunction = fn =>
      {
         result(fn());
      };

      result.reset = () => { result.undo(); };

      return result;
   }

   export function disposeMetaObservable(observable: dependencies.IMetaObservable): void
   {
      observable.isAvailable.dispose();
   }

   function traverseMappedObject(result: any, observableCallback: (index: number, property: any) => any, notObservableCallback: (index: number, property: any) => any): void
   {
      $.each(result, index => 
      {
         if (ko.isObservable(result[index]))
         {
            result[index] = observableCallback(index, result[index]);
         }
         else if (index !== '__ko_mapping__')
         {  
            result[index] = notObservableCallback(index, result[index]);
         }
      });
   }

   export function mapFromJStoMetaObservable(itemModel: any, readOnlyObservable: KnockoutObservable<boolean>, caller?:any): any
   {
      var result = ko.mapping.fromJS(itemModel);

      traverseMappedObject(
         result,
         (index, property) => ag.MetaObservable(property, index, result, caller, readOnlyObservable),
         (index, property) => ag.mapFromJStoMetaObservable(property, readOnlyObservable, index));

      return result;
   };

   export function disposeMappedMetaObservable(mappedModel: any): any
   {
      traverseMappedObject(
         mappedModel,
         (index, property) =>
         {
            if (utils.isMetaObservable(property))
               disposeMetaObservable(property);

            return property;
         },
         (index, property) =>
         {
            return disposeMappedMetaObservable(property);
         });

      return mappedModel;
   };
}