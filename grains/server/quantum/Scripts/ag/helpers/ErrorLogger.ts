/// <reference path="dom.ts" />
/// <reference path="../../ts/global.d.ts" />
 
module ag
{
   export class ErrorLogger
   {
      constructor(public url: string)
      {
         if (!url)
            console.error("url to error logging action must be defined.");

         // Catch-all error handler
         window.onerror = <any>((message, file, line) =>
         {
            // Set a global to contain the latest error (for smoke test to pick up)
            window._lastError = JSON.stringify({ message: message, file: file, line: line });

            // Log the error
            this.logError(message, file, line);

            // Attempt to display a message to the user to inform them of the problem
            this.displayError(message, file, line);
         });
      }

      logError(message: string, fileName: string, lineNumber: number)
      {
         if (!message)
            return;

         // Can only log error with verification token
         var verificationToken = utils.getRequestVerificationToken();
         if (!verificationToken)
            return;

         // Set required headers
         var headers: any =
         {
            "__RequestVerificationToken": verificationToken,
            "__PageIdToken": utils.getPageIdToken() 
         };
         
         // Send error details to be logged
         $.ajax({
            type: "POST",
            url: this.url,
            headers: headers,
            data: { message: message, fileName: fileName, lineNumber: lineNumber }
         });
      }

      displayError(message: string, fileName: string, lineNumber: number)
      {
         // We only want to display errors if in Debug mode
         if (!window.isDebug)
            return;

         if (messages)
            messages.error(message + "\n(" + strings.clientSideError + ")");
      }
   }
}