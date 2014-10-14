var requestHelper = require("./request-helper");

exports.getExternalLinks = getExternalLinks;

var externalLinks = null;

function getExternalLinks(callback) {
    if (externalLinks == null) {
        requestHelper.get(addOnPrefs.datawakeDeploymentUrl + "/external_links/get", function (response) {
            externalLinks = response;
            callback(externalLinks);
        });
    } else {
        callback(externalLinks);
    }
}