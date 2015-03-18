var addon = self;


var panelApp = angular.module('panelApp', ["ngRoute", "ngSanitize"]).config(['$provide', function($provide) {
  $provide.decorator('$sniffer', ['$delegate', function($delegate) {
    $delegate.history = false;
    return $delegate;
  }]);
}]);


panelApp.controller("PanelCtrl", function($scope, $document) {
  $scope.teamSpinner = true;
  $scope.domainSpinner = true;
  $scope.trailSpinner = true;
  $scope.extracted_tools = [];
  // $scope.datawake = addon.options.datawakeInfo;
  // $scope.current_url = addon.options.current_url;
  // $scope.domainFeaturesEnabled = addon.options.useDomainFeatures;
  // $scope.rankingEnabled = addon.options.useRanking;
  // $scope.versionNumber = addon.options.versionNumber;
  // $scope.user = addon.options.userInfo;
  $scope.invalid = {};
  // $scope.pageVisits = addon.options.pageVisits;
  $scope.headerPartial = "partials/header-partial.html";
  $scope.createTrailPartial = "partials/trail-modal-partial.html";
  $scope.createDomainPartial = "partials/domain-modal-partial.html";
  $scope.createTeamPartial = "partials/team-modal-partial.html"
    // $scope.domains = addon.options.domains;
  $scope.teamMembers = null;
  if (!$scope.domains) $scope.domains = [];
  $scope.trails = []

  addon.port.on("ready", function(prefs) {
    console.log("Got Ready")
    console.log("Datawake Prefs")
    console.log(prefs.datawakeInfo)
    $scope.datawake = prefs.datawakeInfo;
    $scope.current_url = prefs.current_url;
    $scope.lookaheadEnabled = prefs.useLookahead;
    $scope.domainFeaturesEnabled = prefs.useDomainFeatures;
    $scope.rankingEnabled = prefs.useRanking;
    $scope.versionNumber = prefs.versionNumber;
    $scope.pageVisits = prefs.pageVisits;
    $scope.starUrl = prefs.starUrl
  });


  //  console.log("opening panel for tab: "+addon.options.tabId)
  console.log($scope.datawake)

  // TEAMS
  $scope.teams = [];
  if ($scope.datawake && $scope.datawake.team) $scope.teams.push($scope.datawake.team)
  $scope.selectedTeam = ($scope.datawake && $scope.datawake.team) ? $scope.datawake.team : null;

  // when teams are returned  from the server set the selected team as the matching element from the teams array
  addon.port.on("teams", function(teams) {
    $scope.teams = teams;
    $scope.selectedTeam = null;
    if ($scope.datawake.team) {
      for (i in $scope.teams) {
        if ($scope.teams[i].id == $scope.datawake.team.id) {
          $scope.selectedTeam = $scope.teams[i]
        }
      }
    }
    $scope.teamSpinner = false;
    $scope.$apply();
    console.log("GOT TEAMS")
    console.log(teams)
  });

  $scope.teamChanged = function(team) {
    $scope.datawake.team = team;
    $scope.datawake.domain = null;
    $scope.datawake.trail = null;
    $scope.isDatawakeOn = false;
    $scope.domains = []
    $scope.trails = []
    $scope.domainSpinner = true;
    addon.port.emit("changeTeam", {
      tabId: addon.options.tabId,
      team: team
    });
    console.log("teamChanged")
    console.log($scope.datawake)
  };

  $scope.teamChangedOnTeamModal = function(team) {
    $scope.teamMembers = null;
    addon.port.emit("getTeamMembers", team)
  }

  addon.port.on("gotTeamMembers", function(teamMembers) {
    $scope.teamMembers = teamMembers
    console.log("got team members")
    console.log(teamMembers)
    $scope.$apply();
  })


  $scope.createTeam = function(name, description) {
    console.log("create team: (" + name + "," + description + ")")
    var data = {
      name: name,
      description: description
    }
    $scope.newTeamDisabled = true;
    addon.port.emit("createTeam", data)
  }

  addon.port.on("teamCreated", function(team) {
    console.log("teamCreated")
    console.log(team)
    $scope.newTeamDisabled = false;
    $scope.datawake.team = team;
    $scope.teams.push(team)
    $scope.$apply()
  })

  $scope.addTeamMemeber = function(team, email) {
    console.log("adding team member")
    console.log(team)
    console.log(email)
    var data = {
      team_id: team.id,
      email: email
    }
    addon.port.emit("addTeamMember", data)

  }

  $scope.removeTeamMember = function(team, email) {
    console.log("removing team member")
    console.log(team)
    console.log(email)
    var data = {
      team_id: team.id,
      email: email
    }
    addon.port.emit("removeTeamMember", data)
  }


  // DOMAINS
  // if (! $scope.datawake.team) $scope.domainSpinner = false;
  // $scope.domains =[];
  // if ($scope.datawake && $scope.datawake.domain ) $scope.domains.push($scope.datawake.domain)
  // $scope.selectedDomain = ($scope.datawake && $scope.datawake.domain ) ? $scope.datawake.domian : null;

  // when domains come in from the server set the selected domain to the matching element
  addon.port.on("domains", function(domains) {
    $scope.selectedDomain = null;
    $scope.domains = domains;
    if ($scope.datawake.domain && $scope.domains) {
      for (i in $scope.domains) {
        if ($scope.domains[i].id == $scope.datawake.domain.id) {
          $scope.selectedDomain = $scope.domains[i]
        }
      }
    }
    $scope.domainSpinner = false;
    $scope.$apply()
    console.log("GOT DOMAINS")
    console.log(domains)
  });

  $scope.domainChanged = function(domain) {
    $scope.datawake.domain = domain;
    $scope.datawake.trail = null;
    $scope.isDatawakeOn = false;
    $scope.trails = [];
    $scope.trailSpinner = true;
    addon.port.emit("changeDomain", {
      tabId: addon.options.tabId,
      domain: $scope.datawake.domain
    });
    console.log("domainChanged")
    console.log($scope.datawake)

  };


  // TRAILS
  // if ( !$scope.datawake.team || ! $scope.datawake.domain ) $scope.trailSpinner = false;
  // $scope.trails = [];
  // if ($scope.datawake && $scope.datawake.trail) $scope.trails.push($scope.datawake.trail);
  // $scope.selectedTrail = ($scope.datawake && $scope.datawake.trail) ? $scope.datawake.trail : null;

  addon.port.on("trails", function(trails) {
    $scope.trails = trails;
    $scope.selectedTrail = null;
    if ($scope.datawake.trail && $scope.trails) {
      for (i in $scope.trails) {
        if ($scope.trails[i].id == $scope.datawake.trail.id) {
          $scope.selectedTrail = $scope.trails[i]
        }
      }
    }
    $scope.trailSpinner = false;
    $scope.$apply();
    console.log("GOT TRAILS")
    console.log(trails)
  });

  $scope.trailChanged = function(trail) {
    $scope.datawake.trail = trail;
    $scope.datawake.isDatawakeOn = false;
    addon.port.emit("infochanged", {
      tabId: addon.options.tabId,
      info: $scope.datawake
    });
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



  // Recording
  $scope.recordingChange = function(recording) {
    $scope.datawake.isDatawakeOn = recording;
    addon.port.emit("infochanged", {
      tabId: addon.options.tabId,
      info: $scope.datawake
    });
    console.log("recordingChange")
    console.log($scope.datawake)
  }

  addon.port.on("manualFeatures", function(features) {
    console.log("Got manual features")
    console.log(features)
    $scope.$apply(function() {
      $scope.manualFeatures = features;
    });
  });

  addon.port.on("trailEntities", function(entities_obj) {
    console.log("Got trail entities")
    console.log(entities_obj)
    $scope.irrelevantEntities = entities_obj.irrelevantEntities;
    $scope.trailEntities = entities_obj.entities;
    $scope.trailEntitiesIter = createIterableEntityListForSorting(entities_obj.entities);
    $scope.irrelevantEntitiesIter = createIterableEntityListForSorting(entities_obj.irrelevantEntities);
    $scope.$apply();
  });

  addon.port.on("trailLinks", function(links_obj) {
    console.log("got trail links")
    console.log(links_obj)
    $scope.visitedLinks = links_obj.visited;
    $scope.notVisitedLinks = links_obj.notVisited;
    $scope.$apply();
  });

  addon.port.on("ranking", function(rankingInfo) {
    $scope.$apply(function() {
      $scope.ranking = rankingInfo.ranking;
      var starRating = $("#star_rating");
      starRating.attr("data-average", rankingInfo.ranking);
      createStarRating(addon.options.starUrl);
    });
  });

  addon.port.on("features", function(features) {
    $scope.extracted_entities_dict = features;
    $scope.$apply();
  });

  addon.port.on("domain_features", function(features) {
    $scope.domain_extracted_entities_dict = features;
    $scope.$apply();
  });


  addon.port.on("externalLinks", function(links) {
    console.debug("Loading External Entities..");
    $scope.$apply(function() {
      $scope.extracted_tools = links;
    });
  });


  $scope.signOut = function() {
    addon.port.emit("signOut");
  }

  $scope.openExternalLink = function(externalUrl) {
    addon.port.emit("openExternalLink", {
      externalUrl: externalUrl
    });
  };

  $scope.markInvalid = function(type, entity) {
    var postObj = {};
    postObj.team_id = $scope.datawake.team.id;
    postObj.domain_id = $scope.datawake.domain.id;
    postObj.trail_id = $scope.datawake.trail.id;
    postObj.feature_type = type;
    postObj.feature_value = entity;
    addon.port.emit("markInvalid", postObj);
    $scope.invalid[entity] = true;
  };

  addon.port.on("markedFeatures", function(features) {
    for (i in features) {
      var feature = features[i];
      $scope.invalid[feature.value] = true;
    }
    $scope.$apply()


  });

  $scope.isExtracted = function(type, name) {
    if ($scope.entities_in_domain && $scope.entities_in_domain.hasOwnProperty(type)) {
      return $scope.entities_in_domain[type].indexOf(name) >= 0;
    }
  };

  $scope.editFeatures = function() {
    if (!$scope.allowEditFeatures) {
      $scope.allowEditFeatures = true;
    } else {
      $scope.allowEditFeatures = false;
    }
  }

  $scope.getHostName = function(url) {
    return new URL(url).hostname
  };

  $scope.showEntities = function(link) {
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

  addon.port.on("infosaved", function(datawakeinfo) {
    $scope.datawake = datawakeinfo;
    $scope.$apply()
    console.log("ON INFO SAVED")
    console.log($scope.datawake)
  })

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
      onClick: function(element, rate) {
        setUrlRank(rate);
        $scope.$apply(function() {
          $scope.ranking = rate;
        });
      }
    });

  }

  function setUrlRank(rank) {
    var rank_data = {
      team_id: $scope.datawake.team.id,
      domain_id: $scope.datawake.domain.id,
      trail_id: $scope.datawake.trail.id,
      url: $scope.current_url,
      rank: rank
    };
    addon.port.emit("setUrlRank", rank_data);
  }

  addon.port.emit("init");

});

panelApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
    when('/features/all', {
      templateUrl: 'partials/extracted-entities-partial.html'
    }).
    when('/features/domain', {
      templateUrl: 'partials/domain-extracted-partial.html'
    }).
    when('/features/manual', {
      templateUrl: 'partials/manual-features-partial.html'
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
      redirectTo: 'partials/extracted-entities-partial.html'
    });
  }
]);
