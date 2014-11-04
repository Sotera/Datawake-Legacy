var optionsApp = angular.module("optionsApp", []);

optionsApp.controller("OptionsCtrl", function ($scope) {
    $scope.selectedDeployment = "";
    $scope.saved = false;
    $scope.onOffSaved = false;
    $scope.onOffOptions = {};
    $scope.reg = new RegExp("_", "g");

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

    $scope.saveOnOff = function(){
      dwConfig.saveOnOffOptions($scope.onOffOptions, function(){
          $scope.onOffSaved = true;
          $scope.$apply();
      });
    };

    $scope.changeColor = function(){
      $scope.onOffSaved = false;
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

    function getOnOffOptions() {
        dwConfig.getOnOffOptions(function (options) {
            if (options.hasOwnProperty("onOff")) {
                $scope.onOffOptions = options.onOff;
            } else {
                $scope.onOffOptions = dwConfig.onOffDefaults;
            }
            $scope.$apply();
        });
    }

    getDeployments();
    getOptions();

    getOnOffOptions();
});