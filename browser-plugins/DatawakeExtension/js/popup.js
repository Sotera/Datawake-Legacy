var datawakePopUpApp = angular.module("datawakePopUpApp", ['ngRoute', 'popUpControllers']);

datawakePopUpApp.controller("PopUpCtrl", function ($scope, $timeout, popUpService) {

    $scope.invalidTab = false;
    $scope.extracted_tools = [];
    $scope.lookaheadLinks = [];

    $scope.lookaheadEnabled = chrome.extension.getBackgroundPage().onOff.lookahead;
    $scope.showRanking = chrome.extension.getBackgroundPage().onOff.ranking;
    $scope.showDomainFeatures = chrome.extension.getBackgroundPage().onOff.domain_features;

    $scope.current_url = "";
    $scope.versionNumber = chrome.runtime.getManifest().version;
    $scope.invalid = {};

    $scope.addLookaheadLink = function (link) {
        var inLookahead = false;
        for (var index in $scope.lookaheadLinks) {
            if ($scope.lookaheadLinks.hasOwnProperty(index) && $scope.lookaheadLinks[index].url == link.url) {
                inLookahead = true;
                break;
            }
        }
        if (!inLookahead)
            $scope.lookaheadLinks.push(link);
    };


    function linkLookahead(tabUrl, extractedLinks, index, domain, delay) {
        var post_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/lookahead/matches";
        var jsonData = JSON.stringify({url: extractedLinks[index], srcurl: tabUrl, domain: domain });
        popUpService.post(post_url, jsonData).then(function (response) {
            var objectReturned;
            if (objectReturned = response.matches.length > 0 || response.domain_search_matches.length > 0) {
                $scope.addLookaheadLink(response);
                extractedLinks.splice(index, 1);
                if (index >= extractedLinks.length) {
                    index = 0;
                }
            } else {
                index = (index + 1) % extractedLinks.length;
            }
            if (extractedLinks.length > 0) {
                if (objectReturned) {
                    linkLookahead(tabUrl, extractedLinks, index, domain, delay);
                } else if (index == 0) {
                    if (delay <= 5 * 60 * 1000) {
                        $timeout(function () {
                            linkLookahead(tabUrl, extractedLinks, index, domain, delay * 2);
                        }, delay);
                    }
                } else {
                    $timeout(function () {
                        linkLookahead(tabUrl, extractedLinks, index, domain, delay);
                    }, 1);
                }
            }
        });
    }

    $scope.$watch(function (scope) {
            return scope.lookaheadSearch;
        },
        function (newValue, oldValue) {
            if (newValue && $scope.lookaheadEnabled && !$scope.lookaheadStarted) {
                $timeout(function () {
                    linkLookahead($scope.current_url, newValue, 0, $scope.domain, 1000);
                }, 1000);
                $scope.lookaheadStarted = true;
            }

        });

    function externalToolsCallback(extracted_tools) {
        $scope.extracted_tools = extracted_tools;
    }

    function getDomainAndTrail() {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (response) {
                $scope.trail = response.trail;
                $scope.domain = response.domain;
                $scope.org = response.org;
                $scope.current_url = tabs[0].url;
            });
        });
    }

    function loadExternalLinks() {
        var tools_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/tools/get";
        popUpService.get(tools_url).then(externalToolsCallback);
    }

    function setRankAndCreateStarRating(rankObject) {
        var starRating = $("#star_rating");
        starRating.attr("data-average", rankObject.rank);
        $scope.ranking = rankObject.rank;
        starRating.jRating({
            type: 'big', // type of the rate.. can be set to 'small' or 'big'
            length: 10, // nb of stars
            rateMax: 10,
            sendRequest: false,
            canRateAgain: true,
            nbRates: 9999999,
            onClick: function (element, rate) {
                $scope.ranking = rate;
                setUrlRank(rate);
                $scope.$apply();
            }
        });
    }

    function setUrlRank(rank) {
        var data = JSON.stringify({
            trailname: $scope.trail,
            url: decodeURIComponent($scope.current_url),
            rank: rank,
            domain: $scope.domain
        });
        var rankUrl = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/ranks/set";
        console.log("datawake-popup setUrlRank submit reguest for: " + data);
        popUpService.post(rankUrl, data).then(function (response) {
            if (response.success) {
                console.log("datawake-popup setUrlRank -> " + response);
            }
        });
    }

    function getUrlRank() {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (domainSpecificInformation) {
                var rank_url = domainSpecificInformation.rankUrl + "/get";
                $scope.current_url = tabs[0].url;
                var rank_data = JSON.stringify({
                    trailname: domainSpecificInformation.trail,
                    url: tabs[0].url,
                    domain: domainSpecificInformation.domain
                });
                popUpService.post(rank_url, rank_data).then(setRankAndCreateStarRating);
            });
        });
    }

    function setUser(user) {
        $scope.user = user;
        getUrlRank();
    }

    getDomainAndTrail();
    googlePlusUserLoader.onload(setUser);
    loadExternalLinks();

});

var popUpControllers = angular.module('popUpControllers', []);

popUpControllers.controller('FeaturesCtrl', function ($scope, $timeout, popUpService) {

    $scope.extracted_entities_dict = {};
    $scope.entities_in_domain = [];
    $scope.lookaheadSearch = null;


    function extractedEntities(entities, tabUrl, domain) {
        $scope.extracted_entities_dict = (entities.allEntities != null) ? entities.allEntities : {};
        if (entities.allEntities.hasOwnProperty("website")) {
            if ($scope.$parent)
                $scope.$parent.lookaheadSearch = entities.allEntities["website"];
        }
        $scope.entities_in_domain = (entities.domainExtracted != null) ? entities.domainExtracted : {};
    }

    function fetchEntities(delay) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            var post_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/visited/entities";
            var domain = chrome.extension.getBackgroundPage().dwState.tabToDomain[tabs[0].id];
            var tabUrl = tabs[0].url;
            var fetch_entities_post_data = JSON.stringify({ url: tabUrl, domain: domain});
            popUpService.post(post_url, fetch_entities_post_data).then(function (extracted_entities_dict) {
                extractedEntities(extracted_entities_dict, tabUrl, domain);
                if (delay <= 5 * 60 * 1000) {
                    $timeout(fetchEntities, 2 * delay);
                }
            });
        });
    }

    $scope.markInvalid = function (type, entity) {
        var postObj = {};
        postObj.entity_type = type;
        postObj.entity_value = entity;
        postObj.domain = $scope.domain;
        popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/feedback/bad", JSON.stringify(postObj))
            .then(function (response) {
                if (response.success) {
                    console.log("Successfully marked %s as invalid", entity);
                    $scope.invalid[entity] = true;
                }
            })
    };

    $scope.isExtracted = function (type, name) {
        if ($scope.entities_in_domain.hasOwnProperty(type)) {
            return $scope.entities_in_domain[type].indexOf(name) >= 0;
        }
    };

    function fetchMarkedInvalidEntities(domain) {
        var post_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/feedback/marked";
        popUpService.post(post_url, JSON.stringify({domain: domain})).then(function (response) {
            $.each(response.marked_entities, function (index, item) {
                $scope.invalid[item.value] = true;
            });
        });
    }

    fetchEntities(500);
    $scope.$parent.$watch(function (scope) {
            return scope.domain
        },
        function (newDomain, oldDomain) {
            if (newDomain)
                fetchMarkedInvalidEntities(newDomain);
        }
    );

});

popUpControllers.controller("FeedbackCtrl", function ($scope, popUpService) {
    $scope.feedbackEntities = [];

    function fetchExtractorFeedbackEntities(domain, url) {
        var postObj = {};
        postObj.domain = domain;
        postObj.url = url;
        popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/feedback/entities", JSON.stringify(postObj))
            .then(function (response) {
                $scope.feedbackEntities = response.entities;
            });
    }

    fetchExtractorFeedbackEntities($scope.$parent.domain, $scope.$parent.current_url);

});

popUpControllers.controller('LookaheadCtrl', function ($scope, $timeout, popUpService) {
    $scope.lookaheadLinks = $scope.$parent.lookaheadLinks;
    $scope.lookaheadStarted = false;
    $scope.lookaheadEnabled = chrome.extension.getBackgroundPage().onOff.lookahead;


    $scope.hitListToggle = function (lookaheadObj) {
        lookaheadObj.hitListShow = !lookaheadObj.hitListShow;
    };

    $scope.searchHitsToggle = function (lookaheadObj) {
        lookaheadObj.searchHitsShow = !lookaheadObj.searchHitsShow;
    };

    $scope.matchesToggle = function (lookaheadObj) {
        lookaheadObj.matchesShow = !lookaheadObj.matchesShow;
    };

});

popUpControllers.service("popUpService", function ($http, $q) {

    //Public Service API
    return({
        post: post,
        get: getRequest
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

datawakePopUpApp.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/features/all', {
                templateUrl: 'partials/extracted-entities-partial.html',
                controller: 'FeaturesCtrl'
            }).
            when('/features/domain', {
                templateUrl: 'partials/domain-features-partial.html',
                controller: 'FeaturesCtrl'
            }).
            when('/lookahead', {
                templateUrl: 'partials/lookahead-partial.html',
                controller: 'LookaheadCtrl'
            }).
            when('/feedback', {
                templateUrl: 'partials/extractor-feedback-partial.html',
                controller: 'FeedbackCtrl'
            }).
            otherwise({
                redirectTo: '/features/domain'
            });
    }]);
