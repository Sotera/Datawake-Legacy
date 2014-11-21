define(['hbs!templates/graph','../util/events'], function(graphTemplate,events) {


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

	var randomNodes = function(maxRadius, num) {
		var nodes = [];
		for (var i = 0; i < num; i++) {
			var node = {
				x : 0,
				y : 0,
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



	return {
		insert : function(element,context) {
			var graphViewElement = $(graphTemplate(context));
			var jqCanvas = graphViewElement;


			var nodes = randomNodes(5,75);
			var links = radialLinks(nodes,0);
			var graph = new Graph()
				.nodes(nodes)
				.links(links)
				.canvas(jqCanvas[0])
				.pannable()
				.draw();

			$(window).resize(function() {
				var width = $(window).width();
				var height = $(window).height() - jqCanvas.offset().top;

				graph.resize(width,height);
			});

			events.subscribe(events.topics.TRAIL_CHANGE, function(data) {
				// TODO:  handle trail change!
			});

			graphViewElement.appendTo(element);
			$(window).resize();
		}
	};
});