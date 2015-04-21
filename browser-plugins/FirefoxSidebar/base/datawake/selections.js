var contextMenu = require("sdk/context-menu");
var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var tabs = require("sdk/tabs");
var notifications = require("sdk/notifications");
var requestHelper = require("./request-helper");
var storage = require("./storage");
var tracking = require("./tracking");

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
    ],
    onMessage: function(message) {
      var tabId = tabs.activeTab.id;
      var datawakeInfo = storage.getDatawakeInfo(tabId);
      switch (message.intent) {
        case "add-entity-custom":
          addCustomTrailEntity(datawakeInfo.domain.name, datawakeInfo.trail.name, message.text);
          break;
        case "add-irrelevant-entity-custom":
          addCustomIrrelevantTrailEntity(datawakeInfo.domain.name, datawakeInfo.trail.name, message.text);
          break;
        case "add-entity":
          addTrailEntity(datawakeInfo.domain.name, datawakeInfo.trail.name, message.text);
          break;
        case "add-irrelevant-entity":
          addIrrelevantTrailEntity(datawakeInfo.domain.name, datawakeInfo.trail.name, message.text);
          break;
        case "show-trail":
          showTrailEntities(datawakeInfo.domain.name, datawakeInfo.trail.name);
          break;
        case "hide-trail":
          hideSelections("trailentities");
          break;
      }
    }
  });
}

function hideSelections(className) {
  tracking.hideSelections(className);
}

function showTrailEntities(domain, trail) {
  var post_obj = JSON.stringify({
    domain: domain,
    trail: trail
  });
  requestHelper.post(addOnPrefs.datawakeDeploymentUrl + "/trails/entities", post_obj, function(response) {
    var entities = [];
    for (var entity in response.json.entities)
      entities.push({
        entity: entity
      });
    tracking.highlightTrailEntities(entities);
  });
}

function addCustomTrailEntity(domain, trail, entity) {
  tracking.promptTrailBasedEntity(entity, function(text) {
    addTrailEntity(domain, trail, text);
  });
}

function addCustomIrrelevantTrailEntity(domain, trail, entity) {
  tracking.promptIrrelevantTrailBasedEntity(entity, function(text) {
    addIrrelevantTrailEntity(domain, trail, text);
  });
}

function addTrailEntity(domain, trail, entity) {
  var post_obj = JSON.stringify({
    domain: domain,
    trail: trail,
    entity: entity
  });
  requestHelper.post(addOnPrefs.datawakeDeploymentUrl + "/trails/entity", post_obj, function(response) {
    var myIconURL = data.url("img/waveicon38.png");
    notifications.notify({
      text: "Successfully added " + entity + " as an entity!",
      title: "Datawake",
      iconURL: myIconURL
    });
  });
}

function addIrrelevantTrailEntity(domain, trail, entity) {
  var post_obj = JSON.stringify({
    domain: domain,
    trail: trail,
    entity: entity
  });
  requestHelper.post(addOnPrefs.datawakeDeploymentUrl + "/trails/irrelevant", post_obj, function(response) {
    var myIconURL = data.url("img/waveicon38.png");
    notifications.notify({
      text: "Successfully added " + entity + " as an irrelevant entity!",
      title: "Datawake",
      iconURL: myIconURL
    });
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