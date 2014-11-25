define(['hbs!templates/graph','../util/events', '../graph/graph', '../graph/linkType','../layout/layout','../util/testData', '../layout/forensicColumnLayout'], function(graphTemplate,events,Graph,LINK_TYPE,Layout,testData,ForensicColumnLayout) {


	/**
	 * Requests a graph from a trail specification.   Automatically uses the browse path with adjacent URLS as the
	 * analytic.
	 * @param trail - A trail object as returned from DataWake server
	 * @returns A jQuery promise for the POST request that fetches the graph for the requested trail
	 */
	function fetchDatawakeGraphFor(trail) {
		var requestData = {
			name : 'browse path - with connected entities min degree 2',
			startdate : 1416459600,
			enddate : 1416546000
		};
		requestData.users = trail.users;
		requestData.domain = trail.domain;
		requestData.trail = trail.trail;
		return $.ajax({
			type: 'POST',
			url: '/datawake/forensic/graphservice/get',
			data: JSON.stringify(requestData),
			contentType: 'application/json',
			dataType: 'json'
		});
	}

	/**
	 * Creates nodes and links corresponding to the left hand column in the layout (browse path)
	 * @param response
	 * @returns {{nodes: Array, links: Array}}
	 */
	function getBrowsePathGraph(response) {
		var nodes = [];


		var browsePath = response.browsePath;
		var i = 0;
		var browsePathNodeMap = {};
		for (var id in browsePath) {
			if (browsePath.hasOwnProperty(id)) {
				var node = {
					x : 0,
					y : 0,
					fillStyle: '#ff0000',
					strokeStyle:'#232323',
					strokeSize:2,
					radius : 10,					// TODO:   radius == number of times visited?
					index : i,
					url : browsePath[id].url,
					type : 'browse_path',
					ts : browsePath[id].ts,
					col : 0,
					row : i,
					id : browsePath[id].id,
					domain : browsePath[id].domain,
					subdomain : browsePath[id].subdomain,
					suffix : browsePath[id].suffix
				};
				i++;
				browsePathNodeMap[browsePath[id].id] = node;
				nodes.push(node);
			}
		}

		var links = [];
		for (i = 0; i < nodes.length-1; i++) {
			var link = {
				source : nodes[i],
				target : nodes[i+1],
				strokeStyle : '#343434',
				type: LINK_TYPE.ARROW
			};
			links.push(link);
		}

		var graph = {
			nodes : nodes,
			links : links,
			browsePathNodeMap : browsePathNodeMap
		};
		return graph;
	}

	function getEntitiesGraph(response, browsePathGraph) {
		var nodeIndex = browsePathGraph.nodes.length;

		var nodes = [];
		var links = [];
		for (var i = 0; i < response.entities.length; i++) {
			var entity = response.entities[i];
			var browsePathNode = browsePathGraph.browsePathNodeMap[entity.id];
			if (entity.type === 'email' || entity.type === 'phone') {
				var node = {
					x : 0,
					y : 0,
					fillStyle: entity.type === 'email' ? '#00ff00' : '#0000ff',
					strokeStyle:'#232323',
					strokeSize:2,
					radius : 10,
					index : nodeIndex,
					type: entity.type,
					value : entity.value,
					col : 1,
					row : browsePathNode.row
				};
				nodes.push(node);
				var link = {
					source : browsePathNode,
					target : node,
					strokeStyle : '#343434',
					type: LINK_TYPE.LINE
				};
				links.push(link);
				nodeIndex++;
			}
		}



		var graph = {
			nodes : nodes,
			links : links
		};
		return graph;
	}

	function getRelatedLinksGraph(response, browsePathGraph, entitiesGraph) {
		var i = browsePathGraph.nodes.length + entitiesGraph.nodes.length;
		var graph = {
			nodes : [],
			links : []
		};
		return graph;
	}


			/**
	 * Renders a graph from the response to a POST request with a trail
	 * @param response - Response from '/datawake/forensic/graphservice/get' with a trail as input
	 */
	function getForensicGraph(response) {
		var d = new $.Deferred();

		var graph = {
			nodes : [],
			links : []
		};

		var browsePathGraph = getBrowsePathGraph(response);
		graph.nodes = graph.nodes.concat(browsePathGraph.nodes);
		graph.links = graph.links.concat(browsePathGraph.links);

		var entitiesGraph = getEntitiesGraph(response, browsePathGraph);
		graph.nodes = graph.nodes.concat(entitiesGraph.nodes);
		graph.links = graph.links.concat(entitiesGraph.links);

		var relatedLinksGraph = getRelatedLinksGraph(response, browsePathGraph, entitiesGraph);
		graph.nodes = graph.nodes.concat(relatedLinksGraph.nodes);
		graph.links = graph.links.concat(relatedLinksGraph.links);

		return d.resolve(graph);
	}

	/**
	 * Renders graph contained in forensicGraph to graphInstance
	 * @param forensicGraph - an object containing nodes and links in a format that graph.js can draw
	 * @param graphInstance - the graph object being drawn
	 */
	function renderForensicGraph(forensicGraph,graphInstance) {
		graphInstance.nodes(forensicGraph.nodes)
			.links(forensicGraph.links)
			.draw()
			.layout();
	}

	return {
		/**
		 * Creates a graph view element
		 * @param element - The container for the view.   Does not get cleared on insertion
		 * @param context - Any additional data required for the view.  Currently nothing.
		 */
		insert : function(element,context) {
			var graphViewElement = $(graphTemplate(context));
			var jqCanvas = graphViewElement;

			var nodeOver = function(node) {
				if (node.type === 'browse_path') {
					graph.addLabel(node,node.url);
				} else {
					graph.addLabel(node,node.value);
				}

			};

			var nodeOut = function(node) {
				graph.removeLabel(node);
			};

			var graph = new Graph()
				.canvas(jqCanvas[0])
				.pannable()
				.nodeHover(nodeOver,nodeOut)
				.layouter(new ForensicColumnLayout())
				.draggable()
				.draw();



			$(window).resize(function() {
				var width = $(window).width();
				var height = $(window).height() - jqCanvas.offset().top;

				graph.resize(width,height);
			});

			events.subscribe(events.topics.TRAIL_CHANGE, function(trailInfo) {
				fetchDatawakeGraphFor(trailInfo).then(getForensicGraph).then(function(forensicGraph) {
					renderForensicGraph(forensicGraph,graph);
				});
			});

			graphViewElement.appendTo(element);
			$(window).resize();
		}
	};
});