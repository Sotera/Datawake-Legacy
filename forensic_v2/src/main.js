/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','views/navbarView', 'views/graphView', 'rest/trails'], function(config,NavbarView,GraphView,Trails) {
	require([],
		function() {
			/*----------------------------------------------------------------------------------------------------------
			 *		Program Entry
			 *--------------------------------------------------------------------------------------------------------*/
			var _graphView = null;
			var _navbarView = null;
			Trails.get().then(function(trails) {
				_navbarView = new NavbarView($('#navbarContainer'),{
					trails:trails
				});
				_graphView = new GraphView($('#graphContainer'),{});
			});
		});
});
