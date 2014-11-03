var newTabApp = angular.module("newTabApp", []);

newTabApp.controller("NewTabCtrl", function ($scope, $timeout, requestService) {

    $scope.newTrail = {name: "", description: ""};
    $scope.trails = [];
    $scope.domains = [];
    $scope.selectedTrail = null;
    $scope.selectedDomain = null;
    $scope.processingNewTrail = false;
    $scope.processingNewTrailFailed = false;
    $scope.user = null;
    $scope.isDatawakeOn = chrome.extension.getBackgroundPage().dwState.tracking;

    $scope.logout = function () {
        var sessionUrl = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/session";
        requestService.delete(sessionUrl);
    };

    $scope.trailChanged = function (trail) {
        chrome.runtime.sendMessage({operation: "set-trail", name: trail.name}, function (response) {
            console.log("Trail set: %s", trail.name);
        });
    };

    $scope.keyPressed = function(clickEvent){
        if(clickEvent.keyCode == 13){
            $scope.createNewTrail();
        }
    };

    $scope.createNewTrail = function () {
        var trail_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/trails/create";
        //Persists the object
        var newTrail = {};
        newTrail.name = $scope.newTrail.name;
        newTrail.description = $scope.newTrail.description;
        var new_trail = JSON.stringify({
            trailname: newTrail.name,
            traildescription: newTrail.description,
            domain: $scope.selectedDomain.name
        });
        $scope.processingNewTrail = true;
        requestService.post(trail_url, new_trail).then(function (response) {
            $scope.processingNewTrail = false;
            $scope.trails.push(newTrail);
            $scope.selectedTrail = newTrail;
            $scope.trailChanged($scope.selectedTrail);
        }, function(error){
            $scope.processingNewTrailFailed = true;
            $scope.processingNewTrail = false;
        });
        resetNewTrailInput();
    };

    $scope.tracking = function (isDatawakeOn) {
        chrome.runtime.sendMessage({operation: "toggle-tracking", enabled: isDatawakeOn}, function (response) {
            $scope.isDatawakeOn = response.trackingState;
            $scope.$apply();
        });
    };


    $scope.domainChanged = function (domain) {
        chrome.runtime.sendMessage({operation: "set-domain", name: domain.name}, function (response) {
            console.log("Domain Set: %s", domain.name);
            var trail_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/trails/get";
            var trail_data = JSON.stringify({domain: domain.name});
            requestService.post(trail_url, trail_data).then(populateTrails);
        });
    };

    function resetNewTrailInput() {
        $scope.newTrail.name = "";
        $scope.newTrail.description = "";
    }

    function onLoggedIn(user) {
        $scope.user = user;
        chrome.runtime.sendMessage({operation:"current-org", org:user.org}, null);
        getDomains();
    }

    function getDomains() {
        chrome.runtime.sendMessage({operation: "get-domain-and-trail"}, function (response) {
            if (response.domain != null) {
                $scope.selectedDomain = {};
                $scope.selectedDomain.name = response.domain;
            }
            if (response.trail != null) {
                $scope.selectedTrail = {};
                $scope.selectedTrail.name = response.trail;
            }
            $scope.$apply();
        });
        var domain_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/domains";
        requestService.get(domain_url).then(function (domains) {
            $scope.domains = domains;
        });
    }

    function populateTrails(trailContainer) {
        $scope.trails = trailContainer.trails;
        $scope.selectedTrail = null;
    }

    function signIn(user) {
        googlePlusUserLoader.getAuthToken(function (token) {
            var sessionUrl = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/session";
            var session_data = JSON.stringify({token: token});
            requestService.post(sessionUrl, session_data).then(onLoggedIn)
        });
    }

    googlePlusUserLoader.onload(signIn);
});

newTabApp.service("requestService", function ($http, $q) {

    //Public Service API
    return({
        post: post,
        get: getRequest,
        delete: deleteRequest
    });


    function post(url, data) {
        var request = $http({
            method: 'post',
            url: url,
            data: data
        });
        return(request.then(handleSuccess, handleError));
    }

    function getRequest(url) {
        var request = $http({
            method: 'get',
            url: url
        });
        return(request.then(handleSuccess, handleError));
    }

    function deleteRequest(url) {
        var request = $http({
            method: 'delete',
            url: url
        });
        return(request.then(handleSuccess, handleError));
    }

    function handleError(response) {
        if (!angular.isObject(response.data) || !response.data.message) {
            return( $q.reject("An unknown error occurred.") );
        }
        return( $q.reject(response.data.message) );

    }

    function handleSuccess(response) {
        return( response.data );

    }
});