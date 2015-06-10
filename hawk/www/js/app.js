// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'hawk' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'hawk.controllers' is found in controllers.js
angular.module('hawk', ['ionic', 'ngCordova', 'ngResource', 'ngStorage', 'pascalprecht.translate', 'angular-jwt', 'ja.qr'])

    .run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });
    })

    .config(function ($stateProvider, $urlRouterProvider) {
        $stateProvider

            .state('app', {
                url: "/app",
                abstract: true,
                templateUrl: "templates/menu.html",
                controller: 'HawkController'
            })

            .state('app.dealLists', {
                url: "/deal",
                views: {
                    'menuContent': {
                        templateUrl: "templates/dealList.html",
                        controller: 'DealListController'
                    }
                }
            })
            .state('app.deal', {
                url: "/deal/:id",
                views: {
                    'menuContent': {
                        templateUrl: "templates/deal.html",
                        controller: 'DealController'
                    }
                }
            });
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app/deal');
    });
