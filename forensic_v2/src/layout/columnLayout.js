define(['layout/layout'],function(Layout) {

	/**
	 *
	 * @constructor
	 */
	function ColumnLayout() {
		Layout.apply(this);
	}

	$.extend(ColumnLayout.prototype, Layout.prototype);

	ColumnLayout.prototype.layout = function (w, h) {
		var x = 0;
		var y = 0;
		var maxRadiusCol = 0;
		var that = this;
		this._nodes.forEach(function (node) {

			if (y === 0) {
				y += node.radius;
			}
			if (x === 0) {
				x += node.radius;
			}

			that._setNodePositionImmediate(node, x, y);

			maxRadiusCol = Math.max(maxRadiusCol, node.radius);

			y += node.radius + 40;
			if (y > h) {
				y = 0;
				x += maxRadiusCol + 40;
				maxRadiusCol = 0;
			}
		});
		return this;
	};
	return ColumnLayout;
});