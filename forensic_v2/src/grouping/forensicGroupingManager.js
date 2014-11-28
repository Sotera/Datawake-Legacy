define(['../grouping/groupingManager'], function(GroupingManager) {

	/**
	 *
	 * @constructor
	 */
	function ForensicGroupingManager() {
		GroupingManager.apply(this);
	}
	$.extend(ForensicGroupingManager.prototype, GroupingManager.prototype);

	ForensicGroupingManager.prototype.aggregateNodes = function() {
		// aggregate the browse path
		var lastAggregatedDomain = '';
		var browsePathAggregates = [];
		var browsePathNodes = this._nodes.filter(function(node) {
			return node.type === 'browse_path';
		});

		// Group nodes in the browse path that have the same top level domain
		browsePathNodes.forEach(function(node) {
			if (node.domain !== lastAggregatedDomain) {
				browsePathAggregates.push([node]);
				lastAggregatedDomain = node.domain;
			} else {
				browsePathAggregates[browsePathAggregates.length-1].push(node);
			}
		});

		var aggregatedEmails = [];
		var aggregatedPhoneNumbers = [];
		var aggregatedRelatedLinks = [];
		var that = this;
		browsePathAggregates.forEach(function(nodeGroup) {
			var nodeGroupPhoneNumbers = [];
			var nodeGroupEmails = [];
			var nodeGroupRelatedLinks = [];
			nodeGroup.forEach(function(groupedNode) {
				that._nodes.filter(function(node) {
					if (node.row === groupedNode.row) {
						switch (node.type) {
							case 'email':
								nodeGroupEmails.push(node);
								break;
							case 'website':
								nodeGroupRelatedLinks.push(node);
								break;
							case 'phone':
								nodeGroupPhoneNumbers.push(node);
								break;
						}

					}
				});
			});
			aggregatedEmails.push(nodeGroupEmails);
			aggregatedPhoneNumbers.push(nodeGroupPhoneNumbers);
			aggregatedRelatedLinks.push(nodeGroupRelatedLinks);
		});

		var aggregatedNodes = [];
		var idx = 0;
		for (var row = 0; row < browsePathAggregates.length; row++) {
			aggregatedNodes.push({
				x : 0,
				y : 0,
				index : idx++,
				fillStyle : '#ff0000',
				type : 'browse_path',
				strokeStyle : '#232323',
				radius : 20,
				label : browsePathAggregates[0].domain,
				children : browsePathAggregates[row],
				innerLabel : browsePathAggregates[row].length,
				row : row,
				col : 0
			});

			if (aggregatedEmails[row].length>0) {
				aggregatedNodes.push({
					x: 0,
					y: 0,
					index: idx++,
					fillStyle: '#00ff00',
					strokeSize: 2,
					type: 'email',
					strokeStyle: '#232323',
					radius: 20,
					children: aggregatedEmails[row],
					innerLabel: aggregatedEmails[row].length,
					row: row,
					col: 1
				});
			}

			if (aggregatedPhoneNumbers[row].length > 0) {
				aggregatedNodes.push({
					x: 0,
					y: 0,
					index: idx++,
					fillStyle: '#0000ff',
					strokeSize: 2,
					type: 'phone',
					strokeStyle: '#232323',
					radius: 20,
					children: aggregatedPhoneNumbers[row],
					innerLabel: aggregatedPhoneNumbers[row].length,
					row: row,
					col: 1
				});
			}

			if (aggregatedRelatedLinks[row].length > 0) {
				aggregatedNodes.push({
					x: 0,
					y: 0,
					index: idx++,
					fillStyle: '#ff0000',
					strokeSize: 2,
					type: 'phone',
					strokeStyle: '#232323',
					radius: 20,
					children: aggregatedRelatedLinks[row],
					innerLabel: aggregatedRelatedLinks[row].length,
					row: row,
					col: 2
				});
			}
		}
		this._aggregatedNodes = aggregatedNodes;
	};

	ForensicGroupingManager.prototype.aggregateLinks = function() {
		var nodeIndexToAggreagateNode = {};
		this._aggregatedNodes.forEach(function(aggregate) {
			if (aggregate.children) {
				aggregate.children.forEach(function(node) {
					nodeIndexToAggreagateNode[node.index] = aggregate;
				});
			}
		});

		var areAggregatesLinked = {};
		var aggregatedLinks = [];
		this._links.forEach(function(link) {
			var sourceAggregate = nodeIndexToAggreagateNode[link.source.index];
			var targetAggregate = nodeIndexToAggreagateNode[link.target.index];
			var key = sourceAggregate.index + ',' + targetAggregate.index;
			if (!areAggregatesLinked[key]) {
				var aggregatedLink = {
					source : sourceAggregate,
					target : targetAggregate
				};
				aggregatedLinks.push(aggregatedLink);
				areAggregatesLinked[key] = true;
			}
		});
		this._aggregatedLinks = aggregatedLinks;
	};

	/**
	 *
	 */
	ForensicGroupingManager.prototype.initializeHeirarchy = function() {
		this.aggregateNodes();
		this.aggregateLinks();
	};

	return ForensicGroupingManager;
});