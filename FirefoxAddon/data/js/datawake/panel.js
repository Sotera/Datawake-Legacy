var addon = self;
var panelApp = angular.module('panelApp', []);

panelApp.controller("PanelCtrl", function ($scope) {

    $scope.invalidTab = true;
    $scope.lookaheadLinks = [];
    $scope.extracted_tools = [];
    $scope.datawake = null;

    addon.port.on("datawakeInfo", function (datawakeInfo) {
        $scope.datawake = datawakeInfo;
        $scope.hideSignInButton = datawakeInfo.user != null;
        $scope.lookaheadLinks = [];
        $scope.extracted_tools = [];
        $scope.lookaheadTimerStarted = false;
        $scope.$apply();
    });

    addon.port.on("signOutComplete", function () {
        $scope.hideSignInButton = false;
        $scope.$apply();
    });

    addon.port.on("sendUserInfo", function(user){
        $scope.datawake.user = user;
        $scope.$apply();
    });

    addon.port.on("validTab", function () {
        $scope.invalidTab = false;
        $scope.$apply();
    });

    addon.port.on("invalidTab", function () {
        $scope.invalidTab = true;
        $scope.$apply();
    });

    addon.port.on("invalidTab", function () {
        $scope.invalidTab = true;
        $scope.$apply();
    });

    addon.port.on("ranking", function (rankingInfo) {
        $scope.ranking = rankingInfo.ranking;
        createStarRating(rankingInfo.starUrl);
        $scope.$apply();
    });

    addon.port.on("entities", function (extracted_entities_dict) {
        if (!$scope.lookaheadTimerStarted) {
            if ("website" in extracted_entities_dict) {
                var lookaheadTimerObject = {};
                lookaheadTimerObject.links = Object.keys(extracted_entities_dict["website"]);
                addon.port.emit("startLookaheadTimer", lookaheadTimerObject);
                $scope.lookaheadTimerStarted = true;
                $scope.$apply();
            }
        }
        console.debug("Parsing Extracted Entities...");
        parseExtractedEntities(extracted_entities_dict);
    });

    addon.port.on("lookaheadTimerResults", function (lookahead) {
        if (lookahead != null) {
            if (lookahead.matchCount > 0 || lookahead.domain_search_hits > 0 || lookahead.hitlist.length > 0) {
                $scope.lookaheadLinks.push(lookahead);
            }
        }
    });

    addon.port.on("fetchEntitiesTimerResults", parseExtractedEntities);

    addon.port.on("externalLinks", function (links) {
        console.debug("Loading External Entities..");
        $scope.extracted_tools = links;
        $scope.$apply();
    });

    $scope.hitListToggle = function (lookaheadObj) {
        lookaheadObj.hitListShow = !lookaheadObj.hitListShow;
    };

    $scope.searchHitsToggle = function (lookaheadObj) {
        lookaheadObj.searchHitsShow = !lookaheadObj.searchHitsShow;
    };

    $scope.matchesToggle = function (lookaheadObj) {
        lookaheadObj.matchesShow = !lookaheadObj.matchesShow;
    };

    function createStarRating(starUrl) {
        $("#star_rating").jRating({
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

    function parseExtractedEntities(extracted_entities_dict) {
        var entities_in_domain = [];
        for (var type in extracted_entities_dict) {
            for (var name in extracted_entities_dict[type]) {
                var entity = {};
                if (extracted_entities_dict[type][name] == "y") {
                    entity.name = name;
                    entity.type = type;
                    entities_in_domain.push(entity);
                }
            }
        }

        $scope.entities_in_domain = entities_in_domain;
        $scope.extracted_entities_dict = extracted_entities_dict;
        $scope.$apply();
    }

});


$(document).ready(function () {
    $('#domain_extracted_entities a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    });

    $('#lookahead a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    });

    $('#all_extracted_entities a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    });

    $('#domain_extracted_entities a').trigger('click');
});

