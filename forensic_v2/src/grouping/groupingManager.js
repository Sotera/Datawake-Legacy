define([], function() {

	/**
	 * Creates a base grouping manager.   This is an abstract class.   Child classes should override the
	 * initializeHeirarchy function to create nodes/links that are aggregated for their specific implementation
	 * @constructor
	 */
	function GroupingManager() {
		this._nodes = [];
		this._links = [];

		this._aggregatedNodes = [];
		this._aggregatedLinks = [];
	}

	/**
	 * Gets/sets the original nodes in the graph without grouping
	 * @param nodes - a graph.js node array
	 * @returns {*}
	 */
	GroupingManager.prototype.nodes = function(nodes) {
		if (nodes) {
			this._nodes = nodes;
		} else {
			return this._nodes;
		}
		return this;
	};

	/**
	 * Gets/sets the original links in the graph without grouping
	 * @param links - a graph.js link array
	 * @returns {*}
	 */
	GroupingManager.prototype.links = function(links) {
		if (links) {
			this._links = links;
		} else {
			return this._links;
		}
		return this;
	};

	/**
	 * Abstract function that constructs the graph heirarchy.   Should create graph.js nodes/links and set
	 * the _aggregatedNodes and _aggregatedLinks fields in the GroupingManager.
	 */
	GroupingManager.prototype.initializeHeirarchy = function() {

	};

	/**
	 * Returns the aggregated nodes
	 * @returns {Array} of graph.js nodes
	 */
	GroupingManager.prototype.aggregatedNodes = function() {
		return this._aggregatedNodes;
	};

	/**
	 * Returns the aggregated links
	 * @returns {Array} of graph.js links
	 */
	GroupingManager.prototype.aggregatedLinks = function()  {
		return this._aggregatedLinks;
	};

	return GroupingManager;
});