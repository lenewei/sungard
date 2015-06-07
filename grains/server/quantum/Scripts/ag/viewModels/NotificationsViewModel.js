/// <reference path="../../ts/global.d.ts" />
/// <reference path="../models/notifications.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var NotificationsViewModel = (function (_super) {
        __extends(NotificationsViewModel, _super);
        function NotificationsViewModel() {
            _super.apply(this, arguments);
        }
        NotificationsViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.unreadGrid = this.grids.unread;
            this.readGrid = this.grids.read;

            this.setupGetCellLinksForGrid(this.unreadGrid);
            this.setupGetCellLinksForGrid(this.readGrid);

            // Wrap the removeItem function on the unreadGrid,
            // when an item is removed refresh the readGrid
            var originalFn = this.unreadGrid.removeItem;
            this.unreadGrid.removeItem = function (item) {
                PubSub.publishSync(ag.Notifications.notificationDismissTopic, item);
                return $.Deferred().done();
            };

            // New notification has been recieved
            PubSub.subscribe(ag.Notifications.notificationRecievedTopic, function (message, notification) {
                // Filter out in-progress
                if (!notification.inProgress())
                    _this.unreadGrid.refresh();
            });

            // Notification has been dismissed
            PubSub.subscribe(ag.Notifications.notificationDismissedTopic, function (message, notification) {
                _this.readGrid.refresh();
                _this.unreadGrid.refresh();
            });
        };

        NotificationsViewModel.prototype.setupGetCellLinksForGrid = function (grid) {
            grid.getCellLinks = function (bindingContext) {
                var data = bindingContext.$parent;

                if (!data.targetUrl)
                    return [];

                // Notifications as a dataset have status converted to a string
                return ['<a href="#" data-bind="click: $root.openItem.bind($root)">' + ag.strings.openItem + '</a>'];
            };
        };

        NotificationsViewModel.prototype.openItem = function (item) {
            this.net.getJson("get", { id: item.id }).done(function (result) {
                PubSub.publish(ag.Notifications.notificationOpenItemTopic, new ag.Notification(result.data));
            });
        };
        return NotificationsViewModel;
    })(ag.SimpleViewModel);
    ag.NotificationsViewModel = NotificationsViewModel;
})(ag || (ag = {}));
