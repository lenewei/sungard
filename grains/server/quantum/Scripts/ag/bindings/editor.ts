/// <reference path="../../ts/global.d.ts" />

// For binding an editor component to a collection. This provides for adding a new item to a collection or editing an existing item.
module ag
{
   "use strict";

   ko.bindingHandlers["editor"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel) =>
      {
         var log: any;
         var lookupDisplayName: any;

         var target = $(element),
            control = target.closest('.field'),
            componentConstructor = ko.unwrap(valueAccessor()),
            collectionAccessor = allBindingsAccessor().collection;

         if (!collectionAccessor)
            throw new Error("The editor binding requires a collection binding");

         if (control.length == 0)
            throw new Error("The editor binding must be used within an editor field container");

         // Create an editor dialog from the specified component
         var component = ag.components[componentConstructor];

         if (!component)
         {
            log(componentConstructor + " is not an available component");
            return;
         }
         //throw new Error(componentConstructor  + " is not an available component");

         var editor = new component({
            lookupDisplayName: lookupDisplayName,
            container: null, // No container, so it will be a dialog
            collection: collectionAccessor,
            viewModel: viewModel
         });

         // Initialize the expression builder
         editor.init();
      }
   };
}