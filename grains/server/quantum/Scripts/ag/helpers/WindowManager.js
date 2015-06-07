var ag;
(function (ag) {
    function navigate(url, isNavigation) {
        if (typeof isNavigation === "undefined") { isNavigation = true; }
        // isNavigation indicates that this is truly navigation and not
        // setting window.location.href to invoke a download or similar.
        ag.isNavigation = isNavigation;
        if (!isNavigation) {
            var character = url.lastIndexOf('?') >= 0 ? '&' : '?';
            url += character + "__PageIdToken=" + ag.utils.getPageIdToken();
        }

        window.location.href = url;
    }
    ag.navigate = navigate;

    var WindowManager = (function () {
        function WindowManager(options) {
            this.maxWindowReadyTries = 600;
            this.tryTimeoutMilliseconds = 250;
            this.url = "";
            this.name = "";
            this.deferred = $.Deferred();
            this.handle = null;
            this.url = options.url;
            this.name = options.name || "_blank";
            this.promise = this.deferred.promise();
            this.initialiseWindowParameters(options);

            if (!options.navigate)
                this.open();
            else
                navigate(this.url);
        }
        WindowManager.prototype.open = function () {
            var _this = this;
            // Open the window
            this.handle = window.open(this.url, this.name, this.windowParametersToString(this.windowParameters));
            if (!this.handle.opener) {
                this.handle.opener = window;
            }

            // Set focus
            this.handle.focus();

            // Subscribe to the document ready of the new window
            $(this.handle).ready(function () {
                window.setTimeout(function () {
                    _this.checkWindowReady();
                }, _this.tryTimeoutMilliseconds);
            });

            // Add to the windows collection for later automatic closing
            ag.windows = ag.windows || [];
            ag.windows.push(this.handle);
        };

        WindowManager.prototype.initialiseWindowParameters = function (options) {
            // Fixed defaults
            this.defaultWindowParameters = { location: 1, status: false, titlebar: false, toolbar: false, resizable: 1, scrollbars: true };

            // Dynamic defaults - calculate window position & size
            var viewportwidth, viewportheight;

            if (typeof window.innerWidth !== "undefined") {
                viewportwidth = window.innerWidth, viewportheight = window.innerHeight;
            }

            var height = Math.max(viewportheight * 0.9, screen.height * 0.7), width = Math.min(Math.min(viewportwidth * 0.9, screen.width), 960), top = ((screen.height - height) / 2) - 60, left = (screen.width - width) / 2;

            this.defaultWindowParameters.height = height;
            this.defaultWindowParameters.width = width;
            this.defaultWindowParameters.top = top;
            this.defaultWindowParameters.left = left;

            // Extend default options with those supplied (if any supplied)
            this.windowParameters = (options.windowParameters) ? $.extend(this.defaultWindowParameters, options.windowParameters) : this.defaultWindowParameters;
        };

        WindowManager.prototype.windowParametersToString = function (parameters) {
            // Convert to "yes" "no" as this is what the DOM wants
            var boolToYesNo = function (value) {
                return (value) ? "yes" : "no";
            };

            return "location={0},status={1},titlebar={2},toolbar={3},resizable={4},scrollbars={5},height={6},width={7},top={8},left={9}".format(parameters.location, boolToYesNo(parameters.status), boolToYesNo(parameters.titlebar), boolToYesNo(parameters.toolbar), parameters.resizable, boolToYesNo(parameters.scrollbars), parameters.height, parameters.width, parameters.top, parameters.left);
        };

        WindowManager.prototype.checkWindowReady = function () {
            var _this = this;
            // Only try for so long before indicating that the window has not loaded
            if (this.maxWindowReadyTries <= 0) {
                this.deferred.reject(this.handle);
                return;
            }

            var body = $(this.handle.document).find("body");

            // To reliably know that the document has loaded need to check
            // the body element and ensure content exists (IE doesn't seem to require this though FF and Chrome do)
            if (body.length && body.html().length) {
                // Notify that the window has opened via our promise
                this.deferred.resolve(this.handle);
            } else {
                this.maxWindowReadyTries--;
                window.setTimeout(function () {
                    _this.checkWindowReady();
                }, this.tryTimeoutMilliseconds);
            }
        };
        return WindowManager;
    })();
    ag.WindowManager = WindowManager;
})(ag || (ag = {}));
