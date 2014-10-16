var addon = self;
var newTabApp = angular.module('newTabApp', []);
newTabApp.controller("NewTabCtrl", function ($scope) {

    $scope.isDatawakeOn = false;

    addon.port.on("sendDomains", function (domains) {
        domains.shift();
        $scope.domains = domains;
        $scope.$apply();
    });

    addon.port.on("sendTrails", function (trails) {
        trails.shift();
        $scope.trails = trails;
        $scope.$apply();
    });

    addon.port.on("sendUserInfo", function (user) {
        if(!user.hasOwnProperty("session")){
            $scope.user = user;
            $scope.hideSignInButton = true;
            $scope.$apply();
        }
    });

    addon.port.on("authType", function (auth) {
        $scope.auth = auth;
        if (auth.type == 2) {
            $scope.signIn();
        }
    });

    addon.port.on("signOutComplete", function () {
        $scope.hideSignInButton = false;
        $scope.$apply();
    });

    $scope.signIn = function () {
        addon.port.emit("signIn");
    };

    $scope.signOut = function () {
        addon.port.emit("signOut");
    };

    addon.port.on("newTrail", function (trailObject) {
        $scope.trails.push(trailObject);
        $scope.selectedTrail = trailObject;
        $scope.processingNewTrail = false;
        $scope.newTrail.name = "";
        $scope.newTrail.description = "";
        $scope.$apply();
        $scope.trailChanged($scope.selectedTrail);

    });

    addon.port.on("hasDatawakeInfo", function (previousDatawakeInfo) {
        $scope.selectedTrail = previousDatawakeInfo.trail;
        $scope.selectedDomain = previousDatawakeInfo.domain;
        $scope.isDatawakeOn = true;
        $scope.$apply();
    });

    $scope.datawakeStatusChanged = function (status) {
        console.info("On Off Was Toggled: " + status);
        $scope.isDatawakeOn = status;
        sendDatawakeInformation();
    };

    $scope.domainChanged = function (domain) {
        var selected = domain.name;
        if (selected != null && selected != "") {
            addon.port.emit("getTrails", selected);
            $scope.selectedTrail = null;
        }
    };

    $scope.trailChanged = function (trail) {
        sendDatawakeInformation();
    };

    addon.port.on("trailFailure", function () {
        $scope.processingNewTrailFailed = true;
        $scope.processingNewTrail = false;
        $scope.$apply();

    });

    $scope.createNewTrail = function () {
        $("#alert_processing").show();
        $scope.processingNewTrail = true;
        console.info("Creating New Trail: " + $scope.newTrail.name + " For Domain: " + $scope.selectedDomain.name + " With Description: " + $scope.newTrail.description);
        addon.port.emit("createTrail", {domain: $scope.selectedDomain.name, trail_name: $scope.newTrail.name, trail_description: $scope.newTrail.description});
    };

    function sendDatawakeInformation() {
        if ($scope.selectedDomain != null && $scope.selectedDomain.name != "") {
            if ($scope.selectedTrail != null && $scope.selectedTrail.name != "") {
                var dataWake = {};
                dataWake.user = $scope.user;
                dataWake.domain = $scope.selectedDomain;
                dataWake.trail = $scope.selectedTrail;
                dataWake.isDatawakeOn = $scope.isDatawakeOn;
                addon.port.emit("trackingInformation", dataWake);
            }
        }
    }

});