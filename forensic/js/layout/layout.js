function Layout() {
	this._nodes = null;
	this._linkMap = null;
	this._nodeMap = null;
	this._tweenTime = 250;
}

Layout.prototype.tweenTime = function(tweenTime) {
	if (tweenTime) {
		this._tweenTime = tweenTime;
	} else {
		return this._tweenTime;
	}
	return this;
};

Layout.prototype.nodes = function(nodes) {
	if (nodes) {
		this._nodes = nodes;
	} else {
		return this._nodes;
	}
	return this;
};

Layout.prototype.linkMap = function(linkMap) {
	if (linkMap) {
		this._linkMap = linkMap;
	} else {
		return this._linkMap;
	}
	return this;
};

Layout.prototype.nodeMap = function(nodeMap) {
	if (nodeMap) {
		this._nodeMap = nodeMap;
	} else {
		return this._nodeMap;
	}
	return this;
};

Layout.prototype._setNodePosition = function(node,x,y) {

	// Update the original data
	node.x = x;
	node.y = y;

	// Update the node render object
	var circle = this._nodeMap[node.index];
	circle.tweenAttr({
		x: x,
		y: y
	}, {
		duration: this._tweenTime,
		easing: 'ease-in-out'
	});

	// Update the link render object
	var that = this;
	this._linkMap[node.index].forEach(function(link) {
		if (link.source.index === node.index) {
			link.source.tweenAttr({
				x: x,
				y: y
			}, {
				duration: that._tweenTime,
				easing: 'ease-in-out'
			});
		} else {

			lineObj = link.target;
		}

	});
};

Layout.prototype.layout = function() {
	throw new Error('Layouts must override the layout function');
};