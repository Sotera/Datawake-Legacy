/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','views/navbarView', 'views/graphView'], function(config,navbarView,graphView) {
	require([],
		function() {
			var body = $('body');

			// TODO:  get trails here from server and pass them into navbar

			navbarView.insert(body,{
				trails:[
					'Trail1',
					'TestTrail',
					'ChrisTest',
					'OculusTestTrail',
					'OculusTestTrail2'
				]
			});

			graphView.insert(body,{});


		});
});
