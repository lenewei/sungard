/// <reference path="../../ts/global.d.ts" />

module ag.dom
{
   "use strict";

   export class MethodUtils
   {
      counter = 0;
      intervalId = undefined;

      constructor(public rateLimits = 150) { }

      debounce(fn: Function, caller: any, ...args: any[])
      {
         this.counter++;

         if (this.intervalId)
            return;

         this.intervalId = setInterval(() =>
         {
            if (this.counter-- >= 0)
               return;

            fn.apply(caller, args);
            this.reset();

         }, this.rateLimits);
      }

      private reset()
      {
         clearInterval(this.intervalId);
         this.counter = 0;
         this.intervalId = undefined;
      }

      static instance(rateLimits = 150)
      {
         return new MethodUtils(rateLimits);
      }
   }

   export function siteName(siteName?: string)
   {
      if (siteName === undefined)
         return localStorage.getItem("siteName");
      else
         localStorage.setItem("siteName", siteName);
   }

   export function clearTabHeaderErrorIndicators()
   {
      $(".nav-tabs > li.error").removeClass("error");
   }

   export function hierarchicalNavigateToParent(): void
   {
      $(_.last($('#explorerBreadcrumb a:not([href="#"])'))).click();
   }

   function handleGridEvents(gridContainer)
   {
      // Header click - invoke sorting
      $(".grid", gridContainer).not(".table-pivot").on("click", "th",(event) =>
      {
         var context = ko.contextFor(event.currentTarget),
            gridViewModel = context.$parent;

         // We don't want to invoke sorting if the column header is a checkbox
         if (ko.unwrap(context.$data.dataType) === "checkbox")
            return;

         if (gridViewModel && gridViewModel.sorter)
            gridViewModel.sorter.sortColumn(ko.unwrap(context.$data.key));
      });

      // Row click - invoke editing
      $(".grid", gridContainer).not(".explorer, .table-pivot").on("click", "tbody tr",(event) =>
      {
         var context = ko.contextFor(event.currentTarget),
            gridViewModel = context.$parent;

         // Only select row (checkbox) if cell was clicked, not an anchor tag 
         // (as that will usually invoke a quick menu)
         if (gridViewModel.selected && gridViewModel.selected.isMulti() && (<Element>event.target).tagName != "A")
            gridViewModel.selectRow(context.$data);
      });

      $(".grid:not(.browse)", gridContainer).on("click", "a.deal-link",(event) =>
      {
         return utils.openApplicationFromEventTarget(event);
      });

      $(".grid", gridContainer).on("show.bs.dropdown", ".dropdown.context-menu.nav",(event) =>
      {
         var context = ko.contextFor(event.currentTarget),
            data = context.$data,
            gridViewModel = context.$parents[2];

         gridViewModel.quickMenuItem(data);
      });

      // Anchor tag click - invoke navigation or edit
      $(".grid.explorer", gridContainer).on("click", "tbody tr",(event) =>
      {
         var anchorTarget = (<Element>event.currentTarget).tagName.toLowerCase() === "a",
            allowNavigation = anchorTarget && event.ctrlKey;

         // Allow natural link navigation if ctrl key down
         if (allowNavigation)
            return true;

         var context = ko.contextFor(event.target);
         if (context.$root.editItem)
            return context.$root.editItem(context.$data, anchorTarget, event);
      });

      // Breadcrumb anchor tag click - invoke navigation
      $(".explorer-breadcrumb", gridContainer).not(".worksheet").on("click", "a",(event) =>
      {
         var context = ko.contextFor(event.currentTarget),
            allowNavigation = event.ctrlKey;

         // Allow natural link navigation if ctrl key down
         if (allowNavigation)
            return true;

         if (context.$root.editItem)
            return context.$root.editItem(context.$data);
      });

      $(".pivot-container", gridContainer)
         .on("click", ".table-pivot tr th a.filter", (event) =>
         {
            var pivot = ko.dataFor(event.target),
               $filter = $(event.target).closest("a.filter"),
               id = $filter.data("id"),
               pivotData = pivot.pivotData[id],
               item = $filter.data("item"),
               filters;

            if (pivotData)
               filters = pivotData.filters;

            if (filters)
               pivot.selectedDrillDown()[item + 'Filters'].filter(filters);

            event.preventDefault();
         })
         .on("click", ".table-pivot tr td a[data-command]", (event) => 
         {
            var pivot = ko.dataFor(event.target),
               $element = $(event.target),
               command = $element.data("command"),
               id = $(event.target).closest('td').find('a[data-id]').data('id'),
               pivotData = pivot.pivotData[id];

            pivot[command].execute(pivotData.cellData.additionalInfo, event);

            event.preventDefault();
         })
         .on("click", ".table-pivot tr th a.expand", (event) =>
         {
            var pivot = ko.dataFor(event.target),
               key = $(event.target).closest('th').find('a[data-key]').data('key');

            pivot.expand(key);
            event.preventDefault();
         });
   }

   export function displayModalLoading()
   {
      $('body').modalmanager('loading');
   }

   export function hideModalLoading()
   {
      $('body').removeClass('modal-open').modalmanager('removeLoading');
   }

   export function resetTabs()
   {
      // Make the first visible tab of each tab control active
      _.each($(".tabs .nav"),(tabs) =>
      {
         var $tabs = $(tabs);
         $tabs.find("li a:visible:first").click();
      });
   }

   export function isPop(e: JQueryEventObject)
   {
      return e.button === 1 || e.ctrlKey || e.shiftKey;
   }

   export function encodeLinkHref(event: JQueryEventObject)
   {
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

   function equalizeRows()
   {
      var $rows = $(".table-pivot thead tr");

      _.each($rows,(row) => 
      {
         var $row = $(row),
            $children = $row.children(),
            max = 0;
         _.each($children,(child) =>
         {
            var value = $(child).height();
            if (value > max)
               max = value;
         });

         _.each($children,(child) =>
         {
            var $child = $(child),
               height = $child.height()
            if (height !== 0 && height !== max)
               $child.css('height', max + 'px');
         });
      });
   }

   export function updatePivotColumns(groupRows)
   {
      equalizeRows();

      var width = 0,
         left = 1,
         $pivot = $(".table-pivot"),
         containerWidth = $(".pivot-container").width(),
         $behind = $(".table-pivot thead tr:last th.behind"),
         behindWidth = 0;

      $behind.each(function ()
      {
         behindWidth += $(this).outerWidth();
      });

      if (behindWidth >= 0.8 * containerWidth)
         $pivot.addClass("wide");
      else
         $pivot.removeClass("wide");

      _.each(groupRows,(item: any) =>
      {
         var key = item.key.toLowerCase(),
            $behind = $(".table-pivot tr th." + key + ".behind").last(),
            $table = $behind.closest('.table-pivot');

         width = $behind.width() + 1;
         left = $behind.position() ? $behind.position().left - $table.position().left : 1;
         $(".table-pivot tr th." + key + ".frozen").width(width).css('left', left);
      });

      $(".table-pivot tr th.isLast.frozen").css('left', 1).width(left + width - 1);
   }

   export function updateDealAnalysisTitle(title)
   {
      $("#dealAnalyseDialog").find("h3").text(title);
   }

   export function updateLinkedDealTitle(dealNumber)
   {
      $("#linkedDealAnalyseDialog").find("h3").text("Linked Deal " + dealNumber);
   }

   export function init(container?: Element, viewModel?)
   {
      var isPageInit = typeof (container) === "undefined";
      var autocompleteElements = $("form, input:text, input:password", container);
      if (!window.isDebug)
      {
         // Security - ensure all forms and inputs (text and password) have autocomplete turned off
         autocompleteElements.attr("autocomplete", "off");
      }
      else
      {
         // Debug - allow autocomplete
         autocompleteElements.removeAttr("autocomplete");
      }

      if (isPageInit)
      {
         // add transition after loading to avoid jumping around during load
         $(".restrict").addClass("transition");

         // Initialize our messaging components
         messages.init();
         toasts.init();
      }

      // Wire up grid events
      handleGridEvents(container);

      if (isPageInit)
      {
         $(document).on('mouseover', 'table.table-pivot td',(event) =>
         {
            var $cols = $(event.currentTarget).closest('table').children('colgroup'),
               i = $(event.currentTarget).prevAll('td,th').length;

            $(event.target).parent().addClass('hover');
            $($cols[i]).addClass('hover');

         });

         $(document).on('mouseout', 'table.table-pivot td',(event) =>
         {
            var $cols = $(event.currentTarget).closest('table').children('colgroup'),
               i = $(event.currentTarget).prevAll('td,th').length;

            $(event.target).parent().removeClass('hover');
            $($cols[i]).removeClass('hover');
         });

         $(window).resize(() =>
         {
            var chart = $('[data-bind^="kendoChart"]').data("kendoChart");
            if (chart)
            {
               chart.options.transitions = false;
               chart.refresh();
               chart.options.transitions = true;
            }

            var pivotTable = $('table.table-pivot')[0];
            if (pivotTable)
            {
               var viewModel = ko.dataFor(pivotTable);
               if (viewModel && viewModel.updatePivotColumns)
               {
                  viewModel.updatePivotColumns();
               }
            }
         });
      }

      ko.utils.registerEventHandler($("a.statuslink.popup", container), "click",(event: JQueryEventObject) =>
      {
         event.stopImmediatePropagation();
         event.preventDefault();

         new ag.WindowManager({ url: $(event.target).attr("href") });
         return false;
      });

      _.each($(".tabs", container),(containerItem: any) =>
      {
         // Create a Tab Header <ul> section content
         // Set the first panel as the active/selected panel
         // Add data-title attributes for helpmode
         var tabs = $(containerItem),
            tabsId = tabs.data("bind-tabsid"),
            headers = "";

         _.each(tabs.children(".tab-content:first").children(".panel"),(item: any) =>
         {
            var tab = $(item),
               tabReference = tab.data("bind-active"),
               tabId = tab.data("bind-tabid"),
               otherBindings = tab.data("bind") || "";

            if (otherBindings)
               otherBindings += ", ";

            var tabLoad = '';
            if (tabsId && tabId)
               tabLoad = ', tabLoad: ag.tabLoaders.{0}.{1}.isLoaded'.format(tabsId, tabId);

            headers += "<li id=\"{0}TabHeader\"><a data-toggle=\"tab\" href=\"#{0}\" tabindex=\"-1\" data-bind=\"{1}tabActive:'{2}'{4}\">{3}</a></li>".format(
               tab.attr("id"),
               otherBindings,
               tabReference,
               tab.data("title"),
               tabLoad);
         });

         tabs.children("ul.nav:first").html(headers);
      });

      // RemoteRecordLookup Behaviour - on a change event, we pass the value of the target element to
      // the specified URL. We expect this URL to return a complete model which we use to update the
      // model bound to a container element.   
      $(":input[data-remote-record-lookup]", container).each((index, item) =>
      {
         $(item).change((event) =>
         {
            var target = $(event.target);
            utils.getJson({ url: target.data("remote-record-lookup") }, { key: target.val() }).then((data) =>
            {
               // Get the form or div containing the target element that contains the ViewModel
               var modelContainer = utils.getModelContainer(target);
               if (modelContainer.length)
               {
                  // Copy the returned data over the existing
                  var viewModel = ko.dataFor(modelContainer[0]);
                  ko.mapping.fromJS(data, viewModel.editingItem);
               }
            });
         });
      });

      if (isPageInit)
      {
         ajaxActive = false;
         ajaxStatusCode = 200;
         var processingElementSelector = ".processing:not(.field)";

         $(document).ajaxStop(() =>
         {
            ajaxActive = false;
            $(processingElementSelector).hide();
         });
         $(document).ajaxStart(() =>
         {
            $(processingElementSelector).show();
            ajaxActive = true;
         });
         $(document).ajaxComplete((event, request) =>
         {
            ajaxStatusCode = request.status;
         });

         // Prevent disabled links from being actioned
         $(document).on("click", "a.disabled",() =>
         {
            return false;
         });
      }

      // Wire up a display toggle trigger element to toggle the display of a target element
      // using a sliding animation or no animation.
      $('[data-toggle*="toggleDisplay"]', container).each((index, item) =>
      {
         var self = $(item),
            target = $(self.data("target"));

         if (target.length > 0)
         {
            self.on("click",() =>
            {
               if (self.data("toggle") === "toggleDisplaySlide")
                  target.slideToggle();
               else
                  target.toggle();
            });
         }
      });

      // Wire up a class toggle trigger element to toggle a CSS class on a target element
      $("[data-toggle='class']", container).each((index, item) =>
      {
         var self = $(item),
            target = self.data("target") && $(self.data("target")),
            cssClass = self.data("toggle-class");

         if (cssClass && target.length > 0)
         {
            self.on("click",() =>
            {
               // toggle class and also trigger a rerender on container rows for IE
               target.toggleClass(cssClass).closest(".container-row").toggleClass("rerender");
            });
         }
      });

      //#region Dropdown menu max height

      // To facilitate scrolling of dropdown menus, we're setting a max-height on them
      // the equivalent of the page height 
      $('.nav .dropdown-menu', container).each((index, item) =>
      {
         var self = $(item);
         self.css("max-height", $(window).height() - self.parent().height() - parseInt(self.css("padding-top")) - parseInt(self.css("padding-bottom")));
      });

      // We might have dropdown menus elsewhere on the page that need to be truncacted so they lie within the viewport
      $('.scrolling.dropdown-menu', container).each((index, item) =>
      {
         var self = $(item),
            target = self;

         while (target = target.parent())
         {
            if (target.css("position") != "absolute")
               break;
         }

         // Reduce height with padding and margin bottom to allow for shadow
         self.css("max-height", $(window).height() - target.offset().top - target.height() - parseInt(self.css("padding-top")) - parseInt(self.css("padding-bottom")) - parseInt(self.css("margin-bottom")));
      });
      //#endregion

      if (isPageInit)
      {
         //makeModalDraggable
         $(document).on("shown", "div.modal",(event) =>
         {
            var halfWidth = $(event.target).width() / 2,
               halfHeight = $(event.target).height() / 2,
               adjustor = 38;

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
      $("select", container).on("keypress keydown",(event) =>
      {
         if (event.keyCode === 8)
         {
            if ((<HTMLSelectElement>event.target).selectedIndex)
               (<HTMLSelectElement>event.target).selectedIndex = 0;

            return false;
         }
         return true;
      });

      //#endregion

      //#region Application Links, typicall from a input label to the associated application

      $(".app-container", container).on("click", "a.app-link",(event) =>
      {
         return utils.openApplicationFromEventTarget(event);
      });

      if (isPageInit)
      {
         PubSub.subscribe(ag.topics.ApplyBindingDone,() =>
         {
            _.delay(() =>
            {
               displayPageContent();
            },
               50 /* short delay to allow for some ajax action but don't want to wait excessively */);
         });
      }

      //#endregion

      //#region Wide page toggle

      $("#pageWidthToggle", container).on("click",(event) => 
      {
         // toggle the full width of the current page
         setFullWidth(!isFullWidth());

         // Resize the pivot after the page width transition finishes
         _.delay(() => 
         {
            $(window).resize();
         }, 600);

         event.preventDefault();
      });

      //#endregion

      $(".app-container", container).on("shown.bs.dropdown",(event: JQueryEventObject) =>
      {
         hideUnusedDividersAndHeaders($(event.target));
      });

      $(document).keydown((event: JQueryEventObject) =>
      {
         if (event.keyCode != $.ui.keyCode.TAB)
            return;

         var modal = _.last($('.modal-scrollable'));

         if (!modal)
            return;

         var shitKeydown = event.shiftKey,
            tabbableElements = $(modal).find(':tabbable'),
            last = _.last(tabbableElements),
            first = _.first(tabbableElements);

         if (!shitKeydown)
            tabMove(event, last, first);
         else
            tabMove(event, first, last);
      });

      fileUploadInit(container);

      filtersInit();
   }

   export function tabMove(event, from: HTMLElement, to: HTMLElement)
   {
      if (event.target == from)
         $(to).focus();
   }

   export function tryGetLabel(key)
   {
      return $("label[for='Domain_" + key + "'],label[for='" + key + "']").first().text();
   }

   export function filtersInit()
   {
      var filterPanel = $('div.filterpanel'),
         filterSelectedGroup = $('div.filterselectedgroup'),
         emptyKey = "_emptyKeyForRemoval",
         currentDraggingObject;

      if (filterPanel.length == 0)
         return;

      var getMatches = (event: JQueryEventObject) =>
      {
         var data = ko.dataFor(event.currentTarget),
            prop = $(event.currentTarget).data("groupProperty"),
            matches = ag.utils.getObjectFromPath(data, prop);

         return ko.unwrap(matches);
      };

      filterPanel.mousedown((event) =>
      {
         currentDraggingObject = ko.dataFor(event.target);
      });

      filterPanel.on("sortstart",(event: JQueryEventObject) =>
      {
         filterSelectedGroup.hide();

         ag.utils.walkObject(getMatches(event),(obj, p) =>
         {
            if (p != "matches")
               return;

            // if current dragging == obj, we don't need to unshift the filter data
            if (obj === currentDraggingObject)
               return;

            var matchesArray = ko.unwrap(obj[p]);
            if (_.size(matchesArray) > 0)
               return;

            // insert into the first index
            (<KnockoutObservableArray<any>>obj[p]).unshift(ko.mapping.fromJS(new FilterData({ key: emptyKey, dataType: "string", hidden: true, displayName: "" })));
         });
      });

      filterPanel.on("sortstop",(event: JQueryEventObject) =>
      {
         filterSelectedGroup.show();

         ag.utils.walkObject(getMatches(event),(obj, p) =>
         {
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

   //#region file upload 

   function fileUploadInit(container?)
   {
      var uploaders = $('div[class*="uploader"]', container);
      if (uploaders.length === 0)
         return;

      uploaders.toArray().forEach((target) =>
      {
         target = $(target);
         var fileInput = target.find('input[type="file"]');
         fileInput.change((e:JQueryEventObject) =>
         {
            fileInput.blur();
            var files = (<any>e.target).files,
               names = "";

            for (var i = 0, f; f = files[i]; i++)
               names += f.name + (files[i + 1]  ? ', ': '');

            target.find('input[class*="fake-file-input"]').val(names);
         });
      });
   }

   //#endregion

   //#region HtmlParts

   export function initHtmlParts(viewModel): void
   {
      if (!ag.uiHtmls)
         return;

      var htmlParts = [];

      _.each(ag.uiHtmls, (uiHtml: any) =>
      {
         var config = uiHtml.config,
            item = getProperty(viewModel, config.bindingPath);

         if (config.executeAtStartUp)
         {
            updateHtmlPart(config, null, viewModel, item);
            return true;
         }

         if (!isNullOrUndefined(item))
         {
            item.refresh = (changedProperty) =>
            {
               return updateHtmlPart(uiHtml, changedProperty, viewModel, item);
            };
            item.clear = () =>
            {
               return uiHtml.html(null);
            };

            if (config.refreshWhenKeyFieldChange)
            {
               item.extend({ rateLimit: 100 });
               htmlParts.push(item);
            }

            PubSub.subscribe(ag.topics.UpdateUIHtml,() =>
            {
               _.each(htmlParts,(targetValue: KnockoutObservable<any>) =>
               {
                  targetValue(0); // reset back to 0;
               });
            });
         }
      });
   }

   export var htmlParts: Array<KnockoutObservable<any>> = [];

   export function updateHtmlPart(uiHtml: any, changedProperty, viewModel, item)
   {
      var map = (x) =>  
      {
         return x ? x : undefined;
      },
         config = uiHtml.config;

      var setProcessing = (obj: any, value: boolean) =>
      {
         if (obj && obj.isProcessing)
         {
            obj.isProcessing(value);
         }
      }

      var action =
         {
            action: map(config.action),
            area: map(config.area),
            controller: map(config.controller),
            url: map(config.url)
         };

      var params = config.additionalFields ?
         utils.getAdditionalFieldsFromModel(config.additionalFields, viewModel.getModel()) : config.includeCompleteModel ? ko.mapping.toJS(viewModel.getModel() || {}) : {};

      params.changedProperty = changedProperty;

      setProcessing(item, true);

      // Get the Html
      utils.getJson(action, params, true).done((result) =>
      {
         if (result.data)
            uiHtml.html(result.data);
      }).always(() => setProcessing(item, false));

      return true;
   }

   //#endregion

   // persist the current page width state
   function setCurrentFullWidth(wide): void
   {
      $.cookie("full-width-current", wide, { path: '/' });
   }

   // toggle the CSS class to reflect the wide page state
   export function setFullWidthCss(wide, persist): void
   {
      $("body").toggleClass("full-width", wide);
      if (persist)
      {
         setCurrentFullWidth(wide);
      }

      // make sure the pivot lines are drawn correctly
      $(window).resize();
   }

   // return the name of the key used to store
   // the wide pages in the cookie
   function getWidePageKey(): string
   {
      return "full-width-" + ag.area;
   }

   // return an array of hashes of wide pages
   function getWidePages()
   {
      // get the cookie value that stores the wide page hashes
      var value = $.cookie(getWidePageKey());

      // create array of wide page hashes
      return value ? value.split(",") : [];
   }

   // return the hash of the current page
   function getPageHash()
   {
      return (ag.area + "/" + ag.controller).getHashCode().toString();
   }

   // is the current page wide?
   export function isFullWidth(): boolean
   {
      return getWidePages().indexOf(getPageHash()) > -1;
   }

   // add or remove the current page from the list of wide pages
   function setFullWidth(wide): void
   {
      // create array of wide page hashes and calculate hash for current page
      var widePages = getWidePages(),
         hash = getPageHash(),
         index = widePages.indexOf(hash);

      if (wide)
      {
         // add the current page if the page needs to be wide
         widePages.push(hash);
      }
      else if (index != -1)
      {
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
   export function displayPageContent()
   {
      // Remove the loading div and slide the main page panel down
      $(".page-container").removeClass("loading");
      $(".app-panel").show();

      // if the current page is full width, add a class
      setFullWidthCss(isFullWidth(), true);

      inputs.init();
      inputElementWatcher.init();
   }

   export function supportsLocalStorage()
   {
      // Browsers other than IE are considered to have good localStorage support, IE does not.
      // May require further tests if other browsers found to also be flaky.
      return navigator.userAgent.indexOf("Trident") === -1;
   }

   export function notificationsInit()
   {
      var notifications = new Notifications();
      utils.applyBindings(notifications, $("#notifications")[0], false);
      utils.applyBindings(notifications, $("#notificationErrorDialog")[0], false);
   }

   export function notificationsVisible()
   {
      return $("#notifications").hasClass("open");
   }

   export function nextTabElement(element: JQuery, gap: number = 1)
   {
      var contents = $(":tabbable"),
         contentsLength = contents.length,
         index = 0,
         nextTabPosition: number;

      for (var i: number = 0; i < contentsLength; i++)
      {
         if (element[0] == contents[i])
         {
            index = i;
            break;
         }
      }
      nextTabPosition = index + gap;
      if (nextTabPosition > 0 && nextTabPosition < contentsLength)
         return $(contents[nextTabPosition]);

      return element;
   }

   export function hideUnusedDividersAndHeaders(dropdown: JQuery)
   {
      var dividerSelector = ".divider",
         headerSelector = ".nav-header",
         menu = dropdown.children(".dropdown-menu"),
         hasVisibleSiblingBeforeDivider: boolean,
         hasVisible = (items: JQuery): boolean =>
         {
            return items.filter(":visible").has(":visible").length > 0;
         };

      // hide headers that are not followed by a visible sibling
      menu.children(headerSelector).each((index: number, element: HTMLElement) =>
      {
         var header = $(element);
         header.toggle(hasVisible(header.nextUntil(headerSelector + "," + dividerSelector)));
      });

      // hide dividers that are not sandwiched between visible siblings
      menu.children(dividerSelector).each((index: number, element: HTMLElement) =>
      {
         var divider = $(element),
            hasVisibleSiblingAfterDivider = hasVisible(divider.nextUntil(dividerSelector));

         if (index === 0)
         {
            hasVisibleSiblingBeforeDivider = hasVisible(divider.prevAll());
         }

         divider.toggle(hasVisibleSiblingAfterDivider && hasVisibleSiblingBeforeDivider);

         hasVisibleSiblingBeforeDivider = hasVisibleSiblingBeforeDivider || hasVisibleSiblingAfterDivider;
      });
   }

   export module inputs
   {
      export var ResizeFont: string = "RESIZE_FONT_EVENT";

      export function init()
      {
         var $body = $("body"),
            inputs = $body.find("input.integer").toArray().concat($body.find("input.decimal").toArray()),
            visibleInputs = inputs.filter((e) => { return $(e).is(":visible"); }),
            invisibleInputs = inputs.filter((e) => { return !$(e).is(":visible"); });

         // Initialise the visible inputs as soon as it shows on the page
         initInputs(visibleInputs);

         // Delay the rendering process for invisible inputs
         _.delay(() =>
         {
            initInputs(invisibleInputs);
         }, 2000);

         PubSub.subscribe(ResizeFont,(topic, item) =>
         {
            shrinkToFill($(item));
         });
      }

      function initInputs(inputs: Array<JQuery>)
      {
         _.each(inputs,(input: HTMLElement) =>
         {
            var $element = $(input);
            shrinkToFill($element);
            ko.utils.registerEventHandler($element, "keyup",() =>
            {
               shrinkToFill($element);
            });
         });
      }

      function shrinkToFill($input)
      {
         var txt = $input.val(),
            maxWidth = $input.width(),
            fontSizePx = $input.css("font-size"),
            fontSize = parseFloat(fontSizePx.substring(0, fontSizePx.length - 2)),
            font = fontSize + "px",
            style = "normal-font";

         // reset all font size class 
         $input.removeClass((index: number, css: string) =>
         {
            return (css.match(/\S+\-font/g) || []).join("");
         });

         // no resize required if font is less than 15
         if (txt.toString().length < 15)
            return;

         var textWidth = measureText(txt, font).width;
         if (textWidth > maxWidth)
         {
            fontSize = fontSize * maxWidth / textWidth * .9;
            if (fontSize >= 7.5 && fontSize <= 11)
               style = "medium-font";
            else if (fontSize < 7.5)
               style = "small-font";
         }

         // apply the new font style
         $input.addClass(style);
      }

      function measureText(txt: string, font: string)
      {
         var id = 'text-width-tester',
            $tag = $('#' + id);

         if (!$tag.length)
         {
            $tag = $('<span id="' + id + '"style="display:none;font:' + font + ';">' + txt + '</span>');
            $('body').append($tag);
         }
         else
         {
            $tag.css({ font: font }).html(txt);
         }
         return {
            width: $tag.width(),
            height: $tag.height()
         };
      }
   }

   export module inputElementWatcher
   {
      var selector = "data-element-watcher";

      export function init()
      {
         var elementsNeedwatch = $("input[" + selector + "]");

         if (elementsNeedwatch.length < 1)
            return;

         registerEventListeners(elementsNeedwatch);

         PubSub.subscribe(topics.ApplyWatcherValue,() =>
         {
            _.each(elementsNeedwatch,(element: HTMLElement) =>
            {
               $(element).attr(selector, $(element).val());
            });
         });
      }

      function registerEventListeners(elements: JQuery)
      {
         _.each(elements,(element: HTMLElement) =>
         {
            ko.utils.registerEventHandler(element, "keyup",(event: JQueryEventObject) =>
            {
               var $element = $(event.target),
                  watcherValue = $element.attr(selector);

               if ($element.val().toString() != watcherValue.toString())
               {
                  PubSub.publish(topics.WatcherValueChanged);
               }
               else
               {
                  PubSub.publish(topics.ApplyWatcherValue);
               }
            });
         });
      }
   }

   // Module for monitoring the active state of a window/tab focussed or not
   export module windowActivity
   {
      var callbacks = $.Callbacks();

      // Current state of window/tab activity
      export var isActive = true;

      function monitorActivity()
      {
         var hidden = "hidden",
            visible = "visible";

         // Standards
         if (hidden in document)
            document.addEventListener("visibilitychange", onchange);
         else if ((hidden = "mozHidden") in document)
            document.addEventListener("mozvisibilitychange", onchange);
         else if ((hidden = "webkitHidden") in document)
            document.addEventListener("webkitvisibilitychange", onchange);
         else if ((hidden = "msHidden") in document)
            document.addEventListener("msvisibilitychange", onchange);
         // IE 9 and lower
         else if ("onfocusin" in document)
            (<any>document).onfocusin = (<any>document).onfocusout = onchange;
         // All others
         else
            window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

         function onchange(event) 
         {
            var eventMap = { focus: visible, focusin: visible, pageshow: visible, blur: hidden, focusout: hidden, pagehide: hidden };
            event = event || window.event;
            var eventType: string;

            if (event.type in eventMap)
               eventType = eventMap[event.type];
            else
               eventType = (document[hidden] ? hidden : visible);

            isActive = eventType == visible;
         }

         // Set the initial state (but only if browser supports the Page Visibility API)
         if (document[hidden] !== undefined)
            onchange({ type: document[hidden] ? "blur" : "focus" });
      }

      function updateActivityOnFocusChange()
      {
         $(window).blur(event =>
         {
            if (isActive)
            {
               isActive = false;
               callbacks.fire(isActive);
            }
         });

         $(window).focus(event =>
         {
            if (!isActive)
            {
               isActive = true;
               callbacks.fire(isActive);
            }
         });
      }

      // Subscribe to changes in Activity
      export function isActiveChanged(callback: (isActive: boolean) => void)
      {
         callbacks.add(callback);
      }

      // Start monitoring activity and set default 
      monitorActivity();
      updateActivityOnFocusChange();
   }

   // Init self with the current document
   $(() =>
   {
      init();
   });
}

module ag.dom.automation
{
   export function invokeSynchronousLookup(url, params: any, replaceData: boolean): string
   {
      $.ajaxSetup({ async: false });

      if (!viewModel)
         throw Error("No viewModel available.");

      var promise,
         resultText = "",
         data = viewModel.editingItem || {};

      var combined = $.extend(ko.mapping.toJS(data), params ? JSON.parse(params) : null);

      promise = viewModel.net.postJson({ url: url }, !replaceData ? { data: combined } : combined)
         .always(result =>
         {
            if (!$.isArray(result))
            {
               resultText = "200 OK";
            }
            else
            {
               var response = result[0];
               resultText = response.status + " " + response.statusText;

               if (response.status == 500 && response.responseJSON && $.isArray(response.responseJSON.errors))
               {
                  resultText += ", " + response.responseJSON.errors.join(", ");
                  resultText = resultText.replaceAll("\r\n", " ");
               }
            }
         });

      return resultText;
   }
}
