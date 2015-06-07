/// <reference path="../../ts/global.d.ts" />

module ag
{
   ko.bindingHandlers['withlight'] =
   {
      'init': (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var bindingValue = valueAccessor();
         if (typeof bindingValue != 'object' || bindingValue === null)
            throw new Error('withlight must be used with an object');
         var innerContext = bindingContext['createChildContext'](bindingValue);
         ko.applyBindingsToDescendants(innerContext, element);
         return { 'controlsDescendantBindings': true };
      }
   }

   ko.virtualElements.allowedBindings['withlight'] = true;
}