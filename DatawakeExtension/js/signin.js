/*
 Mock google sign in to use for development without actually hitting google servers.

 */

var MOCK_TOKEN = "123456"

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
}


var googlePlusUserLoader = (function() {

    var userInfo = {}




    function getUserInfo(interactive,callback) {
        // bind the user callback function into the onUserINfoFetched function
        var user_info = MOCK_USER
        user_info_div.innerHTML = user_info.displayName;
        var imgElem = document.createElement('img');
        imgElem.src = "images/photo.png"
        user_info_div.insertAdjacentElement("afterbegin", imgElem);
        callback(user_info)
    }






    return {


        getAuthToken: function(callback){
            callback(MOCK_TOKEN)
        },

        getId: function (){
            if (userInfo && userInfo.user){
                return userInfo.user.id
            }
            else return null

        },

        // takes a callback of type function(user_info)
        onload: function (callback) {

            user_info_div = document.querySelector('#user_info');
            getUserInfo(false,callback);
        }
    };

})();

