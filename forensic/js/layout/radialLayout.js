function RadialLayout(focus,distance) {
	this._focus = focus;
	this._distance = distance;

	Layout.apply(this);
}
$.extend(RadialLayout.prototype, Layout.prototype);

RadialLayout.prototype.layoutLabel = function(node) {
	var x, y, align;

	// Right of center
	if (node.x > this._focus) {
		x = node.x + (node.radius + 10);
		align = 'start';
	} else {
		x = node.x - (node.radius + 10);
		align = 'end';
	}

	if (node.y > this._focus) {
		y = node.y + (node.radius + 10);
	} else {
		y = node.y - (node.radius + 10);
	}
	return {
		x: x,
		y: y,
		align: align
	};
};

RadialLayout.prototype.layout = function() {
	var nodes = this.nodes();
	var that = this;
	var angleDelta = Math.PI * 2 / (nodes.length - 1);
	var angle = 0.0;
	nodes.forEach(function(node) {
		if (node.index === that._focus.index) {
			return;
		}
		var newX = that._focus.x + (Math.cos(angle) * that._distance);
		var newY = that._focus.y + (Math.sin(angle) * that._distance);
		that._setNodePosition(node,newX,newY);
		angle += angleDelta;
	});
};

