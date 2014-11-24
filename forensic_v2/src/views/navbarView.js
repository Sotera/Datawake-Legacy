define(['hbs!templates/navbar','../util/events'], function(navbarTemplate,events) {
	return {
		insert : function(element,context) {
			var navbarElement = $(navbarTemplate(context));
			var trailSearchElement = navbarElement.find('.trailSearchInput');
			var trailSelectLinks = navbarElement.find('.trailSelectLink');
			var trailSearchDropdownToggle = navbarElement.find('.trailSearchDropdown');

			// Prevent dropdown from closing on search input click
			trailSearchElement.click(function(e) {
				e.stopPropagation();
			});

			// Clear search filter on open
			trailSearchDropdownToggle.click(function() {
				trailSearchElement.val('');
				$('.trailSelectLink').each(function() {
					$(this).show();
				});
			});

			// Bind active search
			trailSearchElement.keyup(function(e) {
				var currentVal = trailSearchElement.val().toLowerCase();
				trailSelectLinks.each(function() {
					var trailName = $(this).html().toLowerCase();
					if (trailName.indexOf(currentVal) !== -1) {
						$(this).show();
					} else {
						$(this).hide();
					}
				});
			});

			trailSelectLinks.click(function() {
				var trailId = $(this).attr('trailId');
				var that = this;
				context.trails.forEach(function(trail) {
					if (trail.id === trailId) {
						events.publish(events.topics.TRAIL_CHANGE,trail);
						var trailLabel = $(that).html();
						trailSearchDropdownToggle.html(trailLabel);
					}
				});
			});

			navbarElement.find('.refreshAll').click(function() {
				events.publish(events.topics.REFRESH);
			});

			navbarElement.appendTo(element);
		}
	};
});