/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    (function (help) {
        // Member variables for help
        var initialised = false, active = false, currentUrl = "", urlTemplate = "help/content?area={0}&page={1}&field={2}", debouncedHelpRequest = _.debounce(updateHelpPanelContentForElement, 600);

        function updateHelpPanelContentForElement(element) {
            getHelpContentRequest(getFieldHelpUrl(element));
        }

        function getHelpPanel() {
            return $("#helpPanelContent");
        }

        function getId(target) {
            // Find the help target with an id (may be a parent of the element we clicked on)
            // if the input is in a multiselect, get the id from the collection UL
            return target.hasClass("search-field-input") ? target.next(".collection").attr("id") : target.closest("[id]").attr("id");
        }

        function sanitizeId(id) {
            // Strip the # at the front, make lower case, and remove any "domain_" prefix
            return id ? id.replace(/^\#/, "").toLowerCase().replace("domain_", "") : "";
        }

        function getFieldHelpUrl(target) {
            var ancestors = target.parents(".panel[id]"), id = sanitizeId(getId(target));

            // [AG 6/9/2012] In some cases, the URL is made up of controller/action instead of area/controller
            var url = ag.siteRoot + urlTemplate.format(ag.area || ag.controller, ag.area ? ag.controller : ag.action, id);
            if (ancestors.length > 0) {
                url += "&ancestors=";
                for (var i = 0; i < ancestors.length; i++)
                    url += ancestors[i].id + " ";
            }

            return url;
        }

        function getHelpControllerUrl(href) {
            href = href.replace(/\.htm$/, "");

            var hrefArray = href.split("_"), area = hrefArray[0], page = hrefArray[1];

            hrefArray.shift();
            hrefArray.shift();
            var field = hrefArray.join("_");

            return ag.siteRoot + urlTemplate.format(area, page, field);
        }

        function getHelpContentRequest(helpUrl) {
            if (currentUrl === helpUrl)
                return;

            $.ajax({
                url: helpUrl,
                cache: true,
                success: function (result) {
                    getHelpPanel().html(result);
                    currentUrl = helpUrl;
                }
            });
        }

        function toggleHelp(url) {
            // Initialise if we haven't already (setup event handlers for :input etc.)
            if (!initialised)
                initHelp();

            // Find the sidebar group containing the help content panel and toggle it.
            var helpPanel = getHelpPanel();
            helpPanel.toggleClass("show");

            // Set the active flag
            active = helpPanel.hasClass("show");

            if (active) {
                // force the page to be wide, but don't persist
                ag.dom.setFullWidthCss(true, false);
                getHelpContentRequest(url);
            } else {
                // set the page width back to its persisted size
                ag.dom.setFullWidthCss(ag.dom.isFullWidth(), false);
            }
        }

        //#region Initialisation
        function init() {
            // Setup handlers for showing and hiding help
            initHelpActivationHandlers();

            // If helpmode is enabled initialise it
            if (ag.utils.getQueryStringParameterByName("helpmode"))
                initHelpContentCreationMode();
        }

        function initHelpActivationHandlers() {
            // Show and hide the help panel via clicking the help icon
            $("a[data-toggle=showHelpPanel]").click(function (event) {
                toggleHelp(getFieldHelpUrl($(event.target)));

                event.preventDefault();
            });

            // Keyboard activation of help
            $(document).keydown(function (event) {
                if (event.shiftKey && event.keyCode == 112) {
                    toggleHelp(getFieldHelpUrl($(event.target)));

                    event.preventDefault();
                }
            });
        }

        // Setup handlers on elements to track focus and click events
        // so help content can be updated accordingly
        function initHelp() {
            $(":input, .header>h1").on("focus click", function (event) {
                if (active)
                    debouncedHelpRequest($(event.currentTarget));
            });

            // When tabs are clicked update help panel
            $("a[data-toggle=tab]").click(function (event) {
                if (active) {
                    var tabContentId = $(event.target).attr("href");
                    debouncedHelpRequest($(tabContentId));
                }
            });

            // Event handlers now in place
            initialised = true;
        }

        // HelpMode displays a popover when mousing over various elements
        // which displays the Id of the element so it may be copied for
        // test scripts and help content creation
        function initHelpContentCreationMode() {
            $(":input, .heading, a:not(.app-link)").mouseover(function (event) {
                var target = $(event.target);

                event.stopImmediatePropagation();

                // [AG 6/9/2012] In some cases, the URL is made up of controller/action instead of area/controller
                var pathName = ag.area ? ag.area + "_" + ag.controller + "_" : ag.controller + "_" + ag.action + "_";

                // Get the href attribute if it has one (for links)
                var id = target.attr("href");

                // Get the closest id if it doesn't have an href
                if (id === undefined)
                    id = getId(target);

                id = sanitizeId(id);

                if (!target.data("popover")) {
                    target.popover({
                        title: "Id",
                        placement: "top",
                        content: "<input id=\"" + id + "-help-id\" type=\"text\" value=\"" + pathName + id + "\">"
                    });
                }

                if (id.length > 0) {
                    target.popover("show");

                    var helpIdInput = $("#" + id + "-help-id");
                    if (helpIdInput.length > 0)
                        helpIdInput.focus();
                }
            });
        }

        //#endregion
        // Initialise help for page - bare minimum.
        // Most help functionality is initialised when
        // the help content panel is displayed (user invokes help)
        init();
    })(ag.help || (ag.help = {}));
    var help = ag.help;
})(ag || (ag = {}));

var ag;
(function (ag) {
    (function (tours) {
        function setupTour(data) {
            var tour = new Tour();
            $.each(data.Steps, function (index, step) {
                tour.addStep({
                    path: (step.Url == "" ? "" : ag.siteRoot + step.Url).replace("\/\/", "/"),
                    element: step.ElementSelector,
                    content: step.Text,
                    title: step.Title,
                    onShow: step.OnShow,
                    onHide: step.OnHide,
                    placement: step.Placement || "right"
                });
            });

            return tour;
        }

        function getTour(name, restart) {
            var url = ag.siteRoot + "help/tour/gettour";
            ag.utils.getJson({ url: url }, { name: name }).then(function (result) {
                if (result && result.Data) {
                    // Set up a one-time event that will be triggered when all ajax requests have completed
                    // (otherwise if the tour needs to navigate away now, we're still in the ajax success phase
                    // and the ajax request has not been marked as completed).
                    $(document).one("tour.start", function () {
                        $.cookie("tour_name", name, { path: "/" });
                        var tour = setupTour(result.Data);
                        restart ? tour.restart() : tour.start();
                    });
                }
            });
        }

        // Clicking the Tour button restarts a tour - track the current tour name in a cookie
        $("a.tour").on("click", function (event) {
            var tourName = $(event.target).data("tour") || "overview";
            getTour(tourName, true);

            event.stopPropagation();
            event.preventDefault();
        });

        // Get the current tour and start it (necessary if we're reloading a page and were in the middle of a tour).
        // Note: we need to make sure that this happens after all Knockout bindings have been processed as the tour
        // may depend on the presence of some KO-related markup or functionality.
        PubSub.subscribe(ag.topics.ApplyBindingDone, function () {
            var tourName = $.cookie("tour_name");
            if (tourName)
                getTour(tourName, false);
        });

        $(document).ajaxStop(function () {
            // All ajax requests have stopped so trigger any load tour events
            $(document).trigger("tour.start");
        });
    })(ag.tours || (ag.tours = {}));
    var tours = ag.tours;
})(ag || (ag = {}));
