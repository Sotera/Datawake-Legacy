define(['layout/layout'],function(Layout) {


	/**
	 *
	 * @constructor
	 */
	function ForensicColumnLayout(columnOffsets,nodeVerticalPadding) {
		Layout.apply(this);

		// Constants
		this._NODE_VERTICAL_PADDING = nodeVerticalPadding || 40;
		this._renderHeight = 0;
		this._positionedObjects = 0;
	}

	$.extend(ForensicColumnLayout.prototype, Layout.prototype);

	/**
	 * Draw boxes behind the nodes that represent the columns
	 * @param w
	 * @param h
	 * @returns {Array}
	 */
	ForensicColumnLayout.prototype.prerender = function(w,h) {
		var rects = [];
		if (this._positionedObjects > 0) {
			rects.push(path.rect({
				x: 0,
				y: 0,
				width: w * 1/3.0,
				height: this._renderHeight,
				fillStyle: '#ff0000',
				opacity: 0.3
			}));

			rects.push(path.rect({
				x: w * 1/3.0,
				y: 0,
				width: w * 1/3.0,
				height: this._renderHeight,
				fillStyle: '#00ff00',
				opacity: 0.3
			}));

			rects.push(path.rect({
				x: w * 2/3.0,
				y: 0,
				width: w * 1/3.0,
				height: this._renderHeight,
				fillStyle: '#0000ff',
				opacity: 0.3
			}));
		}

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
		this._positionedObjects = 0;

		function getXPosition(col) {
			if (col === 0) {
				return 1/6.0 * w;
			} else if (col === 1) {
				return 3/6.0 * w;
			} else if (col === 2) {
				return 5/6.0 * w;
			}
		}

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
					x = getXPosition(j);
					y = colTop + node.radius;
					colTop += y + this._NODE_VERTICAL_PADDING;
					that._setNodePositionImmediate(node, x, y);
					this._positionedObjects++;
				}
			}
			var rowHeight = Math.max(this._getRowHeight(columns[0]),Math.max(this._getRowHeight(columns[1]),this._getRowHeight(columns[2])));
			top += rowHeight;
		}
		this._renderHeight = top;
		return this;
	};
	return ForensicColumnLayout;
});