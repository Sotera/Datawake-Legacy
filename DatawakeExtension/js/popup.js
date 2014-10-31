var datawakePopUpApp = angular.module("datawakePopUpApp", []);

datawakePopUpApp.controller("PopUpCtrl", function ($scope, $timeout, popUpService) {

    $scope.invalidTab = false;
    $scope.extracted_tools = [];
    $scope.extracted_entities_dict = {};
    $scope.lookaheadStarted = false;
    $scope.lookaheadLinks = [];
    $scope.entities_in_domain = [];
    $scope.current_url = ""


    function linkLookahead(tabUrl, extractedLinks, index, domain, delay) {
        var post_url = chrome.extension.getBackgroundPage().config.datawake_serviceUrl + "/lookahead/matches";
        var jsonData = JSON.stringify({url: extractedLinks[index], srcurl: tabUrl, domain: domain });
        popUpService.post(post_url, jsonData).then(function (response) {
            if (response.matches.length > 0 || response.domain_search_matches.length > 0) {
                $scope.lookaheadLinks.push(response);
                extractedLinks.splice(index, 1);
                if (extractedLinks.length > 0) {
                    if (index >= extractedLinks.length) {
                        index = 0;
                        if (delay <= 5 * 60 * 1000) {
                            $timeout(function () {
                                linkLookahead(tabUrl, extractedLinks, index, domain, delay * 2);
                            }, delay);
                        }
                    }
                    else {
                        linkLookahead(tabUrl, extractedLinks, index, domain, delay);
                    }
                }
            } else {
                index = (index + 1) % extractedLinks.length;
                if (index == 0) {
                    // pause for the delay at the begining of the list
                    if (delay <= 5 * 60 * 1000) {
                        $timeout(function () {
                            linkLookahead(tabUrl, extractedLinks, index, domain, delay * 2);
                        }, delay);
                    }
                }
                else {
                    $timeout(function () {
                        linkLookahead(tabUrl, extractedLinks, index, domain, delay);
                    }, 1);
                }
            }
        });
    }

    function extractedEntities(entities, tabUrl, domain) {
        $scope.extracted_entities_dict = (entities.allEntities != null) ? entities.allEntities : {};
        if (!$scope.lookaheadStarted && entities.allEntities.hasOwnProperty("website")) {
            $timeout(function () {
                var lookaheadLinks = entities.allEntities["website"];
                linkLookahead(tabUrl, lookaheadLinks, 0, domain, 1000);
            }, 1000);
            $scope.lookaheadStarted = true;
        }
        $scope.entities_in_domain = (entities.domainExtracted != null) ? entities.domainExtracted : {};
    }

    $scope.isExtracted = function (type, name) {
        if ($scope.entities_in_domain.hasOwnProperty(type)) {

            return $scope.entities_in_domain[type].indexOf(name) >= 0;
        }
    };

    function externalToolsCallback(extracted_tools) {
        $scope.extracted_tools = extracted_tools;
    }

    function getDomainAndTrail() {
        chrome.tabs.query({active: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (response) {
                $scope.trail = response.trail;
                $scope.domain = response.domain;
                $scope.org = response.org;
            });
        });
    }

    function fetchEntities(delay) {
        chrome.tabs.query({active: true}, function (tabs) {
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
        chrome.tabs.query({active: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (response) {
                var data = JSON.stringify({
                    trailname: response.trail,
                    url: decodeURIComponent(tabs[0].url),
                    rank: rank,
                    domain: response.domain
                });
                var rankUrl = response.rankUrl + "/set";
                console.log("datawake-popup setUrlRank submit reguest for: " + data);
                popUpService.post(rankUrl, data).then(function (response) {
                    if (response.success) {
                        console.log("datawake-popup setUrlRank -> " + response);
                    }
                });
            });
        });
    }

    function getUrlRank() {
        chrome.tabs.query({active: true}, function (tabs) {
            chrome.runtime.sendMessage({operation: "get-popup-data", tab: tabs[0]}, function (domainSpecificInformation) {
                var rank_url = domainSpecificInformation.rankUrl + "/get";
                $scope.current_url = tabs[0].url
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

    $scope.hitListToggle = function (lookaheadObj) {
        lookaheadObj.hitListShow = !lookaheadObj.hitListShow;
    };

    $scope.searchHitsToggle = function (lookaheadObj) {
        lookaheadObj.searchHitsShow = !lookaheadObj.searchHitsShow;
    };

    $scope.matchesToggle = function (lookaheadObj) {
        lookaheadObj.matchesShow = !lookaheadObj.matchesShow;
    };

    googlePlusUserLoader.onload(setUser);
    getDomainAndTrail();
    fetchEntities(500);
    loadExternalLinks();

});


datawakePopUpApp.service("popUpService", function ($http, $q) {

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

$(document).ready(function () {
    var domainExtractedEntities = $('#domain_extracted_entities').find('a').first();
    domainExtractedEntities.click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    $('#lookahead').find('a').first().click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    $('#all_extracted_entities').find('a').first().click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    domainExtractedEntities.trigger('click');
});
