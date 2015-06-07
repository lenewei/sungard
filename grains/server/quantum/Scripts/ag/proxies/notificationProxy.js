///// <reference path="../../ts/global.d.ts" />
///// <reference path="../helpers/proxy.ts" />
//module ag
//{
//   "use strict";
//   export class NotificationProxy extends ControllerProxy
//   {
//      hub: any;
//      addedCallback: Function;
//       //$.extend(NotificationProxy, new ControllerProxy());
//      constructor()
//      {
//         super();
//         //if ($.connections)
//         //{
//         //   this.hub = $.connections.notifications;
//         //   this.hub.added = (notification) =>
//         //   {
//         //      this.addedCallback && this.addedCallback(notification);
//         //   };
//         //}
//      }
//      list()
//      {
//         var data = {
//            notifications: [
//               {
//                  id: 1,
//                  error: false,
//                  description: "Saving FX Deal...",
//                  actionText: null,
//                  actionUrl: null,
//                  parameters: null,
//                  timestamp: "2012-10-01T10:27:22.096Z",
//                  viewed: false,
//                  recent: false
//               },
//               {
//                  id: 2,
//                  error: false,
//                  description: "Generating report Position Inquiry...",
//                  actionText: null,
//                  actionUrl: null,
//                  parameters: null,
//                  timestamp: "2012-10-01T09:27:22.096Z",
//                  viewed: false,
//                  recent: false
//               },
//               {
//                  id: 3,
//                  error: true,
//                  description: "Failed to save",
//                  actionText: "FX Deal",
//                  actionUrl: "/dealing/foreign-exchange",
//                  parameters: { edit: 1 },
//                  timestamp: "2012-10-01T08:27:22.096Z",
//                  viewed: false,
//                  recent: false
//               },
//               {
//                  id: 4,
//                  error: false,
//                  description: "Saved",
//                  actionText: "FX Deal 7552",
//                  actionUrl: "/dealing/foreign-exchange",
//                  parameters: { edit: 7552 },
//                  timestamp: "2012-10-01T07:27:22.096Z",
//                  viewed: false,
//                  recent: false
//               },
//               {
//                  id: 5,
//                  error: false,
//                  description: "Saved",
//                  actionText: "FX Deal 7551",
//                  actionUrl: "/dealing/foreign-exchange",
//                  parameters: { edit: 7552 },
//                  timestamp: "2012-10-01T06:27:22.096Z",
//                  viewed: false,
//                  recent: false
//               },
//               {
//                  id: 6,
//                  error: false,
//                  description: "Generated",
//                  actionText: "report Cashflow Inquiry",
//                  actionUrl: "/reporting/cashflows",
//                  parameters: { reportid: 126 },
//                  timestamp: "2012-10-01T06:27:22.096Z",
//                  viewed: true,
//                  recent: false
//               },
//               {
//                  id: 7,
//                  error: false,
//                  description: "Saved",
//                  actionText: "MM deal 5823",
//                  actionUrl: "/dealing/money-market",
//                  parameters: { edit: 5823 },
//                  timestamp: "2012-10-01T05:27:22.096Z",
//                  viewed: true,
//                  recent: false
//               }
//            ]
//         };
//         var deferred = $.Deferred();
//         return deferred.resolve({ data: data });
//         /*
//         var url = "/{0}/list".format(this.serviceUrl());
//         var params = {};
//         return this.net.postJson(url, params, callback);
//         */
//      }
//      remove(notification)
//      {
//         // Return a deferred with a slightly delayed resolution
//         var deferred = $.Deferred();
//         setTimeout(()=> { deferred.resolve(); } , 1000);
//         return deferred;
//         /*
//         var url = "/{0}/remove".format(this.serviceUrl());
//         var params = { id: notification.id};
//         this.net.postJson(url, params, callback);
//         */
//      }
//      cancel(notification)
//      {
//         // Return a deferred with a slightly delayed resolution
//         var deferred = $.Deferred();
//         setTimeout(()=> { deferred.resolve(); } , 1000);
//         return deferred;
//         /*
//         var url = "/{0}/cancel".format(this.serviceUrl());
//         var params = { id: notification.id };
//         this.net.postJson(url, params, callback);
//         */
//      }
//   }
//}
