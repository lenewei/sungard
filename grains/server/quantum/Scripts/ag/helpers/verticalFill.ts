/// <reference path="../../ts/global.d.ts" />

module ag
{
   var pluginName = "verticalFill",
      eventNamespace = "." + pluginName;

   class Plugin
   {
      private usedHeight: number;

      constructor(private element)
      {
         this.calculateAndSetHeight();

         $(window).on('resize' + eventNamespace, () => this.setHeight());
      }

      private calculateAndSetHeight()
      {
         $(this.element).height($(window).height()); // set document height to at least the window 
                                                     // height so that we can calculate the used height

         this.usedHeight = $(document).height() - $(window).height() - ($(this.element).outerHeight(true) - $(this.element).innerHeight());

         this.setHeight();
      }

      private setHeight()
      {
         $(this.element).height($(window).height() - this.usedHeight);
      }

      public destroy()
      {
         $(window).off(eventNamespace);
      }
   }

   $.fn[pluginName] = function(option)
   {
      return this.each(function()
      {
         var $this = $(this),
            data = $this.data(pluginName);

         if (!data && option == 'destroy') return;
         if (!data) $this.data(pluginName, (data = new Plugin(this)));
         if (typeof option == 'string') data[option]();
      });
   }
}