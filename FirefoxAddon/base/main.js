//Datawake Components
var datawakeNewTabHelper = require("./datawake/overlay");
var buttonHelper = require("./datawake/button");
var preferenceHelper = require("./datawake/preferences");

preferenceHelper.validatePreferences();
buttonHelper.useButton();
datawakeNewTabHelper.useDatawake();