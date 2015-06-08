interface IWindowParameters
{
   location?: number;
   status?: boolean;
   titlebar?: boolean;
   toolbar?: boolean;
   resizable?: number;
   scrollbars?: boolean;
   height?: number;
   width?: number;
   top?: number;
   left?: number;
}

interface IWindowManagerOptions
{
   url?: string;
   name?: string;
   windowParameters?: IWindowParameters;
}

module ag
{
   export function navigate(url: string, isNavigation: boolean = true)
   {
      // isNavigation indicates that this is truly navigation and not 
      // setting window.location.href to invoke a download or similar.
      ag.isNavigation = isNavigation;
      if (!isNavigation)
      {
         var character = url.lastIndexOf('?') >= 0 ? '&' : '?';
         url += character + "__PageIdToken=" + utils.getPageIdToken();
      }

      window.location.href = url;
   }

   export class WindowManager
   {
      private maxWindowReadyTries = 600;
      private tryTimeoutMilliseconds = 250;

      name = "";
      deferred = $.Deferred();
      handle: Window = null;
      promise: JQueryPromise<any>;
      defaultWindowParameters: IWindowParameters;
      windowParameters: IWindowParameters;

      constructor(options: IWindowManagerOptions)
      {
         this.name = options.name || "_blank";
         this.promise = this.deferred.promise();
         this.initialiseWindowParameters(options);
         this.initialiseHandle();

         if (options.url)
            this.navigate(options.url);
      }

      private initialiseHandle()
      {
         // Open the window
         this.handle = window.open("", this.name, this.windowParametersToString(this.windowParameters));

         // Add loading indicator
         this.handle.window.document.write('<!DOCTYPE html><title></title><img style="float: right" src="{0}//{1}{2}content/img/ajax-loader.gif" />'.format(location.protocol, location.host, ag.siteRoot));

         // Tell the child window it's opener/parent so that the child can call it's opener
         if (!this.handle.opener)
            this.handle.opener = window;

         // Add to the windows collection for later automatic closing
         ag.windows = ag.windows || [];
         ag.windows.push(this.handle);
      }

      public navigate(url: string)
      {
         // Navigate to the URL
         this.handle.location.href = url;
         
         // Subscribe to the document ready of the new window
         $(this.handle).ready(() =>
         {
            window.setTimeout(() => { this.checkWindowReady(); }, this.tryTimeoutMilliseconds);
         });

         // Set focus
         this.handle.focus();
      }

      public close()
      {
         this.handle.close();
      }

      private initialiseWindowParameters(options: IWindowManagerOptions)
      {
         // Fixed defaults
         this.defaultWindowParameters = { location: 1, status: false, titlebar: false, toolbar: false, resizable: 1, scrollbars: true };

         // Dynamic defaults - calculate window position & size         
         var viewportwidth,
            viewportheight;

         if (typeof window.innerWidth !== "undefined")
         {
            viewportwidth = window.innerWidth,
            viewportheight = window.innerHeight;
         }

         var height = Math.max(viewportheight * 0.9, screen.height * 0.7),
            width = Math.min(Math.min(viewportwidth * 0.9, screen.width), 960),
            top = ((screen.height - height) / 2) - 60, /* little more to the top than center */
            left = (screen.width - width) / 2;

         this.defaultWindowParameters.height = height;
         this.defaultWindowParameters.width = width;
         this.defaultWindowParameters.top = top;
         this.defaultWindowParameters.left = left;

         // Extend default options with those supplied (if any supplied)
         this.windowParameters = (options.windowParameters) ? $.extend(this.defaultWindowParameters, options.windowParameters) : this.defaultWindowParameters;
      }

      private windowParametersToString(parameters: IWindowParameters)
      {
         // Convert to "yes" "no" as this is what the DOM wants
         var boolToYesNo = (value: boolean) => (value) ? "yes" : "no"; // Do not localise, this is for DOM

         return "location={0},status={1},titlebar={2},toolbar={3},resizable={4},scrollbars={5},height={6},width={7},top={8},left={9}".format(parameters.location,
            boolToYesNo(parameters.status),
            boolToYesNo(parameters.titlebar),
            boolToYesNo(parameters.toolbar),
            parameters.resizable,
            boolToYesNo(parameters.scrollbars),
            parameters.height,
            parameters.width,
            parameters.top,
            parameters.left);
      }

      private checkWindowReady()
      {
         // Only try for so long before indicating that the window has not loaded
         if (this.maxWindowReadyTries <= 0)
         {
            this.deferred.reject(this.handle);
            return;
         }

         var body = $(this.handle.document).find("body");

         // To reliably know that the document has loaded need to check
         // the body element and ensure content exists (IE doesn't seem to require this though FF and Chrome do)
         if (body.length && body.html().length)
         {
            // Notify that the window has opened via our promise
            this.deferred.resolve(this.handle);
         }
         else
         {
            this.maxWindowReadyTries--;
            window.setTimeout(() => { this.checkWindowReady(); }, this.tryTimeoutMilliseconds);
         }
      }
   }
}