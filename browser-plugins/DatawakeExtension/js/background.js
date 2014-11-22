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
var onOff = {};
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (key in changes) {
        var storageChange = changes[key];
        if (key.indexOf("datawake_") == 0) {
            config[key] = storageChange.newValue;
        }
    }
});
dwConfig.getOptions(function (options) {
    config = options;
    // once options are loaded load the context menus

    // load the image service context menu if it is available
    if (config.datawake_imageServiceUrl && config.datawake_imageServiceUrl.length > 0) {
        chrome.contextMenus.create({title: "Image Service", contexts: ["all"], "onclick": launchImageService});
    }
});

dwConfig.getOnOffOptions(function (options) {
    if (options.hasOwnProperty("onOff")) {
        onOff = options.onOff;
    } else {
        onOff = dwConfig.onOffDefaults;
    }
    if (onOff.context_menus) {
        createContextMenus();
    } else {
        console.log("Context Menus disabled");
    }
});


//TODO: look at moving this into local storage so it can persist over sessions, need to know if tab ids persist over sessions?
var dwState = { tracking: false, lastDatawakeInfo: null, tabToDatawakeInfo: {}};


// don't search for tips in tools while looking at the tools
var advanceSearchIgnore = ["http://lakitu:8080/", "chrome:", "http://localhost", "https://sotweb.istresearch.com", "https://ocweb.istresearch.com"];

function createContextMenus() {
    chrome.contextMenus.create({id: "capture", title: "Capture Selection", contexts: ["all"], "onclick": captureSelectedText});
    chrome.contextMenus.create({id: "show", title: "Show user selections", contexts: ["all"], "onclick": getSelections});
}


function getPosterData(request, sender, sendResponse) {
    console.log('get-poster-data');
    if (!dwState.tracking) {
        sendResponse({domain: dwState.tabToDatawakeInfo[sender.tab.id], tracking: dwState.tracking });
    } else if (chrome.runtime.getManifest().hasOwnProperty("oauth2")) {
        chrome.identity.getAuthToken({ 'interactive': false }, function (token) {
            //now that we have a token get the user id and name

            var xhr = new XMLHttpRequest();
            xhr.open("GET", "https://www.googleapis.com/plus/v1/people/me");
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.onload = function () {
                var user_info = JSON.parse(this.response);
                var tab = sender.tab.id;
                var trail = dwState.tabToDatawakeInfo[tab].getTrail();
                sendResponse({tracking: dwState.tracking, url: sender.tab.url, userId: user_info.id, userName: user_info.displayName, serviceUrl: config.datawake_serviceUrl + "/scraper", trail: trail, domain: dwState.tabToDatawakeInfo[tab].getDomain()});
            };
            xhr.send();
        });
    } else {
        var tabId = sender.tab.id;
        var trail = dwState.tabToDatawakeInfo[tabId].getTrail();
        var domain = dwState.tabToDatawakeInfo[tabId].getDomain();
        sendResponse({tracking: dwState.tracking, url: sender.tab.url, userId: "", userName: "", serviceUrl: config.datawake_serviceUrl + "/scraper", trail: trail, domain: domain});

    }
}

function lastId(request, sender, sendResponse) {
    console.log("Datawake background post response: last-id: %s url count: %d", request.id, request.count);
    var tabId = sender.tab.id;
    if (tabId) {
        if (request.count > 0) {
            chrome.browserAction.setBadgeText({text: request.count.toString(), tabId: tabId});
            chrome.browserAction.setBadgeBackgroundColor({color: "#20b2aa", tabId: tabId});
        }

        getExtractedPageAttributes(tabId, sender.tab.url, 1000);

    }
}

function getPopupData(request, sender, sendResponse) {
    var tabId = request.tab.id;
    var last = -1;
    var popUpDataResponse = {
        serviceUrl: config.datawake_serviceUrl + "/scraper",
        rankUrl: config.datawake_serviceUrl + "/ranks",
        trail: dwState.tabToDatawakeInfo[tabId].getTrail(),
        domain: dwState.tabToDatawakeInfo[tabId].getDomain(),
        org: dwState.tabToDatawakeInfo[tabId].getOrg()
    };
    console.log("get-popup-data request for tabId: %s:", tabId);
    sendResponse(popUpDataResponse);
}

function getDomainAndTrail(request, sender, sendResponse) {
    var response = {};
    var tab = sender.tab.id;
    response.trail = dwState.tabToDatawakeInfo[tab].getTrail();
    response.domain = dwState.tabToDatawakeInfo[tab].getDomain();
    console.log("Datawake-background get-domain_and_trail -> %s", response);
    sendResponse(response);
}

function setTrail(request, sender, sendResponse) {
    var trail = request.name;
    var tab = sender.tab.id;
    dwState.lastDatawakeInfo.setTrail(trail);
    dwState.tabToDatawakeInfo[tab].setTrail(trail);
    console.log("Datawake-background set-trail tab: %s trail: %s", tab, name);
    sendResponse({success: true});
}

function setDomain(request, sender, sendResponse) {
    var domain = request.name;
    var tab = sender.tab.id;
    dwState.lastDatawakeInfo.setDomain(domain);
    dwState.tabToDatawakeInfo[tab].setDomain(domain);
    console.log("Datawake-background set-domain tab: %s domain: %s", tab, name);
    sendResponse({success: true});
}

function toggleTracking(request, sender, sendResponse) {
    dwState.tracking = request.enabled;
    if (dwState.tracking) {
        console.log("set tracking to on");
        chrome.browserAction.setBadgeText({text: ""});
    } else {
        console.log("set tracking to off");
        chrome.browserAction.setBadgeText({text: "off"});
        chrome.browserAction.setBadgeBackgroundColor({color: "#000000"});
    }
    sendResponse({trackingState: dwState.tracking});
}

function getImageService(request, sender, sendResponse) {
    sendResponse({service: config.datawake_imageServiceUrl})
}

function postPageContents(request, sender, sendResponse) {
    function onSuccess(response) {
        console.log("datawake poster - %s", JSON.stringify(response));
        sendResponse({success: true, contents: response});
    }

    var pageContents = request.contents;
    if (onOff.scraper) {
        postContents(config.datawake_serviceUrl + "/scraper/scrape", pageContents, onSuccess, logError);
    } else {
        sendResponse({success: true, contents: {count: 0, id: -1}});
    }
}

function setCurrentOrg(request, sender, sendResponse) {
    var tabId = sender.tab.id;
    dwState.tabToDatawakeInfo[tabId].setOrg(request.org);
}

function getExternalLinks(request, sender, sendResponse) {
    function onSuccess(response) {
        sendResponse({links: response});
    }

    var url = config.datawake_serviceUrl + "/tools/get";
    getContents(url, onSuccess, logError);
}

var messageOperations = {
    "get-poster-data": getPosterData,
    "last-id": lastId,
    "get-popup-data": getPopupData,
    "get-domain-and-trail": getDomainAndTrail,
    "set-trail": setTrail,
    "set-domain": setDomain,
    "toggle-tracking": toggleTracking,
    "get-image-service": getImageService,
    "post-page-contents": postPageContents,
    "current-org": setCurrentOrg,
    "get-external-links": getExternalLinks
};

/*
 Process messages from other pages in the extension
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (sender.tab) {
        console.log("from a content script: %s", sender.tab.url);
    } else {
        console.log("from the extension");
    }
    if (messageOperations.hasOwnProperty(request.operation)) {
        var messageOperation = messageOperations[request.operation];
        messageOperation(request, sender, sendResponse);
    }
    return true;
});

function logError(jqxhr, textStatus, reason) {
    console.log("POST-selection error %s %s", textStatus, reason);
}
/*
 Define a context menu that captures local highlighted text and post it to the data wake
 */
function captureSelectedText(info, tab) {
    if (!info.selectionText || info.selectionText.length == 0) {
        console.log("datawake capture selection - empty selection.")
    }
    else {
        console.log("datawake capture selection - text: %s", info.selectionText);
        console.log("datawake capture selection - tab: %s", tab.id);

        console.log("datawake capture selection - post: %s", tab.url);
        var jsonData = JSON.stringify({
            url: tab.url,
            selection: info.selectionText,
            domain: dwState.tabToDatawakeInfo[tab.id].getDomain()
        });

        function logSuccess(responseObj) {
            console.log("datawake - saved selection: %s id=%s", info.selectionText, responseObj.id);
        }

        postContents(config.datawake_serviceUrl + "/selections/save", jsonData, logSuccess, logError);

    }
}

function getSelections(info, tab) {
    var tabId = tab.id;
    var postData = JSON.stringify({
        url: tab.url,
        domain: dwState.tabToDatawakeInfo[tabId].getDomain(),
        trail: dwState.tabToDatawakeInfo[tabId].getTrail()
    });

    function sendSelections(objectResult) {
        console.log("Grabbing other users' selections");
        chrome.tabs.sendMessage(tabId, {operation: 'selections', selections: objectResult.selections}, function (response) {
            if (response.success) {
                console.log("hightlight message to %s recv.", tabId);
            } else {
                console.log("highlight message error %s", response.error);
            }
        });
    }

    postContents(config.datawake_serviceUrl + "/selections/get", postData, sendSelections, logError);

}


function launchImageService(info, tab) {
    chrome.tabs.sendMessage(tab.id, {operation: 'enable-image-service'}, function (response) {
        if (!response.success) {
            console.error("Error starting image service on tab: %s", tab.id)
        }
    });
}


/*
 Call a service to determine if page attributes have been captured in the domain crawlers etc
 */
function getExtractedPageAttributes(tabId, url, delay) {

    console.log("checking for domain hits on url: %s", url);
    function onSuccess(response) {
        var domainEntities = response;
        var domainExtracted = (domainEntities.domainExtracted != null) ? domainEntities.domainExtracted : {};
        if (Object.keys(domainExtracted).length == 0) {
            console.log("getExtractedPageAttributes, no response for url, setting time to try again.");
            if (delay <= 5 * 60 * 1000) { // eventually stop polling
                window.setTimeout(function () {
                    getExtractedPageAttributes(tabId, url, delay * 2);
                }, delay * 2);
            }
            return;
        }
        var entities_in_domain = [];
        $.map(domainExtracted, function (value, type) {
            $.each(value, function (index, name) {
                var entity = {};
                entity.type = type;
                entity.name = name;
                entities_in_domain.push(entity);
            });
        });
        if (onOff.highlight) {
            var highlightMessage = {operation: 'highlighttext', entities_in_domain: entities_in_domain};
            chrome.tabs.sendMessage(tabId, highlightMessage, function (response) {
                if (response.success) {
                    console.log("highlight message to %s recv.", tabId);
                }
                else {
                    console.log("highlight message error %s", response.error)
                }
            });
        } else {
            console.log("Highlight feature disabled");
        }
        if (onOff.scraper) {
            chrome.tabs.query({active: true}, function (tabs) {
                if (url == tabs[0].url) {

                    if (entities_in_domain.length > 0) {
                        console.log("Domain matches found on url: %s setting badge RED", url);
                        chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000", tabId: tabId});
                    }
                    else {
                        console.log("no domain matches found on url: %s", url);
                    }
                }
            });
        } else {
            console.log("Badge Disabled due to the scraper.")
        }

    }

    for (index in advanceSearchIgnore) {
        var value = advanceSearchIgnore[index];
        if (url.indexOf(value) == 0) {
            console.log("getExtractedPageAttributes, ignoring url: %s", url);
            return;
        }
    }
    var jsonData = JSON.stringify({
        url: url,
        domain: dwState.tabToDatawakeInfo[tabId].getDomain()
    });
    if (onOff.highlight || onOff.scraper)
        postContents(config.datawake_serviceUrl + "/visited/extracted", jsonData, onSuccess, logError);
    else
        console.log("Highlight and Scraper are both disabled.")
}


/*
 Listen for new tabs to be created and set their trail name automatically to the most
 recently active trail
 */
chrome.tabs.onCreated.addListener(function (tab) {
    dwState.tabToDatawakeInfo[tab.id] = dwState.lastDatawakeInfo;
    console.log("datawake - New tab created tab.id=%s", tab.id);
    if (!dwState.tracking) {
        chrome.browserAction.setBadgeText({text: "off"});
        chrome.browserAction.setBadgeBackgroundColor({color: "#000000"});
    }
});


/*
 Listen for tabs to be activated, keep track of the most recently active Trail
 */
chrome.tabs.onActivated.addListener(function (activeinfo) {
    var tabId = activeinfo.tabId;
    if (!dwState.tabToDatawakeInfo.hasOwnProperty(tabId)) {
        if(dwState.lastDatawakeInfo != null)
            dwState.tabToDatawakeInfo[tabId] = dwState.lastDatawakeInfo;
        else {
            dwState.tabToDatawakeInfo[tabId] = new DatawakeInfo();
            dwState.lastDatawakeInfo = new DatawakeInfo();
        }

    } else {
        dwState.lastDatawakeInfo = dwState.tabToDatawakeInfo[tabId];
    }
});

function postContents(url, post_data, successCallback, errorCallback) {
    $.ajax({
        type: "POST",
        url: url,
        data: post_data,
        contentType: "application/json",
        dataType: "json",
        success: successCallback,
        error: errorCallback
    });
}

function getContents(url, successCallback, errorCallback) {
    $.ajax({
        type: "GET",
        url: url,
        contentType: "application/json",
        dataType: "json",
        success: successCallback,
        error: errorCallback
    });
}

chrome.storage.onChanged.addListener(function (obj, type) {
    if (obj.hasOwnProperty("onOff")) {
        onOff = obj.onOff.newValue;
        if (!onOff.context_menus) {
            chrome.contextMenus.removeAll();
        } else {
            createContextMenus();
        }
    }
});
