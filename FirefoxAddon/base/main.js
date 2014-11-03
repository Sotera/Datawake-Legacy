//Datawake Components
require("sdk/preferences/service").set("extensions.sdk.console.logLevel", "info");
var datawakeNewTabHelper = require("./datawake/overlay");
var buttonHelper = require("./datawake/button");
buttonHelper.useButton();
datawakeNewTabHelper.useDatawake();
