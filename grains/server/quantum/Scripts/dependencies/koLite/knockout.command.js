/*
NOTE: This has been customised to provide the added functionality of isVisible and the associated binding.
      If an update to this file is made be sure to merge changes.

// By: Hans Fjällemark and John Papa
// https://github.com/CodeSeven/KoLite
*/

(function (ko)
{
   ko.command = function (options)
   {
      var self = ko.observable(),
          canExecuteDelegate = options.canExecute,
          executeDelegate = options.execute,
          isVisibleDelegate = options.isVisible,
          deferCanExecute = options.deferCanExecute;

      self.canExecute = ko.computed(function ()
      {
         return canExecuteDelegate ? canExecuteDelegate() : true;
      }, self, { deferEvaluation: deferCanExecute });

      self.isVisible = ko.computed(function ()
      {
         return isVisibleDelegate ? isVisibleDelegate() : true;
      });

      self.execute = function (arg1, arg2)
      {
         // Needed for anchors since they don't support the disabled state
         if (!self.canExecute())
            return;

         executeDelegate.apply(this, [arg1, arg2]);
      };

      self.id = options.id;

      return self;
   };

   ko.asyncCommand = function (options)
   {
      var self = ko.observable(),
          canExecuteDelegate = options.canExecute,
          executeDelegate = options.execute,
          isVisibleDelegate = options.isVisible,
          deferCanExecute = options.deferCanExecute,

          completeCallback = function ()
          {
             self.isExecuting(false);
          };

      self.isExecuting = ko.observable();

      self.canExecute = ko.computed(function ()
      {
         return canExecuteDelegate ? canExecuteDelegate(self.isExecuting()) : !self.isExecuting();
      }, self, { deferEvaluation: deferCanExecute });

      self.isVisible = ko.computed(function ()
      {
         return isVisibleDelegate ? isVisibleDelegate() : true;
      });

      self.execute = function (arg1, arg2)
      {
         // Needed for anchors since they don't support the disabled state
         if (!self.canExecute())
            return;

         var args = []; // Allow for these arguments to be passed on to execute delegate

         if (executeDelegate.length >= 2)
         {
            args.push(arg1);
         }

         if (executeDelegate.length >= 3)
         {
            args.push(arg2);
         }

         args.push(completeCallback);
         self.isExecuting(true);
         executeDelegate.apply(this, args);
      };

      self.id = options.id;

      return self;
   };
})(ko);

; (function (ko)
{
   ko.utils.wrapAccessor = function (accessor)
   {
      return function ()
      {
         return accessor;
      };
   };

   ko.bindingHandlers.command = {
      init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext)
      {
         if (!valueAccessor())
            throw new Error("Command not found (" + $(element).data("bind") + ")");

         var value = valueAccessor(),
             commands = value.execute ? { click: value } : value,

             isBindingHandler = function (handler)
             {
                return ko.bindingHandlers[handler] !== undefined;
             },

             initBindingHandlers = function ()
             {
                for (var command in commands)
                {
                   if (!isBindingHandler(command))
                   {
                      continue;
                   }

                   ko.bindingHandlers[command].init(
                       element,
                       ko.utils.wrapAccessor(commands[command].execute),
                       allBindingsAccessor,
                       viewModel,
                       bindingContext
                   );
                }
             },

             initEventHandlers = function ()
             {
                var events = {};

                for (var command in commands)
                {
                   if (!isBindingHandler(command))
                   {
                      events[command] = commands[command].execute;
                   }
                }

                ko.bindingHandlers.event.init(
                    element,
                    ko.utils.wrapAccessor(events),
                    allBindingsAccessor,
                    viewModel,
                    bindingContext);
             };

         initBindingHandlers();
         initEventHandlers();
      },

      update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext)
      {
         var commands = valueAccessor(),
             command = null,
             canExecute = commands.canExecute,
             isVisible = commands.isVisible;

         if (!canExecute)
         {
            for (command in commands)
            {
               if (commands[command].canExecute)
               {
                  canExecute = commands[command].canExecute;
                  break;
               }
            }
         }

         if (!canExecute)
         {
            return;
         }
         ko.bindingHandlers.enable.update(element, canExecute, allBindingsAccessor, viewModel, bindingContext);

         if (!isVisible)
         {
            for (command in commands)
            {
               if (commands[command].isVisible)
               {
                  isVisible = commands[command].isVisible;
                  break;
               }
            }
         }

         if (!isVisible)
         {
            return;
         }
         ko.bindingHandlers.visible.update(element, isVisible, allBindingsAccessor, viewModel, bindingContext);

         if (canExecute() && _.has(allBindingsAccessor(), "loadingState"))
            $(element).button(commands.isExecuting() ? 'loading' : 'reset');
      }
   };
})(ko);