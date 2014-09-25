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
        datawake_serviceUrl: ""
    };

    var localHostDefaults = {
        datawake_serviceUrl: "http://localhost:8088/datawake-plugin-server"
    }
    pubs.localHostDefaults = localHostDefaults

    var deployments = {"":emptyDefaults,"localhost":localHostDefaults}
    pubs.deployments = deployments
    var defaultDeployment = localHostDefaults


    /*
     save an options dictionary to chrome storage
     */
    var saveOptions = function (optionsObj) {
        chrome.storage.local.set(optionsObj, function () {
            console.log("datawake options saved");
        });
    };
    pubs.saveOptions = saveOptions;

    /*
     Get the set options
     */
    var getOptions = function (callback) {
        chrome.storage.local.get(defaultDeployment, function (options) {
            pubs.currentOptions = options;
            callback(options);
        })
    };
    pubs.getOptions = getOptions;


    return pubs;
}();

