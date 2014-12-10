define(['../util/guid','../util/util','../config/forensic_config'], function(guid,_, ForensicConfig) {

	/**
	 *
	 * @constructor
	 */
	var ForensicGroupingManager = function() {
		GraphJS.GroupingManager.apply(this);
	};
	
	ForensicGroupingManager.prototype = GraphJS.Extend(ForensicGroupingManager.prototype, GraphJS.GroupingManager.prototype, {
		/**
		 * Perform node aggregation for Datawake Forensic.   Group browse path by domain and entities by type
		 * @private
		 */
		_aggregateNodes: function () {
			// aggregate the browse path
			var lastAggregatedDomain = '';
			var browsePathAggregates = [];
			var browsePathNodes = this._nodes.filter(function (node) {
				return node.type === 'browse_path';
			});

			// Group nodes in the browse path that have the same top level domain
			browsePathNodes.forEach(function (node) {
				if (node.domain !== lastAggregatedDomain) {
					browsePathAggregates.push([node]);
					lastAggregatedDomain = node.domain;
				} else {
					browsePathAggregates[browsePathAggregates.length - 1].push(node);
				}
			});

			var aggregatedEmails = [];
			var aggregatedPhoneNumbers = [];
			var aggregatedRelatedLinks = [];
			var that = this;
			browsePathAggregates.forEach(function (nodeGroup) {
				var nodeGroupPhoneNumbers = [];
				var nodeGroupEmails = [];
				var nodeGroupRelatedLinks = [];
				nodeGroup.forEach(function (groupedNode) {
					that._nodes.filter(function (node) {
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
			for (var row = 0; row < browsePathAggregates.length; row++) {
				aggregatedNodes.push({
					x: 0,
					y: 0,
					index: guid.generate(),
					fillStyle: ForensicConfig.BROWSE_PATH_ENTITY.FILL_STYLE,
					type: 'browse_path',
					strokeStyle: ForensicConfig.BROWSE_PATH_ENTITY.STROKE_STYLE,
					lineWidth : ForensicConfig.BROWSE_PATH_ENTITY.STROKE_WIDTH,
					radius: 20,
					label: browsePathAggregates[0].domain,
					children: browsePathAggregates[row],
					innerLabel: browsePathAggregates[row].length,
					row: row,
					col: 0
				});

				if (aggregatedEmails[row].length > 0) {
					aggregatedNodes.push({
						x: 0,
						y: 0,
						index: guid.generate(),
						fillStyle: ForensicConfig.EMAIL_ENTITY.FILL_STYLE,
						lineWidth: ForensicConfig.EMAIL_ENTITY.STROKE_WIDTH,
						type: 'email',
						strokeStyle: ForensicConfig.EMAIL_ENTITY.STROKE_STYLE,
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
						index: guid.generate(),
						fillStyle: ForensicConfig.PHONE_ENTITY.FILL_STYLE,
						lineWidth: ForensicConfig.PHONE_ENTITY.STROKE_WIDTH,
						type: 'phone',
						strokeStyle: ForensicConfig.PHONE_ENTITY.STROKE_STYLE,
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
						index: guid.generate(),
						fillStyle: ForensicConfig.WEBSITE_ENTITY.FILL_STYLE,
						lineWidth: ForensicConfig.WEBSITE_ENTITY.STROKE_WIDTH,
						type: 'website',
						strokeStyle: ForensicConfig.WEBSITE_ENTITY.STROKE_STYLE,
						radius: 20,
						children: aggregatedRelatedLinks[row],
						innerLabel: aggregatedRelatedLinks[row].length,
						row: row,
						col: 2
					});
				}
			}
			this._aggregatedNodes = aggregatedNodes;
		},

		/**
		 * Aggregate link specialization for Forensic.   Make sure we draw arrows between browse path nodes.
		 * @param sourceAggregate
		 * @param targetAggregate
		 * @returns {{source: *, target: *}}
		 * @private
		 */
		_createAggregateLink : function (sourceAggregate, targetAggregate, originalLinks) {
			if (sourceAggregate.index === targetAggregate.index) {
				return;
			}
			var link = {
				source: sourceAggregate,
				target: targetAggregate
			};
			if (sourceAggregate.type === 'browse_path' && targetAggregate.type === 'browse_path') {
				link.type = ForensicConfig.BROWSE_PATH_LINK.LINE_TYPE;
				link.lineWidth = ForensicConfig.BROWSE_PATH_LINK.LINE_WIDTH;
			} else {
				link.type = ForensicConfig.ENTITY_LINK.LINE_TYPE;
				link.lineWidth = ForensicConfig.ENTITY_LINK.LINE_WIDTH;
			}
			return link;
		},


		/**
		 * Ensure position/row/col are all set correctly for children when ungrouping
		 * @param aggregate
		 * @private
		 */
		_updateChildren : function (aggregate) {
			// Set all childrens position to that of their parent
			aggregate.children.forEach(function (child) {
				child.x = aggregate.x;
				child.y = aggregate.y;
				child.row = aggregate.row;
			});
		}
	});
	return ForensicGroupingManager;
});