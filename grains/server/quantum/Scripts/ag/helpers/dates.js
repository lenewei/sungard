/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    (function (dates) {
        // TODO: All relative date labels need to be localised
        dates.relativeDateLabels = {
            data: [
                "Today",
                "Tomorrow",
                "Yesterday",
                "End Of Month",
                "End Of Last Month",
                "End Of Year",
                "End Of Week",
                "End Of Last Week",
                "Start Of Month",
                "Start Of Last Month",
                "The Beginning",
                "The End"
            ]
        };

        dates.riskRelativeDateLabels = {
            data: [
                "Today",
                "Yesterday",
                "Tomorrow",
                "Next Business Day",
                "Previous Business Day",
                "Modified Next Business Day",
                "Modified Previous Business Day",
                "Start of Week",
                "End of Week",
                "Start of Month",
                "End of Month",
                "Start of Quarter",
                "End of Quarter",
                "Start of Year",
                "End of Year",
                "Start of Previous Week",
                "End of Previous Week",
                "Start of Previous Month",
                "End of Previous Month",
                "Start of Previous Quarter",
                "End of Previous Quarter",
                "Start of Previous Year",
                "End of Previous Year"
            ]
        };

        dates.riskColumnSetRelativeDateLabels = {
            data: [
                "Query Position Date",
                "Query As At Date",
                "Query Start Date",
                "Query End Date",
                "Today",
                "Yesterday",
                "Tomorrow",
                "Next Business Day",
                "Previous Business Day",
                "Modified Next Business Day",
                "Modified Previous Business Day",
                "Start of Week",
                "End of Week",
                "Start of Month",
                "End of Month",
                "Start of Quarter",
                "End of Quarter",
                "Start of Year",
                "End of Year",
                "End of Previous Week",
                "Start of Previous Month",
                "End of Previous Month",
                "Start of Previous Quarter",
                "End of Previous Quarter",
                "Start of Previous Year",
                "End of Previous Year"
            ]
        };

        var separatorReg = /[.\/\\\s\-]/g, keywordFunctions = [function (d) {
                return d;
            }, tomorrow, yesterday, endOfMonth, endOfLastMonth, endOfYear, endOfWeek, endOfLastWeek, startOfMonth, startOfLastMonth, theBeginningDate, theEndDate];

        function getTimeFormat() {
            return "hh:mm tt";
        }
        dates.getTimeFormat = getTimeFormat;

        function today() {
            return ag.userLocationToday.toEditor();
        }
        dates.today = today;

        function isValidDate(date) {
            if (!date || Object.prototype.toString.call(date) !== "[object Date]")
                return false;

            return !isNaN(date.getTime());
        }
        dates.isValidDate = isValidDate;

        function isDateISO8601Format(value) {
            if (!value || !value.match)
                return undefined;

            var isoRegex = /^([0-9]{4})-(1[0-2]|0[1-9])-(3[0-1]|0[1-9]|[1-2][0-9])/;

            // "(T(2[0-3]|[0-1][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?)?" +
            // "(Z|[+-](?:2[0-3]|[0-1][0-9]):[0-5][0-9])?$";
            return value.match(isoRegex);
        }
        dates.isDateISO8601Format = isDateISO8601Format;

        //// This needs to be split up:
        ////  - parse and validate user Input
        ////  - parse ISO date (this may not be required with momentExtension "fromISO")
        //// May be able to remove entirely as very little use now.
        //export function parseDate(date, format?: string, isRelativeDate: boolean = false): Date
        //{
        //   if (!date || !date.length || date instanceof Date)
        //      return date;
        //   // This is to avoid strings being passed in like "2012"
        //   // which will convert to a valid date of "1 Jan 2012"
        //   if (date.length < 6)
        //      return date;
        //   // Using kendo parse date routine routine in the first instance,
        //   // then use the browsers default routine.
        //   // This should be looked at again when the UI is fully globalized
        //   var parsed;
        //   if (!isDateISO8601Format(date)) // use browser if date is in ISO 8601 format
        //   {
        //      if (!format)
        //         format = dateShortFormat;
        //      var useMomentToParse = true;
        //      if (isRelativeDate)
        //         useMomentToParse = data.toString().match(/[0-9]/gi) != null && data.toString().match(/[a-z]/gi) != null;
        //      if (useMomentToParse)
        //      {
        //         parsed = moment(date, format.toUpperCase());
        //         if (parsed.isValid())
        //            parsed = parsed.toDate();
        //      }
        //   }
        //   else
        //   {
        //      parsed = new Date(date);
        //   }
        //   return dates.isValidDate(parsed) ? parsed : date;
        //}
        function looselyConvertStringToIso(value) {
            if (!value || isDateISO8601Format(value))
                return value;

            // If a date string contains . / - space it will remove it,
            // all non numberic and give us the first 8 chars
            var sanitizedInput = sanitizeInputString(value);

            // If the string contains only non numeric characters we just simply return the original value
            // For example: return "Today";  return "Tomorrow"
            if (sanitizedInput === "")
                return value;

            return moment.utc(sanitizedInput, getLooseDateFormat(sanitizedInput)).toISO();
        }
        dates.looselyConvertStringToIso = looselyConvertStringToIso;

        function getLooseDateFormat(value) {
            // Replace all .-/ from date short format (value will have already had this treatment)
            var format = getCleanShortDateFormat();

            switch (value.length) {
                case 1:
                case 2:
                    // Up to 2 chars assume that the day was entered
                    return "DD";
                case 3:
                case 4:
                    // Up to 4 chars then assume day and month entered
                    if (isYearFirstFormat())
                        return format.substr(4, 4);

                    return format.substr(0, 4);
                case 6:
                    // 6 chars assumes day, month and year
                    return format.substr(0, 6);
            }
            return format;
        }
        dates.getLooseDateFormat = getLooseDateFormat;

        function getCleanShortDateFormat() {
            return ag.dateShortFormat.replace(separatorReg, "").toUpperCase();
        }
        dates.getCleanShortDateFormat = getCleanShortDateFormat;

        function isYearFirstFormat() {
            return ag.dateShortFormat.startsWith("Y");
        }
        dates.isYearFirstFormat = isYearFirstFormat;

        function getDateFormatParts() {
            return ag.dateShortFormat.split(separatorReg);
        }
        dates.getDateFormatParts = getDateFormatParts;

        function sanitizeInputString(value) {
            // Remove everyting that is not a number
            // and format the parts of a date, e.g. 1/2/14 => 01022014
            var result = "";

            // Check for separator
            var matches = value.match(separatorReg);
            if (!matches || matches.length == 0) {
                // No spearator found
                if (value.length == 6) {
                    // Assume short year format has been entered, e.g. 10 instead of 2010
                    var format = getCleanShortDateFormat();
                    return moment.utc(value, format.replace("YYYY", "YY"), true).format(format);
                }

                result = value;
            } else {
                // A seperator has been found, split
                // on it and format the parts
                var parts = value.split(separatorReg), partsLength = parts.length, indexOfYear = getDateFormatParts().indexOf("YYYY");

                parts.forEach(function (item, index) {
                    // Is this part typically the year (matching index) and were enough parts
                    // entered to consider this the year.  For year first formats if 4 or less digits
                    // are entered we consider them to be the day and month.
                    var isYearAndYearEntered = index == indexOfYear && partsLength > 2;
                    result += formatDatePart(item, isYearAndYearEntered);
                });
            }

            // Strip out all the non numeric characters,
            // and only return first 8 characters(digits)
            return result.replace(/\D/g, "").substr(0, 8);
        }
        dates.sanitizeInputString = sanitizeInputString;

        function formatDatePart(datePart, isYear) {
            // If we have an null, empty, or "0" datePart return immediately
            if (ag.isNullUndefinedOrEmpty(datePart) || datePart == "0")
                return "";

            var i = (isYear ? 4 : 2) - datePart.length;

            while (i-- > 0)
                datePart = "0" + datePart;

            // If we are formatting a year prepend the current century e.g. "14" => "2014"
            if (isYear)
                datePart = datePart.replace(/^0{2}/, moment().get("y").toString().substring(0, 2));

            return datePart;
        }
        dates.formatDatePart = formatDatePart;

        function resolveDate(inputValue) {
            if (!inputValue || _.isDate(inputValue))
                return inputValue;

            var newValue = null, date = moment.fromISO(ag.userLocationToday.toISO()).toDate(), keywordIndex = null, keywordLength = null, keywords = ["Today", "Tomorrow", "Yesterday", "EndOfMonth", "EndOfLastMonth", "EndOfYear", "EndOfWeek", "EndOfLastWeek", "StartOfMonth", "StartOfLastMonth", "TheBeginning", "TheEnd"];

            // 1st Match : To match with : + 1D
            var matches = inputValue.match(/^[+-]((\d+)([*dDwWmMyY]?))/);

            if (!matches) {
                // 2nd Match : to match with value : Today + 1D
                var searchTerm = inputValue;

                // Remove whitespace
                searchTerm = searchTerm.replace(/ /g, "").toLowerCase();

                var foundDayExpression = null;
                if (searchTerm.length > 4 && searchTerm.substr(searchTerm.length - 3, 3) != "day")
                    foundDayExpression = searchTerm.match(/([+-]((\d+)([*dDwWmMyY]?)))/);

                $.each(keywords, function (i) {
                    var rKeywords;

                    if (foundDayExpression) {
                        rKeywords = new RegExp('(\\b' + keywords[i].toLowerCase() + '\\b[+-](\\d+)([*dDwWmMyY]?))');
                    } else {
                        rKeywords = new RegExp('(\\b' + keywords[i].toLowerCase() + '\\b)');
                    }
                    if (searchTerm.match(rKeywords)) {
                        matches = searchTerm.match(rKeywords);
                        keywordLength = keywords[i].length;
                        keywordIndex = i;
                        return false;
                    }
                });

                if (matches) {
                    newValue = date;
                    date = keywordFunctions[keywordIndex](date);
                }

                if (!matches) {
                    // This is assuming a 2(or 4) digit/2 digit/2(or 4) digit format, to support:
                    // DD/MM/YYYY YYYY/MM/DD (year first vs last formats)
                    // does not handle year short format (2 digit) e.g. 30/12/14 + 1D
                    // 3rd Match : to match with value : DD/MM/YYYY + 1D
                    keywordLength = ag.dateShortFormat.length; // ie length of DD/MM/YYYY
                    var re = new RegExp('(([0-9]{2,4})[- /.]([0-9]{2})[- /.]([0-9]{2,4})([+-](\\d+)([*dDwWmMyY]?).$))', 'm');
                    matches = re.exec(searchTerm);

                    if (matches) {
                        var dateString = matches[1], matchesDate = dateString.match(/([0-9]{2,4})[- /.]([0-9]{2})[- /.]([0-9]{2,4})/), sanitized = sanitizeInputString(matchesDate[0]);

                        date = moment.utc(sanitized, getLooseDateFormat(sanitized), true).toDate();
                    }
                }
            }

            // Resolve Date
            if (matches) {
                var str = matches[0].substr(matches[0].length - 1, 1), num = Math.abs(matches[0].substr(keywordLength + 1, (matches[0].length - 2 - keywordLength)));

                if (matches[0].substr(keywordLength, 1).match(/-/)) {
                    num = num * -1;
                }

                if (num) {
                    switch (str) {
                        case "d":
                            newValue = date.setDate(date.getDate() + num);
                            break;
                        case "w":
                            newValue = date.setDate(date.getDate() + (7 * num));
                            break;
                        case "m":
                            newValue = date.setMonth(date.getMonth() + num);
                            break;
                        case "y":
                            newValue = date.setMonth(date.getMonth() + (12 * num));
                            break;
                    }
                }
                ;

                if (newValue)
                    newValue = moment(date).toEditor();
            }
            return newValue;
        }
        dates.resolveDate = resolveDate;

        function yesterday(date) {
            return moment(date).add("d", -1).toDateZeroTime();
        }

        function tomorrow(date) {
            return moment(date).add("d", 1).toDateZeroTime();
        }

        function endOfMonth(date) {
            return moment(date).endOf("M").toDateZeroTime();
        }

        function endOfLastMonth(date) {
            return moment(date).add("M", -1).endOf("M").toDateZeroTime();
        }

        function endOfYear(date) {
            return moment(date).endOf("y").toDateZeroTime();
        }

        function endOfWeek(date) {
            return moment(date).weekday(5).toDateZeroTime();
        }

        function endOfLastWeek(date) {
            return moment(date).weekday(-2).toDateZeroTime();
        }

        function startOfMonth(date) {
            return moment(date).startOf("M").toDateZeroTime();
        }

        function startOfLastMonth(date) {
            return moment(date).add("M", -1).startOf("M").toDateZeroTime();
        }

        function theBeginningDate() {
            return ag.constants.MinimumDate;
        }

        function theEndDate() {
            return ag.constants.MaximumDate;
        }
    })(ag.dates || (ag.dates = {}));
    var dates = ag.dates;
})(ag || (ag = {}));
