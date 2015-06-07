/// <reference path="./office.ts" />
var ag;
(function (ag) {
    (function (staticDataUpload) {
        var Office = Microsoft.Office.WebExtension;

        var StaticDataType = (function () {
            function StaticDataType(name, controller, area) {
                this.name = name;
                this.controller = controller;
                this.area = area;
                this.filters = {};
                if (!controller)
                    this.controller = name.toLowerCase();

                if (!area)
                    this.area = "static";
            }
            StaticDataType.prototype.fullName = function () {
                return this.name + "!" + this.name;
            };
            return StaticDataType;
        })();
        staticDataUpload.StaticDataType = StaticDataType;

        function updatePayloadWithChildObject(payload, name, value) {
            var colonIndex = name.indexOf(':');
            var parentName = name.substring(0, colonIndex).toCamelCase(), childName = name.substring(colonIndex + 1).toCamelCase();
            if (!payload[parentName])
                payload[parentName] = {};

            payload[parentName][childName] = value;
        }
        staticDataUpload.updatePayloadWithChildObject = updatePayloadWithChildObject;

        function getPayload(properties, row, isHeader) {
            if (typeof isHeader === "undefined") { isHeader = false; }
            var payload = {};
            _.each(properties, function (property, index) {
                var dataType = property.dataType, name = property.name, value = row[index];

                if (dataType == "Date" && value != '')
                    value = ag.office.getDateFromExcelDate(value);

                if (dataType == "Boolean" && value != '')
                    value = value == 'Y';

                if (dataType == "Integer" && value == '')
                    value = 0;

                if (name.startsWith("AnalysisCode.")) {
                    var analysisCodesName = "analysisCodes";
                    if (!payload[analysisCodesName])
                        payload[analysisCodesName] = [];

                    payload[analysisCodesName].push({ name: name.substring(13), value: value });
                } else {
                    var index = name.indexOf('.');
                    if (index >= 0)
                        name = name.substring(index + 1);

                    var colonIndex = name.indexOf(':');
                    if (colonIndex >= 0) {
                        updatePayloadWithChildObject(payload, name, value);
                    } else {
                        payload[name.toCamelCase()] = value;
                    }
                }
            });

            if (isHeader)
                payload['stamp'] = -1;

            return payload;
        }
        staticDataUpload.getPayload = getPayload;

        function getPropertyNamesAndTypes(type) {
            return $.when(ag.office.getDataFromBinding(type.propertyNameBinding), ag.office.getDataFromBinding(type.dataTypeBinding), ag.office.getDataFromBinding(type.keyBinding)).then(function (names, types, keyValues) {
                var propertyNames = names[0], dataTypes = types[0], keys = keyValues[0], length = Math.min(propertyNames.length, dataTypes.length), result = [];
                for (var i = 0; i < length; i++) {
                    result.push({ name: propertyNames[i], dataType: dataTypes[i], isKey: keys[i] == 'Key' });
                }
                return result;
            });
        }
        staticDataUpload.getPropertyNamesAndTypes = getPropertyNamesAndTypes;

        function getCollections(propertyNames) {
            var collections = [], collectionNames = [];

            _.each(propertyNames, function (property, index) {
                var name = property.name, dotIndex = name.indexOf('.');
                if (dotIndex >= 0) {
                    var name = name.substring(0, dotIndex);
                    if (!_.contains(collectionNames, name) && name != 'AnalysisCode') {
                        collectionNames.push(name);
                        collections.push({ name: name, index: index, fieldCount: _.filter(propertyNames, function (p) {
                                return p.name.startsWith(name + '.');
                            }).length });
                    }
                }
            });

            return collections;
        }
        staticDataUpload.getCollections = getCollections;

        function mapDownloadData(properties, result) {
            // Add the message property in
            properties.push({ name: "Message" });

            // Get the keys of the properties(columns)
            var propertyKeys = _.map(properties, "name");

            // Map the data based on the spreadsheet
            return _.map(result.data, function (item) {
                var row = [];
                _.each(propertyKeys, function (key) {
                    var key = key.toCamelCase();

                    // Match properties(columns) to the returned dataset,
                    // when no match found enter an empty string.
                    row.push(item.hasOwnProperty(key) ? item[key] : "");
                });
                return row;
            });
        }
        staticDataUpload.mapDownloadData = mapDownloadData;

        function addMatrixBinding(typeName, row, lastColumnName, id) {
            return ag.office.addFromNamedItem(ag.office.getRangeAddress(typeName, "B", row, lastColumnName, row), Office.BindingType.Matrix, { id: typeName + id });
        }
        staticDataUpload.addMatrixBinding = addMatrixBinding;

        function modifySelection(selection, headerLength) {
            var rowCount = selection.rowCount, binding = selection.binding;
            return ag.office.getTableData(binding).then(function (result) {
                var modifiedStartRow, modifiedRowCount, rows = result.rows, deferred = $.Deferred();
                for (var i = selection.startRow; i < rows.length; i++) {
                    if (typeof modifiedStartRow === 'undefined') {
                        if (rowHasValue(rows[i], headerLength))
                            modifiedStartRow = i;
                    }

                    if (typeof modifiedRowCount === 'undefined' && i >= rowCount - 1 + selection.startRow) {
                        if (!rows[i + 1] || rowHasValue(rows[i + 1], headerLength))
                            modifiedRowCount = i + 1 - selection.startRow;
                    }
                }

                if (typeof modifiedStartRow != 'undefined' && typeof modifiedRowCount != 'undefined') {
                    deferred.resolve({ startRow: modifiedStartRow, rowCount: modifiedRowCount });
                } else
                    deferred.reject();

                return deferred.promise().then(function (selection) {
                    var startRow = 9 + modifiedStartRow, range = ag.office.getRangeAddress(binding.id, "B", startRow, ag.office.getColumnNameFromNumber(binding.columnCount + 1), startRow + modifiedRowCount - 1);
                    ag.office.goTo(range);
                    return selection;
                });
            });
        }
        staticDataUpload.modifySelection = modifySelection;

        function rowHasValue(row, headerLength) {
            for (var i = 1; i <= headerLength; i++) {
                if (row[i] != '')
                    return true;
            }

            return false;
        }
        staticDataUpload.rowHasValue = rowHasValue;

        function getAction(status, isDelete) {
            if (typeof isDelete === "undefined") { isDelete = false; }
            if (isDelete)
                return 'delete';

            if (status == '' || status == 'Insert Error' || status == 'Deleted')
                return 'create';

            return 'edit';
        }
        staticDataUpload.getAction = getAction;

        function successMessage(action) {
            if (action == 'delete')
                return 'Deleted';

            if (action == 'create')
                return 'Inserted';

            return 'Updated';
        }
        staticDataUpload.successMessage = successMessage;

        function errorMessage(action) {
            if (action == 'delete')
                return 'Delete Error';

            if (action == 'create')
                return 'Insert Error';

            return 'Update Error';
        }
        staticDataUpload.errorMessage = errorMessage;

        function getStaticDataUploadTypes() {
            return [
                new StaticDataType('Currency'),
                new StaticDataType("CurrencyControl"),
                new StaticDataType("Country"),
                new StaticDataType("Location"),
                new StaticDataType("Calendar", 'businessdaycalendar'),
                new StaticDataType("Entity"),
                new StaticDataType("CounterpartyType"),
                new StaticDataType("Counterparty"),
                new StaticDataType("CounterpartyContact"),
                new StaticDataType("CounterpartyRating"),
                new StaticDataType("ExternalMethod"),
                new StaticDataType('BankAccount', 'CashAccount'),
                new StaticDataType('StockAccount'),
                new StaticDataType('BrokerAccount'),
                new StaticDataType('CounterpartyBankAccount'),
                new StaticDataType('CounterpartyStockAccount'),
                new StaticDataType('BankAccountRule', null, 'rules'),
                new StaticDataType('BrokerAccountRule', null, 'rules'),
                new StaticDataType('StockAccountRule', null, 'rules'),
                new StaticDataType('User'),
                new StaticDataType('UserGroup'),
                new StaticDataType('CounterpartyBankAccountRule', 'counterpartycashaccountrule', 'rules'),
                new StaticDataType('CounterpartyStockAccountRule', null, 'rules'),
                new StaticDataType('LimitsDefinition', 'Limits', 'analytics')
            ];
        }
        staticDataUpload.getStaticDataUploadTypes = getStaticDataUploadTypes;
        function getRatesTransferTypes() {
            return [
                new StaticDataType('FX', 'FXRate', 'rates'),
                new StaticDataType('FXVolatility', 'FXVolatilityRate', 'rates'),
                new StaticDataType('DealMargin', 'DealMargin', 'rates'),
                new StaticDataType('IssuerInstrument', 'IssuerInstrumentRate', 'rates'),
                new StaticDataType('IssuerInstrumentMargin', 'IssuerInstrumentMargin', 'rates'),
                new StaticDataType('Yield', 'YieldRate', 'rates'),
                new StaticDataType('InterestRateOptionVolatility', 'InterestRateOptionVolatilityRate', 'rates'),
                new StaticDataType('ExchangeTradedOption', 'EtoRate', 'rates'),
                new StaticDataType('Futures', 'FuturesRate', 'rates'),
                new StaticDataType('FXVolatility', 'FXVolatilityRate', 'rates'),
                new StaticDataType('ZeroCurveDefinition', 'ZeroCurveDefinition', 'rates'),
                new StaticDataType('ETOVolatility', 'EtoVolatilityRate', 'rates'),
                new StaticDataType('SwaptionVolatility', 'SwaptionVolatilityRate', 'rates'),
                new StaticDataType('AccountInterest', 'AccountInterestRate', 'rates'),
                new StaticDataType('IssuerInstrumentMargin', 'IssuerInstrumentMargin', 'rates'),
                new StaticDataType('DealMargin', 'DealMargin', 'rates'),
                new StaticDataType('Index', 'IndexRate', 'rates'),
                new StaticDataType('ZeroCurve', 'ZeroCurveDefinition', 'rates'),
                new StaticDataType('CapFloorVolatility', 'capfloorvolatility-analytics', 'rates'),
                new StaticDataType('Correlation', 'correlation-analytics', 'rates'),
                new StaticDataType('DealMargin_Analytics', 'dealrevalmargin-analytics', 'rates'),
                new StaticDataType('FRA', 'fra-analytics', 'rates'),
                new StaticDataType('FuturesOptionVolatility', 'futureoptionvolatility-analytics', 'rates'),
                new StaticDataType('Futures_Analytics', 'futures-analytics', 'rates'),
                new StaticDataType('FuturesOption', 'futuresoption-analytics', 'rates'),
                new StaticDataType('FX_Analytics', 'fx-analytics', 'rates'),
                new StaticDataType('FXVolatility_Analytics', 'fxvolatility-analytics', 'rates'),
                new StaticDataType('Index_Analytics', 'index-analytics', 'rates'),
                new StaticDataType('Security', 'security-analytics', 'rates'),
                new StaticDataType('SecurityMargin', 'securitymargin-analytics', 'rates'),
                new StaticDataType('SecurityVolatility', 'securityvolatility-analytics', 'rates'),
                new StaticDataType('SwaptionVolatility_Analytics', 'swaptionvolatility-analytics', 'rates'),
                new StaticDataType('UnitPrice', 'unitissue-analytics', 'rates'),
                new StaticDataType('YieldMargin', 'YieldMargin-analytics', 'rates'),
                new StaticDataType('Yield_Analytics', 'Yield-analytics', 'rates')
            ];
        }
        staticDataUpload.getRatesTransferTypes = getRatesTransferTypes;
    })(ag.staticDataUpload || (ag.staticDataUpload = {}));
    var staticDataUpload = ag.staticDataUpload;
})(ag || (ag = {}));
