/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    var Notification = (function () {
        function Notification(notification) {
            // Notification must have an ID
            if (!notification.id)
                throw new Error("Notification must have an ID");

            var props = $.extend({}, {
                id: null,
                error: false,
                description: null,
                actionText: null,
                actionUrl: null,
                parameters: null,
                timestamp: new Date().toISOString(),
                viewed: false,
                recent: false
            }, notification);

            ko.mapping.fromJS(props, {}, this);
        }
        return Notification;
    })();
    ag.Notification = Notification;

    // Create the "models" namespace
    (function (models) {
        var NotificationManager = (function () {
            function NotificationManager(options) {
                // Placeholder for callback for pushed notifications
                this.proxy = new ag.NotificationProxy();
                this.proxy.addedCallback = function (notification) {
                    if (options.addedCallback)
                        options.addedCallback(notification);
                };

                this.notifications = ko.mapping.fromJS([], {
                    key: function (item) {
                        return ko.unwrap(item.id);
                    },
                    create: function (item) {
                        return new ag.Notification(item.data);
                    }
                });
            }
            NotificationManager.prototype.add = function (notification) {
                this.notifications.push(new ag.Notification(notification));
            };

            NotificationManager.prototype.remove = function (notification) {
                var _this = this;
                var deferred = this.proxy.remove(ko.mapping.toJS(notification));

                deferred.done(function () {
                    _this.notifications.mappedRemove({ id: ko.unwrap(notification.id) });
                });
            };

            NotificationManager.prototype.cancel = function (notification) {
                var _this = this;
                var deferred = this.proxy.cancel(ko.mapping.toJS(notification));

                deferred.done(function () {
                    _this.notifications.mappedRemove({ id: ko.unwrap(notification.id) });
                });
            };

            NotificationManager.prototype.getAll = function () {
                var _this = this;
                // Start the process of retrieving all notifications
                var deferred = this.proxy.list();

                deferred.done(function (result) {
                    ko.mapping.fromJS(result.data.notifications, {}, _this.notifications);
                });

                return this.notifications;
            };
            return NotificationManager;
        })();
        models.NotificationManager = NotificationManager;
    })(ag.models || (ag.models = {}));
    var models = ag.models;
})(ag || (ag = {}));
