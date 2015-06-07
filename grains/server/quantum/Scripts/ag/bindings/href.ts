/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   ko.bindingHandlers["href"] =
   {
      update: (element, valueAccessor) =>
      {
         var bindingOptions = ko.unwrap(valueAccessor()),
            url = ko.unwrap(bindingOptions.url),
            keyName = ko.unwrap(bindingOptions.keyName),
            observe = ko.unwrap(bindingOptions.observe),
            keyValue = $.isArray(observe) ? ko.unwrap(observe[0]) : observe;

         // Validate options
         if (!url)
            throw new Error("\"url\" missing");

         if (!keyName)
            throw new Error("\"keyName\" missing, should be name of parameter to be passed on url");

         // Add key to URL
         if (keyValue)
            url += "?{0}={1}".format(keyName, encodeURIComponent(keyValue));

         $(element).attr("href", url);
      }
   }
}