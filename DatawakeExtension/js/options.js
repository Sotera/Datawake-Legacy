var optionsApp = angular.module("optionsApp", []);

optionsApp.controller("OptionsCtrl", function ($scope) {
    $scope.selectedDeployment = "";
    $scope.saved = false;
    $scope.deploymentChanged = function () {
        $scope.deploymentUrl = $scope.selectedDeployment.datawake_serviceUrl;
        $scope.imageService = $scope.selectedDeployment.datawake_imageServiceUrl;
        $scope.saved = false;
    };

    $scope.save = function () {
        var options = {};
        options.datawake_serviceUrl = $scope.deploymentUrl;
        options.datawake_imageServiceUrl = $scope.imageService;
        dwConfig.saveOptions(options);
        $scope.saved = true;
    };

    function getDeployments() {
        $scope.deployments = dwConfig.deployments;
    }

    function getOptions() {
        dwConfig.getOptions(function (options) {
            $scope.deploymentUrl = options.datawake_serviceUrl;
            $scope.imageService = options.datawake_imageServiceUrl;
            $scope.$apply();
        });
    }

    getDeployments();
    getOptions();
});