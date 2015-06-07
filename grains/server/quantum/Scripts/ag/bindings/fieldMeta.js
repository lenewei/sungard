var ag;
(function (ag) {
    // The order is important
    var ValidationState;
    (function (ValidationState) {
        ValidationState[ValidationState["success"] = 0] = "success";
        ValidationState[ValidationState["warning"] = 1] = "warning";
        ValidationState[ValidationState["error"] = 2] = "error";
    })(ValidationState || (ValidationState = {}));

    var elementToReactivateNamespace = ".elementToReactivate", elementToReactivate;

    ko.bindingHandlers["fieldMeta"] = {
        init: function (element, valueAccessor, allBindings, viewModel) {
            var $element = $(element), currentValue = valueAccessor();

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
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                hideValidation($element);
            });
        },
        update: function (element, valueAccessor) {
            var $element = $(element), $container = $element.parent().closest(".field,.collection-panel"), currentValue = valueAccessor();

            // currentValue can be invalid!!!
            if (currentValue == null)
                return;

            if (ag.utils.isMetaObservable(currentValue)) {
                handleEnablement(currentValue, $element);
                handleDynamicLabel(currentValue, $element);
                handleVisibility(currentValue, $container);
                handleProcessing(currentValue, $container);
            }

            handleValidation(currentValue, $element);
        }
    };

    function handleEnablement(currentValue, $element) {
        // [AG 25/10/2012] If the field can handle dependency updates, call the relevant
        // handler as well as update the field.
        var dependencyHandler = $element.data("dependencyHandler");
        var setAvailability = dependencyHandler && dependencyHandler.setAvailability;

        if (!currentValue.isAvailable() || currentValue.isProcessing()) {
            if ($element.is(':focus'))
                setElementToReactivate($element[0]);

            setAvailability && setAvailability(false);
            $element.attr("disabled", "disabled");
        } else {
            setAvailability && setAvailability(true);
            $element.removeAttr("disabled");

            if (getElementToReactivate() === $element[0])
                $element.select().focus();
        }
    }

    function handleDynamicLabel(currentValue, $element) {
        var label = currentValue.label();
        if (label !== undefined && label !== null) {
            $("label[for='" + ($element.prop("id") || "") + "']").first().contents().last()[0].data = label;
        }
    }

    function handleVisibility(currentValue, $container) {
        var $combinedParent = $container.parent(".combined");
        if ($combinedParent.length > 0) {
            var parentValueClass = /(^|\s)(value\d)($|\s)/i.exec($container.attr("class"));
            if (parentValueClass != null) {
                var hiddenClass = parentValueClass[2] + "hidden";
                $combinedParent.toggleClass(hiddenClass, !currentValue.isVisible());
            }
        } else {
            $container.toggle(currentValue.isVisible());
        }
    }

    function handleProcessing(currentValue, $container) {
        if (currentValue.isProcessing()) {
            if ($container.find('img.in-progress').length === 0) {
                var image = document.createElement("img");

                image.className = "in-progress";
                image.src = ag.siteRoot + 'content/img/ajax-loader.gif';

                $container.append(image);
            }
            $container.addClass("processing");
        } else {
            $container.removeClass("processing");
        }
    }

    function handleValidation(currentValue, $element) {
        if (ag.utils.isValidatable(currentValue) && !currentValue.isValid() && currentValue.isModified())
            showValidation($element, currentValue.error, 2 /* error */);
        else if (currentValue.warning && currentValue.warning())
            showValidation($element, currentValue.warning, 1 /* warning */);
        else
            hideValidation($element);
    }

    function showValidation($element, messageProvider, state) {
        toggleValidationTabHeader($element, state);
        toggleValidationClass($element, state);
        createValidationTooltip($element, messageProvider, state);
    }

    function hideValidation($element) {
        toggleValidationTabHeader($element, 0 /* success */);
        toggleValidationClass($element, 0 /* success */);
        destroyValidationTooltip($element);
    }

    function createValidationTooltip($element, messageProvider, state) {
        var validationClass;
        if (state === 2 /* error */)
            validationClass = "error";
        else if (state === 1 /* warning */)
            validationClass = "warning";
        else
            validationClass = "";

        $element.tooltip({
            title: messageProvider,
            template: '<div class="tooltip {0}"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'.format(validationClass)
        });
    }

    function destroyValidationTooltip($element) {
        $element.tooltip('destroy');
    }

    function toggleValidationClass($element, state) {
        $element.toggleClass("input-validation-error", state === 2 /* error */);
        $element.toggleClass("input-validation-warning", state === 1 /* warning */);
    }

    function toggleValidationTabHeader($element, state) {
        _.each(ag.utils.getParentTabHeaders($element), function (tabHeader) {
            var $tabHeader = $(tabHeader), failedValidations = $tabHeader.data("fieldMeta.failedValidations");

            if (!failedValidations) {
                failedValidations = [];
                $tabHeader.data("fieldMeta.failedValidations", failedValidations);
            }

            var idx = _.findIndex(failedValidations, function (i) {
                return i.el === $element[0];
            });
            if (idx !== -1)
                failedValidations.splice(idx, 1);

            if (state !== 0 /* success */)
                failedValidations.push({ el: $element[0], state: state });

            var highestFailedValidation = _.last(_.sortBy(failedValidations, function (i) {
                return i.state;
            })), highestState = _.isUndefined(highestFailedValidation) ? 0 /* success */ : highestFailedValidation.state;

            $tabHeader.toggleClass("error", highestState === 2 /* error */);
            $tabHeader.toggleClass("warning", highestState === 1 /* warning */);
        });
    }

    function onElementFocusin() {
        elementToReactivate = null;
        $('body').off(elementToReactivateNamespace);
    }

    function setElementToReactivate(element) {
        elementToReactivate = element;
        $('body').on('focusin' + elementToReactivateNamespace, '*', onElementFocusin);
    }

    function getElementToReactivate() {
        return elementToReactivate;
    }
})(ag || (ag = {}));
