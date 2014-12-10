define(['hbs!templates/graph','../util/events', '../rest/trailGraph', '../util/testData', '../layout/forensicColumnLayout', '../grouping/forensicGroupingManager', '../config/forensic_config'], function(graphTemplate,events,TrailGraphService,testData,ForensicColumnLayout,ForensicGroupingManager,ForensicConfig) {


	var DEFAULT_NODE_RADIUS = 20;

	/**
	 *
	 * @param element - the parent DOM element
	 * @param context - the context for the graph view template
	 * @constructor
	 */
	function GraphView(element,context) {
		this._graph = null;
		this._jqCanvas = null;
		this._layouter = null;
		this._browsePathComponents = null;
		this._entitiesComponents = null;
		this._relatedLinksComponents = null;
		this._groupingManager = new ForensicGroupingManager();
		this._initialize(element,context);
	}

	/**
	 * Initializes the view.   Creates a canvas context and a initializes a graph in it.
	 * @param element - the parent DOM element
	 * @param context - the context for the graph view template
	 * @private
	 */
	GraphView.prototype._initialize = function(element,context) {
		this._jqCanvas = $(graphTemplate(context));
		this._graph = new GraphJS.Graph()
			.canvas(this._jqCanvas[0])
			.groupingManager(new ForensicGroupingManager())
			.pannable()
			.zoomable()
			.nodeHover(this._onNodeOver,this._onNodeOut)
			.nodeClick(this._onNodeClick,this)
			.fontColour(ForensicConfig.LABEL.FILL_STYLE)
			.fontFamily(ForensicConfig.LABEL.FONT_FAMILY)
			.fontSize(ForensicConfig.LABEL.FONT_HEIGHT)
			.draw();

		this._bindEventHandlers();

		var self = this;
		$(window).resize(function(e) {
			self._onResize(e);
		});
		this._jqCanvas.appendTo(element);
		$(window).resize();
	};

	GraphView.prototype._onNodeClick = function(node) {
		this._graph.ungroup(node);
	};

	/**
	 * Mouseover event handler.   Adds a label/tooltip
	 * @param node
	 * @private
	 */
	GraphView.prototype._onNodeOver = function(node) {
		if (node.type === 'browse_path') {
			if (node.children) {
				this.addLabel(node, node.children[0].domain);
			} else {
				this.addLabel(node, node.url);
			}
		} else {
			if (node.children) {
				switch(node.type) {
					case 'email':
						this.addLabel(node,'Emails');
						break;
					case 'website':
						this.addLabel(node,'Website');
						break;
					case 'phone':
						this.addLabel(node,'Phone Numbers');
						break;
				}
			} else {
				this.addLabel(node, node.value);
			}
		}
	};

	/**
	 * Node out handler.   Removes the label displayed
	 * @param node
	 * @private
	 */
	GraphView.prototype._onNodeOut = function(node) {
		this.removeLabel(node);
	};

	/**
	 * Handles resizing
	 * @private
	 */
	GraphView.prototype._onResize = function(event) {
		var width = window.innerWidth;
		var height = window.innerHeight - this._jqCanvas.offset().top;
		this._graph.resize(width,height);
	};

	/**
	 * Event handler for changing the active trail
	 * @param trailInfo
	 * @private
	 */
	GraphView.prototype._onTrailChange = function(trailInfo) {
		var self = this;
		TrailGraphService.get(trailInfo)
			.then(function(response) {
				return self._getForensicGraph(response);
			})
			.then(function(forensicGraph) {
				self._renderForensicGraph(forensicGraph);
			});
	};

	/**
	 * Fits the graph to the screen
	 * @private
	 */
	GraphView.prototype._onFit = function() {
		this._graph.fit();
	};

	/**
	 * Adds any event handlers for custom message passing
	 * @private
	 */
	GraphView.prototype._bindEventHandlers = function() {
		events.subscribe(events.topics.TRAIL_CHANGE,this._onTrailChange,this);
		events.subscribe(events.topics.FIT,this._onFit,this);
	};

	/**
	 * Utility functions to combine two graphs node/link lists
	 * @param graph1 - the graph to have it's links merged
	 * @param graph2 - the graph to remain untouched
	 * @private
	 */
	GraphView.prototype._mergeComponents = function(graph1,graph2) {
		graph1.nodes = graph1.nodes.concat(graph2.nodes);
		graph1.links = graph1.links.concat(graph2.links);
	};

	/**
	 * Creates nodes and links corresponding to the left hand column in the layout (browse path).
	 * @param response - the raw response from the server
	 * @returns {{nodes: Array, links: Array}}
	 */
	GraphView.prototype._getBrowsePathGraph = function(response) {
		var nodes = [];

		var browsePath = response.browsePath;
		var i = 0;
		var browsePathNodeMap = {};
		for (var id in browsePath) {
			if (browsePath.hasOwnProperty(id)) {
				var node = {
					x : 0,
					y : 0,
					fillStyle: ForensicConfig.BROWSE_PATH_ENTITY.FILL_STYLE,
					strokeStyle: ForensicConfig.BROWSE_PATH_ENTITY.STROKE_STYLE,
					lineWidth: ForensicConfig.BROWSE_PATH_ENTITY.STROKE_WIDTH,
					radius : DEFAULT_NODE_RADIUS,					// TODO:   radius == number of times visited?
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
				strokeStyle : ForensicConfig.BROWSE_PATH_LINK.STROKE_STYLE,
				type: ForensicConfig.BROWSE_PATH_LINK.LINE_TYPE
			};
			links.push(link);
		}

		var graph = {
			nodes : nodes,
			links : links,
			browsePathNodeMap : browsePathNodeMap
		};
		return graph;
	};

	/**
	 * Creates the nodes and links for the entities graph (second column)
	 * @param response - raw server response for this trail
	 * @param browsePathGraph - the browse path graph
	 * @returns {{nodes: Array, links: Array}}
	 * @private
	 */
	GraphView.prototype._getEntitiesGraph = function(response) {
		var nodeIndex = this._browsePathComponents.nodes.length;

		var nodes = [];
		var links = [];
		for (var i = 0; i < response.entities.length; i++) {
			var entity = response.entities[i];
			var browsePathNode = this._browsePathComponents.browsePathNodeMap[entity.id];
			if (entity.type === 'email' || entity.type === 'phone') {
				var node = {
					x : 0,
					y : 0,
					fillStyle: entity.type === 'email' ? ForensicConfig.EMAIL_ENTITY.FILL_STYLE : ForensicConfig.PHONE_ENTITY.FILL_STYLE,
					strokeStyle:entity.type === 'email' ? ForensicConfig.EMAIL_ENTITY.STROKE_STYLE : ForensicConfig.PHONE_ENTITY.STROKE_STYLE,
					lineWidth:entity.type === 'email' ? ForensicConfig.EMAIL_ENTITY.STROKE_WIDTH : ForensicConfig.PHONE_ENTITY.STROKE_WIDTH,
					radius : DEFAULT_NODE_RADIUS,
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
					strokeStyle : ForensicConfig.ENTITY_LINK.STROKE_STYLE,
					lineWidth : ForensicConfig.ENTITY_LINK.LINE_WIDTH,
					type: ForensicConfig.ENTITY_LINK.LINE_TYPE
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
	};

	/**
	 * Creates the nodes and links for the third column in our view (related websites linked to the browsepath)
	 * @param response - raw server response for this trail
	 * @param browsePathGraph - the graph for the browse path
	 * @param entitiesGraph - the graph for the entities
	 * @returns {{nodes: Array, links: Array}}
	 * @private
	 */
	GraphView.prototype._getRelatedLinksGraph = function(response) {
		var nodeIndex = this._browsePathComponents.nodes.length + this._entitiesComponents.nodes.length;

		var nodes = [];
		for (var i = 0; i < response.entities.length; i++) {
			var entity = response.entities[i];
			var browsePathNode = this._browsePathComponents.browsePathNodeMap[entity.id];
			if (entity.type === 'website') {
				var node = {
					x: 0,
					y: 0,
					fillStyle: ForensicConfig.WEBSITE_ENTITY.FILL_STYLE,
					strokeStyle: ForensicConfig.WEBSITE_ENTITY.STROKE_STYLE,
					strokeSize: ForensicConfig.WEBSITE_ENTITY.STROKE_WIDTH,
					radius: DEFAULT_NODE_RADIUS,
					index: nodeIndex,
					type: entity.type,
					value: entity.value,
					col: 2,
					row: browsePathNode.row
				};
				nodes.push(node);
				nodeIndex++;
			}
		}
		return {
			nodes : nodes,
			links : []
		};
	};

	/**
	 * Renders a graph from the response to a POST request with a trail
	 * @param response - Response from '/datawake/forensic/graphservice/get' with a trail as input
	 */
	GraphView.prototype._getForensicGraph = function(response) {
		var d = new $.Deferred();

		var graph = {
			nodes : [],
			links : []
		};

		this._browsePathComponents = this._getBrowsePathGraph(response);
		this._mergeComponents(graph,this._browsePathComponents);

		this._entitiesComponents = this._getEntitiesGraph(response);
		this._mergeComponents(graph,this._entitiesComponents);

		this._relatedLinksComponents = this._getRelatedLinksGraph(response);
		this._mergeComponents(graph,this._relatedLinksComponents);

		return d.resolve({
			nodes : graph.nodes,
			links : graph.links
		});
	};

	/**
	 * Renders graph contained in forensicGraph to graphInstance
	 * @param forensicGraph - an object containing nodes and links in a format that graph.js can draw
	 * @param graphInstance - the graph object being drawn
	 */
	GraphView.prototype._renderForensicGraph = function(forensicGraph) {
		var that = this;
		this._layouter = new ForensicColumnLayout(250);
		this._graph
			.clear()
			.nodes(forensicGraph.nodes)
			.links(forensicGraph.links)
			.initializeGrouping()
			.layouter(this._layouter)
			.draw()
			.layout()
			.fit();
	};

	return GraphView;
});