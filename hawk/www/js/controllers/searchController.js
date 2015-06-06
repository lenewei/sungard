/**
 * Created by seven on 6/6/2015.
 */
var hawk = angular.module('hawk');

hawk.controller('SearchController', function ($scope, $ionicModal,$ionicPlatform,$cordovaBarcodeScanner,$state) {
    $scope.user = {
        firstName:"etet",
        lastName:"222",
        comments:"222"
    };

    $scope.generateQRCode = function () {
        $scope.QR = angular.toJson($scope.user);
    }

    $ionicModal.fromTemplateUrl('templates/QRCodeDialog.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.modal = modal;
    });
    $scope.openModal = function () {
        $scope.generateQRCode();
        $scope.modal.show();
    };
    $scope.closeModal = function () {
        $scope.modal.hide();
    };
    //Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function () {
        $scope.modal.remove();
    });
    // Execute action on hide modal
    $scope.$on('modal.hidden', function () {
        // Execute action
    });
    // Execute action on remove modal
    $scope.$on('modal.removed', function () {
        // Execute action
    });

    $ionicPlatform.ready(function () {
        $scope.scanBarcode = function () {
            $cordovaBarcodeScanner
                .scan()
                .then(function (barcodeData) {
                    // Success! Barcode data is here
                    //alert(barcodeData.text);
                    $scope.user = angular.fromJson(barcodeData.text);
                    console.log("Barcode Format -> " + barcodeData.format);
                    console.log("Cancelled -> " + barcodeData.cancelled);
                }, function (error) {
                    // An error occurred
                    console.log("An error happened -> " + error);
                });
        }

        $scope.enCodeBarcode = function () {
            // NOTE: encoding not functioning yet
            $cordovaBarcodeScanner
                .encode(BarcodeScanner.Encode.TEXT_TYPE, "http://www.nonumber1989.com")
                .then(function (success) {
                    // Success!
                }, function (error) {
                    // An error occurred
                });
        }
    });
});