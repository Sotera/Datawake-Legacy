var addon = self;
var panelApp = angular.module('panelApp', ["ngRoute", "ngSanitize"]).config(['$provide', function ($provide) {
    $provide.decorator('$sniffer', ['$delegate', function ($delegate) {
        $delegate.history = false;
        return $delegate;
    }]);
}]);

panelApp.controller("PanelCtrl", function ($scope) {

    $scope.lookaheadLinks = [];
    $scope.extracted_tools = [];
    $scope.datawake = addon.options.datawakeInfo;
    $scope.current_url = addon.options.current_url;
    $scope.lookaheadEnabled = addon.options.useLookahead;
    $scope.domainFeaturesEnabled = addon.options.useDomainFeatures;
    $scope.rankingEnabled = addon.options.useRanking;
    $scope.versionNumber = addon.options.versionNumber;
    $scope.invalid = {};
    $scope.lookaheadTimerStarted = false;
    $scope.pageVisits = addon.options.pageVisits;
    $scope.headerPartial = "partials/header-partial.html";

    $scope.refreshFeedbackEntities = function () {
        addon.port.emit("refreshFeedbackEntities", {domain: $scope.datawake.domain.name})
    };

    addon.port.on("feedbackEntities", function (entities) {
        $scope.$apply(function () {
            $scope.feedbackEntities = entities;
        });
    });

    addon.port.on("signOutComplete", function () {
        $scope.$apply(function () {
            $scope.hideSignInButton = false;
        });
    });

    addon.port.on("ranking", function (rankingInfo) {
        $scope.$apply(function () {
            $scope.ranking = rankingInfo.ranking;
            var starRating = $("#star_rating");
            starRating.attr("data-average", rankingInfo.ranking);
            createStarRating(addon.options.starUrl);
        });
    });

    addon.port.on("entities", function (extractedEntities) {
        $scope.$apply(function () {
            if (extractedEntities.allEntities.hasOwnProperty("website")) {
                var lookaheadTimerObject = {};
                lookaheadTimerObject.links = extractedEntities.allEntities["website"];
                addon.port.emit("startLookaheadTimer", lookaheadTimerObject);
            }
            console.debug("Parsing Extracted Entities...");
            $scope.extracted_entities_dict = extractedEntities.allEntities;
            $scope.entities_in_domain = extractedEntities.domainExtracted;
        });
    });

    addon.port.on("lookaheadTimerResults", function (lookahead) {
        $scope.$apply(function () {
            $scope.lookaheadLinks.push(lookahead);
        });
    });

    addon.port.on("externalLinks", function (links) {
        console.debug("Loading External Entities..");
        $scope.$apply(function () {
            $scope.extracted_tools = links;
        });
    });

    addon.port.on("trailEntities", function (entities_obj) {
        $scope.irrelevantEntities = entities_obj.irrelevantEntities;
        $scope.trailEntities = entities_obj.entities;
        $scope.trailEntitiesIter = createIterableEntityListForSorting(entities_obj.entities);
        $scope.irrelevantEntitiesIter = createIterableEntityListForSorting(entities_obj.irrelevantEntities);
        $scope.$apply();
    });

    function createIterableEntityListForSorting(entities) {
        var arr = [];
        $.map(entities, function (item, key) {
            arr.push({entity: key, rank: item});
        });
        return arr;
    }

    $scope.refreshWebPages = function () {
        addon.port.emit("refreshWebPages", {domain: $scope.datawake.domain.name, trail: $scope.datawake.trail.name});
    };

    $scope.refreshEntities = function () {
        addon.port.emit("refreshEntities", {domain: $scope.datawake.domain.name, trail: $scope.datawake.trail.name});
    };

    $scope.refreshDomainEntities = function () {
        addon.port.emit("refreshDomainEntities", {domain: $scope.datawake.domain.name});
    };

    addon.port.on("trailLinks", function (links_obj) {
        $scope.visitedLinks = links_obj.visited;
        $scope.notVisitedLinks = links_obj.notVisited;
        $scope.$apply();
    });


    $scope.searchHitsToggle = function (lookaheadObj) {
        lookaheadObj.searchHitsShow = !lookaheadObj.searchHitsShow;
    };

    $scope.matchesToggle = function (lookaheadObj) {
        lookaheadObj.matchesShow = !lookaheadObj.matchesShow;
    };

    $scope.openExternalLink = function (externalUrl) {
        addon.port.emit("openExternalLink", {externalUrl: externalUrl});
    };

    $scope.markInvalid = function (type, entity) {
        var postObj = {};
        postObj.entity_type = type;
        postObj.entity_value = entity;
        postObj.domain = $scope.datawake.domain.name;
        addon.port.emit("markInvalid", postObj);
    };

    $scope.getHostName = function (url) {
        return new URL(url).hostname
    };


    addon.port.on("marked", function (entity) {
        $scope.$apply(function () {
            $scope.invalid[entity] = true;
        });
    });

    $scope.isExtracted = function (type, name) {
        if ($scope.entities_in_domain.hasOwnProperty(type)) {
            return $scope.entities_in_domain[type].indexOf(name) >= 0;
        }
    };

    $scope.removeLink = function (link) {
        var data = {};
        data.domain = $scope.datawake.domain.name;
        data.trail = $scope.datawake.trail.name;
        data.url = link.url;
        addon.port.once("removeTrailLink", function () {

            $scope.notVisitedLinks.splice($scope.notVisitedLinks.indexOf(link), 1);
            $scope.$apply();
        });
        addon.port.emit("removeLink", data);

    };

    $scope.showEntities = function (link) {
        if (!link.show) {
            var data = {};
            data.domain = $scope.datawake.domain.name;
            data.trail = $scope.datawake.trail.name;
            data.url = link.url;
            addon.port.emit("getUrlEntities", data);
            function updateLink(entities) {
                link.entities = entities;
                link.show = !link.show;
                $scope.$apply();
            }

            addon.port.once("urlEntities", updateLink);
        } else {
            link.show = !link.show;
        }
    };


    $scope.removeLink = function (link) {
        var data = {};
        data.domain = $scope.datawake.domain.name;
        data.trail = $scope.datawake.trail.name;
        data.url = link.url;
        addon.port.once("removeTrailLink", function () {

            $scope.notVisitedLinks.splice($scope.notVisitedLinks.indexOf(link), 1);
            $scope.$apply();
        });
        addon.port.emit("removeLink", data);

    };

    function createStarRating(starUrl) {
        var starRating = $("#star_rating");
        starRating.jRating({
            type: 'big', // type of the rate.. can be set to 'small' or 'big'
            length: 10, // nb of stars
            rateMax: 10,
            bigStarsPath: starUrl + 'stars.png',
            smallStarsPath: starUrl + 'small.png',
            sendRequest: false,
            canRateAgain: true,
            nbRates: 9999999,
            onClick: function (element, rate) {
                setUrlRank(rate);
                $scope.$apply(function () {
                    $scope.ranking = rate;
                });
            }
        });

    }

    function setUrlRank(rank) {
        var rank_data = {
            domain: $scope.datawake.domain.name,
            trailname: $scope.datawake.trail.name,
            rank: rank
        };
        addon.port.emit("setUrlRank", rank_data);
    }

    addon.port.emit("init");

});

panelApp.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/features/all', {
                templateUrl: 'partials/extracted-entities-partial.html'
            }).
            when('/features/domain', {
                templateUrl: 'partials/domain-extracted-partial.html'
            }).
            when('/lookahead', {
                templateUrl: 'partials/lookahead-partial.html'
            }).
            when('/feedback', {
                templateUrl: 'partials/feedback-partial.html'
            }).
            when('/trail/explored', {
                templateUrl: 'partials/trail-based-explored-partial.html'
            }).
            when('/trail/unexplored', {
                templateUrl: 'partials/trail-based-unexplored-partial.html'
            }).
            when('/trail/entities/relevant', {
                templateUrl: 'partials/trail-based-relevant-entities-partial.html'
            }).
            when('/trail/entities/irrelevant', {
                templateUrl: 'partials/trail-based-irrelevant-entities-partial.html'
            }).
            otherwise({
                redirectTo: '/features/domain'
            });
    }]);
