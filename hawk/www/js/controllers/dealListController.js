/**
 * Created by seven on 6/6/2015.
 */
var hawk = angular.module('hawk');

hawk.controller('DealListController', function ($scope,$resource) {
    var dealResource = $resource("http://128.199.91.142:11111/fx/deal/:id");
    dealResource.get(function (result) {
        $scope.dealList = result.data;
    }, function (error) {
        console.log("An error happened -> " + error);
    });

});