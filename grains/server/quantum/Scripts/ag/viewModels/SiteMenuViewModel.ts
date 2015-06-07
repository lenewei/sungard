interface IMenuItem
{
   displayName: string;
   url: string;
   group: string;
   areaDisplayName: string;
   moduleName?: string;
   showGroup?: boolean;
   score?: number;
}

interface IPerspective
{
   displayName: string;
   isDefault: boolean;
}

interface IDeal
{
   dealNumber: number;
   transactionType: string;
   url: string;
   currency: string;
   dealDate: string;
}

interface ISearchResult
{
   name: number;
   transactionType: string;
   area: string;
   url: string;
   caption: string;
}

module ag 
{
   export module utils
   {
      export function isLocationHome()
      {
         return window.location.pathname === ag.siteRoot;
      }
   }

   export class SiteMenuViewModel
   {
      private menuUrl: string;
      private dealSearchUrl: string;
      private staticDataSearchUrl: string;
      static dropDownClass = "open";
      static selectedClass = "selected";
      menuContentPrefix = "menuContent";
      startsWithSearchDescription = "starting with";
      containsWithSearchDescription = "containing";
      numberOfColumns = 3;
      maxItemsPerColumn = 10;
      maxDisplayItems: number;
      searchInput: JQuery;
      siteMenuTarget = $("#logo");
      siteMenuDropDownSelector = "#siteMenuDropDown";
      searchResultsTitle: JQuery;
      menuContentSearchResults: JQuery;
      net = new utils.Network();
      debouncedDealSearch: Function;
      debouncedStaticDataSearch: Function;
      latestDealSearchValue = 0;
      latestSearchValue = "";
      menuItemFound: boolean;
      perspective: IPerspective;
      previousSearchResult = "";

      constructor(options)
      {
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

      private bindGlobalEvents()
      {
         // Capture keydown on the body (to then invoke the menu)
         $(document.body).on("keydown", this.bodyKeyDownHandler.bind(this));

         // Capture when the menu target is clicked
         this.siteMenuTarget.on("click", () =>
         {
            this.createMenuFromTemplate();
            this.selectCurrentOrFirstArea();
         });
      }

      private createMenuFromTemplate()
      {
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
      }

      private init()
      {
         var $siteMenuDropDown = $(this.siteMenuDropDownSelector);

         // Get menu structure into a searchable format
         _.defer(() => ag.menu = this.getMenuData());

         // Reset the search value
         this.searchInput.val("");

         // Stop the menu disappearing when the input recieves focus
         $siteMenuDropDown.on("click", "input, label", (event) =>
         {
            event.stopPropagation();
         });

         // Add and remove "selected" class as required to result items
         $siteMenuDropDown.on("focus", ".item a", (event) =>
         {
            $(event.target).addClass(SiteMenuViewModel.selectedClass);
         });
         $siteMenuDropDown.on("blur mouseout", ".item a", (event) =>
         {
            $(event.target).removeClass(SiteMenuViewModel.selectedClass);
         });

         $siteMenuDropDown.on("click", ".area a", (event) =>
         {
            this.selectArea($(event.target));
            return false;
         });

         $siteMenuDropDown.on("click", ".menuitem-download a", (event) =>
         {
            utils.openApplicationWindow($(event.currentTarget).attr("href"));
            event.preventDefault();
         });

         this.debouncedDealSearch = _.debounce(() =>
         {
            this.searchDeals(parseInt(this.searchInput.val()));
         }, 300);

         this.debouncedStaticDataSearch = _.debounce(() =>
         {
            this.searchStaticData(this.searchInput.val());
         }, 300);

         this.searchInput.on("keyup", (event) =>
         {
            var currentValue = $(event.target).val(),
               keyCode = event.keyCode;

            if (keyCode == 38 || keyCode == 40)
               return false;

            // If ENTER key is pressed and we have some results invoke the first item
            if (keyCode === 13)
            {
               var searchResults = $("#menuContentSearchResults .item a.selected");
               if (searchResults.length)
               {
                  _.defer(() =>
                  {
                     navigate(searchResults.attr("href"));
                  });
               }

               return;
            }

            // No search value - reset
            if (currentValue.trim().length === 0)
            {	
					if (this.previousSearchResult.length > 0)
					{
						this.previousSearchResult = "";
						this.resetSearchResults();
					}
               this.clearSearchState();
               return;
            }

				this.previousSearchResult = currentValue.trim();

            // Search Deals
            if ($.isNumeric(parseInt(currentValue)))
            {
               this.debouncedDealSearch(false);
               return;
            }

            this.debouncedStaticDataSearch(false);

            // Search menu  
            this.searchMenu(currentValue);
         });

         this.searchInput.on("keydown", (event) =>
         {
            // Keyboard Up and Down arrow navigation of search results
            // (menu item search results only at this stage)
            var keyCode = event.keyCode;
            if (keyCode == 40 || keyCode == 38)
            {
               var selected = $("#menuContentSearchResults ." + SiteMenuViewModel.selectedClass).closest("li"),
                  container = selected.closest("ul");

               $("a", container).removeClass(SiteMenuViewModel.selectedClass);

               if (keyCode == 40)
               {
                  if (selected.next("li").length > 0)
                     selected.next("li").children("a").addClass(SiteMenuViewModel.selectedClass);
                  else
                     selected.siblings("li").first().children("a").addClass(SiteMenuViewModel.selectedClass);
               }
               else
               {
                  if (selected.prev("li").length > 0)
                     selected.prev("li").children("a").addClass(SiteMenuViewModel.selectedClass);
                  else
                     selected.siblings("li").last().children("a").addClass(SiteMenuViewModel.selectedClass);
               }

               return false;
            }
         });
      }

      private getMenuData(): IMenuItem[]
      {
         var menuItems: IMenuItem[] = [];

         // Iterate over each menu area
         $("#siteMenuDropDown div[data-area]").each((index, element) =>
         {
            var $area = $(element),
               areaName = $area.data("area");

            // Get all menu links from the area
            $area.find("li.item > a").each((linkIndex, linkElement) =>
            {
               var $item = $(linkElement),
                  groupName = $($item.parent().siblings(".nav-header")).text();

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
      }

      private bodyKeyDownHandler(event)
      {
         this.createMenuFromTemplate();

         var keyCode = event.keyCode;

         // If the CTRL, SHIFT or ALT keys are down return immediately
         if (event.ctrlKey || event.shiftKey || event.altKey)
            return;

         if (this.isOpen())
         {
            // If open and ESC is pressed, close 
            if (keyCode === 27)
            {
               this.searchInput.blur();
               this.close();
            }

            return;
         }

         // Allow only alphanumeric keyCodes to open the dropdown
         if ((keyCode >= 48 && keyCode <= 57) || (keyCode >= 65 && keyCode <= 90) || (keyCode >= 97 && keyCode <= 105))
         {
            // If were are in an input of any type or have a modal currently displayed do nothing
            if ($(event.target).is(":input") || $(document.body).hasClass("modal-open"))
               return;

            this.searchInput.val("");
            this.open();
         }
      }

      isOpen()
      {
         return this.getDropDown().hasClass(SiteMenuViewModel.dropDownClass);
      }

      open()
      {
         if (!this.isOpen())
         {
            this.createMenuFromTemplate();
            this.getDropDown().addClass(SiteMenuViewModel.dropDownClass);
            this.searchInput.focus();
            this.selectCurrentOrFirstArea();
         }
      }

      close()
      {
         if (this.isOpen())
            this.getDropDown().removeClass(SiteMenuViewModel.dropDownClass);
      }

      toggle()
      {
         this.createMenuFromTemplate();
         this.getDropDown().toggleClass(SiteMenuViewModel.dropDownClass);
      }

      private getDropDown(): JQuery
      {
         return $(this.siteMenuDropDownSelector).closest(".dropdown");
      }

      private searchMenu(searchTerm: string): void
      {
         var searchText = searchTerm.toLowerCase(),
            searchFunction = this.startsWithSearchFunction,
            searchFunctionDescription = this.startsWithSearchDescription;

         if (this.latestSearchValue === searchText)
            return;

         this.latestSearchValue = searchText;

         if (searchText.length > 2)
         {
            searchFunction = this.containsSearchFunction;
            searchFunctionDescription = this.containsWithSearchDescription;
         }

         var matches = this.searchMenuContent(searchText, searchFunction);

         // If no matches were found and we were using the startsWithSearchFunction, 
         // perform a search using the containsSearchFunction
         if (matches.length === 0 && searchFunction === this.startsWithSearchFunction)
         {
            searchFunction = this.containsSearchFunction;
            searchFunctionDescription = this.containsWithSearchDescription;
            matches = this.searchMenuContent(searchText, searchFunction);
         }

         this.menuItemFound = matches.length > 0;

         var searchResults = this.resetSearchResults();
         this.renderSearchResults(searchResults, matches, searchFunctionDescription, searchText);
      }

      private getCategoryColourFromUrl(url: string)
      {
         var colour = "";

         // find the first menu option with this url
         var menuOption = $(this.siteMenuDropDownSelector).find("a[href='" + url + "']").first();

         if (menuOption.length != 0)
         {
            var classes = menuOption.closest(".color").attr("class").split(" ");

            // locate the color-* class on the area for the current category
            for (var i = classes.length-1; i >= 0; i--)
            {
               if (classes[i].substring(0, 6) === 'color-')
               {
                  colour = classes[i];
                  break;
               }
            }
         }

         return colour;
      }

      private searchDeals(dealNumber: number): boolean
      {
         if ($.isNumeric(dealNumber))
         {
            if (this.latestDealSearchValue === dealNumber)
               return true;

            var searchResults = this.resetSearchResults();
            this.latestDealSearchValue = dealNumber;

            this.net.getJson({ url: this.dealSearchUrl }, { dealNumber: dealNumber }, false, false).always((result) =>
            {
               if ($.isArray(result))
                  this.showDealNumberSearchResult(result);
               else
                  this.showDealNumberNotFoundSearchResult(dealNumber);
            });

            return true;
         }

         return false;
      }

      private searchStaticData(searchTerm: string): boolean
      {
         if (!searchTerm)
            return false;

         this.net.getJson({ url: this.staticDataSearchUrl }, { searchTerm: searchTerm }, false, false).always((result) =>
         {
            if ($.isArray(result))
               this.showStaticDataSearchResult(result);
         });

         return true;
      }

      private selectCurrentOrFirstArea()
      {
         _.defer(() =>
         {
            // If menu has been opened focus on the search input
            if (!this.isOpen())
               return;
            
            this.searchInput.focus();

            // If no area has been selected, select the one we are on or the first
            var selectedArea = $(this.siteMenuDropDownSelector + " li.area.selected");
            if (!selectedArea.length && !this.searchInput.val())
            {
               var currentUrl = location.pathname;
               if (currentUrl.endsWith("/"))
                  currentUrl = currentUrl.slice(0, currentUrl.length - 1);

               // Attempt to select the current area, and item for the page we are on
               var selectedItem = this.findMenuItemByUrl(currentUrl);
               if (selectedItem && selectedItem.length)
               {
                  // We have the selected item now find the parent, get the category class ("category-[areaname]") 
                  var categoryClass = selectedItem.closest("div[class^='category-']").attr("class").split(" ")[0];
                  var areaToSelect = $(this.siteMenuDropDownSelector + " li." + categoryClass).first();
                  if (areaToSelect.length)
                  {
                     // Select the area
                     this.selectArea(areaToSelect.children("a").first());

                     // Add the selected class to the menu item
                     $(selectedItem).addClass("current");

                     return;
                  }
               }

               // Fallback - select first area
               this.selectArea($(this.siteMenuDropDownSelector + " li.area a").first());
            }            
         });
      }

      private findMenuItemByUrl(url: string)
      {
         var results = [];
         url = url.replaceAll("-", "").toLowerCase();

         // Get all menu items starting with the url 
         // (handles the case when menu items may have querystring values)
         $(this.siteMenuDropDownSelector + " li.item a").each((index, item) =>
         {
            var $item = $(item);
            if ($item.attr("href").toLowerCase().replaceAll("-", "").startsWith(url))            
               results.push($item);
         });

         if (results.length === 1)
         {
            // Single result
            return results[0];
         }
         else
         {
            // More than one result, return best match
            var bestMatchIndex = 0;
            $.each(results, (index, item) => 
            {
               if (item.attr("href") == url)
               {
                  bestMatchIndex = index;
                  return false;
               }
            });

            return results[bestMatchIndex];
         }
      }

      private selectArea(target)
      {
         this.searchInput.val("");
         this.clearSearchState();

         // Add and remove selected class
         this.clearSelectedArea();
         target.closest("li").addClass(SiteMenuViewModel.selectedClass);

         // Hide any existing content panels
         this.hideAllContent();

         // Show the panel we are interested in
         $("#" + this.menuContentPrefix + target.data("area")).show();
      }

      private clearSearchState()
      {
         this.latestDealSearchValue = 0;
         this.latestSearchValue = "";
      }

      private clearSelectedArea()
      {
         $(this.siteMenuDropDownSelector + " li.area").removeClass(SiteMenuViewModel.selectedClass);
      }

      private showDealNumberSearchResult(deals: IDeal[])
      {
         // Get the first column of the search results and clear any existing results
         var searchResultsColumn = this.getDealNumberSearchResultColumn().html("");

         // Output the current result
         $.each(deals, (index, deal) =>
         {
            searchResultsColumn.append("<li class=\"item\"><a href=\"{0}\">{1} {2} <span class=\"small muted\" title=\"{3}\">{4} {5}</span></a></li>".format(
               deal.url,
               deal.transactionType,
               deal.dealNumber,
               strings.ccyDealDate,
               deal.currency,
               moment.fromISO(deal.dealDate).toDisplay()));
         });

         this.selectFirstSearchResult(searchResultsColumn);
      }

      private showStaticDataSearchResult(results: ISearchResult[])
      {
         var columnIndex = 1;
         var searchResultsColumn;
         var area = "";
         var _this = this;

         // Output the current result
         $.each(results, (index, searchResult) =>
         {
            if (searchResult.area != area)
            {
               searchResultsColumn = _this.getSearchResultColumn(columnIndex).html("<div class=\"nav-header\">{0}</div>".format(searchResult.area));
               columnIndex++;
            }
            searchResultsColumn.append("<li class=\"item\"><a href=\"{0}\">{1} <span class=\"small muted\">{2}</span></a></li>".format(searchResult.url, searchResult.name, searchResult.caption));
            area = searchResult.area;
         });

         // Hightlight/Select the first search result
         if (!this.menuItemFound)
            this.selectFirstSearchResult(this.getSearchResultColumn(1));
      }

      private selectFirstSearchResult(column: JQuery)
      {
         column.find(".item a").first().addClass(SiteMenuViewModel.selectedClass);
      }

      private showDealNumberNotFoundSearchResult(dealNumber)
      {
         // Get the first column of the search results and clear any existing results
         var searchResultsColumn = this.getDealNumberSearchResultColumn().html("");

         // Output the current result
         searchResultsColumn.append(("<li class=\"item\"><a>" + strings.dealNotFound + "</a></li>").format(dealNumber));
      }

      private getDealNumberSearchResultColumn(): JQuery
      {
         // Return the first column of the search results
         return $(this.getSearchResultsColumns(this.menuContentSearchResults)[0]);
      }

      private getSearchResultColumn(index): JQuery
      {
         // Return the column of the search results
         return $(this.getSearchResultsColumns(this.menuContentSearchResults)[index]);
      }

      private createSearchResultScore(name: string, searchTerm: string, multiplier: number)
      {
         // Create a factor based on whether the name starts with the search term
         // (lower factor = lower score = higher search rank)
         var factor = this.startsWithSearchFunction(name, searchTerm) ? 1 : 2;
         return multiplier * factor;
      }

      private searchMenuContent(searchTerm: string, searchFunction: Function): IMenuItem[]
      {
         var matches = [],
            groupMatches = [],
            matchAndgroupMatchDifference,
            i = 0,
            itemCountLimit = this.maxItemsPerColumn + 1;

         _.each(ag.menu, (item: IMenuItem) =>
         {
            // Search on displayName then exact match on moduleName then on group name
            if (searchFunction(item.displayName, searchTerm))
            {
               item.showGroup = true;
               item.score = this.createSearchResultScore(item.displayName, searchTerm, 1);
               matches.push(item);
               i++;
            }
            else if (item.moduleName.toLowerCase() === searchTerm)
            {
               item.showGroup = true;
               item.score = this.createSearchResultScore(item.displayName, searchTerm, 1);
               matches.push(item);
               i++;
            }
            else if (item.group !== null && groupMatches.length < itemCountLimit)
            {
               if (searchFunction(item.group, searchTerm))
               {
                  item.showGroup = true;
                  item.score = this.createSearchResultScore(item.group, searchTerm, 2);
                  groupMatches.push(item);
               }
            }
         });

         // Sort by score combined with displayName, and take our max display items
         matches = _.take(_.sortBy(matches, (item: IMenuItem) =>
         {
            return item.score + "" + item.displayName;
         }), this.maxDisplayItems);

         // If we did not find enough matched items we will take some items from groupMatches
         matchAndgroupMatchDifference = this.maxItemsPerColumn - matches.length;
         if (matchAndgroupMatchDifference > 0)
         {
            groupMatches = _.take(_.sortBy(groupMatches, (item: IMenuItem) =>
            {
               return item.displayName;
            }), matchAndgroupMatchDifference + 1);

            matches = matches.concat(groupMatches);
         }

         return matches;
      }

      private renderSearchResults(searchResults, matches: IMenuItem[], searchFunctionDescription: string, searchTerm: string)
      {
         var columnIndex = 0,
            columns = this.getSearchResultsColumns(searchResults),
            overMax = (matches.length > this.maxItemsPerColumn ? " (" + strings.first.toLowerCase() + " " + this.maxItemsPerColumn + ")" : "");

         // Add menu items column title
         if (this.menuItemFound)
            $(columns[columnIndex]).append("<div class=\"nav-header\">{0}</div>".format(strings.menuItems + overMax));

         $.each(matches, (index, item: IMenuItem) =>
         {
            // Check if we have reached our max display items
            if (index === this.maxItemsPerColumn - 1)
               return false;

            // Update column index if applicable
            if (index > 0 && index % this.maxItemsPerColumn === 0)
               columnIndex++;

            // Add the content
            $(columns[columnIndex]).append(this.searchResultItem(item));
         });

         // Select the first result to indicate what ENTER will do
         this.selectFirstSearchResult($(columns[0]));

         // Update the search result title
         this.searchResultsTitle.html("{2} {0} <span>\"{1}\"</span>".format(searchFunctionDescription, utils.htmlEncode(searchTerm), strings.searchResults));
      }

      private searchResultItem(item: IMenuItem)
      {
         var itemMarkup = "<li class=\"item {2}\"><a href=\"{0}\">{1}".format(item.url, item.displayName, this.getCategoryColourFromUrl(item.url)),
            groupArea = item.group.toLowerCase() !== item.areaDisplayName.toLocaleLowerCase() ? item.areaDisplayName + " &ndash; " + item.group : item.group;

         if (item.showGroup)
            itemMarkup += " <span class=\"muted small\">{0}</span>".format(groupArea);

         itemMarkup += "</a></li>";

         return itemMarkup;
      }

      private getSearchResultsColumns(searchResults): JQuery
      {
         return searchResults.find(".column ul");
      }

      private startsWithSearchFunction(text: string, searchValue: string): boolean
      {
         return text.toLowerCase().startsWith(searchValue);
      }

      private containsSearchFunction(text: string, searchValue: string): boolean
      {
         return text.toLowerCase().indexOf(searchValue) > -1;
      }

      private resetSearchResults(): JQuery
      {
         this.hideAllContent();
         this.clearSelectedArea();

         var searchResultsContent = this.menuContentSearchResults.show()
            .html("<div id=\"searchResultsTitle\" class=\"nav-header\">" + strings.searchResults + "</div>" +
            "<div class=\"column\"><ul class=\"unstyled\"></ul></div>" +
            "<div class=\"column\"><ul class=\"unstyled\"></ul></div>" +
            "<div class=\"column\"><ul class=\"unstyled\"></ul></div>");

         this.searchResultsTitle = $("#searchResultsTitle");

         return searchResultsContent;
      }

      private hideAllContent()
      {
         $("div[id^='" + this.menuContentPrefix + "']").hide();
      }
   }
}
