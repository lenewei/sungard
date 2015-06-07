var ag;
(function (ag) {
    (function (risk) {
        var workbookUrl = "/analytics/explorer";

        // Mixin methods for navigating back to workbooks in Explorer
        function setupNavigation(viewModel) {
            viewModel.navigateToWorkbook = function (item) {
                ag.utils.navToEntity(workbookUrl, { id: ko.unwrap(item.id) });
            };
        }
        risk.setupNavigation = setupNavigation;
        ;
    })(ag.risk || (ag.risk = {}));
    var risk = ag.risk;
})(ag || (ag = {}));
