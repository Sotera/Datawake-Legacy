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
				that._nodeIndexToLinkLine[node.index] = [];
			});
			if (this._layouter) {
				this._layouter.nodes(nodes);
			}

		} else {
			return this._nodes;
		}
		return this;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2NvbHVtbkxheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xpbmtUeXBlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3JhZGlhbExheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaitCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgQ29sdW1uTGF5b3V0ID0gZnVuY3Rpb24oKSB7XG5cdExheW91dC5hcHBseSh0aGlzKTtcbn07XG5cbkNvbHVtbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChDb2x1bW5MYXlvdXQucHJvdG90eXBlLCBMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEEgY29sdW1uIGxheW91dFxuXHQgKiBAcGFyYW0gdyAtIHdpZHRoIG9mIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIGhlaWdodCBvZiBjYW52YXNcblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uICh3LCBoKSB7XG5cdFx0dmFyIHggPSAwO1xuXHRcdHZhciB5ID0gMDtcblx0XHR2YXIgbWF4UmFkaXVzQ29sID0gMDtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuXG5cdFx0XHRpZiAoeSA9PT0gMCkge1xuXHRcdFx0XHR5ICs9IG5vZGUucmFkaXVzO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHggPT09IDApIHtcblx0XHRcdFx0eCArPSBub2RlLnJhZGl1cztcblx0XHRcdH1cblxuXHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlKG5vZGUsIHgsIHkpO1xuXG5cdFx0XHRtYXhSYWRpdXNDb2wgPSBNYXRoLm1heChtYXhSYWRpdXNDb2wsIG5vZGUucmFkaXVzKTtcblxuXHRcdFx0eSArPSBub2RlLnJhZGl1cyArIDQwO1xuXHRcdFx0aWYgKHkgPiBoKSB7XG5cdFx0XHRcdHkgPSAwO1xuXHRcdFx0XHR4ICs9IG1heFJhZGl1c0NvbCArIDQwO1xuXHRcdFx0XHRtYXhSYWRpdXNDb2wgPSAwO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2x1bW5MYXlvdXQ7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBiYXNlIGdyb3VwaW5nIG1hbmFnZXIuICAgVGhpcyBpcyBhbiBhYnN0cmFjdCBjbGFzcy4gICBDaGlsZCBjbGFzc2VzIHNob3VsZCBvdmVycmlkZSB0aGVcbiAqIGluaXRpYWxpemVIZWlyYXJjaHkgZnVuY3Rpb24gdG8gY3JlYXRlIG5vZGVzL2xpbmtzIHRoYXQgYXJlIGFnZ3JlZ2F0ZWQgZm9yIHRoZWlyIHNwZWNpZmljIGltcGxlbWVudGF0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEdyb3VwaW5nTWFuYWdlciA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBbXTtcblx0dGhpcy5fbGlua3MgPSBbXTtcblxuXHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBbXTtcblx0dGhpcy5fYWdncmVnYXRlZExpbmtzID0gW107XG5cdHRoaXMuX2FnZ3JlZ2F0ZU5vZGVNYXAgPSB7fTtcblxuXHR0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzID0ge307XG5cdHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMgPSB7fTtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuR3JvdXBpbmdNYW5hZ2VyLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEdyb3VwaW5nTWFuYWdlci5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgb3JpZ2luYWwgbm9kZXMgaW4gdGhlIGdyYXBoIHdpdGhvdXQgZ3JvdXBpbmdcblx0ICogQHBhcmFtIG5vZGVzIC0gYSBncmFwaC5qcyBub2RlIGFycmF5XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2Rlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBvcmlnaW5hbCBsaW5rcyBpbiB0aGUgZ3JhcGggd2l0aG91dCBncm91cGluZ1xuXHQgKiBAcGFyYW0gbGlua3MgLSBhIGdyYXBoLmpzIGxpbmsgYXJyYXlcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRsaW5rcyA6IGZ1bmN0aW9uKGxpbmtzKSB7XG5cdFx0aWYgKGxpbmtzKSB7XG5cdFx0XHR0aGlzLl9saW5rcyA9IGxpbmtzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGlua3M7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplcyB0aGUgbm9kZS9saW5rIGFnZ3JlZ2F0aW9uXG5cdCAqL1xuXHRpbml0aWFsaXplSGVpcmFyY2h5IDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fYWdncmVnYXRlTm9kZXMoKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXG5cdFx0dmFyIHNldFBhcmVudFBvaW50ZXJzID0gZnVuY3Rpb24obm9kZSxwYXJlbnQpIHtcblx0XHRcdGlmIChub2RlLmNoaWxkcmVuKSB7XG5cdFx0XHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0XHRcdHNldFBhcmVudFBvaW50ZXJzKGNoaWxkLG5vZGUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdG5vZGUucGFyZW50Tm9kZSA9IHBhcmVudDtcblx0XHR9O1xuXG5cdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0c2V0UGFyZW50UG9pbnRlcnMobm9kZSxudWxsKTtcblx0XHR9KTtcblxuXHRcdGlmICh0aGlzLm9uQWdncmVnYXRpb25Db21wbGV0ZSkge1xuXHRcdFx0dGhpcy5vbkFnZ3JlZ2F0aW9uQ29tcGxldGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYWdncmVnYXRlZCBsaW5rIGluIGdyYXBoLmpzIGZvcm1hdC4gICBDYW4gYmUgb3ZlcnJpZGVuIGJ5IHNwZWNpZmljIGltcGxlbWVudGF0aW9ucyB0byBhbGxvd1xuXHQgKiB0byBhbGxvdyBmb3IgZGlmZXJlbnQgbGluayB0eXBlcyBiYXNlZCBvbiBhZ2dyZWdhdGUgY29udGVudHNcblx0ICogQHBhcmFtIHNvdXJjZUFnZ3JlZ2F0ZSAtIHRoZSBzb3VyY2UgYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIHRhcmdldEFnZ3JlZ2F0ZSAtIHRoZSB0YXJnZXQgYWdncmVnYXRlIG5vZGVcblx0ICogQHJldHVybnMge3tzb3VyY2U6ICosIHRhcmdldDogKn19IC0gYSBncmFwaC5qcyBsaW5rXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfY3JlYXRlQWdncmVnYXRlTGluayA6IGZ1bmN0aW9uKHNvdXJjZUFnZ3JlZ2F0ZSx0YXJnZXRBZ2dyZWdhdGUsb3JpZ2luYWxMaW5rcykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzb3VyY2UgOiBzb3VyY2VBZ2dyZWdhdGUsXG5cdFx0XHR0YXJnZXQgOiB0YXJnZXRBZ2dyZWdhdGVcblx0XHR9O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtcyBsaW5rIGFnZ3JlZ2F0ZSBiYXNlZCBvbiBhIHNldCBvZiBhZ2dyZWdhdGVkIG5vZGVzIGFuZCBhIGZ1bGwgc2V0IG9mIGxpbmtzXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfYWdncmVnYXRlTGlua3MgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZSA9IHt9O1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHRcdGlmIChhZ2dyZWdhdGUuY2hpbGRyZW4pIHtcblx0XHRcdFx0YWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbm9kZS5pbmRleF0gPSBhZ2dyZWdhdGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fYWdncmVnYXRlTm9kZU1hcFthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdH0pO1xuXG5cblx0XHR2YXIgYWdncmVnYXRlZExpbmtzID0gW107XG5cblx0XHR2YXIgYWdncmVnYXRlTGlua01hcCA9IHt9O1xuXG5cdFx0dGhpcy5fbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgc291cmNlQWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnNvdXJjZS5pbmRleF07XG5cdFx0XHR2YXIgdGFyZ2V0QWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnRhcmdldC5pbmRleF07XG5cblx0XHRcdHZhciBzb3VyY2VNYXAgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZU1hcCkge1xuXHRcdFx0XHRzb3VyY2VNYXAgPSB7fTtcblx0XHRcdH1cblx0XHRcdHZhciBzb3VyY2VUb1RhcmdldExpbmtzID0gc291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZVRvVGFyZ2V0TGlua3MpIHtcblx0XHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcyA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcy5wdXNoKGxpbmspO1xuXHRcdFx0c291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VUb1RhcmdldExpbmtzO1xuXG5cdFx0XHRhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VNYXA7XG5cdFx0fSk7XG5cblx0XHQvLyBHZXQgbWluL21heCBsaW5rIGNvdW50cyBmb3IgYWxsIGFnZ3JlZ2F0ZSBwYWlyc1xuXHRcdHZhciBtaW5Db3VudCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0dmFyIG1heENvdW50ID0gMDtcblx0XHRmb3IgKHZhciBzb3VyY2VBZ2dyZWdhdGVJZCBpbiBhZ2dyZWdhdGVMaW5rTWFwKSB7XG5cdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcC5oYXNPd25Qcm9wZXJ0eShzb3VyY2VBZ2dyZWdhdGVJZCkpIHtcblx0XHRcdFx0Zm9yICh2YXIgdGFyZ2V0QWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0pIHtcblx0XHRcdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0uaGFzT3duUHJvcGVydHkodGFyZ2V0QWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdFx0XHR2YXIgc291cmNlID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFtzb3VyY2VBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgb3JpZ2luYWxMaW5rcyA9IGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdW3RhcmdldEFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdG1pbkNvdW50ID0gTWF0aC5taW4obWluQ291bnQsb3JpZ2luYWxMaW5rcy5sZW5ndGgpO1xuXHRcdFx0XHRcdFx0bWF4Q291bnQgPSBNYXRoLm1heChtYXhDb3VudCxvcmlnaW5hbExpbmtzLmxlbmd0aCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgc291cmNlQWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcCkge1xuXHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXAuaGFzT3duUHJvcGVydHkoc291cmNlQWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdGZvciAodmFyIHRhcmdldEFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdKSB7XG5cdFx0XHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdLmhhc093blByb3BlcnR5KHRhcmdldEFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRcdFx0dmFyIHNvdXJjZSA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbc291cmNlQWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIHRhcmdldCA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIG9yaWdpbmFsTGlua3MgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXVt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgbGluayA9IHRoYXQuX2NyZWF0ZUFnZ3JlZ2F0ZUxpbmsoc291cmNlLCB0YXJnZXQsIG9yaWdpbmFsTGlua3MsIG1pbkNvdW50LCBtYXhDb3VudCk7XG5cdFx0XHRcdFx0XHRpZiAobGluaykge1xuXHRcdFx0XHRcdFx0XHRhZ2dyZWdhdGVkTGlua3MucHVzaChsaW5rKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9hZ2dyZWdhdGVkTGlua3MgPSBhZ2dyZWdhdGVkTGlua3M7XG5cdH0sXG5cblxuXHQvKipcblx0ICogUGVyZm9ybSBub2RlIGFnZ3JlZ2F0aW9uLiAgIE11c3QgYmUgb3ZlcnJpZGVuIGJ5IGltcGxlbWVudG9yc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZU5vZGVzIDogZnVuY3Rpb24oKSB7XG5cblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBub2Rlc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIG5vZGVzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTm9kZXMgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZE5vZGVzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gb2YgZ3JhcGguanMgbGlua3Ncblx0ICovXG5cdGFnZ3JlZ2F0ZWRMaW5rcyA6IGZ1bmN0aW9uKCkgIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cdHJlbW92ZSA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHR2YXIgaW5kZXggPSAtMTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0aW5kZXggPSBpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc3BsaWNlKGluZGV4LDEpO1xuXHRcdH1cblx0fSxcblxuXG5cdC8qKlxuXHQgKiBEbyBhbnkgdXBkYXRlcyBvbiBjaGlsZHJlbiBiZWZvcmUgbGF5b3V0ICAoaWUvIHNldCBwb3NpdGlvbiwgcm93L2NvbCBpbmZvLCBldGMpLiAgIFNob3VsZCBiZSBkZWZpbmVkXG5cdCAqIGluIGltcGxlbWVudGluZyBjbGFzc1xuXHQgKiBAcGFyYW0gYWdncmVnYXRlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfdXBkYXRlQ2hpbGRyZW4gOiBmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHQvLyBzZXQgY2hpbGRyZW5zIHBvc2l0aW9uIGluaXRpYWxseSB0byB0aGUgcG9zaXRpb24gb2YgdGhlIGFnZ3JlZ2F0ZVxuXHRcdGFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRjaGlsZC54ID0gYWdncmVnYXRlLng7XG5cdFx0XHRjaGlsZC55ID0gYWdncmVnYXRlLnk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFVuZ3JvdXAgYW4gYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICovXG5cdHVuZ3JvdXAgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0aWYgKG5vZGUuY2hpbGRyZW4pIHtcblxuXHRcdFx0dmFyIHBhcmVudEtleSA9ICcnO1xuXHRcdFx0bm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0cGFyZW50S2V5ICs9IG5vZGUuaW5kZXggKyAnLCc7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1twYXJlbnRLZXldID0gbm9kZTtcblxuXHRcdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlc1tpXS5pbmRleCA9PT0gbm9kZS5pbmRleCkge1xuXHRcdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl91cGRhdGVDaGlsZHJlbihub2RlKTtcblxuXHRcdFx0dmFyIGZpcnN0ID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKDAsaW5kZXgpO1xuXHRcdFx0dmFyIG1pZGRsZSA9IG5vZGUuY2hpbGRyZW47XG5cdFx0XHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzW3BhcmVudEtleV0gPSBub2RlLmNoaWxkcmVuO1xuXHRcdFx0dmFyIGVuZCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZShpbmRleCsxKTtcblxuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzID0gZmlyc3QuY29uY2F0KG1pZGRsZSkuY29uY2F0KGVuZCk7XG5cblx0XHRcdC8vIFJlY29tcHV0ZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdH1cblx0fSxcblx0Z2V0QWdncmVnYXRlIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0fSxcblxuXHRyZWdyb3VwIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5LGF0SW5kZXgpIHtcblx0XHR2YXIgYWdncmVnYXRlTm9kZSA9IHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0XHR2YXIgbm9kZXNUb1JlbW92ZSA9IGFnZ3JlZ2F0ZU5vZGUuY2hpbGRyZW47XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVzVG9SZW1vdmUuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR0aGF0LnJlbW92ZShub2RlKTtcblx0XHR9KTtcblx0XHR2YXIgc3RhcnQgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoMCxhdEluZGV4KTtcblx0XHR2YXIgZW5kID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKGF0SW5kZXgpO1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IHN0YXJ0LmNvbmNhdChhZ2dyZWdhdGVOb2RlKS5jb25jYXQoZW5kKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0ZGVsZXRlIHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHNbYWdncmVnYXRlS2V5XTtcblx0XHRyZXR1cm4gYWdncmVnYXRlTm9kZTtcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbiBhcnJheSBvZiBub2RlIGdyb3VwcyB0aGF0IGFyZSBleHBhbmRlZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRnZXRVbmdyb3VwZWROb2RlcyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbmZvID0gW107XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR2YXIgbm9kZXMgPSB0aGF0Ll91bmdyb3VwZWROb2RlR3JvdXBzW2tleV07XG5cdFx0XHR2YXIgbm9kZUluZGljZXMgPSBub2Rlcy5tYXAoZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRyZXR1cm4gbm9kZS5pbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0aW5mby5wdXNoKHtcblx0XHRcdFx0aW5kaWNlcyA6IG5vZGVJbmRpY2VzLFxuXHRcdFx0XHRrZXkgOiBrZXlcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBpbmZvO1xuXHR9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwaW5nTWFuYWdlcjtcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBudWxsO1xuXHR0aGlzLl9saW5rTWFwID0gbnVsbDtcblx0dGhpcy5fbm9kZU1hcCA9IG51bGw7XG5cdHRoaXMuX2xhYmVsTWFwID0gbnVsbDtcblx0dGhpcy5fZHVyYXRpb24gPSAyNTA7XG5cdHRoaXMuX2Vhc2luZyA9ICdlYXNlLWluLW91dCc7XG5cdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0dGhpcy5fZXZlbnRzU3VzcGVuZGVkID0gZmFsc2U7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGR1cmF0aW9uIG9mIHRoZSBsYXlvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9IDI1MG1zKVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBkdXJhdGlvbiBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9kdXJhdGlvbn0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRkdXJhdGlvbiA6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0aWYgKGR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLl9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZHVyYXRpb247XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gZWFzaW5nIC0gdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9ICdlYXNlLWluLW91dCcpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGVhc2luZyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9lYXNpbmd9IG90aGVyd2lzZVxuXHQgKi9cblx0ZWFzaW5nIDogZnVuY3Rpb24oZWFzaW5nKSB7XG5cdFx0aWYgKGVhc2luZykge1xuXHRcdFx0dGhpcy5fZWFzaW5nID0gZWFzaW5nO1xuXHRcdH1cdCBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9lYXNpbmc7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlcyAtIHRoZSBzZXQgb2Ygbm9kZXMgZGVmaW5lZCBpbiB0aGUgY29ycmVzcG9uZGluZyBncmFwaFxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBub2RlcyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2Rlc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlcyA6IGZ1bmN0aW9uKG5vZGVzKSB7XG5cdFx0aWYgKG5vZGVzKSB7XG5cdFx0XHR0aGlzLl9pc1VwZGF0ZSA9IG5vZGVzID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2Rlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBsaW5rIG1hcCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGlua01hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIHNldCBvZiBsaW5lcyAocGF0aCBvYmplY3RzKSB0aGF0IGNvbnRhaW4gdGhhdCBub2RlXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGxpbmtNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbGlua01hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsaW5rTWFwIDogZnVuY3Rpb24obGlua01hcCkge1xuXHRcdGlmIChsaW5rTWFwKSB7XG5cdFx0XHR0aGlzLl9saW5rTWFwID0gbGlua01hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGUgbWFwIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgY2lyY2xlIChwYXRoIG9iamVjdClcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbm9kZU1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2RlTWFwfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVNYXAgOiBmdW5jdGlvbihub2RlTWFwKSB7XG5cdFx0aWYgKG5vZGVNYXApIHtcblx0XHRcdHRoaXMuX25vZGVNYXAgPSBub2RlTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZU1hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbGFiZWwgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxhYmVsTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgdGV4dCBvYmplY3QgKHBhdGggb2JqZWN0KVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBsYWJlbE1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9sYWJlbE1hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsYWJlbE1hcCA6IGZ1bmN0aW9uKGxhYmVsTWFwKSB7XG5cdFx0aWYgKGxhYmVsTWFwKSB7XG5cdFx0XHR0aGlzLl9sYWJlbE1hcCA9IGxhYmVsTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGFiZWxNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgYm91bmRpbmcgYm94IGZvciBhbiBhcnJheSBvZiBub2RlIGluZGljZXNcblx0ICogQHBhcmFtIG5vZGVPckluZGV4QXJyYXkgLSBhcnJheSBvZiBub2RlIGluZGljaWVzIG9yIG5vZGUgYXJyYXkgaXRzZWxmXG5cdCAqIEBwYXJhbSBwYWRkaW5nIC0gcGFkZGluZyBpbiBwaXhlbHMgYXBwbGllZCB0byBib3VuZGluZyBib3hcblx0ICogQHJldHVybnMge3ttaW46IHt4OiBOdW1iZXIsIHk6IE51bWJlcn0sIG1heDoge3g6IG51bWJlciwgeTogbnVtYmVyfX19XG5cdCAqL1xuXHRnZXRCb3VuZGluZ0JveCA6IGZ1bmN0aW9uKG5vZGVPckluZGV4QXJyYXkscGFkZGluZykge1xuXHRcdHZhciBtaW4gPSB7XG5cdFx0XHR4IDogTnVtYmVyLk1BWF9WQUxVRSxcblx0XHRcdHkgOiBOdW1iZXIuTUFYX1ZBTFVFXG5cdFx0fTtcblx0XHR2YXIgbWF4ID0ge1xuXHRcdFx0eCA6IC1OdW1iZXIuTUFYX1ZBTFVFLFxuXHRcdFx0eSA6IC1OdW1iZXIuTUFYX1ZBTFVFXG5cdFx0fTtcblxuXHRcdHZhciBiYlBhZGRpbmcgPSBwYWRkaW5nIHx8IDA7XG5cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0bm9kZU9ySW5kZXhBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVPckluZGV4KSB7XG5cdFx0XHR2YXIgaWR4ID0gbm9kZU9ySW5kZXggaW5zdGFuY2VvZiBPYmplY3QgPyBub2RlT3JJbmRleC5pbmRleCA6IG5vZGVPckluZGV4O1xuXHRcdFx0dmFyIGNpcmNsZSA9IHRoYXQuX25vZGVNYXBbaWR4XTtcblx0XHRcdG1pbi54ID0gTWF0aC5taW4obWluLngsIChjaXJjbGUuZmluYWxYIHx8IGNpcmNsZS54KSAtIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0XHRtaW4ueSA9IE1hdGgubWluKG1pbi55LCAoY2lyY2xlLmZpbmFsWSB8fCBjaXJjbGUueSkgLSAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdFx0bWF4LnggPSBNYXRoLm1heChtYXgueCwgKGNpcmNsZS5maW5hbFggfHwgY2lyY2xlLngpICsgKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHRcdG1heC55ID0gTWF0aC5tYXgobWF4LnksIChjaXJjbGUuZmluYWxZIHx8IGNpcmNsZS55KSArIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHggOiBtaW4ueCxcblx0XHRcdHkgOiBtaW4ueSxcblx0XHRcdHdpZHRoIDogKG1heC54IC0gbWluLngpLFxuXHRcdFx0aGVpZ2h0IDogKG1heC55IC0gbWluLnkpXG5cdFx0fTtcblx0fSxcblxuXHRfYXBwbHlab29tU2NhbGUgOiBmdW5jdGlvbihiQXBwbHkpIHtcblx0XHR0aGlzLl9hcHBseVpvb20gPSBiQXBwbHk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIGEgbm9kZSBhbmQgYWxsIGF0dGFjaGVkIGxpbmtzIGFuZCBsYWJlbHMgd2l0aG91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIG5vZGUgLSB0aGUgbm9kZSBvYmplY3QgYmVpbmcgcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBmb3IgdGhlIG5vZGVcblx0ICogQHBhcmFtIHkgLSB0aGUgbmV3IHkgcG9zaXRpb24gZm9yIHRoZSBub2RlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlIDogZnVuY3Rpb24obm9kZSx4LHksY2FsbGJhY2spIHtcblx0XHR0aGlzLl9zZXROb2RlUG9zaXRpb24obm9kZSx4LHksdHJ1ZSk7XG5cdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgcG9zaXRpb24gb2YgYSBub2RlIGJ5IGFuaW1hdGluZyBmcm9tIGl0J3Mgb2xkIHBvc2l0aW9uIHRvIGl0J3MgbmV3IG9uZVxuXHQgKiBAcGFyYW0gbm9kZSAtIHRoZSBub2RlIGJlaW5nIHJlcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0geSAtIHRoZSBuZXcgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gYkltbWVkaWF0ZSAtIGlmIHRydWUsIHNldHMgd2l0aG91dCBhbmltYXRpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uIDogZnVuY3Rpb24obm9kZSxuZXdYLG5ld1ksYkltbWVkaWF0ZSxjYWxsYmFjaykge1xuXHRcdHZhciB4ID0gbmV3WCAqICh0aGlzLl9hcHBseVpvb20gPyB0aGlzLl96b29tU2NhbGUgOiAxKTtcblx0XHR2YXIgeSA9IG5ld1kgKiAodGhpcy5fYXBwbHlab29tID8gdGhpcy5fem9vbVNjYWxlIDogMSk7XG5cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbm9kZSByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIGNpcmNsZSA9IHRoaXMuX25vZGVNYXBbbm9kZS5pbmRleF07XG5cdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRjaXJjbGUudHdlZW5BdHRyKHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fSwge1xuXHRcdFx0XHRkdXJhdGlvbjogdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nLFxuXHRcdFx0XHRjYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxYO1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxZO1xuXHRcdFx0XHRcdG5vZGUueCA9IHg7XG5cdFx0XHRcdFx0bm9kZS55ID0geTtcblx0XHRcdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdGNpcmNsZS5maW5hbFggPSB4O1xuXHRcdFx0Y2lyY2xlLmZpbmFsWSA9IHk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNpcmNsZS54ID0geDtcblx0XHRcdGNpcmNsZS55ID0geTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2xpbmtNYXBbbm9kZS5pbmRleF0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRub2RlLnggPSB4O1xuXHRcdFx0bm9kZS55ID0geTtcblx0XHRcdGNpcmNsZS54ID0geDtcblx0XHRcdGNpcmNsZS55ID0geTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgdGhlIGxhYmVsIHJlbmRlciBvYmplY3Rcblx0XHR2YXIgbGFiZWwgPSB0aGlzLl9sYWJlbE1hcFtub2RlLmluZGV4XTtcblx0XHRpZiAobGFiZWwpIHtcblx0XHRcdHZhciBsYWJlbFBvcyA9IHRoaXMubGF5b3V0TGFiZWwoY2lyY2xlKTtcblx0XHRcdGlmIChiSW1tZWRpYXRlIT09dHJ1ZSkge1xuXHRcdFx0XHRsYWJlbC50d2VlbkF0dHIobGFiZWxQb3MsIHtcblx0XHRcdFx0XHRkdXJhdGlvbjogdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdFx0ZWFzaW5nOiB0aGlzLl9lYXNpbmdcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKHZhciBwcm9wIGluIGxhYmVsUG9zKSB7XG5cdFx0XHRcdFx0aWYgKGxhYmVsUG9zLmhhc093blByb3BlcnR5KHByb3ApKSB7XG5cdFx0XHRcdFx0XHRsYWJlbFtwcm9wXSA9IGxhYmVsUG9zW3Byb3BdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBsaW5rIHJlbmRlciBvYmplY3Rcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbGlua01hcFtub2RlLmluZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcblx0XHRcdHZhciBsaW5rT2JqS2V5ID0gbnVsbDtcblx0XHRcdGlmIChsaW5rLnNvdXJjZS5pbmRleCA9PT0gbm9kZS5pbmRleCkge1xuXHRcdFx0XHRsaW5rT2JqS2V5ID0gJ3NvdXJjZSc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsaW5rT2JqS2V5ID0gJ3RhcmdldCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdFx0bGluay50d2Vlbk9iaihsaW5rT2JqS2V5LCB7XG5cdFx0XHRcdFx0eDogeCxcblx0XHRcdFx0XHR5OiB5XG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRkdXJhdGlvbjogdGhhdC5fZHVyYXRpb24sXG5cdFx0XHRcdFx0ZWFzaW5nOiB0aGF0Ll9lYXNpbmdcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsaW5rW2xpbmtPYmpLZXldLnggPSB4O1xuXHRcdFx0XHRsaW5rW2xpbmtPYmpLZXldLnkgPSB5O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEZWZhdWx0IGxheW91dCByb3V0aW5lLiAgIFNob3VsZCBiZSBvdmVycmlkZW4gYnkgc3ViY2xhc3Nlcy5cblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24odyxoLGNhbGxiYWNrKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGZ1bmN0aW9uIG9uQ29tcGxldGUoKSB7XG5cdFx0XHR0aGF0Ll9ldmVudHNTdXNwZW5kZWQgPSBmYWxzZTtcblx0XHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IHRydWU7XG5cdFx0dmFyIGlzQXN5bmMgPSAhdGhpcy5fcGVyZm9ybUxheW91dCh3LGgpO1xuXHRcdGlmIChpc0FzeW5jKSB7XG5cdFx0XHRzZXRUaW1lb3V0KG9uQ29tcGxldGUsdGhpcy5kdXJhdGlvbigpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0b25Db21wbGV0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cdC8qKlxuXHQgKiBcdC8qKlxuXHQgKiBIb29rIGZvciBkb2luZyBhbnkgZHJhd2luZyBiZWZvcmUgcmVuZGVyaW5nIG9mIHRoZSBncmFwaCB0aGF0IGlzIGxheW91dCBzcGVjaWZpY1xuXHQgKiBpZS8gQmFja2dyb3VuZHMsIGV0Y1xuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gLSBhIGxpc3Qgb2YgcGF0aC5qcyByZW5kZXIgb2JqZWN0cyB0byBiZSBhZGRlZCB0byB0aGUgc2NlbmVcblx0ICovXG5cdHByZXJlbmRlciA6IGZ1bmN0aW9uKHcsaCkge1xuXHRcdHJldHVybiBbXTtcblx0fSxcblxuXHQvKipcblx0ICogSG9vayBmb3IgZG9pbmcgYW55IGRyYXdpbmcgYWZ0ZXIgcmVuZGVyaW5nIG9mIHRoZSBncmFwaCB0aGF0IGlzIGxheW91dCBzcGVjaWZpY1xuXHQgKiBpZS8gT3ZlcmxheXMsIGV0Y1xuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gLSBhIGxpc3Qgb2YgcGF0aC5qcyByZW5kZXIgb2JqZWN0cyB0byBiZSBhZGRlZCB0byB0aGUgc2NlbmVcblx0ICovXG5cdHBvc3RyZW5kZXIgOiBmdW5jdGlvbih3LGgpIHtcblx0XHRyZXR1cm4gW107XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxhYmVsIHBvc2l0aW9uIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVYIC0gdGhlIHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVZIC0gdGhlIHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHJhZGl1cyAtIHRoZSByYWRpdXMgb2YgdGhlIG5vZGVcblx0ICogQHJldHVybnMge3t4OiB4IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgeTogeSBwb3NpdGlvbiBvZiB0aGUgbGFiZWx9fVxuXHQgKi9cblx0bGF5b3V0TGFiZWwgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHg6IG5vZGUueCArIG5vZGUucmFkaXVzICsgNSxcblx0XHRcdHk6IG5vZGUueSArIG5vZGUucmFkaXVzICsgNVxuXHRcdH07XG5cdH1cbn0pO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7XG4iLCJ2YXIgTElOS19UWVBFID0ge1xuXHRERUZBVUxUIDogJ2xpbmUnLFxuXHRMSU5FIDogJ2xpbmUnLFxuXHRBUlJPVyA6ICdhcnJvdycsXG5cdEFSQyA6ICdhcmMnXG59O1xubW9kdWxlLmV4cG9ydHMgPSBMSU5LX1RZUEU7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMSU5LX1RZUEUgPSByZXF1aXJlKCcuL2xpbmtUeXBlJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcblxudmFyIFJFR1JPVU5EX0JCX1BBRERJTkcgPSAwO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBHcmFwaCByZW5kZXIgb2JqZWN0XG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEdyYXBoID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9ub2RlcyA9IFtdO1xuXHR0aGlzLl9saW5rcyA9IFtdO1xuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl9sYXlvdXRlciA9IG51bGw7XG5cdHRoaXMuX2dyb3VwaW5nTWFuYWdlciA9IG51bGw7XG5cdHRoaXMuX3dpZHRoID0gMDtcblx0dGhpcy5faGVpZ2h0ID0gMDtcblx0dGhpcy5fem9vbVNjYWxlID0gMS4wO1xuXHR0aGlzLl96b29tTGV2ZWwgPSAwO1xuXHR0aGlzLl9zY2VuZSA9IG51bGw7XG5cdHRoaXMuX3Nob3dBbGxMYWJlbHMgPSBmYWxzZTtcblx0dGhpcy5fcHJlcmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wYW5uYWJsZSA9IG51bGw7XG5cdHRoaXMuX3pvb21hYmxlID0gbnVsbDtcblx0dGhpcy5fZHJhZ2dhYmxlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE1vdmVTdGF0ZSA9IG51bGw7XG5cdHRoaXMuX2ludmVydGVkUGFuID0gMTtcblxuXHR0aGlzLl9mb250U2l6ZSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRGYW1pbHkgPSBudWxsO1xuXHR0aGlzLl9mb250Q29sb3IgPSBudWxsO1xuXHR0aGlzLl9mb250U3Ryb2tlID0gbnVsbDtcblx0dGhpcy5fZm9udFN0cm9rZVdpZHRoID0gbnVsbDtcblx0dGhpcy5fc2hhZG93Q29sb3IgPSBudWxsO1xuXHR0aGlzLl9zaGFkb3dPZmZzZXRYID0gbnVsbDtcblx0dGhpcy5fc2hhZG93T2Zmc2V0WSA9IG51bGw7XG5cdHRoaXMuX3NoYWRvd0JsdXIgPSBudWxsO1xuXG5cdC8vIERhdGEgdG8gcmVuZGVyIG9iamVjdCBtYXBzXG5cdHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUgPSB7fTtcblx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGUgPSB7fTtcblx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbCA9IHt9O1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5HcmFwaC5wcm90b3R5cGUgPSBfLmV4dGVuZChHcmFwaC5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZXMgLSBhbiBhcnJheSBvZiBub2Rlc1xuXHQgKiB7XG5cdCAqIFx0XHR4IDogdGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZVx0KHJlcXVpcmVkKVxuXHQgKiBcdFx0eSA6IHRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGVcdChyZXF1aXJlZClcblx0ICpcdFx0aW5kZXggOiAgYSB1bmlxdWUgaW5kZXhcdFx0XHRcdChyZXF1aXJlZClcblx0ICpcdFx0bGFiZWwgOiBhIGxhYmVsIGZvciB0aGUgbm9kZVx0XHQob3B0aW9uYWwpXG5cdCAqXHRcdGZpbGxTdHlsZSA6IGEgY2FudmFzIGZpbGwgICBcdFx0KG9wdGlvbmFsLCBkZWZhdWx0ICMwMDAwMDApXG5cdCAqXHRcdHN0cm9rZVN0eWxlIDogYSBjYW52YXMgc3Ryb2tlXHRcdChvcHRpb25hbCwgZGVmYXVsdCB1bmRlZmluZWQpXG5cdCAqXHRcdGxpbmVXaWR0aCA6IHdpZHRoIG9mIHRoZSBzdHJva2VcdFx0KG9wdGlvbmFsLCBkZWZhdWx0IDEpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgbm9kZXMgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHtHcmFwaC5fbm9kZXN9IG90aGVyd2lzZVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2RlcztcblxuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSA9IHt9O1xuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGUgPSB7fTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGFiZWwgPSB7fTtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdG5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW25vZGUuaW5kZXhdID0gW107XG5cdFx0XHR9KTtcblx0XHRcdGlmICh0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0XHR0aGlzLl9sYXlvdXRlci5ub2Rlcyhub2Rlcyk7XG5cdFx0XHR9XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlcyBmb3IgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBsaW5rcyAtIGFuIGFycmF5IG9mIGxpbmtzXG5cdCAqIHtcblx0ICogXHRcdHNvdXJjZSA6IGEgbm9kZSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGUgc291cmNlIFx0KHJlcXVpcmVkKVxuXHQgKiBcdFx0dGFyZ2V0IDogYSBub2RlIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoZSB0YXJnZXRcdChyZXF1aXJlZClcblx0ICpcdFx0c3Ryb2tlU3R5bGUgOiBhIGNhbnZhcyBzdHJva2VcdFx0XHRcdFx0XHQob3B0aW9uYWwsIGRlZmF1bHQgIzAwMDAwMClcblx0ICpcdFx0bGluZVdpZHRoIDogdGhlIHdpZHRoIG9mIHRoZSBzdHJva2VcdFx0XHRcdFx0KG9wdGluYWwsIGRlZmF1bHQgMSlcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBsaW5rcyBwYXJhbWV0ZXIgaXMgZGVmaW5lZCwge0dyYXBoLl9saW5rc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsaW5rcyA6IGZ1bmN0aW9uKGxpbmtzKSB7XG5cdFx0aWYgKGxpbmtzKSB7XG5cdFx0XHR0aGlzLl9saW5rcyA9IGxpbmtzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGlua3M7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGNhbnZhcyBmb3IgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBhbiBIVE1MIGNhbnZhcyBvYmplY3Rcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBjYW52YXMgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHRoZSBjYW52YXMgb3RoZXJ3aXNlXG5cdCAqL1xuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cblx0XHRcdHZhciB4LHk7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNlZG93bicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR4ID0gZS5jbGllbnRYO1xuXHRcdFx0XHR5ID0gZS5jbGllbnRZO1xuXHRcdFx0XHQkKHRoYXQuX2NhbnZhcykub24oJ21vdXNlbW92ZScsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHZhciBkeCA9IHggLSBlLmNsaWVudFg7XG5cdFx0XHRcdFx0dmFyIGR5ID0geSAtIGUuY2xpZW50WTtcblx0XHRcdFx0XHRpZiAodGhhdC5fZHJhZ2dhYmxlICYmIHRoYXQuX2N1cnJlbnRPdmVyTm9kZSAmJiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gbnVsbCB8fCB0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAnZHJhZ2dpbmcnKSkgIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSAnZHJhZ2dpbmcnO1xuXG5cdFx0XHRcdFx0XHQvLyBNb3ZlIHRoZSBub2RlXG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlKHRoYXQuX2N1cnJlbnRPdmVyTm9kZSwgdGhhdC5fY3VycmVudE92ZXJOb2RlLnggLSBkeCwgdGhhdC5fY3VycmVudE92ZXJOb2RlLnkgLSBkeSk7XG5cdFx0XHRcdFx0XHR0aGF0LnVwZGF0ZSgpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fcGFubmFibGUgJiYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09IG51bGwgfHwgdGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ3Bhbm5pbmcnKSkge1xuXHRcdFx0XHRcdFx0dGhhdC5fcGFuKC1keCp0aGF0Ll9pbnZlcnRlZFBhbiwtZHkqdGhhdC5faW52ZXJ0ZWRQYW4pO1xuXHRcdFx0XHRcdFx0dGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9ICdwYW5uaW5nJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0eCA9IGUuY2xpZW50WDtcblx0XHRcdFx0XHR5ID0gZS5jbGllbnRZO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNldXAnLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKHRoYXQuX2NhbnZhcykub2ZmKCdtb3VzZW1vdmUnKTtcblx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSBudWxsO1xuXHRcdFx0fSk7XG5cblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0IHdpZHRoXG5cdCAqIEByZXR1cm5zIFdpZHRoIGluIHBpeGVscyBvZiB0aGUgZ3JhcGhcblx0ICovXG5cdHdpZHRoIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NjZW5lLndpZHRoO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgaGVpZ2h0XG5cdCAqIEByZXR1cm5zIEhlaWdodCBpbiBwaXhlbHMgb2YgdGhlIGdyYXBoXG5cdCAqL1xuXHRoZWlnaHQgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2NlbmUuaGVpZ2h0O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBUb2dnbGVzIGJvb2xlYW4gZm9yIHNob3dpbmcvaGlkaW5nIGFsbCBsYWJlbHMgaW4gdGhlIGdyYXBoIGJ5IGRlZmF1bHRcblx0ICogQHBhcmFtIHNob3dBbGxMYWJlbHNcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRzaG93QWxsTGFiZWxzIDogZnVuY3Rpb24oc2hvd0FsbExhYmVscykge1xuXHRcdGlmIChzaG93QWxsTGFiZWxzKSB7XG5cdFx0XHR0aGlzLl9zaG93QWxsTGFiZWxzID0gc2hvd0FsbExhYmVscztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3Nob3dBbGxMYWJlbHM7XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX25vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0aWYgKHNob3dBbGxMYWJlbHMpIHtcblx0XHRcdFx0dGhhdC5hZGRMYWJlbChub2RlLG5vZGUubGFiZWxUZXh0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoYXQucmVtb3ZlTGFiZWwobm9kZSxub2RlLmxhYmVsVGV4dCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogQWRkcyBhIGxhYmVsIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICogQHBhcmFtIHRleHRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0YWRkTGFiZWwgOiBmdW5jdGlvbihub2RlLHRleHQpIHtcblx0XHRpZiAodGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XSkge1xuXHRcdFx0dGhpcy5yZW1vdmVMYWJlbChub2RlKTtcblx0XHR9XG5cdFx0dmFyIGxhYmVsQXR0cnMgPSB0aGlzLl9sYXlvdXRlci5sYXlvdXRMYWJlbChub2RlKTtcblxuXHRcdHZhciBmb250U2l6ZSA9IHR5cGVvZih0aGlzLl9mb250U2l6ZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U2l6ZShub2RlKSA6IHRoaXMuX2ZvbnRTaXplO1xuXHRcdGlmICghZm9udFNpemUpIHtcblx0XHRcdGZvbnRTaXplID0gMTA7XG5cdFx0fVxuXG5cdFx0dmFyIGZvbnRGYW1pbHkgPSB0eXBlb2YodGhpcy5fZm9udEZhbWlseSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250RmFtaWx5KG5vZGUpIDogdGhpcy5fZm9udEZhbWlseTtcblx0XHRpZiAoIWZvbnRGYW1pbHkpIHtcblx0XHRcdGZvbnRGYW1pbHkgPSAnc2Fucy1zZXJpZic7XG5cdFx0fVxuXHRcdHZhciBmb250U3RyID0gZm9udFNpemUgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cblx0XHR2YXIgZm9udEZpbGwgPSB0eXBlb2YodGhpcy5fZm9udENvbG9yKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRDb2xvcihub2RlKSA6IHRoaXMuX2ZvbnRDb2xvcjtcblx0XHRpZiAoIWZvbnRGaWxsKSB7XG5cdFx0XHRmb250RmlsbCA9ICcjMDAwMDAwJztcblx0XHR9XG5cdFx0dmFyIGZvbnRTdHJva2UgPSB0eXBlb2YodGhpcy5fZm9udFN0cm9rZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U3Ryb2tlKG5vZGUpIDogdGhpcy5fZm9udFN0cm9rZTtcblx0XHR2YXIgZm9udFN0cm9rZVdpZHRoID0gdHlwZW9mKHRoaXMuX2ZvbnRTdHJva2UpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udFN0cm9rZVdpZHRoIDogdGhpcy5fZm9udFN0cm9rZVdpZHRoO1xuXG5cdFx0dmFyIGxhYmVsU3BlYyA9IHtcblx0XHRcdGZvbnQ6IGZvbnRTdHIsXG5cdFx0XHRmaWxsU3R5bGU6IGZvbnRGaWxsLFxuXHRcdFx0c3Ryb2tlU3R5bGU6IGZvbnRTdHJva2UsXG5cdFx0XHRsaW5lV2lkdGg6IGZvbnRTdHJva2VXaWR0aCxcblx0XHRcdHRleHQgOiB0ZXh0XG5cdFx0fTtcblxuXHRcdHZhciBiQWRkU2hhZG93ID0gdGhpcy5fc2hhZG93Qmx1ciB8fCB0aGlzLl9zaGFkb3dPZmZzZXRYIHx8IHRoaXMuX3NoYWRvd09mZnNldFkgfHwgdGhpcy5fc2hhZG93Q29sb3I7XG5cdFx0aWYgKGJBZGRTaGFkb3cpIHtcblx0XHRcdGxhYmVsU3BlY1snc2hhZG93Q29sb3InXSA9IHRoaXMuX3NoYWRvd0NvbG9yIHx8ICcjMDAwJztcblx0XHRcdGxhYmVsU3BlY1snc2hhZG93T2Zmc2V0WCddID0gdGhpcy5fc2hhZG93T2Zmc2V0WCB8fCAwO1xuXHRcdFx0bGFiZWxTcGVjWydzaGFkb3dPZmZzZXRZJ10gPSB0aGlzLl9zaGFkb3dPZmZzZXRZIHx8IDA7XG5cdFx0XHRsYWJlbFNwZWNbJ3NoYWRvd0JsdXInXSA9IHRoaXMuX3NoYWRvd0JsdXIgfHwgTWF0aC5mbG9vcihmb250U2l6ZS8zKTtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gbGFiZWxBdHRycykge1xuXHRcdFx0aWYgKGxhYmVsQXR0cnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRsYWJlbFNwZWNba2V5XSA9IGxhYmVsQXR0cnNba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGxhYmVsID0gcGF0aC50ZXh0KGxhYmVsU3BlYyk7XG5cdFx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XSA9IGxhYmVsO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKGxhYmVsKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIGEgbGFiZWwgZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRyZW1vdmVMYWJlbCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHR2YXIgdGV4dE9iamVjdCA9IHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF07XG5cdFx0aWYgKHRleHRPYmplY3QpIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRleHRPYmplY3QpO1xuXHRcdFx0ZGVsZXRlIHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBtb3VzZW92ZXIgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlT3ZlciA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlT3ZlciA9IGNhbGxiYWNrLmJpbmQoc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIG1vdXNlb3V0IG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJyBpbiB0aGUgY2FsbGJhY2tcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZU91dCA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlT3V0ID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogQ29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIHNldHRpbmcgbm9kZU92ZXIvbm9kZU91dCBpbiBhIHNpbmdsZSBjYWxsXG5cdCAqIEBwYXJhbSBvdmVyIC0gdGhlIG5vZGVPdmVyIGV2ZW50IGhhbmRsZXJcblx0ICogQHBhcmFtIG91dCAtIHRoZSBub2RlT3V0IGV2ZW50IGhhbmRsZXJcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJyBpbiB0aGUgY2FsbGJhY2tcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZUhvdmVyIDogZnVuY3Rpb24ob3ZlcixvdXQsc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMubm9kZU92ZXIob3ZlcixzZWxmKTtcblx0XHR0aGlzLm5vZGVPdXQob3V0LHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBjbGljayBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycuICAgRGVmYXVsdHMgdG8gdGhlIGdyYXBoIG9iamVjdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlQ2xpY2sgOiBmdW5jdGlvbihjYWxsYmFjayxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5fbm9kZUNsaWNrID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGFuIHtHcmFwaH0gYnkgKGR4LGR5KS4gICBBdXRvbWF0aWNhbGx5IHJlcmVuZGVyIHRoZSBncmFwaC5cblx0ICogQHBhcmFtIGR4IC0gQW1vdW50IG9mIHBhbiBpbiB4IGRpcmVjdGlvblxuXHQgKiBAcGFyYW0gZHkgLSBBbW91bnQgb2YgcGFuIGluIHkgZGlyZWN0aW9uXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfcGFuIDogZnVuY3Rpb24oZHgsZHkpIHtcblx0XHR0aGlzLl9zY2VuZS54ICs9IGR4O1xuXHRcdHRoaXMuX3NjZW5lLnkgKz0gZHk7XG5cdFx0dGhpcy5fcGFuWCArPSBkeDtcblx0XHR0aGlzLl9wYW5ZICs9IGR5O1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Uge0dyYXBofSBwYW5uYWJsZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRwYW5uYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3Bhbm5hYmxlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogTWFrZXMgdGhlIGdyYXBoIHBhbiBpbiB0aGUgb3Bwb3NpdGUgZGlyZWN0aW9uIG9mIHRoZSBtb3VzZSBhcyBvcHBvc2VkIHRvIHdpdGggaXRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0aW52ZXJ0UGFuIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW52ZXJ0ZWRQYW4gPSAtMTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogTWFrZSBub2RlcyBpbiB7R3JhcGh9IHJlcG9pc2l0aW9uYWJsZSBieSBjbGljay1kcmFnZ2luZ1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRkcmFnZ2FibGUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9kcmFnZ2FibGUgPSB0cnVlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9nZXRab29tRm9yTGV2ZWwgOiBmdW5jdGlvbihsZXZlbCkge1xuXHRcdHZhciBmYWN0b3IgPSBNYXRoLnBvdygxLjUgLCBNYXRoLmFicyhsZXZlbCAtIHRoaXMuX3pvb21MZXZlbCkpO1xuXHRcdGlmIChsZXZlbCA8IHRoaXMuX3pvb21MZXZlbCkge1xuXHRcdFx0ZmFjdG9yID0gMS9mYWN0b3I7XG5cdFx0fVxuXHRcdHJldHVybiBmYWN0b3I7XG5cdH0sXG5cblx0X3pvb20gOiBmdW5jdGlvbihmYWN0b3IseCx5KSB7XG5cdFx0dGhpcy5fem9vbVNjYWxlICo9IGZhY3Rvcjtcblx0XHR0aGlzLl9sYXlvdXRlci5fem9vbVNjYWxlID0gdGhpcy5fem9vbVNjYWxlO1xuXG5cdFx0Ly8gUGFuIHNjZW5lIGJhY2sgdG8gb3JpZ2luXG5cdFx0dmFyIG9yaWdpbmFsWCA9IHRoaXMuX3NjZW5lLng7XG5cdFx0dmFyIG9yaWdpbmFsWSA9IHRoaXMuX3NjZW5lLnk7XG5cdFx0dGhpcy5fcGFuKC10aGlzLl9zY2VuZS54LC10aGlzLl9zY2VuZS55KTtcblxuXHRcdHZhciBtb3VzZVggPSB4IHx8IDA7XG5cdFx0dmFyIG1vdXNlWSA9IHkgfHwgMDtcblxuXHRcdC8vICdab29tJyBub2Rlcy4gICBXZSBkbyB0aGlzIHNvIHRleHQvcmFkaXVzIHNpemUgcmVtYWlucyBjb25zaXN0ZW50IGFjcm9zcyB6b29tIGxldmVsc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuX2xheW91dGVyLl9zZXROb2RlUG9zaXRpb24odGhpcy5fbm9kZXNbaV0sdGhpcy5fbm9kZXNbaV0ueCpmYWN0b3IsIHRoaXMuX25vZGVzW2ldLnkqZmFjdG9yLHRydWUpO1xuXHRcdH1cblxuXHRcdC8vIFpvb20gdGhlIHJlbmRlciBncm91cHNcblx0XHRpZiAodGhpcy5fcHJlcmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tU2NhbGU7XG5cdFx0fVxuXG5cdFx0Ly8gUmV2ZXJzZSB0aGUgJ29yaWdpbiBwYW4nIHdpdGggdGhlIHNjYWxlIGFwcGxpZWQgYW5kIHJlY2VudGVyIHRoZSBtb3VzZSB3aXRoIHNjYWxlIGFwcGxpZWQgYXMgd2VsbFxuXHRcdHZhciBuZXdNb3VzZVggPSBtb3VzZVgqZmFjdG9yO1xuXHRcdHZhciBuZXdNb3VzZVkgPSBtb3VzZVkqZmFjdG9yO1xuXHRcdHRoaXMuX3BhbihvcmlnaW5hbFgqZmFjdG9yIC0gKG5ld01vdXNlWC1tb3VzZVgpLG9yaWdpbmFsWSpmYWN0b3IgLSAobmV3TW91c2VZLW1vdXNlWSkpO1xuXG5cdFx0Ly8gVXBkYXRlIHRoZSByZWdyb3VwIHVuZGVybGF5c1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXAgJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4gJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLl9oYW5kbGVHcm91cC5yZW1vdmVBbGwoKTtcblx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0dGhhdC5fYWRkUmVncm91cEhhbmRsZXMoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Uge0dyYXBofSB6b29tYWJsZSBieSB1c2luZyB0aGUgbW91c2V3aGVlbFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHR6b29tYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy5fem9vbWFibGUpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2V3aGVlbCcsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgd2hlZWwgPSBlLm9yaWdpbmFsRXZlbnQud2hlZWxEZWx0YS8xMjA7Ly9uIG9yIC1uXG5cdFx0XHRcdHZhciBmYWN0b3I7XG5cdFx0XHRcdGlmICh3aGVlbCA8IDApIHtcblx0XHRcdFx0XHRmYWN0b3IgPSB0aGF0Ll9nZXRab29tRm9yTGV2ZWwodGhhdC5fem9vbUxldmVsLTEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZhY3RvciA9IHRoYXQuX2dldFpvb21Gb3JMZXZlbCh0aGF0Ll96b29tTGV2ZWwrMSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhhdC5fem9vbShmYWN0b3IsIGUub2Zmc2V0WCwgZS5vZmZzZXRZKTtcblxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLl96b29tYWJsZSA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBsYXlvdXQgZnVuY3Rpb24gZm9yIHRoZSBub2Rlc1xuXHQgKiBAcGFyYW0gbGF5b3V0ZXIgLSBBbiBpbnN0YW5jZSAob3Igc3ViY2xhc3MpIG9mIExheW91dFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlzIGxheW91dGVyIHBhcmFtIGlzIGRlZmluZWQsIHRoZSBsYXlvdXRlciBvdGhlcndpc2Vcblx0ICovXG5cdGxheW91dGVyIDogZnVuY3Rpb24obGF5b3V0ZXIpIHtcblx0XHRpZiAobGF5b3V0ZXIpIHtcblx0XHRcdHRoaXMuX2xheW91dGVyID0gbGF5b3V0ZXI7XG5cdFx0XHR0aGlzLl9sYXlvdXRlclxuXHRcdFx0XHQubm9kZXModGhpcy5fbm9kZXMpXG5cdFx0XHRcdC5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHRcdC5ub2RlTWFwKHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKVxuXHRcdFx0XHQubGFiZWxNYXAodGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9sYXlvdXRlcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFBlcmZvcm1zIGEgbGF5b3V0IG9mIHRoZSBncmFwaFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdGlmICh0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIubGF5b3V0KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHJlZ3JvdXAgdW5kZXJsYXlzXG5cdFx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXAgJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4pIHtcblx0XHRcdFx0dmFyIHVuZGVybGF5cyA9IHRoaXMuX2hhbmRsZUdyb3VwLmNoaWxkcmVuO1xuXHRcdFx0XHR2YXIgdXBkYXRlZCA9IDA7XG5cdFx0XHRcdHVuZGVybGF5cy5mb3JFYWNoKGZ1bmN0aW9uKHVuZGVybGF5KSB7XG5cdFx0XHRcdFx0dmFyIGluZGljZXMgPSB1bmRlcmxheS5ncmFwaGpzX2luZGljZXM7XG5cdFx0XHRcdFx0dmFyIGJiID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcyxSRUdST1VORF9CQl9QQURESU5HKTtcblx0XHRcdFx0XHR1bmRlcmxheS50d2VlbkF0dHIoe1xuXHRcdFx0XHRcdFx0eDogYmIueCxcblx0XHRcdFx0XHRcdHk6IGJiLnksXG5cdFx0XHRcdFx0XHR3aWR0aCA6IGJiLndpZHRoLFxuXHRcdFx0XHRcdFx0aGVpZ2h0IDogYmIuaGVpZ2h0XG5cdFx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2xheW91dGVyLmR1cmF0aW9uKCksXG5cdFx0XHRcdFx0XHRlYXNpbmc6IHRoYXQuX2xheW91dGVyLmVhc2luZygpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblxuXHRncm91cGluZ01hbmFnZXIgOiBmdW5jdGlvbihncm91cGluZ01hbmFnZXIpIHtcblx0XHRpZiAoZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR0aGlzLl9ncm91cGluZ01hbmFnZXIgPSBncm91cGluZ01hbmFnZXI7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2dyb3VwaW5nTWFuYWdlcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0aW5pdGlhbGl6ZUdyb3VwaW5nIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLm5vZGVzKHRoaXMuX25vZGVzKVxuXHRcdFx0XHQubGlua3ModGhpcy5fbGlua3MpXG5cdFx0XHRcdC5pbml0aWFsaXplSGVpcmFyY2h5KCk7XG5cblx0XHRcdHRoaXMubm9kZXModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWROb2RlcygpKTtcblx0XHRcdHRoaXMubGlua3ModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWRMaW5rcygpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0dW5ncm91cCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRpZiAoIW5vZGUgfHwgIW5vZGUuY2hpbGRyZW4pIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLnVuZ3JvdXAobm9kZSk7XG5cdFx0XHR0aGlzLmNsZWFyKClcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSlcblx0XHRcdFx0LmxpbmtzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSlcblx0XHRcdFx0LmRyYXcoKTtcblxuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKHRydWUpO1xuXHRcdFx0dGhpcy5sYXlvdXQoKTtcblx0XHRcdHRoaXMuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZShmYWxzZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHJlZ3JvdXAgOiBmdW5jdGlvbih1bmdyb3VwZWRBZ2dyZWdhdGVLZXkpIHtcblx0XHQvLyBBbmltYXRlIHRoZSByZWdyb3VwXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBwYXJlbnRBZ2dyZWdhdGUgPSB0aGlzLl9ncm91cGluZ01hbmFnZXIuZ2V0QWdncmVnYXRlKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSk7XG5cblx0XHR2YXIgYXZnUG9zID0geyB4OiAwLCB5IDogMH07XG5cdFx0cGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdGF2Z1Bvcy54ICs9IGNoaWxkLng7XG5cdFx0XHRhdmdQb3MueSArPSBjaGlsZC55O1xuXHRcdH0pO1xuXHRcdGF2Z1Bvcy54IC89IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGg7XG5cdFx0YXZnUG9zLnkgLz0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmxlbmd0aDtcblxuXHRcdHZhciBpbmRleE9mQ2hpbGRyZW4gPSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubWFwKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5fYWdncmVnYXRlZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9ncm91cGluZ01hbmFnZXIuX2FnZ3JlZ2F0ZWROb2Rlc1tpXS5pbmRleCA9PT0gY2hpbGQuaW5kZXgpIHtcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBtaW5DaGlsZEluZGV4ID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRpbmRleE9mQ2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihpZHgpIHtcblx0XHRcdG1pbkNoaWxkSW5kZXggPSBNYXRoLm1pbihtaW5DaGlsZEluZGV4LGlkeCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgYW5pbWF0ZWRSZWdyb3VwZWQgPSAwO1xuXHRcdHRoaXMuX3N1c3BlbmRFdmVudHMoKTtcdFx0XHQvLyBsYXlvdXQgd2lsbCByZXN1bWUgdGhlbVxuXHRcdHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHR0aGF0Ll9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uKGNoaWxkLGF2Z1Bvcy54LGF2Z1Bvcy55LGZhbHNlLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhbmltYXRlZFJlZ3JvdXBlZCsrO1xuXHRcdFx0XHRpZiAoYW5pbWF0ZWRSZWdyb3VwZWQgPT09IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHRcdFx0XHR2YXIgcmVncm91cGVkQWdncmVnYXRlID0gdGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLnJlZ3JvdXAodW5ncm91cGVkQWdncmVnYXRlS2V5LG1pbkNoaWxkSW5kZXgpO1xuXHRcdFx0XHRcdFx0cmVncm91cGVkQWdncmVnYXRlLnggPSBhdmdQb3MueDtcblx0XHRcdFx0XHRcdHJlZ3JvdXBlZEFnZ3JlZ2F0ZS55ID0gYXZnUG9zLnk7XG5cdFx0XHRcdFx0XHR0aGF0LmNsZWFyKClcblx0XHRcdFx0XHRcdFx0Lm5vZGVzKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSlcblx0XHRcdFx0XHRcdFx0LmxpbmtzKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSk7XG5cdFx0XHRcdFx0XHR0aGF0LmRyYXcoKTtcblx0XHRcdFx0XHRcdHRoYXQuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZSh0cnVlKTtcblx0XHRcdFx0XHRcdHRoYXQubGF5b3V0KCk7XG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUoZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IHNpemUgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udFNpemUgLSBzaXplIG9mIHRoZSBmb250IGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRTaXplIHBhcmFtIGlzIGRlaWZuZWQsIHtHcmFwaC5fZm9udFNpemV9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udFNpemUgOiBmdW5jdGlvbihmb250U2l6ZSkge1xuXHRcdGlmIChmb250U2l6ZSkge1xuXHRcdFx0dGhpcy5fZm9udFNpemUgPSBmb250U2l6ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTaXplO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGNvbG91ciBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250Q29sb3VyIC0gQSBoZXggc3RyaW5nIGZvciB0aGUgY29sb3VyIG9mIHRoZSBsYWJlbHNcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250Q29sb3VyIHBhcmFtIGlzIGRlaWZuZWQsIHtHcmFwaC5fZm9udENvbG91cn0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250Q29sb3VyIDogZnVuY3Rpb24oZm9udENvbG91cikge1xuXHRcdGlmIChmb250Q29sb3VyKSB7XG5cdFx0XHR0aGlzLl9mb250Q29sb3IgPSBmb250Q29sb3VyO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udENvbG9yO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IHN0cm9rZSBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250U3Ryb2tlIC0gQSBoZXggc3RyaW5nIGZvciB0aGUgY29sb3Igb2YgdGhlIGxhYmVsIHN0cm9rZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRTdHJva2UgcGFyYW0gaXMgZGVmaW5lZCwge0dyYXBoLl9mb250U3Ryb2tlfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTdHJva2UgOiBmdW5jdGlvbihmb250U3Ryb2tlKSB7XG5cdFx0aWYgKGZvbnRTdHJva2UpIHtcblx0XHRcdHRoaXMuX2ZvbnRTdHJva2UgPSBmb250U3Ryb2tlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udFN0cm9rZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzdHJva2Ugd2lkdGggZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udFN0cm9rZVdpZHRoIC0gc2l6ZSBpbiBwaXhlbHNcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U3Ryb2tlV2lkdGggcGFyYW0gaXMgZGVmaW5lZCwge0dyYXBoLl9mb250U3Ryb2tlV2lkdGh9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udFN0cm9rZVdpZHRoIDogZnVuY3Rpb24oZm9udFN0cm9rZVdpZHRoKSB7XG5cdFx0aWYgKGZvbnRTdHJva2VXaWR0aCkge1xuXHRcdFx0dGhpcy5fZm9udFN0cm9rZVdpZHRoID0gZm9udFN0cm9rZVdpZHRoO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udFN0cm9rZVdpZHRoO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IGZhbWlseSBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250RmFtaWx5IC0gQSBzdHJpbmcgZm9yIHRoZSBmb250IGZhbWlseSAoYSBsYSBIVE1MNSBDYW52YXMpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udEZhbWlseSBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRGYW1pbHl9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udEZhbWlseSA6IGZ1bmN0aW9uKGZvbnRGYW1pbHkpIHtcblx0XHRpZiAoZm9udEZhbWlseSkge1xuXHRcdFx0dGhpcy5fZm9udEZhbWlseSA9IGZvbnRGYW1pbHk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250RmFtaWx5O1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmb250U2hhZG93IDogZnVuY3Rpb24oY29sb3Isb2Zmc2V0WCxvZmZzZXRZLGJsdXIpIHtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y29sb3I6IHRoaXMuX3NoYWRvd0NvbG9yLFxuXHRcdFx0XHRvZmZzZXRYOiB0aGlzLl9zaGFkb3dPZmZzZXRYLFxuXHRcdFx0XHRvZmZzZXRZOiB0aGlzLl9zaGFkb3dPZmZzZXRZLFxuXHRcdFx0XHRibHVyOiB0aGlzLl9zaGFkb3dCbHVyXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9zaGFkb3dDb2xvciA9IGNvbG9yO1xuXHRcdFx0dGhpcy5fc2hhZG93T2Zmc2V0WCA9IG9mZnNldFg7XG5cdFx0XHR0aGlzLl9zaGFkb3dPZmZzZXRZID0gb2Zmc2V0WTtcblx0XHRcdHRoaXMuX3NoYWRvd0JsdXIgPSBibHVyO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXNpemUgdGhlIGdyYXBoLiAgQXV0b21hdGljYWxseSBwZXJmb3JtcyBsYXlvdXQgYW5kIHJlcmVuZGVycyB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIHcgLSB0aGUgbmV3IHdpZHRoXG5cdCAqIEBwYXJhbSBoIC0gdGhlIG5ldyBoZWlnaHRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0cmVzaXplIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0dGhpcy5fd2lkdGggPSB3O1xuXHRcdHRoaXMuX2hlaWdodCA9IGg7XG5cdFx0JCh0aGlzLl9jYW52YXMpLmF0dHIoe3dpZHRoOncsaGVpZ2h0Omh9KVxuXHRcdFx0LndpZHRoKHcpXG5cdFx0XHQuaGVpZ2h0KGgpO1xuXHRcdHRoaXMuX3NjZW5lLnJlc2l6ZSh3LGgpO1xuXG5cdFx0aWYgKCF0aGlzLl9wYW5uYWJsZSAmJiAhdGhpcy5fem9vbWFibGUpIHtcblx0XHRcdHRoaXMubGF5b3V0KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyBhIGxpc3Qgb2YgcHJlL3Bvc3QgcmVuZGVyIG9iamVjdHMgZnJvbSB0aGUgbGF5b3V0ZXIgKGlmIGFueSlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZGRQcmVBbmRQb3N0UmVuZGVyT2JqZWN0cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnJlbW92ZUFsbCgpO1xuXG5cdFx0Ly8gR2V0IHRoZSBiYWNrZ3JvdW5kIG9iamVjdHMgZnJvbSB0aGUgbGF5b3V0ZXJcblx0XHR2YXIgb2JqcyA9IHRoaXMuX2xheW91dGVyLnByZXJlbmRlcih0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAob2Jqcykge1xuXHRcdFx0b2Jqcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlck9iamVjdCkge1xuXHRcdFx0XHR0aGF0Ll9wcmVyZW5kZXJHcm91cC5hZGRDaGlsZChyZW5kZXJPYmplY3QpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnJlbW92ZUFsbCgpO1xuXHRcdG9ianMgPSB0aGlzLl9sYXlvdXRlci5wb3N0cmVuZGVyKHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdFx0aWYgKG9ianMpIHtcblx0XHRcdG9ianMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJPYmplY3QpIHtcblx0XHRcdFx0dGhhdC5fcG9zdHJlbmRlckdyb3VwLmFkZENoaWxkKHJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblx0X2FkZFJlZ3JvdXBIYW5kbGVzIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHZhciB1bmdyb3VwZWROb2RlSW5mbyA9IHRoaXMuX2dyb3VwaW5nTWFuYWdlci5nZXRVbmdyb3VwZWROb2RlcygpO1xuXHRcdFx0dW5ncm91cGVkTm9kZUluZm8uZm9yRWFjaChmdW5jdGlvbih1bmdyb3VwZWROb2RlKSB7XG5cdFx0XHRcdHZhciBpbmRpY2VzID0gdW5ncm91cGVkTm9kZS5pbmRpY2VzO1xuXHRcdFx0XHR2YXIga2V5ID0gdW5ncm91cGVkTm9kZS5rZXk7XG5cdFx0XHRcdHZhciBiYm94ID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcyxSRUdST1VORF9CQl9QQURESU5HKTtcblx0XHRcdFx0dmFyIGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0ID0gcGF0aC5yZWN0KHtcblx0XHRcdFx0XHR4IDogYmJveC54LFxuXHRcdFx0XHRcdHkgOiBiYm94LnksXG5cdFx0XHRcdFx0Z3JhcGhqc190eXBlIDogJ3JlZ3JvdXBfdW5kZXJsYXknLFxuXHRcdFx0XHRcdGdyYXBoanNfaW5kaWNlcyA6IGluZGljZXMsXG5cdFx0XHRcdFx0d2lkdGggOiBiYm94LndpZHRoLFxuXHRcdFx0XHRcdGhlaWdodCA6IGJib3guaGVpZ2h0LFxuXHRcdFx0XHRcdHN0cm9rZVN0eWxlIDogJyMyMzIzMjMnLFxuXHRcdFx0XHRcdGZpbGxTdHlsZSA6ICcjMDAwMDAwJyxcblx0XHRcdFx0XHRvcGFjaXR5IDogMC4xXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRib3VuZGluZ0JveFJlbmRlck9iamVjdC5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRoYXQucmVncm91cChrZXkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhhdC5faGFuZGxlR3JvdXAuYWRkQ2hpbGQoYm91bmRpbmdCb3hSZW5kZXJPYmplY3QpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlZHJhdyB0aGUgZ3JhcGhcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0dXBkYXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERyYXcgdGhlIGdyYXBoLiAgIE9ubHkgbmVlZHMgdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBub2Rlcy9saW5rcyBoYXZlIGJlZW4gc2V0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGRyYXcgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cblx0XHRpZiAoIXRoaXMuX3NjZW5lKSB7XG5cdFx0XHR0aGlzLl9zY2VuZSA9IHBhdGgodGhpcy5fY2FudmFzKTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0dmFyIGRlZmF1bExheW91dCA9IG5ldyBMYXlvdXQoKVxuXHRcdFx0XHQubm9kZXModGhpcy5fbm9kZXMpXG5cdFx0XHRcdC5ub2RlTWFwKHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKVxuXHRcdFx0XHQubGlua01hcCh0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lKVxuXHRcdFx0XHQubGFiZWxNYXAodGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0XHR0aGlzLmxheW91dGVyKGRlZmF1bExheW91dCk7XG5cdFx0fVxuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwID0gcGF0aC5ncm91cCgpO1xuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVZID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9oYW5kbGVHcm91cCA9IHBhdGguZ3JvdXAoKTtcblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAgPSBwYXRoLmdyb3VwKHtub0hpdDp0cnVlfSk7XG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5fYWRkUHJlQW5kUG9zdFJlbmRlck9iamVjdHMoKTtcblxuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX3ByZXJlbmRlckdyb3VwKTtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9oYW5kbGVHcm91cCk7XG5cdFx0dGhpcy5fbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cblx0XHRcdHZhciBsaW5rT2JqZWN0O1xuXHRcdFx0aWYgKCFsaW5rLnR5cGUpIHtcblx0XHRcdFx0bGluay50eXBlID0gTElOS19UWVBFLkRFRkFVTFQ7XG5cdFx0XHR9XG5cdFx0XHRzd2l0Y2gobGluay50eXBlKSB7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkFSUk9XOlxuXHRcdFx0XHRcdGxpbmsuaGVhZE9mZnNldCA9IGxpbmsudGFyZ2V0LnJhZGl1cztcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5hcnJvdyhsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuQVJDOlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmFyYyhsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuTElORTpcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuREVGQVVMVDpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5saW5lKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmxpbmUobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW2xpbmsuc291cmNlLmluZGV4XS5wdXNoKGxpbmtPYmplY3QpO1xuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtsaW5rLnRhcmdldC5pbmRleF0ucHVzaChsaW5rT2JqZWN0KTtcblxuXHRcdFx0dGhhdC5fc2NlbmUuYWRkQ2hpbGQobGlua09iamVjdCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLl9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBjaXJjbGUgPSBwYXRoLmNpcmNsZShub2RlKTtcblx0XHRcdHRoYXQuX25vZGVJbmRleFRvQ2lyY2xlW25vZGUuaW5kZXhdID0gY2lyY2xlO1xuXHRcdFx0aWYgKHRoYXQuX25vZGVPdmVyIHx8IHRoYXQuX2RyYWdnYWJsZSkge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdtb3VzZW92ZXInKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCgpKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3Zlcikge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU92ZXIoY2lyY2xlLCBlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBjaXJjbGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0IHx8IHRoYXQuX2RyYWdnYWJsZSkge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdtb3VzZW91dCcpO1xuXHRcdFx0XHRjaXJjbGUub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSE9PSdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0KSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ub2RlT3V0KGNpcmNsZSwgZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlQ2xpY2spIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignY2xpY2snKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKCkpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0dGhhdC5fbm9kZUNsaWNrKGNpcmNsZSxlKTtcblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdjbGljaycpO1xuXHRcdFx0XHRjaXJjbGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQoKSkgeyByZXR1cm47IH1cblx0XHRcdFx0XHR0aGF0LnVuZ3JvdXAoY2lyY2xlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGF0Ll9zY2VuZS5hZGRDaGlsZChjaXJjbGUpO1xuXG5cdFx0XHRpZiAobm9kZS5sYWJlbCkge1xuXHRcdFx0XHR0aGF0LmFkZExhYmVsKG5vZGUsbm9kZS5sYWJlbCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAodGhpcy5zaG93QWxsTGFiZWxzKCkpIHtcblx0XHRcdHRoaXMuc2hvd0FsbExhYmVscyh0cnVlKTtcblx0XHR9XG5cblx0XHR0aGlzLl9sYXlvdXRlci5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblxuXHRcdC8vIERyYXcgYW55IHVuZ3JvdXBlZCBub2RlIGJvdW5kaW5nIGJveGVzXG5cdFx0dGhpcy5fYWRkUmVncm91cEhhbmRsZXMoKTtcblxuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9kZWJ1Z0RyYXdCb3VuZGluZ0JveCA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzKTtcblx0XHRpZiAodGhpcy5fYmJSZW5kZXIpIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX2JiUmVuZGVyKTtcblx0XHR9XG5cdFx0dGhpcy5fYmJSZW5kZXIgPSBwYXRoLnJlY3Qoe1xuXHRcdFx0eCA6IGJvdW5kaW5nQm94LngsXG5cdFx0XHR5IDogYm91bmRpbmdCb3gueSxcblx0XHRcdHdpZHRoIDogYm91bmRpbmdCb3gud2lkdGgsXG5cdFx0XHRoZWlnaHQgOiBib3VuZGluZ0JveC5oZWlnaHQsXG5cdFx0XHRzdHJva2VTdHlsZSA6ICcjZmYwMDAwJyxcblx0XHRcdGxpbmVXaWR0aCA6IDJcblx0XHR9KTtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9iYlJlbmRlcik7XG5cdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEZpdCB0aGUgZ3JhcGggdG8gdGhlIHNjcmVlblxuXHQgKi9cblx0Zml0IDogZnVuY3Rpb24ocGFkZGluZykge1xuXG5cdFx0Ly8gUmV0dXJuIGJhY2sgdG8gb3JpZ2luXG5cdFx0dGhpcy5fcGFuKC10aGlzLl9zY2VuZS54LC10aGlzLl9zY2VuZS55KTtcblxuXG5cblx0XHQvLyBXb3JraW5nIHdpdGggYmlnIG51bWJlcnMsIGl0J3MgYmV0dGVyIGlmIHdlIGRvIHRoaXMgdHdpY2UuXG5cdFx0dmFyIGJvdW5kaW5nQm94O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMjsgaSsrKSB7XG5cdFx0XHRib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzLHBhZGRpbmcpO1xuXHRcdFx0dmFyIHhSYXRpbyA9IHRoaXMuX3NjZW5lLndpZHRoIC8gYm91bmRpbmdCb3gud2lkdGg7XG5cdFx0XHR2YXIgeVJhdGlvID0gdGhpcy5fc2NlbmUuaGVpZ2h0IC8gYm91bmRpbmdCb3guaGVpZ2h0O1xuXHRcdFx0dGhpcy5fem9vbShNYXRoLm1pbih4UmF0aW8sIHlSYXRpbyksIDAsIDApO1xuXHRcdH1cblxuXHRcdHZhciBtaWRTY3JlZW5YID0gdGhpcy5fc2NlbmUud2lkdGggLyAyO1xuXHRcdHZhciBtaWRTY3JlZW5ZID0gdGhpcy5fc2NlbmUuaGVpZ2h0IC8gMjtcblx0XHRib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzKTtcblx0XHR2YXIgbWlkQkJYID0gYm91bmRpbmdCb3gueCArIGJvdW5kaW5nQm94LndpZHRoIC8gMjtcblx0XHR2YXIgbWlkQkJZID0gYm91bmRpbmdCb3gueSArIGJvdW5kaW5nQm94LmhlaWdodCAvIDI7XG5cdFx0dGhpcy5fcGFuKC0obWlkQkJYLW1pZFNjcmVlblgpLC0obWlkQkJZLW1pZFNjcmVlblkpKTtcblxuXHRcdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0XHR0aGlzLl9sYXlvdXRlci5fem9vbVNjYWxlID0gMS4wO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFN1c3BlbmQgbW91c2UgZXZlbnRzIGFuZCB6b29taW5nXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc3VzcGVuZEV2ZW50cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2xheW91dGVyLl9ldmVudHNTdXNwZW5kZWQgPSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiByZXN1bWUgbW91c2UgZXZlbnRzIGFuZCB6b29taW5nXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfcmVzdW1lRXZlbnRzIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fbGF5b3V0ZXIuX2V2ZW50c1N1c3BlbmRlZCA9IGZhbHNlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBRdWVyeSBldmVudCBzdXNwZW5zaW9uIHN0YXR1c1xuXHQgKiBAcmV0dXJucyBib29sZWFuXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfZXZlbnRzU3VzcGVuZGVkIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2xheW91dGVyLl9ldmVudHNTdXNwZW5kZWQ7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgYWxsIHJlbmRlciBvYmplY3RzIGFzc29jaWF0ZWQgd2l0aCBhIGdyYXBoLlxuXHQgKi9cblx0Y2xlYXIgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcmVtb3ZlUmVuZGVyT2JqZWN0cyA9IGZ1bmN0aW9uKGluZGV4VG9PYmplY3QpIHtcblx0XHRcdGZvciAodmFyIGtleSBpbiBpbmRleFRvT2JqZWN0KSB7XG5cdFx0XHRcdGlmIChpbmRleFRvT2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHR2YXIgb2JqID0gaW5kZXhUb09iamVjdFtrZXldO1xuXHRcdFx0XHRcdGlmICgkLmlzQXJyYXkob2JqKSkge1xuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQob2JqW2ldKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZGVsZXRlIGluZGV4VG9PYmplY3Rba2V5XTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpO1xuXHRcdHJlbW92ZVJlbmRlck9iamVjdHMuY2FsbCh0aGlzLHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpO1xuXHRcdHJlbW92ZVJlbmRlck9iamVjdHMuY2FsbCh0aGlzLHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXHRcdGlmICh0aGlzLl9wcmVyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5fcHJlcmVuZGVyR3JvdXApO1xuXHRcdH1cblx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXApIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX2hhbmRsZUdyb3VwKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5fcG9zdHJlbmRlckdyb3VwKTtcblx0XHR9XG5cdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn0pO1xuXG5cbmV4cG9ydHMuTElOS19UWVBFID0gcmVxdWlyZSgnLi9saW5rVHlwZScpO1xuZXhwb3J0cy5Hcm91cGluZ01hbmFnZXIgPSByZXF1aXJlKCcuL2dyb3VwaW5nTWFuYWdlcicpO1xuZXhwb3J0cy5MYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuZXhwb3J0cy5Db2x1bW5MYXlvdXQgPSByZXF1aXJlKCcuL2NvbHVtbkxheW91dCcpO1xuZXhwb3J0cy5SYWRpYWxMYXlvdXQgPSByZXF1aXJlKCcuL3JhZGlhbExheW91dCcpO1xuZXhwb3J0cy5FeHRlbmQgPSBfLmV4dGVuZDtcbmV4cG9ydHMuR3JhcGggPSBHcmFwaDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG4vKipcbiAqXG4gKiBAcGFyYW0gZm9jdXMgLSB0aGUgbm9kZSBhdCB0aGUgY2VudGVyIG9mIHRoZSByYWRpYWwgbGF5b3V0XG4gKiBAcGFyYW0gZGlzdGFuY2UgLSB0aGUgZGlzdGFuY2Ugb2Ygb3RoZXIgbm9kZXMgZnJvbSB0aGUgZm9jdXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSYWRpYWxMYXlvdXQoZm9jdXMsZGlzdGFuY2UpIHtcblx0dGhpcy5fZm9jdXMgPSBmb2N1cztcblx0dGhpcy5fZGlzdGFuY2UgPSBkaXN0YW5jZTtcblxuXHRMYXlvdXQuYXBwbHkodGhpcyk7XG59XG5cblxuUmFkaWFsTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKFJhZGlhbExheW91dC5wcm90b3R5cGUsIExheW91dC5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZGlzdGFuY2UgcGFyYW1ldGVyXG5cdCAqIEBwYXJhbSBkaXN0YW5jZSAtIHRoZSBkaXN0YW5jZSBvZiBsaW5rcyBmcm9tIHRoZSBmb2N1cyBub2RlIHRvIG90aGVyIG5vZGVzIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7UmFkaWFsTGF5b3V0fSBpZiBkaXN0YW5jZSBwYXJhbSBpcyBkZWZpbmVkLCB7UmFkaWFsTGF5b3V0Ll9kaXN0YW5jZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRkaXN0YW5jZTogZnVuY3Rpb24gKGRpc3RhbmNlKSB7XG5cdFx0aWYgKGRpc3RhbmNlKSB7XG5cdFx0XHR0aGlzLl9kaXN0YW5jZSA9IGRpc3RhbmNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZGlzdGFuY2U7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvY3VzIG5vZGUgdGhhdCBpcyBhdCB0aGUgY2VudGVyIG9mIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGZvY3VzIC0gdGhlIG5vZGUgdGhhdCBpcyBhdCB0aGUgY2VudGVyIG9mIHRoZSBsYXlvdXQuICAgT3RoZXIgbm9kZXMgYXJlIGNlbnRlcmVkIGFyb3VuZCB0aGlzLlxuXHQgKiBAcmV0dXJucyB7UmFkaWFsTGF5b3V0fSBpZiBmb2N1cyBwYXJhbSBpcyBkZWZpbmVkLCB7UmFkaWFsTGF5b3V0Ll9mb2N1c30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb2N1czogZnVuY3Rpb24gKGZvY3VzKSB7XG5cdFx0aWYgKGZvY3VzKSB7XG5cdFx0XHR0aGlzLl9mb2N1cyA9IGZvY3VzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9jdXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgdGhlIGxhYmVsIHBvc2l0aW9uIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVYIC0gdGhlIHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVZIC0gdGhlIHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHJhZGl1cyAtIHRoZSByYWRpdXMgb2YgdGhlIG5vZGVcblx0ICogQHJldHVybnMge3t4OiB4IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgeTogeSBwb3NpdGlvbiBvZiB0aGUgbGFiZWwsIGFsaWduOiBIVE1MIGNhbnZhcyB0ZXh0IGFsaWdubWVudCBwcm9wZXJ0eSBmb3IgbGFiZWx9fVxuXHQgKi9cblx0bGF5b3V0TGFiZWw6IGZ1bmN0aW9uIChub2RlWCwgbm9kZVksIHJhZGl1cykge1xuXHRcdHZhciB4LCB5LCBhbGlnbjtcblxuXHRcdC8vIFJpZ2h0IG9mIGNlbnRlclxuXHRcdGlmIChub2RlWCA+IHRoaXMuX2ZvY3VzKSB7XG5cdFx0XHR4ID0gbm9kZVggKyAocmFkaXVzICsgMTApO1xuXHRcdFx0YWxpZ24gPSAnc3RhcnQnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR4ID0gbm9kZVggLSAocmFkaXVzICsgMTApO1xuXHRcdFx0YWxpZ24gPSAnZW5kJztcblx0XHR9XG5cblx0XHRpZiAobm9kZVkgPiB0aGlzLl9mb2N1cykge1xuXHRcdFx0eSA9IG5vZGVZICsgKHJhZGl1cyArIDEwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0eSA9IG5vZGVZIC0gKHJhZGl1cyArIDEwKTtcblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdHg6IHgsXG5cdFx0XHR5OiB5LFxuXHRcdFx0YWxpZ246IGFsaWduXG5cdFx0fTtcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybSBhIHJhZGlhbCBsYXlvdXRcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKi9cblx0bGF5b3V0OiBmdW5jdGlvbiAodywgaCkge1xuXHRcdHZhciBub2RlcyA9IHRoaXMubm9kZXMoKTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dmFyIGFuZ2xlRGVsdGEgPSBNYXRoLlBJICogMiAvIChub2Rlcy5sZW5ndGggLSAxKTtcblx0XHR2YXIgYW5nbGUgPSAwLjA7XG5cdFx0bm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuXHRcdFx0aWYgKG5vZGUuaW5kZXggPT09IHRoYXQuX2ZvY3VzLmluZGV4KSB7XG5cdFx0XHRcdHRoYXQuX3NldE5vZGVQb3NpdGlvbihub2RlLCBub2RlLngsIG5vZGUueSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBuZXdYID0gdGhhdC5fZm9jdXMueCArIChNYXRoLmNvcyhhbmdsZSkgKiB0aGF0Ll9kaXN0YW5jZSk7XG5cdFx0XHR2YXIgbmV3WSA9IHRoYXQuX2ZvY3VzLnkgKyAoTWF0aC5zaW4oYW5nbGUpICogdGhhdC5fZGlzdGFuY2UpO1xuXHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUsIG5ld1gsIG5ld1kpO1xuXHRcdFx0YW5nbGUgKz0gYW5nbGVEZWx0YTtcblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmFkaWFsTGF5b3V0O1xuIiwiXG52YXIgVXRpbCA9IHtcblxuICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcbiAgICB2YXIga2V5LCBpLCBzb3VyY2U7XG4gICAgZm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlc3Q7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(5)
});
