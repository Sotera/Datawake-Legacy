function RadialLayout(focus,distance) {
	this._focus = focus;
	this._distance = distance;

	Layout.apply(this);
}
$.extend(RadialLayout.prototype, Layout.prototype);

RadialLayout.prototype.layoutLabel = function(nodeX,nodeY,radius) {
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
};

RadialLayout.prototype.layout = function() {
	var nodes = this.nodes();
	var that = this;
	var angleDelta = Math.PI * 2 / (nodes.length - 1);
	var angle = 0.0;
	nodes.forEach(function(node) {
		if (node.index === that._focus.index) {
			that._setNodePosition(node,node.x,node.y);
			return;
		}
		var newX = that._focus.x + (Math.cos(angle) * that._distance);
		var newY = that._focus.y + (Math.sin(angle) * that._distance);
		that._setNodePosition(node,newX,newY);
		angle += angleDelta;
	});
};

