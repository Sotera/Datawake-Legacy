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
	this._nodes = [];
	this._links = [];

	this._aggregatedNodes = [];
	this._aggregatedLinks = [];
	this._aggregateNodeMap = {};

	this._ungroupedAggregates = {};
	this._ungroupedNodeGroups = {};

	_.extend(this,attributes);
};

GroupingManager.prototype = _.extend(GroupingManager.prototype, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvY29sdW1uTGF5b3V0LmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbGlua1R5cGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9yYWRpYWxMYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BpQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcblxudmFyIENvbHVtbkxheW91dCA9IGZ1bmN0aW9uKCkge1xuXHRMYXlvdXQuYXBwbHkodGhpcyk7XG59O1xuXG5Db2x1bW5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoQ29sdW1uTGF5b3V0LnByb3RvdHlwZSwgTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBBIGNvbHVtbiBsYXlvdXRcblx0ICogQHBhcmFtIHcgLSB3aWR0aCBvZiBjYW52YXNcblx0ICogQHBhcmFtIGggLSBoZWlnaHQgb2YgY2FudmFzXG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbiAodywgaCkge1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0dmFyIG1heFJhZGl1c0NvbCA9IDA7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX25vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcblxuXHRcdFx0aWYgKHkgPT09IDApIHtcblx0XHRcdFx0eSArPSBub2RlLnJhZGl1cztcblx0XHRcdH1cblx0XHRcdGlmICh4ID09PSAwKSB7XG5cdFx0XHRcdHggKz0gbm9kZS5yYWRpdXM7XG5cdFx0XHR9XG5cblx0XHRcdHRoYXQuX3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZShub2RlLCB4LCB5KTtcblxuXHRcdFx0bWF4UmFkaXVzQ29sID0gTWF0aC5tYXgobWF4UmFkaXVzQ29sLCBub2RlLnJhZGl1cyk7XG5cblx0XHRcdHkgKz0gbm9kZS5yYWRpdXMgKyA0MDtcblx0XHRcdGlmICh5ID4gaCkge1xuXHRcdFx0XHR5ID0gMDtcblx0XHRcdFx0eCArPSBtYXhSYWRpdXNDb2wgKyA0MDtcblx0XHRcdFx0bWF4UmFkaXVzQ29sID0gMDtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sdW1uTGF5b3V0O1xuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYmFzZSBncm91cGluZyBtYW5hZ2VyLiAgIFRoaXMgaXMgYW4gYWJzdHJhY3QgY2xhc3MuICAgQ2hpbGQgY2xhc3NlcyBzaG91bGQgb3ZlcnJpZGUgdGhlXG4gKiBpbml0aWFsaXplSGVpcmFyY2h5IGZ1bmN0aW9uIHRvIGNyZWF0ZSBub2Rlcy9saW5rcyB0aGF0IGFyZSBhZ2dyZWdhdGVkIGZvciB0aGVpciBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvblxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBHcm91cGluZ01hbmFnZXIgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gW107XG5cdHRoaXMuX2xpbmtzID0gW107XG5cblx0dGhpcy5fYWdncmVnYXRlZE5vZGVzID0gW107XG5cdHRoaXMuX2FnZ3JlZ2F0ZWRMaW5rcyA9IFtdO1xuXHR0aGlzLl9hZ2dyZWdhdGVOb2RlTWFwID0ge307XG5cblx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlcyA9IHt9O1xuXHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzID0ge307XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkdyb3VwaW5nTWFuYWdlci5wcm90b3R5cGUgPSBfLmV4dGVuZChHcm91cGluZ01hbmFnZXIucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG9yaWdpbmFsIG5vZGVzIGluIHRoZSBncmFwaCB3aXRob3V0IGdyb3VwaW5nXG5cdCAqIEBwYXJhbSBub2RlcyAtIGEgZ3JhcGguanMgbm9kZSBhcnJheVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgb3JpZ2luYWwgbGlua3MgaW4gdGhlIGdyYXBoIHdpdGhvdXQgZ3JvdXBpbmdcblx0ICogQHBhcmFtIGxpbmtzIC0gYSBncmFwaC5qcyBsaW5rIGFycmF5XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bGlua3MgOiBmdW5jdGlvbihsaW5rcykge1xuXHRcdGlmIChsaW5rcykge1xuXHRcdFx0dGhpcy5fbGlua3MgPSBsaW5rcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZXMgdGhlIG5vZGUvbGluayBhZ2dyZWdhdGlvblxuXHQgKi9cblx0aW5pdGlhbGl6ZUhlaXJhcmNoeSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZU5vZGVzKCk7XG5cdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblxuXHRcdHZhciBzZXRQYXJlbnRQb2ludGVycyA9IGZ1bmN0aW9uKG5vZGUscGFyZW50KSB7XG5cdFx0XHRpZiAobm9kZS5jaGlsZHJlbikge1xuXHRcdFx0XHRub2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdFx0XHRzZXRQYXJlbnRQb2ludGVycyhjaGlsZCxub2RlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRub2RlLnBhcmVudE5vZGUgPSBwYXJlbnQ7XG5cdFx0fTtcblxuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHNldFBhcmVudFBvaW50ZXJzKG5vZGUsbnVsbCk7XG5cdFx0fSk7XG5cblx0XHRpZiAodGhpcy5vbkFnZ3JlZ2F0aW9uQ29tcGxldGUpIHtcblx0XHRcdHRoaXMub25BZ2dyZWdhdGlvbkNvbXBsZXRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFnZ3JlZ2F0ZWQgbGluayBpbiBncmFwaC5qcyBmb3JtYXQuICAgQ2FuIGJlIG92ZXJyaWRlbiBieSBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvbnMgdG8gYWxsb3dcblx0ICogdG8gYWxsb3cgZm9yIGRpZmVyZW50IGxpbmsgdHlwZXMgYmFzZWQgb24gYWdncmVnYXRlIGNvbnRlbnRzXG5cdCAqIEBwYXJhbSBzb3VyY2VBZ2dyZWdhdGUgLSB0aGUgc291cmNlIGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEBwYXJhbSB0YXJnZXRBZ2dyZWdhdGUgLSB0aGUgdGFyZ2V0IGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEByZXR1cm5zIHt7c291cmNlOiAqLCB0YXJnZXQ6ICp9fSAtIGEgZ3JhcGguanMgbGlua1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2NyZWF0ZUFnZ3JlZ2F0ZUxpbmsgOiBmdW5jdGlvbihzb3VyY2VBZ2dyZWdhdGUsdGFyZ2V0QWdncmVnYXRlLG9yaWdpbmFsTGlua3MpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c291cmNlIDogc291cmNlQWdncmVnYXRlLFxuXHRcdFx0dGFyZ2V0IDogdGFyZ2V0QWdncmVnYXRlXG5cdFx0fTtcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgbGluayBhZ2dyZWdhdGUgYmFzZWQgb24gYSBzZXQgb2YgYWdncmVnYXRlZCBub2RlcyBhbmQgYSBmdWxsIHNldCBvZiBsaW5rc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZUxpbmtzIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGUgPSB7fTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLmZvckVhY2goZnVuY3Rpb24oYWdncmVnYXRlKSB7XG5cdFx0XHRpZiAoYWdncmVnYXRlLmNoaWxkcmVuKSB7XG5cdFx0XHRcdGFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0XHRub2RlSW5kZXhUb0FnZ3JlYWdhdGVOb2RlW25vZGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbYWdncmVnYXRlLmluZGV4XSA9IGFnZ3JlZ2F0ZTtcblx0XHRcdH1cblx0XHRcdHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbYWdncmVnYXRlLmluZGV4XSA9IGFnZ3JlZ2F0ZTtcblx0XHR9KTtcblxuXG5cdFx0dmFyIGFnZ3JlZ2F0ZWRMaW5rcyA9IFtdO1xuXG5cdFx0dmFyIGFnZ3JlZ2F0ZUxpbmtNYXAgPSB7fTtcblxuXHRcdHRoaXMuX2xpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXHRcdFx0dmFyIHNvdXJjZUFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay5zb3VyY2UuaW5kZXhdO1xuXHRcdFx0dmFyIHRhcmdldEFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay50YXJnZXQuaW5kZXhdO1xuXG5cdFx0XHR2YXIgc291cmNlTWFwID0gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGUuaW5kZXhdO1xuXHRcdFx0aWYgKCFzb3VyY2VNYXApIHtcblx0XHRcdFx0c291cmNlTWFwID0ge307XG5cdFx0XHR9XG5cdFx0XHR2YXIgc291cmNlVG9UYXJnZXRMaW5rcyA9IHNvdXJjZU1hcFt0YXJnZXRBZ2dyZWdhdGUuaW5kZXhdO1xuXHRcdFx0aWYgKCFzb3VyY2VUb1RhcmdldExpbmtzKSB7XG5cdFx0XHRcdHNvdXJjZVRvVGFyZ2V0TGlua3MgPSBbXTtcblx0XHRcdH1cblx0XHRcdHNvdXJjZVRvVGFyZ2V0TGlua3MucHVzaChsaW5rKTtcblx0XHRcdHNvdXJjZU1hcFt0YXJnZXRBZ2dyZWdhdGUuaW5kZXhdID0gc291cmNlVG9UYXJnZXRMaW5rcztcblxuXHRcdFx0YWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGUuaW5kZXhdID0gc291cmNlTWFwO1xuXHRcdH0pO1xuXG5cdFx0Ly8gR2V0IG1pbi9tYXggbGluayBjb3VudHMgZm9yIGFsbCBhZ2dyZWdhdGUgcGFpcnNcblx0XHR2YXIgbWluQ291bnQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdHZhciBtYXhDb3VudCA9IDA7XG5cdFx0Zm9yICh2YXIgc291cmNlQWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcCkge1xuXHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXAuaGFzT3duUHJvcGVydHkoc291cmNlQWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdGZvciAodmFyIHRhcmdldEFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdKSB7XG5cdFx0XHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdLmhhc093blByb3BlcnR5KHRhcmdldEFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRcdFx0dmFyIHNvdXJjZSA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbc291cmNlQWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIHRhcmdldCA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIG9yaWdpbmFsTGlua3MgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXVt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHRtaW5Db3VudCA9IE1hdGgubWluKG1pbkNvdW50LG9yaWdpbmFsTGlua3MubGVuZ3RoKTtcblx0XHRcdFx0XHRcdG1heENvdW50ID0gTWF0aC5tYXgobWF4Q291bnQsb3JpZ2luYWxMaW5rcy5sZW5ndGgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZvciAodmFyIHNvdXJjZUFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXApIHtcblx0XHRcdGlmIChhZ2dyZWdhdGVMaW5rTWFwLmhhc093blByb3BlcnR5KHNvdXJjZUFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRmb3IgKHZhciB0YXJnZXRBZ2dyZWdhdGVJZCBpbiBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXSkge1xuXHRcdFx0XHRcdGlmIChhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXS5oYXNPd25Qcm9wZXJ0eSh0YXJnZXRBZ2dyZWdhdGVJZCkpIHtcblx0XHRcdFx0XHRcdHZhciBzb3VyY2UgPSB0aGF0Ll9hZ2dyZWdhdGVOb2RlTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdHZhciB0YXJnZXQgPSB0aGF0Ll9hZ2dyZWdhdGVOb2RlTWFwW3RhcmdldEFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdHZhciBvcmlnaW5hbExpbmtzID0gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF1bdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIGxpbmsgPSB0aGF0Ll9jcmVhdGVBZ2dyZWdhdGVMaW5rKHNvdXJjZSwgdGFyZ2V0LCBvcmlnaW5hbExpbmtzLCBtaW5Db3VudCwgbWF4Q291bnQpO1xuXHRcdFx0XHRcdFx0aWYgKGxpbmspIHtcblx0XHRcdFx0XHRcdFx0YWdncmVnYXRlZExpbmtzLnB1c2gobGluayk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fYWdncmVnYXRlZExpbmtzID0gYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gbm9kZSBhZ2dyZWdhdGlvbi4gICBNdXN0IGJlIG92ZXJyaWRlbiBieSBpbXBsZW1lbnRvcnNcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZ2dyZWdhdGVOb2RlcyA6IGZ1bmN0aW9uKCkge1xuXG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIGFnZ3JlZ2F0ZWQgbm9kZXNcblx0ICogQHJldHVybnMge0FycmF5fSBvZiBncmFwaC5qcyBub2Rlc1xuXHQgKi9cblx0YWdncmVnYXRlZE5vZGVzIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcztcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBsaW5rc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIGxpbmtzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTGlua3MgOiBmdW5jdGlvbigpICB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWRMaW5rcztcblx0fSxcblxuXHRyZW1vdmUgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoICYmIGluZGV4ID09PSAtMTsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5fYWdncmVnYXRlZE5vZGVzW2ldLmluZGV4ID09PSBub2RlLmluZGV4KSB7XG5cdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGluZGV4ICE9PSAtMSkge1xuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLnNwbGljZShpbmRleCwxKTtcblx0XHR9XG5cdH0sXG5cblxuXHQvKipcblx0ICogRG8gYW55IHVwZGF0ZXMgb24gY2hpbGRyZW4gYmVmb3JlIGxheW91dCAgKGllLyBzZXQgcG9zaXRpb24sIHJvdy9jb2wgaW5mbywgZXRjKS4gICBTaG91bGQgYmUgZGVmaW5lZFxuXHQgKiBpbiBpbXBsZW1lbnRpbmcgY2xhc3Ncblx0ICogQHBhcmFtIGFnZ3JlZ2F0ZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3VwZGF0ZUNoaWxkcmVuIDogZnVuY3Rpb24oYWdncmVnYXRlKSB7XG5cdFx0Ly8gc2V0IGNoaWxkcmVucyBwb3NpdGlvbiBpbml0aWFsbHkgdG8gdGhlIHBvc2l0aW9uIG9mIHRoZSBhZ2dyZWdhdGVcblx0XHRhZ2dyZWdhdGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0Y2hpbGQueCA9IGFnZ3JlZ2F0ZS54O1xuXHRcdFx0Y2hpbGQueSA9IGFnZ3JlZ2F0ZS55O1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVbmdyb3VwIGFuIGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqL1xuXHR1bmdyb3VwIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdGlmIChub2RlLmNoaWxkcmVuKSB7XG5cblx0XHRcdHZhciBwYXJlbnRLZXkgPSAnJztcblx0XHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRcdHBhcmVudEtleSArPSBub2RlLmluZGV4ICsgJywnO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbcGFyZW50S2V5XSA9IG5vZGU7XG5cblx0XHRcdHZhciBpbmRleCA9IC0xO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoICYmIGluZGV4ID09PSAtMTsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0XHRpbmRleCA9IGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fdXBkYXRlQ2hpbGRyZW4obm9kZSk7XG5cblx0XHRcdHZhciBmaXJzdCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZSgwLGluZGV4KTtcblx0XHRcdHZhciBtaWRkbGUgPSBub2RlLmNoaWxkcmVuO1xuXHRcdFx0dGhpcy5fdW5ncm91cGVkTm9kZUdyb3Vwc1twYXJlbnRLZXldID0gbm9kZS5jaGlsZHJlbjtcblx0XHRcdHZhciBlbmQgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoaW5kZXgrMSk7XG5cblx0XHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IGZpcnN0LmNvbmNhdChtaWRkbGUpLmNvbmNhdChlbmQpO1xuXG5cdFx0XHQvLyBSZWNvbXB1dGUgYWdncmVnYXRlZCBsaW5rc1xuXHRcdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblx0XHR9XG5cdH0sXG5cdGdldEFnZ3JlZ2F0ZSA6IGZ1bmN0aW9uKGFnZ3JlZ2F0ZUtleSkge1xuXHRcdHJldHVybiB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdH0sXG5cblx0cmVncm91cCA6IGZ1bmN0aW9uKGFnZ3JlZ2F0ZUtleSxhdEluZGV4KSB7XG5cdFx0dmFyIGFnZ3JlZ2F0ZU5vZGUgPSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0dmFyIG5vZGVzVG9SZW1vdmUgPSBhZ2dyZWdhdGVOb2RlLmNoaWxkcmVuO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRub2Rlc1RvUmVtb3ZlLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dGhhdC5yZW1vdmUobm9kZSk7XG5cdFx0fSk7XG5cdFx0dmFyIHN0YXJ0ID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKDAsYXRJbmRleCk7XG5cdFx0dmFyIGVuZCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZShhdEluZGV4KTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBzdGFydC5jb25jYXQoYWdncmVnYXRlTm9kZSkuY29uY2F0KGVuZCk7XG5cdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblx0XHRkZWxldGUgdGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1thZ2dyZWdhdGVLZXldO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0cmV0dXJuIGFnZ3JlZ2F0ZU5vZGU7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYW4gYXJyYXkgb2Ygbm9kZSBncm91cHMgdGhhdCBhcmUgZXhwYW5kZWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0Z2V0VW5ncm91cGVkTm9kZXMgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgaW5mbyA9IFtdO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyh0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0dmFyIG5vZGVzID0gdGhhdC5fdW5ncm91cGVkTm9kZUdyb3Vwc1trZXldO1xuXHRcdFx0dmFyIG5vZGVJbmRpY2VzID0gbm9kZXMubWFwKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0cmV0dXJuIG5vZGUuaW5kZXg7XG5cdFx0XHR9KTtcblx0XHRcdGluZm8ucHVzaCh7XG5cdFx0XHRcdGluZGljZXMgOiBub2RlSW5kaWNlcyxcblx0XHRcdFx0a2V5IDoga2V5XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gaW5mbztcblx0fVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cGluZ01hbmFnZXI7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIExheW91dCBjb25zdHJ1Y3RvclxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gbnVsbDtcblx0dGhpcy5fbGlua01hcCA9IG51bGw7XG5cdHRoaXMuX25vZGVNYXAgPSBudWxsO1xuXHR0aGlzLl9sYWJlbE1hcCA9IG51bGw7XG5cdHRoaXMuX2R1cmF0aW9uID0gMjUwO1xuXHR0aGlzLl9lYXNpbmcgPSAnZWFzZS1pbi1vdXQnO1xuXHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IGZhbHNlO1xuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBkdXJhdGlvbiBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gZHVyYXRpb24gLSB0aGUgZHVyYXRpb24gb2YgdGhlIGxheW91dCBhbmltYXRpb24gaW4gbWlsbGlzZWNvbmRzLiAgKGRlZmF1bHQgPSAyNTBtcylcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgZHVyYXRpb24gcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fZHVyYXRpb259IG90aGVyd2lzZVxuXHQgKi9cblx0ZHVyYXRpb24gOiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdGlmIChkdXJhdGlvbikge1xuXHRcdFx0dGhpcy5fZHVyYXRpb24gPSBkdXJhdGlvbjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2R1cmF0aW9uO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBlYXNpbmcgb2YgdGhlIGxheW91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIGVhc2luZyAtIHRoZSBlYXNpbmcgb2YgdGhlIGxheW91dCBhbmltYXRpb24gaW4gbWlsbGlzZWNvbmRzLiAgKGRlZmF1bHQgPSAnZWFzZS1pbi1vdXQnKVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBlYXNpbmcgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fZWFzaW5nfSBvdGhlcndpc2Vcblx0ICovXG5cdGVhc2luZyA6IGZ1bmN0aW9uKGVhc2luZykge1xuXHRcdGlmIChlYXNpbmcpIHtcblx0XHRcdHRoaXMuX2Vhc2luZyA9IGVhc2luZztcblx0XHR9XHQgZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZWFzaW5nO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlcyBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZXMgLSB0aGUgc2V0IG9mIG5vZGVzIGRlZmluZWQgaW4gdGhlIGNvcnJlc3BvbmRpbmcgZ3JhcGhcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbm9kZXMgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbm9kZXN9IG90aGVyd2lzZVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5faXNVcGRhdGUgPSBub2RlcyA/IHRydWUgOiBmYWxzZTtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbGluayBtYXAgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxpbmtNYXAgLSBhIG1hcCBmcm9tIG5vZGUgaW5kZXggdG8gYSBzZXQgb2YgbGluZXMgKHBhdGggb2JqZWN0cykgdGhhdCBjb250YWluIHRoYXQgbm9kZVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBsaW5rTWFwIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX2xpbmtNYXB9IG90aGVyd2lzZVxuXHQgKi9cblx0bGlua01hcCA6IGZ1bmN0aW9uKGxpbmtNYXApIHtcblx0XHRpZiAobGlua01hcCkge1xuXHRcdFx0dGhpcy5fbGlua01hcCA9IGxpbmtNYXA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9saW5rTWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlIG1hcCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZU1hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIGNpcmNsZSAocGF0aCBvYmplY3QpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIG5vZGVNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbm9kZU1hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlTWFwIDogZnVuY3Rpb24obm9kZU1hcCkge1xuXHRcdGlmIChub2RlTWFwKSB7XG5cdFx0XHR0aGlzLl9ub2RlTWFwID0gbm9kZU1hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGxhYmVsIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBsYWJlbE1hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIHRleHQgb2JqZWN0IChwYXRoIG9iamVjdClcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbGFiZWxNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbGFiZWxNYXB9IG90aGVyd2lzZVxuXHQgKi9cblx0bGFiZWxNYXAgOiBmdW5jdGlvbihsYWJlbE1hcCkge1xuXHRcdGlmIChsYWJlbE1hcCkge1xuXHRcdFx0dGhpcy5fbGFiZWxNYXAgPSBsYWJlbE1hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xhYmVsTWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhIGJvdW5kaW5nIGJveCBmb3IgYW4gYXJyYXkgb2Ygbm9kZSBpbmRpY2VzXG5cdCAqIEBwYXJhbSBub2RlT3JJbmRleEFycmF5IC0gYXJyYXkgb2Ygbm9kZSBpbmRpY2llcyBvciBub2RlIGFycmF5IGl0c2VsZlxuXHQgKiBAcGFyYW0gcGFkZGluZyAtIHBhZGRpbmcgaW4gcGl4ZWxzIGFwcGxpZWQgdG8gYm91bmRpbmcgYm94XG5cdCAqIEByZXR1cm5zIHt7bWluOiB7eDogTnVtYmVyLCB5OiBOdW1iZXJ9LCBtYXg6IHt4OiBudW1iZXIsIHk6IG51bWJlcn19fVxuXHQgKi9cblx0Z2V0Qm91bmRpbmdCb3ggOiBmdW5jdGlvbihub2RlT3JJbmRleEFycmF5LHBhZGRpbmcpIHtcblx0XHR2YXIgbWluID0ge1xuXHRcdFx0eCA6IE51bWJlci5NQVhfVkFMVUUsXG5cdFx0XHR5IDogTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cdFx0dmFyIG1heCA9IHtcblx0XHRcdHggOiAtTnVtYmVyLk1BWF9WQUxVRSxcblx0XHRcdHkgOiAtTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cblx0XHR2YXIgYmJQYWRkaW5nID0gcGFkZGluZyB8fCAwO1xuXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVPckluZGV4QXJyYXkuZm9yRWFjaChmdW5jdGlvbihub2RlT3JJbmRleCkge1xuXHRcdFx0dmFyIGlkeCA9IG5vZGVPckluZGV4IGluc3RhbmNlb2YgT2JqZWN0ID8gbm9kZU9ySW5kZXguaW5kZXggOiBub2RlT3JJbmRleDtcblx0XHRcdHZhciBjaXJjbGUgPSB0aGF0Ll9ub2RlTWFwW2lkeF07XG5cdFx0XHRtaW4ueCA9IE1hdGgubWluKG1pbi54LCAoY2lyY2xlLmZpbmFsWCB8fCBjaXJjbGUueCkgLSAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdFx0bWluLnkgPSBNYXRoLm1pbihtaW4ueSwgKGNpcmNsZS5maW5hbFkgfHwgY2lyY2xlLnkpIC0gKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHRcdG1heC54ID0gTWF0aC5tYXgobWF4LngsIChjaXJjbGUuZmluYWxYIHx8IGNpcmNsZS54KSArIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0XHRtYXgueSA9IE1hdGgubWF4KG1heC55LCAoY2lyY2xlLmZpbmFsWSB8fCBjaXJjbGUueSkgKyAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdH0pO1xuXHRcdHJldHVybiB7XG5cdFx0XHR4IDogbWluLngsXG5cdFx0XHR5IDogbWluLnksXG5cdFx0XHR3aWR0aCA6IChtYXgueCAtIG1pbi54KSxcblx0XHRcdGhlaWdodCA6IChtYXgueSAtIG1pbi55KVxuXHRcdH07XG5cdH0sXG5cblx0X2FwcGx5Wm9vbVNjYWxlIDogZnVuY3Rpb24oYkFwcGx5KSB7XG5cdFx0dGhpcy5fYXBwbHlab29tID0gYkFwcGx5O1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiBhIG5vZGUgYW5kIGFsbCBhdHRhY2hlZCBsaW5rcyBhbmQgbGFiZWxzIHdpdGhvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBub2RlIC0gdGhlIG5vZGUgb2JqZWN0IGJlaW5nIHBvc2l0aW9uZWRcblx0ICogQHBhcmFtIHggLSB0aGUgbmV3IHggcG9zaXRpb24gZm9yIHRoZSBub2RlXG5cdCAqIEBwYXJhbSB5IC0gdGhlIG5ldyB5IHBvc2l0aW9uIGZvciB0aGUgbm9kZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZSA6IGZ1bmN0aW9uKG5vZGUseCx5LGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUseCx5LHRydWUpO1xuXHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0Y2FsbGJhY2soKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIGEgbm9kZSBieSBhbmltYXRpbmcgZnJvbSBpdCdzIG9sZCBwb3NpdGlvbiB0byBpdCdzIG5ldyBvbmVcblx0ICogQHBhcmFtIG5vZGUgLSB0aGUgbm9kZSBiZWluZyByZXBvc2l0aW9uZWRcblx0ICogQHBhcmFtIHggLSB0aGUgbmV3IHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHkgLSB0aGUgbmV3IHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIGJJbW1lZGlhdGUgLSBpZiB0cnVlLCBzZXRzIHdpdGhvdXQgYW5pbWF0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3NldE5vZGVQb3NpdGlvbiA6IGZ1bmN0aW9uKG5vZGUsbmV3WCxuZXdZLGJJbW1lZGlhdGUsY2FsbGJhY2spIHtcblx0XHR2YXIgeCA9IG5ld1ggKiAodGhpcy5fYXBwbHlab29tID8gdGhpcy5fem9vbVNjYWxlIDogMSk7XG5cdFx0dmFyIHkgPSBuZXdZICogKHRoaXMuX2FwcGx5Wm9vbSA/IHRoaXMuX3pvb21TY2FsZSA6IDEpO1xuXG5cblx0XHQvLyBVcGRhdGUgdGhlIG5vZGUgcmVuZGVyIG9iamVjdFxuXHRcdHZhciBjaXJjbGUgPSB0aGlzLl9ub2RlTWFwW25vZGUuaW5kZXhdO1xuXHRcdGlmIChiSW1tZWRpYXRlIT09dHJ1ZSkge1xuXHRcdFx0Y2lyY2xlLnR3ZWVuQXR0cih7XG5cdFx0XHRcdHg6IHgsXG5cdFx0XHRcdHk6IHlcblx0XHRcdH0sIHtcblx0XHRcdFx0ZHVyYXRpb246IHRoaXMuX2R1cmF0aW9uLFxuXHRcdFx0XHRlYXNpbmc6IHRoaXMuX2Vhc2luZyxcblx0XHRcdFx0Y2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWxldGUgY2lyY2xlLmZpbmFsWDtcblx0XHRcdFx0XHRkZWxldGUgY2lyY2xlLmZpbmFsWTtcblx0XHRcdFx0XHRub2RlLnggPSB4O1xuXHRcdFx0XHRcdG5vZGUueSA9IHk7XG5cdFx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRjaXJjbGUuZmluYWxYID0geDtcblx0XHRcdGNpcmNsZS5maW5hbFkgPSB5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjaXJjbGUueCA9IHg7XG5cdFx0XHRjaXJjbGUueSA9IHk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9saW5rTWFwW25vZGUuaW5kZXhdLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bm9kZS54ID0geDtcblx0XHRcdG5vZGUueSA9IHk7XG5cdFx0XHRjaXJjbGUueCA9IHg7XG5cdFx0XHRjaXJjbGUueSA9IHk7XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBsYWJlbCByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIGxhYmVsID0gdGhpcy5fbGFiZWxNYXBbbm9kZS5pbmRleF07XG5cdFx0aWYgKGxhYmVsKSB7XG5cdFx0XHR2YXIgbGFiZWxQb3MgPSB0aGlzLmxheW91dExhYmVsKGNpcmNsZSk7XG5cdFx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdFx0bGFiZWwudHdlZW5BdHRyKGxhYmVsUG9zLCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoaXMuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBsYWJlbFBvcykge1xuXHRcdFx0XHRcdGlmIChsYWJlbFBvcy5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuXHRcdFx0XHRcdFx0bGFiZWxbcHJvcF0gPSBsYWJlbFBvc1twcm9wXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbGluayByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX2xpbmtNYXBbbm9kZS5pbmRleF0uZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgbGlua09iaktleSA9IG51bGw7XG5cdFx0XHRpZiAobGluay5zb3VyY2UuaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0bGlua09iaktleSA9ICdzb3VyY2UnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua09iaktleSA9ICd0YXJnZXQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRcdGxpbmsudHdlZW5PYmoobGlua09iaktleSwge1xuXHRcdFx0XHRcdHg6IHgsXG5cdFx0XHRcdFx0eTogeVxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhhdC5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS54ID0geDtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS55ID0geTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGVmYXVsdCBsYXlvdXQgcm91dGluZS4gICBTaG91bGQgYmUgb3ZlcnJpZGVuIGJ5IHN1YmNsYXNzZXMuXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKHcsaCxjYWxsYmFjaykge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRmdW5jdGlvbiBvbkNvbXBsZXRlKCkge1xuXHRcdFx0dGhhdC5fZXZlbnRzU3VzcGVuZGVkID0gZmFsc2U7XG5cdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9ldmVudHNTdXNwZW5kZWQgPSB0cnVlO1xuXHRcdHZhciBpc0FzeW5jID0gIXRoaXMuX3BlcmZvcm1MYXlvdXQodyxoKTtcblx0XHRpZiAoaXNBc3luYykge1xuXHRcdFx0c2V0VGltZW91dChvbkNvbXBsZXRlLHRoaXMuZHVyYXRpb24oKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9uQ29tcGxldGUoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblxuXHQvKipcblx0ICogXHQvKipcblx0ICogSG9vayBmb3IgZG9pbmcgYW55IGRyYXdpbmcgYmVmb3JlIHJlbmRlcmluZyBvZiB0aGUgZ3JhcGggdGhhdCBpcyBsYXlvdXQgc3BlY2lmaWNcblx0ICogaWUvIEJhY2tncm91bmRzLCBldGNcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IC0gYSBsaXN0IG9mIHBhdGguanMgcmVuZGVyIG9iamVjdHMgdG8gYmUgYWRkZWQgdG8gdGhlIHNjZW5lXG5cdCAqL1xuXHRwcmVyZW5kZXIgOiBmdW5jdGlvbih3LGgpIHtcblx0XHRyZXR1cm4gW107XG5cdH0sXG5cblx0LyoqXG5cdCAqIEhvb2sgZm9yIGRvaW5nIGFueSBkcmF3aW5nIGFmdGVyIHJlbmRlcmluZyBvZiB0aGUgZ3JhcGggdGhhdCBpcyBsYXlvdXQgc3BlY2lmaWNcblx0ICogaWUvIE92ZXJsYXlzLCBldGNcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IC0gYSBsaXN0IG9mIHBhdGguanMgcmVuZGVyIG9iamVjdHMgdG8gYmUgYWRkZWQgdG8gdGhlIHNjZW5lXG5cdCAqL1xuXHRwb3N0cmVuZGVyIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBsYWJlbCBwb3NpdGlvbiBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWCAtIHRoZSB4IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWSAtIHRoZSB5IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSByYWRpdXMgLSB0aGUgcmFkaXVzIG9mIHRoZSBub2RlXG5cdCAqIEByZXR1cm5zIHt7eDogeCBwb3NpdGlvbiBvZiB0aGUgbGFiZWwsIHk6IHkgcG9zaXRpb24gb2YgdGhlIGxhYmVsfX1cblx0ICovXG5cdGxheW91dExhYmVsIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR4OiBub2RlLnggKyBub2RlLnJhZGl1cyArIDUsXG5cdFx0XHR5OiBub2RlLnkgKyBub2RlLnJhZGl1cyArIDVcblx0XHR9O1xuXHR9XG59KTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gTGF5b3V0O1xuIiwidmFyIExJTktfVFlQRSA9IHtcblx0REVGQVVMVCA6ICdsaW5lJyxcblx0TElORSA6ICdsaW5lJyxcblx0QVJST1cgOiAnYXJyb3cnLFxuXHRBUkMgOiAnYXJjJ1xufTtcbm1vZHVsZS5leHBvcnRzID0gTElOS19UWVBFOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTElOS19UWVBFID0gcmVxdWlyZSgnLi9saW5rVHlwZScpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5cbnZhciBSRUdST1VORF9CQl9QQURESU5HID0gMDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgR3JhcGggcmVuZGVyIG9iamVjdFxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBHcmFwaCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBbXTtcblx0dGhpcy5fbGlua3MgPSBbXTtcblx0dGhpcy5fY2FudmFzID0gbnVsbDtcblx0dGhpcy5fbGF5b3V0ZXIgPSBudWxsO1xuXHR0aGlzLl9ncm91cGluZ01hbmFnZXIgPSBudWxsO1xuXHR0aGlzLl93aWR0aCA9IDA7XG5cdHRoaXMuX2hlaWdodCA9IDA7XG5cdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0dGhpcy5fem9vbUxldmVsID0gMDtcblx0dGhpcy5fc2NlbmUgPSBudWxsO1xuXHR0aGlzLl9zaG93QWxsTGFiZWxzID0gZmFsc2U7XG5cdHRoaXMuX3ByZXJlbmRlckdyb3VwID0gbnVsbDtcblx0dGhpcy5fcG9zdHJlbmRlckdyb3VwID0gbnVsbDtcblx0dGhpcy5fcGFubmFibGUgPSBudWxsO1xuXHR0aGlzLl96b29tYWJsZSA9IG51bGw7XG5cdHRoaXMuX2RyYWdnYWJsZSA9IG51bGw7XG5cdHRoaXMuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdHRoaXMuX2N1cnJlbnRNb3ZlU3RhdGUgPSBudWxsO1xuXHR0aGlzLl9pbnZlcnRlZFBhbiA9IDE7XG5cblx0dGhpcy5fZm9udFNpemUgPSBudWxsO1xuXHR0aGlzLl9mb250RmFtaWx5ID0gbnVsbDtcblx0dGhpcy5fZm9udENvbG9yID0gbnVsbDtcblx0dGhpcy5fZm9udFN0cm9rZSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRTdHJva2VXaWR0aCA9IG51bGw7XG5cdHRoaXMuX3NoYWRvd0NvbG9yID0gbnVsbDtcblx0dGhpcy5fc2hhZG93T2Zmc2V0WCA9IG51bGw7XG5cdHRoaXMuX3NoYWRvd09mZnNldFkgPSBudWxsO1xuXHR0aGlzLl9zaGFkb3dCbHVyID0gbnVsbDtcblxuXHQvLyBEYXRhIHRvIHJlbmRlciBvYmplY3QgbWFwc1xuXHR0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvTGFiZWwgPSB7fTtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuR3JhcGgucHJvdG90eXBlID0gXy5leHRlbmQoR3JhcGgucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIG5vZGVzIC0gYW4gYXJyYXkgb2Ygbm9kZXNcblx0ICoge1xuXHQgKiBcdFx0eCA6IHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGVcdChyZXF1aXJlZClcblx0ICogXHRcdHkgOiB0aGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlXHQocmVxdWlyZWQpXG5cdCAqXHRcdGluZGV4IDogIGEgdW5pcXVlIGluZGV4XHRcdFx0XHQocmVxdWlyZWQpXG5cdCAqXHRcdGxhYmVsIDogYSBsYWJlbCBmb3IgdGhlIG5vZGVcdFx0KG9wdGlvbmFsKVxuXHQgKlx0XHRmaWxsU3R5bGUgOiBhIGNhbnZhcyBmaWxsICAgXHRcdChvcHRpb25hbCwgZGVmYXVsdCAjMDAwMDAwKVxuXHQgKlx0XHRzdHJva2VTdHlsZSA6IGEgY2FudmFzIHN0cm9rZVx0XHQob3B0aW9uYWwsIGRlZmF1bHQgdW5kZWZpbmVkKVxuXHQgKlx0XHRsaW5lV2lkdGggOiB3aWR0aCBvZiB0aGUgc3Ryb2tlXHRcdChvcHRpb25hbCwgZGVmYXVsdCAxKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIG5vZGVzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB7R3JhcGguX25vZGVzfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUgPSB7fTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsID0ge307XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtub2RlLmluZGV4XSA9IFtdO30pO1xuXHRcdFx0aWYgKHRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHRcdHRoaXMuX2xheW91dGVyLm5vZGVzKG5vZGVzKTtcblx0XHRcdH1cblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdG5vZGVXaXRoSW5kZXggOiBmdW5jdGlvbihub2RlSW5kZXgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbm9kZUluZGV4VG9DaXJjbGVbbm9kZUluZGV4XTtcblx0fSxcblxuXHR1cGRhdGVOb2RlIDogZnVuY3Rpb24obm9kZUluZGV4LHByb3BzKSB7XG5cdFx0Ly8gVE9ETzogIHJlbW92ZSBtdWNraW5nIHdpdGggcG9zaXRpb24gc2V0dGluZ3MgZnJvbSBwcm9wcz9cblx0XHRpZiAobm9kZUluZGV4KSB7XG5cdFx0XHR2YXIgY2lyY2xlID0gdGhpcy5fbm9kZUluZGV4VG9DaXJjbGVbbm9kZUluZGV4XTtcblx0XHRcdGNpcmNsZSA9IF8uZXh0ZW5kKGNpcmNsZSxwcm9wcyk7XG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZVtub2RlSW5kZXhdID0gY2lyY2xlO1xuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0XHR9XG5cdH0sXG5cblx0dXBkYXRlTGFiZWwgOiBmdW5jdGlvbihub2RlSW5kZXgscHJvcHMpIHtcblx0XHQvLyBUT0RPOiAgcmVtb3ZlIG11Y2tpbmcgd2l0aCBwb3NpdGlvbiBzZXR0aW5ncyBmcm9tIHByb3BzP1xuXHRcdGlmIChub2RlSW5kZXgpIHtcblx0XHRcdHZhciB0ZXh0ID0gdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlSW5kZXhdO1xuXHRcdFx0dGV4dCA9IF8uZXh0ZW5kKHRleHQscHJvcHMpO1xuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlSW5kZXhdID0gdGV4dDtcblx0XHR9XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlcyBmb3IgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBsaW5rcyAtIGFuIGFycmF5IG9mIGxpbmtzXG5cdCAqIHtcblx0ICogXHRcdHNvdXJjZSA6IGEgbm9kZSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGUgc291cmNlIFx0KHJlcXVpcmVkKVxuXHQgKiBcdFx0dGFyZ2V0IDogYSBub2RlIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoZSB0YXJnZXRcdChyZXF1aXJlZClcblx0ICpcdFx0c3Ryb2tlU3R5bGUgOiBhIGNhbnZhcyBzdHJva2VcdFx0XHRcdFx0XHQob3B0aW9uYWwsIGRlZmF1bHQgIzAwMDAwMClcblx0ICpcdFx0bGluZVdpZHRoIDogdGhlIHdpZHRoIG9mIHRoZSBzdHJva2VcdFx0XHRcdFx0KG9wdGluYWwsIGRlZmF1bHQgMSlcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBsaW5rcyBwYXJhbWV0ZXIgaXMgZGVmaW5lZCwge0dyYXBoLl9saW5rc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsaW5rcyA6IGZ1bmN0aW9uKGxpbmtzKSB7XG5cdFx0aWYgKGxpbmtzKSB7XG5cdFx0XHR0aGlzLl9saW5rcyA9IGxpbmtzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGlua3M7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBsaW5rcyBiZXR3ZWVuIHR3byBub2Rlc1xuXHQgKiBAcGFyYW0gc291cmNlTm9kZUluZGV4IC0gSW5kZXggb2Ygc291cmNlIG5vZGUsIGlmIG51bGwsIHJldHVybiBhbGwgbGlua3MgZ29pbmcgdG8gdGFyZ2V0XG5cdCAqIEBwYXJhbSB0YXJnZXROb2RlSW5kZXggLSBJbmRleCBvZiB0YXJnZXQgbm9kZSwgaWYgbnVsbCwgcmV0dXJuIGFsbCBsaW5rcyBzdGFydGluZyBmcm9tIHNvdXJjZVxuXHQgKi9cblx0bGlua09iamVjdHNCZXR3ZWVuIDogZnVuY3Rpb24oc291cmNlTm9kZUluZGV4LHRhcmdldE5vZGVJbmRleCkge1xuXHRcdGlmIChzb3VyY2VOb2RlSW5kZXggJiYgIXRhcmdldE5vZGVJbmRleCkge1xuXHRcdFx0dmFyIGFsbFNvdXJjZSA9IHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmVbc291cmNlTm9kZUluZGV4XTtcblx0XHRcdHZhciBqdXN0U291cmNlID0gYWxsU291cmNlLmZpbHRlcihmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHRcdHJldHVybiBsaW5rLnNvdXJjZS5pbmRleCA9PT0gc291cmNlTm9kZUluZGV4O1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4ganVzdFNvdXJjZTtcblx0XHR9IGVsc2UgaWYgKCFzb3VyY2VOb2RlSW5kZXggJiYgdGFyZ2V0Tm9kZUluZGV4KSB7XG5cdFx0XHR2YXIgYWxsVGFyZ2V0ID0gdGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZVt0YXJnZXROb2RlSW5kZXhdO1xuXHRcdFx0dmFyIGp1c3RUYXJnZXQgPSBhbGxUYXJnZXQuZmlsdGVyKGZ1bmN0aW9uKGxpbmspIHtcblx0XHRcdFx0cmV0dXJuIGxpbmsudGFyZ2V0LmluZGV4ID09PSB0YXJnZXROb2RlSW5kZXg7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBqdXN0VGFyZ2V0O1xuXHRcdH0gZWxzZSBpZiAoc291cmNlTm9kZUluZGV4ICYmIHRhcmdldE5vZGVJbmRleCkge1xuXHRcdFx0dmFyIHNvdXJjZUxpbmtzID0gdGhpcy5saW5rT2JqZWN0c0JldHdlZW4oc291cmNlTm9kZUluZGV4LG51bGwpO1xuXHRcdFx0dmFyIHRvVGFyZ2V0ID0gc291cmNlTGlua3MuZmlsdGVyKGZ1bmN0aW9uKGxpbmspIHtcblx0XHRcdFx0cmV0dXJuIGxpbmsudGFyZ2V0LmluZGV4ID09PSB0YXJnZXROb2RlSW5kZXg7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0b1RhcmdldDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIFtdO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gY2FudmFzIC0gYW4gSFRNTCBjYW52YXMgb2JqZWN0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgY2FudmFzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB0aGUgY2FudmFzIG90aGVyd2lzZVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXG5cdFx0XHR2YXIgeCx5O1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZWRvd24nLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0eCA9IGUuY2xpZW50WDtcblx0XHRcdFx0eSA9IGUuY2xpZW50WTtcblx0XHRcdFx0JCh0aGF0Ll9jYW52YXMpLm9uKCdtb3VzZW1vdmUnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR2YXIgZHggPSB4IC0gZS5jbGllbnRYO1xuXHRcdFx0XHRcdHZhciBkeSA9IHkgLSBlLmNsaWVudFk7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2RyYWdnYWJsZSAmJiB0aGF0Ll9jdXJyZW50T3Zlck5vZGUgJiYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09IG51bGwgfHwgdGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ2RyYWdnaW5nJykpICB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gJ2RyYWdnaW5nJztcblxuXHRcdFx0XHRcdFx0Ly8gTW92ZSB0aGUgbm9kZVxuXHRcdFx0XHRcdFx0dGhhdC5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZSh0aGF0Ll9jdXJyZW50T3Zlck5vZGUsIHRoYXQuX2N1cnJlbnRPdmVyTm9kZS54IC0gZHgsIHRoYXQuX2N1cnJlbnRPdmVyTm9kZS55IC0gZHkpO1xuXHRcdFx0XHRcdFx0dGhhdC51cGRhdGUoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuX3Bhbm5hYmxlICYmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSBudWxsIHx8IHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdwYW5uaW5nJykpIHtcblx0XHRcdFx0XHRcdHRoYXQuX3BhbigtZHgqdGhhdC5faW52ZXJ0ZWRQYW4sLWR5KnRoYXQuX2ludmVydGVkUGFuKTtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSAncGFubmluZyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHggPSBlLmNsaWVudFg7XG5cdFx0XHRcdFx0eSA9IGUuY2xpZW50WTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZXVwJyxmdW5jdGlvbigpIHtcblx0XHRcdFx0JCh0aGF0Ll9jYW52YXMpLm9mZignbW91c2Vtb3ZlJyk7XG5cdFx0XHRcdGlmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAnZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0dGhhdC5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gbnVsbDtcblx0XHRcdH0pO1xuXG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCB3aWR0aFxuXHQgKiBAcmV0dXJucyBXaWR0aCBpbiBwaXhlbHMgb2YgdGhlIGdyYXBoXG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9zY2VuZS53aWR0aDtcblx0fSxcblxuXHQvKipcblx0ICogR2V0IGhlaWdodFxuXHQgKiBAcmV0dXJucyBIZWlnaHQgaW4gcGl4ZWxzIG9mIHRoZSBncmFwaFxuXHQgKi9cblx0aGVpZ2h0IDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NjZW5lLmhlaWdodDtcblx0fSxcblxuXHQvKipcblx0ICogVG9nZ2xlcyBib29sZWFuIGZvciBzaG93aW5nL2hpZGluZyBhbGwgbGFiZWxzIGluIHRoZSBncmFwaCBieSBkZWZhdWx0XG5cdCAqIEBwYXJhbSBzaG93QWxsTGFiZWxzXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0c2hvd0FsbExhYmVscyA6IGZ1bmN0aW9uKHNob3dBbGxMYWJlbHMpIHtcblx0XHRpZiAoc2hvd0FsbExhYmVscykge1xuXHRcdFx0dGhpcy5fc2hvd0FsbExhYmVscyA9IHNob3dBbGxMYWJlbHM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9zaG93QWxsTGFiZWxzO1xuXHRcdH1cblxuXHRcdC8vIFVwZGF0ZVxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdGlmIChzaG93QWxsTGFiZWxzKSB7XG5cdFx0XHRcdHRoYXQuYWRkTGFiZWwobm9kZSxub2RlLmxhYmVsVGV4dCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGF0LnJlbW92ZUxhYmVsKG5vZGUsbm9kZS5sYWJlbFRleHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFkZHMgYSBsYWJlbCBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqIEBwYXJhbSB0ZXh0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGFkZExhYmVsIDogZnVuY3Rpb24obm9kZSx0ZXh0KSB7XG5cdFx0aWYgKHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF0pIHtcblx0XHRcdHRoaXMucmVtb3ZlTGFiZWwobm9kZSk7XG5cdFx0fVxuXHRcdHZhciBsYWJlbEF0dHJzID0gdGhpcy5fbGF5b3V0ZXIubGF5b3V0TGFiZWwobm9kZSk7XG5cblx0XHR2YXIgZm9udFNpemUgPSB0eXBlb2YodGhpcy5fZm9udFNpemUpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udFNpemUobm9kZSkgOiB0aGlzLl9mb250U2l6ZTtcblx0XHRpZiAoIWZvbnRTaXplKSB7XG5cdFx0XHRmb250U2l6ZSA9IDEwO1xuXHRcdH1cblxuXHRcdHZhciBmb250RmFtaWx5ID0gdHlwZW9mKHRoaXMuX2ZvbnRGYW1pbHkpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udEZhbWlseShub2RlKSA6IHRoaXMuX2ZvbnRGYW1pbHk7XG5cdFx0aWYgKCFmb250RmFtaWx5KSB7XG5cdFx0XHRmb250RmFtaWx5ID0gJ3NhbnMtc2VyaWYnO1xuXHRcdH1cblx0XHR2YXIgZm9udFN0ciA9IGZvbnRTaXplICsgJ3B4ICcgKyBmb250RmFtaWx5O1xuXG5cdFx0dmFyIGZvbnRGaWxsID0gdHlwZW9mKHRoaXMuX2ZvbnRDb2xvcikgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250Q29sb3Iobm9kZSkgOiB0aGlzLl9mb250Q29sb3I7XG5cdFx0aWYgKCFmb250RmlsbCkge1xuXHRcdFx0Zm9udEZpbGwgPSAnIzAwMDAwMCc7XG5cdFx0fVxuXHRcdHZhciBmb250U3Ryb2tlID0gdHlwZW9mKHRoaXMuX2ZvbnRTdHJva2UpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udFN0cm9rZShub2RlKSA6IHRoaXMuX2ZvbnRTdHJva2U7XG5cdFx0dmFyIGZvbnRTdHJva2VXaWR0aCA9IHR5cGVvZih0aGlzLl9mb250U3Ryb2tlKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTdHJva2VXaWR0aCA6IHRoaXMuX2ZvbnRTdHJva2VXaWR0aDtcblxuXHRcdHZhciBsYWJlbFNwZWMgPSB7XG5cdFx0XHRmb250OiBmb250U3RyLFxuXHRcdFx0ZmlsbFN0eWxlOiBmb250RmlsbCxcblx0XHRcdHN0cm9rZVN0eWxlOiBmb250U3Ryb2tlLFxuXHRcdFx0bGluZVdpZHRoOiBmb250U3Ryb2tlV2lkdGgsXG5cdFx0XHR0ZXh0IDogdGV4dFxuXHRcdH07XG5cblx0XHR2YXIgYkFkZFNoYWRvdyA9IHRoaXMuX3NoYWRvd0JsdXIgfHwgdGhpcy5fc2hhZG93T2Zmc2V0WCB8fCB0aGlzLl9zaGFkb3dPZmZzZXRZIHx8IHRoaXMuX3NoYWRvd0NvbG9yO1xuXHRcdGlmIChiQWRkU2hhZG93KSB7XG5cdFx0XHRsYWJlbFNwZWNbJ3NoYWRvd0NvbG9yJ10gPSB0aGlzLl9zaGFkb3dDb2xvciB8fCAnIzAwMCc7XG5cdFx0XHRsYWJlbFNwZWNbJ3NoYWRvd09mZnNldFgnXSA9IHRoaXMuX3NoYWRvd09mZnNldFggfHwgMDtcblx0XHRcdGxhYmVsU3BlY1snc2hhZG93T2Zmc2V0WSddID0gdGhpcy5fc2hhZG93T2Zmc2V0WSB8fCAwO1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dCbHVyJ10gPSB0aGlzLl9zaGFkb3dCbHVyIHx8IE1hdGguZmxvb3IoZm9udFNpemUvMyk7XG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIga2V5IGluIGxhYmVsQXR0cnMpIHtcblx0XHRcdGlmIChsYWJlbEF0dHJzLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0bGFiZWxTcGVjW2tleV0gPSBsYWJlbEF0dHJzW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhciBsYWJlbCA9IHBhdGgudGV4dChsYWJlbFNwZWMpO1xuXHRcdHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF0gPSBsYWJlbDtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZChsYWJlbCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBhIGxhYmVsIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0cmVtb3ZlTGFiZWwgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0dmFyIHRleHRPYmplY3QgPSB0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdO1xuXHRcdGlmICh0ZXh0T2JqZWN0KSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0ZXh0T2JqZWN0KTtcblx0XHRcdGRlbGV0ZSB0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRXZlbnQgaGFuZGxlciBmb3IgbW91c2VvdmVyIG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJyBpbiB0aGUgY2FsbGJhY2tcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZU92ZXIgOiBmdW5jdGlvbihjYWxsYmFjayxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5fbm9kZU92ZXIgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBtb3VzZW91dCBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycgaW4gdGhlIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVPdXQgOiBmdW5jdGlvbihjYWxsYmFjayxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5fbm9kZU91dCA9IGNhbGxiYWNrLmJpbmQoc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciBzZXR0aW5nIG5vZGVPdmVyL25vZGVPdXQgaW4gYSBzaW5nbGUgY2FsbFxuXHQgKiBAcGFyYW0gb3ZlciAtIHRoZSBub2RlT3ZlciBldmVudCBoYW5kbGVyXG5cdCAqIEBwYXJhbSBvdXQgLSB0aGUgbm9kZU91dCBldmVudCBoYW5kbGVyXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycgaW4gdGhlIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVIb3ZlciA6IGZ1bmN0aW9uKG92ZXIsb3V0LHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLm5vZGVPdmVyKG92ZXIsc2VsZik7XG5cdFx0dGhpcy5ub2RlT3V0KG91dCxzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRXZlbnQgaGFuZGxlciBmb3IgY2xpY2sgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnLiAgIERlZmF1bHRzIHRvIHRoZSBncmFwaCBvYmplY3Rcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZUNsaWNrIDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVDbGljayA9IGNhbGxiYWNrLmJpbmQoc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFBhbiB7R3JhcGh9IGJ5IChkeCxkeSkuICAgQXV0b21hdGljYWxseSByZXJlbmRlciB0aGUgZ3JhcGguXG5cdCAqIEBwYXJhbSBkeCAtIEFtb3VudCBvZiBwYW4gaW4geCBkaXJlY3Rpb25cblx0ICogQHBhcmFtIGR5IC0gQW1vdW50IG9mIHBhbiBpbiB5IGRpcmVjdGlvblxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3BhbiA6IGZ1bmN0aW9uKGR4LGR5KSB7XG5cdFx0dGhpcy5fc2NlbmUueCArPSBkeDtcblx0XHR0aGlzLl9zY2VuZS55ICs9IGR5O1xuXHRcdHRoaXMuX3BhblggKz0gZHg7XG5cdFx0dGhpcy5fcGFuWSArPSBkeTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlIHtHcmFwaH0gcGFubmFibGVcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0cGFubmFibGUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9wYW5uYWJsZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2VzIHRoZSBncmFwaCBwYW4gaW4gdGhlIG9wcG9zaXRlIGRpcmVjdGlvbiBvZiB0aGUgbW91c2UgYXMgb3Bwb3NlZCB0byB3aXRoIGl0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGludmVydFBhbiA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2ludmVydGVkUGFuID0gLTE7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Ugbm9kZXMgaW4ge0dyYXBofSByZXBvaXNpdGlvbmFibGUgYnkgY2xpY2stZHJhZ2dpbmdcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0ZHJhZ2dhYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fZHJhZ2dhYmxlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfZ2V0Wm9vbUZvckxldmVsIDogZnVuY3Rpb24obGV2ZWwpIHtcblx0XHR2YXIgZmFjdG9yID0gTWF0aC5wb3coMS41ICwgTWF0aC5hYnMobGV2ZWwgLSB0aGlzLl96b29tTGV2ZWwpKTtcblx0XHRpZiAobGV2ZWwgPCB0aGlzLl96b29tTGV2ZWwpIHtcblx0XHRcdGZhY3RvciA9IDEvZmFjdG9yO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFjdG9yO1xuXHR9LFxuXG5cdF96b29tIDogZnVuY3Rpb24oZmFjdG9yLHgseSkge1xuXHRcdHRoaXMuX3pvb21TY2FsZSAqPSBmYWN0b3I7XG5cdFx0dGhpcy5fbGF5b3V0ZXIuX3pvb21TY2FsZSA9IHRoaXMuX3pvb21TY2FsZTtcblxuXHRcdC8vIFBhbiBzY2VuZSBiYWNrIHRvIG9yaWdpblxuXHRcdHZhciBvcmlnaW5hbFggPSB0aGlzLl9zY2VuZS54O1xuXHRcdHZhciBvcmlnaW5hbFkgPSB0aGlzLl9zY2VuZS55O1xuXHRcdHRoaXMuX3BhbigtdGhpcy5fc2NlbmUueCwtdGhpcy5fc2NlbmUueSk7XG5cblx0XHR2YXIgbW91c2VYID0geCB8fCAwO1xuXHRcdHZhciBtb3VzZVkgPSB5IHx8IDA7XG5cblx0XHQvLyAnWm9vbScgbm9kZXMuICAgV2UgZG8gdGhpcyBzbyB0ZXh0L3JhZGl1cyBzaXplIHJlbWFpbnMgY29uc2lzdGVudCBhY3Jvc3Mgem9vbSBsZXZlbHNcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX25vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLl9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uKHRoaXMuX25vZGVzW2ldLHRoaXMuX25vZGVzW2ldLngqZmFjdG9yLCB0aGlzLl9ub2Rlc1tpXS55KmZhY3Rvcix0cnVlKTtcblx0XHR9XG5cblx0XHQvLyBab29tIHRoZSByZW5kZXIgZ3JvdXBzXG5cdFx0aWYgKHRoaXMuX3ByZXJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5zY2FsZVggPSB0aGlzLl96b29tU2NhbGU7XG5cdFx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tU2NhbGU7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9wb3N0cmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVggPSB0aGlzLl96b29tU2NhbGU7XG5cdFx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVZID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdH1cblxuXHRcdC8vIFJldmVyc2UgdGhlICdvcmlnaW4gcGFuJyB3aXRoIHRoZSBzY2FsZSBhcHBsaWVkIGFuZCByZWNlbnRlciB0aGUgbW91c2Ugd2l0aCBzY2FsZSBhcHBsaWVkIGFzIHdlbGxcblx0XHR2YXIgbmV3TW91c2VYID0gbW91c2VYKmZhY3Rvcjtcblx0XHR2YXIgbmV3TW91c2VZID0gbW91c2VZKmZhY3Rvcjtcblx0XHR0aGlzLl9wYW4ob3JpZ2luYWxYKmZhY3RvciAtIChuZXdNb3VzZVgtbW91c2VYKSxvcmlnaW5hbFkqZmFjdG9yIC0gKG5ld01vdXNlWS1tb3VzZVkpKTtcblxuXHRcdC8vIFVwZGF0ZSB0aGUgcmVncm91cCB1bmRlcmxheXNcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKHRoaXMuX2hhbmRsZUdyb3VwICYmIHRoaXMuX2hhbmRsZUdyb3VwLmNoaWxkcmVuICYmIHRoaXMuX2hhbmRsZUdyb3VwLmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0dGhpcy5faGFuZGxlR3JvdXAucmVtb3ZlQWxsKCk7XG5cdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdHRoYXQuX2FkZFJlZ3JvdXBIYW5kbGVzKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlIHtHcmFwaH0gem9vbWFibGUgYnkgdXNpbmcgdGhlIG1vdXNld2hlZWxcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0em9vbWFibGUgOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMuX3pvb21hYmxlKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNld2hlZWwnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKCkpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHdoZWVsID0gZS5vcmlnaW5hbEV2ZW50LndoZWVsRGVsdGEvMTIwOy8vbiBvciAtblxuXHRcdFx0XHR2YXIgZmFjdG9yO1xuXHRcdFx0XHRpZiAod2hlZWwgPCAwKSB7XG5cdFx0XHRcdFx0ZmFjdG9yID0gdGhhdC5fZ2V0Wm9vbUZvckxldmVsKHRoYXQuX3pvb21MZXZlbC0xKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmYWN0b3IgPSB0aGF0Ll9nZXRab29tRm9yTGV2ZWwodGhhdC5fem9vbUxldmVsKzEpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoYXQuX3pvb20oZmFjdG9yLCBlLm9mZnNldFgsIGUub2Zmc2V0WSk7XG5cblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fem9vbWFibGUgPSB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgbGF5b3V0IGZ1bmN0aW9uIGZvciB0aGUgbm9kZXNcblx0ICogQHBhcmFtIGxheW91dGVyIC0gQW4gaW5zdGFuY2UgKG9yIHN1YmNsYXNzKSBvZiBMYXlvdXRcblx0ICogQHJldHVybnMge0dyYXBofSBpcyBsYXlvdXRlciBwYXJhbSBpcyBkZWZpbmVkLCB0aGUgbGF5b3V0ZXIgb3RoZXJ3aXNlXG5cdCAqL1xuXHRsYXlvdXRlciA6IGZ1bmN0aW9uKGxheW91dGVyKSB7XG5cdFx0aWYgKGxheW91dGVyKSB7XG5cdFx0XHR0aGlzLl9sYXlvdXRlciA9IGxheW91dGVyO1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXJcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX25vZGVzKVxuXHRcdFx0XHQubGlua01hcCh0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lKVxuXHRcdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdFx0LmxhYmVsTWFwKHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGF5b3V0ZXI7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtcyBhIGxheW91dCBvZiB0aGUgZ3JhcGhcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRpZiAodGhpcy5fbGF5b3V0ZXIpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHRoaXMuX2xheW91dGVyLmxheW91dCh0aGlzLl9jYW52YXMud2lkdGgsdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cblxuXHRcdFx0Ly8gVXBkYXRlIHRoZSByZWdyb3VwIHVuZGVybGF5c1xuXHRcdFx0aWYgKHRoaXMuX2hhbmRsZUdyb3VwICYmIHRoaXMuX2hhbmRsZUdyb3VwLmNoaWxkcmVuKSB7XG5cdFx0XHRcdHZhciB1bmRlcmxheXMgPSB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbjtcblx0XHRcdFx0dmFyIHVwZGF0ZWQgPSAwO1xuXHRcdFx0XHR1bmRlcmxheXMuZm9yRWFjaChmdW5jdGlvbih1bmRlcmxheSkge1xuXHRcdFx0XHRcdHZhciBpbmRpY2VzID0gdW5kZXJsYXkuZ3JhcGhqc19pbmRpY2VzO1xuXHRcdFx0XHRcdHZhciBiYiA9IHRoYXQuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KGluZGljZXMsUkVHUk9VTkRfQkJfUEFERElORyk7XG5cdFx0XHRcdFx0dW5kZXJsYXkudHdlZW5BdHRyKHtcblx0XHRcdFx0XHRcdHg6IGJiLngsXG5cdFx0XHRcdFx0XHR5OiBiYi55LFxuXHRcdFx0XHRcdFx0d2lkdGggOiBiYi53aWR0aCxcblx0XHRcdFx0XHRcdGhlaWdodCA6IGJiLmhlaWdodFxuXHRcdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRcdGR1cmF0aW9uOiB0aGF0Ll9sYXlvdXRlci5kdXJhdGlvbigpLFxuXHRcdFx0XHRcdFx0ZWFzaW5nOiB0aGF0Ll9sYXlvdXRlci5lYXNpbmcoKVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cblx0Z3JvdXBpbmdNYW5hZ2VyIDogZnVuY3Rpb24oZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0aWYgKGdyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyID0gZ3JvdXBpbmdNYW5hZ2VyO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ncm91cGluZ01hbmFnZXI7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGluaXRpYWxpemVHcm91cGluZyA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHRoaXMuX2dyb3VwaW5nTWFuYWdlci5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtzKHRoaXMuX2xpbmtzKVxuXHRcdFx0XHQuaW5pdGlhbGl6ZUhlaXJhcmNoeSgpO1xuXG5cdFx0XHR0aGlzLm5vZGVzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSk7XG5cdFx0XHR0aGlzLmxpbmtzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHVuZ3JvdXAgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0aWYgKCFub2RlIHx8ICFub2RlLmNoaWxkcmVuKSB7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHRoaXMuX2dyb3VwaW5nTWFuYWdlci51bmdyb3VwKG5vZGUpO1xuXHRcdFx0dGhpcy5jbGVhcigpXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpXG5cdFx0XHRcdC5saW5rcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpXG5cdFx0XHRcdC5kcmF3KCk7XG5cblx0XHRcdHRoaXMuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZSh0cnVlKTtcblx0XHRcdHRoaXMubGF5b3V0KCk7XG5cdFx0XHR0aGlzLl9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUoZmFsc2UpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRyZWdyb3VwIDogZnVuY3Rpb24odW5ncm91cGVkQWdncmVnYXRlS2V5KSB7XG5cdFx0Ly8gQW5pbWF0ZSB0aGUgcmVncm91cFxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgcGFyZW50QWdncmVnYXRlID0gdGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmdldEFnZ3JlZ2F0ZSh1bmdyb3VwZWRBZ2dyZWdhdGVLZXkpO1xuXG5cdFx0dmFyIGF2Z1BvcyA9IHsgeDogMCwgeSA6IDB9O1xuXHRcdHZhciBtYXhSYWRpdXMgPSAwO1xuXHRcdHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRhdmdQb3MueCArPSBjaGlsZC54O1xuXHRcdFx0YXZnUG9zLnkgKz0gY2hpbGQueTtcblx0XHR9KTtcblx0XHRhdmdQb3MueCAvPSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubGVuZ3RoO1xuXHRcdGF2Z1Bvcy55IC89IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGg7XG5cblx0XHR2YXIgaW5kZXhPZkNoaWxkcmVuID0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLm1hcChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGF0Ll9ncm91cGluZ01hbmFnZXIuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IGNoaWxkLmluZGV4KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgbWluQ2hpbGRJbmRleCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0aW5kZXhPZkNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oaWR4KSB7XG5cdFx0XHRtaW5DaGlsZEluZGV4ID0gTWF0aC5taW4obWluQ2hpbGRJbmRleCxpZHgpO1xuXHRcdH0pO1xuXG5cdFx0dmFyIGFuaW1hdGVkUmVncm91cGVkID0gMDtcblx0XHR0aGlzLl9zdXNwZW5kRXZlbnRzKCk7XHRcdFx0Ly8gbGF5b3V0IHdpbGwgcmVzdW1lIHRoZW1cblx0XHRwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXG5cdFx0XHR2YXIgbGFiZWwgPSB0aGF0Ll9ub2RlSW5kZXhUb0xhYmVsW2NoaWxkLmluZGV4XTtcblx0XHRcdGxhYmVsLnR3ZWVuQXR0cih7XG5cdFx0XHRcdG9wYWNpdHkgOiAwXG5cdFx0XHR9LCB7XG5cdFx0XHRcdGR1cmF0aW9uIDogdGhhdC5fbGF5b3V0ZXIuZHVyYXRpb24oKSxcblx0XHRcdFx0Y2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRsYWJlbC5vcGFjaXR5ID0gMTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHRoYXQuX2xheW91dGVyLl9zZXROb2RlUG9zaXRpb24oY2hpbGQsYXZnUG9zLngsYXZnUG9zLnksZmFsc2UsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFuaW1hdGVkUmVncm91cGVkKys7XG5cdFx0XHRcdGlmIChhbmltYXRlZFJlZ3JvdXBlZCA9PT0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdFx0XHRcdHZhciByZWdyb3VwZWRBZ2dyZWdhdGUgPSB0aGF0Ll9ncm91cGluZ01hbmFnZXIucmVncm91cCh1bmdyb3VwZWRBZ2dyZWdhdGVLZXksbWluQ2hpbGRJbmRleCk7XG5cdFx0XHRcdFx0XHRyZWdyb3VwZWRBZ2dyZWdhdGUueCA9IGF2Z1Bvcy54O1xuXHRcdFx0XHRcdFx0cmVncm91cGVkQWdncmVnYXRlLnkgPSBhdmdQb3MueTtcblx0XHRcdFx0XHRcdHRoYXQuY2xlYXIoKVxuXHRcdFx0XHRcdFx0XHQubm9kZXModGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWROb2RlcygpKVxuXHRcdFx0XHRcdFx0XHQubGlua3ModGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWRMaW5rcygpKTtcblx0XHRcdFx0XHRcdHRoYXQuZHJhdygpO1xuXHRcdFx0XHRcdFx0dGhhdC5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKHRydWUpO1xuXHRcdFx0XHRcdFx0dGhhdC5sYXlvdXQoKTtcblx0XHRcdFx0XHRcdHRoYXQuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZShmYWxzZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc2l6ZSBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250U2l6ZSAtIHNpemUgb2YgdGhlIGZvbnQgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFNpemUgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250U2l6ZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U2l6ZSA6IGZ1bmN0aW9uKGZvbnRTaXplKSB7XG5cdFx0aWYgKGZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9mb250U2l6ZSA9IGZvbnRTaXplO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udFNpemU7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgY29sb3VyIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRDb2xvdXIgLSBBIGhleCBzdHJpbmcgZm9yIHRoZSBjb2xvdXIgb2YgdGhlIGxhYmVsc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRDb2xvdXIgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250Q29sb3VyfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRDb2xvdXIgOiBmdW5jdGlvbihmb250Q29sb3VyKSB7XG5cdFx0aWYgKGZvbnRDb2xvdXIpIHtcblx0XHRcdHRoaXMuX2ZvbnRDb2xvciA9IGZvbnRDb2xvdXI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250Q29sb3I7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc3Ryb2tlIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTdHJva2UgLSBBIGhleCBzdHJpbmcgZm9yIHRoZSBjb2xvciBvZiB0aGUgbGFiZWwgc3Ryb2tlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFN0cm9rZSBwYXJhbSBpcyBkZWZpbmVkLCB7R3JhcGguX2ZvbnRTdHJva2V9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udFN0cm9rZSA6IGZ1bmN0aW9uKGZvbnRTdHJva2UpIHtcblx0XHRpZiAoZm9udFN0cm9rZSkge1xuXHRcdFx0dGhpcy5fZm9udFN0cm9rZSA9IGZvbnRTdHJva2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250U3Ryb2tlO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IHN0cm9rZSB3aWR0aCBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250U3Ryb2tlV2lkdGggLSBzaXplIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRTdHJva2VXaWR0aCBwYXJhbSBpcyBkZWZpbmVkLCB7R3JhcGguX2ZvbnRTdHJva2VXaWR0aH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U3Ryb2tlV2lkdGggOiBmdW5jdGlvbihmb250U3Ryb2tlV2lkdGgpIHtcblx0XHRpZiAoZm9udFN0cm9rZVdpZHRoKSB7XG5cdFx0XHR0aGlzLl9mb250U3Ryb2tlV2lkdGggPSBmb250U3Ryb2tlV2lkdGg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250U3Ryb2tlV2lkdGg7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgZmFtaWx5IGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRGYW1pbHkgLSBBIHN0cmluZyBmb3IgdGhlIGZvbnQgZmFtaWx5IChhIGxhIEhUTUw1IENhbnZhcylcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250RmFtaWx5IHBhcmFtIGlzIGRlaWZuZWQsIHtHcmFwaC5fZm9udEZhbWlseX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250RmFtaWx5IDogZnVuY3Rpb24oZm9udEZhbWlseSkge1xuXHRcdGlmIChmb250RmFtaWx5KSB7XG5cdFx0XHR0aGlzLl9mb250RmFtaWx5ID0gZm9udEZhbWlseTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRGYW1pbHk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGZvbnRTaGFkb3cgOiBmdW5jdGlvbihjb2xvcixvZmZzZXRYLG9mZnNldFksYmx1cikge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb2xvcjogdGhpcy5fc2hhZG93Q29sb3IsXG5cdFx0XHRcdG9mZnNldFg6IHRoaXMuX3NoYWRvd09mZnNldFgsXG5cdFx0XHRcdG9mZnNldFk6IHRoaXMuX3NoYWRvd09mZnNldFksXG5cdFx0XHRcdGJsdXI6IHRoaXMuX3NoYWRvd0JsdXJcblx0XHRcdH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3NoYWRvd0NvbG9yID0gY29sb3I7XG5cdFx0XHR0aGlzLl9zaGFkb3dPZmZzZXRYID0gb2Zmc2V0WDtcblx0XHRcdHRoaXMuX3NoYWRvd09mZnNldFkgPSBvZmZzZXRZO1xuXHRcdFx0dGhpcy5fc2hhZG93Qmx1ciA9IGJsdXI7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlc2l6ZSB0aGUgZ3JhcGguICBBdXRvbWF0aWNhbGx5IHBlcmZvcm1zIGxheW91dCBhbmQgcmVyZW5kZXJzIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gdyAtIHRoZSBuZXcgd2lkdGhcblx0ICogQHBhcmFtIGggLSB0aGUgbmV3IGhlaWdodFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRyZXNpemUgOiBmdW5jdGlvbih3LGgpIHtcblx0XHR0aGlzLl93aWR0aCA9IHc7XG5cdFx0dGhpcy5faGVpZ2h0ID0gaDtcblx0XHQkKHRoaXMuX2NhbnZhcykuYXR0cih7d2lkdGg6dyxoZWlnaHQ6aH0pXG5cdFx0XHQud2lkdGgodylcblx0XHRcdC5oZWlnaHQoaCk7XG5cdFx0dGhpcy5fc2NlbmUucmVzaXplKHcsaCk7XG5cblx0XHRpZiAoIXRoaXMuX3Bhbm5hYmxlICYmICF0aGlzLl96b29tYWJsZSkge1xuXHRcdFx0dGhpcy5sYXlvdXQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGEgbGlzdCBvZiBwcmUvcG9zdCByZW5kZXIgb2JqZWN0cyBmcm9tIHRoZSBsYXlvdXRlciAoaWYgYW55KVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FkZFByZUFuZFBvc3RSZW5kZXJPYmplY3RzIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAucmVtb3ZlQWxsKCk7XG5cblx0XHQvLyBHZXQgdGhlIGJhY2tncm91bmQgb2JqZWN0cyBmcm9tIHRoZSBsYXlvdXRlclxuXHRcdHZhciBvYmpzID0gdGhpcy5fbGF5b3V0ZXIucHJlcmVuZGVyKHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmIChvYmpzKSB7XG5cdFx0XHRvYmpzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyT2JqZWN0KSB7XG5cdFx0XHRcdHRoYXQuX3ByZXJlbmRlckdyb3VwLmFkZENoaWxkKHJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAucmVtb3ZlQWxsKCk7XG5cdFx0b2JqcyA9IHRoaXMuX2xheW91dGVyLnBvc3RyZW5kZXIodGhpcy5fd2lkdGgsdGhpcy5faGVpZ2h0KTtcblx0XHRpZiAob2Jqcykge1xuXHRcdFx0b2Jqcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlck9iamVjdCkge1xuXHRcdFx0XHR0aGF0Ll9wb3N0cmVuZGVyR3JvdXAuYWRkQ2hpbGQocmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblxuXHRfYWRkUmVncm91cEhhbmRsZXMgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dmFyIHVuZ3JvdXBlZE5vZGVJbmZvID0gdGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmdldFVuZ3JvdXBlZE5vZGVzKCk7XG5cdFx0XHR1bmdyb3VwZWROb2RlSW5mby5mb3JFYWNoKGZ1bmN0aW9uKHVuZ3JvdXBlZE5vZGUpIHtcblx0XHRcdFx0dmFyIGluZGljZXMgPSB1bmdyb3VwZWROb2RlLmluZGljZXM7XG5cdFx0XHRcdHZhciBrZXkgPSB1bmdyb3VwZWROb2RlLmtleTtcblx0XHRcdFx0dmFyIGJib3ggPSB0aGF0Ll9sYXlvdXRlci5nZXRCb3VuZGluZ0JveChpbmRpY2VzLFJFR1JPVU5EX0JCX1BBRERJTkcpO1xuXHRcdFx0XHR2YXIgYm91bmRpbmdCb3hSZW5kZXJPYmplY3QgPSBwYXRoLnJlY3Qoe1xuXHRcdFx0XHRcdHggOiBiYm94LngsXG5cdFx0XHRcdFx0eSA6IGJib3gueSxcblx0XHRcdFx0XHRncmFwaGpzX3R5cGUgOiAncmVncm91cF91bmRlcmxheScsXG5cdFx0XHRcdFx0Z3JhcGhqc19pbmRpY2VzIDogaW5kaWNlcyxcblx0XHRcdFx0XHR3aWR0aCA6IGJib3gud2lkdGgsXG5cdFx0XHRcdFx0aGVpZ2h0IDogYmJveC5oZWlnaHQsXG5cdFx0XHRcdFx0c3Ryb2tlU3R5bGUgOiAnIzIzMjMyMycsXG5cdFx0XHRcdFx0ZmlsbFN0eWxlIDogJyMwMDAwMDAnLFxuXHRcdFx0XHRcdG9wYWNpdHkgOiAwLjFcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0Lm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGhhdC5yZWdyb3VwKGtleSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGF0Ll9oYW5kbGVHcm91cC5hZGRDaGlsZChib3VuZGluZ0JveFJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogUmVkcmF3IHRoZSBncmFwaFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHR1cGRhdGUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRHJhdyB0aGUgZ3JhcGguICAgT25seSBuZWVkcyB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIG5vZGVzL2xpbmtzIGhhdmUgYmVlbiBzZXRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0ZHJhdyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdGlmICghdGhpcy5fc2NlbmUpIHtcblx0XHRcdHRoaXMuX3NjZW5lID0gcGF0aCh0aGlzLl9jYW52YXMpO1xuXHRcdH1cblx0XHRpZiAoIXRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHR2YXIgZGVmYXVsTGF5b3V0ID0gbmV3IExheW91dCgpXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHRcdHRoaXMubGF5b3V0ZXIoZGVmYXVsTGF5b3V0KTtcblx0XHR9XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAgPSBwYXRoLmdyb3VwKCk7XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX2hhbmRsZUdyb3VwID0gcGF0aC5ncm91cCgpO1xuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cCA9IHBhdGguZ3JvdXAoe25vSGl0OnRydWV9KTtcblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVZID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9hZGRQcmVBbmRQb3N0UmVuZGVyT2JqZWN0cygpO1xuXG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5fcHJlcmVuZGVyR3JvdXApO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX2hhbmRsZUdyb3VwKTtcblx0XHR0aGlzLl9saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcblxuXHRcdFx0dmFyIGxpbmtPYmplY3Q7XG5cdFx0XHRpZiAoIWxpbmsudHlwZSkge1xuXHRcdFx0XHRsaW5rLnR5cGUgPSBMSU5LX1RZUEUuREVGQVVMVDtcblx0XHRcdH1cblx0XHRcdHN3aXRjaChsaW5rLnR5cGUpIHtcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuQVJST1c6XG5cdFx0XHRcdFx0bGluay5oZWFkT2Zmc2V0ID0gbGluay50YXJnZXQucmFkaXVzO1xuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmFycm93KGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5BUkM6XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGguYXJjKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5MSU5FOlxuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5ERUZBVUxUOlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmxpbmUobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGgubGluZShsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdHRoYXQuX25vZGVJbmRleFRvTGlua0xpbmVbbGluay5zb3VyY2UuaW5kZXhdLnB1c2gobGlua09iamVjdCk7XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW2xpbmsudGFyZ2V0LmluZGV4XS5wdXNoKGxpbmtPYmplY3QpO1xuXG5cdFx0XHR0aGF0Ll9zY2VuZS5hZGRDaGlsZChsaW5rT2JqZWN0KTtcblx0XHR9KTtcblxuXHRcdHRoaXMuX25vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dmFyIGNpcmNsZSA9IHBhdGguY2lyY2xlKG5vZGUpO1xuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9DaXJjbGVbbm9kZS5pbmRleF0gPSBjaXJjbGU7XG5cdFx0XHRpZiAodGhhdC5fbm9kZU92ZXIgfHwgdGhhdC5fZHJhZ2dhYmxlKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ21vdXNlb3ZlcicpO1xuXHRcdFx0XHRjaXJjbGUub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKCkpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX25vZGVPdmVyKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ub2RlT3ZlcihjaXJjbGUsIGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSE9PSdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IGNpcmNsZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhhdC5fc2NlbmUudXBkYXRlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoYXQuX25vZGVPdXQgfHwgdGhhdC5fZHJhZ2dhYmxlKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ21vdXNlb3V0Jyk7XG5cdFx0XHRcdGNpcmNsZS5vbignbW91c2VvdXQnLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlIT09J2RyYWdnaW5nJykge1xuXHRcdFx0XHRcdFx0dGhhdC5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX25vZGVPdXQpIHtcblx0XHRcdFx0XHRcdHRoYXQuX25vZGVPdXQoY2lyY2xlLCBlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhhdC5fc2NlbmUudXBkYXRlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoYXQuX25vZGVDbGljaykge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdjbGljaycpO1xuXHRcdFx0XHRjaXJjbGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHR0aGF0Ll9ub2RlQ2xpY2soY2lyY2xlLGUpO1xuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ2NsaWNrJyk7XG5cdFx0XHRcdGNpcmNsZS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0KSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ub2RlT3V0KGNpcmNsZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQudW5ncm91cChjaXJjbGUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoYXQuX3NjZW5lLmFkZENoaWxkKGNpcmNsZSk7XG5cblx0XHRcdGlmIChub2RlLmxhYmVsKSB7XG5cdFx0XHRcdHRoYXQuYWRkTGFiZWwobm9kZSxub2RlLmxhYmVsKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmICh0aGlzLnNob3dBbGxMYWJlbHMoKSkge1xuXHRcdFx0dGhpcy5zaG93QWxsTGFiZWxzKHRydWUpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2xheW91dGVyLmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdC5ub2RlTWFwKHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKVxuXHRcdFx0LmxhYmVsTWFwKHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXG5cdFx0Ly8gRHJhdyBhbnkgdW5ncm91cGVkIG5vZGUgYm91bmRpbmcgYm94ZXNcblx0XHR0aGlzLl9hZGRSZWdyb3VwSGFuZGxlcygpO1xuXG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5fcG9zdHJlbmRlckdyb3VwKTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2RlYnVnRHJhd0JvdW5kaW5nQm94IDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMpO1xuXHRcdGlmICh0aGlzLl9iYlJlbmRlcikge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5fYmJSZW5kZXIpO1xuXHRcdH1cblx0XHR0aGlzLl9iYlJlbmRlciA9IHBhdGgucmVjdCh7XG5cdFx0XHR4IDogYm91bmRpbmdCb3gueCxcblx0XHRcdHkgOiBib3VuZGluZ0JveC55LFxuXHRcdFx0d2lkdGggOiBib3VuZGluZ0JveC53aWR0aCxcblx0XHRcdGhlaWdodCA6IGJvdW5kaW5nQm94LmhlaWdodCxcblx0XHRcdHN0cm9rZVN0eWxlIDogJyNmZjAwMDAnLFxuXHRcdFx0bGluZVdpZHRoIDogMlxuXHRcdH0pO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX2JiUmVuZGVyKTtcblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogRml0IHRoZSBncmFwaCB0byB0aGUgc2NyZWVuXG5cdCAqL1xuXHRmaXQgOiBmdW5jdGlvbihwYWRkaW5nKSB7XG5cblx0XHQvLyBSZXR1cm4gYmFjayB0byBvcmlnaW5cblx0XHR0aGlzLl9wYW4oLXRoaXMuX3NjZW5lLngsLXRoaXMuX3NjZW5lLnkpO1xuXG5cblxuXHRcdC8vIFdvcmtpbmcgd2l0aCBiaWcgbnVtYmVycywgaXQncyBiZXR0ZXIgaWYgd2UgZG8gdGhpcyB0d2ljZS5cblx0XHR2YXIgYm91bmRpbmdCb3g7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyOyBpKyspIHtcblx0XHRcdGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMscGFkZGluZyk7XG5cdFx0XHR2YXIgeFJhdGlvID0gdGhpcy5fc2NlbmUud2lkdGggLyBib3VuZGluZ0JveC53aWR0aDtcblx0XHRcdHZhciB5UmF0aW8gPSB0aGlzLl9zY2VuZS5oZWlnaHQgLyBib3VuZGluZ0JveC5oZWlnaHQ7XG5cdFx0XHR0aGlzLl96b29tKE1hdGgubWluKHhSYXRpbywgeVJhdGlvKSwgMCwgMCk7XG5cdFx0fVxuXG5cdFx0dmFyIG1pZFNjcmVlblggPSB0aGlzLl9zY2VuZS53aWR0aCAvIDI7XG5cdFx0dmFyIG1pZFNjcmVlblkgPSB0aGlzLl9zY2VuZS5oZWlnaHQgLyAyO1xuXHRcdGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMpO1xuXHRcdHZhciBtaWRCQlggPSBib3VuZGluZ0JveC54ICsgYm91bmRpbmdCb3gud2lkdGggLyAyO1xuXHRcdHZhciBtaWRCQlkgPSBib3VuZGluZ0JveC55ICsgYm91bmRpbmdCb3guaGVpZ2h0IC8gMjtcblx0XHR0aGlzLl9wYW4oLShtaWRCQlgtbWlkU2NyZWVuWCksLShtaWRCQlktbWlkU2NyZWVuWSkpO1xuXG5cdFx0dGhpcy5fem9vbVNjYWxlID0gMS4wO1xuXHRcdHRoaXMuX2xheW91dGVyLl96b29tU2NhbGUgPSAxLjA7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU3VzcGVuZCBtb3VzZSBldmVudHMgYW5kIHpvb21pbmdcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9zdXNwZW5kRXZlbnRzIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fbGF5b3V0ZXIuX2V2ZW50c1N1c3BlbmRlZCA9IHRydWU7XG5cdH0sXG5cblx0LyoqXG5cdCAqIHJlc3VtZSBtb3VzZSBldmVudHMgYW5kIHpvb21pbmdcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9yZXN1bWVFdmVudHMgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9sYXlvdXRlci5fZXZlbnRzU3VzcGVuZGVkID0gZmFsc2U7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFF1ZXJ5IGV2ZW50IHN1c3BlbnNpb24gc3RhdHVzXG5cdCAqIEByZXR1cm5zIGJvb2xlYW5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9ldmVudHNTdXNwZW5kZWQgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fbGF5b3V0ZXIuX2V2ZW50c1N1c3BlbmRlZDtcblx0fSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBhbGwgcmVuZGVyIG9iamVjdHMgYXNzb2NpYXRlZCB3aXRoIGEgZ3JhcGguXG5cdCAqL1xuXHRjbGVhciA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciByZW1vdmVSZW5kZXJPYmplY3RzID0gZnVuY3Rpb24oaW5kZXhUb09iamVjdCkge1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIGluZGV4VG9PYmplY3QpIHtcblx0XHRcdFx0aWYgKGluZGV4VG9PYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdHZhciBvYmogPSBpbmRleFRvT2JqZWN0W2tleV07XG5cdFx0XHRcdFx0aWYgKCQuaXNBcnJheShvYmopKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmpbaV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkZWxldGUgaW5kZXhUb09iamVjdFtrZXldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0aWYgKHRoaXMuX3ByZXJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9wcmVyZW5kZXJHcm91cCk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5faGFuZGxlR3JvdXApO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fcG9zdHJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9wb3N0cmVuZGVyR3JvdXApO1xuXHRcdH1cblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cblxuZXhwb3J0cy5MSU5LX1RZUEUgPSByZXF1aXJlKCcuL2xpbmtUeXBlJyk7XG5leHBvcnRzLkdyb3VwaW5nTWFuYWdlciA9IHJlcXVpcmUoJy4vZ3JvdXBpbmdNYW5hZ2VyJyk7XG5leHBvcnRzLkxheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5leHBvcnRzLkNvbHVtbkxheW91dCA9IHJlcXVpcmUoJy4vY29sdW1uTGF5b3V0Jyk7XG5leHBvcnRzLlJhZGlhbExheW91dCA9IHJlcXVpcmUoJy4vcmFkaWFsTGF5b3V0Jyk7XG5leHBvcnRzLkV4dGVuZCA9IF8uZXh0ZW5kO1xuZXhwb3J0cy5HcmFwaCA9IEdyYXBoOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbi8qKlxuICpcbiAqIEBwYXJhbSBmb2N1cyAtIHRoZSBub2RlIGF0IHRoZSBjZW50ZXIgb2YgdGhlIHJhZGlhbCBsYXlvdXRcbiAqIEBwYXJhbSBkaXN0YW5jZSAtIHRoZSBkaXN0YW5jZSBvZiBvdGhlciBub2RlcyBmcm9tIHRoZSBmb2N1c1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJhZGlhbExheW91dChmb2N1cyxkaXN0YW5jZSkge1xuXHR0aGlzLl9mb2N1cyA9IGZvY3VzO1xuXHR0aGlzLl9kaXN0YW5jZSA9IGRpc3RhbmNlO1xuXG5cdExheW91dC5hcHBseSh0aGlzKTtcbn1cblxuXG5SYWRpYWxMYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoUmFkaWFsTGF5b3V0LnByb3RvdHlwZSwgTGF5b3V0LnByb3RvdHlwZSwge1xuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBkaXN0YW5jZSBwYXJhbWV0ZXJcblx0ICogQHBhcmFtIGRpc3RhbmNlIC0gdGhlIGRpc3RhbmNlIG9mIGxpbmtzIGZyb20gdGhlIGZvY3VzIG5vZGUgdG8gb3RoZXIgbm9kZXMgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtSYWRpYWxMYXlvdXR9IGlmIGRpc3RhbmNlIHBhcmFtIGlzIGRlZmluZWQsIHtSYWRpYWxMYXlvdXQuX2Rpc3RhbmNlfSBvdGhlcndpc2Vcblx0ICovXG5cdGRpc3RhbmNlOiBmdW5jdGlvbiAoZGlzdGFuY2UpIHtcblx0XHRpZiAoZGlzdGFuY2UpIHtcblx0XHRcdHRoaXMuX2Rpc3RhbmNlID0gZGlzdGFuY2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9kaXN0YW5jZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9jdXMgbm9kZSB0aGF0IGlzIGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxheW91dFxuXHQgKiBAcGFyYW0gZm9jdXMgLSB0aGUgbm9kZSB0aGF0IGlzIGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxheW91dC4gICBPdGhlciBub2RlcyBhcmUgY2VudGVyZWQgYXJvdW5kIHRoaXMuXG5cdCAqIEByZXR1cm5zIHtSYWRpYWxMYXlvdXR9IGlmIGZvY3VzIHBhcmFtIGlzIGRlZmluZWQsIHtSYWRpYWxMYXlvdXQuX2ZvY3VzfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvY3VzOiBmdW5jdGlvbiAoZm9jdXMpIHtcblx0XHRpZiAoZm9jdXMpIHtcblx0XHRcdHRoaXMuX2ZvY3VzID0gZm9jdXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb2N1cztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCB0aGUgbGFiZWwgcG9zaXRpb24gZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVggLSB0aGUgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVkgLSB0aGUgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gcmFkaXVzIC0gdGhlIHJhZGl1cyBvZiB0aGUgbm9kZVxuXHQgKiBAcmV0dXJucyB7e3g6IHggcG9zaXRpb24gb2YgdGhlIGxhYmVsLCB5OiB5IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgYWxpZ246IEhUTUwgY2FudmFzIHRleHQgYWxpZ25tZW50IHByb3BlcnR5IGZvciBsYWJlbH19XG5cdCAqL1xuXHRsYXlvdXRMYWJlbDogZnVuY3Rpb24gKG5vZGVYLCBub2RlWSwgcmFkaXVzKSB7XG5cdFx0dmFyIHgsIHksIGFsaWduO1xuXG5cdFx0Ly8gUmlnaHQgb2YgY2VudGVyXG5cdFx0aWYgKG5vZGVYID4gdGhpcy5fZm9jdXMpIHtcblx0XHRcdHggPSBub2RlWCArIChyYWRpdXMgKyAxMCk7XG5cdFx0XHRhbGlnbiA9ICdzdGFydCc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHggPSBub2RlWCAtIChyYWRpdXMgKyAxMCk7XG5cdFx0XHRhbGlnbiA9ICdlbmQnO1xuXHRcdH1cblxuXHRcdGlmIChub2RlWSA+IHRoaXMuX2ZvY3VzKSB7XG5cdFx0XHR5ID0gbm9kZVkgKyAocmFkaXVzICsgMTApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR5ID0gbm9kZVkgLSAocmFkaXVzICsgMTApO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0eDogeCxcblx0XHRcdHk6IHksXG5cdFx0XHRhbGlnbjogYWxpZ25cblx0XHR9O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIGEgcmFkaWFsIGxheW91dFxuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqL1xuXHRsYXlvdXQ6IGZ1bmN0aW9uICh3LCBoKSB7XG5cdFx0dmFyIG5vZGVzID0gdGhpcy5ub2RlcygpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgYW5nbGVEZWx0YSA9IE1hdGguUEkgKiAyIC8gKG5vZGVzLmxlbmd0aCAtIDEpO1xuXHRcdHZhciBhbmdsZSA9IDAuMDtcblx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0XHRpZiAobm9kZS5pbmRleCA9PT0gdGhhdC5fZm9jdXMuaW5kZXgpIHtcblx0XHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUsIG5vZGUueCwgbm9kZS55KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIG5ld1ggPSB0aGF0Ll9mb2N1cy54ICsgKE1hdGguY29zKGFuZ2xlKSAqIHRoYXQuX2Rpc3RhbmNlKTtcblx0XHRcdHZhciBuZXdZID0gdGhhdC5fZm9jdXMueSArIChNYXRoLnNpbihhbmdsZSkgKiB0aGF0Ll9kaXN0YW5jZSk7XG5cdFx0XHR0aGF0Ll9zZXROb2RlUG9zaXRpb24obm9kZSwgbmV3WCwgbmV3WSk7XG5cdFx0XHRhbmdsZSArPSBhbmdsZURlbHRhO1xuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSYWRpYWxMYXlvdXQ7XG4iLCJcbnZhciBVdGlsID0ge1xuXG4gIGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuICAgIHZhciBrZXksIGksIHNvdXJjZTtcbiAgICBmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzdDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(5)
});
