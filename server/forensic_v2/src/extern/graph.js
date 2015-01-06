!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GraphJS=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Layout = _dereq_('./layout');

var ColumnLayout = function() {
	Layout.apply(this);
};

ColumnLayout.prototype = _.extend(ColumnLayout.prototype, Layout.prototype, {

	/**
	 * A column layout
	 * @param w - width of canvas
	 * @param h - height of canvas
	 */
	layout : function (w, h) {
		var x = 0;
		var y = 0;
		var maxRadiusCol = 0;
		var that = this;
		this._nodes.forEach(function (node) {

			if (y === 0) {
				y += node.radius;
			}
			if (x === 0) {
				x += node.radius;
			}

			that._setNodePositionImmediate(node, x, y);

			maxRadiusCol = Math.max(maxRadiusCol, node.radius);

			y += node.radius + 40;
			if (y > h) {
				y = 0;
				x += maxRadiusCol + 40;
				maxRadiusCol = 0;
			}
		});
	}
});

module.exports = ColumnLayout;

},{"./layout":3,"./util":7}],2:[function(_dereq_,module,exports){
var _ = _dereq_('./util');

/**
 * Creates a base grouping manager.   This is an abstract class.   Child classes should override the
 * initializeHeirarchy function to create nodes/links that are aggregated for their specific implementation
 * @constructor
 */
var GroupingManager = function(attributes) {
	this._initialize();
	_.extend(this,attributes);
};

GroupingManager.prototype = _.extend(GroupingManager.prototype, {
	_initialize : function() {
		this._nodes = [];
		this._links = [];

		this._aggregatedNodes = [];
		this._aggregatedLinks = [];
		this._aggregateNodeMap = {};

		this._ungroupedAggregates = {};
		this._ungroupedNodeGroups = {};
	},

	clear : function() {
		this._initialize();
	},

	/**
	 * Gets/sets the original nodes in the graph without grouping
	 * @param nodes - a graph.js node array
	 * @returns {*}
	 */
	nodes : function(nodes) {
		if (nodes) {
			this._nodes = nodes;
		} else {
			return this._nodes;
		}
		return this;
	},

	/**
	 * Gets/sets the original links in the graph without grouping
	 * @param links - a graph.js link array
	 * @returns {*}
	 */
	links : function(links) {
		if (links) {
			this._links = links;
		} else {
			return this._links;
		}
		return this;
	},

	/**
	 * Initializes the node/link aggregation
	 */
	initializeHeirarchy : function() {

		this._ungroupedAggregates = {};
		this._ungroupedNodeGroups = {};

		this._aggregateNodes();
		this._aggregateLinks();

		var setParentPointers = function(node,parent) {
			if (node.children) {
				node.children.forEach(function(child) {
					setParentPointers(child,node);
				});
			}
			node.parentNode = parent;
		};

		this._aggregatedNodes.forEach(function(node) {
			setParentPointers(node,null);
		});

		if (this.onAggregationComplete) {
			this.onAggregationComplete();
		}
	},

	/**
	 * Creates an aggregated link in graph.js format.   Can be overriden by specific implementations to allow
	 * to allow for diferent link types based on aggregate contents
	 * @param sourceAggregate - the source aggregate node
	 * @param targetAggregate - the target aggregate node
	 * @returns {{source: *, target: *}} - a graph.js link
	 * @private
	 */
	_createAggregateLink : function(sourceAggregate,targetAggregate,originalLinks) {
		return {
			source : sourceAggregate,
			target : targetAggregate
		};
	},

	/**
	 * Performs link aggregate based on a set of aggregated nodes and a full set of links
	 * @private
	 */
	_aggregateLinks : function() {
		var nodeIndexToAggreagateNode = {};
		var that = this;
		this._aggregatedNodes.forEach(function(aggregate) {
			if (aggregate.children) {
				aggregate.children.forEach(function(node) {
					nodeIndexToAggreagateNode[node.index] = aggregate;
				});
			} else {
				nodeIndexToAggreagateNode[aggregate.index] = aggregate;
			}
			that._aggregateNodeMap[aggregate.index] = aggregate;
		});


		var aggregatedLinks = [];

		var aggregateLinkMap = {};

		this._links.forEach(function(link) {
			var sourceAggregate = nodeIndexToAggreagateNode[link.source.index];
			var targetAggregate = nodeIndexToAggreagateNode[link.target.index];

			var sourceMap = aggregateLinkMap[sourceAggregate.index];
			if (!sourceMap) {
				sourceMap = {};
			}
			var sourceToTargetLinks = sourceMap[targetAggregate.index];
			if (!sourceToTargetLinks) {
				sourceToTargetLinks = [];
			}
			sourceToTargetLinks.push(link);
			sourceMap[targetAggregate.index] = sourceToTargetLinks;

			aggregateLinkMap[sourceAggregate.index] = sourceMap;
		});

		// Get min/max link counts for all aggregate pairs
		var minCount = Number.MAX_VALUE;
		var maxCount = 0;
		for (var sourceAggregateId in aggregateLinkMap) {
			if (aggregateLinkMap.hasOwnProperty(sourceAggregateId)) {
				for (var targetAggregateId in aggregateLinkMap[sourceAggregateId]) {
					if (aggregateLinkMap[sourceAggregateId].hasOwnProperty(targetAggregateId)) {
						var source = that._aggregateNodeMap[sourceAggregateId];
						var target = that._aggregateNodeMap[targetAggregateId];
						var originalLinks = aggregateLinkMap[sourceAggregateId][targetAggregateId];
						minCount = Math.min(minCount,originalLinks.length);
						maxCount = Math.max(maxCount,originalLinks.length);
					}
				}
			}
		}

		for (var sourceAggregateId in aggregateLinkMap) {
			if (aggregateLinkMap.hasOwnProperty(sourceAggregateId)) {
				for (var targetAggregateId in aggregateLinkMap[sourceAggregateId]) {
					if (aggregateLinkMap[sourceAggregateId].hasOwnProperty(targetAggregateId)) {
						var source = that._aggregateNodeMap[sourceAggregateId];
						var target = that._aggregateNodeMap[targetAggregateId];
						var originalLinks = aggregateLinkMap[sourceAggregateId][targetAggregateId];
						var link = that._createAggregateLink(source, target, originalLinks, minCount, maxCount);
						if (link) {
							aggregatedLinks.push(link);
						}
					}
				}
			}
		}

		this._aggregatedLinks = aggregatedLinks;
	},


	/**
	 * Perform node aggregation.   Must be overriden by implementors
	 * @private
	 */
	_aggregateNodes : function() {

	},

	/**
	 * Returns the aggregated nodes
	 * @returns {Array} of graph.js nodes
	 */
	aggregatedNodes : function() {
		return this._aggregatedNodes;
	},

	/**
	 * Returns the aggregated links
	 * @returns {Array} of graph.js links
	 */
	aggregatedLinks : function()  {
		return this._aggregatedLinks;
	},

	remove : function(node) {
		var index = -1;
		for (var i = 0; i < this._aggregatedNodes.length && index === -1; i++) {
			if (this._aggregatedNodes[i].index === node.index) {
				index = i;
			}
		}
		if (index !== -1) {
			this._aggregatedNodes.splice(index,1);
		}
	},


	/**
	 * Do any updates on children before layout  (ie/ set position, row/col info, etc).   Should be defined
	 * in implementing class
	 * @param aggregate
	 * @private
	 */
	_updateChildren : function(aggregate) {
		// set childrens position initially to the position of the aggregate
		aggregate.children.forEach(function(child) {
			child.x = aggregate.x;
			child.y = aggregate.y;
		});
	},

	/**
	 * Ungroup an aggregate node
	 * @param node
	 */
	ungroup : function(node) {
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
			this._ungroupedNodeGroups[parentKey] = node.children;
			var end = this._aggregatedNodes.slice(index+1);

			this._aggregatedNodes = first.concat(middle).concat(end);

			// Recompute aggregated links
			this._aggregateLinks();
		}
	},
	getAggregate : function(aggregateKey) {
		return this._ungroupedAggregates[aggregateKey];
	},

	regroup : function(aggregateKey,atIndex) {
		var aggregateNode = this._ungroupedAggregates[aggregateKey];
		var nodesToRemove = aggregateNode.children;
		var that = this;
		nodesToRemove.forEach(function(node) {
			that.remove(node);
		});
		var start = this._aggregatedNodes.slice(0,atIndex);
		var end = this._aggregatedNodes.slice(atIndex);
		this._aggregatedNodes = start.concat(aggregateNode).concat(end);
		this._aggregateLinks();
		delete this._ungroupedAggregates[aggregateKey];
		delete this._ungroupedNodeGroups[aggregateKey];
		return aggregateNode;
	},

	/**
	 * Returns an array of node groups that are expanded
	 * @returns {Array}
	 */
	getUngroupedNodes : function() {
		var info = [];
		var that = this;
		Object.keys(this._ungroupedNodeGroups).forEach(function(key) {
			var nodes = that._ungroupedNodeGroups[key];
			var nodeIndices = nodes.map(function(node) {
				return node.index;
			});
			info.push({
				indices : nodeIndices,
				key : key
			});
		});
		return info;
	},

	getUngroupedNodesForKey : function(key) {
		return this._ungroupedNodeGroups[key];
	},

	getMinimizeIconPosition : function(boundingBox,ungroupedNodes) {
		return {
			x : boundingBox.x + boundingBox.width + 10,
			y : boundingBox.y
		};
	}
});


module.exports = GroupingManager;

},{"./util":7}],3:[function(_dereq_,module,exports){
var _ = _dereq_('./util');

/**
 * Layout constructor
 * @constructor
 */
var Layout = function(attributes) {
	this._nodes = null;
	this._linkMap = null;
	this._nodeMap = null;
	this._labelMap = null;
	this._duration = 250;
	this._easing = 'ease-in-out';
	this._zoomScale = 1.0;
	this._eventsSuspended = false;
	_.extend(this,attributes);
};

Layout.prototype = _.extend(Layout.prototype, {

	/**
	 * Gets/sets the duration of the layout animation
	 * @param duration - the duration of the layout animation in milliseconds.  (default = 250ms)
	 * @returns {Layout} if duration param is defined, {Layout._duration} otherwise
	 */
	duration : function(duration) {
		if (duration) {
			this._duration = duration;
		} else {
			return this._duration;
		}
		return this;
	},

	/**
	 * Gets/sets the easing of the layout animation
	 * @param easing - the easing of the layout animation in milliseconds.  (default = 'ease-in-out')
	 * @returns {Layout} if easing param is defined, {Layout._easing} otherwise
	 */
	easing : function(easing) {
		if (easing) {
			this._easing = easing;
		}	 else {
			return this._easing;
		}
		return this;
	},

	/**
	 * Gets/sets the nodes of the layout.   Set from the graph
	 * @param nodes - the set of nodes defined in the corresponding graph
	 * @returns {Layout} if nodes param is defined, {Layout._nodes} otherwise
	 */
	nodes : function(nodes) {
		if (nodes) {
			this._isUpdate = nodes ? true : false;
			this._nodes = nodes;
		} else {
			return this._nodes;
		}
		return this;
	},

	/**
	 * Gets/sets the link map of the layout.   Set from the graph
	 * @param linkMap - a map from node index to a set of lines (path objects) that contain that node
	 * @returns {Layout} if linkMap param is defined, {Layout._linkMap} otherwise
	 */
	linkMap : function(linkMap) {
		if (linkMap) {
			this._linkMap = linkMap;
		} else {
			return this._linkMap;
		}
		return this;
	},

	/**
	 * Gets/sets the node map of the layout.   Set from the graph
	 * @param nodeMap - a map from node index to a circle (path object)
	 * @returns {Layout} if nodeMap param is defined, {Layout._nodeMap} otherwise
	 */
	nodeMap : function(nodeMap) {
		if (nodeMap) {
			this._nodeMap = nodeMap;
		} else {
			return this._nodeMap;
		}
		return this;
	},

	/**
	 * Gets/sets the label of the layout.   Set from the graph
	 * @param labelMap - a map from node index to a text object (path object)
	 * @returns {Layout} if labelMap param is defined, {Layout._labelMap} otherwise
	 */
	labelMap : function(labelMap) {
		if (labelMap) {
			this._labelMap = labelMap;
		} else {
			return this._labelMap;
		}
		return this;
	},

	/**
	 * Returns a bounding box for an array of node indices
	 * @param nodeOrIndexArray - array of node indicies or node array itself
	 * @param padding - padding in pixels applied to bounding box
	 * @returns {{min: {x: Number, y: Number}, max: {x: number, y: number}}}
	 */
	getBoundingBox : function(nodeOrIndexArray,padding) {
		if (!nodeOrIndexArray || !nodeOrIndexArray.length || nodeOrIndexArray.length === 0 || Object.keys(this._nodeMap).length === 0) {
			return {
				x : 0,
				y : 0,
				width : 1,
				height : 1
			};
		}


		var min = {
			x : Number.MAX_VALUE,
			y : Number.MAX_VALUE
		};
		var max = {
			x : -Number.MAX_VALUE,
			y : -Number.MAX_VALUE
		};

		var bbPadding = padding || 0;

		var that = this;
		nodeOrIndexArray.forEach(function(nodeOrIndex) {
			var idx = nodeOrIndex instanceof Object ? nodeOrIndex.index : nodeOrIndex;
			var circle = that._nodeMap[idx];
			min.x = Math.min(min.x, (circle.finalX || circle.x) - (circle.radius + bbPadding));
			min.y = Math.min(min.y, (circle.finalY || circle.y) - (circle.radius + bbPadding));
			max.x = Math.max(max.x, (circle.finalX || circle.x) + (circle.radius + bbPadding));
			max.y = Math.max(max.y, (circle.finalY || circle.y) + (circle.radius + bbPadding));
		});
		return {
			x : min.x,
			y : min.y,
			width : (max.x - min.x),
			height : (max.y - min.y)
		};
	},

	_applyZoomScale : function(bApply) {
		this._applyZoom = bApply;
		return this;
	},

	/**
	 * Sets the position of a node and all attached links and labels without animation
	 * @param node - the node object being positioned
	 * @param x - the new x position for the node
	 * @param y - the new y position for the node
	 * @private
	 */
	_setNodePositionImmediate : function(node,x,y,callback) {
		this._setNodePosition(node,x,y,true);
		if (callback) {
			callback();
		}
	},

	/**
	 * Sets the position of a node by animating from it's old position to it's new one
	 * @param node - the node being repositioned
	 * @param x - the new x position of the node
	 * @param y - the new y position of the node
	 * @param bImmediate - if true, sets without animation.
	 * @private
	 */
	_setNodePosition : function(node,newX,newY,bImmediate,callback) {
		var x = newX * (this._applyZoom ? this._zoomScale : 1);
		var y = newY * (this._applyZoom ? this._zoomScale : 1);


		// Update the node render object
		var circle = this._nodeMap[node.index];
		if (bImmediate!==true) {
			circle.tweenAttr({
				x: x,
				y: y
			}, {
				duration: this._duration,
				easing: this._easing,
				callback : function() {
					delete circle.finalX;
					delete circle.finalY;
					node.x = x;
					node.y = y;
					if (callback) {
						callback();
					}
				}
			});
			circle.finalX = x;
			circle.finalY = y;
		} else {
			circle.x = x;
			circle.y = y;
		}
		if (this._linkMap[node.index].length === 0) {
			node.x = x;
			node.y = y;
			circle.x = x;
			circle.y = y;
		}

		// Update the label render object
		var label = this._labelMap[node.index];
		if (label) {
			var labelPos = this.layoutLabel(circle);
			if (bImmediate!==true) {
				label.tweenAttr(labelPos, {
					duration: this._duration,
					easing: this._easing
				});
			} else {
				for (var prop in labelPos) {
					if (labelPos.hasOwnProperty(prop)) {
						label[prop] = labelPos[prop];
					}
				}
			}
		}


		// Update the link render object
		var that = this;
		this._linkMap[node.index].forEach(function(link) {
			var linkObjKey = null;
			if (link.source.index === node.index) {
				linkObjKey = 'source';
			} else {
				linkObjKey = 'target';
			}
			if (bImmediate!==true) {
				link.tweenObj(linkObjKey, {
					x: x,
					y: y
				}, {
					duration: that._duration,
					easing: that._easing
				});
			} else {
				link[linkObjKey].x = x;
				link[linkObjKey].y = y;
			}
		});
	},

	/**
	 * Layout handler.   Calls implementing layout routine and provides a callback if it's async
	 * @param w - the width of the canvas being rendered to
	 * @param h - the height of the canvas being rendered to
	 * @returns {Layout}
	 */
	layout : function(w,h,callback) {
		var that = this;
		function onComplete() {
			that._eventsSuspended = false;
			if (callback) {
				callback();
			}
		}

		this._eventsSuspended = true;
		var isAsync = !this._performLayout(w,h);
		if (isAsync) {
			setTimeout(onComplete,this.duration());
		} else {
			onComplete();
		}
		return this;
	},

	/**
	 * Default layout that does nothing.   Should be overriden
	 * @param w
	 * @param h
	 * @private
	 */
	_performLayout : function(w,h) {

	},


	/**
	 * 	/**
	 * Hook for doing any drawing before rendering of the graph that is layout specific
	 * ie/ Backgrounds, etc
	 * @param w - the width of the canvas
	 * @param h - the height of the canvas
	 * @returns {Array} - a list of path.js render objects to be added to the scene
	 */
	prerender : function(w,h) {
		return [];
	},

	/**
	 * Hook for doing any drawing after rendering of the graph that is layout specific
	 * ie/ Overlays, etc
	 * @param w - the width of the canvas
	 * @param h - the height of the canvas
	 * @returns {Array} - a list of path.js render objects to be added to the scene
	 */
	postrender : function(w,h) {
		return [];
	},

	/**
	 * Sets the label position for a node
	 * @param nodeX - the x position of the node
	 * @param nodeY - the y position of the node
	 * @param radius - the radius of the node
	 * @returns {{x: x position of the label, y: y position of the label}}
	 */
	layoutLabel : function(node) {
		return {
			x: node.x + node.radius + 5,
			y: node.y + node.radius + 5
		};
	}
});



module.exports = Layout;

},{"./util":7}],4:[function(_dereq_,module,exports){
var LINK_TYPE = {
	DEFAULT : 'line',
	LINE : 'line',
	ARROW : 'arrow',
	ARC : 'arc'
};
module.exports = LINK_TYPE;
},{}],5:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var LINK_TYPE = _dereq_('./linkType');
var Layout = _dereq_('./layout');

var REGROUND_BB_PADDING = 0;

/**
 * Creates a Graph render object
 * @constructor
 */
var Graph = function(attributes) {
	this._nodes = [];
	this._links = [];
	this._canvas = null;
	this._layouter = null;
	this._groupingManager = null;
	this._width = 0;
	this._height = 0;
	this._zoomScale = 1.0;
	this._zoomLevel = 0;
	this._scene = null;
	this._showAllLabels = false;
	this._prerenderGroup = null;
	this._postrenderGroup = null;
	this._pannable = null;
	this._zoomable = null;
	this._draggable = null;
	this._currentOverNode = null;
	this._currentMoveState = null;
	this._invertedPan = 1;

	this._fontSize = null;
	this._fontFamily = null;
	this._fontColor = null;
	this._fontStroke = null;
	this._fontStrokeWidth = null;
	this._shadowColor = null;
	this._shadowOffsetX = null;
	this._shadowOffsetY = null;
	this._shadowBlur = null;

	// Data to render object maps
	this._nodeIndexToLinkLine = {};
	this._nodeIndexToCircle = {};
	this._nodeIndexToLabel = {};

	_.extend(this,attributes);
};

Graph.prototype = _.extend(Graph.prototype, {
	/**
	 * Gets/sets the nodes for the graph
	 * @param nodes - an array of nodes
	 * {
	 * 		x : the x coordinate of the node	(required)
	 * 		y : the y coordinate of the node	(required)
	 *		index :  a unique index				(required)
	 *		label : a label for the node		(optional)
	 *		fillStyle : a canvas fill   		(optional, default #000000)
	 *		strokeStyle : a canvas stroke		(optional, default undefined)
	 *		lineWidth : width of the stroke		(optional, default 1)
	 * @returns {Graph} if nodes parameter is defined, {Graph._nodes} otherwise
	 */
	nodes : function(nodes) {
		if (nodes) {
			this._nodes = nodes;

			this._nodeIndexToLinkLine = {};
			this._nodeIndexToCircle = {};
			this._nodeIndexToLabel = {};
			var that = this;
			nodes.forEach(function(node) {
				that._nodeIndexToLinkLine[node.index] = [];});
			if (this._layouter) {
				this._layouter.nodes(nodes);
			}

		} else {
			return this._nodes;
		}
		return this;
	},

	nodeWithIndex : function(nodeIndex) {
		return this._nodeIndexToCircle[nodeIndex];
	},

	labelWithIndex : function(nodeIndex) {
		return this._nodeIndexToLabel[nodeIndex];
	},

	updateNode : function(nodeIndex,props) {
		// TODO:  remove mucking with position settings from props?
		if (nodeIndex) {
			var circle = this._nodeIndexToCircle[nodeIndex];
			circle = _.extend(circle,props);
			this._nodeIndexToCircle[nodeIndex] = circle;
			this.update();
		}
	},

	updateLabel : function(nodeIndex,props) {
		// TODO:  remove mucking with position settings from props?
		if (nodeIndex) {
			var text = this._nodeIndexToLabel[nodeIndex];
			text = _.extend(text,props);
			this._nodeIndexToLabel[nodeIndex] = text;
		}
		this.update();
	},

	/**
	 * Gets/sets the nodes for the graph
	 * @param links - an array of links
	 * {
	 * 		source : a node object corresponding to the source 	(required)
	 * 		target : a node object corresponding to the target	(required)
	 *		strokeStyle : a canvas stroke						(optional, default #000000)
	 *		lineWidth : the width of the stroke					(optinal, default 1)
	 * @returns {Graph} if links parameter is defined, {Graph._links} otherwise
	 */
	links : function(links) {
		if (links) {
			this._links = links;
		} else {
			return this._links;
		}
		return this;
	},

	/**
	 * Gets the links between two nodes
	 * @param sourceNodeIndex - Index of source node, if null, return all links going to target
	 * @param targetNodeIndex - Index of target node, if null, return all links starting from source
	 */
	linkObjectsBetween : function(sourceNodeIndex,targetNodeIndex) {
		function isProvided(param) {
			if (param === undefined || param === null) {
				return false;
			} else {
				return true;
			}
		}

		if (isProvided(sourceNodeIndex) && !isProvided(targetNodeIndex)) {
			var allSource = this._nodeIndexToLinkLine[sourceNodeIndex];
			var justSource = allSource.filter(function(link) {
				return link.source.index === sourceNodeIndex;
			});
			return justSource;
		} else if (!isProvided(sourceNodeIndex) && isProvided(targetNodeIndex)) {
			var allTarget = this._nodeIndexToLinkLine[targetNodeIndex];
			var justTarget = allTarget.filter(function(link) {
				return link.target.index === targetNodeIndex;
			});
			return justTarget;
		} else if (isProvided(sourceNodeIndex) && isProvided(targetNodeIndex)) {
			var sourceLinks = this.linkObjectsBetween(sourceNodeIndex,null);
			var toTarget = sourceLinks.filter(function(link) {
				return link.target.index === targetNodeIndex;
			});
			return toTarget;
		} else {
			return [];
		}
	},

	/**
	 * Gets/sets the canvas for the graph
	 * @param canvas - an HTML canvas object
	 * @returns {Graph} if canvas parameter is defined, the canvas otherwise
	 */
	canvas : function(canvas) {
		if (canvas) {
			this._canvas = canvas;

			var x,y;
			var that = this;
			$(this._canvas).on('mousedown',function(e) {
				x = e.clientX;
				y = e.clientY;
				$(that._canvas).on('mousemove',function(e) {
					var dx = x - e.clientX;
					var dy = y - e.clientY;
					if (that._draggable && that._currentOverNode && (that._currentMoveState === null || that._currentMoveState === 'dragging'))  {
						that._currentMoveState = 'dragging';

						// Move the node
						that._layouter._setNodePositionImmediate(that._currentOverNode, that._currentOverNode.x - dx, that._currentOverNode.y - dy);
						that.update();
					} else if (that._pannable && (that._currentMoveState === null || that._currentMoveState === 'panning')) {
						that._pan(-dx*that._invertedPan,-dy*that._invertedPan);
						that._currentMoveState = 'panning';
					}
					x = e.clientX;
					y = e.clientY;
				});
			});

			$(this._canvas).on('mouseup',function() {
				$(that._canvas).off('mousemove');
				if (that._currentMoveState === 'dragging') {
					that._currentOverNode = null;
				}
				that._currentMoveState = null;
			});


		} else {
			return this._canvas;
		}
		return this;
	},

	/**
	 * Get width
	 * @returns Width in pixels of the graph
	 */
	width : function() {
		return this._scene.width;
	},

	/**
	 * Get height
	 * @returns Height in pixels of the graph
	 */
	height : function() {
		return this._scene.height;
	},

	/**
	 * Toggles boolean for showing/hiding all labels in the graph by default
	 * @param showAllLabels
	 * @returns {*}
	 */
	showAllLabels : function(showAllLabels) {
		if (showAllLabels !== undefined) {
			this._showAllLabels = showAllLabels;
		} else {
			return this._showAllLabels;
		}

		// Update
		var that = this;
		this._nodes.forEach(function(node) {
			if (showAllLabels) {
				that.addLabel(node,node.labelText);
			} else {
				that.removeLabel(node,node.labelText);
			}
		});

		return this;
	},

	/**
	 * Adds a label for a node
	 * @param node
	 * @param text
	 * @returns {Graph}
	 */
	addLabel : function(node,text) {
		if (this._nodeIndexToLabel[node.index]) {
			this.removeLabel(node);
		}
		var labelAttrs = this._layouter.layoutLabel(node);

		var fontSize = typeof(this._fontSize) === 'function' ? this._fontSize(node) : this._fontSize;
		if (!fontSize) {
			fontSize = 10;
		}

		var fontFamily = typeof(this._fontFamily) === 'function' ? this._fontFamily(node) : this._fontFamily;
		if (!fontFamily) {
			fontFamily = 'sans-serif';
		}
		var fontStr = fontSize + 'px ' + fontFamily;

		var fontFill = typeof(this._fontColor) === 'function' ? this._fontColor(node) : this._fontColor;
		if (!fontFill) {
			fontFill = '#000000';
		}
		var fontStroke = typeof(this._fontStroke) === 'function' ? this._fontStroke(node) : this._fontStroke;
		var fontStrokeWidth = typeof(this._fontStroke) === 'function' ? this._fontStrokeWidth : this._fontStrokeWidth;

		var labelSpec = {
			font: fontStr,
			fillStyle: fontFill,
			strokeStyle: fontStroke,
			lineWidth: fontStrokeWidth,
			text : text
		};

		var bAddShadow = this._shadowBlur || this._shadowOffsetX || this._shadowOffsetY || this._shadowColor;
		if (bAddShadow) {
			labelSpec['shadowColor'] = this._shadowColor || '#000';
			labelSpec['shadowOffsetX'] = this._shadowOffsetX || 0;
			labelSpec['shadowOffsetY'] = this._shadowOffsetY || 0;
			labelSpec['shadowBlur'] = this._shadowBlur || Math.floor(fontSize/3);
		}

		for (var key in labelAttrs) {
			if (labelAttrs.hasOwnProperty(key)) {
				labelSpec[key] = labelAttrs[key];
			}
		}
		var label = path.text(labelSpec);
		this._nodeIndexToLabel[node.index] = label;
		this._scene.addChild(label);

		return this;
	},

	/**
	 * Removes a label for a node
	 * @param node
	 * @returns {Graph}
	 */
	removeLabel : function(node) {
		var textObject = this._nodeIndexToLabel[node.index];
		if (textObject) {
			this._scene.removeChild(textObject);
			delete this._nodeIndexToLabel[node.index];
		}
		return this;
	},

	/**
	 * Event handler for mouseover of a node
	 * @param callback(node)
	 * @param self - the object to be bound as 'this' in the callback
	 * @returns {Graph}
	 */
	nodeOver : function(callback,self) {
		if (!self) {
			self = this;
		}
		this._nodeOver = callback.bind(self);
		return this;
	},

	/**
	 * Event handler for mouseout of a node
	 * @param callback(node)
	 * @param self - the object to be bound as 'this' in the callback
	 * @returns {Graph}
	 */
	nodeOut : function(callback,self) {
		if (!self) {
			self = this;
		}
		this._nodeOut = callback.bind(self);
		return this;
	},

	/**
	 * Convenience function for setting nodeOver/nodeOut in a single call
	 * @param over - the nodeOver event handler
	 * @param out - the nodeOut event handler
	 * @param self - the object to be bound as 'this' in the callback
	 * @returns {Graph}
	 */
	nodeHover : function(over,out,self) {
		if (!self) {
			self = this;
		}
		this.nodeOver(over,self);
		this.nodeOut(out,self);
		return this;
	},

	/**
	 * Event handler for click of a node
	 * @param callback(node)
	 * @param self - the object to be bound as 'this'.   Defaults to the graph object
	 * @returns {Graph}
	 */
	nodeClick : function(callback,self) {
		if (!self) {
			self = this;
		}
		this._nodeClick = callback.bind(self);
		return this;
	},

	/**
	 * Pan {Graph} by (dx,dy).   Automatically rerender the graph.
	 * @param dx - Amount of pan in x direction
	 * @param dy - Amount of pan in y direction
	 * @private
	 */
	_pan : function(dx,dy) {
		this._scene.x += dx;
		this._scene.y += dy;
		this._panX += dx;
		this._panY += dy;
		this.update();
	},

	/**
	 * Make {Graph} pannable
	 * @returns {Graph}
	 */
	pannable : function() {
		this._pannable = true;
		return this;
	},

	/**
	 * Makes the graph pan in the opposite direction of the mouse as opposed to with it
	 * @returns {Graph}
	 */
	invertPan : function() {
		this._invertedPan = -1;
		return this;
	},

	/**
	 * Make nodes in {Graph} repoisitionable by click-dragging
	 * @returns {Graph}
	 */
	draggable : function() {
		this._draggable = true;
		return this;
	},

	_getZoomForLevel : function(level) {
		var factor = Math.pow(1.5 , Math.abs(level - this._zoomLevel));
		if (level < this._zoomLevel) {
			factor = 1/factor;
		}
		return factor;
	},

	_zoom : function(factor,x,y) {
		this._zoomScale *= factor;
		this._layouter._zoomScale = this._zoomScale;

		// Pan scene back to origin
		var originalX = this._scene.x;
		var originalY = this._scene.y;
		this._pan(-this._scene.x,-this._scene.y);

		var mouseX = x || 0;
		var mouseY = y || 0;

		// 'Zoom' nodes.   We do this so text/radius size remains consistent across zoom levels
		for (var i = 0; i < this._nodes.length; i++) {
			this._layouter._setNodePosition(this._nodes[i],this._nodes[i].x*factor, this._nodes[i].y*factor,true);
		}

		// Zoom the render groups
		this._addPreAndPostRenderObjects();


		// Reverse the 'origin pan' with the scale applied and recenter the mouse with scale applied as well
		var newMouseX = mouseX*factor;
		var newMouseY = mouseY*factor;
		this._pan(originalX*factor - (newMouseX-mouseX),originalY*factor - (newMouseY-mouseY));


		// Update the regroup underlays
		var that = this;
		if (this._handleGroup && this._handleGroup.children && this._handleGroup.children.length) {
			this._handleGroup.removeAll();
			that._scene.update();
			that._addRegroupHandles();
		}
	},

	/**
	 * Make {Graph} zoomable by using the mousewheel
	 * @returns {Graph}
	 */
	zoomable : function() {
		if (!this._zoomable) {
			var that = this;
			$(this._canvas).on('mousewheel',function(e) {
				e.preventDefault();
				if (that._eventsSuspended()) {
					return false;
				}
				var wheel = e.originalEvent.wheelDelta/120;//n or -n
				var factor;
				if (wheel < 0) {
					factor = that._getZoomForLevel(that._zoomLevel-1);
				} else {
					factor = that._getZoomForLevel(that._zoomLevel+1);
				}
				that._zoom(factor, e.offsetX, e.offsetY);

			});
			this._zoomable = true;
		}
		return this;
	},

	/**
	 * Sets the layout function for the nodes
	 * @param layouter - An instance (or subclass) of Layout
	 * @returns {Graph} is layouter param is defined, the layouter otherwise
	 */
	layouter : function(layouter) {
		if (layouter) {
			this._layouter = layouter;
			this._layouter
				.nodes(this._nodes)
				.linkMap(this._nodeIndexToLinkLine)
				.nodeMap(this._nodeIndexToCircle)
				.labelMap(this._nodeIndexToLabel);
		} else {
			return this._layouter;
		}
		return this;
	},

	/**
	 * Performs a layout of the graph
	 * @returns {Graph}
	 */
	layout : function(callback) {
		if (this._layouter) {
			var that = this;
			this._layouter.layout(this._canvas.width,this._canvas.height);


			// Update the regroup underlays
			if (this._handleGroup && this._handleGroup.children) {
				var underlays = this._handleGroup.children;
				underlays.forEach(function(handleObject) {
					var indices = handleObject.graphjs_indices;
					var bb = that._layouter.getBoundingBox(indices, REGROUND_BB_PADDING);
					if (handleObject.graphjs_type === 'regroup_underlay') {
						handleObject.tweenAttr({
							x: bb.x,
							y: bb.y,
							width: bb.width,
							height: bb.height
						}, {
							duration: that._layouter.duration(),
							easing: that._layouter.easing()
						});
					} else if (handleObject.graphjs_type === 'regroup_icon') {
						var ungroupedNodes = that._groupingManager.getUngroupedNodesForKey(handleObject.graphjs_group_key);
						var iconPosition = that._groupingManager.getMinimizeIconPosition(bb,ungroupedNodes);
						handleObject.tweenAttr({
							x: iconPosition.x,
							y: iconPosition.y
						}, {
							duration: that._layouter.duration(),
							easing: that._layouter.easing()
						});

					}
				});
			}
			this.update();
		}
		return this;
	},


	/**
	 * Gets/sets the grouping manager.
	 * @param groupingManager
	 * @returns {*}
	 */
	groupingManager : function(groupingManager) {
		if (groupingManager) {
			this._groupingManager = groupingManager;
		} else {
			return this._groupingManager;
		}
		return this;
	},

	/**
	 * Initializes the grouping manager provided and calls the methods for aggregating nodes and links
	 * @returns {Graph}
	 */
	initializeGrouping : function() {
		if (this._groupingManager) {
			this._groupingManager.nodes(this._nodes)
				.links(this._links)
				.initializeHeirarchy();

			this.nodes(this._groupingManager.aggregatedNodes());
			this.links(this._groupingManager.aggregatedLinks());
		}
		return this;
	},

	/**
	 * Ungroups the prodided aggregate node
	 * @param node - the aggregate node to be ungrouped
	 * @returns {Graph}
	 */
	ungroup : function(node) {
		if (!node || !node.children) {
			return this;
		}
		var that = this;
		if (this._groupingManager) {
			this._groupingManager.ungroup(node);
			this.clear()
				.nodes(this._groupingManager.aggregatedNodes())
				.links(this._groupingManager.aggregatedLinks())
				.draw();

			this._layouter._applyZoomScale(true);
			this.layout();
			this._layouter._applyZoomScale(false);
		}
		return this;
	},

	/**
	 * Regroups the aggregate node.   Can be called programattically but is automatically invoked when clicking on the
	 * regroup handler
	 * @param ungroupedAggregateKey
	 */
	regroup : function(ungroupedAggregateKey) {
		// Animate the regroup
		var that = this;
		var parentAggregate = this._groupingManager.getAggregate(ungroupedAggregateKey);

		var avgPos = { x: 0, y : 0};
		var maxRadius = 0;
		parentAggregate.children.forEach(function(child) {
			avgPos.x += child.x;
			avgPos.y += child.y;
		});
		avgPos.x /= parentAggregate.children.length;
		avgPos.y /= parentAggregate.children.length;

		var indexOfChildren = parentAggregate.children.map(function(child) {
			for (var i = 0; i < that._groupingManager._aggregatedNodes.length; i++) {
				if (that._groupingManager._aggregatedNodes[i].index === child.index) {
					return i;
				}
			}
		});
		var minChildIndex = Number.MAX_VALUE;
		indexOfChildren.forEach(function(idx) {
			minChildIndex = Math.min(minChildIndex,idx);
		});

		var animatedRegrouped = 0;
		this._suspendEvents();			// layout will resume them
		parentAggregate.children.forEach(function(child) {

			//TODO:   When we can support transparent text in path, fade out the label as we move it together if it's showing

			that._layouter._setNodePosition(child,avgPos.x,avgPos.y,false,function() {
				animatedRegrouped++;
				if (animatedRegrouped === parentAggregate.children.length) {
					if (that._groupingManager) {
						var regroupedAggregate = that._groupingManager.regroup(ungroupedAggregateKey,minChildIndex);
						regroupedAggregate.x = avgPos.x;
						regroupedAggregate.y = avgPos.y;
						that.clear()
							.nodes(that._groupingManager.aggregatedNodes())
							.links(that._groupingManager.aggregatedLinks());
						that.draw();
						that._layouter._applyZoomScale(true);
						that.layout();
						that._layouter._applyZoomScale(false);
					}
				}
			});
		});
		this.update();
	},

	/**
	 * Gets/sets the font size for labels
	 * @param fontSize - size of the font in pixels
	 * @returns {Graph} if fontSize param is deifned, {Graph._fontSize} otherwise
	 */
	fontSize : function(fontSize) {
		if (fontSize) {
			this._fontSize = fontSize;
		} else {
			return this._fontSize;
		}
		return this;
	},

	/**
	 * Gets/sets the font colour for labels
	 * @param fontColour - A hex string for the colour of the labels
	 * @returns {Graph} if fontColour param is deifned, {Graph._fontColour} otherwise
	 */
	fontColour : function(fontColour) {
		if (fontColour) {
			this._fontColor = fontColour;
		} else {
			return this._fontColor;
		}
		return this;
	},

	/**
	 * Gets/sets the font stroke for labels
	 * @param fontStroke - A hex string for the color of the label stroke
	 * @returns {Graph} if fontStroke param is defined, {Graph._fontStroke} otherwise
	 */
	fontStroke : function(fontStroke) {
		if (fontStroke) {
			this._fontStroke = fontStroke;
		} else {
			return this._fontStroke;
		}
		return this;
	},

	/**
	 * Gets/sets the font stroke width for labels
	 * @param fontStrokeWidth - size in pixels
	 * @returns {Graph} if fontStrokeWidth param is defined, {Graph._fontStrokeWidth} otherwise
	 */
	fontStrokeWidth : function(fontStrokeWidth) {
		if (fontStrokeWidth) {
			this._fontStrokeWidth = fontStrokeWidth;
		} else {
			return this._fontStrokeWidth;
		}
		return this;
	},

	/**
	 * Gets/sets the font family for labels
	 * @param fontFamily - A string for the font family (a la HTML5 Canvas)
	 * @returns {Graph} if fontFamily param is deifned, {Graph._fontFamily} otherwise
	 */
	fontFamily : function(fontFamily) {
		if (fontFamily) {
			this._fontFamily = fontFamily;
		} else {
			return this._fontFamily;
		}
		return this;
	},

	/**
	 * Gets/sets the font shadow properties for labels
	 * @param color - the colour of the shadow
	 * @param offsetX - the x offset of the shadow from center
	 * @param offsetY - the y offset of the shadow from center
	 * @param blur - the amount of blur applied to the shadow in pixels
	 * @returns {*}
	 */
	fontShadow : function(color,offsetX,offsetY,blur) {
		if (arguments.length === 0) {
			return {
				color: this._shadowColor,
				offsetX: this._shadowOffsetX,
				offsetY: this._shadowOffsetY,
				blur: this._shadowBlur
			};
		} else {
			this._shadowColor = color;
			this._shadowOffsetX = offsetX;
			this._shadowOffsetY = offsetY;
			this._shadowBlur = blur;
			return this;
		}
	},

	/**
	 * Resize the graph.  Automatically performs layout and rerenders the graph
	 * @param w - the new width
	 * @param h - the new height
	 * @returns {Graph}
	 */
	resize : function(w,h) {
		this._width = w;
		this._height = h;
		$(this._canvas).attr({width:w,height:h})
			.width(w)
			.height(h);
		this._scene.resize(w,h);

		if (!this._pannable && !this._zoomable) {
			this.layout();
		} else {
			this._scene.update();
		}
		return this;
	},

	/**
	 * Gets a list of pre/post render objects from the layouter (if any)
	 * @private
	 */
	_addPreAndPostRenderObjects : function() {
		this._prerenderGroup.removeAll();

		// Get the background objects from the layouter
		var objs = this._layouter.prerender(this._width,this._height);
		var that = this;
		if (objs) {
			objs.forEach(function(renderObject) {
				that._prerenderGroup.addChild(renderObject);
			});
		}

		this._postrenderGroup.removeAll();
		objs = this._layouter.postrender(this._width,this._height);
		if (objs) {
			objs.forEach(function(renderObject) {
				that._postrenderGroup.addChild(renderObject);
			});
		}
	},

	/**
	 * Adds clickable boxes to regroup any ungrouped aggregates
	 * TODO:  make this look better!
	 * @private
	 */
	_addRegroupHandles : function() {
		var that = this;
		if (this._groupingManager) {
			var ungroupedNodesInfo = this._groupingManager.getUngroupedNodes();
			ungroupedNodesInfo.forEach(function(ungroupedNodeInfo) {
				var indices = ungroupedNodeInfo.indices;
				var key = ungroupedNodeInfo.key;
				var bbox = that._layouter.getBoundingBox(indices,REGROUND_BB_PADDING);
				var iconPosition = that._groupingManager.getMinimizeIconPosition(bbox,that._groupingManager.getUngroupedNodesForKey(key));
				var minimizeRenderObject = path.image({
					src : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAAlwSFlzAAEQhAABEIQBP0VFYAAAActpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx4bXA6Q3JlYXRvclRvb2w+d3d3Lmlua3NjYXBlLm9yZzwveG1wOkNyZWF0b3JUb29sPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KGMtVWAAAAchJREFUOBGVlT1Ow0AQRr22Q5RIEQVCREpDroCVGo5AQ09LzQEiDsARKDgBVwgdUqKcgIYmEqJClvhNbN5neYO9sU0YaVjv7LdvZpz1YjxsNBodr1arK2PMEdMeniq+hRk0cZqm8yAIxtPp9N4IRmDi+74HVIwmmACyosYA85Ik8SjoJOj3+7cEDoG9IQwzef0fCywpKOgdRgvG0FebeWWdkqp+UqzOqjpiiOUTqXtnldVYQsWoRD0BqzJKXxfXWp2lAv7H/kxSBNoW3bGY0F2z87WmCLTZ3XEt5sFd07wELQKLG//zbJNke6rOXeJmbaALViqqCMwW+WKCBsDGkr4QbF2EBaYcSp8T/4pfInpGtEMsYc5gSm0RU1VfJD9gvGZ9l1gGtcCEoICPs9nsBtHWFkXRBXujHBiU+ofS3pr0KyztMWRQOypX8CV+h7/gLbdVYplRjY7KN76Pn+ItPGOo5RjX96xAyK1xBshjE9N6s5r8YrEFxSEb52EY6oL9ZHubMbsU61EbKzoVHxTSXS6Xc5+HsX56Rl1faltVqwV3VMx1acTo5oxxsFgsngaDwYTChrSxh0AvublfBLnpXcbAHjhC5/oX8APsCav9tH6XXQAAAABJRU5ErkJggg==',
					x : iconPosition.x,
					y : iconPosition.y,
					graphjs_type : 'regroup_icon',
					graphjs_indices : indices,
					graphjs_group_key : key,
					opacity : 0.8
				});

				var boundingBoxRenderObject = path.rect({
					x : bbox.x,
					y : bbox.y,
					graphjs_type : 'regroup_underlay',
					graphjs_indices : indices,
					width : bbox.width,
					height : bbox.height,
					strokeStyle : '#232323',
					fillStyle : '#000000',
					opacity : 0.1
				});
				minimizeRenderObject.on('click',function() {
					that.regroup(key);
				});
				that._handleGroup.addChild(minimizeRenderObject);
				that._handleGroup.addChild(boundingBoxRenderObject);
			});
			this._scene.update();
		}
	},

	/**
	 * Redraw the graph
	 * @returns {Graph}
	 */
	update : function() {
		this._scene.update();
		return this;
	},

	/**
	 * Draw the graph.   Only needs to be called after the nodes/links have been set
	 * @returns {Graph}
	 */
	draw : function() {
		var that = this;

		if (!this._scene) {
			this._scene = path(this._canvas);
		}
		if (!this._layouter) {
			var defaulLayout = new Layout()
				.nodes(this._nodes)
				.nodeMap(this._nodeIndexToCircle)
				.linkMap(this._nodeIndexToLinkLine)
				.labelMap(this._nodeIndexToLabel);
			this.layouter(defaulLayout);
		}
		this._prerenderGroup = path.group();
		//this._prerenderGroup.scaleX = this._zoomScale;
		//this._prerenderGroup.scaleY = this._zoomScale;
		this._handleGroup = path.group();
		this._postrenderGroup = path.group({noHit:true});
		//this._postrenderGroup.scaleX = this._zoomScale;
		//this._postrenderGroup.scaleY = this._zoomScale;

		this._scene.addChild(this._prerenderGroup);
		this._scene.addChild(this._handleGroup);
		this._links.forEach(function(link) {

			var linkObject;
			if (!link.type) {
				link.type = LINK_TYPE.DEFAULT;
			}
			switch(link.type) {
				case LINK_TYPE.ARROW:
					link.headOffset = link.target.radius;
					linkObject = path.arrow(link);
					break;
				case LINK_TYPE.ARC:
					linkObject = path.arc(link);
					break;
				case LINK_TYPE.LINE:
				case LINK_TYPE.DEFAULT:
					linkObject = path.line(link);
					break;
				default:
					linkObject = path.line(link);
					break;
			}
			that._nodeIndexToLinkLine[link.source.index].push(linkObject);
			that._nodeIndexToLinkLine[link.target.index].push(linkObject);

			that._scene.addChild(linkObject);
		});

		this._nodes.forEach(function(node) {
			var circle = path.circle(node);
			that._nodeIndexToCircle[node.index] = circle;
			if (that._nodeOver || that._draggable) {
				circle.off('mouseover');
				circle.on('mouseover', function(e) {
					if (that._eventsSuspended()) { return; }
					if (that._nodeOver) {
						that._nodeOver(circle, e);
					}
					if (that._currentMoveState!=='dragging') {
						that._currentOverNode = circle;
					}
					that._scene.update();
				});
			}
			if (that._nodeOut || that._draggable) {
				circle.off('mouseout');
				circle.on('mouseout', function(e) {
					if (that._eventsSuspended()) { return; }
					if (that._currentMoveState!=='dragging') {
						that._currentOverNode = null;
					}
					if (that._nodeOut) {
						that._nodeOut(circle, e);
					}
					that._scene.update();
				});
			}
			if (that._nodeClick) {
				circle.off('click');
				circle.on('click', function(e) {
					if (that._eventsSuspended()) { return; }
					that._nodeClick(circle,e);
					that._scene.update();
				});
			} else if (that._groupingManager) {
				circle.off('click');
				circle.on('click', function(e) {
					if (that._eventsSuspended()) { return; }
					if (that._nodeOut) {
						that._nodeOut(circle);
					}
					that.ungroup(circle);
				});
			}
			that._scene.addChild(circle);

			if (node.label) {
				that.addLabel(node,node.label);
			}
		});

		if (this.showAllLabels()) {
			this.showAllLabels(true);
		}

		this._layouter.linkMap(this._nodeIndexToLinkLine)
			.nodeMap(this._nodeIndexToCircle)
			.labelMap(this._nodeIndexToLabel);


		this._addPreAndPostRenderObjects();

		// Draw any ungrouped node bounding boxes
		this._addRegroupHandles();

		this._scene.addChild(this._postrenderGroup);
		this.update();

		return this;
	},

	_debugDrawBoundingBox : function() {
		var boundingBox = this._layouter.getBoundingBox(this._nodes);
		if (this._bbRender) {
			this._scene.removeChild(this._bbRender);
		}
		this._bbRender = path.rect({
			x : boundingBox.x,
			y : boundingBox.y,
			width : boundingBox.width,
			height : boundingBox.height,
			strokeStyle : '#ff0000',
			lineWidth : 2
		});
		this._scene.addChild(this._bbRender);
		this._scene.update();
	},

	/**
	 * Fit the graph to the screen
	 */
	fit : function(padding) {

		// Return back to origin
		this._pan(-this._scene.x,-this._scene.y);



		// Working with big numbers, it's better if we do this twice.
		var boundingBox;
		for (var i = 0; i < 2; i++) {
			boundingBox = this._layouter.getBoundingBox(this._nodes,padding);
			var xRatio = this._scene.width / boundingBox.width;
			var yRatio = this._scene.height / boundingBox.height;
			this._zoom(Math.min(xRatio, yRatio), 0, 0);
		}

		var midScreenX = this._scene.width / 2;
		var midScreenY = this._scene.height / 2;
		boundingBox = this._layouter.getBoundingBox(this._nodes);
		var midBBX = boundingBox.x + boundingBox.width / 2;
		var midBBY = boundingBox.y + boundingBox.height / 2;
		this._pan(-(midBBX-midScreenX),-(midBBY-midScreenY));

		this._zoomScale = 1.0;
		this._layouter._zoomScale = 1.0;
		// Zoom the render groups
		//if (this._prerenderGroup) {
		//	this._prerenderGroup.scaleX = this._zoomScale;
		//	this._prerenderGroup.scaleY = this._zoomScale;
		//}
		//if (this._postrenderGroup) {
		//	this._postrenderGroup.scaleX = this._zoomScale;
		//	this._postrenderGroup.scaleY = this._zoomScale;
		//}
		this.update();

		return this;
	},

	/**
	 * Suspend mouse events and zooming
	 * @private
	 */
	_suspendEvents : function() {
		this._layouter._eventsSuspended = true;
	},

	/**
	 * resume mouse events and zooming
	 * @private
	 */
	_resumeEvents : function() {
		this._layouter._eventsSuspended = false;
	},

	/**
	 * Query event suspension status
	 * @returns boolean
	 * @private
	 */
	_eventsSuspended : function() {
		return this._layouter._eventsSuspended;
	},

	/**
	 * Removes all render objects associated with a graph.
	 */
	clear : function() {
		var removeRenderObjects = function(indexToObject) {
			for (var key in indexToObject) {
				if (indexToObject.hasOwnProperty(key)) {
					var obj = indexToObject[key];
					if ($.isArray(obj)) {
						for (var i = 0; i < obj.length; i++) {
							this._scene.removeChild(obj[i]);
						}
					} else {
						this._scene.removeChild(obj);
					}
					delete indexToObject[key];
				}
			}
		};
		removeRenderObjects.call(this,this._nodeIndexToCircle);
		removeRenderObjects.call(this,this._nodeIndexToLinkLine);
		removeRenderObjects.call(this,this._nodeIndexToLabel);
		if (this._prerenderGroup) {
			this._scene.removeChild(this._prerenderGroup);
		}
		if (this._handleGroup) {
			this._scene.removeChild(this._handleGroup);
		}
		if (this._postrenderGroup) {
			this._scene.removeChild(this._postrenderGroup);
		}
		this._scene.update();
		return this;
	}
});


exports.LINK_TYPE = _dereq_('./linkType');
exports.GroupingManager = _dereq_('./groupingManager');
exports.Layout = _dereq_('./layout');
exports.ColumnLayout = _dereq_('./columnLayout');
exports.RadialLayout = _dereq_('./radialLayout');
exports.Extend = _.extend;
exports.Graph = Graph;
},{"./columnLayout":1,"./groupingManager":2,"./layout":3,"./linkType":4,"./radialLayout":6,"./util":7}],6:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Layout = _dereq_('./layout');
/**
 *
 * @param focus - the node at the center of the radial layout
 * @param distance - the distance of other nodes from the focus
 * @constructor
 */
function RadialLayout(focus,distance) {
	this._focus = focus;
	this._distance = distance;

	Layout.apply(this);
}


RadialLayout.prototype = _.extend(RadialLayout.prototype, Layout.prototype, {
	/**
	 * Gets/sets the distance parameter
	 * @param distance - the distance of links from the focus node to other nodes in pixels
	 * @returns {RadialLayout} if distance param is defined, {RadialLayout._distance} otherwise
	 */
	distance: function (distance) {
		if (distance) {
			this._distance = distance;
		} else {
			return this._distance;
		}
		return this;
	},

	/**
	 * Gets/sets the focus node that is at the center of the layout
	 * @param focus - the node that is at the center of the layout.   Other nodes are centered around this.
	 * @returns {RadialLayout} if focus param is defined, {RadialLayout._focus} otherwise
	 */
	focus: function (focus) {
		if (focus) {
			this._focus = focus;
		} else {
			return this._focus;
		}
		return this;
	},

	/**
	 * Get the label position for a node
	 * @param nodeX - the x position of the node
	 * @param nodeY - the y position of the node
	 * @param radius - the radius of the node
	 * @returns {{x: x position of the label, y: y position of the label, align: HTML canvas text alignment property for label}}
	 */
	layoutLabel: function (nodeX, nodeY, radius) {
		var x, y, align;

		// Right of center
		if (nodeX > this._focus) {
			x = nodeX + (radius + 10);
			align = 'start';
		} else {
			x = nodeX - (radius + 10);
			align = 'end';
		}

		if (nodeY > this._focus) {
			y = nodeY + (radius + 10);
		} else {
			y = nodeY - (radius + 10);
		}
		return {
			x: x,
			y: y,
			align: align
		};
	},

	/**
	 * Perform a radial layout
	 * @param w - the width of the canvas being rendered to
	 * @param h - the height of the canvas being rendered to
	 */
	layout: function (w, h) {
		var nodes = this.nodes();
		var that = this;
		var angleDelta = Math.PI * 2 / (nodes.length - 1);
		var angle = 0.0;
		nodes.forEach(function (node) {
			if (node.index === that._focus.index) {
				that._setNodePosition(node, node.x, node.y);
				return;
			}
			var newX = that._focus.x + (Math.cos(angle) * that._distance);
			var newY = that._focus.y + (Math.sin(angle) * that._distance);
			that._setNodePosition(node, newX, newY);
			angle += angleDelta;
		});
	}
});

module.exports = RadialLayout;

},{"./layout":3,"./util":7}],7:[function(_dereq_,module,exports){

var Util = {

  extend: function(dest, sources) {
    var key, i, source;
    for (i=1; i<arguments.length; i++) {
      source = arguments[i];
      for (key in source) {
        if (source.hasOwnProperty(key)) {
          dest[key] = source[key];
        }
      }
    }
    return dest;
  }
};

module.exports = Util;
},{}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2NvbHVtbkxheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xpbmtUeXBlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3JhZGlhbExheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0bUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5cbnZhciBDb2x1bW5MYXlvdXQgPSBmdW5jdGlvbigpIHtcblx0TGF5b3V0LmFwcGx5KHRoaXMpO1xufTtcblxuQ29sdW1uTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKENvbHVtbkxheW91dC5wcm90b3R5cGUsIExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogQSBjb2x1bW4gbGF5b3V0XG5cdCAqIEBwYXJhbSB3IC0gd2lkdGggb2YgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gaGVpZ2h0IG9mIGNhbnZhc1xuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24gKHcsIGgpIHtcblx0XHR2YXIgeCA9IDA7XG5cdFx0dmFyIHkgPSAwO1xuXHRcdHZhciBtYXhSYWRpdXNDb2wgPSAwO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG5cblx0XHRcdGlmICh5ID09PSAwKSB7XG5cdFx0XHRcdHkgKz0gbm9kZS5yYWRpdXM7XG5cdFx0XHR9XG5cdFx0XHRpZiAoeCA9PT0gMCkge1xuXHRcdFx0XHR4ICs9IG5vZGUucmFkaXVzO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGF0Ll9zZXROb2RlUG9zaXRpb25JbW1lZGlhdGUobm9kZSwgeCwgeSk7XG5cblx0XHRcdG1heFJhZGl1c0NvbCA9IE1hdGgubWF4KG1heFJhZGl1c0NvbCwgbm9kZS5yYWRpdXMpO1xuXG5cdFx0XHR5ICs9IG5vZGUucmFkaXVzICsgNDA7XG5cdFx0XHRpZiAoeSA+IGgpIHtcblx0XHRcdFx0eSA9IDA7XG5cdFx0XHRcdHggKz0gbWF4UmFkaXVzQ29sICsgNDA7XG5cdFx0XHRcdG1heFJhZGl1c0NvbCA9IDA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbHVtbkxheW91dDtcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJhc2UgZ3JvdXBpbmcgbWFuYWdlci4gICBUaGlzIGlzIGFuIGFic3RyYWN0IGNsYXNzLiAgIENoaWxkIGNsYXNzZXMgc2hvdWxkIG92ZXJyaWRlIHRoZVxuICogaW5pdGlhbGl6ZUhlaXJhcmNoeSBmdW5jdGlvbiB0byBjcmVhdGUgbm9kZXMvbGlua3MgdGhhdCBhcmUgYWdncmVnYXRlZCBmb3IgdGhlaXIgc3BlY2lmaWMgaW1wbGVtZW50YXRpb25cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgR3JvdXBpbmdNYW5hZ2VyID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9pbml0aWFsaXplKCk7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5Hcm91cGluZ01hbmFnZXIucHJvdG90eXBlID0gXy5leHRlbmQoR3JvdXBpbmdNYW5hZ2VyLnByb3RvdHlwZSwge1xuXHRfaW5pdGlhbGl6ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX25vZGVzID0gW107XG5cdFx0dGhpcy5fbGlua3MgPSBbXTtcblxuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IFtdO1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWRMaW5rcyA9IFtdO1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZU5vZGVNYXAgPSB7fTtcblxuXHRcdHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXMgPSB7fTtcblx0XHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzID0ge307XG5cdH0sXG5cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9pbml0aWFsaXplKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgb3JpZ2luYWwgbm9kZXMgaW4gdGhlIGdyYXBoIHdpdGhvdXQgZ3JvdXBpbmdcblx0ICogQHBhcmFtIG5vZGVzIC0gYSBncmFwaC5qcyBub2RlIGFycmF5XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2Rlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBvcmlnaW5hbCBsaW5rcyBpbiB0aGUgZ3JhcGggd2l0aG91dCBncm91cGluZ1xuXHQgKiBAcGFyYW0gbGlua3MgLSBhIGdyYXBoLmpzIGxpbmsgYXJyYXlcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRsaW5rcyA6IGZ1bmN0aW9uKGxpbmtzKSB7XG5cdFx0aWYgKGxpbmtzKSB7XG5cdFx0XHR0aGlzLl9saW5rcyA9IGxpbmtzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGlua3M7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplcyB0aGUgbm9kZS9saW5rIGFnZ3JlZ2F0aW9uXG5cdCAqL1xuXHRpbml0aWFsaXplSGVpcmFyY2h5IDogZnVuY3Rpb24oKSB7XG5cblx0XHR0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzID0ge307XG5cdFx0dGhpcy5fdW5ncm91cGVkTm9kZUdyb3VwcyA9IHt9O1xuXG5cdFx0dGhpcy5fYWdncmVnYXRlTm9kZXMoKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXG5cdFx0dmFyIHNldFBhcmVudFBvaW50ZXJzID0gZnVuY3Rpb24obm9kZSxwYXJlbnQpIHtcblx0XHRcdGlmIChub2RlLmNoaWxkcmVuKSB7XG5cdFx0XHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0XHRcdHNldFBhcmVudFBvaW50ZXJzKGNoaWxkLG5vZGUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdG5vZGUucGFyZW50Tm9kZSA9IHBhcmVudDtcblx0XHR9O1xuXG5cdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0c2V0UGFyZW50UG9pbnRlcnMobm9kZSxudWxsKTtcblx0XHR9KTtcblxuXHRcdGlmICh0aGlzLm9uQWdncmVnYXRpb25Db21wbGV0ZSkge1xuXHRcdFx0dGhpcy5vbkFnZ3JlZ2F0aW9uQ29tcGxldGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYWdncmVnYXRlZCBsaW5rIGluIGdyYXBoLmpzIGZvcm1hdC4gICBDYW4gYmUgb3ZlcnJpZGVuIGJ5IHNwZWNpZmljIGltcGxlbWVudGF0aW9ucyB0byBhbGxvd1xuXHQgKiB0byBhbGxvdyBmb3IgZGlmZXJlbnQgbGluayB0eXBlcyBiYXNlZCBvbiBhZ2dyZWdhdGUgY29udGVudHNcblx0ICogQHBhcmFtIHNvdXJjZUFnZ3JlZ2F0ZSAtIHRoZSBzb3VyY2UgYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIHRhcmdldEFnZ3JlZ2F0ZSAtIHRoZSB0YXJnZXQgYWdncmVnYXRlIG5vZGVcblx0ICogQHJldHVybnMge3tzb3VyY2U6ICosIHRhcmdldDogKn19IC0gYSBncmFwaC5qcyBsaW5rXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfY3JlYXRlQWdncmVnYXRlTGluayA6IGZ1bmN0aW9uKHNvdXJjZUFnZ3JlZ2F0ZSx0YXJnZXRBZ2dyZWdhdGUsb3JpZ2luYWxMaW5rcykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzb3VyY2UgOiBzb3VyY2VBZ2dyZWdhdGUsXG5cdFx0XHR0YXJnZXQgOiB0YXJnZXRBZ2dyZWdhdGVcblx0XHR9O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtcyBsaW5rIGFnZ3JlZ2F0ZSBiYXNlZCBvbiBhIHNldCBvZiBhZ2dyZWdhdGVkIG5vZGVzIGFuZCBhIGZ1bGwgc2V0IG9mIGxpbmtzXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfYWdncmVnYXRlTGlua3MgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZSA9IHt9O1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHRcdGlmIChhZ2dyZWdhdGUuY2hpbGRyZW4pIHtcblx0XHRcdFx0YWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbm9kZS5pbmRleF0gPSBhZ2dyZWdhdGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fYWdncmVnYXRlTm9kZU1hcFthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdH0pO1xuXG5cblx0XHR2YXIgYWdncmVnYXRlZExpbmtzID0gW107XG5cblx0XHR2YXIgYWdncmVnYXRlTGlua01hcCA9IHt9O1xuXG5cdFx0dGhpcy5fbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgc291cmNlQWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnNvdXJjZS5pbmRleF07XG5cdFx0XHR2YXIgdGFyZ2V0QWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnRhcmdldC5pbmRleF07XG5cblx0XHRcdHZhciBzb3VyY2VNYXAgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZU1hcCkge1xuXHRcdFx0XHRzb3VyY2VNYXAgPSB7fTtcblx0XHRcdH1cblx0XHRcdHZhciBzb3VyY2VUb1RhcmdldExpbmtzID0gc291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZVRvVGFyZ2V0TGlua3MpIHtcblx0XHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcyA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcy5wdXNoKGxpbmspO1xuXHRcdFx0c291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VUb1RhcmdldExpbmtzO1xuXG5cdFx0XHRhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VNYXA7XG5cdFx0fSk7XG5cblx0XHQvLyBHZXQgbWluL21heCBsaW5rIGNvdW50cyBmb3IgYWxsIGFnZ3JlZ2F0ZSBwYWlyc1xuXHRcdHZhciBtaW5Db3VudCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heENvdW50ID0gMDtcblx0XHRmb3IgKHZhciBzb3VyY2VBZ2dyZWdhdGVJZCBpbiBhZ2dyZWdhdGVMaW5rTWFwKSB7XG5cdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcC5oYXNPd25Qcm9wZXJ0eShzb3VyY2VBZ2dyZWdhdGVJZCkpIHtcblx0XHRcdFx0Zm9yICh2YXIgdGFyZ2V0QWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0pIHtcblx0XHRcdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0uaGFzT3duUHJvcGVydHkodGFyZ2V0QWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdFx0XHR2YXIgc291cmNlID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFtzb3VyY2VBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgb3JpZ2luYWxMaW5rcyA9IGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdW3RhcmdldEFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdG1pbkNvdW50ID0gTWF0aC5taW4obWluQ291bnQsb3JpZ2luYWxMaW5rcy5sZW5ndGgpO1xuXHRcdFx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heChtYXhDb3VudCxvcmlnaW5hbExpbmtzLmxlbmd0aCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgc291cmNlQWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcCkge1xuXHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXAuaGFzT3duUHJvcGVydHkoc291cmNlQWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdGZvciAodmFyIHRhcmdldEFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdKSB7XG5cdFx0XHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdLmhhc093blByb3BlcnR5KHRhcmdldEFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRcdFx0dmFyIHNvdXJjZSA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbc291cmNlQWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIHRhcmdldCA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIG9yaWdpbmFsTGlua3MgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXVt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgbGluayA9IHRoYXQuX2NyZWF0ZUFnZ3JlZ2F0ZUxpbmsoc291cmNlLCB0YXJnZXQsIG9yaWdpbmFsTGlua3MsIG1pbkNvdW50LCBtYXhDb3VudCk7XG5cdFx0XHRcdFx0XHRpZiAobGluaykge1xuXHRcdFx0XHRcdFx0XHRhZ2dyZWdhdGVkTGlua3MucHVzaChsaW5rKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9hZ2dyZWdhdGVkTGlua3MgPSBhZ2dyZWdhdGVkTGlua3M7XG5cdH0sXG5cblxuXHQvKipcblx0ICogUGVyZm9ybSBub2RlIGFnZ3JlZ2F0aW9uLiAgIE11c3QgYmUgb3ZlcnJpZGVuIGJ5IGltcGxlbWVudG9yc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZU5vZGVzIDogZnVuY3Rpb24oKSB7XG5cblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBub2Rlc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIG5vZGVzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTm9kZXMgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZE5vZGVzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gb2YgZ3JhcGguanMgbGlua3Ncblx0ICovXG5cdGFnZ3JlZ2F0ZWRMaW5rcyA6IGZ1bmN0aW9uKCkgIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cdHJlbW92ZSA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHR2YXIgaW5kZXggPSAtMTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0aW5kZXggPSBpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc3BsaWNlKGluZGV4LDEpO1xuXHRcdH1cblx0fSxcblxuXG5cdC8qKlxuXHQgKiBEbyBhbnkgdXBkYXRlcyBvbiBjaGlsZHJlbiBiZWZvcmUgbGF5b3V0ICAoaWUvIHNldCBwb3NpdGlvbiwgcm93L2NvbCBpbmZvLCBldGMpLiAgIFNob3VsZCBiZSBkZWZpbmVkXG5cdCAqIGluIGltcGxlbWVudGluZyBjbGFzc1xuXHQgKiBAcGFyYW0gYWdncmVnYXRlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfdXBkYXRlQ2hpbGRyZW4gOiBmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHQvLyBzZXQgY2hpbGRyZW5zIHBvc2l0aW9uIGluaXRpYWxseSB0byB0aGUgcG9zaXRpb24gb2YgdGhlIGFnZ3JlZ2F0ZVxuXHRcdGFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRjaGlsZC54ID0gYWdncmVnYXRlLng7XG5cdFx0XHRjaGlsZC55ID0gYWdncmVnYXRlLnk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFVuZ3JvdXAgYW4gYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICovXG5cdHVuZ3JvdXAgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0aWYgKG5vZGUuY2hpbGRyZW4pIHtcblxuXHRcdFx0dmFyIHBhcmVudEtleSA9ICcnO1xuXHRcdFx0bm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0cGFyZW50S2V5ICs9IG5vZGUuaW5kZXggKyAnLCc7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1twYXJlbnRLZXldID0gbm9kZTtcblxuXHRcdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlc1tpXS5pbmRleCA9PT0gbm9kZS5pbmRleCkge1xuXHRcdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl91cGRhdGVDaGlsZHJlbihub2RlKTtcblxuXHRcdFx0dmFyIGZpcnN0ID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKDAsaW5kZXgpO1xuXHRcdFx0dmFyIG1pZGRsZSA9IG5vZGUuY2hpbGRyZW47XG5cdFx0XHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzW3BhcmVudEtleV0gPSBub2RlLmNoaWxkcmVuO1xuXHRcdFx0dmFyIGVuZCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZShpbmRleCsxKTtcblxuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzID0gZmlyc3QuY29uY2F0KG1pZGRsZSkuY29uY2F0KGVuZCk7XG5cblx0XHRcdC8vIFJlY29tcHV0ZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdH1cblx0fSxcblx0Z2V0QWdncmVnYXRlIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0fSxcblxuXHRyZWdyb3VwIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5LGF0SW5kZXgpIHtcblx0XHR2YXIgYWdncmVnYXRlTm9kZSA9IHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0XHR2YXIgbm9kZXNUb1JlbW92ZSA9IGFnZ3JlZ2F0ZU5vZGUuY2hpbGRyZW47XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVzVG9SZW1vdmUuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR0aGF0LnJlbW92ZShub2RlKTtcblx0XHR9KTtcblx0XHR2YXIgc3RhcnQgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoMCxhdEluZGV4KTtcblx0XHR2YXIgZW5kID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKGF0SW5kZXgpO1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IHN0YXJ0LmNvbmNhdChhZ2dyZWdhdGVOb2RlKS5jb25jYXQoZW5kKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0ZGVsZXRlIHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHNbYWdncmVnYXRlS2V5XTtcblx0XHRyZXR1cm4gYWdncmVnYXRlTm9kZTtcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbiBhcnJheSBvZiBub2RlIGdyb3VwcyB0aGF0IGFyZSBleHBhbmRlZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRnZXRVbmdyb3VwZWROb2RlcyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbmZvID0gW107XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR2YXIgbm9kZXMgPSB0aGF0Ll91bmdyb3VwZWROb2RlR3JvdXBzW2tleV07XG5cdFx0XHR2YXIgbm9kZUluZGljZXMgPSBub2Rlcy5tYXAoZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRyZXR1cm4gbm9kZS5pbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0aW5mby5wdXNoKHtcblx0XHRcdFx0aW5kaWNlcyA6IG5vZGVJbmRpY2VzLFxuXHRcdFx0XHRrZXkgOiBrZXlcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBpbmZvO1xuXHR9LFxuXG5cdGdldFVuZ3JvdXBlZE5vZGVzRm9yS2V5IDogZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHNba2V5XTtcblx0fSxcblxuXHRnZXRNaW5pbWl6ZUljb25Qb3NpdGlvbiA6IGZ1bmN0aW9uKGJvdW5kaW5nQm94LHVuZ3JvdXBlZE5vZGVzKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHggOiBib3VuZGluZ0JveC54ICsgYm91bmRpbmdCb3gud2lkdGggKyAxMCxcblx0XHRcdHkgOiBib3VuZGluZ0JveC55XG5cdFx0fTtcblx0fVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cGluZ01hbmFnZXI7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIExheW91dCBjb25zdHJ1Y3RvclxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gbnVsbDtcblx0dGhpcy5fbGlua01hcCA9IG51bGw7XG5cdHRoaXMuX25vZGVNYXAgPSBudWxsO1xuXHR0aGlzLl9sYWJlbE1hcCA9IG51bGw7XG5cdHRoaXMuX2R1cmF0aW9uID0gMjUwO1xuXHR0aGlzLl9lYXNpbmcgPSAnZWFzZS1pbi1vdXQnO1xuXHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IGZhbHNlO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBkdXJhdGlvbiBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIGxheW91dCBhbmltYXRpb24gaW4gbWlsbGlzZWNvbmRzLiAgKGRlZmF1bHQgPSAyNTBtcylcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgZHVyYXRpb24gcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fZHVyYXRpb259IG90aGVyd2lzZVxuXHQgKi9cblx0ZHVyYXRpb24gOiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdGlmIChkdXJhdGlvbikge1xuXHRcdFx0dGhpcy5fZHVyYXRpb24gPSBkdXJhdGlvbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2R1cmF0aW9uO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBlYXNpbmcgb2YgdGhlIGxheW91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIGVhc2luZyAtIHRoZSBlYXNpbmcgb2YgdGhlIGxheW91dCBhbmltYXRpb24gaW4gbWlsbGlzZWNvbmRzLiAgKGRlZmF1bHQgPSAnZWFzZS1pbi1vdXQnKVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBlYXNpbmcgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fZWFzaW5nfSBvdGhlcndpc2Vcblx0ICovXG5cdGVhc2luZyA6IGZ1bmN0aW9uKGVhc2luZykge1xuXHRcdGlmIChlYXNpbmcpIHtcblx0XHRcdHRoaXMuX2Vhc2luZyA9IGVhc2luZztcblx0XHR9XHQgZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZWFzaW5nO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlcyBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZXMgLSB0aGUgc2V0IG9mIG5vZGVzIGRlZmluZWQgaW4gdGhlIGNvcnJlc3BvbmRpbmcgZ3JhcGhcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbm9kZXMgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbm9kZXN9IG90aGVyd2lzZVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5faXNVcGRhdGUgPSBub2RlcyA/IHRydWUgOiBmYWxzZTtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbGluayBtYXAgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxpbmtNYXAgLSBhIG1hcCBmcm9tIG5vZGUgaW5kZXggdG8gYSBzZXQgb2YgbGluZXMgKHBhdGggb2JqZWN0cykgdGhhdCBjb250YWluIHRoYXQgbm9kZVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBsaW5rTWFwIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX2xpbmtNYXB9IG90aGVyd2lzZVxuXHQgKi9cblx0bGlua01hcCA6IGZ1bmN0aW9uKGxpbmtNYXApIHtcblx0XHRpZiAobGlua01hcCkge1xuXHRcdFx0dGhpcy5fbGlua01hcCA9IGxpbmtNYXA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9saW5rTWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlIG1hcCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZU1hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIGNpcmNsZSAocGF0aCBvYmplY3QpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIG5vZGVNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbm9kZU1hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlTWFwIDogZnVuY3Rpb24obm9kZU1hcCkge1xuXHRcdGlmIChub2RlTWFwKSB7XG5cdFx0XHR0aGlzLl9ub2RlTWFwID0gbm9kZU1hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGxhYmVsIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBsYWJlbE1hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIHRleHQgb2JqZWN0IChwYXRoIG9iamVjdClcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbGFiZWxNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbGFiZWxNYXB9IG90aGVyd2lzZVxuXHQgKi9cblx0bGFiZWxNYXAgOiBmdW5jdGlvbihsYWJlbE1hcCkge1xuXHRcdGlmIChsYWJlbE1hcCkge1xuXHRcdFx0dGhpcy5fbGFiZWxNYXAgPSBsYWJlbE1hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xhYmVsTWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhIGJvdW5kaW5nIGJveCBmb3IgYW4gYXJyYXkgb2Ygbm9kZSBpbmRpY2VzXG5cdCAqIEBwYXJhbSBub2RlT3JJbmRleEFycmF5IC0gYXJyYXkgb2Ygbm9kZSBpbmRpY2llcyBvciBub2RlIGFycmF5IGl0c2VsZlxuXHQgKiBAcGFyYW0gcGFkZGluZyAtIHBhZGRpbmcgaW4gcGl4ZWxzIGFwcGxpZWQgdG8gYm91bmRpbmcgYm94XG5cdCAqIEByZXR1cm5zIHt7bWluOiB7eDogTnVtYmVyLCB5OiBOdW1iZXJ9LCBtYXg6IHt4OiBudW1iZXIsIHk6IG51bWJlcn19fVxuXHQgKi9cblx0Z2V0Qm91bmRpbmdCb3ggOiBmdW5jdGlvbihub2RlT3JJbmRleEFycmF5LHBhZGRpbmcpIHtcblx0XHRpZiAoIW5vZGVPckluZGV4QXJyYXkgfHwgIW5vZGVPckluZGV4QXJyYXkubGVuZ3RoIHx8IG5vZGVPckluZGV4QXJyYXkubGVuZ3RoID09PSAwIHx8IE9iamVjdC5rZXlzKHRoaXMuX25vZGVNYXApLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eCA6IDAsXG5cdFx0XHRcdHkgOiAwLFxuXHRcdFx0XHR3aWR0aCA6IDEsXG5cdFx0XHRcdGhlaWdodCA6IDFcblx0XHRcdH07XG5cdFx0fVxuXG5cblx0XHR2YXIgbWluID0ge1xuXHRcdFx0eCA6IE51bWJlci5NQVhfVkFMVUUsXG5cdFx0XHR5IDogTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cdFx0dmFyIG1heCA9IHtcblx0XHRcdHggOiAtTnVtYmVyLk1BWF9WQUxVRSxcblx0XHRcdHkgOiAtTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cblx0XHR2YXIgYmJQYWRkaW5nID0gcGFkZGluZyB8fCAwO1xuXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVPckluZGV4QXJyYXkuZm9yRWFjaChmdW5jdGlvbihub2RlT3JJbmRleCkge1xuXHRcdFx0dmFyIGlkeCA9IG5vZGVPckluZGV4IGluc3RhbmNlb2YgT2JqZWN0ID8gbm9kZU9ySW5kZXguaW5kZXggOiBub2RlT3JJbmRleDtcblx0XHRcdHZhciBjaXJjbGUgPSB0aGF0Ll9ub2RlTWFwW2lkeF07XG5cdFx0XHRtaW4ueCA9IE1hdGgubWluKG1pbi54LCAoY2lyY2xlLmZpbmFsWCB8fCBjaXJjbGUueCkgLSAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdFx0bWluLnkgPSBNYXRoLm1pbihtaW4ueSwgKGNpcmNsZS5maW5hbFkgfHwgY2lyY2xlLnkpIC0gKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHRcdG1heC54ID0gTWF0aC5tYXgobWF4LngsIChjaXJjbGUuZmluYWxYIHx8IGNpcmNsZS54KSArIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0XHRtYXgueSA9IE1hdGgubWF4KG1heC55LCAoY2lyY2xlLmZpbmFsWSB8fCBjaXJjbGUueSkgKyAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdH0pO1xuXHRcdHJldHVybiB7XG5cdFx0XHR4IDogbWluLngsXG5cdFx0XHR5IDogbWluLnksXG5cdFx0XHR3aWR0aCA6IChtYXgueCAtIG1pbi54KSxcblx0XHRcdGhlaWdodCA6IChtYXgueSAtIG1pbi55KVxuXHRcdH07XG5cdH0sXG5cblx0X2FwcGx5Wm9vbVNjYWxlIDogZnVuY3Rpb24oYkFwcGx5KSB7XG5cdFx0dGhpcy5fYXBwbHlab29tID0gYkFwcGx5O1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiBhIG5vZGUgYW5kIGFsbCBhdHRhY2hlZCBsaW5rcyBhbmQgbGFiZWxzIHdpdGhvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBub2RlIC0gdGhlIG5vZGUgb2JqZWN0IGJlaW5nIHBvc2l0aW9uZWRcblx0ICogQHBhcmFtIHggLSB0aGUgbmV3IHggcG9zaXRpb24gZm9yIHRoZSBub2RlXG5cdCAqIEBwYXJhbSB5IC0gdGhlIG5ldyB5IHBvc2l0aW9uIGZvciB0aGUgbm9kZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZSA6IGZ1bmN0aW9uKG5vZGUseCx5LGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUseCx5LHRydWUpO1xuXHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIGEgbm9kZSBieSBhbmltYXRpbmcgZnJvbSBpdCdzIG9sZCBwb3NpdGlvbiB0byBpdCdzIG5ldyBvbmVcblx0ICogQHBhcmFtIG5vZGUgLSB0aGUgbm9kZSBiZWluZyByZXBvc2l0aW9uZWRcblx0ICogQHBhcmFtIHggLSB0aGUgbmV3IHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHkgLSB0aGUgbmV3IHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIGJJbW1lZGlhdGUgLSBpZiB0cnVlLCBzZXRzIHdpdGhvdXQgYW5pbWF0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3NldE5vZGVQb3NpdGlvbiA6IGZ1bmN0aW9uKG5vZGUsbmV3WCxuZXdZLGJJbW1lZGlhdGUsY2FsbGJhY2spIHtcblx0XHR2YXIgeCA9IG5ld1ggKiAodGhpcy5fYXBwbHlab29tID8gdGhpcy5fem9vbVNjYWxlIDogMSk7XG5cdFx0dmFyIHkgPSBuZXdZICogKHRoaXMuX2FwcGx5Wm9vbSA/IHRoaXMuX3pvb21TY2FsZSA6IDEpO1xuXG5cblx0XHQvLyBVcGRhdGUgdGhlIG5vZGUgcmVuZGVyIG9iamVjdFxuXHRcdHZhciBjaXJjbGUgPSB0aGlzLl9ub2RlTWFwW25vZGUuaW5kZXhdO1xuXHRcdGlmIChiSW1tZWRpYXRlIT09dHJ1ZSkge1xuXHRcdFx0Y2lyY2xlLnR3ZWVuQXR0cih7XG5cdFx0XHRcdHg6IHgsXG5cdFx0XHRcdHk6IHlcblx0XHRcdH0sIHtcblx0XHRcdFx0ZHVyYXRpb246IHRoaXMuX2R1cmF0aW9uLFxuXHRcdFx0XHRlYXNpbmc6IHRoaXMuX2Vhc2luZyxcblx0XHRcdFx0Y2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWxldGUgY2lyY2xlLmZpbmFsWDtcblx0XHRcdFx0XHRkZWxldGUgY2lyY2xlLmZpbmFsWTtcblx0XHRcdFx0XHRub2RlLnggPSB4O1xuXHRcdFx0XHRcdG5vZGUueSA9IHk7XG5cdFx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRjaXJjbGUuZmluYWxYID0geDtcblx0XHRcdGNpcmNsZS5maW5hbFkgPSB5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjaXJjbGUueCA9IHg7XG5cdFx0XHRjaXJjbGUueSA9IHk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9saW5rTWFwW25vZGUuaW5kZXhdLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bm9kZS54ID0geDtcblx0XHRcdG5vZGUueSA9IHk7XG5cdFx0XHRjaXJjbGUueCA9IHg7XG5cdFx0XHRjaXJjbGUueSA9IHk7XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBsYWJlbCByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIGxhYmVsID0gdGhpcy5fbGFiZWxNYXBbbm9kZS5pbmRleF07XG5cdFx0aWYgKGxhYmVsKSB7XG5cdFx0XHR2YXIgbGFiZWxQb3MgPSB0aGlzLmxheW91dExhYmVsKGNpcmNsZSk7XG5cdFx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdFx0bGFiZWwudHdlZW5BdHRyKGxhYmVsUG9zLCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoaXMuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBsYWJlbFBvcykge1xuXHRcdFx0XHRcdGlmIChsYWJlbFBvcy5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuXHRcdFx0XHRcdFx0bGFiZWxbcHJvcF0gPSBsYWJlbFBvc1twcm9wXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbGluayByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX2xpbmtNYXBbbm9kZS5pbmRleF0uZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgbGlua09iaktleSA9IG51bGw7XG5cdFx0XHRpZiAobGluay5zb3VyY2UuaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0bGlua09iaktleSA9ICdzb3VyY2UnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua09iaktleSA9ICd0YXJnZXQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRcdGxpbmsudHdlZW5PYmoobGlua09iaktleSwge1xuXHRcdFx0XHRcdHg6IHgsXG5cdFx0XHRcdFx0eTogeVxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhhdC5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS54ID0geDtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS55ID0geTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogTGF5b3V0IGhhbmRsZXIuICAgQ2FsbHMgaW1wbGVtZW50aW5nIGxheW91dCByb3V0aW5lIGFuZCBwcm92aWRlcyBhIGNhbGxiYWNrIGlmIGl0J3MgYXN5bmNcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24odyxoLGNhbGxiYWNrKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGZ1bmN0aW9uIG9uQ29tcGxldGUoKSB7XG5cdFx0XHR0aGF0Ll9ldmVudHNTdXNwZW5kZWQgPSBmYWxzZTtcblx0XHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IHRydWU7XG5cdFx0dmFyIGlzQXN5bmMgPSAhdGhpcy5fcGVyZm9ybUxheW91dCh3LGgpO1xuXHRcdGlmIChpc0FzeW5jKSB7XG5cdFx0XHRzZXRUaW1lb3V0KG9uQ29tcGxldGUsdGhpcy5kdXJhdGlvbigpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0b25Db21wbGV0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRGVmYXVsdCBsYXlvdXQgdGhhdCBkb2VzIG5vdGhpbmcuICAgU2hvdWxkIGJlIG92ZXJyaWRlblxuXHQgKiBAcGFyYW0gd1xuXHQgKiBAcGFyYW0gaFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3BlcmZvcm1MYXlvdXQgOiBmdW5jdGlvbih3LGgpIHtcblxuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFx0LyoqXG5cdCAqIEhvb2sgZm9yIGRvaW5nIGFueSBkcmF3aW5nIGJlZm9yZSByZW5kZXJpbmcgb2YgdGhlIGdyYXBoIHRoYXQgaXMgbGF5b3V0IHNwZWNpZmljXG5cdCAqIGllLyBCYWNrZ3JvdW5kcywgZXRjXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXNcblx0ICogQHJldHVybnMge0FycmF5fSAtIGEgbGlzdCBvZiBwYXRoLmpzIHJlbmRlciBvYmplY3RzIHRvIGJlIGFkZGVkIHRvIHRoZSBzY2VuZVxuXHQgKi9cblx0cHJlcmVuZGVyIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBIb29rIGZvciBkb2luZyBhbnkgZHJhd2luZyBhZnRlciByZW5kZXJpbmcgb2YgdGhlIGdyYXBoIHRoYXQgaXMgbGF5b3V0IHNwZWNpZmljXG5cdCAqIGllLyBPdmVybGF5cywgZXRjXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXNcblx0ICogQHJldHVybnMge0FycmF5fSAtIGEgbGlzdCBvZiBwYXRoLmpzIHJlbmRlciBvYmplY3RzIHRvIGJlIGFkZGVkIHRvIHRoZSBzY2VuZVxuXHQgKi9cblx0cG9zdHJlbmRlciA6IGZ1bmN0aW9uKHcsaCkge1xuXHRcdHJldHVybiBbXTtcblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgbGFiZWwgcG9zaXRpb24gZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVggLSB0aGUgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVkgLSB0aGUgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gcmFkaXVzIC0gdGhlIHJhZGl1cyBvZiB0aGUgbm9kZVxuXHQgKiBAcmV0dXJucyB7e3g6IHggcG9zaXRpb24gb2YgdGhlIGxhYmVsLCB5OiB5IHBvc2l0aW9uIG9mIHRoZSBsYWJlbH19XG5cdCAqL1xuXHRsYXlvdXRMYWJlbCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0eDogbm9kZS54ICsgbm9kZS5yYWRpdXMgKyA1LFxuXHRcdFx0eTogbm9kZS55ICsgbm9kZS5yYWRpdXMgKyA1XG5cdFx0fTtcblx0fVxufSk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDtcbiIsInZhciBMSU5LX1RZUEUgPSB7XG5cdERFRkFVTFQgOiAnbGluZScsXG5cdExJTkUgOiAnbGluZScsXG5cdEFSUk9XIDogJ2Fycm93Jyxcblx0QVJDIDogJ2FyYydcbn07XG5tb2R1bGUuZXhwb3J0cyA9IExJTktfVFlQRTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExJTktfVFlQRSA9IHJlcXVpcmUoJy4vbGlua1R5cGUnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgUkVHUk9VTkRfQkJfUEFERElORyA9IDA7XG5cbi8qKlxuICogQ3JlYXRlcyBhIEdyYXBoIHJlbmRlciBvYmplY3RcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgR3JhcGggPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gW107XG5cdHRoaXMuX2xpbmtzID0gW107XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX2xheW91dGVyID0gbnVsbDtcblx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyID0gbnVsbDtcblx0dGhpcy5fd2lkdGggPSAwO1xuXHR0aGlzLl9oZWlnaHQgPSAwO1xuXHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdHRoaXMuX3pvb21MZXZlbCA9IDA7XG5cdHRoaXMuX3NjZW5lID0gbnVsbDtcblx0dGhpcy5fc2hvd0FsbExhYmVscyA9IGZhbHNlO1xuXHR0aGlzLl9wcmVyZW5kZXJHcm91cCA9IG51bGw7XG5cdHRoaXMuX3Bvc3RyZW5kZXJHcm91cCA9IG51bGw7XG5cdHRoaXMuX3Bhbm5hYmxlID0gbnVsbDtcblx0dGhpcy5fem9vbWFibGUgPSBudWxsO1xuXHR0aGlzLl9kcmFnZ2FibGUgPSBudWxsO1xuXHR0aGlzLl9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHR0aGlzLl9jdXJyZW50TW92ZVN0YXRlID0gbnVsbDtcblx0dGhpcy5faW52ZXJ0ZWRQYW4gPSAxO1xuXG5cdHRoaXMuX2ZvbnRTaXplID0gbnVsbDtcblx0dGhpcy5fZm9udEZhbWlseSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRDb2xvciA9IG51bGw7XG5cdHRoaXMuX2ZvbnRTdHJva2UgPSBudWxsO1xuXHR0aGlzLl9mb250U3Ryb2tlV2lkdGggPSBudWxsO1xuXHR0aGlzLl9zaGFkb3dDb2xvciA9IG51bGw7XG5cdHRoaXMuX3NoYWRvd09mZnNldFggPSBudWxsO1xuXHR0aGlzLl9zaGFkb3dPZmZzZXRZID0gbnVsbDtcblx0dGhpcy5fc2hhZG93Qmx1ciA9IG51bGw7XG5cblx0Ly8gRGF0YSB0byByZW5kZXIgb2JqZWN0IG1hcHNcblx0dGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSA9IHt9O1xuXHR0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSA9IHt9O1xuXHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsID0ge307XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkdyYXBoLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEdyYXBoLnByb3RvdHlwZSwge1xuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlcyBmb3IgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlcyAtIGFuIGFycmF5IG9mIG5vZGVzXG5cdCAqIHtcblx0ICogXHRcdHggOiB0aGUgeCBjb29yZGluYXRlIG9mIHRoZSBub2RlXHQocmVxdWlyZWQpXG5cdCAqIFx0XHR5IDogdGhlIHkgY29vcmRpbmF0ZSBvZiB0aGUgbm9kZVx0KHJlcXVpcmVkKVxuXHQgKlx0XHRpbmRleCA6ICBhIHVuaXF1ZSBpbmRleFx0XHRcdFx0KHJlcXVpcmVkKVxuXHQgKlx0XHRsYWJlbCA6IGEgbGFiZWwgZm9yIHRoZSBub2RlXHRcdChvcHRpb25hbClcblx0ICpcdFx0ZmlsbFN0eWxlIDogYSBjYW52YXMgZmlsbCAgIFx0XHQob3B0aW9uYWwsIGRlZmF1bHQgIzAwMDAwMClcblx0ICpcdFx0c3Ryb2tlU3R5bGUgOiBhIGNhbnZhcyBzdHJva2VcdFx0KG9wdGlvbmFsLCBkZWZhdWx0IHVuZGVmaW5lZClcblx0ICpcdFx0bGluZVdpZHRoIDogd2lkdGggb2YgdGhlIHN0cm9rZVx0XHQob3B0aW9uYWwsIGRlZmF1bHQgMSlcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgZGVmaW5lZCwge0dyYXBoLl9ub2Rlc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlcyA6IGZ1bmN0aW9uKG5vZGVzKSB7XG5cdFx0aWYgKG5vZGVzKSB7XG5cdFx0XHR0aGlzLl9ub2RlcyA9IG5vZGVzO1xuXG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lID0ge307XG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSA9IHt9O1xuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbCA9IHt9O1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0bm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRcdHRoYXQuX25vZGVJbmRleFRvTGlua0xpbmVbbm9kZS5pbmRleF0gPSBbXTt9KTtcblx0XHRcdGlmICh0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0XHR0aGlzLl9sYXlvdXRlci5ub2Rlcyhub2Rlcyk7XG5cdFx0XHR9XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRub2RlV2l0aEluZGV4IDogZnVuY3Rpb24obm9kZUluZGV4KSB7XG5cdFx0cmV0dXJuIHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlW25vZGVJbmRleF07XG5cdH0sXG5cblx0bGFiZWxXaXRoSW5kZXggOiBmdW5jdGlvbihub2RlSW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlSW5kZXhdO1xuXHR9LFxuXG5cdHVwZGF0ZU5vZGUgOiBmdW5jdGlvbihub2RlSW5kZXgscHJvcHMpIHtcblx0XHQvLyBUT0RPOiAgcmVtb3ZlIG11Y2tpbmcgd2l0aCBwb3NpdGlvbiBzZXR0aW5ncyBmcm9tIHByb3BzP1xuXHRcdGlmIChub2RlSW5kZXgpIHtcblx0XHRcdHZhciBjaXJjbGUgPSB0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZVtub2RlSW5kZXhdO1xuXHRcdFx0Y2lyY2xlID0gXy5leHRlbmQoY2lyY2xlLHByb3BzKTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlW25vZGVJbmRleF0gPSBjaXJjbGU7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH1cblx0fSxcblxuXHR1cGRhdGVMYWJlbCA6IGZ1bmN0aW9uKG5vZGVJbmRleCxwcm9wcykge1xuXHRcdC8vIFRPRE86ICByZW1vdmUgbXVja2luZyB3aXRoIHBvc2l0aW9uIHNldHRpbmdzIGZyb20gcHJvcHM/XG5cdFx0aWYgKG5vZGVJbmRleCkge1xuXHRcdFx0dmFyIHRleHQgPSB0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGVJbmRleF07XG5cdFx0XHR0ZXh0ID0gXy5leHRlbmQodGV4dCxwcm9wcyk7XG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGVJbmRleF0gPSB0ZXh0O1xuXHRcdH1cblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxpbmtzIC0gYW4gYXJyYXkgb2YgbGlua3Ncblx0ICoge1xuXHQgKiBcdFx0c291cmNlIDogYSBub2RlIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzb3VyY2UgXHQocmVxdWlyZWQpXG5cdCAqIFx0XHR0YXJnZXQgOiBhIG5vZGUgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHRhcmdldFx0KHJlcXVpcmVkKVxuXHQgKlx0XHRzdHJva2VTdHlsZSA6IGEgY2FudmFzIHN0cm9rZVx0XHRcdFx0XHRcdChvcHRpb25hbCwgZGVmYXVsdCAjMDAwMDAwKVxuXHQgKlx0XHRsaW5lV2lkdGggOiB0aGUgd2lkdGggb2YgdGhlIHN0cm9rZVx0XHRcdFx0XHQob3B0aW5hbCwgZGVmYXVsdCAxKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGxpbmtzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB7R3JhcGguX2xpbmtzfSBvdGhlcndpc2Vcblx0ICovXG5cdGxpbmtzIDogZnVuY3Rpb24obGlua3MpIHtcblx0XHRpZiAobGlua3MpIHtcblx0XHRcdHRoaXMuX2xpbmtzID0gbGlua3M7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9saW5rcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMgdGhlIGxpbmtzIGJldHdlZW4gdHdvIG5vZGVzXG5cdCAqIEBwYXJhbSBzb3VyY2VOb2RlSW5kZXggLSBJbmRleCBvZiBzb3VyY2Ugbm9kZSwgaWYgbnVsbCwgcmV0dXJuIGFsbCBsaW5rcyBnb2luZyB0byB0YXJnZXRcblx0ICogQHBhcmFtIHRhcmdldE5vZGVJbmRleCAtIEluZGV4IG9mIHRhcmdldCBub2RlLCBpZiBudWxsLCByZXR1cm4gYWxsIGxpbmtzIHN0YXJ0aW5nIGZyb20gc291cmNlXG5cdCAqL1xuXHRsaW5rT2JqZWN0c0JldHdlZW4gOiBmdW5jdGlvbihzb3VyY2VOb2RlSW5kZXgsdGFyZ2V0Tm9kZUluZGV4KSB7XG5cdFx0ZnVuY3Rpb24gaXNQcm92aWRlZChwYXJhbSkge1xuXHRcdFx0aWYgKHBhcmFtID09PSB1bmRlZmluZWQgfHwgcGFyYW0gPT09IG51bGwpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGlzUHJvdmlkZWQoc291cmNlTm9kZUluZGV4KSAmJiAhaXNQcm92aWRlZCh0YXJnZXROb2RlSW5kZXgpKSB7XG5cdFx0XHR2YXIgYWxsU291cmNlID0gdGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZVtzb3VyY2VOb2RlSW5kZXhdO1xuXHRcdFx0dmFyIGp1c3RTb3VyY2UgPSBhbGxTb3VyY2UuZmlsdGVyKGZ1bmN0aW9uKGxpbmspIHtcblx0XHRcdFx0cmV0dXJuIGxpbmsuc291cmNlLmluZGV4ID09PSBzb3VyY2VOb2RlSW5kZXg7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBqdXN0U291cmNlO1xuXHRcdH0gZWxzZSBpZiAoIWlzUHJvdmlkZWQoc291cmNlTm9kZUluZGV4KSAmJiBpc1Byb3ZpZGVkKHRhcmdldE5vZGVJbmRleCkpIHtcblx0XHRcdHZhciBhbGxUYXJnZXQgPSB0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lW3RhcmdldE5vZGVJbmRleF07XG5cdFx0XHR2YXIganVzdFRhcmdldCA9IGFsbFRhcmdldC5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuXHRcdFx0XHRyZXR1cm4gbGluay50YXJnZXQuaW5kZXggPT09IHRhcmdldE5vZGVJbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGp1c3RUYXJnZXQ7XG5cdFx0fSBlbHNlIGlmIChpc1Byb3ZpZGVkKHNvdXJjZU5vZGVJbmRleCkgJiYgaXNQcm92aWRlZCh0YXJnZXROb2RlSW5kZXgpKSB7XG5cdFx0XHR2YXIgc291cmNlTGlua3MgPSB0aGlzLmxpbmtPYmplY3RzQmV0d2Vlbihzb3VyY2VOb2RlSW5kZXgsbnVsbCk7XG5cdFx0XHR2YXIgdG9UYXJnZXQgPSBzb3VyY2VMaW5rcy5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuXHRcdFx0XHRyZXR1cm4gbGluay50YXJnZXQuaW5kZXggPT09IHRhcmdldE5vZGVJbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRvVGFyZ2V0O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGNhbnZhcyBmb3IgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBhbiBIVE1MIGNhbnZhcyBvYmplY3Rcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBjYW52YXMgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHRoZSBjYW52YXMgb3RoZXJ3aXNlXG5cdCAqL1xuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cblx0XHRcdHZhciB4LHk7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNlZG93bicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR4ID0gZS5jbGllbnRYO1xuXHRcdFx0XHR5ID0gZS5jbGllbnRZO1xuXHRcdFx0XHQkKHRoYXQuX2NhbnZhcykub24oJ21vdXNlbW92ZScsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHZhciBkeCA9IHggLSBlLmNsaWVudFg7XG5cdFx0XHRcdFx0dmFyIGR5ID0geSAtIGUuY2xpZW50WTtcblx0XHRcdFx0XHRpZiAodGhhdC5fZHJhZ2dhYmxlICYmIHRoYXQuX2N1cnJlbnRPdmVyTm9kZSAmJiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gbnVsbCB8fCB0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAnZHJhZ2dpbmcnKSkgIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSAnZHJhZ2dpbmcnO1xuXG5cdFx0XHRcdFx0XHQvLyBNb3ZlIHRoZSBub2RlXG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlKHRoYXQuX2N1cnJlbnRPdmVyTm9kZSwgdGhhdC5fY3VycmVudE92ZXJOb2RlLnggLSBkeCwgdGhhdC5fY3VycmVudE92ZXJOb2RlLnkgLSBkeSk7XG5cdFx0XHRcdFx0XHR0aGF0LnVwZGF0ZSgpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fcGFubmFibGUgJiYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09IG51bGwgfHwgdGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ3Bhbm5pbmcnKSkge1xuXHRcdFx0XHRcdFx0dGhhdC5fcGFuKC1keCp0aGF0Ll9pbnZlcnRlZFBhbiwtZHkqdGhhdC5faW52ZXJ0ZWRQYW4pO1xuXHRcdFx0XHRcdFx0dGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9ICdwYW5uaW5nJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0eCA9IGUuY2xpZW50WDtcblx0XHRcdFx0XHR5ID0gZS5jbGllbnRZO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNldXAnLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKHRoYXQuX2NhbnZhcykub2ZmKCdtb3VzZW1vdmUnKTtcblx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSBudWxsO1xuXHRcdFx0fSk7XG5cblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0IHdpZHRoXG5cdCAqIEByZXR1cm5zIFdpZHRoIGluIHBpeGVscyBvZiB0aGUgZ3JhcGhcblx0ICovXG5cdHdpZHRoIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NjZW5lLndpZHRoO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgaGVpZ2h0XG5cdCAqIEByZXR1cm5zIEhlaWdodCBpbiBwaXhlbHMgb2YgdGhlIGdyYXBoXG5cdCAqL1xuXHRoZWlnaHQgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2NlbmUuaGVpZ2h0O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBUb2dnbGVzIGJvb2xlYW4gZm9yIHNob3dpbmcvaGlkaW5nIGFsbCBsYWJlbHMgaW4gdGhlIGdyYXBoIGJ5IGRlZmF1bHRcblx0ICogQHBhcmFtIHNob3dBbGxMYWJlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRzaG93QWxsTGFiZWxzIDogZnVuY3Rpb24oc2hvd0FsbExhYmVscykge1xuXHRcdGlmIChzaG93QWxsTGFiZWxzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuX3Nob3dBbGxMYWJlbHMgPSBzaG93QWxsTGFiZWxzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fc2hvd0FsbExhYmVscztcblx0XHR9XG5cblx0XHQvLyBVcGRhdGVcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRpZiAoc2hvd0FsbExhYmVscykge1xuXHRcdFx0XHR0aGF0LmFkZExhYmVsKG5vZGUsbm9kZS5sYWJlbFRleHQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhhdC5yZW1vdmVMYWJlbChub2RlLG5vZGUubGFiZWxUZXh0KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBBZGRzIGEgbGFiZWwgZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKiBAcGFyYW0gdGV4dFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRhZGRMYWJlbCA6IGZ1bmN0aW9uKG5vZGUsdGV4dCkge1xuXHRcdGlmICh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdKSB7XG5cdFx0XHR0aGlzLnJlbW92ZUxhYmVsKG5vZGUpO1xuXHRcdH1cblx0XHR2YXIgbGFiZWxBdHRycyA9IHRoaXMuX2xheW91dGVyLmxheW91dExhYmVsKG5vZGUpO1xuXG5cdFx0dmFyIGZvbnRTaXplID0gdHlwZW9mKHRoaXMuX2ZvbnRTaXplKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTaXplKG5vZGUpIDogdGhpcy5fZm9udFNpemU7XG5cdFx0aWYgKCFmb250U2l6ZSkge1xuXHRcdFx0Zm9udFNpemUgPSAxMDtcblx0XHR9XG5cblx0XHR2YXIgZm9udEZhbWlseSA9IHR5cGVvZih0aGlzLl9mb250RmFtaWx5KSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRGYW1pbHkobm9kZSkgOiB0aGlzLl9mb250RmFtaWx5O1xuXHRcdGlmICghZm9udEZhbWlseSkge1xuXHRcdFx0Zm9udEZhbWlseSA9ICdzYW5zLXNlcmlmJztcblx0XHR9XG5cdFx0dmFyIGZvbnRTdHIgPSBmb250U2l6ZSArICdweCAnICsgZm9udEZhbWlseTtcblxuXHRcdHZhciBmb250RmlsbCA9IHR5cGVvZih0aGlzLl9mb250Q29sb3IpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udENvbG9yKG5vZGUpIDogdGhpcy5fZm9udENvbG9yO1xuXHRcdGlmICghZm9udEZpbGwpIHtcblx0XHRcdGZvbnRGaWxsID0gJyMwMDAwMDAnO1xuXHRcdH1cblx0XHR2YXIgZm9udFN0cm9rZSA9IHR5cGVvZih0aGlzLl9mb250U3Ryb2tlKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTdHJva2Uobm9kZSkgOiB0aGlzLl9mb250U3Ryb2tlO1xuXHRcdHZhciBmb250U3Ryb2tlV2lkdGggPSB0eXBlb2YodGhpcy5fZm9udFN0cm9rZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U3Ryb2tlV2lkdGggOiB0aGlzLl9mb250U3Ryb2tlV2lkdGg7XG5cblx0XHR2YXIgbGFiZWxTcGVjID0ge1xuXHRcdFx0Zm9udDogZm9udFN0cixcblx0XHRcdGZpbGxTdHlsZTogZm9udEZpbGwsXG5cdFx0XHRzdHJva2VTdHlsZTogZm9udFN0cm9rZSxcblx0XHRcdGxpbmVXaWR0aDogZm9udFN0cm9rZVdpZHRoLFxuXHRcdFx0dGV4dCA6IHRleHRcblx0XHR9O1xuXG5cdFx0dmFyIGJBZGRTaGFkb3cgPSB0aGlzLl9zaGFkb3dCbHVyIHx8IHRoaXMuX3NoYWRvd09mZnNldFggfHwgdGhpcy5fc2hhZG93T2Zmc2V0WSB8fCB0aGlzLl9zaGFkb3dDb2xvcjtcblx0XHRpZiAoYkFkZFNoYWRvdykge1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dDb2xvciddID0gdGhpcy5fc2hhZG93Q29sb3IgfHwgJyMwMDAnO1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dPZmZzZXRYJ10gPSB0aGlzLl9zaGFkb3dPZmZzZXRYIHx8IDA7XG5cdFx0XHRsYWJlbFNwZWNbJ3NoYWRvd09mZnNldFknXSA9IHRoaXMuX3NoYWRvd09mZnNldFkgfHwgMDtcblx0XHRcdGxhYmVsU3BlY1snc2hhZG93Qmx1ciddID0gdGhpcy5fc2hhZG93Qmx1ciB8fCBNYXRoLmZsb29yKGZvbnRTaXplLzMpO1xuXHRcdH1cblxuXHRcdGZvciAodmFyIGtleSBpbiBsYWJlbEF0dHJzKSB7XG5cdFx0XHRpZiAobGFiZWxBdHRycy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdGxhYmVsU3BlY1trZXldID0gbGFiZWxBdHRyc1trZXldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgbGFiZWwgPSBwYXRoLnRleHQobGFiZWxTcGVjKTtcblx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdID0gbGFiZWw7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQobGFiZWwpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgYSBsYWJlbCBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHJlbW92ZUxhYmVsIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdHZhciB0ZXh0T2JqZWN0ID0gdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHRpZiAodGV4dE9iamVjdCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGV4dE9iamVjdCk7XG5cdFx0XHRkZWxldGUgdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIG1vdXNlb3ZlciBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycgaW4gdGhlIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVPdmVyIDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdmVyID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRXZlbnQgaGFuZGxlciBmb3IgbW91c2VvdXQgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlT3V0IDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdXQgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDb252ZW5pZW5jZSBmdW5jdGlvbiBmb3Igc2V0dGluZyBub2RlT3Zlci9ub2RlT3V0IGluIGEgc2luZ2xlIGNhbGxcblx0ICogQHBhcmFtIG92ZXIgLSB0aGUgbm9kZU92ZXIgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gb3V0IC0gdGhlIG5vZGVPdXQgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlSG92ZXIgOiBmdW5jdGlvbihvdmVyLG91dCxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5ub2RlT3ZlcihvdmVyLHNlbGYpO1xuXHRcdHRoaXMubm9kZU91dChvdXQsc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIGNsaWNrIG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJy4gICBEZWZhdWx0cyB0byB0aGUgZ3JhcGggb2JqZWN0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVDbGljayA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlQ2xpY2sgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQYW4ge0dyYXBofSBieSAoZHgsZHkpLiAgIEF1dG9tYXRpY2FsbHkgcmVyZW5kZXIgdGhlIGdyYXBoLlxuXHQgKiBAcGFyYW0gZHggLSBBbW91bnQgb2YgcGFuIGluIHggZGlyZWN0aW9uXG5cdCAqIEBwYXJhbSBkeSAtIEFtb3VudCBvZiBwYW4gaW4geSBkaXJlY3Rpb25cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9wYW4gOiBmdW5jdGlvbihkeCxkeSkge1xuXHRcdHRoaXMuX3NjZW5lLnggKz0gZHg7XG5cdFx0dGhpcy5fc2NlbmUueSArPSBkeTtcblx0XHR0aGlzLl9wYW5YICs9IGR4O1xuXHRcdHRoaXMuX3BhblkgKz0gZHk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogTWFrZSB7R3JhcGh9IHBhbm5hYmxlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHBhbm5hYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fcGFubmFibGUgPSB0cnVlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlcyB0aGUgZ3JhcGggcGFuIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24gb2YgdGhlIG1vdXNlIGFzIG9wcG9zZWQgdG8gd2l0aCBpdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRpbnZlcnRQYW4gOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9pbnZlcnRlZFBhbiA9IC0xO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlIG5vZGVzIGluIHtHcmFwaH0gcmVwb2lzaXRpb25hYmxlIGJ5IGNsaWNrLWRyYWdnaW5nXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGRyYWdnYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2RyYWdnYWJsZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2dldFpvb21Gb3JMZXZlbCA6IGZ1bmN0aW9uKGxldmVsKSB7XG5cdFx0dmFyIGZhY3RvciA9IE1hdGgucG93KDEuNSAsIE1hdGguYWJzKGxldmVsIC0gdGhpcy5fem9vbUxldmVsKSk7XG5cdFx0aWYgKGxldmVsIDwgdGhpcy5fem9vbUxldmVsKSB7XG5cdFx0XHRmYWN0b3IgPSAxL2ZhY3Rvcjtcblx0XHR9XG5cdFx0cmV0dXJuIGZhY3Rvcjtcblx0fSxcblxuXHRfem9vbSA6IGZ1bmN0aW9uKGZhY3Rvcix4LHkpIHtcblx0XHR0aGlzLl96b29tU2NhbGUgKj0gZmFjdG9yO1xuXHRcdHRoaXMuX2xheW91dGVyLl96b29tU2NhbGUgPSB0aGlzLl96b29tU2NhbGU7XG5cblx0XHQvLyBQYW4gc2NlbmUgYmFjayB0byBvcmlnaW5cblx0XHR2YXIgb3JpZ2luYWxYID0gdGhpcy5fc2NlbmUueDtcblx0XHR2YXIgb3JpZ2luYWxZID0gdGhpcy5fc2NlbmUueTtcblx0XHR0aGlzLl9wYW4oLXRoaXMuX3NjZW5lLngsLXRoaXMuX3NjZW5lLnkpO1xuXG5cdFx0dmFyIG1vdXNlWCA9IHggfHwgMDtcblx0XHR2YXIgbW91c2VZID0geSB8fCAwO1xuXG5cdFx0Ly8gJ1pvb20nIG5vZGVzLiAgIFdlIGRvIHRoaXMgc28gdGV4dC9yYWRpdXMgc2l6ZSByZW1haW5zIGNvbnNpc3RlbnQgYWNyb3NzIHpvb20gbGV2ZWxzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9ub2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbih0aGlzLl9ub2Rlc1tpXSx0aGlzLl9ub2Rlc1tpXS54KmZhY3RvciwgdGhpcy5fbm9kZXNbaV0ueSpmYWN0b3IsdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gWm9vbSB0aGUgcmVuZGVyIGdyb3Vwc1xuXHRcdHRoaXMuX2FkZFByZUFuZFBvc3RSZW5kZXJPYmplY3RzKCk7XG5cblxuXHRcdC8vIFJldmVyc2UgdGhlICdvcmlnaW4gcGFuJyB3aXRoIHRoZSBzY2FsZSBhcHBsaWVkIGFuZCByZWNlbnRlciB0aGUgbW91c2Ugd2l0aCBzY2FsZSBhcHBsaWVkIGFzIHdlbGxcblx0XHR2YXIgbmV3TW91c2VYID0gbW91c2VYKmZhY3Rvcjtcblx0XHR2YXIgbmV3TW91c2VZID0gbW91c2VZKmZhY3Rvcjtcblx0XHR0aGlzLl9wYW4ob3JpZ2luYWxYKmZhY3RvciAtIChuZXdNb3VzZVgtbW91c2VYKSxvcmlnaW5hbFkqZmFjdG9yIC0gKG5ld01vdXNlWS1tb3VzZVkpKTtcblxuXG5cdFx0Ly8gVXBkYXRlIHRoZSByZWdyb3VwIHVuZGVybGF5c1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXAgJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4gJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLl9oYW5kbGVHcm91cC5yZW1vdmVBbGwoKTtcblx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0dGhhdC5fYWRkUmVncm91cEhhbmRsZXMoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Uge0dyYXBofSB6b29tYWJsZSBieSB1c2luZyB0aGUgbW91c2V3aGVlbFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHR6b29tYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy5fem9vbWFibGUpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2V3aGVlbCcsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgd2hlZWwgPSBlLm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YS8xMjA7Ly9uIG9yIC1uXG5cdFx0XHRcdHZhciBmYWN0b3I7XG5cdFx0XHRcdGlmICh3aGVlbCA8IDApIHtcblx0XHRcdFx0XHRmYWN0b3IgPSB0aGF0Ll9nZXRab29tRm9yTGV2ZWwodGhhdC5fem9vbUxldmVsLTEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZhY3RvciA9IHRoYXQuX2dldFpvb21Gb3JMZXZlbCh0aGF0Ll96b29tTGV2ZWwrMSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5fem9vbShmYWN0b3IsIGUub2Zmc2V0WCwgZS5vZmZzZXRZKTtcblxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLl96b29tYWJsZSA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBsYXlvdXQgZnVuY3Rpb24gZm9yIHRoZSBub2Rlc1xuXHQgKiBAcGFyYW0gbGF5b3V0ZXIgLSBBbiBpbnN0YW5jZSAob3Igc3ViY2xhc3MpIG9mIExheW91dFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlzIGxheW91dGVyIHBhcmFtIGlzIGRlZmluZWQsIHRoZSBsYXlvdXRlciBvdGhlcndpc2Vcblx0ICovXG5cdGxheW91dGVyIDogZnVuY3Rpb24obGF5b3V0ZXIpIHtcblx0XHRpZiAobGF5b3V0ZXIpIHtcblx0XHRcdHRoaXMuX2xheW91dGVyID0gbGF5b3V0ZXI7XG5cdFx0XHR0aGlzLl9sYXlvdXRlclxuXHRcdFx0XHQubm9kZXModGhpcy5fbm9kZXMpXG5cdFx0XHRcdC5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHRcdC5ub2RlTWFwKHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKVxuXHRcdFx0XHQubGFiZWxNYXAodGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9sYXlvdXRlcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFBlcmZvcm1zIGEgbGF5b3V0IG9mIHRoZSBncmFwaFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdGlmICh0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIubGF5b3V0KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHJlZ3JvdXAgdW5kZXJsYXlzXG5cdFx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXAgJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4pIHtcblx0XHRcdFx0dmFyIHVuZGVybGF5cyA9IHRoaXMuX2hhbmRsZUdyb3VwLmNoaWxkcmVuO1xuXHRcdFx0XHR1bmRlcmxheXMuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVPYmplY3QpIHtcblx0XHRcdFx0XHR2YXIgaW5kaWNlcyA9IGhhbmRsZU9iamVjdC5ncmFwaGpzX2luZGljZXM7XG5cdFx0XHRcdFx0dmFyIGJiID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcywgUkVHUk9VTkRfQkJfUEFERElORyk7XG5cdFx0XHRcdFx0aWYgKGhhbmRsZU9iamVjdC5ncmFwaGpzX3R5cGUgPT09ICdyZWdyb3VwX3VuZGVybGF5Jykge1xuXHRcdFx0XHRcdFx0aGFuZGxlT2JqZWN0LnR3ZWVuQXR0cih7XG5cdFx0XHRcdFx0XHRcdHg6IGJiLngsXG5cdFx0XHRcdFx0XHRcdHk6IGJiLnksXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBiYi53aWR0aCxcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBiYi5oZWlnaHRcblx0XHRcdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2xheW91dGVyLmR1cmF0aW9uKCksXG5cdFx0XHRcdFx0XHRcdGVhc2luZzogdGhhdC5fbGF5b3V0ZXIuZWFzaW5nKClcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoaGFuZGxlT2JqZWN0LmdyYXBoanNfdHlwZSA9PT0gJ3JlZ3JvdXBfaWNvbicpIHtcblx0XHRcdFx0XHRcdHZhciB1bmdyb3VwZWROb2RlcyA9IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5nZXRVbmdyb3VwZWROb2Rlc0ZvcktleShoYW5kbGVPYmplY3QuZ3JhcGhqc19ncm91cF9rZXkpO1xuXHRcdFx0XHRcdFx0dmFyIGljb25Qb3NpdGlvbiA9IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5nZXRNaW5pbWl6ZUljb25Qb3NpdGlvbihiYix1bmdyb3VwZWROb2Rlcyk7XG5cdFx0XHRcdFx0XHRoYW5kbGVPYmplY3QudHdlZW5BdHRyKHtcblx0XHRcdFx0XHRcdFx0eDogaWNvblBvc2l0aW9uLngsXG5cdFx0XHRcdFx0XHRcdHk6IGljb25Qb3NpdGlvbi55XG5cdFx0XHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0XHRcdGR1cmF0aW9uOiB0aGF0Ll9sYXlvdXRlci5kdXJhdGlvbigpLFxuXHRcdFx0XHRcdFx0XHRlYXNpbmc6IHRoYXQuX2xheW91dGVyLmVhc2luZygpXG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGdyb3VwaW5nIG1hbmFnZXIuXG5cdCAqIEBwYXJhbSBncm91cGluZ01hbmFnZXJcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRncm91cGluZ01hbmFnZXIgOiBmdW5jdGlvbihncm91cGluZ01hbmFnZXIpIHtcblx0XHRpZiAoZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR0aGlzLl9ncm91cGluZ01hbmFnZXIgPSBncm91cGluZ01hbmFnZXI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ncm91cGluZ01hbmFnZXI7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplcyB0aGUgZ3JvdXBpbmcgbWFuYWdlciBwcm92aWRlZCBhbmQgY2FsbHMgdGhlIG1ldGhvZHMgZm9yIGFnZ3JlZ2F0aW5nIG5vZGVzIGFuZCBsaW5rc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRpbml0aWFsaXplR3JvdXBpbmcgOiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpcy5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR0aGlzLl9ncm91cGluZ01hbmFnZXIubm9kZXModGhpcy5fbm9kZXMpXG5cdFx0XHRcdC5saW5rcyh0aGlzLl9saW5rcylcblx0XHRcdFx0LmluaXRpYWxpemVIZWlyYXJjaHkoKTtcblxuXHRcdFx0dGhpcy5ub2Rlcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpO1xuXHRcdFx0dGhpcy5saW5rcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogVW5ncm91cHMgdGhlIHByb2RpZGVkIGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlIC0gdGhlIGFnZ3JlZ2F0ZSBub2RlIHRvIGJlIHVuZ3JvdXBlZFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHR1bmdyb3VwIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdGlmICghbm9kZSB8fCAhbm9kZS5jaGlsZHJlbikge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR0aGlzLl9ncm91cGluZ01hbmFnZXIudW5ncm91cChub2RlKTtcblx0XHRcdHRoaXMuY2xlYXIoKVxuXHRcdFx0XHQubm9kZXModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWROb2RlcygpKVxuXHRcdFx0XHQubGlua3ModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWRMaW5rcygpKVxuXHRcdFx0XHQuZHJhdygpO1xuXG5cdFx0XHR0aGlzLl9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUodHJ1ZSk7XG5cdFx0XHR0aGlzLmxheW91dCgpO1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKGZhbHNlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlZ3JvdXBzIHRoZSBhZ2dyZWdhdGUgbm9kZS4gICBDYW4gYmUgY2FsbGVkIHByb2dyYW1hdHRpY2FsbHkgYnV0IGlzIGF1dG9tYXRpY2FsbHkgaW52b2tlZCB3aGVuIGNsaWNraW5nIG9uIHRoZVxuXHQgKiByZWdyb3VwIGhhbmRsZXJcblx0ICogQHBhcmFtIHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleVxuXHQgKi9cblx0cmVncm91cCA6IGZ1bmN0aW9uKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSkge1xuXHRcdC8vIEFuaW1hdGUgdGhlIHJlZ3JvdXBcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dmFyIHBhcmVudEFnZ3JlZ2F0ZSA9IHRoaXMuX2dyb3VwaW5nTWFuYWdlci5nZXRBZ2dyZWdhdGUodW5ncm91cGVkQWdncmVnYXRlS2V5KTtcblxuXHRcdHZhciBhdmdQb3MgPSB7IHg6IDAsIHkgOiAwfTtcblx0XHR2YXIgbWF4UmFkaXVzID0gMDtcblx0XHRwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0YXZnUG9zLnggKz0gY2hpbGQueDtcblx0XHRcdGF2Z1Bvcy55ICs9IGNoaWxkLnk7XG5cdFx0fSk7XG5cdFx0YXZnUG9zLnggLz0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmxlbmd0aDtcblx0XHRhdmdQb3MueSAvPSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubGVuZ3RoO1xuXG5cdFx0dmFyIGluZGV4T2ZDaGlsZHJlbiA9IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5tYXAoZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5fYWdncmVnYXRlZE5vZGVzW2ldLmluZGV4ID09PSBjaGlsZC5pbmRleCkge1xuXHRcdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dmFyIG1pbkNoaWxkSW5kZXggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGluZGV4T2ZDaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGlkeCkge1xuXHRcdFx0bWluQ2hpbGRJbmRleCA9IE1hdGgubWluKG1pbkNoaWxkSW5kZXgsaWR4KTtcblx0XHR9KTtcblxuXHRcdHZhciBhbmltYXRlZFJlZ3JvdXBlZCA9IDA7XG5cdFx0dGhpcy5fc3VzcGVuZEV2ZW50cygpO1x0XHRcdC8vIGxheW91dCB3aWxsIHJlc3VtZSB0aGVtXG5cdFx0cGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblxuXHRcdFx0Ly9UT0RPOiAgIFdoZW4gd2UgY2FuIHN1cHBvcnQgdHJhbnNwYXJlbnQgdGV4dCBpbiBwYXRoLCBmYWRlIG91dCB0aGUgbGFiZWwgYXMgd2UgbW92ZSBpdCB0b2dldGhlciBpZiBpdCdzIHNob3dpbmdcblxuXHRcdFx0dGhhdC5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbihjaGlsZCxhdmdQb3MueCxhdmdQb3MueSxmYWxzZSxmdW5jdGlvbigpIHtcblx0XHRcdFx0YW5pbWF0ZWRSZWdyb3VwZWQrKztcblx0XHRcdFx0aWYgKGFuaW1hdGVkUmVncm91cGVkID09PSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0XHRcdFx0dmFyIHJlZ3JvdXBlZEFnZ3JlZ2F0ZSA9IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5yZWdyb3VwKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSxtaW5DaGlsZEluZGV4KTtcblx0XHRcdFx0XHRcdHJlZ3JvdXBlZEFnZ3JlZ2F0ZS54ID0gYXZnUG9zLng7XG5cdFx0XHRcdFx0XHRyZWdyb3VwZWRBZ2dyZWdhdGUueSA9IGF2Z1Bvcy55O1xuXHRcdFx0XHRcdFx0dGhhdC5jbGVhcigpXG5cdFx0XHRcdFx0XHRcdC5ub2Rlcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpXG5cdFx0XHRcdFx0XHRcdC5saW5rcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpO1xuXHRcdFx0XHRcdFx0dGhhdC5kcmF3KCk7XG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUodHJ1ZSk7XG5cdFx0XHRcdFx0XHR0aGF0LmxheW91dCgpO1xuXHRcdFx0XHRcdFx0dGhhdC5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKGZhbHNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzaXplIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTaXplIC0gc2l6ZSBvZiB0aGUgZm9udCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U2l6ZSBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRTaXplfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTaXplIDogZnVuY3Rpb24oZm9udFNpemUpIHtcblx0XHRpZiAoZm9udFNpemUpIHtcblx0XHRcdHRoaXMuX2ZvbnRTaXplID0gZm9udFNpemU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250U2l6ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBjb2xvdXIgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udENvbG91ciAtIEEgaGV4IHN0cmluZyBmb3IgdGhlIGNvbG91ciBvZiB0aGUgbGFiZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udENvbG91ciBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRDb2xvdXJ9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udENvbG91ciA6IGZ1bmN0aW9uKGZvbnRDb2xvdXIpIHtcblx0XHRpZiAoZm9udENvbG91cikge1xuXHRcdFx0dGhpcy5fZm9udENvbG9yID0gZm9udENvbG91cjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRDb2xvcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzdHJva2UgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udFN0cm9rZSAtIEEgaGV4IHN0cmluZyBmb3IgdGhlIGNvbG9yIG9mIHRoZSBsYWJlbCBzdHJva2Vcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U3Ryb2tlIHBhcmFtIGlzIGRlZmluZWQsIHtHcmFwaC5fZm9udFN0cm9rZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U3Ryb2tlIDogZnVuY3Rpb24oZm9udFN0cm9rZSkge1xuXHRcdGlmIChmb250U3Ryb2tlKSB7XG5cdFx0XHR0aGlzLl9mb250U3Ryb2tlID0gZm9udFN0cm9rZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTdHJva2U7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc3Ryb2tlIHdpZHRoIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTdHJva2VXaWR0aCAtIHNpemUgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFN0cm9rZVdpZHRoIHBhcmFtIGlzIGRlZmluZWQsIHtHcmFwaC5fZm9udFN0cm9rZVdpZHRofSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTdHJva2VXaWR0aCA6IGZ1bmN0aW9uKGZvbnRTdHJva2VXaWR0aCkge1xuXHRcdGlmIChmb250U3Ryb2tlV2lkdGgpIHtcblx0XHRcdHRoaXMuX2ZvbnRTdHJva2VXaWR0aCA9IGZvbnRTdHJva2VXaWR0aDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTdHJva2VXaWR0aDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBmYW1pbHkgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udEZhbWlseSAtIEEgc3RyaW5nIGZvciB0aGUgZm9udCBmYW1pbHkgKGEgbGEgSFRNTDUgQ2FudmFzKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRGYW1pbHkgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250RmFtaWx5fSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRGYW1pbHkgOiBmdW5jdGlvbihmb250RmFtaWx5KSB7XG5cdFx0aWYgKGZvbnRGYW1pbHkpIHtcblx0XHRcdHRoaXMuX2ZvbnRGYW1pbHkgPSBmb250RmFtaWx5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udEZhbWlseTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzaGFkb3cgcHJvcGVydGllcyBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBjb2xvciAtIHRoZSBjb2xvdXIgb2YgdGhlIHNoYWRvd1xuXHQgKiBAcGFyYW0gb2Zmc2V0WCAtIHRoZSB4IG9mZnNldCBvZiB0aGUgc2hhZG93IGZyb20gY2VudGVyXG5cdCAqIEBwYXJhbSBvZmZzZXRZIC0gdGhlIHkgb2Zmc2V0IG9mIHRoZSBzaGFkb3cgZnJvbSBjZW50ZXJcblx0ICogQHBhcmFtIGJsdXIgLSB0aGUgYW1vdW50IG9mIGJsdXIgYXBwbGllZCB0byB0aGUgc2hhZG93IGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGZvbnRTaGFkb3cgOiBmdW5jdGlvbihjb2xvcixvZmZzZXRYLG9mZnNldFksYmx1cikge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb2xvcjogdGhpcy5fc2hhZG93Q29sb3IsXG5cdFx0XHRcdG9mZnNldFg6IHRoaXMuX3NoYWRvd09mZnNldFgsXG5cdFx0XHRcdG9mZnNldFk6IHRoaXMuX3NoYWRvd09mZnNldFksXG5cdFx0XHRcdGJsdXI6IHRoaXMuX3NoYWRvd0JsdXJcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3NoYWRvd0NvbG9yID0gY29sb3I7XG5cdFx0XHR0aGlzLl9zaGFkb3dPZmZzZXRYID0gb2Zmc2V0WDtcblx0XHRcdHRoaXMuX3NoYWRvd09mZnNldFkgPSBvZmZzZXRZO1xuXHRcdFx0dGhpcy5fc2hhZG93Qmx1ciA9IGJsdXI7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlc2l6ZSB0aGUgZ3JhcGguICBBdXRvbWF0aWNhbGx5IHBlcmZvcm1zIGxheW91dCBhbmQgcmVyZW5kZXJzIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gdyAtIHRoZSBuZXcgd2lkdGhcblx0ICogQHBhcmFtIGggLSB0aGUgbmV3IGhlaWdodFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRyZXNpemUgOiBmdW5jdGlvbih3LGgpIHtcblx0XHR0aGlzLl93aWR0aCA9IHc7XG5cdFx0dGhpcy5faGVpZ2h0ID0gaDtcblx0XHQkKHRoaXMuX2NhbnZhcykuYXR0cih7d2lkdGg6dyxoZWlnaHQ6aH0pXG5cdFx0XHQud2lkdGgodylcblx0XHRcdC5oZWlnaHQoaCk7XG5cdFx0dGhpcy5fc2NlbmUucmVzaXplKHcsaCk7XG5cblx0XHRpZiAoIXRoaXMuX3Bhbm5hYmxlICYmICF0aGlzLl96b29tYWJsZSkge1xuXHRcdFx0dGhpcy5sYXlvdXQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGEgbGlzdCBvZiBwcmUvcG9zdCByZW5kZXIgb2JqZWN0cyBmcm9tIHRoZSBsYXlvdXRlciAoaWYgYW55KVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FkZFByZUFuZFBvc3RSZW5kZXJPYmplY3RzIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAucmVtb3ZlQWxsKCk7XG5cblx0XHQvLyBHZXQgdGhlIGJhY2tncm91bmQgb2JqZWN0cyBmcm9tIHRoZSBsYXlvdXRlclxuXHRcdHZhciBvYmpzID0gdGhpcy5fbGF5b3V0ZXIucHJlcmVuZGVyKHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmIChvYmpzKSB7XG5cdFx0XHRvYmpzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyT2JqZWN0KSB7XG5cdFx0XHRcdHRoYXQuX3ByZXJlbmRlckdyb3VwLmFkZENoaWxkKHJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAucmVtb3ZlQWxsKCk7XG5cdFx0b2JqcyA9IHRoaXMuX2xheW91dGVyLnBvc3RyZW5kZXIodGhpcy5fd2lkdGgsdGhpcy5faGVpZ2h0KTtcblx0XHRpZiAob2Jqcykge1xuXHRcdFx0b2Jqcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlck9iamVjdCkge1xuXHRcdFx0XHR0aGF0Ll9wb3N0cmVuZGVyR3JvdXAuYWRkQ2hpbGQocmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQWRkcyBjbGlja2FibGUgYm94ZXMgdG8gcmVncm91cCBhbnkgdW5ncm91cGVkIGFnZ3JlZ2F0ZXNcblx0ICogVE9ETzogIG1ha2UgdGhpcyBsb29rIGJldHRlciFcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZGRSZWdyb3VwSGFuZGxlcyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR2YXIgdW5ncm91cGVkTm9kZXNJbmZvID0gdGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmdldFVuZ3JvdXBlZE5vZGVzKCk7XG5cdFx0XHR1bmdyb3VwZWROb2Rlc0luZm8uZm9yRWFjaChmdW5jdGlvbih1bmdyb3VwZWROb2RlSW5mbykge1xuXHRcdFx0XHR2YXIgaW5kaWNlcyA9IHVuZ3JvdXBlZE5vZGVJbmZvLmluZGljZXM7XG5cdFx0XHRcdHZhciBrZXkgPSB1bmdyb3VwZWROb2RlSW5mby5rZXk7XG5cdFx0XHRcdHZhciBiYm94ID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcyxSRUdST1VORF9CQl9QQURESU5HKTtcblx0XHRcdFx0dmFyIGljb25Qb3NpdGlvbiA9IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5nZXRNaW5pbWl6ZUljb25Qb3NpdGlvbihiYm94LHRoYXQuX2dyb3VwaW5nTWFuYWdlci5nZXRVbmdyb3VwZWROb2Rlc0ZvcktleShrZXkpKTtcblx0XHRcdFx0dmFyIG1pbmltaXplUmVuZGVyT2JqZWN0ID0gcGF0aC5pbWFnZSh7XG5cdFx0XHRcdFx0c3JjIDogJ2RhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQlFBQUFBVUNBWUFBQUNOaVIwTkFBQUFBWE5TUjBJQXJzNGM2UUFBQUFsd1NGbHpBQUVRaEFBQkVJUUJQMFZGWUFBQUFjdHBWRmgwV0UxTU9tTnZiUzVoWkc5aVpTNTRiWEFBQUFBQUFEeDRPbmh0Y0cxbGRHRWdlRzFzYm5NNmVEMGlZV1J2WW1VNmJuTTZiV1YwWVM4aUlIZzZlRzF3ZEdzOUlsaE5VQ0JEYjNKbElEVXVOQzR3SWo0S0lDQWdQSEprWmpwU1JFWWdlRzFzYm5NNmNtUm1QU0pvZEhSd09pOHZkM2QzTG5jekxtOXlaeTh4T1RrNUx6QXlMekl5TFhKa1ppMXplVzUwWVhndGJuTWpJajRLSUNBZ0lDQWdQSEprWmpwRVpYTmpjbWx3ZEdsdmJpQnlaR1k2WVdKdmRYUTlJaUlLSUNBZ0lDQWdJQ0FnSUNBZ2VHMXNibk02ZUcxd1BTSm9kSFJ3T2k4dmJuTXVZV1J2WW1VdVkyOXRMM2hoY0M4eExqQXZJZ29nSUNBZ0lDQWdJQ0FnSUNCNGJXeHVjenAwYVdabVBTSm9kSFJ3T2k4dmJuTXVZV1J2WW1VdVkyOXRMM1JwWm1Zdk1TNHdMeUkrQ2lBZ0lDQWdJQ0FnSUR4NGJYQTZRM0psWVhSdmNsUnZiMncrZDNkM0xtbHVhM05qWVhCbExtOXlaend2ZUcxd09rTnlaV0YwYjNKVWIyOXNQZ29nSUNBZ0lDQWdJQ0E4ZEdsbVpqcFBjbWxsYm5SaGRHbHZiajR4UEM5MGFXWm1Pazl5YVdWdWRHRjBhVzl1UGdvZ0lDQWdJQ0E4TDNKa1pqcEVaWE5qY21sd2RHbHZiajRLSUNBZ1BDOXlaR1k2VWtSR1BnbzhMM2c2ZUcxd2JXVjBZVDRLR010VldBQUFBY2hKUkVGVU9CR1ZsVDFPdzBBUVJyMjJRNVJJRVFWQ1JFcERyb0NWR281QVEwOUx6UUVpRHNBUktEZ0JWd2dkVXFLY2dJWW1FcUpDbHZoTmJONW5lWU85c1UwWWFWanY3TGR2WnB6MVlqeHNOQm9kcjFhcksyUE1FZE1lbmlxK2hSazBjWnFtOHlBSXh0UHA5TjRJUm1EaSs3NEhWSXdtbUFDeW9zWUE4NUlrOFNqb0pPajMrN2NFRG9HOUlRd3plZjBmQ3l3cEtPZ2RSZ3ZHMEZlYmVXV2RrcXArVXF6T3FqcGlpT1VUcVh0bmxkVllRc1dvUkQwQnF6SktYeGZYV3AybEF2N0gva3hTQk5vVzNiR1kwRjJ6ODdXbUNMVFozWEV0NXNGZDA3d0VMUUtMRy8vemJKTmtlNnJPWGVKbWJhQUxWaXFxQ013VytXS0NCc0RHa3I0UWJGMkVCYVljU3A4VC80cGZJbnBHdEVNc1ljNWdTbTBSVTFWZkpEOWd2R1o5bDFnR3RjQ0VvSUNQczluc0J0SFdGa1hSQlh1akhCaVUrb2ZTM3ByMEt5enRNV1JRT3lwWDhDVitoNy9nTGJkVllwbFJqWTdLTjc2UG4rSXRQR09vNVJqWDk2eEF5SzF4QnNoakU5TjZzNXI4WXJFRnhTRWI1MkVZNm9MOVpIdWJNYnNVNjFFYkt6b1ZIeFRTWFM2WGM1K0hzWDU2UmwxZmFsdFZxd1YzVk14MWFjVG81b3h4c0Znc25nYUR3WVRDaHJTeGgwQXZ1YmxmQkxucFhjYkFIamhDNS9vWDhBUHNDYXY5dEg2WFhRQUFBQUJKUlU1RXJrSmdnZz09Jyxcblx0XHRcdFx0XHR4IDogaWNvblBvc2l0aW9uLngsXG5cdFx0XHRcdFx0eSA6IGljb25Qb3NpdGlvbi55LFxuXHRcdFx0XHRcdGdyYXBoanNfdHlwZSA6ICdyZWdyb3VwX2ljb24nLFxuXHRcdFx0XHRcdGdyYXBoanNfaW5kaWNlcyA6IGluZGljZXMsXG5cdFx0XHRcdFx0Z3JhcGhqc19ncm91cF9rZXkgOiBrZXksXG5cdFx0XHRcdFx0b3BhY2l0eSA6IDAuOFxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR2YXIgYm91bmRpbmdCb3hSZW5kZXJPYmplY3QgPSBwYXRoLnJlY3Qoe1xuXHRcdFx0XHRcdHggOiBiYm94LngsXG5cdFx0XHRcdFx0eSA6IGJib3gueSxcblx0XHRcdFx0XHRncmFwaGpzX3R5cGUgOiAncmVncm91cF91bmRlcmxheScsXG5cdFx0XHRcdFx0Z3JhcGhqc19pbmRpY2VzIDogaW5kaWNlcyxcblx0XHRcdFx0XHR3aWR0aCA6IGJib3gud2lkdGgsXG5cdFx0XHRcdFx0aGVpZ2h0IDogYmJveC5oZWlnaHQsXG5cdFx0XHRcdFx0c3Ryb2tlU3R5bGUgOiAnIzIzMjMyMycsXG5cdFx0XHRcdFx0ZmlsbFN0eWxlIDogJyMwMDAwMDAnLFxuXHRcdFx0XHRcdG9wYWNpdHkgOiAwLjFcblx0XHRcdFx0fSk7XG5cdFx0XHRcdG1pbmltaXplUmVuZGVyT2JqZWN0Lm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGhhdC5yZWdyb3VwKGtleSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGF0Ll9oYW5kbGVHcm91cC5hZGRDaGlsZChtaW5pbWl6ZVJlbmRlck9iamVjdCk7XG5cdFx0XHRcdHRoYXQuX2hhbmRsZUdyb3VwLmFkZENoaWxkKGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZWRyYXcgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHVwZGF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEcmF3IHRoZSBncmFwaC4gICBPbmx5IG5lZWRzIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgbm9kZXMvbGlua3MgaGF2ZSBiZWVuIHNldFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRkcmF3IDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0aWYgKCF0aGlzLl9zY2VuZSkge1xuXHRcdFx0dGhpcy5fc2NlbmUgPSBwYXRoKHRoaXMuX2NhbnZhcyk7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5fbGF5b3V0ZXIpIHtcblx0XHRcdHZhciBkZWZhdWxMYXlvdXQgPSBuZXcgTGF5b3V0KClcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX25vZGVzKVxuXHRcdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0LmxhYmVsTWFwKHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXHRcdFx0dGhpcy5sYXlvdXRlcihkZWZhdWxMYXlvdXQpO1xuXHRcdH1cblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cCA9IHBhdGguZ3JvdXAoKTtcblx0XHQvL3RoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHQvL3RoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHR0aGlzLl9oYW5kbGVHcm91cCA9IHBhdGguZ3JvdXAoKTtcblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAgPSBwYXRoLmdyb3VwKHtub0hpdDp0cnVlfSk7XG5cdFx0Ly90aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdC8vdGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblxuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX3ByZXJlbmRlckdyb3VwKTtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9oYW5kbGVHcm91cCk7XG5cdFx0dGhpcy5fbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cblx0XHRcdHZhciBsaW5rT2JqZWN0O1xuXHRcdFx0aWYgKCFsaW5rLnR5cGUpIHtcblx0XHRcdFx0bGluay50eXBlID0gTElOS19UWVBFLkRFRkFVTFQ7XG5cdFx0XHR9XG5cdFx0XHRzd2l0Y2gobGluay50eXBlKSB7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkFSUk9XOlxuXHRcdFx0XHRcdGxpbmsuaGVhZE9mZnNldCA9IGxpbmsudGFyZ2V0LnJhZGl1cztcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5hcnJvdyhsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuQVJDOlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmFyYyhsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuTElORTpcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuREVGQVVMVDpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5saW5lKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmxpbmUobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW2xpbmsuc291cmNlLmluZGV4XS5wdXNoKGxpbmtPYmplY3QpO1xuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtsaW5rLnRhcmdldC5pbmRleF0ucHVzaChsaW5rT2JqZWN0KTtcblxuXHRcdFx0dGhhdC5fc2NlbmUuYWRkQ2hpbGQobGlua09iamVjdCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLl9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBjaXJjbGUgPSBwYXRoLmNpcmNsZShub2RlKTtcblx0XHRcdHRoYXQuX25vZGVJbmRleFRvQ2lyY2xlW25vZGUuaW5kZXhdID0gY2lyY2xlO1xuXHRcdFx0aWYgKHRoYXQuX25vZGVPdmVyIHx8IHRoYXQuX2RyYWdnYWJsZSkge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdtb3VzZW92ZXInKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3Zlcikge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU92ZXIoY2lyY2xlLCBlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBjaXJjbGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0IHx8IHRoYXQuX2RyYWdnYWJsZSkge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdtb3VzZW91dCcpO1xuXHRcdFx0XHRjaXJjbGUub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSE9PSdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0KSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ub2RlT3V0KGNpcmNsZSwgZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlQ2xpY2spIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignY2xpY2snKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKCkpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0dGhhdC5fbm9kZUNsaWNrKGNpcmNsZSxlKTtcblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdjbGljaycpO1xuXHRcdFx0XHRjaXJjbGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRpZiAodGhhdC5fbm9kZU91dCkge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU91dChjaXJjbGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGF0LnVuZ3JvdXAoY2lyY2xlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGF0Ll9zY2VuZS5hZGRDaGlsZChjaXJjbGUpO1xuXG5cdFx0XHRpZiAobm9kZS5sYWJlbCkge1xuXHRcdFx0XHR0aGF0LmFkZExhYmVsKG5vZGUsbm9kZS5sYWJlbCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAodGhpcy5zaG93QWxsTGFiZWxzKCkpIHtcblx0XHRcdHRoaXMuc2hvd0FsbExhYmVscyh0cnVlKTtcblx0XHR9XG5cblx0XHR0aGlzLl9sYXlvdXRlci5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblxuXG5cdFx0dGhpcy5fYWRkUHJlQW5kUG9zdFJlbmRlck9iamVjdHMoKTtcblxuXHRcdC8vIERyYXcgYW55IHVuZ3JvdXBlZCBub2RlIGJvdW5kaW5nIGJveGVzXG5cdFx0dGhpcy5fYWRkUmVncm91cEhhbmRsZXMoKTtcblxuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9kZWJ1Z0RyYXdCb3VuZGluZ0JveCA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzKTtcblx0XHRpZiAodGhpcy5fYmJSZW5kZXIpIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX2JiUmVuZGVyKTtcblx0XHR9XG5cdFx0dGhpcy5fYmJSZW5kZXIgPSBwYXRoLnJlY3Qoe1xuXHRcdFx0eCA6IGJvdW5kaW5nQm94LngsXG5cdFx0XHR5IDogYm91bmRpbmdCb3gueSxcblx0XHRcdHdpZHRoIDogYm91bmRpbmdCb3gud2lkdGgsXG5cdFx0XHRoZWlnaHQgOiBib3VuZGluZ0JveC5oZWlnaHQsXG5cdFx0XHRzdHJva2VTdHlsZSA6ICcjZmYwMDAwJyxcblx0XHRcdGxpbmVXaWR0aCA6IDJcblx0XHR9KTtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9iYlJlbmRlcik7XG5cdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEZpdCB0aGUgZ3JhcGggdG8gdGhlIHNjcmVlblxuXHQgKi9cblx0Zml0IDogZnVuY3Rpb24ocGFkZGluZykge1xuXG5cdFx0Ly8gUmV0dXJuIGJhY2sgdG8gb3JpZ2luXG5cdFx0dGhpcy5fcGFuKC10aGlzLl9zY2VuZS54LC10aGlzLl9zY2VuZS55KTtcblxuXG5cblx0XHQvLyBXb3JraW5nIHdpdGggYmlnIG51bWJlcnMsIGl0J3MgYmV0dGVyIGlmIHdlIGRvIHRoaXMgdHdpY2UuXG5cdFx0dmFyIGJvdW5kaW5nQm94O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMjsgaSsrKSB7XG5cdFx0XHRib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzLHBhZGRpbmcpO1xuXHRcdFx0dmFyIHhSYXRpbyA9IHRoaXMuX3NjZW5lLndpZHRoIC8gYm91bmRpbmdCb3gud2lkdGg7XG5cdFx0XHR2YXIgeVJhdGlvID0gdGhpcy5fc2NlbmUuaGVpZ2h0IC8gYm91bmRpbmdCb3guaGVpZ2h0O1xuXHRcdFx0dGhpcy5fem9vbShNYXRoLm1pbih4UmF0aW8sIHlSYXRpbyksIDAsIDApO1xuXHRcdH1cblxuXHRcdHZhciBtaWRTY3JlZW5YID0gdGhpcy5fc2NlbmUud2lkdGggLyAyO1xuXHRcdHZhciBtaWRTY3JlZW5ZID0gdGhpcy5fc2NlbmUuaGVpZ2h0IC8gMjtcblx0XHRib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzKTtcblx0XHR2YXIgbWlkQkJYID0gYm91bmRpbmdCb3gueCArIGJvdW5kaW5nQm94LndpZHRoIC8gMjtcblx0XHR2YXIgbWlkQkJZID0gYm91bmRpbmdCb3gueSArIGJvdW5kaW5nQm94LmhlaWdodCAvIDI7XG5cdFx0dGhpcy5fcGFuKC0obWlkQkJYLW1pZFNjcmVlblgpLC0obWlkQkJZLW1pZFNjcmVlblkpKTtcblxuXHRcdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0XHR0aGlzLl9sYXlvdXRlci5fem9vbVNjYWxlID0gMS4wO1xuXHRcdC8vIFpvb20gdGhlIHJlbmRlciBncm91cHNcblx0XHQvL2lmICh0aGlzLl9wcmVyZW5kZXJHcm91cCkge1xuXHRcdC8vXHR0aGlzLl9wcmVyZW5kZXJHcm91cC5zY2FsZVggPSB0aGlzLl96b29tU2NhbGU7XG5cdFx0Ly9cdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHQvL31cblx0XHQvL2lmICh0aGlzLl9wb3N0cmVuZGVyR3JvdXApIHtcblx0XHQvL1x0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHQvL1x0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHQvL31cblx0XHR0aGlzLnVwZGF0ZSgpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFN1c3BlbmQgbW91c2UgZXZlbnRzIGFuZCB6b29taW5nXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc3VzcGVuZEV2ZW50cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2xheW91dGVyLl9ldmVudHNTdXNwZW5kZWQgPSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiByZXN1bWUgbW91c2UgZXZlbnRzIGFuZCB6b29taW5nXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfcmVzdW1lRXZlbnRzIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fbGF5b3V0ZXIuX2V2ZW50c1N1c3BlbmRlZCA9IGZhbHNlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBRdWVyeSBldmVudCBzdXNwZW5zaW9uIHN0YXR1c1xuXHQgKiBAcmV0dXJucyBib29sZWFuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfZXZlbnRzU3VzcGVuZGVkIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2xheW91dGVyLl9ldmVudHNTdXNwZW5kZWQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgYWxsIHJlbmRlciBvYmplY3RzIGFzc29jaWF0ZWQgd2l0aCBhIGdyYXBoLlxuXHQgKi9cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcmVtb3ZlUmVuZGVyT2JqZWN0cyA9IGZ1bmN0aW9uKGluZGV4VG9PYmplY3QpIHtcblx0XHRcdGZvciAodmFyIGtleSBpbiBpbmRleFRvT2JqZWN0KSB7XG5cdFx0XHRcdGlmIChpbmRleFRvT2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHR2YXIgb2JqID0gaW5kZXhUb09iamVjdFtrZXldO1xuXHRcdFx0XHRcdGlmICgkLmlzQXJyYXkob2JqKSkge1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQob2JqW2ldKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZGVsZXRlIGluZGV4VG9PYmplY3Rba2V5XTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpO1xuXHRcdHJlbW92ZVJlbmRlck9iamVjdHMuY2FsbCh0aGlzLHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpO1xuXHRcdHJlbW92ZVJlbmRlck9iamVjdHMuY2FsbCh0aGlzLHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXHRcdGlmICh0aGlzLl9wcmVyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5fcHJlcmVuZGVyR3JvdXApO1xuXHRcdH1cblx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXApIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX2hhbmRsZUdyb3VwKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5fcG9zdHJlbmRlckdyb3VwKTtcblx0XHR9XG5cdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5cbmV4cG9ydHMuTElOS19UWVBFID0gcmVxdWlyZSgnLi9saW5rVHlwZScpO1xuZXhwb3J0cy5Hcm91cGluZ01hbmFnZXIgPSByZXF1aXJlKCcuL2dyb3VwaW5nTWFuYWdlcicpO1xuZXhwb3J0cy5MYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuZXhwb3J0cy5Db2x1bW5MYXlvdXQgPSByZXF1aXJlKCcuL2NvbHVtbkxheW91dCcpO1xuZXhwb3J0cy5SYWRpYWxMYXlvdXQgPSByZXF1aXJlKCcuL3JhZGlhbExheW91dCcpO1xuZXhwb3J0cy5FeHRlbmQgPSBfLmV4dGVuZDtcbmV4cG9ydHMuR3JhcGggPSBHcmFwaDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG4vKipcbiAqXG4gKiBAcGFyYW0gZm9jdXMgLSB0aGUgbm9kZSBhdCB0aGUgY2VudGVyIG9mIHRoZSByYWRpYWwgbGF5b3V0XG4gKiBAcGFyYW0gZGlzdGFuY2UgLSB0aGUgZGlzdGFuY2Ugb2Ygb3RoZXIgbm9kZXMgZnJvbSB0aGUgZm9jdXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSYWRpYWxMYXlvdXQoZm9jdXMsZGlzdGFuY2UpIHtcblx0dGhpcy5fZm9jdXMgPSBmb2N1cztcblx0dGhpcy5fZGlzdGFuY2UgPSBkaXN0YW5jZTtcblxuXHRMYXlvdXQuYXBwbHkodGhpcyk7XG59XG5cblxuUmFkaWFsTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKFJhZGlhbExheW91dC5wcm90b3R5cGUsIExheW91dC5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZGlzdGFuY2UgcGFyYW1ldGVyXG5cdCAqIEBwYXJhbSBkaXN0YW5jZSAtIHRoZSBkaXN0YW5jZSBvZiBsaW5rcyBmcm9tIHRoZSBmb2N1cyBub2RlIHRvIG90aGVyIG5vZGVzIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7UmFkaWFsTGF5b3V0fSBpZiBkaXN0YW5jZSBwYXJhbSBpcyBkZWZpbmVkLCB7UmFkaWFsTGF5b3V0Ll9kaXN0YW5jZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRkaXN0YW5jZTogZnVuY3Rpb24gKGRpc3RhbmNlKSB7XG5cdFx0aWYgKGRpc3RhbmNlKSB7XG5cdFx0XHR0aGlzLl9kaXN0YW5jZSA9IGRpc3RhbmNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZGlzdGFuY2U7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvY3VzIG5vZGUgdGhhdCBpcyBhdCB0aGUgY2VudGVyIG9mIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGZvY3VzIC0gdGhlIG5vZGUgdGhhdCBpcyBhdCB0aGUgY2VudGVyIG9mIHRoZSBsYXlvdXQuICAgT3RoZXIgbm9kZXMgYXJlIGNlbnRlcmVkIGFyb3VuZCB0aGlzLlxuXHQgKiBAcmV0dXJucyB7UmFkaWFsTGF5b3V0fSBpZiBmb2N1cyBwYXJhbSBpcyBkZWZpbmVkLCB7UmFkaWFsTGF5b3V0Ll9mb2N1c30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb2N1czogZnVuY3Rpb24gKGZvY3VzKSB7XG5cdFx0aWYgKGZvY3VzKSB7XG5cdFx0XHR0aGlzLl9mb2N1cyA9IGZvY3VzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9jdXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgdGhlIGxhYmVsIHBvc2l0aW9uIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVYIC0gdGhlIHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVZIC0gdGhlIHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHJhZGl1cyAtIHRoZSByYWRpdXMgb2YgdGhlIG5vZGVcblx0ICogQHJldHVybnMge3t4OiB4IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgeTogeSBwb3NpdGlvbiBvZiB0aGUgbGFiZWwsIGFsaWduOiBIVE1MIGNhbnZhcyB0ZXh0IGFsaWdubWVudCBwcm9wZXJ0eSBmb3IgbGFiZWx9fVxuXHQgKi9cblx0bGF5b3V0TGFiZWw6IGZ1bmN0aW9uIChub2RlWCwgbm9kZVksIHJhZGl1cykge1xuXHRcdHZhciB4LCB5LCBhbGlnbjtcblxuXHRcdC8vIFJpZ2h0IG9mIGNlbnRlclxuXHRcdGlmIChub2RlWCA+IHRoaXMuX2ZvY3VzKSB7XG5cdFx0XHR4ID0gbm9kZVggKyAocmFkaXVzICsgMTApO1xuXHRcdFx0YWxpZ24gPSAnc3RhcnQnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR4ID0gbm9kZVggLSAocmFkaXVzICsgMTApO1xuXHRcdFx0YWxpZ24gPSAnZW5kJztcblx0XHR9XG5cblx0XHRpZiAobm9kZVkgPiB0aGlzLl9mb2N1cykge1xuXHRcdFx0eSA9IG5vZGVZICsgKHJhZGl1cyArIDEwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0eSA9IG5vZGVZIC0gKHJhZGl1cyArIDEwKTtcblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdHg6IHgsXG5cdFx0XHR5OiB5LFxuXHRcdFx0YWxpZ246IGFsaWduXG5cdFx0fTtcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybSBhIHJhZGlhbCBsYXlvdXRcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKi9cblx0bGF5b3V0OiBmdW5jdGlvbiAodywgaCkge1xuXHRcdHZhciBub2RlcyA9IHRoaXMubm9kZXMoKTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dmFyIGFuZ2xlRGVsdGEgPSBNYXRoLlBJICogMiAvIChub2Rlcy5sZW5ndGggLSAxKTtcblx0XHR2YXIgYW5nbGUgPSAwLjA7XG5cdFx0bm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuXHRcdFx0aWYgKG5vZGUuaW5kZXggPT09IHRoYXQuX2ZvY3VzLmluZGV4KSB7XG5cdFx0XHRcdHRoYXQuX3NldE5vZGVQb3NpdGlvbihub2RlLCBub2RlLngsIG5vZGUueSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBuZXdYID0gdGhhdC5fZm9jdXMueCArIChNYXRoLmNvcyhhbmdsZSkgKiB0aGF0Ll9kaXN0YW5jZSk7XG5cdFx0XHR2YXIgbmV3WSA9IHRoYXQuX2ZvY3VzLnkgKyAoTWF0aC5zaW4oYW5nbGUpICogdGhhdC5fZGlzdGFuY2UpO1xuXHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUsIG5ld1gsIG5ld1kpO1xuXHRcdFx0YW5nbGUgKz0gYW5nbGVEZWx0YTtcblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmFkaWFsTGF5b3V0O1xuIiwiXG52YXIgVXRpbCA9IHtcblxuICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcbiAgICB2YXIga2V5LCBpLCBzb3VyY2U7XG4gICAgZm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlc3Q7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(5)
});
