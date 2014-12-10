var addon = self;
var panelApp = angular.module('panelApp', []);

panelApp.controller("PanelCtrl", function ($scope, $document) {

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


    addon.port.on("feedbackEntities", function (entities) {
        $scope.feedbackEntities = entities;
        $scope.$apply();
    });

    addon.port.on("signOutComplete", function () {
        $scope.hideSignInButton = false;
        $scope.$apply();
    });

    addon.port.on("ranking", function (rankingInfo) {
        $scope.ranking = rankingInfo.ranking;
        var starRating = $("#star_rating");
        starRating.attr("data-average", rankingInfo.ranking);
        //Create this only once.
        createStarRating(addon.options.starUrl);
        $scope.$apply();
    });

    addon.port.on("entities", function (extractedEntities) {
        if (!$scope.lookaheadTimerStarted) {
            if (extractedEntities.allEntities.hasOwnProperty("website")) {
                var lookaheadTimerObject = {};
                lookaheadTimerObject.links = extractedEntities.allEntities["website"];
                addon.port.emit("startLookaheadTimer", lookaheadTimerObject);
                $scope.lookaheadTimerStarted = true;
            }
        }
        console.debug("Parsing Extracted Entities...");
        $scope.extracted_entities_dict = extractedEntities.allEntities;
        $scope.entities_in_domain = extractedEntities.domainExtracted;
        $scope.$apply();
    });

    addon.port.on("lookaheadTimerResults", function (lookahead) {
        $scope.lookaheadLinks.push(lookahead);
        $scope.$apply();
    });

    addon.port.on("externalLinks", function (links) {
        console.debug("Loading External Entities..");
        $scope.extracted_tools = links;
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

    $scope.markInvalid = function(type, entity){
        var postObj = {};
        postObj.entity_type = type;
        postObj.entity_value = entity;
        postObj.domain = $scope.datawake.domain.name;
        addon.port.emit("markInvalid", postObj);

    };

    addon.port.on("marked", function(entity){
        $scope.invalid[entity] = true;
        $scope.$apply();
    });

    $scope.isExtracted = function (type, name) {
        if ($scope.entities_in_domain.hasOwnProperty(type)) {

            return $scope.entities_in_domain[type].indexOf(name) >= 0;
        }
    };

    function createStarRating(starUrl) {
        var starRating = $("#star_rating");
        starRating.html("");
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
                $scope.ranking = rate;
                $scope.$apply();
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

    $document.ready(function () {
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
        $('#feedback').find('a').first().click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
    });

    addon.port.emit("init");

});
