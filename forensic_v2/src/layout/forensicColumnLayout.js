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

	ForensicColumnLayout.prototype.prerender = function(w,h) {
		var rects = [];
		rects.push(path.rect({
			x : 0,
			y : 0,
			width : 100,
			height : 100,
			fillStyle : '#ff0000',
			opacity : 0.3
		}));

		return rects;
	};

	ForensicColumnLayout.prototype.postrender = function(w,h) {
		var rects = [];
		rects.push(path.rect({
			x : 400,
			y : 400,
			width : 100,
			height : 100,
			fillStyle : '#0000ff',
			opacity : 0.8
		}));

		return rects;
	};

	/**
	 * Calculates the height of a laid-out array of nodes
	 * @param columnNodes - an array of node objects
	 * @returns {Height} of column in pixels
	 * @private
	 */
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


	/**
	 * Perform a 3-column layout.   On the left is the browse path.   Center column
	 * contains any entities (email/phone) from the nodes in the browse path.  On the
	 * right column is a set of linked websites from the browse path.
	 * @param w - width of the canvas
	 * @param h - height of the canvas
	 * @returns {ForensicColumnLayout}
	 */
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

		// Layout each row one by one
		var top = this._NODE_VERTICAL_PADDING;
		for (var i = 0; i < maxRow; i++) {

			var columns = [nodeGridMap[i+',0']||[],nodeGridMap[i+',1']||[],nodeGridMap[i+',2']||[]];

			// layout each column
			for (var j = 0; j < columns.length; j++) {
				var colTop = top;

				// Place each node in the column
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