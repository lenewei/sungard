module ag
{
   import IMetaObservable = dependencies.IMetaObservable;

   // The order is important
   enum ValidationState
   {
      success,
      warning,
      error
   }

   var elementToReactivateNamespace = ".elementToReactivate",
      elementToReactivate: Element;

   ko.bindingHandlers["fieldMeta"] =
   {
      init: (element, valueAccessor, allBindings, viewModel) =>
      {
         var $element = $(element),
            currentValue = valueAccessor();

         // currentValue can be invalid!!!
         if (currentValue == null)
            return;

         // If initially disabled keep it that way
         if ($element.attr("disabled") && currentValue.isAvailable)
            currentValue.isAvailable(false);

         // Add indicator for key fields to the parent editor field
         if (currentValue.isKeyField && currentValue.isKeyField())
            $element.closest('.field').addClass('key');

         // Make the observable validatable so that Knockout Validation
         // rules can be added even after this binding has initialized
         currentValue.extend({ validatable: true });

         // Add warning for the same reason as above
         ag.utils.addWarning(currentValue);

         // Parse the MVC validation attributes into Knockout Validation rules
         ag.validationAttributeParser.attachAttributes(element.id, currentValue, viewModel);

         // Dispose
         ko.utils.domNodeDisposal.addDisposeCallback(element,() =>
         {
            hideValidation($element);
         });
      },
      update: (element, valueAccessor) =>
      {
         var $element = $(element),
            $container = $element.parent().closest(".field,.collection-panel"),
            currentValue = valueAccessor();

         // currentValue can be invalid!!!
         if (currentValue == null)
            return;

         if (utils.isMetaObservable(currentValue))
         {
            handleEnablement(currentValue, $element);
            handleDynamicLabel(currentValue, $element);
            handleVisibility(currentValue, $container);
            handleProcessing(currentValue, $container);
         }

         handleValidation(currentValue, $element);
      }
   };

   function handleEnablement(currentValue: IMetaObservable, $element: JQuery): void
   {
      // [AG 25/10/2012] If the field can handle dependency updates, call the relevant
      // handler as well as update the field.
      var dependencyHandler = $element.data("dependencyHandler");
      var setAvailability = dependencyHandler && dependencyHandler.setAvailability;

      if (!currentValue.isAvailable() || currentValue.isProcessing())
      {
         if ($element.is(':focus'))
            setElementToReactivate($element[0]);

         setAvailability && setAvailability(false);
         $element.attr("disabled", "disabled");
      }
      else
      {
         setAvailability && setAvailability(true);
         $element.removeAttr("disabled");

         if (getElementToReactivate() === $element[0])
            $element.select().focus();
      }
   }

   function handleDynamicLabel(currentValue: IMetaObservable, $element: JQuery): void
   {
      var label = currentValue.label();
      if (label !== undefined && label !== null)
      {
         (<any>$("label[for='" + ($element.prop("id") || "") + "']").first().contents().last()[0]).data = label;

         // combined fields
         var $elementParent = $element.parent();
         if ($elementParent.hasClass('value1') || $elementParent.hasClass('value2'))
         {
            $elementParent.siblings('label').text(label);
         }
      }
   }

   function handleVisibility(currentValue: IMetaObservable, $container: JQuery): void
   {
      var $combinedParent = $container.parent(".combined");
      if ($combinedParent.length > 0)
      {
         var parentValueClass = /(^|\s)(value\d)($|\s)/i.exec($container.attr("class"));
         if (parentValueClass != null)
         {
            var hiddenClass = parentValueClass[2] + "hidden";
            $combinedParent.toggleClass(hiddenClass, !currentValue.isVisible());
         }
      }
      else
      {
         $container.toggle(currentValue.isVisible());
      }
   }

   function handleProcessing(currentValue: IMetaObservable, $container: JQuery): void
   {
      if (currentValue.isProcessing())
      {
         if ($container.find('img.in-progress').length === 0)
         {
            var image = document.createElement("img");

            image.className = "in-progress";
            image.src = ag.siteRoot + 'content/img/ajax-loader.gif';

            $container.append(image);
         }
         $container.addClass("processing");
      }
      else
      {
         $container.removeClass("processing");
      }
   }

   function handleValidation(currentValue: KnockoutObservable<any>, $element: JQuery): void
   {
      if (utils.isValidatable(currentValue) && !currentValue.isValid() && currentValue.isModified()) //Knockout Validation
         showValidation($element, currentValue.error, ValidationState.error);
      else if ((<any>currentValue).warning && (<any>currentValue).warning()) //Warnings
         showValidation($element,(<any>currentValue).warning, ValidationState.warning);
      else
         hideValidation($element);
   }

   function showValidation($element: JQuery, messageProvider: () => string, state: ValidationState): void
   {
      toggleValidationTabHeader($element, state);
      toggleValidationClass($element, state);
      createValidationTooltip($element, messageProvider, state);
   }

   function hideValidation($element: JQuery)
   {
      toggleValidationTabHeader($element, ValidationState.success);
      toggleValidationClass($element, ValidationState.success);
      destroyValidationTooltip($element);
   }

   function createValidationTooltip($element: JQuery, messageProvider: () => string, state: ValidationState)
   {
      var validationClass;
      if (state === ValidationState.error)
         validationClass = "error";
      else if (state === ValidationState.warning)
         validationClass = "warning";
      else
         validationClass = "";

      $element.tooltip(
         {
            title: messageProvider,
            template: '<div class="tooltip {0}"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'.format(validationClass)
         });
   }

   function destroyValidationTooltip($element: JQuery): void
   {
      $element.tooltip('destroy');
   }

   function toggleValidationClass($element: JQuery, state: ValidationState): void
   {
      $element.toggleClass("input-validation-error", state === ValidationState.error);
      $element.toggleClass("input-validation-warning", state === ValidationState.warning);
   }

   function toggleValidationTabHeader($element: JQuery, state: ValidationState): void
   {
      _.each(ag.utils.getParentTabHeaders($element),(tabHeader) =>
      {
         var $tabHeader = $(tabHeader),
            failedValidations = $tabHeader.data("fieldMeta.failedValidations");

         if (!failedValidations)
         {
            failedValidations = [];
            $tabHeader.data("fieldMeta.failedValidations", failedValidations);
         }

         var idx = _.findIndex(failedValidations, (i: any) => i.el === $element[0]);
         if (idx !== -1)
            failedValidations.splice(idx, 1);

         if (state !== ValidationState.success)
            failedValidations.push({ el: $element[0], state: state });

         var highestFailedValidation = _.last(_.sortBy(failedValidations, (i: any) => i.state)),
            highestState = _.isUndefined(highestFailedValidation) ? ValidationState.success : highestFailedValidation.state;

         $tabHeader.toggleClass("error", highestState === ValidationState.error);
         $tabHeader.toggleClass("warning", highestState === ValidationState.warning);
      });
   }

   function onElementFocusin(): void
   {
      elementToReactivate = null;
      $('body').off(elementToReactivateNamespace);
   }

   function setElementToReactivate(element: Element): void
   {
      elementToReactivate = element;
      $('body').on('focusin' + elementToReactivateNamespace, '*', onElementFocusin);
   }

   function getElementToReactivate(): Element
   {
      return elementToReactivate;
   }
}