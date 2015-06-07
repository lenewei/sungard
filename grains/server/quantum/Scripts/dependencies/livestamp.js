// Livestamp.js / v1.1.2 / (c) 2012 Matt Bradley / MIT License
// Patched to fix issues https://github.com/mattbradley/livestampjs/issues/33 and https://github.com/mattbradley/livestampjs/issues/34
(function($, moment) {
  var updateInterval = 1e3,
      paused = false,
      livestamps = [],

  init = function() {
    livestampGlobal.resume();
  },

  prep = function($el, timestamp) {
    var oldData = $el.data('livestampdata');
    if (typeof timestamp == 'number')
      timestamp *= 1e3;

    $el.removeAttr('data-livestamp')
      .removeData('livestamp');

    timestamp = moment(timestamp);
    if (moment.isMoment(timestamp) && !isNaN(+timestamp)) {
      var newData = $.extend({ }, { 'original': $el.contents() }, oldData);
      newData.moment = moment(timestamp);

      $el.data('livestampdata', newData).empty();
      addLivestamps($el);
    }
  },

  addLivestamps = function (items) {
     $.each(items, function (idx, el) {
        if ($.inArray(el, livestamps) === -1)
           livestamps.push(el);
     });
  },

  removeLivestamps = function (items) {
     if (items.length) {
        livestamps = $.grep(livestamps, function (idx, el) {
           return $.inArray(el, items) !== -1;
        });
     }
  },

  run = function() {
    if (paused) return;
    livestampGlobal.update();
    setTimeout(run, updateInterval);
  },

  livestampGlobal = {
    update: function() {
      $('[data-livestamp]').each(function() {
        var $this = $(this);
        prep($this, $this.data('livestamp'));
      });

      var toRemove = [];
      $.each(livestamps, function(idx, el) {
        var $el = $(el),
            data = $el.data('livestampdata');

        if (data === undefined)
          toRemove.push(this);
        else if (moment.isMoment(data.moment)) {
          var from = $el.html(),
              to = data.moment.fromNow();

          if (from != to) {
            var e = $.Event('change.livestamp');
            $el.trigger(e, [from, to]);
            if (!e.isDefaultPrevented())
              $el.html(to);
          }
        }
      });

      removeLivestamps(toRemove);
    },

    pause: function() {
      paused = true;
    },

    resume: function() {
      paused = false;
      run();
    },

    interval: function(interval) {
      if (interval === undefined)
        return updateInterval;
      updateInterval = interval;
    }
  },

  livestampLocal = {
    add: function($el, timestamp) {
      if (typeof timestamp == 'number')
        timestamp *= 1e3;
      timestamp = moment(timestamp);

      if (moment.isMoment(timestamp) && !isNaN(+timestamp)) {
        $el.each(function() {
          prep($(this), timestamp);
        });
        livestampGlobal.update();
      }

      return $el;
    },

    destroy: function($el) {
      removeLivestamps($el);
      $el.each(function() {
        var $this = $(this),
            data = $this.data('livestampdata');

        if (data === undefined)
          return $el;

        $this
          .html(data.original ? data.original : '')
          .removeData('livestampdata');
      });

      return $el;
    },

    isLivestamp: function($el) {
      return $el.data('livestampdata') !== undefined;
    }
  };

  $.livestamp = livestampGlobal;
  $(init);
  $.fn.livestamp = function(method, options) {
    if (!livestampLocal[method]) {
      options = method;
      method = 'add';
    }

    return livestampLocal[method](this, options);
  };
})(jQuery, moment);
