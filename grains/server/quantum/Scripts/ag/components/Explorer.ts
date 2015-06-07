/// <reference path="explorerviewmodel.ts" />
/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />

module ag.components
{
   export interface IExplorerOption
   {
      modal: boolean;
      rootViewModel: any;
      lookupDisplayName: string;
      source: string;
      view: any;
      saveCallback: Function;
      postRequest: any;
      requestDataCallback: Function;
      optionsText: string;
      optionsTitle: string;
      mode: string;
      pageSize: number;
      target: any;
      viewModel: any;
      initialRequestDataCallback: Function;
      onAfterSave: Function;
      onBeforeSave: Function;
      onClose: Function;
      keyField: string; // Not sure we need this or not.
      additionalPayloadData: any;
      hintTarget: string;
      hintSource: string;
   }

   export class Explorer
   {
      viewModel: any;
      viewContainer: any;

      constructor(public options)
      {
         this.viewContainer = options.modal ? $('div[class*="modal explorer"]') : $('div[class*="inline explorer"]');

         // If we've already initialised the view model and container, return here
         if (options.modal)
         {
            this.viewModel = this.viewContainer && ko.dataFor(this.viewContainer[0]);

            if (this.viewModel)
               return;
         }
         else
         {
            // If the component is inline then we treat the viewContainer attached to the body as a template
            // to be cloned.
            if (this.viewContainer.length > 0)
            {
               this.viewContainer = this.viewContainer
                  .clone()
                  .appendTo($(options.container || 'body'))
                  .show();
            }
         }

         this.viewModel = new ag.components.ExplorerViewModel(options);

         // Bind our view model to the view container
         ko.applyBindings(this.viewModel, this.viewContainer[0]);

         // Add some grid behaviour
         // (duplicated here from ag.dom.js but required because the grid doesn't exist at initial page load)
         var _viewModel = this.viewModel;
         var _viewContainer = this.viewContainer;

         $(".items .grid", _viewContainer)
            .on("click", "th", function ()
            {
               // Sort on this column
               var context = ko.contextFor(this);
               _viewModel.sort(context);
            })
            .on("click", "tbody tr a, tbody tr .has-children", function (e)
            {
               var context = ko.contextFor(this);
               _viewModel.processParentSelection(context);
               e.stopPropagation();
               e.preventDefault();
            })
            .on("click", "tbody tr", function (event)
            {
               // If the associated item is selectable then process the click as a selection
               // otherwise see if we can drill down into the item.
               var context = ko.contextFor(this);
               if (context.$data.isSelectable === undefined || ko.unwrap(context.$data.isSelectable))
               {
                  var res = _viewModel.processItemSelection(context, event);

                  // Close the dialog if we've been instructed to do so and execute any callback after this has happened.
                  // (in some cases the callback might trigger a reuse of the explorer dialog while it's still open which
                  // we want to avoid).
                  if (res && res.close)
                  {
                     _viewContainer.modal('hide');

                     if (_viewModel.target)
                        _.delay(() => { _viewModel.target.focus(); }, 0);
                  }
               }
               else
               {
                  _viewModel.processParentSelection(context);
               }
            });

         // If the container is a modal dialog, wire up some events
         if (_viewContainer.hasClass('modal'))
         {
            _viewContainer.off('show').off('shown').off('hidden')
               .on('show', () =>
               {
                  // Reset the view model before the dialog loads
                  _viewModel.reset();
               })
               .on('shown', () =>
               {
                  // Initialise the view model after the modal has shown
                  _viewModel.init();

                  // Do some DOM-related view initialisation that the viewModel can't do
                  // [AG 14/9/2012] This presupposes that we have knowledge of the view content at this point 
                  $("input.search", _viewContainer).focus();
               })
               .on('destroy', () =>
               {
                  // Tidy up
                  _viewModel.onHide();
               });
         }
         else
         {
            // We're inline so set up our options and show the view now
            this.viewModel.setOptions(options);
            this.viewModel.init();
            this.viewContainer.show();
         }
      }

      toggle(toggleOpts)
      {
         if (!this.viewContainer)
            return;

         // Set the current search query if any
         if (toggleOpts.searchQuery)
            this.viewModel.search.text(toggleOpts.searchQuery);

         // Toggle visibility of the container if it's a modal
         if (this.viewContainer.hasClass('modal'))
         {
            this.viewModel.setOptions(toggleOpts);
            this.viewContainer.modal({ backdrop: false });
         }
      }
   }
}