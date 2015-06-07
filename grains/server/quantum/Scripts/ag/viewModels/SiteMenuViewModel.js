var ag;
(function (ag) {
    (function (utils) {
        function isLocationHome() {
            return window.location.pathname === ag.siteRoot;
        }
        utils.isLocationHome = isLocationHome;
    })(ag.utils || (ag.utils = {}));
    var utils = ag.utils;

    var SiteMenuViewModel = (function () {
        function SiteMenuViewModel(options) {
            this.menuContentPrefix = "menuContent";
            this.startsWithSearchDescription = "starting with";
            this.containsWithSearchDescription = "containing";
            this.numberOfColumns = 3;
            this.maxItemsPerColumn = 10;
            this.siteMenuTarget = $("#logo");
            this.siteMenuDropDownSelector = "#siteMenuDropDown";
            this.net = new utils.Network();
            this.latestDealSearchValue = 0;
            this.latestSearchValue = "";
            this.previousSearchResult = "";
            // Validate required options
            if (!options || !options.menuUrl || (!options.dealSearchUrl && !options.staticDataSearchUrl))
                throw new Error("Both a menuUrl and dealSearchUrl/instrumentUrl must be supplied.");

            this.menuUrl = options.menuUrl;
            this.dealSearchUrl = options.dealSearchUrl;
            this.staticDataSearchUrl = options.staticDataSearchUrl;
            this.maxDisplayItems = this.maxItemsPerColumn * this.numberOfColumns;

            // Set up handlers for events outside of the menu itself
            this.bindGlobalEvents();
        }
        SiteMenuViewModel.prototype.bindGlobalEvents = function () {
            var _this = this;
            // Capture keydown on the body (to then invoke the menu)
            $(document.body).on("keydown", this.bodyKeyDownHandler.bind(this));

            // Capture when the menu target is clicked
            this.siteMenuTarget.on("click", function () {
                _this.createMenuFromTemplate();
                _this.selectCurrentOrFirstArea();
            });
        };

        SiteMenuViewModel.prototype.createMenuFromTemplate = function () {
            var menuTemplate = $("#siteMenuTemplate");

            // Check if menuTemplate has already been replaced with the
            // menu so we only create the menu and initialize once.
            if (menuTemplate.length == 0)
                return;

            menuTemplate.replaceWith(menuTemplate.html());

            this.searchInput = $("#siteMenuSearch");
            this.searchResultsTitle = $("#searchResultsTitle");
            this.menuContentSearchResults = $("#menuContentSearchResults");

            this.init();
        };

        SiteMenuViewModel.prototype.init = function () {
            var _this = this;
            var $siteMenuDropDown = $(this.siteMenuDropDownSelector);

            // Get menu structure into a searchable format
            _.defer(function () {
                return ag.menu = _this.getMenuData();
            });

            // Reset the search value
            this.searchInput.val("");

            // Stop the menu disappearing when the input recieves focus
            $siteMenuDropDown.on("click", "input, label", function (event) {
                event.stopPropagation();
            });

            // Add and remove "selected" class as required to result items
            $siteMenuDropDown.on("focus", ".item a", function (event) {
                $(event.target).addClass(SiteMenuViewModel.selectedClass);
            });
            $siteMenuDropDown.on("blur mouseout", ".item a", function (event) {
                $(event.target).removeClass(SiteMenuViewModel.selectedClass);
            });

            $siteMenuDropDown.on("click", ".area a", function (event) {
                _this.selectArea($(event.target));
                return false;
            });

            $siteMenuDropDown.on("click", ".menuitem-download a", function (event) {
                utils.openApplicationWindow($(event.currentTarget).attr("href"));
                event.preventDefault();
            });

            this.debouncedDealSearch = _.debounce(function () {
                _this.searchDeals(parseInt(_this.searchInput.val()));
            }, 300);

            this.debouncedStaticDataSearch = _.debounce(function () {
                _this.searchStaticData(_this.searchInput.val());
            }, 300);

            this.searchInput.on("keyup", function (event) {
                var currentValue = $(event.target).val(), keyCode = event.keyCode;

                if (keyCode == 38 || keyCode == 40)
                    return false;

                // If ENTER key is pressed and we have some results invoke the first item
                if (keyCode === 13) {
                    var searchResults = $("#menuContentSearchResults .item a.selected");
                    if (searchResults.length) {
                        _.defer(function () {
                            ag.navigate(searchResults.attr("href"));
                        });
                    }

                    return;
                }

                // No search value - reset
                if (currentValue.trim().length === 0) {
                    if (_this.previousSearchResult.length > 0) {
                        _this.previousSearchResult = "";
                        _this.resetSearchResults();
                    }
                    _this.clearSearchState();
                    return;
                }

                _this.previousSearchResult = currentValue.trim();

                // Search Deals
                if ($.isNumeric(parseInt(currentValue))) {
                    _this.debouncedDealSearch(false);
                    return;
                }

                _this.debouncedStaticDataSearch(false);

                // Search menu
                _this.searchMenu(currentValue);
            });

            this.searchInput.on("keydown", function (event) {
                // Keyboard Up and Down arrow navigation of search results
                // (menu item search results only at this stage)
                var keyCode = event.keyCode;
                if (keyCode == 40 || keyCode == 38) {
                    var selected = $("#menuContentSearchResults ." + SiteMenuViewModel.selectedClass).closest("li"), container = selected.closest("ul");

                    $("a", container).removeClass(SiteMenuViewModel.selectedClass);

                    if (keyCode == 40) {
                        if (selected.next("li").length > 0)
                            selected.next("li").children("a").addClass(SiteMenuViewModel.selectedClass);
                        else
                            selected.siblings("li").first().children("a").addClass(SiteMenuViewModel.selectedClass);
                    } else {
                        if (selected.prev("li").length > 0)
                            selected.prev("li").children("a").addClass(SiteMenuViewModel.selectedClass);
                        else
                            selected.siblings("li").last().children("a").addClass(SiteMenuViewModel.selectedClass);
                    }

                    return false;
                }
            });
        };

        SiteMenuViewModel.prototype.getMenuData = function () {
            var menuItems = [];

            // Iterate over each menu area
            $("#siteMenuDropDown div[data-area]").each(function (index, element) {
                var $area = $(element), areaName = $area.data("area");

                // Get all menu links from the area
                $area.find("li.item > a").each(function (linkIndex, linkElement) {
                    var $item = $(linkElement), groupName = $($item.parent().siblings(".nav-header")).text();

                    menuItems.push({
                        url: $item.attr("href"),
                        displayName: $item.text(),
                        group: groupName,
                        areaDisplayName: areaName,
                        moduleName: $item.data("module")
                    });
                });
            });

            return menuItems;
        };

        SiteMenuViewModel.prototype.bodyKeyDownHandler = function (event) {
            this.createMenuFromTemplate();

            var keyCode = event.keyCode;

            // If the CTRL, SHIFT or ALT keys are down return immediately
            if (event.ctrlKey || event.shiftKey || event.altKey)
                return;

            if (this.isOpen()) {
                // If open and ESC is pressed, close
                if (keyCode === 27) {
                    this.searchInput.blur();
                    this.close();
                }

                return;
            }

            // Allow only alphanumeric keyCodes to open the dropdown
            if ((keyCode >= 48 && keyCode <= 57) || (keyCode >= 65 && keyCode <= 90) || (keyCode >= 97 && keyCode <= 105)) {
                // If were are in an input of any type or have a modal currently displayed do nothing
                if ($(event.target).is(":input") || $(document.body).hasClass("modal-open"))
                    return;

                this.searchInput.val("");
                this.open();
            }
        };

        SiteMenuViewModel.prototype.isOpen = function () {
            return this.getDropDown().hasClass(SiteMenuViewModel.dropDownClass);
        };

        SiteMenuViewModel.prototype.open = function () {
            if (!this.isOpen()) {
                this.createMenuFromTemplate();
                this.getDropDown().addClass(SiteMenuViewModel.dropDownClass);
                this.searchInput.focus();
                this.selectCurrentOrFirstArea();
            }
        };

        SiteMenuViewModel.prototype.close = function () {
            if (this.isOpen())
                this.getDropDown().removeClass(SiteMenuViewModel.dropDownClass);
        };

        SiteMenuViewModel.prototype.toggle = function () {
            this.createMenuFromTemplate();
            this.getDropDown().toggleClass(SiteMenuViewModel.dropDownClass);
        };

        SiteMenuViewModel.prototype.getDropDown = function () {
            return $(this.siteMenuDropDownSelector).closest(".dropdown");
        };

        SiteMenuViewModel.prototype.searchMenu = function (searchTerm) {
            var searchText = searchTerm.toLowerCase(), searchFunction = this.startsWithSearchFunction, searchFunctionDescription = this.startsWithSearchDescription;

            if (this.latestSearchValue === searchText)
                return;

            this.latestSearchValue = searchText;

            if (searchText.length > 2) {
                searchFunction = this.containsSearchFunction;
                searchFunctionDescription = this.containsWithSearchDescription;
            }

            var matches = this.searchMenuContent(searchText, searchFunction);

            // If no matches were found and we were using the startsWithSearchFunction,
            // perform a search using the containsSearchFunction
            if (matches.length === 0 && searchFunction === this.startsWithSearchFunction) {
                searchFunction = this.containsSearchFunction;
                searchFunctionDescription = this.containsWithSearchDescription;
                matches = this.searchMenuContent(searchText, searchFunction);
            }

            this.menuItemFound = matches.length > 0;

            var searchResults = this.resetSearchResults();
            this.renderSearchResults(searchResults, matches, searchFunctionDescription, searchText);
        };

        SiteMenuViewModel.prototype.getCategoryColourFromUrl = function (url) {
            var colour = "";

            // find the first menu option with this url
            var menuOption = $(this.siteMenuDropDownSelector).find("a[href='" + url + "']").first();

            if (menuOption.length != 0) {
                var classes = menuOption.closest(".color").attr("class").split(" ");

                for (var i = classes.length - 1; i >= 0; i--) {
                    if (classes[i].substring(0, 6) === 'color-') {
                        colour = classes[i];
                        break;
                    }
                }
            }

            return colour;
        };

        SiteMenuViewModel.prototype.searchDeals = function (dealNumber) {
            var _this = this;
            if ($.isNumeric(dealNumber)) {
                if (this.latestDealSearchValue === dealNumber)
                    return true;

                var searchResults = this.resetSearchResults();
                this.latestDealSearchValue = dealNumber;

                this.net.getJson({ url: this.dealSearchUrl }, { dealNumber: dealNumber }, false, false).always(function (result) {
                    if ($.isArray(result))
                        _this.showDealNumberSearchResult(result);
                    else
                        _this.showDealNumberNotFoundSearchResult(dealNumber);
                });

                return true;
            }

            return false;
        };

        SiteMenuViewModel.prototype.searchStaticData = function (searchTerm) {
            var _this = this;
            if (!searchTerm)
                return false;

            this.net.getJson({ url: this.staticDataSearchUrl }, { searchTerm: searchTerm }, false, false).always(function (result) {
                if ($.isArray(result))
                    _this.showStaticDataSearchResult(result);
            });

            return true;
        };

        SiteMenuViewModel.prototype.selectCurrentOrFirstArea = function () {
            var _this = this;
            _.defer(function () {
                // If menu has been opened focus on the search input
                if (!_this.isOpen())
                    return;

                _this.searchInput.focus();

                // If no area has been selected, select the one we are on or the first
                var selectedArea = $(_this.siteMenuDropDownSelector + " li.area.selected");
                if (!selectedArea.length && !_this.searchInput.val()) {
                    var currentUrl = location.pathname;
                    if (currentUrl.endsWith("/"))
                        currentUrl = currentUrl.slice(0, currentUrl.length - 1);

                    // Attempt to select the current area, and item for the page we are on
                    var selectedItem = _this.findMenuItemByUrl(currentUrl);
                    if (selectedItem && selectedItem.length) {
                        // We have the selected item now find the parent, get the category class ("category-[areaname]")
                        var categoryClass = selectedItem.closest("div[class^='category-']").attr("class").split(" ")[0];
                        var areaToSelect = $(_this.siteMenuDropDownSelector + " li." + categoryClass).first();
                        if (areaToSelect.length) {
                            // Select the area
                            _this.selectArea(areaToSelect.children("a").first());

                            // Add the selected class to the menu item
                            $(selectedItem).addClass("current");

                            return;
                        }
                    }

                    // Fallback - select first area
                    _this.selectArea($(_this.siteMenuDropDownSelector + " li.area a").first());
                }
            });
        };

        SiteMenuViewModel.prototype.findMenuItemByUrl = function (url) {
            var results = [];
            url = url.replaceAll("-", "").toLowerCase();

            // Get all menu items starting with the url
            // (handles the case when menu items may have querystring values)
            $(this.siteMenuDropDownSelector + " li.item a").each(function (index, item) {
                var $item = $(item);
                if ($item.attr("href").toLowerCase().replaceAll("-", "").startsWith(url))
                    results.push($item);
            });

            if (results.length === 1) {
                // Single result
                return results[0];
            } else {
                // More than one result, return best match
                var bestMatchIndex = 0;
                $.each(results, function (index, item) {
                    if (item.attr("href") == url) {
                        bestMatchIndex = index;
                        return false;
                    }
                });

                return results[bestMatchIndex];
            }
        };

        SiteMenuViewModel.prototype.selectArea = function (target) {
            this.searchInput.val("");
            this.clearSearchState();

            // Add and remove selected class
            this.clearSelectedArea();
            target.closest("li").addClass(SiteMenuViewModel.selectedClass);

            // Hide any existing content panels
            this.hideAllContent();

            // Show the panel we are interested in
            $("#" + this.menuContentPrefix + target.data("area")).show();
        };

        SiteMenuViewModel.prototype.clearSearchState = function () {
            this.latestDealSearchValue = 0;
            this.latestSearchValue = "";
        };

        SiteMenuViewModel.prototype.clearSelectedArea = function () {
            $(this.siteMenuDropDownSelector + " li.area").removeClass(SiteMenuViewModel.selectedClass);
        };

        SiteMenuViewModel.prototype.showDealNumberSearchResult = function (deals) {
            // Get the first column of the search results and clear any existing results
            var searchResultsColumn = this.getDealNumberSearchResultColumn().html("");

            // Output the current result
            $.each(deals, function (index, deal) {
                searchResultsColumn.append("<li class=\"item\"><a href=\"{0}\">{1} {2} <span class=\"small muted\" title=\"{3}\">{4} {5}</span></a></li>".format(deal.url, deal.transactionType, deal.dealNumber, ag.strings.ccyDealDate, deal.currency, moment.fromISO(deal.dealDate).toDisplay()));
            });

            this.selectFirstSearchResult(searchResultsColumn);
        };

        SiteMenuViewModel.prototype.showStaticDataSearchResult = function (results) {
            var columnIndex = 1;
            var searchResultsColumn;
            var area = "";
            var _this = this;

            // Output the current result
            $.each(results, function (index, searchResult) {
                if (searchResult.area != area) {
                    searchResultsColumn = _this.getSearchResultColumn(columnIndex).html("<div class=\"nav-header\">{0}</div>".format(searchResult.area));
                    columnIndex++;
                }
                searchResultsColumn.append("<li class=\"item\"><a href=\"{0}\">{1} <span class=\"small muted\">{2}</span></a></li>".format(searchResult.url, searchResult.name, searchResult.caption));
                area = searchResult.area;
            });

            // Hightlight/Select the first search result
            if (!this.menuItemFound)
                this.selectFirstSearchResult(this.getSearchResultColumn(1));
        };

        SiteMenuViewModel.prototype.selectFirstSearchResult = function (column) {
            column.find(".item a").first().addClass(SiteMenuViewModel.selectedClass);
        };

        SiteMenuViewModel.prototype.showDealNumberNotFoundSearchResult = function (dealNumber) {
            // Get the first column of the search results and clear any existing results
            var searchResultsColumn = this.getDealNumberSearchResultColumn().html("");

            // Output the current result
            searchResultsColumn.append(("<li class=\"item\"><a>" + ag.strings.dealNotFound + "</a></li>").format(dealNumber));
        };

        SiteMenuViewModel.prototype.getDealNumberSearchResultColumn = function () {
            // Return the first column of the search results
            return $(this.getSearchResultsColumns(this.menuContentSearchResults)[0]);
        };

        SiteMenuViewModel.prototype.getSearchResultColumn = function (index) {
            // Return the column of the search results
            return $(this.getSearchResultsColumns(this.menuContentSearchResults)[index]);
        };

        SiteMenuViewModel.prototype.createSearchResultScore = function (name, searchTerm, multiplier) {
            // Create a factor based on whether the name starts with the search term
            // (lower factor = lower score = higher search rank)
            var factor = this.startsWithSearchFunction(name, searchTerm) ? 1 : 2;
            return multiplier * factor;
        };

        SiteMenuViewModel.prototype.searchMenuContent = function (searchTerm, searchFunction) {
            var _this = this;
            var matches = [], groupMatches = [], matchAndgroupMatchDifference, i = 0, itemCountLimit = this.maxItemsPerColumn + 1;

            _.each(ag.menu, function (item) {
                // Search on displayName then exact match on moduleName then on group name
                if (searchFunction(item.displayName, searchTerm)) {
                    item.showGroup = true;
                    item.score = _this.createSearchResultScore(item.displayName, searchTerm, 1);
                    matches.push(item);
                    i++;
                } else if (item.moduleName.toLowerCase() === searchTerm) {
                    item.showGroup = true;
                    item.score = _this.createSearchResultScore(item.displayName, searchTerm, 1);
                    matches.push(item);
                    i++;
                } else if (item.group !== null && groupMatches.length < itemCountLimit) {
                    if (searchFunction(item.group, searchTerm)) {
                        item.showGroup = true;
                        item.score = _this.createSearchResultScore(item.group, searchTerm, 2);
                        groupMatches.push(item);
                    }
                }
            });

            // Sort by score combined with displayName, and take our max display items
            matches = _.take(_.sortBy(matches, function (item) {
                return item.score + "" + item.displayName;
            }), this.maxDisplayItems);

            // If we did not find enough matched items we will take some items from groupMatches
            matchAndgroupMatchDifference = this.maxItemsPerColumn - matches.length;
            if (matchAndgroupMatchDifference > 0) {
                groupMatches = _.take(_.sortBy(groupMatches, function (item) {
                    return item.displayName;
                }), matchAndgroupMatchDifference + 1);

                matches = matches.concat(groupMatches);
            }

            return matches;
        };

        SiteMenuViewModel.prototype.renderSearchResults = function (searchResults, matches, searchFunctionDescription, searchTerm) {
            var _this = this;
            var columnIndex = 0, columns = this.getSearchResultsColumns(searchResults), overMax = (matches.length > this.maxItemsPerColumn ? " (" + ag.strings.first.toLowerCase() + " " + this.maxItemsPerColumn + ")" : "");

            // Add menu items column title
            if (this.menuItemFound)
                $(columns[columnIndex]).append("<div class=\"nav-header\">{0}</div>".format(ag.strings.menuItems + overMax));

            $.each(matches, function (index, item) {
                // Check if we have reached our max display items
                if (index === _this.maxItemsPerColumn - 1)
                    return false;

                // Update column index if applicable
                if (index > 0 && index % _this.maxItemsPerColumn === 0)
                    columnIndex++;

                // Add the content
                $(columns[columnIndex]).append(_this.searchResultItem(item));
            });

            // Select the first result to indicate what ENTER will do
            this.selectFirstSearchResult($(columns[0]));

            // Update the search result title
            this.searchResultsTitle.html("{2} {0} <span>\"{1}\"</span>".format(searchFunctionDescription, utils.htmlEncode(searchTerm), ag.strings.searchResults));
        };

        SiteMenuViewModel.prototype.searchResultItem = function (item) {
            var itemMarkup = "<li class=\"item {2}\"><a href=\"{0}\">{1}".format(item.url, item.displayName, this.getCategoryColourFromUrl(item.url)), groupArea = item.group.toLowerCase() !== item.areaDisplayName.toLocaleLowerCase() ? item.areaDisplayName + " &ndash; " + item.group : item.group;

            if (item.showGroup)
                itemMarkup += " <span class=\"muted small\">{0}</span>".format(groupArea);

            itemMarkup += "</a></li>";

            return itemMarkup;
        };

        SiteMenuViewModel.prototype.getSearchResultsColumns = function (searchResults) {
            return searchResults.find(".column ul");
        };

        SiteMenuViewModel.prototype.startsWithSearchFunction = function (text, searchValue) {
            return text.toLowerCase().startsWith(searchValue);
        };

        SiteMenuViewModel.prototype.containsSearchFunction = function (text, searchValue) {
            return text.toLowerCase().indexOf(searchValue) > -1;
        };

        SiteMenuViewModel.prototype.resetSearchResults = function () {
            this.hideAllContent();
            this.clearSelectedArea();

            var searchResultsContent = this.menuContentSearchResults.show().html("<div id=\"searchResultsTitle\" class=\"nav-header\">" + ag.strings.searchResults + "</div>" + "<div class=\"column\"><ul class=\"unstyled\"></ul></div>" + "<div class=\"column\"><ul class=\"unstyled\"></ul></div>" + "<div class=\"column\"><ul class=\"unstyled\"></ul></div>");

            this.searchResultsTitle = $("#searchResultsTitle");

            return searchResultsContent;
        };

        SiteMenuViewModel.prototype.hideAllContent = function () {
            $("div[id^='" + this.menuContentPrefix + "']").hide();
        };
        SiteMenuViewModel.dropDownClass = "open";
        SiteMenuViewModel.selectedClass = "selected";
        return SiteMenuViewModel;
    })();
    ag.SiteMenuViewModel = SiteMenuViewModel;
})(ag || (ag = {}));
