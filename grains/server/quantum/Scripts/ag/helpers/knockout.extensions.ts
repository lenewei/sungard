/// <reference path="../ag.ts" />
/// <reference path="dom.ts" />
/// <reference path="../../ts/global.d.ts" />
//#region Custom KnockoutJS Extensions

/// new files
module ag 
{
   //#region Static knockout templates
   var templates = {
      selectedListItemTemplate: [
         '<li class="search-choice">',
         '<span class="btn btn-small dropdown-toggle" data-bind="text:name"></span>',
         '<a href="#" class="icon-remove" tabindex="-1"></a>',
         '</li>'
      ].join(""),

      selectedMultiselectItemTemplate: [
         '<li class="search-choice" data-bind="visible: $data.hidden ? !$data.hidden() : true">',
         '<span class="btn btn-small dropdown-toggle" data-bind="text: $data.getDisplayName ? $data.getDisplayName() : $data, attr: {\'title\': $data.getTitle ? $data.getTitle() : $data }"></span>',
         '<a href="#" class="icon-remove" tabindex="-1"></a>',
         '</li>'
      ].join(""),

      selectedAllMultiselectItemTemplate: [
         '<li class="search-choice">',
         '<span class="btn btn-small dropdown-toggle" data-bind="text: $data.getDisplayName ? $data.getDisplayName() : $data, attr: {\'title\': $data.getTitle ? $data.getTitle() : $data }"></span>',
         '<a href="#" class="icon-remove" tabindex="-1"></a>',
         '</li>'
      ].join(""),

      selectedDraggableMultiselectItemTemplate: [
         '<li class="search-choice" data-bind="draggable: { data: $data, connectClass: \'pivot-fields\' }">',
         '<span class="btn btn-small dropdown-toggle" data-bind="text: $data.getDisplayName ? $data.getDisplayName() : $data, attr: {\'title\': $data.getTitle ? $data.getTitle() : $data }"></span>',
         '<a href="#" class="icon-remove" tabindex="-1"></a>',
         '</li>'
      ].join(""),

      selectedMultiselectItemNoRemoveTemplate: [
         '<li class="search-choice">',
         '<span class="btn btn-small dropdown-toggle" data-bind="text: $data.getDisplayName ? $data.getDisplayName() : $data, attr: {\'title\': $data.getTitle ? $data.getTitle() : $data }"></span>',
         '</li>'
      ].join(""),

      selectedDraggableMultiselectItemSortTemplate: [
         '<li class="search-choice sort-field" data-bind="click: $parents[0].sorter.changeDesc.bind($parents[0].sorter)">',
         '<span class="btn btn-small dropdown-toggle" data-bind="text: $data.getDisplayName ? $data.getDisplayName() : $data, attr: {\'title\': $data.getTitle ? $data.getTitle() : $data }">sort</span>',
         '<i data-bind="css: { \'icon-chevron-up\': $data.sortStrategy() === 1, \'icon-chevron-down\': $data.sortStrategy() === 2 }"></i>',
         '<a href="#" class="icon-remove" tabindex="-1"></a>',
         '</li>'
      ].join(""),

      mappingProfileReorderColumnsTemplate:
      '<li class="search-choice">' +
      '<span class="btn btn-small dropdown-toggle" data-bind="text: displayName"></span>' +
      '</li>'
   };

   //#endregion

   //#region Private methods

   export var dataTypeCss = dataType => 
   {
      var css;
      switch (dataType)
      {
         case "integer":
         case "double":
         case "decimal":
            css = "column-number";
            break;
         default:
            css = "";
      }

      return css;
   };

   //#endregion

   //#region String-based template engine

   // Define a template source that simply treats the template name as its content
   ko.templateSources["stringTemplate"] = function (template, _templates)
   {
      this.templateName = template;
      this.templates = _templates;
   };

   ko.utils.extend(ko.templateSources["stringTemplate"].prototype,
      {
         data: function (key, value)
         {
            this.templates._data = this.templates._data || {};
            this.templates._data[this.templateName] = this.templates._data[this.templateName] || {};

            if (arguments.length === 1)
            {
               return this.templates._data[this.templateName][key];
            }

            this.templates._data[this.templateName][key] = value;
         },
         text: function (value)
         {
            if (arguments.length === 0)
            {
               return this.templates[this.templateName];
            }
            this.templates[this.templateName] = value;
         }
      });

   // Modify an existing templateEngine to work with string templates

   function createStringTemplateEngine(templateEngine, _templates)
   {
      templateEngine.makeTemplateSource = (template, templateDocument) =>
      {
         // Named template
         if (typeof template == "string")
         {
            // See if the requested template matches one of our string templates
            if (_templates[template])
            {
               return new (<any>ko.templateSources).stringTemplate(template, _templates);
            } else
            {
               // No match, so look for a named template in the DOM
               templateDocument = templateDocument || document;
               var elem = templateDocument.getElementById(template);
               if (!elem)
                  throw new Error("Cannot find template with ID " + template);
               return new (<any>ko.templateSources).domElement(elem);
            }

         } else if ((template.nodeType == 1) || (template.nodeType == 8))
         {
            // Anonymous template
            return new ko.templateSources.anonymousTemplate(template);
         } else
            throw new Error("Unknown template type: " + template);
      };
      return templateEngine;
   }

   // Make this new template engine our default string template engine
   // TODO: modify this so we can register new templates with it and possibly load templates from the server
   ko.setTemplateEngine(createStringTemplateEngine(new ko.nativeTemplateEngine(), templates));

   //#endregion

   //#region datakey binding handler
   // TODO: what is this used for?
   // data-bind="datakey: viewModelProperty"
   ko.bindingHandlers["datakey"] =
   {
      init: (element, valueAccessor) =>
      {
         $(element).data("key", valueAccessor());
      },
      update: (element, valueAccessor) =>
      {
         $(element).data("key", valueAccessor());
      }
   };
   //#endregion
   
   //#region timeago binding handler

   // provides a string representation of a timestamp 
   // e.g. "about an hour ago", "30 minutes ago", "3 days ago"
   ko.bindingHandlers["timeago"] =
   {
      init: (element) =>
      {
         ko.utils.domNodeDisposal.addDisposeCallback(element,() =>
         {
            $(element).livestamp('destroy');
         });
      },
      update: (element, valueAccessor) =>
      {
         var time = ko.unwrap(valueAccessor()),
            date = new Date(time);

         //if a time is before 1900 simply means is an invalid date, so we won't show it
         if (date.getFullYear() < 1900)
            return;
         else
            $(element).livestamp(new Date(time)).attr("title", moment(time).format('MMMM Do YYYY, h:mm:ss a'));
      }
   };

   //#endregion

   //#region height binding handler

   // Sets the height of an element based on an element passed in or a viewModel property
   ko.bindingHandlers["height"] =
   {
      update: (element, valueAccessor) =>
      {
         var defaultOptions =
            {
               relativeElement: window,
               offset: 0
            },
            options = valueAccessor() || defaultOptions;

         // Only set the height and scroll if the element is visible
         // (may need to be an option around this if used elsewhere)
         if (!$(element).is(':visible')) return;

         var offset = options.offset || defaultOptions.offset,
            relativeElement = $(options.relativeElement);

         if (relativeElement.length > 0)
            $(element).css("height", relativeElement.height() - offset);
      }
   };

   //#endregion

   //#region labelFor binding handler

   // Given a key (Id of an input) retrieve the associated 
   // label and set the element text to the label
   ko.bindingHandlers["labelFor"] =
   {
      update: (element, valueAccessor) =>
      {
         var key = ko.unwrap(valueAccessor());
         if (key && typeof key === "string")
         {
            //var label = $("label[for='Domain_" + key + "'],label[for='" + key + "']").first().text();
            var label = ag.dom.tryGetLabel(key);
            if (typeof label === "string" && label.length > 0)
            {
               $(element).text(label);
            }
            else
            {
               $(element).closest('li').remove();
            }
         }
         else if (key && typeof key === "object")
         {
            $(element).text(key.displayName);
         }
      }
   };

   //#endregion

   //#region activateTab binding handler

   // Select a tab based on the supplied index (0-indexed)
   ko.bindingHandlers["activateTab"] =
   {
      update: (element, valueAccessor) =>
      {
         var index = ko.unwrap(valueAccessor());
         if (!isNaN(index))
            index = 0;

         $(element).find("li:eq(" + index + ") a").tab("show");
      }
   };

   //#endregion

   //#region lookupValue binding handler

   ko.bindingHandlers["lookupValue"] =
   {
      init: (element, valueAccessor) =>
      {
         ko.utils.registerEventHandler(element, "change",() =>
         {
            // Support user clearing field
            if (isNullUndefinedOrEmpty($(element).val()))
            {
               var value = valueAccessor().peek();
               if (_.isArray(value) && valueAccessor().removeAll)
                  valueAccessor().removeAll();
               else
                  valueAccessor()(null);
            }
         });
      },
      update: (element, valueAccessor, allBindingsAccessor, viewModel) =>
      {
         var value = ko.unwrap(valueAccessor()),
            val = value,
            text = value,
            isEnum = ko.unwrap(viewModel.dataType) === "enum";

         if (value)
         {
            if ($.isArray(value) && value.length > 0)
            {
               val = value[0];
               var accessor = valueAccessor();
               accessor([val]); // remove any additional values
            }

            if ($.isPlainObject(val))
            {
               if (val.hasOwnProperty('name') && !isEnum)
               {
                  text = ko.unwrap(val.name);
                  if (typeof (text) === 'number')
                     text = val.getDisplayName();
               }
               else if (val.hasOwnProperty('text'))
               {
                  text = ko.unwrap(val.text);
               }
            }
         }

         $(element).val(text);
      }
   };

   //#endregion

   //#region timed update binding

   ko.bindingHandlers["timedUpdate"] =
   {
      init: (element, valueAccessor, allBindingsAccessor) =>
      {
         var timeout = allBindingsAccessor().timeout || 350,
            timer = null;

         $(element).keyup(function ()
         {
            if (timer) window.clearTimeout(timer);

            var input = $(this);
            timer = window.setTimeout(() =>
            {
               valueAccessor()(input.val());
            },
               timeout);
         });
         $(element).bind("change paste", function ()
         {
            var input = $(this);
            window.setTimeout(() =>
            {
               valueAccessor()(input.val());
            },
               50);
         });
      },
      update: (element, valueAccessor) =>
      {
         var $element = $(element),
            observableValue = valueAccessor()();

         if ($element.val() !== observableValue)
         {
            $element.val(observableValue);
            $element.change();
         }
      }
   };

   //#endregion

   // partially taken from https://github.com/SteveSanderson/knockout/pull/520
   var subscribeChanged = function (callback)
   {
      var oldValue = this.peek();

      return this.subscribe(newValue =>
      {
         callback(newValue, oldValue);
         oldValue = newValue;
      }, this);
   };

   var subscribeArrayChanged = function (callback)
   {
      if (!this.previousValueSubscription)
      {
         this.previousValueSubscription = this.subscribe(function (_previousValue)
         {
            this.previousValue = _previousValue.slice(0);
         }, this, 'beforeChange');
      }
      return this.subscribe(function (latestValue)
      {
         callback(latestValue, this.previousValue);
      }, this);
   };

   (<any>ko.observableArray.fn).subscribeChanged = subscribeArrayChanged;
   (<any>ko.observable.fn).subscribeChanged = subscribeChanged;
   (<any>ko.computed.fn).subscribeChanged = subscribeChanged;

   // For all sortable multiselect controls, this prevents items from being
   // dropped in a different sortable control.
   (<any>ko.bindingHandlers).sortable.options = { containment: 'parent' };

   (<any>ko).asyncComputed = (evaluator, owner) =>
   {
      var result = ko.observable();

      ko.computed(() =>
      {
         // Get the $.Deferred value, and then set up a callback so that when it's done,
         // the output is transferred onto our "result" observable
         evaluator.call(owner).done(result);
      });

      return result;
   }
}
//#endregion