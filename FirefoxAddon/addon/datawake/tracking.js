var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var tabs = require("sdk/tabs");

var requestHelper = require("./request-helper");
var constants = require("./constants");
var storage = require("./storage");
var widgetHelper = require("./widget");
var selectionHelper = require("./selections");

exports.trackTab = trackTab;
exports.emitHighlightTextToTabWorker = emitHighlightTextToTabWorker;
exports.highlightTextWithToolTips = highlightTextWithToolTips;
exports.isTabWorkerAttached = isTabWorkerAttached;

/**
 * Storage object for tracking tabs
 * @type {{Dictionary}}
 */
var trackingTabWorkers = {};

/**
 * Tracks the current tab.
 * @param tab The tab to track.
 * @param datawakeInfo The datawake info associated with the tab.
 */
function trackTab(tab, datawakeInfo) {
    destoryTabWorker(tab.id);
    storage.setDatawakeInfo(tab.id, datawakeInfo);
    if (datawakeInfo.isDatawakeOn) {
        tab.on('pageshow', setupTabWorkerAndServices);
        tab.on('activate', switchTab);
        tab.on('close', close);
    } else {
        tab.removeListener('pageshow', setupTabWorkerAndServices);
        tab.removeListener('activate', switchTab);
        tab.removeListener('close', close);
    }
}

/**
 * Sets up the tab worker and services.
 * @param tab The tab that is being modified.
 */
function setupTabWorkerAndServices(tab) {
    var datawakeInfoForTab = storage.getDatawakeInfo(tab.id);
    if (datawakeInfoForTab.isDatawakeOn && constants.isValidUrl(tab.url)) {
        console.info("Tracking is on...");
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
        trackingTabWorker.port.emit("loadToolTips", [
            data.url("css/tooltipster.css"),
            data.url("css/tooltipster-noir.css"),
            data.url("css/tooltipster-punk.css"),
            data.url("css/highlight.css")
        ]);

        setTabWorker(tab.id, trackingTabWorker);


        //Posts the scrape contents to the server.
        trackingTabWorker.port.on("contents", function (data) {
            console.info("Scraping Page");
            var currentTrackingTabWorker = trackingTabWorkers[tab.id];
            data.url = currentTrackingTabWorker.tab.url;
            var url = addOnPrefs.datawakeDeploymentUrl + "/datawakescraper/scrape";
            requestHelper.post(url, JSON.stringify(data), function (response) {
                console.info("Setting up selections and advanced search");
                var scrapeObject = response.json;
                var postId = scrapeObject.id;
                //Sets up the context menu objects for this tab.
                if (currentTrackingTabWorker.tab != null) {
                    selectionHelper.useContextMenu(postId, currentTrackingTabWorker.tab.url);
                    widgetHelper.switchToTab(currentTrackingTabWorker, datawakeInfoForTab, scrapeObject.count);
                }
            });

        });
        //Emits the datawake info object associated with the tab.
        trackingTabWorker.port.emit("datawakeInfo", datawakeInfoForTab);
        //Scrapes the contents of the page
        trackingTabWorker.port.emit("getContents");

    }
    else {
        console.info("Tracking is off for this page...");
        destoryTabWorker(tab.id);
        widgetHelper.resetWidget();
    }
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
    if (tabId in trackingTabWorkers) {
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
    return tabId in trackingTabWorkers && trackingTabWorkers[tabId].tab != null;
}

/**
 * Destroys a worker associated with a tab.
 * @param tabId The tab id of the worker to destory.
 */
function destoryTabWorker(tabId) {
    if (tabId in trackingTabWorkers) {
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
    var datawakeInfoForTab = storage.getDatawakeInfo(tab.id);
    widgetHelper.switchToTab(tab.id, datawakeInfoForTab);
}

/**
 * The on close event for a tab.
 * @param tab Tab being closed.
 */
function close(tab) {
    destoryTabWorker(tab.id);
    selectionHelper.cleanUpTab(tab.id);
    widgetHelper.cleanUpTab(tab.id);
    storage.deleteDatawakeInfo(tab.id);
}