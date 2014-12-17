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
	 * Default layout routine.   Should be overriden by subclasses.
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
		if (sourceNodeIndex && !targetNodeIndex) {
			var allSource = this._nodeIndexToLinkLine[sourceNodeIndex];
			var justSource = allSource.filter(function(link) {
				return link.source.index === sourceNodeIndex;
			});
			return justSource;
		} else if (!sourceNodeIndex && targetNodeIndex) {
			var allTarget = this._nodeIndexToLinkLine[targetNodeIndex];
			var justTarget = allTarget.filter(function(link) {
				return link.target.index === targetNodeIndex;
			});
			return justTarget;
		} else if (sourceNodeIndex && targetNodeIndex) {
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
		if (showAllLabels) {
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
		if (this._prerenderGroup) {
			this._prerenderGroup.scaleX = this._zoomScale;
			this._prerenderGroup.scaleY = this._zoomScale;
		}
		if (this._postrenderGroup) {
			this._postrenderGroup.scaleX = this._zoomScale;
			this._postrenderGroup.scaleY = this._zoomScale;
		}

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
				var updated = 0;
				underlays.forEach(function(underlay) {
					var indices = underlay.graphjs_indices;
					var bb = that._layouter.getBoundingBox(indices,REGROUND_BB_PADDING);
					underlay.tweenAttr({
						x: bb.x,
						y: bb.y,
						width : bb.width,
						height : bb.height
					}, {
						duration: that._layouter.duration(),
						easing: that._layouter.easing()
					});
				});
			}
			this.update();
		}
		return this;
	},


	groupingManager : function(groupingManager) {
		if (groupingManager) {
			this._groupingManager = groupingManager;
		} else {
			return this._groupingManager;
		}
		return this;
	},

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

			var label = that._nodeIndexToLabel[child.index];
			label.tweenAttr({
				opacity : 0
			}, {
				duration : that._layouter.duration(),
				callback : function() {
					label.opacity = 1;
				}
			});

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

	_addRegroupHandles : function() {
		var that = this;
		if (this._groupingManager) {
			var ungroupedNodeInfo = this._groupingManager.getUngroupedNodes();
			ungroupedNodeInfo.forEach(function(ungroupedNode) {
				var indices = ungroupedNode.indices;
				var key = ungroupedNode.key;
				var bbox = that._layouter.getBoundingBox(indices,REGROUND_BB_PADDING);
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
				boundingBoxRenderObject.on('click',function() {
					that.regroup(key);
				});
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
		this._prerenderGroup.scaleX = this._zoom;
		this._prerenderGroup.scaleY = this._zoom;
		this._handleGroup = path.group();
		this._postrenderGroup = path.group({noHit:true});
		this._postrenderGroup.scaleX = this._zoom;
		this._postrenderGroup.scaleY = this._zoom;
		this._addPreAndPostRenderObjects();

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2NvbHVtbkxheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xpbmtUeXBlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3JhZGlhbExheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgQ29sdW1uTGF5b3V0ID0gZnVuY3Rpb24oKSB7XG5cdExheW91dC5hcHBseSh0aGlzKTtcbn07XG5cbkNvbHVtbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChDb2x1bW5MYXlvdXQucHJvdG90eXBlLCBMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEEgY29sdW1uIGxheW91dFxuXHQgKiBAcGFyYW0gdyAtIHdpZHRoIG9mIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIGhlaWdodCBvZiBjYW52YXNcblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uICh3LCBoKSB7XG5cdFx0dmFyIHggPSAwO1xuXHRcdHZhciB5ID0gMDtcblx0XHR2YXIgbWF4UmFkaXVzQ29sID0gMDtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuXG5cdFx0XHRpZiAoeSA9PT0gMCkge1xuXHRcdFx0XHR5ICs9IG5vZGUucmFkaXVzO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHggPT09IDApIHtcblx0XHRcdFx0eCArPSBub2RlLnJhZGl1cztcblx0XHRcdH1cblxuXHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlKG5vZGUsIHgsIHkpO1xuXG5cdFx0XHRtYXhSYWRpdXNDb2wgPSBNYXRoLm1heChtYXhSYWRpdXNDb2wsIG5vZGUucmFkaXVzKTtcblxuXHRcdFx0eSArPSBub2RlLnJhZGl1cyArIDQwO1xuXHRcdFx0aWYgKHkgPiBoKSB7XG5cdFx0XHRcdHkgPSAwO1xuXHRcdFx0XHR4ICs9IG1heFJhZGl1c0NvbCArIDQwO1xuXHRcdFx0XHRtYXhSYWRpdXNDb2wgPSAwO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2x1bW5MYXlvdXQ7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBiYXNlIGdyb3VwaW5nIG1hbmFnZXIuICAgVGhpcyBpcyBhbiBhYnN0cmFjdCBjbGFzcy4gICBDaGlsZCBjbGFzc2VzIHNob3VsZCBvdmVycmlkZSB0aGVcbiAqIGluaXRpYWxpemVIZWlyYXJjaHkgZnVuY3Rpb24gdG8gY3JlYXRlIG5vZGVzL2xpbmtzIHRoYXQgYXJlIGFnZ3JlZ2F0ZWQgZm9yIHRoZWlyIHNwZWNpZmljIGltcGxlbWVudGF0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEdyb3VwaW5nTWFuYWdlciA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5faW5pdGlhbGl6ZSgpO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuR3JvdXBpbmdNYW5hZ2VyLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEdyb3VwaW5nTWFuYWdlci5wcm90b3R5cGUsIHtcblx0X2luaXRpYWxpemUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9ub2RlcyA9IFtdO1xuXHRcdHRoaXMuX2xpbmtzID0gW107XG5cblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBbXTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTGlua3MgPSBbXTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVOb2RlTWFwID0ge307XG5cblx0XHR0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzID0ge307XG5cdFx0dGhpcy5fdW5ncm91cGVkTm9kZUdyb3VwcyA9IHt9O1xuXHR9LFxuXG5cdGNsZWFyIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW5pdGlhbGl6ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG9yaWdpbmFsIG5vZGVzIGluIHRoZSBncmFwaCB3aXRob3V0IGdyb3VwaW5nXG5cdCAqIEBwYXJhbSBub2RlcyAtIGEgZ3JhcGguanMgbm9kZSBhcnJheVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgb3JpZ2luYWwgbGlua3MgaW4gdGhlIGdyYXBoIHdpdGhvdXQgZ3JvdXBpbmdcblx0ICogQHBhcmFtIGxpbmtzIC0gYSBncmFwaC5qcyBsaW5rIGFycmF5XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bGlua3MgOiBmdW5jdGlvbihsaW5rcykge1xuXHRcdGlmIChsaW5rcykge1xuXHRcdFx0dGhpcy5fbGlua3MgPSBsaW5rcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZXMgdGhlIG5vZGUvbGluayBhZ2dyZWdhdGlvblxuXHQgKi9cblx0aW5pdGlhbGl6ZUhlaXJhcmNoeSA6IGZ1bmN0aW9uKCkge1xuXG5cdFx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlcyA9IHt9O1xuXHRcdHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMgPSB7fTtcblxuXHRcdHRoaXMuX2FnZ3JlZ2F0ZU5vZGVzKCk7XG5cdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblxuXHRcdHZhciBzZXRQYXJlbnRQb2ludGVycyA9IGZ1bmN0aW9uKG5vZGUscGFyZW50KSB7XG5cdFx0XHRpZiAobm9kZS5jaGlsZHJlbikge1xuXHRcdFx0XHRub2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdFx0XHRzZXRQYXJlbnRQb2ludGVycyhjaGlsZCxub2RlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRub2RlLnBhcmVudE5vZGUgPSBwYXJlbnQ7XG5cdFx0fTtcblxuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHNldFBhcmVudFBvaW50ZXJzKG5vZGUsbnVsbCk7XG5cdFx0fSk7XG5cblx0XHRpZiAodGhpcy5vbkFnZ3JlZ2F0aW9uQ29tcGxldGUpIHtcblx0XHRcdHRoaXMub25BZ2dyZWdhdGlvbkNvbXBsZXRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFnZ3JlZ2F0ZWQgbGluayBpbiBncmFwaC5qcyBmb3JtYXQuICAgQ2FuIGJlIG92ZXJyaWRlbiBieSBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvbnMgdG8gYWxsb3dcblx0ICogdG8gYWxsb3cgZm9yIGRpZmVyZW50IGxpbmsgdHlwZXMgYmFzZWQgb24gYWdncmVnYXRlIGNvbnRlbnRzXG5cdCAqIEBwYXJhbSBzb3VyY2VBZ2dyZWdhdGUgLSB0aGUgc291cmNlIGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEBwYXJhbSB0YXJnZXRBZ2dyZWdhdGUgLSB0aGUgdGFyZ2V0IGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEByZXR1cm5zIHt7c291cmNlOiAqLCB0YXJnZXQ6ICp9fSAtIGEgZ3JhcGguanMgbGlua1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2NyZWF0ZUFnZ3JlZ2F0ZUxpbmsgOiBmdW5jdGlvbihzb3VyY2VBZ2dyZWdhdGUsdGFyZ2V0QWdncmVnYXRlLG9yaWdpbmFsTGlua3MpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c291cmNlIDogc291cmNlQWdncmVnYXRlLFxuXHRcdFx0dGFyZ2V0IDogdGFyZ2V0QWdncmVnYXRlXG5cdFx0fTtcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgbGluayBhZ2dyZWdhdGUgYmFzZWQgb24gYSBzZXQgb2YgYWdncmVnYXRlZCBub2RlcyBhbmQgYSBmdWxsIHNldCBvZiBsaW5rc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZUxpbmtzIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGUgPSB7fTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLmZvckVhY2goZnVuY3Rpb24oYWdncmVnYXRlKSB7XG5cdFx0XHRpZiAoYWdncmVnYXRlLmNoaWxkcmVuKSB7XG5cdFx0XHRcdGFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0XHRub2RlSW5kZXhUb0FnZ3JlYWdhdGVOb2RlW25vZGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbYWdncmVnYXRlLmluZGV4XSA9IGFnZ3JlZ2F0ZTtcblx0XHRcdH1cblx0XHRcdHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbYWdncmVnYXRlLmluZGV4XSA9IGFnZ3JlZ2F0ZTtcblx0XHR9KTtcblxuXG5cdFx0dmFyIGFnZ3JlZ2F0ZWRMaW5rcyA9IFtdO1xuXG5cdFx0dmFyIGFnZ3JlZ2F0ZUxpbmtNYXAgPSB7fTtcblxuXHRcdHRoaXMuX2xpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXHRcdFx0dmFyIHNvdXJjZUFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay5zb3VyY2UuaW5kZXhdO1xuXHRcdFx0dmFyIHRhcmdldEFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay50YXJnZXQuaW5kZXhdO1xuXG5cdFx0XHR2YXIgc291cmNlTWFwID0gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGUuaW5kZXhdO1xuXHRcdFx0aWYgKCFzb3VyY2VNYXApIHtcblx0XHRcdFx0c291cmNlTWFwID0ge307XG5cdFx0XHR9XG5cdFx0XHR2YXIgc291cmNlVG9UYXJnZXRMaW5rcyA9IHNvdXJjZU1hcFt0YXJnZXRBZ2dyZWdhdGUuaW5kZXhdO1xuXHRcdFx0aWYgKCFzb3VyY2VUb1RhcmdldExpbmtzKSB7XG5cdFx0XHRcdHNvdXJjZVRvVGFyZ2V0TGlua3MgPSBbXTtcblx0XHRcdH1cblx0XHRcdHNvdXJjZVRvVGFyZ2V0TGlua3MucHVzaChsaW5rKTtcblx0XHRcdHNvdXJjZU1hcFt0YXJnZXRBZ2dyZWdhdGUuaW5kZXhdID0gc291cmNlVG9UYXJnZXRMaW5rcztcblxuXHRcdFx0YWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGUuaW5kZXhdID0gc291cmNlTWFwO1xuXHRcdH0pO1xuXG5cdFx0Ly8gR2V0IG1pbi9tYXggbGluayBjb3VudHMgZm9yIGFsbCBhZ2dyZWdhdGUgcGFpcnNcblx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhDb3VudCA9IDA7XG5cdFx0Zm9yICh2YXIgc291cmNlQWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcCkge1xuXHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXAuaGFzT3duUHJvcGVydHkoc291cmNlQWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdGZvciAodmFyIHRhcmdldEFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdKSB7XG5cdFx0XHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdLmhhc093blByb3BlcnR5KHRhcmdldEFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRcdFx0dmFyIHNvdXJjZSA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbc291cmNlQWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIHRhcmdldCA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIG9yaWdpbmFsTGlua3MgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXVt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKG1pbkNvdW50LG9yaWdpbmFsTGlua3MubGVuZ3RoKTtcblx0XHRcdFx0XHRcdG1heENvdW50ID0gTWF0aC5tYXgobWF4Q291bnQsb3JpZ2luYWxMaW5rcy5sZW5ndGgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZvciAodmFyIHNvdXJjZUFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXApIHtcblx0XHRcdGlmIChhZ2dyZWdhdGVMaW5rTWFwLmhhc093blByb3BlcnR5KHNvdXJjZUFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRmb3IgKHZhciB0YXJnZXRBZ2dyZWdhdGVJZCBpbiBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXSkge1xuXHRcdFx0XHRcdGlmIChhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXS5oYXNPd25Qcm9wZXJ0eSh0YXJnZXRBZ2dyZWdhdGVJZCkpIHtcblx0XHRcdFx0XHRcdHZhciBzb3VyY2UgPSB0aGF0Ll9hZ2dyZWdhdGVOb2RlTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdHZhciB0YXJnZXQgPSB0aGF0Ll9hZ2dyZWdhdGVOb2RlTWFwW3RhcmdldEFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdHZhciBvcmlnaW5hbExpbmtzID0gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF1bdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIGxpbmsgPSB0aGF0Ll9jcmVhdGVBZ2dyZWdhdGVMaW5rKHNvdXJjZSwgdGFyZ2V0LCBvcmlnaW5hbExpbmtzLCBtaW5Db3VudCwgbWF4Q291bnQpO1xuXHRcdFx0XHRcdFx0aWYgKGxpbmspIHtcblx0XHRcdFx0XHRcdFx0YWdncmVnYXRlZExpbmtzLnB1c2gobGluayk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fYWdncmVnYXRlZExpbmtzID0gYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gbm9kZSBhZ2dyZWdhdGlvbi4gICBNdXN0IGJlIG92ZXJyaWRlbiBieSBpbXBsZW1lbnRvcnNcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZ2dyZWdhdGVOb2RlcyA6IGZ1bmN0aW9uKCkge1xuXG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIGFnZ3JlZ2F0ZWQgbm9kZXNcblx0ICogQHJldHVybnMge0FycmF5fSBvZiBncmFwaC5qcyBub2Rlc1xuXHQgKi9cblx0YWdncmVnYXRlZE5vZGVzIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcztcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBsaW5rc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIGxpbmtzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTGlua3MgOiBmdW5jdGlvbigpICB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWRMaW5rcztcblx0fSxcblxuXHRyZW1vdmUgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoICYmIGluZGV4ID09PSAtMTsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5fYWdncmVnYXRlZE5vZGVzW2ldLmluZGV4ID09PSBub2RlLmluZGV4KSB7XG5cdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGluZGV4ICE9PSAtMSkge1xuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLnNwbGljZShpbmRleCwxKTtcblx0XHR9XG5cdH0sXG5cblxuXHQvKipcblx0ICogRG8gYW55IHVwZGF0ZXMgb24gY2hpbGRyZW4gYmVmb3JlIGxheW91dCAgKGllLyBzZXQgcG9zaXRpb24sIHJvdy9jb2wgaW5mbywgZXRjKS4gICBTaG91bGQgYmUgZGVmaW5lZFxuXHQgKiBpbiBpbXBsZW1lbnRpbmcgY2xhc3Ncblx0ICogQHBhcmFtIGFnZ3JlZ2F0ZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3VwZGF0ZUNoaWxkcmVuIDogZnVuY3Rpb24oYWdncmVnYXRlKSB7XG5cdFx0Ly8gc2V0IGNoaWxkcmVucyBwb3NpdGlvbiBpbml0aWFsbHkgdG8gdGhlIHBvc2l0aW9uIG9mIHRoZSBhZ2dyZWdhdGVcblx0XHRhZ2dyZWdhdGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0Y2hpbGQueCA9IGFnZ3JlZ2F0ZS54O1xuXHRcdFx0Y2hpbGQueSA9IGFnZ3JlZ2F0ZS55O1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVbmdyb3VwIGFuIGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqL1xuXHR1bmdyb3VwIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdGlmIChub2RlLmNoaWxkcmVuKSB7XG5cblx0XHRcdHZhciBwYXJlbnRLZXkgPSAnJztcblx0XHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRcdHBhcmVudEtleSArPSBub2RlLmluZGV4ICsgJywnO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbcGFyZW50S2V5XSA9IG5vZGU7XG5cblx0XHRcdHZhciBpbmRleCA9IC0xO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoICYmIGluZGV4ID09PSAtMTsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0XHRpbmRleCA9IGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fdXBkYXRlQ2hpbGRyZW4obm9kZSk7XG5cblx0XHRcdHZhciBmaXJzdCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZSgwLGluZGV4KTtcblx0XHRcdHZhciBtaWRkbGUgPSBub2RlLmNoaWxkcmVuO1xuXHRcdFx0dGhpcy5fdW5ncm91cGVkTm9kZUdyb3Vwc1twYXJlbnRLZXldID0gbm9kZS5jaGlsZHJlbjtcblx0XHRcdHZhciBlbmQgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoaW5kZXgrMSk7XG5cblx0XHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IGZpcnN0LmNvbmNhdChtaWRkbGUpLmNvbmNhdChlbmQpO1xuXG5cdFx0XHQvLyBSZWNvbXB1dGUgYWdncmVnYXRlZCBsaW5rc1xuXHRcdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblx0XHR9XG5cdH0sXG5cdGdldEFnZ3JlZ2F0ZSA6IGZ1bmN0aW9uKGFnZ3JlZ2F0ZUtleSkge1xuXHRcdHJldHVybiB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdH0sXG5cblx0cmVncm91cCA6IGZ1bmN0aW9uKGFnZ3JlZ2F0ZUtleSxhdEluZGV4KSB7XG5cdFx0dmFyIGFnZ3JlZ2F0ZU5vZGUgPSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0dmFyIG5vZGVzVG9SZW1vdmUgPSBhZ2dyZWdhdGVOb2RlLmNoaWxkcmVuO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRub2Rlc1RvUmVtb3ZlLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dGhhdC5yZW1vdmUobm9kZSk7XG5cdFx0fSk7XG5cdFx0dmFyIHN0YXJ0ID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKDAsYXRJbmRleCk7XG5cdFx0dmFyIGVuZCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZShhdEluZGV4KTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBzdGFydC5jb25jYXQoYWdncmVnYXRlTm9kZSkuY29uY2F0KGVuZCk7XG5cdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblx0XHRkZWxldGUgdGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1thZ2dyZWdhdGVLZXldO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0cmV0dXJuIGFnZ3JlZ2F0ZU5vZGU7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYW4gYXJyYXkgb2Ygbm9kZSBncm91cHMgdGhhdCBhcmUgZXhwYW5kZWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0Z2V0VW5ncm91cGVkTm9kZXMgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgaW5mbyA9IFtdO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyh0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0dmFyIG5vZGVzID0gdGhhdC5fdW5ncm91cGVkTm9kZUdyb3Vwc1trZXldO1xuXHRcdFx0dmFyIG5vZGVJbmRpY2VzID0gbm9kZXMubWFwKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0cmV0dXJuIG5vZGUuaW5kZXg7XG5cdFx0XHR9KTtcblx0XHRcdGluZm8ucHVzaCh7XG5cdFx0XHRcdGluZGljZXMgOiBub2RlSW5kaWNlcyxcblx0XHRcdFx0a2V5IDoga2V5XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gaW5mbztcblx0fVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cGluZ01hbmFnZXI7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIExheW91dCBjb25zdHJ1Y3RvclxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gbnVsbDtcblx0dGhpcy5fbGlua01hcCA9IG51bGw7XG5cdHRoaXMuX25vZGVNYXAgPSBudWxsO1xuXHR0aGlzLl9sYWJlbE1hcCA9IG51bGw7XG5cdHRoaXMuX2R1cmF0aW9uID0gMjUwO1xuXHR0aGlzLl9lYXNpbmcgPSAnZWFzZS1pbi1vdXQnO1xuXHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IGZhbHNlO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBkdXJhdGlvbiBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIGxheW91dCBhbmltYXRpb24gaW4gbWlsbGlzZWNvbmRzLiAgKGRlZmF1bHQgPSAyNTBtcylcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgZHVyYXRpb24gcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fZHVyYXRpb259IG90aGVyd2lzZVxuXHQgKi9cblx0ZHVyYXRpb24gOiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdGlmIChkdXJhdGlvbikge1xuXHRcdFx0dGhpcy5fZHVyYXRpb24gPSBkdXJhdGlvbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2R1cmF0aW9uO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBlYXNpbmcgb2YgdGhlIGxheW91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIGVhc2luZyAtIHRoZSBlYXNpbmcgb2YgdGhlIGxheW91dCBhbmltYXRpb24gaW4gbWlsbGlzZWNvbmRzLiAgKGRlZmF1bHQgPSAnZWFzZS1pbi1vdXQnKVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBlYXNpbmcgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fZWFzaW5nfSBvdGhlcndpc2Vcblx0ICovXG5cdGVhc2luZyA6IGZ1bmN0aW9uKGVhc2luZykge1xuXHRcdGlmIChlYXNpbmcpIHtcblx0XHRcdHRoaXMuX2Vhc2luZyA9IGVhc2luZztcblx0XHR9XHQgZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZWFzaW5nO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlcyBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZXMgLSB0aGUgc2V0IG9mIG5vZGVzIGRlZmluZWQgaW4gdGhlIGNvcnJlc3BvbmRpbmcgZ3JhcGhcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbm9kZXMgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbm9kZXN9IG90aGVyd2lzZVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5faXNVcGRhdGUgPSBub2RlcyA/IHRydWUgOiBmYWxzZTtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbGluayBtYXAgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxpbmtNYXAgLSBhIG1hcCBmcm9tIG5vZGUgaW5kZXggdG8gYSBzZXQgb2YgbGluZXMgKHBhdGggb2JqZWN0cykgdGhhdCBjb250YWluIHRoYXQgbm9kZVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBsaW5rTWFwIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX2xpbmtNYXB9IG90aGVyd2lzZVxuXHQgKi9cblx0bGlua01hcCA6IGZ1bmN0aW9uKGxpbmtNYXApIHtcblx0XHRpZiAobGlua01hcCkge1xuXHRcdFx0dGhpcy5fbGlua01hcCA9IGxpbmtNYXA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9saW5rTWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlIG1hcCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZU1hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIGNpcmNsZSAocGF0aCBvYmplY3QpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIG5vZGVNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbm9kZU1hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlTWFwIDogZnVuY3Rpb24obm9kZU1hcCkge1xuXHRcdGlmIChub2RlTWFwKSB7XG5cdFx0XHR0aGlzLl9ub2RlTWFwID0gbm9kZU1hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGxhYmVsIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBsYWJlbE1hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIHRleHQgb2JqZWN0IChwYXRoIG9iamVjdClcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbGFiZWxNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbGFiZWxNYXB9IG90aGVyd2lzZVxuXHQgKi9cblx0bGFiZWxNYXAgOiBmdW5jdGlvbihsYWJlbE1hcCkge1xuXHRcdGlmIChsYWJlbE1hcCkge1xuXHRcdFx0dGhpcy5fbGFiZWxNYXAgPSBsYWJlbE1hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xhYmVsTWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhIGJvdW5kaW5nIGJveCBmb3IgYW4gYXJyYXkgb2Ygbm9kZSBpbmRpY2VzXG5cdCAqIEBwYXJhbSBub2RlT3JJbmRleEFycmF5IC0gYXJyYXkgb2Ygbm9kZSBpbmRpY2llcyBvciBub2RlIGFycmF5IGl0c2VsZlxuXHQgKiBAcGFyYW0gcGFkZGluZyAtIHBhZGRpbmcgaW4gcGl4ZWxzIGFwcGxpZWQgdG8gYm91bmRpbmcgYm94XG5cdCAqIEByZXR1cm5zIHt7bWluOiB7eDogTnVtYmVyLCB5OiBOdW1iZXJ9LCBtYXg6IHt4OiBudW1iZXIsIHk6IG51bWJlcn19fVxuXHQgKi9cblx0Z2V0Qm91bmRpbmdCb3ggOiBmdW5jdGlvbihub2RlT3JJbmRleEFycmF5LHBhZGRpbmcpIHtcblx0XHR2YXIgbWluID0ge1xuXHRcdFx0eCA6IE51bWJlci5NQVhfVkFMVUUsXG5cdFx0XHR5IDogTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cdFx0dmFyIG1heCA9IHtcblx0XHRcdHggOiAtTnVtYmVyLk1BWF9WQUxVRSxcblx0XHRcdHkgOiAtTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cblx0XHR2YXIgYmJQYWRkaW5nID0gcGFkZGluZyB8fCAwO1xuXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVPckluZGV4QXJyYXkuZm9yRWFjaChmdW5jdGlvbihub2RlT3JJbmRleCkge1xuXHRcdFx0dmFyIGlkeCA9IG5vZGVPckluZGV4IGluc3RhbmNlb2YgT2JqZWN0ID8gbm9kZU9ySW5kZXguaW5kZXggOiBub2RlT3JJbmRleDtcblx0XHRcdHZhciBjaXJjbGUgPSB0aGF0Ll9ub2RlTWFwW2lkeF07XG5cdFx0XHRtaW4ueCA9IE1hdGgubWluKG1pbi54LCAoY2lyY2xlLmZpbmFsWCB8fCBjaXJjbGUueCkgLSAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdFx0bWluLnkgPSBNYXRoLm1pbihtaW4ueSwgKGNpcmNsZS5maW5hbFkgfHwgY2lyY2xlLnkpIC0gKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHRcdG1heC54ID0gTWF0aC5tYXgobWF4LngsIChjaXJjbGUuZmluYWxYIHx8IGNpcmNsZS54KSArIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0XHRtYXgueSA9IE1hdGgubWF4KG1heC55LCAoY2lyY2xlLmZpbmFsWSB8fCBjaXJjbGUueSkgKyAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdH0pO1xuXHRcdHJldHVybiB7XG5cdFx0XHR4IDogbWluLngsXG5cdFx0XHR5IDogbWluLnksXG5cdFx0XHR3aWR0aCA6IChtYXgueCAtIG1pbi54KSxcblx0XHRcdGhlaWdodCA6IChtYXgueSAtIG1pbi55KVxuXHRcdH07XG5cdH0sXG5cblx0X2FwcGx5Wm9vbVNjYWxlIDogZnVuY3Rpb24oYkFwcGx5KSB7XG5cdFx0dGhpcy5fYXBwbHlab29tID0gYkFwcGx5O1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiBhIG5vZGUgYW5kIGFsbCBhdHRhY2hlZCBsaW5rcyBhbmQgbGFiZWxzIHdpdGhvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBub2RlIC0gdGhlIG5vZGUgb2JqZWN0IGJlaW5nIHBvc2l0aW9uZWRcblx0ICogQHBhcmFtIHggLSB0aGUgbmV3IHggcG9zaXRpb24gZm9yIHRoZSBub2RlXG5cdCAqIEBwYXJhbSB5IC0gdGhlIG5ldyB5IHBvc2l0aW9uIGZvciB0aGUgbm9kZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZSA6IGZ1bmN0aW9uKG5vZGUseCx5LGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUseCx5LHRydWUpO1xuXHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIGEgbm9kZSBieSBhbmltYXRpbmcgZnJvbSBpdCdzIG9sZCBwb3NpdGlvbiB0byBpdCdzIG5ldyBvbmVcblx0ICogQHBhcmFtIG5vZGUgLSB0aGUgbm9kZSBiZWluZyByZXBvc2l0aW9uZWRcblx0ICogQHBhcmFtIHggLSB0aGUgbmV3IHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHkgLSB0aGUgbmV3IHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIGJJbW1lZGlhdGUgLSBpZiB0cnVlLCBzZXRzIHdpdGhvdXQgYW5pbWF0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3NldE5vZGVQb3NpdGlvbiA6IGZ1bmN0aW9uKG5vZGUsbmV3WCxuZXdZLGJJbW1lZGlhdGUsY2FsbGJhY2spIHtcblx0XHR2YXIgeCA9IG5ld1ggKiAodGhpcy5fYXBwbHlab29tID8gdGhpcy5fem9vbVNjYWxlIDogMSk7XG5cdFx0dmFyIHkgPSBuZXdZICogKHRoaXMuX2FwcGx5Wm9vbSA/IHRoaXMuX3pvb21TY2FsZSA6IDEpO1xuXG5cblx0XHQvLyBVcGRhdGUgdGhlIG5vZGUgcmVuZGVyIG9iamVjdFxuXHRcdHZhciBjaXJjbGUgPSB0aGlzLl9ub2RlTWFwW25vZGUuaW5kZXhdO1xuXHRcdGlmIChiSW1tZWRpYXRlIT09dHJ1ZSkge1xuXHRcdFx0Y2lyY2xlLnR3ZWVuQXR0cih7XG5cdFx0XHRcdHg6IHgsXG5cdFx0XHRcdHk6IHlcblx0XHRcdH0sIHtcblx0XHRcdFx0ZHVyYXRpb246IHRoaXMuX2R1cmF0aW9uLFxuXHRcdFx0XHRlYXNpbmc6IHRoaXMuX2Vhc2luZyxcblx0XHRcdFx0Y2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWxldGUgY2lyY2xlLmZpbmFsWDtcblx0XHRcdFx0XHRkZWxldGUgY2lyY2xlLmZpbmFsWTtcblx0XHRcdFx0XHRub2RlLnggPSB4O1xuXHRcdFx0XHRcdG5vZGUueSA9IHk7XG5cdFx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRjaXJjbGUuZmluYWxYID0geDtcblx0XHRcdGNpcmNsZS5maW5hbFkgPSB5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjaXJjbGUueCA9IHg7XG5cdFx0XHRjaXJjbGUueSA9IHk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9saW5rTWFwW25vZGUuaW5kZXhdLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bm9kZS54ID0geDtcblx0XHRcdG5vZGUueSA9IHk7XG5cdFx0XHRjaXJjbGUueCA9IHg7XG5cdFx0XHRjaXJjbGUueSA9IHk7XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBsYWJlbCByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIGxhYmVsID0gdGhpcy5fbGFiZWxNYXBbbm9kZS5pbmRleF07XG5cdFx0aWYgKGxhYmVsKSB7XG5cdFx0XHR2YXIgbGFiZWxQb3MgPSB0aGlzLmxheW91dExhYmVsKGNpcmNsZSk7XG5cdFx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdFx0bGFiZWwudHdlZW5BdHRyKGxhYmVsUG9zLCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoaXMuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBsYWJlbFBvcykge1xuXHRcdFx0XHRcdGlmIChsYWJlbFBvcy5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuXHRcdFx0XHRcdFx0bGFiZWxbcHJvcF0gPSBsYWJlbFBvc1twcm9wXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbGluayByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX2xpbmtNYXBbbm9kZS5pbmRleF0uZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgbGlua09iaktleSA9IG51bGw7XG5cdFx0XHRpZiAobGluay5zb3VyY2UuaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0bGlua09iaktleSA9ICdzb3VyY2UnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua09iaktleSA9ICd0YXJnZXQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRcdGxpbmsudHdlZW5PYmoobGlua09iaktleSwge1xuXHRcdFx0XHRcdHg6IHgsXG5cdFx0XHRcdFx0eTogeVxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhhdC5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS54ID0geDtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS55ID0geTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGVmYXVsdCBsYXlvdXQgcm91dGluZS4gICBTaG91bGQgYmUgb3ZlcnJpZGVuIGJ5IHN1YmNsYXNzZXMuXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKHcsaCxjYWxsYmFjaykge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRmdW5jdGlvbiBvbkNvbXBsZXRlKCkge1xuXHRcdFx0dGhhdC5fZXZlbnRzU3VzcGVuZGVkID0gZmFsc2U7XG5cdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9ldmVudHNTdXNwZW5kZWQgPSB0cnVlO1xuXHRcdHZhciBpc0FzeW5jID0gIXRoaXMuX3BlcmZvcm1MYXlvdXQodyxoKTtcblx0XHRpZiAoaXNBc3luYykge1xuXHRcdFx0c2V0VGltZW91dChvbkNvbXBsZXRlLHRoaXMuZHVyYXRpb24oKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9uQ29tcGxldGUoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblxuXHQvKipcblx0ICogXHQvKipcblx0ICogSG9vayBmb3IgZG9pbmcgYW55IGRyYXdpbmcgYmVmb3JlIHJlbmRlcmluZyBvZiB0aGUgZ3JhcGggdGhhdCBpcyBsYXlvdXQgc3BlY2lmaWNcblx0ICogaWUvIEJhY2tncm91bmRzLCBldGNcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IC0gYSBsaXN0IG9mIHBhdGguanMgcmVuZGVyIG9iamVjdHMgdG8gYmUgYWRkZWQgdG8gdGhlIHNjZW5lXG5cdCAqL1xuXHRwcmVyZW5kZXIgOiBmdW5jdGlvbih3LGgpIHtcblx0XHRyZXR1cm4gW107XG5cdH0sXG5cblx0LyoqXG5cdCAqIEhvb2sgZm9yIGRvaW5nIGFueSBkcmF3aW5nIGFmdGVyIHJlbmRlcmluZyBvZiB0aGUgZ3JhcGggdGhhdCBpcyBsYXlvdXQgc3BlY2lmaWNcblx0ICogaWUvIE92ZXJsYXlzLCBldGNcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IC0gYSBsaXN0IG9mIHBhdGguanMgcmVuZGVyIG9iamVjdHMgdG8gYmUgYWRkZWQgdG8gdGhlIHNjZW5lXG5cdCAqL1xuXHRwb3N0cmVuZGVyIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBsYWJlbCBwb3NpdGlvbiBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWCAtIHRoZSB4IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWSAtIHRoZSB5IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSByYWRpdXMgLSB0aGUgcmFkaXVzIG9mIHRoZSBub2RlXG5cdCAqIEByZXR1cm5zIHt7eDogeCBwb3NpdGlvbiBvZiB0aGUgbGFiZWwsIHk6IHkgcG9zaXRpb24gb2YgdGhlIGxhYmVsfX1cblx0ICovXG5cdGxheW91dExhYmVsIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR4OiBub2RlLnggKyBub2RlLnJhZGl1cyArIDUsXG5cdFx0XHR5OiBub2RlLnkgKyBub2RlLnJhZGl1cyArIDVcblx0XHR9O1xuXHR9XG59KTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0O1xuIiwidmFyIExJTktfVFlQRSA9IHtcblx0REVGQVVMVCA6ICdsaW5lJyxcblx0TElORSA6ICdsaW5lJyxcblx0QVJST1cgOiAnYXJyb3cnLFxuXHRBUkMgOiAnYXJjJ1xufTtcbm1vZHVsZS5leHBvcnRzID0gTElOS19UWVBFOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTElOS19UWVBFID0gcmVxdWlyZSgnLi9saW5rVHlwZScpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5cbnZhciBSRUdST1VORF9CQl9QQURESU5HID0gMDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgR3JhcGggcmVuZGVyIG9iamVjdFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBHcmFwaCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBbXTtcblx0dGhpcy5fbGlua3MgPSBbXTtcblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fbGF5b3V0ZXIgPSBudWxsO1xuXHR0aGlzLl9ncm91cGluZ01hbmFnZXIgPSBudWxsO1xuXHR0aGlzLl93aWR0aCA9IDA7XG5cdHRoaXMuX2hlaWdodCA9IDA7XG5cdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0dGhpcy5fem9vbUxldmVsID0gMDtcblx0dGhpcy5fc2NlbmUgPSBudWxsO1xuXHR0aGlzLl9zaG93QWxsTGFiZWxzID0gZmFsc2U7XG5cdHRoaXMuX3ByZXJlbmRlckdyb3VwID0gbnVsbDtcblx0dGhpcy5fcG9zdHJlbmRlckdyb3VwID0gbnVsbDtcblx0dGhpcy5fcGFubmFibGUgPSBudWxsO1xuXHR0aGlzLl96b29tYWJsZSA9IG51bGw7XG5cdHRoaXMuX2RyYWdnYWJsZSA9IG51bGw7XG5cdHRoaXMuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdHRoaXMuX2N1cnJlbnRNb3ZlU3RhdGUgPSBudWxsO1xuXHR0aGlzLl9pbnZlcnRlZFBhbiA9IDE7XG5cblx0dGhpcy5fZm9udFNpemUgPSBudWxsO1xuXHR0aGlzLl9mb250RmFtaWx5ID0gbnVsbDtcblx0dGhpcy5fZm9udENvbG9yID0gbnVsbDtcblx0dGhpcy5fZm9udFN0cm9rZSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRTdHJva2VXaWR0aCA9IG51bGw7XG5cdHRoaXMuX3NoYWRvd0NvbG9yID0gbnVsbDtcblx0dGhpcy5fc2hhZG93T2Zmc2V0WCA9IG51bGw7XG5cdHRoaXMuX3NoYWRvd09mZnNldFkgPSBudWxsO1xuXHR0aGlzLl9zaGFkb3dCbHVyID0gbnVsbDtcblxuXHQvLyBEYXRhIHRvIHJlbmRlciBvYmplY3QgbWFwc1xuXHR0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvTGFiZWwgPSB7fTtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuR3JhcGgucHJvdG90eXBlID0gXy5leHRlbmQoR3JhcGgucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIG5vZGVzIC0gYW4gYXJyYXkgb2Ygbm9kZXNcblx0ICoge1xuXHQgKiBcdFx0eCA6IHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGVcdChyZXF1aXJlZClcblx0ICogXHRcdHkgOiB0aGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlXHQocmVxdWlyZWQpXG5cdCAqXHRcdGluZGV4IDogIGEgdW5pcXVlIGluZGV4XHRcdFx0XHQocmVxdWlyZWQpXG5cdCAqXHRcdGxhYmVsIDogYSBsYWJlbCBmb3IgdGhlIG5vZGVcdFx0KG9wdGlvbmFsKVxuXHQgKlx0XHRmaWxsU3R5bGUgOiBhIGNhbnZhcyBmaWxsICAgXHRcdChvcHRpb25hbCwgZGVmYXVsdCAjMDAwMDAwKVxuXHQgKlx0XHRzdHJva2VTdHlsZSA6IGEgY2FudmFzIHN0cm9rZVx0XHQob3B0aW9uYWwsIGRlZmF1bHQgdW5kZWZpbmVkKVxuXHQgKlx0XHRsaW5lV2lkdGggOiB3aWR0aCBvZiB0aGUgc3Ryb2tlXHRcdChvcHRpb25hbCwgZGVmYXVsdCAxKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIG5vZGVzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB7R3JhcGguX25vZGVzfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUgPSB7fTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsID0ge307XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtub2RlLmluZGV4XSA9IFtdO30pO1xuXHRcdFx0aWYgKHRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHRcdHRoaXMuX2xheW91dGVyLm5vZGVzKG5vZGVzKTtcblx0XHRcdH1cblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdG5vZGVXaXRoSW5kZXggOiBmdW5jdGlvbihub2RlSW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbm9kZUluZGV4VG9DaXJjbGVbbm9kZUluZGV4XTtcblx0fSxcblxuXHRsYWJlbFdpdGhJbmRleCA6IGZ1bmN0aW9uKG5vZGVJbmRleCkge1xuXHRcdHJldHVybiB0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGVJbmRleF07XG5cdH0sXG5cblx0dXBkYXRlTm9kZSA6IGZ1bmN0aW9uKG5vZGVJbmRleCxwcm9wcykge1xuXHRcdC8vIFRPRE86ICByZW1vdmUgbXVja2luZyB3aXRoIHBvc2l0aW9uIHNldHRpbmdzIGZyb20gcHJvcHM/XG5cdFx0aWYgKG5vZGVJbmRleCkge1xuXHRcdFx0dmFyIGNpcmNsZSA9IHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlW25vZGVJbmRleF07XG5cdFx0XHRjaXJjbGUgPSBfLmV4dGVuZChjaXJjbGUscHJvcHMpO1xuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGVbbm9kZUluZGV4XSA9IGNpcmNsZTtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHVwZGF0ZUxhYmVsIDogZnVuY3Rpb24obm9kZUluZGV4LHByb3BzKSB7XG5cdFx0Ly8gVE9ETzogIHJlbW92ZSBtdWNraW5nIHdpdGggcG9zaXRpb24gc2V0dGluZ3MgZnJvbSBwcm9wcz9cblx0XHRpZiAobm9kZUluZGV4KSB7XG5cdFx0XHR2YXIgdGV4dCA9IHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZUluZGV4XTtcblx0XHRcdHRleHQgPSBfLmV4dGVuZCh0ZXh0LHByb3BzKTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZUluZGV4XSA9IHRleHQ7XG5cdFx0fVxuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGlua3MgLSBhbiBhcnJheSBvZiBsaW5rc1xuXHQgKiB7XG5cdCAqIFx0XHRzb3VyY2UgOiBhIG5vZGUgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNvdXJjZSBcdChyZXF1aXJlZClcblx0ICogXHRcdHRhcmdldCA6IGEgbm9kZSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGUgdGFyZ2V0XHQocmVxdWlyZWQpXG5cdCAqXHRcdHN0cm9rZVN0eWxlIDogYSBjYW52YXMgc3Ryb2tlXHRcdFx0XHRcdFx0KG9wdGlvbmFsLCBkZWZhdWx0ICMwMDAwMDApXG5cdCAqXHRcdGxpbmVXaWR0aCA6IHRoZSB3aWR0aCBvZiB0aGUgc3Ryb2tlXHRcdFx0XHRcdChvcHRpbmFsLCBkZWZhdWx0IDEpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgbGlua3MgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHtHcmFwaC5fbGlua3N9IG90aGVyd2lzZVxuXHQgKi9cblx0bGlua3MgOiBmdW5jdGlvbihsaW5rcykge1xuXHRcdGlmIChsaW5rcykge1xuXHRcdFx0dGhpcy5fbGlua3MgPSBsaW5rcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyB0aGUgbGlua3MgYmV0d2VlbiB0d28gbm9kZXNcblx0ICogQHBhcmFtIHNvdXJjZU5vZGVJbmRleCAtIEluZGV4IG9mIHNvdXJjZSBub2RlLCBpZiBudWxsLCByZXR1cm4gYWxsIGxpbmtzIGdvaW5nIHRvIHRhcmdldFxuXHQgKiBAcGFyYW0gdGFyZ2V0Tm9kZUluZGV4IC0gSW5kZXggb2YgdGFyZ2V0IG5vZGUsIGlmIG51bGwsIHJldHVybiBhbGwgbGlua3Mgc3RhcnRpbmcgZnJvbSBzb3VyY2Vcblx0ICovXG5cdGxpbmtPYmplY3RzQmV0d2VlbiA6IGZ1bmN0aW9uKHNvdXJjZU5vZGVJbmRleCx0YXJnZXROb2RlSW5kZXgpIHtcblx0XHRpZiAoc291cmNlTm9kZUluZGV4ICYmICF0YXJnZXROb2RlSW5kZXgpIHtcblx0XHRcdHZhciBhbGxTb3VyY2UgPSB0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lW3NvdXJjZU5vZGVJbmRleF07XG5cdFx0XHR2YXIganVzdFNvdXJjZSA9IGFsbFNvdXJjZS5maWx0ZXIoZnVuY3Rpb24obGluaykge1xuXHRcdFx0XHRyZXR1cm4gbGluay5zb3VyY2UuaW5kZXggPT09IHNvdXJjZU5vZGVJbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGp1c3RTb3VyY2U7XG5cdFx0fSBlbHNlIGlmICghc291cmNlTm9kZUluZGV4ICYmIHRhcmdldE5vZGVJbmRleCkge1xuXHRcdFx0dmFyIGFsbFRhcmdldCA9IHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmVbdGFyZ2V0Tm9kZUluZGV4XTtcblx0XHRcdHZhciBqdXN0VGFyZ2V0ID0gYWxsVGFyZ2V0LmZpbHRlcihmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHRcdHJldHVybiBsaW5rLnRhcmdldC5pbmRleCA9PT0gdGFyZ2V0Tm9kZUluZGV4O1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4ganVzdFRhcmdldDtcblx0XHR9IGVsc2UgaWYgKHNvdXJjZU5vZGVJbmRleCAmJiB0YXJnZXROb2RlSW5kZXgpIHtcblx0XHRcdHZhciBzb3VyY2VMaW5rcyA9IHRoaXMubGlua09iamVjdHNCZXR3ZWVuKHNvdXJjZU5vZGVJbmRleCxudWxsKTtcblx0XHRcdHZhciB0b1RhcmdldCA9IHNvdXJjZUxpbmtzLmZpbHRlcihmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHRcdHJldHVybiBsaW5rLnRhcmdldC5pbmRleCA9PT0gdGFyZ2V0Tm9kZUluZGV4O1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdG9UYXJnZXQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGNhbnZhcyAtIGFuIEhUTUwgY2FudmFzIG9iamVjdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGNhbnZhcyBwYXJhbWV0ZXIgaXMgZGVmaW5lZCwgdGhlIGNhbnZhcyBvdGhlcndpc2Vcblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblxuXHRcdFx0dmFyIHgseTtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2Vkb3duJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHggPSBlLmNsaWVudFg7XG5cdFx0XHRcdHkgPSBlLmNsaWVudFk7XG5cdFx0XHRcdCQodGhhdC5fY2FudmFzKS5vbignbW91c2Vtb3ZlJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0dmFyIGR4ID0geCAtIGUuY2xpZW50WDtcblx0XHRcdFx0XHR2YXIgZHkgPSB5IC0gZS5jbGllbnRZO1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9kcmFnZ2FibGUgJiYgdGhhdC5fY3VycmVudE92ZXJOb2RlICYmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSBudWxsIHx8IHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdkcmFnZ2luZycpKSAge1xuXHRcdFx0XHRcdFx0dGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9ICdkcmFnZ2luZyc7XG5cblx0XHRcdFx0XHRcdC8vIE1vdmUgdGhlIG5vZGVcblx0XHRcdFx0XHRcdHRoYXQuX2xheW91dGVyLl9zZXROb2RlUG9zaXRpb25JbW1lZGlhdGUodGhhdC5fY3VycmVudE92ZXJOb2RlLCB0aGF0Ll9jdXJyZW50T3Zlck5vZGUueCAtIGR4LCB0aGF0Ll9jdXJyZW50T3Zlck5vZGUueSAtIGR5KTtcblx0XHRcdFx0XHRcdHRoYXQudXBkYXRlKCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGF0Ll9wYW5uYWJsZSAmJiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gbnVsbCB8fCB0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAncGFubmluZycpKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9wYW4oLWR4KnRoYXQuX2ludmVydGVkUGFuLC1keSp0aGF0Ll9pbnZlcnRlZFBhbik7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gJ3Bhbm5pbmcnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR4ID0gZS5jbGllbnRYO1xuXHRcdFx0XHRcdHkgPSBlLmNsaWVudFk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2V1cCcsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQodGhhdC5fY2FudmFzKS5vZmYoJ21vdXNlbW92ZScpO1xuXHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ2RyYWdnaW5nJykge1xuXHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9IG51bGw7XG5cdFx0XHR9KTtcblxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgd2lkdGhcblx0ICogQHJldHVybnMgV2lkdGggaW4gcGl4ZWxzIG9mIHRoZSBncmFwaFxuXHQgKi9cblx0d2lkdGggOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2NlbmUud2lkdGg7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBoZWlnaHRcblx0ICogQHJldHVybnMgSGVpZ2h0IGluIHBpeGVscyBvZiB0aGUgZ3JhcGhcblx0ICovXG5cdGhlaWdodCA6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9zY2VuZS5oZWlnaHQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFRvZ2dsZXMgYm9vbGVhbiBmb3Igc2hvd2luZy9oaWRpbmcgYWxsIGxhYmVscyBpbiB0aGUgZ3JhcGggYnkgZGVmYXVsdFxuXHQgKiBAcGFyYW0gc2hvd0FsbExhYmVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHNob3dBbGxMYWJlbHMgOiBmdW5jdGlvbihzaG93QWxsTGFiZWxzKSB7XG5cdFx0aWYgKHNob3dBbGxMYWJlbHMpIHtcblx0XHRcdHRoaXMuX3Nob3dBbGxMYWJlbHMgPSBzaG93QWxsTGFiZWxzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fc2hvd0FsbExhYmVscztcblx0XHR9XG5cblx0XHQvLyBVcGRhdGVcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRpZiAoc2hvd0FsbExhYmVscykge1xuXHRcdFx0XHR0aGF0LmFkZExhYmVsKG5vZGUsbm9kZS5sYWJlbFRleHQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhhdC5yZW1vdmVMYWJlbChub2RlLG5vZGUubGFiZWxUZXh0KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBBZGRzIGEgbGFiZWwgZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKiBAcGFyYW0gdGV4dFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRhZGRMYWJlbCA6IGZ1bmN0aW9uKG5vZGUsdGV4dCkge1xuXHRcdGlmICh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdKSB7XG5cdFx0XHR0aGlzLnJlbW92ZUxhYmVsKG5vZGUpO1xuXHRcdH1cblx0XHR2YXIgbGFiZWxBdHRycyA9IHRoaXMuX2xheW91dGVyLmxheW91dExhYmVsKG5vZGUpO1xuXG5cdFx0dmFyIGZvbnRTaXplID0gdHlwZW9mKHRoaXMuX2ZvbnRTaXplKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTaXplKG5vZGUpIDogdGhpcy5fZm9udFNpemU7XG5cdFx0aWYgKCFmb250U2l6ZSkge1xuXHRcdFx0Zm9udFNpemUgPSAxMDtcblx0XHR9XG5cblx0XHR2YXIgZm9udEZhbWlseSA9IHR5cGVvZih0aGlzLl9mb250RmFtaWx5KSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRGYW1pbHkobm9kZSkgOiB0aGlzLl9mb250RmFtaWx5O1xuXHRcdGlmICghZm9udEZhbWlseSkge1xuXHRcdFx0Zm9udEZhbWlseSA9ICdzYW5zLXNlcmlmJztcblx0XHR9XG5cdFx0dmFyIGZvbnRTdHIgPSBmb250U2l6ZSArICdweCAnICsgZm9udEZhbWlseTtcblxuXHRcdHZhciBmb250RmlsbCA9IHR5cGVvZih0aGlzLl9mb250Q29sb3IpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udENvbG9yKG5vZGUpIDogdGhpcy5fZm9udENvbG9yO1xuXHRcdGlmICghZm9udEZpbGwpIHtcblx0XHRcdGZvbnRGaWxsID0gJyMwMDAwMDAnO1xuXHRcdH1cblx0XHR2YXIgZm9udFN0cm9rZSA9IHR5cGVvZih0aGlzLl9mb250U3Ryb2tlKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTdHJva2Uobm9kZSkgOiB0aGlzLl9mb250U3Ryb2tlO1xuXHRcdHZhciBmb250U3Ryb2tlV2lkdGggPSB0eXBlb2YodGhpcy5fZm9udFN0cm9rZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U3Ryb2tlV2lkdGggOiB0aGlzLl9mb250U3Ryb2tlV2lkdGg7XG5cblx0XHR2YXIgbGFiZWxTcGVjID0ge1xuXHRcdFx0Zm9udDogZm9udFN0cixcblx0XHRcdGZpbGxTdHlsZTogZm9udEZpbGwsXG5cdFx0XHRzdHJva2VTdHlsZTogZm9udFN0cm9rZSxcblx0XHRcdGxpbmVXaWR0aDogZm9udFN0cm9rZVdpZHRoLFxuXHRcdFx0dGV4dCA6IHRleHRcblx0XHR9O1xuXG5cdFx0dmFyIGJBZGRTaGFkb3cgPSB0aGlzLl9zaGFkb3dCbHVyIHx8IHRoaXMuX3NoYWRvd09mZnNldFggfHwgdGhpcy5fc2hhZG93T2Zmc2V0WSB8fCB0aGlzLl9zaGFkb3dDb2xvcjtcblx0XHRpZiAoYkFkZFNoYWRvdykge1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dDb2xvciddID0gdGhpcy5fc2hhZG93Q29sb3IgfHwgJyMwMDAnO1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dPZmZzZXRYJ10gPSB0aGlzLl9zaGFkb3dPZmZzZXRYIHx8IDA7XG5cdFx0XHRsYWJlbFNwZWNbJ3NoYWRvd09mZnNldFknXSA9IHRoaXMuX3NoYWRvd09mZnNldFkgfHwgMDtcblx0XHRcdGxhYmVsU3BlY1snc2hhZG93Qmx1ciddID0gdGhpcy5fc2hhZG93Qmx1ciB8fCBNYXRoLmZsb29yKGZvbnRTaXplLzMpO1xuXHRcdH1cblxuXHRcdGZvciAodmFyIGtleSBpbiBsYWJlbEF0dHJzKSB7XG5cdFx0XHRpZiAobGFiZWxBdHRycy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdGxhYmVsU3BlY1trZXldID0gbGFiZWxBdHRyc1trZXldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgbGFiZWwgPSBwYXRoLnRleHQobGFiZWxTcGVjKTtcblx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdID0gbGFiZWw7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQobGFiZWwpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgYSBsYWJlbCBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHJlbW92ZUxhYmVsIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdHZhciB0ZXh0T2JqZWN0ID0gdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHRpZiAodGV4dE9iamVjdCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGV4dE9iamVjdCk7XG5cdFx0XHRkZWxldGUgdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIG1vdXNlb3ZlciBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycgaW4gdGhlIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVPdmVyIDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdmVyID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRXZlbnQgaGFuZGxlciBmb3IgbW91c2VvdXQgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlT3V0IDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdXQgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDb252ZW5pZW5jZSBmdW5jdGlvbiBmb3Igc2V0dGluZyBub2RlT3Zlci9ub2RlT3V0IGluIGEgc2luZ2xlIGNhbGxcblx0ICogQHBhcmFtIG92ZXIgLSB0aGUgbm9kZU92ZXIgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gb3V0IC0gdGhlIG5vZGVPdXQgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlSG92ZXIgOiBmdW5jdGlvbihvdmVyLG91dCxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5ub2RlT3ZlcihvdmVyLHNlbGYpO1xuXHRcdHRoaXMubm9kZU91dChvdXQsc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIGNsaWNrIG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJy4gICBEZWZhdWx0cyB0byB0aGUgZ3JhcGggb2JqZWN0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVDbGljayA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlQ2xpY2sgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQYW4ge0dyYXBofSBieSAoZHgsZHkpLiAgIEF1dG9tYXRpY2FsbHkgcmVyZW5kZXIgdGhlIGdyYXBoLlxuXHQgKiBAcGFyYW0gZHggLSBBbW91bnQgb2YgcGFuIGluIHggZGlyZWN0aW9uXG5cdCAqIEBwYXJhbSBkeSAtIEFtb3VudCBvZiBwYW4gaW4geSBkaXJlY3Rpb25cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9wYW4gOiBmdW5jdGlvbihkeCxkeSkge1xuXHRcdHRoaXMuX3NjZW5lLnggKz0gZHg7XG5cdFx0dGhpcy5fc2NlbmUueSArPSBkeTtcblx0XHR0aGlzLl9wYW5YICs9IGR4O1xuXHRcdHRoaXMuX3BhblkgKz0gZHk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogTWFrZSB7R3JhcGh9IHBhbm5hYmxlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHBhbm5hYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fcGFubmFibGUgPSB0cnVlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlcyB0aGUgZ3JhcGggcGFuIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24gb2YgdGhlIG1vdXNlIGFzIG9wcG9zZWQgdG8gd2l0aCBpdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRpbnZlcnRQYW4gOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9pbnZlcnRlZFBhbiA9IC0xO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlIG5vZGVzIGluIHtHcmFwaH0gcmVwb2lzaXRpb25hYmxlIGJ5IGNsaWNrLWRyYWdnaW5nXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGRyYWdnYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2RyYWdnYWJsZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2dldFpvb21Gb3JMZXZlbCA6IGZ1bmN0aW9uKGxldmVsKSB7XG5cdFx0dmFyIGZhY3RvciA9IE1hdGgucG93KDEuNSAsIE1hdGguYWJzKGxldmVsIC0gdGhpcy5fem9vbUxldmVsKSk7XG5cdFx0aWYgKGxldmVsIDwgdGhpcy5fem9vbUxldmVsKSB7XG5cdFx0XHRmYWN0b3IgPSAxL2ZhY3Rvcjtcblx0XHR9XG5cdFx0cmV0dXJuIGZhY3Rvcjtcblx0fSxcblxuXHRfem9vbSA6IGZ1bmN0aW9uKGZhY3Rvcix4LHkpIHtcblx0XHR0aGlzLl96b29tU2NhbGUgKj0gZmFjdG9yO1xuXHRcdHRoaXMuX2xheW91dGVyLl96b29tU2NhbGUgPSB0aGlzLl96b29tU2NhbGU7XG5cblx0XHQvLyBQYW4gc2NlbmUgYmFjayB0byBvcmlnaW5cblx0XHR2YXIgb3JpZ2luYWxYID0gdGhpcy5fc2NlbmUueDtcblx0XHR2YXIgb3JpZ2luYWxZID0gdGhpcy5fc2NlbmUueTtcblx0XHR0aGlzLl9wYW4oLXRoaXMuX3NjZW5lLngsLXRoaXMuX3NjZW5lLnkpO1xuXG5cdFx0dmFyIG1vdXNlWCA9IHggfHwgMDtcblx0XHR2YXIgbW91c2VZID0geSB8fCAwO1xuXG5cdFx0Ly8gJ1pvb20nIG5vZGVzLiAgIFdlIGRvIHRoaXMgc28gdGV4dC9yYWRpdXMgc2l6ZSByZW1haW5zIGNvbnNpc3RlbnQgYWNyb3NzIHpvb20gbGV2ZWxzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9ub2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbih0aGlzLl9ub2Rlc1tpXSx0aGlzLl9ub2Rlc1tpXS54KmZhY3RvciwgdGhpcy5fbm9kZXNbaV0ueSpmYWN0b3IsdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gWm9vbSB0aGUgcmVuZGVyIGdyb3Vwc1xuXHRcdGlmICh0aGlzLl9wcmVyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVZID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fcG9zdHJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHR9XG5cblx0XHQvLyBSZXZlcnNlIHRoZSAnb3JpZ2luIHBhbicgd2l0aCB0aGUgc2NhbGUgYXBwbGllZCBhbmQgcmVjZW50ZXIgdGhlIG1vdXNlIHdpdGggc2NhbGUgYXBwbGllZCBhcyB3ZWxsXG5cdFx0dmFyIG5ld01vdXNlWCA9IG1vdXNlWCpmYWN0b3I7XG5cdFx0dmFyIG5ld01vdXNlWSA9IG1vdXNlWSpmYWN0b3I7XG5cdFx0dGhpcy5fcGFuKG9yaWdpbmFsWCpmYWN0b3IgLSAobmV3TW91c2VYLW1vdXNlWCksb3JpZ2luYWxZKmZhY3RvciAtIChuZXdNb3VzZVktbW91c2VZKSk7XG5cblx0XHQvLyBVcGRhdGUgdGhlIHJlZ3JvdXAgdW5kZXJsYXlzXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCAmJiB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbiAmJiB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHRoaXMuX2hhbmRsZUdyb3VwLnJlbW92ZUFsbCgpO1xuXHRcdFx0dGhhdC5fc2NlbmUudXBkYXRlKCk7XG5cdFx0XHR0aGF0Ll9hZGRSZWdyb3VwSGFuZGxlcygpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogTWFrZSB7R3JhcGh9IHpvb21hYmxlIGJ5IHVzaW5nIHRoZSBtb3VzZXdoZWVsXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHpvb21hYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLl96b29tYWJsZSkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZXdoZWVsJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciB3aGVlbCA9IGUub3JpZ2luYWxFdmVudC53aGVlbERlbHRhLzEyMDsvL24gb3IgLW5cblx0XHRcdFx0dmFyIGZhY3Rvcjtcblx0XHRcdFx0aWYgKHdoZWVsIDwgMCkge1xuXHRcdFx0XHRcdGZhY3RvciA9IHRoYXQuX2dldFpvb21Gb3JMZXZlbCh0aGF0Ll96b29tTGV2ZWwtMSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZmFjdG9yID0gdGhhdC5fZ2V0Wm9vbUZvckxldmVsKHRoYXQuX3pvb21MZXZlbCsxKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0Ll96b29tKGZhY3RvciwgZS5vZmZzZXRYLCBlLm9mZnNldFkpO1xuXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3pvb21hYmxlID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxheW91dCBmdW5jdGlvbiBmb3IgdGhlIG5vZGVzXG5cdCAqIEBwYXJhbSBsYXlvdXRlciAtIEFuIGluc3RhbmNlIChvciBzdWJjbGFzcykgb2YgTGF5b3V0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaXMgbGF5b3V0ZXIgcGFyYW0gaXMgZGVmaW5lZCwgdGhlIGxheW91dGVyIG90aGVyd2lzZVxuXHQgKi9cblx0bGF5b3V0ZXIgOiBmdW5jdGlvbihsYXlvdXRlcikge1xuXHRcdGlmIChsYXlvdXRlcikge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIgPSBsYXlvdXRlcjtcblx0XHRcdHRoaXMuX2xheW91dGVyXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xheW91dGVyO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgYSBsYXlvdXQgb2YgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR0aGlzLl9sYXlvdXRlci5sYXlvdXQodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cblx0XHRcdC8vIFVwZGF0ZSB0aGUgcmVncm91cCB1bmRlcmxheXNcblx0XHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCAmJiB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbikge1xuXHRcdFx0XHR2YXIgdW5kZXJsYXlzID0gdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW47XG5cdFx0XHRcdHZhciB1cGRhdGVkID0gMDtcblx0XHRcdFx0dW5kZXJsYXlzLmZvckVhY2goZnVuY3Rpb24odW5kZXJsYXkpIHtcblx0XHRcdFx0XHR2YXIgaW5kaWNlcyA9IHVuZGVybGF5LmdyYXBoanNfaW5kaWNlcztcblx0XHRcdFx0XHR2YXIgYmIgPSB0aGF0Ll9sYXlvdXRlci5nZXRCb3VuZGluZ0JveChpbmRpY2VzLFJFR1JPVU5EX0JCX1BBRERJTkcpO1xuXHRcdFx0XHRcdHVuZGVybGF5LnR3ZWVuQXR0cih7XG5cdFx0XHRcdFx0XHR4OiBiYi54LFxuXHRcdFx0XHRcdFx0eTogYmIueSxcblx0XHRcdFx0XHRcdHdpZHRoIDogYmIud2lkdGgsXG5cdFx0XHRcdFx0XHRoZWlnaHQgOiBiYi5oZWlnaHRcblx0XHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0XHRkdXJhdGlvbjogdGhhdC5fbGF5b3V0ZXIuZHVyYXRpb24oKSxcblx0XHRcdFx0XHRcdGVhc2luZzogdGhhdC5fbGF5b3V0ZXIuZWFzaW5nKClcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cdGdyb3VwaW5nTWFuYWdlciA6IGZ1bmN0aW9uKGdyb3VwaW5nTWFuYWdlcikge1xuXHRcdGlmIChncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHRoaXMuX2dyb3VwaW5nTWFuYWdlciA9IGdyb3VwaW5nTWFuYWdlcjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2dyb3VwaW5nTWFuYWdlcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0aW5pdGlhbGl6ZUdyb3VwaW5nIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLm5vZGVzKHRoaXMuX25vZGVzKVxuXHRcdFx0XHQubGlua3ModGhpcy5fbGlua3MpXG5cdFx0XHRcdC5pbml0aWFsaXplSGVpcmFyY2h5KCk7XG5cblx0XHRcdHRoaXMubm9kZXModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWROb2RlcygpKTtcblx0XHRcdHRoaXMubGlua3ModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWRMaW5rcygpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0dW5ncm91cCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRpZiAoIW5vZGUgfHwgIW5vZGUuY2hpbGRyZW4pIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLnVuZ3JvdXAobm9kZSk7XG5cdFx0XHR0aGlzLmNsZWFyKClcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSlcblx0XHRcdFx0LmxpbmtzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSlcblx0XHRcdFx0LmRyYXcoKTtcblxuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKHRydWUpO1xuXHRcdFx0dGhpcy5sYXlvdXQoKTtcblx0XHRcdHRoaXMuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZShmYWxzZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHJlZ3JvdXAgOiBmdW5jdGlvbih1bmdyb3VwZWRBZ2dyZWdhdGVLZXkpIHtcblx0XHQvLyBBbmltYXRlIHRoZSByZWdyb3VwXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBwYXJlbnRBZ2dyZWdhdGUgPSB0aGlzLl9ncm91cGluZ01hbmFnZXIuZ2V0QWdncmVnYXRlKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSk7XG5cblx0XHR2YXIgYXZnUG9zID0geyB4OiAwLCB5IDogMH07XG5cdFx0dmFyIG1heFJhZGl1cyA9IDA7XG5cdFx0cGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdGF2Z1Bvcy54ICs9IGNoaWxkLng7XG5cdFx0XHRhdmdQb3MueSArPSBjaGlsZC55O1xuXHRcdH0pO1xuXHRcdGF2Z1Bvcy54IC89IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGg7XG5cdFx0YXZnUG9zLnkgLz0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmxlbmd0aDtcblxuXHRcdHZhciBpbmRleE9mQ2hpbGRyZW4gPSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubWFwKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5fYWdncmVnYXRlZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9ncm91cGluZ01hbmFnZXIuX2FnZ3JlZ2F0ZWROb2Rlc1tpXS5pbmRleCA9PT0gY2hpbGQuaW5kZXgpIHtcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBtaW5DaGlsZEluZGV4ID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRpbmRleE9mQ2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihpZHgpIHtcblx0XHRcdG1pbkNoaWxkSW5kZXggPSBNYXRoLm1pbihtaW5DaGlsZEluZGV4LGlkeCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgYW5pbWF0ZWRSZWdyb3VwZWQgPSAwO1xuXHRcdHRoaXMuX3N1c3BlbmRFdmVudHMoKTtcdFx0XHQvLyBsYXlvdXQgd2lsbCByZXN1bWUgdGhlbVxuXHRcdHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cblx0XHRcdHZhciBsYWJlbCA9IHRoYXQuX25vZGVJbmRleFRvTGFiZWxbY2hpbGQuaW5kZXhdO1xuXHRcdFx0bGFiZWwudHdlZW5BdHRyKHtcblx0XHRcdFx0b3BhY2l0eSA6IDBcblx0XHRcdH0sIHtcblx0XHRcdFx0ZHVyYXRpb24gOiB0aGF0Ll9sYXlvdXRlci5kdXJhdGlvbigpLFxuXHRcdFx0XHRjYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGxhYmVsLm9wYWNpdHkgPSAxO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhhdC5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbihjaGlsZCxhdmdQb3MueCxhdmdQb3MueSxmYWxzZSxmdW5jdGlvbigpIHtcblx0XHRcdFx0YW5pbWF0ZWRSZWdyb3VwZWQrKztcblx0XHRcdFx0aWYgKGFuaW1hdGVkUmVncm91cGVkID09PSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0XHRcdFx0dmFyIHJlZ3JvdXBlZEFnZ3JlZ2F0ZSA9IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5yZWdyb3VwKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSxtaW5DaGlsZEluZGV4KTtcblx0XHRcdFx0XHRcdHJlZ3JvdXBlZEFnZ3JlZ2F0ZS54ID0gYXZnUG9zLng7XG5cdFx0XHRcdFx0XHRyZWdyb3VwZWRBZ2dyZWdhdGUueSA9IGF2Z1Bvcy55O1xuXHRcdFx0XHRcdFx0dGhhdC5jbGVhcigpXG5cdFx0XHRcdFx0XHRcdC5ub2Rlcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpXG5cdFx0XHRcdFx0XHRcdC5saW5rcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpO1xuXHRcdFx0XHRcdFx0dGhhdC5kcmF3KCk7XG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUodHJ1ZSk7XG5cdFx0XHRcdFx0XHR0aGF0LmxheW91dCgpO1xuXHRcdFx0XHRcdFx0dGhhdC5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKGZhbHNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzaXplIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTaXplIC0gc2l6ZSBvZiB0aGUgZm9udCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U2l6ZSBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRTaXplfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTaXplIDogZnVuY3Rpb24oZm9udFNpemUpIHtcblx0XHRpZiAoZm9udFNpemUpIHtcblx0XHRcdHRoaXMuX2ZvbnRTaXplID0gZm9udFNpemU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250U2l6ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBjb2xvdXIgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udENvbG91ciAtIEEgaGV4IHN0cmluZyBmb3IgdGhlIGNvbG91ciBvZiB0aGUgbGFiZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udENvbG91ciBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRDb2xvdXJ9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udENvbG91ciA6IGZ1bmN0aW9uKGZvbnRDb2xvdXIpIHtcblx0XHRpZiAoZm9udENvbG91cikge1xuXHRcdFx0dGhpcy5fZm9udENvbG9yID0gZm9udENvbG91cjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRDb2xvcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzdHJva2UgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udFN0cm9rZSAtIEEgaGV4IHN0cmluZyBmb3IgdGhlIGNvbG9yIG9mIHRoZSBsYWJlbCBzdHJva2Vcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U3Ryb2tlIHBhcmFtIGlzIGRlZmluZWQsIHtHcmFwaC5fZm9udFN0cm9rZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U3Ryb2tlIDogZnVuY3Rpb24oZm9udFN0cm9rZSkge1xuXHRcdGlmIChmb250U3Ryb2tlKSB7XG5cdFx0XHR0aGlzLl9mb250U3Ryb2tlID0gZm9udFN0cm9rZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTdHJva2U7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc3Ryb2tlIHdpZHRoIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTdHJva2VXaWR0aCAtIHNpemUgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFN0cm9rZVdpZHRoIHBhcmFtIGlzIGRlZmluZWQsIHtHcmFwaC5fZm9udFN0cm9rZVdpZHRofSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTdHJva2VXaWR0aCA6IGZ1bmN0aW9uKGZvbnRTdHJva2VXaWR0aCkge1xuXHRcdGlmIChmb250U3Ryb2tlV2lkdGgpIHtcblx0XHRcdHRoaXMuX2ZvbnRTdHJva2VXaWR0aCA9IGZvbnRTdHJva2VXaWR0aDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTdHJva2VXaWR0aDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBmYW1pbHkgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udEZhbWlseSAtIEEgc3RyaW5nIGZvciB0aGUgZm9udCBmYW1pbHkgKGEgbGEgSFRNTDUgQ2FudmFzKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRGYW1pbHkgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250RmFtaWx5fSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRGYW1pbHkgOiBmdW5jdGlvbihmb250RmFtaWx5KSB7XG5cdFx0aWYgKGZvbnRGYW1pbHkpIHtcblx0XHRcdHRoaXMuX2ZvbnRGYW1pbHkgPSBmb250RmFtaWx5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udEZhbWlseTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0Zm9udFNoYWRvdyA6IGZ1bmN0aW9uKGNvbG9yLG9mZnNldFgsb2Zmc2V0WSxibHVyKSB7XG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGNvbG9yOiB0aGlzLl9zaGFkb3dDb2xvcixcblx0XHRcdFx0b2Zmc2V0WDogdGhpcy5fc2hhZG93T2Zmc2V0WCxcblx0XHRcdFx0b2Zmc2V0WTogdGhpcy5fc2hhZG93T2Zmc2V0WSxcblx0XHRcdFx0Ymx1cjogdGhpcy5fc2hhZG93Qmx1clxuXHRcdFx0fTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc2hhZG93Q29sb3IgPSBjb2xvcjtcblx0XHRcdHRoaXMuX3NoYWRvd09mZnNldFggPSBvZmZzZXRYO1xuXHRcdFx0dGhpcy5fc2hhZG93T2Zmc2V0WSA9IG9mZnNldFk7XG5cdFx0XHR0aGlzLl9zaGFkb3dCbHVyID0gYmx1cjtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogUmVzaXplIHRoZSBncmFwaC4gIEF1dG9tYXRpY2FsbHkgcGVyZm9ybXMgbGF5b3V0IGFuZCByZXJlbmRlcnMgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSB3IC0gdGhlIG5ldyB3aWR0aFxuXHQgKiBAcGFyYW0gaCAtIHRoZSBuZXcgaGVpZ2h0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHJlc2l6ZSA6IGZ1bmN0aW9uKHcsaCkge1xuXHRcdHRoaXMuX3dpZHRoID0gdztcblx0XHR0aGlzLl9oZWlnaHQgPSBoO1xuXHRcdCQodGhpcy5fY2FudmFzKS5hdHRyKHt3aWR0aDp3LGhlaWdodDpofSlcblx0XHRcdC53aWR0aCh3KVxuXHRcdFx0LmhlaWdodChoKTtcblx0XHR0aGlzLl9zY2VuZS5yZXNpemUodyxoKTtcblxuXHRcdGlmICghdGhpcy5fcGFubmFibGUgJiYgIXRoaXMuX3pvb21hYmxlKSB7XG5cdFx0XHR0aGlzLmxheW91dCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMgYSBsaXN0IG9mIHByZS9wb3N0IHJlbmRlciBvYmplY3RzIGZyb20gdGhlIGxheW91dGVyIChpZiBhbnkpXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfYWRkUHJlQW5kUG9zdFJlbmRlck9iamVjdHMgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5yZW1vdmVBbGwoKTtcblxuXHRcdC8vIEdldCB0aGUgYmFja2dyb3VuZCBvYmplY3RzIGZyb20gdGhlIGxheW91dGVyXG5cdFx0dmFyIG9ianMgPSB0aGlzLl9sYXlvdXRlci5wcmVyZW5kZXIodGhpcy5fd2lkdGgsdGhpcy5faGVpZ2h0KTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKG9ianMpIHtcblx0XHRcdG9ianMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJPYmplY3QpIHtcblx0XHRcdFx0dGhhdC5fcHJlcmVuZGVyR3JvdXAuYWRkQ2hpbGQocmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5yZW1vdmVBbGwoKTtcblx0XHRvYmpzID0gdGhpcy5fbGF5b3V0ZXIucG9zdHJlbmRlcih0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHRcdGlmIChvYmpzKSB7XG5cdFx0XHRvYmpzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyT2JqZWN0KSB7XG5cdFx0XHRcdHRoYXQuX3Bvc3RyZW5kZXJHcm91cC5hZGRDaGlsZChyZW5kZXJPYmplY3QpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdF9hZGRSZWdyb3VwSGFuZGxlcyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR2YXIgdW5ncm91cGVkTm9kZUluZm8gPSB0aGlzLl9ncm91cGluZ01hbmFnZXIuZ2V0VW5ncm91cGVkTm9kZXMoKTtcblx0XHRcdHVuZ3JvdXBlZE5vZGVJbmZvLmZvckVhY2goZnVuY3Rpb24odW5ncm91cGVkTm9kZSkge1xuXHRcdFx0XHR2YXIgaW5kaWNlcyA9IHVuZ3JvdXBlZE5vZGUuaW5kaWNlcztcblx0XHRcdFx0dmFyIGtleSA9IHVuZ3JvdXBlZE5vZGUua2V5O1xuXHRcdFx0XHR2YXIgYmJveCA9IHRoYXQuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KGluZGljZXMsUkVHUk9VTkRfQkJfUEFERElORyk7XG5cdFx0XHRcdHZhciBib3VuZGluZ0JveFJlbmRlck9iamVjdCA9IHBhdGgucmVjdCh7XG5cdFx0XHRcdFx0eCA6IGJib3gueCxcblx0XHRcdFx0XHR5IDogYmJveC55LFxuXHRcdFx0XHRcdGdyYXBoanNfdHlwZSA6ICdyZWdyb3VwX3VuZGVybGF5Jyxcblx0XHRcdFx0XHRncmFwaGpzX2luZGljZXMgOiBpbmRpY2VzLFxuXHRcdFx0XHRcdHdpZHRoIDogYmJveC53aWR0aCxcblx0XHRcdFx0XHRoZWlnaHQgOiBiYm94LmhlaWdodCxcblx0XHRcdFx0XHRzdHJva2VTdHlsZSA6ICcjMjMyMzIzJyxcblx0XHRcdFx0XHRmaWxsU3R5bGUgOiAnIzAwMDAwMCcsXG5cdFx0XHRcdFx0b3BhY2l0eSA6IDAuMVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0Ym91bmRpbmdCb3hSZW5kZXJPYmplY3Qub24oJ2NsaWNrJyxmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0aGF0LnJlZ3JvdXAoa2V5KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHRoYXQuX2hhbmRsZUdyb3VwLmFkZENoaWxkKGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZWRyYXcgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHVwZGF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEcmF3IHRoZSBncmFwaC4gICBPbmx5IG5lZWRzIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgbm9kZXMvbGlua3MgaGF2ZSBiZWVuIHNldFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRkcmF3IDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0aWYgKCF0aGlzLl9zY2VuZSkge1xuXHRcdFx0dGhpcy5fc2NlbmUgPSBwYXRoKHRoaXMuX2NhbnZhcyk7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5fbGF5b3V0ZXIpIHtcblx0XHRcdHZhciBkZWZhdWxMYXlvdXQgPSBuZXcgTGF5b3V0KClcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX25vZGVzKVxuXHRcdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0LmxhYmVsTWFwKHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXHRcdFx0dGhpcy5sYXlvdXRlcihkZWZhdWxMYXlvdXQpO1xuXHRcdH1cblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cCA9IHBhdGguZ3JvdXAoKTtcblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5zY2FsZVggPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5faGFuZGxlR3JvdXAgPSBwYXRoLmdyb3VwKCk7XG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwID0gcGF0aC5ncm91cCh7bm9IaXQ6dHJ1ZX0pO1xuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVggPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX2FkZFByZUFuZFBvc3RSZW5kZXJPYmplY3RzKCk7XG5cblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9wcmVyZW5kZXJHcm91cCk7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5faGFuZGxlR3JvdXApO1xuXHRcdHRoaXMuX2xpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXG5cdFx0XHR2YXIgbGlua09iamVjdDtcblx0XHRcdGlmICghbGluay50eXBlKSB7XG5cdFx0XHRcdGxpbmsudHlwZSA9IExJTktfVFlQRS5ERUZBVUxUO1xuXHRcdFx0fVxuXHRcdFx0c3dpdGNoKGxpbmsudHlwZSkge1xuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5BUlJPVzpcblx0XHRcdFx0XHRsaW5rLmhlYWRPZmZzZXQgPSBsaW5rLnRhcmdldC5yYWRpdXM7XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGguYXJyb3cobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkFSQzpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5hcmMobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkxJTkU6XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkRFRkFVTFQ6XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGgubGluZShsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5saW5lKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtsaW5rLnNvdXJjZS5pbmRleF0ucHVzaChsaW5rT2JqZWN0KTtcblx0XHRcdHRoYXQuX25vZGVJbmRleFRvTGlua0xpbmVbbGluay50YXJnZXQuaW5kZXhdLnB1c2gobGlua09iamVjdCk7XG5cblx0XHRcdHRoYXQuX3NjZW5lLmFkZENoaWxkKGxpbmtPYmplY3QpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgY2lyY2xlID0gcGF0aC5jaXJjbGUobm9kZSk7XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0NpcmNsZVtub2RlLmluZGV4XSA9IGNpcmNsZTtcblx0XHRcdGlmICh0aGF0Ll9ub2RlT3ZlciB8fCB0aGF0Ll9kcmFnZ2FibGUpIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignbW91c2VvdmVyJyk7XG5cdFx0XHRcdGNpcmNsZS5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRpZiAodGhhdC5fbm9kZU92ZXIpIHtcblx0XHRcdFx0XHRcdHRoYXQuX25vZGVPdmVyKGNpcmNsZSwgZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlIT09J2RyYWdnaW5nJykge1xuXHRcdFx0XHRcdFx0dGhhdC5fY3VycmVudE92ZXJOb2RlID0gY2lyY2xlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhhdC5fbm9kZU91dCB8fCB0aGF0Ll9kcmFnZ2FibGUpIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignbW91c2VvdXQnKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKCkpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhhdC5fbm9kZU91dCkge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU91dChjaXJjbGUsIGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhhdC5fbm9kZUNsaWNrKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ2NsaWNrJyk7XG5cdFx0XHRcdGNpcmNsZS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdHRoYXQuX25vZGVDbGljayhjaXJjbGUsZSk7XG5cdFx0XHRcdFx0dGhhdC5fc2NlbmUudXBkYXRlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIGlmICh0aGF0Ll9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignY2xpY2snKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKCkpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX25vZGVPdXQpIHtcblx0XHRcdFx0XHRcdHRoYXQuX25vZGVPdXQoY2lyY2xlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhhdC51bmdyb3VwKGNpcmNsZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fc2NlbmUuYWRkQ2hpbGQoY2lyY2xlKTtcblxuXHRcdFx0aWYgKG5vZGUubGFiZWwpIHtcblx0XHRcdFx0dGhhdC5hZGRMYWJlbChub2RlLG5vZGUubGFiZWwpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXMuc2hvd0FsbExhYmVscygpKSB7XG5cdFx0XHR0aGlzLnNob3dBbGxMYWJlbHModHJ1ZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbGF5b3V0ZXIubGlua01hcCh0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lKVxuXHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHQubGFiZWxNYXAodGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cblx0XHQvLyBEcmF3IGFueSB1bmdyb3VwZWQgbm9kZSBib3VuZGluZyBib3hlc1xuXHRcdHRoaXMuX2FkZFJlZ3JvdXBIYW5kbGVzKCk7XG5cblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9wb3N0cmVuZGVyR3JvdXApO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfZGVidWdEcmF3Qm91bmRpbmdCb3ggOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYm91bmRpbmdCb3ggPSB0aGlzLl9sYXlvdXRlci5nZXRCb3VuZGluZ0JveCh0aGlzLl9ub2Rlcyk7XG5cdFx0aWYgKHRoaXMuX2JiUmVuZGVyKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9iYlJlbmRlcik7XG5cdFx0fVxuXHRcdHRoaXMuX2JiUmVuZGVyID0gcGF0aC5yZWN0KHtcblx0XHRcdHggOiBib3VuZGluZ0JveC54LFxuXHRcdFx0eSA6IGJvdW5kaW5nQm94LnksXG5cdFx0XHR3aWR0aCA6IGJvdW5kaW5nQm94LndpZHRoLFxuXHRcdFx0aGVpZ2h0IDogYm91bmRpbmdCb3guaGVpZ2h0LFxuXHRcdFx0c3Ryb2tlU3R5bGUgOiAnI2ZmMDAwMCcsXG5cdFx0XHRsaW5lV2lkdGggOiAyXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5fYmJSZW5kZXIpO1xuXHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBGaXQgdGhlIGdyYXBoIHRvIHRoZSBzY3JlZW5cblx0ICovXG5cdGZpdCA6IGZ1bmN0aW9uKHBhZGRpbmcpIHtcblxuXHRcdC8vIFJldHVybiBiYWNrIHRvIG9yaWdpblxuXHRcdHRoaXMuX3BhbigtdGhpcy5fc2NlbmUueCwtdGhpcy5fc2NlbmUueSk7XG5cblxuXG5cdFx0Ly8gV29ya2luZyB3aXRoIGJpZyBudW1iZXJzLCBpdCdzIGJldHRlciBpZiB3ZSBkbyB0aGlzIHR3aWNlLlxuXHRcdHZhciBib3VuZGluZ0JveDtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDI7IGkrKykge1xuXHRcdFx0Ym91bmRpbmdCb3ggPSB0aGlzLl9sYXlvdXRlci5nZXRCb3VuZGluZ0JveCh0aGlzLl9ub2RlcyxwYWRkaW5nKTtcblx0XHRcdHZhciB4UmF0aW8gPSB0aGlzLl9zY2VuZS53aWR0aCAvIGJvdW5kaW5nQm94LndpZHRoO1xuXHRcdFx0dmFyIHlSYXRpbyA9IHRoaXMuX3NjZW5lLmhlaWdodCAvIGJvdW5kaW5nQm94LmhlaWdodDtcblx0XHRcdHRoaXMuX3pvb20oTWF0aC5taW4oeFJhdGlvLCB5UmF0aW8pLCAwLCAwKTtcblx0XHR9XG5cblx0XHR2YXIgbWlkU2NyZWVuWCA9IHRoaXMuX3NjZW5lLndpZHRoIC8gMjtcblx0XHR2YXIgbWlkU2NyZWVuWSA9IHRoaXMuX3NjZW5lLmhlaWdodCAvIDI7XG5cdFx0Ym91bmRpbmdCb3ggPSB0aGlzLl9sYXlvdXRlci5nZXRCb3VuZGluZ0JveCh0aGlzLl9ub2Rlcyk7XG5cdFx0dmFyIG1pZEJCWCA9IGJvdW5kaW5nQm94LnggKyBib3VuZGluZ0JveC53aWR0aCAvIDI7XG5cdFx0dmFyIG1pZEJCWSA9IGJvdW5kaW5nQm94LnkgKyBib3VuZGluZ0JveC5oZWlnaHQgLyAyO1xuXHRcdHRoaXMuX3BhbigtKG1pZEJCWC1taWRTY3JlZW5YKSwtKG1pZEJCWS1taWRTY3JlZW5ZKSk7XG5cblx0XHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdFx0dGhpcy5fbGF5b3V0ZXIuX3pvb21TY2FsZSA9IDEuMDtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTdXNwZW5kIG1vdXNlIGV2ZW50cyBhbmQgem9vbWluZ1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3N1c3BlbmRFdmVudHMgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9sYXlvdXRlci5fZXZlbnRzU3VzcGVuZGVkID0gdHJ1ZTtcblx0fSxcblxuXHQvKipcblx0ICogcmVzdW1lIG1vdXNlIGV2ZW50cyBhbmQgem9vbWluZ1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3Jlc3VtZUV2ZW50cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2xheW91dGVyLl9ldmVudHNTdXNwZW5kZWQgPSBmYWxzZTtcblx0fSxcblxuXHQvKipcblx0ICogUXVlcnkgZXZlbnQgc3VzcGVuc2lvbiBzdGF0dXNcblx0ICogQHJldHVybnMgYm9vbGVhblxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2V2ZW50c1N1c3BlbmRlZCA6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9sYXlvdXRlci5fZXZlbnRzU3VzcGVuZGVkO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIGFsbCByZW5kZXIgb2JqZWN0cyBhc3NvY2lhdGVkIHdpdGggYSBncmFwaC5cblx0ICovXG5cdGNsZWFyIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHJlbW92ZVJlbmRlck9iamVjdHMgPSBmdW5jdGlvbihpbmRleFRvT2JqZWN0KSB7XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gaW5kZXhUb09iamVjdCkge1xuXHRcdFx0XHRpZiAoaW5kZXhUb09iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0dmFyIG9iaiA9IGluZGV4VG9PYmplY3Rba2V5XTtcblx0XHRcdFx0XHRpZiAoJC5pc0FycmF5KG9iaikpIHtcblx0XHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKG9ialtpXSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGRlbGV0ZSBpbmRleFRvT2JqZWN0W2tleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHRcdHJlbW92ZVJlbmRlck9iamVjdHMuY2FsbCh0aGlzLHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lKTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHRpZiAodGhpcy5fcHJlcmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX3ByZXJlbmRlckdyb3VwKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2hhbmRsZUdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9oYW5kbGVHcm91cCk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9wb3N0cmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCk7XG5cdFx0fVxuXHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuXG5leHBvcnRzLkxJTktfVFlQRSA9IHJlcXVpcmUoJy4vbGlua1R5cGUnKTtcbmV4cG9ydHMuR3JvdXBpbmdNYW5hZ2VyID0gcmVxdWlyZSgnLi9ncm91cGluZ01hbmFnZXInKTtcbmV4cG9ydHMuTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbmV4cG9ydHMuQ29sdW1uTGF5b3V0ID0gcmVxdWlyZSgnLi9jb2x1bW5MYXlvdXQnKTtcbmV4cG9ydHMuUmFkaWFsTGF5b3V0ID0gcmVxdWlyZSgnLi9yYWRpYWxMYXlvdXQnKTtcbmV4cG9ydHMuRXh0ZW5kID0gXy5leHRlbmQ7XG5leHBvcnRzLkdyYXBoID0gR3JhcGg7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuLyoqXG4gKlxuICogQHBhcmFtIGZvY3VzIC0gdGhlIG5vZGUgYXQgdGhlIGNlbnRlciBvZiB0aGUgcmFkaWFsIGxheW91dFxuICogQHBhcmFtIGRpc3RhbmNlIC0gdGhlIGRpc3RhbmNlIG9mIG90aGVyIG5vZGVzIGZyb20gdGhlIGZvY3VzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUmFkaWFsTGF5b3V0KGZvY3VzLGRpc3RhbmNlKSB7XG5cdHRoaXMuX2ZvY3VzID0gZm9jdXM7XG5cdHRoaXMuX2Rpc3RhbmNlID0gZGlzdGFuY2U7XG5cblx0TGF5b3V0LmFwcGx5KHRoaXMpO1xufVxuXG5cblJhZGlhbExheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChSYWRpYWxMYXlvdXQucHJvdG90eXBlLCBMYXlvdXQucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGRpc3RhbmNlIHBhcmFtZXRlclxuXHQgKiBAcGFyYW0gZGlzdGFuY2UgLSB0aGUgZGlzdGFuY2Ugb2YgbGlua3MgZnJvbSB0aGUgZm9jdXMgbm9kZSB0byBvdGhlciBub2RlcyBpbiBwaXhlbHNcblx0ICogQHJldHVybnMge1JhZGlhbExheW91dH0gaWYgZGlzdGFuY2UgcGFyYW0gaXMgZGVmaW5lZCwge1JhZGlhbExheW91dC5fZGlzdGFuY2V9IG90aGVyd2lzZVxuXHQgKi9cblx0ZGlzdGFuY2U6IGZ1bmN0aW9uIChkaXN0YW5jZSkge1xuXHRcdGlmIChkaXN0YW5jZSkge1xuXHRcdFx0dGhpcy5fZGlzdGFuY2UgPSBkaXN0YW5jZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2Rpc3RhbmNlO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb2N1cyBub2RlIHRoYXQgaXMgYXQgdGhlIGNlbnRlciBvZiB0aGUgbGF5b3V0XG5cdCAqIEBwYXJhbSBmb2N1cyAtIHRoZSBub2RlIHRoYXQgaXMgYXQgdGhlIGNlbnRlciBvZiB0aGUgbGF5b3V0LiAgIE90aGVyIG5vZGVzIGFyZSBjZW50ZXJlZCBhcm91bmQgdGhpcy5cblx0ICogQHJldHVybnMge1JhZGlhbExheW91dH0gaWYgZm9jdXMgcGFyYW0gaXMgZGVmaW5lZCwge1JhZGlhbExheW91dC5fZm9jdXN9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9jdXM6IGZ1bmN0aW9uIChmb2N1cykge1xuXHRcdGlmIChmb2N1cykge1xuXHRcdFx0dGhpcy5fZm9jdXMgPSBmb2N1cztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvY3VzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0IHRoZSBsYWJlbCBwb3NpdGlvbiBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWCAtIHRoZSB4IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWSAtIHRoZSB5IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSByYWRpdXMgLSB0aGUgcmFkaXVzIG9mIHRoZSBub2RlXG5cdCAqIEByZXR1cm5zIHt7eDogeCBwb3NpdGlvbiBvZiB0aGUgbGFiZWwsIHk6IHkgcG9zaXRpb24gb2YgdGhlIGxhYmVsLCBhbGlnbjogSFRNTCBjYW52YXMgdGV4dCBhbGlnbm1lbnQgcHJvcGVydHkgZm9yIGxhYmVsfX1cblx0ICovXG5cdGxheW91dExhYmVsOiBmdW5jdGlvbiAobm9kZVgsIG5vZGVZLCByYWRpdXMpIHtcblx0XHR2YXIgeCwgeSwgYWxpZ247XG5cblx0XHQvLyBSaWdodCBvZiBjZW50ZXJcblx0XHRpZiAobm9kZVggPiB0aGlzLl9mb2N1cykge1xuXHRcdFx0eCA9IG5vZGVYICsgKHJhZGl1cyArIDEwKTtcblx0XHRcdGFsaWduID0gJ3N0YXJ0Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0eCA9IG5vZGVYIC0gKHJhZGl1cyArIDEwKTtcblx0XHRcdGFsaWduID0gJ2VuZCc7XG5cdFx0fVxuXG5cdFx0aWYgKG5vZGVZID4gdGhpcy5fZm9jdXMpIHtcblx0XHRcdHkgPSBub2RlWSArIChyYWRpdXMgKyAxMCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHkgPSBub2RlWSAtIChyYWRpdXMgKyAxMCk7XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHR4OiB4LFxuXHRcdFx0eTogeSxcblx0XHRcdGFsaWduOiBhbGlnblxuXHRcdH07XG5cdH0sXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gYSByYWRpYWwgbGF5b3V0XG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICovXG5cdGxheW91dDogZnVuY3Rpb24gKHcsIGgpIHtcblx0XHR2YXIgbm9kZXMgPSB0aGlzLm5vZGVzKCk7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBhbmdsZURlbHRhID0gTWF0aC5QSSAqIDIgLyAobm9kZXMubGVuZ3RoIC0gMSk7XG5cdFx0dmFyIGFuZ2xlID0gMC4wO1xuXHRcdG5vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcblx0XHRcdGlmIChub2RlLmluZGV4ID09PSB0aGF0Ll9mb2N1cy5pbmRleCkge1xuXHRcdFx0XHR0aGF0Ll9zZXROb2RlUG9zaXRpb24obm9kZSwgbm9kZS54LCBub2RlLnkpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR2YXIgbmV3WCA9IHRoYXQuX2ZvY3VzLnggKyAoTWF0aC5jb3MoYW5nbGUpICogdGhhdC5fZGlzdGFuY2UpO1xuXHRcdFx0dmFyIG5ld1kgPSB0aGF0Ll9mb2N1cy55ICsgKE1hdGguc2luKGFuZ2xlKSAqIHRoYXQuX2Rpc3RhbmNlKTtcblx0XHRcdHRoYXQuX3NldE5vZGVQb3NpdGlvbihub2RlLCBuZXdYLCBuZXdZKTtcblx0XHRcdGFuZ2xlICs9IGFuZ2xlRGVsdGE7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJhZGlhbExheW91dDtcbiIsIlxudmFyIFV0aWwgPSB7XG5cbiAgZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG4gICAgdmFyIGtleSwgaSwgc291cmNlO1xuICAgIGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yIChrZXkgaW4gc291cmNlKSB7XG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXN0O1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(5)
});
