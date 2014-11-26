define(['../util/util', '../util/guid'], function(util,guid) {
	return {

		/**
		 * Ask the DataWake server for the info on the specified trail.
		 * @param trail
		 * @returns {*}
		 */
		get : function(trail) {
			var requestData = {
				name : 'browse path - with connected entities min degree 2',
				startdate : 1416459600,
				enddate : 1416546000
			};
			requestData.users = trail.users;
			requestData.domain = trail.domain;
			requestData.trail = trail.trail;
			return $.ajax({
				type: 'POST',
				url: '/datawake/forensic/graphservice/get',
				data: JSON.stringify(requestData),
				contentType: 'application/json',
				dataType: 'json'
			});
		}
	}
});