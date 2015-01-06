define(['../util/util', '../util/guid', './testGraphResponse', '../config/forensic_config'], function(util,guid,TEST_RESPONSE,ForensicConfig) {
	var USE_TEST_RESPONSE = ForensicConfig.useTestData;
	return {

		/**
		 * Ask the DataWake server for the info on the specified trail.
		 * @param trail
		 * @returns {*}
		 */
		get : function(trail) {
			var requestData = {
				name : 'browse path - with connected entities min degree 2',
				startdate :  Math.floor(915148798 / 1000),
				enddate :	Math.floor(new Date().getTime()/1000)
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