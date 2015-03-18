var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var ui = require('sdk/ui');
var tabs = require("sdk/tabs");

var storage = require("./storage");
var constants = require("./constants");
var requestHelper = require("./request-helper");
var tracking = require("./tracking");
var service = require("./service");
var panel = require("sdk/panel");
var notifications = require("sdk/notifications");
var trackingHelper = require("./tracking");

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

  // set up the tracker on the current / initial tab
  trackingHelper.setUpTab(tabs.activeTab);

  // set up a new tab listener to add the tracker to each new tab
  tabs.on("open", function(tab) {
    var datawakeInfo = storage.getRecentlyUsedDatawakeInfo();
    storage.setDatawakeInfo(tab.id, datawakeInfo);
    trackingHelper.setUpTab(tab);
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
      emitTrailEntities(worker, "memex", "brandon")
      emitTrailBasedLinks(worker, "memex", "brandon")
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

      worker.port.on("refreshEntities", function(domainAndTrail) {
        emitTrailEntities(worker, "memex", "brandon")
      });
      worker.port.on("refreshWebPages", function(domainAndTrail) {
        emitTrailBasedLinks(worker, "memex", "brandon")
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
    console.log("Trail Based Entities Retrieved")
    console.log(response.json)
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
    console.log("Trail Bases Links Retrieved");
    console.log(response.json);
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

/**
 * Changes the team and resets domain and trail for a tab,
 * and fetches valid domains for this team.
 * @param tabId
 * @param newteam
 * @param callback, function handles response for /domains call to the server.
 * @returns The altered datawakeinfo object
 */
function changeTeam(tabId, newteam, callback) {
  var info = storage.getDatawakeInfo(tabId)
  if (!info.team || info.team.id != newteam.id) {
    info.team = newteam
    info.domain = null;
    info.trail = null;
    info.isDatawakeOn = false;
    storage.setDatawakeInfo(tabId, info)

    service.getDomains(info.team.id, function(response) {
      if (response.status == 200) {
        var domains = response.json;
        callback(domains);
      } else {
        //TODO handle the error
        console.error("ERROR GETTING DOMAINS ");
        console.error(response);
      }
    })
  }
  return info;
}


function changeDomain(tabId, newdomain, callback) {
  var info = storage.getDatawakeInfo(tabId)
  if (!info.domain || info.domain.id != newdomain.id) {
    info.domain = newdomain
    info.trail = null;
    info.isDatawakeOn = false;
    storage.setDatawakeInfo(tabId, info)

    service.getTrails(info.team.id, info.domain.id, function(response) {
      if (response.status == 200) {
        var trails = response.json;
        callback(trails);
      } else {
        console.error("ERROR GETTING trails ");
        console.error(response);
      }
    })
  }
  return info;
}

/**
 * Marks an entity as invalid
 * @param entity Object(entity_value, entity_type, domain)
 */
function markInvalid(data) {
  var post_url = addOnPrefs.datawakeDeploymentUrl + "/feedback/invalid_feature";
  requestHelper.post(post_url, JSON.stringify(data), function(response) {
    sideBar.port.emit("marked", data.feature_value);
  });
}

function emitMarkedEntities(datawakeinfo) {
  var post_url = addOnPrefs.datawakeDeploymentUrl + "/feedback/get_invalid_features";
  var post_obj = {
    team_id: datawakeinfo.team.id,
    domain_id: datawakeinfo.domain.id,
    trail_id: datawakeinfo.trail.id
  }
  requestHelper.post(post_url, JSON.stringify(post_obj), function(response) {
    if (response.status != 200) {
      notifyError("Error retrieving invalid features for this trail.")
    } else {
      sideBar.port.emit("markedFeatures", response.json);
    }

  });
}

/**
 * Emits feedback entities
 * @param domain domainName
 */
function loadManualFeatures(info) {
  var post_url = addOnPrefs.datawakeDeploymentUrl + "/feedback/manual_features";
  var post_data = JSON.stringify({
    team_id: info.team.id,
    domain_id: info.domain.id,
    trail_id: info.trail.id,
    url: tabs.activeTab.url
  });
  requestHelper.post(post_url, post_data, function(response) {
    if (response.status != 200) {
      notifyError("Error getting manual features for this url.")
    } else {
      sideBar.port.emit("manualFeatures", response.json);
    }

  });
}

function openExternalTool(externalUrlObject) {
  console.log("Opening External Tool");
  tabs.open(externalUrlObject.externalUrl);
}

/**
 * Emits Rank information to the panel attached to the widget.
 * @param datawakeInfo The datawake info associated with the current tab.
 */
function emitRanks(datawakeInfo) {
  var url = addOnPrefs.datawakeDeploymentUrl + "/ranks/get";
  var post_data = JSON.stringify({
    team_id: datawakeInfo.team.id,
    domain_id: datawakeInfo.domain.id,
    trail_id: datawakeInfo.trail.id,
    url: tabs.activeTab.url
  });
  requestHelper.post(url, post_data, function(response) {
    var rank = response.json.rank;
    var rankingInfo = {};
    rankingInfo.ranking = rank;
    if (sideBar) sideBar.port.emit("ranking", rankingInfo);
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
  requestHelper.post(url, JSON.stringify(rank_data), function(response) {
    if (response.json.success) {
      console.debug("Successfully set rank..");
    }
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
