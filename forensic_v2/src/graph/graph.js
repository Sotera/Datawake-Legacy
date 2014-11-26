/**
 * Created by chrisdickson on 14-11-06.
 */
define(['../layout/layout','../graph/linkType'],function(Layout,LINK_TYPE) {

	/**
	 * Creates a Graph render object
	 * @constructor
	 */
	function Graph() {
		this._nodes = [];
		this._links = [];
		this._canvas = null;
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
	}

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
	Graph.prototype.nodes = function(nodes) {
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
	};

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
	Graph.prototype.links = function(links) {
		if (links) {
			this._links = links;
		} else {
			return this._links;
		}
		return this;
	};

	/**
	 * Gets/sets the canvas for the graph
	 * @param canvas - an HTML canvas object
	 * @returns {Graph} if canvas parameter is defined, the canvas otherwise
	 */
	Graph.prototype.canvas = function(canvas) {
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
	};


	/**
	 * Adds a label for a node
	 * @param node
	 * @param text
	 * @returns {Graph}
	 */
	Graph.prototype.addLabel = function(node,text) {
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
	};

	/**
	 * Removes a label for a node
	 * @param node
	 * @returns {Graph}
	 */
	Graph.prototype.removeLabel = function(node) {
		var textObject = this._nodeIndexToLabel[node.index];
		if (textObject) {
			this._scene.removeChild(textObject);
			delete this._nodeIndexToLabel[node.index];
		}
		return this;
	};

	/**
	 * Event handler for mouseover of a node
	 * @param callback(node)
	 * @returns {Graph}
	 */
	Graph.prototype.nodeOver = function(callback) {
		this._nodeOver = callback;
		return this;
	};

	/**
	 * Event handler for mouseout of a node
	 * @param callback(node)
	 * @returns {Graph}
	 */
	Graph.prototype.nodeOut = function(callback) {
		this._nodeOut = callback;
		return this;
	};

	/**
	 * Convenience function for setting nodeOver/nodeOut in a single call
	 * @param over - the nodeOver event handler
	 * @param out - the nodeOut event handler
	 * @returns {Graph}
	 */
	Graph.prototype.nodeHover = function(over,out) {
		this.nodeOver(over);
		this.nodeOut(out);
		return this;
	};

	/**
	 * Event handler for click of a node
	 * @param callback(node)
	 * @returns {Graph}
	 */
	Graph.prototype.nodeClick = function(callback) {
		this._nodeClick = callback;
		return this;
	};

	/**
	 * Pan {Graph} by (dx,dy).   Automatically rerender the graph.
	 * @param dx - Amount of pan in x direction
	 * @param dy - Amount of pan in y direction
	 * @private
	 */
	Graph.prototype._pan = function(dx,dy) {
		this._scene.x += dx;
		this._scene.y += dy;
		this.update();
	};

	/**
	 * Make {Graph} pannable
	 * @returns {Graph}
	 */
	Graph.prototype.pannable = function() {
		this._pannable = true;
		return this;
	};

	/**
	 * Makes the graph pan in the opposite direction of the mouse as opposed to with it
	 * @returns {Graph}
	 */
	Graph.prototype.invertPan = function() {
		this._invertedPan = -1;
		return this;
	};

	/**
	 * Make nodes in {Graph} repoisitionable by click-dragging
	 * @returns {Graph}
	 */
	Graph.prototype.draggable = function() {
		this._draggable = true;
		return this;
	};

	/**
	 * Make {Graph} zoomable by using the mousewheel
	 * @returns {Graph}
	 */
	Graph.prototype.zoomable = function() {
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
	};

	/**
	 * Sets the layout function for the nodes
	 * @param layouter - An instance (or subclass) of Layout
	 * @returns {Graph} is layouter param is defined, the layouter otherwise
	 */
	Graph.prototype.layouter = function(layouter) {
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
	};

	/**
	 * Performs a layout of the graph
	 * @returns {Graph}
	 */
	Graph.prototype.layout = function() {
		if (this._layouter) {
			this._layouter.layout(this._canvas.width,this._canvas.height);
			this.update();
		}
		return this;
	};

	/**
	 * Gets/sets the font size for labels
	 * @param fontSize - size of the font in pixels
	 * @returns {Graph} if fontSize param is deifned, {Graph._fontSize} otherwise
	 */
	Graph.prototype.fontSize = function(fontSize) {
		if (fontSize) {
			this._fontSize = fontSize;
		} else {
			return this._fontSize;
		}
		return this;
	};

	/**
	 * Gets/sets the font colour for labels
	 * @param fontColour - A hex string for the colour of the labels
	 * @returns {Graph} if fontColour param is deifned, {Graph._fontColour} otherwise
	 */
	Graph.prototype.fontColour = function(fontColour) {
		if (fontColour) {
			this._fontColor = fontColour;
		} else {
			return this._fontColor;
		}
		return this;
	};

	/**
	 * Gets/sets the font family for labels
	 * @param fontFamily - A string for the font family (a la HTML5 Canvas)
	 * @returns {Graph} if fontFamily param is deifned, {Graph._fontFamily} otherwise
	 */
	Graph.prototype.fontFamily = function(fontFamily) {
		if (fontFamily) {
			this._fontFamily = fontFamily;
		} else {
			return this._fontFamily;
		}
		return this;
	};

	/**
	 * Resize the graph.  Automatically performs layout and rerenders the graph
	 * @param w - the new width
	 * @param h - the new height
	 * @returns {Graph}
	 */
	Graph.prototype.resize = function(w,h) {
		this._width = w;
		this._height = h;
		$(this._canvas).attr({width:w,height:h})
			.width(w)
			.height(h);
		this._scene.resize(w,h);
		this.layout();
		return this;
	};

	/**
	 * Gets a list of pre/post render objects from the layouter (if any)
	 * @private
	 */
	Graph.prototype._addPreAndPostRenderObjects = function() {
		this._prerenderGroup.removeAll();
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
	};

	/**
	 * Redraw the graph
	 * @returns {Graph}
	 */
	Graph.prototype.update = function() {
		this._addPreAndPostRenderObjects();
		this._scene.update();
		return this;
	};

	/**
	 * Draw the graph.   Only needs to be called after the nodes/links have been set
	 * @returns {Graph}
	 */
	Graph.prototype.draw = function() {
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
		this._prerenderGroup = path.group({noHit:true});
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
	};

	/**
	 * Removes all render objects associated with a graph.
	 */
	Graph.prototype.clear = function() {
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
		return this;
	};

	return Graph;
});