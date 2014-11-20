define(['hbs!templates/graph','events'], function(graphTemplate,events) {
	return {
		insert : function(element,context) {
			var graphElement = $(graphTemplate());

			events.subscribe(events.messages.TRAIL_CHANGE, function(data) {
				$('.currentTrailLabel').html(data.name);
			});

			graphElement.appendTo(element);
		}
	};
});