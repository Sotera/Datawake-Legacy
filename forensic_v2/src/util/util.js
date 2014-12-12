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
		},

		/**
		 * Display a modal overlay with a loader
		 * @private
		 */
		showLoader : function() {
			var overlay = $('<div/>')
				.attr('id','ajax_loader_overlay')
				.width(window.innerWidth)
				.height(window.innerHeight)
				.addClass('ajax_loader_overlay')
				.appendTo($(document.body));

			var img = $('<img/>')
				.attr('src','./img/ajax_loader.gif')
				.addClass('ajax_loader_image')
				.appendTo(overlay);

			var imgDim = parseInt(img.css('margin-left').replace('px',''))*-2;
			img.attr('width',imgDim);
			img.attr('height',imgDim);

			$(window).resize(function() {
				overlay.width(window.innerWidth).height(winder.innerHeight);
			});
		},

		/**
		 * Hide modal loader overlay
		 * @private
		 */
		hideLoader : function() {
			$('#ajax_loader_overlay').remove();
		}
	};
});