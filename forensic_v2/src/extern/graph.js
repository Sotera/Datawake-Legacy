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

		for (var sourceAggregateId in aggregateLinkMap) {
			if (aggregateLinkMap.hasOwnProperty(sourceAggregateId)) {
				for (var targetAggregateId in aggregateLinkMap[sourceAggregateId]) {
					if (aggregateLinkMap[sourceAggregateId].hasOwnProperty(targetAggregateId)) {
						var source = that._aggregateNodeMap[sourceAggregateId];
						var target = that._aggregateNodeMap[targetAggregateId];
						var originalLinks = aggregateLinkMap[sourceAggregateId][targetAggregateId];
						var link = that._createAggregateLink(source, target, originalLinks);
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
	this._isUpdate = false;
	this._zoomScale = 1.0;
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
			var labelPos = this.layoutLabel(node);
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
		var isAsync = !this._performLayout(w,h);
		if (isAsync) {
			setTimeout(callback,this.duration());
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

	// Data to render object maps
	this._nodeIndexToLinkLine = {};
	this._nodeIndexToCircle = {};
	this._nodeIndexToLabel = {};

	this._eventsSuspended = false;

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
		if (this._handleGroup && this._handleGroup.children) {
			var underlays = this._handleGroup.children;
			underlays.forEach(function(underlay) {
				that._handleGroup.removeChild(underlay);
			});
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
			this._layouter.layout(this._canvas.width,this._canvas.height,callback);


			// Update the regroup underlays
			var that = this;
			if (this._handleGroup && this._handleGroup.children) {
				var underlays = this._handleGroup.children;
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
			this._suspendEvents();
			this.clear()
				.nodes(this._groupingManager.aggregatedNodes())
				.links(this._groupingManager.aggregatedLinks())
				.draw();

			this._layouter._applyZoomScale(true);
			this.layout(function() {
					that._resumeEvents();
			});
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
		parentAggregate.children.forEach(function(child) {
			that._layouter._setNodePosition(child,avgPos.x,avgPos.y,false,function() {
				animatedRegrouped++;
				if (animatedRegrouped === parentAggregate.children.length) {
					if (that._groupingManager) {
						that._groupingManager.regroup(ungroupedAggregateKey,minChildIndex);
						that.clear()
							.nodes(that._groupingManager.aggregatedNodes())
							.links(that._groupingManager.aggregatedLinks());
						that.draw();
						that.layout();
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
					that._suspendEvents();
					that.regroup(key);
					that._resumeEvents();
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
					if (that._eventsSuspended) { return; }
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
					if (that._eventsSuspended) { return; }
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
					if (that._eventsSuspended) { return; }
					that._nodeClick(circle,e);
					that._scene.update();
				});
			} else if (that._groupingManager) {
				circle.off('click');
				circle.on('click', function(e) {
					if (that._eventsSuspended) { return; }
					that.ungroup(circle);
				});
			}
			that._scene.addChild(circle);

			if (node.label) {
				that.addLabel(node,node.label);
			}
		});

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

	_suspendEvents : function() {
		this._eventsSuspended = true;
	},

	_resumeEvents : function() {
		this._eventsSuspended = false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvY29sdW1uTGF5b3V0LmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbGlua1R5cGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9yYWRpYWxMYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2o1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcblxudmFyIENvbHVtbkxheW91dCA9IGZ1bmN0aW9uKCkge1xuXHRMYXlvdXQuYXBwbHkodGhpcyk7XG59O1xuXG5Db2x1bW5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoQ29sdW1uTGF5b3V0LnByb3RvdHlwZSwgTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBBIGNvbHVtbiBsYXlvdXRcblx0ICogQHBhcmFtIHcgLSB3aWR0aCBvZiBjYW52YXNcblx0ICogQHBhcmFtIGggLSBoZWlnaHQgb2YgY2FudmFzXG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbiAodywgaCkge1xuXHRcdHZhciB4ID0gMDtcblx0XHR2YXIgeSA9IDA7XG5cdFx0dmFyIG1heFJhZGl1c0NvbCA9IDA7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX25vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcblxuXHRcdFx0aWYgKHkgPT09IDApIHtcblx0XHRcdFx0eSArPSBub2RlLnJhZGl1cztcblx0XHRcdH1cblx0XHRcdGlmICh4ID09PSAwKSB7XG5cdFx0XHRcdHggKz0gbm9kZS5yYWRpdXM7XG5cdFx0XHR9XG5cblx0XHRcdHRoYXQuX3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZShub2RlLCB4LCB5KTtcblxuXHRcdFx0bWF4UmFkaXVzQ29sID0gTWF0aC5tYXgobWF4UmFkaXVzQ29sLCBub2RlLnJhZGl1cyk7XG5cblx0XHRcdHkgKz0gbm9kZS5yYWRpdXMgKyA0MDtcblx0XHRcdGlmICh5ID4gaCkge1xuXHRcdFx0XHR5ID0gMDtcblx0XHRcdFx0eCArPSBtYXhSYWRpdXNDb2wgKyA0MDtcblx0XHRcdFx0bWF4UmFkaXVzQ29sID0gMDtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sdW1uTGF5b3V0O1xuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYmFzZSBncm91cGluZyBtYW5hZ2VyLiAgIFRoaXMgaXMgYW4gYWJzdHJhY3QgY2xhc3MuICAgQ2hpbGQgY2xhc3NlcyBzaG91bGQgb3ZlcnJpZGUgdGhlXG4gKiBpbml0aWFsaXplSGVpcmFyY2h5IGZ1bmN0aW9uIHRvIGNyZWF0ZSBub2Rlcy9saW5rcyB0aGF0IGFyZSBhZ2dyZWdhdGVkIGZvciB0aGVpciBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvblxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBHcm91cGluZ01hbmFnZXIgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gW107XG5cdHRoaXMuX2xpbmtzID0gW107XG5cblx0dGhpcy5fYWdncmVnYXRlZE5vZGVzID0gW107XG5cdHRoaXMuX2FnZ3JlZ2F0ZWRMaW5rcyA9IFtdO1xuXHR0aGlzLl9hZ2dyZWdhdGVOb2RlTWFwID0ge307XG5cblx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlcyA9IHt9O1xuXHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzID0ge307XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkdyb3VwaW5nTWFuYWdlci5wcm90b3R5cGUgPSBfLmV4dGVuZChHcm91cGluZ01hbmFnZXIucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG9yaWdpbmFsIG5vZGVzIGluIHRoZSBncmFwaCB3aXRob3V0IGdyb3VwaW5nXG5cdCAqIEBwYXJhbSBub2RlcyAtIGEgZ3JhcGguanMgbm9kZSBhcnJheVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgb3JpZ2luYWwgbGlua3MgaW4gdGhlIGdyYXBoIHdpdGhvdXQgZ3JvdXBpbmdcblx0ICogQHBhcmFtIGxpbmtzIC0gYSBncmFwaC5qcyBsaW5rIGFycmF5XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bGlua3MgOiBmdW5jdGlvbihsaW5rcykge1xuXHRcdGlmIChsaW5rcykge1xuXHRcdFx0dGhpcy5fbGlua3MgPSBsaW5rcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZXMgdGhlIG5vZGUvbGluayBhZ2dyZWdhdGlvblxuXHQgKi9cblx0aW5pdGlhbGl6ZUhlaXJhcmNoeSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZU5vZGVzKCk7XG5cdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblxuXHRcdHZhciBzZXRQYXJlbnRQb2ludGVycyA9IGZ1bmN0aW9uKG5vZGUscGFyZW50KSB7XG5cdFx0XHRpZiAobm9kZS5jaGlsZHJlbikge1xuXHRcdFx0XHRub2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdFx0XHRzZXRQYXJlbnRQb2ludGVycyhjaGlsZCxub2RlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRub2RlLnBhcmVudE5vZGUgPSBwYXJlbnQ7XG5cdFx0fTtcblxuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHNldFBhcmVudFBvaW50ZXJzKG5vZGUsbnVsbCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYWdncmVnYXRlZCBsaW5rIGluIGdyYXBoLmpzIGZvcm1hdC4gICBDYW4gYmUgb3ZlcnJpZGVuIGJ5IHNwZWNpZmljIGltcGxlbWVudGF0aW9ucyB0byBhbGxvd1xuXHQgKiB0byBhbGxvdyBmb3IgZGlmZXJlbnQgbGluayB0eXBlcyBiYXNlZCBvbiBhZ2dyZWdhdGUgY29udGVudHNcblx0ICogQHBhcmFtIHNvdXJjZUFnZ3JlZ2F0ZSAtIHRoZSBzb3VyY2UgYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIHRhcmdldEFnZ3JlZ2F0ZSAtIHRoZSB0YXJnZXQgYWdncmVnYXRlIG5vZGVcblx0ICogQHJldHVybnMge3tzb3VyY2U6ICosIHRhcmdldDogKn19IC0gYSBncmFwaC5qcyBsaW5rXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfY3JlYXRlQWdncmVnYXRlTGluayA6IGZ1bmN0aW9uKHNvdXJjZUFnZ3JlZ2F0ZSx0YXJnZXRBZ2dyZWdhdGUsb3JpZ2luYWxMaW5rcykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRzb3VyY2UgOiBzb3VyY2VBZ2dyZWdhdGUsXG5cdFx0XHR0YXJnZXQgOiB0YXJnZXRBZ2dyZWdhdGVcblx0XHR9O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtcyBsaW5rIGFnZ3JlZ2F0ZSBiYXNlZCBvbiBhIHNldCBvZiBhZ2dyZWdhdGVkIG5vZGVzIGFuZCBhIGZ1bGwgc2V0IG9mIGxpbmtzXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfYWdncmVnYXRlTGlua3MgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZSA9IHt9O1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHRcdGlmIChhZ2dyZWdhdGUuY2hpbGRyZW4pIHtcblx0XHRcdFx0YWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbm9kZS5pbmRleF0gPSBhZ2dyZWdhdGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fYWdncmVnYXRlTm9kZU1hcFthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdH0pO1xuXG5cblx0XHR2YXIgYWdncmVnYXRlZExpbmtzID0gW107XG5cblx0XHR2YXIgYWdncmVnYXRlTGlua01hcCA9IHt9O1xuXG5cdFx0dGhpcy5fbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgc291cmNlQWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnNvdXJjZS5pbmRleF07XG5cdFx0XHR2YXIgdGFyZ2V0QWdncmVnYXRlID0gbm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVtsaW5rLnRhcmdldC5pbmRleF07XG5cblx0XHRcdHZhciBzb3VyY2VNYXAgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZU1hcCkge1xuXHRcdFx0XHRzb3VyY2VNYXAgPSB7fTtcblx0XHRcdH1cblx0XHRcdHZhciBzb3VyY2VUb1RhcmdldExpbmtzID0gc291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF07XG5cdFx0XHRpZiAoIXNvdXJjZVRvVGFyZ2V0TGlua3MpIHtcblx0XHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcyA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0c291cmNlVG9UYXJnZXRMaW5rcy5wdXNoKGxpbmspO1xuXHRcdFx0c291cmNlTWFwW3RhcmdldEFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VUb1RhcmdldExpbmtzO1xuXG5cdFx0XHRhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZS5pbmRleF0gPSBzb3VyY2VNYXA7XG5cdFx0fSk7XG5cblx0XHRmb3IgKHZhciBzb3VyY2VBZ2dyZWdhdGVJZCBpbiBhZ2dyZWdhdGVMaW5rTWFwKSB7XG5cdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcC5oYXNPd25Qcm9wZXJ0eShzb3VyY2VBZ2dyZWdhdGVJZCkpIHtcblx0XHRcdFx0Zm9yICh2YXIgdGFyZ2V0QWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0pIHtcblx0XHRcdFx0XHRpZiAoYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGVJZF0uaGFzT3duUHJvcGVydHkodGFyZ2V0QWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdFx0XHR2YXIgc291cmNlID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFtzb3VyY2VBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gdGhhdC5fYWdncmVnYXRlTm9kZU1hcFt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgb3JpZ2luYWxMaW5rcyA9IGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdW3RhcmdldEFnZ3JlZ2F0ZUlkXTtcblx0XHRcdFx0XHRcdHZhciBsaW5rID0gdGhhdC5fY3JlYXRlQWdncmVnYXRlTGluayhzb3VyY2UsIHRhcmdldCwgb3JpZ2luYWxMaW5rcyk7XG5cdFx0XHRcdFx0XHRpZiAobGluaykge1xuXHRcdFx0XHRcdFx0XHRhZ2dyZWdhdGVkTGlua3MucHVzaChsaW5rKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9hZ2dyZWdhdGVkTGlua3MgPSBhZ2dyZWdhdGVkTGlua3M7XG5cdH0sXG5cblxuXHQvKipcblx0ICogUGVyZm9ybSBub2RlIGFnZ3JlZ2F0aW9uLiAgIE11c3QgYmUgb3ZlcnJpZGVuIGJ5IGltcGxlbWVudG9yc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZU5vZGVzIDogZnVuY3Rpb24oKSB7XG5cblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBub2Rlc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIG5vZGVzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTm9kZXMgOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZE5vZGVzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRoZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gb2YgZ3JhcGguanMgbGlua3Ncblx0ICovXG5cdGFnZ3JlZ2F0ZWRMaW5rcyA6IGZ1bmN0aW9uKCkgIHtcblx0XHRyZXR1cm4gdGhpcy5fYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cdHJlbW92ZSA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHR2YXIgaW5kZXggPSAtMTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0aW5kZXggPSBpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc3BsaWNlKGluZGV4LDEpO1xuXHRcdH1cblx0fSxcblxuXG5cdC8qKlxuXHQgKiBEbyBhbnkgdXBkYXRlcyBvbiBjaGlsZHJlbiBiZWZvcmUgbGF5b3V0ICAoaWUvIHNldCBwb3NpdGlvbiwgcm93L2NvbCBpbmZvLCBldGMpLiAgIFNob3VsZCBiZSBkZWZpbmVkXG5cdCAqIGluIGltcGxlbWVudGluZyBjbGFzc1xuXHQgKiBAcGFyYW0gYWdncmVnYXRlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfdXBkYXRlQ2hpbGRyZW4gOiBmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHQvLyBzZXQgY2hpbGRyZW5zIHBvc2l0aW9uIGluaXRpYWxseSB0byB0aGUgcG9zaXRpb24gb2YgdGhlIGFnZ3JlZ2F0ZVxuXHRcdGFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRjaGlsZC54ID0gYWdncmVnYXRlLng7XG5cdFx0XHRjaGlsZC55ID0gYWdncmVnYXRlLnk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFVuZ3JvdXAgYW4gYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICovXG5cdHVuZ3JvdXAgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0aWYgKG5vZGUuY2hpbGRyZW4pIHtcblxuXHRcdFx0dmFyIHBhcmVudEtleSA9ICcnO1xuXHRcdFx0bm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0cGFyZW50S2V5ICs9IG5vZGUuaW5kZXggKyAnLCc7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1twYXJlbnRLZXldID0gbm9kZTtcblxuXHRcdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGggJiYgaW5kZXggPT09IC0xOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlc1tpXS5pbmRleCA9PT0gbm9kZS5pbmRleCkge1xuXHRcdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl91cGRhdGVDaGlsZHJlbihub2RlKTtcblxuXHRcdFx0dmFyIGZpcnN0ID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKDAsaW5kZXgpO1xuXHRcdFx0dmFyIG1pZGRsZSA9IG5vZGUuY2hpbGRyZW47XG5cdFx0XHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzW3BhcmVudEtleV0gPSBub2RlLmNoaWxkcmVuO1xuXHRcdFx0dmFyIGVuZCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZShpbmRleCsxKTtcblxuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzID0gZmlyc3QuY29uY2F0KG1pZGRsZSkuY29uY2F0KGVuZCk7XG5cblx0XHRcdC8vIFJlY29tcHV0ZSBhZ2dyZWdhdGVkIGxpbmtzXG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdH1cblx0fSxcblx0Z2V0QWdncmVnYXRlIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0fSxcblxuXHRyZWdyb3VwIDogZnVuY3Rpb24oYWdncmVnYXRlS2V5LGF0SW5kZXgpIHtcblx0XHR2YXIgYWdncmVnYXRlTm9kZSA9IHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0XHR2YXIgbm9kZXNUb1JlbW92ZSA9IGFnZ3JlZ2F0ZU5vZGUuY2hpbGRyZW47XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVzVG9SZW1vdmUuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR0aGF0LnJlbW92ZShub2RlKTtcblx0XHR9KTtcblx0XHR2YXIgc3RhcnQgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoMCxhdEluZGV4KTtcblx0XHR2YXIgZW5kID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKGF0SW5kZXgpO1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IHN0YXJ0LmNvbmNhdChhZ2dyZWdhdGVOb2RlKS5jb25jYXQoZW5kKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0ZGVsZXRlIHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHNbYWdncmVnYXRlS2V5XTtcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbiBhcnJheSBvZiBub2RlIGdyb3VwcyB0aGF0IGFyZSBleHBhbmRlZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRnZXRVbmdyb3VwZWROb2RlcyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbmZvID0gW107XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR2YXIgbm9kZXMgPSB0aGF0Ll91bmdyb3VwZWROb2RlR3JvdXBzW2tleV07XG5cdFx0XHR2YXIgbm9kZUluZGljZXMgPSBub2Rlcy5tYXAoZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRyZXR1cm4gbm9kZS5pbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0aW5mby5wdXNoKHtcblx0XHRcdFx0aW5kaWNlcyA6IG5vZGVJbmRpY2VzLFxuXHRcdFx0XHRrZXkgOiBrZXlcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBpbmZvO1xuXHR9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwaW5nTWFuYWdlcjtcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBudWxsO1xuXHR0aGlzLl9saW5rTWFwID0gbnVsbDtcblx0dGhpcy5fbm9kZU1hcCA9IG51bGw7XG5cdHRoaXMuX2xhYmVsTWFwID0gbnVsbDtcblx0dGhpcy5fZHVyYXRpb24gPSAyNTA7XG5cdHRoaXMuX2Vhc2luZyA9ICdlYXNlLWluLW91dCc7XG5cdHRoaXMuX2lzVXBkYXRlID0gZmFsc2U7XG5cdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZHVyYXRpb24gb2YgdGhlIGxheW91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIGR1cmF0aW9uIC0gdGhlIGR1cmF0aW9uIG9mIHRoZSBsYXlvdXQgYW5pbWF0aW9uIGluIG1pbGxpc2Vjb25kcy4gIChkZWZhdWx0ID0gMjUwbXMpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGR1cmF0aW9uIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX2R1cmF0aW9ufSBvdGhlcndpc2Vcblx0ICovXG5cdGR1cmF0aW9uIDogZnVuY3Rpb24oZHVyYXRpb24pIHtcblx0XHRpZiAoZHVyYXRpb24pIHtcblx0XHRcdHRoaXMuX2R1cmF0aW9uID0gZHVyYXRpb247XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9kdXJhdGlvbjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZWFzaW5nIG9mIHRoZSBsYXlvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBlYXNpbmcgLSB0aGUgZWFzaW5nIG9mIHRoZSBsYXlvdXQgYW5pbWF0aW9uIGluIG1pbGxpc2Vjb25kcy4gIChkZWZhdWx0ID0gJ2Vhc2UtaW4tb3V0Jylcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgZWFzaW5nIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX2Vhc2luZ30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRlYXNpbmcgOiBmdW5jdGlvbihlYXNpbmcpIHtcblx0XHRpZiAoZWFzaW5nKSB7XG5cdFx0XHR0aGlzLl9lYXNpbmcgPSBlYXNpbmc7XG5cdFx0fVx0IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2Vhc2luZztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZXMgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIG5vZGVzIC0gdGhlIHNldCBvZiBub2RlcyBkZWZpbmVkIGluIHRoZSBjb3JyZXNwb25kaW5nIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIG5vZGVzIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX25vZGVzfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX2lzVXBkYXRlID0gbm9kZXMgPyB0cnVlIDogZmFsc2U7XG5cdFx0XHR0aGlzLl9ub2RlcyA9IG5vZGVzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGxpbmsgbWFwIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBsaW5rTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgc2V0IG9mIGxpbmVzIChwYXRoIG9iamVjdHMpIHRoYXQgY29udGFpbiB0aGF0IG5vZGVcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbGlua01hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9saW5rTWFwfSBvdGhlcndpc2Vcblx0ICovXG5cdGxpbmtNYXAgOiBmdW5jdGlvbihsaW5rTWFwKSB7XG5cdFx0aWYgKGxpbmtNYXApIHtcblx0XHRcdHRoaXMuX2xpbmtNYXAgPSBsaW5rTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGlua01hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZSBtYXAgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIG5vZGVNYXAgLSBhIG1hcCBmcm9tIG5vZGUgaW5kZXggdG8gYSBjaXJjbGUgKHBhdGggb2JqZWN0KVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBub2RlTWFwIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX25vZGVNYXB9IG90aGVyd2lzZVxuXHQgKi9cblx0bm9kZU1hcCA6IGZ1bmN0aW9uKG5vZGVNYXApIHtcblx0XHRpZiAobm9kZU1hcCkge1xuXHRcdFx0dGhpcy5fbm9kZU1hcCA9IG5vZGVNYXA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2RlTWFwO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBsYWJlbCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGFiZWxNYXAgLSBhIG1hcCBmcm9tIG5vZGUgaW5kZXggdG8gYSB0ZXh0IG9iamVjdCAocGF0aCBvYmplY3QpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGxhYmVsTWFwIHBhcmFtIGlzIGRlZmluZWQsIHtMYXlvdXQuX2xhYmVsTWFwfSBvdGhlcndpc2Vcblx0ICovXG5cdGxhYmVsTWFwIDogZnVuY3Rpb24obGFiZWxNYXApIHtcblx0XHRpZiAobGFiZWxNYXApIHtcblx0XHRcdHRoaXMuX2xhYmVsTWFwID0gbGFiZWxNYXA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9sYWJlbE1hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYSBib3VuZGluZyBib3ggZm9yIGFuIGFycmF5IG9mIG5vZGUgaW5kaWNlc1xuXHQgKiBAcGFyYW0gbm9kZU9ySW5kZXhBcnJheSAtIGFycmF5IG9mIG5vZGUgaW5kaWNpZXMgb3Igbm9kZSBhcnJheSBpdHNlbGZcblx0ICogQHBhcmFtIHBhZGRpbmcgLSBwYWRkaW5nIGluIHBpeGVscyBhcHBsaWVkIHRvIGJvdW5kaW5nIGJveFxuXHQgKiBAcmV0dXJucyB7e21pbjoge3g6IE51bWJlciwgeTogTnVtYmVyfSwgbWF4OiB7eDogbnVtYmVyLCB5OiBudW1iZXJ9fX1cblx0ICovXG5cdGdldEJvdW5kaW5nQm94IDogZnVuY3Rpb24obm9kZU9ySW5kZXhBcnJheSxwYWRkaW5nKSB7XG5cdFx0dmFyIG1pbiA9IHtcblx0XHRcdHggOiBOdW1iZXIuTUFYX1ZBTFVFLFxuXHRcdFx0eSA6IE51bWJlci5NQVhfVkFMVUVcblx0XHR9O1xuXHRcdHZhciBtYXggPSB7XG5cdFx0XHR4IDogLU51bWJlci5NQVhfVkFMVUUsXG5cdFx0XHR5IDogLU51bWJlci5NQVhfVkFMVUVcblx0XHR9O1xuXG5cdFx0dmFyIGJiUGFkZGluZyA9IHBhZGRpbmcgfHwgMDtcblxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRub2RlT3JJbmRleEFycmF5LmZvckVhY2goZnVuY3Rpb24obm9kZU9ySW5kZXgpIHtcblx0XHRcdHZhciBpZHggPSBub2RlT3JJbmRleCBpbnN0YW5jZW9mIE9iamVjdCA/IG5vZGVPckluZGV4LmluZGV4IDogbm9kZU9ySW5kZXg7XG5cdFx0XHR2YXIgY2lyY2xlID0gdGhhdC5fbm9kZU1hcFtpZHhdO1xuXHRcdFx0bWluLnggPSBNYXRoLm1pbihtaW4ueCwgKGNpcmNsZS5maW5hbFggfHwgY2lyY2xlLngpIC0gKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHRcdG1pbi55ID0gTWF0aC5taW4obWluLnksIChjaXJjbGUuZmluYWxZIHx8IGNpcmNsZS55KSAtIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0XHRtYXgueCA9IE1hdGgubWF4KG1heC54LCAoY2lyY2xlLmZpbmFsWCB8fCBjaXJjbGUueCkgKyAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdFx0bWF4LnkgPSBNYXRoLm1heChtYXgueSwgKGNpcmNsZS5maW5hbFkgfHwgY2lyY2xlLnkpICsgKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHR9KTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0eCA6IG1pbi54LFxuXHRcdFx0eSA6IG1pbi55LFxuXHRcdFx0d2lkdGggOiAobWF4LnggLSBtaW4ueCksXG5cdFx0XHRoZWlnaHQgOiAobWF4LnkgLSBtaW4ueSlcblx0XHR9O1xuXHR9LFxuXG5cdF9hcHBseVpvb21TY2FsZSA6IGZ1bmN0aW9uKGJBcHBseSkge1xuXHRcdHRoaXMuX2FwcGx5Wm9vbSA9IGJBcHBseTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgcG9zaXRpb24gb2YgYSBub2RlIGFuZCBhbGwgYXR0YWNoZWQgbGlua3MgYW5kIGxhYmVscyB3aXRob3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gbm9kZSAtIHRoZSBub2RlIG9iamVjdCBiZWluZyBwb3NpdGlvbmVkXG5cdCAqIEBwYXJhbSB4IC0gdGhlIG5ldyB4IHBvc2l0aW9uIGZvciB0aGUgbm9kZVxuXHQgKiBAcGFyYW0geSAtIHRoZSBuZXcgeSBwb3NpdGlvbiBmb3IgdGhlIG5vZGVcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9zZXROb2RlUG9zaXRpb25JbW1lZGlhdGUgOiBmdW5jdGlvbihub2RlLHgseSxjYWxsYmFjaykge1xuXHRcdHRoaXMuX3NldE5vZGVQb3NpdGlvbihub2RlLHgseSx0cnVlKTtcblx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiBhIG5vZGUgYnkgYW5pbWF0aW5nIGZyb20gaXQncyBvbGQgcG9zaXRpb24gdG8gaXQncyBuZXcgb25lXG5cdCAqIEBwYXJhbSBub2RlIC0gdGhlIG5vZGUgYmVpbmcgcmVwb3NpdGlvbmVkXG5cdCAqIEBwYXJhbSB4IC0gdGhlIG5ldyB4IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSB5IC0gdGhlIG5ldyB5IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSBiSW1tZWRpYXRlIC0gaWYgdHJ1ZSwgc2V0cyB3aXRob3V0IGFuaW1hdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9zZXROb2RlUG9zaXRpb24gOiBmdW5jdGlvbihub2RlLG5ld1gsbmV3WSxiSW1tZWRpYXRlLGNhbGxiYWNrKSB7XG5cdFx0dmFyIHggPSBuZXdYICogKHRoaXMuX2FwcGx5Wm9vbSA/IHRoaXMuX3pvb21TY2FsZSA6IDEpO1xuXHRcdHZhciB5ID0gbmV3WSAqICh0aGlzLl9hcHBseVpvb20gPyB0aGlzLl96b29tU2NhbGUgOiAxKTtcblxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBub2RlIHJlbmRlciBvYmplY3Rcblx0XHR2YXIgY2lyY2xlID0gdGhpcy5fbm9kZU1hcFtub2RlLmluZGV4XTtcblx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdGNpcmNsZS50d2VlbkF0dHIoe1xuXHRcdFx0XHR4OiB4LFxuXHRcdFx0XHR5OiB5XG5cdFx0XHR9LCB7XG5cdFx0XHRcdGR1cmF0aW9uOiB0aGlzLl9kdXJhdGlvbixcblx0XHRcdFx0ZWFzaW5nOiB0aGlzLl9lYXNpbmcsXG5cdFx0XHRcdGNhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIGNpcmNsZS5maW5hbFg7XG5cdFx0XHRcdFx0ZGVsZXRlIGNpcmNsZS5maW5hbFk7XG5cdFx0XHRcdFx0bm9kZS54ID0geDtcblx0XHRcdFx0XHRub2RlLnkgPSB5O1xuXHRcdFx0XHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Y2lyY2xlLmZpbmFsWCA9IHg7XG5cdFx0XHRjaXJjbGUuZmluYWxZID0geTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2lyY2xlLnggPSB4O1xuXHRcdFx0Y2lyY2xlLnkgPSB5O1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbGlua01hcFtub2RlLmluZGV4XS5sZW5ndGggPT09IDApIHtcblx0XHRcdG5vZGUueCA9IHg7XG5cdFx0XHRub2RlLnkgPSB5O1xuXHRcdFx0Y2lyY2xlLnggPSB4O1xuXHRcdFx0Y2lyY2xlLnkgPSB5O1xuXHRcdH1cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbGFiZWwgcmVuZGVyIG9iamVjdFxuXHRcdHZhciBsYWJlbCA9IHRoaXMuX2xhYmVsTWFwW25vZGUuaW5kZXhdO1xuXHRcdGlmIChsYWJlbCkge1xuXHRcdFx0dmFyIGxhYmVsUG9zID0gdGhpcy5sYXlvdXRMYWJlbChub2RlKTtcblx0XHRcdGlmIChiSW1tZWRpYXRlIT09dHJ1ZSkge1xuXHRcdFx0XHRsYWJlbC50d2VlbkF0dHIobGFiZWxQb3MsIHtcblx0XHRcdFx0XHRkdXJhdGlvbjogdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdFx0ZWFzaW5nOiB0aGlzLl9lYXNpbmdcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKHZhciBwcm9wIGluIGxhYmVsUG9zKSB7XG5cdFx0XHRcdFx0aWYgKGxhYmVsUG9zLmhhc093blByb3BlcnR5KHByb3ApKSB7XG5cdFx0XHRcdFx0XHRsYWJlbFtwcm9wXSA9IGxhYmVsUG9zW3Byb3BdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBsaW5rIHJlbmRlciBvYmplY3Rcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbGlua01hcFtub2RlLmluZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcblx0XHRcdHZhciBsaW5rT2JqS2V5ID0gbnVsbDtcblx0XHRcdGlmIChsaW5rLnNvdXJjZS5pbmRleCA9PT0gbm9kZS5pbmRleCkge1xuXHRcdFx0XHRsaW5rT2JqS2V5ID0gJ3NvdXJjZSc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsaW5rT2JqS2V5ID0gJ3RhcmdldCc7XG5cdFx0XHR9XG5cdFx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdFx0bGluay50d2Vlbk9iaihsaW5rT2JqS2V5LCB7XG5cdFx0XHRcdFx0eDogeCxcblx0XHRcdFx0XHR5OiB5XG5cdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRkdXJhdGlvbjogdGhhdC5fZHVyYXRpb24sXG5cdFx0XHRcdFx0ZWFzaW5nOiB0aGF0Ll9lYXNpbmdcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsaW5rW2xpbmtPYmpLZXldLnggPSB4O1xuXHRcdFx0XHRsaW5rW2xpbmtPYmpLZXldLnkgPSB5O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEZWZhdWx0IGxheW91dCByb3V0aW5lLiAgIFNob3VsZCBiZSBvdmVycmlkZW4gYnkgc3ViY2xhc3Nlcy5cblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcmV0dXJucyB7TGF5b3V0fVxuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24odyxoLGNhbGxiYWNrKSB7XG5cdFx0dmFyIGlzQXN5bmMgPSAhdGhpcy5fcGVyZm9ybUxheW91dCh3LGgpO1xuXHRcdGlmIChpc0FzeW5jKSB7XG5cdFx0XHRzZXRUaW1lb3V0KGNhbGxiYWNrLHRoaXMuZHVyYXRpb24oKSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFx0LyoqXG5cdCAqIEhvb2sgZm9yIGRvaW5nIGFueSBkcmF3aW5nIGJlZm9yZSByZW5kZXJpbmcgb2YgdGhlIGdyYXBoIHRoYXQgaXMgbGF5b3V0IHNwZWNpZmljXG5cdCAqIGllLyBCYWNrZ3JvdW5kcywgZXRjXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXNcblx0ICogQHJldHVybnMge0FycmF5fSAtIGEgbGlzdCBvZiBwYXRoLmpzIHJlbmRlciBvYmplY3RzIHRvIGJlIGFkZGVkIHRvIHRoZSBzY2VuZVxuXHQgKi9cblx0cHJlcmVuZGVyIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBIb29rIGZvciBkb2luZyBhbnkgZHJhd2luZyBhZnRlciByZW5kZXJpbmcgb2YgdGhlIGdyYXBoIHRoYXQgaXMgbGF5b3V0IHNwZWNpZmljXG5cdCAqIGllLyBPdmVybGF5cywgZXRjXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXNcblx0ICogQHJldHVybnMge0FycmF5fSAtIGEgbGlzdCBvZiBwYXRoLmpzIHJlbmRlciBvYmplY3RzIHRvIGJlIGFkZGVkIHRvIHRoZSBzY2VuZVxuXHQgKi9cblx0cG9zdHJlbmRlciA6IGZ1bmN0aW9uKHcsaCkge1xuXHRcdHJldHVybiBbXTtcblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgbGFiZWwgcG9zaXRpb24gZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVggLSB0aGUgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVkgLSB0aGUgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gcmFkaXVzIC0gdGhlIHJhZGl1cyBvZiB0aGUgbm9kZVxuXHQgKiBAcmV0dXJucyB7e3g6IHggcG9zaXRpb24gb2YgdGhlIGxhYmVsLCB5OiB5IHBvc2l0aW9uIG9mIHRoZSBsYWJlbH19XG5cdCAqL1xuXHRsYXlvdXRMYWJlbCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0eDogbm9kZS54ICsgbm9kZS5yYWRpdXMgKyA1LFxuXHRcdFx0eTogbm9kZS55ICsgbm9kZS5yYWRpdXMgKyA1XG5cdFx0fTtcblx0fVxufSk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDtcbiIsInZhciBMSU5LX1RZUEUgPSB7XG5cdERFRkFVTFQgOiAnbGluZScsXG5cdExJTkUgOiAnbGluZScsXG5cdEFSUk9XIDogJ2Fycm93Jyxcblx0QVJDIDogJ2FyYydcbn07XG5tb2R1bGUuZXhwb3J0cyA9IExJTktfVFlQRTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExJTktfVFlQRSA9IHJlcXVpcmUoJy4vbGlua1R5cGUnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgUkVHUk9VTkRfQkJfUEFERElORyA9IDA7XG5cbi8qKlxuICogQ3JlYXRlcyBhIEdyYXBoIHJlbmRlciBvYmplY3RcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgR3JhcGggPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gW107XG5cdHRoaXMuX2xpbmtzID0gW107XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX2xheW91dGVyID0gbnVsbDtcblx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyID0gbnVsbDtcblx0dGhpcy5fd2lkdGggPSAwO1xuXHR0aGlzLl9oZWlnaHQgPSAwO1xuXHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdHRoaXMuX3pvb21MZXZlbCA9IDA7XG5cdHRoaXMuX3NjZW5lID0gbnVsbDtcblx0dGhpcy5fcHJlcmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wYW5uYWJsZSA9IG51bGw7XG5cdHRoaXMuX3pvb21hYmxlID0gbnVsbDtcblx0dGhpcy5fZHJhZ2dhYmxlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE1vdmVTdGF0ZSA9IG51bGw7XG5cdHRoaXMuX2ludmVydGVkUGFuID0gMTtcblxuXHR0aGlzLl9mb250U2l6ZSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRGYW1pbHkgPSBudWxsO1xuXHR0aGlzLl9mb250Q29sb3IgPSBudWxsO1xuXHR0aGlzLl9mb250U3Ryb2tlID0gbnVsbDtcblx0dGhpcy5fZm9udFN0cm9rZVdpZHRoID0gbnVsbDtcblxuXHQvLyBEYXRhIHRvIHJlbmRlciBvYmplY3QgbWFwc1xuXHR0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvTGFiZWwgPSB7fTtcblxuXHR0aGlzLl9ldmVudHNTdXNwZW5kZWQgPSBmYWxzZTtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuR3JhcGgucHJvdG90eXBlID0gXy5leHRlbmQoR3JhcGgucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIG5vZGVzIC0gYW4gYXJyYXkgb2Ygbm9kZXNcblx0ICoge1xuXHQgKiBcdFx0eCA6IHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGVcdChyZXF1aXJlZClcblx0ICogXHRcdHkgOiB0aGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlXHQocmVxdWlyZWQpXG5cdCAqXHRcdGluZGV4IDogIGEgdW5pcXVlIGluZGV4XHRcdFx0XHQocmVxdWlyZWQpXG5cdCAqXHRcdGxhYmVsIDogYSBsYWJlbCBmb3IgdGhlIG5vZGVcdFx0KG9wdGlvbmFsKVxuXHQgKlx0XHRmaWxsU3R5bGUgOiBhIGNhbnZhcyBmaWxsICAgXHRcdChvcHRpb25hbCwgZGVmYXVsdCAjMDAwMDAwKVxuXHQgKlx0XHRzdHJva2VTdHlsZSA6IGEgY2FudmFzIHN0cm9rZVx0XHQob3B0aW9uYWwsIGRlZmF1bHQgdW5kZWZpbmVkKVxuXHQgKlx0XHRsaW5lV2lkdGggOiB3aWR0aCBvZiB0aGUgc3Ryb2tlXHRcdChvcHRpb25hbCwgZGVmYXVsdCAxKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIG5vZGVzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB7R3JhcGguX25vZGVzfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUgPSB7fTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsID0ge307XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtub2RlLmluZGV4XSA9IFtdO1xuXHRcdFx0fSk7XG5cdFx0XHRpZiAodGhpcy5fbGF5b3V0ZXIpIHtcblx0XHRcdFx0dGhpcy5fbGF5b3V0ZXIubm9kZXMobm9kZXMpO1xuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGlua3MgLSBhbiBhcnJheSBvZiBsaW5rc1xuXHQgKiB7XG5cdCAqIFx0XHRzb3VyY2UgOiBhIG5vZGUgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNvdXJjZSBcdChyZXF1aXJlZClcblx0ICogXHRcdHRhcmdldCA6IGEgbm9kZSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGUgdGFyZ2V0XHQocmVxdWlyZWQpXG5cdCAqXHRcdHN0cm9rZVN0eWxlIDogYSBjYW52YXMgc3Ryb2tlXHRcdFx0XHRcdFx0KG9wdGlvbmFsLCBkZWZhdWx0ICMwMDAwMDApXG5cdCAqXHRcdGxpbmVXaWR0aCA6IHRoZSB3aWR0aCBvZiB0aGUgc3Ryb2tlXHRcdFx0XHRcdChvcHRpbmFsLCBkZWZhdWx0IDEpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgbGlua3MgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHtHcmFwaC5fbGlua3N9IG90aGVyd2lzZVxuXHQgKi9cblx0bGlua3MgOiBmdW5jdGlvbihsaW5rcykge1xuXHRcdGlmIChsaW5rcykge1xuXHRcdFx0dGhpcy5fbGlua3MgPSBsaW5rcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gY2FudmFzIC0gYW4gSFRNTCBjYW52YXMgb2JqZWN0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgY2FudmFzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB0aGUgY2FudmFzIG90aGVyd2lzZVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXG5cdFx0XHR2YXIgeCx5O1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZWRvd24nLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0eCA9IGUuY2xpZW50WDtcblx0XHRcdFx0eSA9IGUuY2xpZW50WTtcblx0XHRcdFx0JCh0aGF0Ll9jYW52YXMpLm9uKCdtb3VzZW1vdmUnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR2YXIgZHggPSB4IC0gZS5jbGllbnRYO1xuXHRcdFx0XHRcdHZhciBkeSA9IHkgLSBlLmNsaWVudFk7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2RyYWdnYWJsZSAmJiB0aGF0Ll9jdXJyZW50T3Zlck5vZGUgJiYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09IG51bGwgfHwgdGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ2RyYWdnaW5nJykpICB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gJ2RyYWdnaW5nJztcblxuXHRcdFx0XHRcdFx0Ly8gTW92ZSB0aGUgbm9kZVxuXHRcdFx0XHRcdFx0dGhhdC5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZSh0aGF0Ll9jdXJyZW50T3Zlck5vZGUsIHRoYXQuX2N1cnJlbnRPdmVyTm9kZS54IC0gZHgsIHRoYXQuX2N1cnJlbnRPdmVyTm9kZS55IC0gZHkpO1xuXHRcdFx0XHRcdFx0dGhhdC51cGRhdGUoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuX3Bhbm5hYmxlICYmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSBudWxsIHx8IHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdwYW5uaW5nJykpIHtcblx0XHRcdFx0XHRcdHRoYXQuX3BhbigtZHgqdGhhdC5faW52ZXJ0ZWRQYW4sLWR5KnRoYXQuX2ludmVydGVkUGFuKTtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSAncGFubmluZyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHggPSBlLmNsaWVudFg7XG5cdFx0XHRcdFx0eSA9IGUuY2xpZW50WTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZXVwJyxmdW5jdGlvbigpIHtcblx0XHRcdFx0JCh0aGF0Ll9jYW52YXMpLm9mZignbW91c2Vtb3ZlJyk7XG5cdFx0XHRcdGlmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAnZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0dGhhdC5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gbnVsbDtcblx0XHRcdH0pO1xuXG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCB3aWR0aFxuXHQgKiBAcmV0dXJucyBXaWR0aCBpbiBwaXhlbHMgb2YgdGhlIGdyYXBoXG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9zY2VuZS53aWR0aDtcblx0fSxcblxuXHQvKipcblx0ICogR2V0IGhlaWdodFxuXHQgKiBAcmV0dXJucyBIZWlnaHQgaW4gcGl4ZWxzIG9mIHRoZSBncmFwaFxuXHQgKi9cblx0aGVpZ2h0IDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NjZW5lLmhlaWdodDtcblx0fSxcblxuXHQvKipcblx0ICogQWRkcyBhIGxhYmVsIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICogQHBhcmFtIHRleHRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0YWRkTGFiZWwgOiBmdW5jdGlvbihub2RlLHRleHQpIHtcblx0XHRpZiAodGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XSkge1xuXHRcdFx0dGhpcy5yZW1vdmVMYWJlbChub2RlKTtcblx0XHR9XG5cdFx0dmFyIGxhYmVsQXR0cnMgPSB0aGlzLl9sYXlvdXRlci5sYXlvdXRMYWJlbChub2RlKTtcblxuXHRcdHZhciBmb250U2l6ZSA9IHR5cGVvZih0aGlzLl9mb250U2l6ZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U2l6ZShub2RlKSA6IHRoaXMuX2ZvbnRTaXplO1xuXHRcdGlmICghZm9udFNpemUpIHtcblx0XHRcdGZvbnRTaXplID0gMTA7XG5cdFx0fVxuXG5cdFx0dmFyIGZvbnRGYW1pbHkgPSB0eXBlb2YodGhpcy5fZm9udEZhbWlseSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250RmFtaWx5KG5vZGUpIDogdGhpcy5fZm9udEZhbWlseTtcblx0XHRpZiAoIWZvbnRGYW1pbHkpIHtcblx0XHRcdGZvbnRGYW1pbHkgPSAnc2Fucy1zZXJpZic7XG5cdFx0fVxuXHRcdHZhciBmb250U3RyID0gZm9udFNpemUgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cblx0XHR2YXIgZm9udEZpbGwgPSB0eXBlb2YodGhpcy5fZm9udENvbG9yKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRDb2xvcihub2RlKSA6IHRoaXMuX2ZvbnRDb2xvcjtcblx0XHRpZiAoIWZvbnRGaWxsKSB7XG5cdFx0XHRmb250RmlsbCA9ICcjMDAwMDAwJztcblx0XHR9XG5cdFx0dmFyIGZvbnRTdHJva2UgPSB0eXBlb2YodGhpcy5fZm9udFN0cm9rZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U3Ryb2tlKG5vZGUpIDogdGhpcy5fZm9udFN0cm9rZTtcblx0XHR2YXIgZm9udFN0cm9rZVdpZHRoID0gdHlwZW9mKHRoaXMuX2ZvbnRTdHJva2UpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udFN0cm9rZVdpZHRoIDogdGhpcy5fZm9udFN0cm9rZVdpZHRoO1xuXG5cdFx0dmFyIGxhYmVsU3BlYyA9IHtcblx0XHRcdGZvbnQ6IGZvbnRTdHIsXG5cdFx0XHRmaWxsU3R5bGU6IGZvbnRGaWxsLFxuXHRcdFx0c3Ryb2tlU3R5bGU6IGZvbnRTdHJva2UsXG5cdFx0XHRsaW5lV2lkdGg6IGZvbnRTdHJva2VXaWR0aCxcblx0XHRcdHRleHQgOiB0ZXh0XG5cdFx0fTtcblx0XHRmb3IgKHZhciBrZXkgaW4gbGFiZWxBdHRycykge1xuXHRcdFx0aWYgKGxhYmVsQXR0cnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRsYWJlbFNwZWNba2V5XSA9IGxhYmVsQXR0cnNba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGxhYmVsID0gcGF0aC50ZXh0KGxhYmVsU3BlYyk7XG5cdFx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XSA9IGxhYmVsO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKGxhYmVsKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIGEgbGFiZWwgZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRyZW1vdmVMYWJlbCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHR2YXIgdGV4dE9iamVjdCA9IHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF07XG5cdFx0aWYgKHRleHRPYmplY3QpIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRleHRPYmplY3QpO1xuXHRcdFx0ZGVsZXRlIHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBtb3VzZW92ZXIgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlT3ZlciA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlT3ZlciA9IGNhbGxiYWNrLmJpbmQoc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIG1vdXNlb3V0IG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJyBpbiB0aGUgY2FsbGJhY2tcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZU91dCA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlT3V0ID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogQ29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIHNldHRpbmcgbm9kZU92ZXIvbm9kZU91dCBpbiBhIHNpbmdsZSBjYWxsXG5cdCAqIEBwYXJhbSBvdmVyIC0gdGhlIG5vZGVPdmVyIGV2ZW50IGhhbmRsZXJcblx0ICogQHBhcmFtIG91dCAtIHRoZSBub2RlT3V0IGV2ZW50IGhhbmRsZXJcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJyBpbiB0aGUgY2FsbGJhY2tcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZUhvdmVyIDogZnVuY3Rpb24ob3ZlcixvdXQsc2VsZikge1xuXHRcdHRoaXMubm9kZU92ZXIob3ZlcixzZWxmKTtcblx0XHR0aGlzLm5vZGVPdXQob3V0LHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBjbGljayBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycuICAgRGVmYXVsdHMgdG8gdGhlIGdyYXBoIG9iamVjdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlQ2xpY2sgOiBmdW5jdGlvbihjYWxsYmFjayxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5fbm9kZUNsaWNrID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGFuIHtHcmFwaH0gYnkgKGR4LGR5KS4gICBBdXRvbWF0aWNhbGx5IHJlcmVuZGVyIHRoZSBncmFwaC5cblx0ICogQHBhcmFtIGR4IC0gQW1vdW50IG9mIHBhbiBpbiB4IGRpcmVjdGlvblxuXHQgKiBAcGFyYW0gZHkgLSBBbW91bnQgb2YgcGFuIGluIHkgZGlyZWN0aW9uXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfcGFuIDogZnVuY3Rpb24oZHgsZHkpIHtcblx0XHR0aGlzLl9zY2VuZS54ICs9IGR4O1xuXHRcdHRoaXMuX3NjZW5lLnkgKz0gZHk7XG5cdFx0dGhpcy5fcGFuWCArPSBkeDtcblx0XHR0aGlzLl9wYW5ZICs9IGR5O1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Uge0dyYXBofSBwYW5uYWJsZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRwYW5uYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3Bhbm5hYmxlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogTWFrZXMgdGhlIGdyYXBoIHBhbiBpbiB0aGUgb3Bwb3NpdGUgZGlyZWN0aW9uIG9mIHRoZSBtb3VzZSBhcyBvcHBvc2VkIHRvIHdpdGggaXRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0aW52ZXJ0UGFuIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW52ZXJ0ZWRQYW4gPSAtMTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogTWFrZSBub2RlcyBpbiB7R3JhcGh9IHJlcG9pc2l0aW9uYWJsZSBieSBjbGljay1kcmFnZ2luZ1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRkcmFnZ2FibGUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9kcmFnZ2FibGUgPSB0cnVlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9nZXRab29tRm9yTGV2ZWwgOiBmdW5jdGlvbihsZXZlbCkge1xuXHRcdHZhciBmYWN0b3IgPSBNYXRoLnBvdygxLjUgLCBNYXRoLmFicyhsZXZlbCAtIHRoaXMuX3pvb21MZXZlbCkpO1xuXHRcdGlmIChsZXZlbCA8IHRoaXMuX3pvb21MZXZlbCkge1xuXHRcdFx0ZmFjdG9yID0gMS9mYWN0b3I7XG5cdFx0fVxuXHRcdHJldHVybiBmYWN0b3I7XG5cdH0sXG5cblx0X3pvb20gOiBmdW5jdGlvbihmYWN0b3IseCx5KSB7XG5cdFx0dGhpcy5fem9vbVNjYWxlICo9IGZhY3Rvcjtcblx0XHR0aGlzLl9sYXlvdXRlci5fem9vbVNjYWxlID0gdGhpcy5fem9vbVNjYWxlO1xuXG5cdFx0Ly8gUGFuIHNjZW5lIGJhY2sgdG8gb3JpZ2luXG5cdFx0dmFyIG9yaWdpbmFsWCA9IHRoaXMuX3NjZW5lLng7XG5cdFx0dmFyIG9yaWdpbmFsWSA9IHRoaXMuX3NjZW5lLnk7XG5cdFx0dGhpcy5fcGFuKC10aGlzLl9zY2VuZS54LC10aGlzLl9zY2VuZS55KTtcblxuXHRcdHZhciBtb3VzZVggPSB4IHx8IDA7XG5cdFx0dmFyIG1vdXNlWSA9IHkgfHwgMDtcblxuXHRcdC8vICdab29tJyBub2Rlcy4gICBXZSBkbyB0aGlzIHNvIHRleHQvcmFkaXVzIHNpemUgcmVtYWlucyBjb25zaXN0ZW50IGFjcm9zcyB6b29tIGxldmVsc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuX2xheW91dGVyLl9zZXROb2RlUG9zaXRpb24odGhpcy5fbm9kZXNbaV0sdGhpcy5fbm9kZXNbaV0ueCpmYWN0b3IsIHRoaXMuX25vZGVzW2ldLnkqZmFjdG9yLHRydWUpO1xuXHRcdH1cblxuXHRcdC8vIFpvb20gdGhlIHJlbmRlciBncm91cHNcblx0XHRpZiAodGhpcy5fcHJlcmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tU2NhbGU7XG5cdFx0fVxuXG5cdFx0Ly8gUmV2ZXJzZSB0aGUgJ29yaWdpbiBwYW4nIHdpdGggdGhlIHNjYWxlIGFwcGxpZWQgYW5kIHJlY2VudGVyIHRoZSBtb3VzZSB3aXRoIHNjYWxlIGFwcGxpZWQgYXMgd2VsbFxuXHRcdHZhciBuZXdNb3VzZVggPSBtb3VzZVgqZmFjdG9yO1xuXHRcdHZhciBuZXdNb3VzZVkgPSBtb3VzZVkqZmFjdG9yO1xuXHRcdHRoaXMuX3BhbihvcmlnaW5hbFgqZmFjdG9yIC0gKG5ld01vdXNlWC1tb3VzZVgpLG9yaWdpbmFsWSpmYWN0b3IgLSAobmV3TW91c2VZLW1vdXNlWSkpO1xuXG5cdFx0Ly8gVXBkYXRlIHRoZSByZWdyb3VwIHVuZGVybGF5c1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXAgJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4pIHtcblx0XHRcdHZhciB1bmRlcmxheXMgPSB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbjtcblx0XHRcdHVuZGVybGF5cy5mb3JFYWNoKGZ1bmN0aW9uKHVuZGVybGF5KSB7XG5cdFx0XHRcdHRoYXQuX2hhbmRsZUdyb3VwLnJlbW92ZUNoaWxkKHVuZGVybGF5KTtcblx0XHRcdH0pO1xuXHRcdFx0dGhhdC5fYWRkUmVncm91cEhhbmRsZXMoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Uge0dyYXBofSB6b29tYWJsZSBieSB1c2luZyB0aGUgbW91c2V3aGVlbFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHR6b29tYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy5fem9vbWFibGUpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2V3aGVlbCcsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHZhciB3aGVlbCA9IGUub3JpZ2luYWxFdmVudC53aGVlbERlbHRhLzEyMDsvL24gb3IgLW5cblx0XHRcdFx0dmFyIGZhY3Rvcjtcblx0XHRcdFx0aWYgKHdoZWVsIDwgMCkge1xuXHRcdFx0XHRcdGZhY3RvciA9IHRoYXQuX2dldFpvb21Gb3JMZXZlbCh0aGF0Ll96b29tTGV2ZWwtMSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZmFjdG9yID0gdGhhdC5fZ2V0Wm9vbUZvckxldmVsKHRoYXQuX3pvb21MZXZlbCsxKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0Ll96b29tKGZhY3RvciwgZS5vZmZzZXRYLCBlLm9mZnNldFkpO1xuXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3pvb21hYmxlID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxheW91dCBmdW5jdGlvbiBmb3IgdGhlIG5vZGVzXG5cdCAqIEBwYXJhbSBsYXlvdXRlciAtIEFuIGluc3RhbmNlIChvciBzdWJjbGFzcykgb2YgTGF5b3V0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaXMgbGF5b3V0ZXIgcGFyYW0gaXMgZGVmaW5lZCwgdGhlIGxheW91dGVyIG90aGVyd2lzZVxuXHQgKi9cblx0bGF5b3V0ZXIgOiBmdW5jdGlvbihsYXlvdXRlcikge1xuXHRcdGlmIChsYXlvdXRlcikge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIgPSBsYXlvdXRlcjtcblx0XHRcdHRoaXMuX2xheW91dGVyXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xheW91dGVyO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgYSBsYXlvdXQgb2YgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHR0aGlzLl9sYXlvdXRlci5sYXlvdXQodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQsY2FsbGJhY2spO1xuXG5cblx0XHRcdC8vIFVwZGF0ZSB0aGUgcmVncm91cCB1bmRlcmxheXNcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCAmJiB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbikge1xuXHRcdFx0XHR2YXIgdW5kZXJsYXlzID0gdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW47XG5cdFx0XHRcdHVuZGVybGF5cy5mb3JFYWNoKGZ1bmN0aW9uKHVuZGVybGF5KSB7XG5cdFx0XHRcdFx0dmFyIGluZGljZXMgPSB1bmRlcmxheS5ncmFwaGpzX2luZGljZXM7XG5cdFx0XHRcdFx0dmFyIGJiID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcyxSRUdST1VORF9CQl9QQURESU5HKTtcblx0XHRcdFx0XHR1bmRlcmxheS50d2VlbkF0dHIoe1xuXHRcdFx0XHRcdFx0eDogYmIueCxcblx0XHRcdFx0XHRcdHk6IGJiLnksXG5cdFx0XHRcdFx0XHR3aWR0aCA6IGJiLndpZHRoLFxuXHRcdFx0XHRcdFx0aGVpZ2h0IDogYmIuaGVpZ2h0XG5cdFx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2xheW91dGVyLmR1cmF0aW9uKCksXG5cdFx0XHRcdFx0XHRlYXNpbmc6IHRoYXQuX2xheW91dGVyLmVhc2luZygpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblxuXHRncm91cGluZ01hbmFnZXIgOiBmdW5jdGlvbihncm91cGluZ01hbmFnZXIpIHtcblx0XHRpZiAoZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHR0aGlzLl9ncm91cGluZ01hbmFnZXIgPSBncm91cGluZ01hbmFnZXI7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2dyb3VwaW5nTWFuYWdlcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0aW5pdGlhbGl6ZUdyb3VwaW5nIDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLm5vZGVzKHRoaXMuX25vZGVzKVxuXHRcdFx0XHQubGlua3ModGhpcy5fbGlua3MpXG5cdFx0XHRcdC5pbml0aWFsaXplSGVpcmFyY2h5KCk7XG5cblx0XHRcdHRoaXMubm9kZXModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWROb2RlcygpKTtcblx0XHRcdHRoaXMubGlua3ModGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmFnZ3JlZ2F0ZWRMaW5rcygpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0dW5ncm91cCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRpZiAoIW5vZGUgfHwgIW5vZGUuY2hpbGRyZW4pIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLnVuZ3JvdXAobm9kZSk7XG5cdFx0XHR0aGlzLl9zdXNwZW5kRXZlbnRzKCk7XG5cdFx0XHR0aGlzLmNsZWFyKClcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSlcblx0XHRcdFx0LmxpbmtzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSlcblx0XHRcdFx0LmRyYXcoKTtcblxuXHRcdFx0dGhpcy5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKHRydWUpO1xuXHRcdFx0dGhpcy5sYXlvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGhhdC5fcmVzdW1lRXZlbnRzKCk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZShmYWxzZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHJlZ3JvdXAgOiBmdW5jdGlvbih1bmdyb3VwZWRBZ2dyZWdhdGVLZXkpIHtcblx0XHQvLyBBbmltYXRlIHRoZSByZWdyb3VwXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBwYXJlbnRBZ2dyZWdhdGUgPSB0aGlzLl9ncm91cGluZ01hbmFnZXIuZ2V0QWdncmVnYXRlKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSk7XG5cblx0XHR2YXIgYXZnUG9zID0geyB4OiAwLCB5IDogMH07XG5cdFx0cGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdGF2Z1Bvcy54ICs9IGNoaWxkLng7XG5cdFx0XHRhdmdQb3MueSArPSBjaGlsZC55O1xuXHRcdH0pO1xuXHRcdGF2Z1Bvcy54IC89IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGg7XG5cdFx0YXZnUG9zLnkgLz0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmxlbmd0aDtcblxuXHRcdHZhciBpbmRleE9mQ2hpbGRyZW4gPSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubWFwKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoYXQuX2dyb3VwaW5nTWFuYWdlci5fYWdncmVnYXRlZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGF0Ll9ncm91cGluZ01hbmFnZXIuX2FnZ3JlZ2F0ZWROb2Rlc1tpXS5pbmRleCA9PT0gY2hpbGQuaW5kZXgpIHtcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBtaW5DaGlsZEluZGV4ID0gTnVtYmVyLk1BWF9WQUxVRTtcblx0XHRpbmRleE9mQ2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihpZHgpIHtcblx0XHRcdG1pbkNoaWxkSW5kZXggPSBNYXRoLm1pbihtaW5DaGlsZEluZGV4LGlkeCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgYW5pbWF0ZWRSZWdyb3VwZWQgPSAwO1xuXHRcdHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHR0aGF0Ll9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uKGNoaWxkLGF2Z1Bvcy54LGF2Z1Bvcy55LGZhbHNlLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhbmltYXRlZFJlZ3JvdXBlZCsrO1xuXHRcdFx0XHRpZiAoYW5pbWF0ZWRSZWdyb3VwZWQgPT09IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ncm91cGluZ01hbmFnZXIucmVncm91cCh1bmdyb3VwZWRBZ2dyZWdhdGVLZXksbWluQ2hpbGRJbmRleCk7XG5cdFx0XHRcdFx0XHR0aGF0LmNsZWFyKClcblx0XHRcdFx0XHRcdFx0Lm5vZGVzKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSlcblx0XHRcdFx0XHRcdFx0LmxpbmtzKHRoYXQuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSk7XG5cdFx0XHRcdFx0XHR0aGF0LmRyYXcoKTtcblx0XHRcdFx0XHRcdHRoYXQubGF5b3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc2l6ZSBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250U2l6ZSAtIHNpemUgb2YgdGhlIGZvbnQgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFNpemUgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250U2l6ZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U2l6ZSA6IGZ1bmN0aW9uKGZvbnRTaXplKSB7XG5cdFx0aWYgKGZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9mb250U2l6ZSA9IGZvbnRTaXplO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udFNpemU7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgY29sb3VyIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRDb2xvdXIgLSBBIGhleCBzdHJpbmcgZm9yIHRoZSBjb2xvdXIgb2YgdGhlIGxhYmVsc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRDb2xvdXIgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250Q29sb3VyfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRDb2xvdXIgOiBmdW5jdGlvbihmb250Q29sb3VyKSB7XG5cdFx0aWYgKGZvbnRDb2xvdXIpIHtcblx0XHRcdHRoaXMuX2ZvbnRDb2xvciA9IGZvbnRDb2xvdXI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250Q29sb3I7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc3Ryb2tlIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTdHJva2UgLSBBIGhleCBzdHJpbmcgZm9yIHRoZSBjb2xvciBvZiB0aGUgbGFiZWwgc3Ryb2tlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFN0cm9rZSBwYXJhbSBpcyBkZWZpbmVkLCB7R3JhcGguX2ZvbnRTdHJva2V9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udFN0cm9rZSA6IGZ1bmN0aW9uKGZvbnRTdHJva2UpIHtcblx0XHRpZiAoZm9udFN0cm9rZSkge1xuXHRcdFx0dGhpcy5fZm9udFN0cm9rZSA9IGZvbnRTdHJva2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250U3Ryb2tlO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb250IHN0cm9rZSB3aWR0aCBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250U3Ryb2tlV2lkdGggLSBzaXplIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRTdHJva2VXaWR0aCBwYXJhbSBpcyBkZWZpbmVkLCB7R3JhcGguX2ZvbnRTdHJva2VXaWR0aH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U3Ryb2tlV2lkdGggOiBmdW5jdGlvbihmb250U3Ryb2tlV2lkdGgpIHtcblx0XHRpZiAoZm9udFN0cm9rZVdpZHRoKSB7XG5cdFx0XHR0aGlzLl9mb250U3Ryb2tlV2lkdGggPSBmb250U3Ryb2tlV2lkdGg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250U3Ryb2tlV2lkdGg7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgZmFtaWx5IGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRGYW1pbHkgLSBBIHN0cmluZyBmb3IgdGhlIGZvbnQgZmFtaWx5IChhIGxhIEhUTUw1IENhbnZhcylcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250RmFtaWx5IHBhcmFtIGlzIGRlaWZuZWQsIHtHcmFwaC5fZm9udEZhbWlseX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250RmFtaWx5IDogZnVuY3Rpb24oZm9udEZhbWlseSkge1xuXHRcdGlmIChmb250RmFtaWx5KSB7XG5cdFx0XHR0aGlzLl9mb250RmFtaWx5ID0gZm9udEZhbWlseTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRGYW1pbHk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXNpemUgdGhlIGdyYXBoLiAgQXV0b21hdGljYWxseSBwZXJmb3JtcyBsYXlvdXQgYW5kIHJlcmVuZGVycyB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIHcgLSB0aGUgbmV3IHdpZHRoXG5cdCAqIEBwYXJhbSBoIC0gdGhlIG5ldyBoZWlnaHRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0cmVzaXplIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0dGhpcy5fd2lkdGggPSB3O1xuXHRcdHRoaXMuX2hlaWdodCA9IGg7XG5cdFx0JCh0aGlzLl9jYW52YXMpLmF0dHIoe3dpZHRoOncsaGVpZ2h0Omh9KVxuXHRcdFx0LndpZHRoKHcpXG5cdFx0XHQuaGVpZ2h0KGgpO1xuXHRcdHRoaXMuX3NjZW5lLnJlc2l6ZSh3LGgpO1xuXG5cdFx0aWYgKCF0aGlzLl9wYW5uYWJsZSAmJiAhdGhpcy5fem9vbWFibGUpIHtcblx0XHRcdHRoaXMubGF5b3V0KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyBhIGxpc3Qgb2YgcHJlL3Bvc3QgcmVuZGVyIG9iamVjdHMgZnJvbSB0aGUgbGF5b3V0ZXIgKGlmIGFueSlcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZGRQcmVBbmRQb3N0UmVuZGVyT2JqZWN0cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnJlbW92ZUFsbCgpO1xuXG5cdFx0Ly8gR2V0IHRoZSBiYWNrZ3JvdW5kIG9iamVjdHMgZnJvbSB0aGUgbGF5b3V0ZXJcblx0XHR2YXIgb2JqcyA9IHRoaXMuX2xheW91dGVyLnByZXJlbmRlcih0aGlzLl93aWR0aCx0aGlzLl9oZWlnaHQpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAob2Jqcykge1xuXHRcdFx0b2Jqcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlck9iamVjdCkge1xuXHRcdFx0XHR0aGF0Ll9wcmVyZW5kZXJHcm91cC5hZGRDaGlsZChyZW5kZXJPYmplY3QpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnJlbW92ZUFsbCgpO1xuXHRcdG9ianMgPSB0aGlzLl9sYXlvdXRlci5wb3N0cmVuZGVyKHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdFx0aWYgKG9ianMpIHtcblx0XHRcdG9ianMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJPYmplY3QpIHtcblx0XHRcdFx0dGhhdC5fcG9zdHJlbmRlckdyb3VwLmFkZENoaWxkKHJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblx0X2FkZFJlZ3JvdXBIYW5kbGVzIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHZhciB1bmdyb3VwZWROb2RlSW5mbyA9IHRoaXMuX2dyb3VwaW5nTWFuYWdlci5nZXRVbmdyb3VwZWROb2RlcygpO1xuXHRcdFx0dW5ncm91cGVkTm9kZUluZm8uZm9yRWFjaChmdW5jdGlvbih1bmdyb3VwZWROb2RlKSB7XG5cdFx0XHRcdHZhciBpbmRpY2VzID0gdW5ncm91cGVkTm9kZS5pbmRpY2VzO1xuXHRcdFx0XHR2YXIga2V5ID0gdW5ncm91cGVkTm9kZS5rZXk7XG5cdFx0XHRcdHZhciBiYm94ID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcyxSRUdST1VORF9CQl9QQURESU5HKTtcblx0XHRcdFx0dmFyIGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0ID0gcGF0aC5yZWN0KHtcblx0XHRcdFx0XHR4IDogYmJveC54LFxuXHRcdFx0XHRcdHkgOiBiYm94LnksXG5cdFx0XHRcdFx0Z3JhcGhqc190eXBlIDogJ3JlZ3JvdXBfdW5kZXJsYXknLFxuXHRcdFx0XHRcdGdyYXBoanNfaW5kaWNlcyA6IGluZGljZXMsXG5cdFx0XHRcdFx0d2lkdGggOiBiYm94LndpZHRoLFxuXHRcdFx0XHRcdGhlaWdodCA6IGJib3guaGVpZ2h0LFxuXHRcdFx0XHRcdHN0cm9rZVN0eWxlIDogJyMyMzIzMjMnLFxuXHRcdFx0XHRcdGZpbGxTdHlsZSA6ICcjMDAwMDAwJyxcblx0XHRcdFx0XHRvcGFjaXR5IDogMC4xXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRib3VuZGluZ0JveFJlbmRlck9iamVjdC5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRoYXQuX3N1c3BlbmRFdmVudHMoKTtcblx0XHRcdFx0XHR0aGF0LnJlZ3JvdXAoa2V5KTtcblx0XHRcdFx0XHR0aGF0Ll9yZXN1bWVFdmVudHMoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHRoYXQuX2hhbmRsZUdyb3VwLmFkZENoaWxkKGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZWRyYXcgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHVwZGF0ZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEcmF3IHRoZSBncmFwaC4gICBPbmx5IG5lZWRzIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgbm9kZXMvbGlua3MgaGF2ZSBiZWVuIHNldFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRkcmF3IDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXG5cdFx0aWYgKCF0aGlzLl9zY2VuZSkge1xuXHRcdFx0dGhpcy5fc2NlbmUgPSBwYXRoKHRoaXMuX2NhbnZhcyk7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5fbGF5b3V0ZXIpIHtcblx0XHRcdHZhciBkZWZhdWxMYXlvdXQgPSBuZXcgTGF5b3V0KClcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX25vZGVzKVxuXHRcdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0LmxhYmVsTWFwKHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXHRcdFx0dGhpcy5sYXlvdXRlcihkZWZhdWxMYXlvdXQpO1xuXHRcdH1cblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cCA9IHBhdGguZ3JvdXAoKTtcblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5zY2FsZVggPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb207XG5cdFx0dGhpcy5faGFuZGxlR3JvdXAgPSBwYXRoLmdyb3VwKCk7XG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwID0gcGF0aC5ncm91cCh7bm9IaXQ6dHJ1ZX0pO1xuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVggPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX2FkZFByZUFuZFBvc3RSZW5kZXJPYmplY3RzKCk7XG5cblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9wcmVyZW5kZXJHcm91cCk7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5faGFuZGxlR3JvdXApO1xuXHRcdHRoaXMuX2xpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXG5cdFx0XHR2YXIgbGlua09iamVjdDtcblx0XHRcdGlmICghbGluay50eXBlKSB7XG5cdFx0XHRcdGxpbmsudHlwZSA9IExJTktfVFlQRS5ERUZBVUxUO1xuXHRcdFx0fVxuXHRcdFx0c3dpdGNoKGxpbmsudHlwZSkge1xuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5BUlJPVzpcblx0XHRcdFx0XHRsaW5rLmhlYWRPZmZzZXQgPSBsaW5rLnRhcmdldC5yYWRpdXM7XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGguYXJyb3cobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkFSQzpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5hcmMobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkxJTkU6XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkRFRkFVTFQ6XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGgubGluZShsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5saW5lKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtsaW5rLnNvdXJjZS5pbmRleF0ucHVzaChsaW5rT2JqZWN0KTtcblx0XHRcdHRoYXQuX25vZGVJbmRleFRvTGlua0xpbmVbbGluay50YXJnZXQuaW5kZXhdLnB1c2gobGlua09iamVjdCk7XG5cblx0XHRcdHRoYXQuX3NjZW5lLmFkZENoaWxkKGxpbmtPYmplY3QpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgY2lyY2xlID0gcGF0aC5jaXJjbGUobm9kZSk7XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0NpcmNsZVtub2RlLmluZGV4XSA9IGNpcmNsZTtcblx0XHRcdGlmICh0aGF0Ll9ub2RlT3ZlciB8fCB0aGF0Ll9kcmFnZ2FibGUpIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignbW91c2VvdmVyJyk7XG5cdFx0XHRcdGNpcmNsZS5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX25vZGVPdmVyKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ub2RlT3ZlcihjaXJjbGUsIGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSE9PSdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IGNpcmNsZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhhdC5fc2NlbmUudXBkYXRlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoYXQuX25vZGVPdXQgfHwgdGhhdC5fZHJhZ2dhYmxlKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ21vdXNlb3V0Jyk7XG5cdFx0XHRcdGNpcmNsZS5vbignbW91c2VvdXQnLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRpZiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSE9PSdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRPdmVyTm9kZSA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0KSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ub2RlT3V0KGNpcmNsZSwgZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlQ2xpY2spIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignY2xpY2snKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdHRoYXQuX25vZGVDbGljayhjaXJjbGUsZSk7XG5cdFx0XHRcdFx0dGhhdC5fc2NlbmUudXBkYXRlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIGlmICh0aGF0Ll9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdFx0Y2lyY2xlLm9mZignY2xpY2snKTtcblx0XHRcdFx0Y2lyY2xlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdHRoYXQudW5ncm91cChjaXJjbGUpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoYXQuX3NjZW5lLmFkZENoaWxkKGNpcmNsZSk7XG5cblx0XHRcdGlmIChub2RlLmxhYmVsKSB7XG5cdFx0XHRcdHRoYXQuYWRkTGFiZWwobm9kZSxub2RlLmxhYmVsKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMuX2xheW91dGVyLmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdC5ub2RlTWFwKHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKVxuXHRcdFx0LmxhYmVsTWFwKHRoaXMuX25vZGVJbmRleFRvTGFiZWwpO1xuXG5cdFx0Ly8gRHJhdyBhbnkgdW5ncm91cGVkIG5vZGUgYm91bmRpbmcgYm94ZXNcblx0XHR0aGlzLl9hZGRSZWdyb3VwSGFuZGxlcygpO1xuXG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5fcG9zdHJlbmRlckdyb3VwKTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X2RlYnVnRHJhd0JvdW5kaW5nQm94IDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMpO1xuXHRcdGlmICh0aGlzLl9iYlJlbmRlcikge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5fYmJSZW5kZXIpO1xuXHRcdH1cblx0XHR0aGlzLl9iYlJlbmRlciA9IHBhdGgucmVjdCh7XG5cdFx0XHR4IDogYm91bmRpbmdCb3gueCxcblx0XHRcdHkgOiBib3VuZGluZ0JveC55LFxuXHRcdFx0d2lkdGggOiBib3VuZGluZ0JveC53aWR0aCxcblx0XHRcdGhlaWdodCA6IGJvdW5kaW5nQm94LmhlaWdodCxcblx0XHRcdHN0cm9rZVN0eWxlIDogJyNmZjAwMDAnLFxuXHRcdFx0bGluZVdpZHRoIDogMlxuXHRcdH0pO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX2JiUmVuZGVyKTtcblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0fSxcblxuXHQvKipcblx0ICogRml0IHRoZSBncmFwaCB0byB0aGUgc2NyZWVuXG5cdCAqL1xuXHRmaXQgOiBmdW5jdGlvbihwYWRkaW5nKSB7XG5cblx0XHQvLyBSZXR1cm4gYmFjayB0byBvcmlnaW5cblx0XHR0aGlzLl9wYW4oLXRoaXMuX3NjZW5lLngsLXRoaXMuX3NjZW5lLnkpO1xuXG5cblxuXHRcdC8vIFdvcmtpbmcgd2l0aCBiaWcgbnVtYmVycywgaXQncyBiZXR0ZXIgaWYgd2UgZG8gdGhpcyB0d2ljZS5cblx0XHR2YXIgYm91bmRpbmdCb3g7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAyOyBpKyspIHtcblx0XHRcdGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMscGFkZGluZyk7XG5cdFx0XHR2YXIgeFJhdGlvID0gdGhpcy5fc2NlbmUud2lkdGggLyBib3VuZGluZ0JveC53aWR0aDtcblx0XHRcdHZhciB5UmF0aW8gPSB0aGlzLl9zY2VuZS5oZWlnaHQgLyBib3VuZGluZ0JveC5oZWlnaHQ7XG5cdFx0XHR0aGlzLl96b29tKE1hdGgubWluKHhSYXRpbywgeVJhdGlvKSwgMCwgMCk7XG5cdFx0fVxuXG5cdFx0dmFyIG1pZFNjcmVlblggPSB0aGlzLl9zY2VuZS53aWR0aCAvIDI7XG5cdFx0dmFyIG1pZFNjcmVlblkgPSB0aGlzLl9zY2VuZS5oZWlnaHQgLyAyO1xuXHRcdGJvdW5kaW5nQm94ID0gdGhpcy5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3godGhpcy5fbm9kZXMpO1xuXHRcdHZhciBtaWRCQlggPSBib3VuZGluZ0JveC54ICsgYm91bmRpbmdCb3gud2lkdGggLyAyO1xuXHRcdHZhciBtaWRCQlkgPSBib3VuZGluZ0JveC55ICsgYm91bmRpbmdCb3guaGVpZ2h0IC8gMjtcblx0XHR0aGlzLl9wYW4oLShtaWRCQlgtbWlkU2NyZWVuWCksLShtaWRCQlktbWlkU2NyZWVuWSkpO1xuXG5cdFx0dGhpcy5fem9vbVNjYWxlID0gMS4wO1xuXHRcdHRoaXMuX2xheW91dGVyLl96b29tU2NhbGUgPSAxLjA7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRfc3VzcGVuZEV2ZW50cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IHRydWU7XG5cdH0sXG5cblx0X3Jlc3VtZUV2ZW50cyA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2V2ZW50c1N1c3BlbmRlZCA9IGZhbHNlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIGFsbCByZW5kZXIgb2JqZWN0cyBhc3NvY2lhdGVkIHdpdGggYSBncmFwaC5cblx0ICovXG5cdGNsZWFyIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHJlbW92ZVJlbmRlck9iamVjdHMgPSBmdW5jdGlvbihpbmRleFRvT2JqZWN0KSB7XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gaW5kZXhUb09iamVjdCkge1xuXHRcdFx0XHRpZiAoaW5kZXhUb09iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0dmFyIG9iaiA9IGluZGV4VG9PYmplY3Rba2V5XTtcblx0XHRcdFx0XHRpZiAoJC5pc0FycmF5KG9iaikpIHtcblx0XHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKG9ialtpXSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGRlbGV0ZSBpbmRleFRvT2JqZWN0W2tleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHRcdHJlbW92ZVJlbmRlck9iamVjdHMuY2FsbCh0aGlzLHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlKTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lKTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHRpZiAodGhpcy5fcHJlcmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX3ByZXJlbmRlckdyb3VwKTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2hhbmRsZUdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9oYW5kbGVHcm91cCk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9wb3N0cmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCk7XG5cdFx0fVxuXHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuXG5leHBvcnRzLkxJTktfVFlQRSA9IHJlcXVpcmUoJy4vbGlua1R5cGUnKTtcbmV4cG9ydHMuR3JvdXBpbmdNYW5hZ2VyID0gcmVxdWlyZSgnLi9ncm91cGluZ01hbmFnZXInKTtcbmV4cG9ydHMuTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbmV4cG9ydHMuQ29sdW1uTGF5b3V0ID0gcmVxdWlyZSgnLi9jb2x1bW5MYXlvdXQnKTtcbmV4cG9ydHMuUmFkaWFsTGF5b3V0ID0gcmVxdWlyZSgnLi9yYWRpYWxMYXlvdXQnKTtcbmV4cG9ydHMuRXh0ZW5kID0gXy5leHRlbmQ7XG5leHBvcnRzLkdyYXBoID0gR3JhcGg7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuLyoqXG4gKlxuICogQHBhcmFtIGZvY3VzIC0gdGhlIG5vZGUgYXQgdGhlIGNlbnRlciBvZiB0aGUgcmFkaWFsIGxheW91dFxuICogQHBhcmFtIGRpc3RhbmNlIC0gdGhlIGRpc3RhbmNlIG9mIG90aGVyIG5vZGVzIGZyb20gdGhlIGZvY3VzXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gUmFkaWFsTGF5b3V0KGZvY3VzLGRpc3RhbmNlKSB7XG5cdHRoaXMuX2ZvY3VzID0gZm9jdXM7XG5cdHRoaXMuX2Rpc3RhbmNlID0gZGlzdGFuY2U7XG5cblx0TGF5b3V0LmFwcGx5KHRoaXMpO1xufVxuXG5cblJhZGlhbExheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChSYWRpYWxMYXlvdXQucHJvdG90eXBlLCBMYXlvdXQucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGRpc3RhbmNlIHBhcmFtZXRlclxuXHQgKiBAcGFyYW0gZGlzdGFuY2UgLSB0aGUgZGlzdGFuY2Ugb2YgbGlua3MgZnJvbSB0aGUgZm9jdXMgbm9kZSB0byBvdGhlciBub2RlcyBpbiBwaXhlbHNcblx0ICogQHJldHVybnMge1JhZGlhbExheW91dH0gaWYgZGlzdGFuY2UgcGFyYW0gaXMgZGVmaW5lZCwge1JhZGlhbExheW91dC5fZGlzdGFuY2V9IG90aGVyd2lzZVxuXHQgKi9cblx0ZGlzdGFuY2U6IGZ1bmN0aW9uIChkaXN0YW5jZSkge1xuXHRcdGlmIChkaXN0YW5jZSkge1xuXHRcdFx0dGhpcy5fZGlzdGFuY2UgPSBkaXN0YW5jZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2Rpc3RhbmNlO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBmb2N1cyBub2RlIHRoYXQgaXMgYXQgdGhlIGNlbnRlciBvZiB0aGUgbGF5b3V0XG5cdCAqIEBwYXJhbSBmb2N1cyAtIHRoZSBub2RlIHRoYXQgaXMgYXQgdGhlIGNlbnRlciBvZiB0aGUgbGF5b3V0LiAgIE90aGVyIG5vZGVzIGFyZSBjZW50ZXJlZCBhcm91bmQgdGhpcy5cblx0ICogQHJldHVybnMge1JhZGlhbExheW91dH0gaWYgZm9jdXMgcGFyYW0gaXMgZGVmaW5lZCwge1JhZGlhbExheW91dC5fZm9jdXN9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9jdXM6IGZ1bmN0aW9uIChmb2N1cykge1xuXHRcdGlmIChmb2N1cykge1xuXHRcdFx0dGhpcy5fZm9jdXMgPSBmb2N1cztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvY3VzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0IHRoZSBsYWJlbCBwb3NpdGlvbiBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWCAtIHRoZSB4IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlWSAtIHRoZSB5IHBvc2l0aW9uIG9mIHRoZSBub2RlXG5cdCAqIEBwYXJhbSByYWRpdXMgLSB0aGUgcmFkaXVzIG9mIHRoZSBub2RlXG5cdCAqIEByZXR1cm5zIHt7eDogeCBwb3NpdGlvbiBvZiB0aGUgbGFiZWwsIHk6IHkgcG9zaXRpb24gb2YgdGhlIGxhYmVsLCBhbGlnbjogSFRNTCBjYW52YXMgdGV4dCBhbGlnbm1lbnQgcHJvcGVydHkgZm9yIGxhYmVsfX1cblx0ICovXG5cdGxheW91dExhYmVsOiBmdW5jdGlvbiAobm9kZVgsIG5vZGVZLCByYWRpdXMpIHtcblx0XHR2YXIgeCwgeSwgYWxpZ247XG5cblx0XHQvLyBSaWdodCBvZiBjZW50ZXJcblx0XHRpZiAobm9kZVggPiB0aGlzLl9mb2N1cykge1xuXHRcdFx0eCA9IG5vZGVYICsgKHJhZGl1cyArIDEwKTtcblx0XHRcdGFsaWduID0gJ3N0YXJ0Jztcblx0XHR9IGVsc2Uge1xuXHRcdFx0eCA9IG5vZGVYIC0gKHJhZGl1cyArIDEwKTtcblx0XHRcdGFsaWduID0gJ2VuZCc7XG5cdFx0fVxuXG5cdFx0aWYgKG5vZGVZID4gdGhpcy5fZm9jdXMpIHtcblx0XHRcdHkgPSBub2RlWSArIChyYWRpdXMgKyAxMCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHkgPSBub2RlWSAtIChyYWRpdXMgKyAxMCk7XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHR4OiB4LFxuXHRcdFx0eTogeSxcblx0XHRcdGFsaWduOiBhbGlnblxuXHRcdH07XG5cdH0sXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gYSByYWRpYWwgbGF5b3V0XG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICovXG5cdGxheW91dDogZnVuY3Rpb24gKHcsIGgpIHtcblx0XHR2YXIgbm9kZXMgPSB0aGlzLm5vZGVzKCk7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBhbmdsZURlbHRhID0gTWF0aC5QSSAqIDIgLyAobm9kZXMubGVuZ3RoIC0gMSk7XG5cdFx0dmFyIGFuZ2xlID0gMC4wO1xuXHRcdG5vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcblx0XHRcdGlmIChub2RlLmluZGV4ID09PSB0aGF0Ll9mb2N1cy5pbmRleCkge1xuXHRcdFx0XHR0aGF0Ll9zZXROb2RlUG9zaXRpb24obm9kZSwgbm9kZS54LCBub2RlLnkpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR2YXIgbmV3WCA9IHRoYXQuX2ZvY3VzLnggKyAoTWF0aC5jb3MoYW5nbGUpICogdGhhdC5fZGlzdGFuY2UpO1xuXHRcdFx0dmFyIG5ld1kgPSB0aGF0Ll9mb2N1cy55ICsgKE1hdGguc2luKGFuZ2xlKSAqIHRoYXQuX2Rpc3RhbmNlKTtcblx0XHRcdHRoYXQuX3NldE5vZGVQb3NpdGlvbihub2RlLCBuZXdYLCBuZXdZKTtcblx0XHRcdGFuZ2xlICs9IGFuZ2xlRGVsdGE7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJhZGlhbExheW91dDtcbiIsIlxudmFyIFV0aWwgPSB7XG5cbiAgZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG4gICAgdmFyIGtleSwgaSwgc291cmNlO1xuICAgIGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yIChrZXkgaW4gc291cmNlKSB7XG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXN0O1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(5)
});
