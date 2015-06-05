'use strict';

/**
 * @ngdoc function
 * @name reaperApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the reaperApp
 */
angular.module('reaperApp')
  .controller('AboutCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
