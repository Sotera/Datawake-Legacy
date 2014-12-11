define(['../util/guid','../util/util','../config/forensic_config'], function(guid,_, ForensicConfig) {

	/**
	 *
	 * @constructor
	 */
	var ForensicGroupingManager = function() {
		GraphJS.GroupingManager.apply(this);
		this._nodeIndexToLinks = {};
	};
	
	ForensicGroupingManager.prototype = GraphJS.Extend(ForensicGroupingManager.prototype, GraphJS.GroupingManager.prototype, {
		_removeDuplicatesFromList : function(aggregateLists) {
			var condensedList = [];
			for (var i = 0; i < aggregateLists.length; i++) {
				condensedList.push(this._removeDuplicates(aggregateLists[i]));
			}
			return condensedList;
		},

		_removeDuplicates : function(aggregate) {
			var valueMap = {};
			var that = this;
			aggregate.forEach(function(entity) {
				if (!valueMap[entity.value]) {
					valueMap[entity.value] = entity;
				} else {
					// update links to singleton
					var assocatedLinks = that._nodeIndexToLinks[entity.index];
					if (assocatedLinks) {
						assocatedLinks.forEach(function(link) {
							if (entity.index === link.source.index) {
								link.source = valueMap[entity.value];
							} else {
								link.target = valueMap[entity.value];
							}
						});
					}

				}
			});
			var condensed = [];
			for (var entityKey in valueMap) {
				if (valueMap.hasOwnProperty(entityKey)) {
					condensed.push(valueMap[entityKey]);
				}
			}
			return condensed;
		},

		_clusterByDomain : function(entityList) {
			var domainMap = {};
			entityList.forEach(function(entity) {
				var entities = domainMap[entity.domain];
				if (!entities) {
					entities = [];
				}
				entities.push(entity);
				domainMap[entity.domain] = entities;
			});
			return domainMap;
		},

		_clusterByAreaCode : function(entityList) {
			var areacodeMap = {};
			entityList.forEach(function(entity) {
				var areaCode = entity.value.substring(0,3);
				var entities = areacodeMap[areaCode];
				if (!entities) {
					entities = [];
				}
				entities.push(entity);
				areacodeMap[areaCode] = entities;
			});
			return areacodeMap;
		},

		/**
		 * Perform node aggregation for Datawake Forensic.   Group browse path by domain and entities by type
		 * @private
		 */
		_aggregateNodes: function () {
			var nodeIndexToLinks = [];
			this._links.forEach(function(link) {
				var srcIdx = link.source.index;
				var links = nodeIndexToLinks[srcIdx];
				if (!links) {
					links = [];
				}
				links.push(link);
				nodeIndexToLinks[srcIdx] = links;

				var dstIdx = link.target.index;
				links = nodeIndexToLinks[dstIdx];
				if (!links) {
					links = [];
				}
				links.push(link);
				nodeIndexToLinks[dstIdx] = links;
			});
			this._nodeIndexToLinks = nodeIndexToLinks;



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

			var groupEmails = [];
			var groupPhoneNumbers = [];
			var groupRelatedLinks = [];
			var that = this;
			browsePathAggregates.forEach(function (nodeGroup) {
				var phoneClusters = [];
				var emailClusters = [];
				var relatedLinkClusters = [];
				nodeGroup.forEach(function (groupedNode) {
					that._nodes.filter(function (node) {

						if (node.row === groupedNode.row) {
							switch (node.type) {
								case 'email':
									emailClusters.push(node);
									break;
								case 'website':
									relatedLinkClusters.push(node);
									break;
								case 'phone':
									phoneClusters.push(node);
									break;
							}

						}
					});
				});
				groupEmails.push(emailClusters);
				groupPhoneNumbers.push(phoneClusters);
				groupRelatedLinks.push(relatedLinkClusters);
			});

			groupEmails = this._removeDuplicatesFromList(groupEmails);
			groupPhoneNumbers = this._removeDuplicatesFromList(groupPhoneNumbers);
			groupRelatedLinks = this._removeDuplicatesFromList(groupRelatedLinks);


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
					labelText: browsePathAggregates[row][0].domain,
					children: browsePathAggregates[row],
					innerLabel: browsePathAggregates[row].length,
					row: row,
					col: 0
				});

				var clusteredEmails = this._clusterByDomain(groupEmails[row]);
				for (var domainKey in clusteredEmails) {
					if (clusteredEmails.hasOwnProperty(domainKey)) {
						aggregatedNodes.push({
							x: 0,
							y: 0,
							index: guid.generate(),
							fillStyle: ForensicConfig.EMAIL_ENTITY.FILL_STYLE,
							lineWidth: ForensicConfig.EMAIL_ENTITY.STROKE_WIDTH,
							type: 'email',
							strokeStyle: ForensicConfig.EMAIL_ENTITY.STROKE_STYLE,
							radius: 20,
							labelText: domainKey,
							children: clusteredEmails[domainKey],
							innerLabel: clusteredEmails[domainKey].length,
							row: row,
							col: 1
						});
					}
				}

				var clusteredPhoneNumbers = this._clusterByAreaCode(groupPhoneNumbers[row]);
				for (var areaCodeKey in clusteredPhoneNumbers) {
					if (clusteredPhoneNumbers.hasOwnProperty(areaCodeKey)) {
						aggregatedNodes.push({
							x: 0,
							y: 0,
							index: guid.generate(),
							fillStyle: ForensicConfig.PHONE_ENTITY.FILL_STYLE,
							lineWidth: ForensicConfig.PHONE_ENTITY.STROKE_WIDTH,
							type: 'phone',
							strokeStyle: ForensicConfig.PHONE_ENTITY.STROKE_STYLE,
							radius: 20,
							labelText : areaCodeKey,
							children: clusteredPhoneNumbers[areaCodeKey],
							innerLabel: clusteredPhoneNumbers[areaCodeKey].length,
							row: row,
							col: 1
						});
					}
				}

				var clusteredRelatedLinks = this._clusterByDomain(groupRelatedLinks[row]);
				for (domainKey in clusteredRelatedLinks) {
					if (clusteredRelatedLinks.hasOwnProperty(domainKey)) {
						aggregatedNodes.push({
							x: 0,
							y: 0,
							index: guid.generate(),
							fillStyle: ForensicConfig.WEBSITE_ENTITY.FILL_STYLE,
							lineWidth: ForensicConfig.WEBSITE_ENTITY.STROKE_WIDTH,
							type: 'website',
							strokeStyle: ForensicConfig.WEBSITE_ENTITY.STROKE_STYLE,
							radius: 20,
							labelText : domainKey,
							children: clusteredRelatedLinks[domainKey],
							innerLabel: clusteredRelatedLinks[domainKey].length,
							row: row,
							col: 2
						});
					}
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