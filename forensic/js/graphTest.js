/**
 * Created by chrisdickson on 14-11-06.
 */
var randomNodes = function(maxX, maxY, maxRadius, num) {
	var colors = ['#359135',
		'#475147',
		'#457145',
		'#0CB60C',
		'#00D400',
		'#B58F42',
		'#656159',
		'#8D7B56',
		'#E49D0F',
		'#FFAA00',
		'#5F3079',
		'#413C43',
		'#523C5E',
		'#681198',
		'#7804B8'];
	var nodes = [];
	for (var i = 0; i < num; i++) {
		nodes.push({
			x : Math.random() * maxX,
			y : Math.random() * maxY,
			radius : 5 + (Math.random() * (maxRadius-5)),
			index : i,
			fillStyle : colors[ Math.floor(colors.length * Math.random())]
		});
	}
	return nodes;
}



function main() {
	var nodes = randomNodes(640,480,10,10000);

	links = [{
		source : nodes[0],
		target : nodes[1],
		style : 'arrow'
	},{
		source : nodes[1],
		target : nodes[2],
		style : 'arrow'
	}];

	var onNodeOver = function(node) {

		node.strokeStyle = '#000000';
	};
	var onNodeOut = function(node) {

		node.strokeStyle = null;
	};
	var onNodeClick = function(node) {

		node.tweenAttr({
			radius: node.radius+10
		}, {
			duration: 250,
			easing: 'ease-in-out',
			callback : function(node,attr) {
				node.tweenAttr({
					radius: node.radius-10
				},
					{
						duration: 250,
						easing: 'ease-in-out'
					});
			}
		});
	};

	var jqCanvas = $('canvas');
	jqCanvas.css('border','1px solid black');
	var canvas = jqCanvas[0];
	canvas.width = 640;
	canvas.height = 480;



	var graph = new Graph()
		.nodes(nodes)
		.links(links)
		.canvas(canvas)
		.nodeHover(onNodeOver,onNodeOut)
		.nodeClick(onNodeClick)
		.draw();
}