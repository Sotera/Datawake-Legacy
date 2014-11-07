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

	$.each(nodes,function() {
		if (this.index == that._focus.index) {
			return;
		}
		this.x = that._focus.x + (Math.cos(angle) * that._distance);
		this.y = that._focus.y + (Math.sin(angle) * that._distance);
		angle += angleDelta;
	});
};

