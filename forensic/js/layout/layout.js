function Layout() {
	this._nodes = null;
}

Layout.prototype.nodes = function(nodes) {
	if (nodes) {
		this._nodes = nodes;
	} else {
		return this._nodes;
	}
	return this;
}

Layout.prototype.layout = function() {
	throw new Error('Layouts must override the layout function');
};