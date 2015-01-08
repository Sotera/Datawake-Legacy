/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','config/forensic_config','views/navbarView', 'views/graphView', 'views/legendView', 'views/aboutView', 'rest/trails', 'rest/authorization', 'util/util', 'util/authHelper'], function(config,ForensicConfig,NavbarView,GraphView,LegendView,AboutView,TrailsService, AuthService,_, AuthHelper) {
	require([],
		function() {
			/*----------------------------------------------------------------------------------------------------------
			 *		Program Entry
			 *--------------------------------------------------------------------------------------------------------*/
			var _graphView = null;
			var _navbarView = null;
			var _legendView = null;
			var _aboutView = null;
			var useGoogleAuth = true;

			gOnSignin = function(authResult) {
				AuthHelper.onSignInCallback(authResult);
			};


			AuthHelper.setOnLoggedIn(function() {
				_.hideLoader();
				_.showLoader('Requesting trails');
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

			function checkClientId(){
				var clientId = $("meta[name='google-signin-clientid']").attr('content');
				if(clientId == ''){
					alert('You have Google Auth Enabled, but forgot to add a client Id!');
				}
			}


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

				if (!useGoogleAuth) {
					AuthHelper.onSignInCallback({'access_token': '123456'});
				}

				var po = document.createElement('script');
				po.type = 'text/javascript'; po.async = true;
				po.src = 'https://apis.google.com/js/client:plusone.js?onload=render';
				var s = document.getElementsByTagName('script')[0];
				s.parentNode.insertBefore(po, s);
				checkClientId();
			}
		});
});
