/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";
   
   // Parameters to the business day service
   class BusinessDaysParam
   {
      url: string;
      currencies: string[];
      locations: string[];
   }

   // Options/settings to the business days feature of this binding
   class BusinessDaysOptions
   {
      message: string;
      url: string;
      currencies: KnockoutObservable<string>[];
      locations: KnockoutObservable<string[]>[];
   }

   var businessDaysService;

   // ToDo: We should place all options inside the data-bind instead of our own data attributes or a CSS class
   ko.bindingHandlers["date"] =
   {
      init: (element, valueAccessor, allBindingsAccessor, viewModel) =>
      {
         initDatepicker(element, valueAccessor, allBindingsAccessor, viewModel);
      },
      update: (element, valueAccessor) =>
      {
         // Update the control when the view model changes
         updateEditUIFromObservable(element, valueAccessor());
      }
   };

   function onShow(e: any)
   {
      var datepicker = $(e.target).data("datepicker"),
         highestZIndex = utils.findHighestDivZIndex(),
         $modal = $('<div class="modal-datepicker" style="z-index:{0};position: fixed; top: 0; bottom: 0; left: 0; right: 0; overflow-y: auto; overflow-x: hidden"></div>'.format(highestZIndex + 1));

      $("body").append($modal);

      ko.utils.registerEventHandler($modal, "click", () =>
      {
         datepicker.hide();
      });

      datepicker.picker.css("z-index", highestZIndex + 2);

      datepicker.element.focus();

      datepicker.update();
   }

   function onHide(e: any)
   {
      var datepicker = $(e.target).data("datepicker");

      $("div.modal-datepicker").remove();

      if (e.fromTab)
         return;
      
      _.delay(() =>
      {
         datepicker.element.focus();
      }, 0);
   }

   function initDatepicker(element, valueAccessor, allBindingsAccessor, viewModel)
   {
      // Initialize datepicker with some optional options
      var options = allBindingsAccessor().datepickerOptions || {},
         $element = $(element),
         businessDaysOptions: BusinessDaysOptions;

      if (!options.dateFormat)
         options.dateFormat = dateShortFormat.toLowerCase();

      if (!options.minimumDate)
         options.minimumDate = constants.MinimumDate;

      if (!options.maximumDate)
         options.maximumDate = constants.MaximumDate;

      // ensure autocomplete is off
      $element.attr("autocomplete", "off");

      // Initialise type head
      filter.helper.typeahead.initForLocalDatasource($element, $element.data("risk")
         ? dates.riskRelativeDateLabels
         : $element.data("risk-column-set")
         ? dates.riskColumnSetRelativeDateLabels
         : dates.relativeDateLabels);

      // Initialize non business days
      businessDaysOptions = tryGetBusinessDaysOptions($element, viewModel);

      // Initialize the date picker control
      // ReSharper disable once UsageOfPossiblyUnassignedValue
      initDatepickerControl($element, options.dateFormat, businessDaysOptions);
      
      // Add toggle button to show and hide calendar
      addToggleButton($element);

      // Handle the field changing
      ko.utils.registerEventHandler(element, "change", () =>
      {
         updateObservableFromUI(element, valueAccessor());
      });

      // Mixture the behavior with typeahead and datepicker
      mixtureTypeaheadAndDatepickerKeyboardInteraction($element);

      // ISO validation rule
      ag.utils.registerBindingRule(element, valueAccessor(), createIsoRule(element, options));

      // Business day validation warning rule
      if (businessDaysOptions)
         ag.utils.registerBindingWarningRule(element, valueAccessor(), createBusinessDaysWarningRule(valueAccessor(), businessDaysOptions));


      // Dispose
      ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
      {
         filter.helper.typeahead.destroy($element);
         removeDatepickerControl($element);
         removeToggleButton($element);
      });
   }

   function createIsoRule(element: Element, options: any): KnockoutValidationRule
   {
      return {
         message: ag.strings.datePickerValidationMessage.format(options.dateFormat),
         validator: (value, validate) =>
         {
            if (!validate)
               return true;

            if (isRelativeDate(element) && canSkipIsoConversion(value))
               return true;

            return ko.validation.utils.isEmptyVal(value)
               || moment(value, ag.momentExtensions.Format.ISO, true).isValid()
               || moment(value, ag.momentExtensions.Format.ISOFull, true).isValid();
         }
      };
   }

   function createBusinessDaysWarningRule(observable: any, businessDaysOptions: BusinessDaysOptions): (resultCallback: (message:string)=>void)=> void
   {
      var debouncedValidator = _.debounce((value, callback) =>
      {
         var dateString = _.isString(value) ? dates.looselyConvertStringToIso(dates.resolveDate(value) || value) : null;
         if (!dateString)
         {
            callback(null);
         }
         else
         {
            var dateMoment = moment.fromISO(dateString);

            getBusinessDaysService().getNonBusinessDays(getBusinessDaysParam(businessDaysOptions), dateMoment.year())
               .done((nonBusinessDays) =>
               {
                  callback(isNonBusinessDay(dateMoment.toISO(), nonBusinessDays) ? businessDaysOptions.message : null);
               })
               .fail(() =>
               {
                  callback(null);
               });
         }
      }, 1000);

      return (callback) =>
      {
         //unwrap so that validator is called when businessDaysParam changes
         getBusinessDaysParam(businessDaysOptions);

         debouncedValidator(observable(), callback);
      };
   }

   function initDatepickerControl(inputElement: JQuery, dateFormat: string, businessDaysOptions: BusinessDaysOptions)
   {
      var isInitializing = true,
         businessDaysDataSource = new DatepickerBusinessDaysDataSource(() => { tryFillDatepicker(inputElement); });

      inputElement.closest("div input").datepicker(
      {
         today: userLocationToday.toDateZeroTime(), // override value of today
         todayHighlight: true,
         preventShowOnFocus: true,
         autoclose: true,
         weekStart: 1,
         todayBtn: "linked",
         forceParse: false,
         format: dateFormat,
         viewDate: undefined,
         beforeShowDay: (date: Date) =>
         {
            // Process Date objects coming from DatePicker (for the current month)
            if (businessDaysOptions && !isInitializing)
            {
               var businessDaysParam = getBusinessDaysParam(businessDaysOptions);

               // Convert to a moment and get the year
               // Note: moment(date) used not moment.utc(date)
               var dateMoment = moment(date),
                  year = dateMoment.year();

               // Try and add this to our cache if we don't already have it in there
               businessDaysDataSource.tryAdd(businessDaysParam, year);

               // Check if the date is a non business day or not
               if (isNonBusinessDay(dateMoment.toISO(), businessDaysDataSource.tryGet(businessDaysParam, year)))
                  return { tooltip: businessDaysOptions.message, enabled: true, classes: "highlight" };
            }

            // Note: tooltip must be a space otherwise will not update
            return { tooltip: " ", enabled: true, classes: "" };
         }
      });
      
      var datepicker = inputElement.data("datepicker"),
         $datepickerElement = $(datepicker.element);

      // Register event listeners
      ko.utils.registerEventHandler($datepickerElement, "show", onShow);
      ko.utils.registerEventHandler($datepickerElement, "hide", onHide);

      isInitializing = false;
   }

   function removeDatepickerControl($element: JQuery): void
   {
      $element.closest("div input").data("datepicker").remove();
   }

   function tryFillDatepicker($inputElement)
   {
      var datepicker = $inputElement.data("datepicker");
      if (datepicker)
         datepicker.fill();
   }

   function updateObservableFromUI(element, observable)
   {
      // Set the observable value to the element value if we can't parse it as an absolute date
      // (it might be a relative date string, "Today" etc.)
      var inputValue = $(element).val(),
         result = convertDateStringIntoISOFormat(element, inputValue);

      // If no result most likely relative date (non-resolved)
      if (!result)
         result = inputValue;

      var currentResult = observable();

      observable(result);

      if (currentResult === result)
         observable.valueHasMutated();
   }

   function mixtureTypeaheadAndDatepickerKeyboardInteraction($inputElement: JQuery)
   {
      var datepicker = $inputElement.data("datepicker");
      var typeahead = $inputElement.data("typeahead");

      ko.utils.registerEventHandler($inputElement, "keydown",(e: JQueryEventObject) =>
      {
         // If the datepick is hidden no more process is required.
         if (!datepicker.picker.is(":visible"))
            return;

         // If typeahead is shown, hide it.
         if (typeahead.shown)
            typeahead.hide();

         if ($.ui.keyCode.ESCAPE == e.keyCode)
            return;

         // Hide the datepicker if none of those four keys have been pressed.
         if ($.ui.keyCode.UP != e.keyCode && $.ui.keyCode.DOWN != e.keyCode &&
            $.ui.keyCode.LEFT != e.keyCode && $.ui.keyCode.RIGHT != e.keyCode)
            datepicker.hide();
      });
   }

   function convertDateStringIntoISOFormat(element: Element, inputValue: string): string
   {
      if (skipConvertDateStringIntoIsoFormat(element, inputValue))
         return inputValue;

      // Convert Today, Tomorrow, EndOfMonth etc.
      var convertedValue = dates.resolveDate(inputValue);
      inputValue = convertedValue !== null ? convertedValue : inputValue;

      return dates.looselyConvertStringToIso(inputValue);
   }

   function skipConvertDateStringIntoIsoFormat(element: Element, inputValue: string): boolean
   {
      // If we are not a relative date (where relative dates are not resolved, remain as "Today" etc.) 
      // then conversion is required
      if (!isRelativeDate(element))
         return false;

      // Test there is a value, if the value doesn't start with 
      // a number consider it to be a relative date string that needs resolving.
      return canSkipIsoConversion(inputValue);
   }

   function isRelativeDate(element)
   {
      return !$(element).hasClass("date");
   }

   function updateEditUIFromObservable(element, observable)
   {
      var value = ko.unwrap(observable),
         $element = $(element);

      if (value === null)
      {
         // Reset - clear the value and the datepicker
         $element.val("");
         clearDatepickerSelectedDate($element);
         return;
      }

      // Handle some strange behaviour in Risk Filters where dates are 
      // in the format "31/12/1969" - needs to fixed and this code removed.
      if (!dates.isDateISO8601Format(value))
         value = convertDateStringIntoISOFormat(element, value);

      var valueMoment = moment.fromISO(value);

      // Update the UI if we have a valid value
      if (valueMoment.isValid())
      {
         // Ensure the year is between an acceptable range, 
         // this avoids default values being set on the UI e.g. "0001-01-01"
         if (valueMoment.withinValidDateRange())
         {
            var newValue = valueMoment.toEditor();
            if (newValue !== $element.val())
               $element.datepicker("setDate", valueMoment.toDateZeroTime());
         }
         else
         {
            $element.val("");
            clearDatepickerSelectedDate($element);
         }
         return;
      }

      // If this element is relative date and skip the Iso Conversion
      // we just use the string value, otherwise we will leave the convertted value
      // in the input field.
      if (isRelativeDate(element) && canSkipIsoConversion(value))
         $element.val(value);

      clearDatepickerSelectedDate($element);
   }

   function clearDatepickerSelectedDate(datepickerElement: JQuery)
   {
      // Clear the selected date in datepicker, no built in function 
      // currently exists, looking at the code this is basically it.
      var datepicker = datepickerElement.data("datepicker");

      // Set the viewDate today (light yellow highlight)
      datepicker.viewDate = moment.utc().toDateZeroTime();
   }

   function canSkipIsoConversion(value:string): boolean
   {
      if (value && value.length > 0)
         if (isNaN(parseInt(value[0])))
            return true;

      return false;
   }

   function tryGetBusinessDaysOptions($element: JQuery, viewModel: any): BusinessDaysOptions
   {
      if (!$element.data("businessday"))
         return null;

      return {
         message: $element.data("businessday"),
         url: $element.data("businessday-geturl"),
         currencies: getCommaSeparatedProperties<KnockoutObservable<string>>(viewModel, $element.data("businessday-basepath"), $element.data("businessday-currencies")),
         locations: getCommaSeparatedProperties<KnockoutObservable<string[]>>(viewModel, $element.data("businessday-basepath"), $element.data("businessday-locations"))
      };
   }

   function getCommaSeparatedProperties<T>(viewModel: any, basePath: string, commaSeparatedPropertyPaths: string): T[]
   {
      var pathPrefix = basePath ? basePath + "." : "";

      return _.chain(ag.utils.splitAndTrim(commaSeparatedPropertyPaths))
         .filter((i) => i)
         .map((i) =>
         {
            var propertyPath = pathPrefix + i.toCamelCase(),
               property = ag.getProperty(viewModel, propertyPath);

            if (!property)
               throw Error("Property '{0}' not found".format(propertyPath));

            return property;
         })
         .value();
   }

   function getBusinessDaysParam(options: BusinessDaysOptions): BusinessDaysParam
   {
      return {
         url: options.url,
         currencies: _.chain(options.currencies).filter((i) => utils.isVisibleOrNotMetaObservable(i)).map((i) => i()).filter((i) => i).sort().uniq(true).value(),
         locations: _.chain(options.locations).filter((i) => utils.isVisibleOrNotMetaObservable(i)).map((i) => i()).flatten<string>().filter((i) => i).sort().uniq(true).value()
      };
   }

   function isNonBusinessDay(isoDate: string, nonBusinessDays: Moment[]): Boolean
   {
      return !_.isUndefined(_.find(nonBusinessDays, i =>
      {
         return i.toISO() === isoDate;
      }));
   }

   function getBusinessDaysService(): BusinessDaysService
   {
       if (!businessDaysService)
          businessDaysService = new BusinessDaysService();

      return businessDaysService;
   }

   function addToggleButton($element: JQuery): void
   {
      var $toggle = $('<div class="toggle"><i class="icon-calendar"></i></div>');

      $toggle.on('click', () =>
      {
         var datepicker = $element.data("datepicker");
         if (!datepicker.picker.is(":visible"))
            datepicker.show();
         else
            datepicker.hide();
      });

      $element.after($toggle);
   }

   function removeToggleButton($element: JQuery): void
   {
      $element.next(".toggle").first().off().remove();
   }

   class BusinessDaysService
   {
      private cache: { [key: string]: JQueryPromise<Moment[]> } = {};

      public getNonBusinessDays(param: BusinessDaysParam, year: number): JQueryPromise<Moment[]>
      {
         if (_.isEmpty(param.locations) && _.isEmpty(param.currencies))
            return $.Deferred().resolve([]).promise();

         return this.getFromCacheOrServer(param, year);
      }

      private getFromCacheOrServer(param: BusinessDaysParam, year: number): JQueryPromise<Moment[]>
      {
         var cacheKey = JSON.stringify({ param: param, year: year }),
            promise = this.cache[cacheKey];
            
         if (!promise)
         {
            promise = this.cache[cacheKey] = ag.utils.getJson(param.url, { currencies: param.currencies, locations: param.locations, year: year })
               .then((nonBusinessDays) =>
               {
                  return _.map(nonBusinessDays, (i: string) => moment.fromISO(i));
               })
               .fail(() =>
               {
                  delete this.cache[cacheKey];
               });
         }

         return promise;
      }
   }

   class DatepickerBusinessDaysDataSource
   {
      private currentBusinessDaysParam;
      private currentAnnualNonBusinessDays: { [key: number]: Moment[] } = {};
      private updatedCallback: () => void;

      constructor(updatedCallback: ()=>void)
      {
         this.updatedCallback = updatedCallback;
      }

      public tryAdd(businessDaysParam: BusinessDaysParam, year: number)
      {
         if (!_.isEqual(businessDaysParam, this.currentBusinessDaysParam))
         {
            this.currentBusinessDaysParam = businessDaysParam;
            this.currentAnnualNonBusinessDays = {};
         }

         if (!this.currentAnnualNonBusinessDays[year])
         {
            this.currentAnnualNonBusinessDays[year] = [];

            getBusinessDaysService().getNonBusinessDays(businessDaysParam, year)
               .done((nonBusinessDays: Moment[]) =>
               {
                  if (_.isEqual(businessDaysParam, this.currentBusinessDaysParam))
                  {
                     this.currentAnnualNonBusinessDays[year] = nonBusinessDays;
                     this.updatedCallback();
                  }
               })
               .fail(() =>
               {
                  delete this.currentAnnualNonBusinessDays[year];
               });
         }
      }

      public tryGet(businessDaysParam: BusinessDaysParam, year: number)
      {
         if (_.isEqual(businessDaysParam, this.currentBusinessDaysParam))
            return this.currentAnnualNonBusinessDays[year];

         return null;
      }
   }
}