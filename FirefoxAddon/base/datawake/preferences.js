var addOnPrefs = require("sdk/simple-prefs").prefs;

exports.validatePreferences = validatePreferences;


function validatePreferences() {
    addOnPrefs.datawakeDeploymentUrl = addOnPrefs.datawakeDeploymentUrl.trim();
    addOnPrefs.googleClientId = addOnPrefs.googleClientId.trim();
    addOnPrefs.googleClientSecret = addOnPrefs.googleClientSecret.trim();
}