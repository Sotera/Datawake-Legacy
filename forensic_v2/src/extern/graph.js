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
		function onComplete() {
			if (callback) {
				callback();
			}
		}

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
			this._suspendEvents();
			this._layouter.layout(this._canvas.width,this._canvas.height,function() {
				callback();
				this._resumeEvents();
			});


			// Update the regroup underlays
			var that = this;
			if (this._handleGroup && this._handleGroup.children) {
				this._suspendEvents();
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
						easing: that._layouter.easing(),
						callback : function() {
							if (updated == underlays.length) {
								this._resumeEvents();
							} else {
								updated++;
							}
						}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2NvbHVtbkxheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2xpbmtUeXBlLmpzIiwiL1VzZXJzL2NkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3JhZGlhbExheW91dC5qcyIsIi9Vc2Vycy9jZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5cbnZhciBDb2x1bW5MYXlvdXQgPSBmdW5jdGlvbigpIHtcblx0TGF5b3V0LmFwcGx5KHRoaXMpO1xufTtcblxuQ29sdW1uTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKENvbHVtbkxheW91dC5wcm90b3R5cGUsIExheW91dC5wcm90b3R5cGUsIHtcblxuXHQvKipcblx0ICogQSBjb2x1bW4gbGF5b3V0XG5cdCAqIEBwYXJhbSB3IC0gd2lkdGggb2YgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gaGVpZ2h0IG9mIGNhbnZhc1xuXHQgKi9cblx0bGF5b3V0IDogZnVuY3Rpb24gKHcsIGgpIHtcblx0XHR2YXIgeCA9IDA7XG5cdFx0dmFyIHkgPSAwO1xuXHRcdHZhciBtYXhSYWRpdXNDb2wgPSAwO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG5cblx0XHRcdGlmICh5ID09PSAwKSB7XG5cdFx0XHRcdHkgKz0gbm9kZS5yYWRpdXM7XG5cdFx0XHR9XG5cdFx0XHRpZiAoeCA9PT0gMCkge1xuXHRcdFx0XHR4ICs9IG5vZGUucmFkaXVzO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGF0Ll9zZXROb2RlUG9zaXRpb25JbW1lZGlhdGUobm9kZSwgeCwgeSk7XG5cblx0XHRcdG1heFJhZGl1c0NvbCA9IE1hdGgubWF4KG1heFJhZGl1c0NvbCwgbm9kZS5yYWRpdXMpO1xuXG5cdFx0XHR5ICs9IG5vZGUucmFkaXVzICsgNDA7XG5cdFx0XHRpZiAoeSA+IGgpIHtcblx0XHRcdFx0eSA9IDA7XG5cdFx0XHRcdHggKz0gbWF4UmFkaXVzQ29sICsgNDA7XG5cdFx0XHRcdG1heFJhZGl1c0NvbCA9IDA7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbHVtbkxheW91dDtcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJhc2UgZ3JvdXBpbmcgbWFuYWdlci4gICBUaGlzIGlzIGFuIGFic3RyYWN0IGNsYXNzLiAgIENoaWxkIGNsYXNzZXMgc2hvdWxkIG92ZXJyaWRlIHRoZVxuICogaW5pdGlhbGl6ZUhlaXJhcmNoeSBmdW5jdGlvbiB0byBjcmVhdGUgbm9kZXMvbGlua3MgdGhhdCBhcmUgYWdncmVnYXRlZCBmb3IgdGhlaXIgc3BlY2lmaWMgaW1wbGVtZW50YXRpb25cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgR3JvdXBpbmdNYW5hZ2VyID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9ub2RlcyA9IFtdO1xuXHR0aGlzLl9saW5rcyA9IFtdO1xuXG5cdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IFtdO1xuXHR0aGlzLl9hZ2dyZWdhdGVkTGlua3MgPSBbXTtcblx0dGhpcy5fYWdncmVnYXRlTm9kZU1hcCA9IHt9O1xuXG5cdHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXMgPSB7fTtcblx0dGhpcy5fdW5ncm91cGVkTm9kZUdyb3VwcyA9IHt9O1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5Hcm91cGluZ01hbmFnZXIucHJvdG90eXBlID0gXy5leHRlbmQoR3JvdXBpbmdNYW5hZ2VyLnByb3RvdHlwZSwge1xuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBvcmlnaW5hbCBub2RlcyBpbiB0aGUgZ3JhcGggd2l0aG91dCBncm91cGluZ1xuXHQgKiBAcGFyYW0gbm9kZXMgLSBhIGdyYXBoLmpzIG5vZGUgYXJyYXlcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRub2RlcyA6IGZ1bmN0aW9uKG5vZGVzKSB7XG5cdFx0aWYgKG5vZGVzKSB7XG5cdFx0XHR0aGlzLl9ub2RlcyA9IG5vZGVzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG9yaWdpbmFsIGxpbmtzIGluIHRoZSBncmFwaCB3aXRob3V0IGdyb3VwaW5nXG5cdCAqIEBwYXJhbSBsaW5rcyAtIGEgZ3JhcGguanMgbGluayBhcnJheVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGxpbmtzIDogZnVuY3Rpb24obGlua3MpIHtcblx0XHRpZiAobGlua3MpIHtcblx0XHRcdHRoaXMuX2xpbmtzID0gbGlua3M7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9saW5rcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEluaXRpYWxpemVzIHRoZSBub2RlL2xpbmsgYWdncmVnYXRpb25cblx0ICovXG5cdGluaXRpYWxpemVIZWlyYXJjaHkgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9hZ2dyZWdhdGVOb2RlcygpO1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZUxpbmtzKCk7XG5cblx0XHR2YXIgc2V0UGFyZW50UG9pbnRlcnMgPSBmdW5jdGlvbihub2RlLHBhcmVudCkge1xuXHRcdFx0aWYgKG5vZGUuY2hpbGRyZW4pIHtcblx0XHRcdFx0bm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRcdFx0c2V0UGFyZW50UG9pbnRlcnMoY2hpbGQsbm9kZSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0bm9kZS5wYXJlbnROb2RlID0gcGFyZW50O1xuXHRcdH07XG5cblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRzZXRQYXJlbnRQb2ludGVycyhub2RlLG51bGwpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFnZ3JlZ2F0ZWQgbGluayBpbiBncmFwaC5qcyBmb3JtYXQuICAgQ2FuIGJlIG92ZXJyaWRlbiBieSBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvbnMgdG8gYWxsb3dcblx0ICogdG8gYWxsb3cgZm9yIGRpZmVyZW50IGxpbmsgdHlwZXMgYmFzZWQgb24gYWdncmVnYXRlIGNvbnRlbnRzXG5cdCAqIEBwYXJhbSBzb3VyY2VBZ2dyZWdhdGUgLSB0aGUgc291cmNlIGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEBwYXJhbSB0YXJnZXRBZ2dyZWdhdGUgLSB0aGUgdGFyZ2V0IGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEByZXR1cm5zIHt7c291cmNlOiAqLCB0YXJnZXQ6ICp9fSAtIGEgZ3JhcGguanMgbGlua1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2NyZWF0ZUFnZ3JlZ2F0ZUxpbmsgOiBmdW5jdGlvbihzb3VyY2VBZ2dyZWdhdGUsdGFyZ2V0QWdncmVnYXRlLG9yaWdpbmFsTGlua3MpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c291cmNlIDogc291cmNlQWdncmVnYXRlLFxuXHRcdFx0dGFyZ2V0IDogdGFyZ2V0QWdncmVnYXRlXG5cdFx0fTtcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgbGluayBhZ2dyZWdhdGUgYmFzZWQgb24gYSBzZXQgb2YgYWdncmVnYXRlZCBub2RlcyBhbmQgYSBmdWxsIHNldCBvZiBsaW5rc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZUxpbmtzIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGUgPSB7fTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLmZvckVhY2goZnVuY3Rpb24oYWdncmVnYXRlKSB7XG5cdFx0XHRpZiAoYWdncmVnYXRlLmNoaWxkcmVuKSB7XG5cdFx0XHRcdGFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0XHRub2RlSW5kZXhUb0FnZ3JlYWdhdGVOb2RlW25vZGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbYWdncmVnYXRlLmluZGV4XSA9IGFnZ3JlZ2F0ZTtcblx0XHRcdH1cblx0XHRcdHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbYWdncmVnYXRlLmluZGV4XSA9IGFnZ3JlZ2F0ZTtcblx0XHR9KTtcblxuXG5cdFx0dmFyIGFnZ3JlZ2F0ZWRMaW5rcyA9IFtdO1xuXG5cdFx0dmFyIGFnZ3JlZ2F0ZUxpbmtNYXAgPSB7fTtcblxuXHRcdHRoaXMuX2xpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXHRcdFx0dmFyIHNvdXJjZUFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay5zb3VyY2UuaW5kZXhdO1xuXHRcdFx0dmFyIHRhcmdldEFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay50YXJnZXQuaW5kZXhdO1xuXG5cdFx0XHR2YXIgc291cmNlTWFwID0gYWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGUuaW5kZXhdO1xuXHRcdFx0aWYgKCFzb3VyY2VNYXApIHtcblx0XHRcdFx0c291cmNlTWFwID0ge307XG5cdFx0XHR9XG5cdFx0XHR2YXIgc291cmNlVG9UYXJnZXRMaW5rcyA9IHNvdXJjZU1hcFt0YXJnZXRBZ2dyZWdhdGUuaW5kZXhdO1xuXHRcdFx0aWYgKCFzb3VyY2VUb1RhcmdldExpbmtzKSB7XG5cdFx0XHRcdHNvdXJjZVRvVGFyZ2V0TGlua3MgPSBbXTtcblx0XHRcdH1cblx0XHRcdHNvdXJjZVRvVGFyZ2V0TGlua3MucHVzaChsaW5rKTtcblx0XHRcdHNvdXJjZU1hcFt0YXJnZXRBZ2dyZWdhdGUuaW5kZXhdID0gc291cmNlVG9UYXJnZXRMaW5rcztcblxuXHRcdFx0YWdncmVnYXRlTGlua01hcFtzb3VyY2VBZ2dyZWdhdGUuaW5kZXhdID0gc291cmNlTWFwO1xuXHRcdH0pO1xuXG5cdFx0Zm9yICh2YXIgc291cmNlQWdncmVnYXRlSWQgaW4gYWdncmVnYXRlTGlua01hcCkge1xuXHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXAuaGFzT3duUHJvcGVydHkoc291cmNlQWdncmVnYXRlSWQpKSB7XG5cdFx0XHRcdGZvciAodmFyIHRhcmdldEFnZ3JlZ2F0ZUlkIGluIGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdKSB7XG5cdFx0XHRcdFx0aWYgKGFnZ3JlZ2F0ZUxpbmtNYXBbc291cmNlQWdncmVnYXRlSWRdLmhhc093blByb3BlcnR5KHRhcmdldEFnZ3JlZ2F0ZUlkKSkge1xuXHRcdFx0XHRcdFx0dmFyIHNvdXJjZSA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbc291cmNlQWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIHRhcmdldCA9IHRoYXQuX2FnZ3JlZ2F0ZU5vZGVNYXBbdGFyZ2V0QWdncmVnYXRlSWRdO1xuXHRcdFx0XHRcdFx0dmFyIG9yaWdpbmFsTGlua3MgPSBhZ2dyZWdhdGVMaW5rTWFwW3NvdXJjZUFnZ3JlZ2F0ZUlkXVt0YXJnZXRBZ2dyZWdhdGVJZF07XG5cdFx0XHRcdFx0XHR2YXIgbGluayA9IHRoYXQuX2NyZWF0ZUFnZ3JlZ2F0ZUxpbmsoc291cmNlLCB0YXJnZXQsIG9yaWdpbmFsTGlua3MpO1xuXHRcdFx0XHRcdFx0aWYgKGxpbmspIHtcblx0XHRcdFx0XHRcdFx0YWdncmVnYXRlZExpbmtzLnB1c2gobGluayk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fYWdncmVnYXRlZExpbmtzID0gYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gbm9kZSBhZ2dyZWdhdGlvbi4gICBNdXN0IGJlIG92ZXJyaWRlbiBieSBpbXBsZW1lbnRvcnNcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZ2dyZWdhdGVOb2RlcyA6IGZ1bmN0aW9uKCkge1xuXG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIGFnZ3JlZ2F0ZWQgbm9kZXNcblx0ICogQHJldHVybnMge0FycmF5fSBvZiBncmFwaC5qcyBub2Rlc1xuXHQgKi9cblx0YWdncmVnYXRlZE5vZGVzIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcztcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBsaW5rc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIGxpbmtzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTGlua3MgOiBmdW5jdGlvbigpICB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWRMaW5rcztcblx0fSxcblxuXHRyZW1vdmUgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoICYmIGluZGV4ID09PSAtMTsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5fYWdncmVnYXRlZE5vZGVzW2ldLmluZGV4ID09PSBub2RlLmluZGV4KSB7XG5cdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGluZGV4ICE9PSAtMSkge1xuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLnNwbGljZShpbmRleCwxKTtcblx0XHR9XG5cdH0sXG5cblxuXHQvKipcblx0ICogRG8gYW55IHVwZGF0ZXMgb24gY2hpbGRyZW4gYmVmb3JlIGxheW91dCAgKGllLyBzZXQgcG9zaXRpb24sIHJvdy9jb2wgaW5mbywgZXRjKS4gICBTaG91bGQgYmUgZGVmaW5lZFxuXHQgKiBpbiBpbXBsZW1lbnRpbmcgY2xhc3Ncblx0ICogQHBhcmFtIGFnZ3JlZ2F0ZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3VwZGF0ZUNoaWxkcmVuIDogZnVuY3Rpb24oYWdncmVnYXRlKSB7XG5cdFx0Ly8gc2V0IGNoaWxkcmVucyBwb3NpdGlvbiBpbml0aWFsbHkgdG8gdGhlIHBvc2l0aW9uIG9mIHRoZSBhZ2dyZWdhdGVcblx0XHRhZ2dyZWdhdGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0Y2hpbGQueCA9IGFnZ3JlZ2F0ZS54O1xuXHRcdFx0Y2hpbGQueSA9IGFnZ3JlZ2F0ZS55O1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVbmdyb3VwIGFuIGFnZ3JlZ2F0ZSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqL1xuXHR1bmdyb3VwIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdGlmIChub2RlLmNoaWxkcmVuKSB7XG5cblx0XHRcdHZhciBwYXJlbnRLZXkgPSAnJztcblx0XHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHRcdHBhcmVudEtleSArPSBub2RlLmluZGV4ICsgJywnO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbcGFyZW50S2V5XSA9IG5vZGU7XG5cblx0XHRcdHZhciBpbmRleCA9IC0xO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoICYmIGluZGV4ID09PSAtMTsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0XHRpbmRleCA9IGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fdXBkYXRlQ2hpbGRyZW4obm9kZSk7XG5cblx0XHRcdHZhciBmaXJzdCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZSgwLGluZGV4KTtcblx0XHRcdHZhciBtaWRkbGUgPSBub2RlLmNoaWxkcmVuO1xuXHRcdFx0dGhpcy5fdW5ncm91cGVkTm9kZUdyb3Vwc1twYXJlbnRLZXldID0gbm9kZS5jaGlsZHJlbjtcblx0XHRcdHZhciBlbmQgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoaW5kZXgrMSk7XG5cblx0XHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2RlcyA9IGZpcnN0LmNvbmNhdChtaWRkbGUpLmNvbmNhdChlbmQpO1xuXG5cdFx0XHQvLyBSZWNvbXB1dGUgYWdncmVnYXRlZCBsaW5rc1xuXHRcdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblx0XHR9XG5cdH0sXG5cdGdldEFnZ3JlZ2F0ZSA6IGZ1bmN0aW9uKGFnZ3JlZ2F0ZUtleSkge1xuXHRcdHJldHVybiB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdH0sXG5cblx0cmVncm91cCA6IGZ1bmN0aW9uKGFnZ3JlZ2F0ZUtleSxhdEluZGV4KSB7XG5cdFx0dmFyIGFnZ3JlZ2F0ZU5vZGUgPSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0dmFyIG5vZGVzVG9SZW1vdmUgPSBhZ2dyZWdhdGVOb2RlLmNoaWxkcmVuO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRub2Rlc1RvUmVtb3ZlLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dGhhdC5yZW1vdmUobm9kZSk7XG5cdFx0fSk7XG5cdFx0dmFyIHN0YXJ0ID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKDAsYXRJbmRleCk7XG5cdFx0dmFyIGVuZCA9IHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5zbGljZShhdEluZGV4KTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBzdGFydC5jb25jYXQoYWdncmVnYXRlTm9kZSkuY29uY2F0KGVuZCk7XG5cdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblx0XHRkZWxldGUgdGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1thZ2dyZWdhdGVLZXldO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzW2FnZ3JlZ2F0ZUtleV07XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgYW4gYXJyYXkgb2Ygbm9kZSBncm91cHMgdGhhdCBhcmUgZXhwYW5kZWRcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0Z2V0VW5ncm91cGVkTm9kZXMgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgaW5mbyA9IFtdO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRPYmplY3Qua2V5cyh0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0dmFyIG5vZGVzID0gdGhhdC5fdW5ncm91cGVkTm9kZUdyb3Vwc1trZXldO1xuXHRcdFx0dmFyIG5vZGVJbmRpY2VzID0gbm9kZXMubWFwKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0cmV0dXJuIG5vZGUuaW5kZXg7XG5cdFx0XHR9KTtcblx0XHRcdGluZm8ucHVzaCh7XG5cdFx0XHRcdGluZGljZXMgOiBub2RlSW5kaWNlcyxcblx0XHRcdFx0a2V5IDoga2V5XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gaW5mbztcblx0fVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cGluZ01hbmFnZXI7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIExheW91dCBjb25zdHJ1Y3RvclxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBMYXlvdXQgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gbnVsbDtcblx0dGhpcy5fbGlua01hcCA9IG51bGw7XG5cdHRoaXMuX25vZGVNYXAgPSBudWxsO1xuXHR0aGlzLl9sYWJlbE1hcCA9IG51bGw7XG5cdHRoaXMuX2R1cmF0aW9uID0gMjUwO1xuXHR0aGlzLl9lYXNpbmcgPSAnZWFzZS1pbi1vdXQnO1xuXHR0aGlzLl9pc1VwZGF0ZSA9IGZhbHNlO1xuXHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGR1cmF0aW9uIG9mIHRoZSBsYXlvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9IDI1MG1zKVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBkdXJhdGlvbiBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9kdXJhdGlvbn0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRkdXJhdGlvbiA6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0aWYgKGR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLl9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZHVyYXRpb247XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gZWFzaW5nIC0gdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9ICdlYXNlLWluLW91dCcpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGVhc2luZyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9lYXNpbmd9IG90aGVyd2lzZVxuXHQgKi9cblx0ZWFzaW5nIDogZnVuY3Rpb24oZWFzaW5nKSB7XG5cdFx0aWYgKGVhc2luZykge1xuXHRcdFx0dGhpcy5fZWFzaW5nID0gZWFzaW5nO1xuXHRcdH1cdCBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9lYXNpbmc7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlcyAtIHRoZSBzZXQgb2Ygbm9kZXMgZGVmaW5lZCBpbiB0aGUgY29ycmVzcG9uZGluZyBncmFwaFxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBub2RlcyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2Rlc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlcyA6IGZ1bmN0aW9uKG5vZGVzKSB7XG5cdFx0aWYgKG5vZGVzKSB7XG5cdFx0XHR0aGlzLl9pc1VwZGF0ZSA9IG5vZGVzID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2Rlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBsaW5rIG1hcCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGlua01hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIHNldCBvZiBsaW5lcyAocGF0aCBvYmplY3RzKSB0aGF0IGNvbnRhaW4gdGhhdCBub2RlXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGxpbmtNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbGlua01hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsaW5rTWFwIDogZnVuY3Rpb24obGlua01hcCkge1xuXHRcdGlmIChsaW5rTWFwKSB7XG5cdFx0XHR0aGlzLl9saW5rTWFwID0gbGlua01hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGUgbWFwIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgY2lyY2xlIChwYXRoIG9iamVjdClcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbm9kZU1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2RlTWFwfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVNYXAgOiBmdW5jdGlvbihub2RlTWFwKSB7XG5cdFx0aWYgKG5vZGVNYXApIHtcblx0XHRcdHRoaXMuX25vZGVNYXAgPSBub2RlTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZU1hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbGFiZWwgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxhYmVsTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgdGV4dCBvYmplY3QgKHBhdGggb2JqZWN0KVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBsYWJlbE1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9sYWJlbE1hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsYWJlbE1hcCA6IGZ1bmN0aW9uKGxhYmVsTWFwKSB7XG5cdFx0aWYgKGxhYmVsTWFwKSB7XG5cdFx0XHR0aGlzLl9sYWJlbE1hcCA9IGxhYmVsTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGFiZWxNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgYm91bmRpbmcgYm94IGZvciBhbiBhcnJheSBvZiBub2RlIGluZGljZXNcblx0ICogQHBhcmFtIG5vZGVPckluZGV4QXJyYXkgLSBhcnJheSBvZiBub2RlIGluZGljaWVzIG9yIG5vZGUgYXJyYXkgaXRzZWxmXG5cdCAqIEBwYXJhbSBwYWRkaW5nIC0gcGFkZGluZyBpbiBwaXhlbHMgYXBwbGllZCB0byBib3VuZGluZyBib3hcblx0ICogQHJldHVybnMge3ttaW46IHt4OiBOdW1iZXIsIHk6IE51bWJlcn0sIG1heDoge3g6IG51bWJlciwgeTogbnVtYmVyfX19XG5cdCAqL1xuXHRnZXRCb3VuZGluZ0JveCA6IGZ1bmN0aW9uKG5vZGVPckluZGV4QXJyYXkscGFkZGluZykge1xuXHRcdHZhciBtaW4gPSB7XG5cdFx0XHR4IDogTnVtYmVyLk1BWF9WQUxVRSxcblx0XHRcdHkgOiBOdW1iZXIuTUFYX1ZBTFVFXG5cdFx0fTtcblx0XHR2YXIgbWF4ID0ge1xuXHRcdFx0eCA6IC1OdW1iZXIuTUFYX1ZBTFVFLFxuXHRcdFx0eSA6IC1OdW1iZXIuTUFYX1ZBTFVFXG5cdFx0fTtcblxuXHRcdHZhciBiYlBhZGRpbmcgPSBwYWRkaW5nIHx8IDA7XG5cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0bm9kZU9ySW5kZXhBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVPckluZGV4KSB7XG5cdFx0XHR2YXIgaWR4ID0gbm9kZU9ySW5kZXggaW5zdGFuY2VvZiBPYmplY3QgPyBub2RlT3JJbmRleC5pbmRleCA6IG5vZGVPckluZGV4O1xuXHRcdFx0dmFyIGNpcmNsZSA9IHRoYXQuX25vZGVNYXBbaWR4XTtcblx0XHRcdG1pbi54ID0gTWF0aC5taW4obWluLngsIChjaXJjbGUuZmluYWxYIHx8IGNpcmNsZS54KSAtIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0XHRtaW4ueSA9IE1hdGgubWluKG1pbi55LCAoY2lyY2xlLmZpbmFsWSB8fCBjaXJjbGUueSkgLSAoY2lyY2xlLnJhZGl1cyArIGJiUGFkZGluZykpO1xuXHRcdFx0bWF4LnggPSBNYXRoLm1heChtYXgueCwgKGNpcmNsZS5maW5hbFggfHwgY2lyY2xlLngpICsgKGNpcmNsZS5yYWRpdXMgKyBiYlBhZGRpbmcpKTtcblx0XHRcdG1heC55ID0gTWF0aC5tYXgobWF4LnksIChjaXJjbGUuZmluYWxZIHx8IGNpcmNsZS55KSArIChjaXJjbGUucmFkaXVzICsgYmJQYWRkaW5nKSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHggOiBtaW4ueCxcblx0XHRcdHkgOiBtaW4ueSxcblx0XHRcdHdpZHRoIDogKG1heC54IC0gbWluLngpLFxuXHRcdFx0aGVpZ2h0IDogKG1heC55IC0gbWluLnkpXG5cdFx0fTtcblx0fSxcblxuXHRfYXBwbHlab29tU2NhbGUgOiBmdW5jdGlvbihiQXBwbHkpIHtcblx0XHR0aGlzLl9hcHBseVpvb20gPSBiQXBwbHk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIGEgbm9kZSBhbmQgYWxsIGF0dGFjaGVkIGxpbmtzIGFuZCBsYWJlbHMgd2l0aG91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIG5vZGUgLSB0aGUgbm9kZSBvYmplY3QgYmVpbmcgcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBmb3IgdGhlIG5vZGVcblx0ICogQHBhcmFtIHkgLSB0aGUgbmV3IHkgcG9zaXRpb24gZm9yIHRoZSBub2RlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlIDogZnVuY3Rpb24obm9kZSx4LHksY2FsbGJhY2spIHtcblx0XHR0aGlzLl9zZXROb2RlUG9zaXRpb24obm9kZSx4LHksdHJ1ZSk7XG5cdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgcG9zaXRpb24gb2YgYSBub2RlIGJ5IGFuaW1hdGluZyBmcm9tIGl0J3Mgb2xkIHBvc2l0aW9uIHRvIGl0J3MgbmV3IG9uZVxuXHQgKiBAcGFyYW0gbm9kZSAtIHRoZSBub2RlIGJlaW5nIHJlcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0geSAtIHRoZSBuZXcgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gYkltbWVkaWF0ZSAtIGlmIHRydWUsIHNldHMgd2l0aG91dCBhbmltYXRpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uIDogZnVuY3Rpb24obm9kZSxuZXdYLG5ld1ksYkltbWVkaWF0ZSxjYWxsYmFjaykge1xuXHRcdHZhciB4ID0gbmV3WCAqICh0aGlzLl9hcHBseVpvb20gPyB0aGlzLl96b29tU2NhbGUgOiAxKTtcblx0XHR2YXIgeSA9IG5ld1kgKiAodGhpcy5fYXBwbHlab29tID8gdGhpcy5fem9vbVNjYWxlIDogMSk7XG5cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbm9kZSByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIGNpcmNsZSA9IHRoaXMuX25vZGVNYXBbbm9kZS5pbmRleF07XG5cdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRjaXJjbGUudHdlZW5BdHRyKHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fSwge1xuXHRcdFx0XHRkdXJhdGlvbjogdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nLFxuXHRcdFx0XHRjYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxYO1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxZO1xuXHRcdFx0XHRcdG5vZGUueCA9IHg7XG5cdFx0XHRcdFx0bm9kZS55ID0geTtcblx0XHRcdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdGNpcmNsZS5maW5hbFggPSB4O1xuXHRcdFx0Y2lyY2xlLmZpbmFsWSA9IHk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNpcmNsZS54ID0geDtcblx0XHRcdGNpcmNsZS55ID0geTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX2xpbmtNYXBbbm9kZS5pbmRleF0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRub2RlLnggPSB4O1xuXHRcdFx0bm9kZS55ID0geTtcblx0XHRcdGNpcmNsZS54ID0geDtcblx0XHRcdGNpcmNsZS55ID0geTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgdGhlIGxhYmVsIHJlbmRlciBvYmplY3Rcblx0XHR2YXIgbGFiZWwgPSB0aGlzLl9sYWJlbE1hcFtub2RlLmluZGV4XTtcblx0XHRpZiAobGFiZWwpIHtcblx0XHRcdHZhciBsYWJlbFBvcyA9IHRoaXMubGF5b3V0TGFiZWwobm9kZSk7XG5cdFx0XHRpZiAoYkltbWVkaWF0ZSE9PXRydWUpIHtcblx0XHRcdFx0bGFiZWwudHdlZW5BdHRyKGxhYmVsUG9zLCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoaXMuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBsYWJlbFBvcykge1xuXHRcdFx0XHRcdGlmIChsYWJlbFBvcy5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuXHRcdFx0XHRcdFx0bGFiZWxbcHJvcF0gPSBsYWJlbFBvc1twcm9wXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbGluayByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX2xpbmtNYXBbbm9kZS5pbmRleF0uZm9yRWFjaChmdW5jdGlvbihsaW5rKSB7XG5cdFx0XHR2YXIgbGlua09iaktleSA9IG51bGw7XG5cdFx0XHRpZiAobGluay5zb3VyY2UuaW5kZXggPT09IG5vZGUuaW5kZXgpIHtcblx0XHRcdFx0bGlua09iaktleSA9ICdzb3VyY2UnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua09iaktleSA9ICd0YXJnZXQnO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRcdGxpbmsudHdlZW5PYmoobGlua09iaktleSwge1xuXHRcdFx0XHRcdHg6IHgsXG5cdFx0XHRcdFx0eTogeVxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2R1cmF0aW9uLFxuXHRcdFx0XHRcdGVhc2luZzogdGhhdC5fZWFzaW5nXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS54ID0geDtcblx0XHRcdFx0bGlua1tsaW5rT2JqS2V5XS55ID0geTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGVmYXVsdCBsYXlvdXQgcm91dGluZS4gICBTaG91bGQgYmUgb3ZlcnJpZGVuIGJ5IHN1YmNsYXNzZXMuXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXMgYmVpbmcgcmVuZGVyZWQgdG9cblx0ICogQHJldHVybnMge0xheW91dH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKHcsaCxjYWxsYmFjaykge1xuXHRcdGZ1bmN0aW9uIG9uQ29tcGxldGUoKSB7XG5cdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgaXNBc3luYyA9ICF0aGlzLl9wZXJmb3JtTGF5b3V0KHcsaCk7XG5cdFx0aWYgKGlzQXN5bmMpIHtcblx0XHRcdHNldFRpbWVvdXQob25Db21wbGV0ZSx0aGlzLmR1cmF0aW9uKCkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvbkNvbXBsZXRlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFx0LyoqXG5cdCAqIEhvb2sgZm9yIGRvaW5nIGFueSBkcmF3aW5nIGJlZm9yZSByZW5kZXJpbmcgb2YgdGhlIGdyYXBoIHRoYXQgaXMgbGF5b3V0IHNwZWNpZmljXG5cdCAqIGllLyBCYWNrZ3JvdW5kcywgZXRjXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXNcblx0ICogQHJldHVybnMge0FycmF5fSAtIGEgbGlzdCBvZiBwYXRoLmpzIHJlbmRlciBvYmplY3RzIHRvIGJlIGFkZGVkIHRvIHRoZSBzY2VuZVxuXHQgKi9cblx0cHJlcmVuZGVyIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBIb29rIGZvciBkb2luZyBhbnkgZHJhd2luZyBhZnRlciByZW5kZXJpbmcgb2YgdGhlIGdyYXBoIHRoYXQgaXMgbGF5b3V0IHNwZWNpZmljXG5cdCAqIGllLyBPdmVybGF5cywgZXRjXG5cdCAqIEBwYXJhbSB3IC0gdGhlIHdpZHRoIG9mIHRoZSBjYW52YXNcblx0ICogQHBhcmFtIGggLSB0aGUgaGVpZ2h0IG9mIHRoZSBjYW52YXNcblx0ICogQHJldHVybnMge0FycmF5fSAtIGEgbGlzdCBvZiBwYXRoLmpzIHJlbmRlciBvYmplY3RzIHRvIGJlIGFkZGVkIHRvIHRoZSBzY2VuZVxuXHQgKi9cblx0cG9zdHJlbmRlciA6IGZ1bmN0aW9uKHcsaCkge1xuXHRcdHJldHVybiBbXTtcblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgbGFiZWwgcG9zaXRpb24gZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVggLSB0aGUgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVkgLSB0aGUgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gcmFkaXVzIC0gdGhlIHJhZGl1cyBvZiB0aGUgbm9kZVxuXHQgKiBAcmV0dXJucyB7e3g6IHggcG9zaXRpb24gb2YgdGhlIGxhYmVsLCB5OiB5IHBvc2l0aW9uIG9mIHRoZSBsYWJlbH19XG5cdCAqL1xuXHRsYXlvdXRMYWJlbCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0eDogbm9kZS54ICsgbm9kZS5yYWRpdXMgKyA1LFxuXHRcdFx0eTogbm9kZS55ICsgbm9kZS5yYWRpdXMgKyA1XG5cdFx0fTtcblx0fVxufSk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDtcbiIsInZhciBMSU5LX1RZUEUgPSB7XG5cdERFRkFVTFQgOiAnbGluZScsXG5cdExJTkUgOiAnbGluZScsXG5cdEFSUk9XIDogJ2Fycm93Jyxcblx0QVJDIDogJ2FyYydcbn07XG5tb2R1bGUuZXhwb3J0cyA9IExJTktfVFlQRTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExJTktfVFlQRSA9IHJlcXVpcmUoJy4vbGlua1R5cGUnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgUkVHUk9VTkRfQkJfUEFERElORyA9IDA7XG5cbi8qKlxuICogQ3JlYXRlcyBhIEdyYXBoIHJlbmRlciBvYmplY3RcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgR3JhcGggPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG5cdHRoaXMuX25vZGVzID0gW107XG5cdHRoaXMuX2xpbmtzID0gW107XG5cdHRoaXMuX2NhbnZhcyA9IG51bGw7XG5cdHRoaXMuX2xheW91dGVyID0gbnVsbDtcblx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyID0gbnVsbDtcblx0dGhpcy5fd2lkdGggPSAwO1xuXHR0aGlzLl9oZWlnaHQgPSAwO1xuXHR0aGlzLl96b29tU2NhbGUgPSAxLjA7XG5cdHRoaXMuX3pvb21MZXZlbCA9IDA7XG5cdHRoaXMuX3NjZW5lID0gbnVsbDtcblx0dGhpcy5fcHJlcmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAgPSBudWxsO1xuXHR0aGlzLl9wYW5uYWJsZSA9IG51bGw7XG5cdHRoaXMuX3pvb21hYmxlID0gbnVsbDtcblx0dGhpcy5fZHJhZ2dhYmxlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0dGhpcy5fY3VycmVudE1vdmVTdGF0ZSA9IG51bGw7XG5cdHRoaXMuX2ludmVydGVkUGFuID0gMTtcblxuXHR0aGlzLl9mb250U2l6ZSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRGYW1pbHkgPSBudWxsO1xuXHR0aGlzLl9mb250Q29sb3IgPSBudWxsO1xuXHR0aGlzLl9mb250U3Ryb2tlID0gbnVsbDtcblx0dGhpcy5fZm9udFN0cm9rZVdpZHRoID0gbnVsbDtcblxuXHQvLyBEYXRhIHRvIHJlbmRlciBvYmplY3QgbWFwc1xuXHR0aGlzLl9ub2RlSW5kZXhUb0xpbmtMaW5lID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdHRoaXMuX25vZGVJbmRleFRvTGFiZWwgPSB7fTtcblxuXHR0aGlzLl9ldmVudHNTdXNwZW5kZWQgPSBmYWxzZTtcblxuXHRfLmV4dGVuZCh0aGlzLGF0dHJpYnV0ZXMpO1xufTtcblxuR3JhcGgucHJvdG90eXBlID0gXy5leHRlbmQoR3JhcGgucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIGZvciB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIG5vZGVzIC0gYW4gYXJyYXkgb2Ygbm9kZXNcblx0ICoge1xuXHQgKiBcdFx0eCA6IHRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGVcdChyZXF1aXJlZClcblx0ICogXHRcdHkgOiB0aGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlXHQocmVxdWlyZWQpXG5cdCAqXHRcdGluZGV4IDogIGEgdW5pcXVlIGluZGV4XHRcdFx0XHQocmVxdWlyZWQpXG5cdCAqXHRcdGxhYmVsIDogYSBsYWJlbCBmb3IgdGhlIG5vZGVcdFx0KG9wdGlvbmFsKVxuXHQgKlx0XHRmaWxsU3R5bGUgOiBhIGNhbnZhcyBmaWxsICAgXHRcdChvcHRpb25hbCwgZGVmYXVsdCAjMDAwMDAwKVxuXHQgKlx0XHRzdHJva2VTdHlsZSA6IGEgY2FudmFzIHN0cm9rZVx0XHQob3B0aW9uYWwsIGRlZmF1bHQgdW5kZWZpbmVkKVxuXHQgKlx0XHRsaW5lV2lkdGggOiB3aWR0aCBvZiB0aGUgc3Ryb2tlXHRcdChvcHRpb25hbCwgZGVmYXVsdCAxKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIG5vZGVzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB7R3JhcGguX25vZGVzfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUgPSB7fTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvQ2lyY2xlID0ge307XG5cdFx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsID0ge307XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtub2RlLmluZGV4XSA9IFtdO1xuXHRcdFx0fSk7XG5cdFx0XHRpZiAodGhpcy5fbGF5b3V0ZXIpIHtcblx0XHRcdFx0dGhpcy5fbGF5b3V0ZXIubm9kZXMobm9kZXMpO1xuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGlua3MgLSBhbiBhcnJheSBvZiBsaW5rc1xuXHQgKiB7XG5cdCAqIFx0XHRzb3VyY2UgOiBhIG5vZGUgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNvdXJjZSBcdChyZXF1aXJlZClcblx0ICogXHRcdHRhcmdldCA6IGEgbm9kZSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGUgdGFyZ2V0XHQocmVxdWlyZWQpXG5cdCAqXHRcdHN0cm9rZVN0eWxlIDogYSBjYW52YXMgc3Ryb2tlXHRcdFx0XHRcdFx0KG9wdGlvbmFsLCBkZWZhdWx0ICMwMDAwMDApXG5cdCAqXHRcdGxpbmVXaWR0aCA6IHRoZSB3aWR0aCBvZiB0aGUgc3Ryb2tlXHRcdFx0XHRcdChvcHRpbmFsLCBkZWZhdWx0IDEpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgbGlua3MgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHtHcmFwaC5fbGlua3N9IG90aGVyd2lzZVxuXHQgKi9cblx0bGlua3MgOiBmdW5jdGlvbihsaW5rcykge1xuXHRcdGlmIChsaW5rcykge1xuXHRcdFx0dGhpcy5fbGlua3MgPSBsaW5rcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBjYW52YXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gY2FudmFzIC0gYW4gSFRNTCBjYW52YXMgb2JqZWN0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgY2FudmFzIHBhcmFtZXRlciBpcyBkZWZpbmVkLCB0aGUgY2FudmFzIG90aGVyd2lzZVxuXHQgKi9cblx0Y2FudmFzIDogZnVuY3Rpb24oY2FudmFzKSB7XG5cdFx0aWYgKGNhbnZhcykge1xuXHRcdFx0dGhpcy5fY2FudmFzID0gY2FudmFzO1xuXG5cdFx0XHR2YXIgeCx5O1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZWRvd24nLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0eCA9IGUuY2xpZW50WDtcblx0XHRcdFx0eSA9IGUuY2xpZW50WTtcblx0XHRcdFx0JCh0aGF0Ll9jYW52YXMpLm9uKCdtb3VzZW1vdmUnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR2YXIgZHggPSB4IC0gZS5jbGllbnRYO1xuXHRcdFx0XHRcdHZhciBkeSA9IHkgLSBlLmNsaWVudFk7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2RyYWdnYWJsZSAmJiB0aGF0Ll9jdXJyZW50T3Zlck5vZGUgJiYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09IG51bGwgfHwgdGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ2RyYWdnaW5nJykpICB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gJ2RyYWdnaW5nJztcblxuXHRcdFx0XHRcdFx0Ly8gTW92ZSB0aGUgbm9kZVxuXHRcdFx0XHRcdFx0dGhhdC5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbkltbWVkaWF0ZSh0aGF0Ll9jdXJyZW50T3Zlck5vZGUsIHRoYXQuX2N1cnJlbnRPdmVyTm9kZS54IC0gZHgsIHRoYXQuX2N1cnJlbnRPdmVyTm9kZS55IC0gZHkpO1xuXHRcdFx0XHRcdFx0dGhhdC51cGRhdGUoKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRoYXQuX3Bhbm5hYmxlICYmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSBudWxsIHx8IHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdwYW5uaW5nJykpIHtcblx0XHRcdFx0XHRcdHRoYXQuX3BhbigtZHgqdGhhdC5faW52ZXJ0ZWRQYW4sLWR5KnRoYXQuX2ludmVydGVkUGFuKTtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSAncGFubmluZyc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHggPSBlLmNsaWVudFg7XG5cdFx0XHRcdFx0eSA9IGUuY2xpZW50WTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0JCh0aGlzLl9jYW52YXMpLm9uKCdtb3VzZXVwJyxmdW5jdGlvbigpIHtcblx0XHRcdFx0JCh0aGF0Ll9jYW52YXMpLm9mZignbW91c2Vtb3ZlJyk7XG5cdFx0XHRcdGlmICh0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAnZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0dGhhdC5fY3VycmVudE92ZXJOb2RlID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID0gbnVsbDtcblx0XHRcdH0pO1xuXG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NhbnZhcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCB3aWR0aFxuXHQgKiBAcmV0dXJucyBXaWR0aCBpbiBwaXhlbHMgb2YgdGhlIGdyYXBoXG5cdCAqL1xuXHR3aWR0aCA6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9zY2VuZS53aWR0aDtcblx0fSxcblxuXHQvKipcblx0ICogR2V0IGhlaWdodFxuXHQgKiBAcmV0dXJucyBIZWlnaHQgaW4gcGl4ZWxzIG9mIHRoZSBncmFwaFxuXHQgKi9cblx0aGVpZ2h0IDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NjZW5lLmhlaWdodDtcblx0fSxcblxuXHQvKipcblx0ICogQWRkcyBhIGxhYmVsIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVcblx0ICogQHBhcmFtIHRleHRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0YWRkTGFiZWwgOiBmdW5jdGlvbihub2RlLHRleHQpIHtcblx0XHRpZiAodGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XSkge1xuXHRcdFx0dGhpcy5yZW1vdmVMYWJlbChub2RlKTtcblx0XHR9XG5cdFx0dmFyIGxhYmVsQXR0cnMgPSB0aGlzLl9sYXlvdXRlci5sYXlvdXRMYWJlbChub2RlKTtcblxuXHRcdHZhciBmb250U2l6ZSA9IHR5cGVvZih0aGlzLl9mb250U2l6ZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U2l6ZShub2RlKSA6IHRoaXMuX2ZvbnRTaXplO1xuXHRcdGlmICghZm9udFNpemUpIHtcblx0XHRcdGZvbnRTaXplID0gMTA7XG5cdFx0fVxuXG5cdFx0dmFyIGZvbnRGYW1pbHkgPSB0eXBlb2YodGhpcy5fZm9udEZhbWlseSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250RmFtaWx5KG5vZGUpIDogdGhpcy5fZm9udEZhbWlseTtcblx0XHRpZiAoIWZvbnRGYW1pbHkpIHtcblx0XHRcdGZvbnRGYW1pbHkgPSAnc2Fucy1zZXJpZic7XG5cdFx0fVxuXHRcdHZhciBmb250U3RyID0gZm9udFNpemUgKyAncHggJyArIGZvbnRGYW1pbHk7XG5cblx0XHR2YXIgZm9udEZpbGwgPSB0eXBlb2YodGhpcy5fZm9udENvbG9yKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRDb2xvcihub2RlKSA6IHRoaXMuX2ZvbnRDb2xvcjtcblx0XHRpZiAoIWZvbnRGaWxsKSB7XG5cdFx0XHRmb250RmlsbCA9ICcjMDAwMDAwJztcblx0XHR9XG5cdFx0dmFyIGZvbnRTdHJva2UgPSB0eXBlb2YodGhpcy5fZm9udFN0cm9rZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U3Ryb2tlKG5vZGUpIDogdGhpcy5fZm9udFN0cm9rZTtcblx0XHR2YXIgZm9udFN0cm9rZVdpZHRoID0gdHlwZW9mKHRoaXMuX2ZvbnRTdHJva2UpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udFN0cm9rZVdpZHRoIDogdGhpcy5fZm9udFN0cm9rZVdpZHRoO1xuXG5cdFx0dmFyIGxhYmVsU3BlYyA9IHtcblx0XHRcdGZvbnQ6IGZvbnRTdHIsXG5cdFx0XHRmaWxsU3R5bGU6IGZvbnRGaWxsLFxuXHRcdFx0c3Ryb2tlU3R5bGU6IGZvbnRTdHJva2UsXG5cdFx0XHRsaW5lV2lkdGg6IGZvbnRTdHJva2VXaWR0aCxcblx0XHRcdHRleHQgOiB0ZXh0XG5cdFx0fTtcblx0XHRmb3IgKHZhciBrZXkgaW4gbGFiZWxBdHRycykge1xuXHRcdFx0aWYgKGxhYmVsQXR0cnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRsYWJlbFNwZWNba2V5XSA9IGxhYmVsQXR0cnNba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFyIGxhYmVsID0gcGF0aC50ZXh0KGxhYmVsU3BlYyk7XG5cdFx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XSA9IGxhYmVsO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKGxhYmVsKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZW1vdmVzIGEgbGFiZWwgZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRyZW1vdmVMYWJlbCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHR2YXIgdGV4dE9iamVjdCA9IHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF07XG5cdFx0aWYgKHRleHRPYmplY3QpIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRleHRPYmplY3QpO1xuXHRcdFx0ZGVsZXRlIHRoaXMuX25vZGVJbmRleFRvTGFiZWxbbm9kZS5pbmRleF07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBtb3VzZW92ZXIgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlT3ZlciA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlT3ZlciA9IGNhbGxiYWNrLmJpbmQoc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIG1vdXNlb3V0IG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJyBpbiB0aGUgY2FsbGJhY2tcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZU91dCA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlT3V0ID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogQ29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIHNldHRpbmcgbm9kZU92ZXIvbm9kZU91dCBpbiBhIHNpbmdsZSBjYWxsXG5cdCAqIEBwYXJhbSBvdmVyIC0gdGhlIG5vZGVPdmVyIGV2ZW50IGhhbmRsZXJcblx0ICogQHBhcmFtIG91dCAtIHRoZSBub2RlT3V0IGV2ZW50IGhhbmRsZXJcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJyBpbiB0aGUgY2FsbGJhY2tcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0bm9kZUhvdmVyIDogZnVuY3Rpb24ob3ZlcixvdXQsc2VsZikge1xuXHRcdHRoaXMubm9kZU92ZXIob3ZlcixzZWxmKTtcblx0XHR0aGlzLm5vZGVPdXQob3V0LHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBFdmVudCBoYW5kbGVyIGZvciBjbGljayBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycuICAgRGVmYXVsdHMgdG8gdGhlIGdyYXBoIG9iamVjdFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlQ2xpY2sgOiBmdW5jdGlvbihjYWxsYmFjayxzZWxmKSB7XG5cdFx0aWYgKCFzZWxmKSB7XG5cdFx0XHRzZWxmID0gdGhpcztcblx0XHR9XG5cdFx0dGhpcy5fbm9kZUNsaWNrID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGFuIHtHcmFwaH0gYnkgKGR4LGR5KS4gICBBdXRvbWF0aWNhbGx5IHJlcmVuZGVyIHRoZSBncmFwaC5cblx0ICogQHBhcmFtIGR4IC0gQW1vdW50IG9mIHBhbiBpbiB4IGRpcmVjdGlvblxuXHQgKiBAcGFyYW0gZHkgLSBBbW91bnQgb2YgcGFuIGluIHkgZGlyZWN0aW9uXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfcGFuIDogZnVuY3Rpb24oZHgsZHkpIHtcblx0XHR0aGlzLl9zY2VuZS54ICs9IGR4O1xuXHRcdHRoaXMuX3NjZW5lLnkgKz0gZHk7XG5cdFx0dGhpcy5fcGFuWCArPSBkeDtcblx0XHR0aGlzLl9wYW5ZICs9IGR5O1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Uge0dyYXBofSBwYW5uYWJsZVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRwYW5uYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX3Bhbm5hYmxlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogTWFrZXMgdGhlIGdyYXBoIHBhbiBpbiB0aGUgb3Bwb3NpdGUgZGlyZWN0aW9uIG9mIHRoZSBtb3VzZSBhcyBvcHBvc2VkIHRvIHdpdGggaXRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0aW52ZXJ0UGFuIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5faW52ZXJ0ZWRQYW4gPSAtMTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogTWFrZSBub2RlcyBpbiB7R3JhcGh9IHJlcG9pc2l0aW9uYWJsZSBieSBjbGljay1kcmFnZ2luZ1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRkcmFnZ2FibGUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9kcmFnZ2FibGUgPSB0cnVlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9nZXRab29tRm9yTGV2ZWwgOiBmdW5jdGlvbihsZXZlbCkge1xuXHRcdHZhciBmYWN0b3IgPSBNYXRoLnBvdygxLjUgLCBNYXRoLmFicyhsZXZlbCAtIHRoaXMuX3pvb21MZXZlbCkpO1xuXHRcdGlmIChsZXZlbCA8IHRoaXMuX3pvb21MZXZlbCkge1xuXHRcdFx0ZmFjdG9yID0gMS9mYWN0b3I7XG5cdFx0fVxuXHRcdHJldHVybiBmYWN0b3I7XG5cdH0sXG5cblx0X3pvb20gOiBmdW5jdGlvbihmYWN0b3IseCx5KSB7XG5cdFx0dGhpcy5fem9vbVNjYWxlICo9IGZhY3Rvcjtcblx0XHR0aGlzLl9sYXlvdXRlci5fem9vbVNjYWxlID0gdGhpcy5fem9vbVNjYWxlO1xuXG5cdFx0Ly8gUGFuIHNjZW5lIGJhY2sgdG8gb3JpZ2luXG5cdFx0dmFyIG9yaWdpbmFsWCA9IHRoaXMuX3NjZW5lLng7XG5cdFx0dmFyIG9yaWdpbmFsWSA9IHRoaXMuX3NjZW5lLnk7XG5cdFx0dGhpcy5fcGFuKC10aGlzLl9zY2VuZS54LC10aGlzLl9zY2VuZS55KTtcblxuXHRcdHZhciBtb3VzZVggPSB4IHx8IDA7XG5cdFx0dmFyIG1vdXNlWSA9IHkgfHwgMDtcblxuXHRcdC8vICdab29tJyBub2Rlcy4gICBXZSBkbyB0aGlzIHNvIHRleHQvcmFkaXVzIHNpemUgcmVtYWlucyBjb25zaXN0ZW50IGFjcm9zcyB6b29tIGxldmVsc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbm9kZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuX2xheW91dGVyLl9zZXROb2RlUG9zaXRpb24odGhpcy5fbm9kZXNbaV0sdGhpcy5fbm9kZXNbaV0ueCpmYWN0b3IsIHRoaXMuX25vZGVzW2ldLnkqZmFjdG9yLHRydWUpO1xuXHRcdH1cblxuXHRcdC8vIFpvb20gdGhlIHJlbmRlciBncm91cHNcblx0XHRpZiAodGhpcy5fcHJlcmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHRcdHRoaXMuX3ByZXJlbmRlckdyb3VwLnNjYWxlWSA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHR9XG5cdFx0aWYgKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCkge1xuXHRcdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnNjYWxlWCA9IHRoaXMuX3pvb21TY2FsZTtcblx0XHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tU2NhbGU7XG5cdFx0fVxuXG5cdFx0Ly8gUmV2ZXJzZSB0aGUgJ29yaWdpbiBwYW4nIHdpdGggdGhlIHNjYWxlIGFwcGxpZWQgYW5kIHJlY2VudGVyIHRoZSBtb3VzZSB3aXRoIHNjYWxlIGFwcGxpZWQgYXMgd2VsbFxuXHRcdHZhciBuZXdNb3VzZVggPSBtb3VzZVgqZmFjdG9yO1xuXHRcdHZhciBuZXdNb3VzZVkgPSBtb3VzZVkqZmFjdG9yO1xuXHRcdHRoaXMuX3BhbihvcmlnaW5hbFgqZmFjdG9yIC0gKG5ld01vdXNlWC1tb3VzZVgpLG9yaWdpbmFsWSpmYWN0b3IgLSAobmV3TW91c2VZLW1vdXNlWSkpO1xuXG5cdFx0Ly8gVXBkYXRlIHRoZSByZWdyb3VwIHVuZGVybGF5c1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRpZiAodGhpcy5faGFuZGxlR3JvdXAgJiYgdGhpcy5faGFuZGxlR3JvdXAuY2hpbGRyZW4pIHtcblx0XHRcdHZhciB1bmRlcmxheXMgPSB0aGlzLl9oYW5kbGVHcm91cC5jaGlsZHJlbjtcblx0XHRcdHVuZGVybGF5cy5mb3JFYWNoKGZ1bmN0aW9uKHVuZGVybGF5KSB7XG5cdFx0XHRcdHRoYXQuX2hhbmRsZUdyb3VwLnJlbW92ZUNoaWxkKHVuZGVybGF5KTtcblx0XHRcdH0pO1xuXHRcdFx0dGhhdC5fYWRkUmVncm91cEhhbmRsZXMoKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Uge0dyYXBofSB6b29tYWJsZSBieSB1c2luZyB0aGUgbW91c2V3aGVlbFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHR6b29tYWJsZSA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy5fem9vbWFibGUpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdCQodGhpcy5fY2FudmFzKS5vbignbW91c2V3aGVlbCcsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHZhciB3aGVlbCA9IGUub3JpZ2luYWxFdmVudC53aGVlbERlbHRhLzEyMDsvL24gb3IgLW5cblx0XHRcdFx0dmFyIGZhY3Rvcjtcblx0XHRcdFx0aWYgKHdoZWVsIDwgMCkge1xuXHRcdFx0XHRcdGZhY3RvciA9IHRoYXQuX2dldFpvb21Gb3JMZXZlbCh0aGF0Ll96b29tTGV2ZWwtMSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZmFjdG9yID0gdGhhdC5fZ2V0Wm9vbUZvckxldmVsKHRoYXQuX3pvb21MZXZlbCsxKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGF0Ll96b29tKGZhY3RvciwgZS5vZmZzZXRYLCBlLm9mZnNldFkpO1xuXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3pvb21hYmxlID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxheW91dCBmdW5jdGlvbiBmb3IgdGhlIG5vZGVzXG5cdCAqIEBwYXJhbSBsYXlvdXRlciAtIEFuIGluc3RhbmNlIChvciBzdWJjbGFzcykgb2YgTGF5b3V0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaXMgbGF5b3V0ZXIgcGFyYW0gaXMgZGVmaW5lZCwgdGhlIGxheW91dGVyIG90aGVyd2lzZVxuXHQgKi9cblx0bGF5b3V0ZXIgOiBmdW5jdGlvbihsYXlvdXRlcikge1xuXHRcdGlmIChsYXlvdXRlcikge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIgPSBsYXlvdXRlcjtcblx0XHRcdHRoaXMuX2xheW91dGVyXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xheW91dGVyO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgYSBsYXlvdXQgb2YgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHR0aGlzLl9zdXNwZW5kRXZlbnRzKCk7XG5cdFx0XHR0aGlzLl9sYXlvdXRlci5sYXlvdXQodGhpcy5fY2FudmFzLndpZHRoLHRoaXMuX2NhbnZhcy5oZWlnaHQsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdHRoaXMuX3Jlc3VtZUV2ZW50cygpO1xuXHRcdFx0fSk7XG5cblxuXHRcdFx0Ly8gVXBkYXRlIHRoZSByZWdyb3VwIHVuZGVybGF5c1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0aWYgKHRoaXMuX2hhbmRsZUdyb3VwICYmIHRoaXMuX2hhbmRsZUdyb3VwLmNoaWxkcmVuKSB7XG5cdFx0XHRcdHRoaXMuX3N1c3BlbmRFdmVudHMoKTtcblx0XHRcdFx0dmFyIHVuZGVybGF5cyA9IHRoaXMuX2hhbmRsZUdyb3VwLmNoaWxkcmVuO1xuXHRcdFx0XHR2YXIgdXBkYXRlZCA9IDA7XG5cdFx0XHRcdHVuZGVybGF5cy5mb3JFYWNoKGZ1bmN0aW9uKHVuZGVybGF5KSB7XG5cdFx0XHRcdFx0dmFyIGluZGljZXMgPSB1bmRlcmxheS5ncmFwaGpzX2luZGljZXM7XG5cdFx0XHRcdFx0dmFyIGJiID0gdGhhdC5fbGF5b3V0ZXIuZ2V0Qm91bmRpbmdCb3goaW5kaWNlcyxSRUdST1VORF9CQl9QQURESU5HKTtcblx0XHRcdFx0XHR1bmRlcmxheS50d2VlbkF0dHIoe1xuXHRcdFx0XHRcdFx0eDogYmIueCxcblx0XHRcdFx0XHRcdHk6IGJiLnksXG5cdFx0XHRcdFx0XHR3aWR0aCA6IGJiLndpZHRoLFxuXHRcdFx0XHRcdFx0aGVpZ2h0IDogYmIuaGVpZ2h0XG5cdFx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdFx0ZHVyYXRpb246IHRoYXQuX2xheW91dGVyLmR1cmF0aW9uKCksXG5cdFx0XHRcdFx0XHRlYXNpbmc6IHRoYXQuX2xheW91dGVyLmVhc2luZygpLFxuXHRcdFx0XHRcdFx0Y2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHVwZGF0ZWQgPT0gdW5kZXJsYXlzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3Jlc3VtZUV2ZW50cygpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWQrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cblx0Z3JvdXBpbmdNYW5hZ2VyIDogZnVuY3Rpb24oZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0aWYgKGdyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyID0gZ3JvdXBpbmdNYW5hZ2VyO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ncm91cGluZ01hbmFnZXI7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGluaXRpYWxpemVHcm91cGluZyA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHRoaXMuX2dyb3VwaW5nTWFuYWdlci5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtzKHRoaXMuX2xpbmtzKVxuXHRcdFx0XHQuaW5pdGlhbGl6ZUhlaXJhcmNoeSgpO1xuXG5cdFx0XHR0aGlzLm5vZGVzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSk7XG5cdFx0XHR0aGlzLmxpbmtzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHVuZ3JvdXAgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0aWYgKCFub2RlIHx8ICFub2RlLmNoaWxkcmVuKSB7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHRoaXMuX2dyb3VwaW5nTWFuYWdlci51bmdyb3VwKG5vZGUpO1xuXHRcdFx0dGhpcy5jbGVhcigpXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpXG5cdFx0XHRcdC5saW5rcyh0aGlzLl9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpXG5cdFx0XHRcdC5kcmF3KCk7XG5cblx0XHRcdHRoaXMuX2xheW91dGVyLl9hcHBseVpvb21TY2FsZSh0cnVlKTtcblx0XHRcdHRoaXMubGF5b3V0KCk7XG5cdFx0XHR0aGlzLl9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUoZmFsc2UpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRyZWdyb3VwIDogZnVuY3Rpb24odW5ncm91cGVkQWdncmVnYXRlS2V5KSB7XG5cdFx0Ly8gQW5pbWF0ZSB0aGUgcmVncm91cFxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgcGFyZW50QWdncmVnYXRlID0gdGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmdldEFnZ3JlZ2F0ZSh1bmdyb3VwZWRBZ2dyZWdhdGVLZXkpO1xuXG5cdFx0dmFyIGF2Z1BvcyA9IHsgeDogMCwgeSA6IDB9O1xuXHRcdHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRhdmdQb3MueCArPSBjaGlsZC54O1xuXHRcdFx0YXZnUG9zLnkgKz0gY2hpbGQueTtcblx0XHR9KTtcblx0XHRhdmdQb3MueCAvPSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubGVuZ3RoO1xuXHRcdGF2Z1Bvcy55IC89IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGg7XG5cblx0XHR2YXIgaW5kZXhPZkNoaWxkcmVuID0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLm1hcChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGF0Ll9ncm91cGluZ01hbmFnZXIuX2FnZ3JlZ2F0ZWROb2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLl9hZ2dyZWdhdGVkTm9kZXNbaV0uaW5kZXggPT09IGNoaWxkLmluZGV4KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgbWluQ2hpbGRJbmRleCA9IE51bWJlci5NQVhfVkFMVUU7XG5cdFx0aW5kZXhPZkNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oaWR4KSB7XG5cdFx0XHRtaW5DaGlsZEluZGV4ID0gTWF0aC5taW4obWluQ2hpbGRJbmRleCxpZHgpO1xuXHRcdH0pO1xuXG5cdFx0dmFyIGFuaW1hdGVkUmVncm91cGVkID0gMDtcblx0XHRwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0dGhhdC5fbGF5b3V0ZXIuX3NldE5vZGVQb3NpdGlvbihjaGlsZCxhdmdQb3MueCxhdmdQb3MueSxmYWxzZSxmdW5jdGlvbigpIHtcblx0XHRcdFx0YW5pbWF0ZWRSZWdyb3VwZWQrKztcblx0XHRcdFx0aWYgKGFuaW1hdGVkUmVncm91cGVkID09PSBwYXJlbnRBZ2dyZWdhdGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0XHRcdFx0dGhhdC5fZ3JvdXBpbmdNYW5hZ2VyLnJlZ3JvdXAodW5ncm91cGVkQWdncmVnYXRlS2V5LG1pbkNoaWxkSW5kZXgpO1xuXHRcdFx0XHRcdFx0dGhhdC5jbGVhcigpXG5cdFx0XHRcdFx0XHRcdC5ub2Rlcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpXG5cdFx0XHRcdFx0XHRcdC5saW5rcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpO1xuXHRcdFx0XHRcdFx0dGhhdC5kcmF3KCk7XG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fYXBwbHlab29tU2NhbGUodHJ1ZSk7XG5cdFx0XHRcdFx0XHR0aGF0LmxheW91dCgpO1xuXHRcdFx0XHRcdFx0dGhhdC5fbGF5b3V0ZXIuX2FwcGx5Wm9vbVNjYWxlKGZhbHNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzaXplIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTaXplIC0gc2l6ZSBvZiB0aGUgZm9udCBpbiBwaXhlbHNcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U2l6ZSBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRTaXplfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTaXplIDogZnVuY3Rpb24oZm9udFNpemUpIHtcblx0XHRpZiAoZm9udFNpemUpIHtcblx0XHRcdHRoaXMuX2ZvbnRTaXplID0gZm9udFNpemU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250U2l6ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBjb2xvdXIgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udENvbG91ciAtIEEgaGV4IHN0cmluZyBmb3IgdGhlIGNvbG91ciBvZiB0aGUgbGFiZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udENvbG91ciBwYXJhbSBpcyBkZWlmbmVkLCB7R3JhcGguX2ZvbnRDb2xvdXJ9IG90aGVyd2lzZVxuXHQgKi9cblx0Zm9udENvbG91ciA6IGZ1bmN0aW9uKGZvbnRDb2xvdXIpIHtcblx0XHRpZiAoZm9udENvbG91cikge1xuXHRcdFx0dGhpcy5fZm9udENvbG9yID0gZm9udENvbG91cjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRDb2xvcjtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBzdHJva2UgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udFN0cm9rZSAtIEEgaGV4IHN0cmluZyBmb3IgdGhlIGNvbG9yIG9mIHRoZSBsYWJlbCBzdHJva2Vcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250U3Ryb2tlIHBhcmFtIGlzIGRlZmluZWQsIHtHcmFwaC5fZm9udFN0cm9rZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U3Ryb2tlIDogZnVuY3Rpb24oZm9udFN0cm9rZSkge1xuXHRcdGlmIChmb250U3Ryb2tlKSB7XG5cdFx0XHR0aGlzLl9mb250U3Ryb2tlID0gZm9udFN0cm9rZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTdHJva2U7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc3Ryb2tlIHdpZHRoIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRTdHJva2VXaWR0aCAtIHNpemUgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFN0cm9rZVdpZHRoIHBhcmFtIGlzIGRlZmluZWQsIHtHcmFwaC5fZm9udFN0cm9rZVdpZHRofSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRTdHJva2VXaWR0aCA6IGZ1bmN0aW9uKGZvbnRTdHJva2VXaWR0aCkge1xuXHRcdGlmIChmb250U3Ryb2tlV2lkdGgpIHtcblx0XHRcdHRoaXMuX2ZvbnRTdHJva2VXaWR0aCA9IGZvbnRTdHJva2VXaWR0aDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRTdHJva2VXaWR0aDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9udCBmYW1pbHkgZm9yIGxhYmVsc1xuXHQgKiBAcGFyYW0gZm9udEZhbWlseSAtIEEgc3RyaW5nIGZvciB0aGUgZm9udCBmYW1pbHkgKGEgbGEgSFRNTDUgQ2FudmFzKVxuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRGYW1pbHkgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250RmFtaWx5fSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRGYW1pbHkgOiBmdW5jdGlvbihmb250RmFtaWx5KSB7XG5cdFx0aWYgKGZvbnRGYW1pbHkpIHtcblx0XHRcdHRoaXMuX2ZvbnRGYW1pbHkgPSBmb250RmFtaWx5O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udEZhbWlseTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlc2l6ZSB0aGUgZ3JhcGguICBBdXRvbWF0aWNhbGx5IHBlcmZvcm1zIGxheW91dCBhbmQgcmVyZW5kZXJzIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gdyAtIHRoZSBuZXcgd2lkdGhcblx0ICogQHBhcmFtIGggLSB0aGUgbmV3IGhlaWdodFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRyZXNpemUgOiBmdW5jdGlvbih3LGgpIHtcblx0XHR0aGlzLl93aWR0aCA9IHc7XG5cdFx0dGhpcy5faGVpZ2h0ID0gaDtcblx0XHQkKHRoaXMuX2NhbnZhcykuYXR0cih7d2lkdGg6dyxoZWlnaHQ6aH0pXG5cdFx0XHQud2lkdGgodylcblx0XHRcdC5oZWlnaHQoaCk7XG5cdFx0dGhpcy5fc2NlbmUucmVzaXplKHcsaCk7XG5cblx0XHRpZiAoIXRoaXMuX3Bhbm5hYmxlICYmICF0aGlzLl96b29tYWJsZSkge1xuXHRcdFx0dGhpcy5sYXlvdXQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGEgbGlzdCBvZiBwcmUvcG9zdCByZW5kZXIgb2JqZWN0cyBmcm9tIHRoZSBsYXlvdXRlciAoaWYgYW55KVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FkZFByZUFuZFBvc3RSZW5kZXJPYmplY3RzIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAucmVtb3ZlQWxsKCk7XG5cblx0XHQvLyBHZXQgdGhlIGJhY2tncm91bmQgb2JqZWN0cyBmcm9tIHRoZSBsYXlvdXRlclxuXHRcdHZhciBvYmpzID0gdGhpcy5fbGF5b3V0ZXIucHJlcmVuZGVyKHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdGlmIChvYmpzKSB7XG5cdFx0XHRvYmpzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyT2JqZWN0KSB7XG5cdFx0XHRcdHRoYXQuX3ByZXJlbmRlckdyb3VwLmFkZENoaWxkKHJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAucmVtb3ZlQWxsKCk7XG5cdFx0b2JqcyA9IHRoaXMuX2xheW91dGVyLnBvc3RyZW5kZXIodGhpcy5fd2lkdGgsdGhpcy5faGVpZ2h0KTtcblx0XHRpZiAob2Jqcykge1xuXHRcdFx0b2Jqcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlck9iamVjdCkge1xuXHRcdFx0XHR0aGF0Ll9wb3N0cmVuZGVyR3JvdXAuYWRkQ2hpbGQocmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblxuXHRfYWRkUmVncm91cEhhbmRsZXMgOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dmFyIHVuZ3JvdXBlZE5vZGVJbmZvID0gdGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmdldFVuZ3JvdXBlZE5vZGVzKCk7XG5cdFx0XHR1bmdyb3VwZWROb2RlSW5mby5mb3JFYWNoKGZ1bmN0aW9uKHVuZ3JvdXBlZE5vZGUpIHtcblx0XHRcdFx0dmFyIGluZGljZXMgPSB1bmdyb3VwZWROb2RlLmluZGljZXM7XG5cdFx0XHRcdHZhciBrZXkgPSB1bmdyb3VwZWROb2RlLmtleTtcblx0XHRcdFx0dmFyIGJib3ggPSB0aGF0Ll9sYXlvdXRlci5nZXRCb3VuZGluZ0JveChpbmRpY2VzLFJFR1JPVU5EX0JCX1BBRERJTkcpO1xuXHRcdFx0XHR2YXIgYm91bmRpbmdCb3hSZW5kZXJPYmplY3QgPSBwYXRoLnJlY3Qoe1xuXHRcdFx0XHRcdHggOiBiYm94LngsXG5cdFx0XHRcdFx0eSA6IGJib3gueSxcblx0XHRcdFx0XHRncmFwaGpzX3R5cGUgOiAncmVncm91cF91bmRlcmxheScsXG5cdFx0XHRcdFx0Z3JhcGhqc19pbmRpY2VzIDogaW5kaWNlcyxcblx0XHRcdFx0XHR3aWR0aCA6IGJib3gud2lkdGgsXG5cdFx0XHRcdFx0aGVpZ2h0IDogYmJveC5oZWlnaHQsXG5cdFx0XHRcdFx0c3Ryb2tlU3R5bGUgOiAnIzIzMjMyMycsXG5cdFx0XHRcdFx0ZmlsbFN0eWxlIDogJyMwMDAwMDAnLFxuXHRcdFx0XHRcdG9wYWNpdHkgOiAwLjFcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0Lm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dGhhdC5yZWdyb3VwKGtleSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHR0aGF0Ll9oYW5kbGVHcm91cC5hZGRDaGlsZChib3VuZGluZ0JveFJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogUmVkcmF3IHRoZSBncmFwaFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHR1cGRhdGUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRHJhdyB0aGUgZ3JhcGguICAgT25seSBuZWVkcyB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIG5vZGVzL2xpbmtzIGhhdmUgYmVlbiBzZXRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0ZHJhdyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdGlmICghdGhpcy5fc2NlbmUpIHtcblx0XHRcdHRoaXMuX3NjZW5lID0gcGF0aCh0aGlzLl9jYW52YXMpO1xuXHRcdH1cblx0XHRpZiAoIXRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHR2YXIgZGVmYXVsTGF5b3V0ID0gbmV3IExheW91dCgpXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHRcdHRoaXMubGF5b3V0ZXIoZGVmYXVsTGF5b3V0KTtcblx0XHR9XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAgPSBwYXRoLmdyb3VwKCk7XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5zY2FsZVkgPSB0aGlzLl96b29tO1xuXHRcdHRoaXMuX2hhbmRsZUdyb3VwID0gcGF0aC5ncm91cCgpO1xuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cCA9IHBhdGguZ3JvdXAoe25vSGl0OnRydWV9KTtcblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVYID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9wb3N0cmVuZGVyR3JvdXAuc2NhbGVZID0gdGhpcy5fem9vbTtcblx0XHR0aGlzLl9hZGRQcmVBbmRQb3N0UmVuZGVyT2JqZWN0cygpO1xuXG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5fcHJlcmVuZGVyR3JvdXApO1xuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX2hhbmRsZUdyb3VwKTtcblx0XHR0aGlzLl9saW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmspIHtcblxuXHRcdFx0dmFyIGxpbmtPYmplY3Q7XG5cdFx0XHRpZiAoIWxpbmsudHlwZSkge1xuXHRcdFx0XHRsaW5rLnR5cGUgPSBMSU5LX1RZUEUuREVGQVVMVDtcblx0XHRcdH1cblx0XHRcdHN3aXRjaChsaW5rLnR5cGUpIHtcblx0XHRcdFx0Y2FzZSBMSU5LX1RZUEUuQVJST1c6XG5cdFx0XHRcdFx0bGluay5oZWFkT2Zmc2V0ID0gbGluay50YXJnZXQucmFkaXVzO1xuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmFycm93KGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5BUkM6XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGguYXJjKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5MSU5FOlxuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5ERUZBVUxUOlxuXHRcdFx0XHRcdGxpbmtPYmplY3QgPSBwYXRoLmxpbmUobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGgubGluZShsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdHRoYXQuX25vZGVJbmRleFRvTGlua0xpbmVbbGluay5zb3VyY2UuaW5kZXhdLnB1c2gobGlua09iamVjdCk7XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW2xpbmsudGFyZ2V0LmluZGV4XS5wdXNoKGxpbmtPYmplY3QpO1xuXG5cdFx0XHR0aGF0Ll9zY2VuZS5hZGRDaGlsZChsaW5rT2JqZWN0KTtcblx0XHR9KTtcblxuXHRcdHRoaXMuX25vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dmFyIGNpcmNsZSA9IHBhdGguY2lyY2xlKG5vZGUpO1xuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9DaXJjbGVbbm9kZS5pbmRleF0gPSBjaXJjbGU7XG5cdFx0XHRpZiAodGhhdC5fbm9kZU92ZXIgfHwgdGhhdC5fZHJhZ2dhYmxlKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ21vdXNlb3ZlcicpO1xuXHRcdFx0XHRjaXJjbGUub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZXZlbnRzU3VzcGVuZGVkKSB7IHJldHVybjsgfVxuXHRcdFx0XHRcdGlmICh0aGF0Ll9ub2RlT3Zlcikge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU92ZXIoY2lyY2xlLCBlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBjaXJjbGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0IHx8IHRoYXQuX2RyYWdnYWJsZSkge1xuXHRcdFx0XHRjaXJjbGUub2ZmKCdtb3VzZW91dCcpO1xuXHRcdFx0XHRjaXJjbGUub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGlmICh0aGF0Ll9ldmVudHNTdXNwZW5kZWQpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhhdC5fbm9kZU91dCkge1xuXHRcdFx0XHRcdFx0dGhhdC5fbm9kZU91dChjaXJjbGUsIGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhhdC5fbm9kZUNsaWNrKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ2NsaWNrJyk7XG5cdFx0XHRcdGNpcmNsZS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCkgeyByZXR1cm47IH1cblx0XHRcdFx0XHR0aGF0Ll9ub2RlQ2xpY2soY2lyY2xlLGUpO1xuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHRcdGNpcmNsZS5vZmYoJ2NsaWNrJyk7XG5cdFx0XHRcdGNpcmNsZS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2V2ZW50c1N1c3BlbmRlZCkgeyByZXR1cm47IH1cblx0XHRcdFx0XHR0aGF0LnVuZ3JvdXAoY2lyY2xlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGF0Ll9zY2VuZS5hZGRDaGlsZChjaXJjbGUpO1xuXG5cdFx0XHRpZiAobm9kZS5sYWJlbCkge1xuXHRcdFx0XHR0aGF0LmFkZExhYmVsKG5vZGUsbm9kZS5sYWJlbCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLl9sYXlvdXRlci5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblxuXHRcdC8vIERyYXcgYW55IHVuZ3JvdXBlZCBub2RlIGJvdW5kaW5nIGJveGVzXG5cdFx0dGhpcy5fYWRkUmVncm91cEhhbmRsZXMoKTtcblxuXHRcdHRoaXMuX3NjZW5lLmFkZENoaWxkKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdF9kZWJ1Z0RyYXdCb3VuZGluZ0JveCA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzKTtcblx0XHRpZiAodGhpcy5fYmJSZW5kZXIpIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX2JiUmVuZGVyKTtcblx0XHR9XG5cdFx0dGhpcy5fYmJSZW5kZXIgPSBwYXRoLnJlY3Qoe1xuXHRcdFx0eCA6IGJvdW5kaW5nQm94LngsXG5cdFx0XHR5IDogYm91bmRpbmdCb3gueSxcblx0XHRcdHdpZHRoIDogYm91bmRpbmdCb3gud2lkdGgsXG5cdFx0XHRoZWlnaHQgOiBib3VuZGluZ0JveC5oZWlnaHQsXG5cdFx0XHRzdHJva2VTdHlsZSA6ICcjZmYwMDAwJyxcblx0XHRcdGxpbmVXaWR0aCA6IDJcblx0XHR9KTtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9iYlJlbmRlcik7XG5cdFx0dGhpcy5fc2NlbmUudXBkYXRlKCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEZpdCB0aGUgZ3JhcGggdG8gdGhlIHNjcmVlblxuXHQgKi9cblx0Zml0IDogZnVuY3Rpb24ocGFkZGluZykge1xuXG5cdFx0Ly8gUmV0dXJuIGJhY2sgdG8gb3JpZ2luXG5cdFx0dGhpcy5fcGFuKC10aGlzLl9zY2VuZS54LC10aGlzLl9zY2VuZS55KTtcblxuXG5cblx0XHQvLyBXb3JraW5nIHdpdGggYmlnIG51bWJlcnMsIGl0J3MgYmV0dGVyIGlmIHdlIGRvIHRoaXMgdHdpY2UuXG5cdFx0dmFyIGJvdW5kaW5nQm94O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMjsgaSsrKSB7XG5cdFx0XHRib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzLHBhZGRpbmcpO1xuXHRcdFx0dmFyIHhSYXRpbyA9IHRoaXMuX3NjZW5lLndpZHRoIC8gYm91bmRpbmdCb3gud2lkdGg7XG5cdFx0XHR2YXIgeVJhdGlvID0gdGhpcy5fc2NlbmUuaGVpZ2h0IC8gYm91bmRpbmdCb3guaGVpZ2h0O1xuXHRcdFx0dGhpcy5fem9vbShNYXRoLm1pbih4UmF0aW8sIHlSYXRpbyksIDAsIDApO1xuXHRcdH1cblxuXHRcdHZhciBtaWRTY3JlZW5YID0gdGhpcy5fc2NlbmUud2lkdGggLyAyO1xuXHRcdHZhciBtaWRTY3JlZW5ZID0gdGhpcy5fc2NlbmUuaGVpZ2h0IC8gMjtcblx0XHRib3VuZGluZ0JveCA9IHRoaXMuX2xheW91dGVyLmdldEJvdW5kaW5nQm94KHRoaXMuX25vZGVzKTtcblx0XHR2YXIgbWlkQkJYID0gYm91bmRpbmdCb3gueCArIGJvdW5kaW5nQm94LndpZHRoIC8gMjtcblx0XHR2YXIgbWlkQkJZID0gYm91bmRpbmdCb3gueSArIGJvdW5kaW5nQm94LmhlaWdodCAvIDI7XG5cdFx0dGhpcy5fcGFuKC0obWlkQkJYLW1pZFNjcmVlblgpLC0obWlkQkJZLW1pZFNjcmVlblkpKTtcblxuXHRcdHRoaXMuX3pvb21TY2FsZSA9IDEuMDtcblx0XHR0aGlzLl9sYXlvdXRlci5fem9vbVNjYWxlID0gMS4wO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0X3N1c3BlbmRFdmVudHMgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9ldmVudHNTdXNwZW5kZWQgPSB0cnVlO1xuXHR9LFxuXG5cdF9yZXN1bWVFdmVudHMgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9ldmVudHNTdXNwZW5kZWQgPSBmYWxzZTtcblx0fSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBhbGwgcmVuZGVyIG9iamVjdHMgYXNzb2NpYXRlZCB3aXRoIGEgZ3JhcGguXG5cdCAqL1xuXHRjbGVhciA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciByZW1vdmVSZW5kZXJPYmplY3RzID0gZnVuY3Rpb24oaW5kZXhUb09iamVjdCkge1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIGluZGV4VG9PYmplY3QpIHtcblx0XHRcdFx0aWYgKGluZGV4VG9PYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdHZhciBvYmogPSBpbmRleFRvT2JqZWN0W2tleV07XG5cdFx0XHRcdFx0aWYgKCQuaXNBcnJheShvYmopKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmpbaV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkZWxldGUgaW5kZXhUb09iamVjdFtrZXldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0aWYgKHRoaXMuX3ByZXJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9wcmVyZW5kZXJHcm91cCk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9oYW5kbGVHcm91cCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGhpcy5faGFuZGxlR3JvdXApO1xuXHRcdH1cblx0XHRpZiAodGhpcy5fcG9zdHJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9wb3N0cmVuZGVyR3JvdXApO1xuXHRcdH1cblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cblxuZXhwb3J0cy5MSU5LX1RZUEUgPSByZXF1aXJlKCcuL2xpbmtUeXBlJyk7XG5leHBvcnRzLkdyb3VwaW5nTWFuYWdlciA9IHJlcXVpcmUoJy4vZ3JvdXBpbmdNYW5hZ2VyJyk7XG5leHBvcnRzLkxheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG5leHBvcnRzLkNvbHVtbkxheW91dCA9IHJlcXVpcmUoJy4vY29sdW1uTGF5b3V0Jyk7XG5leHBvcnRzLlJhZGlhbExheW91dCA9IHJlcXVpcmUoJy4vcmFkaWFsTGF5b3V0Jyk7XG5leHBvcnRzLkV4dGVuZCA9IF8uZXh0ZW5kO1xuZXhwb3J0cy5HcmFwaCA9IEdyYXBoOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbi8qKlxuICpcbiAqIEBwYXJhbSBmb2N1cyAtIHRoZSBub2RlIGF0IHRoZSBjZW50ZXIgb2YgdGhlIHJhZGlhbCBsYXlvdXRcbiAqIEBwYXJhbSBkaXN0YW5jZSAtIHRoZSBkaXN0YW5jZSBvZiBvdGhlciBub2RlcyBmcm9tIHRoZSBmb2N1c1xuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJhZGlhbExheW91dChmb2N1cyxkaXN0YW5jZSkge1xuXHR0aGlzLl9mb2N1cyA9IGZvY3VzO1xuXHR0aGlzLl9kaXN0YW5jZSA9IGRpc3RhbmNlO1xuXG5cdExheW91dC5hcHBseSh0aGlzKTtcbn1cblxuXG5SYWRpYWxMYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoUmFkaWFsTGF5b3V0LnByb3RvdHlwZSwgTGF5b3V0LnByb3RvdHlwZSwge1xuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBkaXN0YW5jZSBwYXJhbWV0ZXJcblx0ICogQHBhcmFtIGRpc3RhbmNlIC0gdGhlIGRpc3RhbmNlIG9mIGxpbmtzIGZyb20gdGhlIGZvY3VzIG5vZGUgdG8gb3RoZXIgbm9kZXMgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtSYWRpYWxMYXlvdXR9IGlmIGRpc3RhbmNlIHBhcmFtIGlzIGRlZmluZWQsIHtSYWRpYWxMYXlvdXQuX2Rpc3RhbmNlfSBvdGhlcndpc2Vcblx0ICovXG5cdGRpc3RhbmNlOiBmdW5jdGlvbiAoZGlzdGFuY2UpIHtcblx0XHRpZiAoZGlzdGFuY2UpIHtcblx0XHRcdHRoaXMuX2Rpc3RhbmNlID0gZGlzdGFuY2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9kaXN0YW5jZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZm9jdXMgbm9kZSB0aGF0IGlzIGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxheW91dFxuXHQgKiBAcGFyYW0gZm9jdXMgLSB0aGUgbm9kZSB0aGF0IGlzIGF0IHRoZSBjZW50ZXIgb2YgdGhlIGxheW91dC4gICBPdGhlciBub2RlcyBhcmUgY2VudGVyZWQgYXJvdW5kIHRoaXMuXG5cdCAqIEByZXR1cm5zIHtSYWRpYWxMYXlvdXR9IGlmIGZvY3VzIHBhcmFtIGlzIGRlZmluZWQsIHtSYWRpYWxMYXlvdXQuX2ZvY3VzfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvY3VzOiBmdW5jdGlvbiAoZm9jdXMpIHtcblx0XHRpZiAoZm9jdXMpIHtcblx0XHRcdHRoaXMuX2ZvY3VzID0gZm9jdXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb2N1cztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCB0aGUgbGFiZWwgcG9zaXRpb24gZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVggLSB0aGUgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVkgLSB0aGUgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gcmFkaXVzIC0gdGhlIHJhZGl1cyBvZiB0aGUgbm9kZVxuXHQgKiBAcmV0dXJucyB7e3g6IHggcG9zaXRpb24gb2YgdGhlIGxhYmVsLCB5OiB5IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgYWxpZ246IEhUTUwgY2FudmFzIHRleHQgYWxpZ25tZW50IHByb3BlcnR5IGZvciBsYWJlbH19XG5cdCAqL1xuXHRsYXlvdXRMYWJlbDogZnVuY3Rpb24gKG5vZGVYLCBub2RlWSwgcmFkaXVzKSB7XG5cdFx0dmFyIHgsIHksIGFsaWduO1xuXG5cdFx0Ly8gUmlnaHQgb2YgY2VudGVyXG5cdFx0aWYgKG5vZGVYID4gdGhpcy5fZm9jdXMpIHtcblx0XHRcdHggPSBub2RlWCArIChyYWRpdXMgKyAxMCk7XG5cdFx0XHRhbGlnbiA9ICdzdGFydCc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHggPSBub2RlWCAtIChyYWRpdXMgKyAxMCk7XG5cdFx0XHRhbGlnbiA9ICdlbmQnO1xuXHRcdH1cblxuXHRcdGlmIChub2RlWSA+IHRoaXMuX2ZvY3VzKSB7XG5cdFx0XHR5ID0gbm9kZVkgKyAocmFkaXVzICsgMTApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR5ID0gbm9kZVkgLSAocmFkaXVzICsgMTApO1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0eDogeCxcblx0XHRcdHk6IHksXG5cdFx0XHRhbGlnbjogYWxpZ25cblx0XHR9O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQZXJmb3JtIGEgcmFkaWFsIGxheW91dFxuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqL1xuXHRsYXlvdXQ6IGZ1bmN0aW9uICh3LCBoKSB7XG5cdFx0dmFyIG5vZGVzID0gdGhpcy5ub2RlcygpO1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgYW5nbGVEZWx0YSA9IE1hdGguUEkgKiAyIC8gKG5vZGVzLmxlbmd0aCAtIDEpO1xuXHRcdHZhciBhbmdsZSA9IDAuMDtcblx0XHRub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0XHRpZiAobm9kZS5pbmRleCA9PT0gdGhhdC5fZm9jdXMuaW5kZXgpIHtcblx0XHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUsIG5vZGUueCwgbm9kZS55KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIG5ld1ggPSB0aGF0Ll9mb2N1cy54ICsgKE1hdGguY29zKGFuZ2xlKSAqIHRoYXQuX2Rpc3RhbmNlKTtcblx0XHRcdHZhciBuZXdZID0gdGhhdC5fZm9jdXMueSArIChNYXRoLnNpbihhbmdsZSkgKiB0aGF0Ll9kaXN0YW5jZSk7XG5cdFx0XHR0aGF0Ll9zZXROb2RlUG9zaXRpb24obm9kZSwgbmV3WCwgbmV3WSk7XG5cdFx0XHRhbmdsZSArPSBhbmdsZURlbHRhO1xuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSYWRpYWxMYXlvdXQ7XG4iLCJcbnZhciBVdGlsID0ge1xuXG4gIGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuICAgIHZhciBrZXksIGksIHNvdXJjZTtcbiAgICBmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzdDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(5)
});
