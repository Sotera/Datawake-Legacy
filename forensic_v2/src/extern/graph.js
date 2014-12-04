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
	_createAggregateLink : function(sourceAggregate,targetAggregate) {
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
		this._aggregatedNodes.forEach(function(aggregate) {
			if (aggregate.children) {
				aggregate.children.forEach(function(node) {
					nodeIndexToAggreagateNode[node.index] = aggregate;
				});
			} else {
				nodeIndexToAggreagateNode[aggregate.index] = aggregate;
			}
		});

		var areAggregatesLinked = {};
		var aggregatedLinks = [];
		var that = this;
		this._links.forEach(function(link) {
			var sourceAggregate = nodeIndexToAggreagateNode[link.source.index];
			var targetAggregate = nodeIndexToAggreagateNode[link.target.index];
			if (sourceAggregate.index === targetAggregate.index) {
				return;
			}
			var key = sourceAggregate.index + ',' + targetAggregate.index;
			if (!areAggregatesLinked[key]) {
				var aggregatedLink = that._createAggregateLink(sourceAggregate,targetAggregate);
				aggregatedLinks.push(aggregatedLink);
				areAggregatesLinked[key] = true;
			}
		});
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

	regroup : function(aggregateKey) {
		var aggregateNode = this._ungroupedAggregates[aggregateKey];
		var nodesToRemove = aggregateNode.children;
		var that = this;
		nodesToRemove.forEach(function(node) {
			that.remove(node);
		});
		that._aggregatedNodes.push(aggregateNode);
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

var BOUNDING_BOX_PADDING = 5;

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
	 * @param nodeIndexArray - array of node indicies
	 * @returns {{min: {x: Number, y: Number}, max: {x: number, y: number}}}
	 */
	getBoundingBox : function(nodeIndexArray) {
		var min = {
			x : Number.MAX_VALUE,
			y : Number.MAX_VALUE
		};
		var max = {
			x : -Number.MAX_VALUE,
			y : -Number.MAX_VALUE
		};

		var that = this;
		nodeIndexArray.forEach(function(index) {
			var circle = that._nodeMap[index];
			min.x = Math.min(min.x, (circle.finalX || circle.x) - circle.radius);
			min.y = Math.min(min.y, (circle.finalY || circle.y) - circle.radius);
			max.x = Math.max(max.x, (circle.finalX || circle.x) + circle.radius);
			max.y = Math.max(max.y, (circle.finalY || circle.y) + circle.radius);
		});
		return {
			x : min.x - BOUNDING_BOX_PADDING,
			y : min.y - BOUNDING_BOX_PADDING,
			width : (max.x - min.y)+BOUNDING_BOX_PADDING,
			height : (max.y - min.y)+BOUNDING_BOX_PADDING
		};
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
	_setNodePosition : function(node,x,y,bImmediate,callback) {
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
		}

		// Update the label render object
		var label = this._labelMap[node.index];
		if (label) {
			var labelPos = this.layoutLabel(x,y,node.radius);
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
	layout : function(w,h) {
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
	layoutLabel : function(nodeX,nodeY,radius) {
		return {
			x: nodeX + radius + 5,
			y: nodeY + radius + 5
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
	 * Adds a label for a node
	 * @param node
	 * @param text
	 * @returns {Graph}
	 */
	addLabel : function(node,text) {
		if (this._nodeIndexToLabel[node.index]) {
			this.removeLabel(node);
		}
		var labelAttrs = this._layouter.layoutLabel(node.x,node.y,node.radius);

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

	/**
	 * Make {Graph} zoomable by using the mousewheel
	 * @returns {Graph}
	 */
	zoomable : function() {
		var zoomLevel = 1.0;
		if (!this._zoomable) {
			var that = this;
			$(this._canvas).on('mousewheel',function(e) {
				e.preventDefault();
				var bWheelUp = e.originalEvent.deltaY < 0;
				if (bWheelUp) {
					zoomLevel++;
				} else {
					zoomLevel--;
				}
				zoomLevel = Math.max(zoomLevel,1.0);
				that._scene.zoom(zoomLevel, e.clientX, e.clientY);
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
	layout : function() {
		if (this._layouter) {
			this._layouter.layout(this._canvas.width,this._canvas.height);
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
		if (this._groupingManager) {
			this._groupingManager.ungroup(node);
			this.clear()
				.nodes(this._groupingManager.aggregatedNodes())
				.links(this._groupingManager.aggregatedLinks());
		}
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

		var currentDuration = this._layouter.duration();
		this._layouter.duration(250);

		var animatedRegrouped = 0;
		parentAggregate.children.forEach(function(child) {
			that._layouter._setNodePosition(child,avgPos.x,avgPos.y,false,function() {
				animatedRegrouped++;
				if (animatedRegrouped === parentAggregate.children.length) {
					if (that._groupingManager) {
						that._groupingManager.regroup(ungroupedAggregateKey);
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
		this._layouter.duration(currentDuration);
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
		this.layout();
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

		// Draw any ungrouped node bounding boxes
		if (this._groupingManager) {
			var ungroupedNodeInfo = this._groupingManager.getUngroupedNodes();
			ungroupedNodeInfo.forEach(function(ungroupedNode) {
				var indices = ungroupedNode.indices;
				var key = ungroupedNode.key;
				var bbox = that._layouter.getBoundingBox(indices);
				var boundingBoxRenderObject = path.rect({
					x : bbox.x,
					y : bbox.y,
					width : bbox.width,
					height : bbox.height,
					strokeStyle : '#232323',
					fillStyle : '#000000',
					opacity : 0.1
				});
				boundingBoxRenderObject.on('click',function() {
					console.log('Regroup nodes ' + key);
					that.regroup(key);
				});
				that._prerenderGroup.addChild(boundingBoxRenderObject);
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
	 * Redraw the graph
	 * @returns {Graph}
	 */
	update : function() {
		this._addPreAndPostRenderObjects();
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
		this._scene.addChild(this._prerenderGroup);
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
			if (that._nodeOver) {
				circle.on('mouseover', function(e) {
					that._nodeOver(circle,e);
					if (that._currentMoveState!=='dragging') {
						that._currentOverNode = circle;
					}
					that._scene.update();
				});
			}
			if (that._nodeOut) {
				circle.on('mouseout', function(e) {
					if (that._currentMoveState!=='dragging') {
						that._currentOverNode = null;
					}
					that._nodeOut(circle,e);
					that._scene.update();
				});
			}
			if (that._nodeClick) {
				circle.on('click', function(e) {
					that._nodeClick(circle,e);
					that._scene.update();
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

		this._postrenderGroup = path.group({noHit:true});
		this._scene.addChild(this._postrenderGroup);
		this.update();

		return this;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvY29sdW1uTGF5b3V0LmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL2dyYXBoanMvc3JjL2dyb3VwaW5nTWFuYWdlci5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9sYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbGlua1R5cGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9ncmFwaGpzL3NyYy9yYWRpYWxMYXlvdXQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvZ3JhcGhqcy9zcmMvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaHFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG52YXIgQ29sdW1uTGF5b3V0ID0gZnVuY3Rpb24oKSB7XG5cdExheW91dC5hcHBseSh0aGlzKTtcbn07XG5cbkNvbHVtbkxheW91dC5wcm90b3R5cGUgPSBfLmV4dGVuZChDb2x1bW5MYXlvdXQucHJvdG90eXBlLCBMYXlvdXQucHJvdG90eXBlLCB7XG5cblx0LyoqXG5cdCAqIEEgY29sdW1uIGxheW91dFxuXHQgKiBAcGFyYW0gdyAtIHdpZHRoIG9mIGNhbnZhc1xuXHQgKiBAcGFyYW0gaCAtIGhlaWdodCBvZiBjYW52YXNcblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uICh3LCBoKSB7XG5cdFx0dmFyIHggPSAwO1xuXHRcdHZhciB5ID0gMDtcblx0XHR2YXIgbWF4UmFkaXVzQ29sID0gMDtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuXG5cdFx0XHRpZiAoeSA9PT0gMCkge1xuXHRcdFx0XHR5ICs9IG5vZGUucmFkaXVzO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHggPT09IDApIHtcblx0XHRcdFx0eCArPSBub2RlLnJhZGl1cztcblx0XHRcdH1cblxuXHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlKG5vZGUsIHgsIHkpO1xuXG5cdFx0XHRtYXhSYWRpdXNDb2wgPSBNYXRoLm1heChtYXhSYWRpdXNDb2wsIG5vZGUucmFkaXVzKTtcblxuXHRcdFx0eSArPSBub2RlLnJhZGl1cyArIDQwO1xuXHRcdFx0aWYgKHkgPiBoKSB7XG5cdFx0XHRcdHkgPSAwO1xuXHRcdFx0XHR4ICs9IG1heFJhZGl1c0NvbCArIDQwO1xuXHRcdFx0XHRtYXhSYWRpdXNDb2wgPSAwO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2x1bW5MYXlvdXQ7XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBiYXNlIGdyb3VwaW5nIG1hbmFnZXIuICAgVGhpcyBpcyBhbiBhYnN0cmFjdCBjbGFzcy4gICBDaGlsZCBjbGFzc2VzIHNob3VsZCBvdmVycmlkZSB0aGVcbiAqIGluaXRpYWxpemVIZWlyYXJjaHkgZnVuY3Rpb24gdG8gY3JlYXRlIG5vZGVzL2xpbmtzIHRoYXQgYXJlIGFnZ3JlZ2F0ZWQgZm9yIHRoZWlyIHNwZWNpZmljIGltcGxlbWVudGF0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEdyb3VwaW5nTWFuYWdlciA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBbXTtcblx0dGhpcy5fbGlua3MgPSBbXTtcblxuXHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBbXTtcblx0dGhpcy5fYWdncmVnYXRlZExpbmtzID0gW107XG5cblx0dGhpcy5fdW5ncm91cGVkQWdncmVnYXRlcyA9IHt9O1xuXHR0aGlzLl91bmdyb3VwZWROb2RlR3JvdXBzID0ge307XG5cblx0Xy5leHRlbmQodGhpcyxhdHRyaWJ1dGVzKTtcbn07XG5cbkdyb3VwaW5nTWFuYWdlci5wcm90b3R5cGUgPSBfLmV4dGVuZChHcm91cGluZ01hbmFnZXIucHJvdG90eXBlLCB7XG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG9yaWdpbmFsIG5vZGVzIGluIHRoZSBncmFwaCB3aXRob3V0IGdyb3VwaW5nXG5cdCAqIEBwYXJhbSBub2RlcyAtIGEgZ3JhcGguanMgbm9kZSBhcnJheVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdG5vZGVzIDogZnVuY3Rpb24obm9kZXMpIHtcblx0XHRpZiAobm9kZXMpIHtcblx0XHRcdHRoaXMuX25vZGVzID0gbm9kZXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ub2Rlcztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgb3JpZ2luYWwgbGlua3MgaW4gdGhlIGdyYXBoIHdpdGhvdXQgZ3JvdXBpbmdcblx0ICogQHBhcmFtIGxpbmtzIC0gYSBncmFwaC5qcyBsaW5rIGFycmF5XG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0bGlua3MgOiBmdW5jdGlvbihsaW5rcykge1xuXHRcdGlmIChsaW5rcykge1xuXHRcdFx0dGhpcy5fbGlua3MgPSBsaW5rcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZXMgdGhlIG5vZGUvbGluayBhZ2dyZWdhdGlvblxuXHQgKi9cblx0aW5pdGlhbGl6ZUhlaXJhcmNoeSA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2FnZ3JlZ2F0ZU5vZGVzKCk7XG5cdFx0dGhpcy5fYWdncmVnYXRlTGlua3MoKTtcblxuXHRcdHZhciBzZXRQYXJlbnRQb2ludGVycyA9IGZ1bmN0aW9uKG5vZGUscGFyZW50KSB7XG5cdFx0XHRpZiAobm9kZS5jaGlsZHJlbikge1xuXHRcdFx0XHRub2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdFx0XHRzZXRQYXJlbnRQb2ludGVycyhjaGlsZCxub2RlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRub2RlLnBhcmVudE5vZGUgPSBwYXJlbnQ7XG5cdFx0fTtcblxuXHRcdHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHNldFBhcmVudFBvaW50ZXJzKG5vZGUsbnVsbCk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYWdncmVnYXRlZCBsaW5rIGluIGdyYXBoLmpzIGZvcm1hdC4gICBDYW4gYmUgb3ZlcnJpZGVuIGJ5IHNwZWNpZmljIGltcGxlbWVudGF0aW9ucyB0byBhbGxvd1xuXHQgKiB0byBhbGxvdyBmb3IgZGlmZXJlbnQgbGluayB0eXBlcyBiYXNlZCBvbiBhZ2dyZWdhdGUgY29udGVudHNcblx0ICogQHBhcmFtIHNvdXJjZUFnZ3JlZ2F0ZSAtIHRoZSBzb3VyY2UgYWdncmVnYXRlIG5vZGVcblx0ICogQHBhcmFtIHRhcmdldEFnZ3JlZ2F0ZSAtIHRoZSB0YXJnZXQgYWdncmVnYXRlIG5vZGVcblx0ICogQHJldHVybnMge3tzb3VyY2U6ICosIHRhcmdldDogKn19IC0gYSBncmFwaC5qcyBsaW5rXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfY3JlYXRlQWdncmVnYXRlTGluayA6IGZ1bmN0aW9uKHNvdXJjZUFnZ3JlZ2F0ZSx0YXJnZXRBZ2dyZWdhdGUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0c291cmNlIDogc291cmNlQWdncmVnYXRlLFxuXHRcdFx0dGFyZ2V0IDogdGFyZ2V0QWdncmVnYXRlXG5cdFx0fTtcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgbGluayBhZ2dyZWdhdGUgYmFzZWQgb24gYSBzZXQgb2YgYWdncmVnYXRlZCBub2RlcyBhbmQgYSBmdWxsIHNldCBvZiBsaW5rc1xuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2FnZ3JlZ2F0ZUxpbmtzIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGUgPSB7fTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuZm9yRWFjaChmdW5jdGlvbihhZ2dyZWdhdGUpIHtcblx0XHRcdGlmIChhZ2dyZWdhdGUuY2hpbGRyZW4pIHtcblx0XHRcdFx0YWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRcdG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbm9kZS5pbmRleF0gPSBhZ2dyZWdhdGU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bm9kZUluZGV4VG9BZ2dyZWFnYXRlTm9kZVthZ2dyZWdhdGUuaW5kZXhdID0gYWdncmVnYXRlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dmFyIGFyZUFnZ3JlZ2F0ZXNMaW5rZWQgPSB7fTtcblx0XHR2YXIgYWdncmVnYXRlZExpbmtzID0gW107XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHRoaXMuX2xpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXHRcdFx0dmFyIHNvdXJjZUFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay5zb3VyY2UuaW5kZXhdO1xuXHRcdFx0dmFyIHRhcmdldEFnZ3JlZ2F0ZSA9IG5vZGVJbmRleFRvQWdncmVhZ2F0ZU5vZGVbbGluay50YXJnZXQuaW5kZXhdO1xuXHRcdFx0aWYgKHNvdXJjZUFnZ3JlZ2F0ZS5pbmRleCA9PT0gdGFyZ2V0QWdncmVnYXRlLmluZGV4KSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBrZXkgPSBzb3VyY2VBZ2dyZWdhdGUuaW5kZXggKyAnLCcgKyB0YXJnZXRBZ2dyZWdhdGUuaW5kZXg7XG5cdFx0XHRpZiAoIWFyZUFnZ3JlZ2F0ZXNMaW5rZWRba2V5XSkge1xuXHRcdFx0XHR2YXIgYWdncmVnYXRlZExpbmsgPSB0aGF0Ll9jcmVhdGVBZ2dyZWdhdGVMaW5rKHNvdXJjZUFnZ3JlZ2F0ZSx0YXJnZXRBZ2dyZWdhdGUpO1xuXHRcdFx0XHRhZ2dyZWdhdGVkTGlua3MucHVzaChhZ2dyZWdhdGVkTGluayk7XG5cdFx0XHRcdGFyZUFnZ3JlZ2F0ZXNMaW5rZWRba2V5XSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5fYWdncmVnYXRlZExpbmtzID0gYWdncmVnYXRlZExpbmtzO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIFBlcmZvcm0gbm9kZSBhZ2dyZWdhdGlvbi4gICBNdXN0IGJlIG92ZXJyaWRlbiBieSBpbXBsZW1lbnRvcnNcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9hZ2dyZWdhdGVOb2RlcyA6IGZ1bmN0aW9uKCkge1xuXG5cdH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIGFnZ3JlZ2F0ZWQgbm9kZXNcblx0ICogQHJldHVybnMge0FycmF5fSBvZiBncmFwaC5qcyBub2Rlc1xuXHQgKi9cblx0YWdncmVnYXRlZE5vZGVzIDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWROb2Rlcztcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgYWdncmVnYXRlZCBsaW5rc1xuXHQgKiBAcmV0dXJucyB7QXJyYXl9IG9mIGdyYXBoLmpzIGxpbmtzXG5cdCAqL1xuXHRhZ2dyZWdhdGVkTGlua3MgOiBmdW5jdGlvbigpICB7XG5cdFx0cmV0dXJuIHRoaXMuX2FnZ3JlZ2F0ZWRMaW5rcztcblx0fSxcblxuXHRyZW1vdmUgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0dmFyIGluZGV4ID0gLTE7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMubGVuZ3RoICYmIGluZGV4ID09PSAtMTsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5fYWdncmVnYXRlZE5vZGVzW2ldLmluZGV4ID09PSBub2RlLmluZGV4KSB7XG5cdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGluZGV4ICE9PSAtMSkge1xuXHRcdFx0dGhpcy5fYWdncmVnYXRlZE5vZGVzLnNwbGljZShpbmRleCwxKTtcblx0XHR9XG5cdH0sXG5cblxuXHQvKipcblx0ICogRG8gYW55IHVwZGF0ZXMgb24gY2hpbGRyZW4gYmVmb3JlIGxheW91dCAgKGllLyBzZXQgcG9zaXRpb24sIHJvdy9jb2wgaW5mbywgZXRjKS4gICBTaG91bGQgYmUgZGVmaW5lZFxuXHQgKiBpbiBpbXBsZW1lbnRpbmcgY2xhc3Ncblx0ICogQHBhcmFtIGFnZ3JlZ2F0ZVxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X3VwZGF0ZUNoaWxkcmVuIDogZnVuY3Rpb24oYWdncmVnYXRlKSB7XG5cblx0fSxcblxuXHQvKipcblx0ICogVW5ncm91cCBhbiBhZ2dyZWdhdGUgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKi9cblx0dW5ncm91cCA6IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRpZiAobm9kZS5jaGlsZHJlbikge1xuXG5cdFx0XHR2YXIgcGFyZW50S2V5ID0gJyc7XG5cdFx0XHRub2RlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRwYXJlbnRLZXkgKz0gbm9kZS5pbmRleCArICcsJztcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW3BhcmVudEtleV0gPSBub2RlO1xuXG5cdFx0XHR2YXIgaW5kZXggPSAtMTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fYWdncmVnYXRlZE5vZGVzLmxlbmd0aCAmJiBpbmRleCA9PT0gLTE7IGkrKykge1xuXHRcdFx0XHRpZiAodGhpcy5fYWdncmVnYXRlZE5vZGVzW2ldLmluZGV4ID09PSBub2RlLmluZGV4KSB7XG5cdFx0XHRcdFx0aW5kZXggPSBpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX3VwZGF0ZUNoaWxkcmVuKG5vZGUpO1xuXG5cdFx0XHR2YXIgZmlyc3QgPSB0aGlzLl9hZ2dyZWdhdGVkTm9kZXMuc2xpY2UoMCxpbmRleCk7XG5cdFx0XHR2YXIgbWlkZGxlID0gbm9kZS5jaGlsZHJlbjtcblx0XHRcdHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHNbcGFyZW50S2V5XSA9IG5vZGUuY2hpbGRyZW47XG5cdFx0XHR2YXIgZW5kID0gdGhpcy5fYWdncmVnYXRlZE5vZGVzLnNsaWNlKGluZGV4KzEpO1xuXG5cdFx0XHR0aGlzLl9hZ2dyZWdhdGVkTm9kZXMgPSBmaXJzdC5jb25jYXQobWlkZGxlKS5jb25jYXQoZW5kKTtcblxuXHRcdFx0Ly8gUmVjb21wdXRlIGFnZ3JlZ2F0ZWQgbGlua3Ncblx0XHRcdHRoaXMuX2FnZ3JlZ2F0ZUxpbmtzKCk7XG5cdFx0fVxuXHR9LFxuXHRnZXRBZ2dyZWdhdGUgOiBmdW5jdGlvbihhZ2dyZWdhdGVLZXkpIHtcblx0XHRyZXR1cm4gdGhpcy5fdW5ncm91cGVkQWdncmVnYXRlc1thZ2dyZWdhdGVLZXldO1xuXHR9LFxuXG5cdHJlZ3JvdXAgOiBmdW5jdGlvbihhZ2dyZWdhdGVLZXkpIHtcblx0XHR2YXIgYWdncmVnYXRlTm9kZSA9IHRoaXMuX3VuZ3JvdXBlZEFnZ3JlZ2F0ZXNbYWdncmVnYXRlS2V5XTtcblx0XHR2YXIgbm9kZXNUb1JlbW92ZSA9IGFnZ3JlZ2F0ZU5vZGUuY2hpbGRyZW47XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdG5vZGVzVG9SZW1vdmUuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR0aGF0LnJlbW92ZShub2RlKTtcblx0XHR9KTtcblx0XHR0aGF0Ll9hZ2dyZWdhdGVkTm9kZXMucHVzaChhZ2dyZWdhdGVOb2RlKTtcblx0XHR0aGlzLl9hZ2dyZWdhdGVMaW5rcygpO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmdyb3VwZWRBZ2dyZWdhdGVzW2FnZ3JlZ2F0ZUtleV07XG5cdFx0ZGVsZXRlIHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHNbYWdncmVnYXRlS2V5XTtcblx0fSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbiBhcnJheSBvZiBub2RlIGdyb3VwcyB0aGF0IGFyZSBleHBhbmRlZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRnZXRVbmdyb3VwZWROb2RlcyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbmZvID0gW107XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuX3VuZ3JvdXBlZE5vZGVHcm91cHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR2YXIgbm9kZXMgPSB0aGF0Ll91bmdyb3VwZWROb2RlR3JvdXBzW2tleV07XG5cdFx0XHR2YXIgbm9kZUluZGljZXMgPSBub2Rlcy5tYXAoZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHRyZXR1cm4gbm9kZS5pbmRleDtcblx0XHRcdH0pO1xuXHRcdFx0aW5mby5wdXNoKHtcblx0XHRcdFx0aW5kaWNlcyA6IG5vZGVJbmRpY2VzLFxuXHRcdFx0XHRrZXkgOiBrZXlcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdHJldHVybiBpbmZvO1xuXHR9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwaW5nTWFuYWdlcjtcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBCT1VORElOR19CT1hfUEFERElORyA9IDU7XG5cbi8qKlxuICogTGF5b3V0IGNvbnN0cnVjdG9yXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIExheW91dCA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcblx0dGhpcy5fbm9kZXMgPSBudWxsO1xuXHR0aGlzLl9saW5rTWFwID0gbnVsbDtcblx0dGhpcy5fbm9kZU1hcCA9IG51bGw7XG5cdHRoaXMuX2xhYmVsTWFwID0gbnVsbDtcblx0dGhpcy5fZHVyYXRpb24gPSAyNTA7XG5cdHRoaXMuX2Vhc2luZyA9ICdlYXNlLWluLW91dCc7XG5cdHRoaXMuX2lzVXBkYXRlID0gZmFsc2U7XG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5MYXlvdXQucHJvdG90eXBlID0gXy5leHRlbmQoTGF5b3V0LnByb3RvdHlwZSwge1xuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGR1cmF0aW9uIG9mIHRoZSBsYXlvdXQgYW5pbWF0aW9uXG5cdCAqIEBwYXJhbSBkdXJhdGlvbiAtIHRoZSBkdXJhdGlvbiBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9IDI1MG1zKVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBkdXJhdGlvbiBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9kdXJhdGlvbn0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRkdXJhdGlvbiA6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0aWYgKGR1cmF0aW9uKSB7XG5cdFx0XHR0aGlzLl9kdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZHVyYXRpb247XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvblxuXHQgKiBAcGFyYW0gZWFzaW5nIC0gdGhlIGVhc2luZyBvZiB0aGUgbGF5b3V0IGFuaW1hdGlvbiBpbiBtaWxsaXNlY29uZHMuICAoZGVmYXVsdCA9ICdlYXNlLWluLW91dCcpXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGVhc2luZyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9lYXNpbmd9IG90aGVyd2lzZVxuXHQgKi9cblx0ZWFzaW5nIDogZnVuY3Rpb24oZWFzaW5nKSB7XG5cdFx0aWYgKGVhc2luZykge1xuXHRcdFx0dGhpcy5fZWFzaW5nID0gZWFzaW5nO1xuXHRcdH1cdCBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9lYXNpbmc7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGVzIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlcyAtIHRoZSBzZXQgb2Ygbm9kZXMgZGVmaW5lZCBpbiB0aGUgY29ycmVzcG9uZGluZyBncmFwaFxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBub2RlcyBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2Rlc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRub2RlcyA6IGZ1bmN0aW9uKG5vZGVzKSB7XG5cdFx0aWYgKG5vZGVzKSB7XG5cdFx0XHR0aGlzLl9pc1VwZGF0ZSA9IG5vZGVzID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2Rlcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBsaW5rIG1hcCBvZiB0aGUgbGF5b3V0LiAgIFNldCBmcm9tIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbGlua01hcCAtIGEgbWFwIGZyb20gbm9kZSBpbmRleCB0byBhIHNldCBvZiBsaW5lcyAocGF0aCBvYmplY3RzKSB0aGF0IGNvbnRhaW4gdGhhdCBub2RlXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9IGlmIGxpbmtNYXAgcGFyYW0gaXMgZGVmaW5lZCwge0xheW91dC5fbGlua01hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsaW5rTWFwIDogZnVuY3Rpb24obGlua01hcCkge1xuXHRcdGlmIChsaW5rTWFwKSB7XG5cdFx0XHR0aGlzLl9saW5rTWFwID0gbGlua01hcDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xpbmtNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIG5vZGUgbWFwIG9mIHRoZSBsYXlvdXQuICAgU2V0IGZyb20gdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBub2RlTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgY2lyY2xlIChwYXRoIG9iamVjdClcblx0ICogQHJldHVybnMge0xheW91dH0gaWYgbm9kZU1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9ub2RlTWFwfSBvdGhlcndpc2Vcblx0ICovXG5cdG5vZGVNYXAgOiBmdW5jdGlvbihub2RlTWFwKSB7XG5cdFx0aWYgKG5vZGVNYXApIHtcblx0XHRcdHRoaXMuX25vZGVNYXAgPSBub2RlTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbm9kZU1hcDtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbGFiZWwgb2YgdGhlIGxheW91dC4gICBTZXQgZnJvbSB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIGxhYmVsTWFwIC0gYSBtYXAgZnJvbSBub2RlIGluZGV4IHRvIGEgdGV4dCBvYmplY3QgKHBhdGggb2JqZWN0KVxuXHQgKiBAcmV0dXJucyB7TGF5b3V0fSBpZiBsYWJlbE1hcCBwYXJhbSBpcyBkZWZpbmVkLCB7TGF5b3V0Ll9sYWJlbE1hcH0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsYWJlbE1hcCA6IGZ1bmN0aW9uKGxhYmVsTWFwKSB7XG5cdFx0aWYgKGxhYmVsTWFwKSB7XG5cdFx0XHR0aGlzLl9sYWJlbE1hcCA9IGxhYmVsTWFwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGFiZWxNYXA7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgYm91bmRpbmcgYm94IGZvciBhbiBhcnJheSBvZiBub2RlIGluZGljZXNcblx0ICogQHBhcmFtIG5vZGVJbmRleEFycmF5IC0gYXJyYXkgb2Ygbm9kZSBpbmRpY2llc1xuXHQgKiBAcmV0dXJucyB7e21pbjoge3g6IE51bWJlciwgeTogTnVtYmVyfSwgbWF4OiB7eDogbnVtYmVyLCB5OiBudW1iZXJ9fX1cblx0ICovXG5cdGdldEJvdW5kaW5nQm94IDogZnVuY3Rpb24obm9kZUluZGV4QXJyYXkpIHtcblx0XHR2YXIgbWluID0ge1xuXHRcdFx0eCA6IE51bWJlci5NQVhfVkFMVUUsXG5cdFx0XHR5IDogTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cdFx0dmFyIG1heCA9IHtcblx0XHRcdHggOiAtTnVtYmVyLk1BWF9WQUxVRSxcblx0XHRcdHkgOiAtTnVtYmVyLk1BWF9WQUxVRVxuXHRcdH07XG5cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0bm9kZUluZGV4QXJyYXkuZm9yRWFjaChmdW5jdGlvbihpbmRleCkge1xuXHRcdFx0dmFyIGNpcmNsZSA9IHRoYXQuX25vZGVNYXBbaW5kZXhdO1xuXHRcdFx0bWluLnggPSBNYXRoLm1pbihtaW4ueCwgKGNpcmNsZS5maW5hbFggfHwgY2lyY2xlLngpIC0gY2lyY2xlLnJhZGl1cyk7XG5cdFx0XHRtaW4ueSA9IE1hdGgubWluKG1pbi55LCAoY2lyY2xlLmZpbmFsWSB8fCBjaXJjbGUueSkgLSBjaXJjbGUucmFkaXVzKTtcblx0XHRcdG1heC54ID0gTWF0aC5tYXgobWF4LngsIChjaXJjbGUuZmluYWxYIHx8IGNpcmNsZS54KSArIGNpcmNsZS5yYWRpdXMpO1xuXHRcdFx0bWF4LnkgPSBNYXRoLm1heChtYXgueSwgKGNpcmNsZS5maW5hbFkgfHwgY2lyY2xlLnkpICsgY2lyY2xlLnJhZGl1cyk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHggOiBtaW4ueCAtIEJPVU5ESU5HX0JPWF9QQURESU5HLFxuXHRcdFx0eSA6IG1pbi55IC0gQk9VTkRJTkdfQk9YX1BBRERJTkcsXG5cdFx0XHR3aWR0aCA6IChtYXgueCAtIG1pbi55KStCT1VORElOR19CT1hfUEFERElORyxcblx0XHRcdGhlaWdodCA6IChtYXgueSAtIG1pbi55KStCT1VORElOR19CT1hfUEFERElOR1xuXHRcdH07XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIHBvc2l0aW9uIG9mIGEgbm9kZSBhbmQgYWxsIGF0dGFjaGVkIGxpbmtzIGFuZCBsYWJlbHMgd2l0aG91dCBhbmltYXRpb25cblx0ICogQHBhcmFtIG5vZGUgLSB0aGUgbm9kZSBvYmplY3QgYmVpbmcgcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBmb3IgdGhlIG5vZGVcblx0ICogQHBhcmFtIHkgLSB0aGUgbmV3IHkgcG9zaXRpb24gZm9yIHRoZSBub2RlXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlIDogZnVuY3Rpb24obm9kZSx4LHksY2FsbGJhY2spIHtcblx0XHR0aGlzLl9zZXROb2RlUG9zaXRpb24obm9kZSx4LHksdHJ1ZSk7XG5cdFx0aWYgKGNhbGxiYWNrKSB7XG5cdFx0XHRjYWxsYmFjaygpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogU2V0cyB0aGUgcG9zaXRpb24gb2YgYSBub2RlIGJ5IGFuaW1hdGluZyBmcm9tIGl0J3Mgb2xkIHBvc2l0aW9uIHRvIGl0J3MgbmV3IG9uZVxuXHQgKiBAcGFyYW0gbm9kZSAtIHRoZSBub2RlIGJlaW5nIHJlcG9zaXRpb25lZFxuXHQgKiBAcGFyYW0geCAtIHRoZSBuZXcgeCBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0geSAtIHRoZSBuZXcgeSBwb3NpdGlvbiBvZiB0aGUgbm9kZVxuXHQgKiBAcGFyYW0gYkltbWVkaWF0ZSAtIGlmIHRydWUsIHNldHMgd2l0aG91dCBhbmltYXRpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfc2V0Tm9kZVBvc2l0aW9uIDogZnVuY3Rpb24obm9kZSx4LHksYkltbWVkaWF0ZSxjYWxsYmFjaykge1xuXHRcdC8vIFVwZGF0ZSB0aGUgbm9kZSByZW5kZXIgb2JqZWN0XG5cdFx0dmFyIGNpcmNsZSA9IHRoaXMuX25vZGVNYXBbbm9kZS5pbmRleF07XG5cdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRjaXJjbGUudHdlZW5BdHRyKHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fSwge1xuXHRcdFx0XHRkdXJhdGlvbjogdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdGVhc2luZzogdGhpcy5fZWFzaW5nLFxuXHRcdFx0XHRjYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxYO1xuXHRcdFx0XHRcdGRlbGV0ZSBjaXJjbGUuZmluYWxZO1xuXHRcdFx0XHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Y2lyY2xlLmZpbmFsWCA9IHg7XG5cdFx0XHRjaXJjbGUuZmluYWxZID0geTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2lyY2xlLnggPSB4O1xuXHRcdFx0Y2lyY2xlLnkgPSB5O1xuXHRcdH1cblx0XHRpZiAodGhpcy5fbGlua01hcFtub2RlLmluZGV4XS5sZW5ndGggPT09IDApIHtcblx0XHRcdG5vZGUueCA9IHg7XG5cdFx0XHRub2RlLnkgPSB5O1xuXHRcdH1cblxuXHRcdC8vIFVwZGF0ZSB0aGUgbGFiZWwgcmVuZGVyIG9iamVjdFxuXHRcdHZhciBsYWJlbCA9IHRoaXMuX2xhYmVsTWFwW25vZGUuaW5kZXhdO1xuXHRcdGlmIChsYWJlbCkge1xuXHRcdFx0dmFyIGxhYmVsUG9zID0gdGhpcy5sYXlvdXRMYWJlbCh4LHksbm9kZS5yYWRpdXMpO1xuXHRcdFx0aWYgKGJJbW1lZGlhdGUhPT10cnVlKSB7XG5cdFx0XHRcdGxhYmVsLnR3ZWVuQXR0cihsYWJlbFBvcywge1xuXHRcdFx0XHRcdGR1cmF0aW9uOiB0aGlzLl9kdXJhdGlvbixcblx0XHRcdFx0XHRlYXNpbmc6IHRoaXMuX2Vhc2luZ1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAodmFyIHByb3AgaW4gbGFiZWxQb3MpIHtcblx0XHRcdFx0XHRpZiAobGFiZWxQb3MuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcblx0XHRcdFx0XHRcdGxhYmVsW3Byb3BdID0gbGFiZWxQb3NbcHJvcF07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0XHQvLyBVcGRhdGUgdGhlIGxpbmsgcmVuZGVyIG9iamVjdFxuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR0aGlzLl9saW5rTWFwW25vZGUuaW5kZXhdLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXHRcdFx0dmFyIGxpbmtPYmpLZXkgPSBudWxsO1xuXHRcdFx0aWYgKGxpbmsuc291cmNlLmluZGV4ID09PSBub2RlLmluZGV4KSB7XG5cdFx0XHRcdGxpbmtPYmpLZXkgPSAnc291cmNlJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxpbmtPYmpLZXkgPSAndGFyZ2V0Jztcblx0XHRcdH1cblx0XHRcdGlmIChiSW1tZWRpYXRlIT09dHJ1ZSkge1xuXHRcdFx0XHRsaW5rLnR3ZWVuT2JqKGxpbmtPYmpLZXksIHtcblx0XHRcdFx0XHR4OiB4LFxuXHRcdFx0XHRcdHk6IHlcblx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdGR1cmF0aW9uOiB0aGF0Ll9kdXJhdGlvbixcblx0XHRcdFx0XHRlYXNpbmc6IHRoYXQuX2Vhc2luZ1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxpbmtbbGlua09iaktleV0ueCA9IHg7XG5cdFx0XHRcdGxpbmtbbGlua09iaktleV0ueSA9IHk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERlZmF1bHQgbGF5b3V0IHJvdXRpbmUuICAgU2hvdWxkIGJlIG92ZXJyaWRlbiBieSBzdWJjbGFzc2VzLlxuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzIGJlaW5nIHJlbmRlcmVkIHRvXG5cdCAqIEByZXR1cm5zIHtMYXlvdXR9XG5cdCAqL1xuXHRsYXlvdXQgOiBmdW5jdGlvbih3LGgpIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cdC8qKlxuXHQgKiBcdC8qKlxuXHQgKiBIb29rIGZvciBkb2luZyBhbnkgZHJhd2luZyBiZWZvcmUgcmVuZGVyaW5nIG9mIHRoZSBncmFwaCB0aGF0IGlzIGxheW91dCBzcGVjaWZpY1xuXHQgKiBpZS8gQmFja2dyb3VuZHMsIGV0Y1xuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gLSBhIGxpc3Qgb2YgcGF0aC5qcyByZW5kZXIgb2JqZWN0cyB0byBiZSBhZGRlZCB0byB0aGUgc2NlbmVcblx0ICovXG5cdHByZXJlbmRlciA6IGZ1bmN0aW9uKHcsaCkge1xuXHRcdHJldHVybiBbXTtcblx0fSxcblxuXHQvKipcblx0ICogSG9vayBmb3IgZG9pbmcgYW55IGRyYXdpbmcgYWZ0ZXIgcmVuZGVyaW5nIG9mIHRoZSBncmFwaCB0aGF0IGlzIGxheW91dCBzcGVjaWZpY1xuXHQgKiBpZS8gT3ZlcmxheXMsIGV0Y1xuXHQgKiBAcGFyYW0gdyAtIHRoZSB3aWR0aCBvZiB0aGUgY2FudmFzXG5cdCAqIEBwYXJhbSBoIC0gdGhlIGhlaWdodCBvZiB0aGUgY2FudmFzXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gLSBhIGxpc3Qgb2YgcGF0aC5qcyByZW5kZXIgb2JqZWN0cyB0byBiZSBhZGRlZCB0byB0aGUgc2NlbmVcblx0ICovXG5cdHBvc3RyZW5kZXIgOiBmdW5jdGlvbih3LGgpIHtcblx0XHRyZXR1cm4gW107XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxhYmVsIHBvc2l0aW9uIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVYIC0gdGhlIHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVZIC0gdGhlIHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHJhZGl1cyAtIHRoZSByYWRpdXMgb2YgdGhlIG5vZGVcblx0ICogQHJldHVybnMge3t4OiB4IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgeTogeSBwb3NpdGlvbiBvZiB0aGUgbGFiZWx9fVxuXHQgKi9cblx0bGF5b3V0TGFiZWwgOiBmdW5jdGlvbihub2RlWCxub2RlWSxyYWRpdXMpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0eDogbm9kZVggKyByYWRpdXMgKyA1LFxuXHRcdFx0eTogbm9kZVkgKyByYWRpdXMgKyA1XG5cdFx0fTtcblx0fVxufSk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IExheW91dDtcbiIsInZhciBMSU5LX1RZUEUgPSB7XG5cdERFRkFVTFQgOiAnbGluZScsXG5cdExJTkUgOiAnbGluZScsXG5cdEFSUk9XIDogJ2Fycm93Jyxcblx0QVJDIDogJ2FyYydcbn07XG5tb2R1bGUuZXhwb3J0cyA9IExJTktfVFlQRTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExJTktfVFlQRSA9IHJlcXVpcmUoJy4vbGlua1R5cGUnKTtcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL2xheW91dCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBHcmFwaCByZW5kZXIgb2JqZWN0XG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEdyYXBoID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuXHR0aGlzLl9ub2RlcyA9IFtdO1xuXHR0aGlzLl9saW5rcyA9IFtdO1xuXHR0aGlzLl9jYW52YXMgPSBudWxsO1xuXHR0aGlzLl9sYXlvdXRlciA9IG51bGw7XG5cdHRoaXMuX2dyb3VwaW5nTWFuYWdlciA9IG51bGw7XG5cdHRoaXMuX3dpZHRoID0gMDtcblx0dGhpcy5faGVpZ2h0ID0gMDtcblx0dGhpcy5fc2NlbmUgPSBudWxsO1xuXHR0aGlzLl9wcmVyZW5kZXJHcm91cCA9IG51bGw7XG5cdHRoaXMuX3Bvc3RyZW5kZXJHcm91cCA9IG51bGw7XG5cdHRoaXMuX3Bhbm5hYmxlID0gbnVsbDtcblx0dGhpcy5fem9vbWFibGUgPSBudWxsO1xuXHR0aGlzLl9kcmFnZ2FibGUgPSBudWxsO1xuXHR0aGlzLl9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHR0aGlzLl9jdXJyZW50TW92ZVN0YXRlID0gbnVsbDtcblx0dGhpcy5faW52ZXJ0ZWRQYW4gPSAxO1xuXG5cdHRoaXMuX2ZvbnRTaXplID0gbnVsbDtcblx0dGhpcy5fZm9udEZhbWlseSA9IG51bGw7XG5cdHRoaXMuX2ZvbnRDb2xvciA9IG51bGw7XG5cdHRoaXMuX2ZvbnRTdHJva2UgPSBudWxsO1xuXHR0aGlzLl9mb250U3Ryb2tlV2lkdGggPSBudWxsO1xuXG5cdC8vIERhdGEgdG8gcmVuZGVyIG9iamVjdCBtYXBzXG5cdHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUgPSB7fTtcblx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGUgPSB7fTtcblx0dGhpcy5fbm9kZUluZGV4VG9MYWJlbCA9IHt9O1xuXG5cdF8uZXh0ZW5kKHRoaXMsYXR0cmlidXRlcyk7XG59O1xuXG5HcmFwaC5wcm90b3R5cGUgPSBfLmV4dGVuZChHcmFwaC5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgbm9kZXMgZm9yIHRoZSBncmFwaFxuXHQgKiBAcGFyYW0gbm9kZXMgLSBhbiBhcnJheSBvZiBub2Rlc1xuXHQgKiB7XG5cdCAqIFx0XHR4IDogdGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZVx0KHJlcXVpcmVkKVxuXHQgKiBcdFx0eSA6IHRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGVcdChyZXF1aXJlZClcblx0ICpcdFx0aW5kZXggOiAgYSB1bmlxdWUgaW5kZXhcdFx0XHRcdChyZXF1aXJlZClcblx0ICpcdFx0bGFiZWwgOiBhIGxhYmVsIGZvciB0aGUgbm9kZVx0XHQob3B0aW9uYWwpXG5cdCAqXHRcdGZpbGxTdHlsZSA6IGEgY2FudmFzIGZpbGwgICBcdFx0KG9wdGlvbmFsLCBkZWZhdWx0ICMwMDAwMDApXG5cdCAqXHRcdHN0cm9rZVN0eWxlIDogYSBjYW52YXMgc3Ryb2tlXHRcdChvcHRpb25hbCwgZGVmYXVsdCB1bmRlZmluZWQpXG5cdCAqXHRcdGxpbmVXaWR0aCA6IHdpZHRoIG9mIHRoZSBzdHJva2VcdFx0KG9wdGlvbmFsLCBkZWZhdWx0IDEpXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgbm9kZXMgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHtHcmFwaC5fbm9kZXN9IG90aGVyd2lzZVxuXHQgKi9cblx0bm9kZXMgOiBmdW5jdGlvbihub2Rlcykge1xuXHRcdGlmIChub2Rlcykge1xuXHRcdFx0dGhpcy5fbm9kZXMgPSBub2RlcztcblxuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSA9IHt9O1xuXHRcdFx0dGhpcy5fbm9kZUluZGV4VG9DaXJjbGUgPSB7fTtcblx0XHRcdHRoaXMuX25vZGVJbmRleFRvTGFiZWwgPSB7fTtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdG5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0xpbmtMaW5lW25vZGUuaW5kZXhdID0gW107XG5cdFx0XHR9KTtcblx0XHRcdGlmICh0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0XHR0aGlzLl9sYXlvdXRlci5ub2Rlcyhub2Rlcyk7XG5cdFx0XHR9XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX25vZGVzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogR2V0cy9zZXRzIHRoZSBub2RlcyBmb3IgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBsaW5rcyAtIGFuIGFycmF5IG9mIGxpbmtzXG5cdCAqIHtcblx0ICogXHRcdHNvdXJjZSA6IGEgbm9kZSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGUgc291cmNlIFx0KHJlcXVpcmVkKVxuXHQgKiBcdFx0dGFyZ2V0IDogYSBub2RlIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoZSB0YXJnZXRcdChyZXF1aXJlZClcblx0ICpcdFx0c3Ryb2tlU3R5bGUgOiBhIGNhbnZhcyBzdHJva2VcdFx0XHRcdFx0XHQob3B0aW9uYWwsIGRlZmF1bHQgIzAwMDAwMClcblx0ICpcdFx0bGluZVdpZHRoIDogdGhlIHdpZHRoIG9mIHRoZSBzdHJva2VcdFx0XHRcdFx0KG9wdGluYWwsIGRlZmF1bHQgMSlcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBsaW5rcyBwYXJhbWV0ZXIgaXMgZGVmaW5lZCwge0dyYXBoLl9saW5rc30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRsaW5rcyA6IGZ1bmN0aW9uKGxpbmtzKSB7XG5cdFx0aWYgKGxpbmtzKSB7XG5cdFx0XHR0aGlzLl9saW5rcyA9IGxpbmtzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbGlua3M7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGNhbnZhcyBmb3IgdGhlIGdyYXBoXG5cdCAqIEBwYXJhbSBjYW52YXMgLSBhbiBIVE1MIGNhbnZhcyBvYmplY3Rcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBjYW52YXMgcGFyYW1ldGVyIGlzIGRlZmluZWQsIHRoZSBjYW52YXMgb3RoZXJ3aXNlXG5cdCAqL1xuXHRjYW52YXMgOiBmdW5jdGlvbihjYW52YXMpIHtcblx0XHRpZiAoY2FudmFzKSB7XG5cdFx0XHR0aGlzLl9jYW52YXMgPSBjYW52YXM7XG5cblx0XHRcdHZhciB4LHk7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNlZG93bicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR4ID0gZS5jbGllbnRYO1xuXHRcdFx0XHR5ID0gZS5jbGllbnRZO1xuXHRcdFx0XHQkKHRoYXQuX2NhbnZhcykub24oJ21vdXNlbW92ZScsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHZhciBkeCA9IHggLSBlLmNsaWVudFg7XG5cdFx0XHRcdFx0dmFyIGR5ID0geSAtIGUuY2xpZW50WTtcblx0XHRcdFx0XHRpZiAodGhhdC5fZHJhZ2dhYmxlICYmIHRoYXQuX2N1cnJlbnRPdmVyTm9kZSAmJiAodGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gbnVsbCB8fCB0aGF0Ll9jdXJyZW50TW92ZVN0YXRlID09PSAnZHJhZ2dpbmcnKSkgIHtcblx0XHRcdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSAnZHJhZ2dpbmcnO1xuXG5cdFx0XHRcdFx0XHQvLyBNb3ZlIHRoZSBub2RlXG5cdFx0XHRcdFx0XHR0aGF0Ll9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uSW1tZWRpYXRlKHRoYXQuX2N1cnJlbnRPdmVyTm9kZSwgdGhhdC5fY3VycmVudE92ZXJOb2RlLnggLSBkeCwgdGhhdC5fY3VycmVudE92ZXJOb2RlLnkgLSBkeSk7XG5cdFx0XHRcdFx0XHR0aGF0LnVwZGF0ZSgpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhhdC5fcGFubmFibGUgJiYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09IG51bGwgfHwgdGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9PT0gJ3Bhbm5pbmcnKSkge1xuXHRcdFx0XHRcdFx0dGhhdC5fcGFuKC1keCp0aGF0Ll9pbnZlcnRlZFBhbiwtZHkqdGhhdC5faW52ZXJ0ZWRQYW4pO1xuXHRcdFx0XHRcdFx0dGhhdC5fY3VycmVudE1vdmVTdGF0ZSA9ICdwYW5uaW5nJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0eCA9IGUuY2xpZW50WDtcblx0XHRcdFx0XHR5ID0gZS5jbGllbnRZO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNldXAnLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKHRoYXQuX2NhbnZhcykub2ZmKCdtb3VzZW1vdmUnKTtcblx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPT09ICdkcmFnZ2luZycpIHtcblx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUgPSBudWxsO1xuXHRcdFx0fSk7XG5cblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2FudmFzO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXG5cdC8qKlxuXHQgKiBBZGRzIGEgbGFiZWwgZm9yIGEgbm9kZVxuXHQgKiBAcGFyYW0gbm9kZVxuXHQgKiBAcGFyYW0gdGV4dFxuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRhZGRMYWJlbCA6IGZ1bmN0aW9uKG5vZGUsdGV4dCkge1xuXHRcdGlmICh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdKSB7XG5cdFx0XHR0aGlzLnJlbW92ZUxhYmVsKG5vZGUpO1xuXHRcdH1cblx0XHR2YXIgbGFiZWxBdHRycyA9IHRoaXMuX2xheW91dGVyLmxheW91dExhYmVsKG5vZGUueCxub2RlLnksbm9kZS5yYWRpdXMpO1xuXG5cdFx0dmFyIGZvbnRTaXplID0gdHlwZW9mKHRoaXMuX2ZvbnRTaXplKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTaXplKG5vZGUpIDogdGhpcy5fZm9udFNpemU7XG5cdFx0aWYgKCFmb250U2l6ZSkge1xuXHRcdFx0Zm9udFNpemUgPSAxMDtcblx0XHR9XG5cblx0XHR2YXIgZm9udEZhbWlseSA9IHR5cGVvZih0aGlzLl9mb250RmFtaWx5KSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRGYW1pbHkobm9kZSkgOiB0aGlzLl9mb250RmFtaWx5O1xuXHRcdGlmICghZm9udEZhbWlseSkge1xuXHRcdFx0Zm9udEZhbWlseSA9ICdzYW5zLXNlcmlmJztcblx0XHR9XG5cdFx0dmFyIGZvbnRTdHIgPSBmb250U2l6ZSArICdweCAnICsgZm9udEZhbWlseTtcblxuXHRcdHZhciBmb250RmlsbCA9IHR5cGVvZih0aGlzLl9mb250Q29sb3IpID09PSAnZnVuY3Rpb24nID8gdGhpcy5fZm9udENvbG9yKG5vZGUpIDogdGhpcy5fZm9udENvbG9yO1xuXHRcdGlmICghZm9udEZpbGwpIHtcblx0XHRcdGZvbnRGaWxsID0gJyMwMDAwMDAnO1xuXHRcdH1cblx0XHR2YXIgZm9udFN0cm9rZSA9IHR5cGVvZih0aGlzLl9mb250U3Ryb2tlKSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuX2ZvbnRTdHJva2Uobm9kZSkgOiB0aGlzLl9mb250U3Ryb2tlO1xuXHRcdHZhciBmb250U3Ryb2tlV2lkdGggPSB0eXBlb2YodGhpcy5fZm9udFN0cm9rZSkgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9mb250U3Ryb2tlV2lkdGggOiB0aGlzLl9mb250U3Ryb2tlV2lkdGg7XG5cblx0XHR2YXIgbGFiZWxTcGVjID0ge1xuXHRcdFx0Zm9udDogZm9udFN0cixcblx0XHRcdGZpbGxTdHlsZTogZm9udEZpbGwsXG5cdFx0XHRzdHJva2VTdHlsZTogZm9udFN0cm9rZSxcblx0XHRcdGxpbmVXaWR0aDogZm9udFN0cm9rZVdpZHRoLFxuXHRcdFx0dGV4dCA6IHRleHRcblx0XHR9O1xuXHRcdGZvciAodmFyIGtleSBpbiBsYWJlbEF0dHJzKSB7XG5cdFx0XHRpZiAobGFiZWxBdHRycy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdGxhYmVsU3BlY1trZXldID0gbGFiZWxBdHRyc1trZXldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgbGFiZWwgPSBwYXRoLnRleHQobGFiZWxTcGVjKTtcblx0XHR0aGlzLl9ub2RlSW5kZXhUb0xhYmVsW25vZGUuaW5kZXhdID0gbGFiZWw7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQobGFiZWwpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgYSBsYWJlbCBmb3IgYSBub2RlXG5cdCAqIEBwYXJhbSBub2RlXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHJlbW92ZUxhYmVsIDogZnVuY3Rpb24obm9kZSkge1xuXHRcdHZhciB0ZXh0T2JqZWN0ID0gdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHRpZiAodGV4dE9iamVjdCkge1xuXHRcdFx0dGhpcy5fc2NlbmUucmVtb3ZlQ2hpbGQodGV4dE9iamVjdCk7XG5cdFx0XHRkZWxldGUgdGhpcy5fbm9kZUluZGV4VG9MYWJlbFtub2RlLmluZGV4XTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIG1vdXNlb3ZlciBvZiBhIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrKG5vZGUpXG5cdCAqIEBwYXJhbSBzZWxmIC0gdGhlIG9iamVjdCB0byBiZSBib3VuZCBhcyAndGhpcycgaW4gdGhlIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVPdmVyIDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdmVyID0gY2FsbGJhY2suYmluZChzZWxmKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRXZlbnQgaGFuZGxlciBmb3IgbW91c2VvdXQgb2YgYSBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayhub2RlKVxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlT3V0IDogZnVuY3Rpb24oY2FsbGJhY2ssc2VsZikge1xuXHRcdGlmICghc2VsZikge1xuXHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0fVxuXHRcdHRoaXMuX25vZGVPdXQgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDb252ZW5pZW5jZSBmdW5jdGlvbiBmb3Igc2V0dGluZyBub2RlT3Zlci9ub2RlT3V0IGluIGEgc2luZ2xlIGNhbGxcblx0ICogQHBhcmFtIG92ZXIgLSB0aGUgbm9kZU92ZXIgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gb3V0IC0gdGhlIG5vZGVPdXQgZXZlbnQgaGFuZGxlclxuXHQgKiBAcGFyYW0gc2VsZiAtIHRoZSBvYmplY3QgdG8gYmUgYm91bmQgYXMgJ3RoaXMnIGluIHRoZSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9XG5cdCAqL1xuXHRub2RlSG92ZXIgOiBmdW5jdGlvbihvdmVyLG91dCxzZWxmKSB7XG5cdFx0dGhpcy5ub2RlT3ZlcihvdmVyLHNlbGYpO1xuXHRcdHRoaXMubm9kZU91dChvdXQsc2VsZik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEV2ZW50IGhhbmRsZXIgZm9yIGNsaWNrIG9mIGEgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sobm9kZSlcblx0ICogQHBhcmFtIHNlbGYgLSB0aGUgb2JqZWN0IHRvIGJlIGJvdW5kIGFzICd0aGlzJy4gICBEZWZhdWx0cyB0byB0aGUgZ3JhcGggb2JqZWN0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdG5vZGVDbGljayA6IGZ1bmN0aW9uKGNhbGxiYWNrLHNlbGYpIHtcblx0XHRpZiAoIXNlbGYpIHtcblx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdH1cblx0XHR0aGlzLl9ub2RlQ2xpY2sgPSBjYWxsYmFjay5iaW5kKHNlbGYpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBQYW4ge0dyYXBofSBieSAoZHgsZHkpLiAgIEF1dG9tYXRpY2FsbHkgcmVyZW5kZXIgdGhlIGdyYXBoLlxuXHQgKiBAcGFyYW0gZHggLSBBbW91bnQgb2YgcGFuIGluIHggZGlyZWN0aW9uXG5cdCAqIEBwYXJhbSBkeSAtIEFtb3VudCBvZiBwYW4gaW4geSBkaXJlY3Rpb25cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9wYW4gOiBmdW5jdGlvbihkeCxkeSkge1xuXHRcdHRoaXMuX3NjZW5lLnggKz0gZHg7XG5cdFx0dGhpcy5fc2NlbmUueSArPSBkeTtcblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlIHtHcmFwaH0gcGFubmFibGVcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0cGFubmFibGUgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9wYW5uYWJsZSA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2VzIHRoZSBncmFwaCBwYW4gaW4gdGhlIG9wcG9zaXRlIGRpcmVjdGlvbiBvZiB0aGUgbW91c2UgYXMgb3Bwb3NlZCB0byB3aXRoIGl0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGludmVydFBhbiA6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2ludmVydGVkUGFuID0gLTE7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2Ugbm9kZXMgaW4ge0dyYXBofSByZXBvaXNpdGlvbmFibGUgYnkgY2xpY2stZHJhZ2dpbmdcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0ZHJhZ2dhYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fZHJhZ2dhYmxlID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogTWFrZSB7R3JhcGh9IHpvb21hYmxlIGJ5IHVzaW5nIHRoZSBtb3VzZXdoZWVsXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdHpvb21hYmxlIDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHpvb21MZXZlbCA9IDEuMDtcblx0XHRpZiAoIXRoaXMuX3pvb21hYmxlKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHQkKHRoaXMuX2NhbnZhcykub24oJ21vdXNld2hlZWwnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR2YXIgYldoZWVsVXAgPSBlLm9yaWdpbmFsRXZlbnQuZGVsdGFZIDwgMDtcblx0XHRcdFx0aWYgKGJXaGVlbFVwKSB7XG5cdFx0XHRcdFx0em9vbUxldmVsKys7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0em9vbUxldmVsLS07XG5cdFx0XHRcdH1cblx0XHRcdFx0em9vbUxldmVsID0gTWF0aC5tYXgoem9vbUxldmVsLDEuMCk7XG5cdFx0XHRcdHRoYXQuX3NjZW5lLnpvb20oem9vbUxldmVsLCBlLmNsaWVudFgsIGUuY2xpZW50WSk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3pvb21hYmxlID0gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFNldHMgdGhlIGxheW91dCBmdW5jdGlvbiBmb3IgdGhlIG5vZGVzXG5cdCAqIEBwYXJhbSBsYXlvdXRlciAtIEFuIGluc3RhbmNlIChvciBzdWJjbGFzcykgb2YgTGF5b3V0XG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaXMgbGF5b3V0ZXIgcGFyYW0gaXMgZGVmaW5lZCwgdGhlIGxheW91dGVyIG90aGVyd2lzZVxuXHQgKi9cblx0bGF5b3V0ZXIgOiBmdW5jdGlvbihsYXlvdXRlcikge1xuXHRcdGlmIChsYXlvdXRlcikge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIgPSBsYXlvdXRlcjtcblx0XHRcdHRoaXMuX2xheW91dGVyXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtNYXAodGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSlcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2xheW91dGVyO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybXMgYSBsYXlvdXQgb2YgdGhlIGdyYXBoXG5cdCAqIEByZXR1cm5zIHtHcmFwaH1cblx0ICovXG5cdGxheW91dCA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzLl9sYXlvdXRlcikge1xuXHRcdFx0dGhpcy5fbGF5b3V0ZXIubGF5b3V0KHRoaXMuX2NhbnZhcy53aWR0aCx0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cblx0Z3JvdXBpbmdNYW5hZ2VyIDogZnVuY3Rpb24oZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0aWYgKGdyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyID0gZ3JvdXBpbmdNYW5hZ2VyO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9ncm91cGluZ01hbmFnZXI7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGluaXRpYWxpemVHcm91cGluZyA6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzLl9ncm91cGluZ01hbmFnZXIpIHtcblx0XHRcdHRoaXMuX2dyb3VwaW5nTWFuYWdlci5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0LmxpbmtzKHRoaXMuX2xpbmtzKVxuXHRcdFx0XHQuaW5pdGlhbGl6ZUhlaXJhcmNoeSgpO1xuXG5cdFx0XHR0aGlzLm5vZGVzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSk7XG5cdFx0XHR0aGlzLmxpbmtzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHVuZ3JvdXAgOiBmdW5jdGlvbihub2RlKSB7XG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLnVuZ3JvdXAobm9kZSk7XG5cdFx0XHR0aGlzLmNsZWFyKClcblx0XHRcdFx0Lm5vZGVzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTm9kZXMoKSlcblx0XHRcdFx0LmxpbmtzKHRoaXMuX2dyb3VwaW5nTWFuYWdlci5hZ2dyZWdhdGVkTGlua3MoKSk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlZ3JvdXAgOiBmdW5jdGlvbih1bmdyb3VwZWRBZ2dyZWdhdGVLZXkpIHtcblx0XHQvLyBBbmltYXRlIHRoZSByZWdyb3VwXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBwYXJlbnRBZ2dyZWdhdGUgPSB0aGlzLl9ncm91cGluZ01hbmFnZXIuZ2V0QWdncmVnYXRlKHVuZ3JvdXBlZEFnZ3JlZ2F0ZUtleSk7XG5cblx0XHR2YXIgYXZnUG9zID0geyB4OiAwLCB5IDogMH07XG5cdFx0cGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcblx0XHRcdGF2Z1Bvcy54ICs9IGNoaWxkLng7XG5cdFx0XHRhdmdQb3MueSArPSBjaGlsZC55O1xuXHRcdH0pO1xuXHRcdGF2Z1Bvcy54IC89IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGg7XG5cdFx0YXZnUG9zLnkgLz0gcGFyZW50QWdncmVnYXRlLmNoaWxkcmVuLmxlbmd0aDtcblxuXHRcdHZhciBjdXJyZW50RHVyYXRpb24gPSB0aGlzLl9sYXlvdXRlci5kdXJhdGlvbigpO1xuXHRcdHRoaXMuX2xheW91dGVyLmR1cmF0aW9uKDI1MCk7XG5cblx0XHR2YXIgYW5pbWF0ZWRSZWdyb3VwZWQgPSAwO1xuXHRcdHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHR0aGF0Ll9sYXlvdXRlci5fc2V0Tm9kZVBvc2l0aW9uKGNoaWxkLGF2Z1Bvcy54LGF2Z1Bvcy55LGZhbHNlLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhbmltYXRlZFJlZ3JvdXBlZCsrO1xuXHRcdFx0XHRpZiAoYW5pbWF0ZWRSZWdyb3VwZWQgPT09IHBhcmVudEFnZ3JlZ2F0ZS5jaGlsZHJlbi5sZW5ndGgpIHtcblx0XHRcdFx0XHRpZiAodGhhdC5fZ3JvdXBpbmdNYW5hZ2VyKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9ncm91cGluZ01hbmFnZXIucmVncm91cCh1bmdyb3VwZWRBZ2dyZWdhdGVLZXkpO1xuXHRcdFx0XHRcdFx0dGhhdC5jbGVhcigpXG5cdFx0XHRcdFx0XHRcdC5ub2Rlcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZE5vZGVzKCkpXG5cdFx0XHRcdFx0XHRcdC5saW5rcyh0aGF0Ll9ncm91cGluZ01hbmFnZXIuYWdncmVnYXRlZExpbmtzKCkpO1xuXHRcdFx0XHRcdFx0dGhhdC5kcmF3KCk7XG5cdFx0XHRcdFx0XHR0aGF0LmxheW91dCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0XHR0aGlzLl9sYXlvdXRlci5kdXJhdGlvbihjdXJyZW50RHVyYXRpb24pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgc2l6ZSBmb3IgbGFiZWxzXG5cdCAqIEBwYXJhbSBmb250U2l6ZSAtIHNpemUgb2YgdGhlIGZvbnQgaW4gcGl4ZWxzXG5cdCAqIEByZXR1cm5zIHtHcmFwaH0gaWYgZm9udFNpemUgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250U2l6ZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250U2l6ZSA6IGZ1bmN0aW9uKGZvbnRTaXplKSB7XG5cdFx0aWYgKGZvbnRTaXplKSB7XG5cdFx0XHR0aGlzLl9mb250U2l6ZSA9IGZvbnRTaXplO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9udFNpemU7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgY29sb3VyIGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRDb2xvdXIgLSBBIGhleCBzdHJpbmcgZm9yIHRoZSBjb2xvdXIgb2YgdGhlIGxhYmVsc1xuXHQgKiBAcmV0dXJucyB7R3JhcGh9IGlmIGZvbnRDb2xvdXIgcGFyYW0gaXMgZGVpZm5lZCwge0dyYXBoLl9mb250Q29sb3VyfSBvdGhlcndpc2Vcblx0ICovXG5cdGZvbnRDb2xvdXIgOiBmdW5jdGlvbihmb250Q29sb3VyKSB7XG5cdFx0aWYgKGZvbnRDb2xvdXIpIHtcblx0XHRcdHRoaXMuX2ZvbnRDb2xvciA9IGZvbnRDb2xvdXI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl9mb250Q29sb3I7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvbnQgZmFtaWx5IGZvciBsYWJlbHNcblx0ICogQHBhcmFtIGZvbnRGYW1pbHkgLSBBIHN0cmluZyBmb3IgdGhlIGZvbnQgZmFtaWx5IChhIGxhIEhUTUw1IENhbnZhcylcblx0ICogQHJldHVybnMge0dyYXBofSBpZiBmb250RmFtaWx5IHBhcmFtIGlzIGRlaWZuZWQsIHtHcmFwaC5fZm9udEZhbWlseX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb250RmFtaWx5IDogZnVuY3Rpb24oZm9udEZhbWlseSkge1xuXHRcdGlmIChmb250RmFtaWx5KSB7XG5cdFx0XHR0aGlzLl9mb250RmFtaWx5ID0gZm9udEZhbWlseTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2ZvbnRGYW1pbHk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXNpemUgdGhlIGdyYXBoLiAgQXV0b21hdGljYWxseSBwZXJmb3JtcyBsYXlvdXQgYW5kIHJlcmVuZGVycyB0aGUgZ3JhcGhcblx0ICogQHBhcmFtIHcgLSB0aGUgbmV3IHdpZHRoXG5cdCAqIEBwYXJhbSBoIC0gdGhlIG5ldyBoZWlnaHRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0cmVzaXplIDogZnVuY3Rpb24odyxoKSB7XG5cdFx0dGhpcy5fd2lkdGggPSB3O1xuXHRcdHRoaXMuX2hlaWdodCA9IGg7XG5cdFx0JCh0aGlzLl9jYW52YXMpLmF0dHIoe3dpZHRoOncsaGVpZ2h0Omh9KVxuXHRcdFx0LndpZHRoKHcpXG5cdFx0XHQuaGVpZ2h0KGgpO1xuXHRcdHRoaXMuX3NjZW5lLnJlc2l6ZSh3LGgpO1xuXHRcdHRoaXMubGF5b3V0KCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldHMgYSBsaXN0IG9mIHByZS9wb3N0IHJlbmRlciBvYmplY3RzIGZyb20gdGhlIGxheW91dGVyIChpZiBhbnkpXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfYWRkUHJlQW5kUG9zdFJlbmRlck9iamVjdHMgOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLl9wcmVyZW5kZXJHcm91cC5yZW1vdmVBbGwoKTtcblxuXHRcdC8vIEdldCB0aGUgYmFja2dyb3VuZCBvYmplY3RzIGZyb20gdGhlIGxheW91dGVyXG5cdFx0dmFyIG9ianMgPSB0aGlzLl9sYXlvdXRlci5wcmVyZW5kZXIodGhpcy5fd2lkdGgsdGhpcy5faGVpZ2h0KTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0aWYgKG9ianMpIHtcblx0XHRcdG9ianMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJPYmplY3QpIHtcblx0XHRcdFx0dGhhdC5fcHJlcmVuZGVyR3JvdXAuYWRkQ2hpbGQocmVuZGVyT2JqZWN0KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdC8vIERyYXcgYW55IHVuZ3JvdXBlZCBub2RlIGJvdW5kaW5nIGJveGVzXG5cdFx0aWYgKHRoaXMuX2dyb3VwaW5nTWFuYWdlcikge1xuXHRcdFx0dmFyIHVuZ3JvdXBlZE5vZGVJbmZvID0gdGhpcy5fZ3JvdXBpbmdNYW5hZ2VyLmdldFVuZ3JvdXBlZE5vZGVzKCk7XG5cdFx0XHR1bmdyb3VwZWROb2RlSW5mby5mb3JFYWNoKGZ1bmN0aW9uKHVuZ3JvdXBlZE5vZGUpIHtcblx0XHRcdFx0dmFyIGluZGljZXMgPSB1bmdyb3VwZWROb2RlLmluZGljZXM7XG5cdFx0XHRcdHZhciBrZXkgPSB1bmdyb3VwZWROb2RlLmtleTtcblx0XHRcdFx0dmFyIGJib3ggPSB0aGF0Ll9sYXlvdXRlci5nZXRCb3VuZGluZ0JveChpbmRpY2VzKTtcblx0XHRcdFx0dmFyIGJvdW5kaW5nQm94UmVuZGVyT2JqZWN0ID0gcGF0aC5yZWN0KHtcblx0XHRcdFx0XHR4IDogYmJveC54LFxuXHRcdFx0XHRcdHkgOiBiYm94LnksXG5cdFx0XHRcdFx0d2lkdGggOiBiYm94LndpZHRoLFxuXHRcdFx0XHRcdGhlaWdodCA6IGJib3guaGVpZ2h0LFxuXHRcdFx0XHRcdHN0cm9rZVN0eWxlIDogJyMyMzIzMjMnLFxuXHRcdFx0XHRcdGZpbGxTdHlsZSA6ICcjMDAwMDAwJyxcblx0XHRcdFx0XHRvcGFjaXR5IDogMC4xXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRib3VuZGluZ0JveFJlbmRlck9iamVjdC5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdSZWdyb3VwIG5vZGVzICcgKyBrZXkpO1xuXHRcdFx0XHRcdHRoYXQucmVncm91cChrZXkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0dGhhdC5fcHJlcmVuZGVyR3JvdXAuYWRkQ2hpbGQoYm91bmRpbmdCb3hSZW5kZXJPYmplY3QpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fcG9zdHJlbmRlckdyb3VwLnJlbW92ZUFsbCgpO1xuXHRcdG9ianMgPSB0aGlzLl9sYXlvdXRlci5wb3N0cmVuZGVyKHRoaXMuX3dpZHRoLHRoaXMuX2hlaWdodCk7XG5cdFx0aWYgKG9ianMpIHtcblx0XHRcdG9ianMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJPYmplY3QpIHtcblx0XHRcdFx0dGhhdC5fcG9zdHJlbmRlckdyb3VwLmFkZENoaWxkKHJlbmRlck9iamVjdCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlZHJhdyB0aGUgZ3JhcGhcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0dXBkYXRlIDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fYWRkUHJlQW5kUG9zdFJlbmRlck9iamVjdHMoKTtcblx0XHR0aGlzLl9zY2VuZS51cGRhdGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogRHJhdyB0aGUgZ3JhcGguICAgT25seSBuZWVkcyB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIG5vZGVzL2xpbmtzIGhhdmUgYmVlbiBzZXRcblx0ICogQHJldHVybnMge0dyYXBofVxuXHQgKi9cblx0ZHJhdyA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblxuXHRcdGlmICghdGhpcy5fc2NlbmUpIHtcblx0XHRcdHRoaXMuX3NjZW5lID0gcGF0aCh0aGlzLl9jYW52YXMpO1xuXHRcdH1cblx0XHRpZiAoIXRoaXMuX2xheW91dGVyKSB7XG5cdFx0XHR2YXIgZGVmYXVsTGF5b3V0ID0gbmV3IExheW91dCgpXG5cdFx0XHRcdC5ub2Rlcyh0aGlzLl9ub2Rlcylcblx0XHRcdFx0Lm5vZGVNYXAodGhpcy5fbm9kZUluZGV4VG9DaXJjbGUpXG5cdFx0XHRcdC5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblx0XHRcdHRoaXMubGF5b3V0ZXIoZGVmYXVsTGF5b3V0KTtcblx0XHR9XG5cdFx0dGhpcy5fcHJlcmVuZGVyR3JvdXAgPSBwYXRoLmdyb3VwKCk7XG5cdFx0dGhpcy5fc2NlbmUuYWRkQ2hpbGQodGhpcy5fcHJlcmVuZGVyR3JvdXApO1xuXHRcdHRoaXMuX2xpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaykge1xuXG5cdFx0XHR2YXIgbGlua09iamVjdDtcblx0XHRcdGlmICghbGluay50eXBlKSB7XG5cdFx0XHRcdGxpbmsudHlwZSA9IExJTktfVFlQRS5ERUZBVUxUO1xuXHRcdFx0fVxuXHRcdFx0c3dpdGNoKGxpbmsudHlwZSkge1xuXHRcdFx0XHRjYXNlIExJTktfVFlQRS5BUlJPVzpcblx0XHRcdFx0XHRsaW5rLmhlYWRPZmZzZXQgPSBsaW5rLnRhcmdldC5yYWRpdXM7XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGguYXJyb3cobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkFSQzpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5hcmMobGluayk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkxJTkU6XG5cdFx0XHRcdGNhc2UgTElOS19UWVBFLkRFRkFVTFQ6XG5cdFx0XHRcdFx0bGlua09iamVjdCA9IHBhdGgubGluZShsaW5rKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRsaW5rT2JqZWN0ID0gcGF0aC5saW5lKGxpbmspO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0dGhhdC5fbm9kZUluZGV4VG9MaW5rTGluZVtsaW5rLnNvdXJjZS5pbmRleF0ucHVzaChsaW5rT2JqZWN0KTtcblx0XHRcdHRoYXQuX25vZGVJbmRleFRvTGlua0xpbmVbbGluay50YXJnZXQuaW5kZXhdLnB1c2gobGlua09iamVjdCk7XG5cblx0XHRcdHRoYXQuX3NjZW5lLmFkZENoaWxkKGxpbmtPYmplY3QpO1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5fbm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgY2lyY2xlID0gcGF0aC5jaXJjbGUobm9kZSk7XG5cdFx0XHR0aGF0Ll9ub2RlSW5kZXhUb0NpcmNsZVtub2RlLmluZGV4XSA9IGNpcmNsZTtcblx0XHRcdGlmICh0aGF0Ll9ub2RlT3Zlcikge1xuXHRcdFx0XHRjaXJjbGUub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR0aGF0Ll9ub2RlT3ZlcihjaXJjbGUsZSk7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBjaXJjbGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoYXQuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGF0Ll9ub2RlT3V0KSB7XG5cdFx0XHRcdGNpcmNsZS5vbignbW91c2VvdXQnLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKHRoYXQuX2N1cnJlbnRNb3ZlU3RhdGUhPT0nZHJhZ2dpbmcnKSB7XG5cdFx0XHRcdFx0XHR0aGF0Ll9jdXJyZW50T3Zlck5vZGUgPSBudWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGF0Ll9ub2RlT3V0KGNpcmNsZSxlKTtcblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhhdC5fbm9kZUNsaWNrKSB7XG5cdFx0XHRcdGNpcmNsZS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0dGhhdC5fbm9kZUNsaWNrKGNpcmNsZSxlKTtcblx0XHRcdFx0XHR0aGF0Ll9zY2VuZS51cGRhdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGF0Ll9zY2VuZS5hZGRDaGlsZChjaXJjbGUpO1xuXG5cdFx0XHRpZiAobm9kZS5sYWJlbCkge1xuXHRcdFx0XHR0aGF0LmFkZExhYmVsKG5vZGUsbm9kZS5sYWJlbCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLl9sYXlvdXRlci5saW5rTWFwKHRoaXMuX25vZGVJbmRleFRvTGlua0xpbmUpXG5cdFx0XHQubm9kZU1hcCh0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSlcblx0XHRcdC5sYWJlbE1hcCh0aGlzLl9ub2RlSW5kZXhUb0xhYmVsKTtcblxuXHRcdHRoaXMuX3Bvc3RyZW5kZXJHcm91cCA9IHBhdGguZ3JvdXAoe25vSGl0OnRydWV9KTtcblx0XHR0aGlzLl9zY2VuZS5hZGRDaGlsZCh0aGlzLl9wb3N0cmVuZGVyR3JvdXApO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHQvKipcblx0ICogUmVtb3ZlcyBhbGwgcmVuZGVyIG9iamVjdHMgYXNzb2NpYXRlZCB3aXRoIGEgZ3JhcGguXG5cdCAqL1xuXHRjbGVhciA6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciByZW1vdmVSZW5kZXJPYmplY3RzID0gZnVuY3Rpb24oaW5kZXhUb09iamVjdCkge1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIGluZGV4VG9PYmplY3QpIHtcblx0XHRcdFx0aWYgKGluZGV4VG9PYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdHZhciBvYmogPSBpbmRleFRvT2JqZWN0W2tleV07XG5cdFx0XHRcdFx0aWYgKCQuaXNBcnJheShvYmopKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmpbaV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZChvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkZWxldGUgaW5kZXhUb09iamVjdFtrZXldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRyZW1vdmVSZW5kZXJPYmplY3RzLmNhbGwodGhpcyx0aGlzLl9ub2RlSW5kZXhUb0NpcmNsZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MaW5rTGluZSk7XG5cdFx0cmVtb3ZlUmVuZGVyT2JqZWN0cy5jYWxsKHRoaXMsdGhpcy5fbm9kZUluZGV4VG9MYWJlbCk7XG5cdFx0aWYgKHRoaXMuX3ByZXJlbmRlckdyb3VwKSB7XG5cdFx0XHR0aGlzLl9zY2VuZS5yZW1vdmVDaGlsZCh0aGlzLl9wcmVyZW5kZXJHcm91cCk7XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9wb3N0cmVuZGVyR3JvdXApIHtcblx0XHRcdHRoaXMuX3NjZW5lLnJlbW92ZUNoaWxkKHRoaXMuX3Bvc3RyZW5kZXJHcm91cCk7XG5cdFx0fVxuXHRcdHRoaXMuX3NjZW5lLnVwZGF0ZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59KTtcblxuXG5leHBvcnRzLkxJTktfVFlQRSA9IHJlcXVpcmUoJy4vbGlua1R5cGUnKTtcbmV4cG9ydHMuR3JvdXBpbmdNYW5hZ2VyID0gcmVxdWlyZSgnLi9ncm91cGluZ01hbmFnZXInKTtcbmV4cG9ydHMuTGF5b3V0ID0gcmVxdWlyZSgnLi9sYXlvdXQnKTtcbmV4cG9ydHMuQ29sdW1uTGF5b3V0ID0gcmVxdWlyZSgnLi9jb2x1bW5MYXlvdXQnKTtcbmV4cG9ydHMuUmFkaWFsTGF5b3V0ID0gcmVxdWlyZSgnLi9yYWRpYWxMYXlvdXQnKTtcbmV4cG9ydHMuR3JhcGggPSBHcmFwaDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIExheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0Jyk7XG4vKipcbiAqXG4gKiBAcGFyYW0gZm9jdXMgLSB0aGUgbm9kZSBhdCB0aGUgY2VudGVyIG9mIHRoZSByYWRpYWwgbGF5b3V0XG4gKiBAcGFyYW0gZGlzdGFuY2UgLSB0aGUgZGlzdGFuY2Ugb2Ygb3RoZXIgbm9kZXMgZnJvbSB0aGUgZm9jdXNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSYWRpYWxMYXlvdXQoZm9jdXMsZGlzdGFuY2UpIHtcblx0dGhpcy5fZm9jdXMgPSBmb2N1cztcblx0dGhpcy5fZGlzdGFuY2UgPSBkaXN0YW5jZTtcblxuXHRMYXlvdXQuYXBwbHkodGhpcyk7XG59XG5cblxuUmFkaWFsTGF5b3V0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKFJhZGlhbExheW91dC5wcm90b3R5cGUsIExheW91dC5wcm90b3R5cGUsIHtcblx0LyoqXG5cdCAqIEdldHMvc2V0cyB0aGUgZGlzdGFuY2UgcGFyYW1ldGVyXG5cdCAqIEBwYXJhbSBkaXN0YW5jZSAtIHRoZSBkaXN0YW5jZSBvZiBsaW5rcyBmcm9tIHRoZSBmb2N1cyBub2RlIHRvIG90aGVyIG5vZGVzIGluIHBpeGVsc1xuXHQgKiBAcmV0dXJucyB7UmFkaWFsTGF5b3V0fSBpZiBkaXN0YW5jZSBwYXJhbSBpcyBkZWZpbmVkLCB7UmFkaWFsTGF5b3V0Ll9kaXN0YW5jZX0gb3RoZXJ3aXNlXG5cdCAqL1xuXHRkaXN0YW5jZTogZnVuY3Rpb24gKGRpc3RhbmNlKSB7XG5cdFx0aWYgKGRpc3RhbmNlKSB7XG5cdFx0XHR0aGlzLl9kaXN0YW5jZSA9IGRpc3RhbmNlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZGlzdGFuY2U7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzL3NldHMgdGhlIGZvY3VzIG5vZGUgdGhhdCBpcyBhdCB0aGUgY2VudGVyIG9mIHRoZSBsYXlvdXRcblx0ICogQHBhcmFtIGZvY3VzIC0gdGhlIG5vZGUgdGhhdCBpcyBhdCB0aGUgY2VudGVyIG9mIHRoZSBsYXlvdXQuICAgT3RoZXIgbm9kZXMgYXJlIGNlbnRlcmVkIGFyb3VuZCB0aGlzLlxuXHQgKiBAcmV0dXJucyB7UmFkaWFsTGF5b3V0fSBpZiBmb2N1cyBwYXJhbSBpcyBkZWZpbmVkLCB7UmFkaWFsTGF5b3V0Ll9mb2N1c30gb3RoZXJ3aXNlXG5cdCAqL1xuXHRmb2N1czogZnVuY3Rpb24gKGZvY3VzKSB7XG5cdFx0aWYgKGZvY3VzKSB7XG5cdFx0XHR0aGlzLl9mb2N1cyA9IGZvY3VzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fZm9jdXM7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgdGhlIGxhYmVsIHBvc2l0aW9uIGZvciBhIG5vZGVcblx0ICogQHBhcmFtIG5vZGVYIC0gdGhlIHggcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIG5vZGVZIC0gdGhlIHkgcG9zaXRpb24gb2YgdGhlIG5vZGVcblx0ICogQHBhcmFtIHJhZGl1cyAtIHRoZSByYWRpdXMgb2YgdGhlIG5vZGVcblx0ICogQHJldHVybnMge3t4OiB4IHBvc2l0aW9uIG9mIHRoZSBsYWJlbCwgeTogeSBwb3NpdGlvbiBvZiB0aGUgbGFiZWwsIGFsaWduOiBIVE1MIGNhbnZhcyB0ZXh0IGFsaWdubWVudCBwcm9wZXJ0eSBmb3IgbGFiZWx9fVxuXHQgKi9cblx0bGF5b3V0TGFiZWw6IGZ1bmN0aW9uIChub2RlWCwgbm9kZVksIHJhZGl1cykge1xuXHRcdHZhciB4LCB5LCBhbGlnbjtcblxuXHRcdC8vIFJpZ2h0IG9mIGNlbnRlclxuXHRcdGlmIChub2RlWCA+IHRoaXMuX2ZvY3VzKSB7XG5cdFx0XHR4ID0gbm9kZVggKyAocmFkaXVzICsgMTApO1xuXHRcdFx0YWxpZ24gPSAnc3RhcnQnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR4ID0gbm9kZVggLSAocmFkaXVzICsgMTApO1xuXHRcdFx0YWxpZ24gPSAnZW5kJztcblx0XHR9XG5cblx0XHRpZiAobm9kZVkgPiB0aGlzLl9mb2N1cykge1xuXHRcdFx0eSA9IG5vZGVZICsgKHJhZGl1cyArIDEwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0eSA9IG5vZGVZIC0gKHJhZGl1cyArIDEwKTtcblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdHg6IHgsXG5cdFx0XHR5OiB5LFxuXHRcdFx0YWxpZ246IGFsaWduXG5cdFx0fTtcblx0fSxcblxuXHQvKipcblx0ICogUGVyZm9ybSBhIHJhZGlhbCBsYXlvdXRcblx0ICogQHBhcmFtIHcgLSB0aGUgd2lkdGggb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKiBAcGFyYW0gaCAtIHRoZSBoZWlnaHQgb2YgdGhlIGNhbnZhcyBiZWluZyByZW5kZXJlZCB0b1xuXHQgKi9cblx0bGF5b3V0OiBmdW5jdGlvbiAodywgaCkge1xuXHRcdHZhciBub2RlcyA9IHRoaXMubm9kZXMoKTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dmFyIGFuZ2xlRGVsdGEgPSBNYXRoLlBJICogMiAvIChub2Rlcy5sZW5ndGggLSAxKTtcblx0XHR2YXIgYW5nbGUgPSAwLjA7XG5cdFx0bm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xuXHRcdFx0aWYgKG5vZGUuaW5kZXggPT09IHRoYXQuX2ZvY3VzLmluZGV4KSB7XG5cdFx0XHRcdHRoYXQuX3NldE5vZGVQb3NpdGlvbihub2RlLCBub2RlLngsIG5vZGUueSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBuZXdYID0gdGhhdC5fZm9jdXMueCArIChNYXRoLmNvcyhhbmdsZSkgKiB0aGF0Ll9kaXN0YW5jZSk7XG5cdFx0XHR2YXIgbmV3WSA9IHRoYXQuX2ZvY3VzLnkgKyAoTWF0aC5zaW4oYW5nbGUpICogdGhhdC5fZGlzdGFuY2UpO1xuXHRcdFx0dGhhdC5fc2V0Tm9kZVBvc2l0aW9uKG5vZGUsIG5ld1gsIG5ld1kpO1xuXHRcdFx0YW5nbGUgKz0gYW5nbGVEZWx0YTtcblx0XHR9KTtcblx0fVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUmFkaWFsTGF5b3V0O1xuIiwiXG52YXIgVXRpbCA9IHtcblxuICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcbiAgICB2YXIga2V5LCBpLCBzb3VyY2U7XG4gICAgZm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlc3Q7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(5)
});
