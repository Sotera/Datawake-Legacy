var self = require("sdk/self");
var data = self.data;
var addOnPrefs = require("sdk/simple-prefs").prefs;
var requestHelper = require("./request-helper");

exports.getEntities = getEntities;
exports.getDomainExtractedEntities = getDomainExtractedEntities;
exports.getExternalLinks = getExternalLinks;


function getEntities(domain, url, callback) {
    var entitiesUrl = addOnPrefs.datawakeDeploymentUrl + "/visited/entities";
    var post_data = JSON.stringify({
        url: url,
        domain: domain
    });
    requestHelper.post(entitiesUrl, post_data, function (response) {
        var entities = response.json;
        callback(entities);
    });
}

function getDomainExtractedEntities(domain, url, callback){
    var entitiesUrl = addOnPrefs.datawakeDeploymentUrl + "/visited/extracted";
    var post_data = JSON.stringify({
        url: url,
        domain: domain
    });
    requestHelper.post(entitiesUrl, post_data, function (response) {
        var domainExtracted = response.json;
        callback(domainExtracted);
    });
}


var externalLinks = null;

function getExternalLinks(callback) {
    if (externalLinks == null) {
        requestHelper.get(addOnPrefs.datawakeDeploymentUrl + "/tools/get", function (response) {
            externalLinks = response.json;
            callback(externalLinks);
        });
    } else {
        callback(externalLinks);
    }
}