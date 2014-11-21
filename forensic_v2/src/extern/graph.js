/**
 * Created by chrisdickson on 14-11-06.
 */
function Graph() {
	this._nodes = null;
	this._links = null;
	this._canvas = null;
	this._scene = null;
	this._pannable = null;
	this._zoomable = null;
	this._draggable = null;
	this._currentOverNode = null;
	this._currentMoveState = null;

	this._fontSize = null;
	this._fontFamily = null;
	this._fontColor = null;
	this._fontStroke = null;
	this._fontStrokeWidth = null;

	// Data to render object maps
	this._nodeIndexToLinkLine = null;
	this._nodeIndexToCircle = null;
	this._nodeIndexToLabel = null;
}


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

	} else {
		return this._nodes;
	}
	return this;
};

Graph.prototype.links = function(links) {
	if (links) {
		this._links = links;
	} else {
		return this._links;
	}
	return this;
};

Graph.prototype.canvas = function(canvas) {
	if (canvas) {
		this._canvas = canvas;
	} else {
		return this._canvas;
	}
	return this;
};

Graph.prototype.nodeOver = function(callback) {
	this._nodeOver = callback;
	return this;
};

Graph.prototype.nodeOut = function(callback) {
	this._nodeOut = callback;
	return this;
};

Graph.prototype.nodeHover = function(over,out) {
	this.nodeOver(over);
	this.nodeOut(out);
	return this;
};

Graph.prototype.nodeClick = function(callback) {
	this._nodeClick = callback;
	return this;
};

Graph.prototype._pan = function(dx,dy) {
	this._scene.x += dx;
	this._scene.y += dy;
	this.update();
};

Graph.prototype.pannable = function() {
	this._pannable = true;
	return this;
};

Graph.prototype.draggable = function() {
	this._draggable = true;
	return this;
};

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

Graph.prototype.layout = function(layouter) {
	if (layouter) {
		this._layouter = layouter;
		this._layouter
			.nodes(this._nodes)
			.linkMap(this._nodeIndexToLinkLine)
			.nodeMap(this._nodeIndexToCircle)
			.labelMap(this._nodeIndexToLabel)
			.layout();
	} else {
		this._layouter.layout();
		this._scene.update();
	}
	return this;
};

Graph.prototype.fontSize = function(fontSize) {
	if (fontSize) {
		this._fontSize = fontSize;
	} else {
		return this._fontSize;
	}
	return this;
};

Graph.prototype.fontColour = function(fontColour) {
	if (fontColour) {
		this._fontColor = fontColour;
	} else {
		return this._fontColor;
	}
	return this;
};

Graph.prototype.fontFamily = function(fontFamily) {
	if (fontFamily) {
		this._fontFamily = fontFamily;
	} else {
		return this._fontFamily;
	}
	return this;
};

Graph.prototype.resize = function(w,h) {
	$(this._canvas).attr({width:w,height:h})
		.width(w)
		.height(h);
	this._scene.resize(w,h);
	return this;
};

Graph.prototype.update = function() {
	this._scene.update();
	return this;
};

Graph.prototype.draw = function() {
	var that = this;
	if (!this._scene) {
		this._scene = path(this._canvas);
	}
	if (!this._layouter) {
		var defaulLayout = new Layout()
			.nodeMap(this._nodeIndexToCircle)
			.linkMap(this._nodeIndexToLinkLine)
			.labelMap(this._nodeIndexToLabel);
		this.layout(defaulLayout);
	}
	this._links.forEach(function(link) {
		var line = path.line(link);

		that._nodeIndexToLinkLine[link.source.index].push(line);
		that._nodeIndexToLinkLine[link.target.index].push(line);

		that._scene.addChild(line);
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
			var labelAttrs = that._layouter.layoutLabel(node.x,node.y,node.radius);

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
				text : node.label
			};
			for (var key in labelAttrs) {
				if (labelAttrs.hasOwnProperty(key)) {
					labelSpec[key] = labelAttrs[key];
				}
			}
			var label = path.text(labelSpec);
			that._nodeIndexToLabel[node.index] = label;
			that._scene.addChild(label);
		}
	});

	var x,y;
	$(this._canvas).on('mousedown',function(e) {
		console.log('mousedown');
		x = e.clientX;
		y = e.clientY;
		$(that._canvas).on('mousemove',function(e) {
			var dx = x - e.clientX;
			var dy = y - e.clientY;
			if (that._draggable && that._currentOverNode && (that._currentMoveState === null || that._currentMoveState === 'dragging'))  {
				that._currentMoveState = 'dragging';

				// Move the node
				that._layouter._setNodePositionImmediate(that._currentOverNode, that._currentOverNode.x - dx, that._currentOverNode.y - dy);
//				that._currentOverNode.x -= dx;
//				that._currentOverNode.y -= dy;
//
//				// Move any links that contain that node
//				that._nodeIndexToLinkLine[that._currentOverNode.index].forEach(function(line) {
//					if (line.source.index === that._currentOverNode.index) {
//						line.source.x = that._currentOverNode.x;
//						line.source.y = that._currentOverNode.y;
//					} else {
//						line.target.x = that._currentOverNode.x;
//						line.target.y = that._currentOverNode.y;
//					}
//				});
				that.update();
			} else if (that._pannable && (that._currentMoveState === null || that._currentMoveState === 'panning')) {
				that._pan(dx,dy);
				that._currentMoveState = 'panning';
			}
			x = e.clientX;
			y = e.clientY;
		});
	});

	$(this._canvas).on('mouseup',function() {
		console.log('mouseup');
		$(that._canvas).off('mousemove');
		that._currentMoveState = null;
	});


	this._scene.update();

	return this;
};
