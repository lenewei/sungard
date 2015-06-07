module ag.dom.pivot
{
   var _documentWidth = 0,
      _documentHeight = 0;

   export function documentSizeHasChanged(): boolean
   {
      var width = $(document).width(),
         height = $(document).height();

      if (width !== _documentWidth || height !== _documentHeight)
         return true;

      return false;
   }

   export function updateDocumentSize(): void
   {
      _documentWidth = $(document).width();
      _documentHeight = $(document).height();;
   }
}
