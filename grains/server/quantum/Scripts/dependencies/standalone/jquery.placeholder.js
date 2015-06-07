(function ($)
{
   //id itterator if the inputs don't have ids
   var phid = 0;
   $.fn.placeholder = function ()
   {

      var isPlaceholderSupported = "placeholder" in document.createElement("input"),
	      isTextareaSupported = 'placeholder' in document.createElement('textarea'),
	      prototype = $.fn,
	      valHooks = $.valHooks,
	      hooks,
	      placeholder;
    
      // Do nothing if placeholder is support by browser
      if (isPlaceholderSupported && isTextareaSupported)
         return this;

      return this.bind({
         focus: function ()
         {
            $(this).parent().addClass("placeholder-focus");
         },
         blur: function ()
         {
            $(this).parent().removeClass("placeholder-focus");
         },
         "keyup input change": function ()
         {            
            $(this).parent().toggleClass("placeholder-changed", this.value !== "");
         }        
      }).each(function ()
      {
         var $this = $(this);

         //Adds an id to elements if absent
         if (!this.id) 
            this.id = "ph_" + (phid++);

         //Create input wrapper with label for placeholder. Also sets the for attribute to the id of the input if it exists.
         $('<span class="placeholderWrap"><label for="' + this.id + '">' + $this.attr('placeholder') + '</label></span>')
             .insertAfter($this)
             .append($this);

         // Disables default placeholder
         $this.attr("placeholder", "").keyup();
      });
   };

   // Default plugin invocation 
   $(function ()
   {
      // [AG 20/12/2012] Target placeholder polyfill to search boxes for now
      $("input[type='search'][placeholder]").placeholder();
   });

})(jQuery);