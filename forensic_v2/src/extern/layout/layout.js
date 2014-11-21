function Layout() {
	this._nodes = null;
	this._linkMap = null;
	this._nodeMap = null;
	this._labelMap = null;
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

Layout.prototype.labelMap = function(labelMap) {
	if (labelMap) {
		this._labelMap = labelMap;
	} else {
		return this._labelMap;
	}
	return this;
};

Layout.prototype._setNodePositionImmediate = function(node,x,y) {
	this._setNodePosition(node,x,y,true);
};

Layout.prototype._setNodePosition = function(node,x,y,bImmediate) {
	// Update the node render object
	var circle = this._nodeMap[node.index];
	if (bImmediate!==true) {
		circle.tweenAttr({
			x: x,
			y: y
		}, {
			duration: this._duration,
			easing: this._easing
		});
	} else {
		circle.x = x;
		circle.y = y;
	}

	// Update the label render object
	var label = this._labelMap[node.index];
	if (label) {
		var labelPos = this.layoutLabel(x,y,node.radius);
		if (bImmediate!==true) {
			label.tweenAttr(labelPos, {
				duration: this._duration,
				easing: this._easing
			});
		} else {
			for (var prop in labelPos) {
				if (labelPos.hasOwnProperty(prop)) {
					label[prop] = labelPos[prop];
				}
			}
		}
	}


	// Update the link render object
	var that = this;
	this._linkMap[node.index].forEach(function(link) {
		var linkObjKey = null;
		if (link.source.index === node.index) {
			linkObjKey = 'source';
		} else {
			linkObjKey = 'target';
		}
		if (bImmediate!==true) {
			link.tweenObj(linkObjKey, {
				x: x,
				y: y
			}, {
				duration: that._duration,
				easing: that._easing
			});
		} else {
			link[linkObjKey].x = x;
			link[linkObjKey].y = y;
		}
	});
};

Layout.prototype.layout = function(w,h) {
	var x = 0;
	var y = 0;
	var maxRadiusRow = 0;
	var that = this;
	this._nodes.forEach(function(node) {

		if (x === 0) {
			x += node.radius;
		}
		if (y === 0) {
			y += node.radius;
		}

		that._setNodePositionImmediate(node,x,y);

		maxRadiusRow = Math.max(maxRadiusRow,node.radius);

		x+= node.radius + 40;
		if (x > w) {
			x = 0;
			y += maxRadiusRow + 40;
			maxRadiusRow = 0;
		}
	});
};

Layout.prototype.layoutLabel = function(nodeX,nodeY,radius) {
	return {
		x: nodeX + radius + 5,
		y: nodeY + radius + 5
	};
};