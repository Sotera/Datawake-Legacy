var addOnPrefs = require("sdk/simple-prefs").prefs;
var requestHelper = require("./request-helper");

exports.getExternalLinks = getExternalLinks;

var externalLinks = null;

function getExternalLinks(callback) {
    if (externalLinks == null) {
        requestHelper.get(addOnPrefs.datawakeDeploymentUrl + "/tools/get", function (response) {
            externalLinks = response;
            callback(externalLinks);
        });
    } else {
        callback(externalLinks);
    }
}