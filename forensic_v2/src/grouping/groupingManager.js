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

		this._ungroupedAggregates = {};
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
	 * Initializes the node/link aggregation
	 */
	GroupingManager.prototype.initializeHeirarchy = function() {
		this._aggregateNodes();
		this._aggregateLinks();
	};

	/**
	 * Creates an aggregated link in graph.js format.   Can be overriden by specific implementations to allow
	 * to allow for diferent link types based on aggregate contents
	 * @param sourceAggregate - the source aggregate node
	 * @param targetAggregate - the target aggregate node
	 * @returns {{source: *, target: *}} - a graph.js link
	 * @private
	 */
	GroupingManager.prototype._createAggregateLink = function(sourceAggregate,targetAggregate) {
		return {
			source : sourceAggregate,
			target : targetAggregate
		};
	};

	/**
	 * Performs link aggregate based on a set of aggregated nodes and a full set of links
	 * @private
	 */
	GroupingManager.prototype._aggregateLinks = function() {
		var nodeIndexToAggreagateNode = {};
		this._aggregatedNodes.forEach(function(aggregate) {
			if (aggregate.children) {
				aggregate.children.forEach(function(node) {
					nodeIndexToAggreagateNode[node.index] = aggregate;
				});
			} else {
				nodeIndexToAggreagateNode[aggregate.index] = aggregate;
			}
		});

		var areAggregatesLinked = {};
		var aggregatedLinks = [];
		var that = this;
		this._links.forEach(function(link) {
			var sourceAggregate = nodeIndexToAggreagateNode[link.source.index];
			var targetAggregate = nodeIndexToAggreagateNode[link.target.index];
			if (sourceAggregate.index === targetAggregate.index) {
				return;
			}
			var key = sourceAggregate.index + ',' + targetAggregate.index;
			if (!areAggregatesLinked[key]) {
				var aggregatedLink = that._createAggregateLink(sourceAggregate,targetAggregate);
				aggregatedLinks.push(aggregatedLink);
				areAggregatesLinked[key] = true;
			}
		});
		this._aggregatedLinks = aggregatedLinks;
	};


	/**
	 * Perform node aggregation.   Must be overriden by implementors
	 * @private
	 */
	GroupingManager.prototype._aggregateNodes = function() {

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


	/**
	 * Do any updates on children before layout  (ie/ set position, row/col info, etc).   Should be defined
	 * in implementing class
	 * @param aggregate
	 * @private
	 */
	GroupingManager.prototype._updateChildren = function(aggregate) {

	};

	/**
	 * Ungroup an aggregate node
	 * @param node
	 */
	GroupingManager.prototype.ungroup = function(node) {
		if (node.children) {

			var parentKey = '';
			node.children.forEach(function(node) {
				parentKey += node.index + ',';
			});

			this._ungroupedAggregates[parentKey] = node;

			var index = -1;
			for (var i = 0; i < this._aggregatedNodes.length && index === -1; i++) {
				if (this._aggregatedNodes[i].index === node.index) {
					index = i;
				}
			}

			this._updateChildren(node);

			var first = this._aggregatedNodes.slice(0,index);
			var middle = node.children;
			var end = this._aggregatedNodes.slice(index+1);

			this._aggregatedNodes = first.concat(middle).concat(end);

			// Recompute aggregated links
			this._aggregateLinks();
		}
	};

	return GroupingManager;
});