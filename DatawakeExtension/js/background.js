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


// TODO, re-write this whole script using the module pattern


/*
 Set a listener to get any changes and read in the current config values.
 */
var config = {};
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (key in changes) {
        var storageChange = changes[key];
        if (key.indexOf("datawake_") == 0) {
            config[key] = storageChange.newValue;
        }
    }
});
dwConfig.getOptions(function (options) {
    config = options


    // once options are loaded load the context menus
    chrome.contextMenus.create({title: "Capture Selection", contexts: ["all"], "onclick": captureSelectedText});
    chrome.contextMenus.create({title: "Show user selections", contexts: ["all"], "onclick": getSelections});

    // load the image service context menu if it is available
    if (config.datawake_imageServiceUrl && config.datawake_imageServiceUrl.length >0 ){
        chrome.contextMenus.create({title: "Image Service", contexts: ["all"], "onclick": launchImageService});
    }


});


// TODO, look at moving this into local storage so it can persist over sessions, need to know if tab ids persist over sessions?
var dwState = { tabToPostId: {}, tabToTrail: {}, tabToDomain: {}, lastTrail: null, lastDomain: null, tracking: false};


// don't search for tips in tools while looking at the tools
var advanceSearchIgnore = ["http://lakitu:8080/", "chrome:", "http://localhost", "https://sotweb.istresearch.com", "https://ocweb.istresearch.com"];


/*
 Process messages from other pages in the extension
 */
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");


        // Return data needed to send make a post
        if (request.operation == "get-poster-data") {
            console.log('get-poster-data');
            chrome.identity.getAuthToken({ 'interactive': false }, function (token) {
                if (dwState.tracking) {
                    //now that we have a token get the user id and name
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", "https://www.googleapis.com/plus/v1/people/me");
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                    xhr.onload = function () {
                        var user_info = JSON.parse(this.response);
                        var tab = sender.tab.id;
                        var trail = dwState.tabToTrail[tab];
                        sendResponse({tracking: dwState.tracking, url: sender.tab.url, userId: user_info.id, userName: user_info.displayName, serviceUrl: config.datawake_serviceUrl + "/datawakescraper", trail: trail, domain: dwState.tabToDomain[tab]});
                    };
                    xhr.send();
                }
                else {
                    sendResponse({domain: dwState.tabToDomain[sender.tab.id], tracking: dwState.tracking });
                }


            });

        }

        // Set the previous post id for a tab
        else if (request.operation == "last-id") {
            console.log("Datawake background post response: last-id: " + request.id + " url count: " + request.count);
            var tabId = sender.tab.id;
            if (tabId) {
                console.log("setting tabtoPostId[" + tabId + "]=" + request.id + " request.count = " + request.count);
                dwState.tabToPostId[tabId] = request.id;
                if (request.count > 0) {
                    chrome.browserAction.setBadgeText({text: request.count.toString(), tabId: tabId});
                    chrome.browserAction.setBadgeBackgroundColor({color: "#20b2aa", tabId: tabId});
                }
                advanceSearch(request.id, tabId, sender.tab.url, 1000);
            }
        }

        // Return data needed py the popup window
        else if (request.operation == "get-popup-data") {
            var tabId = request.tab.id;
            var last = -1;
            if (tabId in dwState.tabToPostId) last = dwState.tabToPostId[tabId];
            var popUpDataResponse = {
                lastId: last,
                serviceUrl: config.datawake_serviceUrl + "/datawakescraper",
                rankUrl: config.datawake_serviceUrl + "/datawake_url_ranks",
                trail: dwState.tabToTrail[tabId],
                domain: dwState.tabToDomain[tabId]
            };
            console.log("get-popup-data request: " + JSON.stringify(request) + " response: " + JSON.stringify(popUpDataResponse));
            sendResponse(popUpDataResponse);
        }


        // Get the trail for a tab
        else if (request.operation == "get-domain-and-trail") {
            var response = {};
            var tab = sender.tab.id;
            response.trail = dwState.tabToTrail[tab];
            response.domain = dwState.tabToDomain[tab];
            console.log("Datawake-background get-domain_and_trail -> " + response);
            sendResponse(response);
        }

        // set the trail for the current tab
        else if (request.operation == "set-trail") {
            var name = request.name;
            var tab = sender.tab.id;
            dwState.lastTrail = name;
            dwState.tabToTrail[tab] = name;
            console.log("Datawake-background set-trail tab: " + tab + " trail: " + name);
            sendResponse("ok");
        }

        // set the domain for the current tab
        else if (request.operation == "set-domain") {
            var name = request.name;
            var tab = sender.tab.id;
            dwState.lastDomain = name;
            dwState.tabToDomain[tab] = name;
            console.log("Datawake-background set-domain tab: " + tab + " domain: " + name);
            sendResponse("ok");
        }


        // turn off tracking
        else if (request.operation == "tracking-off") {
            console.log("set tracking to off");
            dwState.tracking = false;
            chrome.browserAction.setBadgeText({text: "off"});
            chrome.browserAction.setBadgeBackgroundColor({color: "#000000"});
        }

        // turn on tracking
        else if (request.operation == "tracking-on") {
            console.log("set tracking to on");
            dwState.tracking = true;
            chrome.browserAction.setBadgeText({text: ""});
        }

        // return the image service url
        else if (request.operation == "get-image-service"){
            sendResponse({service:config.datawake_imageServiceUrl})
        }


        return true;
    });


/*
 Define a context menu that captures local highlighted text and post it to the data wake
 */
function captureSelectedText(info, tab) {
    if (!info.selectionText || info.selectionText.length == 0) {
        console.log("datawake capture selection - emptpy selection.")
    }
    else {
        console.log("datawake capture selection - text: " + info.selectionText);
        console.log("datawake capture selection - tab: " + tab.id);
        var postId = dwState.tabToPostId[tab.id];

        console.log("datawake capture selection - post: " + postId);
        var jsonData = JSON.stringify({
            postId: postId,
            selection: info.selectionText,
            domain: dwState.tabToDomain[tab.id]
        });
        $.ajax({
            type: "POST",
            url: config.datawake_serviceUrl + "/datawakescraper/selection",
            data: jsonData,
            contentType: 'application/json',
            dataType: 'json',
            success: function (response) {
                responseObj = jQuery.parseJSON(response);
                console.log("datawake - saved selection: " + info.selectionText + " id=" + responseObj.id);
            },
            error: function (jqxhr, textStatus, reason) {
                console.log("POST-selection error " + textStatus + " " + reason);
            }
        })

    }
}

function getSelections(info, tab) {
    var tabId = tab.id;
    var postData = JSON.stringify({
        url: tab.url,
        domain: dwState.tabToDomain[tabId],
        trail: dwState.tabToTrail[tabId]
    });
    $.ajax({
        type: "POST",
        url: config.datawake_serviceUrl + "/datawakescraper/selections",
        data: postData,
        dataType:'json',
        contentType:'application/json',
        success: function (objectResult) {
            console.log("Grabbing other users' selections");
            console.log(objectResult);
            chrome.tabs.sendMessage(tabId, {operation: 'selections', selections: objectResult.selections}, function (response) {
                if (response.result == "ok") {
                    console.log("hightlight message to " + tabId + " recv.");
                }
                else {
                    console.log("highlight message error " + response.result);
                }
            });
        },
        error: function (jqxhr, textStatus, reason) {
            console.log("POST-selection error " + textStatus + " " + reason);
        }
    });

}


function launchImageService(info,tab){
    chrome.tabs.sendMessage(tab.id, {operation: 'enable-image-service'}, function (response) {
        if (response != "ok"){
            console.error("Error starting image service on tab: "+tab.id)
        }

    })

}



/*
 Call a service to determine if page attributes have been captured in the domain crawlers etc
 */
function advanceSearch(postId, tabId, url, delay) {

    for (index in advanceSearchIgnore) {
        value = advanceSearchIgnore[index];
        if (url.indexOf(value) == 0) {
            console.log("advacneSearch, ignoring url: " + url);
            return
        }
    }
    var jsonData = JSON.stringify({
        url: url,
        domain: dwState.tabToDomain[tabId]
    });
    console.log("checking for domain hits on url: " + url);
    $.ajax({
        type: "POST",
        url: config.datawake_serviceUrl + "/visited_url_entities/entities",
        data: jsonData,
        contentType: 'application/json',
        dataType: 'json',
        success: function (response) {
            var extracted_entities_dict = response;

            if (Object.keys(extracted_entities_dict).length == 0) {
                console.log("advanceSearch, no response for url, setting time to try again.")
                if (delay <= 5 * 60 * 1000) { // eventually stop polling
                    window.setTimeout(function () {
                        advanceSearch(postId, tabId, url)
                    }, delay * 2);
                }
                return;
            }


            chrome.tabs.sendMessage(tabId, {operation: 'highlighttext',
                extracted_entities_dict: extracted_entities_dict,
                serviceUrl: config.datawake_serviceUrl
            }, function (response) {


                if (response.result == "ok") {
                    console.log("hightlight message to " + tabId + " recv.")
                }
                else {
                    console.log("highlight message error " + response.result)
                }
            });


            var domain_matches = false;
            for (var type in extracted_entities_dict) {
                for (var name in extracted_entities_dict[type]) {
                    if (extracted_entities_dict[type][name] == "y") {
                        domain_matches = true;
                        break;
                    }
                }
            }

            // TODO, should check if tab is at same url
            // need to remove all POST ID logic
            if (dwState.tabToPostId[tabId] == postId) {

                if (domain_matches) {
                    console.log("Domain matches found on url: " + url + " setting badge RED");
                    chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000", tabId: tabId});
                }
                else {
                    console.log("no domain matches found on url: " + url);
                    console.log("RESPONE + " + response);
                }
            }
            else {
                console.log("tab state has changed, was post " + postId + " is now " + dwState.tabToPostId[tabId]);
            }

        },
        error: function (jqxhr, textStatus, reason) {
            console.log("POST-selection error " + textStatus + " " + reason);
        }
    })
}


/*
 Listen for new tabs to be created and set their trail name automatically to the most
 recently active trail
 */
chrome.tabs.onCreated.addListener(function (tab) {
    dwState.tabToTrail[tab.id] = dwState.lastTrail;
    dwState.tabToDomain[tab.id] = dwState.lastDomain;
    console.log("datawake - New tab created tab.id=" + tab.id + " trail: " + dwState.lastTrail + " domain: " + dwState.lastDomain);

    if (!dwState.tracking) {
        chrome.browserAction.setBadgeText({text: "off"});
        chrome.browserAction.setBadgeBackgroundColor({color: "#000000"});
    }
})


/*
 Listen for tabs to be activated, keep track of the most recently active Trail
 */
chrome.tabs.onActivated.addListener(function (activeinfo) {
    var tab = activeinfo.tabId;

    var trail = dwState.tabToTrail[tab];
    var domain = dwState.tabToDomain[tab];
    if (!trail) {
        trail = dwState.lastTrail;
        dwState.tabToTrail[tab] = trail;
    }
    else {
        dwState.lastTrail = trail;
    }

    if (!domain) {
        domain = dwState.lastDomain;
        dwState.tabToDomain[tab] = domain;
    }
    else {
        dwState.lastDomain = domain;
    }

    console.log("datawake - tab activated: " + tab + " lastTrail=" + trail + " lastDomain=" + domain);
});
