define([], function() {
	return {
		/**
		 * Checks if an object has any properties
		 * @param obj
		 * @returns {boolean} - true if object has a property of it's own, false otherwise
		 */
		hasProperties : function(obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					return true;
				}
			}
			return false;
		}
	};
});