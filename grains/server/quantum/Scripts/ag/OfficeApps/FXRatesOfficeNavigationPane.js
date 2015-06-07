/// <reference path="../App.js" />

(function () {
   "use strict";

   var tableName = "Sheet1!Rates",
       bindingName = "Rates",
       binding;

   // The initialize function must be run each time a new page is loaded
   Office.initialize = function (reason) {
      $(document).ready(function () {
         app.initialize();

         $('#new').click(newRate);
         $('#open').click(openRate);
         $('#save').click(saveRate);
      });

      initializeBindings();
   };

   // Create the binding to the table on the spreadsheet.
   function initializeBindings() {

      Office.context.document.bindings.addFromNamedItemAsync(
        tableName,
        Office.BindingType.Table,
        { id: bindingName },
        function (results) {
           // Capture a reference to the binding
           binding = results.value;
        });
   }

   // Reads the current rate
   function newRate() {

   }

   // Reads the current rate
   function openRate() {
      //  $('.disable-while-sending').prop('disabled', true);

      var dataToPassToService = {
         RateType: $('#Domain_RateType').val(),
         Currency: $('#Domain_Currency').val(),
         RateDate: $('#Domain_RateDate').val()
      };
      $.ajax({
         url: '../../rates/fx-rate/edit?' + $.param(dataToPassToService),
         type: 'GET',
         contentType: 'application/json;charset=utf-8'
      }).done(function (data) {
         updateTable(data.data);

         app.showNotification('DONE', 'Rates retrieved');
      }).fail(function (status) {
         clearTable();
         app.showNotification('Error', status.errors);
      }).always(function () {
         $('.disable-while-sending').prop('disabled', false);
      });
   }

   // Reads the current rate
   function saveRate() {
      binding.getDataAsync(
      {
         startRow: 0,
         startColumn: 0,
         columnCount: 9
      },
      function (results) {
         var bindingData = results.value,
             fwdRates = [];

         for (var i = 1; i < bindingData.rows.length; i++) {
            var rowData = bindingData.rows[i];
            if (rowData[0] != '') {
               var newValue = {
                  TimeBand: rowData[0],
                  ForwardUserInput: rowData[1],
                  ForwardBidRate: rowData[2],
                  ForwardOfferRate: rowData[3],
                  ForwardDate: rowData[4],
                  ForwardDays: rowData[5],
                  ForwardHighRate: rowData[6],
                  ForwardLowRate: rowData[7],
                  ForwardCloseRate: rowData[8]
               };
               fwdRates.push(newValue);
            }

         }

         var dataToPassToService = {
            RateType: $('#Domain_RateType').val(),
            Currency: $('#Domain_Currency').val(),
            RateDate: $('#Domain_RateDate').val(),

            SpotRateInput: bindingData.rows[0][1],
            SpotBid: bindingData.rows[0][2],
            SpotOffer: bindingData.rows[0][3],
            SpotDate: bindingData.rows[0][4],
            SpotDays: bindingData.rows[0][5],
            SpotHigh: bindingData.rows[0][6],
            SpotLow: bindingData.rows[0][7],
            SpotClose: bindingData.rows[0][8],

            CurrentMode: $('#Domain_CurrentMode').val(),
            Stamp: $('#Domain_Stamp').val(),

            RateLineItems: fwdRates
         };

         $.ajax({
            url: '../../rates/fx-rate/edit',
            type: 'POST',
            data: JSON.stringify(dataToPassToService),
            contentType: 'application/json;charset=utf-8'
         }).done(function (data) {
            updateTable(data.data);
            app.showNotification('DONE', 'Rates retrieved');
         }).fail(function (status) {
            clearTable();
            if (status.errors != null)
               app.showNotification('Error', status.errors);
            else if (status.modelErrors != null)
               app.showNotification('Error', status.modelErrors);
         }).always(function () {
            $('.disable-while-sending').prop('disabled', false);
         });
      });
   }




   function clearTable() {
      // Insert the rate values into a new TableData object
      var rateData = new Office.TableData();

      rateData.rows = [];

      // Set the data into the columns of the table.
      binding.deleteAllDataValuesAsync();
   }

   // Update the TableData object referenced by the binding and then update the data in the table on the worksheet.
   function updateTable(data) {
      // Insert the rate values into a new TableData object
      var rateData = new Office.TableData(),
          newValues = [];

      //set the spot rate
      newValues.push(['SPOT', data.spotRateInput, data.spotBid, data.spotOffer, data.spotDate, data.spotDays, data.spotHigh, data.spotLow, data.spotClose]);

      $('#Domain_CurrentMode').val(data.currentMode);
      $('#Domain_Stamp').val(data.stamp);

      for (var i = 0; i < data.rateLineItems.data.length; i++) {
         var lineItem = data.rateLineItems.data[i],
             newValue = [lineItem.timeBand, lineItem.forwardUserInput, lineItem.forwardBidRate, lineItem.forwardOfferRate, lineItem.forwardDate, lineItem.forwardDays, lineItem.forwardHighRate, lineItem.forwardLowRate, lineItem.forwardCloseRate];

         newValues.push(newValue);
      }

      rateData.rows = newValues;

      // Set the data into the columns of the table.
      binding.setDataAsync(
        rateData,
        {
           coercionType: Office.CoercionType.Table,
           startColumn: 0,
           startRow: 0

        });
   }
})();