module ag
{
   ko.bindingHandlers["filter"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) =>
      {
         var $element = $(element),
            source = valueAccessor(),
            net = bindingContext.$root.net || new ag.utils.Network(),
            $data = bindingContext.$data;

         // Source needs to be specified and should be either an array or a URL
         if (!source)
            throw new Error("No local or remote data source specified");
         else if (!(source.push || source.substring))
            throw new Error("data source needs to be an array or a string");

         // The filter binding is dependent on the optionsText and value bindings
         var allBindings = allBindingsAccessor(),
            optionsText = allBindings.optionsText,
            optionsTitle = allBindings.optionsTitle,
            optionsValue = allBindings.optionsValue,
            postFilter = allBindings.postFilter,
            postRequest = allBindings.postRequest,
            requestDataCallback = allBindings.requestData,
            initialRequestDataCallback = allBindings.initialRequestDataCallback,
            selectedKeys = allBindings.selectedKeys,
            valueCallback = allBindings.valueCallback || allBindings.filterValue || allBindings.key,
            additionalPayloadData = allBindings.additionalPayloadData,
            restrictToListMessage = allBindings.restrictToList,
            restrictToList = !!restrictToListMessage;

         if (!optionsText || !valueCallback)
            throw new Error("The filter binding requires the optionsText binding and either a key, filterValue or valueCallback binding");

         var compareKey = $element.data("lookup-compare-key") || "key",
            hideQueryUI = !!$element.data("lookup-hide-query-ui"),
            maxItems = parseInt($element.data("lookup-max-items")) || 20,
            prerequisiteFields = $element.data("lookup-prerequisite-fields"),
            hintSource = $element.data("lookup-hint-source"),
            hintTarget = $element.data("lookup-hint-target"),
            prefix = $element.data("prefix");

         // Prerequisite Title          
         if (prerequisiteFields != undefined)
         {
            var fields = prerequisiteFields.split(","),
               fieldsString = "";

            $.each(fields, (index, name) =>
            {
               var labelName = ag.dom.tryGetLabel(name);
               fieldsString += (fieldsString.length > 0) ? ", " + labelName : labelName;
            });

            if (fieldsString.length > 0)
               element.title = strings.prereqFields.format(fieldsString);
         }
         // Handle the dialog closing
         var onClose = () =>
         {
            // Set focus to the target input
            _.delay(() => { $element.focus(); }, 0);

            // Unsuspend the valueCallback if it's an observable
            if (valueCallback.isSuspended)
               valueCallback.isSuspended(false);
         };

         // Do some pre-save work
         var onBeforeSave = () =>
         {
            // Unsuspend the valueCallback if it's an observable
            if (valueCallback.isSuspended)
               valueCallback.isSuspended(false);
         };

         // Do some post save work
         var onAfterSave = () =>
         {
            // Set focus to the target input
            _.delay(() => { $element.focus(); }, 0);

            // Unsuspend the valueCallback if it's an observable
            if (valueCallback.isSuspended)
               valueCallback.isSuspended(false);

            // If the target input is a typeahead, reset the selection pending status
            var typeahead = $element.data("typeahead");
            if (typeahead)
               typeahead.selectionPending = false;

            key.utils.notifyKeyEventChange($element);
         };

         // Set up explorer
         $element.data("explorer", new ag.components.Explorer(
            {
               modal: true,
               rootViewModel: bindingContext.$root,
               lookupDisplayName: "Browse",
               source: source,
               view: { fields: [] },
               saveCallback: valueCallback,
               postRequest: postRequest,
               requestDataCallback: requestDataCallback,
               optionsText: optionsText,
               optionsTitle: optionsTitle,
               mode: "single",
               pageSize: 10,
               target: $element,
               viewModel: viewModel,
               initialRequestDataCallback: initialRequestDataCallback,
               onAfterSave: onAfterSave,
               onBeforeSave: onBeforeSave,
               onClose: onClose,
               keyField: "name",
               additionalPayloadData: additionalPayloadData,
               hintSource: hintSource,
               hintTarget: hintTarget,
               prefix: prefix,
            }));

         // Set up typeahead 
         if ($element.is("input"))
         {
            var dataSource = createDataSource(selectedKeys, $element, requestDataCallback, additionalPayloadData, net, source, postRequest, postFilter);

            ag.filter.helper.typeahead.init(
               $element,
               maxItems,
               dataSource,
               optionsTitle,
               optionsText,
               compareKey,
               optionsValue,
               valueCallback,
               hideQueryUI,
               hintSource,
               hintTarget,
               prefix,
               $data,
               restrictToList);

            if (ko.isObservable(valueCallback) && restrictToList)
            {
               // Async validators have a known issue https://github.com/Knockout-Contrib/Knockout-Validation/issues/549
               ag.utils.registerBindingRule(element, valueCallback,
               {
                  async: true,
                  message: restrictToListMessage,
                  validator: (value, params, resultCallback) => validateValueIsInList(value, valueCallback, dataSource, maxItems, optionsValue, resultCallback)
               });
            }
         }

         // Set up a dependency handler
         $element.data("dependencyHandler", {
            setAvailability: value =>
            {
               // Look for an associated filter toggle within a containing field
               // and update the enabled property
               var toggle = $element.closest(".field").find(".toggle");
               toggle.data("enabled", value);
            }
         });

         // Setup all event listeners
         filter.helper.registerEventListeners($element, valueCallback, restrictToList);

         // Add the toggle button
         addToggleButton($element, valueCallback);

         // Dispose	
         ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
         {
            filter.helper.typeahead.destroy($element);
            removeToggleButton($element);
         });
      }
   }

   // Datasource for the filter
   function createDataSource(selectedKeys, target, requestDataCallback, additionalPayloadData, net, source, postRequest, postFilter)
   {
      return (query, maxItems) =>
      {
         // Initial lookup data
         var lookupData: any =
         {
            pageSize: maxItems,
            selectedKeys: selectedKeys && selectedKeys(),
            searchKeyColumnOnly: "true",
            searchText: query
         };

         // Provide any additional field values required. If additional field names have been specified,
         // they will be expected to exist on an object on the associated view model with the name specified in
         // the "data-prefix" attribute.
         $.extend(lookupData, ag.utils.getAdditionalFields(target, null, null, null));

         // Add any additional request data
         if (requestDataCallback)
            $.extend(lookupData, requestDataCallback());

         if (additionalPayloadData)
            $.extend(lookupData, { additionalData: ko.mapping.toJS(additionalPayloadData) });

         return net.postJson({ url: source }, ag.utils.cleanJSForRequest(lookupData)).then(result =>
         {
            // [AG 13/7/2012] If the returned data is a string, try to parse it as JSON (some older
            // lookup methods return an explicitly serialised JSON string instead of leaving
            // the serialising to MVC, so jQuery can't parse it).
            if (_.isString(result))
               result = $.parseJSON(result);

            // Transform the lookup data for use with the typeahead
            lookupData = ag.utils.transformLookup(result);

            // If a postRequest handler has been specified, use it to post-process the result.
            if (postRequest)
               lookupData = postRequest(lookupData);

            if (postFilter)
               lookupData.data = $.grep(lookupData.data, (item) => postFilter(item));

            return { lookupData: lookupData, gridViewOptions: result.gridViewOptions };
         });
      }
   }

   function validateValueIsInList(value, valueCallback, dataSource, maxItems, optionsValue, resultCallback)
   {
      if (ag.isNullUndefinedOrEmpty(value) || !valueCallback.valueIsUnvalidated)
      {
         // Knockout Validation expects the callback to be called asynchronously
         _.delay(() =>
         {
            resultCallback(true);
         }, 0);
      }
      else
      {
         dataSource(value, maxItems)
            .done((result) =>
            {
               var possibleValues = optionsValue ? _.map(result.lookupData.data, (i) => ag.utils.getValueFromAccessor(i, optionsValue)) : result.lookupData.data,
                  isValueFound = !_.isUndefined(_.find(possibleValues, (i) =>
                  {
                     return _.isString(i) && _.isString(value) ? (<any>i).toLowerCase() === value.toLowerCase() : i == value; // Use == because value may be a number while the lookup values is string. This happens when the data type is decimal.
                  }));

               resultCallback(isValueFound);
            })
            .fail(() =>
            {
               resultCallback(false);
            });
      }

      valueCallback.valueIsUnvalidated = false;
   }

   function addToggleButton($element: JQuery, valueCallback: any): void
   {
      var $toggle = $('<div class="toggle"><i class="icon-th"></i></div>');
      
      $toggle.on("click", e =>
      {
         // Find the input in the current editor field
         var $target = $(e.target),
            input = $target.closest('.field').find('input'),
            lookupDisplayName = input.data("lookup-display-name");

         // Find the closest parent that is our toggle element
         var toggle = $target.closest('.toggle');

         // If the toggle is disabled, do nothing.
         if (toggle.data("enabled") === false)
            return;

         if (!input)
            return;

         // Get the explorer and typeahead
         var explorer = input.data("explorer");
         if (!explorer)
            return;

         var typeahead = input.data("typeahead");
         if (!typeahead)
            return;

         // Get the explorer options from the explorer instance
         var explorerOptions = explorer.options;

         // Put the displayname in if supplied
         explorerOptions.lookupDisplayName = (lookupDisplayName) ? "Select " + lookupDisplayName : "Browse";

         // Suspend the observable to prevent subscriptions from being fired when the explorer is opened and the input
         // is blurred (triggering an update on the observable before we've finished selecting a valid value).
         valueCallback.isSuspended && valueCallback.isSuspended(true);
         explorer.toggle($.extend({ searchQuery: typeahead.shown ? input.val() : '' }, explorerOptions));
         typeahead.hide(false);

         e.stopImmediatePropagation();
         e.preventDefault();
      });

      $element.after($toggle);
   }

   function removeToggleButton($element: JQuery): void
   {
      $element.next(".toggle").first().off().remove();
   }
}