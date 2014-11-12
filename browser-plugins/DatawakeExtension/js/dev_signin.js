/*

Mock google sign in to use for development without actually hitting google servers.

 */


var MOCK_USER = JSON.stringify({
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
        "url": "https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50",
        "isDefault": true
    },
    "isPlusUser": true,
    "language": "en",
    "ageRange": {
        "min": 21
    },
    "circledByCount": 0,
    "verified": false
})


var googlePlusUserLoader = (function() {

    var userInfo = {}
    var STATE_START=1;
    var STATE_ACQUIRING_AUTHTOKEN=2;
    var STATE_AUTHTOKEN_ACQUIRED=3;

    var state = STATE_START;

    var signin_button, revoke_button;

    function disableButton(button) {
        button.setAttribute('disabled', 'disabled');
    }

    function enableButton(button) {
        button.removeAttribute('disabled');
    }

    function changeState(newState) {
        var old = state
        state = newState;
        switch (state) {
            case STATE_START:
                enableButton(signin_button);
                disableButton(revoke_button);
                break;
            case STATE_ACQUIRING_AUTHTOKEN:
                console.log('Acquiring token...');
                disableButton(signin_button);
                disableButton(revoke_button);
                break;
            case STATE_AUTHTOKEN_ACQUIRED:
                disableButton(signin_button);
                enableButton(revoke_button);
                break;
        }
    }

    // @corecode_begin getProtectedData
    function xhrWithAuth(method, url, interactive, callback) {
        var access_token;
        access_token = "123456"

        requestStart()
        var status = 200
        var response = MOCK_USER
        callback(null, status, response);

    }

    function getUserInfo(interactive,callback) {
        // bind the user callback function into the onUserINfoFetched function
        var onUserInfoFetched = getOnUserInfoFetchedFucntion(callback)
        xhrWithAuth('GET',
            'https://www.googleapis.com/plus/v1/people/me',
            interactive,
            onUserInfoFetched);
    }
    // @corecode_end getProtectedData


    function getOnUserInfoFetchedFucntion(callback){
        // Code updating the user interface, when the user information has been
        // fetched or displaying the error.
        var onUserInfoFetched =
            function(error, status, response) {
                if (!error && status == 200) {
                    changeState(STATE_AUTHTOKEN_ACQUIRED);
                    var user_info = JSON.parse(response);
                    populateUserInfo(user_info);
                    callback(user_info)
                } else {
                    changeState(STATE_START);
                }
            }
        return onUserInfoFetched
    }



    function populateUserInfo(user_info) {
        userInfo.user =  user_info
        user_info_div.innerHTML = user_info.displayName;
        fetchImageBytes(user_info);
    }

    function fetchImageBytes(user_info) {
        if (!user_info || !user_info.image || !user_info.image.url) return;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', user_info.image.url, true);
        xhr.responseType = 'blob';
        xhr.onload = onImageFetched;
        xhr.send();
    }

    function onImageFetched(e) {
        if (this.status != 200) return;
        var imgElem = document.createElement('img');
        var objUrl = window.webkitURL.createObjectURL(this.response);
        imgElem.src = objUrl;
        imgElem.onload = function() {
            window.webkitURL.revokeObjectURL(objUrl);
        }
        user_info_div.insertAdjacentElement("afterbegin", imgElem);
    }

    // OnClick event handlers for the buttons.

    /**
     Retrieves a valid token. Since this is initiated by the user
     clicking in the Sign In button, we want it to be interactive -
     ie, when no token is found, the auth window is presented to the user.

     Observe that the token does not need to be cached by the app.
     Chrome caches tokens and takes care of renewing when it is expired.
     In that sense, getAuthToken only goes to the server if there is
     no cached token or if it is expired. If you want to force a new
     token (for example when user changes the password on the service)
     you need to call removeCachedAuthToken()
     **/
    function interactiveSignIn(callback) {
        changeState(STATE_ACQUIRING_AUTHTOKEN);
        getUserInfo(false,callback)
    }




    function getToken(callback){
        chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
            console.log("token: "+token)
            callback(token)
        });
    }

    return {


        getAuthToken: function(callback){
            getToken(callback)
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

