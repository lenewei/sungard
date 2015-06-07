/*
 * Patches for IE problems in Knockout 2.1.0beta
 */

ko.utils.registerEventHandler = function (element, eventType, handler)
{
   // [AJG 27/3/2012] Nasty hack: if this is propertychange event we need to explicitly attach
   // the handler with attachEvent because we're running in IE and jQuery (quite reasonably) doesn't
   // handle some non-standard IE events properly (http://bugs.jquery.com/ticket/8485)
   if (eventType == "propertychange" && typeof element.attachEvent != "undefined")
   {
      element.attachEvent("on" + eventType, function (event)
      {
         handler.call(element, event);
      });
      return;
   }

   if (typeof jQuery != "undefined")
   {
      if (isClickOnCheckableElement(element, eventType))
      {
         // For click events on checkboxes, jQuery interferes with the event handling in an awkward way:
         // it toggles the element checked state *after* the click event handlers run, whereas native
         // click events toggle the checked state *before* the event handler. 
         // Fix this by intecepting the handler and applying the correct checkedness before it runs.            	
         var originalHandler = handler;
         handler = function (event, eventData)
         {
            var jQuerySuppliedCheckedState = this.checked;
            if (eventData)
               this.checked = eventData.checkedStateBeforeEvent !== true;
            originalHandler.call(this, event);
            this.checked = jQuerySuppliedCheckedState; // Restore the state jQuery applied
         };
      }
      jQuery(element)['bind'](eventType, handler);
   } else if (typeof element.addEventListener == "function")
      element.addEventListener(eventType, handler, false);
   else if (typeof element.attachEvent != "undefined")
      element.attachEvent("on" + eventType, function (event)
      {
         handler.call(element, event);
      });
   else
      throw new Error("Browser doesn't support addEventListener or attachEvent");

   function isClickOnCheckableElement(element, eventType)
   {
      if ((tagNameLower(element) !== "input") || !element.type) return false;
      if (eventType.toLowerCase() != "click") return false;
      var inputType = element.type;
      return (inputType == "checkbox") || (inputType == "radio");
   };

   function tagNameLower(element)
   {
      // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
      // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
      // we don't need to do the .toLowerCase() as it will always be lower case anyway.
      return element && element.tagName && element.tagName.toLowerCase();
   };
};

// This appears to be redundant and breaks when javascript is bundled & minified.
//ko.exportSymbol('utils.registerEventHandler', ko.utils.registerEventHandler);
