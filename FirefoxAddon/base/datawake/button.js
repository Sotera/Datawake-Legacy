var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var { ToggleButton } = require('sdk/ui/button/toggle');
var tabs = require("sdk/tabs");
var timer = require("sdk/timers");

var externalLinkHelper = require("./external-links");
var storage = require("./storage");
var constants = require("./constants");
var requestHelper = require("./request-helper");
var tracking = require("./tracking");

exports.useButton = useButton;
exports.switchToTab = switchToTab;
exports.resetToggleButton = resetToggleButton;
exports.cleanUpTab = cleanUpTab;

var datawakeButton;
var mainPanel;
var lookaheadTimerId;
var advanceSearchTimerId;
var badgeForTab = {};

/**
 * Emits the datawakeInfo to the panel attached to the widget
 * @param datawakeInfo The datawake information to send.
 */
function addValidTabAndData(datawakeInfo) {
    mainPanel.port.emit("datawakeInfo", datawakeInfo);
}

/**
 * Does the advanced search for any entities that were pulled out.
 * @param delay Timeout delay between each call.
 */
function getAllEntities(delay) {
    if (tracking.isTabWorkerAttached(tabs.activeTab.id)) {
        var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
        var tabUrl = tabs.activeTab.url;
        if (constants.isValidUrl(tabUrl)) {
            var entitiesUrl = addOnPrefs.datawakeDeploymentUrl + "/visited/entities";
            var post_data = JSON.stringify({
                url: tabUrl,
                domain: datawakeInfo.domain.name
            });
            requestHelper.post(entitiesUrl, post_data, function (response) {
                var entities = response.json;
                mainPanel.port.emit("entities", entities);
                if (Object.keys(entities.domainExtracted).length > 0) {
                    var entitiesInDomain = getEntitiesInDomain(entities.domainExtracted);
                    highlightExtractedLinks(entitiesInDomain);
                    if (entitiesInDomain.length > 0) {
                        console.debug("Domain matches found on url: " + tabUrl + " setting badge RED");
                        //TODO: When badges get added, change the color here.
                    } else {
                        console.debug("no domain matches found on url: " + tabUrl);
                    }
                } else {
                    console.debug("advanceSearch, no response for url, setting time to try again.");
                }
                //Keep Polling
                if (delay <= 5 * 60 * 1000) { // eventually stop polling
                    advanceSearchTimerId = timer.setTimeout(function (newDelay) {
                        getAllEntities(newDelay);
                    }, delay * 2);
                }

            });
        }
    } else {
        console.debug("The Datawake is not on for this tab.");
    }
}

/**
 * Gets the external links for this instance and highlights the entities in the array.
 * @param entitiesInDomain Entities to highlight.
 */
function highlightExtractedLinks(entitiesInDomain) {
    externalLinkHelper.getExternalLinks(function (response) {

        var highlightObject = {};
        highlightObject.entities = entitiesInDomain;
        mainPanel.port.emit("externalLinks", response.json);
        highlightObject.links = response.json;
        console.debug("Emitting data to highlight");
        tracking.highlightTextWithToolTips(tabs.activeTab.id, highlightObject);
    });
}

/**
 * Gets the entities in this domain.
 * @param extracted_entities_dict The entities that were extracted.
 * @returns {Array} The entities that are in this domain.
 */
function getEntitiesInDomain(domainExtracted) {
    var entitiesInDomain = [];
    for (var type in domainExtracted) {
        for(var index in domainExtracted[type]){
            var typeObject = {};
            typeObject.type = type;
            typeObject.name = domainExtracted[type][index];
            console.debug("Extracted value: " + typeObject.name);
            entitiesInDomain.push(typeObject);
        }
    }
    return entitiesInDomain;
}

/**
 * Creates the Datawake Widgets and attaches a panel for the search contents.
 */
function useButton() {

    mainPanel = require("sdk/panel").Panel({
        width: 800,
        height: 1000,
        contentURL: data.url("html/datawake-widget-panel.html"),
        onHide: handleHide,
        contentScriptOptions: {
            starUrl: data.url("css/icons/")
        }
    });
    datawakeButton = ToggleButton({
        id: "datawake-widget",
        label: "Datawake Widget",
        icon: {
            "16": data.url("img/waveicon16.png"),
            "32": data.url("img/waveicon19.png"),
            "64": data.url("img/waveicon38.png")
        },
        onChange: onToggle
    });

    setupTimerListeners();
}

/**
 * Handles the button when the panel's hide even is triggered.
 */
function handleHide() {
    datawakeButton.state('window', {checked: false});
}

/**
 * Sets up the timer for the lookahead.
 */
function setupTimerListeners() {
    try {

        mainPanel.port.on("startLookaheadTimer", function (lookaheadTimerObject) {
            var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
            startLookaheadTimer(datawakeInfo, lookaheadTimerObject.links, 0, 1000);
        });
    } catch (e) {
        console.error(e.name + " : " + e.message);
    }
}

/**
 * Sets up the required information when the ToggleButton is clicked.
 * @param state The state of the ToggleButton.
 */
function onToggle(state) {
    var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
    if (datawakeInfo != null && datawakeInfo.isDatawakeOn && constants.isValidUrl(tabs.activeTab.url)) {
        //Emit that it is a validTab to Scrape
        console.debug("Valid Tab");
        mainPanel.port.emit("validTab", tabs.activeTab.url);
        //Get the rank info and listen for someone ranking the page.
        emitRanks(datawakeInfo);
        mainPanel.port.on("setUrlRank", setUrlRank);
        mainPanel.port.on("openExternalLink", openExternalTool)
    }
    else {
        //Emit that it is not a valid tab.
        resetToggleButton();
        console.debug("Invalid Tab");
    }
    mainPanel.show({position: datawakeButton});
}


/**
 * Resets the ToggleButton and Panel to an invalid state.
 */
function resetToggleButton() {
    //TODO: When badges get added, insert reset here.
    mainPanel.port.emit("invalidTab");
}

function openExternalTool(externalUrlObject) {
    console.log("Opening External Tool");
    tabs.activeTab.url = externalUrlObject.externalUrl;
}

/**
 * Emits Rank information to the panel attached to the widget.
 * @param datawakeInfo The datawake info associated with the current tab.
 */
function emitRanks(datawakeInfo) {
    var url = addOnPrefs.datawakeDeploymentUrl + "/ranks/get";
    var post_data = JSON.stringify({
        domain: datawakeInfo.domain.name,
        trailname: datawakeInfo.trail.name,
        url: tabs.activeTab.url
    });
    requestHelper.post(url, post_data, function (response) {
        var rank = response.json.rank;
        var rankingInfo = {};
        rankingInfo.ranking = rank;
        mainPanel.port.emit("ranking", rankingInfo);
    });
}

/**
 * Sets the rank that the user rated the page.
 * @param rank_data
 */
function setUrlRank(rank_data) {
    rank_data.url = tabs.activeTab.url;
    var url = addOnPrefs.datawakeDeploymentUrl + "/ranks/set";
    console.debug("Posting Rank..");
    requestHelper.post(url, JSON.stringify(rank_data), function (response) {
        if (response.json.success) {
            console.debug("Successfully set rank..");
        }
    });
}

/**
 * Starts the lookahead timer.
 * @param datawakeInfo The datawake information associated with the search.
 * @param links The lookahead links to check.
 * @param index The current index of the link.
 * @param delay The delay between requests.
 */
function startLookaheadTimer(datawakeInfo, links, index, delay) {
    console.debug("Starting lookahead timer...");
    var post_data = {
        url: links[index],
        srcurl: tabs.activeTab.url,
        domain: datawakeInfo.domain.name
    };
    var url = addOnPrefs.datawakeDeploymentUrl + "/lookahead/matches";
    requestHelper.post(url, JSON.stringify(post_data), function (response) {
        var entities = response.json;
        if (entities.matches.length > 0 || entities.domain_search_matches.length > 0) {
            mainPanel.port.emit("lookaheadTimerResults", entities);
            //TODO: Fix the index Ugliness
            links.splice(index, 1);
            if (links.length > 0) {
                if (index >= links.length) {
                    index = 0;
                    if (delay <= 5 * 60 * 1000) {
                        lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                            startLookaheadTimer(datawakeInfo, links, index + 1, delayTimesTwo);
                        }, 2 * delay);
                    }
                }
                else {
                    startLookaheadTimer(datawakeInfo, links, index, delay);
                }
            }
        } else {
            index = (index + 1) % links.length;
            if (index == 0) {
                // pause for the delay at the begining of the list
                if (delay <= 5 * 60 * 1000) {
                    lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                        startLookaheadTimer(datawakeInfo, links, index, delayTimesTwo);
                    }, delay);
                }
            }
            else {
                lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                    startLookaheadTimer(datawakeInfo, links, index, delayTimesTwo);
                }, 1);
            }
        }
    }, function(err){
        console.info("lookahead error");
    });
}

/**
 * Sets the current badge count.
 * @param count The count to set the badge.
 */
function setBadge(count) {
    console.debug("Setting badge text.." + count);
    mainPanel.port.emit("badgeCount", count);
    //TODO: Set Badge text here when they get added.
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
    // Checks to see if they switched tabs really fast.
    if (tabId === tabs.activeTab.id) {
        clearTimers();
        if (badgeCount != undefined) {
            deleteBadgeForTab(tabId);
            badgeForTab[tabId] = badgeCount;
        }
        setBadge(badgeForTab[tabId]);
        //TODO: Reset Badge Color here.
        addValidTabAndData(datawakeInfo);
        getAllEntities(1000);
    }
}

function deleteBadgeForTab(tabId) {
    if (badgeForTab.hasOwnProperty(tabId))
        delete badgeForTab[tabId];
}

function cleanUpTab(tabId) {
    deleteBadgeForTab(tabId);
}