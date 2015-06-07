/// <reference path="../../ts/global.d.ts" />

// For tracking and updating the caret position in an input element
// See https://groups.google.com/d/topic/knockoutjs/PbvEv3DPwbQ/discussion for a conversation about this
// Update: Behavior stated in the conversation no longer appears in Knockout 3.1.0

module ag
{
   "use strict";

   ko.bindingHandlers["caretPosition"] =
   {
      init: (element, valueAccessor) =>
      {
         var target = $(element),
            caretPos = valueAccessor();

         if (!caretPos || !ko.isObservable(caretPos))
            throw new Error("The caretPosition binding has no bound observable");

         // Track any key events in the target element and record the last caret position
         ko.utils.registerEventHandler(target, "keyup", () =>
         {
            caretPos(target.caret().start);
         });
         ko.utils.registerEventHandler(target, "click", () =>
         {
            caretPos(target.caret().start);
         });
      },
      update: (element, valueAccessor) =>
      {
         var target = $(element),
            caretPos = ko.unwrap(valueAccessor());

         if (target.caret().start != caretPos)
            target.caret({ start: caretPos, end: caretPos });
      }
   };
}