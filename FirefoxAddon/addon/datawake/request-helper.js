var Request = require("sdk/request").Request;


exports.post = postRequest;
exports.get = getRequest;

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
function getRequest(url, callback){
    var getObject = Request({
        url: url,
        contentType: "application/json",
        onComplete: callback
    });
    getObject.get();
}