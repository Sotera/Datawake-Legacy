/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','views/navbarView', 'views/graphView', 'views/legendView', 'views/aboutView', 'rest/trails'], function(config,NavbarView,GraphView,LegendView,AboutView,TrailsService) {
	require([],
		function() {
			/*----------------------------------------------------------------------------------------------------------
			 *		Program Entry
			 *--------------------------------------------------------------------------------------------------------*/
			var _graphView = null;
			var _navbarView = null;
			var _legendView = null;
			var _aboutView = null;
			TrailsService.get().then(function(trails) {
				_navbarView = new NavbarView($('#navbarContainer'),{
					trails:trails
				});
				_graphView = new GraphView($('#graphContainer'),{});
				_legendView = new LegendView($('#legendContainer'));
				_aboutView = new AboutView($('#aboutForensic'));
			});
		});
});
