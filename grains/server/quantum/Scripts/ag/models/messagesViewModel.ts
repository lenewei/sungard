/// <reference path="../../ts/global.d.ts" />

module ag
{
   export module messages
   {
      var $successMessage: JQuery,
         $errorMessage: JQuery,
         timeoutHandle: number,
         mouseOutTimeoutExtension = 1000;

      export function init()
      {
         $successMessage = $("#alert_success");
         $errorMessage = $("#alert_error");

         if ($successMessage.length && $errorMessage.length)
         {
            // Don't hide messages while the user has their mouseover them
            $([$successMessage[0], $errorMessage[0]]).on("mouseover mouseout",(event) =>
            {
               if (event.type === "mouseover")
                  stopHideTimer();
               else if (event.type === "mouseout")
                  startHideTimer($(event.currentTarget), mouseOutTimeoutExtension);
            });

            // Don't hide messages if the tab is not active/has focus
            dom.windowActivity.isActiveChanged(isActive =>
            {
               if (!isActive)
               {
                  stopHideTimer();
               }
               else
               {
                  var $target: JQuery;
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

      function getDuration($messageContainer: JQuery)
      {
         return $messageContainer && $messageContainer.data("duration") || "10000";
      }

      function showMessage($messageContainer: JQuery, message: string)
      {
         clear();

         // Make sure we have a message to display
         if (isNullUndefinedOrEmpty(message))
            return;

         var duration = getDuration($messageContainer),
            isHtml = containsValidHtml(message),
            displayFunction = !isHtml ? "text" : "html";

         if (!isHtml)
            message = ag.utils.htmlDecode(message);

         // If the message contains html (links) 
         // show the message for twice as long
         if (isHtml)
            duration = duration * 2;

         $messageContainer.find("span")[displayFunction](message);
         $messageContainer.fadeIn("fast");

         // Only start the hide timer if the window is active
         if (dom.windowActivity.isActive)
            startHideTimer($messageContainer, duration);
      }

      function stopHideTimer()
      {
         window.clearTimeout(timeoutHandle);
      }

      function startHideTimer($messageContainer: JQuery, duration: number)
      {
         timeoutHandle = window.setTimeout(() => 
         {
            stopHideTimer();
            $messageContainer.fadeOut("fast");
         },
            duration);
      }

      function containsValidHtml(message)
      {
         // Check if message has any anchor tags
         if (/<a/gi.test(message))
         {
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

      export function clear()
      {
         if (timeoutHandle)
            window.clearTimeout(timeoutHandle);

         if ($successMessage && $successMessage.length)
            $successMessage.hide();

         if ($errorMessage && $errorMessage.length)
            $errorMessage.hide();
      }

      export function clearSuccess()
      {
         // If there are any success messages clear them
         $successMessage.hide();
      }

      export function clearError()
      {
         // If there are any error messages clear them
         $errorMessage.hide();
      }

      export function success(message: string)
      {
         showMessage($successMessage, message);
      }

      export function error(message: string)
      {
         showMessage($errorMessage, message);
      }

      export function show(message: string, type: number)
      {
         // Extend for different types as needed
         if (type === 1)
         {
            error(message);
            return;
         }
         
         // Default to success
         success(message);
      }
   }

   export module toasts
   {
      var options =
         {
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

      export function init()
      {
         // Set options on the toastr
         toastr.options = options;
      }

      function showMessage(messageFunc: Function, message: string, title = "", optionOverrides: any = {})
      {
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

      export function clear()
      {
         toastr.clear();
      }

      export function info(message: string, title?: string, options: any = {})
      {
         options.icon = "icon-info-sign";
         showMessage(toastr.info, message, title, options);
      }

      export function success(message: string, title?: string, options: any = {})
      {
         options.icon = "icon-ok-sign";
         showMessage(toastr.success, message, title, options);
      }

      export function warning(message: string, title?: string, options: any = {})
      {
         options.icon = "icon-warning-sign";
         showMessage(toastr.warning, message, title, options);
      }

      export function error(message: string, title?: string, options: any = {})
      {
         options.icon = "icon-exclamation-sign";

         // Errors should hang around a bit longer
         options.timeOut = 120000;

         showMessage(toastr.error, message, title, options);
      }
   }
}