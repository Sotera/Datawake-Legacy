var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var ui = require('sdk/ui');
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
exports.resetIcon = resetIcon;
exports.activeIcon = activeIcon;

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
    mainPanel.port.emit("useDomainFeatures", addOnPrefs.useDomainFeatures);
    mainPanel.port.emit("useLookahead", addOnPrefs.useLookahead);
    mainPanel.port.emit("useRanking", addOnPrefs.useRanking);
    mainPanel.port.emit("versionNumber", self.version)

}

/**
 * Gets all entities associated for this url
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
 * @returns {Array} The entities that are in this domain.
 * @param domainExtracted
 */
function getEntitiesInDomain(domainExtracted) {
    var entitiesInDomain = [];
    for (var type in domainExtracted) {
        for (var index in domainExtracted[type]) {
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
    datawakeButton = ui.ActionButton({
        id: "datawake-widget",
        label: "Datawake Widget",
        icon: data.url("img/waveicon38_bw.png"),
        onClick: onToggle
    });

    setupListeners();
}

/**
 * Handles the button when the panel's hide even is triggered.
 */
function handleHide() {
    datawakeButton.state('window', {checked: false});
}

/**
 * Function that overrides a new tab.
 */
function overrideActiveTab() {
    tabs.activeTab.url = data.url("html/datawake-tab-panel.html");
}

/**
 * Sets up the timer for the lookahead.
 */
function setupListeners() {
    try {

        mainPanel.port.on("startLookaheadTimer", function (lookaheadTimerObject) {
            var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
            startLookaheadTimer(datawakeInfo, lookaheadTimerObject.links, 0, 1000);
        });

        mainPanel.port.on("setUrlRank", setUrlRank);
        mainPanel.port.on("openExternalLink", openExternalTool);
        mainPanel.port.on("markInvalid", markInvalid);
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
        emitFeedbackEntities(datawakeInfo.domain.name);
        emitRanks(datawakeInfo);
        emitMarkedEntities(datawakeInfo.domain.name);

        mainPanel.show({position: datawakeButton});
    }
    else {
        //Emit that it is not a valid tab.
        overrideActiveTab();
        resetToggleButton();
        console.debug("Invalid Tab");
    }

}
/**
 * Marks an entity as in valid
 * @param entity Object(entity_value, entity_type, domain)
 */
function markInvalid(entity) {
    var post_url = addOnPrefs.datawakeDeploymentUrl + "/feedback/bad";
    requestHelper.post(post_url, JSON.stringify(entity), function (response) {
        mainPanel.port.emit("marked", entity.value);
    });
}

function emitMarkedEntities(domain) {
    var post_url = addOnPrefs.datawakeDeploymentUrl + "/feedback/marked";
    requestHelper.post(post_url, JSON.stringify({domain: domain}), function (response) {
        var marked_entities = response.json.marked_entities;
        for (var index in marked_entities)
            mainPanel.port.emit("marked", marked_entities[index].value);
    });
}

/**
 * Emits feedback entities
 * @param domain domainName
 */
function emitFeedbackEntities(domain) {
    var post_url = addOnPrefs.datawakeDeploymentUrl + "/feedback/entities";
    var post_data = JSON.stringify({
        domain: domain,
        url: tabs.activeTab.url
    });
    requestHelper.post(post_url, post_data, function (response) {
        var entities = response.json.entities;
        mainPanel.port.emit("feedbackEntities", entities);
    });
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
        var objectReturned;
        if (objectReturned = entities.matches.length > 0 || entities.domain_search_matches.length > 0) {
            mainPanel.port.emit("lookaheadTimerResults", entities);
            links.splice(index, 1);
            if (index >= links.length) {
                index = 0;
            }
        } else {
            index = (index + 1) % links.length;
        }
        if (links.length > 0) {
            if (objectReturned) {
                startLookaheadTimer(datawakeInfo, links, index, delay);
            } else if (index == 0) {
                lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                    startLookaheadTimer(datawakeInfo, links, index, delayTimesTwo);
                }, 2 * delay);
            } else {
                lookaheadTimerId = timer.setTimeout(function (delayTimesTwo) {
                    startLookaheadTimer(datawakeInfo, links, index, delayTimesTwo);
                }, 1);
            }
        }
    }, function (err) {
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
function activeIcon() {
    datawakeButton.icon = data.url("img/waveicon38.png");
}

function resetIcon() {
    datawakeButton.icon = data.url("img/waveicon38_bw.png");
}

function deleteBadgeForTab(tabId) {
    if (badgeForTab.hasOwnProperty(tabId))
        delete badgeForTab[tabId];
}

function cleanUpTab(tabId) {
    deleteBadgeForTab(tabId);
}

tabs.on("activate", function (tab) {
    var datawakeInfoForTab = storage.getDatawakeInfo(tab.id);
    if (datawakeInfoForTab != null && datawakeInfoForTab.isDatawakeOn) {
        activeIcon();
    } else {
        resetIcon();
    }
});
