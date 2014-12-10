define(['../util/util', '../util/guid', './testResponse'], function(util,guid,TEST_RESPONSE) {
	var USE_TEST_RESPONSE = false;
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

			if (USE_TEST_RESPONSE) {
				var d = new $.Deferred();
				return d.resolve(TEST_RESPONSE);
			} else {
				return $.ajax({
					type: 'POST',
					url: '/datawake/forensic/graphservice/get',
					data: JSON.stringify(requestData),
					contentType: 'application/json',
					dataType: 'json'
				});
			}
		}
	};
});