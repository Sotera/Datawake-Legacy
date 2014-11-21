/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','views/navbarView', 'views/graphView'], function(config,navbarView,graphView) {
	require([],
		function() {
			$.get('/datawake/forensic/graphservice/trails')
				.then(function(response) {
					var trailNames = [];
					try {
						var JSONResponse = JSON.parse(response);
						JSONResponse.forEach(function (trail) {
							if (trail.trail) {
								trailNames.push(trail.trail);
							}
						});
					} catch(err){
						console.error('Server returned no trails!');
					}
					navbarView.insert($('#navbarContainer'),{
						trails:trailNames
					});
				})
				.fail(function(err) {
					alert('failed!');
				});

			graphView.insert($('#graphContainer'),{});
		});
});
