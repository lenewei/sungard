/*
* [AG 25/5/2012] Override for the collapse plugin to remove the overflow: hidden style at the end of the transition.
* Added to allow absolutely-positioned child elements that overflow the parent, e.g., dropdown menus, to be visible.
*/


/* =============================================================
* bootstrap-collapse.js v2.0.3
* http://twitter.github.com/bootstrap/javascript.html#collapse
* =============================================================
* Copyright 2012 Twitter, Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* ============================================================ */


!function ($)
{

   "use strict"; // jshint ;_;


   /* COLLAPSE PUBLIC CLASS DEFINITION
   * ================================ */

   var Collapse = function (element, options)
   {
      this.$element = $(element);
      this.options = $.extend({}, $.fn.collapse.defaults, options);

      if (this.options.parent)
      {
         this.$parent = $(this.options.parent);
      }

      this.options.toggle && this.toggle;
   }

   Collapse.prototype = {

      constructor: Collapse

  , dimension: function ()
  {
     var hasWidth = this.$element.hasClass('width');
     return hasWidth ? 'width' : 'height';
  }

  , show: function ()
  {
     var dimension
        , scroll
        , actives
        , hasData

     if (this.transitioning) return;

     dimension = this.dimension();
     scroll = $.camelCase(['scroll', dimension].join('-'))
     actives = this.$parent && this.$parent.find('> .accordion-group > .in');

     if (actives && actives.length)
     {
        hasData = actives.data('collapse');
        if (hasData && hasData.transitioning) return;
        actives.collapse('hide')
        hasData || actives.data('collapse', null);
     }

     this.$element[dimension](0)
     this.transition('addClass', $.Event('show'), 'shown');

     // [AG 30/5/2012] In the case of a browser that doesn't support transitions and we're
     // collapsing an absolutely positioned element, the following dimension setting happens
     // after the immediate change to the new size, so we need to prevent it from happening.
     // From what I can see this will only be an issue for fixed height content that might
     // scroll but we don't have any of that.
     //
     // Also, if the scrollHeight is zero the transition will not happen which messes up the
     // transition state, so we set a small intermediate dimension to force the transition.
     var scrollHeight = this.$element[0][scroll];

     if ($.support.transition && scrollHeight === 0) scrollHeight = 1;

     this.$element[dimension](scrollHeight);
  }

  , hide: function ()
  {
     var dimension;
     if (this.transitioning) return;
     dimension = this.dimension();
     this.reset(this.$element[dimension]());
     this.$element.css("overflow", "hidden");
     this.transition('removeClass', $.Event('hide'), 'hidden');
     this.$element[dimension](0);
  }

  , reset: function (size)
  {
     var dimension = this.dimension();

     if (size === 0) size = 1;

     this.$element
        .removeClass('collapse')
        .css("overflow", "visible")
        [dimension](size || 'auto')
        [0].offsetWidth;

     this.$element[size !== null ? 'addClass' : 'removeClass']('collapse');

     return this;
  }

  , transition: function (method, startEvent, completeEvent)
  {
     var that = this
        , complete = function ()
        {
           if (startEvent.type == 'show') that.reset();
           that.transitioning = 0;
           that.$element.trigger(completeEvent);
        }

     this.$element.trigger(startEvent);

     if (startEvent.isDefaultPrevented()) return;

     this.transitioning = 1;

     this.$element[method]('in');

     $.support.transition && this.$element.hasClass('collapse') ?
        this.$element.one($.support.transition.end, complete) :
        complete();
  }

  , toggle: function ()
  {
     this[this.$element.hasClass('in') ? 'hide' : 'show']();
  }

   }


   /* COLLAPSIBLE PLUGIN DEFINITION
   * ============================== */

   $.fn.collapse = function (option)
   {
      return this.each(function ()
      {
         var $this = $(this)
        , data = $this.data('collapse')
        , options = typeof option == 'object' && option
         if (!data) $this.data('collapse', (data = new Collapse(this, options)))
         if (typeof option == 'string') data[option]()
      });
   }

   $.fn.collapse.defaults = {
      toggle: true
   }

   $.fn.collapse.Constructor = Collapse;

   /* COLLAPSIBLE DATA-API
   * ==================== */

   /*
   [AG 12/7/2012] The COLLAPSIBLE DATA-API section from bootstrap.js has not been duplicated here because it causes the
   event handler to be added twice.
   */

}(window.jQuery);

/*
 * [AG 23/5/2012] Override for the typeahead plugin to allow display of the typeahead lookup without providing a query
*/

/* =============================================================
* bootstrap-typeahead.js v2.0.3
* http://twitter.github.com/bootstrap/javascript.html#typeahead
* =============================================================
* Copyright 2012 Twitter, Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* ============================================================ */


!function ($)
{
   "use strict"; // jshint ;_;

   /* TYPEAHEAD PUBLIC CLASS DEFINITION
   * ================================= */

   var Typeahead = function (element, type, options)
   {
      this.type = type;
      this.eventNamespace = "." + type;
      this.availableItems = [];
      this.$element = $(element);
      this.options = $.extend({}, $.fn.typeahead.defaults, options);
      this.matcher = this.options.matcher || this.matcher;
      this.sorter = this.options.sorter || this.sorter;
      this.highlighter = this.options.highlighter || this.highlighter;
      this.updater = this.options.updater || this.updater;
      this.$menu = $(this.options.menu).appendTo('body');
      this.source = this.options.source;
      this.maxItems = this.options.items || 0;
      this.hideQueryUI = !!this.options.hideQueryUI;
      this.lookupPending = false;
      this.isProgressing = false;
      this.showOnNoItems = !!this.options.showOnNoItems;

      this.shown = false;
      this.selectionPending = false;
      this.matchingItems = null;
      this.menuListen();
      this.targetIsInput = this.$element.is('input');
      this.showingSubset = false;
      this.hasFocus = false;
      this.stopCloseOnBlurBeforelookup = false; // for testing

      this.keyupValue = undefined;
      this.keydownValue = undefined;
      this.isLocalDatasource = options.isLocalDatasource;

      // If the element is an input, wire up event handling for it immediately.
      if (this.targetIsInput)
      {
         this.input = this.$element;
         this.inputListen();
      }

      // For debouncing lookup requests
      var that = this;
      this.debouncedLookup = options.isLocalDatasource ? function () { that.lookup(); } : _.debounce(that.lookup, this.options.bounceInterval || 100);

      this.externalListen();
   }

   Typeahead.prototype =
   {
      constructor: Typeahead,
      select: function ()
      {
         var activeItem = this.$menu.find(".active"),
            updatedVal,
            val = activeItem.length > 0 ? activeItem.attr("data-value") : "",
            item = activeItem.data("item");

         // NOTE: This always returns null to avoid a double update of the elements value...
         updatedVal = this.updater(!val ? this.input.val() : val, item);

         this.selectionPending = false;

         if (this.targetIsInput)
         {
            // NOTE: see above, updatedVal will be null
            // Update the value of the target element if it supports that
            if (updatedVal)
               this.$element.val(updatedVal).change();
         }
         this.query = this.input ? this.input.val() : "";

         return this.hide();
      },
      updater: function (item)
      {
         return item;
      },
      show: function (callback)
      {
         var pos = $.extend({}, this.$element.offset(), {
            height: this.$element[0].offsetHeight
         });

         this.$menu.css({
            top: pos.top + pos.height,
            left: pos.left,
            zIndex: ag.utils.findHighestDivZIndex()
         });

         this.$menu.show();

         if (callback)
            callback();
         this.shown = true;

         return this;
      },
      hide: function (doEvents)
      {
         doEvents = doEvents !== undefined ? !!doEvents : true;
         this.$menu.hide();
         this.shown = false;
         var that = this;
         that.isProgressing = false;

         if (!doEvents)
            return;

         if (!this.targetIsInput)
         {
            // We're using an input in the dropdown list itself, so clear the input value
            // for the next lookup.
            this.input && this.input.val('');
         }
         else
         {
            // If a lookup has been performed but the user has not made a selection,
            // check that the current input value matches one of the items displayed
            // in the last lookup operation.
            if (this.selectionPending && this.availableItems)
            {
               var inputValue = this.input.val().toLowerCase();
               var matches = this.availableItems.filter(function (item)
               {
                  if (item)
                  {
                     return (typeof item !== "object" ? item.toString() : item.name).toLowerCase() === inputValue;
                  }
               });

               // If the query matches an item in the last lookup operation, select it.
               if (matches.length > 0)
               {
                  var match = matches[0];
                  typeof match !== "object" ? this.updater(match) : this.updater(match.name, match);
                  this.selectionPending = false;
               }
            }
            else
               this.selectionPending = false;
         }

         // Let the target know that the typeahead operation has finished
         this.$element.trigger("typeahead.done");

         this.availableItems = [];

         return this;
      },
      getItemCount: function ()
      {
         return this.matchingItems;
      },
      lookup: function ()
      {
         var that = this,
            items;

         if (!that.isLocalDatasource)
         {
            if (that.isProgressing || !that.isDirty())
               return;
         }

         that.isProgressing = true;

         if (!this.hasFocus && !this.stopCloseOnBlurBeforelookup)
            return;

         this.query = (this.input ? this.input.val() : "");
         this.query = !this.query.isWhitespace() ? this.query : "";
         this.matchingItems = null;

         var lookupHandler = function (lookupData, gridViewOptions)
         {
            var cb = null,
                itemDisplayName;

            // [AG 29/8/2012] The result is now expected to be an object with the following properties:
            // data - the data objects
            // fields - an array of field objects describing each data field

            // Always call the matcher in case it needs to do additional filtering
            items = $.grep(lookupData.data, function (item)
            {
               return that.matcher(item, that.query);
            });

            items = that.sorter(items);
            that.matchingItems = items.length;

            that.selectionPending = true;
            that.render(items, gridViewOptions ? gridViewOptions.totalItems : -1, gridViewOptions ? gridViewOptions.searchTerms : [that.query]);

            // If we're hiding query UI and there's no items to show,
            // don't bother displaying an empty menu.
            (that.hideQueryUI || that.input) && !that.showOnNoItems && that.availableItems.length == 0 ? that.hide() : that.show(cb);

            // If there is only one match but it is an exact match to the current text, select it and close the dialog.
            if (items.length == 1)
            {
               itemDisplayName = (items[0].name || items[0]).toString();
               if (itemDisplayName.toLowerCase() === (that.input ? that.input.val().toLowerCase() : ""))
               {
                  that.select();
               }
            }
            that.lookupPending = false;
         }

         if (_.isFunction(this.source))
         {
            this.source(this.query, this.maxItems)
               .done(function (result)
               {
                  lookupHandler.apply(this, [result.lookupData, result.gridViewOptions]);
               })
               .always(function ()
               {
                  that.isProgressing = false;
               });
         }
         else
         {
            lookupHandler.apply(this, [this.source]);
         }
      },
      matcher: function (item)
      {
         return ~item.toLowerCase().indexOf(this.query.toLowerCase());
      },
      sorter: function (items)
      {
         var beginswith = [],
            caseSensitive = [],
            caseInsensitive = [],
            item;

         while (item = items.shift())
         {
            if (!item.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item);
            else if (~item.indexOf(this.query)) caseSensitive.push(item);
            else caseInsensitive.push(item);
         }

         return beginswith.concat(caseSensitive, caseInsensitive);
      },
      highlighter: function (item, searchTerms)
      {
         if (searchTerms.length == 0)
            return item;

         var escapedSearchTerms = _.map(searchTerms, function (searchTerm)
         {
            return ag.utils.escapeRegexChars(searchTerm);
         });

         var query = escapedSearchTerms.join("|");
         return item.toString().replace(new RegExp('(' + query + ')', 'ig'), function ($1, match)
         {
            return '<span class="highlight">{0}</span>'.format(match);
         });
      },
      formatShowingText: function (items, unfilteredLength)
      {
         if (this.hideQueryUI)
            return null;

         if (items.length === 0)
            return "No items found";

         if (unfilteredLength > this.maxItems)
         {
            var listLength = items.length > this.maxItems ? this.maxItems : items.length;
            if (this.query.length)
               return 'First {0} matching "{1}"'.format(listLength, this.query);

            return 'First {0} items'.format(listLength);
         }

         if (this.query)
            return 'Items matching "{0}"'.format(this.query);

         return null;
      },
      render: function (items, unfilteredLength, searchTerms)
      {
         var that = this;

         var showing = $(".showing", this.$menu);
         var showingText = that.formatShowingText(items, unfilteredLength);
         if (showingText)
         {
            // Show the results description section
            if (showing.length == 0)
            {
               $(that.options.showing)
                   .text(showingText)
                   .insertBefore($(":last-child", this.$menu));
            }
            else
            {
               showing.text(showingText);
            }
         }
         else
         {
            showing.remove();
         }

         // If the number of items exceeds the maximum number of display items,
         // truncate the list and add an extra item indicating how many the list is displaying.
         if (items.length > this.maxItems)
         {
            // If the trigger element is not an input field and query UI is enabled, we need to add an input directly to the list
            if (!this.hideQueryUI && !this.input)
            {
               this.input = $(that.options.filterInput)
               .prependTo(this.$menu)
                .on('click', function (e)
                {
                   e.stopPropagation();
                })
                .on("keydown", function (e)
                {
                   var input = $(e.target);

                   switch (e.keyCode)
                   {
                      case 27: // escape
                         that.hide();
                         break;
                      case 8: // delete
                      case 46: // backspace
                         // If the input field is empty hide the dropdown.
                         if (input.val().length == 0 && that.shown)
                         {
                            that.hide();
                            e.stopPropagation();
                            e.preventDefault();
                         }
                         break;
                      default:
                         break;
                   }
                });

               // Wire up event handlers
               this.inputListen();
            }

            items.splice(this.maxItems);
         }

         this.availableItems = items;

         // Marshall the items for display
         var listItems = $(items).map(function (i, item)
         {
            // Each item may be either a string or an object with the following properties:
            // name: the display name to use
            // title: a string to display in the title attribute (optional)
            if (typeof item !== 'object')
            {
               i = $(that.options.item).attr('data-value', item);
               i.find('a').html(that.highlighter(item, searchTerms));
            }
            else
            {
               if (typeof item.name === 'undefined')
                  throw new Error("typeahead item is an object but has no 'name' property");

               var innerHtml = that.highlighter(item.name, searchTerms) + (
                  _.has(item, "hint") ? '<span class="pull-right muted spacer-left">{0}<span>'.format(item.hint) : "");

               i = $(that.options.item)
                  .data('item', item)
                  .attr('data-value', item.name)
                  .attr('title', item.title || '');
               i.find('a').html(innerHtml);
            }
            return i[0];
         });

         listItems.first().addClass('active');

         // Populate the list
         $("ul", this.$menu).html(listItems);

         return this;
      },
      next: function ()
      {
         var active = this.$menu.find('.active').removeClass('active'),
            next = active.next();

         if (!next.length || next.hasClass('more'))
            next = $(this.$menu.find('li')[0]);

         next.addClass('active').scrollintoview();
      },
      prev: function ()
      {
         var active = this.$menu.find('.active').removeClass('active')
            , prev = active.prev();

         if (!prev.length)
         {
            prev = this.$menu.find('li').last();
            if (prev.hasClass('more')) prev = prev.previous();
         }

         // TODO: do we need to remove the scrollintoview dependency if we're not using scrolling lists? 
         prev.addClass('active').scrollintoview();
      },
      inputListen: function ()
      {
         this.input
            .on('blur' + this.eventNamespace, $.proxy(this.blur, this))
            .on('keypress' + this.eventNamespace, $.proxy(this.keypress, this))
            .on('keyup' + this.eventNamespace, $.proxy(this.keyup, this));

         if ($.browser.webkit || $.browser.msie)
         {
            this.input.on('keydown' + this.eventNamespace, $.proxy(this.keypress, this));
         }
      },
      inputUnlisten: function ()
      {
         this.input.off(this.eventNamespace);
      },
      menuListen: function ()
      {
         $("ul", this.$menu)
            .on('click' + this.eventNamespace, $.proxy(this.click, this))
            .on('mousedown' + this.eventNamespace, $.proxy(this.mousedownList, this))
            .on('mouseenter' + this.eventNamespace, 'li', $.proxy(this.mouseenter, this));
      },
      menuUnlisten: function ()
      {
         $("ul", this.$menu).off(this.eventNamespace);
      },
      externalListen: function ()
      {
         this.clickOutsideResizeHandler = $.proxy(this.clickOutsideResize, this);
         $('html').on('click', this.clickOutsideResizeHandler);
         $(window).on('resize', this.clickOutsideResizeHandler);
      },
      externalUnlisten: function ()
      {
         $('html').off('click', this.clickOutsideResizeHandler);
         $(window).off('resize', this.clickOutsideResizeHandler);
      },
      keyup: function (e)
      {
         this.keyupValue = $(e.target).val();

         switch (e.keyCode)
         {
            case 16: // shift
            case 17: // ctrl
            case 18: // alt
            case 40: // down arrow
            case 38: // up arrow
               break;

            case 9:  // tab
            case 13: // enter
               if (!this.shown)
                  return;
               this.select();
               break;

            case 27: // escape
               if (!this.shown) return;
               this.hide();
               break;

            case 8:  // delete
            case 46: // backspace
               // Do another lookup if the current query is not empty or, if not, the previous query was not empty
               var currentQuery = $(e.target).val();

               // If user clear current input field, we don't fire search event back server which can allow
               // quickly tab through the fields and remove values.
               if (currentQuery == "")
               {
                  this.hide();
                  e.stopImmediatePropagation();
               }
               else
               {
                  var previousQuery = this.query || '';

                  if (currentQuery.length > 0 || (currentQuery.length == 0 && previousQuery.length > 0))
                  {
                     this.lookupPending = true;
                     this.debouncedLookup();
                  }
               }
               break;

            case $.ui.keyCode.HOME:
            case $.ui.keyCode.END:
            case $.ui.keyCode.LEFT:
            case $.ui.keyCode.RIGHT:
            case $.ui.keyCode.UP:
               break;

            default:
               this.lookupPending = true;
               this.debouncedLookup();
               break;
         }

         e.stopImmediatePropagation();
         e.stopPropagation();
         e.preventDefault();
      },
      keypress: function (e)
      {
         this.keydownValue = $(e.target).val();

         this.hasFocus = true;
         if (!this.shown) return;

         switch (e.keyCode)
         {
            case 9:
            case 13: // enter
            case 27: // escape
               e.preventDefault();
               break;

            case 38: // up arrow
               e.preventDefault();
               this.prev();
               break;

            case 40: // down arrow
               e.preventDefault();
               this.next();
               break;
         }

         e.stopPropagation();
      },
      blur: function ()
      {
         var that = this;
         this.hasFocus = false;
         if (!that.targetIsInput)
            return;
         that.hide();
      },
      click: function (e)
      {
         e.stopPropagation();
         e.preventDefault();
         this.select();
      },
      mouseenter: function (e)
      {
         this.$menu.find('.active').removeClass('active');
         $(e.currentTarget).addClass('active');
      },
      mousedownList: function (e)
      {
         e.stopImmediatePropagation();
         e.preventDefault();
      },
      clickOutsideResize: function ()
      {
         if (this.shown && !this.lookupPending)
            this.hide();
      },
      isDirty: function ()
      {
         if (!this.keydownValue || !this.keyupValue)
            return true;

         if (this.keyupValue && this.keydownValue)
            return this.keyupValue != this.keydownValue;

         return false;
      },
      destroy: function ()
      {
         this.inputUnlisten();
         this.menuUnlisten();
         this.externalUnlisten();
         this.$menu.remove();
         this.$element.removeData(this.type);
      }
   }

   /* TYPEAHEAD PLUGIN DEFINITION
   * =========================== */

   $.fn.typeahead = function (option)
   {
      return this.each(function ()
      {
         var type = 'typeahead',
            $this = $(this),
            data = $this.data(type),
            options = typeof option == 'object' && option;

         if (!data && option == 'destroy')
            return;

         if (!data)
            $this.data(type, (data = new Typeahead(this, type, options)));

         if (typeof option == 'string')
            data[option]();
      });
   }

   $.fn.typeahead.defaults = {
      source: [],
      items: 8,
      menu: '<div class="typeahead-container dropdown-menu"><ul></ul></div>',
      item: '<li><a href="#"></a></li>',
      showing: '<div class="showing"></div>',
      filterInput: '<input type="text" value="" class="" autocomplete="off">'
   }

   $.fn.typeahead.Constructor = Typeahead;


   /* TYPEAHEAD DATA-API
   * ================== */

   $(function ()
   {
      $('body').on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e)
      {
         var $this = $(this);
         if ($this.data('typeahead')) return;
         e.preventDefault();
         $this.typeahead($this.data());
      });
   });

}(window.jQuery);

/*
* [AG 29/5/2012] Variation on dismissing alerts so that the alert element is just hidden but not removed
* (because we may need to reuse it).
*/

/* ==========================================================
* bootstrap-alert.js v2.0.3
* http://twitter.github.com/bootstrap/javascript.html#alerts
* ==========================================================
* Copyright 2012 Twitter, Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* ========================================================== */


!function ($)
{
   "use strict"; // jshint


   /* ALERT CLASS DEFINITION
   * ====================== */

   var dismiss = '[data-dismiss="toggleable-alert"]'
    , Alert = function (el)
    {
       $(el).on('click', dismiss, this.close);
    }

   Alert.prototype.close = function (e)
   {
      var $this = $(this)
      , selector = $this.attr('data-target')
      , $parent;

      if (!selector)
      {
         selector = $this.attr('href');
         selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '');
         //strip for ie7
      }

      $parent = $(selector);

      e && e.preventDefault();

      $parent.length || ($parent = $this.hasClass('alert') ? $this : $this.parent());

      $parent.trigger(e = $.Event('close'));

      if (e.isDefaultPrevented()) return;

      $parent.removeClass('in');

      function hideElement()
      {
         $parent.hide();
      }

      $.support.transition && $parent.hasClass('fade') ?
      $parent.on($.support.transition.end, hideElement) :
      hideElement();
   }


   /* ALERT PLUGIN DEFINITION
   * ======================= */

   $.fn.alert = function (option)
   {
      return this.each(function ()
      {
         var $this = $(this)
        , data = $this.data('alert');
         if (!data) $this.data('alert', (data = new Alert(this)));
         if (typeof option == 'string') data[option].call($this);
      });
   }

   $.fn.alert.Constructor = Alert;


   /* ALERT DATA-API
   * ============== */

   $(function ()
   {
      $('body').on('click.alert.data-api', dismiss, Alert.prototype.close);
   });

}(window.jQuery);

/*
* [AG 28/04/2015] Add Bootstrap 3 events and add display parameter in toggle
*/
/* ============================================================
 * bootstrap-dropdown.js v2.0.4
 * http://twitter.github.com/bootstrap/javascript.html#dropdowns
 * ============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($)
{

   "use strict"; // jshint ;_;


   /* DROPDOWN CLASS DEFINITION
    * ========================= */

   var toggle = '[data-toggle="dropdown"]',
     Dropdown = function ()
     {
     }

   Dropdown.prototype = {

      constructor: Dropdown

      , toggle: function (display)
      {
         var $this = $(this)
           , $parent
           , isActive
           , e;

         if ($this.is('.disabled, :disabled')) return;

         $parent = getParent($this);

         isActive = $parent.hasClass('open');
         if (display != null && display === isActive) return;

         clearMenus();

         if (!isActive)
         {
            var relatedTarget = { relatedTarget: this };
            e = $.Event('show.bs.dropdown', relatedTarget);
            $parent.trigger(e);

            if (e.isDefaultPrevented()) return;

            $parent
               .toggleClass('open')
               .trigger('shown.bs.dropdown', relatedTarget);
         }
      },
      destroy: function ()
      {
         $(this).removeData('dropdown');
      }
   }

   function getParent($this)
   {
      var selector = $this.attr('data-target'),
         $parent;

      if (!selector)
      {
         selector = $this.attr('href');
         selector = selector && selector.replace(/.*(?=#[^\s]*$)/, ''); //strip for ie7
      }

      $parent = $(selector);
      $parent.length || ($parent = $this.parent());

      return $parent;
   }

   function clearMenus()
   {
      $(toggle).each(function ()
      {
         var $this = $(this),
            $parent = getParent($this),
            relatedTarget = { relatedTarget: this },
            e;

         if (!$parent.hasClass('open')) return;

         e = $.Event('hide.bs.dropdown', relatedTarget);
         $parent.trigger(e);

         if (e.isDefaultPrevented()) return;

         $parent.removeClass('open').trigger('hidden.bs.dropdown', relatedTarget);
      });
   }

   /* DROPDOWN PLUGIN DEFINITION
    * ========================== */

   $.fn.dropdown = function (option)
   {
      var remainingArguments = [].slice.call(arguments, 1);

      return this.each(function ()
      {
         var $this = $(this),
            data = $this.data('dropdown');

         if (!data && option == 'destroy') return;
         if (!data) $this.data('dropdown', (data = new Dropdown()));
         if (typeof option == 'string') data[option].apply($this, remainingArguments);
      });
   }

   $.fn.dropdown.Constructor = Dropdown;


   /* APPLY TO STANDARD DROPDOWN ELEMENTS
    * =================================== */

   $(function ()
   {
      $('html')
         .off('click.dropdown.data-api')
         .on('click.dropdown.data-api', clearMenus);

      $('body')
         .off('click.dropdown')
         .off('click.dropdown.data-api')
         .on('click.dropdown', '.dropdown form', function (e)
         {
            e.stopPropagation();
         })
         .on('click.dropdown.data-api', toggle, function ()
         {
            Dropdown.prototype.toggle.call(this);
            return false;
         });

      $('html')
         .off('mouseenter.dropdown.data-api', 'iframe')
         .on('mouseenter.dropdown.data-api', 'iframe', clearMenus);
   });

}(window.jQuery);