/// <reference path="./office.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var Office = Microsoft.Office.WebExtension;

    var ExcelBaseViewModel = (function (_super) {
        __extends(ExcelBaseViewModel, _super);
        function ExcelBaseViewModel(options) {
            var _this = this;
            _super.call(this, options);
            this.options = options;
            this.version = 1;
            this.incompatibleVersion = ko.observable(false);
            this.selection = ko.observable();
            this.hasSelection = ko.observable(false);
            this.wrongVersion = function () {
                _this.incompatibleVersion(true);
            };
            this.types = this.getTransferTypes();
            this.selectedType = ko.observable(this.types[0]);
        }
        ExcelBaseViewModel.prototype.getTransferTypes = function () {
            return new ag.staticDataUpload.StaticDataType[0];
        };

        ExcelBaseViewModel.prototype.init = function (itemModel) {
            var _this = this;
            _super.prototype.init.call(this, itemModel);

            this.selectedType.subscribe(function (newValue) {
                return _this.pageTitle([{ keyProperty: 'Transfer ' + newValue.name }]);
            });

            ag.utils.registerHeaderSetter(function (headers) {
                headers['__DisableTrackableStore'] = true;
            });

            this.initializeOffice();
        };

        ExcelBaseViewModel.prototype.initializeOffice = function () {
            var _this = this;
            $('body').addClass('office');

            return ag.office.initialize().then(function () {
                ag.office.addFromNamedItem("Version", Office.BindingType.Text, { id: "Version" }).then(function (binding) {
                    ag.office.getDataFromBinding(binding).then(function (value) {
                        if (!(value >= _this.version))
                            _this.wrongVersion();
                    }, _this.wrongVersion);
                }, _this.wrongVersion);

                Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, function () {
                    _this.hasSelection(false);
                });

                _.each(_this.types, function (type) {
                    ag.office.addTable(type.fullName(), type.name).then(function (binding) {
                        return type['binding'] = binding;
                    }).then(function (binding) {
                        binding.addHandlerAsync(Office.EventType.BindingSelectionChanged, function (result) {
                            setTimeout(function () {
                                if (result.startRow >= 0) {
                                    _this.selection(result);
                                    _this.hasSelection(true);
                                }
                            });
                        });

                        var typeName = type.name, lastColumnName = ag.office.getColumnNameFromNumber(binding.columnCount);
                        ag.staticDataUpload.addMatrixBinding(typeName, 3, lastColumnName, "PropertyNames").then(function (matrixBinding) {
                            return type.propertyNameBinding = matrixBinding;
                        });
                        ag.staticDataUpload.addMatrixBinding(typeName, 4, lastColumnName, "DataTypes").then(function (matrixBinding) {
                            return type.dataTypeBinding = matrixBinding;
                        });
                        ag.staticDataUpload.addMatrixBinding(typeName, 5, lastColumnName, "Keys").then(function (matrixBinding) {
                            return type.keyBinding = matrixBinding;
                        });
                    });
                });

                return _this.setUpBindingToCurrentSheet();
            });
        };

        ExcelBaseViewModel.prototype.setUpBindingToCurrentSheet = function () {
            var _this = this;
            return ag.office.addFromNamedItem("CurrentSheet", Office.BindingType.Text, { id: 'CurrentSheet' }).then(function (binding) {
                _this.currentSheetBinding = binding;
                _this.setCurrentType();
                binding.addHandlerAsync(Office.EventType.BindingDataChanged, function (result) {
                    setTimeout(function () {
                        return _this.setCurrentType();
                    });
                });
            }).fail(function (binding) {
                throw (binding.name + " - " + binding.code + " - " + binding.message);
            });
        };

        ExcelBaseViewModel.prototype.setCurrentType = function () {
            var _this = this;
            return ag.office.getDataFromBinding(this.currentSheetBinding).then(function (value) {
                var type = _.find(_this.types, function (t) {
                    return t.name == value;
                });
                if (type) {
                    _this.selectedType(type);
                }
            });
        };

        ExcelBaseViewModel.prototype.beforeApplyBindings = function () {
            this.initializeDownloadAction();
            this.initializeDeleteAction();
            this.initializeUploadAction();
        };

        ExcelBaseViewModel.prototype.initializeDownloadAction = function () {
            var _this = this;
            var confirmedDownloadAction = this.actions.confirmedDownload, originalDialogShow = confirmedDownloadAction.show;

            // Put a wrapper over the original show method so we have a
            // chance to check for existing data in the spreadsheet.
            confirmedDownloadAction.show = function (parentViewModel) {
                ag.office.getTableData(_this.selectedType().binding).then(function (result) {
                    var hasData = _.any(result.rows, function (row) {
                        return !!row[1];
                    });
                    _this.editingItem.hasExistingData(hasData);
                    originalDialogShow.call(confirmedDownloadAction, parentViewModel);
                });
            };

            // Replace the invoke function with our own
            confirmedDownloadAction.invoke = function (parentViewModel, event, complete) {
                var type = _this.selectedType();
                return ag.staticDataUpload.getPropertyNamesAndTypes(type).then(function (properties) {
                    _this.net.getJson({ area: type.area, controller: type.controller, action: 'all' }, _this.getDownloadPayload()).then(function (result) {
                        var data = new Office.TableData();
                        data.rows = ag.staticDataUpload.mapDownloadData(properties, result);
                        return ag.office.setTableData(type.binding, data, _.map(properties, 'dataType'));
                    }).fail(function (result) {
                        ag.office.tryDisplayError(result);
                    }).always(function () {
                        return confirmedDownloadAction.showDialog(false);
                    });
                }).always(complete);
            };
        };

        ExcelBaseViewModel.prototype.getDownloadPayload = function () {
            return {};
        };

        ExcelBaseViewModel.prototype.modifyUploadPayload = function (payload) {
        };

        ExcelBaseViewModel.prototype.initializeUploadAction = function () {
            var _this = this;
            this.menuCommands.uploadAllCommand = ko.command({
                execute: function () {
                    return _this.postData();
                }
            });

            this.menuCommands.uploadCommand = ko.command({
                execute: function () {
                    var type = _this.selectedType();
                    return ag.staticDataUpload.getPropertyNamesAndTypes(type).then(function (propertyNames) {
                        var headerLength = _this.getHeaderLength(propertyNames);
                        ag.staticDataUpload.modifySelection(_this.selection(), headerLength).then(function (selection) {
                            _this.postData(selection.rowCount, selection.startRow);
                        });
                    });
                },
                canExecute: function () {
                    return _this.hasSelection();
                }
            });
        };

        ExcelBaseViewModel.prototype.initializeDeleteAction = function () {
            var _this = this;
            var deleteAction = this.actions.delete, originalDeleteShow = deleteAction.show;

            deleteAction.invoke = function (parentViewModel, event, complete) {
                var selection = _this.selection();
                return _this.postData(selection.rowCount, selection.startRow, true).always(function () {
                    return deleteAction.showDialog(false);
                }).always(complete);
            };

            this.menuCommands.deleteCommand = ko.asyncCommand({
                execute: function (parentViewModel, complete) {
                    var type = _this.selectedType();
                    return ag.staticDataUpload.getPropertyNamesAndTypes(type).then(function (propertyNames) {
                        var headerLength = _this.getHeaderLength(propertyNames);
                        var selection = _this.selection(), binding = selection.binding;

                        ag.staticDataUpload.modifySelection(selection, headerLength).then(function () {
                            deleteAction.show(parentViewModel);
                        }).always(complete);
                    });
                },
                canExecute: function (isExecuting) {
                    return !isExecuting && _this.hasSelection();
                }
            });
        };

        ExcelBaseViewModel.prototype.postData = function (rowCount, startRow, isDelete) {
            var _this = this;
            if (typeof startRow === "undefined") { startRow = 0; }
            if (typeof isDelete === "undefined") { isDelete = false; }
            var statusIndex = 0;
            var type = this.selectedType();
            var messageIndex = type.binding.columnCount - 1;
            if (messageIndex == 0)
                return;

            var results = [];

            return ag.staticDataUpload.getPropertyNamesAndTypes(type).then(function (propertyNames) {
                var uploadData = function (payload, index, status) {
                    var action = ag.staticDataUpload.getAction(status, isDelete);

                    // We are running synchronous to avoid possible issues with Groups vs Transactions
                    var ajaxAsyncOriginalValue = $.ajaxSettings.async;
                    $.ajaxSettings.async = false;

                    _this.modifyUploadPayload(payload);

                    return _this.net.postJson({ action: action, controller: type.controller, area: type.area }, payload).then(function (result) {
                        $.ajaxSettings.async = ajaxAsyncOriginalValue;
                        results.push({ row: index, message: "", status: ag.staticDataUpload.successMessage(action) });
                    }, function (errorResult) {
                        $.ajaxSettings.async = ajaxAsyncOriginalValue;
                        var errorText = "";

                        if (errorResult[0].responseText) {
                            var error = $.parseJSON(errorResult[0].responseText);
                            if (error.errors && error.errors.length > 0) {
                                _.each(error.errors, function (e) {
                                    return errorText += e + " ";
                                });
                            } else if (error.modelErrors && error.modelErrors.length > 0) {
                                _.each(error.modelErrors, function (e) {
                                    return errorText += e.name + ": " + e.error + " ";
                                });
                            }
                        }

                        results.push({ row: index, message: errorText, status: ag.staticDataUpload.errorMessage(action) });
                    }).fail(function (result) {
                        $.ajaxSettings.async = ajaxAsyncOriginalValue;
                        ag.office.tryDisplayError(result);
                    });
                };

                return ag.office.getTableData(type.binding, startRow, rowCount).then(function (value) {
                    var deferred = $.Deferred(), promise = deferred.promise(), collections = ag.staticDataUpload.getCollections(propertyNames), headerLength = _this.getHeaderLength(propertyNames), rows = value.rows;

                    deferred.resolve();

                    var index = 0, nextIndex = 0;

                    ag.messages.success("Processing {0} rows...\r\nSpreadsheet will be updated when processing completes.".format(rows.length));

                    var delayedLoop = function () {
                        _.delay(function () {
                            var row = value.rows[index], nextIndex = index;

                            promise = promise.done(function () {
                                var nextRowIsSameRecord = true;
                                while (nextRowIsSameRecord) {
                                    var nextRow = rows[++nextIndex];
                                    nextRowIsSameRecord = nextRow && !ag.staticDataUpload.rowHasValue(nextRow, headerLength);
                                }

                                var headerPayload = ag.staticDataUpload.getPayload(propertyNames.slice(1, headerLength + 1), row.slice(1), true);

                                if (!isDelete) {
                                    _.each(collections, function (collection) {
                                        var name = collection.name, collectionIndex = collection.index, result = [];

                                        for (var i = index; i < nextIndex; i++) {
                                            var collectionRow = rows[i], collectionValues = collectionRow.slice(collectionIndex, collectionIndex + collection.fieldCount);
                                            if (_.any(collectionValues, function (v) {
                                                return v != '';
                                            })) {
                                                result.push(ag.staticDataUpload.getPayload(propertyNames.slice(collectionIndex, collectionIndex + collection.fieldCount), collectionRow.slice(collectionIndex, collectionIndex + collection.fieldCount)));
                                            }
                                        }

                                        var colonIndex = name.indexOf(':');
                                        if (colonIndex < 0) {
                                            headerPayload[name] = result;
                                        } else {
                                            ag.staticDataUpload.updatePayloadWithChildObject(headerPayload, name, result);
                                        }
                                    });
                                }

                                return uploadData(headerPayload, index + startRow, row[statusIndex]).always(function () {
                                    index = nextIndex;

                                    if (index < rows.length) {
                                        // Continue the loop
                                        delayedLoop();
                                    } else {
                                        // Processing complete
                                        ag.messages.success("Processing complete.");
                                        _this.updateTableData(type, type.binding, results, statusIndex, messageIndex);
                                    }
                                });
                            });
                        }, 0);
                    };

                    delayedLoop();
                });
            });
        };

        ExcelBaseViewModel.prototype.updateTableData = function (type, binding, results, statusIndex, messageIndex) {
            return ag.staticDataUpload.getPropertyNamesAndTypes(type).then(function (properties) {
                // Get all table data, not just the selection
                ag.office.getTableData(binding).then(function (value) {
                    // Update the status and message columns
                    // either for a selection or for all.
                    if (results) {
                        $.each(results, function (index, item) {
                            var row = value.rows[item.row];
                            row[statusIndex] = item.status;
                            row[messageIndex] = item.message;
                        });
                    }

                    // Update the table
                    return ag.office.setTableData(binding, value);
                });
            });
        };

        ExcelBaseViewModel.prototype.getHeaderLength = function (properties) {
            var collections = ag.staticDataUpload.getCollections(properties), hasCollection = collections.length > 0;
            return hasCollection ? collections[0].index - 1 : this.selectedType().binding.columnCount - 2;
        };
        return ExcelBaseViewModel;
    })(ag.AppViewModel);
    ag.ExcelBaseViewModel = ExcelBaseViewModel;
})(ag || (ag = {}));
