/**
 * Created by cdickson on 10/17/2014.
 */

require(['config','views/navbarView', 'views/graphView', 'util/util', 'util/guid'], function(config,navbarView,graphView,util,guid) {
	require([],
		function() {
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
					navbarView.insert($('#navbarContainer'),{
						trails:trails
					});
				})
				.fail(function(err) {
					alert('failed!');
				});
			graphView.insert($('#graphContainer'),{});
		});
});
