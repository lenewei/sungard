/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    (function (dom) {
        "use strict";

        var MethodUtils = (function () {
            function MethodUtils(rateLimits) {
                if (typeof rateLimits === "undefined") { rateLimits = 150; }
                this.rateLimits = rateLimits;
                this.counter = 0;
                this.intervalId = undefined;
            }
            MethodUtils.prototype.debounce = function (fn, caller) {
                var _this = this;
                var args = [];
                for (var _i = 0; _i < (arguments.length - 2); _i++) {
                    args[_i] = arguments[_i + 2];
                }
                this.counter++;

                if (this.intervalId)
                    return;

                this.intervalId = setInterval(function () {
                    if (_this.counter-- >= 0)
                        return;

                    fn.apply(caller, args);
                    _this.reset();
                }, this.rateLimits);
            };

            MethodUtils.prototype.reset = function () {
                clearInterval(this.intervalId);
                this.counter = 0;
                this.intervalId = undefined;
            };

            MethodUtils.instance = function (rateLimits) {
                if (typeof rateLimits === "undefined") { rateLimits = 150; }
                return new MethodUtils(rateLimits);
            };
            return MethodUtils;
        })();
        dom.MethodUtils = MethodUtils;

        function siteName(siteName) {
            if (siteName === undefined)
                return localStorage.getItem("siteName");
            else
                localStorage.setItem("siteName", siteName);
        }
        dom.siteName = siteName;

        function clearTabHeaderErrorIndicators() {
            $(".nav-tabs > li.error").removeClass("error");
        }
        dom.clearTabHeaderErrorIndicators = clearTabHeaderErrorIndicators;

        function hierarchicalNavigateToParent() {
            $(_.last($('#explorerBreadcrumb a:not([href="#"])'))).click();
        }
        dom.hierarchicalNavigateToParent = hierarchicalNavigateToParent;

        function handleGridEvents(gridContainer) {
            // Header click - invoke sorting
            $(".grid", gridContainer).not(".table-pivot").on("click", "th", function (event) {
                var context = ko.contextFor(event.currentTarget), gridViewModel = context.$parent;

                // We don't want to invoke sorting if the column header is a checkbox
                if (ko.unwrap(context.$data.dataType) === "checkbox")
                    return;

                if (gridViewModel && gridViewModel.sorter)
                    gridViewModel.sorter.sortColumn(ko.unwrap(context.$data.key));
            });

            // Row click - invoke editing
            $(".grid", gridContainer).not(".explorer, .table-pivot").on("click", "tbody tr", function (event) {
                var context = ko.contextFor(event.currentTarget), gridViewModel = context.$parent;

                // Only select row (checkbox) if cell was clicked, not an anchor tag
                // (as that will usually invoke a quick menu)
                if (gridViewModel.selected && gridViewModel.selected.isMulti() && event.target.tagName != "A")
                    gridViewModel.selectRow(context.$data);
            });

            $(".grid:not(.browse)", gridContainer).on("click", "a.deal-link", function (event) {
                return ag.utils.openApplicationFromEventTarget(event);
            });

            $(".grid", gridContainer).on("show.bs.dropdown", ".dropdown.context-menu.nav", function (event) {
                var context = ko.contextFor(event.currentTarget), data = context.$data, gridViewModel = context.$parents[2];

                gridViewModel.quickMenuItem(data);
            });

            // Anchor tag click - invoke navigation or edit
            $(".grid.explorer", gridContainer).on("click", "tbody tr", function (event) {
                var anchorTarget = event.currentTarget.tagName.toLowerCase() === "a", allowNavigation = anchorTarget && event.ctrlKey;

                // Allow natural link navigation if ctrl key down
                if (allowNavigation)
                    return true;

                var context = ko.contextFor(event.target);
                if (context.$root.editItem)
                    return context.$root.editItem(context.$data, anchorTarget, event);
            });

            // Breadcrumb anchor tag click - invoke navigation
            $(".explorer-breadcrumb", gridContainer).not(".worksheet").on("click", "a", function (event) {
                var context = ko.contextFor(event.currentTarget), allowNavigation = event.ctrlKey;

                // Allow natural link navigation if ctrl key down
                if (allowNavigation)
                    return true;

                if (context.$root.editItem)
                    return context.$root.editItem(context.$data);
            });

            $(".pivot-container", gridContainer).on("click", ".table-pivot tr th a.filter", function (event) {
                var pivot = ko.dataFor(event.target), $filter = $(event.target).closest("a.filter"), id = $filter.data("id"), pivotData = pivot.pivotData[id], item = $filter.data("item"), filters;

                if (pivotData)
                    filters = pivotData.filters;

                if (filters)
                    pivot.selectedDrillDown()[item + 'Filters'].filter(filters);

                event.preventDefault();
            }).on("click", ".table-pivot tr td a[data-command]", function (event) {
                var pivot = ko.dataFor(event.target), $element = $(event.target), command = $element.data("command"), id = $(event.target).closest('td').find('a[data-id]').data('id'), pivotData = pivot.pivotData[id];

                pivot[command].execute(pivotData.cellData.additionalInfo, event);

                event.preventDefault();
            }).on("click", ".table-pivot tr th a.expand", function (event) {
                var pivot = ko.dataFor(event.target), key = $(event.target).closest('th').find('a[data-key]').data('key');

                pivot.expand(key);
                event.preventDefault();
            });
        }

        function displayModalLoading() {
            $('body').modalmanager('loading');
        }
        dom.displayModalLoading = displayModalLoading;

        function hideModalLoading() {
            $('body').removeClass('modal-open').modalmanager('removeLoading');
        }
        dom.hideModalLoading = hideModalLoading;

        function resetTabs() {
            // Make the first visible tab of each tab control active
            _.each($(".tabs .nav"), function (tabs) {
                var $tabs = $(tabs);
                $tabs.find("li a:visible:first").click();
            });
        }
        dom.resetTabs = resetTabs;

        function isPop(e) {
            return e.button === 1 || e.ctrlKey || e.shiftKey;
        }
        dom.isPop = isPop;

        function encodeLinkHref(event) {
            var $element = $(event.target);
            if (!$element.is("a"))
                return;

            var href = $element.attr('href');
            if (href.isNullOrEmpty())
                return;

            if ($element.data("href-encoded") === true)
                return;

            $element.attr("href", encodeURI(href));
            $element.data("href-encoded", true);
        }
        dom.encodeLinkHref = encodeLinkHref;

        function equalizeRows() {
            var $rows = $(".table-pivot thead tr");

            _.each($rows, function (row) {
                var $row = $(row), $children = $row.children(), max = 0;
                _.each($children, function (child) {
                    var value = $(child).height();
                    if (value > max)
                        max = value;
                });

                _.each($children, function (child) {
                    var $child = $(child), height = $child.height();
                    if (height !== 0 && height !== max)
                        $child.css('height', max + 'px');
                });
            });
        }

        function updatePivotColumns(groupRows) {
            equalizeRows();

            var width = 0, left = 1, $pivot = $(".table-pivot"), containerWidth = $(".pivot-container").width(), $behind = $(".table-pivot thead tr:last th.behind"), behindWidth = 0;

            $behind.each(function () {
                behindWidth += $(this).outerWidth();
            });

            if (behindWidth >= 0.8 * containerWidth)
                $pivot.addClass("wide");
            else
                $pivot.removeClass("wide");

            _.each(groupRows, function (item) {
                var key = item.key.toLowerCase(), $behind = $(".table-pivot tr th." + key + ".behind").last(), $table = $behind.closest('.table-pivot');

                width = $behind.width() + 1;
                left = $behind.position() ? $behind.position().left - $table.position().left : 1;
                $(".table-pivot tr th." + key + ".frozen").width(width).css('left', left);
            });

            $(".table-pivot tr th.isLast.frozen").css('left', 1).width(left + width - 1);
        }
        dom.updatePivotColumns = updatePivotColumns;

        function updateDealAnalysisTitle(title) {
            $("#dealAnalyseDialog").find("h3").text(title);
        }
        dom.updateDealAnalysisTitle = updateDealAnalysisTitle;

        function updateLinkedDealTitle(dealNumber) {
            $("#linkedDealAnalyseDialog").find("h3").text("Linked Deal " + dealNumber);
        }
        dom.updateLinkedDealTitle = updateLinkedDealTitle;

        function init(container, viewModel) {
            var isPageInit = typeof (container) === "undefined";
            var autocompleteElements = $("form, input:text, input:password", container);
            if (!window.isDebug) {
                // Security - ensure all forms and inputs (text and password) have autocomplete turned off
                autocompleteElements.attr("autocomplete", "off");
            } else {
                // Debug - allow autocomplete
                autocompleteElements.removeAttr("autocomplete");
            }

            if (isPageInit) {
                // add transition after loading to avoid jumping around during load
                $(".restrict").addClass("transition");

                // Initialize our messaging components
                ag.messages.init();
                ag.toasts.init();
            }

            // Wire up grid events
            handleGridEvents(container);

            if (isPageInit) {
                $(document).on('mouseover', 'table.table-pivot td', function (event) {
                    var $cols = $(event.currentTarget).closest('table').children('colgroup'), i = $(event.currentTarget).prevAll('td,th').length;

                    $(event.target).parent().addClass('hover');
                    $($cols[i]).addClass('hover');
                });

                $(document).on('mouseout', 'table.table-pivot td', function (event) {
                    var $cols = $(event.currentTarget).closest('table').children('colgroup'), i = $(event.currentTarget).prevAll('td,th').length;

                    $(event.target).parent().removeClass('hover');
                    $($cols[i]).removeClass('hover');
                });

                $(window).resize(function () {
                    var chart = $('[data-bind^="kendoChart"]').data("kendoChart");
                    if (chart) {
                        chart.options.transitions = false;
                        chart.refresh();
                        chart.options.transitions = true;
                    }

                    var pivotTable = $('table.table-pivot')[0];
                    if (pivotTable) {
                        var viewModel = ko.dataFor(pivotTable);
                        if (viewModel && viewModel.updatePivotColumns) {
                            viewModel.updatePivotColumns();
                        }
                    }
                });
            }

            ko.utils.registerEventHandler($("a.statuslink.popup", container), "click", function (event) {
                event.stopImmediatePropagation();
                event.preventDefault();

                new ag.WindowManager({ url: $(event.target).attr("href") });
                return false;
            });

            _.each($(".tabs", container), function (containerItem) {
                // Create a Tab Header <ul> section content
                // Set the first panel as the active/selected panel
                // Add data-title attributes for helpmode
                var tabs = $(containerItem), headers = "";

                _.each(tabs.children(".tab-content:first").children(".panel"), function (item) {
                    var tab = $(item), tabReference = tab.data("bind-active"), otherBindings = tab.data("bind") || "";

                    if (otherBindings)
                        otherBindings += ", ";

                    headers += "<li id=\"{0}TabHeader\"><a data-toggle=\"tab\" href=\"#{0}\" tabindex=\"-1\" data-bind=\"{1}tabActive:'{2}'\">{3}</a></li>".format(tab.attr("id"), otherBindings, tabReference, tab.data("title"));
                });

                tabs.children("ul.nav:first").html(headers);
            });

            // RemoteRecordLookup Behaviour - on a change event, we pass the value of the target element to
            // the specified URL. We expect this URL to return a complete model which we use to update the
            // model bound to a container element.
            $(":input[data-remote-record-lookup]", container).each(function (index, item) {
                $(item).change(function (event) {
                    var target = $(event.target);
                    ag.utils.getJson({ url: target.data("remote-record-lookup") }, { key: target.val() }).then(function (data) {
                        // Get the form or div containing the target element that contains the ViewModel
                        var modelContainer = ag.utils.getModelContainer(target);
                        if (modelContainer.length) {
                            // Copy the returned data over the existing
                            var viewModel = ko.dataFor(modelContainer[0]);
                            ko.mapping.fromJS(data, viewModel.editingItem);
                        }
                    });
                });
            });

            if (isPageInit) {
                ag.ajaxActive = false;
                ag.ajaxStatusCode = 200;
                var processingElementSelector = ".processing:not(.field)";

                $(document).ajaxStop(function () {
                    ag.ajaxActive = false;
                    $(processingElementSelector).hide();
                });
                $(document).ajaxStart(function () {
                    $(processingElementSelector).show();
                    ag.ajaxActive = true;
                });
                $(document).ajaxComplete(function (event, request) {
                    ag.ajaxStatusCode = request.status;
                });

                // Prevent disabled links from being actioned
                $(document).on("click", "a.disabled", function () {
                    return false;
                });
            }

            // Wire up a display toggle trigger element to toggle the display of a target element
            // using a sliding animation or no animation.
            $('[data-toggle*="toggleDisplay"]', container).each(function (index, item) {
                var self = $(item), target = $(self.data("target"));

                if (target.length > 0) {
                    self.on("click", function () {
                        if (self.data("toggle") === "toggleDisplaySlide")
                            target.slideToggle();
                        else
                            target.toggle();
                    });
                }
            });

            // Wire up a class toggle trigger element to toggle a CSS class on a target element
            $("[data-toggle='class']", container).each(function (index, item) {
                var self = $(item), target = self.data("target") && $(self.data("target")), cssClass = self.data("toggle-class");

                if (cssClass && target.length > 0) {
                    self.on("click", function () {
                        // toggle class and also trigger a rerender on container rows for IE
                        target.toggleClass(cssClass).closest(".container-row").toggleClass("rerender");
                    });
                }
            });

            //#region Dropdown menu max height
            // To facilitate scrolling of dropdown menus, we're setting a max-height on them
            // the equivalent of the page height
            $('.nav .dropdown-menu', container).each(function (index, item) {
                var self = $(item);
                self.css("max-height", $(window).height() - self.parent().height() - parseInt(self.css("padding-top")) - parseInt(self.css("padding-bottom")));
            });

            // We might have dropdown menus elsewhere on the page that need to be truncacted so they lie within the viewport
            $('.scrolling.dropdown-menu', container).each(function (index, item) {
                var self = $(item), target = self;

                while (target = target.parent()) {
                    if (target.css("position") != "absolute")
                        break;
                }

                // Reduce height with padding and margin bottom to allow for shadow
                self.css("max-height", $(window).height() - target.offset().top - target.height() - parseInt(self.css("padding-top")) - parseInt(self.css("padding-bottom")) - parseInt(self.css("margin-bottom")));
            });

            //#endregion
            if (isPageInit) {
                //makeModalDraggable
                $(document).on("shown", "div.modal", function (event) {
                    var halfWidth = $(event.target).width() / 2, halfHeight = $(event.target).height() / 2, adjustor = 38;

                    $(event.currentTarget).draggable({
                        handle: ".modal-header",
                        addClasses: false,
                        refreshPositions: true,
                        containment: [halfWidth, halfHeight + adjustor, $(window).width() - halfWidth, $(window).height() - halfHeight + adjustor]
                    });
                });
            }

            //#region Backspace in Select elements
            // Prevents backspace on SELECTs from causing the page to reload, clearing the selected value instead.
            // As described in scr: http://www.codeproject.com/Articles/35545/Prevent-backspace-in-a-dropdown-from-acting-as-the
            $("select", container).on("keypress keydown", function (event) {
                if (event.keyCode === 8) {
                    if (event.target.selectedIndex)
                        event.target.selectedIndex = 0;

                    return false;
                }
                return true;
            });

            //#endregion
            //#region Application Links, typicall from a input label to the associated application
            $(".app-container", container).on("click", "a.app-link", function (event) {
                return ag.utils.openApplicationFromEventTarget(event);
            });

            if (isPageInit) {
                PubSub.subscribe(ag.topics.ApplyBindingDone, function () {
                    _.delay(function () {
                        displayPageContent();
                    }, 50);
                });
            }

            //#endregion
            //#region Wide page toggle
            $("#pageWidthToggle", container).on("click", function (event) {
                // toggle the full width of the current page
                setFullWidth(!isFullWidth());

                // Resize the pivot after the page width transition finishes
                _.delay(function () {
                    $(window).resize();
                }, 600);

                event.preventDefault();
            });

            //#endregion
            $(".app-container", container).on("shown.bs.dropdown", function (event) {
                hideUnusedDividersAndHeaders($(event.target));
            });

            $(document).keydown(function (event) {
                if (event.keyCode != $.ui.keyCode.TAB)
                    return;

                var modal = _.last($('.modal-scrollable'));

                if (!modal)
                    return;

                var shitKeydown = event.shiftKey, tabbableElements = $(modal).find(':tabbable'), last = _.last(tabbableElements), first = _.first(tabbableElements);

                if (!shitKeydown)
                    tabMove(event, last, first);
                else
                    tabMove(event, first, last);
            });

            if (!isPageInit) {
                initHtmlParts(viewModel, container);
            }

            fileUploadInit(container);

            filtersInit();
        }
        dom.init = init;

        function tabMove(event, from, to) {
            if (event.target == from)
                $(to).focus();
        }
        dom.tabMove = tabMove;

        function tryGetLabel(key) {
            return $("label[for='Domain_" + key + "'],label[for='" + key + "']").first().text();
        }
        dom.tryGetLabel = tryGetLabel;

        function filtersInit() {
            var filterPanel = $('div.filterpanel'), filterSelectedGroup = $('div.filterselectedgroup'), emptyKey = "_emptyKeyForRemoval", currentDraggingObject;

            if (filterPanel.length == 0)
                return;

            var getMatches = function (event) {
                var data = ko.dataFor(event.currentTarget), prop = $(event.currentTarget).data("groupProperty"), matches = ag.utils.getObjectFromPath(data, prop);

                return ko.unwrap(matches);
            };

            filterPanel.mousedown(function (event) {
                currentDraggingObject = ko.dataFor(event.target);
            });

            filterPanel.on("sortstart", function (event) {
                filterSelectedGroup.hide();

                ag.utils.walkObject(getMatches(event), function (obj, p) {
                    if (p != "matches")
                        return;

                    // if current dragging == obj, we don't need to unshift the filter data
                    if (obj === currentDraggingObject)
                        return;

                    var matchesArray = ko.unwrap(obj[p]);
                    if (_.size(matchesArray) > 0)
                        return;

                    // insert into the first index
                    obj[p].unshift(ko.mapping.fromJS(new ag.FilterData({ key: emptyKey, dataType: "string", hidden: true, displayName: "" })));
                });
            });

            filterPanel.on("sortstop", function (event) {
                filterSelectedGroup.show();

                ag.utils.walkObject(getMatches(event), function (obj, p) {
                    if (p != "matches")
                        return;

                    var matchesArray = ko.unwrap(obj[p]);

                    if (_.size(matchesArray) == 0)
                        return;

                    // remove the temp element
                    if (_.has(matchesArray[0], "key") && ko.unwrap(matchesArray[0].key) == emptyKey)
                        obj[p].shift();
                });
            });
        }
        dom.filtersInit = filtersInit;

        //#region file upload
        function fileUploadInit(container) {
            var uploaders = $('div[class*="uploader"]', container);
            if (uploaders.length === 0)
                return;

            uploaders.toArray().forEach(function (target) {
                target = $(target);
                var fileInput = target.find('input[type="file"]');
                fileInput.change(function (e) {
                    fileInput.blur();
                    var files = e.target.files, names = "";

                    for (var i = 0, f; f = files[i]; i++)
                        names += f.name + (files[i + 1] ? ', ' : '');

                    target.find('input[class*="fake-file-input"]').val(names);
                });
            });
        }

        //#endregion
        //#region HtmlParts
        function initHtmlParts(viewModel, container) {
            var template = "uihtml";
            dom.htmlParts = [];

            _.each($('div', container).find("[data-{0}]".format(template)), function (element) {
                var property = $(element).data(template), item = ag.getProperty(viewModel, property.bindingPath);

                if (property.executeAtStartUp) {
                    updateHtmlPart(element, property, null, viewModel, item);
                    return true;
                }

                if (!ag.isNullOrUndefined(item)) {
                    item.refresh = function (changedProperty) {
                        return updateHtmlPart(element, property, changedProperty, viewModel, item);
                    };
                    item.clear = function () {
                        return $(element).html(null);
                    };

                    if (property.refreshWhenKeyFieldChange) {
                        item.extend({ rateLimit: 100 });
                        dom.htmlParts.push(item);
                    }

                    PubSub.subscribe(ag.topics.UpdateUIHtml, function () {
                        _.each(dom.htmlParts, function (targetValue) {
                            targetValue(0); // reset back to 0;
                        });
                    });
                }
            });
        }
        dom.initHtmlParts = initHtmlParts;

        dom.htmlParts = [];

        function updateHtmlPart(element, data, changedProperty, viewModel, item) {
            var map = function (x) {
                return x ? x : undefined;
            };

            var setProcessing = function (obj, value) {
                if (obj && obj.isProcessing) {
                    obj.isProcessing(value);
                }
            };

            var action = {
                action: map(data.action),
                area: map(data.area),
                controller: map(data.controller),
                url: map(data.url)
            };

            var params = data.additionalFields ? ag.utils.getAdditionalFieldsFromModel(data.additionalFields, viewModel.getModel()) : data.includeCompleteModel ? ko.mapping.toJS(viewModel.getModel() || {}) : {};

            params.changedProperty = changedProperty;

            setProcessing(item, true);

            // Get the Html
            ag.utils.getJson(action, params, true).done(function (result) {
                if (result.data) {
                    $(element).html(result.data);
                }
            }).always(function () {
                return setProcessing(item, false);
            });

            return true;
        }
        dom.updateHtmlPart = updateHtmlPart;

        //#endregion
        // persist the current page width state
        function setCurrentFullWidth(wide) {
            $.cookie("full-width-current", wide, { path: '/' });
        }

        // toggle the CSS class to reflect the wide page state
        function setFullWidthCss(wide, persist) {
            $("body").toggleClass("full-width", wide);
            if (persist) {
                setCurrentFullWidth(wide);
            }

            // make sure the pivot lines are drawn correctly
            $(window).resize();
        }
        dom.setFullWidthCss = setFullWidthCss;

        // return the name of the key used to store
        // the wide pages in the cookie
        function getWidePageKey() {
            return "full-width-" + ag.area;
        }

        // return an array of hashes of wide pages
        function getWidePages() {
            // get the cookie value that stores the wide page hashes
            var value = $.cookie(getWidePageKey());

            // create array of wide page hashes
            return value ? value.split(",") : [];
        }

        // return the hash of the current page
        function getPageHash() {
            return (ag.area + "/" + ag.controller).getHashCode().toString();
        }

        // is the current page wide?
        function isFullWidth() {
            return getWidePages().indexOf(getPageHash()) > -1;
        }
        dom.isFullWidth = isFullWidth;

        // add or remove the current page from the list of wide pages
        function setFullWidth(wide) {
            // create array of wide page hashes and calculate hash for current page
            var widePages = getWidePages(), hash = getPageHash(), index = widePages.indexOf(hash);

            if (wide) {
                // add the current page if the page needs to be wide
                widePages.push(hash);
            } else if (index != -1) {
                // remove the page when it doesn't need to be wide
                // (except when it's not wide at the moment)
                widePages.splice(index, 1);
            }

            // reflect change by changing the CSS class
            setFullWidthCss(wide, true);

            // store new array in cookie or clear when no pages left
            $.cookie(getWidePageKey(), widePages.length > 0 ? widePages.join(",") : null, { expires: 365, path: '/' });
        }

        // Display the page when the loading and ajax communication all finished
        function displayPageContent() {
            // Remove the loading div and slide the main page panel down
            $(".page-container").removeClass("loading");
            $(".app-panel").show();

            // if the current page is full width, add a class
            setFullWidthCss(isFullWidth(), true);

            inputs.init();
            inputElementWatcher.init();
        }
        dom.displayPageContent = displayPageContent;

        function supportsLocalStorage() {
            // Browsers other than IE are considered to have good localStorage support, IE does not.
            // May require further tests if other browsers found to also be flaky.
            return navigator.userAgent.indexOf("Trident") === -1;
        }
        dom.supportsLocalStorage = supportsLocalStorage;

        function notificationsInit() {
            var notifications = new ag.Notifications();
            ag.utils.applyBindings(notifications, $("#notifications")[0], false);
            ag.utils.applyBindings(notifications, $("#notificationErrorDialog")[0], false);
        }
        dom.notificationsInit = notificationsInit;

        function notificationsVisible() {
            return $("#notifications").hasClass("open");
        }
        dom.notificationsVisible = notificationsVisible;

        function nextTabElement(element, gap) {
            if (typeof gap === "undefined") { gap = 1; }
            var contents = $(":tabbable"), contentsLength = contents.length, index = 0, nextTabPosition;

            for (var i = 0; i < contentsLength; i++) {
                if (element[0] == contents[i]) {
                    index = i;
                    break;
                }
            }
            nextTabPosition = index + gap;
            if (nextTabPosition > 0 && nextTabPosition < contentsLength)
                return $(contents[nextTabPosition]);

            return element;
        }
        dom.nextTabElement = nextTabElement;

        function hideUnusedDividersAndHeaders(dropdown) {
            var dividerSelector = ".divider", headerSelector = ".nav-header", menu = dropdown.children(".dropdown-menu"), hasVisibleSiblingBeforeDivider, hasVisible = function (items) {
                return items.filter(":visible").has(":visible").length > 0;
            };

            // hide headers that are not followed by a visible sibling
            menu.children(headerSelector).each(function (index, element) {
                var header = $(element);
                header.toggle(hasVisible(header.nextUntil(headerSelector + "," + dividerSelector)));
            });

            // hide dividers that are not sandwiched between visible siblings
            menu.children(dividerSelector).each(function (index, element) {
                var divider = $(element), hasVisibleSiblingAfterDivider = hasVisible(divider.nextUntil(dividerSelector));

                if (index === 0) {
                    hasVisibleSiblingBeforeDivider = hasVisible(divider.prevAll());
                }

                divider.toggle(hasVisibleSiblingAfterDivider && hasVisibleSiblingBeforeDivider);

                hasVisibleSiblingBeforeDivider = hasVisibleSiblingBeforeDivider || hasVisibleSiblingAfterDivider;
            });
        }
        dom.hideUnusedDividersAndHeaders = hideUnusedDividersAndHeaders;

        (function (_inputs) {
            _inputs.ResizeFont = "RESIZE_FONT_EVENT";

            function init() {
                var $body = $("body"), inputs = $body.find("input.integer").toArray().concat($body.find("input.decimal").toArray()), visibleInputs = inputs.filter(function (e) {
                    return $(e).is(":visible");
                }), invisibleInputs = inputs.filter(function (e) {
                    return !$(e).is(":visible");
                });

                // Initialise the visible inputs as soon as it shows on the page
                initInputs(visibleInputs);

                // Delay the rendering process for invisible inputs
                _.delay(function () {
                    initInputs(invisibleInputs);
                }, 2000);

                PubSub.subscribe(_inputs.ResizeFont, function (topic, item) {
                    shrinkToFill($(item));
                });
            }
            _inputs.init = init;

            function initInputs(inputs) {
                _.each(inputs, function (input) {
                    var $element = $(input);
                    shrinkToFill($element);
                    ko.utils.registerEventHandler($element, "keyup", function () {
                        shrinkToFill($element);
                    });
                });
            }

            function shrinkToFill($input) {
                var txt = $input.val(), maxWidth = $input.width(), fontSizePx = $input.css("font-size"), fontSize = parseFloat(fontSizePx.substring(0, fontSizePx.length - 2)), font = fontSize + "px", style = "normal-font";

                // reset all font size class
                $input.removeClass(function (index, css) {
                    return (css.match(/\S+\-font/g) || []).join("");
                });

                // no resize required if font is less than 15
                if (txt.toString().length < 15)
                    return;

                var textWidth = measureText(txt, font).width;
                if (textWidth > maxWidth) {
                    fontSize = fontSize * maxWidth / textWidth * .9;
                    if (fontSize >= 7.5 && fontSize <= 11)
                        style = "medium-font";
                    else if (fontSize < 7.5)
                        style = "small-font";
                }

                // apply the new font style
                $input.addClass(style);
            }

            function measureText(txt, font) {
                var id = 'text-width-tester', $tag = $('#' + id);

                if (!$tag.length) {
                    $tag = $('<span id="' + id + '"style="display:none;font:' + font + ';">' + txt + '</span>');
                    $('body').append($tag);
                } else {
                    $tag.css({ font: font }).html(txt);
                }
                return {
                    width: $tag.width(),
                    height: $tag.height()
                };
            }
        })(dom.inputs || (dom.inputs = {}));
        var inputs = dom.inputs;

        (function (inputElementWatcher) {
            var selector = "data-element-watcher";

            function init() {
                var elementsNeedwatch = $("input[" + selector + "]");

                if (elementsNeedwatch.length < 1)
                    return;

                registerEventListeners(elementsNeedwatch);

                PubSub.subscribe(ag.topics.ApplyWatcherValue, function () {
                    _.each(elementsNeedwatch, function (element) {
                        $(element).attr(selector, $(element).val());
                    });
                });
            }
            inputElementWatcher.init = init;

            function registerEventListeners(elements) {
                _.each(elements, function (element) {
                    ko.utils.registerEventHandler(element, "keyup", function (event) {
                        var $element = $(event.target), watcherValue = $element.attr(selector);

                        if ($element.val().toString() != watcherValue.toString()) {
                            PubSub.publish(ag.topics.WatcherValueChanged);
                        } else {
                            PubSub.publish(ag.topics.ApplyWatcherValue);
                        }
                    });
                });
            }
        })(dom.inputElementWatcher || (dom.inputElementWatcher = {}));
        var inputElementWatcher = dom.inputElementWatcher;

        // Module for monitoring the active state of a window/tab focussed or not
        (function (windowActivity) {
            var callbacks = $.Callbacks();

            // Current state of window/tab activity
            windowActivity.isActive = true;

            function monitorActivity() {
                var hidden = "hidden", visible = "visible";

                // Standards
                if (hidden in document)
                    document.addEventListener("visibilitychange", onchange);
                else if ((hidden = "mozHidden") in document)
                    document.addEventListener("mozvisibilitychange", onchange);
                else if ((hidden = "webkitHidden") in document)
                    document.addEventListener("webkitvisibilitychange", onchange);
                else if ((hidden = "msHidden") in document)
                    document.addEventListener("msvisibilitychange", onchange);
                else if ("onfocusin" in document)
                    document.onfocusin = document.onfocusout = onchange;
                else
                    window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

                function onchange(event) {
                    var eventMap = { focus: visible, focusin: visible, pageshow: visible, blur: hidden, focusout: hidden, pagehide: hidden };
                    event = event || window.event;
                    var eventType;

                    if (event.type in eventMap)
                        eventType = eventMap[event.type];
                    else
                        eventType = (document[hidden] ? hidden : visible);

                    windowActivity.isActive = eventType == visible;
                }

                // Set the initial state (but only if browser supports the Page Visibility API)
                if (document[hidden] !== undefined)
                    onchange({ type: document[hidden] ? "blur" : "focus" });
            }

            function updateActivityOnFocusChange() {
                $(window).blur(function (event) {
                    if (windowActivity.isActive) {
                        windowActivity.isActive = false;
                        callbacks.fire(windowActivity.isActive);
                    }
                });

                $(window).focus(function (event) {
                    if (!windowActivity.isActive) {
                        windowActivity.isActive = true;
                        callbacks.fire(windowActivity.isActive);
                    }
                });
            }

            // Subscribe to changes in Activity
            function isActiveChanged(callback) {
                callbacks.add(callback);
            }
            windowActivity.isActiveChanged = isActiveChanged;

            // Start monitoring activity and set default
            monitorActivity();
            updateActivityOnFocusChange();
        })(dom.windowActivity || (dom.windowActivity = {}));
        var windowActivity = dom.windowActivity;

        // Init self with the current document
        $(function () {
            init();
        });
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));

var ag;
(function (ag) {
    (function (dom) {
        (function (automation) {
            function invokeSynchronousLookup(url) {
                $.ajaxSetup({ async: false });

                if (!ag.viewModel)
                    throw Error("No viewModel available.");

                var promise, resultText = "", data = ag.viewModel.editingItem || {};

                promise = ag.viewModel.net.postJson({ url: url }, { data: ko.mapping.toJS(data) }).always(function (result) {
                    if (!$.isArray(result)) {
                        resultText = "200 OK";
                    } else {
                        var response = result[0];
                        resultText = response.status + " " + response.statusText;

                        if (response.status == 500 && response.responseJSON && $.isArray(response.responseJSON.errors)) {
                            resultText += ", " + response.responseJSON.errors.join(", ");
                            resultText = resultText.replaceAll("\r\n", " ");
                        }
                    }
                });

                return resultText;
            }
            automation.invokeSynchronousLookup = invokeSynchronousLookup;
        })(dom.automation || (dom.automation = {}));
        var automation = dom.automation;
    })(ag.dom || (ag.dom = {}));
    var dom = ag.dom;
})(ag || (ag = {}));
