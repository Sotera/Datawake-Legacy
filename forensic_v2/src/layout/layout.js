define([],function() {

	/**
	 * Layout constructor
	 * @constructor
	 */
	function Layout() {
		this._nodes = null;
		this._linkMap = null;
		this._nodeMap = null;
		this._labelMap = null;
		this._duration = 250;
		this._easing = 'ease-in-out';
		this._isUpdate = false;
	}

	/**
	 * Gets/sets the duration of the layout animation
	 * @param duration - the duration of the layout animation in milliseconds.  (default = 250ms)
	 * @returns {Layout} if duration param is defined, {Layout._duration} otherwise
	 */
	Layout.prototype.duration = function(duration) {
		if (duration) {
			this._duration = duration;
		} else {
			return this._duration;
		}
		return this;
	};

	/**
	 * Gets/sets the easing of the layout animation
	 * @param easing - the easing of the layout animation in milliseconds.  (default = 'ease-in-out')
	 * @returns {Layout} if easing param is defined, {Layout._easing} otherwise
	 */
	Layout.prototype.easing = function(easing) {
		if (easing) {
			this._easing = easing;
		}	 else {
			return this._easing;
		}
		return this;
	};

	/**
	 * Gets/sets the nodes of the layout.   Set from the graph
	 * @param nodes - the set of nodes defined in the corresponding graph
	 * @returns {Layout} if nodes param is defined, {Layout._nodes} otherwise
	 */
	Layout.prototype.nodes = function(nodes) {
		if (nodes) {
			this._isUpdate = nodes ? true : false;
			this._nodes = nodes;
		} else {
			return this._nodes;
		}
		return this;
	};

	/**
	 * Gets/sets the link map of the layout.   Set from the graph
	 * @param linkMap - a map from node index to a set of lines (path objects) that contain that node
	 * @returns {Layout} if linkMap param is defined, {Layout._linkMap} otherwise
	 */
	Layout.prototype.linkMap = function(linkMap) {
		if (linkMap) {
			this._linkMap = linkMap;
		} else {
			return this._linkMap;
		}
		return this;
	};

	/**
	 * Gets/sets the node map of the layout.   Set from the graph
	 * @param nodeMap - a map from node index to a circle (path object)
	 * @returns {Layout} if nodeMap param is defined, {Layout._nodeMap} otherwise
	 */
	Layout.prototype.nodeMap = function(nodeMap) {
		if (nodeMap) {
			this._nodeMap = nodeMap;
		} else {
			return this._nodeMap;
		}
		return this;
	};

	/**
	 * Gets/sets the label of the layout.   Set from the graph
	 * @param labelMap - a map from node index to a text object (path object)
	 * @returns {Layout} if labelMap param is defined, {Layout._labelMap} otherwise
	 */
	Layout.prototype.labelMap = function(labelMap) {
		if (labelMap) {
			this._labelMap = labelMap;
		} else {
			return this._labelMap;
		}
		return this;
	};

	/**
	 * Sets the position of a node and all attached links and labels without animation
	 * @param node - the node object being positioned
	 * @param x - the new x position for the node
	 * @param y - the new y position for the node
	 * @private
	 */
	Layout.prototype._setNodePositionImmediate = function(node,x,y) {
		this._setNodePosition(node,x,y,true);
	};

	/**
	 * Sets the position of a node by animating from it's old position to it's new one
	 * @param node - the node being repositioned
	 * @param x - the new x position of the node
	 * @param y - the new y position of the node
	 * @param bImmediate - if true, sets without animation.
	 * @private
	 */
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
		if (this._linkMap[node.index].length === 0) {
			node.x = x;
			node.y = y;
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

	/**
	 * Default layout routine.   Should be overriden by subclasses.
	 * @param w - the width of the canvas being rendered to
	 * @param h - the height of the canvas being rendered to
	 * @returns {Layout}
	 */
	Layout.prototype.layout = function(w,h) {
		return this;
	};


	/**
	 * 	/**
	 * Hook for doing any drawing before rendering of the graph that is layout specific
	 * ie/ Backgrounds, etc
	 * @param w - the width of the canvas
	 * @param h - the height of the canvas
	 * @returns {Array} - a list of path.js render objects to be added to the scene
	 */
	Layout.prototype.prerender = function(w,h) {
		return [];
	};

	/**
	 * Hook for doing any drawing after rendering of the graph that is layout specific
	 * ie/ Overlays, etc
	 * @param w - the width of the canvas
	 * @param h - the height of the canvas
	 * @returns {Array} - a list of path.js render objects to be added to the scene
	 */
	Layout.prototype.postrender = function(w,h) {
		return [];
	};

	/**
	 * Sets the label position for a node
	 * @param nodeX - the x position of the node
	 * @param nodeY - the y position of the node
	 * @param radius - the radius of the node
	 * @returns {{x: x position of the label, y: y position of the label}}
	 */
	Layout.prototype.layoutLabel = function(nodeX,nodeY,radius) {
		return {
			x: nodeX + radius + 5,
			y: nodeY + radius + 5
		};
	};
	return Layout;
});