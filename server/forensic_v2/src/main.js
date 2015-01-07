/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','config/forensic_config','views/navbarView', 'views/graphView', 'views/legendView', 'views/aboutView', 'rest/trails', 'rest/authorization', 'util/util'], function(config,ForensicConfig,NavbarView,GraphView,LegendView,AboutView,TrailsService, AuthService,_) {
	require([],
		function() {
			/*----------------------------------------------------------------------------------------------------------
			 *		Program Entry
			 *--------------------------------------------------------------------------------------------------------*/
			var _graphView = null;
			var _navbarView = null;
			var _legendView = null;
			var _aboutView = null;


			if (ForensicConfig.useTestData) {
				TrailsService.get().then(function(trails) {
					_navbarView = new NavbarView($('#navbarContainer'),{
						trails:trails
					});
					_graphView = new GraphView($('#graphContainer'),{});
					_legendView = new LegendView($('#legendContainer'));
					_aboutView = new AboutView($('#aboutForensic'));
				});
			} else {
				// TODO:  replace this with google sign in token when we have that working
				var userName = 'John Doe';
				_.showLoader('Authorizizing user: ' + userName);
				AuthService.post({
					token : '123456'
				}).then(function() {
					_.hideLoader();
					_.showLoader('Requesting trails for user: ' + userName);
					TrailsService.get().then(function(trails) {
						_.hideLoader();
						_navbarView = new NavbarView($('#navbarContainer'),{
							trails:trails
						});
						_graphView = new GraphView($('#graphContainer'),{});
						_legendView = new LegendView($('#legendContainer'));
						_aboutView = new AboutView($('#aboutForensic'));
					});
				});
			}

		});
});
