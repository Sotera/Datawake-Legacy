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
			radius : Math.floor(5 + (Math.random() * (maxRadius-5))),
			index : i,
			fillStyle : prettyPalette[ Math.floor(prettyPalette.length * Math.random())]
		};
		nodes.push(node);
	}
	return nodes;
};

var linkedGraph = function() {
	var nodes = [];
	nodes.push({
		x : 100,
		y : 100,
		radius : 5,
		index : 0,
		fillStyle : '#000000'
	});
	nodes.push({
		x : 300,
		y : 300,
		radius : 5,
		index : 1,
		fillStyle : '#000000'
	});

	var links = [];
	links.push({
		source : nodes[0],
		target: nodes[1],
		strokeStyle:'#ababab'
	});
	return {
		nodes:nodes,
		links:links
	};
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

var nonRandomNodes = function() {
	var c = ['#220000','#440000','#660000','#880000','#AA0000','#CC0000','#EE0000'];
	var xy = [[50,50],[100,100],[150,150],[200,200],[250,250],[300,300],[350,350]];
	var nodes = [];
	for (var i = 0; i < xy.length; i++) {
		var node = {
			x : xy[i][0],
			y : xy[i][1],
			radius : 8,
			index : i,
			fillStyle : c[i]
		};
		nodes.push(node);
	}
	return nodes;
};

function main() {

	var WIDTH = 500;
	var HEIGHT = 500;


	var nodes = randomNodes(WIDTH,HEIGHT,5,75);
	var links = radialLinks(nodes,0);

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
		.nodeClick(onNodeClick)
		.pannable()
		.zoomable()
		.draggable()
		.draw();

	var layoutBtn = $('<button/>').click(function() {
		graph.layout(new RadialLayout(nodes[0], 200));
		graph.update();
	}).html('Layout');
	$('body').append(layoutBtn);
}