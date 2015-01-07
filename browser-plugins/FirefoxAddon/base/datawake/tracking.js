var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var tabs = require("sdk/tabs");

var requestHelper = require("./request-helper");
var constants = require("./constants");
var storage = require("./storage");
var widgetHelper = require("./button");
var timer = require("sdk/timers");
var service = require("./service");
var selectionHelper = require("./selections");

exports.trackTab = trackTab;
exports.emitHighlightTextToTabWorker = emitHighlightTextToTabWorker;
exports.highlightTrailEntities = highlightTrailEntities;
exports.hideSelections = hideSelections;
exports.highlightTextWithToolTips = highlightTextWithToolTips;
exports.promptForExtractedFeedback = promptForExtractedFeedback;
exports.promptTrailBasedEntity = promptTrailBasedEntity;
exports.promptIrrelevantTrailBasedEntity = promptIrrelevantTrailBasedEntity;
exports.isTabWorkerAttached = isTabWorkerAttached;

/**
 * Storage object for tracking tabs
 * @type {{Dictionary}}
 */
var trackingTabWorkers = {};
var advanceSearchTimerId;

/**
 * Tracks the current tab.
 * @param tab The tab to track.
 * @param datawakeInfo The datawake info associated with the tab.
 */
function trackTab(tab, datawakeInfo) {
    var tabId = tab.id;
    destoryTabWorker(tabId);
    storage.setDatawakeInfo(tabId, datawakeInfo);
    if (datawakeInfo.isDatawakeOn) {
        tab.on('ready', setupTabWorkerAndServices);
        tab.on('activate', switchTab);
        tab.on('close', function (other) {
            close(tabId);
        });
        widgetHelper.activeIcon();
    } else {
        tab.removeListener('ready', setupTabWorkerAndServices);
        tab.removeListener('activate', switchTab);
        tab.removeListener('close', close);
        widgetHelper.resetIcon();
    }
}

function promptForExtractedFeedback(highlightedText, callback) {
    var currentTrackingTabWorker = trackingTabWorkers[tabs.activeTab.id];
    var obj = {};
    obj.raw_text = highlightedText;
    currentTrackingTabWorker.port.emit("promptForFeedback", obj);
    currentTrackingTabWorker.port.on("feedback", function (response) {
        callback(response.type, response.value);
    });
}

function promptTrailBasedEntity(entity, callback){
    var obj = {};
    obj.raw_text = entity.trim();
    obj.prompt = "Add trail based entity?";
    obj.callback = "trailEntity";
    promptForInput(obj, callback);
}

function promptIrrelevantTrailBasedEntity(entity, callback){
    var obj = {};
    obj.raw_text = entity.trim();
    obj.prompt = "Add irrelevant trail entity?";
    obj.callback = "irrelevantEntity";
    promptForInput(obj, callback);
}

function promptForInput(obj, callback){
    var currentTrackingTabWorker = trackingTabWorkers[tabs.activeTab.id];
    currentTrackingTabWorker.port.emit("promptTrailBasedEntity", obj);
    currentTrackingTabWorker.port.on(obj.callback, function(text){
        callback(text);
    });
}

function hideSelections(className){
    var currentTrackingTabWorker = trackingTabWorkers[tabs.activeTab.id];
    currentTrackingTabWorker.port.emit("removeSelections", className);
}

function highlightTrailEntities(entities){
    var currentTrackingTabWorker = trackingTabWorkers[tabs.activeTab.id];
    currentTrackingTabWorker.port.emit("highlightTrailEntities", entities);
}

/**
 * Sets up the tab worker and services.
 * @param tab The tab that is being modified.
 */
function setupTabWorkerAndServices(tab) {
    var datawakeInfoForTab = storage.getDatawakeInfo(tab.id);
    if (datawakeInfoForTab.isDatawakeOn && constants.isValidUrl(tab.url)) {
        console.debug("Tracking is on...");
        var trackingTabWorker = tab.attach({
            contentScriptFile: [
                data.url("js/min/jquery-1.11.1.min.js"),
                data.url("js/min/jquery-ui-1.10.4.custom.min.js"),
                data.url("js/min/jquery.highlight-4.js"),
                data.url("js/min/jquery.tooltipster.min.js"),
                data.url("js/datawake/tracking.js")
            ]
        });
        //Loads CSS files in jQuery
        trackingTabWorker.port.on("getToolTips", function () {
            trackingTabWorker.port.emit("loadToolTips", [
                data.url("css/tooltipster.css"),
                data.url("css/tooltipster-noir.css"),
                data.url("css/tooltipster-punk.css"),
                data.url("css/highlight.css")
            ]);
        });

        setTabWorker(tab.id, trackingTabWorker);

        //Posts the scrape contents to the server.
        trackingTabWorker.port.on("contents", function (pageContents) {
            var currentTrackingTabWorker = trackingTabWorkers[tab.id];
            var datawakeInfoForTab = storage.getDatawakeInfo(tab.id);
            if (addOnPrefs.useScraper) {
                console.debug("Scraping Page");
                pageContents.url = currentTrackingTabWorker.tab.url;
                pageContents.domain = datawakeInfoForTab.domain.name;
                pageContents.trail = datawakeInfoForTab.trail.name;
                var url = addOnPrefs.datawakeDeploymentUrl + "/scraper/scrape";
                requestHelper.post(url, JSON.stringify(pageContents), function (response) {
                    console.debug("Setting up selections and advanced search");
                    var scrapeObject = response.json;
                    //Sets up the context menu objects for this tab.
                    if (scrapeObject && currentTrackingTabWorker.tab != null) {
                        getDomainExtractedEntities(1000);
                        widgetHelper.switchToTab(currentTrackingTabWorker.tab.id, scrapeObject.count);
                    }
                });
            } else {
                widgetHelper.switchToTab(currentTrackingTabWorker.tab.id, 0);
            }
            selectionHelper.useContextMenu(currentTrackingTabWorker.tab);
        });

    }
    else {
        console.debug("Tracking is off for this page...");
        destoryTabWorker(tab.id);
    }
}

/**
 * Gets all entities associated for this url
 * @param delay Timeout delay between each call.
 */
function getDomainExtractedEntities(delay) {
    if (isTabWorkerAttached(tabs.activeTab.id) && constants.isValidUrl(tabs.activeTab.url)) {
        var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
        var tabUrl = tabs.activeTab.url;
        service.getDomainExtractedEntities(datawakeInfo.domain.name, tabUrl, function (entities) {
            if (entities.domainExtracted != null && Object.keys(entities.domainExtracted).length > 0) {
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
                    getDomainExtractedEntities(newDelay);
                }, delay * 2);
            }

        });
    } else {
        console.debug("The Datawake is not on for this tab.");
    }
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
 * Gets the external links for this instance and highlights the entities in the array.
 * @param entitiesInDomain Entities to highlight.
 */
function highlightExtractedLinks(entitiesInDomain) {
    service.getExternalLinks(function (externalLinks) {
        var highlightObject = {};
        highlightObject.entities = entitiesInDomain;
        highlightObject.links = externalLinks;
        console.debug("Emitting data to highlight");
        highlightTextWithToolTips(tabs.activeTab.id, highlightObject);
    });
}

/**
 * Sends the highlight object to the tab worker.
 * @param tabId The tab id to get the worker.
 * @param highlightList The highlight information to send.
 */
function emitHighlightTextToTabWorker(tabId, highlightList) {
    var currentTrackingTabWorker = trackingTabWorkers[tabId];
    currentTrackingTabWorker.port.emit("highlight", highlightList);
}

/**
 * Highlights text with tooltips.
 * @param tabId The id of the tab to highlight.
 * @param helperObject The helper object to forward to the worker.
 */
function highlightTextWithToolTips(tabId, helperObject) {
    if (trackingTabWorkers.hasOwnProperty(tabId) && addOnPrefs.useHighlighting) {
        var tabWorker = trackingTabWorkers[tabId];
        tabWorker.port.emit("highlightWithToolTips", helperObject);
    }
}

/**
 * A method that checks to see if a tab is attached to a worker.
 * @param tabId The tab id to check.
 * @returns {boolean} True if the worker exists and there is a tab associated with it.
 */
function isTabWorkerAttached(tabId) {
    return trackingTabWorkers.hasOwnProperty(tabId) && trackingTabWorkers[tabId].tab != null;
}

/**
 * Destroys a worker associated with a tab.
 * @param tabId The tab id of the worker to destory.
 */
function destoryTabWorker(tabId) {
    if (trackingTabWorkers.hasOwnProperty(tabId)) {
        trackingTabWorkers[tabId].destroy();
    }
}

/**
 * Associated a worker and tab id.
 * @param tabId Tab Id to associate worker.
 * @param worker Worker to associate.
 */
function setTabWorker(tabId, worker) {
    destoryTabWorker(tabId);
    trackingTabWorkers[tabId] = worker;
}

/**
 * Switches the widget to a new tab.
 * @param tab Tab to switch.
 */
function switchTab(tab) {
    timer.clearInterval(advanceSearchTimerId);
    widgetHelper.switchToTab(tab.id);
}

/**
 * The on close event for a tab.
 * @param tabId Tab Id being closed.
 */
function close(tabId) {
    destoryTabWorker(tabId);
    selectionHelper.cleanUpTab(tabId);
    widgetHelper.cleanUpTab(tabId);
    storage.deleteDatawakeInfo(tabId);
}
