/// <reference path="./office.ts" />

module ag 
{
   import Office = Microsoft.Office.WebExtension;
   import StaticDataType = staticDataUpload.StaticDataType;

   export class ExcelBaseViewModel extends AppViewModel
   {
      private version = 1;
      incompatibleVersion = ko.observable(false);
      selection = ko.observable<any>();
      private types: staticDataUpload.StaticDataType[];
      selectedType: KnockoutObservable<staticDataUpload.StaticDataType>;
      hasSelection = ko.observable(false);
      private currentSheetBinding: Office.TextBinding;

      constructor(public options: IAppViewModelOptions)
      {
         super(options);
         this.types = this.getTransferTypes();
         this.selectedType = ko.observable(this.types[0]);
      }

      getTransferTypes(): staticDataUpload.StaticDataType[]
      {
         return new staticDataUpload.StaticDataType[0];
      }

      init(itemModel: any)
      {
         super.init(itemModel);

         this.selectedType.subscribe(newValue => this.pageTitle([{ keyProperty: 'Transfer ' + newValue.name }]));

         utils.registerHeaderSetter(headers =>
         {
            headers['__DisableTrackableStore'] = true;
         });

         this.initializeOffice();
      }

      initializeOffice(): JQueryPromise<void>
      {
         $('body').addClass('office');

         return office.initialize()
            .then(() =>
            {
               office.addFromNamedItem("Version", Office.BindingType.Text, { id: "Version" })
                  .then(binding =>
                  {
                     office.getDataFromBinding(binding).then(value => 
                     {
                        if (!(value >= this.version))
                           this.wrongVersion();
                     },
                        this.wrongVersion);
                  },
                  this.wrongVersion);

               Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, () =>
               {
                  this.hasSelection(false);
               });

               _.each(this.types, (type) => 
               {
                  office.addTable(type.fullName(), type.name)
                     .then(binding => type['binding'] = binding)
                     .then(binding =>
                     {
                        binding.addHandlerAsync(Office.EventType.BindingSelectionChanged, (result) =>
                        {
                           setTimeout(() =>
                           {
                              if (result.startRow >= 0)  // don't allow header row selection
                              {
                                 this.selection(result);
                                 this.hasSelection(true);
                              }
                           });
                        });

                        var typeName = type.name,
                           lastColumnName = office.getColumnNameFromNumber(binding.columnCount);
                        staticDataUpload.addMatrixBinding(typeName, 3, lastColumnName, "PropertyNames")
                           .then(matrixBinding => type.propertyNameBinding = matrixBinding);
                        staticDataUpload.addMatrixBinding(typeName, 4, lastColumnName, "DataTypes")
                           .then(matrixBinding => type.dataTypeBinding = matrixBinding);
                        staticDataUpload.addMatrixBinding(typeName, 5, lastColumnName, "Keys")
                           .then(matrixBinding => type.keyBinding = matrixBinding);
                     });
               });

               return this.setUpBindingToCurrentSheet();
            });
      }

      private setUpBindingToCurrentSheet(): JQueryPromise<void>
      {
         return office.addFromNamedItem("CurrentSheet", Office.BindingType.Text, { id: 'CurrentSheet' })
            .then(binding =>
            {
               this.currentSheetBinding = binding;
               this.setCurrentType();
               binding.addHandlerAsync(Office.EventType.BindingDataChanged, (result: Office.AsyncResult) =>
               {
                  setTimeout(() => this.setCurrentType());
               });
            }).fail(binding =>
            {
               throw (binding.name + " - " + binding.code + " - " + binding.message);
            });
      }

      private setCurrentType(): JQueryPromise<any>
      {
         return office.getDataFromBinding(this.currentSheetBinding)
            .then(value =>
            {
               var type = _.find(this.types, t => t.name == value);
               if (type)
               {
                  this.selectedType(type);
               }
            });
      }

      beforeApplyBindings()
      {
         this.initializeDownloadAction();
         this.initializeDeleteAction();
         this.initializeUploadAction();
      }

      private initializeDownloadAction()
      {
         var confirmedDownloadAction = this.actions.confirmedDownload,
            originalDialogShow = confirmedDownloadAction.show;

         // Put a wrapper over the original show method so we have a 
         // chance to check for existing data in the spreadsheet.
         confirmedDownloadAction.show = (parentViewModel) => 
         {
            office.getTableData(this.selectedType().binding).then(result => 
            {
               var hasData = _.any(result.rows, row => !!row[1]);
               this.editingItem.hasExistingData(hasData);
               originalDialogShow.call(confirmedDownloadAction, parentViewModel);
            });
         };

         // Replace the invoke function with our own
         confirmedDownloadAction.invoke = (parentViewModel, event: JQueryEventObject, complete): JQueryPromise<any> =>
         {
            var type = this.selectedType();
            return staticDataUpload.getPropertyNamesAndTypes(type)
               .then((properties) =>
               {
                  this.net.getJson({ area: type.area, controller: type.controller, action: 'all' }, this.getDownloadPayload())
                     .then(result =>
                     {
                        var data = new Office.TableData();
                        data.rows = staticDataUpload.mapDownloadData(properties, result);
                        return office.setTableData(type.binding, data, _.map<any, string>(properties, 'dataType'));
                     })
                     .fail(result =>
                     {
                        office.tryDisplayError(result);
                     })
                     .always(() => confirmedDownloadAction.showDialog(false));
               })
               .always(complete);
         };
      }

      getDownloadPayload()
      {
         return {};
      }

      modifyUploadPayload(payload)
      {
      }

      private initializeUploadAction()
      {
         (<any>this.menuCommands).uploadAllCommand = ko.command({
            execute: () =>
            {
               return this.postData();
            }
         });

         (<any>this.menuCommands).uploadCommand = ko.command({
            execute: () =>
            {
               var type = this.selectedType();
               return staticDataUpload.getPropertyNamesAndTypes(type)
                  .then(propertyNames =>
                  {
                     var headerLength = this.getHeaderLength(propertyNames);
                     staticDataUpload.modifySelection(this.selection(), headerLength)
                        .then((selection) =>
                        {
                           this.postData(selection.rowCount, selection.startRow);
                        });
                  });
            },
            canExecute: () =>
            {
               return this.hasSelection();
            }
         });
      }

      private initializeDeleteAction()
      {
         var deleteAction: DialogApplicationAction = this.actions.delete,
            originalDeleteShow = deleteAction.show;

         deleteAction.invoke = (parentViewModel, event: JQueryEventObject, complete) =>
         {
            var selection = this.selection();
            return this.postData(selection.rowCount, selection.startRow, true)
               .always(() => deleteAction.showDialog(false))
               .always(complete);
         };

         (<any>this.menuCommands).deleteCommand = ko.asyncCommand({
            execute: (parentViewModel, complete) =>
            {
               var type = this.selectedType();
               return staticDataUpload.getPropertyNamesAndTypes(type)
                  .then(propertyNames =>
                  {
                     var headerLength = this.getHeaderLength(propertyNames);
                     var selection = this.selection(),
                        binding = selection.binding;

                     staticDataUpload.modifySelection(selection, headerLength)
                        .then(() =>
                        {
                           deleteAction.show(parentViewModel);
                        })
                        .always(complete);
                  });
            },
            canExecute: (isExecuting) =>
            {
               return !isExecuting && this.hasSelection();
            }
         });
      }

      private postData(rowCount?: number, startRow = 0, isDelete = false) 
      {
         var statusIndex = 0;
         var type = this.selectedType();
         var messageIndex = type.binding.columnCount - 1;
         if (messageIndex == 0)
            return;

         var results = [];

         return staticDataUpload.getPropertyNamesAndTypes(type)
            .then(propertyNames =>
            {
               var uploadData = (payload, index, status: string) =>
               {
                  var action = staticDataUpload.getAction(status, isDelete);

                  // We are running synchronous to avoid possible issues with Groups vs Transactions
                  var ajaxAsyncOriginalValue = $.ajaxSettings.async;
                  $.ajaxSettings.async = false;

                  this.modifyUploadPayload(payload);

                  return this.net.postJson({ action: action, controller: type.controller, area: type.area }, payload)
                     .then(result =>
                     {
                        $.ajaxSettings.async = ajaxAsyncOriginalValue;
                        results.push({ row: index, message: "", status: staticDataUpload.successMessage(action) });
                     },
                     errorResult =>
                     {
                        $.ajaxSettings.async = ajaxAsyncOriginalValue;
                        var errorText = "";

                        if (errorResult[0].responseText)
                        {
                           var error = $.parseJSON(errorResult[0].responseText);
                           if (error.errors && error.errors.length > 0)
                           {
                              _.each(error.errors, e => errorText += e + " ");
                           }
                           else if (error.modelErrors && error.modelErrors.length > 0)
                           {
                              _.each(error.modelErrors, (e: any) => errorText += e.name + ": " + e.error + " ");
                           }
                        }

                        results.push({ row: index, message: errorText, status: staticDataUpload.errorMessage(action) });
                     })
                     .fail(result =>
                     {
                        $.ajaxSettings.async = ajaxAsyncOriginalValue;
                        office.tryDisplayError(result);
                     });
               };

               return office.getTableData(type.binding, startRow, rowCount).then((value: Office.TableData) =>
               {
                  var deferred = $.Deferred(),
                     promise = deferred.promise(),
                     collections = staticDataUpload.getCollections(propertyNames),
                     headerLength = this.getHeaderLength(propertyNames),
                     rows = value.rows;

                  deferred.resolve();

                  var index = 0,
                     nextIndex = 0;

                  messages.success("Processing {0} rows...\r\nSpreadsheet will be updated when processing completes.".format(rows.length));

                  var delayedLoop = () =>
                  {
                     _.delay(() =>
                     {
                        var row: any[] = value.rows[index],
                           nextIndex = index;

                        promise = promise.done(() =>
                        {
                           var nextRowIsSameRecord = true;
                           while (nextRowIsSameRecord)
                           {
                              var nextRow = rows[++nextIndex];
                              nextRowIsSameRecord = nextRow && !staticDataUpload.rowHasValue(nextRow, headerLength);
                           }

                           var headerPayload = staticDataUpload.getPayload(propertyNames.slice(1, headerLength + 1), row.slice(1), true);

                           if (!isDelete)
                           {
                              _.each(collections, collection =>
                              {
                                 var name = collection.name,
                                    collectionIndex = collection.index,
                                    result = [];

                                 for (var i = index; i < nextIndex; i++)
                                 {
                                    var collectionRow = rows[i],
                                       collectionValues = collectionRow.slice(collectionIndex, collectionIndex + collection.fieldCount);
                                    if (_.any(collectionValues, v => v != ''))
                                    {
                                       result.push(staticDataUpload.getPayload(
                                          propertyNames.slice(collectionIndex, collectionIndex + collection.fieldCount),
                                          collectionRow.slice(collectionIndex, collectionIndex + collection.fieldCount)));
                                    }
                                 }

                                 var colonIndex = name.indexOf(':');
                                 if (colonIndex < 0) {
                                    headerPayload[name] = result;
                                 } else {
                                    staticDataUpload.updatePayloadWithChildObject(headerPayload, name, result);
                                 }
                              });
                           }

                           return uploadData(headerPayload, index + startRow, row[statusIndex]).always(() =>
                           {
                              index = nextIndex;

                              if (index < rows.length)
                              {
                                 // Continue the loop
                                 delayedLoop();
                              }
                              else
                              {
                                 // Processing complete 
                                 messages.success("Processing complete.");
                                 this.updateTableData(type, type.binding, results, statusIndex, messageIndex);
                              }
                           });
                        });
                     },
                        0)
                  };

                  delayedLoop();

               });
            });
      }

      private updateTableData(type: StaticDataType, binding: Office.TableBinding, results: any[], statusIndex: number, messageIndex: number): JQueryPromise<any>
      {
         return staticDataUpload.getPropertyNamesAndTypes(type)
            .then(properties =>
            {
               // Get all table data, not just the selection
               office.getTableData(binding).then((value: Office.TableData) =>
               {
                  // Update the status and message columns 
                  // either for a selection or for all.
                  if (results)
                  {
                     $.each(results, (index, item) =>
                     {
                        var row = value.rows[item.row];
                        row[statusIndex] = item.status;
                        row[messageIndex] = item.message;
                     });
                  }

                  // Update the table
                  return office.setTableData(binding, value);
               });
            });
      }

      private getHeaderLength(properties)
      {
         var collections = staticDataUpload.getCollections(properties),
            hasCollection = collections.length > 0;
         return hasCollection ? collections[0].index - 1 : this.selectedType().binding.columnCount - 2;
      }
      
      private wrongVersion = () =>
      {
         this.incompatibleVersion(true);
      }
   }
}