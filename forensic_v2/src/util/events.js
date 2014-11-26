define([], function() {
	var topics = {};
	return {
		subscribe: function(topic, listener, self) {
			// Create the topic's object if not yet created
			if(!topics[topic]) {
				topics[topic] = { queue: [] };
			}

			// Add the listener to queue
			var index = topics[topic].queue.push({
					func : listener,
					self : self
				}) -1;

			// Provide handle back for removal of topic
			return {
				remove: function() {
					delete topics[topic].queue[index];
				}
			};
		},
		publish: function(topic, info) {
			// If the topic doesn't exist, or there's no listeners in queue, just leave
			if(!topics[topic] || !topics[topic].queue.length) {
				return;
			}

			// Cycle through topics queue, fire!
			var items = topics[topic].queue;
			items.forEach(function(item) {
				if (item.self) {
					item.func.call(item.self, info || {});
				} else {
					item(info || {});
				}
			});
		},
		topics: {
			'TRAIL_CHANGE' : 'trail_change',
			'REFRESH' : 'refresh'
		}
	};
});