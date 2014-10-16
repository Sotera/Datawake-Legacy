//Datawake Components
var datawakeNewTabHelper = require("./datawake/overlay");
var widgetHelper = require("./datawake/widget");
var preferenceHelper = require("./datawake/preferences");

preferenceHelper.validatePreferences();
widgetHelper.useWidget();
datawakeNewTabHelper.useDatawake();