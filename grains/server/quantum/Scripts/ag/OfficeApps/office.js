var ag;
(function (ag) {
    (function (office) {
        var Office = Microsoft.Office.WebExtension;

        function initialize() {
            return $.Deferred(function (deferred) {
                // The initialize function must be run each time a new page is loaded
                Office.initialize = function (reason) {
                    deferred.resolve();
                };
            }).promise();
        }
        office.initialize = initialize;

        function addTable(name, id) {
            return addFromNamedItem(name, Office.BindingType.Table, { id: id });
        }
        office.addTable = addTable;

        function initializeTableBinding(name, id) {
            return $.Deferred(function (deferred) {
                // The initialize function must be run each time a new page is loaded
                Office.initialize = function (reason) {
                    addFromNamedItem(name, Office.BindingType.Table, { id: id }).then(function (value) {
                        return deferred.resolve(value);
                    });
                };
            }).promise();
        }
        office.initializeTableBinding = initializeTableBinding;

        function goTo(name) {
            return $.Deferred(function (d) {
                return Office.context.document.goToByIdAsync(name, Office.GoToType.NamedItem, handleCallback(d));
            }).promise();
        }
        office.goTo = goTo;

        function getDateFromExcelDate(excelDate) {
            return new Date((excelDate - 25569) * 86400000);
        }
        office.getDateFromExcelDate = getDateFromExcelDate;

        function getRangeAddress(sheet, startColumn, startRow, endColumn, endRow) {
            return sheet + "!" + startColumn + startRow + ":" + endColumn + endRow;
        }
        office.getRangeAddress = getRangeAddress;

        function getColumnNameFromNumber(columnNumber) {
            var dividend = columnNumber, columnName = '', modulo;

            while (dividend > 0) {
                modulo = (dividend - 1) % 26;
                columnName = String.fromCharCode(65 + modulo).toString() + columnName;
                dividend = parseInt(((dividend - modulo) / 26).toString());
            }

            return columnName;
        }
        office.getColumnNameFromNumber = getColumnNameFromNumber;

        function addFromNamedItem(itemName, bindingType, options) {
            return $.Deferred(function (d) {
                return Office.context.document.bindings.addFromNamedItemAsync(itemName, bindingType, options, handleCallback(d));
            }).promise();
        }
        office.addFromNamedItem = addFromNamedItem;

        function getData(selector) {
            return $.Deferred(function (d) {
                return Office.select(selector, d.reject).getDataAsync(handleCallback(d));
            }).promise();
        }
        office.getData = getData;

        function getDataFromBinding(binding) {
            return $.Deferred(function (d) {
                return binding.getDataAsync(handleCallback(d));
            }).promise();
        }
        office.getDataFromBinding = getDataFromBinding;

        function getTableData(tableBinding, startRow, rowCount) {
            if (typeof startRow === "undefined") { startRow = 0; }
            var options = { coercionType: Office.CoercionType.Table, startRow: startRow };

            if (rowCount)
                options['rowCount'] = rowCount;

            return $.Deferred(function (d) {
                return tableBinding.getDataAsync(options, handleCallback(d));
            }).promise();
        }
        office.getTableData = getTableData;

        function clearTable(tableBinding) {
            return $.Deferred(function (deferred) {
                return tableBinding.deleteAllDataValuesAsync(handleCallback(deferred));
            }).promise();
        }
        office.clearTable = clearTable;

        function addRows(tableBinding, rows) {
            return $.Deferred(function (deferred) {
                return tableBinding.addRowsAsync(rows, handleCallback(deferred));
            }).promise();
        }
        office.addRows = addRows;

        function setTableData(tableBinding, table, dataTypes) {
            return clearTable(tableBinding).then(function () {
                if (table.rows.length > 0) {
                    return addRows(tableBinding, convertToDates(replaceNullsInArray(table.rows, ""), dataTypes));
                }
            });
        }
        office.setTableData = setTableData;

        function setCellData(tableBinding, value, row, column) {
            var tableData = new Office.TableData();
            tableData.rows = [[value]];
            return $.Deferred(function (d) {
                return tableBinding.setDataAsync(tableData, { coercionType: Office.CoercionType.Table, startRow: row, startColumn: column }, handleCallback(d));
            }).promise();
        }
        office.setCellData = setCellData;

        function getBindingValue(tableBinding, name) {
            return $.Deferred(function (dfd) {
                return Office.select('bindings#' + name, undefined).getDataAsync(handleCallback(dfd));
            }).promise();
        }
        office.getBindingValue = getBindingValue;

        function setBindingValue(tableBinding, name, value) {
            return $.Deferred(function (dfd) {
                return Office.select('bindings#' + name, undefined).setDataAsync(value, handleCallback(dfd));
            }).promise();
        }
        office.setBindingValue = setBindingValue;

        function tryDisplayError(result) {
            if (!window.isDebug || !result)
                return;

            // Check shape of response for office error properties
            var isOfficeAPIError = result.code && result.name && result.message;

            if (isOfficeAPIError)
                return ag.messages.error("{0} (Office API: {1})\n{2}".format(result.name, result.code, result.message));
        }
        office.tryDisplayError = tryDisplayError;

        function handleCallback(deferred) {
            return function (result) {
                if (result.status == Office.AsyncResultStatus.Succeeded) {
                    deferred.resolve(result.value);
                    return;
                }

                deferred.reject(result.error);
            };
        }

        function replaceNullsInArray(data, replacement) {
            // Iterate over each element in the array replacing any nulls
            // on each child array with an empty string as Excel doesn't like nulls.
            _.each(data, function (element) {
                for (var i = 0; i < element.length; i++) {
                    if (element[i] === null)
                        element[i] = replacement;
                }
            });

            return data;
        }

        function convertToDates(data, dataTypes) {
            if (!dataTypes || dataTypes.length == 0)
                return data;

            _.each(data, function (element) {
                for (var i = 0; i < element.length; i++) {
                    var dataType = dataTypes[i];
                    if (dataType && dataType == 'Date') {
                        var value = element[i];
                        if (value)
                            element[i] = moment.fromISO(value).toDateZeroTime();
                    }
                }
            });

            return data;
        }
    })(ag.office || (ag.office = {}));
    var office = ag.office;
})(ag || (ag = {}));
