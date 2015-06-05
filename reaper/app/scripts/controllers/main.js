'use strict';

/**
 * @ngdoc function
 * @name reaperApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the reaperApp
 */
angular.module('reaperApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
