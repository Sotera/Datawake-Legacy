define(['hbs!templates/graph','../util/events', '../rest/trailGraph', '../util/testData', '../layout/forensicColumnLayout', '../grouping/forensicGroupingManager', '../config/forensic_config', '../util/util'], function(graphTemplate,events,TrailGraphService,testData,ForensicColumnLayout,ForensicGroupingManager,ForensicConfig,_) {


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
		this._activeTrail = null;
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

	/**
	 * Ungroups the node on click.
	 * TODO: if this is not a cluster, do something intelligent like open the webpage?   display other info?
	 * @param node
	 * @private
	 */
	GraphView.prototype._onNodeClick = function(node) {
		this._graph.ungroup(node);
	};

	/**
	 * Mouseover event handler.   Adds a label/tooltip
	 * @param node
	 * @private
	 */
	GraphView.prototype._onNodeOver = function(node) {
		this.addLabel(node,node.labelText);
	};

	/**
	 * Node out handler.   Removes the label displayed
	 * @param node
	 * @private
	 */
	GraphView.prototype._onNodeOut = function(node) {
		this.removeLabel(node);
	};

	GraphView.prototype._showLoader = function(duration) {
		if (this._loaderAnimationId) {
			return;
		}

		_.showLoader();

		var startBlur = 0, endBlur = 5;
		var startGrayscale = 0, endGrayscale = 1;
		var startTime = (new Date()).getTime();
		var elements = $(document.body).children('div').not('#ajax_loader_overlay');

		var that = this;
		function stepAnimation() {
			var currentTime = (new Date()).getTime();
			var t = _.clamp((currentTime-startTime)/duration,0,1);
			var grayscale = _.lerp(startGrayscale,endGrayscale,t);
			var blur = _.lerp(startBlur,endBlur,t);
			var filterStr = 'blur(' + blur + 'px) grayscale(' + grayscale + ')';
			elements.css({
				'-webkit-filter' : filterStr		// TODO:  other browsers?
			});
			if (t < 1) {
				that._loaderAnimationId = window.requestAnimationFrame(stepAnimation);
			}
		}
		this._loaderAnimationId = window.requestAnimationFrame(stepAnimation);
	};

	GraphView.prototype._hideLoader = function(intervalId) {
		if (this._loaderAnimationId) {
			window.cancelAnimationFrame(this._loaderAnimationId);
		}
		$(document.body).children('div').css({
			'-webkit-filter':''
		});
		_.hideLoader();
		delete this._loaderAnimationId;
	};


	/**
	 * Handles resizing
	 * @private
	 */
	GraphView.prototype._onResize = function(event) {
		var width = window.innerWidth;
		var height = window.innerHeight - this._jqCanvas.offset().top;

		var overlay = $('#ajax_loader_overlay');
		if (overlay.length) {
			overlay.width(width).height(height).offset(this._jqCanvas.offset());
		}

		this._graph.resize(width,height);
	};

	/**
	 * Event handler for changing the active trail
	 * @param trailInfo
	 * @private
	 */
	GraphView.prototype._onTrailChange = function(trailInfo) {
		var self = this;
		this._activeTrail = trailInfo;
		this._showLoader(1000);
		TrailGraphService.get(trailInfo)
			.then(function(response) {
				self._hideLoader();
				return self._getForensicGraph(response);
			})
			.then(function(forensicGraph) {
				self._renderForensicGraph(forensicGraph);
			});
	};

	/**
	 * Fetch the trail again from the server and display it
	 * TODO:  Do something better than reset all node positions
	 */
	GraphView.prototype._onRefresh = function() {
		if (!this._activeTrail) {
			return;
		}
		//TODO:  save position of graph
		this._onTrailChange(this._activeTrail);
		// TODO:  restore position of graph
	},

	/**
	 * Fits the graph to the screen
	 * @private
	 */
	GraphView.prototype._onFit = function() {
		this._graph.fit(ForensicConfig.fitPadding);
	};

	/**
	 * Adds any event handlers for custom message passing
	 * @private
	 */
	GraphView.prototype._bindEventHandlers = function() {
		events.subscribe(events.topics.TRAIL_CHANGE,this._onTrailChange,this);
		events.subscribe(events.topics.REFRESH, this._onRefresh, this);
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
					labelText : browsePath[id].url,
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

				var node = $.extend(entity,{
					x : 0,
					y : 0,
					fillStyle: entity.type === 'email' ? ForensicConfig.EMAIL_ENTITY.FILL_STYLE : ForensicConfig.PHONE_ENTITY.FILL_STYLE,
					strokeStyle:entity.type === 'email' ? ForensicConfig.EMAIL_ENTITY.STROKE_STYLE : ForensicConfig.PHONE_ENTITY.STROKE_STYLE,
					lineWidth:entity.type === 'email' ? ForensicConfig.EMAIL_ENTITY.STROKE_WIDTH : ForensicConfig.PHONE_ENTITY.STROKE_WIDTH,
					labelText : entity.value,
					radius : DEFAULT_NODE_RADIUS,
					index : nodeIndex,
					type: entity.type,
					value : entity.value,
					col : 1,
					row : browsePathNode.row
				});
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
				var node =  $.extend(entity,{
					x: 0,
					y: 0,
					fillStyle: ForensicConfig.WEBSITE_ENTITY.FILL_STYLE,
					strokeStyle: ForensicConfig.WEBSITE_ENTITY.STROKE_STYLE,
					lineWidth: ForensicConfig.WEBSITE_ENTITY.STROKE_WIDTH,
					radius: DEFAULT_NODE_RADIUS,
					index: nodeIndex,
					labelText : entity.value,
					col: 2,
					row: browsePathNode.row
				});
				nodes.push(node);
				nodeIndex++;
			}
		}
		return {
			nodes : nodes,
			links : []			// TODO:  how to get these?
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