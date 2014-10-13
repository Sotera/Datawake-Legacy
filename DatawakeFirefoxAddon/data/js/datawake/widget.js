var addon = self;

var widgetApp = angular.module('widgetApp', []);

widgetApp.controller("WidgetCtrl", function ($scope) {

    $scope.defaultBadgeColor = {"background-color": "#20b2aa"};
    $scope.badgeBackground = {"background-color": "#20b2aa"};

    addon.port.on("setBadgeText", function (text) {
        $scope.badgeText = text.toString();
        $scope.$apply();
    });

    addon.port.on("setBadgeColor", function (color) {
        $scope.badgeBackground["background-color"] = color.color;
    });

    addon.port.on("disableBadge", function () {
        $scope.badgeText = null;
        $scope.$apply();
    });

    addon.port.on("resetBadgeColor", function () {
        $scope.badgeBackground = $scope.defaultBadgeColor;
        $scope.$apply();
    });

    addon.port.on("resetWidget", function () {
        $scope.badgeBackground = $scope.defaultBadgeColor;
        $scope.badgeText = null;
        $scope.$apply();
    });

});