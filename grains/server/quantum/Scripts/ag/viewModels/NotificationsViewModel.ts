/// <reference path="../../ts/global.d.ts" />
/// <reference path="../models/notifications.ts" />

module ag
{
   export class NotificationsViewModel extends SimpleViewModel
   {
      readGrid: GridViewModel;
      unreadGrid: GridViewModel;

      init(itemModel: any)
      {
         super.init(itemModel);

         this.unreadGrid = this.grids.unread;
         this.readGrid = this.grids.read;

         this.setupGetCellLinksForGrid(this.unreadGrid);
         this.setupGetCellLinksForGrid(this.readGrid);

         // Wrap the removeItem function on the unreadGrid,
         // when an item is removed refresh the readGrid
         var originalFn = this.unreadGrid.removeItem;
         this.unreadGrid.removeItem = (item) =>
         {
            PubSub.publishSync(Notifications.notificationDismissTopic, item);
            return $.Deferred().done();
         };

         // New notification has been recieved
         PubSub.subscribe(Notifications.notificationRecievedTopic, (message, notification) =>
         {
            // Filter out in-progress
            if (!notification.inProgress())
               this.unreadGrid.refresh();
         });

         // Notification has been dismissed
         PubSub.subscribe(Notifications.notificationDismissedTopic, (message, notification) =>
         {
            this.readGrid.refresh();
            this.unreadGrid.refresh();
         });
      }

      setupGetCellLinksForGrid(grid: GridViewModel)
      {
         grid.getCellLinks = (bindingContext) =>
         {
            var data = <Notification>bindingContext.$parent;

            if (!data.targetUrl)
               return [];

            // Notifications as a dataset have status converted to a string
            return ['<a href="#" data-bind="click: $root.openItem.bind($root)">' + strings.openItem + '</a>'];
         };
      }

      openItem(item: Notification)
      {
         this.net.getJson("get", { id: item.id }).done((result) =>
         {
            PubSub.publish(Notifications.notificationOpenItemTopic, new Notification(result.data));
         });         
      }
   }
} 