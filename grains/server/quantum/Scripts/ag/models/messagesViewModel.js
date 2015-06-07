/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    (function (messages) {
        var $successMessage, $errorMessage, timeoutHandle, mouseOutTimeoutExtension = 1000;

        function init() {
            $successMessage = $("#alert_success");
            $errorMessage = $("#alert_error");

            if ($successMessage.length && $errorMessage.length) {
                // Don't hide messages while the user has their mouseover them
                $([$successMessage[0], $errorMessage[0]]).on("mouseover mouseout", function (event) {
                    if (event.type === "mouseover")
                        stopHideTimer();
                    else if (event.type === "mouseout")
                        startHideTimer($(event.currentTarget), mouseOutTimeoutExtension);
                });

                // Don't hide messages if the tab is not active/has focus
                ag.dom.windowActivity.isActiveChanged(function (isActive) {
                    if (!isActive) {
                        stopHideTimer();
                    } else {
                        var $target;
                        if ($successMessage.css("display") == "block")
                            $target = $successMessage;

                        if (!$target && $errorMessage.css("display") == "block")
                            $target = $errorMessage;

                        if ($target)
                            startHideTimer($target, getDuration($target));
                    }
                });
            }
        }
        messages.init = init;

        function getDuration($messageContainer) {
            return $messageContainer && $messageContainer.data("duration") || "10000";
        }

        function showMessage($messageContainer, message) {
            clear();

            // Make sure we have a message to display
            if (ag.isNullUndefinedOrEmpty(message))
                return;

            var duration = getDuration($messageContainer), isHtml = containsValidHtml(message), displayFunction = !isHtml ? "text" : "html";

            if (!isHtml)
                message = ag.utils.htmlDecode(message);

            // If the message contains html (links)
            // show the message for twice as long
            if (isHtml)
                duration = duration * 2;

            $messageContainer.find("span")[displayFunction](message);
            $messageContainer.fadeIn("fast");

            // Only start the hide timer if the window is active
            if (ag.dom.windowActivity.isActive)
                startHideTimer($messageContainer, duration);
        }

        function stopHideTimer() {
            window.clearTimeout(timeoutHandle);
        }

        function startHideTimer($messageContainer, duration) {
            timeoutHandle = window.setTimeout(function () {
                stopHideTimer();
                $messageContainer.fadeOut("fast");
            }, duration);
        }

        function containsValidHtml(message) {
            // Check if message has any anchor tags
            if (/<a/gi.test(message)) {
                // Find any instances of an anchor with other attributes
                if (/(<a\s*href=\"[#a-z/0-9?&]+")[^>]/gi.test(message))
                    return false;

                // Find any instances of an anchor with javascript as the href
                if (/(<a\s*href=(\"|'|)[\s\\]*javascript[\s:a-z]*(\"|'|))/gi.test(message))
                    return false;

                // Check for any tag other than anchor
                if (/<\s*[^/a]/gi.test(message))
                    return false;

                // All tests pass
                return true;
            }

            return false;
        }

        function clear() {
            if (timeoutHandle)
                window.clearTimeout(timeoutHandle);

            if ($successMessage && $successMessage.length)
                $successMessage.hide();

            if ($errorMessage && $errorMessage.length)
                $errorMessage.hide();
        }
        messages.clear = clear;

        function clearSuccess() {
            // If there are any success messages clear them
            $successMessage.hide();
        }
        messages.clearSuccess = clearSuccess;

        function clearError() {
            // If there are any error messages clear them
            $errorMessage.hide();
        }
        messages.clearError = clearError;

        function success(message) {
            showMessage($successMessage, message);
        }
        messages.success = success;

        function error(message) {
            showMessage($errorMessage, message);
        }
        messages.error = error;

        function show(message, type) {
            // Extend for different types as needed
            if (type === 1) {
                error(message);
                return;
            }

            // Default to success
            success(message);
        }
        messages.show = show;
    })(ag.messages || (ag.messages = {}));
    var messages = ag.messages;

    (function (toasts) {
        var options = {
            closeButton: false,
            debug: false,
            positionClass: "toast-top-right",
            showDuration: "fast",
            hideDuration: "fast",
            timeOut: "7000",
            extendedTimeOut: "1000",
            showEasing: "swing",
            hideEasing: "linear",
            showMethod: "fadeIn",
            hideMethod: "fadeOut",
            stackMessages: true,
            target: "#notifications"
        };

        function init() {
            // Set options on the toastr
            toastr.options = options;
        }
        toasts.init = init;

        function showMessage(messageFunc, message, title, optionOverrides) {
            if (typeof title === "undefined") { title = ""; }
            if (typeof optionOverrides === "undefined") { optionOverrides = {}; }
            // If we're not stacking, clear any current messages
            if (!options.stackMessages)
                clear();

            // Create a new options object as any
            // settings that change become the default
            var messageOptions = $.extend({}, options, optionOverrides);

            // If and icon is supplied prepend it to the message
            var iconAndMessage = (optionOverrides.icon) ? "<i class=\"icon icon-white {0}\"></i>".format(optionOverrides.icon) + message : message;

            // Show the message
            var $toast = messageFunc(iconAndMessage, title, messageOptions);

            // If we have been supplied a categoryColour
            // (from a notification) set it on the toast.
            if (optionOverrides.categoryColour)
                $toast.addClass(optionOverrides.categoryColour);
        }

        function clear() {
            toastr.clear();
        }
        toasts.clear = clear;

        function info(message, title, options) {
            if (typeof options === "undefined") { options = {}; }
            options.icon = "icon-info-sign";
            showMessage(toastr.info, message, title, options);
        }
        toasts.info = info;

        function success(message, title, options) {
            if (typeof options === "undefined") { options = {}; }
            options.icon = "icon-ok-sign";
            showMessage(toastr.success, message, title, options);
        }
        toasts.success = success;

        function warning(message, title, options) {
            if (typeof options === "undefined") { options = {}; }
            options.icon = "icon-warning-sign";
            showMessage(toastr.warning, message, title, options);
        }
        toasts.warning = warning;

        function error(message, title, options) {
            if (typeof options === "undefined") { options = {}; }
            options.icon = "icon-exclamation-sign";

            // Errors should hang around a bit longer
            options.timeOut = 120000;

            showMessage(toastr.error, message, title, options);
        }
        toasts.error = error;
    })(ag.toasts || (ag.toasts = {}));
    var toasts = ag.toasts;
})(ag || (ag = {}));
