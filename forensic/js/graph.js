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

	this._nodeIndexToLinkLine = null;
}

Graph.prototype.nodes = function(nodes) {
	if (nodes) {
		this._nodes = nodes;
		this._nodeIndexToLinkLine = {};
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
		this._layouter.nodes(this._nodes)
			.layout();
	} else {
		this._layouter.layout();
		this._scene.update();
	}
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
	this._links.forEach(function(link) {
		var line = path.line(link);

		that._nodeIndexToLinkLine[link.source.index].push(line);
		that._nodeIndexToLinkLine[link.target.index].push(line);

		that._scene.addChild(line);
	});

	this._nodes.forEach(function(node) {
		var circle = path.circle(node);
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
				that._currentOverNode.x -= dx;
				that._currentOverNode.y -= dy;

				// Move any links that contain that node
				that._nodeIndexToLinkLine[that._currentOverNode.index].forEach(function(line) {
					if (line.source.index === that._currentOverNode.index) {
						line.source.x = that._currentOverNode.x;
						line.source.y = that._currentOverNode.y;
					} else {
						line.target.x = that._currentOverNode.x;
						line.target.y = that._currentOverNode.y;
					}
				});
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
