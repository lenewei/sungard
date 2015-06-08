module ag.components
{
   function register(name: string, createViewModel: (params: any, component?: any) => any)
   {
      ko.components.register(name, { viewModel: { createViewModel: createViewModel }, template: { element: templateName(name) } });
   }

   function templateName(componentName: string): string
   {
      return componentName.toLowerCase().replace(/-(.)/g, (match, group1) =>
      {
         return group1.toUpperCase();
      }) + 'Template';
   }

   export function registerAll()
   {
      register('grid-configure', (params, component) =>
      {
         var viewModel = new ag.GridConfigureViewModel(params);
         ag.dom.init(component.element, viewModel);
         return viewModel;
      });

      register('search-box', params => params.viewModel);
      register('view-selector', params => params.viewModel);
   }
}