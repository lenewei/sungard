/// <reference path="../../../ts/global.d.ts" />
/// <reference path="../../ag.ts" />
/// <reference path="../../utils/network.ts" />
/// <reference path="../UpdatingModelHelper.ts" />
/// <reference path="../gridViewModel.ts" />
/// <reference path="../baseViewModel.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    "use strict";

    var UploadApplicationAction = (function (_super) {
        __extends(UploadApplicationAction, _super);
        function UploadApplicationAction(options, isSubAction) {
            if (typeof isSubAction === "undefined") { isSubAction = false; }
            var _this = this;
            _super.call(this, options, isSubAction);
            this.options = options;
            this.isSubAction = isSubAction;

            this.invokeCommand = ko.asyncCommand({
                execute: function (parentViewModel, event, complete) {
                    _this.okButton = $(event.target);
                    _this.invoke(parentViewModel, event, complete);
                }
            });
        }
        UploadApplicationAction.prototype.invoke = function (parentViewModel, event, complete) {
            return _super.prototype.invoke.call(this, parentViewModel, event, complete);
        };

        UploadApplicationAction.prototype.rejectAndShowMessage = function (data, deferred) {
            this.getMessageFromResponse(data);
            deferred.reject(data);
        };

        UploadApplicationAction.prototype.sendRequest = function (payload) {
            var _this = this;
            var form = this.okButton.closest('form'), deferred = $.Deferred();

            form.attr('method', 'post'); // IE9 work around
            form.attr('enctype', 'multipart/form=data');

            // Attach parameter information
            var extraData = {
                "__PageIdToken": $("input[name='__PageIdToken']").val(),
                "__RequestVerificationToken": $("input[name='__RequestVerificationToken']").val()
            };
            _.each($.toDictionary(payload), function (nameValuePair) {
                extraData[nameValuePair.name] = nameValuePair.value;
            });

            // this can be replaced with HTML5 FormData
            form.ajaxForm({
                url: ag.utils.createUrlForRequest(this.actionDetails),
                data: extraData,
                success: function (data) {
                    // check error message
                    var result = ko.toJS(data);
                    if (result.hasErrors) {
                        _this.rejectAndShowMessage(data, deferred);
                    } else {
                        form.find("input[type='file']").val("");
                        form.find("input[class*='fakeFileInput']").val("");
                        deferred.resolve(data);
                    }
                },
                error: function (jqXHR) {
                    var s;
                    try  {
                        s = $.parseJSON(jqXHR.responseText);
                    } catch (e) {
                        s = { errors: [ag.strings.invalidFileType], hasErrors: true };
                    }
                    _this.rejectAndShowMessage(s, deferred);
                }
            }).submit();

            return deferred.promise();
        };
        return UploadApplicationAction;
    })(ag.DialogApplicationAction);
    ag.UploadApplicationAction = UploadApplicationAction;
})(ag || (ag = {}));
