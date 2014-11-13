var contextMenu = require("sdk/context-menu");
var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var tabs = require("sdk/tabs");
var requestHelper = require("./request-helper");
var storage = require("./storage");
var tracking = require("./tracking");

exports.useContextMenu = useContextMenu;
exports.cleanUpTab = cleanUpTab;

var contextMenus = {};

/**
 * Turns on the context menu with the datawake.
 * @param tab The tab to add the context to.
 */
function useContextMenu(tab) {
    if (addOnPrefs.useContextMenu) {
        var url = tab.url;
        var tabId = tab.id;
        destroyPreviousContextMenu(tabId);
        var datawakeInfo = storage.getDatawakeInfo(tabId);
        contextMenus[tabId] = contextMenu.Menu({
            label: "Datawake Menu: " + datawakeInfo.domain.name,
            contentScriptFile: data.url("js/datawake/selections.js"),
            context: contextMenu.URLContext(url),
            items: [
                contextMenu.Item({ label: "Selection", data: "selection", context: contextMenu.SelectionContext()}),
                contextMenu.Item({ label: "Highlight All Selections", data: "highlight"}),
                contextMenu.Separator(),
                contextMenu.Item({ label: "Report Extraction Error", data: "feedback", context: contextMenu.SelectionContext()})
            ],
            onMessage: function (message) {
                var tabId = tabs.activeTab.id;
                var datawakeInfo = storage.getDatawakeInfo(tabId);
                switch (message.intent) {
                    case "highlight":
                        highlightAllTextOnPage(tabId, datawakeInfo);
                        break;
                    case "selection":
                        saveWindowSelection(datawakeInfo, tabs.activeTab.url, message.text);
                        break;
                    case "feedback":
                        saveFeedback(message.text, tabs.activeTab.url, datawakeInfo.domain.name);
                        break;
                }
            }
        });
    }
}

/**
 * Saves extractor feedback
 * @param raw_text raw_text that was highlighted
 * @param url the url it occurred on
 * @param domain domain it was apart of.
 */
function saveFeedback(raw_text, url, domain) {

    tracking.promptForExtractedFeedback(raw_text, function (type, extractedValue) {
        var post_obj = {};
        post_obj.raw_text = raw_text;
        post_obj.entity_value = extractedValue;
        post_obj.entity_type = type;
        post_obj.url = url;
        post_obj.domain = domain;
        function logSuccess(response) {
            console.log(raw_text + " was successfully saved as feedback.");
        }

        requestHelper.post(addOnPrefs.datawakeDeploymentUrl + "/feedback/good", JSON.stringify(post_obj), logSuccess);
    });

}

/**
 * Highlights all text on the current page.
 * @param tabId The Id of the tab to highlight.
 * @param datawakeInfo The datawake information associated with this request.
 */
function highlightAllTextOnPage(tabId, datawakeInfo) {
    var tabUrl = tabs.activeTab.url;
    var post_data = JSON.stringify({
        domain: datawakeInfo.domain.name,
        trail: datawakeInfo.trail.name,
        url: tabUrl
    });
    var post_url = addOnPrefs.datawakeDeploymentUrl + "/selections/get";
    requestHelper.post(post_url, post_data, function (response) {
        tracking.emitHighlightTextToTabWorker(tabId, response.json);
    });
}

/**
 * Saves the current window selection.
 * @param datawakeInfo The datawake information associated with this request.
 * @param url The url associated with this request.
 * @param selectionText The text selected.
 */
function saveWindowSelection(datawakeInfo, url, selectionText) {
    var post_data = JSON.stringify({
        url: url,
        selection: selectionText,
        domain: datawakeInfo.domain.name,

    });
    var post_url = addOnPrefs.datawakeDeploymentUrl + "/selections/save";
    requestHelper.post(post_url, post_data, function (response) {
        console.debug("Selection saved");
    });
}

/**
 * Cleans up the old context menu.
 * @param tabId TabId Associated with the menu
 */
function destroyPreviousContextMenu(tabId) {
    if (contextMenus.hasOwnProperty(tabId))
        contextMenus[tabId].destroy();
}

/**
 * Cleans up and frees all memory associated with a tab.
 * @param tabId The tabId to free.
 */
function cleanUpTab(tabId) {
    destroyPreviousContextMenu(tabId);
}