/// <reference path="./office.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var StaticDataUploadViewModel = (function (_super) {
        __extends(StaticDataUploadViewModel, _super);
        function StaticDataUploadViewModel() {
            _super.apply(this, arguments);
        }
        StaticDataUploadViewModel.prototype.initializeOffice = function () {
            return _super.prototype.initializeOffice.call(this).then(function () {
            });
        };

        StaticDataUploadViewModel.prototype.getTransferTypes = function () {
            return ag.staticDataUpload.getStaticDataUploadTypes();
        };
        return StaticDataUploadViewModel;
    })(ag.ExcelBaseViewModel);
    ag.StaticDataUploadViewModel = StaticDataUploadViewModel;
})(ag || (ag = {}));
