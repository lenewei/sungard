/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />
var ag;
(function (ag) {
    (function (contextMenu) {
        "use strict";

        function saveCellLinksData(element, links) {
            $(element).data("cellLinks", links);
        }
        contextMenu.saveCellLinksData = saveCellLinksData;

        function cellLinks(groups, value) {
            if (groups.length === 1 && groups[0].menuItems.length === 1)
                return $(groups[0].menuItems[0]).html(value);

            return '<div class="dropdown context-menu nav"><a class="dropdown-toggle" data-toggle="dropdown" href="#" onclick="ag.contextMenu.positionCellLinks(event)">{0}</a></div>'.format(value);
        }
        contextMenu.cellLinks = cellLinks;

        function positionPivotCellLinks(event) {
            var element = event.currentTarget, pivot = ko.dataFor(element), id = $(element).closest('a[data-id]').data("id"), links = pivot.pivotData[id].cellLinks;

            generateCellLinks(element, [{ menuItems: links }]);
            reposition(event);
        }
        contextMenu.positionPivotCellLinks = positionPivotCellLinks;

        function positionCellLinks(event) {
            var element = $(event.currentTarget), links = element.closest('td').data("cellLinks");

            generateCellLinks(event.currentTarget, links);
            reposition(event);
        }
        contextMenu.positionCellLinks = positionCellLinks;

        function generateCellLinks(element, groups) {
            return generateContextMenu(element, groups, function (menuItem) {
                return menuItem;
            });
        }

        function groupedMenu(value) {
            return '<div class="dropdown context-menu nav"><a class="dropdown-toggle" data-toggle="dropdown" href="#" onclick="ag.contextMenu.quickMenu(event)">{0}</a></div>'.format(value);
        }
        contextMenu.groupedMenu = groupedMenu;

        // Generate Quick Menu and put into the correct position
        function quickMenu(event) {
            var ctx = ko.contextFor(event.currentTarget), grid = ctx.$parents[2];

            // Generate quick menu group
            generateQuickMenuGroup(event.currentTarget, grid.quickMenuItems, grid[ctx.$parents[0].key()]);

            // reposition
            reposition(event);
        }
        contextMenu.quickMenu = quickMenu;

        function reposition(event) {
            var ele = $(event.currentTarget), positionLeft = ele.position().left, menuWidth = ele.siblings('ul').width(), leftOffset = $(document).width() - menuWidth - event.pageX, left = leftOffset < 0 ? positionLeft - menuWidth + ele.width() : positionLeft;

            ele.siblings('ul').css('left', left);
        }

        function generateQuickMenuGroup(element, groups, defaultMenuItem) {
            return generateContextMenu(element, groups, function (menuItem) {
                return '<a href="#" data-bind="command: $parents[2].quickMenuCommands.' + menuItem.action + 'Command" > ' + menuItem.displayName + ' </a>';
            }, defaultMenuItem);
        }

        function generateContextMenu(element, groups, generateLink, defaultMenuItem) {
            var elem = $(element);

            // If the ul list has been generated, we don't need to generate it again
            if (elem.siblings('ul.dropdown-menu').length > 0)
                return;

            // create menu template
            var menu = '<ul class="dropdown-menu" role="menu">';

            if (defaultMenuItem)
                menu += '<li>' + generateLink(defaultMenuItem) + '</li>';

            _.each(groups, function (group, index) {
                if (index > 0 || defaultMenuItem)
                    menu += '<li class="divider"></li>';

                if (group.name)
                    menu += '<li class="nav-header">' + group.name + '</li>';

                _.each(group.menuItems, function (menuItem) {
                    menu += '<li>' + generateLink(menuItem) + '</li>';
                });
            });

            menu += '</ul>';

            addMenuAndApplyContext(element, menu);
        }

        function addMenuAndApplyContext(element, menu) {
            var ulElem = $.parseHTML(menu), divElem = $(element).parent();

            // add into the dom
            $(divElem).append(ulElem);

            // apply binding context
            ko.applyBindingsToDescendants(ko.contextFor(element), divElem[0]);
        }
    })(ag.contextMenu || (ag.contextMenu = {}));
    var contextMenu = ag.contextMenu;
})(ag || (ag = {}));
