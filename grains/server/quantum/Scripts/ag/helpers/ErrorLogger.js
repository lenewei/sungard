/// <reference path="dom.ts" />
/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    var ErrorLogger = (function () {
        function ErrorLogger(url) {
            var _this = this;
            this.url = url;
            if (!url)
                console.error("url to error logging action must be defined.");

            // Catch-all error handler
            window.onerror = (function (message, file, line) {
                // Set a global to contain the latest error (for smoke test to pick up)
                window._lastError = JSON.stringify({ message: message, file: file, line: line });

                // Log the error
                _this.logError(message, file, line);

                // Attempt to display a message to the user to inform them of the problem
                _this.displayError(message, file, line);
            });
        }
        ErrorLogger.prototype.logError = function (message, fileName, lineNumber) {
            if (!message)
                return;

            // Can only log error with verification token
            var verificationToken = ag.utils.getRequestVerificationToken();
            if (!verificationToken)
                return;

            // Set required headers
            var headers = {
                "__RequestVerificationToken": verificationToken,
                "__PageIdToken": ag.utils.getPageIdToken()
            };

            // Send error details to be logged
            $.ajax({
                type: "POST",
                url: this.url,
                headers: headers,
                data: { message: message, fileName: fileName, lineNumber: lineNumber }
            });
        };

        ErrorLogger.prototype.displayError = function (message, fileName, lineNumber) {
            // We only want to display errors if in Debug mode
            if (!window.isDebug)
                return;

            if (ag.messages)
                ag.messages.error(message + "\n(" + ag.strings.clientSideError + ")");
        };
        return ErrorLogger;
    })();
    ag.ErrorLogger = ErrorLogger;
})(ag || (ag = {}));
