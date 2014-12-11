define(['hbs!templates/navbar','../util/events'], function(navbarTemplate,events) {

	/**
	 * Creates the navbar view
	 * @param element - the parent DOM element
	 * @param context - the context for the navbar view template
	 * @constructor
	 */
	function NavbarView(element,context) {
		this._canvas = null;
		this._initialize(element,context);
	}

	/**
	 * Initializes the navbar view.   Bind search functionality.   Context expects
	 * a list of trails fetched from the server
	 * @param element - the parent DOM element
	 * @param context - the context for the navbar view template
	 * @private
	 */
	NavbarView.prototype._initialize = function(element,context) {
		this._canvas = $(navbarTemplate(context));
		var inputsInDropdowns = this._canvas.find('.dropdown-menu > li > input');
		var trailSearchElement = this._canvas.find('.trailSearchInput');
		var trailSelectLinks = this._canvas.find('.trailSelectLink');
		var trailSearchDropdownToggle = this._canvas.find('.trailSearchDropdown');

		// Prevent dropdown from closing on input click
		inputsInDropdowns.click(function(e) {
			e.stopPropagation();
		});

		// Clear search filter on open
		trailSearchDropdownToggle.click(function() {
			trailSearchElement.val('');
			$('.trailSelectLink').each(function() {
				$(this).show();
			});
		});

		// Bind active search
		trailSearchElement.keyup(function(e) {
			var currentVal = trailSearchElement.val().toLowerCase();
			trailSelectLinks.each(function() {
				var trailName = $(this).html().toLowerCase();
				if (trailName.indexOf(currentVal) !== -1) {
					$(this).show();
				} else {
					$(this).hide();
				}
			});
		});

		trailSelectLinks.click(function() {
			var trailId = $(this).attr('trailId');
			var that = this;
			context.trails.forEach(function(trail) {
				if (trail.id === trailId) {
					events.publish(events.topics.TRAIL_CHANGE,trail);
					var trailLabel = $(that).html();
					trailSearchDropdownToggle.html(trailLabel);
				}
			});
		});

		this._canvas.find('.fitBtn').click(function() {
			events.publish(events.topics.FIT);
		});

		this._canvas.find('.refreshAllBtn').click(function() {
			events.publish(events.topics.REFRESH);
		});

		this._canvas.find('.toggleLegendLink').click(function() {
			events.publish(events.topics.TOGGLE_LEGEND);
		});

		this._canvas.find('.aboutLink').click(function() {
			$('.modal').show();
		});

		this._bindEventHandlers();

		this._canvas.appendTo(element);
	};

	/**
	 * Adds any event handlers for custom message passing
	 * @private
	 */
	NavbarView.prototype._bindEventHandlers = function() {

	};

	return NavbarView;
});