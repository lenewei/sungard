/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    var pluginName = "verticalFill", eventNamespace = "." + pluginName;

    var Plugin = (function () {
        function Plugin(element) {
            var _this = this;
            this.element = element;
            this.calculateAndSetHeight();

            $(window).on('resize' + eventNamespace, function () {
                return _this.setHeight();
            });
        }
        Plugin.prototype.calculateAndSetHeight = function () {
            $(this.element).height($(window).height()); // set document height to at least the window

            // height so that we can calculate the used height
            this.usedHeight = $(document).height() - $(window).height() - ($(this.element).outerHeight(true) - $(this.element).innerHeight());

            this.setHeight();
        };

        Plugin.prototype.setHeight = function () {
            $(this.element).height($(window).height() - this.usedHeight);
        };

        Plugin.prototype.destroy = function () {
            $(window).off(eventNamespace);
        };
        return Plugin;
    })();

    $.fn[pluginName] = function (option) {
        return this.each(function () {
            var $this = $(this), data = $this.data(pluginName);

            if (!data && option == 'destroy')
                return;
            if (!data)
                $this.data(pluginName, (data = new Plugin(this)));
            if (typeof option == 'string')
                data[option]();
        });
    };
})(ag || (ag = {}));
