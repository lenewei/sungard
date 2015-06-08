var ag;
(function (ag) {
    (function (utils) {
        var Network = (function () {
            function Network(options) {
                if (typeof options === "undefined") { options = { area: ag.area, controller: ag.controller, responseOnly: "", postOnly: "" }; }
                this.options = options;
                this.actionOptions = {};
                this._headerFunctions = new Array();

                this.actionOptions = {
                    area: options.area,
                    controller: options.controller
                };

                this.responseOnlyProperties = options.responseOnly && options.responseOnly.split ? options.responseOnly.split(",") : [];
                this.postOnlyProperties = options.postOnly && options.postOnly.split ? options.postOnly.split(",") : [];
            }
            Network.prototype.addHeaderCallBack = function (aFunction) {
                this._headerFunctions.push(aFunction);
            };

            Network.prototype.requestData = function (method, dataType, action, data, cache, global) {
                // Only clear post only properties for a GET request, AccessSettings etc.
                if (this.postOnlyProperties && method === "GET")
                    clearProperties(this.postOnlyProperties, data);

                // Always clear response only properties (GET or POST), RepoSummary etc.
                clearProperties(this.responseOnlyProperties, data);

                var actionObject = typeof action === "string" ? $.extend({}, this.actionOptions, { action: action }) : $.extend({}, this.actionOptions, action);

                return requestData(method, dataType, actionObject, data, cache, global, this._headerFunctions).fail(function (jqxhr) {
                    // This is to handle when a user decides to leave the page
                    // while a request is still pending, won't catch all instances
                    // but the majority.
                    if (jqxhr.readyState == 0)
                        return undefined;

                    // Always show errors from the result
                    utils.showErrorsFromResult(jqxhr);
                });
            };

            // Convenience/shortcut function that calls validateAndShowMessages, un-maps then post the data
            Network.prototype.validateUnmapAndPostJson = function (action, data) {
                var _this = this;
                return ag.utils.validateAndShowMessages(data).then(function () {
                    var unmapper = function () {
                        return ko.mapping.toJS(data);
                    };
                    return _this.postJson(action, unmapper);
                });
            };

            Network.prototype.postJson = function (action, data, existingDeferred) {
                var _this = this;
                var deferred = existingDeferred ? existingDeferred : $.Deferred();

                this.requestData("POST", "json", action, data, true, true).then(function (result) {
                    // Done
                    if (result == null) {
                        // Empty response returned from server - should not be happening
                        deferred.reject({ hasErrors: true, errors: [ag.strings.emptyResponse] });
                        return;
                    }

                    if (result.isConfirmation) {
                        // Promise succeeded and confirmation of action is required
                        var options = $.extend(result, { net: _this, deferred: deferred, data: data, action: action });
                        ag.confirmationViewModel.init(options);
                    } else {
                        // Promise succeeded
                        _this.checkResponseForActivity(result);
                        deferred.resolve(result);
                    }
                }, function () {
                    var reasons = [];
                    for (var _i = 0; _i < (arguments.length - 0); _i++) {
                        reasons[_i] = arguments[_i + 0];
                    }
                    // Failed
                    _this.checkResponseForActivity(reasons);
                    deferred.reject(reasons);
                });

                return deferred.promise();
            };

            Network.prototype.checkResponseForActivity = function (result) {
                if (result && !ag.isNullUndefinedOrEmpty(result.activityId)) {
                    // Publish an activity has completed and pass the activityId
                    PubSub.publish(ag.topics.ActivityCompleted, result.activityId);
                    return true;
                }

                return false;
            };

            Network.prototype.getJson = function (action, data, cache, global) {
                return this.requestData("GET", "json", action, data, cache, global);
            };

            Network.prototype.getHtml = function (action, data, cache, global) {
                return this.requestData("GET", "html", action, data, cache, global);
            };
            return Network;
        })();
        utils.Network = Network;

        function getErrorsFromResponse(response) {
            var errorResponse = response, messages = [];

            // When we explicit reject the deferred object, there is no error
            // response we want to show here.
            if (!response)
                return;

            // response should be an XHR - parse responseText into error response
            if (response.responseText) {
                try  {
                    errorResponse = $.parseJSON(response.responseText);
                } catch (e) {
                    if (response.status === 404 || response.status == 503) {
                        errorResponse.hasErrors = true;
                        errorResponse.errors = [response.status === 404 ? "Controller Action Not Found." : response.statusText];
                    } else if (response.responseText.trim().startsWith("<")) {
                        // If the responseText is HTML the application might not configured correctly
                        // in the web.config httpErrors should be set to:
                        // <configuration>
                        //    <system.webServer>
                        //       <httpErrors existingResponse="PassThrough" />
                        errorResponse.hasErrors = true;
                        errorResponse.errors = [ag.strings.badResponse];
                    }
                }
            }

            // error response
            if (errorResponse.hasErrors) {
                if (errorResponse.errors)
                    $.each(errorResponse.errors, function (i, item) {
                        messages.push(item);
                    });

                if (errorResponse.modelErrors)
                    $.each(errorResponse.modelErrors, function (i, item) {
                        messages.push(item.error);
                    });
            } else {
                messages.push(ag.strings.unknownSvrErr);
            }

            return messages;
        }
        utils.getErrorsFromResponse = getErrorsFromResponse;

        function showErrorsFromResult(result) {
            ag.messages.error(getErrorsFromResponse(result).join("\r\n"));
            return false;
        }
        utils.showErrorsFromResult = showErrorsFromResult;

        function getJson(action, data, cache, global, headerFunctions) {
            return requestData("GET", "json", action, data, cache, global, headerFunctions);
        }
        utils.getJson = getJson;

        function postJson(action, data, cache, global, headerFunctions) {
            return requestData("POST", "json", action, data, cache, global, headerFunctions);
        }
        utils.postJson = postJson;

        function getHtml(action, data, cache, global, headerFunctions) {
            return requestData("GET", "html", action, data, cache, global, headerFunctions);
        }
        utils.getHtml = getHtml;

        function generateUrlByOptions(applicationPath, area, controller, action) {
            // If area is null or empty does not include area property
            if (area.isNullOrEmpty())
                return "{0}/{1}/{2}".format(applicationPath, controller, action);

            return "{0}/{1}/{2}/{3}".format(applicationPath, area, controller, action);
        }

        function requestData(method, dataType, action, data, cache, global, headerFunctionsPerRequest) {
            if (typeof cache === "undefined") { cache = false; }
            if (typeof global === "undefined") { global = true; }
            if (typeof headerFunctionsPerRequest === "undefined") { headerFunctionsPerRequest = undefined; }
            var headers = {};
            formHeaders(headerFunctionsPerRequest, headers);
            $.extend(headers, getHeadersForRequest(method));

            var ajaxOptions = function () {
                return {
                    cache: cache,
                    global: global,
                    dataType: dataType,
                    type: method,
                    headers: headers,
                    data: getPayloadForRequest(method, data),
                    contentType: method !== "POST" ? "application/x-www-form-urlencoded" : "application/json; charset=utf-8",
                    url: createUrlForRequest(action),
                    success: function (successData, textStatus, jqXHR) {
                        // Check for redirection
                        if (!ag.isNullOrUndefined(successData) && successData.redirect)
                            ag.navigate(successData.redirect, false);

                        // Get the current "today" value for the location the
                        // user is assigned to (if supplied)
                        var today = jqXHR.getResponseHeader("User-Location-Today");
                        if (today && today.length)
                            ag.userLocationToday = moment.fromISO(today);
                    }
                };
            };

            // For POST we will queue requests to allow dependencies to complete
            var promise = (method === "POST") ? $.ajaxQueue(ajaxOptions) : $.ajax(ajaxOptions());

            return promise.fail(function (jqxhr) {
                if (jqxhr.status == 401)
                    $("#authenticationErrorDialog").modal({ backdrop: "static", keyboard: false, show: true });
            });
        }

        function createUrlForRequest(action) {
            var defaultActionOptions = {
                area: ag.area,
                controller: ag.controller
            };

            var actionObject = typeof action === "string" ? $.extend({}, defaultActionOptions, { action: action }) : $.extend({}, defaultActionOptions, action);

            var applicationPath = ag.applicationPath;
            if (applicationPath === "/")
                applicationPath = "";

            return actionObject.url || generateUrlByOptions(applicationPath, actionObject.area, actionObject.controller, actionObject.action);
        }
        utils.createUrlForRequest = createUrlForRequest;

        function getPayloadForRequest(method, data, responseOnlyProperties, postOnlyProperties) {
            // For GET requests, transform any complex objects or arrays in the request data to
            // key/value pairs that MVC will understand. For more details see:
            // http://erraticdev.blogspot.com.au/2010/12/sending-complex-json-objects-to-aspnet.html
            if (method === "GET") {
                // Clean all GET requests
                return $.toDictionary(utils.cleanJSForRequest(data, responseOnlyProperties, postOnlyProperties));
            } else {
                if (typeof data === "object") {
                    // Stringify POST data
                    return JSON.stringify(data, function (key, value) {
                        if (typeof value === "number")
                            return value.toString();

                        return value;
                    });
                } else if (typeof data === "function") {
                    return getPayloadForRequest(method, data());
                }
            }

            return data;
        }
        utils.getPayloadForRequest = getPayloadForRequest;

        function getHeadersForRequest(method) {
            // Include Page Id Token
            var headers = {};

            // Always add the pageId
            headers["__PageIdToken"] = utils.getPageIdToken();

            if (method === "POST") {
                // Include Anti-Forgery Token
                headers["__RequestVerificationToken"] = utils.getRequestVerificationToken();
            }

            // Get any custom headers for the request
            getCustomHeadersForRequest(headers);

            return headers;
        }

        function getCustomHeadersForRequest(headers) {
            // If header setting callbacks have been registered call them
            // to allow them to add to the headers object
            formHeaders(Network.headerSetterCallbacks, headers);
        }

        function formHeaders(headerSetterCallbacks, headers) {
            if (!headerSetterCallbacks || headerSetterCallbacks.length <= 0)
                return;

            $.each(headerSetterCallbacks, function (index, callback) {
                callback(headers);
            });
        }

        function clearProperties(properties, data) {
            if (!properties || properties.length === 0)
                return;

            var isFunction = _.isFunction(data), dataPayload = data;

            // We need to unwrap the data payload first before
            // clear the properties
            if (isFunction)
                dataPayload = data();

            clearPropertiesInner(properties, dataPayload);

            if (isFunction)
                data = function () {
                    return dataPayload;
                };
        }
        utils.clearProperties = clearProperties;

        function clearPropertiesInner(properties, data) {
            if (!data || !$.isPlainObject(data) || $.isEmptyObject(data))
                return;

            $.each(properties, function (index, property) {
                // Only set property to null if found in data
                var propertyCamelCase = property.toCamelCase();
                if (!ag.isNullOrUndefined(ag.getProperty(data, propertyCamelCase)))
                    ag.setProperty(data, propertyCamelCase, null);
            });
        }
        utils.clearPropertiesInner = clearPropertiesInner;

        function registerHeaderSetter(callBack) {
            if (!Network.headerSetterCallbacks)
                Network.headerSetterCallbacks = [];

            Network.headerSetterCallbacks.push(callBack);
        }
        utils.registerHeaderSetter = registerHeaderSetter;
    })(ag.utils || (ag.utils = {}));
    var utils = ag.utils;
})(ag || (ag = {}));
