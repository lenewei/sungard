var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ag;
(function (ag) {
    var ViewsProxy = (function (_super) {
        __extends(ViewsProxy, _super);
        // typeName is provided when this is being
        // used for type based views, otherwise null
        function ViewsProxy(typeName) {
            _super.call(this);
            this.typeName = typeName;
        }
        ViewsProxy.prototype.editView = function (key, params, httpType) {
            if (typeof params === "undefined") { params = {}; }
            if (typeof httpType === "undefined") { httpType = 1 /* GET */; }
            return this.sendRequest("editview", key, params, httpType);
        };

        ViewsProxy.prototype.createView = function (params, viewTableKey, httpType) {
            if (typeof params === "undefined") { params = {}; }
            if (typeof viewTableKey === "undefined") { viewTableKey = null; }
            if (typeof httpType === "undefined") { httpType = 1 /* GET */; }
            if (!ag.isNullUndefinedOrEmpty(viewTableKey))
                params.viewTableKey = viewTableKey;

            return this.sendRequest("createview", null, params, httpType);
        };

        ViewsProxy.prototype.deleteView = function (key, params) {
            if (typeof params === "undefined") { params = {}; }
            return this.sendRequest("deleteview", key, params);
        };

        ViewsProxy.prototype.applyView = function (key, params) {
            if (typeof params === "undefined") { params = {}; }
            return this.sendRequest("applyview", key, params);
        };

        ViewsProxy.prototype.sendRequest = function (action, key, params, httpType) {
            if (typeof params === "undefined") { params = {}; }
            if (typeof httpType === "undefined") { httpType = 0 /* POST */; }
            params.key = key;
            if (!ag.isNullUndefinedOrEmpty(this.typeName))
                params.typeName = this.typeName;

            var actionToPerform = this.createAction(action);

            if (httpType === 1 /* GET */)
                return this.net.getJson(actionToPerform, params);

            return this.net.postJson(actionToPerform, params);
        };

        ViewsProxy.prototype.createAction = function (action) {
            // Type based views
            if (!ag.isNullUndefinedOrEmpty(this.typeName))
                return { area: "", action: action, controller: "typedataview" };

            // Controller based views (browse and reporting results)
            return action;
        };
        return ViewsProxy;
    })(ag.ControllerProxy);
    ag.ViewsProxy = ViewsProxy;
})(ag || (ag = {}));
