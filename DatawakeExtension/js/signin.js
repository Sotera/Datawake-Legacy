/*
 Mock google sign in to use for development without actually hitting google servers.

 */

var MOCK_TOKEN = "123456";

var MOCK_USER = {
    "kind": "plus#person",
    "etag": "",
    "gender": "none",
    "emails": [
        {
            "value": "john.doe@gmail.com",
            "type": "account"
        }
    ],
    "objectType": "person",
    "id": "123456",
    "displayName": "John Doe",
    "name": {
        "familyName": "Doe",
        "givenName": "John"
    },
    "url": "",
    "image": {
        "url": "",
        "isDefault": true
    },
    "isPlusUser": true,
    "language": "en",
    "ageRange": {
        "min": 21
    },
    "circledByCount": 0,
    "verified": false
};


var googlePlusUserLoader = (function () {

    var userInfo = {};


    function getUserInfo(interactive, callback) {
        // bind the user callback function into the onUserINfoFetched function
        callback(MOCK_USER);
    }


    return {
        getAuthToken: function (callback) {
            callback(MOCK_TOKEN)
        },

        getId: function () {
            if (userInfo && userInfo.user) {
                return userInfo.user.id
            } else {
                return null;
            }

        },

        // takes a callback of type function(user_info)
        onload: function (callback) {
            getUserInfo(false, callback);
        }
    };

})();

