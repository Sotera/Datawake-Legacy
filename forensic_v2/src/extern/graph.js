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

	updateNode : function(nodeIndex,props) {
		// TODO:  remove mucking with position settings from props?
		if (nodeIndex) {
			var circle = this._nodeIndexToCircle[nodeIndex];
			circle = _.extend(circle,props);
			this._nodeIndexToCircle[nodeIndex] = circle;
			this.update();
		}
	},

	updateLink : function(sourceNodeIndex,targetNodeIndex,props) {
		// TODO:  remove mucking with position settings from props?
		var toUpdate = [];
		if (sourceNodeIndex) {
			var lines = this._nodeIndexToLinkLine[sourceNodeIndex];
			toUpdate = lines;
			if (lines && targetNodeIndex) {
				toUpdate = lines.filter(function (line) {
					return line.target.index === targetNodeIndex;
				});
			}
		} else if (targetNodeIndex) {
			var lines = this._nodeIndexToLinkLine[targetNodeIndex];
			toUpdate = lines;
			if (lines && sourceNodeIndex) {
				toUpdate = lines.filter(function (line) {
					return line.source.index === sourceNodeIndex;
				});
			}
		}
		var updated = [];
		toUpdate.forEach(function (line) {
			updated.push(_.extend(line, props));
		});
		this.update();
	},

	updateLabel : function(nodeIndex,props) {
		// TODO:  remove mucking with position settings from props?
		if (nodeIndex) {
			var text = this._nodeIndexToLabel[nodeIndex];
			text = _.extend(circle,props);
			this._nodeIndexToLabel[index] = circle;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvY29sdW1uTGF5b3V0LmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbGlua1R5cGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9yYWRpYWxMYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgQ29sdW1uTGF5b3V0ID0gZnVuY3Rpb24oKSB7XG5cdExheW91dC5hcHBseSh0aGlzKTtcbn07XG5cbkNvbHVtbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChDb2x1bW5MYXlvdXQucHJvdG90eXBlLCBMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEEgY29sdW1uIGxheW91dFxuXHQgKiBAcGFyYW0gdyAtIHdpZHRoIG9mIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIGhlaWdodCBvZiBjYW52YXNcblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uICh3LCBoKSB7XG5cdFx0dmFyIHggPSAwO1xuXHRcdHZhciB5ID0gMDtcblx0XHR2YXIgbWF4UmFkaXVzQ29sID0gMDtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuXG5cdFx0XHRpZiAoeSA9PT0gMCkge1xuXHRcdFx0XHR5ICs9IG5vZGUucmFkaXVzO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHggPT09IDApIHtcblx0XHRcdFx0eCArPSBub2RlLnJhZGl1cztcblx0XHRcdH1cblxuXHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlKG5vZGUsIHgsIHkpO1xuXG5cdFx0XHRtYXhSYWRpdXNDb2wgPSBNYXRoLm1heChtYXhSYWRpdXNDb2wsIG5vZGUucmFkaXVzKTtcblxuXHRcdFx0eSArPSBub2RlLnJhZGl1cyArIDQwO1xuXHRcdFx0aWYgKHkgPiBoKSB7XG5cdFx0XHRcdHkgPSAwO1xuXHRcdFx0XHR4ICs9IG1heFJhZGl1c0NvbCArIDQwO1xuXHRcdFx0XHRtYXhSYWRpdXNDb2wgPSAwO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2x1bW5MYXlvdXQ7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBiYXNlIGdyb3VwaW5nIG1hbmFnZXIuICAgVGhpcyBpcyBhbiBhYnN0cmFjdCBjbGFzcy4gICBDaGlsZCBjbGFzc2VzIHNob3VsZCBvdmVycmlkZSB0aGVcbiAqIGluaXRpYWxpemVIZWlyYXJjaHkgZnVuY3Rpb24gdG8gY3JlYXRlIG5vZGVzL2xpbmtzIHRoYXQgYXJlIGFnZ3JlZ2F0ZWQgZm9yIHRoZWlyIHNwZWNpZmljIGltcGxlbWVudGF0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEdyb3VwaW5nTWFuYWdlciA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBbXTtcblx0dGhpcy5fbGlua3MgPSBbXTtcblxuXHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBbXTtcblx0dGhpcy5fYWdncmVnYXRlZExpbmtzID0gW107XG5cdHRoaXMuX2FnZ3JlZ2F0ZU5vZGVNYXAgPSB7fTtcblxuXHR0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzID0ge307XG5cdHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMgPSB7fTtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuR3JvdXBpbmdNYW5hZ2VyLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEdyb3VwaW5nTWFuYWdlci5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgb3JpZ2luYWwgbm9kZXMgaW4gdGhlIGdyYXBoIHdpdGhvdXQgZ3JvdXBpbmdcblx0ICogQHBhcmFtIG5vZGVzIC0gYSBncmFwaC5qcyBub2RlIGFycmF5XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2Rlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBvcmlnaW5hbCBsaW5rcyBpbiB0aGUgZ3JhcGggd2l0aG91dCBncm91cGluZ1xuXHQgKiBAcGFyYW0gbGlua3MgLSBhIGdyYXBoLmpzIGxpbmsgYXJyYXlcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRsaW5rcyA6IGZ1bmN0aW9uKGxpbmtzKSB7XG5cdFx0aWYgKGxpbmtzKSB7XG5cdFx0XHR0aGlzLl9saW5rcyA9IGxpbmtzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGlua3M7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplcyB0aGUgbm9kZS9saW5rIGFnZ3JlZ2F0aW9uXG5cdCAqL1xuXHRpbml0aWFsaXplSGVpcmFyY2h5IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fYWdncmVnYXRlTm9kZXMoKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXG5cdFx0dmFyIHNldFBhcmVudFBvaW50ZXJzID0gZnVuY3Rpb24obm9kZSxwYXJlbnQpIHtcblx0XHRcdGlmIChub2RlLmNoaWxkcmVuKSB7XG5cdFx0XHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0XHRcdHNldFBhcmVudFBvaW50ZXJzKGNoaWxkLG5vZGUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdG5vZGUucGFyZW50Tm9kZSA9IHBhcmVudDtcblx0XHR9O1xuXG5cdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0c2V0UGFyZW50UG9pbnRlcnMobm9kZSxudWxsKTtcblx0XHR9KTtcblxuXHRcdGlmICh0aGlzLm9uQWdncmVnYXRpb25Db21wbGV0ZSkge1xuXHRcdFx0dGhpcy5vbkFnZ3JlZ2F0aW9uQ29tcGxldGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYWdncmVnYXRlZCBsaW5rIGluIGdyYXBoLmpzIGZvcm1hdC4gICBDYW4gYmUgb3ZlcnJpZGVuIGJ5IHNwZWNpZmljIGltcGxlbWVudGF0aW9ucyB0byBhbGxvd1xuXHQgKiB0byBhbGxvdyBmb3IgZGlmZXJlbnQgbGluayB0eXBlcyBiYXNlZCBvbiBhZ2dyZWdhdGUgY29udGVudHNcblx0ICogQHBhcmFtIHNvdXJjZUFnZ3JlZ2F0ZSAtIHRoZSBzb3VyY2UgYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIHRhcmdldEFnZ3JlZ2F0ZSAtIHRoZSB0YXJnZXQgYWdncmVnYXRlIG5vZGVcblx0ICogQHJldHVybnMge3tzb3VyY2U6ICosIHRhcmdldDogKn19IC0gYSBncmFwaC5qcyBsaW5rXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfY3JlYXRlQWdncmVnYXRlTGluayA6IGZ1bmN0aW9uKHNvdXJjZUFnZ3JlZ2F0ZSx0YXJnZXRBZ2dyZWdhdGUsb3JpZ2luYWxMaW5rcykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzb3VyY2UgOiBzb3VyY2VBZ2dyZWdhdGUsXG5cdFx0XHR0YXJnZXQgOiB0YXJnZXRBZ2dyZWdhdGVcblx0XHR9O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtcyBsaW5rIGFnZ3JlZ2F0ZSBiYXNlZCBvbiBhIHNldCBvZiBhZ2dyZWdhdGVkIG5vZGVzIGFuZCBhIGZ1bGwgc2V0IG9mIGxpbmtzXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfYWdncmVnYXRlTGlua3MgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZSA9IHt9O1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHRcdGlmIChhZ2dyZWdhdGUuY2hpbGRyZW4pIHtcblx0XHRcdFx0YWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbm9kZS5pbmRleF0gPSBhZ2dyZWdhdGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fYWdncmVnYXRlTm9kZU1hcFthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdH0pO1xuXG5cblx0XHR2YXIgYWdncmVnYXRlZExpbmtzID0gW107XG5cblx0XHR2YXIgYWdncmVnYXRlTGlua01hcCA9IHt9O1xuXG5cdFx0dGhpcy5fbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgc291cmNlQWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnNvdXJjZS5pbmRleF07XG5cdFx0XHR2YXIgdGFyZ2V0QWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnRhcmdldC5pbmRleF07XG5cblx0XHRcdHZhciBzb3VyY2VNYXAgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZU1hcCkge1xuXHRcdFx0XHRzb3VyY2VNYXAgPSB7fTtcblx0XHRcdH1cblx0XHRcdHZhciBzb3VyY2VUb1RhcmdldExpbmtzID0gc291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZVRvVGFyZ2V0TGlua3MpIHtcblx0XHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcyA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcy5wdXNoKGxpbmspO1xuXHRcdFx0c291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VUb1RhcmdldExpbmtzO1xuXG5cdFx0XHRhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VNYXA7XG5cdFx0fSk7XG5cblx0XHQvLyBHZXQgbWluL21heCBsaW5rIGNvdW50cyBmb3IgYWxsIGFnZ3JlZ2F0ZSBwYWlyc1xuXHRcdHZhciBtaW5Db3VudCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heENvdW50ID0gMDtcblx0XHRmb3IgKHZhciBzb3VyY2VBZ2dyZWdhdGVJZCBpbiBhZ2dyZWdhdGVMaW5rTWFwKSB7XG5cdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcC5oYXNPd25Qcm9wZXJ0eShzb3VyY2VBZ2dyZWdhdGVJZCkpIHtcblx0XHRcdFx0Zm9yICh2YXIgdGFyZ2V0QWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0pIHtcblx0XHRcdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0uaGFzT3duUHJvcGVydHkodGFyZ2V0QWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdFx0XHR2YXIgc291cmNlID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFtzb3VyY2VBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgb3JpZ2luYWxMaW5rcyA9IGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdW3RhcmdldEFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdG1pbkNvdW50ID0gTWF0aC5taW4obWluQ291bnQsb3JpZ2luYWxMaW5rcy5sZW5ndGgpO1xuXHRcdFx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heChtYXhDb3VudCxvcmlnaW5hbExpbmtzLmxlbmd0aCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgc291cmNlQWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcCkge1xuXHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXAuaGFzT3duUHJvcGVydHkoc291cmNlQWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdGZvciAodmFyIHRhcmdldEFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdKSB7XG5cdFx0XHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdLmhhc093blByb3BlcnR5KHRhcmdldEFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRcdFx0dmFyIHNvdXJjZSA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbc291cmNlQWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIHRhcmdldCA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIG9yaWdpbmFsTGlua3MgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXVt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgbGluayA9IHRoYXQuX2NyZWF0ZUFnZ3JlZ2F0ZUxpbmsoc291cmNlLCB0YXJnZXQsIG9yaWdpbmFsTGlua3MsIG1pbkNvdW50LCBtYXhDb3VudCk7XG5cdFx0XHRcdFx0XHRpZiAobGluaykge1xuXHRcdFx0XHRcdFx0XHRhZ2dyZWdhdGVkTGlua3MucHVzaChsaW5rKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9hZ2dyZWdhdGVkTGlua3MgPSBhZ2dyZWdhdGVkTGlua3M7XG5cdH0sXG5cblxuXHQvKipcblx0ICogUGVyZm9ybSBub2RlIGFnZ3JlZ2F0aW9uLiAgIE11c3QgYmUgb3ZlcnJpZGVuIGJ5IGltcGxlbWVudG9yc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZU5vZGVzIDogZnVuY3Rpb24oKSB7XG5cblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBub2Rlc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIG5vZGVzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTm9kZXMgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZE5vZGVzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gb2YgZ3JhcGguanMgbGlua3Ncblx0ICovXG5cdGFnZ3JlZ2F0ZWRMaW5rcyA6IGZ1bmN0aW9uKCkgIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cdHJlbW92ZSA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHR2YXIgaW5kZXggPSAtMTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0aW5kZXggPSBpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc3BsaWNlKGluZGV4LDEpO1xuXHRcdH1cblx0fSxcblxuXG5cdC8qKlxuXHQgKiBEbyBhbnkgdXBkYXRlcyBvbiBjaGlsZHJlbiBiZWZvcmUgbGF5b3V0ICAoaWUvIHNldCBwb3NpdGlvbiwgcm93L2NvbCBpbmZvLCBldGMpLiAgIFNob3VsZCBiZSBkZWZpbmVkXG5cdCAqIGluIGltcGxlbWVudGluZyBjbGFzc1xuXHQgKiBAcGFyYW0gYWdncmVnYXRlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfdXBkYXRlQ2hpbGRyZW4gOiBmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHQvLyBzZXQgY2hpbGRyZW5zIHBvc2l0aW9uIGluaXRpYWxseSB0byB0aGUgcG9zaXRpb24gb2YgdGhlIGFnZ3JlZ2F0ZVxuXHRcdGFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRjaGlsZC54ID0gYWdncmVnYXRlLng7XG5cdFx0XHRjaGlsZC55ID0gYWdncmVnYXRlLnk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFVuZ3JvdXAgYW4gYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICovXG5cdHVuZ3JvdXAgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0aWYgKG5vZGUuY2hpbGRyZW4pIHtcblxuXHRcdFx0dmFyIHBhcmVudEtleSA9ICcnO1xuXHRcdFx0bm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0cGFyZW50S2V5ICs9IG5vZGUuaW5kZXggKyAnLCc7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1twYXJlbnRLZXldID0gbm9kZTtcblxuXHRcdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlc1tpXS5pbmRleCA9PT0gbm9kZS5pbmRleCkge1xuXHRcdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl91cGRhdGVDaGlsZHJlbihub2RlKTtcblxuXHRcdFx0dmFyIGZpcnN0ID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKDAsaW5kZXgpO1xuXHRcdFx0dmFyIG1pZGRsZSA9IG5vZGUuY2hpbGRyZW47XG5cdFx0XHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzW3BhcmVudEtleV0gPSBub2RlLmNoaWxkcmVuO1xuXHRcdFx0dmFyIGVuZCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZShpbmRleCsxKTtcblxuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzID0gZmlyc3QuY29uY2F0KG1pZGRsZSkuY29uY2F0KGVuZCk7XG5cblx0XHRcdC8vIFJlY29tcHV0ZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdH1cblx0fSxcblx0Z2V0QWdncmVnYXRlIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0fSxcblxuXHRyZWdyb3VwIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5LGF0SW5kZXgpIHtcblx0XHR2YXIgYWdncmVnYXRlTm9kZSA9IHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0XHR2YXIgbm9kZXNUb1JlbW92ZSA9IGFnZ3JlZ2F0ZU5vZGUuY2hpbGRyZW47XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVzVG9SZW1vdmUuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR0aGF0LnJlbW92ZShub2RlKTtcblx0XHR9KTtcblx0XHR2YXIgc3RhcnQgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoMCxhdEluZGV4KTtcblx0XHR2YXIgZW5kID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKGF0SW5kZXgpO1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IHN0YXJ0LmNvbmNhdChhZ2dyZWdhdGVOb2RlKS5jb25jYXQoZW5kKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0ZGVsZXRlIHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHNbYWdncmVnYXRlS2V5XTtcblx0XHRyZXR1cm4gYWdncmVnYXRlTm9kZTtcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbiBhcnJheSBvZiBub2RlIGdyb3VwcyB0aGF0IGFyZSBleHBhbmRlZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRnZXRVbmdyb3VwZWROb2RlcyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbmZvID0gW107XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR2YXIgbm9kZXMgPSB0aGF0Ll91bmdyb3VwZWROb2RlR3JvdXBzW2tleV07XG5cdFx0XHR2YXIgbm9kZUluZGljZXMgPSBub2Rlcy5tYXAoZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRyZXR1cm4gbm9kZS5pbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0aW5mby5wdXNoKHtcblx0XHRcdFx0aW5kaWNlcyA6IG5vZGVJbmRpY2VzLFxuXHRcdFx0XHRrZXkgOiBrZXlcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBpbmZvO1xuXHR9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwaW5nTWFuYWdlcjtcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBudWxsO1xuXHR0aGlzLl9saW5rTWFwID0gbnVsbDtcblx0dGhpcy5fbm9kZU1hcCA9IG51bGw7XG5cdHRoaXMuX2xhYmVsTWFwID0gbnVsbDtcblx0dGhpcy5fZHVyYXRpb24gPSAyNTA7XG5cdHRoaXMuX2Vhc2luZyA9ICdlYXNlLWluLW91dCc7XG5cdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0dGhpcy5fZXZlbnRzU3VzcGVuZGVkID0gZmFsc2U7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGR1cmF0aW9uIG9mIHRoZSBsYXlvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9IDI1MG1zKVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBkdXJhdGlvbiBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9kdXJhdGlvbn0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRkdXJhdGlvbiA6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0aWYgKGR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLl9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZHVyYXRpb247XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gZWFzaW5nIC0gdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9ICdlYXNlLWluLW91dCcpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGVhc2luZyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9lYXNpbmd9IG90aGVyd2lzZVxuXHQgKi9cblx0ZWFzaW5nIDogZnVuY3Rpb24oZWFzaW5nKSB7XG5cdFx0aWYgKGVhc2luZykge1xuXHRcdFx0dGhpcy5fZWFzaW5nID0gZWFzaW5nO1xuXHRcdH1cdCBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9lYXNpbmc7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlcyAtIHRoZSBzZXQgb2Ygbm9kZXMgZGVmaW5lZCBpbiB0aGUgY29ycmVzcG9uZGluZyBncmFwaFxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBub2RlcyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2Rlc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlcyA6IGZ1bmN0aW9uKG5vZGVzKSB7XG5cdFx0aWYgKG5vZGVzKSB7XG5cdFx0XHR0aGlzLl9pc1VwZGF0ZSA9IG5vZGVzID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2Rlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBsaW5rIG1hcCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGlua01hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIHNldCBvZiBsaW5lcyAocGF0aCBvYmplY3RzKSB0aGF0IGNvbnRhaW4gdGhhdCBub2RlXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGxpbmtNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbGlua01hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsaW5rTWFwIDogZnVuY3Rpb24obGlua01hcCkge1xuXHRcdGlmIChsaW5rTWFwKSB7XG5cdFx0XHR0aGlzLl9saW5rTWFwID0gbGlua01hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGUgbWFwIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgY2lyY2xlIChwYXRoIG9iamVjdClcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbm9kZU1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2RlTWFwfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVNYXAgOiBmdW5jdGlvbihub2RlTWFwKSB7XG5cdFx0aWYgKG5vZGVNYXApIHtcblx0XHRcdHRoaXMuX25vZGVNYXAgPSBub2RlTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZU1hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbGFiZWwgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxhYmVsTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgdGV4dCBvYmplY3QgKHBhdGggb2JqZWN0KVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBsYWJlbE1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9sYWJlbE1hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsYWJlbE1hcCA6IGZ1bmN0aW9uKGxhYmVsTWFwKSB7XG5cdFx0aWYgKGxhYmVsTWFwKSB7XG5cdFx0XHR0aGlzLl9sYWJlbE1hcCA9IGxhYmVsTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGFiZWxNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgYm91bmRpbmcgYm94IGZvciBhbiBhcnJheSBvZiBub2RlIGluZGljZXNcblx0ICogQHBhcmFtIG5vZGVPckluZGV4QXJyYXkgLSBhcnJheSBvZiBub2RlIGluZGljaWVzIG9yIG5vZGUgYXJyYXkgaXRzZWxmXG5cdCAqIEBwYXJhbSBwYWRkaW5nIC0gcGFkZGluZyBpbiBwaXhlbHMgYXBwbGllZCB0byBib3VuZGluZyBib3hcblx0ICogQHJldHVybnMge3ttaW46IHt4OiBOdW1iZXIsIHk6IE51bWJlcn0sIG1heDoge3g6IG51bWJlciwgeTogbnVtYmVyfX19XG5cdCAqL1xuXHRnZXRCb3VuZGluZ0JveCA6IGZ1bmN0aW9uKG5vZGVPckluZGV4QXJyYXkscGFkZGluZykge1xuXHRcdHZhciBtaW4gPSB7XG5cdFx0XHR4IDogTnVtYmVyLk1BWF9WQUxVRSxcblx0XHRcdHkgOiBOdW1iZXIuTUFYX1ZBTFVFXG5cdFx0fTtcblx0XHR2YXIgbWF4ID0ge1xuXHRcdFx0eCA6IC1OdW1iZXIuTUFYX1ZBTFVFLFxuXHRcdFx0eSA6IC1OdW1iZXIuTUFYX1ZBTFVFXG5cdFx0fTtcblxuXHRcdHZhciBiYlBhZGRpbmcgPSBwYWRkaW5nIHx8IDA7XG5cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0bm9kZU9ySW5kZXhBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVPckluZGV4KSB7XG5cdFx0XHR2YXIgaWR4ID0gbm9kZU9ySW5kZXggaW5zdGFuY2VvZiBPYmplY3QgPyBub2RlT3JJbmRleC5pbmRleCA6IG5vZGVPckluZGV4O1xuXHRcdFx0dmFyIGNpcmNsZSA9IHRoYXQuX25vZGVNYXBbaWR4XTtcblx0XHRcdG1pbi54ID0gTWF0aC5taW4obWluLngsIChjaXJjbGUuZmluYWxYIHx8IGNpcmNsZS54KSAtIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0XHRtaW4ueSA9IE1hdGgubWluKG1pbi55LCAoY2lyY2xlLmZpbmFsWSB8fCBjaXJjbGUueSkgLSAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdFx0bWF4LnggPSBNYXRoLm1heChtYXgueCwgKGNpcmNsZS5maW5hbFggfHwgY2lyY2xlLngpICsgKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHRcdG1heC55ID0gTWF0aC5tYXgobWF4LnksIChjaXJjbGUuZmluYWxZIHx8IGNpcmNsZS55KSArIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHggOiBtaW4ueCxcblx0XHRcdHkgOiBtaW4ueSxcblx0XHRcdHdpZHRoIDogKG1heC54IC0gbWluLngpLFxuXHRcdFx0aGVpZ2h0IDogKG1heC55IC0gbWluLnkpXG5cdFx0fTtcblx0fSxcblxuXHRfYXBwbHlab29tU2NhbGUgOiBmdW5jdGlvbihiQXBwbHkpIHtcblx0XHR0aGlzLl9hcHBseVpvb20gPSBiQXBwbHk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIGEgbm9kZSBhbmQgYWxsIGF0dGFjaGVkIGxpbmtzIGFuZCBsYWJlbHMgd2l0aG91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIG5vZGUgLSB0aGUgbm9kZSBvYmplY3QgYmVpbmcgcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBmb3IgdGhlIG5vZGVcblx0ICogQHBhcmFtIHkgLSB0aGUgbmV3IHkgcG9zaXRpb24gZm9yIHRoZSBub2RlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlIDogZnVuY3Rpb24obm9kZSx4LHksY2FsbGJhY2spIHtcblx0XHR0aGlzLl9zZXROb2RlUG9zaXRpb24obm9kZSx4LHksdHJ1ZSk7XG5cdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgcG9zaXRpb24gb2YgYSBub2RlIGJ5IGFuaW1hdGluZyBmcm9tIGl0J3Mgb2xkIHBvc2l0aW9uIHRvIGl0J3MgbmV3IG9uZVxuXHQgKiBAcGFyYW0gbm9kZSAtIHRoZSBub2RlIGJlaW5nIHJlcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0geSAtIHRoZSBuZXcgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gYkltbWVkaWF0ZSAtIGlmIHRydWUsIHNldHMgd2l0aG91dCBhbmltYXRpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uIDogZnVuY3Rpb24obm9kZSxuZXdYLG5ld1ksYkltbWVkaWF0ZSxjYWxsYmFjaykge1xuXHRcdHZhciB4ID0gbmV3WCAqICh0aGlzLl9hcHBseVpvb20gPyB0aGlzLl96b29tU2NhbGUgOiAxKTtcblx0XHR2YXIgeSA9IG5ld1kgKiAodGhpcy5fYXBwbHlab29tID8gdGhpcy5fem9vbVNjYWxlIDogMSk7XG5cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbm9kZSByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIGNpcmNsZSA9IHRoaXMuX25vZGVNYXBbbm9kZS5pbmRleF07XG5cdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRjaXJjbGUudHdlZW5BdHRyKHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fSwge1xuXHRcdFx0XHRkdXJhdGlvbjogdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nLFxuXHRcdFx0XHRjYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxYO1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxZO1xuXHRcdFx0XHRcdG5vZGUueCA9IHg7XG5cdFx0XHRcdFx0bm9kZS55ID0geTtcblx0XHRcdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdGNpcmNsZS5maW5hbFggPSB4O1xuXHRcdFx0Y2lyY2xlLmZpbmFsWSA9IHk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNpcmNsZS54ID0geDtcblx0XHRcdGNpcmNsZS55ID0geTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2xpbmtNYXBbbm9kZS5pbmRleF0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRub2RlLnggPSB4O1xuXHRcdFx0bm9kZS55ID0geTtcblx0XHRcdGNpcmNsZS54ID0geDtcblx0XHRcdGNpcmNsZS55ID0geTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgdGhlIGxhYmVsIHJlbmRlciBvYmplY3Rcblx0XHR2YXIgbGFiZWwgPSB0aGlzLl9sYWJlbE1hcFtub2RlLmluZGV4XTtcblx0XHRpZiAobGFiZWwpIHtcblx0XHRcdHZhciBsYWJlbFBvcyA9IHRoaXMubGF5b3V0TGFiZWwoY2lyY2xlKTtcblx0XHRcdGlmIChiSW1tZWRpYXRlIT09dHJ1ZSkge1xuXHRcdFx0XHRsYWJlbC50d2VlbkF0dHIobGFiZWxQb3MsIHtcblx0XHRcdFx0XHRkdXJhdGlvbjogdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdFx0ZWFzaW5nOiB0aGlzLl9lYXNpbmdcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKHZhciBwcm9wIGluIGxhYmVsUG9zKSB7XG5cdFx0XHRcdFx0aWYgKGxhYmVsUG9zLmhhc093blByb3BlcnR5KHByb3ApKSB7XG5cdFx0XHRcdFx0XHRsYWJlbFtwcm9wXSA9IGxhYmVsUG9zW3Byb3BdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBsaW5rIHJlbmRlciBvYmplY3Rcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbGlua01hcFtub2RlLmluZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcblx0XHRcdHZhciBsaW5rT2JqS2V5ID0gbnVsbDtcblx0XHRcdGlmIChsaW5rLnNvdXJjZS5pbmRleCA9PT0gbm9kZS5pbmRleCkge1xuXHRcdFx0XHRsaW5rT2JqS2V5ID0gJ3NvdXJjZSc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsaW5rT2JqS2V5ID0gJ3RhcmdldCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdFx0bGluay50d2Vlbk9iaihsaW5rT2JqS2V5LCB7XG5cdFx0XHRcdFx0eDogeCxcblx0XHRcdFx0XHR5OiB5XG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRkdXJhdGlvbjogdGhhdC5fZHVyYXRpb24sXG5cdFx0XHRcdFx0ZWFzaW5nOiB0aGF0Ll9lYXNpbmdcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsaW5rW2xpbmtPYmpLZXldLnggPSB4O1xuXHRcdFx0XHRsaW5rW2xpbmtPYmpLZXldLnkgPSB5O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEZWZhdWx0IGxheW91dCByb3V0aW5lLiAgIFNob3VsZCBiZSBvdmVycmlkZW4gYnkgc3ViY2xhc3Nlcy5cblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24odyxoLGNhbGxiYWNrKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGZ1bmN0aW9uIG9uQ29tcGxldGUoKSB7XG5cdFx0XHR0aGF0Ll9ldmVudHNTdXNwZW5kZWQgPSBmYWxzZTtcblx0XHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IHRydWU7XG5cdFx0dmFyIGlzQXN5bmMgPSAhdGhpcy5fcGVyZm9ybUxheW91dCh3LGgpO1xuXHRcdGlmIChpc0FzeW5jKSB7XG5cdFx0XHRzZXRUaW1lb3V0KG9uQ29tcGxldGUsdGhpcy5kdXJhdGlvbigpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0b25Db21wbGV0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cdC8qKlxuXHQgKiBcdC8qKlxuXHQgKiBIb29rIGZvciBkb2luZyBhbnkgZHJhd2luZyBiZWZvcmUgcmVuZGVyaW5nIG9mIHRoZSBncmFwaCB0aGF0IGlzIGxheW91dCBzcGVjaWZpY1xuXHQgKiBpZS8gQmFja2dyb3VuZHMsIGV0Y1xuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gLSBhIGxpc3Qgb2YgcGF0aC5qcyByZW5kZXIgb2JqZWN0cyB0byBiZSBhZGRlZCB0byB0aGUgc2NlbmVcblx0ICovXG5cdHByZXJlbmRlciA6IGZ1bmN0aW9uKHcsaCkge1xuXHRcdHJldHVybiBbXTtcblx0fSxcblxuXHQvKipcblx0ICogSG9vayBmb3IgZG9pbmcgYW55IGRyYXdpbmcgYWZ0ZXIgcmVuZGVyaW5nIG9mIHRoZSBncmFwaCB0aGF0IGlzIGxheW91dCBzcGVjaWZpY1xuXHQgKiBpZS8gT3ZlcmxheXMsIGV0Y1xuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gLSBhIGxpc3Qgb2YgcGF0aC5qcyByZW5kZXIgb2JqZWN0cyB0byBiZSBhZGRlZCB0byB0aGUgc2NlbmVcblx0ICovXG5cdHBvc3RyZW5kZXIgOiBmdW5jdGlvbih3LGgpIHtcblx0XHRyZXR1cm4gW107XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxhYmVsIHBvc2l0aW9uIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVYIC0gdGhlIHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVZIC0gdGhlIHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHJhZGl1cyAtIHRoZSByYWRpdXMgb2YgdGhlIG5vZGVcblx0ICogQHJldHVybnMge3t4OiB4IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgeTogeSBwb3NpdGlvbiBvZiB0aGUgbGFiZWx9fVxuXHQgKi9cblx0bGF5b3V0TGFiZWwgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHg6IG5vZGUueCArIG5vZGUucmFkaXVzICsgNSxcblx0XHRcdHk6IG5vZGUueSArIG5vZGUucmFkaXVzICsgNVxuXHRcdH07XG5cdH1cbn0pO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7XG4iLCJ2YXIgTElOS19UWVBFID0ge1xuXHRERUZBVUxUIDogJ2xpbmUnLFxuXHRMSU5FIDogJ2xpbmUnLFxuXHRBUlJPVyA6ICdhcnJvdycsXG5cdEFSQyA6ICdhcmMnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBMSU5LX1RZUEU7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMSU5LX1RZUEUgPSByZXF1aXJlKCcuL2xpbmtUeXBlJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcblxudmFyIFJFR1JPVU5EX0JCX1BBRERJTkcgPSAwO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBHcmFwaCByZW5kZXIgb2JqZWN0XG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEdyYXBoID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9ub2RlcyA9IFtdO1xuXHR0aGlzLl9saW5rcyA9IFtdO1xuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl9sYXlvdXRlciA9IG51bGw7XG5cdHRoaXMuX2dyb3VwaW5nTWFuYWdlciA9IG51bGw7XG5cdHRoaXMuX3dpZHRoID0gMDtcblx0dGhpcy5faGVpZ2h0ID0gMDtcblx0dGhpcy5fem9vbVNjYWxlID0gMS4wO1xuXHR0aGlzLl96b29tTGV2ZWwgPSAwO1xuXHR0aGlzLl9zY2VuZSA9IG51bGw7XG5cdHRoaXMuX3Nob3dBbGxMYWJlbHMgPSBmYWxzZTtcblx0dGhpcy5fcHJlcmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wYW5uYWJsZSA9IG51bGw7XG5cdHRoaXMuX3pvb21hYmxlID0gbnVsbDtcblx0dGhpcy5fZHJhZ2dhYmxlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE1vdmVTdGF0ZSA9IG51bGw7XG5cdHRoaXMuX2ludmVydGVkUGFuID0gMTtcblxuXHR0aGlzLl9mb250U2l6ZSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRGYW1pbHkgPSBudWxsO1xuXHR0aGlzLl9mb250Q29sb3IgPSBudWxsO1xuXHR0aGlzLl9mb250U3Ryb2tlID0gbnVsbDtcblx0dGhpcy5fZm9udFN0cm9rZVdpZHRoID0gbnVsbDtcblx0dGhpcy5fc2hhZG93Q29sb3IgPSBudWxsO1xuXHR0aGlzLl9zaGFkb3dPZmZzZXRYID0gbnVsbDtcblx0dGhpcy5fc2hhZG93T2Zmc2V0WSA9IG51bGw7XG5cdHRoaXMuX3NoYWRvd0JsdXIgPSBudWxsO1xuXG5cdC8vIERhdGEgdG8gcmVuZGVyIG9iamVjdCBtYXBzXG5cdHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUgPSB7fTtcblx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGUgPSB7fTtcblx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbCA9IHt9O1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5HcmFwaC5wcm90b3R5cGUgPSBfLmV4dGVuZChHcmFwaC5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZXMgLSBhbiBhcnJheSBvZiBub2Rlc1xuXHQgKiB7XG5cdCAqIFx0XHR4IDogdGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZVx0KHJlcXVpcmVkKVxuXHQgKiBcdFx0eSA6IHRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGVcdChyZXF1aXJlZClcblx0ICpcdFx0aW5kZXggOiAgYSB1bmlxdWUgaW5kZXhcdFx0XHRcdChyZXF1aXJlZClcblx0ICpcdFx0bGFiZWwgOiBhIGxhYmVsIGZvciB0aGUgbm9kZVx0XHQob3B0aW9uYWwpXG5cdCAqXHRcdGZpbGxTdHlsZSA6IGEgY2FudmFzIGZpbGwgICBcdFx0KG9wdGlvbmFsLCBkZWZhdWx0ICMwMDAwMDApXG5cdCAqXHRcdHN0cm9rZVN0eWxlIDogYSBjYW52YXMgc3Ryb2tlXHRcdChvcHRpb25hbCwgZGVmYXVsdCB1bmRlZmluZWQpXG5cdCAqXHRcdGxpbmVXaWR0aCA6IHdpZHRoIG9mIHRoZSBzdHJva2VcdFx0KG9wdGlvbmFsLCBkZWZhdWx0IDEpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgbm9kZXMgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHtHcmFwaC5fbm9kZXN9IG90aGVyd2lzZVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2RlcztcblxuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSA9IHt9O1xuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGUgPSB7fTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGFiZWwgPSB7fTtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdG5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW25vZGUuaW5kZXhdID0gW107fSk7XG5cdFx0XHRpZiAodGhpcy5fbGF5b3V0ZXIpIHtcblx0XHRcdFx0dGhpcy5fbGF5b3V0ZXIubm9kZXMobm9kZXMpO1xuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0dXBkYXRlTm9kZSA6IGZ1bmN0aW9uKG5vZGVJbmRleCxwcm9wcykge1xuXHRcdC8vIFRPRE86ICByZW1vdmUgbXVja2luZyB3aXRoIHBvc2l0aW9uIHNldHRpbmdzIGZyb20gcHJvcHM/XG5cdFx0aWYgKG5vZGVJbmRleCkge1xuXHRcdFx0dmFyIGNpcmNsZSA9IHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlW25vZGVJbmRleF07XG5cdFx0XHRjaXJjbGUgPSBfLmV4dGVuZChjaXJjbGUscHJvcHMpO1xuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGVbbm9kZUluZGV4XSA9IGNpcmNsZTtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdHVwZGF0ZUxpbmsgOiBmdW5jdGlvbihzb3VyY2VOb2RlSW5kZXgsdGFyZ2V0Tm9kZUluZGV4LHByb3BzKSB7XG5cdFx0Ly8gVE9ETzogIHJlbW92ZSBtdWNraW5nIHdpdGggcG9zaXRpb24gc2V0dGluZ3MgZnJvbSBwcm9wcz9cblx0XHR2YXIgdG9VcGRhdGUgPSBbXTtcblx0XHRpZiAoc291cmNlTm9kZUluZGV4KSB7XG5cdFx0XHR2YXIgbGluZXMgPSB0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lW3NvdXJjZU5vZGVJbmRleF07XG5cdFx0XHR0b1VwZGF0ZSA9IGxpbmVzO1xuXHRcdFx0aWYgKGxpbmVzICYmIHRhcmdldE5vZGVJbmRleCkge1xuXHRcdFx0XHR0b1VwZGF0ZSA9IGxpbmVzLmZpbHRlcihmdW5jdGlvbiAobGluZSkge1xuXHRcdFx0XHRcdHJldHVybiBsaW5lLnRhcmdldC5pbmRleCA9PT0gdGFyZ2V0Tm9kZUluZGV4O1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKHRhcmdldE5vZGVJbmRleCkge1xuXHRcdFx0dmFyIGxpbmVzID0gdGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZVt0YXJnZXROb2RlSW5kZXhdO1xuXHRcdFx0dG9VcGRhdGUgPSBsaW5lcztcblx0XHRcdGlmIChsaW5lcyAmJiBzb3VyY2VOb2RlSW5kZXgpIHtcblx0XHRcdFx0dG9VcGRhdGUgPSBsaW5lcy5maWx0ZXIoZnVuY3Rpb24gKGxpbmUpIHtcblx0XHRcdFx0XHRyZXR1cm4gbGluZS5zb3VyY2UuaW5kZXggPT09IHNvdXJjZU5vZGVJbmRleDtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhciB1cGRhdGVkID0gW107XG5cdFx0dG9VcGRhdGUuZm9yRWFjaChmdW5jdGlvbiAobGluZSkge1xuXHRcdFx0dXBkYXRlZC5wdXNoKF8uZXh0ZW5kKGxpbmUsIHByb3BzKSk7XG5cdFx0fSk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0fSxcblxuXHR1cGRhdGVMYWJlbCA6IGZ1bmN0aW9uKG5vZGVJbmRleCxwcm9wcykge1xuXHRcdC8vIFRPRE86ICByZW1vdmUgbXVja2luZyB3aXRoIHBvc2l0aW9uIHNldHRpbmdzIGZyb20gcHJvcHM/XG5cdFx0aWYgKG5vZGVJbmRleCkge1xuXHRcdFx0dmFyIHRleHQgPSB0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGVJbmRleF07XG5cdFx0XHR0ZXh0ID0gXy5leHRlbmQoY2lyY2xlLHByb3BzKTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGFiZWxbaW5kZXhdID0gY2lyY2xlO1xuXHRcdH1cblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxpbmtzIC0gYW4gYXJyYXkgb2YgbGlua3Ncblx0ICoge1xuXHQgKiBcdFx0c291cmNlIDogYSBub2RlIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzb3VyY2UgXHQocmVxdWlyZWQpXG5cdCAqIFx0XHR0YXJnZXQgOiBhIG5vZGUgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHRhcmdldFx0KHJlcXVpcmVkKVxuXHQgKlx0XHRzdHJva2VTdHlsZSA6IGEgY2FudmFzIHN0cm9rZVx0XHRcdFx0XHRcdChvcHRpb25hbCwgZGVmYXVsdCAjMDAwMDAwKVxuXHQgKlx0XHRsaW5lV2lkdGggOiB0aGUgd2lkdGggb2YgdGhlIHN0cm9rZVx0XHRcdFx0XHQob3B0aW5hbCwgZGVmYXVsdCAxKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGxpbmtzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB7R3JhcGguX2xpbmtzfSBvdGhlcndpc2Vcblx0ICovXG5cdGxpbmtzIDogZnVuY3Rpb24obGlua3MpIHtcblx0XHRpZiAobGlua3MpIHtcblx0XHRcdHRoaXMuX2xpbmtzID0gbGlua3M7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9saW5rcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgY2FudmFzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGNhbnZhcyAtIGFuIEhUTUwgY2FudmFzIG9iamVjdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGNhbnZhcyBwYXJhbWV0ZXIgaXMgZGVmaW5lZCwgdGhlIGNhbnZhcyBvdGhlcndpc2Vcblx0ICovXG5cdGNhbnZhcyA6IGZ1bmN0aW9uKGNhbnZhcykge1xuXHRcdGlmIChjYW52YXMpIHtcblx0XHRcdHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcblxuXHRcdFx0dmFyIHgseTtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2Vkb3duJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHggPSBlLmNsaWVudFg7XG5cdFx0XHRcdHkgPSBlLmNsaWVudFk7XG5cdFx0XHRcdCQodGhhdC5fY2FudmFzKS5vbignbW91c2Vtb3ZlJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0dmFyIGR4ID0geCAtIGUuY2xpZW50WDtcblx0XHRcdFx0XHR2YXIgZHkgPSB5IC0gZS5jbGllbnRZO1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9kcmFnZ2FibGUgJiYgdGhhdC5fY3VycmVudE92ZXJOb2RlICYmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSBudWxsIHx8IHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdkcmFnZ2luZycpKSAge1xuXHRcdFx0XHRcdFx0dGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9ICdkcmFnZ2luZyc7XG5cblx0XHRcdFx0XHRcdC8vIE1vdmUgdGhlIG5vZGVcblx0XHRcdFx0XHRcdHRoYXQuX2xheW91dGVyLl9zZXROb2RlUG9zaXRpb25JbW1lZGlhdGUodGhhdC5fY3VycmVudE92ZXJOb2RlLCB0aGF0Ll9jdXJyZW50T3Zlck5vZGUueCAtIGR4LCB0aGF0Ll9jdXJyZW50T3Zlck5vZGUueSAtIGR5KTtcblx0XHRcdFx0XHRcdHRoYXQudXBkYXRlKCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGF0Ll9wYW5uYWJsZSAmJiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gbnVsbCB8fCB0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAncGFubmluZycpKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9wYW4oLWR4KnRoYXQuX2ludmVydGVkUGFuLC1keSp0aGF0Ll9pbnZlcnRlZFBhbik7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gJ3Bhbm5pbmcnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR4ID0gZS5jbGllbnRYO1xuXHRcdFx0XHRcdHkgPSBlLmNsaWVudFk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2V1cCcsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQodGhhdC5fY2FudmFzKS5vZmYoJ21vdXNlbW92ZScpO1xuXHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ2RyYWdnaW5nJykge1xuXHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9IG51bGw7XG5cdFx0XHR9KTtcblxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9jYW52YXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgd2lkdGhcblx0ICogQHJldHVybnMgV2lkdGggaW4gcGl4ZWxzIG9mIHRoZSBncmFwaFxuXHQgKi9cblx0d2lkdGggOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2NlbmUud2lkdGg7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBoZWlnaHRcblx0ICogQHJldHVybnMgSGVpZ2h0IGluIHBpeGVscyBvZiB0aGUgZ3JhcGhcblx0ICovXG5cdGhlaWdodCA6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9zY2VuZS5oZWlnaHQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFRvZ2dsZXMgYm9vbGVhbiBmb3Igc2hvd2luZy9oaWRpbmcgYWxsIGxhYmVscyBpbiB0aGUgZ3JhcGggYnkgZGVmYXVsdFxuXHQgKiBAcGFyYW0gc2hvd0FsbExhYmVsc1xuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdHNob3dBbGxMYWJlbHMgOiBmdW5jdGlvbihzaG93QWxsTGFiZWxzKSB7XG5cdFx0aWYgKHNob3dBbGxMYWJlbHMpIHtcblx0XHRcdHRoaXMuX3Nob3dBbGxMYWJlbHMgPSBzaG93QWxsTGFiZWxzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fc2hvd0FsbExhYmVscztcblx0XHR9XG5cblx0XHQvLyBVcGRhdGVcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRpZiAoc2hvd0FsbExhYmVscykge1xuXHRcdFx0XHR0aGF0LmFkZExhYmVsKG5vZGUsbm9kZS5sYWJlbFRleHQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhhdC5yZW1vdmVMYWJlbChub2RlLG5vZGUubGFiZWxUZXh0KTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBBZGRzIGEgbGFiZWwgZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKiBAcGFyYW0gdGV4dFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRhZGRMYWJlbCA6IGZ1bmN0aW9uKG5vZGUsdGV4dCkge1xuXHRcdGlmICh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdKSB7XG5cdFx0XHR0aGlzLnJlbW92ZUxhYmVsKG5vZGUpO1xuXHRcdH1cblx0XHR2YXIgbGFiZWxBdHRycyA9IHRoaXMuX2xheW91dGVyLmxheW91dExhYmVsKG5vZGUpO1xuXG5cdFx0dmFyIGZvbnRTaXplID0gdHlwZW9mKHRoaXMuX2ZvbnRTaXplKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTaXplKG5vZGUpIDogdGhpcy5fZm9udFNpemU7XG5cdFx0aWYgKCFmb250U2l6ZSkge1xuXHRcdFx0Zm9udFNpemUgPSAxMDtcblx0XHR9XG5cblx0XHR2YXIgZm9udEZhbWlseSA9IHR5cGVvZih0aGlzLl9mb250RmFtaWx5KSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRGYW1pbHkobm9kZSkgOiB0aGlzLl9mb250RmFtaWx5O1xuXHRcdGlmICghZm9udEZhbWlseSkge1xuXHRcdFx0Zm9udEZhbWlseSA9ICdzYW5zLXNlcmlmJztcblx0XHR9XG5cdFx0dmFyIGZvbnRTdHIgPSBmb250U2l6ZSArICdweCAnICsgZm9udEZhbWlseTtcblxuXHRcdHZhciBmb250RmlsbCA9IHR5cGVvZih0aGlzLl9mb250Q29sb3IpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udENvbG9yKG5vZGUpIDogdGhpcy5fZm9udENvbG9yO1xuXHRcdGlmICghZm9udEZpbGwpIHtcblx0XHRcdGZvbnRGaWxsID0gJyMwMDAwMDAnO1xuXHRcdH1cblx0XHR2YXIgZm9udFN0cm9rZSA9IHR5cGVvZih0aGlzLl9mb250U3Ryb2tlKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTdHJva2Uobm9kZSkgOiB0aGlzLl9mb250U3Ryb2tlO1xuXHRcdHZhciBmb250U3Ryb2tlV2lkdGggPSB0eXBlb2YodGhpcy5fZm9udFN0cm9rZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U3Ryb2tlV2lkdGggOiB0aGlzLl9mb250U3Ryb2tlV2lkdGg7XG5cblx0XHR2YXIgbGFiZWxTcGVjID0ge1xuXHRcdFx0Zm9udDogZm9udFN0cixcblx0XHRcdGZpbGxTdHlsZTogZm9udEZpbGwsXG5cdFx0XHRzdHJva2VTdHlsZTogZm9udFN0cm9rZSxcblx0XHRcdGxpbmVXaWR0aDogZm9udFN0cm9rZVdpZHRoLFxuXHRcdFx0dGV4dCA6IHRleHRcblx0XHR9O1xuXG5cdFx0dmFyIGJBZGRTaGFkb3cgPSB0aGlzLl9zaGFkb3dCbHVyIHx8IHRoaXMuX3NoYWRvd09mZnNldFggfHwgdGhpcy5fc2hhZG93T2Zmc2V0WSB8fCB0aGlzLl9zaGFkb3dDb2xvcjtcblx0XHRpZiAoYkFkZFNoYWRvdykge1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dDb2xvciddID0gdGhpcy5fc2hhZG93Q29sb3IgfHwgJyMwMDAnO1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dPZmZzZXRYJ10gPSB0aGlzLl9zaGFkb3dPZmZzZXRYIHx8IDA7XG5cdFx0XHRsYWJlbFNwZWNbJ3NoYWRvd09mZnNldFknXSA9IHRoaXMuX3NoYWRvd09mZnNldFkgfHwgMDtcblx0XHRcdGxhYmVsU3BlY1snc2hhZG93Qmx1ciddID0gdGhpcy5fc2hhZG93Qmx1ciB8fCBNYXRoLmZsb29yKGZvbnRTaXplLzMpO1xuXHRcdH1cblxuXHRcdGZvciAodmFyIGtleSBpbiBsYWJlbEF0dHJzKSB7XG5cdFx0XHRpZiAobGFiZWxBdHRycy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdGxhYmVsU3BlY1trZXldID0gbGFiZWxBdHRyc1trZXldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgbGFiZWwgPSBwYXRoLnRleHQobGFiZWxTcGVjKTtcblx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdID0gbGFiZWw7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQobGFiZWwpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgYSBsYWJlbCBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHJlbW92ZUxhYmVsIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdHZhciB0ZXh0T2JqZWN0ID0gdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHRpZiAodGV4dE9iamVjdCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGV4dE9iamVjdCk7XG5cdFx0XHRkZWxldGUgdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIG1vdXNlb3ZlciBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycgaW4gdGhlIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVPdmVyIDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdmVyID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRXZlbnQgaGFuZGxlciBmb3IgbW91c2VvdXQgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlT3V0IDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdXQgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDb252ZW5pZW5jZSBmdW5jdGlvbiBmb3Igc2V0dGluZyBub2RlT3Zlci9ub2RlT3V0IGluIGEgc2luZ2xlIGNhbGxcblx0ICogQHBhcmFtIG92ZXIgLSB0aGUgbm9kZU92ZXIgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gb3V0IC0gdGhlIG5vZGVPdXQgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlSG92ZXIgOiBmdW5jdGlvbihvdmVyLG91dCxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5ub2RlT3ZlcihvdmVyLHNlbGYpO1xuXHRcdHRoaXMubm9kZU91dChvdXQsc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIGNsaWNrIG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJy4gICBEZWZhdWx0cyB0byB0aGUgZ3JhcGggb2JqZWN0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVDbGljayA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlQ2xpY2sgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQYW4ge0dyYXBofSBieSAoZHgsZHkpLiAgIEF1dG9tYXRpY2FsbHkgcmVyZW5kZXIgdGhlIGdyYXBoLlxuXHQgKiBAcGFyYW0gZHggLSBBbW91bnQgb2YgcGFuIGluIHggZGlyZWN0aW9uXG5cdCAqIEBwYXJhbSBkeSAtIEFtb3VudCBvZiBwYW4gaW4geSBkaXJlY3Rpb25cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9wYW4gOiBmdW5jdGlvbihkeCxkeSkge1xuXHRcdHRoaXMuX3NjZW5lLnggKz0gZHg7XG5cdFx0dGhpcy5fc2NlbmUueSArPSBkeTtcblx0XHR0aGlzLl9wYW5YICs9IGR4O1xuXHRcdHRoaXMuX3BhblkgKz0gZHk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogTWFrZSB7R3JhcGh9IHBhbm5hYmxlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHBhbm5hYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fcGFubmFibGUgPSB0cnVlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlcyB0aGUgZ3JhcGggcGFuIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24gb2YgdGhlIG1vdXNlIGFzIG9wcG9zZWQgdG8gd2l0aCBpdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRpbnZlcnRQYW4gOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9pbnZlcnRlZFBhbiA9IC0xO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlIG5vZGVzIGluIHtHcmFwaH0gcmVwb2lzaXRpb25hYmxlIGJ5IGNsaWNrLWRyYWdnaW5nXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGRyYWdnYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2RyYWdnYWJsZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2dldFpvb21Gb3JMZXZlbCA6IGZ1bmN0aW9uKGxldmVsKSB7XG5cdFx0dmFyIGZhY3RvciA9IE1hdGgucG93KDEuNSAsIE1hdGguYWJzKGxldmVsIC0gdGhpcy5fem9vbUxldmVsKSk7XG5cdFx0aWYgKGxldmVsIDwgdGhpcy5fem9vbUxldmVsKSB7XG5cdFx0XHRmYWN0b3IgPSAxL2ZhY3Rvcjtcblx0XHR9XG5cdFx0cmV0dXJuIGZhY3Rvcjtcblx0fSxcblxuXHRfem9vbSA6IGZ1bmN0aW9uKGZhY3Rvcix4LHkpIHtcblx0XHR0aGlzLl96b29tU2NhbGUgKj0gZmFjdG9yO1xuXHRcdHRoaXMuX2xheW91dGVyLl96b29tU2NhbGUgPSB0aGlzLl96b29tU2NhbGU7XG5cblx0XHQvLyBQYW4gc2NlbmUgYmFjayB0byBvcmlnaW5cblx0XHR2YXIgb3JpZ2luYWxYID0gdGhpcy5fc2NlbmUueDtcblx0XHR2YXIgb3JpZ2luYWxZID0gdGhpcy5fc2NlbmUueTtcblx0XHR0aGlzLl9wYW4oLXRoaXMuX3NjZW5lLngsLXRoaXMuX3NjZW5lLnkpO1xuXG5cdFx0dmFyIG1vdXNlWCA9IHggfHwgMDtcblx0XHR2YXIgbW91c2VZID0geSB8fCAwO1xuXG5cdFx0Ly8gJ1pvb20nIG5vZGVzLiAgIFdlIGRvIHRoaXMgc28gdGV4dC9yYWRpdXMgc2l6ZSByZW1haW5zIGNvbnNpc3RlbnQgYWNyb3NzIHpvb20gbGV2ZWxzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9ub2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbih0aGlzLl9ub2Rlc1tpXSx0aGlzLl9ub2Rlc1tpXS54KmZhY3RvciwgdGhpcy5fbm9kZXNbaV0ueSpmYWN0b3IsdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gWm9vbSB0aGUgcmVuZGVyIGdyb3Vwc1xuXHRcdGlmICh0aGlzLl9wcmVyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVZID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fcG9zdHJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbVNjYWxlO1xuXHRcdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHR9XG5cblx0XHQvLyBSZXZlcnNlIHRoZSAnb3JpZ2luIHBhbicgd2l0aCB0aGUgc2NhbGUgYXBwbGllZCBhbmQgcmVjZW50ZXIgdGhlIG1vdXNlIHdpdGggc2NhbGUgYXBwbGllZCBhcyB3ZWxsXG5cdFx0dmFyIG5ld01vdXNlWCA9IG1vdXNlWCpmYWN0b3I7XG5cdFx0dmFyIG5ld01vdXNlWSA9IG1vdXNlWSpmYWN0b3I7XG5cdFx0dGhpcy5fcGFuKG9yaWdpbmFsWCpmYWN0b3IgLSAobmV3TW91c2VYLW1vdXNlWCksb3JpZ2luYWxZKmZhY3RvciAtIChuZXdNb3VzZVktbW91c2VZKSk7XG5cblx0XHQvLyBVcGRhdGUgdGhlIHJlZ3JvdXAgdW5kZXJsYXlzXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCAmJiB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbiAmJiB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdHRoaXMuX2hhbmRsZUdyb3VwLnJlbW92ZUFsbCgpO1xuXHRcdFx0dGhhdC5fc2NlbmUudXBkYXRlKCk7XG5cdFx0XHR0aGF0Ll9hZGRSZWdyb3VwSGFuZGxlcygpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogTWFrZSB7R3JhcGh9IHpvb21hYmxlIGJ5IHVzaW5nIHRoZSBtb3VzZXdoZWVsXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHpvb21hYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLl96b29tYWJsZSkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZXdoZWVsJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciB3aGVlbCA9IGUub3JpZ2luYWxFdmVudC53aGVlbERlbHRhLzEyMDsvL24gb3IgLW5cblx0XHRcdFx0dmFyIGZhY3Rvcjtcblx0XHRcdFx0aWYgKHdoZWVsIDwgMCkge1xuXHRcdFx0XHRcdGZhY3RvciA9IHRoYXQuX2dldFpvb21Gb3JMZXZlbCh0aGF0Ll96b29tTGV2ZWwtMSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZmFjdG9yID0gdGhhdC5fZ2V0Wm9vbUZvckxldmVsKHRoYXQuX3pvb21MZXZlbCsxKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0Ll96b29tKGZhY3RvciwgZS5vZmZzZXRYLCBlLm9mZnNldFkpO1xuXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3pvb21hYmxlID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxheW91dCBmdW5jdGlvbiBmb3IgdGhlIG5vZGVzXG5cdCAqIEBwYXJhbSBsYXlvdXRlciAtIEFuIGluc3RhbmNlIChvciBzdWJjbGFzcykgb2YgTGF5b3V0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaXMgbGF5b3V0ZXIgcGFyYW0gaXMgZGVmaW5lZCwgdGhlIGxheW91dGVyIG90aGVyd2lzZVxuXHQgKi9cblx0bGF5b3V0ZXIgOiBmdW5jdGlvbihsYXlvdXRlcikge1xuXHRcdGlmIChsYXlvdXRlcikge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIgPSBsYXlvdXRlcjtcblx0XHRcdHRoaXMuX2xheW91dGVyXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xheW91dGVyO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgYSBsYXlvdXQgb2YgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR0aGlzLl9sYXlvdXRlci5sYXlvdXQodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG5cblx0XHRcdC8vIFVwZGF0ZSB0aGUgcmVncm91cCB1bmRlcmxheXNcblx0XHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCAmJiB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbikge1xuXHRcdFx0XHR2YXIgdW5kZXJsYXlzID0gdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW47XG5cdFx0XHRcdHZhciB1cGRhdGVkID0gMDtcblx0XHRcdFx0dW5kZXJsYXlzLmZvckVhY2goZnVuY3Rpb24odW5kZXJsYXkpIHtcblx0XHRcdFx0XHR2YXIgaW5kaWNlcyA9IHVuZGVybGF5LmdyYXBoanNfaW5kaWNlcztcblx0XHRcdFx0XHR2YXIgYmIgPSB0aGF0Ll9sYXlvdXRlci5nZXRCb3VuZGluZ0JveChpbmRpY2VzLFJFR1JPVU5EX0JCX1BBRERJTkcpO1xuXHRcdFx0XHRcdHVuZGVybGF5LnR3ZWVuQXR0cih7XG5cdFx0XHRcdFx0XHR4OiBiYi54LFxuXHRcdFx0XHRcdFx0eTogYmIueSxcblx0XHRcdFx0XHRcdHdpZHRoIDogYmIud2lkdGgsXG5cdFx0XHRcdFx0XHRoZWlnaHQgOiBiYi5oZWlnaHRcblx0XHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0XHRkdXJhdGlvbjogdGhhdC5fbGF5b3V0ZXIuZHVyYXRpb24oKSxcblx0XHRcdFx0XHRcdGVhc2luZzogdGhhdC5fbGF5b3V0ZXIuZWFzaW5nKClcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cdGdyb3VwaW5nTWFuYWdlciA6IGZ1bmN0aW9uKGdyb3VwaW5nTWFuYWdlcikge1xuXHRcdGlmIChncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHRoaXMuX2dyb3VwaW5nTWFuYWdlciA9IGdyb3VwaW5nTWFuYWdlcjtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZ3JvdXBpbmdNYW5hZ2VyO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRpbml0aWFsaXplR3JvdXBpbmcgOiBmdW5jdGlvbigpIHtcblx0XHRpZiAodGhpcy5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR0aGlzLl9ncm91cGluZ01hbmFnZXIubm9kZXModGhpcy5fbm9kZXMpXG5cdFx0XHRcdC5saW5rcyh0aGlzLl9saW5rcylcblx0XHRcdFx0LmluaXRpYWxpemVIZWlyYXJjaHkoKTtcblxuXHRcdFx0dGhpcy5ub2Rlcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpO1xuXHRcdFx0dGhpcy5saW5rcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHR1bmdyb3VwIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdGlmICghbm9kZSB8fCAhbm9kZS5jaGlsZHJlbikge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR0aGlzLl9ncm91cGluZ01hbmFnZXIudW5ncm91cChub2RlKTtcblx0XHRcdHRoaXMuY2xlYXIoKVxuXHRcdFx0XHQubm9kZXModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWROb2RlcygpKVxuXHRcdFx0XHQubGlua3ModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWRMaW5rcygpKVxuXHRcdFx0XHQuZHJhdygpO1xuXG5cdFx0XHR0aGlzLl9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUodHJ1ZSk7XG5cdFx0XHR0aGlzLmxheW91dCgpO1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKGZhbHNlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0cmVncm91cCA6IGZ1bmN0aW9uKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSkge1xuXHRcdC8vIEFuaW1hdGUgdGhlIHJlZ3JvdXBcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dmFyIHBhcmVudEFnZ3JlZ2F0ZSA9IHRoaXMuX2dyb3VwaW5nTWFuYWdlci5nZXRBZ2dyZWdhdGUodW5ncm91cGVkQWdncmVnYXRlS2V5KTtcblxuXHRcdHZhciBhdmdQb3MgPSB7IHg6IDAsIHkgOiAwfTtcblx0XHR2YXIgbWF4UmFkaXVzID0gMDtcblx0XHRwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0YXZnUG9zLnggKz0gY2hpbGQueDtcblx0XHRcdGF2Z1Bvcy55ICs9IGNoaWxkLnk7XG5cdFx0fSk7XG5cdFx0YXZnUG9zLnggLz0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmxlbmd0aDtcblx0XHRhdmdQb3MueSAvPSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubGVuZ3RoO1xuXG5cdFx0dmFyIGluZGV4T2ZDaGlsZHJlbiA9IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5tYXAoZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5fYWdncmVnYXRlZE5vZGVzW2ldLmluZGV4ID09PSBjaGlsZC5pbmRleCkge1xuXHRcdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dmFyIG1pbkNoaWxkSW5kZXggPSBOdW1iZXIuTUFYX1ZBTFVFO1xuXHRcdGluZGV4T2ZDaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGlkeCkge1xuXHRcdFx0bWluQ2hpbGRJbmRleCA9IE1hdGgubWluKG1pbkNoaWxkSW5kZXgsaWR4KTtcblx0XHR9KTtcblxuXHRcdHZhciBhbmltYXRlZFJlZ3JvdXBlZCA9IDA7XG5cdFx0dGhpcy5fc3VzcGVuZEV2ZW50cygpO1x0XHRcdC8vIGxheW91dCB3aWxsIHJlc3VtZSB0aGVtXG5cdFx0cGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblxuXHRcdFx0dmFyIGxhYmVsID0gdGhhdC5fbm9kZUluZGV4VG9MYWJlbFtjaGlsZC5pbmRleF07XG5cdFx0XHRsYWJlbC50d2VlbkF0dHIoe1xuXHRcdFx0XHRvcGFjaXR5IDogMFxuXHRcdFx0fSwge1xuXHRcdFx0XHRkdXJhdGlvbiA6IHRoYXQuX2xheW91dGVyLmR1cmF0aW9uKCksXG5cdFx0XHRcdGNhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0bGFiZWwub3BhY2l0eSA9IDE7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHR0aGF0Ll9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uKGNoaWxkLGF2Z1Bvcy54LGF2Z1Bvcy55LGZhbHNlLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhbmltYXRlZFJlZ3JvdXBlZCsrO1xuXHRcdFx0XHRpZiAoYW5pbWF0ZWRSZWdyb3VwZWQgPT09IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHRcdFx0XHR2YXIgcmVncm91cGVkQWdncmVnYXRlID0gdGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLnJlZ3JvdXAodW5ncm91cGVkQWdncmVnYXRlS2V5LG1pbkNoaWxkSW5kZXgpO1xuXHRcdFx0XHRcdFx0cmVncm91cGVkQWdncmVnYXRlLnggPSBhdmdQb3MueDtcblx0XHRcdFx0XHRcdHJlZ3JvdXBlZEFnZ3JlZ2F0ZS55ID0gYXZnUG9zLnk7XG5cdFx0XHRcdFx0XHR0aGF0LmNsZWFyKClcblx0XHRcdFx0XHRcdFx0Lm5vZGVzKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSlcblx0XHRcdFx0XHRcdFx0LmxpbmtzKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSk7XG5cdFx0XHRcdFx0XHR0aGF0LmRyYXcoKTtcblx0XHRcdFx0XHRcdHRoYXQuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZSh0cnVlKTtcblx0XHRcdFx0XHRcdHRoYXQubGF5b3V0KCk7XG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUoZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IHNpemUgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udFNpemUgLSBzaXplIG9mIHRoZSBmb250IGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRTaXplIHBhcmFtIGlzIGRlaWZuZWQsIHtHcmFwaC5fZm9udFNpemV9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udFNpemUgOiBmdW5jdGlvbihmb250U2l6ZSkge1xuXHRcdGlmIChmb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fZm9udFNpemUgPSBmb250U2l6ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTaXplO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGNvbG91ciBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250Q29sb3VyIC0gQSBoZXggc3RyaW5nIGZvciB0aGUgY29sb3VyIG9mIHRoZSBsYWJlbHNcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250Q29sb3VyIHBhcmFtIGlzIGRlaWZuZWQsIHtHcmFwaC5fZm9udENvbG91cn0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250Q29sb3VyIDogZnVuY3Rpb24oZm9udENvbG91cikge1xuXHRcdGlmIChmb250Q29sb3VyKSB7XG5cdFx0XHR0aGlzLl9mb250Q29sb3IgPSBmb250Q29sb3VyO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udENvbG9yO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IHN0cm9rZSBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250U3Ryb2tlIC0gQSBoZXggc3RyaW5nIGZvciB0aGUgY29sb3Igb2YgdGhlIGxhYmVsIHN0cm9rZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRTdHJva2UgcGFyYW0gaXMgZGVmaW5lZCwge0dyYXBoLl9mb250U3Ryb2tlfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTdHJva2UgOiBmdW5jdGlvbihmb250U3Ryb2tlKSB7XG5cdFx0aWYgKGZvbnRTdHJva2UpIHtcblx0XHRcdHRoaXMuX2ZvbnRTdHJva2UgPSBmb250U3Ryb2tlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udFN0cm9rZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzdHJva2Ugd2lkdGggZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udFN0cm9rZVdpZHRoIC0gc2l6ZSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U3Ryb2tlV2lkdGggcGFyYW0gaXMgZGVmaW5lZCwge0dyYXBoLl9mb250U3Ryb2tlV2lkdGh9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udFN0cm9rZVdpZHRoIDogZnVuY3Rpb24oZm9udFN0cm9rZVdpZHRoKSB7XG5cdFx0aWYgKGZvbnRTdHJva2VXaWR0aCkge1xuXHRcdFx0dGhpcy5fZm9udFN0cm9rZVdpZHRoID0gZm9udFN0cm9rZVdpZHRoO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udFN0cm9rZVdpZHRoO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGZhbWlseSBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250RmFtaWx5IC0gQSBzdHJpbmcgZm9yIHRoZSBmb250IGZhbWlseSAoYSBsYSBIVE1MNSBDYW52YXMpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udEZhbWlseSBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRGYW1pbHl9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udEZhbWlseSA6IGZ1bmN0aW9uKGZvbnRGYW1pbHkpIHtcblx0XHRpZiAoZm9udEZhbWlseSkge1xuXHRcdFx0dGhpcy5fZm9udEZhbWlseSA9IGZvbnRGYW1pbHk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250RmFtaWx5O1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmb250U2hhZG93IDogZnVuY3Rpb24oY29sb3Isb2Zmc2V0WCxvZmZzZXRZLGJsdXIpIHtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y29sb3I6IHRoaXMuX3NoYWRvd0NvbG9yLFxuXHRcdFx0XHRvZmZzZXRYOiB0aGlzLl9zaGFkb3dPZmZzZXRYLFxuXHRcdFx0XHRvZmZzZXRZOiB0aGlzLl9zaGFkb3dPZmZzZXRZLFxuXHRcdFx0XHRibHVyOiB0aGlzLl9zaGFkb3dCbHVyXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zaGFkb3dDb2xvciA9IGNvbG9yO1xuXHRcdFx0dGhpcy5fc2hhZG93T2Zmc2V0WCA9IG9mZnNldFg7XG5cdFx0XHR0aGlzLl9zaGFkb3dPZmZzZXRZID0gb2Zmc2V0WTtcblx0XHRcdHRoaXMuX3NoYWRvd0JsdXIgPSBibHVyO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXNpemUgdGhlIGdyYXBoLiAgQXV0b21hdGljYWxseSBwZXJmb3JtcyBsYXlvdXQgYW5kIHJlcmVuZGVycyB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIHcgLSB0aGUgbmV3IHdpZHRoXG5cdCAqIEBwYXJhbSBoIC0gdGhlIG5ldyBoZWlnaHRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0cmVzaXplIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0dGhpcy5fd2lkdGggPSB3O1xuXHRcdHRoaXMuX2hlaWdodCA9IGg7XG5cdFx0JCh0aGlzLl9jYW52YXMpLmF0dHIoe3dpZHRoOncsaGVpZ2h0Omh9KVxuXHRcdFx0LndpZHRoKHcpXG5cdFx0XHQuaGVpZ2h0KGgpO1xuXHRcdHRoaXMuX3NjZW5lLnJlc2l6ZSh3LGgpO1xuXG5cdFx0aWYgKCF0aGlzLl9wYW5uYWJsZSAmJiAhdGhpcy5fem9vbWFibGUpIHtcblx0XHRcdHRoaXMubGF5b3V0KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyBhIGxpc3Qgb2YgcHJlL3Bvc3QgcmVuZGVyIG9iamVjdHMgZnJvbSB0aGUgbGF5b3V0ZXIgKGlmIGFueSlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZGRQcmVBbmRQb3N0UmVuZGVyT2JqZWN0cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnJlbW92ZUFsbCgpO1xuXG5cdFx0Ly8gR2V0IHRoZSBiYWNrZ3JvdW5kIG9iamVjdHMgZnJvbSB0aGUgbGF5b3V0ZXJcblx0XHR2YXIgb2JqcyA9IHRoaXMuX2xheW91dGVyLnByZXJlbmRlcih0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAob2Jqcykge1xuXHRcdFx0b2Jqcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlck9iamVjdCkge1xuXHRcdFx0XHR0aGF0Ll9wcmVyZW5kZXJHcm91cC5hZGRDaGlsZChyZW5kZXJPYmplY3QpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnJlbW92ZUFsbCgpO1xuXHRcdG9ianMgPSB0aGlzLl9sYXlvdXRlci5wb3N0cmVuZGVyKHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdFx0aWYgKG9ianMpIHtcblx0XHRcdG9ianMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJPYmplY3QpIHtcblx0XHRcdFx0dGhhdC5fcG9zdHJlbmRlckdyb3VwLmFkZENoaWxkKHJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblx0X2FkZFJlZ3JvdXBIYW5kbGVzIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHZhciB1bmdyb3VwZWROb2RlSW5mbyA9IHRoaXMuX2dyb3VwaW5nTWFuYWdlci5nZXRVbmdyb3VwZWROb2RlcygpO1xuXHRcdFx0dW5ncm91cGVkTm9kZUluZm8uZm9yRWFjaChmdW5jdGlvbih1bmdyb3VwZWROb2RlKSB7XG5cdFx0XHRcdHZhciBpbmRpY2VzID0gdW5ncm91cGVkTm9kZS5pbmRpY2VzO1xuXHRcdFx0XHR2YXIga2V5ID0gdW5ncm91cGVkTm9kZS5rZXk7XG5cdFx0XHRcdHZhciBiYm94ID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcyxSRUdST1VORF9CQl9QQURESU5HKTtcblx0XHRcdFx0dmFyIGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0ID0gcGF0aC5yZWN0KHtcblx0XHRcdFx0XHR4IDogYmJveC54LFxuXHRcdFx0XHRcdHkgOiBiYm94LnksXG5cdFx0XHRcdFx0Z3JhcGhqc190eXBlIDogJ3JlZ3JvdXBfdW5kZXJsYXknLFxuXHRcdFx0XHRcdGdyYXBoanNfaW5kaWNlcyA6IGluZGljZXMsXG5cdFx0XHRcdFx0d2lkdGggOiBiYm94LndpZHRoLFxuXHRcdFx0XHRcdGhlaWdodCA6IGJib3guaGVpZ2h0LFxuXHRcdFx0XHRcdHN0cm9rZVN0eWxlIDogJyMyMzIzMjMnLFxuXHRcdFx0XHRcdGZpbGxTdHlsZSA6ICcjMDAwMDAwJyxcblx0XHRcdFx0XHRvcGFjaXR5IDogMC4xXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRib3VuZGluZ0JveFJlbmRlck9iamVjdC5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRoYXQucmVncm91cChrZXkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhhdC5faGFuZGxlR3JvdXAuYWRkQ2hpbGQoYm91bmRpbmdCb3hSZW5kZXJPYmplY3QpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlZHJhdyB0aGUgZ3JhcGhcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0dXBkYXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERyYXcgdGhlIGdyYXBoLiAgIE9ubHkgbmVlZHMgdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBub2Rlcy9saW5rcyBoYXZlIGJlZW4gc2V0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGRyYXcgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHRpZiAoIXRoaXMuX3NjZW5lKSB7XG5cdFx0XHR0aGlzLl9zY2VuZSA9IHBhdGgodGhpcy5fY2FudmFzKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0dmFyIGRlZmF1bExheW91dCA9IG5ldyBMYXlvdXQoKVxuXHRcdFx0XHQubm9kZXModGhpcy5fbm9kZXMpXG5cdFx0XHRcdC5ub2RlTWFwKHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKVxuXHRcdFx0XHQubGlua01hcCh0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lKVxuXHRcdFx0XHQubGFiZWxNYXAodGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0XHR0aGlzLmxheW91dGVyKGRlZmF1bExheW91dCk7XG5cdFx0fVxuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwID0gcGF0aC5ncm91cCgpO1xuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVZID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9oYW5kbGVHcm91cCA9IHBhdGguZ3JvdXAoKTtcblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAgPSBwYXRoLmdyb3VwKHtub0hpdDp0cnVlfSk7XG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5fYWRkUHJlQW5kUG9zdFJlbmRlck9iamVjdHMoKTtcblxuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX3ByZXJlbmRlckdyb3VwKTtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9oYW5kbGVHcm91cCk7XG5cdFx0dGhpcy5fbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cblx0XHRcdHZhciBsaW5rT2JqZWN0O1xuXHRcdFx0aWYgKCFsaW5rLnR5cGUpIHtcblx0XHRcdFx0bGluay50eXBlID0gTElOS19UWVBFLkRFRkFVTFQ7XG5cdFx0XHR9XG5cdFx0XHRzd2l0Y2gobGluay50eXBlKSB7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkFSUk9XOlxuXHRcdFx0XHRcdGxpbmsuaGVhZE9mZnNldCA9IGxpbmsudGFyZ2V0LnJhZGl1cztcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5hcnJvdyhsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuQVJDOlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmFyYyhsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuTElORTpcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuREVGQVVMVDpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5saW5lKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmxpbmUobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW2xpbmsuc291cmNlLmluZGV4XS5wdXNoKGxpbmtPYmplY3QpO1xuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtsaW5rLnRhcmdldC5pbmRleF0ucHVzaChsaW5rT2JqZWN0KTtcblxuXHRcdFx0dGhhdC5fc2NlbmUuYWRkQ2hpbGQobGlua09iamVjdCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLl9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBjaXJjbGUgPSBwYXRoLmNpcmNsZShub2RlKTtcblx0XHRcdHRoYXQuX25vZGVJbmRleFRvQ2lyY2xlW25vZGUuaW5kZXhdID0gY2lyY2xlO1xuXHRcdFx0aWYgKHRoYXQuX25vZGVPdmVyIHx8IHRoYXQuX2RyYWdnYWJsZSkge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdtb3VzZW92ZXInKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3Zlcikge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU92ZXIoY2lyY2xlLCBlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBjaXJjbGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0IHx8IHRoYXQuX2RyYWdnYWJsZSkge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdtb3VzZW91dCcpO1xuXHRcdFx0XHRjaXJjbGUub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSE9PSdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0KSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ub2RlT3V0KGNpcmNsZSwgZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlQ2xpY2spIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignY2xpY2snKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKCkpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0dGhhdC5fbm9kZUNsaWNrKGNpcmNsZSxlKTtcblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdjbGljaycpO1xuXHRcdFx0XHRjaXJjbGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRpZiAodGhhdC5fbm9kZU91dCkge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU91dChjaXJjbGUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQudW5ncm91cChjaXJjbGUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoYXQuX3NjZW5lLmFkZENoaWxkKGNpcmNsZSk7XG5cblx0XHRcdGlmIChub2RlLmxhYmVsKSB7XG5cdFx0XHRcdHRoYXQuYWRkTGFiZWwobm9kZSxub2RlLmxhYmVsKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdGlmICh0aGlzLnNob3dBbGxMYWJlbHMoKSkge1xuXHRcdFx0dGhpcy5zaG93QWxsTGFiZWxzKHRydWUpO1xuXHRcdH1cblxuXHRcdHRoaXMuX2xheW91dGVyLmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdC5ub2RlTWFwKHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKVxuXHRcdFx0LmxhYmVsTWFwKHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXG5cdFx0Ly8gRHJhdyBhbnkgdW5ncm91cGVkIG5vZGUgYm91bmRpbmcgYm94ZXNcblx0XHR0aGlzLl9hZGRSZWdyb3VwSGFuZGxlcygpO1xuXG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5fcG9zdHJlbmRlckdyb3VwKTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2RlYnVnRHJhd0JvdW5kaW5nQm94IDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMpO1xuXHRcdGlmICh0aGlzLl9iYlJlbmRlcikge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5fYmJSZW5kZXIpO1xuXHRcdH1cblx0XHR0aGlzLl9iYlJlbmRlciA9IHBhdGgucmVjdCh7XG5cdFx0XHR4IDogYm91bmRpbmdCb3gueCxcblx0XHRcdHkgOiBib3VuZGluZ0JveC55LFxuXHRcdFx0d2lkdGggOiBib3VuZGluZ0JveC53aWR0aCxcblx0XHRcdGhlaWdodCA6IGJvdW5kaW5nQm94LmhlaWdodCxcblx0XHRcdHN0cm9rZVN0eWxlIDogJyNmZjAwMDAnLFxuXHRcdFx0bGluZVdpZHRoIDogMlxuXHRcdH0pO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX2JiUmVuZGVyKTtcblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogRml0IHRoZSBncmFwaCB0byB0aGUgc2NyZWVuXG5cdCAqL1xuXHRmaXQgOiBmdW5jdGlvbihwYWRkaW5nKSB7XG5cblx0XHQvLyBSZXR1cm4gYmFjayB0byBvcmlnaW5cblx0XHR0aGlzLl9wYW4oLXRoaXMuX3NjZW5lLngsLXRoaXMuX3NjZW5lLnkpO1xuXG5cblxuXHRcdC8vIFdvcmtpbmcgd2l0aCBiaWcgbnVtYmVycywgaXQncyBiZXR0ZXIgaWYgd2UgZG8gdGhpcyB0d2ljZS5cblx0XHR2YXIgYm91bmRpbmdCb3g7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyOyBpKyspIHtcblx0XHRcdGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMscGFkZGluZyk7XG5cdFx0XHR2YXIgeFJhdGlvID0gdGhpcy5fc2NlbmUud2lkdGggLyBib3VuZGluZ0JveC53aWR0aDtcblx0XHRcdHZhciB5UmF0aW8gPSB0aGlzLl9zY2VuZS5oZWlnaHQgLyBib3VuZGluZ0JveC5oZWlnaHQ7XG5cdFx0XHR0aGlzLl96b29tKE1hdGgubWluKHhSYXRpbywgeVJhdGlvKSwgMCwgMCk7XG5cdFx0fVxuXG5cdFx0dmFyIG1pZFNjcmVlblggPSB0aGlzLl9zY2VuZS53aWR0aCAvIDI7XG5cdFx0dmFyIG1pZFNjcmVlblkgPSB0aGlzLl9zY2VuZS5oZWlnaHQgLyAyO1xuXHRcdGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMpO1xuXHRcdHZhciBtaWRCQlggPSBib3VuZGluZ0JveC54ICsgYm91bmRpbmdCb3gud2lkdGggLyAyO1xuXHRcdHZhciBtaWRCQlkgPSBib3VuZGluZ0JveC55ICsgYm91bmRpbmdCb3guaGVpZ2h0IC8gMjtcblx0XHR0aGlzLl9wYW4oLShtaWRCQlgtbWlkU2NyZWVuWCksLShtaWRCQlktbWlkU2NyZWVuWSkpO1xuXG5cdFx0dGhpcy5fem9vbVNjYWxlID0gMS4wO1xuXHRcdHRoaXMuX2xheW91dGVyLl96b29tU2NhbGUgPSAxLjA7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU3VzcGVuZCBtb3VzZSBldmVudHMgYW5kIHpvb21pbmdcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9zdXNwZW5kRXZlbnRzIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fbGF5b3V0ZXIuX2V2ZW50c1N1c3BlbmRlZCA9IHRydWU7XG5cdH0sXG5cblx0LyoqXG5cdCAqIHJlc3VtZSBtb3VzZSBldmVudHMgYW5kIHpvb21pbmdcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9yZXN1bWVFdmVudHMgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9sYXlvdXRlci5fZXZlbnRzU3VzcGVuZGVkID0gZmFsc2U7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFF1ZXJ5IGV2ZW50IHN1c3BlbnNpb24gc3RhdHVzXG5cdCAqIEByZXR1cm5zIGJvb2xlYW5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9ldmVudHNTdXNwZW5kZWQgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fbGF5b3V0ZXIuX2V2ZW50c1N1c3BlbmRlZDtcblx0fSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBhbGwgcmVuZGVyIG9iamVjdHMgYXNzb2NpYXRlZCB3aXRoIGEgZ3JhcGguXG5cdCAqL1xuXHRjbGVhciA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciByZW1vdmVSZW5kZXJPYmplY3RzID0gZnVuY3Rpb24oaW5kZXhUb09iamVjdCkge1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIGluZGV4VG9PYmplY3QpIHtcblx0XHRcdFx0aWYgKGluZGV4VG9PYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdHZhciBvYmogPSBpbmRleFRvT2JqZWN0W2tleV07XG5cdFx0XHRcdFx0aWYgKCQuaXNBcnJheShvYmopKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmpbaV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkZWxldGUgaW5kZXhUb09iamVjdFtrZXldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0aWYgKHRoaXMuX3ByZXJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9wcmVyZW5kZXJHcm91cCk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5faGFuZGxlR3JvdXApO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fcG9zdHJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9wb3N0cmVuZGVyR3JvdXApO1xuXHRcdH1cblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cblxuZXhwb3J0cy5MSU5LX1RZUEUgPSByZXF1aXJlKCcuL2xpbmtUeXBlJyk7XG5leHBvcnRzLkdyb3VwaW5nTWFuYWdlciA9IHJlcXVpcmUoJy4vZ3JvdXBpbmdNYW5hZ2VyJyk7XG5leHBvcnRzLkxheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5leHBvcnRzLkNvbHVtbkxheW91dCA9IHJlcXVpcmUoJy4vY29sdW1uTGF5b3V0Jyk7XG5leHBvcnRzLlJhZGlhbExheW91dCA9IHJlcXVpcmUoJy4vcmFkaWFsTGF5b3V0Jyk7XG5leHBvcnRzLkV4dGVuZCA9IF8uZXh0ZW5kO1xuZXhwb3J0cy5HcmFwaCA9IEdyYXBoOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbi8qKlxuICpcbiAqIEBwYXJhbSBmb2N1cyAtIHRoZSBub2RlIGF0IHRoZSBjZW50ZXIgb2YgdGhlIHJhZGlhbCBsYXlvdXRcbiAqIEBwYXJhbSBkaXN0YW5jZSAtIHRoZSBkaXN0YW5jZSBvZiBvdGhlciBub2RlcyBmcm9tIHRoZSBmb2N1c1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJhZGlhbExheW91dChmb2N1cyxkaXN0YW5jZSkge1xuXHR0aGlzLl9mb2N1cyA9IGZvY3VzO1xuXHR0aGlzLl9kaXN0YW5jZSA9IGRpc3RhbmNlO1xuXG5cdExheW91dC5hcHBseSh0aGlzKTtcbn1cblxuXG5SYWRpYWxMYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoUmFkaWFsTGF5b3V0LnByb3RvdHlwZSwgTGF5b3V0LnByb3RvdHlwZSwge1xuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBkaXN0YW5jZSBwYXJhbWV0ZXJcblx0ICogQHBhcmFtIGRpc3RhbmNlIC0gdGhlIGRpc3RhbmNlIG9mIGxpbmtzIGZyb20gdGhlIGZvY3VzIG5vZGUgdG8gb3RoZXIgbm9kZXMgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtSYWRpYWxMYXlvdXR9IGlmIGRpc3RhbmNlIHBhcmFtIGlzIGRlZmluZWQsIHtSYWRpYWxMYXlvdXQuX2Rpc3RhbmNlfSBvdGhlcndpc2Vcblx0ICovXG5cdGRpc3RhbmNlOiBmdW5jdGlvbiAoZGlzdGFuY2UpIHtcblx0XHRpZiAoZGlzdGFuY2UpIHtcblx0XHRcdHRoaXMuX2Rpc3RhbmNlID0gZGlzdGFuY2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9kaXN0YW5jZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9jdXMgbm9kZSB0aGF0IGlzIGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxheW91dFxuXHQgKiBAcGFyYW0gZm9jdXMgLSB0aGUgbm9kZSB0aGF0IGlzIGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxheW91dC4gICBPdGhlciBub2RlcyBhcmUgY2VudGVyZWQgYXJvdW5kIHRoaXMuXG5cdCAqIEByZXR1cm5zIHtSYWRpYWxMYXlvdXR9IGlmIGZvY3VzIHBhcmFtIGlzIGRlZmluZWQsIHtSYWRpYWxMYXlvdXQuX2ZvY3VzfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvY3VzOiBmdW5jdGlvbiAoZm9jdXMpIHtcblx0XHRpZiAoZm9jdXMpIHtcblx0XHRcdHRoaXMuX2ZvY3VzID0gZm9jdXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb2N1cztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCB0aGUgbGFiZWwgcG9zaXRpb24gZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVggLSB0aGUgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVkgLSB0aGUgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gcmFkaXVzIC0gdGhlIHJhZGl1cyBvZiB0aGUgbm9kZVxuXHQgKiBAcmV0dXJucyB7e3g6IHggcG9zaXRpb24gb2YgdGhlIGxhYmVsLCB5OiB5IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgYWxpZ246IEhUTUwgY2FudmFzIHRleHQgYWxpZ25tZW50IHByb3BlcnR5IGZvciBsYWJlbH19XG5cdCAqL1xuXHRsYXlvdXRMYWJlbDogZnVuY3Rpb24gKG5vZGVYLCBub2RlWSwgcmFkaXVzKSB7XG5cdFx0dmFyIHgsIHksIGFsaWduO1xuXG5cdFx0Ly8gUmlnaHQgb2YgY2VudGVyXG5cdFx0aWYgKG5vZGVYID4gdGhpcy5fZm9jdXMpIHtcblx0XHRcdHggPSBub2RlWCArIChyYWRpdXMgKyAxMCk7XG5cdFx0XHRhbGlnbiA9ICdzdGFydCc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHggPSBub2RlWCAtIChyYWRpdXMgKyAxMCk7XG5cdFx0XHRhbGlnbiA9ICdlbmQnO1xuXHRcdH1cblxuXHRcdGlmIChub2RlWSA+IHRoaXMuX2ZvY3VzKSB7XG5cdFx0XHR5ID0gbm9kZVkgKyAocmFkaXVzICsgMTApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR5ID0gbm9kZVkgLSAocmFkaXVzICsgMTApO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0eDogeCxcblx0XHRcdHk6IHksXG5cdFx0XHRhbGlnbjogYWxpZ25cblx0XHR9O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIGEgcmFkaWFsIGxheW91dFxuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqL1xuXHRsYXlvdXQ6IGZ1bmN0aW9uICh3LCBoKSB7XG5cdFx0dmFyIG5vZGVzID0gdGhpcy5ub2RlcygpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgYW5nbGVEZWx0YSA9IE1hdGguUEkgKiAyIC8gKG5vZGVzLmxlbmd0aCAtIDEpO1xuXHRcdHZhciBhbmdsZSA9IDAuMDtcblx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0XHRpZiAobm9kZS5pbmRleCA9PT0gdGhhdC5fZm9jdXMuaW5kZXgpIHtcblx0XHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUsIG5vZGUueCwgbm9kZS55KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIG5ld1ggPSB0aGF0Ll9mb2N1cy54ICsgKE1hdGguY29zKGFuZ2xlKSAqIHRoYXQuX2Rpc3RhbmNlKTtcblx0XHRcdHZhciBuZXdZID0gdGhhdC5fZm9jdXMueSArIChNYXRoLnNpbihhbmdsZSkgKiB0aGF0Ll9kaXN0YW5jZSk7XG5cdFx0XHR0aGF0Ll9zZXROb2RlUG9zaXRpb24obm9kZSwgbmV3WCwgbmV3WSk7XG5cdFx0XHRhbmdsZSArPSBhbmdsZURlbHRhO1xuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSYWRpYWxMYXlvdXQ7XG4iLCJcbnZhciBVdGlsID0ge1xuXG4gIGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuICAgIHZhciBrZXksIGksIHNvdXJjZTtcbiAgICBmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzdDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(5)
});
