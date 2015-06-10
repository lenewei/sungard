/**
 * Created by seven on 6/6/2015.
 */
var hawk = angular.module('hawk');

hawk.controller('DealController', function ($scope, $resource, $ionicModal, $ionicPlatform, $cordovaBarcodeScanner, $state) {
    $scope.QR="";
    $scope.size = 250;
    $scope.correctionLevel = 'H';
    $scope.typeNumber = 30;
    $scope.inputMode = 'ALPHA_NUM';
    $scope.image = true;
    var dealResource = $resource("http://128.199.91.142:11111/fx/deal/:id");

    $scope.deal = {
        "dealNumber": "170",
        "ticketNumber": "54242 - 1",
        "instrument": "FX Forward - Time Option",
//        "dealType": "10090001",
        "counterparty": "CITIBANK",
        "entity": "Transactor - Level 2",
//        "facility": "",
        "faceValue": 6435000.0000,
        "currency": "USD",
        "otherCurrency": "AUD",
        "otherFaceValue": 10100000.0000,
        "spotRate": 0.64,
        "contractRate": 0.63712871,
        "forwardPoints": -28.7129,
//        "calculateBuyAmount": false,
        "dealDate": "2007-10-02T00:00:00+08:00",
        "startDate": "2007-10-02T00:00:00+08:00",
        "maturityDate": "2007-10-04T00:00:00+08:00",
        "term": 2
//        "nonBusinessDaySettlement": "10110002",
//        "counterpartyReference": "",
//        "counterpartyDealer": "",
//        "dealer": "baseline",
        //"strategy": "NONE",
        //"dealSet": "NONE",
        //"location": [
        //    "Canberra",
        //    "Sydney"
        //],
        //"eligibleForClearing": false,
        //"reportToTradeRepository": false,
        //"comments": ""
    }

    $scope.commitToCloud = function () {
        dealResource.save({id: 'No001'}, $scope.deal);
    }
    $scope.loadFromCloud = function () {
        dealResource.get({id: 'No001'}, function (result) {
            $scope.deal = result.data[0];
        }, function (err) {
            console.log(err + "---no--record");
        });
    }
    $scope.generateQRCode = function () {
        $scope.QR = angular.toJson($scope.deal);
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
                    $scope.deal = angular.fromJson(barcodeData.text);
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