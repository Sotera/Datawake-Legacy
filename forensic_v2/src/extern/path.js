!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.path=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');

var NONE = [];


var Arc = function() {
  Node.apply(this, arguments);
};

Arc.prototype = _.extend(Arc.prototype, Node.prototype, {
  draw: function(ctx) {
    var source = this.source || {x:0,y:0};
    var dest = this.target || {x:0,y:0};

    ctx.beginPath();
    ctx.strokeStyle = this.strokeStyle || 'black';
    ctx.lineWidth = this.lineWidth || 1;
    ctx.setLineDash(this.lineDash || NONE);
    ctx.setLineDashOffset(this.lineDashOffset || 0);
    ctx.moveTo(source.x,source.y);
    ctx.quadraticCurveTo(source.x,dest.y,dest.x,dest.y);
    ctx.stroke();
    ctx.closePath();
  },

  hitTest: function(ctx, x, y, lx, ly) {
    // no hit testing for arcs
  }
});


module.exports = Arc;

},{"./node":8,"./util":14}],2:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');

var NONE = [];


var Arrow = function() {
  Node.apply(this, arguments);
};

Arrow.prototype = _.extend(Arrow.prototype, Node.prototype, {
  draw: function(ctx) {
    var source = this.source || {x:0,y:0};
    var dest = this.target || {x:0,y:0};
    var headlen = 10 || this.headLength;
    var headAngle = Math.PI/6 || this.headAngle;
    var headOffset = 0 || this.headOffset;

    ctx.beginPath();
    ctx.strokeStyle = this.strokeStyle || 'black';
    ctx.lineWidth = this.lineWidth || 1;
    var angle = Math.atan2(dest.y-source.y,dest.x-source.x);

    var xCompOffset = 0, yCompOffset = 0;
    if (headOffset) {
      xCompOffset = headOffset * Math.cos(angle);
      yCompOffset = headOffset * Math.sin(angle);
    }
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(dest.x, dest.y);
    ctx.moveTo(dest.x-xCompOffset,dest.y-yCompOffset);
    ctx.lineTo(dest.x-xCompOffset-headlen*Math.cos(angle-headAngle),dest.y-yCompOffset-headlen*Math.sin(angle-headAngle));
    ctx.moveTo(dest.x-xCompOffset,dest.y-yCompOffset);
    ctx.lineTo(dest.x-xCompOffset-headlen*Math.cos(angle+headAngle),dest.y-yCompOffset-headlen*Math.sin(angle+headAngle));
    ctx.stroke();
    ctx.closePath();
  },

  hitTest: function(ctx, x, y, lx, ly) {
    // no hit testing for Arrows
  }
});


module.exports = Arrow;

},{"./node":8,"./util":14}],3:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');

var NONE = [];

/**
 * Circl Node
 *
 * Properties inherited from Node: visible, x, y, rotation, scaleX, scaleY, opacity
 *
 * radius : the radius of the circle
 * (x,y) : correspond to the center of the circle
 * fillStyle, strokeStyle, lineWidth:
 *   as specified in the HTML5 Canvas API
 * lineDash: an array specifying on/off pixel pattern
 *   (e.g. [10, 5] = 10 pixels on, 5 pixels off) (not supported in all browsers)
 * lineDashOffset: a pixel offset to start the dashes (not supported in all browsers)
 *
 * Note: picking is always enabled on the entire circle (no stroke-only picking) at
 * the moment.
 */
var Circle = function() {
  Node.apply(this, arguments);
  this.radius2 = this.radius*this.radius;
};


Circle.prototype = _.extend(Circle.prototype, Node.prototype, {
  draw: function(ctx) {
    var radius = this.radius || 0;
	ctx.beginPath();
	ctx.arc(0,0, radius, 0, 2 * Math.PI, false);

    if (this.fillStyle) {
	  ctx.fillStyle = this.fillStyle;
	  ctx.fill();
    }
    if (this.strokeStyle) {
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth || 1;
      ctx.lineCap = this.lineCap || 'butt';
      ctx.lineJoin = this.lineJoin || 'miter';
      ctx.miterLimit = this.miterLimit || 10;
      ctx.setLineDash(this.lineDash || NONE);
      ctx.setLineDashOffset(this.lineDashOffset || 0);
      ctx.stroke();
    }
	ctx.closePath();

    if (this.innerLabel) {
      var fill = this.innerLabelFillStyle;
      var stroke = this.innerLabelStrokeStyle;
      var lineSize = this.innerLabelLineWidth || 1;
      var textSize = this.innerLabelTextSize || Math.floor(this.radius / 2.0);
      var fontStyle = this.innerLabelFontStyle || 'sans-serif';

      if (!fill && !stroke) {
        fill = '#000000';
        stroke = '#ffffff';
      }

      ctx.font = textSize + 'px ' + fontStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = fill;
      ctx.fillText(this.innerLabel,0,0);

      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineSize;
        ctx.strokeText(this.innerLabel,0,0);
      }


    }
  },

  hitTest: function(ctx, x, y, lx, ly) {
	var dist = lx*lx + ly*ly;
    if (dist < this.radius2) {
      return this;
    }
  }
});


module.exports = Circle;

},{"./node":8,"./util":14}],4:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');


/**
 * Group (container) node in the scenegraph. Has no visual representation.
 *
 * Properties inherited from Node: visible, x, y, rotation, scaleX, scaleY, opacity
 *
 * clip: {x, y, width, height} Specifies an optional rectangular clipping rectangle
 *   that applies to all child nodes.
 *
 * Note: applying opacity to Groups is supported but not cummulative. Specifically,
 * if a child node sets opacity it will override the group-level opacity, not
 * accumulate it. As such the group opacity simply supplies the default opacity
 * to child nodes.
 */
var Group = function() {
  Node.apply(this, arguments);

  this.children = [];
};


Group.prototype = _.extend(Group.prototype, Node.prototype, {

  /**
   * Adds a child node to this group, optionally including the `index`
   * at which to insert. If `index` is omitted, the node is added at the
   * end (visually on top) of the exist list of children.
   */
  addChild: function(child, index) {
    child.parent = this;
    if (index != null && index <= this.children.length) {
      this.children.splice(index, 0, child);
    } else {
      this.children.push(child);
    }
    return this;
  },

  /**
   * Removes a specified child from this group. If the child exists in
   * this group it is removed and returned.
   */
  removeChild: function(child) {
    // Remove child
    var idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parent = null;
      return child;
    }
  },

  /**
   * Removes all children from the group.   Returns a list of all children
   * removed.
   */
  removeAll: function() {
    var removedList = [];
    for (var i = this.children.length-1; i >= 0; i--) {
      var removed = this.removeChild(this.children[i]);
      if (removed) {
        removedList.push(removed);
      }
    }
    return removedList;
  },


  hitTest: function(ctx, x, y, lx, ly) {
    var children = this.children;
    var clip = this.clip;
    var result;

    if (this.noHit) {
      return;
    }

    if (clip) {
      if (lx < clip.x || lx > clip.x+clip.width && ly < clip.y && ly > clip.y+clip.height) {
        // Pick point is out of clip rect
        return;
      }
    }

    // Defer picking to children - start at top of stack (end of child list)
    // and work backwards, exit early if hit found
    for (var i=children.length-1; i>=0 && !result; i--) {
      result = children[i].pick(ctx, x, y, lx, ly);
    }

    return result;
  },

  draw: function(ctx) {
    var children = this.children;

    if (this.clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.clip.x, this.clip.y, this.clip.width, this.clip.height);
      ctx.clip();
    }

    // Render children from bottom-up
    for (var i=0, l=children.length; i<l; i++) {
      children[i].render(ctx);
    }

    if (this.clip) {
      ctx.restore();
    }
  }
});


module.exports = Group;

},{"./node":8,"./util":14}],5:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');

/**
 * Raster Image Node
 *
 * Properties inherited from Node: visible, x, y, rotation, scaleX, scaleY, opacity
 *
 * src: url (relative or fully qualified) from which to load image
 * width: width of the rendered representation of the image (in pixels).
 *   If unset/null, the natural width of the image will be used
 * height: height of the rendered representation of the image (in pixels).
 *   If unset/null, the natural height of the image will be used
 */
var ImageNode = function() {
  Node.apply(this, arguments);

  this._loaded = false;
};


ImageNode.prototype = _.extend(ImageNode.prototype, Node.prototype, {
  draw: function(ctx) {
    var self;

    if (this._image && this._image.loaded) {
      // Image
      if (this.width != null || this.height != null) {
        ctx.drawImage(this._image, 0, 0, this.width, this.height);
      } else {
        ctx.drawImage(this._image, 0, 0);
      }
    } else if (!this._image) {
      self = this;
      this._image = new Image();
      this._image.onload = function() {
        // Only render scene if loaded image is still part of it
        if (this === self._image) {
          self._image.loaded = true;
          self.trigger('update');
        }
      };
      this._image.src = this.src;
    }
  },

  hitTest: function(ctx, x, y, lx, ly) {
    var width = this.width || (this._image && this._image.width);
    var height = this.height || (this._image && this._image.height);

    if (lx >= 0 && lx < width && ly >= 0 && ly < height) {
      return this;
    }
  }
});


Object.defineProperty(ImageNode.prototype, 'src', {
  get: function() {
    return this._src;
  },
  set: function(value) {
    if (this._src !== value) {
      this._src = value;
      this._image = null;
    }
  }
});


module.exports = ImageNode;
},{"./node":8,"./util":14}],6:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');

var NONE = [];

/**
 * Rectangle Node
 *
 * Properties inherited from Node: visible, x, y, rotation, scaleX, scaleY, opacity
 *
 * width: width of the rectangle
 * height: height of the rectangle
 * fillStyle, strokeStyle, lineWidth, lineCap, lineJoin, miterLimit:
 *   as specified in the HTML5 Canvas API
 * lineDash: an array specifying on/off pixel pattern
 *   (e.g. [10, 5] = 10 pixels on, 5 pixels off) (not supported in all browsers)
 * lineDashOffset: a pixel offset to start the dashes (not supported in all browsers)
 *
 * Note: picking is always enabled on the entire rect (no stroke-only picking) at
 * the moment.
 */
var Line = function() {
  Node.apply(this, arguments);
};

Line.prototype = _.extend(Line.prototype, Node.prototype, {
  draw: function(ctx) {
    var source = this.source || {x:0,y:0};
    var dest = this.target || {x:0,y:0};
    ctx.beginPath();
    ctx.strokeStyle = this.strokeStyle || 'black';
    ctx.lineWidth = this.lineWidth || 1;
    ctx.setLineDash(this.lineDash || NONE);
    ctx.setLineDashOffset(this.lineDashOffset || 0);
    ctx.moveTo(source.x,source.y);
    ctx.lineTo(dest.x,dest.y);
    ctx.stroke();
    ctx.closePath();
  },

  hitTest: function(ctx, x, y, lx, ly) {
    // no hit testing for lines
  }
});


module.exports = Line;

},{"./node":8,"./util":14}],7:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var polyfill = _dereq_('./polyfills');
var Group = _dereq_('./group');

/**
 * Constructs a new scenegraph root element which implements an extended
 * Group interface. Expects a `canvas` HTML element.
 */
var Path = function(element) {
  // Autoinstantiate
  if (!(this instanceof Path)) {
    return new Path(element);
  }
  Group.apply(this);

  var self = this;

  this.el = element;
  this.context = element.getContext("2d");

  // Add helper polyfills to context instance
  polyfill.dashSupport(this.context);

  // Offset by 1/2 pixel to align with pixel edges
  // http://diveintohtml5.info/canvas.html#pixel-madness
  this.x = 0.5;
  this.y = 0.5;

  this.zoomLevel = 1.0;

  // Bind members for convenient callback
  this.update = this.update.bind(this);
  this._handle = this._handle.bind(this);
  this._mousemove = this._mousemove.bind(this);

  // Register event listeners on canvas that use picker to hittest
  ['click', 'dblclick', 'mousedown', 'mouseup'].forEach(function(type) {
    self.el.addEventListener(type, self._handle);
  });
  this.el.addEventListener('mousemove', this._mousemove);

  // Listen for update requests from scenegraph, defer by a frame, coalesce
  this._pendingUpdate = null;
  this.on('update', function() {
    if (!self._pendingUpdate) {
      self._pendingUpdate = polyfill.requestAnimationFrame( self.update );
    }
  });
  // Create animate-update function once
  this._animUpdate = function() {
    TWEEN.update();
    self.update();
  };

  // Resize to current DOM-specified sizing
  this.resize();
};


_.extend(Path.prototype, Group.prototype, {
  /**
   * Resize or update the size of the canvas. Calling this function will fix
   * the css-style-specified size of the canvas element. Call `update()`
   * to cause the canvas to rerender at the new size.
   *
   * Strict sizing is necessary to set the canvas width/height pixel count
   * to the correct value for the canvas element DOM size and device pixel
   * ratio.
   */
  resize: function(w, h) {
    // TODO this may not be reliable on mobile
    this.devicePixelRatio = window.devicePixelRatio || 1;

    this.width = w || this.el.clientWidth;
    this.height = h || this.el.clientHeight;

    this.el.style.width = this.width + 'px';
    this.el.style.height = this.height + 'px';
  },

  /**
   * Causes the canvas to render synchronously. If any animations are active/pending
   * this will kick off a series of automatic updates until the animations all
   * complete.
   */
  update: function() {
    // Update size to equal displayed pixel size + clear
    this.context.canvas.width = this.width * this.devicePixelRatio;
    this.context.canvas.height = this.height * this.devicePixelRatio;
    if (this.devicePixelRatio != 1) {
      this.context.save();
      this.context.scale(this.devicePixelRatio, this.devicePixelRatio);
    }

    this._pendingUpdate = null;

    // Active animations? schedule tween update + render on next frame
    if (window.TWEEN && TWEEN.getAll().length > 0) {
      // XXX Could be an existing pending update
      this._pendingUpdate = polyfill.requestAnimationFrame(this._animUpdate);
    }

    this.render(this.context);

    if (this.devicePixelRatio != 1) {
      this.context.restore();
    }
  },

  zoomIn: function(x,y) {
	this.zoomLevel++;
	this.zoom(this.zoomLevel,x,y);
  },
  zoomOut: function(x,y) {
	this.zoomLevel--;
	this.zoom(this.zoomLevel,x,y);
  },

  zoom: function(level,x,y) {
    this.scaleX = level;
    this.scaleY = level;
	this.update();
  },

  // General handler for simple events (click, mousedown, etc)
  _handle: function(e) {
    var hit = this.pick(this.context, e.offsetX, e.offsetY, e.offsetX, e.offsetY);
    if (hit) {
      e.targetNode = hit;
      hit.trigger(e.type, e);
    }
  },

  _mousemove: function(e) {
    var hit = this.pick(this.context, e.offsetX, e.offsetY, e.offsetX, e.offsetY);
    if (hit) {
      e.targetNode = hit;
    }
    // Manage mouseout/mouseover
    // TODO create new event objects with correct event type
    if (this._lastover != hit) {
      if (this._lastover) {
        e.targetNode = this._lastover;
        this._lastover.trigger('mouseout', e);
        e.targetNode = hit;
      }
      this._lastover = hit;
      if (hit) {
        hit.trigger('mouseover', e);
      }
    }
    // Always send mousemove last
    if (hit) {
      hit.trigger('mousemove', e);
    }
    // TODO Handle mouse leaving canvas
  }
});



// STATIC

// Add library constructs to namespace
var namespaceConstructors = {
  rect: _dereq_('./rect'),
  path: _dereq_('./path'),
  text: _dereq_('./text'),
  image: _dereq_('./image'),
  circle: _dereq_('./circle'),
  line: _dereq_('./line'),
  arc: _dereq_('./arc'),
  arrow: _dereq_('./arrow'),
  group: Group
};

for (attr in namespaceConstructors) {
  Path[attr] = (function(attr) {
    return function(props) {
      return new namespaceConstructors[attr](props);
    };
  }(attr));
}


module.exports = Path;

},{"./arc":1,"./arrow":2,"./circle":3,"./group":4,"./image":5,"./line":6,"./path":9,"./polyfills":10,"./rect":11,"./text":13,"./util":14}],8:[function(_dereq_,module,exports){
var _ = _dereq_('./util');

var ID = 0;

/**
 * Base Node object for all scenegraph objects
 *
 * id: non-visual, unique value for all nodes
 * visible: if false, this node (and descendents) will not render nor pick
 * x: the x position (translation) applied to this node
 * y: the y position (translation) applied to this node
 * rotation: rotation in radians applied to this node and any descendents
 * scaleX, scaleY: x and y scale applied to this node and any descendents
 * opacity: the global opacity [0,1] of this node
 */
var Node = function(attributes) {
  this.id = ID++;
  this.parent = null;
  this.visible = true;
  this.handlers = {};

  _.extend(this, attributes);
};

var getEasingBase = function(name) {
	var stringMap = {
		'back': TWEEN.Easing.Back,
		'bounce': TWEEN.Easing.Bounce,
		'circular': TWEEN.Easing.Circular,
		'cubic': TWEEN.Easing.Cubic,
		'elastic': TWEEN.Easing.Elastic,
		'exponential': TWEEN.Easing.Exponential,
		'linear': TWEEN.Easing.Linear,
		'quadratic': TWEEN.Easing.Quadratic,
		'quartic': TWEEN.Easing.Quartic,
		'quintic': TWEEN.Easing.Quintic
	};
	for (var ease in stringMap) {
		if (stringMap.hasOwnProperty(ease)) {
			if (name.indexOf(ease)!==-1) {
				return stringMap[ease];
			}
		}
	}
	return TWEEN.Easing.Linear;
};

var getEasingFunction = function(name){
	name = name.toLowerCase();
	var easeBase = getEasingBase(name);
	var ease = null;
	if (name.indexOf('inout')!=-1) {
		ease = easeBase.InOut
	} else if (name.indexOf('in')!=-1) {
		ease = easeBase.In;
	} else if (name.indexOf('out')!=-1) {
		ease = easeBase.Out;
	}
	if (!ease) {
		ease = easeBase.None;
	}
	return ease;
};

Node.prototype = {
  /**
   * Simple
   */
  data: function(data) {
    if (arguments.length === 0) {
      return this._data;
    } else {
      this._data = data;
    }
  },

  /**
   * Bulk sets a group of node properties, takes a map of property names
   * to values. Functionally equivalent to setting each property via
   * `node.propertyName = value`
   */
  attr: function(attributes) {
    _.extend(this, attributes);
    return this;
  },

  tweenObj: function(baseProp,attributes,transition) {
	  this.tweenAttr.call(this[baseProp],attributes,transition);
  },

  /**
   * Queues a set of node properties for an animated transition. Only
   * numeric properties can be animated. The length of the transition
   * is specified in the transition property, defaults to 1 second. An
   * optional callback can be provided which will be called on animation
   * completion.
   *
   * Calling `update()` on the scene root will trigger the start of all
   * queued animations and cause them to run (and render) to completion.
   */
  tweenAttr: function(attributes, transition) {
    var self = this;
    var key, statics;
    transition = transition || {};

    // Only support tweening numbers - statically set everything else
    for (key in attributes) {
      if (attributes.hasOwnProperty(key) && typeof attributes[key] != 'number') {
        statics = statics || {};
        statics[key] = attributes[key];
        delete attributes[key];
      }
    }

    if (statics) {
      this.attr(statics);
    }

    if (this.tween) {
      // TODO Jump to end state of vars not being transitioned
      this.tween.stop();
    }

    this.tween = new TWEEN.Tween(this)
      .to(attributes, transition.duration || 1000)
	  .easing(getEasingFunction(transition.easing || 'linear'))
      .onComplete(function() {
        self.tween = null;
        if (transition.callback) {
          transition.callback(this, attributes);
        }
      })
      .start();
  },

  /**
   * Adds an event handler to this node. For example:
   * ```
   * node.on('click', function(event) {
   *   // do something
   * });
   * ```
   * An event object will be passed to the handler when the event
   * is triggered. The event object will be a standard JavaScript
   * event and will contain a `targetNode` property containing the
   * node that was the source of the event. Events bubble up the
   * scenegraph until handled. Handlers returning a truthy value
   * signal that the event has been handled.
   */
  on: function(type, handler) {
    var handlers = this.handlers[type];
    if (!handlers) {
      handlers = this.handlers[type] = [];
    }
    handlers.push(handler);
    return this;
  },

  /**
   * Removes an event handler of the given type. If no handler is
   * provided, all handlers of the type will be removed.
   */
  off: function(type, handler) {
    if (!handler) {
      this.handlers[type] = [];
    } else {
      var handlers = this.handlers[type];
      var idx = handlers.indexOf(handler);
      if (idx >= 0) {
        handlers.splice(idx, 1);
      }
    }
    return this;
  },

  /**
   * Triggers an event and begins bubbling. Returns truthy if the
   * event was handled.
   */
  trigger: function(type, event) {
    var handled = false;
    var handlers = this.handlers[type];

    if (handlers) {
      handlers.forEach(function(handler) {
        handled = handler(event) || handled;
      });
    }

    if (!handled && this.parent) {
      handled = this.parent.trigger(type, event);
    }

    return handled;
  },

  /**
   * Removes this node from its parent
   */
  remove: function() {
    if (this.parent) {
      this.parent.remove(this);
    }
  },

  /**
   * Internal: renders the node given the context
   */
  render: function(ctx) {
    if (!this.visible) {
      return;
    }

    var x = this.x || 0;
    var y = this.y || 0;
    var scaleX = this.scaleX == null ? 1 : this.scaleX;
    var scaleY = this.scaleY == null ? 1 : this.scaleY;
    var transformed = !!x || !!y || !!this.rotation || scaleX !== 1 || scaleY !== 1 || this.opacity != null;

    // TODO Investigate cost of always save/restore
    if (transformed) {
      ctx.save();
    }

    if (x || y) {
      ctx.translate(x,y);
    }

    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
    }

    if (this.rotation) {
      ctx.rotate(this.rotation);
    }

    if (this.opacity != null) {
      ctx.globalAlpha = this.opacity;
    }

    this.draw(ctx);

    if (transformed) {
      ctx.restore();
    }
  },

  /**
   * Internal: tests for pick hit given context, global and local
   * coordinate system transformed pick coordinates.
   */
  pick: function(ctx, x, y, lx, ly) {
    if (!this.visible) {
      return;
    }

    var result = null;
    var s, c, temp;

    var tx = this.x || 0;
    var ty = this.y || 0;
    var scaleX = this.scaleX == null ? 1 : this.scaleX;
    var scaleY = this.scaleY == null ? 1 : this.scaleY;
    var transformed = !!tx || !!ty || !!this.rotation || scaleX !== 1 || scaleY !== 1 || this.opacity != null;

    // TODO Investigate cost of always save/restore
    if (transformed) {
      ctx.save();
    }

    if (tx || ty) {
      ctx.translate(tx,ty);
      // Reverse translation on picked point
      lx -= tx;
      ly -= ty;
    }

    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
      // Reverse scale
      lx /= scaleX;
      ly /= scaleY;
    }

    if (this.rotation) {
      ctx.rotate(this.rotation);
      // Reverse rotation
      s = Math.sin(-this.rotation);
      c = Math.cos(-this.rotation);
      temp = c*lx - s*ly;
      ly = s*lx + c*ly;
      lx = temp;
    }

    result = this.hitTest(ctx, x, y, lx, ly);

    if (transformed) {
      ctx.restore();
    }

    return result;
  },

  /**
   * Template method for derived objects to actually perform draw operations.
   * The calling `render` call handles general transforms and opacity.
   */
  draw: function(ctx) {
    // template method
  },

  /**
   * Template method for derived objects to test if they (or child) is hit by
   * the provided pick coordinate. If hit, return object that was hit.
   */
  hitTest: function(ctx, x, y, lx, ly) {
    // template method
  }
}

module.exports = Node;
},{"./util":14}],9:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');
var svg = _dereq_('./svg');


var NONE = [];

/**
 * Vector Path Node
 *
 * Properties inherited from Node: visible, x, y, rotation, scaleX, scaleY, opacity
 *
 * path: a valid SVG path string (e.g. 'M-5,0A5,5,0,0,1,5,0A5,5,0,0,1,-5,0Z')
 *   to draw
 * fillStyle, strokeStyle, lineWidth, lineCap, lineJoin, miterLimit:
 *   as specified in the HTML5 Canvas API
 * lineDash: an array specifying on/off pixel pattern
 *   (e.g. [10, 5] = 10 pixels on, 5 pixels off) (not supported in all browsers)
 * lineDashOffset: a pixel offset to start the dashes (not supported in all browsers)
 *
 * Note: if `strokeStyle` is specified, picking will be enabled on the path stroke/outline.
 * If `fillStyle` is specified, picking will be enabled on the interior filled area
 * of the path.
 */
var Path = function() {
  Node.apply(this, arguments);
};


Path.prototype = _.extend(Path.prototype, Node.prototype, {

  sketch: function(ctx) {
    var path = this.path;
    if (path && path.length > 0) {
      var pathCommands = this._commandCache || (this._commandCache = svg.parse(path));
      svg.render(ctx, pathCommands);
    }
  },

  draw: function(ctx) {
    if (this.fillStyle) {
      ctx.fillStyle = this.fillStyle;
    }

    if (this.strokeStyle) {
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth || 1;
      ctx.lineCap = this.lineCap || 'butt';
      ctx.lineJoin = this.lineJoin || 'miter';
      ctx.miterLimit = this.miterLimit || 10;
      ctx.setLineDash(this.lineDash || NONE);
      ctx.setLineDashOffset(this.lineDashOffset || 0);
    }

    this.sketch(ctx);

    if (this.strokeStyle) {
      ctx.stroke();
    }
    if (this.fillStyle) {
      ctx.fill();
    }
  },

  hitTest: function(ctx, x, y, lx, ly) {
    this.sketch(ctx);

    if (this.fillStyle && ctx.isPointInPath(x,y)) {
      return this;
    }
    if (this.strokeStyle && ctx.isPointInStroke(x,y)) {
      return this;
    }
  }
});


Object.defineProperty(Path.prototype, 'path', {
  get: function() {
    return this._path;
  },
  set: function(value) {
    if (this._path !== value) {
      this._path = value;
      this._commandCache = null;
    }
  }
});


module.exports = Path;
},{"./node":8,"./svg":12,"./util":14}],10:[function(_dereq_,module,exports){

// ----
// requestAnimationFrame

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

// MIT license

var rAF = (function() {
  var rAF;

  if (window.requestAnimationFrame) {
    rAF = window.requestAnimationFrame.bind(window);
  }

  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for(var x = 0; x < vendors.length && !rAF; ++x) {
    rAF = window[vendors[x]+'RequestAnimationFrame'];
  }

  if (!rAF)
    rAF = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };

  return rAF;
}());


// ----
// Dash support for canvas context

var dashSupport = function(ctx) {
  var NOOP = function(){};

  if (ctx.setLineDash) {
    ctx.setLineDashOffset = function(off) { this.lineDashOffset = off; };
  } else if (ctx.webkitLineDash !== undefined) {
    ctx.setLineDash = function(dash) { this.webkitLineDash = dash; };
    ctx.setLineDashOffset = function(off) { this.webkitLineDashOffset = off; };
  } else if (ctx.mozDash !== undefined) {
    ctx.setLineDash = function(dash) { this.mozDash = dash; };
    ctx.setLineDashOffset = NOOP;
  } else {
    ctx.setLineDash = NOOP;
    ctx.setLineDashOffset = NOOP;
  }
};

module.exports = {
  requestAnimationFrame: rAF,
  dashSupport: dashSupport
};
},{}],11:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');

var NONE = [];

/**
 * Rectangle Node
 *
 * Properties inherited from Node: visible, x, y, rotation, scaleX, scaleY, opacity
 *
 * width: width of the rectangle
 * height: height of the rectangle
 * fillStyle, strokeStyle, lineWidth, lineCap, lineJoin, miterLimit:
 *   as specified in the HTML5 Canvas API
 * lineDash: an array specifying on/off pixel pattern
 *   (e.g. [10, 5] = 10 pixels on, 5 pixels off) (not supported in all browsers)
 * lineDashOffset: a pixel offset to start the dashes (not supported in all browsers)
 *
 * Note: picking is always enabled on the entire rect (no stroke-only picking) at
 * the moment.
 */
var Rect = function() {
  Node.apply(this, arguments);
};


Rect.prototype = _.extend(Rect.prototype, Node.prototype, {
  draw: function(ctx) {
    var width = this.width || 0;
    var height = this.height || 0;

    if (this.fillStyle) {
      ctx.fillStyle = this.fillStyle;
      ctx.fillRect(0, 0, width, height);
    }
    if (this.strokeStyle) {
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth || 1;
      ctx.lineCap = this.lineCap || 'butt';
      ctx.lineJoin = this.lineJoin || 'miter';
      ctx.miterLimit = this.miterLimit || 10;
      ctx.setLineDash(this.lineDash || NONE);
      ctx.setLineDashOffset(this.lineDashOffset || 0);
      ctx.strokeRect(0, 0, width, height);
    }
  },

  hitTest: function(ctx, x, y, lx, ly) {
    var width = this.width || 0;
    var height = this.height || 0;

    if (lx >= 0 && lx < width && ly >= 0 && ly < height) {
      return this;
    }
  }
});


module.exports = Rect;
},{"./node":8,"./util":14}],12:[function(_dereq_,module,exports){
/**
  SVG path to canvas path sketching, taken and adapted from:
   - Vega: github.com/trifacta/vega
     License: https://github.com/trifacta/vega/blob/master/LICENSE
   - Fabric.js: github.com/kangax/fabric.js/blob/master/src/shapes/path.class.js
     License: https://github.com/kangax/fabric.js/blob/master/LICENSE
*/


// Path parsing and rendering code taken from fabric.js -- Thanks!
var commandLengths = { m:2, l:2, h:1, v:1, c:6, s:4, q:4, t:2, a:7 },
    repeatedCommands = { m: 'l', M: 'L' },
    tokenizer = /[mzlhvcsqta][^mzlhvcsqta]*/gi,
    digits = /([-+]?((\d+\.\d+)|((\d+)|(\.\d+)))(?:e[-+]?\d+)?)/ig;

function parse(path) {
  var result = [ ],
      coords = [ ],
      currentPath,
      parsed,
      match,
      coordsStr;

  // First, break path into command sequence
  path = path.match(tokenizer);

  // Next, parse each command in turn
  for (var i = 0, coordsParsed, len = path.length; i < len; i++) {
    currentPath = path[i];

    coordsStr = currentPath.slice(1).trim();
    coords.length = 0;

    while ((match = digits.exec(coordsStr))) {
      coords.push(match[0]);
    }

    coordsParsed = [ currentPath.charAt(0) ];

    for (var j = 0, jlen = coords.length; j < jlen; j++) {
      parsed = parseFloat(coords[j]);
      if (!isNaN(parsed)) {
        coordsParsed.push(parsed);
      }
    }

    var command = coordsParsed[0],
        commandLength = commandLengths[command.toLowerCase()],
        repeatedCommand = repeatedCommands[command] || command;

    if (coordsParsed.length - 1 > commandLength) {
      for (var k = 1, klen = coordsParsed.length; k < klen; k += commandLength) {
        result.push([ command ].concat(coordsParsed.slice(k, k + commandLength)));
        command = repeatedCommand;
      }
    }
    else {
      result.push(coordsParsed);
    }
  }

  return result;
}

function drawArc(g, x, y, coords, bounds, l, t) {
  var rx = coords[0];
  var ry = coords[1];
  var rot = coords[2];
  var large = coords[3];
  var sweep = coords[4];
  var ex = coords[5];
  var ey = coords[6];
  var segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
  for (var i=0; i<segs.length; i++) {
    var bez = segmentToBezier.apply(null, segs[i]);
    g.bezierCurveTo.apply(g, bez);
    // bounds.add(bez[0]-l, bez[1]-t);
    // bounds.add(bez[2]-l, bez[3]-t);
    // bounds.add(bez[4]-l, bez[5]-t);
  }
}

function boundArc(x, y, coords, bounds) {
  var rx = coords[0];
  var ry = coords[1];
  var rot = coords[2];
  var large = coords[3];
  var sweep = coords[4];
  var ex = coords[5];
  var ey = coords[6];
  var segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
  for (var i=0; i<segs.length; i++) {
    var bez = segmentToBezier.apply(null, segs[i]);
    // bounds.add(bez[0], bez[1]);
    // bounds.add(bez[2], bez[3]);
    // bounds.add(bez[4], bez[5]);
  }
}

var arcToSegmentsCache = { },
    segmentToBezierCache = { },
    join = Array.prototype.join,
    argsStr;

// Copied from Inkscape svgtopdf, thanks!
function arcToSegments(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
  argsStr = join.call(arguments);
  if (arcToSegmentsCache[argsStr]) {
    return arcToSegmentsCache[argsStr];
  }

  var th = rotateX * (Math.PI/180);
  var sin_th = Math.sin(th);
  var cos_th = Math.cos(th);
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
  var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
  var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry);
  if (pl > 1) {
    pl = Math.sqrt(pl);
    rx *= pl;
    ry *= pl;
  }

  var a00 = cos_th / rx;
  var a01 = sin_th / rx;
  var a10 = (-sin_th) / ry;
  var a11 = (cos_th) / ry;
  var x0 = a00 * ox + a01 * oy;
  var y0 = a10 * ox + a11 * oy;
  var x1 = a00 * x + a01 * y;
  var y1 = a10 * x + a11 * y;

  var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0);
  var sfactor_sq = 1 / d - 0.25;
  if (sfactor_sq < 0) sfactor_sq = 0;
  var sfactor = Math.sqrt(sfactor_sq);
  if (sweep == large) sfactor = -sfactor;
  var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0);
  var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0);

  var th0 = Math.atan2(y0-yc, x0-xc);
  var th1 = Math.atan2(y1-yc, x1-xc);

  var th_arc = th1-th0;
  if (th_arc < 0 && sweep == 1){
    th_arc += 2*Math.PI;
  } else if (th_arc > 0 && sweep == 0) {
    th_arc -= 2 * Math.PI;
  }

  var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
  var result = [];
  for (var i=0; i<segments; i++) {
    var th2 = th0 + i * th_arc / segments;
    var th3 = th0 + (i+1) * th_arc / segments;
    result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th];
  }

  return (arcToSegmentsCache[argsStr] = result);
}

function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
  argsStr = join.call(arguments);
  if (segmentToBezierCache[argsStr]) {
    return segmentToBezierCache[argsStr];
  }

  var a00 = cos_th * rx;
  var a01 = -sin_th * ry;
  var a10 = sin_th * rx;
  var a11 = cos_th * ry;

  var cos_th0 = Math.cos(th0);
  var sin_th0 = Math.sin(th0);
  var cos_th1 = Math.cos(th1);
  var sin_th1 = Math.sin(th1);

  var th_half = 0.5 * (th1 - th0);
  var sin_th_h2 = Math.sin(th_half * 0.5);
  var t = (8/3) * sin_th_h2 * sin_th_h2 / Math.sin(th_half);
  var x1 = cx + cos_th0 - t * sin_th0;
  var y1 = cy + sin_th0 + t * cos_th0;
  var x3 = cx + cos_th1;
  var y3 = cy + sin_th1;
  var x2 = x3 + t * sin_th1;
  var y2 = y3 - t * cos_th1;

  return (segmentToBezierCache[argsStr] = [
    a00 * x1 + a01 * y1,  a10 * x1 + a11 * y1,
    a00 * x2 + a01 * y2,  a10 * x2 + a11 * y2,
    a00 * x3 + a01 * y3,  a10 * x3 + a11 * y3
  ]);
}

function render(g, path, l, t) {
  var current, // current instruction
      previous = null,
      x = 0, // current x
      y = 0, // current y
      controlX = 0, // current control point x
      controlY = 0, // current control point y
      tempX,
      tempY,
      tempControlX,
      tempControlY,
      bounds;
  if (l == undefined) l = 0;
  if (t == undefined) t = 0;

  g.beginPath();

  for (var i=0, len=path.length; i<len; ++i) {
    current = path[i];

    switch (current[0]) { // first letter

      case 'l': // lineto, relative
        x += current[1];
        y += current[2];
        g.lineTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'L': // lineto, absolute
        x = current[1];
        y = current[2];
        g.lineTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'h': // horizontal lineto, relative
        x += current[1];
        g.lineTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'H': // horizontal lineto, absolute
        x = current[1];
        g.lineTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'v': // vertical lineto, relative
        y += current[1];
        g.lineTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'V': // verical lineto, absolute
        y = current[1];
        g.lineTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'm': // moveTo, relative
        x += current[1];
        y += current[2];
        g.moveTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'M': // moveTo, absolute
        x = current[1];
        y = current[2];
        g.moveTo(x + l, y + t);
        // bounds.add(x, y);
        break;

      case 'c': // bezierCurveTo, relative
        tempX = x + current[5];
        tempY = y + current[6];
        controlX = x + current[3];
        controlY = y + current[4];
        g.bezierCurveTo(
          x + current[1] + l, // x1
          y + current[2] + t, // y1
          controlX + l, // x2
          controlY + t, // y2
          tempX + l,
          tempY + t
        );
        // bounds.add(x + current[1], y + current[2]);
        // bounds.add(controlX, controlY);
        // bounds.add(tempX, tempY);
        x = tempX;
        y = tempY;
        break;

      case 'C': // bezierCurveTo, absolute
        x = current[5];
        y = current[6];
        controlX = current[3];
        controlY = current[4];
        g.bezierCurveTo(
          current[1] + l,
          current[2] + t,
          controlX + l,
          controlY + t,
          x + l,
          y + t
        );
        // bounds.add(current[1], current[2]);
        // bounds.add(controlX, controlY);
        // bounds.add(x, y);
        break;

      case 's': // shorthand cubic bezierCurveTo, relative
        // transform to absolute x,y
        tempX = x + current[3];
        tempY = y + current[4];
        // calculate reflection of previous control points
        controlX = 2 * x - controlX;
        controlY = 2 * y - controlY;
        g.bezierCurveTo(
          controlX + l,
          controlY + t,
          x + current[1] + l,
          y + current[2] + t,
          tempX + l,
          tempY + t
        );
        // bounds.add(controlX, controlY);
        // bounds.add(x + current[1], y + current[2]);
        // bounds.add(tempX, tempY);

        // set control point to 2nd one of this command
        // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
        controlX = x + current[1];
        controlY = y + current[2];

        x = tempX;
        y = tempY;
        break;

      case 'S': // shorthand cubic bezierCurveTo, absolute
        tempX = current[3];
        tempY = current[4];
        // calculate reflection of previous control points
        controlX = 2*x - controlX;
        controlY = 2*y - controlY;
        g.bezierCurveTo(
          controlX + l,
          controlY + t,
          current[1] + l,
          current[2] + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        // bounds.add(current[1], current[2]);
        // bounds.add(controlX, controlY);
        // bounds.add(tempX, tempY);
        // set control point to 2nd one of this command
        // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
        controlX = current[1];
        controlY = current[2];

        break;

      case 'q': // quadraticCurveTo, relative
        // transform to absolute x,y
        tempX = x + current[3];
        tempY = y + current[4];

        controlX = x + current[1];
        controlY = y + current[2];

        g.quadraticCurveTo(
          controlX + l,
          controlY + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        // bounds.add(controlX, controlY);
        // bounds.add(tempX, tempY);
        break;

      case 'Q': // quadraticCurveTo, absolute
        tempX = current[3];
        tempY = current[4];

        g.quadraticCurveTo(
          current[1] + l,
          current[2] + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        controlX = current[1];
        controlY = current[2];
        // bounds.add(controlX, controlY);
        // bounds.add(tempX, tempY);
        break;

      case 't': // shorthand quadraticCurveTo, relative

        // transform to absolute x,y
        tempX = x + current[1];
        tempY = y + current[2];

        if (previous[0].match(/[QqTt]/) === null) {
          // If there is no previous command or if the previous command was not a Q, q, T or t,
          // assume the control point is coincident with the current point
          controlX = x;
          controlY = y;
        }
        else if (previous[0] === 't') {
          // calculate reflection of previous control points for t
          controlX = 2 * x - tempControlX;
          controlY = 2 * y - tempControlY;
        }
        else if (previous[0] === 'q') {
          // calculate reflection of previous control points for q
          controlX = 2 * x - controlX;
          controlY = 2 * y - controlY;
        }

        tempControlX = controlX;
        tempControlY = controlY;

        g.quadraticCurveTo(
          controlX + l,
          controlY + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        controlX = x + current[1];
        controlY = y + current[2];
        // bounds.add(controlX, controlY);
        // bounds.add(tempX, tempY);
        break;

      case 'T':
        tempX = current[1];
        tempY = current[2];

        // calculate reflection of previous control points
        controlX = 2 * x - controlX;
        controlY = 2 * y - controlY;
        g.quadraticCurveTo(
          controlX + l,
          controlY + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        // bounds.add(controlX, controlY);
        // bounds.add(tempX, tempY);
        break;

      case 'a':
        drawArc(g, x + l, y + t, [
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6] + x + l,
          current[7] + y + t
        ], bounds, l, t);
        x += current[6];
        y += current[7];
        break;

      case 'A':
        drawArc(g, x + l, y + t, [
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6] + l,
          current[7] + t
        ], bounds, l, t);
        x = current[6];
        y = current[7];
        break;

      case 'z':
      case 'Z':
        g.closePath();
        break;
    }
    previous = current;
  }
  return; // bounds.translate(l, t);
}

module.exports = {
  parse:  parse,
  render: render
};

},{}],13:[function(_dereq_,module,exports){
var _ = _dereq_('./util');
var Node = _dereq_('./node');


/**
 * Text Node
 *
 * Properties inherited from Node: visible, x, y, rotation, scaleX, scaleY, opacity
 *
 * font: Canvas-API formatted font string, for example 'bold 12px serif'
 * textAlign, textBaseline: as specified in the HTML5 Canvas API
 * fillStyle, strokeStyle, lineWidth, lineCap, lineJoin: as specified in the HTML5 Canvas API
 */
var Text = function() {
  Node.apply(this, arguments);
};


Text.prototype = _.extend(Text.prototype, Node.prototype, {
  draw: function(ctx) {
    ctx.font = this.font || '10px sans-serif';
    ctx.textAlign = this.textAlign || 'start';
    ctx.textBaseline = this.textBaseline || 'alphabetic';

    if (this.fillStyle) {
      ctx.fillStyle = this.fillStyle;
      ctx.fillText(this.text, 0, 0);
    }
    if (this.strokeStyle) {
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth || 1;
      ctx.lineCap = this.lineCap || 'butt';
      ctx.lineJoin = this.lineJoin || 'miter';
      ctx.strokeText(this.text, 0, 0);
    }
  },

  hitTest: function(ctx, x, y, lx, ly) {
    // XXX Size calculations - font, font-size, height
    var width = ctx.measureText(this.text);
    var height = 10;

    if (lx >= 0 && lx < width && ly >= 0 && ly < height) {
      return this;
    }
  }
});


module.exports = Text;
},{"./node":8,"./util":14}],14:[function(_dereq_,module,exports){

var Util = {

  extend: function(dest, sources) {
    var key, i, source;
    for (i=1; i<arguments.length; i++) {
      source = arguments[i];
      for (key in source) {
        if (source.hasOwnProperty(key)) {
          dest[key] = source[key];
        }
      }
    }
    return dest;
  }
};

module.exports = Util;
},{}]},{},[7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFx3b3Jrc3BhY2VcXHBhdGhqc1xcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9hcmMuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9hcnJvdy5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL2NpcmNsZS5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL2dyb3VwLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvaW1hZ2UuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9saW5lLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvbWFpbi5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL25vZGUuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9wYXRoLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvcG9seWZpbGxzLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvcmVjdC5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL3N2Zy5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL3RleHQuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xyXG5cclxudmFyIE5PTkUgPSBbXTtcclxuXHJcblxyXG52YXIgQXJjID0gZnVuY3Rpb24oKSB7XHJcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59O1xyXG5cclxuQXJjLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEFyYy5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XHJcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XHJcbiAgICB2YXIgc291cmNlID0gdGhpcy5zb3VyY2UgfHwge3g6MCx5OjB9O1xyXG4gICAgdmFyIGRlc3QgPSB0aGlzLnRhcmdldCB8fCB7eDowLHk6MH07XHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZSB8fCAnYmxhY2snO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XHJcbiAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcclxuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCh0aGlzLmxpbmVEYXNoT2Zmc2V0IHx8IDApO1xyXG4gICAgY3R4Lm1vdmVUbyhzb3VyY2UueCxzb3VyY2UueSk7XHJcbiAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhzb3VyY2UueCxkZXN0LnksZGVzdC54LGRlc3QueSk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgfSxcclxuXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuICAgIC8vIG5vIGhpdCB0ZXN0aW5nIGZvciBhcmNzXHJcbiAgfVxyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFyYztcclxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcbnZhciBOT05FID0gW107XHJcblxyXG5cclxudmFyIEFycm93ID0gZnVuY3Rpb24oKSB7XHJcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59O1xyXG5cclxuQXJyb3cucHJvdG90eXBlID0gXy5leHRlbmQoQXJyb3cucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xyXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMuc291cmNlIHx8IHt4OjAseTowfTtcclxuICAgIHZhciBkZXN0ID0gdGhpcy50YXJnZXQgfHwge3g6MCx5OjB9O1xyXG4gICAgdmFyIGhlYWRsZW4gPSAxMCB8fCB0aGlzLmhlYWRMZW5ndGg7XHJcbiAgICB2YXIgaGVhZEFuZ2xlID0gTWF0aC5QSS82IHx8IHRoaXMuaGVhZEFuZ2xlO1xyXG4gICAgdmFyIGhlYWRPZmZzZXQgPSAwIHx8IHRoaXMuaGVhZE9mZnNldDtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlIHx8ICdibGFjayc7XHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcclxuICAgIHZhciBhbmdsZSA9IE1hdGguYXRhbjIoZGVzdC55LXNvdXJjZS55LGRlc3QueC1zb3VyY2UueCk7XHJcblxyXG4gICAgdmFyIHhDb21wT2Zmc2V0ID0gMCwgeUNvbXBPZmZzZXQgPSAwO1xyXG4gICAgaWYgKGhlYWRPZmZzZXQpIHtcclxuICAgICAgeENvbXBPZmZzZXQgPSBoZWFkT2Zmc2V0ICogTWF0aC5jb3MoYW5nbGUpO1xyXG4gICAgICB5Q29tcE9mZnNldCA9IGhlYWRPZmZzZXQgKiBNYXRoLnNpbihhbmdsZSk7XHJcbiAgICB9XHJcbiAgICBjdHgubW92ZVRvKHNvdXJjZS54LCBzb3VyY2UueSk7XHJcbiAgICBjdHgubGluZVRvKGRlc3QueCwgZGVzdC55KTtcclxuICAgIGN0eC5tb3ZlVG8oZGVzdC54LXhDb21wT2Zmc2V0LGRlc3QueS15Q29tcE9mZnNldCk7XHJcbiAgICBjdHgubGluZVRvKGRlc3QueC14Q29tcE9mZnNldC1oZWFkbGVuKk1hdGguY29zKGFuZ2xlLWhlYWRBbmdsZSksZGVzdC55LXlDb21wT2Zmc2V0LWhlYWRsZW4qTWF0aC5zaW4oYW5nbGUtaGVhZEFuZ2xlKSk7XHJcbiAgICBjdHgubW92ZVRvKGRlc3QueC14Q29tcE9mZnNldCxkZXN0LnkteUNvbXBPZmZzZXQpO1xyXG4gICAgY3R4LmxpbmVUbyhkZXN0LngteENvbXBPZmZzZXQtaGVhZGxlbipNYXRoLmNvcyhhbmdsZStoZWFkQW5nbGUpLGRlc3QueS15Q29tcE9mZnNldC1oZWFkbGVuKk1hdGguc2luKGFuZ2xlK2hlYWRBbmdsZSkpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gIH0sXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICAvLyBubyBoaXQgdGVzdGluZyBmb3IgQXJyb3dzXHJcbiAgfVxyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFycm93O1xyXG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcblxudmFyIE5PTkUgPSBbXTtcblxuLyoqXG4gKiBDaXJjbCBOb2RlXG4gKlxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcbiAqXG4gKiByYWRpdXMgOiB0aGUgcmFkaXVzIG9mIHRoZSBjaXJjbGVcbiAqICh4LHkpIDogY29ycmVzcG9uZCB0byB0aGUgY2VudGVyIG9mIHRoZSBjaXJjbGVcbiAqIGZpbGxTdHlsZSwgc3Ryb2tlU3R5bGUsIGxpbmVXaWR0aDpcbiAqICAgYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXG4gKiBsaW5lRGFzaDogYW4gYXJyYXkgc3BlY2lmeWluZyBvbi9vZmYgcGl4ZWwgcGF0dGVyblxuICogICAoZS5nLiBbMTAsIDVdID0gMTAgcGl4ZWxzIG9uLCA1IHBpeGVscyBvZmYpIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqIGxpbmVEYXNoT2Zmc2V0OiBhIHBpeGVsIG9mZnNldCB0byBzdGFydCB0aGUgZGFzaGVzIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqXG4gKiBOb3RlOiBwaWNraW5nIGlzIGFsd2F5cyBlbmFibGVkIG9uIHRoZSBlbnRpcmUgY2lyY2xlIChubyBzdHJva2Utb25seSBwaWNraW5nKSBhdFxuICogdGhlIG1vbWVudC5cbiAqL1xudmFyIENpcmNsZSA9IGZ1bmN0aW9uKCkge1xuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHRoaXMucmFkaXVzMiA9IHRoaXMucmFkaXVzKnRoaXMucmFkaXVzO1xufTtcblxuXG5DaXJjbGUucHJvdG90eXBlID0gXy5leHRlbmQoQ2lyY2xlLnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIHJhZGl1cyA9IHRoaXMucmFkaXVzIHx8IDA7XG5cdGN0eC5iZWdpblBhdGgoKTtcblx0Y3R4LmFyYygwLDAsIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcblxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xuXHQgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcblx0ICBjdHguZmlsbCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZTtcbiAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xuICAgICAgY3R4LmxpbmVKb2luID0gdGhpcy5saW5lSm9pbiB8fCAnbWl0ZXInO1xuICAgICAgY3R4Lm1pdGVyTGltaXQgPSB0aGlzLm1pdGVyTGltaXQgfHwgMTA7XG4gICAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCh0aGlzLmxpbmVEYXNoT2Zmc2V0IHx8IDApO1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgIH1cblx0Y3R4LmNsb3NlUGF0aCgpO1xuXG4gICAgaWYgKHRoaXMuaW5uZXJMYWJlbCkge1xuICAgICAgdmFyIGZpbGwgPSB0aGlzLmlubmVyTGFiZWxGaWxsU3R5bGU7XG4gICAgICB2YXIgc3Ryb2tlID0gdGhpcy5pbm5lckxhYmVsU3Ryb2tlU3R5bGU7XG4gICAgICB2YXIgbGluZVNpemUgPSB0aGlzLmlubmVyTGFiZWxMaW5lV2lkdGggfHwgMTtcbiAgICAgIHZhciB0ZXh0U2l6ZSA9IHRoaXMuaW5uZXJMYWJlbFRleHRTaXplIHx8IE1hdGguZmxvb3IodGhpcy5yYWRpdXMgLyAyLjApO1xuICAgICAgdmFyIGZvbnRTdHlsZSA9IHRoaXMuaW5uZXJMYWJlbEZvbnRTdHlsZSB8fCAnc2Fucy1zZXJpZic7XG5cbiAgICAgIGlmICghZmlsbCAmJiAhc3Ryb2tlKSB7XG4gICAgICAgIGZpbGwgPSAnIzAwMDAwMCc7XG4gICAgICAgIHN0cm9rZSA9ICcjZmZmZmZmJztcbiAgICAgIH1cblxuICAgICAgY3R4LmZvbnQgPSB0ZXh0U2l6ZSArICdweCAnICsgZm9udFN0eWxlO1xuICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xuICAgICAgY3R4LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IGZpbGw7XG4gICAgICBjdHguZmlsbFRleHQodGhpcy5pbm5lckxhYmVsLDAsMCk7XG5cbiAgICAgIGlmIChzdHJva2UpIHtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gc3Ryb2tlO1xuICAgICAgICBjdHgubGluZVdpZHRoID0gbGluZVNpemU7XG4gICAgICAgIGN0eC5zdHJva2VUZXh0KHRoaXMuaW5uZXJMYWJlbCwwLDApO1xuICAgICAgfVxuXG5cbiAgICB9XG4gIH0sXG5cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcblx0dmFyIGRpc3QgPSBseCpseCArIGx5Kmx5O1xuICAgIGlmIChkaXN0IDwgdGhpcy5yYWRpdXMyKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2lyY2xlO1xuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcblxyXG4vKipcclxuICogR3JvdXAgKGNvbnRhaW5lcikgbm9kZSBpbiB0aGUgc2NlbmVncmFwaC4gSGFzIG5vIHZpc3VhbCByZXByZXNlbnRhdGlvbi5cclxuICpcclxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcclxuICpcclxuICogY2xpcDoge3gsIHksIHdpZHRoLCBoZWlnaHR9IFNwZWNpZmllcyBhbiBvcHRpb25hbCByZWN0YW5ndWxhciBjbGlwcGluZyByZWN0YW5nbGVcclxuICogICB0aGF0IGFwcGxpZXMgdG8gYWxsIGNoaWxkIG5vZGVzLlxyXG4gKlxyXG4gKiBOb3RlOiBhcHBseWluZyBvcGFjaXR5IHRvIEdyb3VwcyBpcyBzdXBwb3J0ZWQgYnV0IG5vdCBjdW1tdWxhdGl2ZS4gU3BlY2lmaWNhbGx5LFxyXG4gKiBpZiBhIGNoaWxkIG5vZGUgc2V0cyBvcGFjaXR5IGl0IHdpbGwgb3ZlcnJpZGUgdGhlIGdyb3VwLWxldmVsIG9wYWNpdHksIG5vdFxyXG4gKiBhY2N1bXVsYXRlIGl0LiBBcyBzdWNoIHRoZSBncm91cCBvcGFjaXR5IHNpbXBseSBzdXBwbGllcyB0aGUgZGVmYXVsdCBvcGFjaXR5XHJcbiAqIHRvIGNoaWxkIG5vZGVzLlxyXG4gKi9cclxudmFyIEdyb3VwID0gZnVuY3Rpb24oKSB7XHJcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cclxuICB0aGlzLmNoaWxkcmVuID0gW107XHJcbn07XHJcblxyXG5cclxuR3JvdXAucHJvdG90eXBlID0gXy5leHRlbmQoR3JvdXAucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xyXG5cclxuICAvKipcclxuICAgKiBBZGRzIGEgY2hpbGQgbm9kZSB0byB0aGlzIGdyb3VwLCBvcHRpb25hbGx5IGluY2x1ZGluZyB0aGUgYGluZGV4YFxyXG4gICAqIGF0IHdoaWNoIHRvIGluc2VydC4gSWYgYGluZGV4YCBpcyBvbWl0dGVkLCB0aGUgbm9kZSBpcyBhZGRlZCBhdCB0aGVcclxuICAgKiBlbmQgKHZpc3VhbGx5IG9uIHRvcCkgb2YgdGhlIGV4aXN0IGxpc3Qgb2YgY2hpbGRyZW4uXHJcbiAgICovXHJcbiAgYWRkQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkLCBpbmRleCkge1xyXG4gICAgY2hpbGQucGFyZW50ID0gdGhpcztcclxuICAgIGlmIChpbmRleCAhPSBudWxsICYmIGluZGV4IDw9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoKSB7XHJcbiAgICAgIHRoaXMuY2hpbGRyZW4uc3BsaWNlKGluZGV4LCAwLCBjaGlsZCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogUmVtb3ZlcyBhIHNwZWNpZmllZCBjaGlsZCBmcm9tIHRoaXMgZ3JvdXAuIElmIHRoZSBjaGlsZCBleGlzdHMgaW5cclxuICAgKiB0aGlzIGdyb3VwIGl0IGlzIHJlbW92ZWQgYW5kIHJldHVybmVkLlxyXG4gICAqL1xyXG4gIHJlbW92ZUNoaWxkOiBmdW5jdGlvbihjaGlsZCkge1xyXG4gICAgLy8gUmVtb3ZlIGNoaWxkXHJcbiAgICB2YXIgaWR4ID0gdGhpcy5jaGlsZHJlbi5pbmRleE9mKGNoaWxkKTtcclxuICAgIGlmIChpZHggPj0gMCkge1xyXG4gICAgICB0aGlzLmNoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xyXG4gICAgICBjaGlsZC5wYXJlbnQgPSBudWxsO1xyXG4gICAgICByZXR1cm4gY2hpbGQ7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogUmVtb3ZlcyBhbGwgY2hpbGRyZW4gZnJvbSB0aGUgZ3JvdXAuICAgUmV0dXJucyBhIGxpc3Qgb2YgYWxsIGNoaWxkcmVuXHJcbiAgICogcmVtb3ZlZC5cclxuICAgKi9cclxuICByZW1vdmVBbGw6IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHJlbW92ZWRMaXN0ID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gdGhpcy5jaGlsZHJlbi5sZW5ndGgtMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgdmFyIHJlbW92ZWQgPSB0aGlzLnJlbW92ZUNoaWxkKHRoaXMuY2hpbGRyZW5baV0pO1xyXG4gICAgICBpZiAocmVtb3ZlZCkge1xyXG4gICAgICAgIHJlbW92ZWRMaXN0LnB1c2gocmVtb3ZlZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByZW1vdmVkTGlzdDtcclxuICB9LFxyXG5cclxuXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW47XHJcbiAgICB2YXIgY2xpcCA9IHRoaXMuY2xpcDtcclxuICAgIHZhciByZXN1bHQ7XHJcblxyXG4gICAgaWYgKHRoaXMubm9IaXQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjbGlwKSB7XHJcbiAgICAgIGlmIChseCA8IGNsaXAueCB8fCBseCA+IGNsaXAueCtjbGlwLndpZHRoICYmIGx5IDwgY2xpcC55ICYmIGx5ID4gY2xpcC55K2NsaXAuaGVpZ2h0KSB7XHJcbiAgICAgICAgLy8gUGljayBwb2ludCBpcyBvdXQgb2YgY2xpcCByZWN0XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVmZXIgcGlja2luZyB0byBjaGlsZHJlbiAtIHN0YXJ0IGF0IHRvcCBvZiBzdGFjayAoZW5kIG9mIGNoaWxkIGxpc3QpXHJcbiAgICAvLyBhbmQgd29yayBiYWNrd2FyZHMsIGV4aXQgZWFybHkgaWYgaGl0IGZvdW5kXHJcbiAgICBmb3IgKHZhciBpPWNoaWxkcmVuLmxlbmd0aC0xOyBpPj0wICYmICFyZXN1bHQ7IGktLSkge1xyXG4gICAgICByZXN1bHQgPSBjaGlsZHJlbltpXS5waWNrKGN0eCwgeCwgeSwgbHgsIGx5KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH0sXHJcblxyXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbjtcclxuXHJcbiAgICBpZiAodGhpcy5jbGlwKSB7XHJcbiAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgY3R4LnJlY3QodGhpcy5jbGlwLngsIHRoaXMuY2xpcC55LCB0aGlzLmNsaXAud2lkdGgsIHRoaXMuY2xpcC5oZWlnaHQpO1xyXG4gICAgICBjdHguY2xpcCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlbmRlciBjaGlsZHJlbiBmcm9tIGJvdHRvbS11cFxyXG4gICAgZm9yICh2YXIgaT0wLCBsPWNoaWxkcmVuLmxlbmd0aDsgaTxsOyBpKyspIHtcclxuICAgICAgY2hpbGRyZW5baV0ucmVuZGVyKGN0eCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuY2xpcCkge1xyXG4gICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHcm91cDtcclxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcbi8qKlxyXG4gKiBSYXN0ZXIgSW1hZ2UgTm9kZVxyXG4gKlxyXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxyXG4gKlxyXG4gKiBzcmM6IHVybCAocmVsYXRpdmUgb3IgZnVsbHkgcXVhbGlmaWVkKSBmcm9tIHdoaWNoIHRvIGxvYWQgaW1hZ2VcclxuICogd2lkdGg6IHdpZHRoIG9mIHRoZSByZW5kZXJlZCByZXByZXNlbnRhdGlvbiBvZiB0aGUgaW1hZ2UgKGluIHBpeGVscykuXHJcbiAqICAgSWYgdW5zZXQvbnVsbCwgdGhlIG5hdHVyYWwgd2lkdGggb2YgdGhlIGltYWdlIHdpbGwgYmUgdXNlZFxyXG4gKiBoZWlnaHQ6IGhlaWdodCBvZiB0aGUgcmVuZGVyZWQgcmVwcmVzZW50YXRpb24gb2YgdGhlIGltYWdlIChpbiBwaXhlbHMpLlxyXG4gKiAgIElmIHVuc2V0L251bGwsIHRoZSBuYXR1cmFsIGhlaWdodCBvZiB0aGUgaW1hZ2Ugd2lsbCBiZSB1c2VkXHJcbiAqL1xyXG52YXIgSW1hZ2VOb2RlID0gZnVuY3Rpb24oKSB7XHJcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cclxuICB0aGlzLl9sb2FkZWQgPSBmYWxzZTtcclxufTtcclxuXHJcblxyXG5JbWFnZU5vZGUucHJvdG90eXBlID0gXy5leHRlbmQoSW1hZ2VOb2RlLnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcclxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcclxuICAgIHZhciBzZWxmO1xyXG5cclxuICAgIGlmICh0aGlzLl9pbWFnZSAmJiB0aGlzLl9pbWFnZS5sb2FkZWQpIHtcclxuICAgICAgLy8gSW1hZ2VcclxuICAgICAgaWYgKHRoaXMud2lkdGggIT0gbnVsbCB8fCB0aGlzLmhlaWdodCAhPSBudWxsKSB7XHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLl9pbWFnZSwgMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5faW1hZ2UsIDAsIDApO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9pbWFnZSkge1xyXG4gICAgICBzZWxmID0gdGhpcztcclxuICAgICAgdGhpcy5faW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgdGhpcy5faW1hZ2Uub25sb2FkID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gT25seSByZW5kZXIgc2NlbmUgaWYgbG9hZGVkIGltYWdlIGlzIHN0aWxsIHBhcnQgb2YgaXRcclxuICAgICAgICBpZiAodGhpcyA9PT0gc2VsZi5faW1hZ2UpIHtcclxuICAgICAgICAgIHNlbGYuX2ltYWdlLmxvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICBzZWxmLnRyaWdnZXIoJ3VwZGF0ZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgICAgdGhpcy5faW1hZ2Uuc3JjID0gdGhpcy5zcmM7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggfHwgKHRoaXMuX2ltYWdlICYmIHRoaXMuX2ltYWdlLndpZHRoKTtcclxuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCB8fCAodGhpcy5faW1hZ2UgJiYgdGhpcy5faW1hZ2UuaGVpZ2h0KTtcclxuXHJcbiAgICBpZiAobHggPj0gMCAmJiBseCA8IHdpZHRoICYmIGx5ID49IDAgJiYgbHkgPCBoZWlnaHQpIHtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoSW1hZ2VOb2RlLnByb3RvdHlwZSwgJ3NyYycsIHtcclxuICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3NyYztcclxuICB9LFxyXG4gIHNldDogZnVuY3Rpb24odmFsdWUpIHtcclxuICAgIGlmICh0aGlzLl9zcmMgIT09IHZhbHVlKSB7XHJcbiAgICAgIHRoaXMuX3NyYyA9IHZhbHVlO1xyXG4gICAgICB0aGlzLl9pbWFnZSA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlTm9kZTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xyXG5cclxudmFyIE5PTkUgPSBbXTtcclxuXHJcbi8qKlxyXG4gKiBSZWN0YW5nbGUgTm9kZVxyXG4gKlxyXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxyXG4gKlxyXG4gKiB3aWR0aDogd2lkdGggb2YgdGhlIHJlY3RhbmdsZVxyXG4gKiBoZWlnaHQ6IGhlaWdodCBvZiB0aGUgcmVjdGFuZ2xlXHJcbiAqIGZpbGxTdHlsZSwgc3Ryb2tlU3R5bGUsIGxpbmVXaWR0aCwgbGluZUNhcCwgbGluZUpvaW4sIG1pdGVyTGltaXQ6XHJcbiAqICAgYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXHJcbiAqIGxpbmVEYXNoOiBhbiBhcnJheSBzcGVjaWZ5aW5nIG9uL29mZiBwaXhlbCBwYXR0ZXJuXHJcbiAqICAgKGUuZy4gWzEwLCA1XSA9IDEwIHBpeGVscyBvbiwgNSBwaXhlbHMgb2ZmKSAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXHJcbiAqIGxpbmVEYXNoT2Zmc2V0OiBhIHBpeGVsIG9mZnNldCB0byBzdGFydCB0aGUgZGFzaGVzIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcclxuICpcclxuICogTm90ZTogcGlja2luZyBpcyBhbHdheXMgZW5hYmxlZCBvbiB0aGUgZW50aXJlIHJlY3QgKG5vIHN0cm9rZS1vbmx5IHBpY2tpbmcpIGF0XHJcbiAqIHRoZSBtb21lbnQuXHJcbiAqL1xyXG52YXIgTGluZSA9IGZ1bmN0aW9uKCkge1xyXG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcbkxpbmUucHJvdG90eXBlID0gXy5leHRlbmQoTGluZS5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XHJcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XHJcbiAgICB2YXIgc291cmNlID0gdGhpcy5zb3VyY2UgfHwge3g6MCx5OjB9O1xyXG4gICAgdmFyIGRlc3QgPSB0aGlzLnRhcmdldCB8fCB7eDowLHk6MH07XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlIHx8ICdibGFjayc7XHJcbiAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcclxuICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoIHx8IE5PTkUpO1xyXG4gICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XHJcbiAgICBjdHgubW92ZVRvKHNvdXJjZS54LHNvdXJjZS55KTtcclxuICAgIGN0eC5saW5lVG8oZGVzdC54LGRlc3QueSk7XHJcbiAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgfSxcclxuXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuICAgIC8vIG5vIGhpdCB0ZXN0aW5nIGZvciBsaW5lc1xyXG4gIH1cclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMaW5lO1xyXG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgcG9seWZpbGwgPSByZXF1aXJlKCcuL3BvbHlmaWxscycpO1xyXG52YXIgR3JvdXAgPSByZXF1aXJlKCcuL2dyb3VwJyk7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBzY2VuZWdyYXBoIHJvb3QgZWxlbWVudCB3aGljaCBpbXBsZW1lbnRzIGFuIGV4dGVuZGVkXHJcbiAqIEdyb3VwIGludGVyZmFjZS4gRXhwZWN0cyBhIGBjYW52YXNgIEhUTUwgZWxlbWVudC5cclxuICovXHJcbnZhciBQYXRoID0gZnVuY3Rpb24oZWxlbWVudCkge1xyXG4gIC8vIEF1dG9pbnN0YW50aWF0ZVxyXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQYXRoKSkge1xyXG4gICAgcmV0dXJuIG5ldyBQYXRoKGVsZW1lbnQpO1xyXG4gIH1cclxuICBHcm91cC5hcHBseSh0aGlzKTtcclxuXHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB0aGlzLmVsID0gZWxlbWVudDtcclxuICB0aGlzLmNvbnRleHQgPSBlbGVtZW50LmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgLy8gQWRkIGhlbHBlciBwb2x5ZmlsbHMgdG8gY29udGV4dCBpbnN0YW5jZVxyXG4gIHBvbHlmaWxsLmRhc2hTdXBwb3J0KHRoaXMuY29udGV4dCk7XHJcblxyXG4gIC8vIE9mZnNldCBieSAxLzIgcGl4ZWwgdG8gYWxpZ24gd2l0aCBwaXhlbCBlZGdlc1xyXG4gIC8vIGh0dHA6Ly9kaXZlaW50b2h0bWw1LmluZm8vY2FudmFzLmh0bWwjcGl4ZWwtbWFkbmVzc1xyXG4gIHRoaXMueCA9IDAuNTtcclxuICB0aGlzLnkgPSAwLjU7XHJcblxyXG4gIHRoaXMuem9vbUxldmVsID0gMS4wO1xyXG5cclxuICAvLyBCaW5kIG1lbWJlcnMgZm9yIGNvbnZlbmllbnQgY2FsbGJhY2tcclxuICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5faGFuZGxlID0gdGhpcy5faGFuZGxlLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5fbW91c2Vtb3ZlID0gdGhpcy5fbW91c2Vtb3ZlLmJpbmQodGhpcyk7XHJcblxyXG4gIC8vIFJlZ2lzdGVyIGV2ZW50IGxpc3RlbmVycyBvbiBjYW52YXMgdGhhdCB1c2UgcGlja2VyIHRvIGhpdHRlc3RcclxuICBbJ2NsaWNrJywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJ10uZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XHJcbiAgICBzZWxmLmVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgc2VsZi5faGFuZGxlKTtcclxuICB9KTtcclxuICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX21vdXNlbW92ZSk7XHJcblxyXG4gIC8vIExpc3RlbiBmb3IgdXBkYXRlIHJlcXVlc3RzIGZyb20gc2NlbmVncmFwaCwgZGVmZXIgYnkgYSBmcmFtZSwgY29hbGVzY2VcclxuICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gbnVsbDtcclxuICB0aGlzLm9uKCd1cGRhdGUnLCBmdW5jdGlvbigpIHtcclxuICAgIGlmICghc2VsZi5fcGVuZGluZ1VwZGF0ZSkge1xyXG4gICAgICBzZWxmLl9wZW5kaW5nVXBkYXRlID0gcG9seWZpbGwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCBzZWxmLnVwZGF0ZSApO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIC8vIENyZWF0ZSBhbmltYXRlLXVwZGF0ZSBmdW5jdGlvbiBvbmNlXHJcbiAgdGhpcy5fYW5pbVVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgVFdFRU4udXBkYXRlKCk7XHJcbiAgICBzZWxmLnVwZGF0ZSgpO1xyXG4gIH07XHJcblxyXG4gIC8vIFJlc2l6ZSB0byBjdXJyZW50IERPTS1zcGVjaWZpZWQgc2l6aW5nXHJcbiAgdGhpcy5yZXNpemUoKTtcclxufTtcclxuXHJcblxyXG5fLmV4dGVuZChQYXRoLnByb3RvdHlwZSwgR3JvdXAucHJvdG90eXBlLCB7XHJcbiAgLyoqXHJcbiAgICogUmVzaXplIG9yIHVwZGF0ZSB0aGUgc2l6ZSBvZiB0aGUgY2FudmFzLiBDYWxsaW5nIHRoaXMgZnVuY3Rpb24gd2lsbCBmaXhcclxuICAgKiB0aGUgY3NzLXN0eWxlLXNwZWNpZmllZCBzaXplIG9mIHRoZSBjYW52YXMgZWxlbWVudC4gQ2FsbCBgdXBkYXRlKClgXHJcbiAgICogdG8gY2F1c2UgdGhlIGNhbnZhcyB0byByZXJlbmRlciBhdCB0aGUgbmV3IHNpemUuXHJcbiAgICpcclxuICAgKiBTdHJpY3Qgc2l6aW5nIGlzIG5lY2Vzc2FyeSB0byBzZXQgdGhlIGNhbnZhcyB3aWR0aC9oZWlnaHQgcGl4ZWwgY291bnRcclxuICAgKiB0byB0aGUgY29ycmVjdCB2YWx1ZSBmb3IgdGhlIGNhbnZhcyBlbGVtZW50IERPTSBzaXplIGFuZCBkZXZpY2UgcGl4ZWxcclxuICAgKiByYXRpby5cclxuICAgKi9cclxuICByZXNpemU6IGZ1bmN0aW9uKHcsIGgpIHtcclxuICAgIC8vIFRPRE8gdGhpcyBtYXkgbm90IGJlIHJlbGlhYmxlIG9uIG1vYmlsZVxyXG4gICAgdGhpcy5kZXZpY2VQaXhlbFJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMTtcclxuXHJcbiAgICB0aGlzLndpZHRoID0gdyB8fCB0aGlzLmVsLmNsaWVudFdpZHRoO1xyXG4gICAgdGhpcy5oZWlnaHQgPSBoIHx8IHRoaXMuZWwuY2xpZW50SGVpZ2h0O1xyXG5cclxuICAgIHRoaXMuZWwuc3R5bGUud2lkdGggPSB0aGlzLndpZHRoICsgJ3B4JztcclxuICAgIHRoaXMuZWwuc3R5bGUuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyAncHgnO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIENhdXNlcyB0aGUgY2FudmFzIHRvIHJlbmRlciBzeW5jaHJvbm91c2x5LiBJZiBhbnkgYW5pbWF0aW9ucyBhcmUgYWN0aXZlL3BlbmRpbmdcclxuICAgKiB0aGlzIHdpbGwga2ljayBvZmYgYSBzZXJpZXMgb2YgYXV0b21hdGljIHVwZGF0ZXMgdW50aWwgdGhlIGFuaW1hdGlvbnMgYWxsXHJcbiAgICogY29tcGxldGUuXHJcbiAgICovXHJcbiAgdXBkYXRlOiBmdW5jdGlvbigpIHtcclxuICAgIC8vIFVwZGF0ZSBzaXplIHRvIGVxdWFsIGRpc3BsYXllZCBwaXhlbCBzaXplICsgY2xlYXJcclxuICAgIHRoaXMuY29udGV4dC5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoICogdGhpcy5kZXZpY2VQaXhlbFJhdGlvO1xyXG4gICAgdGhpcy5jb250ZXh0LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCAqIHRoaXMuZGV2aWNlUGl4ZWxSYXRpbztcclxuICAgIGlmICh0aGlzLmRldmljZVBpeGVsUmF0aW8gIT0gMSkge1xyXG4gICAgICB0aGlzLmNvbnRleHQuc2F2ZSgpO1xyXG4gICAgICB0aGlzLmNvbnRleHQuc2NhbGUodGhpcy5kZXZpY2VQaXhlbFJhdGlvLCB0aGlzLmRldmljZVBpeGVsUmF0aW8pO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX3BlbmRpbmdVcGRhdGUgPSBudWxsO1xyXG5cclxuICAgIC8vIEFjdGl2ZSBhbmltYXRpb25zPyBzY2hlZHVsZSB0d2VlbiB1cGRhdGUgKyByZW5kZXIgb24gbmV4dCBmcmFtZVxyXG4gICAgaWYgKHdpbmRvdy5UV0VFTiAmJiBUV0VFTi5nZXRBbGwoKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIC8vIFhYWCBDb3VsZCBiZSBhbiBleGlzdGluZyBwZW5kaW5nIHVwZGF0ZVxyXG4gICAgICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gcG9seWZpbGwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2FuaW1VcGRhdGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucmVuZGVyKHRoaXMuY29udGV4dCk7XHJcblxyXG4gICAgaWYgKHRoaXMuZGV2aWNlUGl4ZWxSYXRpbyAhPSAxKSB7XHJcbiAgICAgIHRoaXMuY29udGV4dC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgem9vbUluOiBmdW5jdGlvbih4LHkpIHtcclxuXHR0aGlzLnpvb21MZXZlbCsrO1xyXG5cdHRoaXMuem9vbSh0aGlzLnpvb21MZXZlbCx4LHkpO1xyXG4gIH0sXHJcbiAgem9vbU91dDogZnVuY3Rpb24oeCx5KSB7XHJcblx0dGhpcy56b29tTGV2ZWwtLTtcclxuXHR0aGlzLnpvb20odGhpcy56b29tTGV2ZWwseCx5KTtcclxuICB9LFxyXG5cclxuICB6b29tOiBmdW5jdGlvbihsZXZlbCx4LHkpIHtcclxuICAgIHRoaXMuc2NhbGVYID0gbGV2ZWw7XHJcbiAgICB0aGlzLnNjYWxlWSA9IGxldmVsO1xyXG5cdHRoaXMudXBkYXRlKCk7XHJcbiAgfSxcclxuXHJcbiAgLy8gR2VuZXJhbCBoYW5kbGVyIGZvciBzaW1wbGUgZXZlbnRzIChjbGljaywgbW91c2Vkb3duLCBldGMpXHJcbiAgX2hhbmRsZTogZnVuY3Rpb24oZSkge1xyXG4gICAgdmFyIGhpdCA9IHRoaXMucGljayh0aGlzLmNvbnRleHQsIGUub2Zmc2V0WCwgZS5vZmZzZXRZLCBlLm9mZnNldFgsIGUub2Zmc2V0WSk7XHJcbiAgICBpZiAoaGl0KSB7XHJcbiAgICAgIGUudGFyZ2V0Tm9kZSA9IGhpdDtcclxuICAgICAgaGl0LnRyaWdnZXIoZS50eXBlLCBlKTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBfbW91c2Vtb3ZlOiBmdW5jdGlvbihlKSB7XHJcbiAgICB2YXIgaGl0ID0gdGhpcy5waWNrKHRoaXMuY29udGV4dCwgZS5vZmZzZXRYLCBlLm9mZnNldFksIGUub2Zmc2V0WCwgZS5vZmZzZXRZKTtcclxuICAgIGlmIChoaXQpIHtcclxuICAgICAgZS50YXJnZXROb2RlID0gaGl0O1xyXG4gICAgfVxyXG4gICAgLy8gTWFuYWdlIG1vdXNlb3V0L21vdXNlb3ZlclxyXG4gICAgLy8gVE9ETyBjcmVhdGUgbmV3IGV2ZW50IG9iamVjdHMgd2l0aCBjb3JyZWN0IGV2ZW50IHR5cGVcclxuICAgIGlmICh0aGlzLl9sYXN0b3ZlciAhPSBoaXQpIHtcclxuICAgICAgaWYgKHRoaXMuX2xhc3RvdmVyKSB7XHJcbiAgICAgICAgZS50YXJnZXROb2RlID0gdGhpcy5fbGFzdG92ZXI7XHJcbiAgICAgICAgdGhpcy5fbGFzdG92ZXIudHJpZ2dlcignbW91c2VvdXQnLCBlKTtcclxuICAgICAgICBlLnRhcmdldE5vZGUgPSBoaXQ7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5fbGFzdG92ZXIgPSBoaXQ7XHJcbiAgICAgIGlmIChoaXQpIHtcclxuICAgICAgICBoaXQudHJpZ2dlcignbW91c2VvdmVyJywgZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIEFsd2F5cyBzZW5kIG1vdXNlbW92ZSBsYXN0XHJcbiAgICBpZiAoaGl0KSB7XHJcbiAgICAgIGhpdC50cmlnZ2VyKCdtb3VzZW1vdmUnLCBlKTtcclxuICAgIH1cclxuICAgIC8vIFRPRE8gSGFuZGxlIG1vdXNlIGxlYXZpbmcgY2FudmFzXHJcbiAgfVxyXG59KTtcclxuXHJcblxyXG5cclxuLy8gU1RBVElDXHJcblxyXG4vLyBBZGQgbGlicmFyeSBjb25zdHJ1Y3RzIHRvIG5hbWVzcGFjZVxyXG52YXIgbmFtZXNwYWNlQ29uc3RydWN0b3JzID0ge1xyXG4gIHJlY3Q6IHJlcXVpcmUoJy4vcmVjdCcpLFxyXG4gIHBhdGg6IHJlcXVpcmUoJy4vcGF0aCcpLFxyXG4gIHRleHQ6IHJlcXVpcmUoJy4vdGV4dCcpLFxyXG4gIGltYWdlOiByZXF1aXJlKCcuL2ltYWdlJyksXHJcbiAgY2lyY2xlOiByZXF1aXJlKCcuL2NpcmNsZScpLFxyXG4gIGxpbmU6IHJlcXVpcmUoJy4vbGluZScpLFxyXG4gIGFyYzogcmVxdWlyZSgnLi9hcmMnKSxcclxuICBhcnJvdzogcmVxdWlyZSgnLi9hcnJvdycpLFxyXG4gIGdyb3VwOiBHcm91cFxyXG59O1xyXG5cclxuZm9yIChhdHRyIGluIG5hbWVzcGFjZUNvbnN0cnVjdG9ycykge1xyXG4gIFBhdGhbYXR0cl0gPSAoZnVuY3Rpb24oYXR0cikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHByb3BzKSB7XHJcbiAgICAgIHJldHVybiBuZXcgbmFtZXNwYWNlQ29uc3RydWN0b3JzW2F0dHJdKHByb3BzKTtcclxuICAgIH07XHJcbiAgfShhdHRyKSk7XHJcbn1cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBhdGg7XHJcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcblxyXG52YXIgSUQgPSAwO1xyXG5cclxuLyoqXHJcbiAqIEJhc2UgTm9kZSBvYmplY3QgZm9yIGFsbCBzY2VuZWdyYXBoIG9iamVjdHNcclxuICpcclxuICogaWQ6IG5vbi12aXN1YWwsIHVuaXF1ZSB2YWx1ZSBmb3IgYWxsIG5vZGVzXHJcbiAqIHZpc2libGU6IGlmIGZhbHNlLCB0aGlzIG5vZGUgKGFuZCBkZXNjZW5kZW50cykgd2lsbCBub3QgcmVuZGVyIG5vciBwaWNrXHJcbiAqIHg6IHRoZSB4IHBvc2l0aW9uICh0cmFuc2xhdGlvbikgYXBwbGllZCB0byB0aGlzIG5vZGVcclxuICogeTogdGhlIHkgcG9zaXRpb24gKHRyYW5zbGF0aW9uKSBhcHBsaWVkIHRvIHRoaXMgbm9kZVxyXG4gKiByb3RhdGlvbjogcm90YXRpb24gaW4gcmFkaWFucyBhcHBsaWVkIHRvIHRoaXMgbm9kZSBhbmQgYW55IGRlc2NlbmRlbnRzXHJcbiAqIHNjYWxlWCwgc2NhbGVZOiB4IGFuZCB5IHNjYWxlIGFwcGxpZWQgdG8gdGhpcyBub2RlIGFuZCBhbnkgZGVzY2VuZGVudHNcclxuICogb3BhY2l0eTogdGhlIGdsb2JhbCBvcGFjaXR5IFswLDFdIG9mIHRoaXMgbm9kZVxyXG4gKi9cclxudmFyIE5vZGUgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XHJcbiAgdGhpcy5pZCA9IElEKys7XHJcbiAgdGhpcy5wYXJlbnQgPSBudWxsO1xyXG4gIHRoaXMudmlzaWJsZSA9IHRydWU7XHJcbiAgdGhpcy5oYW5kbGVycyA9IHt9O1xyXG5cclxuICBfLmV4dGVuZCh0aGlzLCBhdHRyaWJ1dGVzKTtcclxufTtcclxuXHJcbnZhciBnZXRFYXNpbmdCYXNlID0gZnVuY3Rpb24obmFtZSkge1xyXG5cdHZhciBzdHJpbmdNYXAgPSB7XHJcblx0XHQnYmFjayc6IFRXRUVOLkVhc2luZy5CYWNrLFxyXG5cdFx0J2JvdW5jZSc6IFRXRUVOLkVhc2luZy5Cb3VuY2UsXHJcblx0XHQnY2lyY3VsYXInOiBUV0VFTi5FYXNpbmcuQ2lyY3VsYXIsXHJcblx0XHQnY3ViaWMnOiBUV0VFTi5FYXNpbmcuQ3ViaWMsXHJcblx0XHQnZWxhc3RpYyc6IFRXRUVOLkVhc2luZy5FbGFzdGljLFxyXG5cdFx0J2V4cG9uZW50aWFsJzogVFdFRU4uRWFzaW5nLkV4cG9uZW50aWFsLFxyXG5cdFx0J2xpbmVhcic6IFRXRUVOLkVhc2luZy5MaW5lYXIsXHJcblx0XHQncXVhZHJhdGljJzogVFdFRU4uRWFzaW5nLlF1YWRyYXRpYyxcclxuXHRcdCdxdWFydGljJzogVFdFRU4uRWFzaW5nLlF1YXJ0aWMsXHJcblx0XHQncXVpbnRpYyc6IFRXRUVOLkVhc2luZy5RdWludGljXHJcblx0fTtcclxuXHRmb3IgKHZhciBlYXNlIGluIHN0cmluZ01hcCkge1xyXG5cdFx0aWYgKHN0cmluZ01hcC5oYXNPd25Qcm9wZXJ0eShlYXNlKSkge1xyXG5cdFx0XHRpZiAobmFtZS5pbmRleE9mKGVhc2UpIT09LTEpIHtcclxuXHRcdFx0XHRyZXR1cm4gc3RyaW5nTWFwW2Vhc2VdO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiBUV0VFTi5FYXNpbmcuTGluZWFyO1xyXG59O1xyXG5cclxudmFyIGdldEVhc2luZ0Z1bmN0aW9uID0gZnVuY3Rpb24obmFtZSl7XHJcblx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcclxuXHR2YXIgZWFzZUJhc2UgPSBnZXRFYXNpbmdCYXNlKG5hbWUpO1xyXG5cdHZhciBlYXNlID0gbnVsbDtcclxuXHRpZiAobmFtZS5pbmRleE9mKCdpbm91dCcpIT0tMSkge1xyXG5cdFx0ZWFzZSA9IGVhc2VCYXNlLkluT3V0XHJcblx0fSBlbHNlIGlmIChuYW1lLmluZGV4T2YoJ2luJykhPS0xKSB7XHJcblx0XHRlYXNlID0gZWFzZUJhc2UuSW47XHJcblx0fSBlbHNlIGlmIChuYW1lLmluZGV4T2YoJ291dCcpIT0tMSkge1xyXG5cdFx0ZWFzZSA9IGVhc2VCYXNlLk91dDtcclxuXHR9XHJcblx0aWYgKCFlYXNlKSB7XHJcblx0XHRlYXNlID0gZWFzZUJhc2UuTm9uZTtcclxuXHR9XHJcblx0cmV0dXJuIGVhc2U7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZSA9IHtcclxuICAvKipcclxuICAgKiBTaW1wbGVcclxuICAgKi9cclxuICBkYXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5fZGF0YTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEJ1bGsgc2V0cyBhIGdyb3VwIG9mIG5vZGUgcHJvcGVydGllcywgdGFrZXMgYSBtYXAgb2YgcHJvcGVydHkgbmFtZXNcclxuICAgKiB0byB2YWx1ZXMuIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIHNldHRpbmcgZWFjaCBwcm9wZXJ0eSB2aWFcclxuICAgKiBgbm9kZS5wcm9wZXJ0eU5hbWUgPSB2YWx1ZWBcclxuICAgKi9cclxuICBhdHRyOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XHJcbiAgICBfLmV4dGVuZCh0aGlzLCBhdHRyaWJ1dGVzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG4gIHR3ZWVuT2JqOiBmdW5jdGlvbihiYXNlUHJvcCxhdHRyaWJ1dGVzLHRyYW5zaXRpb24pIHtcclxuXHQgIHRoaXMudHdlZW5BdHRyLmNhbGwodGhpc1tiYXNlUHJvcF0sYXR0cmlidXRlcyx0cmFuc2l0aW9uKTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBRdWV1ZXMgYSBzZXQgb2Ygbm9kZSBwcm9wZXJ0aWVzIGZvciBhbiBhbmltYXRlZCB0cmFuc2l0aW9uLiBPbmx5XHJcbiAgICogbnVtZXJpYyBwcm9wZXJ0aWVzIGNhbiBiZSBhbmltYXRlZC4gVGhlIGxlbmd0aCBvZiB0aGUgdHJhbnNpdGlvblxyXG4gICAqIGlzIHNwZWNpZmllZCBpbiB0aGUgdHJhbnNpdGlvbiBwcm9wZXJ0eSwgZGVmYXVsdHMgdG8gMSBzZWNvbmQuIEFuXHJcbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgY2FuIGJlIHByb3ZpZGVkIHdoaWNoIHdpbGwgYmUgY2FsbGVkIG9uIGFuaW1hdGlvblxyXG4gICAqIGNvbXBsZXRpb24uXHJcbiAgICpcclxuICAgKiBDYWxsaW5nIGB1cGRhdGUoKWAgb24gdGhlIHNjZW5lIHJvb3Qgd2lsbCB0cmlnZ2VyIHRoZSBzdGFydCBvZiBhbGxcclxuICAgKiBxdWV1ZWQgYW5pbWF0aW9ucyBhbmQgY2F1c2UgdGhlbSB0byBydW4gKGFuZCByZW5kZXIpIHRvIGNvbXBsZXRpb24uXHJcbiAgICovXHJcbiAgdHdlZW5BdHRyOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCB0cmFuc2l0aW9uKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIga2V5LCBzdGF0aWNzO1xyXG4gICAgdHJhbnNpdGlvbiA9IHRyYW5zaXRpb24gfHwge307XHJcblxyXG4gICAgLy8gT25seSBzdXBwb3J0IHR3ZWVuaW5nIG51bWJlcnMgLSBzdGF0aWNhbGx5IHNldCBldmVyeXRoaW5nIGVsc2VcclxuICAgIGZvciAoa2V5IGluIGF0dHJpYnV0ZXMpIHtcclxuICAgICAgaWYgKGF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiB0eXBlb2YgYXR0cmlidXRlc1trZXldICE9ICdudW1iZXInKSB7XHJcbiAgICAgICAgc3RhdGljcyA9IHN0YXRpY3MgfHwge307XHJcbiAgICAgICAgc3RhdGljc1trZXldID0gYXR0cmlidXRlc1trZXldO1xyXG4gICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzW2tleV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoc3RhdGljcykge1xyXG4gICAgICB0aGlzLmF0dHIoc3RhdGljcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMudHdlZW4pIHtcclxuICAgICAgLy8gVE9ETyBKdW1wIHRvIGVuZCBzdGF0ZSBvZiB2YXJzIG5vdCBiZWluZyB0cmFuc2l0aW9uZWRcclxuICAgICAgdGhpcy50d2Vlbi5zdG9wKCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy50d2VlbiA9IG5ldyBUV0VFTi5Ud2Vlbih0aGlzKVxyXG4gICAgICAudG8oYXR0cmlidXRlcywgdHJhbnNpdGlvbi5kdXJhdGlvbiB8fCAxMDAwKVxyXG5cdCAgLmVhc2luZyhnZXRFYXNpbmdGdW5jdGlvbih0cmFuc2l0aW9uLmVhc2luZyB8fCAnbGluZWFyJykpXHJcbiAgICAgIC5vbkNvbXBsZXRlKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHNlbGYudHdlZW4gPSBudWxsO1xyXG4gICAgICAgIGlmICh0cmFuc2l0aW9uLmNhbGxiYWNrKSB7XHJcbiAgICAgICAgICB0cmFuc2l0aW9uLmNhbGxiYWNrKHRoaXMsIGF0dHJpYnV0ZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICAgLnN0YXJ0KCk7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBhbiBldmVudCBoYW5kbGVyIHRvIHRoaXMgbm9kZS4gRm9yIGV4YW1wbGU6XHJcbiAgICogYGBgXHJcbiAgICogbm9kZS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAqICAgLy8gZG8gc29tZXRoaW5nXHJcbiAgICogfSk7XHJcbiAgICogYGBgXHJcbiAgICogQW4gZXZlbnQgb2JqZWN0IHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBoYW5kbGVyIHdoZW4gdGhlIGV2ZW50XHJcbiAgICogaXMgdHJpZ2dlcmVkLiBUaGUgZXZlbnQgb2JqZWN0IHdpbGwgYmUgYSBzdGFuZGFyZCBKYXZhU2NyaXB0XHJcbiAgICogZXZlbnQgYW5kIHdpbGwgY29udGFpbiBhIGB0YXJnZXROb2RlYCBwcm9wZXJ0eSBjb250YWluaW5nIHRoZVxyXG4gICAqIG5vZGUgdGhhdCB3YXMgdGhlIHNvdXJjZSBvZiB0aGUgZXZlbnQuIEV2ZW50cyBidWJibGUgdXAgdGhlXHJcbiAgICogc2NlbmVncmFwaCB1bnRpbCBoYW5kbGVkLiBIYW5kbGVycyByZXR1cm5pbmcgYSB0cnV0aHkgdmFsdWVcclxuICAgKiBzaWduYWwgdGhhdCB0aGUgZXZlbnQgaGFzIGJlZW4gaGFuZGxlZC5cclxuICAgKi9cclxuICBvbjogZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1t0eXBlXTtcclxuICAgIGlmICghaGFuZGxlcnMpIHtcclxuICAgICAgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW3R5cGVdID0gW107XHJcbiAgICB9XHJcbiAgICBoYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogUmVtb3ZlcyBhbiBldmVudCBoYW5kbGVyIG9mIHRoZSBnaXZlbiB0eXBlLiBJZiBubyBoYW5kbGVyIGlzXHJcbiAgICogcHJvdmlkZWQsIGFsbCBoYW5kbGVycyBvZiB0aGUgdHlwZSB3aWxsIGJlIHJlbW92ZWQuXHJcbiAgICovXHJcbiAgb2ZmOiBmdW5jdGlvbih0eXBlLCBoYW5kbGVyKSB7XHJcbiAgICBpZiAoIWhhbmRsZXIpIHtcclxuICAgICAgdGhpcy5oYW5kbGVyc1t0eXBlXSA9IFtdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1t0eXBlXTtcclxuICAgICAgdmFyIGlkeCA9IGhhbmRsZXJzLmluZGV4T2YoaGFuZGxlcik7XHJcbiAgICAgIGlmIChpZHggPj0gMCkge1xyXG4gICAgICAgIGhhbmRsZXJzLnNwbGljZShpZHgsIDEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBUcmlnZ2VycyBhbiBldmVudCBhbmQgYmVnaW5zIGJ1YmJsaW5nLiBSZXR1cm5zIHRydXRoeSBpZiB0aGVcclxuICAgKiBldmVudCB3YXMgaGFuZGxlZC5cclxuICAgKi9cclxuICB0cmlnZ2VyOiBmdW5jdGlvbih0eXBlLCBldmVudCkge1xyXG4gICAgdmFyIGhhbmRsZWQgPSBmYWxzZTtcclxuICAgIHZhciBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbdHlwZV07XHJcblxyXG4gICAgaWYgKGhhbmRsZXJzKSB7XHJcbiAgICAgIGhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcikge1xyXG4gICAgICAgIGhhbmRsZWQgPSBoYW5kbGVyKGV2ZW50KSB8fCBoYW5kbGVkO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWhhbmRsZWQgJiYgdGhpcy5wYXJlbnQpIHtcclxuICAgICAgaGFuZGxlZCA9IHRoaXMucGFyZW50LnRyaWdnZXIodHlwZSwgZXZlbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBoYW5kbGVkO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIFJlbW92ZXMgdGhpcyBub2RlIGZyb20gaXRzIHBhcmVudFxyXG4gICAqL1xyXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAodGhpcy5wYXJlbnQpIHtcclxuICAgICAgdGhpcy5wYXJlbnQucmVtb3ZlKHRoaXMpO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEludGVybmFsOiByZW5kZXJzIHRoZSBub2RlIGdpdmVuIHRoZSBjb250ZXh0XHJcbiAgICovXHJcbiAgcmVuZGVyOiBmdW5jdGlvbihjdHgpIHtcclxuICAgIGlmICghdGhpcy52aXNpYmxlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgeCA9IHRoaXMueCB8fCAwO1xyXG4gICAgdmFyIHkgPSB0aGlzLnkgfHwgMDtcclxuICAgIHZhciBzY2FsZVggPSB0aGlzLnNjYWxlWCA9PSBudWxsID8gMSA6IHRoaXMuc2NhbGVYO1xyXG4gICAgdmFyIHNjYWxlWSA9IHRoaXMuc2NhbGVZID09IG51bGwgPyAxIDogdGhpcy5zY2FsZVk7XHJcbiAgICB2YXIgdHJhbnNmb3JtZWQgPSAhIXggfHwgISF5IHx8ICEhdGhpcy5yb3RhdGlvbiB8fCBzY2FsZVggIT09IDEgfHwgc2NhbGVZICE9PSAxIHx8IHRoaXMub3BhY2l0eSAhPSBudWxsO1xyXG5cclxuICAgIC8vIFRPRE8gSW52ZXN0aWdhdGUgY29zdCBvZiBhbHdheXMgc2F2ZS9yZXN0b3JlXHJcbiAgICBpZiAodHJhbnNmb3JtZWQpIHtcclxuICAgICAgY3R4LnNhdmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoeCB8fCB5KSB7XHJcbiAgICAgIGN0eC50cmFuc2xhdGUoeCx5KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc2NhbGVYICE9PSAxIHx8IHNjYWxlWSAhPT0gMSkge1xyXG4gICAgICBjdHguc2NhbGUoc2NhbGVYLCBzY2FsZVkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnJvdGF0aW9uKSB7XHJcbiAgICAgIGN0eC5yb3RhdGUodGhpcy5yb3RhdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMub3BhY2l0eSAhPSBudWxsKSB7XHJcbiAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMub3BhY2l0eTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmRyYXcoY3R4KTtcclxuXHJcbiAgICBpZiAodHJhbnNmb3JtZWQpIHtcclxuICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBJbnRlcm5hbDogdGVzdHMgZm9yIHBpY2sgaGl0IGdpdmVuIGNvbnRleHQsIGdsb2JhbCBhbmQgbG9jYWxcclxuICAgKiBjb29yZGluYXRlIHN5c3RlbSB0cmFuc2Zvcm1lZCBwaWNrIGNvb3JkaW5hdGVzLlxyXG4gICAqL1xyXG4gIHBpY2s6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICBpZiAoIXRoaXMudmlzaWJsZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IG51bGw7XHJcbiAgICB2YXIgcywgYywgdGVtcDtcclxuXHJcbiAgICB2YXIgdHggPSB0aGlzLnggfHwgMDtcclxuICAgIHZhciB0eSA9IHRoaXMueSB8fCAwO1xyXG4gICAgdmFyIHNjYWxlWCA9IHRoaXMuc2NhbGVYID09IG51bGwgPyAxIDogdGhpcy5zY2FsZVg7XHJcbiAgICB2YXIgc2NhbGVZID0gdGhpcy5zY2FsZVkgPT0gbnVsbCA/IDEgOiB0aGlzLnNjYWxlWTtcclxuICAgIHZhciB0cmFuc2Zvcm1lZCA9ICEhdHggfHwgISF0eSB8fCAhIXRoaXMucm90YXRpb24gfHwgc2NhbGVYICE9PSAxIHx8IHNjYWxlWSAhPT0gMSB8fCB0aGlzLm9wYWNpdHkgIT0gbnVsbDtcclxuXHJcbiAgICAvLyBUT0RPIEludmVzdGlnYXRlIGNvc3Qgb2YgYWx3YXlzIHNhdmUvcmVzdG9yZVxyXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XHJcbiAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR4IHx8IHR5KSB7XHJcbiAgICAgIGN0eC50cmFuc2xhdGUodHgsdHkpO1xyXG4gICAgICAvLyBSZXZlcnNlIHRyYW5zbGF0aW9uIG9uIHBpY2tlZCBwb2ludFxyXG4gICAgICBseCAtPSB0eDtcclxuICAgICAgbHkgLT0gdHk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNjYWxlWCAhPT0gMSB8fCBzY2FsZVkgIT09IDEpIHtcclxuICAgICAgY3R4LnNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcclxuICAgICAgLy8gUmV2ZXJzZSBzY2FsZVxyXG4gICAgICBseCAvPSBzY2FsZVg7XHJcbiAgICAgIGx5IC89IHNjYWxlWTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5yb3RhdGlvbikge1xyXG4gICAgICBjdHgucm90YXRlKHRoaXMucm90YXRpb24pO1xyXG4gICAgICAvLyBSZXZlcnNlIHJvdGF0aW9uXHJcbiAgICAgIHMgPSBNYXRoLnNpbigtdGhpcy5yb3RhdGlvbik7XHJcbiAgICAgIGMgPSBNYXRoLmNvcygtdGhpcy5yb3RhdGlvbik7XHJcbiAgICAgIHRlbXAgPSBjKmx4IC0gcypseTtcclxuICAgICAgbHkgPSBzKmx4ICsgYypseTtcclxuICAgICAgbHggPSB0ZW1wO1xyXG4gICAgfVxyXG5cclxuICAgIHJlc3VsdCA9IHRoaXMuaGl0VGVzdChjdHgsIHgsIHksIGx4LCBseSk7XHJcblxyXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XHJcbiAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBUZW1wbGF0ZSBtZXRob2QgZm9yIGRlcml2ZWQgb2JqZWN0cyB0byBhY3R1YWxseSBwZXJmb3JtIGRyYXcgb3BlcmF0aW9ucy5cclxuICAgKiBUaGUgY2FsbGluZyBgcmVuZGVyYCBjYWxsIGhhbmRsZXMgZ2VuZXJhbCB0cmFuc2Zvcm1zIGFuZCBvcGFjaXR5LlxyXG4gICAqL1xyXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgLy8gdGVtcGxhdGUgbWV0aG9kXHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogVGVtcGxhdGUgbWV0aG9kIGZvciBkZXJpdmVkIG9iamVjdHMgdG8gdGVzdCBpZiB0aGV5IChvciBjaGlsZCkgaXMgaGl0IGJ5XHJcbiAgICogdGhlIHByb3ZpZGVkIHBpY2sgY29vcmRpbmF0ZS4gSWYgaGl0LCByZXR1cm4gb2JqZWN0IHRoYXQgd2FzIGhpdC5cclxuICAgKi9cclxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xyXG4gICAgLy8gdGVtcGxhdGUgbWV0aG9kXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxudmFyIHN2ZyA9IHJlcXVpcmUoJy4vc3ZnJyk7XHJcblxyXG5cclxudmFyIE5PTkUgPSBbXTtcclxuXHJcbi8qKlxyXG4gKiBWZWN0b3IgUGF0aCBOb2RlXHJcbiAqXHJcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XHJcbiAqXHJcbiAqIHBhdGg6IGEgdmFsaWQgU1ZHIHBhdGggc3RyaW5nIChlLmcuICdNLTUsMEE1LDUsMCwwLDEsNSwwQTUsNSwwLDAsMSwtNSwwWicpXHJcbiAqICAgdG8gZHJhd1xyXG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGgsIGxpbmVDYXAsIGxpbmVKb2luLCBtaXRlckxpbWl0OlxyXG4gKiAgIGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxyXG4gKiBsaW5lRGFzaDogYW4gYXJyYXkgc3BlY2lmeWluZyBvbi9vZmYgcGl4ZWwgcGF0dGVyblxyXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxyXG4gKiBsaW5lRGFzaE9mZnNldDogYSBwaXhlbCBvZmZzZXQgdG8gc3RhcnQgdGhlIGRhc2hlcyAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXHJcbiAqXHJcbiAqIE5vdGU6IGlmIGBzdHJva2VTdHlsZWAgaXMgc3BlY2lmaWVkLCBwaWNraW5nIHdpbGwgYmUgZW5hYmxlZCBvbiB0aGUgcGF0aCBzdHJva2Uvb3V0bGluZS5cclxuICogSWYgYGZpbGxTdHlsZWAgaXMgc3BlY2lmaWVkLCBwaWNraW5nIHdpbGwgYmUgZW5hYmxlZCBvbiB0aGUgaW50ZXJpb3IgZmlsbGVkIGFyZWFcclxuICogb2YgdGhlIHBhdGguXHJcbiAqL1xyXG52YXIgUGF0aCA9IGZ1bmN0aW9uKCkge1xyXG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcblxyXG5QYXRoLnByb3RvdHlwZSA9IF8uZXh0ZW5kKFBhdGgucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xyXG5cclxuICBza2V0Y2g6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgdmFyIHBhdGggPSB0aGlzLnBhdGg7XHJcbiAgICBpZiAocGF0aCAmJiBwYXRoLmxlbmd0aCA+IDApIHtcclxuICAgICAgdmFyIHBhdGhDb21tYW5kcyA9IHRoaXMuX2NvbW1hbmRDYWNoZSB8fCAodGhpcy5fY29tbWFuZENhY2hlID0gc3ZnLnBhcnNlKHBhdGgpKTtcclxuICAgICAgc3ZnLnJlbmRlcihjdHgsIHBhdGhDb21tYW5kcyk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XHJcbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZmlsbFN0eWxlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XHJcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGU7XHJcbiAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xyXG4gICAgICBjdHgubGluZUNhcCA9IHRoaXMubGluZUNhcCB8fCAnYnV0dCc7XHJcbiAgICAgIGN0eC5saW5lSm9pbiA9IHRoaXMubGluZUpvaW4gfHwgJ21pdGVyJztcclxuICAgICAgY3R4Lm1pdGVyTGltaXQgPSB0aGlzLm1pdGVyTGltaXQgfHwgMTA7XHJcbiAgICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoIHx8IE5PTkUpO1xyXG4gICAgICBjdHguc2V0TGluZURhc2hPZmZzZXQodGhpcy5saW5lRGFzaE9mZnNldCB8fCAwKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnNrZXRjaChjdHgpO1xyXG5cclxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XHJcbiAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xyXG4gICAgICBjdHguZmlsbCgpO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICB0aGlzLnNrZXRjaChjdHgpO1xyXG5cclxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSAmJiBjdHguaXNQb2ludEluUGF0aCh4LHkpKSB7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUgJiYgY3R4LmlzUG9pbnRJblN0cm9rZSh4LHkpKSB7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcblxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBhdGgucHJvdG90eXBlLCAncGF0aCcsIHtcclxuICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3BhdGg7XHJcbiAgfSxcclxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICBpZiAodGhpcy5fcGF0aCAhPT0gdmFsdWUpIHtcclxuICAgICAgdGhpcy5fcGF0aCA9IHZhbHVlO1xyXG4gICAgICB0aGlzLl9jb21tYW5kQ2FjaGUgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQYXRoOyIsIlxyXG4vLyAtLS0tXHJcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZVxyXG5cclxuLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cclxuLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xyXG5cclxuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxyXG5cclxuLy8gTUlUIGxpY2Vuc2VcclxuXHJcbnZhciByQUYgPSAoZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHJBRjtcclxuXHJcbiAgaWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcclxuICAgIHJBRiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuYmluZCh3aW5kb3cpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGxhc3RUaW1lID0gMDtcclxuICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XHJcbiAgZm9yKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICFyQUY7ICsreCkge1xyXG4gICAgckFGID0gd2luZG93W3ZlbmRvcnNbeF0rJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFyQUYpXHJcbiAgICByQUYgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xyXG4gICAgICB2YXIgY3VyclRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XHJcbiAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LCB0aW1lVG9DYWxsKTtcclxuICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XHJcbiAgICAgIHJldHVybiBpZDtcclxuICAgIH07XHJcblxyXG4gIHJldHVybiByQUY7XHJcbn0oKSk7XHJcblxyXG5cclxuLy8gLS0tLVxyXG4vLyBEYXNoIHN1cHBvcnQgZm9yIGNhbnZhcyBjb250ZXh0XHJcblxyXG52YXIgZGFzaFN1cHBvcnQgPSBmdW5jdGlvbihjdHgpIHtcclxuICB2YXIgTk9PUCA9IGZ1bmN0aW9uKCl7fTtcclxuXHJcbiAgaWYgKGN0eC5zZXRMaW5lRGFzaCkge1xyXG4gICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0ID0gZnVuY3Rpb24ob2ZmKSB7IHRoaXMubGluZURhc2hPZmZzZXQgPSBvZmY7IH07XHJcbiAgfSBlbHNlIGlmIChjdHgud2Via2l0TGluZURhc2ggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgY3R4LnNldExpbmVEYXNoID0gZnVuY3Rpb24oZGFzaCkgeyB0aGlzLndlYmtpdExpbmVEYXNoID0gZGFzaDsgfTtcclxuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IGZ1bmN0aW9uKG9mZikgeyB0aGlzLndlYmtpdExpbmVEYXNoT2Zmc2V0ID0gb2ZmOyB9O1xyXG4gIH0gZWxzZSBpZiAoY3R4Lm1vekRhc2ggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgY3R4LnNldExpbmVEYXNoID0gZnVuY3Rpb24oZGFzaCkgeyB0aGlzLm1vekRhc2ggPSBkYXNoOyB9O1xyXG4gICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0ID0gTk9PUDtcclxuICB9IGVsc2Uge1xyXG4gICAgY3R4LnNldExpbmVEYXNoID0gTk9PUDtcclxuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IE5PT1A7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiByQUYsXHJcbiAgZGFzaFN1cHBvcnQ6IGRhc2hTdXBwb3J0XHJcbn07IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcbnZhciBOT05FID0gW107XHJcblxyXG4vKipcclxuICogUmVjdGFuZ2xlIE5vZGVcclxuICpcclxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcclxuICpcclxuICogd2lkdGg6IHdpZHRoIG9mIHRoZSByZWN0YW5nbGVcclxuICogaGVpZ2h0OiBoZWlnaHQgb2YgdGhlIHJlY3RhbmdsZVxyXG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGgsIGxpbmVDYXAsIGxpbmVKb2luLCBtaXRlckxpbWl0OlxyXG4gKiAgIGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxyXG4gKiBsaW5lRGFzaDogYW4gYXJyYXkgc3BlY2lmeWluZyBvbi9vZmYgcGl4ZWwgcGF0dGVyblxyXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxyXG4gKiBsaW5lRGFzaE9mZnNldDogYSBwaXhlbCBvZmZzZXQgdG8gc3RhcnQgdGhlIGRhc2hlcyAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXHJcbiAqXHJcbiAqIE5vdGU6IHBpY2tpbmcgaXMgYWx3YXlzIGVuYWJsZWQgb24gdGhlIGVudGlyZSByZWN0IChubyBzdHJva2Utb25seSBwaWNraW5nKSBhdFxyXG4gKiB0aGUgbW9tZW50LlxyXG4gKi9cclxudmFyIFJlY3QgPSBmdW5jdGlvbigpIHtcclxuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn07XHJcblxyXG5cclxuUmVjdC5wcm90b3R5cGUgPSBfLmV4dGVuZChSZWN0LnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcclxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggfHwgMDtcclxuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCB8fCAwO1xyXG5cclxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsU3R5bGU7XHJcbiAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XHJcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGU7XHJcbiAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xyXG4gICAgICBjdHgubGluZUNhcCA9IHRoaXMubGluZUNhcCB8fCAnYnV0dCc7XHJcbiAgICAgIGN0eC5saW5lSm9pbiA9IHRoaXMubGluZUpvaW4gfHwgJ21pdGVyJztcclxuICAgICAgY3R4Lm1pdGVyTGltaXQgPSB0aGlzLm1pdGVyTGltaXQgfHwgMTA7XHJcbiAgICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoIHx8IE5PTkUpO1xyXG4gICAgICBjdHguc2V0TGluZURhc2hPZmZzZXQodGhpcy5saW5lRGFzaE9mZnNldCB8fCAwKTtcclxuICAgICAgY3R4LnN0cm9rZVJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggfHwgMDtcclxuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCB8fCAwO1xyXG5cclxuICAgIGlmIChseCA+PSAwICYmIGx4IDwgd2lkdGggJiYgbHkgPj0gMCAmJiBseSA8IGhlaWdodCkge1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVjdDsiLCIvKipcclxuICBTVkcgcGF0aCB0byBjYW52YXMgcGF0aCBza2V0Y2hpbmcsIHRha2VuIGFuZCBhZGFwdGVkIGZyb206XHJcbiAgIC0gVmVnYTogZ2l0aHViLmNvbS90cmlmYWN0YS92ZWdhXHJcbiAgICAgTGljZW5zZTogaHR0cHM6Ly9naXRodWIuY29tL3RyaWZhY3RhL3ZlZ2EvYmxvYi9tYXN0ZXIvTElDRU5TRVxyXG4gICAtIEZhYnJpYy5qczogZ2l0aHViLmNvbS9rYW5nYXgvZmFicmljLmpzL2Jsb2IvbWFzdGVyL3NyYy9zaGFwZXMvcGF0aC5jbGFzcy5qc1xyXG4gICAgIExpY2Vuc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rYW5nYXgvZmFicmljLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcclxuKi9cclxuXHJcblxyXG4vLyBQYXRoIHBhcnNpbmcgYW5kIHJlbmRlcmluZyBjb2RlIHRha2VuIGZyb20gZmFicmljLmpzIC0tIFRoYW5rcyFcclxudmFyIGNvbW1hbmRMZW5ndGhzID0geyBtOjIsIGw6MiwgaDoxLCB2OjEsIGM6Niwgczo0LCBxOjQsIHQ6MiwgYTo3IH0sXHJcbiAgICByZXBlYXRlZENvbW1hbmRzID0geyBtOiAnbCcsIE06ICdMJyB9LFxyXG4gICAgdG9rZW5pemVyID0gL1ttemxodmNzcXRhXVtebXpsaHZjc3F0YV0qL2dpLFxyXG4gICAgZGlnaXRzID0gLyhbLStdPygoXFxkK1xcLlxcZCspfCgoXFxkKyl8KFxcLlxcZCspKSkoPzplWy0rXT9cXGQrKT8pL2lnO1xyXG5cclxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xyXG4gIHZhciByZXN1bHQgPSBbIF0sXHJcbiAgICAgIGNvb3JkcyA9IFsgXSxcclxuICAgICAgY3VycmVudFBhdGgsXHJcbiAgICAgIHBhcnNlZCxcclxuICAgICAgbWF0Y2gsXHJcbiAgICAgIGNvb3Jkc1N0cjtcclxuXHJcbiAgLy8gRmlyc3QsIGJyZWFrIHBhdGggaW50byBjb21tYW5kIHNlcXVlbmNlXHJcbiAgcGF0aCA9IHBhdGgubWF0Y2godG9rZW5pemVyKTtcclxuXHJcbiAgLy8gTmV4dCwgcGFyc2UgZWFjaCBjb21tYW5kIGluIHR1cm5cclxuICBmb3IgKHZhciBpID0gMCwgY29vcmRzUGFyc2VkLCBsZW4gPSBwYXRoLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICBjdXJyZW50UGF0aCA9IHBhdGhbaV07XHJcblxyXG4gICAgY29vcmRzU3RyID0gY3VycmVudFBhdGguc2xpY2UoMSkudHJpbSgpO1xyXG4gICAgY29vcmRzLmxlbmd0aCA9IDA7XHJcblxyXG4gICAgd2hpbGUgKChtYXRjaCA9IGRpZ2l0cy5leGVjKGNvb3Jkc1N0cikpKSB7XHJcbiAgICAgIGNvb3Jkcy5wdXNoKG1hdGNoWzBdKTtcclxuICAgIH1cclxuXHJcbiAgICBjb29yZHNQYXJzZWQgPSBbIGN1cnJlbnRQYXRoLmNoYXJBdCgwKSBdO1xyXG5cclxuICAgIGZvciAodmFyIGogPSAwLCBqbGVuID0gY29vcmRzLmxlbmd0aDsgaiA8IGpsZW47IGorKykge1xyXG4gICAgICBwYXJzZWQgPSBwYXJzZUZsb2F0KGNvb3Jkc1tqXSk7XHJcbiAgICAgIGlmICghaXNOYU4ocGFyc2VkKSkge1xyXG4gICAgICAgIGNvb3Jkc1BhcnNlZC5wdXNoKHBhcnNlZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgY29tbWFuZCA9IGNvb3Jkc1BhcnNlZFswXSxcclxuICAgICAgICBjb21tYW5kTGVuZ3RoID0gY29tbWFuZExlbmd0aHNbY29tbWFuZC50b0xvd2VyQ2FzZSgpXSxcclxuICAgICAgICByZXBlYXRlZENvbW1hbmQgPSByZXBlYXRlZENvbW1hbmRzW2NvbW1hbmRdIHx8IGNvbW1hbmQ7XHJcblxyXG4gICAgaWYgKGNvb3Jkc1BhcnNlZC5sZW5ndGggLSAxID4gY29tbWFuZExlbmd0aCkge1xyXG4gICAgICBmb3IgKHZhciBrID0gMSwga2xlbiA9IGNvb3Jkc1BhcnNlZC5sZW5ndGg7IGsgPCBrbGVuOyBrICs9IGNvbW1hbmRMZW5ndGgpIHtcclxuICAgICAgICByZXN1bHQucHVzaChbIGNvbW1hbmQgXS5jb25jYXQoY29vcmRzUGFyc2VkLnNsaWNlKGssIGsgKyBjb21tYW5kTGVuZ3RoKSkpO1xyXG4gICAgICAgIGNvbW1hbmQgPSByZXBlYXRlZENvbW1hbmQ7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICByZXN1bHQucHVzaChjb29yZHNQYXJzZWQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0FyYyhnLCB4LCB5LCBjb29yZHMsIGJvdW5kcywgbCwgdCkge1xyXG4gIHZhciByeCA9IGNvb3Jkc1swXTtcclxuICB2YXIgcnkgPSBjb29yZHNbMV07XHJcbiAgdmFyIHJvdCA9IGNvb3Jkc1syXTtcclxuICB2YXIgbGFyZ2UgPSBjb29yZHNbM107XHJcbiAgdmFyIHN3ZWVwID0gY29vcmRzWzRdO1xyXG4gIHZhciBleCA9IGNvb3Jkc1s1XTtcclxuICB2YXIgZXkgPSBjb29yZHNbNl07XHJcbiAgdmFyIHNlZ3MgPSBhcmNUb1NlZ21lbnRzKGV4LCBleSwgcngsIHJ5LCBsYXJnZSwgc3dlZXAsIHJvdCwgeCwgeSk7XHJcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBiZXogPSBzZWdtZW50VG9CZXppZXIuYXBwbHkobnVsbCwgc2Vnc1tpXSk7XHJcbiAgICBnLmJlemllckN1cnZlVG8uYXBwbHkoZywgYmV6KTtcclxuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzBdLWwsIGJlelsxXS10KTtcclxuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzJdLWwsIGJlelszXS10KTtcclxuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzRdLWwsIGJlels1XS10KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJvdW5kQXJjKHgsIHksIGNvb3JkcywgYm91bmRzKSB7XHJcbiAgdmFyIHJ4ID0gY29vcmRzWzBdO1xyXG4gIHZhciByeSA9IGNvb3Jkc1sxXTtcclxuICB2YXIgcm90ID0gY29vcmRzWzJdO1xyXG4gIHZhciBsYXJnZSA9IGNvb3Jkc1szXTtcclxuICB2YXIgc3dlZXAgPSBjb29yZHNbNF07XHJcbiAgdmFyIGV4ID0gY29vcmRzWzVdO1xyXG4gIHZhciBleSA9IGNvb3Jkc1s2XTtcclxuICB2YXIgc2VncyA9IGFyY1RvU2VnbWVudHMoZXgsIGV5LCByeCwgcnksIGxhcmdlLCBzd2VlcCwgcm90LCB4LCB5KTtcclxuICBmb3IgKHZhciBpPTA7IGk8c2Vncy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGJleiA9IHNlZ21lbnRUb0Jlemllci5hcHBseShudWxsLCBzZWdzW2ldKTtcclxuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzBdLCBiZXpbMV0pO1xyXG4gICAgLy8gYm91bmRzLmFkZChiZXpbMl0sIGJlelszXSk7XHJcbiAgICAvLyBib3VuZHMuYWRkKGJlels0XSwgYmV6WzVdKTtcclxuICB9XHJcbn1cclxuXHJcbnZhciBhcmNUb1NlZ21lbnRzQ2FjaGUgPSB7IH0sXHJcbiAgICBzZWdtZW50VG9CZXppZXJDYWNoZSA9IHsgfSxcclxuICAgIGpvaW4gPSBBcnJheS5wcm90b3R5cGUuam9pbixcclxuICAgIGFyZ3NTdHI7XHJcblxyXG4vLyBDb3BpZWQgZnJvbSBJbmtzY2FwZSBzdmd0b3BkZiwgdGhhbmtzIVxyXG5mdW5jdGlvbiBhcmNUb1NlZ21lbnRzKHgsIHksIHJ4LCByeSwgbGFyZ2UsIHN3ZWVwLCByb3RhdGVYLCBveCwgb3kpIHtcclxuICBhcmdzU3RyID0gam9pbi5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgaWYgKGFyY1RvU2VnbWVudHNDYWNoZVthcmdzU3RyXSkge1xyXG4gICAgcmV0dXJuIGFyY1RvU2VnbWVudHNDYWNoZVthcmdzU3RyXTtcclxuICB9XHJcblxyXG4gIHZhciB0aCA9IHJvdGF0ZVggKiAoTWF0aC5QSS8xODApO1xyXG4gIHZhciBzaW5fdGggPSBNYXRoLnNpbih0aCk7XHJcbiAgdmFyIGNvc190aCA9IE1hdGguY29zKHRoKTtcclxuICByeCA9IE1hdGguYWJzKHJ4KTtcclxuICByeSA9IE1hdGguYWJzKHJ5KTtcclxuICB2YXIgcHggPSBjb3NfdGggKiAob3ggLSB4KSAqIDAuNSArIHNpbl90aCAqIChveSAtIHkpICogMC41O1xyXG4gIHZhciBweSA9IGNvc190aCAqIChveSAtIHkpICogMC41IC0gc2luX3RoICogKG94IC0geCkgKiAwLjU7XHJcbiAgdmFyIHBsID0gKHB4KnB4KSAvIChyeCpyeCkgKyAocHkqcHkpIC8gKHJ5KnJ5KTtcclxuICBpZiAocGwgPiAxKSB7XHJcbiAgICBwbCA9IE1hdGguc3FydChwbCk7XHJcbiAgICByeCAqPSBwbDtcclxuICAgIHJ5ICo9IHBsO1xyXG4gIH1cclxuXHJcbiAgdmFyIGEwMCA9IGNvc190aCAvIHJ4O1xyXG4gIHZhciBhMDEgPSBzaW5fdGggLyByeDtcclxuICB2YXIgYTEwID0gKC1zaW5fdGgpIC8gcnk7XHJcbiAgdmFyIGExMSA9IChjb3NfdGgpIC8gcnk7XHJcbiAgdmFyIHgwID0gYTAwICogb3ggKyBhMDEgKiBveTtcclxuICB2YXIgeTAgPSBhMTAgKiBveCArIGExMSAqIG95O1xyXG4gIHZhciB4MSA9IGEwMCAqIHggKyBhMDEgKiB5O1xyXG4gIHZhciB5MSA9IGExMCAqIHggKyBhMTEgKiB5O1xyXG5cclxuICB2YXIgZCA9ICh4MS14MCkgKiAoeDEteDApICsgKHkxLXkwKSAqICh5MS15MCk7XHJcbiAgdmFyIHNmYWN0b3Jfc3EgPSAxIC8gZCAtIDAuMjU7XHJcbiAgaWYgKHNmYWN0b3Jfc3EgPCAwKSBzZmFjdG9yX3NxID0gMDtcclxuICB2YXIgc2ZhY3RvciA9IE1hdGguc3FydChzZmFjdG9yX3NxKTtcclxuICBpZiAoc3dlZXAgPT0gbGFyZ2UpIHNmYWN0b3IgPSAtc2ZhY3RvcjtcclxuICB2YXIgeGMgPSAwLjUgKiAoeDAgKyB4MSkgLSBzZmFjdG9yICogKHkxLXkwKTtcclxuICB2YXIgeWMgPSAwLjUgKiAoeTAgKyB5MSkgKyBzZmFjdG9yICogKHgxLXgwKTtcclxuXHJcbiAgdmFyIHRoMCA9IE1hdGguYXRhbjIoeTAteWMsIHgwLXhjKTtcclxuICB2YXIgdGgxID0gTWF0aC5hdGFuMih5MS15YywgeDEteGMpO1xyXG5cclxuICB2YXIgdGhfYXJjID0gdGgxLXRoMDtcclxuICBpZiAodGhfYXJjIDwgMCAmJiBzd2VlcCA9PSAxKXtcclxuICAgIHRoX2FyYyArPSAyKk1hdGguUEk7XHJcbiAgfSBlbHNlIGlmICh0aF9hcmMgPiAwICYmIHN3ZWVwID09IDApIHtcclxuICAgIHRoX2FyYyAtPSAyICogTWF0aC5QSTtcclxuICB9XHJcblxyXG4gIHZhciBzZWdtZW50cyA9IE1hdGguY2VpbChNYXRoLmFicyh0aF9hcmMgLyAoTWF0aC5QSSAqIDAuNSArIDAuMDAxKSkpO1xyXG4gIHZhciByZXN1bHQgPSBbXTtcclxuICBmb3IgKHZhciBpPTA7IGk8c2VnbWVudHM7IGkrKykge1xyXG4gICAgdmFyIHRoMiA9IHRoMCArIGkgKiB0aF9hcmMgLyBzZWdtZW50cztcclxuICAgIHZhciB0aDMgPSB0aDAgKyAoaSsxKSAqIHRoX2FyYyAvIHNlZ21lbnRzO1xyXG4gICAgcmVzdWx0W2ldID0gW3hjLCB5YywgdGgyLCB0aDMsIHJ4LCByeSwgc2luX3RoLCBjb3NfdGhdO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIChhcmNUb1NlZ21lbnRzQ2FjaGVbYXJnc1N0cl0gPSByZXN1bHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWdtZW50VG9CZXppZXIoY3gsIGN5LCB0aDAsIHRoMSwgcngsIHJ5LCBzaW5fdGgsIGNvc190aCkge1xyXG4gIGFyZ3NTdHIgPSBqb2luLmNhbGwoYXJndW1lbnRzKTtcclxuICBpZiAoc2VnbWVudFRvQmV6aWVyQ2FjaGVbYXJnc1N0cl0pIHtcclxuICAgIHJldHVybiBzZWdtZW50VG9CZXppZXJDYWNoZVthcmdzU3RyXTtcclxuICB9XHJcblxyXG4gIHZhciBhMDAgPSBjb3NfdGggKiByeDtcclxuICB2YXIgYTAxID0gLXNpbl90aCAqIHJ5O1xyXG4gIHZhciBhMTAgPSBzaW5fdGggKiByeDtcclxuICB2YXIgYTExID0gY29zX3RoICogcnk7XHJcblxyXG4gIHZhciBjb3NfdGgwID0gTWF0aC5jb3ModGgwKTtcclxuICB2YXIgc2luX3RoMCA9IE1hdGguc2luKHRoMCk7XHJcbiAgdmFyIGNvc190aDEgPSBNYXRoLmNvcyh0aDEpO1xyXG4gIHZhciBzaW5fdGgxID0gTWF0aC5zaW4odGgxKTtcclxuXHJcbiAgdmFyIHRoX2hhbGYgPSAwLjUgKiAodGgxIC0gdGgwKTtcclxuICB2YXIgc2luX3RoX2gyID0gTWF0aC5zaW4odGhfaGFsZiAqIDAuNSk7XHJcbiAgdmFyIHQgPSAoOC8zKSAqIHNpbl90aF9oMiAqIHNpbl90aF9oMiAvIE1hdGguc2luKHRoX2hhbGYpO1xyXG4gIHZhciB4MSA9IGN4ICsgY29zX3RoMCAtIHQgKiBzaW5fdGgwO1xyXG4gIHZhciB5MSA9IGN5ICsgc2luX3RoMCArIHQgKiBjb3NfdGgwO1xyXG4gIHZhciB4MyA9IGN4ICsgY29zX3RoMTtcclxuICB2YXIgeTMgPSBjeSArIHNpbl90aDE7XHJcbiAgdmFyIHgyID0geDMgKyB0ICogc2luX3RoMTtcclxuICB2YXIgeTIgPSB5MyAtIHQgKiBjb3NfdGgxO1xyXG5cclxuICByZXR1cm4gKHNlZ21lbnRUb0JlemllckNhY2hlW2FyZ3NTdHJdID0gW1xyXG4gICAgYTAwICogeDEgKyBhMDEgKiB5MSwgIGExMCAqIHgxICsgYTExICogeTEsXHJcbiAgICBhMDAgKiB4MiArIGEwMSAqIHkyLCAgYTEwICogeDIgKyBhMTEgKiB5MixcclxuICAgIGEwMCAqIHgzICsgYTAxICogeTMsICBhMTAgKiB4MyArIGExMSAqIHkzXHJcbiAgXSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlcihnLCBwYXRoLCBsLCB0KSB7XHJcbiAgdmFyIGN1cnJlbnQsIC8vIGN1cnJlbnQgaW5zdHJ1Y3Rpb25cclxuICAgICAgcHJldmlvdXMgPSBudWxsLFxyXG4gICAgICB4ID0gMCwgLy8gY3VycmVudCB4XHJcbiAgICAgIHkgPSAwLCAvLyBjdXJyZW50IHlcclxuICAgICAgY29udHJvbFggPSAwLCAvLyBjdXJyZW50IGNvbnRyb2wgcG9pbnQgeFxyXG4gICAgICBjb250cm9sWSA9IDAsIC8vIGN1cnJlbnQgY29udHJvbCBwb2ludCB5XHJcbiAgICAgIHRlbXBYLFxyXG4gICAgICB0ZW1wWSxcclxuICAgICAgdGVtcENvbnRyb2xYLFxyXG4gICAgICB0ZW1wQ29udHJvbFksXHJcbiAgICAgIGJvdW5kcztcclxuICBpZiAobCA9PSB1bmRlZmluZWQpIGwgPSAwO1xyXG4gIGlmICh0ID09IHVuZGVmaW5lZCkgdCA9IDA7XHJcblxyXG4gIGcuYmVnaW5QYXRoKCk7XHJcblxyXG4gIGZvciAodmFyIGk9MCwgbGVuPXBhdGgubGVuZ3RoOyBpPGxlbjsgKytpKSB7XHJcbiAgICBjdXJyZW50ID0gcGF0aFtpXTtcclxuXHJcbiAgICBzd2l0Y2ggKGN1cnJlbnRbMF0pIHsgLy8gZmlyc3QgbGV0dGVyXHJcblxyXG4gICAgICBjYXNlICdsJzogLy8gbGluZXRvLCByZWxhdGl2ZVxyXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcclxuICAgICAgICB5ICs9IGN1cnJlbnRbMl07XHJcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnTCc6IC8vIGxpbmV0bywgYWJzb2x1dGVcclxuICAgICAgICB4ID0gY3VycmVudFsxXTtcclxuICAgICAgICB5ID0gY3VycmVudFsyXTtcclxuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdoJzogLy8gaG9yaXpvbnRhbCBsaW5ldG8sIHJlbGF0aXZlXHJcbiAgICAgICAgeCArPSBjdXJyZW50WzFdO1xyXG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ0gnOiAvLyBob3Jpem9udGFsIGxpbmV0bywgYWJzb2x1dGVcclxuICAgICAgICB4ID0gY3VycmVudFsxXTtcclxuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICd2JzogLy8gdmVydGljYWwgbGluZXRvLCByZWxhdGl2ZVxyXG4gICAgICAgIHkgKz0gY3VycmVudFsxXTtcclxuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdWJzogLy8gdmVyaWNhbCBsaW5ldG8sIGFic29sdXRlXHJcbiAgICAgICAgeSA9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnbSc6IC8vIG1vdmVUbywgcmVsYXRpdmVcclxuICAgICAgICB4ICs9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgeSArPSBjdXJyZW50WzJdO1xyXG4gICAgICAgIGcubW92ZVRvKHggKyBsLCB5ICsgdCk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ00nOiAvLyBtb3ZlVG8sIGFic29sdXRlXHJcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgeSA9IGN1cnJlbnRbMl07XHJcbiAgICAgICAgZy5tb3ZlVG8oeCArIGwsIHkgKyB0KTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnYyc6IC8vIGJlemllckN1cnZlVG8sIHJlbGF0aXZlXHJcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFs1XTtcclxuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzZdO1xyXG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbM107XHJcbiAgICAgICAgY29udHJvbFkgPSB5ICsgY3VycmVudFs0XTtcclxuICAgICAgICBnLmJlemllckN1cnZlVG8oXHJcbiAgICAgICAgICB4ICsgY3VycmVudFsxXSArIGwsIC8vIHgxXHJcbiAgICAgICAgICB5ICsgY3VycmVudFsyXSArIHQsIC8vIHkxXHJcbiAgICAgICAgICBjb250cm9sWCArIGwsIC8vIHgyXHJcbiAgICAgICAgICBjb250cm9sWSArIHQsIC8vIHkyXHJcbiAgICAgICAgICB0ZW1wWCArIGwsXHJcbiAgICAgICAgICB0ZW1wWSArIHRcclxuICAgICAgICApO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCArIGN1cnJlbnRbMV0sIHkgKyBjdXJyZW50WzJdKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xyXG4gICAgICAgIHggPSB0ZW1wWDtcclxuICAgICAgICB5ID0gdGVtcFk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdDJzogLy8gYmV6aWVyQ3VydmVUbywgYWJzb2x1dGVcclxuICAgICAgICB4ID0gY3VycmVudFs1XTtcclxuICAgICAgICB5ID0gY3VycmVudFs2XTtcclxuICAgICAgICBjb250cm9sWCA9IGN1cnJlbnRbM107XHJcbiAgICAgICAgY29udHJvbFkgPSBjdXJyZW50WzRdO1xyXG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcclxuICAgICAgICAgIGN1cnJlbnRbMV0gKyBsLFxyXG4gICAgICAgICAgY3VycmVudFsyXSArIHQsXHJcbiAgICAgICAgICBjb250cm9sWCArIGwsXHJcbiAgICAgICAgICBjb250cm9sWSArIHQsXHJcbiAgICAgICAgICB4ICsgbCxcclxuICAgICAgICAgIHkgKyB0XHJcbiAgICAgICAgKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKGN1cnJlbnRbMV0sIGN1cnJlbnRbMl0pO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAncyc6IC8vIHNob3J0aGFuZCBjdWJpYyBiZXppZXJDdXJ2ZVRvLCByZWxhdGl2ZVxyXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0byBhYnNvbHV0ZSB4LHlcclxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzNdO1xyXG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbNF07XHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHNcclxuICAgICAgICBjb250cm9sWCA9IDIgKiB4IC0gY29udHJvbFg7XHJcbiAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xyXG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcclxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcclxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcclxuICAgICAgICAgIHggKyBjdXJyZW50WzFdICsgbCxcclxuICAgICAgICAgIHkgKyBjdXJyZW50WzJdICsgdCxcclxuICAgICAgICAgIHRlbXBYICsgbCxcclxuICAgICAgICAgIHRlbXBZICsgdFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCArIGN1cnJlbnRbMV0sIHkgKyBjdXJyZW50WzJdKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XHJcblxyXG4gICAgICAgIC8vIHNldCBjb250cm9sIHBvaW50IHRvIDJuZCBvbmUgb2YgdGhpcyBjb21tYW5kXHJcbiAgICAgICAgLy8gXCIuLi4gdGhlIGZpcnN0IGNvbnRyb2wgcG9pbnQgaXMgYXNzdW1lZCB0byBiZSB0aGUgcmVmbGVjdGlvbiBvZiB0aGUgc2Vjb25kIGNvbnRyb2wgcG9pbnQgb24gdGhlIHByZXZpb3VzIGNvbW1hbmQgcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgcG9pbnQuXCJcclxuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzFdO1xyXG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XHJcblxyXG4gICAgICAgIHggPSB0ZW1wWDtcclxuICAgICAgICB5ID0gdGVtcFk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdTJzogLy8gc2hvcnRoYW5kIGN1YmljIGJlemllckN1cnZlVG8sIGFic29sdXRlXHJcbiAgICAgICAgdGVtcFggPSBjdXJyZW50WzNdO1xyXG4gICAgICAgIHRlbXBZID0gY3VycmVudFs0XTtcclxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50c1xyXG4gICAgICAgIGNvbnRyb2xYID0gMip4IC0gY29udHJvbFg7XHJcbiAgICAgICAgY29udHJvbFkgPSAyKnkgLSBjb250cm9sWTtcclxuICAgICAgICBnLmJlemllckN1cnZlVG8oXHJcbiAgICAgICAgICBjb250cm9sWCArIGwsXHJcbiAgICAgICAgICBjb250cm9sWSArIHQsXHJcbiAgICAgICAgICBjdXJyZW50WzFdICsgbCxcclxuICAgICAgICAgIGN1cnJlbnRbMl0gKyB0LFxyXG4gICAgICAgICAgdGVtcFggKyBsLFxyXG4gICAgICAgICAgdGVtcFkgKyB0XHJcbiAgICAgICAgKTtcclxuICAgICAgICB4ID0gdGVtcFg7XHJcbiAgICAgICAgeSA9IHRlbXBZO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY3VycmVudFsxXSwgY3VycmVudFsyXSk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcclxuICAgICAgICAvLyBzZXQgY29udHJvbCBwb2ludCB0byAybmQgb25lIG9mIHRoaXMgY29tbWFuZFxyXG4gICAgICAgIC8vIFwiLi4uIHRoZSBmaXJzdCBjb250cm9sIHBvaW50IGlzIGFzc3VtZWQgdG8gYmUgdGhlIHJlZmxlY3Rpb24gb2YgdGhlIHNlY29uZCBjb250cm9sIHBvaW50IG9uIHRoZSBwcmV2aW91cyBjb21tYW5kIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50LlwiXHJcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzFdO1xyXG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFsyXTtcclxuXHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdxJzogLy8gcXVhZHJhdGljQ3VydmVUbywgcmVsYXRpdmVcclxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XHJcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFszXTtcclxuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzRdO1xyXG5cclxuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzFdO1xyXG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XHJcblxyXG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcclxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcclxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcclxuICAgICAgICAgIHRlbXBYICsgbCxcclxuICAgICAgICAgIHRlbXBZICsgdFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgeCA9IHRlbXBYO1xyXG4gICAgICAgIHkgPSB0ZW1wWTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnUSc6IC8vIHF1YWRyYXRpY0N1cnZlVG8sIGFic29sdXRlXHJcbiAgICAgICAgdGVtcFggPSBjdXJyZW50WzNdO1xyXG4gICAgICAgIHRlbXBZID0gY3VycmVudFs0XTtcclxuXHJcbiAgICAgICAgZy5xdWFkcmF0aWNDdXJ2ZVRvKFxyXG4gICAgICAgICAgY3VycmVudFsxXSArIGwsXHJcbiAgICAgICAgICBjdXJyZW50WzJdICsgdCxcclxuICAgICAgICAgIHRlbXBYICsgbCxcclxuICAgICAgICAgIHRlbXBZICsgdFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgeCA9IHRlbXBYO1xyXG4gICAgICAgIHkgPSB0ZW1wWTtcclxuICAgICAgICBjb250cm9sWCA9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgY29udHJvbFkgPSBjdXJyZW50WzJdO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICd0JzogLy8gc2hvcnRoYW5kIHF1YWRyYXRpY0N1cnZlVG8sIHJlbGF0aXZlXHJcblxyXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0byBhYnNvbHV0ZSB4LHlcclxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzFdO1xyXG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbMl07XHJcblxyXG4gICAgICAgIGlmIChwcmV2aW91c1swXS5tYXRjaCgvW1FxVHRdLykgPT09IG51bGwpIHtcclxuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIHByZXZpb3VzIGNvbW1hbmQgb3IgaWYgdGhlIHByZXZpb3VzIGNvbW1hbmQgd2FzIG5vdCBhIFEsIHEsIFQgb3IgdCxcclxuICAgICAgICAgIC8vIGFzc3VtZSB0aGUgY29udHJvbCBwb2ludCBpcyBjb2luY2lkZW50IHdpdGggdGhlIGN1cnJlbnQgcG9pbnRcclxuICAgICAgICAgIGNvbnRyb2xYID0geDtcclxuICAgICAgICAgIGNvbnRyb2xZID0geTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAocHJldmlvdXNbMF0gPT09ICd0Jykge1xyXG4gICAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHMgZm9yIHRcclxuICAgICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSB0ZW1wQ29udHJvbFg7XHJcbiAgICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gdGVtcENvbnRyb2xZO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChwcmV2aW91c1swXSA9PT0gJ3EnKSB7XHJcbiAgICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50cyBmb3IgcVxyXG4gICAgICAgICAgY29udHJvbFggPSAyICogeCAtIGNvbnRyb2xYO1xyXG4gICAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGVtcENvbnRyb2xYID0gY29udHJvbFg7XHJcbiAgICAgICAgdGVtcENvbnRyb2xZID0gY29udHJvbFk7XHJcblxyXG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcclxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcclxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcclxuICAgICAgICAgIHRlbXBYICsgbCxcclxuICAgICAgICAgIHRlbXBZICsgdFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgeCA9IHRlbXBYO1xyXG4gICAgICAgIHkgPSB0ZW1wWTtcclxuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzFdO1xyXG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ1QnOlxyXG4gICAgICAgIHRlbXBYID0gY3VycmVudFsxXTtcclxuICAgICAgICB0ZW1wWSA9IGN1cnJlbnRbMl07XHJcblxyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXHJcbiAgICAgICAgY29udHJvbFggPSAyICogeCAtIGNvbnRyb2xYO1xyXG4gICAgICAgIGNvbnRyb2xZID0gMiAqIHkgLSBjb250cm9sWTtcclxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXHJcbiAgICAgICAgICBjb250cm9sWCArIGwsXHJcbiAgICAgICAgICBjb250cm9sWSArIHQsXHJcbiAgICAgICAgICB0ZW1wWCArIGwsXHJcbiAgICAgICAgICB0ZW1wWSArIHRcclxuICAgICAgICApO1xyXG4gICAgICAgIHggPSB0ZW1wWDtcclxuICAgICAgICB5ID0gdGVtcFk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ2EnOlxyXG4gICAgICAgIGRyYXdBcmMoZywgeCArIGwsIHkgKyB0LCBbXHJcbiAgICAgICAgICBjdXJyZW50WzFdLFxyXG4gICAgICAgICAgY3VycmVudFsyXSxcclxuICAgICAgICAgIGN1cnJlbnRbM10sXHJcbiAgICAgICAgICBjdXJyZW50WzRdLFxyXG4gICAgICAgICAgY3VycmVudFs1XSxcclxuICAgICAgICAgIGN1cnJlbnRbNl0gKyB4ICsgbCxcclxuICAgICAgICAgIGN1cnJlbnRbN10gKyB5ICsgdFxyXG4gICAgICAgIF0sIGJvdW5kcywgbCwgdCk7XHJcbiAgICAgICAgeCArPSBjdXJyZW50WzZdO1xyXG4gICAgICAgIHkgKz0gY3VycmVudFs3XTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ0EnOlxyXG4gICAgICAgIGRyYXdBcmMoZywgeCArIGwsIHkgKyB0LCBbXHJcbiAgICAgICAgICBjdXJyZW50WzFdLFxyXG4gICAgICAgICAgY3VycmVudFsyXSxcclxuICAgICAgICAgIGN1cnJlbnRbM10sXHJcbiAgICAgICAgICBjdXJyZW50WzRdLFxyXG4gICAgICAgICAgY3VycmVudFs1XSxcclxuICAgICAgICAgIGN1cnJlbnRbNl0gKyBsLFxyXG4gICAgICAgICAgY3VycmVudFs3XSArIHRcclxuICAgICAgICBdLCBib3VuZHMsIGwsIHQpO1xyXG4gICAgICAgIHggPSBjdXJyZW50WzZdO1xyXG4gICAgICAgIHkgPSBjdXJyZW50WzddO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAneic6XHJcbiAgICAgIGNhc2UgJ1onOlxyXG4gICAgICAgIGcuY2xvc2VQYXRoKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBwcmV2aW91cyA9IGN1cnJlbnQ7XHJcbiAgfVxyXG4gIHJldHVybjsgLy8gYm91bmRzLnRyYW5zbGF0ZShsLCB0KTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcGFyc2U6ICBwYXJzZSxcclxuICByZW5kZXI6IHJlbmRlclxyXG59O1xyXG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBUZXh0IE5vZGVcclxuICpcclxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcclxuICpcclxuICogZm9udDogQ2FudmFzLUFQSSBmb3JtYXR0ZWQgZm9udCBzdHJpbmcsIGZvciBleGFtcGxlICdib2xkIDEycHggc2VyaWYnXHJcbiAqIHRleHRBbGlnbiwgdGV4dEJhc2VsaW5lOiBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcclxuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoLCBsaW5lQ2FwLCBsaW5lSm9pbjogYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXHJcbiAqL1xyXG52YXIgVGV4dCA9IGZ1bmN0aW9uKCkge1xyXG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcblxyXG5UZXh0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKFRleHQucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xyXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgY3R4LmZvbnQgPSB0aGlzLmZvbnQgfHwgJzEwcHggc2Fucy1zZXJpZic7XHJcbiAgICBjdHgudGV4dEFsaWduID0gdGhpcy50ZXh0QWxpZ24gfHwgJ3N0YXJ0JztcclxuICAgIGN0eC50ZXh0QmFzZWxpbmUgPSB0aGlzLnRleHRCYXNlbGluZSB8fCAnYWxwaGFiZXRpYyc7XHJcblxyXG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlKSB7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcclxuICAgICAgY3R4LmZpbGxUZXh0KHRoaXMudGV4dCwgMCwgMCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xyXG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xyXG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcclxuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xyXG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XHJcbiAgICAgIGN0eC5zdHJva2VUZXh0KHRoaXMudGV4dCwgMCwgMCk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuICAgIC8vIFhYWCBTaXplIGNhbGN1bGF0aW9ucyAtIGZvbnQsIGZvbnQtc2l6ZSwgaGVpZ2h0XHJcbiAgICB2YXIgd2lkdGggPSBjdHgubWVhc3VyZVRleHQodGhpcy50ZXh0KTtcclxuICAgIHZhciBoZWlnaHQgPSAxMDtcclxuXHJcbiAgICBpZiAobHggPj0gMCAmJiBseCA8IHdpZHRoICYmIGx5ID49IDAgJiYgbHkgPCBoZWlnaHQpIHtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRleHQ7IiwiXHJcbnZhciBVdGlsID0ge1xyXG5cclxuICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcclxuICAgIHZhciBrZXksIGksIHNvdXJjZTtcclxuICAgIGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xyXG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgZGVzdFtrZXldID0gc291cmNlW2tleV07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGVzdDtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(7)
});
