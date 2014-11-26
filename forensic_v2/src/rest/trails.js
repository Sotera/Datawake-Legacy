define(['../util/util', '../util/guid'], function(util,guid) {
	return {
		get : function() {
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
		}
	}
});