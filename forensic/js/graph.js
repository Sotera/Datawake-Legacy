/**
 * Created by chrisdickson on 14-11-06.
 */
function Graph() {
	this._nodes = null;
	this._links = null;
	this._canvas = null;
	this._scene = null;
};

Graph.prototype.nodes = function(nodes) {
	if (nodes) {
		this._nodes = nodes;
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
	var that = this
	if (!this._scene) {
		this._scene = path(this._canvas);
	}
	$.each(this._nodes, function(i) {
		var circle = path.circle(this);
		if (that._nodeOver) {
			circle.on('mouseover', function(e) {
				that._nodeOver(circle,e);
				that._scene.update();
			});
		}
		if (that._nodeOut) {
			circle.on('mouseout', function(e) {
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


	this._scene.update();

	return this;
};
