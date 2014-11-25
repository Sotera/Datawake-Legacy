define(['layout/layout'],function(Layout) {


	/**
	 *
	 * @constructor
	 */
	function ForensicColumnLayout(columnOffsets,nodeVerticalPadding) {
		Layout.apply(this);

		// Constants
		this._COLUMN_OFFSETS = columnOffsets || [0.1,0.4,0.7];
		this._NODE_VERTICAL_PADDING = nodeVerticalPadding || 40;
	}

	$.extend(ForensicColumnLayout.prototype, Layout.prototype);

	ForensicColumnLayout.prototype._getRowHeight = function(columnNodes) {
		var height = 0;
		if (columnNodes) {
			columnNodes.forEach(function (node) {
				height += node.radius;
			});
			height += columnNodes.length * this._NODE_VERTICAL_PADDING;
		}
		return height;
	};


	ForensicColumnLayout.prototype.layout = function (w, h) {
		var x = 0;
		var y = 0;
		var that = this;
		var nodeGridMap = {};

		// Make a lookup of rows and columns for each grid cell
		var maxRow = -1;
		this._nodes.forEach(function(node) {
			var row = node.row;
			maxRow = Math.max(maxRow,row);
			var col = node.col;
			var key = row+','+col;

			var nodes = nodeGridMap[key];
			if (!nodes) {
				nodes = [];
			}
			nodes.push(node);
			nodeGridMap[key] = nodes;
		});

		var top = this._NODE_VERTICAL_PADDING;
		for (var i = 0; i < maxRow; i++) {
			var columns = [nodeGridMap[i+',0']||[],nodeGridMap[i+',1']||[],nodeGridMap[i+',2']||[]];

			// layout each column
			for (var j = 0; j < columns.length; j++) {
				var colTop = top;
				for (var k = 0; k < columns[j].length; k++) {
					var node = columns[j][k];
					x = this._COLUMN_OFFSETS[j] * w;
					y = colTop + node.radius;
					colTop += y + this._NODE_VERTICAL_PADDING;
					that._setNodePositionImmediate(node, x, y);
				}
			}
			var rowHeight = Math.max(this._getRowHeight(columns[0]),Math.max(this._getRowHeight(columns[1]),this._getRowHeight(columns[2])));
			top += rowHeight;
		}
		return this;
	};
	return ForensicColumnLayout;
});