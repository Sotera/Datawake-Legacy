function Layout() {
	this._nodes = null;
	this._linkMap = null;
	this._nodeMap = null;
	this._duration = 250;
	this._easing = 'ease-in-out';
}

Layout.prototype.duration = function(duration) {
	if (duration) {
		this._duration = duration;
	} else {
		return this._duration;
	}
	return this;
};

Layout.prototype.easing = function(easing) {
	if (easing) {
		this._easing = easing;
	}	 else {
		return this._easing;
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


	// Update the node render object
	var circle = this._nodeMap[node.index];
	circle.tweenAttr({
		x: x,
		y: y
	}, {
		duration: this._duration,
		easing: this._easing
	});

	// Update the link render object
	var that = this;
	this._linkMap[node.index].forEach(function(link) {
		if (link.source.index === node.index) {
			link.tweenObj('source',{
				x: x,
				y: y
			}, {
				duration: that._duration,
				easing: that._easing
			});
		} else {
			link.tweenObj('target',{
				x: x,
				y: y
			}, {
				duration: that._duration,
				easing: that._easing
			});
		}

	});
};

Layout.prototype.layout = function() {
	throw new Error('Layouts must override the layout function');
};