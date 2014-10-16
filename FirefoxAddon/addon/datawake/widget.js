var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var widget = require("sdk/widget");
var tabs = require("sdk/tabs");
var timer = require("sdk/timers");

var externalLinkHelper = require("./external-links");
var storage = require("./storage");
var constants = require("./constants");
var requestHelper = require("./request-helper");
var tracking = require("./tracking");
var authHelper = require("./auth-helper");

exports.useWidget = useWidget;
exports.switchToTab = switchToTab;
exports.resetWidget = resetWidget;
exports.cleanUpTab = cleanUpTab;

var datawakeWidget;
var lookaheadTimerId;
var advanceSearchTimerId;
var badgeForTab = {};

/**
 * Emits the datawakeInfo to the panel attached to the widget
 * @param datawakeInfo The datawake information to send.
 */
function addValidTabAndData(datawakeInfo) {
    datawakeWidget.panel.port.emit("datawakeInfo", datawakeInfo);
}

/**
 * Does the advanced search for any entities that were pulled out.
 * @param delay Timeout delay between each call.
 */
function advancedSearch(delay) {
    if (tracking.isTabWorkerAttached(tabs.activeTab.id)) {
        var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
        var tabUrl = tabs.activeTab.url;
        if (constants.isValidUrl(tabUrl)) {
            var entitiesUrl = addOnPrefs.datawakeDeploymentUrl + "/visited_url_entities/entities";
            var post_data = JSON.stringify({
                url: tabUrl,
                domain: datawakeInfo.domain.name
            });
            requestHelper.post(entitiesUrl, post_data, function (response) {
                var extracted_entities_dict = response.json;
                datawakeWidget.panel.port.emit("entities", extracted_entities_dict);
                if (Object.keys(extracted_entities_dict).length > 0) {
                    var domain_matches = false;
                    var highlightValues = [];
                    for (var type in extracted_entities_dict) {
                        for (var name in extracted_entities_dict[type]) {
                            if (extracted_entities_dict[type][name] == "y") {
                                var typeObject = {};
                                typeObject.type = type;
                                typeObject.name = name;
                                console.info("Extracted value: " + typeObject.name);
                                highlightValues.push(typeObject);
                                domain_matches = true;
                            }
                        }
                    }
                    var helperObject = {};
                    helperObject.entities = highlightValues;
                    externalLinkHelper.getExternalLinks(function (response) {
                        datawakeWidget.panel.port.emit("externalLinks", response.json);
                        helperObject.links = response.json;
                        console.info("Emitting data to highlight");
                        tracking.highlightTextWithToolTips(tabs.activeTab.id, helperObject);
                    });
                    if (domain_matches) {
                        console.info("Domain matches found on url: " + tabUrl + " setting badge RED");
                        datawakeWidget.port.emit("setBadgeColor", {color: "#FF0000"});
                    }
                    else {
                        console.info("no domain matches found on url: " + tabUrl);
                    }
                }
                else {
                    console.info("advanceSearch, no response for url, setting time to try again.");
                }
                //Keep Polling
                if (delay <= 5 * 60 * 1000) { // eventually stop polling
                    advanceSearchTimerId = timer.setTimeout(function (newDelay) {
                        advancedSearch(newDelay);
                    }, delay * 2);
                }

            });
        }
    } else {
        console.error("Tab is null.");
    }
}

/**
 * Creates the Datawake Widgets and attaches a panel for the search contents.
 */
function useWidget() {

    var widgetPanel = require("sdk/panel").Panel({
        width: 800,
        height: 1000,
        contentURL: data.url("html/datawake-widget-panel.html")
    });
    datawakeWidget = widget.Widget({
        id: "datawake-widget",
        label: "Datawake Widget",
        contentURL: data.url("html/datawake-main-widget.html"),
        panel: widgetPanel,
        onClick: widgetOnClick
    });
    setupTimerListeners();
}

/**
 * Sets up the timer for the lookahead.
 */
function setupTimerListeners() {
    try {
        datawakeWidget.panel.port.on("startLookaheadTimer", function (lookaheadTimerObject) {
            startLookaheadTimer(datawakeWidget, lookaheadTimerObject.datawakeInfo, lookaheadTimerObject.links, 0, 1000);
        });
    } catch (e) {
        console.error(e.name + " : " + e.message);
    }
}

/**
 * Sets up the required information on the widgetClick.
 * @param tabWidget Tab Widget that was clicked.
 */
function widgetOnClick(tabWidget) {
    if (storage.hasDatawakeInfoForTab(tabs.activeTab.id) && constants.isValidUrl(tabs.activeTab.url)) {
        //Emit that it is a validTab to Scrape
        console.info("Valid Tab");
        tabWidget.panel.port.emit("validTab");
        //Get the datawakeInfo associated with this tab.
        var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
        //Get the rank info and listen for someone ranking the page.
        emitRanks(tabWidget, datawakeInfo);
        tabWidget.panel.port.on("setUrlRank", setUrlRank);
        attachAuthListeners(tabWidget);

    }
    else {
        //Emit that it is not a valid tab.
        tabWidget.panel.port.emit("invalidTab");
        console.info("Invalid Tab");
    }
}

/**
 * Attaches auth listeners to the widget panel.
 * @param tabWidget Widget with attached panel.
 */
function attachAuthListeners(tabWidget){

    tabWidget.panel.port.emit("authType", authHelper.authType());

    tabWidget.panel.port.on("signIn", function () {
        authHelper.signIn(function (response) {
            tabWidget.panel.port.emit("sendUserInfo", response.json);
        });
    });

    tabWidget.panel.port.on("signOut", function(){
        authHelper.signOut(function(response){
            tabWidget.panel.port.emit("signOutComplete");
        });
    });
}

/**
 * Resets the widget to an invalid state.
 */
function resetWidget() {
    datawakeWidget.port.emit("resetWidget");
    datawakeWidget.panel.port.emit("invalidTab");
}

/**
 * Emits Rank information to the panel attached to the widget.
 * @param tabWidget Widget to emit to.
 * @param datawakeInfo The datawake info associated with the current tab.
 */
function emitRanks(tabWidget, datawakeInfo) {
    var url = addOnPrefs.datawakeDeploymentUrl + "/datawake_url_ranks/getRank";
    var post_data = JSON.stringify({
        domain: datawakeInfo.domain.name,
        trailname: datawakeInfo.trail.name,
        url: tabs.activeTab.url
    });
    requestHelper.post(url, post_data, function (response) {
        var rank = response.json.rank;
        var rankingInfo = {};
        rankingInfo.ranking = rank;
        rankingInfo.starUrl = data.url("css/icons/");
        tabWidget.panel.port.emit("ranking", rankingInfo);
    });
}

/**
 * Sets the rank that the user rated the page.
 * @param rank_data
 */
function setUrlRank(rank_data) {
    rank_data.url = tabs.activeTab.url;
    var url = addOnPrefs.datawakeDeploymentUrl + "/datawake_url_ranks/setRank";
    console.info("Posting Rank..");
    requestHelper.post(url, JSON.stringify(rank_data), function (response) {
        if (response.json.success) {
            console.info("Successfully set rank..");
        }
    });
}

/**
 * Starts the lookahead timer.
 * @param tabWidget The widget to append the badge on.
 * @param datawakeInfo The datawake information associated with the search.
 * @param links The lookahead links to check.
 * @param index The current index of the link.
 * @param delay The delay between requests.
 */
function startLookaheadTimer(tabWidget, datawakeInfo, links, index, delay) {
    console.info("Starting lookahead timer...");
    var post_data = {
        url: links[index],
        srcurl: tabs.activeTab.url,
        domain: datawakeInfo.domain.name
    };
    var url = addOnPrefs.datawakeDeploymentUrl + "/lookahead/matches";
    requestHelper.post(url, JSON.stringify(post_data), function (response) {
        if (response && response != undefined) {
            tabWidget.panel.port.emit("lookaheadTimerResults", response.json);
            //TODO: Fix the index Ugliness
            links.splice(index, 1);
            if (links.length > 0) {
                if (index >= links.length) {
                    index = 0;
                    if (delay <= 5 * 60 * 1000) {
                        lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                            startLookaheadTimer(tabWidget, datawakeInfo, links, index + 1, delayTimesTwo);
                        }, 2 * delay);
                    }
                }
                else {
                    startLookaheadTimer(tabWidget, datawakeInfo, links, index, delay);
                }
            }
        } else {
            index = (index + 1) % links.length;
            if (index == 0) {
                // pause for the delay at the begining of the list
                if (delay <= 5 * 60 * 1000) {
                    lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                        startLookaheadTimer(tabWidget, datawakeInfo, links, index, delayTimesTwo);
                    }, delay);
                }
            }
            else {
                lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                    startLookaheadTimer(tabWidget, datawakeInfo, links, index, delayTimesTwo);
                }, 1);
            }
        }
    });


}

/**
 * Sets the current badge count.
 * @param count The count to set the badge.
 */
function setBadge(count) {
    console.info("Setting badge text.." + count);
    datawakeWidget.port.emit("setBadgeText", count);
}
/**
 * Clears the timers.
 */
function clearTimers() {
    timer.clearInterval(lookaheadTimerId);
    timer.clearInterval(advanceSearchTimerId);
}

/**
 * Switches the widget and datawake to a new tab.
 * @param tabId The tabId to switch it to.
 * @param datawakeInfo The datawake info associated with the tab.
 * @param badgeCount The badge count for the tab.  Can be undefined.
 */
function switchToTab(tabId, datawakeInfo, badgeCount) {
    clearTimers();
    if (badgeCount != undefined) {
        deleteBadgeForTab(tabId);
        badgeForTab[tabId] = badgeCount;
        setBadge(badgeForTab[tabId]);
    }
    datawakeWidget.port.emit("resetBadgeColor");
    addValidTabAndData(datawakeInfo);
    advancedSearch(1000);
}

function deleteBadgeForTab(tabId){
    if(tabId in badgeForTab)
        delete badgeForTab[tabId];
}

function cleanUpTab(tabId){
    deleteBadgeForTab(tabId);
}