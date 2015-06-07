/// <reference path="../../ts/global.d.ts" />

module ag
{
   "use strict";

   interface IHub
   {
      client: any;
      server: any;
   }

   // Description of what we get from the server
   export interface INotification
   {
      id: string;
      title: string;
      message?: string;
      status: number;
      data?: any;
      timestamp: string;
      read?: string;
      targetUrl?: string;
      errors: Array<string>;
      categoryColour?: string;
   }

   // Client-side object with some helpers
   export class Notification implements INotification
   {
      static completedState = 4;

      id: string;
      title: string;
      message: string;
      status: number;
      data: any;
      timestamp: string;
      read: string;
      targetUrl: string;
      pageId: string;
      errors: Array<string>;
      categoryColour: string;
      handled = false;

      constructor(notification: INotification)
      {
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
      isForCurrentPage()
      {
         return this.pageId === utils.getPageIdToken();
      }

      // Can the current page action this notification
      pageCanAction()
      {
         return this.hasTargetUrl() && this.targetUrl.startsWith(window.location.pathname);
      }

      inProgress()
      {
         return !this.read && this.status === Notification.completedState;
      }

      hasErrors()
      {
         return $.isArray(this.errors) && this.errors.length > 0;
      }

      hasTargetUrl()
      {
         return !isNullUndefinedOrEmpty(this.targetUrl);
      }

      isUnread()
      {
         return !this.read && !this.inProgress();
      }

      showResultImmediately()
      {
         return !!this.data.showResultImmediately;
      }
   }

   export interface INotificationsOptions
   {
      debug?: boolean
   }

   export class Notifications 
   {
      static notificationOpenItemTopic = "notificationOpenItem";
      static notificationDismissTopic = "notificationDismiss";
      static notificationDismissedTopic = "notificationDismissed";
      static notificationRecievedTopic = "notificationRecieved";
      static notificationActionedTopic = "notificationActioned";
      static storageRealTimeConnectionStatusTopic = "realTimeConnectionStatus";
      static storageNotificationRecievedTopic = "storageBusNotificationRecieved";
      static storageNotificationUnreadCountTopic = "storageBusNotificationUnreadCount";

      static cleanUp()
      {
         // Remove any localStorage items we have set
         Storage.removeItem(Notifications.storageRealTimeConnectionStatusTopic);
         Storage.removeItem(Notifications.storageNotificationRecievedTopic);
         Storage.removeItem(Notifications.storageNotificationUnreadCountTopic);
      }

      static staticConstructor = (() =>
      {
         // Cleanup fail safe, on logon cleanup 
         // notification connection status
         PubSub.subscribe(topics.Logon, () =>
         {
            Notifications.cleanUp();
         });
      })();

      // Our signalr hub proxy
      private hub: IHub;
      private statuses = ["Information", "Success", "Warning", "Error", "In Progress"];
      private statusIcons = ["icon-info-sign", "icon-ok-sign", "icon-warning-sign", "icon-exclamation-sign", "icon-info-sign"];
      private net: utils.Network;
      private debug: utils.DebugExtensions;
      private hubHandlersInitialized = false;
      private connectionAttempts = 0;

      // Reusing signalR defined connection states
      private connecting = $.signalR.connectionState.connecting;
      private connected = $.signalR.connectionState.connected;
      private disconnected = $.signalR.connectionState.disconnected;

      // List of unread notifications
      unreadList = ko.observableArray<Notification>([]);
      unreadCount = ko.observable(0);

      // List of in progress notifications
      inProgressList = ko.observableArray<Notification>([]);

      // List of notifications already read/dismissed
      readList = ko.observableArray<Notification>([]);

      // Will become configurable
      private showRead = false;

      // Initial loading state
      isLoading = ko.observable(true);

      // Are there any unread items
      unreadItemsExist: KnockoutComputed<boolean>;
      
      // Show the error dialog
      showErrorDialog = ko.observable(false);

      // The selected notification to display error information for
      errorNotification =
      {
         id: ko.observable(""),
         title: ko.observable(""),
         message: ko.observable(""),
         timestamp: ko.observable(""),
         targetUrl: ko.observable(""),
         errors: ko.observableArray([]),
         isUnread: ko.observable(true)
      };

      // Storage wrapper
      storage: Storage;

      // Status of this Notifications instance
      private status: number;

      // Does the current browser support localStorage or not
      private supportsLocalStorage: boolean;

      private reconnectTimeout: number;

      constructor(private options: INotificationsOptions = {})
      {
         this.net = new utils.Network({ area: "", controller: "notifications", postOnly: "", responseOnly: "" });
         this.debug = new utils.DebugExtensions("Notifications", options.debug, true);

         this.supportsLocalStorage = dom.supportsLocalStorage();

         this.initHub();
         this.initStorageMessageBus();

         this.unreadItemsExist = ko.computed(() =>
         {
            return this.unreadList().length > 0 || this.unreadCount() > 0;
         });

         // Subscribe to topics that may be publish from other viewModels/components
         PubSub.subscribe(Notifications.notificationDismissTopic, (message, item) => this.dismiss(item));
         PubSub.subscribe(Notifications.notificationOpenItemTopic, (message, item) => this.openItem(item));

         $(window).on("unload", () =>
         {
            // If we hold a connection notify when the window is 
            // unloaded that connection is no longer present
            if (this.isInstanceConnected())
               this.connectionStatus(this.disconnected);
         });
      }

      initHubHandlers()
      {
         if (this.hubHandlersInitialized)
            return;

         // Create the hub
         this.hub = (<any>$.connection).notificationsHub;

         // Push
         this.hub.client.notify = (notification: INotification) =>
         {
            this.debug.log("notify pushed:", notification);

            this.notify(notification);
            Storage.setItem(Notifications.storageNotificationRecievedTopic, notification, true);
         };
         this.hub.client.updateUnreadCount = (count: number) =>
         {
            this.debug.log("updateUnreadCount pushed:", count);

            this.updateUnreadCount(count);
            Storage.setItem(Notifications.storageNotificationUnreadCountTopic, count);
         };
         this.hub.client.refreshUnreadCount = () =>
         {
            this.debug.log("refreshUnreadCount pushed");

            return this.refreshUnreadCount().done(count => 
            {
               Storage.setItem(Notifications.storageNotificationUnreadCountTopic, count)                  
            });
         };

         $.connection.hub.disconnected(() =>
         {
            this.debug.log("hub disconnected");
            this.disconnectFromHub(false);
            this.attemptReconnect();
         });

         $.connection.hub.reconnecting(() =>
         {
            this.debug.log("hub reconnecting");
            this.debug.documentTitle("* * *");
         });

         this.hubHandlersInitialized = true;
      }
      
      initHub()
      {
         this.debug.log("initialising hub");

         // If another browser instance/tab already has a connection we don't need one
         if (this.isAnyBrowserInstanceConnected())
         {
            if (this.isInstanceConnected())
            {
               this.debug.log("already connected");
               return;
            }

            this.debug.documentTitle("?");
            this.debug.log("connection detected, becoming slave");
            return;
         }

         try
         {
            // Notify we are connecting
            this.connectionStatus(this.connecting);
            this.debug.documentTitle("* * *");

            this.initHubHandlers();            

            //$.connection.hub.logging = true; /*options.debug*/

            // Start the connection.
            $.connection.hub.start().done(result =>
            {
               this.debug.log("becoming master, connection created, hub started");
               this.debug.documentTitle("***");

               // Notify we are now connected
               this.connectionStatus(this.connected);
               this.connectionAttempts = 0;

               try
               {
                  // Init unread count
                  this.hub.client.refreshUnreadCount();
               }
               catch (e)
               {
                  this.disconnectFromHub();
                  this.debug.log("connection error after start", e);        
               }

            }).fail(() => 
            {
               this.disconnectFromHub(false);
               this.debug.log("connection failure");
            });
         }
         catch (e)
         {
            this.disconnectFromHub(false);
            this.debug.log("connection error", e);
         }
      }

      attemptReconnect()
      {
         // These timeout values don't quite work at the moment as the update 
         // to connection status (by other tabs attempting to connect) causes the
         // attemptConnect to fire.
         var reconnectTimeouts = [3000, 6000, 12000, 24000],
            timeout = this.connectionAttempts < reconnectTimeouts.length ? 
               reconnectTimeouts[this.connectionAttempts] : reconnectTimeouts[reconnectTimeouts.length - 1];

         // Attempt restart of connection in 3 seconds.
         if (!this.reconnectTimeout)
         {
            this.connectionAttempts++;

            this.reconnectTimeout = window.setTimeout(() => 
            {
               this.debug.log("reconnect in progress");

               window.clearTimeout(this.reconnectTimeout);
               this.reconnectTimeout = undefined;
               this.initHub();
            }, 
               timeout);

            this.debug.log("attempt reconnect in", timeout, "millseconds");
         }
      }

      disconnectFromHub(stopConnection = true)
      {
         try
         {
            this.connectionStatus(this.disconnected);
            this.debug.documentTitle("?");

            // Stop our connection
            if (stopConnection)
               $.connection.hub.stop();   
         }
         catch (e)
         { }
      }

      initStorageMessageBus()
      {
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

         this.storage = new Storage(
         {
            topics: storageTopics,
            itemChangedCallback: (topic: string, data: any, dataPrevious: any) =>
            {
               // Notification recieved
               if (topic === Notifications.storageNotificationRecievedTopic)
               {
                  if (data)
                     this.notify(<INotification>data);

                  return;
               }

               // Unread Count updated
               if (topic === Notifications.storageNotificationUnreadCountTopic)
               {
                  this.updateUnreadCount(data);
                  return;
               }

               // Connection status changed
               if (topic === Notifications.storageRealTimeConnectionStatusTopic)
               {
                  var status = this.parseConnectionStatusFromStorage(data);
                  if (status === -1 || status == this.disconnected)
                     this.attemptConnect();

                  return;
               }
            }
         });
      }

      private attemptConnect()
      {
         // After a random timeout (between 0 - 250ms) attempt to connect
         // other tabs will try to connect also so there could be a race 
         // condition, the first tab that indicates "connecting" wins
         window.setTimeout(() => 
         {
            this.debug.log("attempting connection");
            this.initHub();
         },
            Math.round(Math.random() * 250));
      }

      private isInstanceConnected()
      {
         // Are we the connected instance
         return this.status === this.connecting || this.status === this.connected;
      }

      private isAnyBrowserInstanceConnected() /* Change name to something like shouldCreateConnection */
      {
         // If we're not using localStorage or we are using 
         // WebSockets every browser instance will connect.
         if (!this.supportsLocalStorage /* || isUsingWebSockets() */)
            return false;

         // Check if another browser instance/tab already has a connection
         var status = this.connectionStatus();
         if (status == this.connecting || status == this.connected)
         {
            // Get the initial unread count from storage 
            // as a connection will have updated it for us
            this.updateUnreadCount(Storage.getItem(Notifications.storageNotificationUnreadCountTopic));
            return true;
         }

         return false;
      }

      private connectionStatus(status?: number): number
      {
         // Update both the localStorage connection status
         // and the local instance connection status
         if (arguments.length > 0)
         {
            this.status = status;
            if (status === this.disconnected)
            {
               Storage.removeItem(Notifications.storageRealTimeConnectionStatusTopic);
            }
            else
            {
               // Update localStorage with current status, adding new Date().getTime() to ensure unique value 
               // and make sure storage event is fired always (won't fire for values that are the same)
               Storage.setItem(Notifications.storageRealTimeConnectionStatusTopic, this.createConnectionStatusForStorage(status));
            }

            return status;
         }

         var statusFromStorage = Storage.getItem(Notifications.storageRealTimeConnectionStatusTopic);
         if (statusFromStorage)
            return this.parseConnectionStatusFromStorage(statusFromStorage);

         return null;
      }

      private parseConnectionStatusFromStorage(status: any): number
      {
         if (isNullOrUndefined(status))
            return -1;

         // connectionStatus is stored as 1.1406513814269
         // the first digit is the actual status
         if (_.isNumber(status))
            return Math.floor(status);

         return status.toString().substr(0, 1);
      }

      private createConnectionStatusForStorage(status: number): string
      {
         return status + "." + new Date().getTime();
      }

      public notify(item: INotification)
      {
         // Convert to a Notification object
         var notification = new Notification(item);

         // Show Toast
         this.showToast(notification);
            
         // Let others know a notification has been recieved
         PubSub.publish(Notifications.notificationRecievedTopic, notification);

         // Update the list of notifications
         this.getList();
      }

      public updateUnreadCount(count: number)
      {
         this.unreadCount(count);
         this.getList();
      }

      public refreshUnreadCount()
      {
         return this.getUnreadCount();
      }

      public openItem(notification: Notification)
      {
         // Dismiss the notification
         this.dismiss(notification);

         // If there are errors display in dialog 
         // and don't publish notification
         if (notification.hasErrors())
         {
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
         if (!notification.handled && notification.hasTargetUrl())
         {
            // Make sure active checking doesn't navigation
            $.active = 0;

            // Navigate
            window.location.href = notification.targetUrl;
         }
      }

      public dismiss(notification: Notification): JQueryPromise<any>
      {
         // Optimistic, updating client-state
         this.unreadList.remove(notification);

         return this.net.postJson("dismiss", { id: ko.unwrap(notification.id) }).done(() =>
         {
            PubSub.publish(Notifications.notificationDismissedTopic, notification);            
         });
      }
      
      public dismissAll()
      {
         // Optimistic, updating client-state
         this.unreadList.removeAll();
         this.unreadCount(0);
         Storage.setItem(Notifications.storageNotificationUnreadCountTopic, 0);

         this.net.postJson("dismissall", null).done(() =>
         {
            PubSub.publish(Notifications.notificationDismissedTopic);
         });
      }

      // Is the notifications panel visible or not
      private isVisible()
      {
         return dom.notificationsVisible();
      }

      private getUnreadCount()
      {
         // Pull
         return this.hub.server.getUnreadCount().done(count =>
         {
            this.unreadCount(count);
            this.getList();
         });
      }

      public getStatusIcon(status: number)
      {
         return this.statusIcons[status];
      }

      public getStatusString(status: number)
      {
         return this.statuses[status];
      }

      public deferredGetList()
      {
         // Defer the load to allow events to complete in the UI
         _.defer(this.getList.bind(this));
      }

      private getList()
      {
         // Only update the list if we are visible 
         // (unread count is updated independently)
         if (!this.isVisible())
            return;

         this.net.getJson("list", { includeRead: this.showRead }, false, false).done(result =>
         {
            this.updateLists(result);
            this.isLoading(false);
         });
      }

      private updateLists(items: INotification[])
      {
         if (!items || !items.length)
         {
            this.unreadList.removeAll();
            this.inProgressList.removeAll();
            this.readList.removeAll();
         }

         // Load items into Notification objects
         var notifications = items.map(item => new Notification(item));

         // Unread and completed states only
         this.unreadList(<any>_.where(notifications, item => item.isUnread()));

         // In Progress items
         this.inProgressList(<any>_.where(notifications, item => item.inProgress()));

         // If we are showing Read items
         if (this.showRead)
            this.readList(<any>_.where(notifications, item => !item.isUnread()));
      }

      private showToast(notification: Notification)
      {
         // Only want to show notifications in a completed state
         if (notification.inProgress())
            return;

         // Status of notifications and mapping to a toast function name
         var statusToToastMapping = ["info", "success", "warning", "error", "info"],
            toastFunction = statusToToastMapping[notification.status];

         // Make sure out mapped toast function exists
         if (!toasts[toastFunction])
            throw Error("Unable to map Notification status to toast function.");

         // Add the notification Id and a click handler
         var overrides: any =
         {
            notificationId: notification.id,
            onclick: () => this.openItem(notification),
            categoryColour: notification.categoryColour
         };

         // Toast'em!
         toasts[toastFunction](notification.title, "", overrides);
      }
   }
}