define(['../util/util'],function(_) {

	var COLUMN_STYLE = new Object({
		fillStyle: '#efefef',
		strokeStyle : '#121212',
		lineWidth : 1,
		lineDash : [5,5]
	});

	var NODE_PADDING = 5;

	/**
	 *
	 * @constructor
	 */
	var ForensicColumnLayout = function(columnWidth) {
		GraphJS.Layout.apply(this);
		this._duration = 750;
		this._easing = 'bounce-out';
		this._renderHeight = 0;
		this._positionedObjects = 0;
		this._columnWidth = columnWidth;
	};

	ForensicColumnLayout.prototype = GraphJS.Extend(ForensicColumnLayout, GraphJS.Layout.prototype, {
		/**
		 * Calculates the height of a laid-out array of nodes
		 * @param nodeList - an array of node objects
		 * @returns {Height} of column in pixels
		 * @private
		 */
		getGridCellHeight : function(nodeList) {
			var height = 0;
			if (nodeList) {
				for (var i = 0; i < nodeList.length; i++) {
					height+= (2*nodeList[i].radius) + NODE_PADDING;
				}
			}
			return height;
		},

		/**
		 * Perform a 3-column layout.   On the left is the browse path.   Center column
		 * contains any entities (email/phone) from the nodes in the browse path.  On the
		 * right column is a set of linked websites from the browse path.
		 * @param w - width of the canvas
		 * @param h - height of the canvas
		 * @returns {ForensicColumnLayout}
		 */
		_performLayout : function (w, h) {
			var x = 0;
			var y = 0;
			var nodeGridMap = {};
			this._positionedObjects = 0;
			var that = this;

			function getXPosition(col) {
				if (col === 0) {
					return that._columnWidth * 0.5;
				} else if (col === 1) {
					return that._columnWidth * 1.5;
				} else if (col === 2) {
					return that._columnWidth * 2.5;
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
			var top = NODE_PADDING;
			this._positionedObjects = 0;
			for (var i = 0; i <= maxRow; i++) {
				var columns = [nodeGridMap[i+',0']||[],nodeGridMap[i+',1']||[],nodeGridMap[i+',2']||[]];
				var cellHeights = [this.getGridCellHeight(columns[0]),this.getGridCellHeight(columns[1]),this.getGridCellHeight(columns[2])];
				var rowHeight = Math.max.apply(Math,cellHeights);

				// layout each column
				for (var j = 0; j < columns.length; j++) {
					var cellHeight = cellHeights[j];
					var cellTop = top + ((rowHeight - cellHeight) / 2.0);
					for (var k = 0; k < columns[j].length; k++) {
						var node = columns[j][k];
						x = getXPosition(j);
						y = cellTop + node.radius;
						this._setNodePosition(node, x, y);
						this._positionedObjects++;
						cellTop += (2*node.radius) + NODE_PADDING;
					}
				}
				top += rowHeight;
			}
			this._renderHeight = top;
			return this;
		}
	});
	return ForensicColumnLayout;
});