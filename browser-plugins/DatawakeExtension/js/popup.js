var datawakePopUpApp = angular.module("datawakePopUpApp", ['ngRoute', 'ngSanitize', 'popUpControllers']);

datawakePopUpApp.controller("PopUpCtrl", function ($scope, $timeout, externalToolsService, lookaheadService, rankingService) {

    $scope.invalidTab = false;
    $scope.extracted_tools = [];
    $scope.lookaheadEnabled = chrome.extension.getBackgroundPage().onOff.lookahead;
    $scope.showRanking = chrome.extension.getBackgroundPage().onOff.ranking;
    $scope.showDomainFeatures = chrome.extension.getBackgroundPage().onOff.domain_features;
    $scope.popupHeader = "partials/popup-header-partial.html";
    $scope.current_url = "";
    $scope.lookaheadLinks = [];
    $scope.versionNumber = chrome.runtime.getManifest().version;
    $scope.invalid = {};

    function addLookaheadLink(link) {
        var inLookahead = false;
        for (var index in $scope.lookaheadLinks) {
            if ($scope.lookaheadLinks.hasOwnProperty(index) && $scope.lookaheadLinks[index].url == link.url) {
                inLookahead = true;
                break;
            }
        }
        if (!inLookahead) {
            $scope.lookaheadLinks.push(link);
        }
    }

    function linkLookahead(tabUrl, extractedLinks, index, domain, delay) {
        lookaheadService.getLookaheadData(tabUrl, extractedLinks[index], domain, function (response) {
            var objectReturned;
            if (objectReturned = response.matches.length > 0 || response.domain_search_matches.length > 0) {
                addLookaheadLink(response);
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
        function (newLookaheadLinks, oldLookaheadLinks) {
            if (newLookaheadLinks && $scope.lookaheadEnabled && !$scope.lookaheadStarted) {
                $timeout(function () {
                    linkLookahead($scope.current_url, newLookaheadLinks, 0, $scope.domain, 1000);
                }, 1000);
                $scope.lookaheadStarted = true;
            }

        });

    function externalToolsCallback(extracted_tools) {
        $scope.extracted_tools = extracted_tools;
    }

    function getPopUpInformation(populateRank) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (response) {
                $scope.current_url = tabs[0].url;
                $scope.trail = response.trail;
                $scope.domain = response.domain;
                $scope.org = response.org;
                if (populateRank)
                    rankingService.getUrlRank($scope.domain, $scope.trail, $scope.current_url, setRankAndCreateStarRating);
            });
        });
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
                $scope.$apply(function () {
                    $scope.ranking = rate;
                    rankingService.setUrlRank($scope.domain, $scope.trail, $scope.current_url, rate, function (response) {
                        if (response.success) {
                            console.log("datawake-popup setUrlRank -> " + response);
                        }
                    });
                });
            }
        });
    }

    function setUser(user) {
        $scope.user = user;
    }

    getPopUpInformation($scope.showRanking);
    googlePlusUserLoader.onload(setUser);
    externalToolsService.loadExternalLinks(externalToolsCallback);

});

var popUpControllers = angular.module('popUpControllers', []);

popUpControllers.controller('FeaturesCtrl', function ($scope, $timeout, featuresService, feedbackService) {

    $scope.extracted_entities_dict = {};
    $scope.entities_in_domain = [];


    function extractedEntities(entities) {
        $scope.extracted_entities_dict = (entities.allEntities != null) ? entities.allEntities : {};
        if (entities.allEntities.hasOwnProperty("website")) {
            if ($scope.$parent)
                $scope.$parent.lookaheadSearch = entities.allEntities["website"];
        }
        $scope.entities_in_domain = (entities.domainExtracted != null) ? entities.domainExtracted : {};
    }

    function fetchEntities(domain, tabUrl, useCache) {
        featuresService.fetchEntities(tabUrl, domain, function (extracted_entities_dict) {
            extractedEntities(extracted_entities_dict);
        }, useCache);
    }

    $scope.markInvalid = function (type, entity) {
        feedbackService.markInvalid(type, entity, $scope.$parent.domain, function (response) {
            if (response.success) {
                console.log("Successfully marked %s as invalid", entity);
                $scope.invalid[entity] = true;
            }
        });
    };

    $scope.isExtracted = function (type, name) {
        if ($scope.entities_in_domain.hasOwnProperty(type)) {
            return $scope.entities_in_domain[type].indexOf(name) >= 0;
        }
    };

    $scope.refresh = function () {
        fetchEntities($scope.$parent.domain, $scope.$parent.current_url, false);
    };

    function fetchMarkedInvalidEntities(domain) {
        feedbackService.fetchMarkedInvalidEntities(domain, function (response) {
            $.each(response.marked_entities, function (index, item) {
                $scope.invalid[item.value] = true;
            });
        });
    }


    $scope.$parent.$watch(function (scope) {
            return scope.domain
        },
        function (newDomain, oldDomain) {
            if (newDomain) {
                fetchEntities(newDomain, $scope.$parent.current_url, true);
                fetchMarkedInvalidEntities(newDomain);
            }
        }
    );

});

popUpControllers.controller("FeedbackCtrl", function ($scope, feedbackService) {
    $scope.feedbackEntities = [];

    feedbackService.fetchExtractorFeedbackEntities($scope.$parent.domain, $scope.$parent.current_url, function (response) {
        $scope.feedbackEntities = response.entities;
    });
});

popUpControllers.controller("TrailEntitiesCtrl", function ($scope, popUpService, trailBasedService) {

    function createIterableEntityListForSorting(entities) {
        var arr = [];
        $.map(entities, function (item, key) {
            arr.push({entity: key, rank: item});
        });
        return arr;
    }

    $scope.removeLink = function (link) {
        trailBasedService.removeUrlFromTrail($scope.domain, $scope.trail, link.url, function (response) {
            $scope.notVisitedLinks.splice($scope.notVisitedLinks.indexOf(link), 1);
        });
    };

    $scope.showEntities = function (link) {
        if (!link.show) {
            trailBasedService.getEntitiesForUrl($scope.domain, $scope.trail, link.url, function (response) {
                link.entities = response.entities;
                link.show = !link.show;
            });
        } else {
            link.show = !link.show;
        }
    };

    $scope.refreshWebPages = function () {
        trailBasedService.getTrailSearchWebPages($scope.$parent.domain, $scope.$parent.trail, function (response) {
            $scope.visitedLinks = response.visited;
            $scope.notVisitedLinks = response.notVisited;
        }, false);
    };

    $scope.refreshEntities = function () {
        trailBasedService.getTrailSearchEntities($scope.$parent.domain, $scope.$parent.trail, function (response) {
            $scope.trailEntities = response.entities;
            $scope.irrelevantEntities = response.irrelevantEntities;
            $scope.trailEntitiesIter = createIterableEntityListForSorting(response.entities);
            $scope.irrelevantEntitiesIter = createIterableEntityListForSorting(response.irrelevantEntities);
        }, false);
    };

    $scope.getHostName = function (url) {
        return new URL(url).hostname
    };

    trailBasedService.getTrailSearchEntities($scope.$parent.domain, $scope.$parent.trail, function (response) {
        $scope.trailEntities = response.entities;
        $scope.irrelevantEntities = response.irrelevantEntities;
        $scope.trailEntitiesIter = createIterableEntityListForSorting(response.entities);
        $scope.irrelevantEntitiesIter = createIterableEntityListForSorting(response.irrelevantEntities);
    }, true);

    trailBasedService.getTrailSearchWebPages($scope.$parent.domain, $scope.$parent.trail, function (response) {
        $scope.visitedLinks = response.visited;
        $scope.notVisitedLinks = response.notVisited;
    }, true);

});

popUpControllers.controller('LookaheadCtrl', function ($scope) {
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

popUpControllers.factory("popUpCache", function ($cacheFactory) {
    return $cacheFactory("popUpCache");
});

popUpControllers.service("lookaheadService", function (popUpService) {

    return({
        getLookaheadData: getLookaheadData
    });

    function getLookaheadData(srcUrl, url, domain, callback) {
        var post_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/lookahead/matches";
        var jsonData = JSON.stringify({url: url, srcurl: srcUrl, domain: domain });
        popUpService.post(post_url, jsonData).then(callback);
    }
});

popUpControllers.service("featuresService", function (popUpService, popUpCache) {

    return({
        fetchEntities: fetchEntities
    });

    function fetchEntities(url, domain, callback, useCache) {
        var entities_container = popUpCache.get("extractedEntities");
        if (!entities_container || !useCache) {
            var post_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/visited/entities";
            var fetch_entities_post_data = JSON.stringify({url: url, domain: domain});
            popUpService.post(post_url, fetch_entities_post_data).then(function (extracted_entities_dict) {
                entities_container = extracted_entities_dict;
                popUpCache.put("extractedEntities", entities_container);
                callback(entities_container);
            });
        } else {
            callback(entities_container);
        }
    }
});

popUpControllers.service("externalToolsService", function (popUpService, popUpCache) {

    return({
        loadExternalLinks: loadExternalLinks
    });

    function loadExternalLinks(callback) {
        var externalLinks = popUpCache.get("externalLinks");
        if (!externalLinks) {
            var tools_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/tools/get";
            popUpService.get(tools_url).then(function (response) {
                externalLinks = response;
                popUpCache.put("externalLinks", externalLinks);
                callback(externalLinks);
            });
        } else {
            callback(externalLinks);
        }
    }
});

popUpControllers.service("trailBasedService", function (popUpService, popUpCache) {

    return({
        getTrailSearchWebPages: getTrailSearchWebPages,
        getTrailSearchEntities: getTrailSearchEntities,
        getEntitiesForUrl: getEntitiesForUrl,
        removeUrlFromTrail: removeUrlFromTrail
    });

    function removeUrlFromTrail(domain, trail, url, callback) {
        var data = {};
        data.domain = domain;
        data.trail = trail;
        data.url = url;
        popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/trails/deleteLink", JSON.stringify(data)).then(callback);
    }

    function getEntitiesForUrl(domain, trail, url, callback) {
        var data = {};
        data.domain = domain;
        data.trail = trail;
        data.url = url;
        popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/trails/urlEntities", JSON.stringify(data)).then(callback);
    }

    function getTrailSearchWebPages(domain, trail, callback, useCache) {
        var cachedSearchWebPages = popUpCache.get("trailSearchWebPages");
        if (!cachedSearchWebPages || !useCache) {
            fetchTrailSearchWebPages(domain, trail).then(function (response) {
                cachedSearchWebPages = response;
                popUpCache.put("trailSearchWebPages", cachedSearchWebPages);
                callback(cachedSearchWebPages);
            });
        } else {
            callback(cachedSearchWebPages);
        }

    }

    function getTrailSearchEntities(domain, trail, callback, useCache) {
        var cachedTrailSearchEntities = popUpCache.get("trailSearchEntities");
        if (!cachedTrailSearchEntities || !useCache) {
            fetchTrailEntities(domain, trail).then(function (response) {
                cachedTrailSearchEntities = response;
                popUpCache.put("trailSearchEntities", cachedTrailSearchEntities);
                callback(cachedTrailSearchEntities);
            });
        } else {
            callback(cachedTrailSearchEntities);
        }
    }

    function fetchTrailSearchWebPages(domain, trail) {
        var post_data = JSON.stringify({domain: domain, trail: trail});
        return(popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/trails/links", post_data));
    }

    function fetchTrailEntities(domain, trail) {
        var post_data = JSON.stringify({domain: domain, trail: trail});
        return(popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/trails/entities", post_data));
    }
});

popUpControllers.service("feedbackService", function (popUpService, popUpCache) {
    return({
        fetchExtractorFeedbackEntities: fetchExtractorFeedbackEntities,
        markInvalid: markInvalid,
        fetchMarkedInvalidEntities: fetchMarkedInvalidEntities
    });

    function markInvalid(type, entity, domain, callback) {
        var postObj = {};
        postObj.entity_type = type;
        postObj.entity_value = entity;
        postObj.domain = domain;
        popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/feedback/bad", JSON.stringify(postObj))
            .then(callback);
    }

    function fetchMarkedInvalidEntities(domain, callback) {
        var markedInvalid = popUpCache.get("markedInvalidEntities");
        if (!markedInvalid) {
            var post_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/feedback/marked";
            popUpService.post(post_url, JSON.stringify({domain: domain})).then(function (response) {
                markedInvalid = response;
                popUpCache.put("markedInvalidEntities", markedInvalid);
                callback(markedInvalid);
            });
        } else {
            callback(markedInvalid);
        }
    }

    function fetchExtractorFeedbackEntities(domain, url, callback, useCache) {
        var feedbackEntities = popUpCache.get("feedbackEntities");
        if (!feedbackEntities || !useCache) {
            var postObj = {};
            postObj.domain = domain;
            postObj.url = url;
            popUpService.post(chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/feedback/entities", JSON.stringify(postObj))
                .then(function (response) {
                    feedbackEntities = response;
                    popUpCache.put("feedbackEntities", feedbackEntities);
                    callback(feedbackEntities);
                });
        } else {
            callback(feedbackEntities);
        }
    }

});

popUpControllers.service("rankingService", function (popUpService) {
    return({
        getUrlRank: getUrlRank,
        setUrlRank: setUrlRank
    });

    function setUrlRank(domain, trail, current_url, rank, callback) {
        var data = JSON.stringify({
            trailname: trail,
            url: decodeURIComponent(current_url),
            rank: rank,
            domain: domain
        });
        var rankUrl = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/ranks/set";
        console.log("datawake-popup setUrlRank submit reguest for: " + data);
        popUpService.post(rankUrl, data).then(callback);
    }

    function getUrlRank(domain, trail, url, callback) {
        var rank_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/ranks/get";
        var rank_data = JSON.stringify({
            trailname: trail,
            url: url,
            domain: domain
        });
        popUpService.post(rank_url, rank_data).then(callback);
    }

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
            when('/trail/explored', {
                templateUrl: 'partials/trail-based-explored-partial.html',
                controller: 'TrailEntitiesCtrl'
            }).
            when('/trail/unexplored', {
                templateUrl: 'partials/trail-based-unexplored-partial.html',
                controller: 'TrailEntitiesCtrl'
            }).
            when('/trail/entities/relevant', {
                templateUrl: 'partials/trail-based-relevant-entities-partial.html',
                controller: 'TrailEntitiesCtrl'
            }).
            when('/trail/entities/irrelevant', {
                templateUrl: 'partials/trail-based-irrelevant-entities-partial.html',
                controller: 'TrailEntitiesCtrl'
            }).
            otherwise({
                redirectTo: '/features/all'
            });
    }]);
