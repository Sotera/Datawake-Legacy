var addon = self;

var widgetApp = angular.module('widgetApp', []);

widgetApp.controller("WidgetCtrl", function ($scope) {

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

});