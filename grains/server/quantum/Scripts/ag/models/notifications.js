/// <reference path="../../ts/global.d.ts" />
var ag;
(function (ag) {
    "use strict";

    

    // Client-side object with some helpers
    var Notification = (function () {
        function Notification(notification) {
            this.handled = false;
            this.id = notification.id;
            this.title = notification.title;
            this.message = notification.message;
            this.status = notification.status;
            this.data = notification.data || {};
            this.timestamp = notification.timestamp;
            this.read = notification.read;
            this.targetUrl = notification.targetUrl;
            this.errors = notification.errors;
            this.pageId = this.data.pageId;
            this.categoryColour = notification.categoryColour;
        }
        // Is the notification intended for this page
        // (originally created by this page)
        Notification.prototype.isForCurrentPage = function () {
            return this.pageId === ag.utils.getPageIdToken();
        };

        // Can the current page action this notification
        Notification.prototype.pageCanAction = function () {
            return this.hasTargetUrl() && this.targetUrl.startsWith(window.location.pathname);
        };

        Notification.prototype.inProgress = function () {
            return !this.read && this.status === Notification.completedState;
        };

        Notification.prototype.hasErrors = function () {
            return $.isArray(this.errors) && this.errors.length > 0;
        };

        Notification.prototype.hasTargetUrl = function () {
            return !ag.isNullUndefinedOrEmpty(this.targetUrl);
        };

        Notification.prototype.isUnread = function () {
            return !this.read && !this.inProgress();
        };

        Notification.prototype.showResultImmediately = function () {
            return !!this.data.showResultImmediately;
        };
        Notification.completedState = 4;
        return Notification;
    })();
    ag.Notification = Notification;

    var Notifications = (function () {
        function Notifications(options) {
            if (typeof options === "undefined") { options = {}; }
            var _this = this;
            this.options = options;
            this.statuses = ["Information", "Success", "Warning", "Error", "In Progress"];
            this.statusIcons = ["icon-info-sign", "icon-ok-sign", "icon-warning-sign", "icon-exclamation-sign", "icon-info-sign"];
            this.hubHandlersInitialized = false;
            this.connectionAttempts = 0;
            // Reusing signalR defined connection states
            this.connecting = $.signalR.connectionState.connecting;
            this.connected = $.signalR.connectionState.connected;
            this.disconnected = $.signalR.connectionState.disconnected;
            // List of unread notifications
            this.unreadList = ko.observableArray([]);
            this.unreadCount = ko.observable(0);
            // List of in progress notifications
            this.inProgressList = ko.observableArray([]);
            // List of notifications already read/dismissed
            this.readList = ko.observableArray([]);
            // Will become configurable
            this.showRead = false;
            // Initial loading state
            this.isLoading = ko.observable(true);
            // Show the error dialog
            this.showErrorDialog = ko.observable(false);
            // The selected notification to display error information for
            this.errorNotification = {
                id: ko.observable(""),
                title: ko.observable(""),
                message: ko.observable(""),
                timestamp: ko.observable(""),
                targetUrl: ko.observable(""),
                errors: ko.observableArray([]),
                isUnread: ko.observable(true)
            };
            this.net = new ag.utils.Network({ area: "", controller: "notifications", postOnly: "", responseOnly: "" });
            this.debug = new ag.utils.DebugExtensions("Notifications", options.debug, true);

            this.supportsLocalStorage = ag.dom.supportsLocalStorage();

            this.initHub();
            this.initStorageMessageBus();

            this.unreadItemsExist = ko.computed(function () {
                return _this.unreadList().length > 0 || _this.unreadCount() > 0;
            });

            // Subscribe to topics that may be publish from other viewModels/components
            PubSub.subscribe(Notifications.notificationDismissTopic, function (message, item) {
                return _this.dismiss(item);
            });
            PubSub.subscribe(Notifications.notificationOpenItemTopic, function (message, item) {
                return _this.openItem(item);
            });

            $(window).on("unload", function () {
                // If we hold a connection notify when the window is
                // unloaded that connection is no longer present
                if (_this.isInstanceConnected())
                    _this.connectionStatus(_this.disconnected);
            });
        }
        Notifications.cleanUp = function () {
            // Remove any localStorage items we have set
            ag.Storage.removeItem(Notifications.storageRealTimeConnectionStatusTopic);
            ag.Storage.removeItem(Notifications.storageNotificationRecievedTopic);
            ag.Storage.removeItem(Notifications.storageNotificationUnreadCountTopic);
        };

        Notifications.prototype.initHubHandlers = function () {
            var _this = this;
            if (this.hubHandlersInitialized)
                return;

            // Create the hub
            this.hub = $.connection.notificationsHub;

            // Push
            this.hub.client.notify = function (notification) {
                _this.debug.log("notify pushed:", notification);

                _this.notify(notification);
                ag.Storage.setItem(Notifications.storageNotificationRecievedTopic, notification, true);
            };
            this.hub.client.updateUnreadCount = function (count) {
                _this.debug.log("updateUnreadCount pushed:", count);

                _this.updateUnreadCount(count);
                ag.Storage.setItem(Notifications.storageNotificationUnreadCountTopic, count);
            };
            this.hub.client.refreshUnreadCount = function () {
                _this.debug.log("refreshUnreadCount pushed");

                return _this.refreshUnreadCount().done(function (count) {
                    ag.Storage.setItem(Notifications.storageNotificationUnreadCountTopic, count);
                });
            };

            $.connection.hub.disconnected(function () {
                _this.debug.log("hub disconnected");
                _this.disconnectFromHub(false);
                _this.attemptReconnect();
            });

            $.connection.hub.reconnecting(function () {
                _this.debug.log("hub reconnecting");
                _this.debug.documentTitle("* * *");
            });

            this.hubHandlersInitialized = true;
        };

        Notifications.prototype.initHub = function () {
            var _this = this;
            this.debug.log("initialising hub");

            // If another browser instance/tab already has a connection we don't need one
            if (this.isAnyBrowserInstanceConnected()) {
                if (this.isInstanceConnected()) {
                    this.debug.log("already connected");
                    return;
                }

                this.debug.documentTitle("?");
                this.debug.log("connection detected, becoming slave");
                return;
            }

            try  {
                // Notify we are connecting
                this.connectionStatus(this.connecting);
                this.debug.documentTitle("* * *");

                this.initHubHandlers();

                //$.connection.hub.logging = true; /*options.debug*/
                // Start the connection.
                $.connection.hub.start().done(function (result) {
                    _this.debug.log("becoming master, connection created, hub started");
                    _this.debug.documentTitle("***");

                    // Notify we are now connected
                    _this.connectionStatus(_this.connected);
                    _this.connectionAttempts = 0;

                    try  {
                        // Init unread count
                        _this.hub.client.refreshUnreadCount();
                    } catch (e) {
                        _this.disconnectFromHub();
                        _this.debug.log("connection error after start", e);
                    }
                }).fail(function () {
                    _this.disconnectFromHub(false);
                    _this.debug.log("connection failure");
                });
            } catch (e) {
                this.disconnectFromHub(false);
                this.debug.log("connection error", e);
            }
        };

        Notifications.prototype.attemptReconnect = function () {
            var _this = this;
            // These timeout values don't quite work at the moment as the update
            // to connection status (by other tabs attempting to connect) causes the
            // attemptConnect to fire.
            var reconnectTimeouts = [3000, 6000, 12000, 24000], timeout = this.connectionAttempts < reconnectTimeouts.length ? reconnectTimeouts[this.connectionAttempts] : reconnectTimeouts[reconnectTimeouts.length - 1];

            // Attempt restart of connection in 3 seconds.
            if (!this.reconnectTimeout) {
                this.connectionAttempts++;

                this.reconnectTimeout = window.setTimeout(function () {
                    _this.debug.log("reconnect in progress");

                    window.clearTimeout(_this.reconnectTimeout);
                    _this.reconnectTimeout = undefined;
                    _this.initHub();
                }, timeout);

                this.debug.log("attempt reconnect in", timeout, "millseconds");
            }
        };

        Notifications.prototype.disconnectFromHub = function (stopConnection) {
            if (typeof stopConnection === "undefined") { stopConnection = true; }
            try  {
                this.connectionStatus(this.disconnected);
                this.debug.documentTitle("?");

                // Stop our connection
                if (stopConnection)
                    $.connection.hub.stop();
            } catch (e) {
            }
        };

        Notifications.prototype.initStorageMessageBus = function () {
            var _this = this;
            // If localStorage is not supported each browser tab/instance will have a connection,
            // for IE this works fine as it uses "foreverFrame" transport which does not consume
            // a connection from the concurrent connection limit.
            // "foreverFrame" is only supported on IE so cannot be used for
            // others to get around the connection limit issue.
            if (!this.supportsLocalStorage)
                return;

            var storageTopics = [
                Notifications.storageRealTimeConnectionStatusTopic,
                Notifications.storageNotificationRecievedTopic,
                Notifications.storageNotificationUnreadCountTopic
            ];

            this.storage = new ag.Storage({
                topics: storageTopics,
                itemChangedCallback: function (topic, data, dataPrevious) {
                    // Notification recieved
                    if (topic === Notifications.storageNotificationRecievedTopic) {
                        if (data)
                            _this.notify(data);

                        return;
                    }

                    // Unread Count updated
                    if (topic === Notifications.storageNotificationUnreadCountTopic) {
                        _this.updateUnreadCount(data);
                        return;
                    }

                    // Connection status changed
                    if (topic === Notifications.storageRealTimeConnectionStatusTopic) {
                        var status = _this.parseConnectionStatusFromStorage(data);
                        if (status === -1 || status == _this.disconnected)
                            _this.attemptConnect();

                        return;
                    }
                }
            });
        };

        Notifications.prototype.attemptConnect = function () {
            var _this = this;
            // After a random timeout (between 0 - 250ms) attempt to connect
            // other tabs will try to connect also so there could be a race
            // condition, the first tab that indicates "connecting" wins
            window.setTimeout(function () {
                _this.debug.log("attempting connection");
                _this.initHub();
            }, Math.round(Math.random() * 250));
        };

        Notifications.prototype.isInstanceConnected = function () {
            // Are we the connected instance
            return this.status === this.connecting || this.status === this.connected;
        };

        Notifications.prototype.isAnyBrowserInstanceConnected = function () {
            // If we're not using localStorage or we are using
            // WebSockets every browser instance will connect.
            if (!this.supportsLocalStorage)
                return false;

            // Check if another browser instance/tab already has a connection
            var status = this.connectionStatus();
            if (status == this.connecting || status == this.connected) {
                // Get the initial unread count from storage
                // as a connection will have updated it for us
                this.updateUnreadCount(ag.Storage.getItem(Notifications.storageNotificationUnreadCountTopic));
                return true;
            }

            return false;
        };

        Notifications.prototype.connectionStatus = function (status) {
            // Update both the localStorage connection status
            // and the local instance connection status
            if (arguments.length > 0) {
                this.status = status;
                if (status === this.disconnected) {
                    ag.Storage.removeItem(Notifications.storageRealTimeConnectionStatusTopic);
                } else {
                    // Update localStorage with current status, adding new Date().getTime() to ensure unique value
                    // and make sure storage event is fired always (won't fire for values that are the same)
                    ag.Storage.setItem(Notifications.storageRealTimeConnectionStatusTopic, this.createConnectionStatusForStorage(status));
                }

                return status;
            }

            var statusFromStorage = ag.Storage.getItem(Notifications.storageRealTimeConnectionStatusTopic);
            if (statusFromStorage)
                return this.parseConnectionStatusFromStorage(statusFromStorage);

            return null;
        };

        Notifications.prototype.parseConnectionStatusFromStorage = function (status) {
            if (ag.isNullOrUndefined(status))
                return -1;

            // connectionStatus is stored as 1.1406513814269
            // the first digit is the actual status
            if (_.isNumber(status))
                return Math.floor(status);

            return status.toString().substr(0, 1);
        };

        Notifications.prototype.createConnectionStatusForStorage = function (status) {
            return status + "." + new Date().getTime();
        };

        Notifications.prototype.notify = function (item) {
            // Convert to a Notification object
            var notification = new Notification(item);

            // Show Toast
            this.showToast(notification);

            // Let others know a notification has been recieved
            PubSub.publish(Notifications.notificationRecievedTopic, notification);

            // Update the list of notifications
            this.getList();
        };

        Notifications.prototype.updateUnreadCount = function (count) {
            this.unreadCount(count);
            this.getList();
        };

        Notifications.prototype.refreshUnreadCount = function () {
            return this.getUnreadCount();
        };

        Notifications.prototype.openItem = function (notification) {
            // Dismiss the notification
            this.dismiss(notification);

            // If there are errors display in dialog
            // and don't publish notification
            if (notification.hasErrors()) {
                var error = this.errorNotification;
                error.id(notification.id);
                error.title(notification.title);
                error.message(notification.message);
                error.timestamp(notification.timestamp);
                error.targetUrl(notification.targetUrl);
                error.errors(notification.errors);
                error.isUnread(notification.isUnread());

                this.showErrorDialog(true);
                return;
            }

            // Publish synchronously, allow a subscriber to handle it
            PubSub.publishSync(Notifications.notificationActionedTopic, notification);

            // If the notification was not handled by a subscriber
            // and there is a targetUrl navigate to it
            if (!notification.handled && notification.hasTargetUrl()) {
                // Make sure active checking doesn't navigation
                $.active = 0;

                // Navigate
                window.location.href = notification.targetUrl;
            }
        };

        Notifications.prototype.dismiss = function (notification) {
            // Optimistic, updating client-state
            this.unreadList.remove(notification);

            return this.net.postJson("dismiss", { id: ko.unwrap(notification.id) }).done(function () {
                PubSub.publish(Notifications.notificationDismissedTopic, notification);
            });
        };

        Notifications.prototype.dismissAll = function () {
            // Optimistic, updating client-state
            this.unreadList.removeAll();
            this.unreadCount(0);
            ag.Storage.setItem(Notifications.storageNotificationUnreadCountTopic, 0);

            this.net.postJson("dismissall", null).done(function () {
                PubSub.publish(Notifications.notificationDismissedTopic);
            });
        };

        // Is the notifications panel visible or not
        Notifications.prototype.isVisible = function () {
            return ag.dom.notificationsVisible();
        };

        Notifications.prototype.getUnreadCount = function () {
            var _this = this;
            // Pull
            return this.hub.server.getUnreadCount().done(function (count) {
                _this.unreadCount(count);
                _this.getList();
            });
        };

        Notifications.prototype.getStatusIcon = function (status) {
            return this.statusIcons[status];
        };

        Notifications.prototype.getStatusString = function (status) {
            return this.statuses[status];
        };

        Notifications.prototype.deferredGetList = function () {
            // Defer the load to allow events to complete in the UI
            _.defer(this.getList.bind(this));
        };

        Notifications.prototype.getList = function () {
            var _this = this;
            // Only update the list if we are visible
            // (unread count is updated independently)
            if (!this.isVisible())
                return;

            this.net.getJson("list", { includeRead: this.showRead }, false, false).done(function (result) {
                _this.updateLists(result);
                _this.isLoading(false);
            });
        };

        Notifications.prototype.updateLists = function (items) {
            if (!items || !items.length) {
                this.unreadList.removeAll();
                this.inProgressList.removeAll();
                this.readList.removeAll();
            }

            // Load items into Notification objects
            var notifications = items.map(function (item) {
                return new Notification(item);
            });

            // Unread and completed states only
            this.unreadList(_.where(notifications, function (item) {
                return item.isUnread();
            }));

            // In Progress items
            this.inProgressList(_.where(notifications, function (item) {
                return item.inProgress();
            }));

            // If we are showing Read items
            if (this.showRead)
                this.readList(_.where(notifications, function (item) {
                    return !item.isUnread();
                }));
        };

        Notifications.prototype.showToast = function (notification) {
            var _this = this;
            // Only want to show notifications in a completed state
            if (notification.inProgress())
                return;

            // Status of notifications and mapping to a toast function name
            var statusToToastMapping = ["info", "success", "warning", "error", "info"], toastFunction = statusToToastMapping[notification.status];

            // Make sure out mapped toast function exists
            if (!ag.toasts[toastFunction])
                throw Error("Unable to map Notification status to toast function.");

            // Add the notification Id and a click handler
            var overrides = {
                notificationId: notification.id,
                onclick: function () {
                    return _this.openItem(notification);
                },
                categoryColour: notification.categoryColour
            };

            // Toast'em!
            ag.toasts[toastFunction](notification.title, "", overrides);
        };
        Notifications.notificationOpenItemTopic = "notificationOpenItem";
        Notifications.notificationDismissTopic = "notificationDismiss";
        Notifications.notificationDismissedTopic = "notificationDismissed";
        Notifications.notificationRecievedTopic = "notificationRecieved";
        Notifications.notificationActionedTopic = "notificationActioned";
        Notifications.storageRealTimeConnectionStatusTopic = "realTimeConnectionStatus";
        Notifications.storageNotificationRecievedTopic = "storageBusNotificationRecieved";
        Notifications.storageNotificationUnreadCountTopic = "storageBusNotificationUnreadCount";

        Notifications.staticConstructor = (function () {
            // Cleanup fail safe, on logon cleanup
            // notification connection status
            PubSub.subscribe(ag.topics.Logon, function () {
                Notifications.cleanUp();
            });
        })();
        return Notifications;
    })();
    ag.Notifications = Notifications;
})(ag || (ag = {}));
