define(['hbs!templates/graph','../util/events'], function(graphTemplate,events) {
	return {
		insert : function(element,context) {
			var graphElement = $(graphTemplate(context));

			events.subscribe(events.topics.TRAIL_CHANGE, function(data) {
				// TODO:  handle trail change!
			});

			graphElement.appendTo(element);
		}
	};
});