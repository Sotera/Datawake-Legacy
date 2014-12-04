define([], function() {
	return {
		hasProperties : function(obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					return true;
				}
			}
			return false;
		},
		extend: function(dest, sources) {
			var key, i, source;
			for (i=1; i<arguments.length; i++) {
				source = arguments[i];
				for (key in source) {
					if (source.hasOwnProperty(key)) {
						dest[key] = source[key];
					}
				}
			}
			return dest;
		}
	};
});