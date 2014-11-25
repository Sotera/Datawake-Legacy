/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','views/navbarView', 'views/graphView', 'util/util', 'util/guid'], function(config,NavbarView,GraphView,util,guid) {
	require([],
		function() {
			var getTrails = function() {
				var d = new $.Deferred();
				$.get('/datawake/forensic/graphservice/trails')
					.then(function(response) {
						var trails = [];
						try {
							var JSONResponse = JSON.parse(response);
							JSONResponse.forEach(function (trail) {
								if (util.hasProperties(trail)) {
									trail.id = guid.generate();
									trails.push(trail);
								}
							});
						} catch(err){
							console.error('Server returned no trails!');
						}
						d.resolve(trails);
					})
					.fail(function(err) {
						d.reject(err);
					});
				return d.promise();
			};

			/*----------------------------------------------------------------------------------------------------------
			 *		Program Entry
			 *--------------------------------------------------------------------------------------------------------*/
			var _graphView = null;
			var _navbarView = null;
			getTrails().then(function(trails) {
				_navbarView = new NavbarView($('#navbarContainer'),{
					trails:trails
				});
				_graphView = new GraphView($('#graphContainer'),{});
			});
		});
});
