var addon = self;

var sidebarApp = angular.module('sidebarApp', ["ngRoute", "ngSanitize"]).config(['$provide', function($provide) {
  $provide.decorator('$sniffer', ['$delegate', function($delegate) {
    $delegate.history = false;
    return $delegate;
  }]);
}]);


sidebarApp.controller("SidebarCtrl", function($scope, $document) {
  $scope.teamSpinner = true;
  $scope.headerPartial = "partials/header-partial.html";
  $scope.createTrailPartial = "partials/trail-modal-partial.html";
  $scope.createDomainPartial = "partials/domain-modal-partial.html";
  $scope.createTeamPartial = "partials/team-modal-partial.html"
  if (!$scope.domains) $scope.domains = [];
  $scope.trails = []

  addon.port.on("ready", function(prefs) {
    console.log("Got Ready")
    $scope.datawake = prefs.datawakeInfo;

    //hard coded until we add users
    $scope.datawake.domain={}
    $scope.datawake.domain.name = 'memex';
    $scope.datawake.trail={}
    $scope.datawake.trail.name = 'trail';

    addon.port.emit("infochanged", $scope.datawake);
    addon.port.emit("refreshEntities");
    addon.port.emit("refreshWebPages");
    addon.port.emit("refreshTrails", $scope.datawake.domain);

    $scope.current_url = prefs.current_url;
    $scope.versionNumber = prefs.versionNumber;
  });

  // TRAILS
  $scope.trails = [];
  $scope.selectedTrail = ($scope.datawake && $scope.datawake.trail) ? $scope.datawake.trail : null;

  addon.port.on("trails", function(trails) {
    $scope.trails = trails;
    $scope.selectedTrail = null;
    if ($scope.datawake.trail && $scope.trails) {
      for (i in $scope.trails) {
        if ($scope.trails[i].id == $scope.datawake.trail.id) {
          $scope.selectedTrail = $scope.trails[i];
        }
      }
    } else {
        // Insert Hack here
        $sope.selectedTrail = $scope.trails[0];
        //$scope.domain.trail = $scope.selectedTrail;
        addon.port.emit("infochanged", $scope.datawake);
    }

    $scope.trailSpinner = false;
    $scope.$apply();
    console.log("GOT TRAILS")
  });

  $scope.trailChanged = function(trail) {
    $scope.datawake.trail = trail;
    addon.port.emit("infochanged", $scope.datawake);
    console.log("trailChanged")
    console.log($scope.datawake)
  };


  $scope.newTrail = function(team, domain, newTrailName, newTrailDesc) {
    var data = {}
    data.team_id = team.id;
    data.domain_id = domain.id;
    data.name = newTrailName
    data.description = (newTrailDesc) ? newTrailDesc : "";
    $scope.trailChanged(null);
    $scope.newTrailName = null;
    addon.port.emit("createTrail", data);
  }


  addon.port.on("trailCreated", function(trail) {
    $scope.trails.push(trail)
    $scope.selectedTrail = trail
    $scope.datawake.trail = trail;
    addon.port.emit("infochanged", {
      tabId: addon.options.tabId,
      info: $scope.datawake
    });
    $scope.apply()
  });

  //Entities
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

  addon.port.on("promptTrailBasedEntity", function(obj) {
    var text = prompt(obj.prompt, obj.raw_text);
    if (text) {
      addon.port.emit(obj.callback, text);
    }
  });

  $scope.signOut = function() {
    addon.port.emit("signOut");
  }

  $scope.getHostName = function(url) {
    url = new URL(url).hostname
      //Remove http/www to save display space.
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '')
    url = url.replace(/\./g, '.<wbr>');
    return url
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

  $scope.showEntities = function(link) {
    if (!link.show) {
      var data = {};
      data.domain = $scope.datawake.domain;
      data.trail = $scope.datawake.trail;
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

  $scope.removeLink = function(link) {
    var data = {};
    data.domain = $scope.datawake.domain;
    data.trail = $scope.datawake.trail;
    data.url = link.url;
    addon.port.once("removeTrailLink", function() {

      $scope.notVisitedLinks.splice($scope.notVisitedLinks.indexOf(link), 1);
      $scope.$apply();
    });
    addon.port.emit("removeLink", data);

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

});

$('ul.nav.nav-pills li a').click(function() {
    $(this).parent().addClass('active').siblings().removeClass('active');
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
      redirectTo: 'partials/trail-based-relevant-entities-partial.html'
    });
  }
]);
