var addon = self;

var sidebarApp = angular.module('sidebarApp', ["ngRoute", "ngSanitize"]).config(['$provide', function($provide) {
  $provide.decorator('$sniffer', ['$delegate', function($delegate) {
    $delegate.history = false;
    return $delegate;
  }]);
}]);


sidebarApp.controller("SidebarCtrl", function($scope, $document) {
  $scope.teamSpinner = true;
  $scope.domainSpinner = true;
  $scope.trailSpinner = true;
  $scope.extracted_tools = [];
  $scope.invalid = {};
  $scope.headerPartial = "partials/header-partial.html";
  $scope.createTrailPartial = "partials/trail-modal-partial.html";
  $scope.createDomainPartial = "partials/domain-modal-partial.html";
  $scope.createTeamPartial = "partials/team-modal-partial.html"
  $scope.teamMembers = null;
  if (!$scope.domains) $scope.domains = [];
  $scope.trails = []

  addon.port.on("ready", function(prefs) {
    console.log("Got Ready")
    $scope.datawake = prefs.datawakeInfo;

    $scope.datawake.domain = 'memex';
    $scope.datawake.trail = 'trail';
    addon.port.emit("refreshEntities", {
      domain: "memex",
      trail: "trail"
    });
    addon.port.emit("refreshWebPages", {
      domain: "memex",
      trail: "trail"
    });

    $scope.current_url = prefs.current_url;
    $scope.lookaheadEnabled = prefs.useLookahead;
    $scope.domainFeaturesEnabled = prefs.useDomainFeatures;
    $scope.versionNumber = prefs.versionNumber;
  });

  console.log($scope.datawake);

  addon.port.on("trailEntities", function(entities_obj) {
    console.log("Got trail entities")
    $scope.irrelevantEntities = entities_obj.irrelevantEntities;
    $scope.trailEntities = entities_obj.entities;
    $scope.trailEntitiesIter = createIterableEntityListForSorting(entities_obj.entities);
    $scope.irrelevantEntitiesIter = createIterableEntityListForSorting(entities_obj.irrelevantEntities);
    $scope.$apply();
  });

  addon.port.on("trailLinks", function(links_obj) {
    console.log("Got trail links")
    $scope.visitedLinks = links_obj.visited;
    $scope.notVisitedLinks = links_obj.notVisited;
    $scope.$apply();
  });

  $scope.signOut = function() {
    addon.port.emit("signOut");
  }

  $scope.isExtracted = function(type, name) {
    if ($scope.entities_in_domain && $scope.entities_in_domain.hasOwnProperty(type)) {
      return $scope.entities_in_domain[type].indexOf(name) >= 0;
    }
  };

  $scope.getHostName = function(url) {
    //For some reason, sometimes errant spaces were apearing in the urls.
    url = url.replace(/\s+/g, '');
    url = new URL(url).hostname
      //Remove http/www
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '')
    return url
  };

  $scope.showEntities = function(link) {
    if (!link.show) {
      var data = {};
      // data.domain = $scope.datawake.domain.name;
      // data.trail = $scope.datawake.trail.name;
      data.domain = 'memex';
      data.trail = 'trail';

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

  $scope.refreshWebPages = function() {
    addon.port.emit("refreshWebPages", {
      domain: "memex",
      trail: "trail"
    });
  };

  $scope.refreshEntities = function() {
    addon.port.emit("refreshEntities", {
      domain: "memex",
      trail: "trail"
    });
  };

  function createIterableEntityListForSorting(entities) {
    var arr = [];
    $.map(entities, function(item, key) {
      arr.push({
        entity: key,
        rank: item
      });
    });
    return arr;
  }

  addon.port.emit("init");
});

sidebarApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
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
      redirectTo: '/trail/unexplored'
    });
  }
]);