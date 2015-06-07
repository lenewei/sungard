/// <reference path="../../ts/global.d.ts" />
"use strict";
var globalizeNative;
(function (globalizeNative) {
    globalizeNative.nativeParseFloat = parseFloat;
    globalizeNative.nativeParseInt = parseInt;
})(globalizeNative || (globalizeNative = {}));

// Kendo checks for the presence of a module called Globalize and uses
// its functions over its own when found.  The module below adapts the parts
// of the Globalize API that Kendo uses (at least our limited use of Kendo)
// to use our own implementations.
var Globalize;
(function (Globalize) {
    // This value must be false for kendo to consume the library.
    // Kendo will actually change the implementation of the various methods
    // to point at the methods below (rather than exiting early from the same implementation).
    // So, to see the orignal kendo implementation of a method you must set load = true.
    Globalize.load = false;

    // Object for translating kendo formats to moment formats,
    // add to this as more formats are discovered to be in use.  We have noticed that what
    // is documented by kendo is not necessarily what is in use.
    // NOTE: these formats are based off the assumption kendo will always run as en-US
    // Translated formats will need to be as invariant as possible for less common formats as we do
    // not keep what each locale expects for all the different formats, e.g. M/d => D MMM (Jun/21 => 21 Jun)
    // Moment format options can be found here: http://momentjs.com/docs/#/displaying/format/
    var formatTable = null;

    var loadFormatTable = function () {
        return {
            "d": "D MMM YYYY",
            "M/d": "D MMM",
            "yyyy": "YYYY",
            "HH:mm": "HH:mm",
            "MMM 'yy": "MMM 'YY",
            "dddd, MMMM dd, yyyy": "dddd, DD MMMM, YYYY",
            "dddd, MMMM dd, yyyy h:mm:ss tt": "dddd, DD MMMM, YYYY h:mm:ss a",
            "M/d/yyyy h:mm:ss tt": ag.dateShortFormat + " h:mm:ss a",
            "MMMM dd": "DD MMMM",
            "h:mm:ss tt": "h:mm:ss a",
            "MMMM, yyyy": "MMMM YYYY",
            "M/d/yyyy": ag.dateShortFormat,
            "M/d/yyyy h:mm tt": ag.dateShortFormat + " h:mm a",
            "yyyy'-'MM'-'ddTHH':'mm':'ss": "YYYY-MM-DDTHH:mm:ss",
            "h:mm tt": "h:mm a",
            "yyyy'-'MM'-'dd HH':'mm':'ss'Z'": "YYYY-MM-DDTHH:mm:ssZ"
        };
    };

    function format(value, format) {
        // Lazy initialisation of the format table
        // (needed to make sure ag.dateShortFormat is available)
        if (!formatTable)
            formatTable = loadFormatTable();

        if (format) {
            if (_.isDate(value)) {
                // Get the translated format, if not found use the format passed in.
                // (using what is passed in could result in some weird looking formats so the formatTable should be updated accordingly)
                return moment.utc(value).format(formatTable[format] || format.toUpperCase());
            } else if (_.isNumber(value))
                return ag.format.formatNumber(value);
        }

        return value;
    }
    Globalize.format = format;

    // The parsing functions are not currently used as we are not using kendo widgets (date pickers, numeric input etc.)
    // if we do use some widgets in the future these methods may need some attention.
    function parseDate(value) {
        return moment.utc(value).toDate();
    }
    Globalize.parseDate = parseDate;

    function parseFloat(value) {
        return globalizeNative.nativeParseFloat(value);
    }
    Globalize.parseFloat = parseFloat;

    function parseInt(value) {
        return globalizeNative.nativeParseInt(value);
    }
    Globalize.parseInt = parseInt;
})(Globalize || (Globalize = {}));
