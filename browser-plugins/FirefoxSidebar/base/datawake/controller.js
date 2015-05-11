var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var ui = require('sdk/ui');
var tabs = require("sdk/tabs");

var constants = require("./constants");
var requestHelper = require("./request-helper");
var service = require("./service");
var panel = require("sdk/panel");
var notifications = require("sdk/notifications");

var contextMenu = require("sdk/context-menu");


exports.useContextMenu = useContextMenu;
exports.loadDatawake = loadDatawake;
exports.resetIcon = resetIcon;
exports.activeIcon = activeIcon;
exports.notifyError = notifyError;

var datawakeButton;
var sideBar;
var loginPanel;
var badgeForTab = {};


var authHelper = require("./auth-helper");
var signedIn = false;
var userInfo = null;
var workerArray = [];
var datawakeInfo = null;

// Listen for tab content loads.
tabs.on('ready', function(tab) {
  console.log('tab is loaded', tab.title, tab.url);
  console.debug("Scraping Page");
  pageContents = {};
  pageContents.url = tabs.activeTab.url;
  pageContents.domain = datawakeInfo.domain.name;
  pageContents.trail = datawakeInfo.trail.name;
  tab.attach({
    contentScript: "self.postMessage(document.body.innerHTML);",
    onMessage: function(data) {
      pageContents.html = encodeURIComponent(data);
      var url = addOnPrefs.datawakeDeploymentUrl + "/scraper/scrape";
      requestHelper.post(url, JSON.stringify(pageContents), function(response) {
        console.debug("Setting up selections and advanced search");
        var scrapeObject = response.json;
        console.log(scrapeObject);
        //Sets up the context menu objects for this tab.
        if (scrapeObject && currentTrackingTabWorker.tab != null) {
          getDomainExtractedEntities(1000);
          widgetHelper.switchToTab(currentTrackingTabWorker.tab.id, scrapeObject.count);
        }
      });
    }
  });
});

/**
 * Load and start datawake components
 */
function loadDatawake() {

  datawakeInfo = newDatawakeInfo();

  // attach panels (logon panel and main panel) to the datawake action button
  attachActionButton();
}

/**
 * Clear all datawake state.
 * used on signout
 */
function clearAllState() {
  if (sideBar) {
    sideBar.destroy();
    sideBar = null;
  }
  if (loginPanel) {
    loginPanel.destory();
    loginPanel = null;
  }
  datawakeInfo = null;
  userInfo = null;
  signedIn = false;
}



/**
 * Creates the Datawake Widgets and attaches a panel for the search contents.
 */
function attachActionButton() {

  datawakeButton = ui.ActionButton({
    id: "datawake-widget",
    label: "Datawake Widget",
    icon: data.url("img/waveicon38_bw.png"),
    onClick: onToggle
  });
}

/**
 * Sets up the required information when the ToggleButton is clicked.
 * Opens the login or datawake panel as needed
 * @param state The state of the ToggleButton.
 */
function onToggle(state) {

  // load the main datawake panel
  if (signedIn) {
    activeIcon();
    launchDatawakeSidebar();
  }
  // load the login panel
  else {
    launchLoginPanel();
  }

}

function attachWorker(worker) {
  workerArray.push(worker);
}

function detachWorker(worker) {
  var index = workerArray.indexOf(worker);
  if (index != -1) {
    workerArray.splice(index, 1);
  }
}

function launchDatawakeSidebar() {
  if (sideBar != null || sideBar != undefined) {
    sideBar.destroy();
  }

  sideBar = require("sdk/ui/sidebar").Sidebar({
    id: 'datawake-prefetch',
    title: 'Datawake Prefetch',
    url: require("sdk/self").data.url("html/datawake-widget-panel.html"),
    onReady: function(worker) {
      attachWorker(worker);
      worker.port.emit("ready", {
        datawakeInfo: datawakeInfo,
        versionNumber: self.version,
        current_url: tabs.activeTab.url,
      });
      worker.port.on("refreshEntities", function() {
        emitTrailEntities(worker, datawakeInfo.domain.name, datawakeInfo.trail.name)
      });
      worker.port.on("refreshWebPages", function() {
        emitTrailBasedLinks(worker, datawakeInfo.domain.name, datawakeInfo.trail.name)
      });
      worker.port.on("getUrlEntities", function(data) {
        getUrlEntities(worker, data)
      });
      worker.port.on("infochanged", function(infoObj) {
        datawakeInfo = infoObj;
        worker.port.emit("infosaved", infoObj)
      });
      worker.port.on("removeLink", function(data) {
        removeTrailBasedLink(worker, data)
      });
      worker.port.on("signOut", function() {
        authHelper.signOut(function(response) {
          clearAllState()
        });
      });
      worker.port.on("refreshTrails", function(domain) {
        console.debug("Getting trails for " + domain + "!");
        service.getTrails(domain, function(response) {
          if (response.status != 501) {
            worker.port.emit("trails", response.trails);
          } else {
            console.error("There was an error getting trails: " + response.message);
          }
        });
      });
    },
    onDetach: detachWorker
  })
  sideBar.show();
}

function removeTrailBasedLink(worker, data) {
  var post_data = {};
  post_data.domain = data.domain;
  post_data.trail = data.trail;
  post_data.url = data.url;
  var post_url = addOnPrefs.datawakeDeploymentUrl + "/trails/deleteLink";
  requestHelper.post(post_url, JSON.stringify(post_data), function(response) {
    worker.port.emit("removeTrailLink");
  });
}

function getUrlEntities(worker, data) {
  var url = addOnPrefs.datawakeDeploymentUrl + "/trails/urlEntities";
  var post_data = JSON.stringify({
    domain: data.domain.name,
    trail: data.trail.name,
    url: data.url
  });
  requestHelper.post(url, post_data, function(response) {
    worker.port.emit("urlEntities", response.json.entities);
  });
}

function emitTrailEntities(worker, domain, trail) {
  var post_url = addOnPrefs.datawakeDeploymentUrl + "/trails/entities";
  var post_data = JSON.stringify({
    domain: domain,
    trail: trail
  });
  requestHelper.post(post_url, post_data, function(response) {
    worker.port.emit("trailEntities", response.json);
  });
}

function emitTrailBasedLinks(worker, domain, trail) {
  var post_url = addOnPrefs.datawakeDeploymentUrl + "/trails/links";
  var post_data = JSON.stringify({
    domain: domain,
    trail: trail
  });
  requestHelper.post(post_url, post_data, function(response) {
    worker.port.emit("trailLinks", response.json);
  });
}

function activeIcon() {
  datawakeButton.icon = data.url("img/waveicon38.png");
}

function resetIcon() {
  datawakeButton.icon = data.url("img/waveicon38_bw.png");
}

function notifyError(message) {
  notifications.notify({
    title: "Datawake Error",
    text: message,
    iconURL: self.data.url("img/waveicon38.png"),
  });
}

/**
 * When the user is not signed in and clicks on the datawake button
 * we show the login panel.
 */
function launchLoginPanel() {

  if (loginPanel != null && loginPanel != undefined) {
    loginPanel.destroy()
  }

  loginPanel = panel.Panel({
    contentURL: data.url("html/login-panel.html"),
    contentScriptOptions: {
      authType: authHelper.authType()
    }
  });

  loginPanel.port.on("signIn", function() {
    authHelper.signIn(function(response) {
      signedIn = true;
      userInfo = response.json
      loginPanel.destroy()
      loginPanel = null;
      activeIcon();
      launchDatawakeSidebar();
      useContextMenu();
      notifications.notify({
        title: "Datawake Sign On",
        text: "Sign On Successful.  Click the datawake button to begin.",
        iconURL: self.data.url("img/waveicon38.png"),
        onClick: function(data) {
          console.log("clicked it")
        }
      });
    });
  });

  loginPanel.port.on("signOut", function() {
    authHelper.signOut(function(response) {
      clearAllState()
    });
  });
  loginPanel.show();
}

function getEntities(domain, callback) {
  service.getEntities(domain, tabs.activeTab.url, callback);

}

// Begin Copy and Paste

function newDatawakeInfo() {
    var dataWake = {};
    dataWake.domain = null;
    dataWake.trail = null;
    dataWake.isDatawakeOn = false;
    dataWake.team = null;
    return dataWake;
  }
  /**
   * Turns on the context menu with the datawake.
   * @param tab The tab to add the context to.
   */
function useContextMenu() {
  contextMenu.Menu({
    label: 'Datawake Prefetch',
    contentScriptFile: data.url("js/datawake/selections.js"),
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
  promptTrailBasedEntity(entity, function(text) {
    addTrailEntity(domain, trail, text);
  });
}

function addCustomIrrelevantTrailEntity(domain, trail, entity) {
  promptIrrelevantTrailBasedEntity(entity, function(text) {
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

function promptTrailBasedEntity(entity, callback) {
  var obj = {};
  obj.raw_text = entity.trim();
  obj.prompt = "Add trail based entity?";
  obj.callback = "trailEntity";
  promptForInput(obj, callback);
}

function promptIrrelevantTrailBasedEntity(entity, callback) {
  var obj = {};
  obj.raw_text = entity.trim();
  obj.prompt = "Add irrelevant trail entity?";
  obj.callback = "irrelevantEntity";
  promptForInput(obj, callback);
}

function highlightTrailEntities(entities) {
  var currentTrackingTabWorker = trackingTabWorkers[tabs.activeTab.id];
  currentTrackingTabWorker.port.emit("highlightTrailEntities", entities);
}

function promptForInput(obj, callback) {
  var worker = workerArray[0]
  worker.port.emit("promptTrailBasedEntity", obj);
  worker.port.on(obj.callback, function(text) {
    callback(text);
  });
}
