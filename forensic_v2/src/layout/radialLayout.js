define(['layout/layout'],function(Layout) {

	/**
	 *
	 * @param focus - the node at the center of the radial layout
	 * @param distance - the distance of other nodes from the focus
	 * @constructor
	 */
	function RadialLayout(focus,distance) {
		this._focus = focus;
		this._distance = distance;

		Layout.apply(this);
	}
	$.extend(RadialLayout.prototype, Layout.prototype);

	/**
	 * Gets/sets the distance parameter
	 * @param distance - the distance of links from the focus node to other nodes in pixels
	 * @returns {RadialLayout} if distance param is defined, {RadialLayout._distance} otherwise
	 */
	RadialLayout.prototype.distance = function(distance) {
		if (distance) {
			this._distance = distance;
		} else {
			return this._distance;
		}
		return this;
	};

	/**
	 * Gets/sets the focus node that is at the center of the layout
	 * @param focus - the node that is at the center of the layout.   Other nodes are centered around this.
	 * @returns {RadialLayout} if focus param is defined, {RadialLayout._focus} otherwise
	 */
	RadialLayout.prototype.focus = function(focus) {
		if (focus) {
			this._focus = focus;
		} else {
			return this._focus;
		}
		return this;
	};

	/**
	 * Get the label position for a node
	 * @param nodeX - the x position of the node
	 * @param nodeY - the y position of the node
	 * @param radius - the radius of the node
	 * @returns {{x: x position of the label, y: y position of the label, align: HTML canvas text alignment property for label}}
	 */
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

	/**
	 * Perform a radial layout
	 * @param w - the width of the canvas being rendered to
	 * @param h - the height of the canvas being rendered to
	 */
	RadialLayout.prototype.layout = function(w,h) {
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

	return RadialLayout;
});