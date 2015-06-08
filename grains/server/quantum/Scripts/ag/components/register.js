var ag;
(function (ag) {
    (function (components) {
        function register(name, createViewModel) {
            ko.components.register(name, { viewModel: { createViewModel: createViewModel }, template: { element: templateName(name) } });
        }

        function templateName(componentName) {
            return componentName.toLowerCase().replace(/-(.)/g, function (match, group1) {
                return group1.toUpperCase();
            }) + 'Template';
        }

        function registerAll() {
            register('grid-configure', function (params, component) {
                var viewModel = new ag.GridConfigureViewModel(params);
                ag.dom.init(component.element, viewModel);
                return viewModel;
            });

            register('search-box', function (params) {
                return params.viewModel;
            });
            register('view-selector', function (params) {
                return params.viewModel;
            });
        }
        components.registerAll = registerAll;
    })(ag.components || (ag.components = {}));
    var components = ag.components;
})(ag || (ag = {}));
