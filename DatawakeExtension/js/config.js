/*
 Copyright 2014 Sotera Defense Solutions, Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 */

dwConfig = function () {
    var pubs = {};

    var emptyDefaults = {
        datawake_serviceUrl: "",
        datawake_imageServiceUrl: ""
    };

    var localHostDefaults = {
        datawake_serviceUrl: "http://localhost:8088/datawake-plugin-server",
        datawake_imageServiceUrl: ""
    };
    pubs.localHostDefaults = localHostDefaults;

    pubs.deployments = {"Empty":emptyDefaults,"localhost":localHostDefaults};
    var defaultDeployment = localHostDefaults;


    /*
     save an options dictionary to chrome storage
     */
    pubs.saveOptions = function (optionsObj) {
        chrome.storage.local.set(optionsObj, function () {
            console.log("datawake options saved");
        });
    };

    /*
     Get the set options
     */
    pubs.getOptions = function (callback) {
        chrome.storage.local.get(defaultDeployment, function (options) {
            pubs.currentOptions = options;
            callback(options);
        })
    };


    return pubs;
}();

