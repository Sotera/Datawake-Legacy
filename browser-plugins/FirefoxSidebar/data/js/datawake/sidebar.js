var addon = self;

var sidebarApp = angular.module('sidebarApp', ["ngRoute", "ngSanitize"]).config(['$provide', function($provide) {
  $provide.decorator('$sniffer', ['$delegate', function($delegate) {
    $delegate.history = false;
    return $delegate;
  }]);
}]);


sidebarApp.controller("SidebarCtrl", function($scope, $document, $interval) {
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

    $scope.datawake.domain = {}
    $scope.datawake.domain.name = 'memex';
    $scope.datawake.trail = {}

    addon.port.emit("infochanged", $scope.datawake);
    addon.port.emit("refreshEntities");
    addon.port.emit("refreshWebPages");
    addon.port.emit("refreshTrails", $scope.datawake.domain);

    $scope.current_url = prefs.current_url;
    $scope.versionNumber = prefs.versionNumber;
    $scope.user = prefs.userInfo;
  });

  addon.port.on("infosaved", function(datawakeinfo) {
    $scope.datawake = datawakeinfo;
    $scope.$apply();
    console.log("ON INFO SAVED");
    console.log($scope.datawake);
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
          $scope.datawake.trail = $scope.trails[i];
          addon.port.emit("infochanged", $scope.datawake);
        }
      }
    } else {
      $scope.domain.trail = $scope.selectedTrail;
      addon.port.emit("infochanged", $scope.datawake);
    }

    $scope.trailSpinner = false;
    $scope.$apply();
    console.log("GOT TRAILS")
  });

  addon.port.on("trailCreated", function(trail) {
    console.log("trailCreated")
    console.log($scope.datawake)
    $scope.trails.push(trail);
    $scope.selectedTrail = trail;
    $scope.$apply();
    addon.port.emit("infochanged", $scope.datawake);
  });

  $scope.trailChanged = function(trail) {
    $scope.datawake.trail.name = trail;
    addon.port.emit("infochanged", $scope.datawake);
    addon.port.emit("refreshEntities");
    addon.port.emit("refreshWebPages");
    console.log("trailChanged")
    console.log($scope.datawake)
  };


  $scope.newTrail = function(domain, newTrailName, newTrailDesc) {
    var data = {}
    data.domain = domain.name;
    data.name = newTrailName
    data.description = (newTrailDesc) ? newTrailDesc : "";
    $scope.trailChanged(newTrailName);
    $scope.newTrailName = newTrailName;
    addon.port.emit("createTrail", data);
  }

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

  $interval(function(){
    addon.port.emit("refreshWebPages", {
      domain: "memex",
      trail: "trail"
    });
  },10000);

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
      redirectTo: '/trail/entities/relevant'
    });
  }
]);
