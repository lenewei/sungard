/// <reference path="../../ts/global.d.ts" />
/// <reference path="../ag.ts" />

module ag.contextMenu
{
   "use strict";

   export interface IContextMenuGroup
   {
      name?: string;
      menuItems: any[];
   }

   export function saveCellLinksData(element, links)
   {
      $(element).data("cellLinks", links);
   }

   export function cellLinks(groups: any[], value: string): any
   {
      if (groups.length === 1 && groups[0].menuItems.length === 1)
         return $(groups[0].menuItems[0]).html(value);

      return '<div class="dropdown context-menu nav"><a class="dropdown-toggle" data-toggle="dropdown" href="#" onclick="ag.contextMenu.positionCellLinks(event)">{0}</a></div>'.format(value);
   }

   export function positionPivotCellLinks(event)
   {
      var element = event.currentTarget,
         pivot = ko.dataFor(element),
         id = $(element).closest('a[data-id]').data("id"),
         links = pivot.pivotData[id].cellLinks;

      generateCellLinks(element, [{ menuItems: links }]);
      reposition(event);
   }

   export function positionCellLinks(event)
   {
      var element = $(event.currentTarget),
         links = element.closest('td').data("cellLinks");

      generateCellLinks(event.currentTarget, links);
      reposition(event);
   }

   function generateCellLinks(element: HTMLElement, groups: any[])
   {
      return generateContextMenu(element, groups, (menuItem: any) =>
      {
         return menuItem;
      });
   }

   export function groupedMenu(value: string): any
   {
      return '<div class="dropdown context-menu nav"><a class="dropdown-toggle" data-toggle="dropdown" href="#" onclick="ag.contextMenu.quickMenu(event)">{0}</a></div>'.format(value);
   }

   // Generate Quick Menu and put into the correct position
   export function quickMenu(event)
   {
      var ctx = ko.contextFor(event.currentTarget),
         grid = ctx.$parents[2];

      // Generate quick menu group
      generateQuickMenuGroup(event.currentTarget, grid.quickMenuItems, grid[ctx.$parents[0].key()]);

      // reposition
      reposition(event);
   }

   function reposition(event)
   {
      var ele = $(event.currentTarget),
         positionLeft = ele.position().left,
         menuWidth = ele.siblings('ul').width(),
         leftOffset = $(document).width() - menuWidth - event.pageX,
         left = leftOffset < 0 ? positionLeft - menuWidth + ele.width() : positionLeft;

      ele.siblings('ul').css('left', left);
   }

   function generateQuickMenuGroup(element: any, groups: any[], defaultMenuItem: any)
   {
      return generateContextMenu(element, groups, (menuItem: any) =>
      {
         return '<a href="#" data-bind="command: $parents[2].quickMenuCommands.' + menuItem.action + 'Command" > ' + menuItem.displayName + ' </a>';
      },
      defaultMenuItem);
   }

   function generateContextMenu(element: any, groups: any[], generateLink: (any) => string, defaultMenuItem?: any)
   {
      var elem = $(element);

      // If the ul list has been generated, we don't need to generate it again
      if (elem.siblings('ul.dropdown-menu').length > 0)
         return;

      // create menu template
      var menu = '<ul class="dropdown-menu" role="menu">';

      if (defaultMenuItem)
         menu += '<li>' + generateLink(defaultMenuItem) + '</li>';

      _.each(groups, (group: any, index?) =>
      {
         if (index > 0 || defaultMenuItem)
            menu += '<li class="divider"></li>';

         if (group.name)
            menu += '<li class="nav-header">' + group.name + '</li>';

         _.each(group.menuItems, (menuItem: any) =>
         {
            menu += '<li>' + generateLink(menuItem) + '</li>';
         });
      });

      menu += '</ul>';

      addMenuAndApplyContext(element, menu);
   }

   function addMenuAndApplyContext(element: any, menu: string)
   {
      var ulElem = $.parseHTML(menu),
         divElem = $(element).parent();

      // add into the dom
      $(divElem).append(ulElem);

      // apply binding context
      ko.applyBindingsToDescendants(ko.contextFor(element), divElem[0]);
   }
}