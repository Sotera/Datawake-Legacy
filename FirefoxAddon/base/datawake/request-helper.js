var Request = require("sdk/request").Request;


exports.post = postRequest;
exports.postCode = postCode;
exports.get = getRequest;
exports.delete = deleteRequest;

/**
 * Posts a json object to the server.
 * @param url The post url.
 * @param post_data The json data to post.
 * @param callback Response callback.
 */
function postRequest(url, post_data, callback) {
    var postObj = Request({
        url: url,
        onComplete: callback,
        content: post_data,
        contentType: "application/json"
    });
    postObj.post();
}

/**
 * Does a GET Request against a url.
 * @param url The url to request.
 * @param callback Response callback.
 */
function getRequest(url, callback) {
    var getObject = Request({
        url: url,
        contentType: "application/json",
        onComplete: callback
    });
    getObject.get();
}

function deleteRequest(url, callback) {
    var deleteObject = Request({
        url: url,
        contentType: "application/json",
        onComplete: callback
    });
    deleteObject.delete();
}


function postCode(url, svc, callback) {
    var data = {};
    data.code = svc.token;
    data.client_id = svc.consumerKey;
    data.client_secret = svc.consumerSecret;
    data.redirect_uri = "http://localhost";
    data.grant_type = "authorization_code";
    var postObj = Request({
        url: url,
        onComplete: callback,
        content:data
    });
    postObj.post();
}