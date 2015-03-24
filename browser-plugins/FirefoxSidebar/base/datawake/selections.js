var contextMenu = require("sdk/context-menu");
var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var tabs = require("sdk/tabs");
var requestHelper = require("./request-helper");
var storage = require("./storage");

exports.useContextMenu = useContextMenu;
exports.cleanUpTab = cleanUpTab;

/**
 * Turns on the context menu with the datawake.
 * @param tab The tab to add the context to.
 */
function useContextMenu() {
  contextMenu.Menu({
    label: 'Datawake Prefetch',
    contentScriptFile: data.url("js/datawake/selections.js"),
    // context: contextMenu.URLContext(url),
    items: [
      contextMenu.Item({
        label: "Add Entity",
        data: "add-entity",
        context: contextMenu.SelectionContext()
      }),
      contextMenu.Item({
        label: "Add Irrelevant Entity",
        data: "add-irrelevant-entity",
        context: contextMenu.SelectionContext()
      }),
      contextMenu.Item({
        label: "Add Custom Entity",
        data: "add-entity-custom"
      }),
      contextMenu.Item({
        label: "Add Custom Irrelevant Entity",
        data: "add-irrelevant-entity-custom"
      }),
      contextMenu.Separator(),
      contextMenu.Item({
        label: "Show Selections",
        data: "show-trail"
      }),
      contextMenu.Item({
        label: "Hide Selections",
        data: "hide-trail"
      })
    ]
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