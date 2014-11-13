function RadialLayout(focus,distance) {
	this._focus = focus;
	this._distance = distance;

	Layout.apply(this);
}
$.extend(RadialLayout.prototype, Layout.prototype);


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

