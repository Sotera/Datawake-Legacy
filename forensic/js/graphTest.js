/**
 * Created by chrisdickson on 14-11-06.
 */

var prettyPalette = ['#359135',
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

var randomNodes = function(maxX, maxY, maxRadius, num) {
	var nodes = [];
	for (var i = 0; i < num; i++) {
		var node = {
			x : Math.floor(Math.random() * maxX),
			y : Math.floor(Math.random() * maxY),
			radius : Math.floor(5 + (Math.random() * (maxRadius))),
			label : 'Index: '+i,
			index : i,
			fillStyle : prettyPalette[ Math.floor(prettyPalette.length * Math.random())]
		};
		nodes.push(node);
	}
	return nodes;
};


var radialLinks = function(nodes,focusIdx) {
	var focusNode = nodes[focusIdx];
	var links = [];
	$.each(nodes,function() {
		if (this.index === focusIdx) {
			return;
		}
		links.push({
			source : focusNode,
			target : this,
			strokeStyle : '#ababab'
		});
	});
	return links;
};


function main() {

	var WIDTH = 1024;
	var HEIGHT = 760;
	var NUM_NODES = 1000;
	var MAX_RADIUS = 5;


	var nodes = randomNodes(WIDTH,HEIGHT,MAX_RADIUS,NUM_NODES);
	nodes[0].x = WIDTH/2;
	nodes[0].y = HEIGHT/2;
	var links = radialLinks(nodes,0);

	var onNodeOver = function(node) {
		node.strokeStyle = '#000000';
	};
	var onNodeOut = function(node) {
		node.strokeStyle = null;
	};
	var jqCanvas = $('canvas')
		.css('border', '1px solid black')
		.attr({width:WIDTH,height:HEIGHT})
		.width(WIDTH)
		.height(HEIGHT);
	var canvas = jqCanvas[0];

	var graph = new Graph()
		.nodes(nodes)
		.links(links)
		.canvas(canvas)
		.nodeHover(onNodeOver,onNodeOut)
		.pannable()
		.zoomable()
		.draggable()
		.draw();

	var layoutBtn = $('<button/>').click(function() {
		var radialLayouter = new RadialLayout(nodes[0], 200)
			.duration(750)
			.easing('elasticInOut');
		graph.layout(radialLayouter);
		graph.update();
	}).html('Layout');
	$('body').append(layoutBtn);
}