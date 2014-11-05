var addon = self;
var panelApp = angular.module('panelApp', []);

panelApp.controller("PanelCtrl", function ($scope, $document) {

    $scope.invalidTab = true;
    $scope.lookaheadLinks = [];
    $scope.extracted_tools = [];
    $scope.datawake = null;
    $scope.current_url = "";

    addon.port.on("datawakeInfo", function (datawakeInfo) {
        $scope.datawake = datawakeInfo;
        $scope.hideSignInButton = datawakeInfo.user != null;
        $scope.lookaheadLinks = [];
        $scope.extracted_tools = [];
        $scope.entities_in_domain = [];
        $scope.extracted_entities_dict = {};
        $scope.lookaheadTimerStarted = false;
        $scope.lookaheadEnabled = true;
        $scope.domainFeaturesEnabled = true;
        $scope.rankingEnabled = true;
        //Trigger the starting tab.
        var domainExtractedEntities = $('#domain_extracted_entities').find('a').first();
        domainExtractedEntities.trigger('click');
        $scope.$apply();
    });

    addon.port.on("useDomainFeatures", function (domainFeatures){
        $scope.domainFeaturesEnabled = domainFeatures;
        $scope.$apply();
    });
    addon.port.on("useLookahead", function (lookahead){
        $scope.lookaheadEnabled = lookahead;
        $scope.$apply();
    });
    addon.port.on("useRanking", function (ranking){
        $scope.rankingEnabled = ranking;
        $scope.$apply();
    });

    addon.port.on("signOutComplete", function () {
        $scope.hideSignInButton = false;
        $scope.$apply();
    });

    addon.port.on("sendUserInfo", function (user) {
        $scope.datawake.user = user;
        $scope.$apply();
    });

    addon.port.on("validTab", function (url) {
        $scope.current_url = url;
        $scope.invalidTab = false;
        $scope.$apply();
    });

    addon.port.on("invalidTab", function () {
        $scope.invalidTab = true;
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

    addon.port.on("badgeCount", function (badgeCount) {
        $scope.pageVisits = badgeCount;
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
    });

});
