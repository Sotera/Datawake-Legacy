var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var ui = require('sdk/ui');
var tabs = require("sdk/tabs");

var storage = require("./storage");
var constants = require("./constants");
var requestHelper = require("./request-helper");
var service = require("./service");
var panel = require("sdk/panel");
var notifications = require("sdk/notifications");

exports.loadDatawake = loadDatawake;
exports.resetIcon = resetIcon;
exports.activeIcon = activeIcon;
exports.notifyError = notifyError;
exports.getFeaturesForPanel = getFeaturesForPanel;

var datawakeButton;
var sideBar;
var loginPanel;
var badgeForTab = {};


var authHelper = require("./auth-helper");
var signedIn = false;
var userInfo = null;
var workerArray = [];


/**
 * Load and start datawake components
 */
function loadDatawake() {

  // attach panels (logon panel and main panel) to the datawake action button
  attachActionButton();

  // set up a new tab listener to add the tracker to each new tab
  tabs.on("open", function(tab) {
    var datawakeInfo = storage.getRecentlyUsedDatawakeInfo();
    storage.setDatawakeInfo(tab.id, datawakeInfo);
    // trackingHelper.setUpTab(tab);
  });

  // touch the datawake info for this tab so that it is the most recently used
  // and get set the button icon for on / off
  tabs.on("activate", function(tab) {
    var datawakeInfoForTab = storage.getDatawakeInfo(tab.id);
    if (datawakeInfoForTab != null && datawakeInfoForTab.isDatawakeOn) {
      activeIcon();
    } else {
      resetIcon();
    }
  });
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
  storage.clear();
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
 * Handles the button when the panel's hide even is triggered.
 */
function handleHide() {
  datawakeButton.state('window', {
    checked: false
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
    launchDatawakePanel();
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

function launchDatawakePanel() {
  var datawakeInfo = storage.getDatawakeInfo(tabs.activeTab.id);
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
        // starUrl: data.url("css/icons/"),
        datawakeInfo: datawakeInfo,
        useDomainFeatures: addOnPrefs.useDomainFeatures,
        useLookahead: addOnPrefs.useLookahead,
        // useRanking: addOnPrefs.useRanking,
        versionNumber: self.version,
        current_url: tabs.activeTab.url,
        pageVisits: badgeForTab[tabs.activeTab.id]
      });

      worker.port.on("refreshEntities", function(domainAndTrail) {
        emitTrailEntities(worker, domainAndTrail.domain, domainAndTrail.trail)
      });
      worker.port.on("refreshWebPages", function(domainAndTrail) {
        emitTrailBasedLinks(worker, domainAndTrail.domain, domainAndTrail.trail)
      });
    },
    onDetach: detachWorker,
    onAttach: function(worker) {
      attachWorker(worker);
      worker.port.emit("ready", {
        starUrl: data.url("css/icons/"),
        datawakeInfo: datawakeInfo,
        useDomainFeatures: addOnPrefs.useDomainFeatures,
        useLookahead: addOnPrefs.useLookahead,
        useRanking: addOnPrefs.useRanking,
        versionNumber: self.version,
        current_url: tabs.activeTab.url,
        pageVisits: badgeForTab[tabs.activeTab.id]
      });
    }
  })
  sideBar.show();
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

/**
 *
 */
function getFeaturesForPanel(datawakeinfo) {
  if (sideBar) {
    if (constants.isValidUrl(tabs.activeTab.url)) {

      service.getEntities(tabs.activeTab.url, function(response) {
        if (response.status != 200) notifyError("Error getting features for this url.")
        else sideBar.port.emit("features", response.json);
      });

      service.getDomainExtractedEntities(datawakeinfo.team.id, datawakeinfo.domain.id, tabs.activeTab.url, function(response) {
        if (response.status != 200) notifyError("Error getting domain features for this url.")
        else sideBar.port.emit("domain_features", response.json);
      });

      // get manually labeled features
      loadManualFeatures(datawakeinfo);

      // get list of features marked as invalid
      emitMarkedEntities(datawakeinfo);

    }
  }
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
    onHide: handleHide,
    contentScriptOptions: {
      authType: authHelper.authType()
    }
  });

  loginPanel.port.on("signIn", function() {
    authHelper.signIn(function(response) {
      signedIn = true;
      userInfo = response.json
        //loginPanel.port.emit("sendUserInfo", response.json);
      loginPanel.destroy()
      loginPanel = null;
      notifications.notify({
        title: "Datawake Sign On",
        text: "Sign On Successful.  Click the datawake button to begin.",
        iconURL: self.data.url("img/waveicon38.png"),
        onClick: function(data) {
          console.log("clicked it")
          launchDatawakePanel()
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