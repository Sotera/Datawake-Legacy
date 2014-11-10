!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.path=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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
  this.radius2 = this.radius*this.radius
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
  },

  hitTest: function(ctx, x, y, lx, ly) {
	var dist = lx*lx + ly*ly;
    if (dist < this.radius2) {
      return this;
    }
  }
});


module.exports = Circle;
},{"./node":6,"./util":12}],2:[function(_dereq_,module,exports){
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


  hitTest: function(ctx, x, y, lx, ly) {
    var children = this.children;
    var clip = this.clip;
    var result;

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
},{"./node":6,"./util":12}],3:[function(_dereq_,module,exports){
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
},{"./node":6,"./util":12}],4:[function(_dereq_,module,exports){
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


    if (this.strokeStyle) {
	  ctx.beginPath();
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth || 1;
      ctx.setLineDash(this.lineDash || NONE);
      ctx.setLineDashOffset(this.lineDashOffset || 0);
	  ctx.moveTo(source.x,source.y);
	  ctx.lineTo(dest.x,dest.y);
      ctx.stroke();
	  ctx.closePath();
    }
  },

  hitTest: function(ctx, x, y, lx, ly) {
    // no hit testing for lines
  }
});


module.exports = Line;
},{"./node":6,"./util":12}],5:[function(_dereq_,module,exports){
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
},{"./circle":1,"./group":2,"./image":3,"./line":4,"./path":7,"./polyfills":8,"./rect":9,"./text":11,"./util":12}],6:[function(_dereq_,module,exports){
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
},{"./util":12}],7:[function(_dereq_,module,exports){
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
},{"./node":6,"./svg":10,"./util":12}],8:[function(_dereq_,module,exports){

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
},{}],9:[function(_dereq_,module,exports){
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
},{"./node":6,"./util":12}],10:[function(_dereq_,module,exports){
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

},{}],11:[function(_dereq_,module,exports){
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
},{"./node":6,"./util":12}],12:[function(_dereq_,module,exports){

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
},{}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL2NpcmNsZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL2dyb3VwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvaW1hZ2UuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9saW5lLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL25vZGUuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9wYXRoLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvcG9seWZpbGxzLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvcmVjdC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL3N2Zy5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL3RleHQuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcblxudmFyIE5PTkUgPSBbXTtcblxuLyoqXG4gKiBDaXJjbCBOb2RlXG4gKlxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcbiAqXG4gKiByYWRpdXMgOiB0aGUgcmFkaXVzIG9mIHRoZSBjaXJjbGVcbiAqICh4LHkpIDogY29ycmVzcG9uZCB0byB0aGUgY2VudGVyIG9mIHRoZSBjaXJjbGVcbiAqIGZpbGxTdHlsZSwgc3Ryb2tlU3R5bGUsIGxpbmVXaWR0aDpcbiAqICAgYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXG4gKiBsaW5lRGFzaDogYW4gYXJyYXkgc3BlY2lmeWluZyBvbi9vZmYgcGl4ZWwgcGF0dGVyblxuICogICAoZS5nLiBbMTAsIDVdID0gMTAgcGl4ZWxzIG9uLCA1IHBpeGVscyBvZmYpIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqIGxpbmVEYXNoT2Zmc2V0OiBhIHBpeGVsIG9mZnNldCB0byBzdGFydCB0aGUgZGFzaGVzIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqXG4gKiBOb3RlOiBwaWNraW5nIGlzIGFsd2F5cyBlbmFibGVkIG9uIHRoZSBlbnRpcmUgY2lyY2xlIChubyBzdHJva2Utb25seSBwaWNraW5nKSBhdFxuICogdGhlIG1vbWVudC5cbiAqL1xudmFyIENpcmNsZSA9IGZ1bmN0aW9uKCkge1xuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHRoaXMucmFkaXVzMiA9IHRoaXMucmFkaXVzKnRoaXMucmFkaXVzXG59O1xuXG5cbkNpcmNsZS5wcm90b3R5cGUgPSBfLmV4dGVuZChDaXJjbGUucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgcmFkaXVzID0gdGhpcy5yYWRpdXMgfHwgMDtcblx0Y3R4LmJlZ2luUGF0aCgpO1xuXHRjdHguYXJjKDAsMCwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xuXG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlKSB7XG5cdCAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZmlsbFN0eWxlO1xuXHQgIGN0eC5maWxsKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XG4gICAgICBjdHgubGluZUNhcCA9IHRoaXMubGluZUNhcCB8fCAnYnV0dCc7XG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XG4gICAgICBjdHgubWl0ZXJMaW1pdCA9IHRoaXMubWl0ZXJMaW1pdCB8fCAxMDtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoIHx8IE5PTkUpO1xuICAgICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgfVxuXHRjdHguY2xvc2VQYXRoKCk7XG4gIH0sXG5cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcblx0dmFyIGRpc3QgPSBseCpseCArIGx5Kmx5O1xuICAgIGlmIChkaXN0IDwgdGhpcy5yYWRpdXMyKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2lyY2xlOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xuXG5cbi8qKlxuICogR3JvdXAgKGNvbnRhaW5lcikgbm9kZSBpbiB0aGUgc2NlbmVncmFwaC4gSGFzIG5vIHZpc3VhbCByZXByZXNlbnRhdGlvbi5cbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIGNsaXA6IHt4LCB5LCB3aWR0aCwgaGVpZ2h0fSBTcGVjaWZpZXMgYW4gb3B0aW9uYWwgcmVjdGFuZ3VsYXIgY2xpcHBpbmcgcmVjdGFuZ2xlXG4gKiAgIHRoYXQgYXBwbGllcyB0byBhbGwgY2hpbGQgbm9kZXMuXG4gKlxuICogTm90ZTogYXBwbHlpbmcgb3BhY2l0eSB0byBHcm91cHMgaXMgc3VwcG9ydGVkIGJ1dCBub3QgY3VtbXVsYXRpdmUuIFNwZWNpZmljYWxseSxcbiAqIGlmIGEgY2hpbGQgbm9kZSBzZXRzIG9wYWNpdHkgaXQgd2lsbCBvdmVycmlkZSB0aGUgZ3JvdXAtbGV2ZWwgb3BhY2l0eSwgbm90XG4gKiBhY2N1bXVsYXRlIGl0LiBBcyBzdWNoIHRoZSBncm91cCBvcGFjaXR5IHNpbXBseSBzdXBwbGllcyB0aGUgZGVmYXVsdCBvcGFjaXR5XG4gKiB0byBjaGlsZCBub2Rlcy5cbiAqL1xudmFyIEdyb3VwID0gZnVuY3Rpb24oKSB7XG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICB0aGlzLmNoaWxkcmVuID0gW107XG59O1xuXG5cbkdyb3VwLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEdyb3VwLnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogQWRkcyBhIGNoaWxkIG5vZGUgdG8gdGhpcyBncm91cCwgb3B0aW9uYWxseSBpbmNsdWRpbmcgdGhlIGBpbmRleGBcbiAgICogYXQgd2hpY2ggdG8gaW5zZXJ0LiBJZiBgaW5kZXhgIGlzIG9taXR0ZWQsIHRoZSBub2RlIGlzIGFkZGVkIGF0IHRoZVxuICAgKiBlbmQgKHZpc3VhbGx5IG9uIHRvcCkgb2YgdGhlIGV4aXN0IGxpc3Qgb2YgY2hpbGRyZW4uXG4gICAqL1xuICBhZGRDaGlsZDogZnVuY3Rpb24oY2hpbGQsIGluZGV4KSB7XG4gICAgY2hpbGQucGFyZW50ID0gdGhpcztcbiAgICBpZiAoaW5kZXggIT0gbnVsbCAmJiBpbmRleCA8PSB0aGlzLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgdGhpcy5jaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDAsIGNoaWxkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBzcGVjaWZpZWQgY2hpbGQgZnJvbSB0aGlzIGdyb3VwLiBJZiB0aGUgY2hpbGQgZXhpc3RzIGluXG4gICAqIHRoaXMgZ3JvdXAgaXQgaXMgcmVtb3ZlZCBhbmQgcmV0dXJuZWQuXG4gICAqL1xuICByZW1vdmVDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAvLyBSZW1vdmUgY2hpbGRcbiAgICB2YXIgaWR4ID0gdGhpcy5jaGlsZHJlbi5pbmRleE9mKGNoaWxkKTtcbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4uc3BsaWNlKGlkeCwgMSk7XG4gICAgICBjaGlsZC5wYXJlbnQgPSBudWxsO1xuICAgICAgcmV0dXJuIGNoaWxkO1xuICAgIH1cbiAgfSxcblxuXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbjtcbiAgICB2YXIgY2xpcCA9IHRoaXMuY2xpcDtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgaWYgKGNsaXApIHtcbiAgICAgIGlmIChseCA8IGNsaXAueCB8fCBseCA+IGNsaXAueCtjbGlwLndpZHRoICYmIGx5IDwgY2xpcC55ICYmIGx5ID4gY2xpcC55K2NsaXAuaGVpZ2h0KSB7XG4gICAgICAgIC8vIFBpY2sgcG9pbnQgaXMgb3V0IG9mIGNsaXAgcmVjdFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVmZXIgcGlja2luZyB0byBjaGlsZHJlbiAtIHN0YXJ0IGF0IHRvcCBvZiBzdGFjayAoZW5kIG9mIGNoaWxkIGxpc3QpXG4gICAgLy8gYW5kIHdvcmsgYmFja3dhcmRzLCBleGl0IGVhcmx5IGlmIGhpdCBmb3VuZFxuICAgIGZvciAodmFyIGk9Y2hpbGRyZW4ubGVuZ3RoLTE7IGk+PTAgJiYgIXJlc3VsdDsgaS0tKSB7XG4gICAgICByZXN1bHQgPSBjaGlsZHJlbltpXS5waWNrKGN0eCwgeCwgeSwgbHgsIGx5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW47XG5cbiAgICBpZiAodGhpcy5jbGlwKSB7XG4gICAgICBjdHguc2F2ZSgpO1xuICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgY3R4LnJlY3QodGhpcy5jbGlwLngsIHRoaXMuY2xpcC55LCB0aGlzLmNsaXAud2lkdGgsIHRoaXMuY2xpcC5oZWlnaHQpO1xuICAgICAgY3R4LmNsaXAoKTtcbiAgICB9XG5cbiAgICAvLyBSZW5kZXIgY2hpbGRyZW4gZnJvbSBib3R0b20tdXBcbiAgICBmb3IgKHZhciBpPTAsIGw9Y2hpbGRyZW4ubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgY2hpbGRyZW5baV0ucmVuZGVyKGN0eCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2xpcCkge1xuICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG5cbi8qKlxuICogUmFzdGVyIEltYWdlIE5vZGVcbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIHNyYzogdXJsIChyZWxhdGl2ZSBvciBmdWxseSBxdWFsaWZpZWQpIGZyb20gd2hpY2ggdG8gbG9hZCBpbWFnZVxuICogd2lkdGg6IHdpZHRoIG9mIHRoZSByZW5kZXJlZCByZXByZXNlbnRhdGlvbiBvZiB0aGUgaW1hZ2UgKGluIHBpeGVscykuXG4gKiAgIElmIHVuc2V0L251bGwsIHRoZSBuYXR1cmFsIHdpZHRoIG9mIHRoZSBpbWFnZSB3aWxsIGJlIHVzZWRcbiAqIGhlaWdodDogaGVpZ2h0IG9mIHRoZSByZW5kZXJlZCByZXByZXNlbnRhdGlvbiBvZiB0aGUgaW1hZ2UgKGluIHBpeGVscykuXG4gKiAgIElmIHVuc2V0L251bGwsIHRoZSBuYXR1cmFsIGhlaWdodCBvZiB0aGUgaW1hZ2Ugd2lsbCBiZSB1c2VkXG4gKi9cbnZhciBJbWFnZU5vZGUgPSBmdW5jdGlvbigpIHtcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIHRoaXMuX2xvYWRlZCA9IGZhbHNlO1xufTtcblxuXG5JbWFnZU5vZGUucHJvdG90eXBlID0gXy5leHRlbmQoSW1hZ2VOb2RlLnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIHNlbGY7XG5cbiAgICBpZiAodGhpcy5faW1hZ2UgJiYgdGhpcy5faW1hZ2UubG9hZGVkKSB7XG4gICAgICAvLyBJbWFnZVxuICAgICAgaWYgKHRoaXMud2lkdGggIT0gbnVsbCB8fCB0aGlzLmhlaWdodCAhPSBudWxsKSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5faW1hZ2UsIDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5faW1hZ2UsIDAsIDApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2ltYWdlKSB7XG4gICAgICBzZWxmID0gdGhpcztcbiAgICAgIHRoaXMuX2ltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICB0aGlzLl9pbWFnZS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gT25seSByZW5kZXIgc2NlbmUgaWYgbG9hZGVkIGltYWdlIGlzIHN0aWxsIHBhcnQgb2YgaXRcbiAgICAgICAgaWYgKHRoaXMgPT09IHNlbGYuX2ltYWdlKSB7XG4gICAgICAgICAgc2VsZi5faW1hZ2UubG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdGhpcy5faW1hZ2Uuc3JjID0gdGhpcy5zcmM7XG4gICAgfVxuICB9LFxuXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy53aWR0aCB8fCAodGhpcy5faW1hZ2UgJiYgdGhpcy5faW1hZ2Uud2lkdGgpO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCB8fCAodGhpcy5faW1hZ2UgJiYgdGhpcy5faW1hZ2UuaGVpZ2h0KTtcblxuICAgIGlmIChseCA+PSAwICYmIGx4IDwgd2lkdGggJiYgbHkgPj0gMCAmJiBseSA8IGhlaWdodCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG59KTtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoSW1hZ2VOb2RlLnByb3RvdHlwZSwgJ3NyYycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3JjO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX3NyYyAhPT0gdmFsdWUpIHtcbiAgICAgIHRoaXMuX3NyYyA9IHZhbHVlO1xuICAgICAgdGhpcy5faW1hZ2UgPSBudWxsO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBJbWFnZU5vZGU7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG5cbnZhciBOT05FID0gW107XG5cbi8qKlxuICogUmVjdGFuZ2xlIE5vZGVcbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIHdpZHRoOiB3aWR0aCBvZiB0aGUgcmVjdGFuZ2xlXG4gKiBoZWlnaHQ6IGhlaWdodCBvZiB0aGUgcmVjdGFuZ2xlXG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGgsIGxpbmVDYXAsIGxpbmVKb2luLCBtaXRlckxpbWl0OlxuICogICBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcbiAqIGxpbmVEYXNoOiBhbiBhcnJheSBzcGVjaWZ5aW5nIG9uL29mZiBwaXhlbCBwYXR0ZXJuXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICogbGluZURhc2hPZmZzZXQ6IGEgcGl4ZWwgb2Zmc2V0IHRvIHN0YXJ0IHRoZSBkYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICpcbiAqIE5vdGU6IHBpY2tpbmcgaXMgYWx3YXlzIGVuYWJsZWQgb24gdGhlIGVudGlyZSByZWN0IChubyBzdHJva2Utb25seSBwaWNraW5nKSBhdFxuICogdGhlIG1vbWVudC5cbiAqL1xudmFyIExpbmUgPSBmdW5jdGlvbigpIHtcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuXG5MaW5lLnByb3RvdHlwZSA9IF8uZXh0ZW5kKExpbmUucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgc291cmNlID0gdGhpcy5zb3VyY2UgfHwge3g6MCx5OjB9O1xuICAgIHZhciBkZXN0ID0gdGhpcy50YXJnZXQgfHwge3g6MCx5OjB9O1xuXG5cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xuXHQgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGU7XG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoIHx8IE5PTkUpO1xuICAgICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XG5cdCAgY3R4Lm1vdmVUbyhzb3VyY2UueCxzb3VyY2UueSk7XG5cdCAgY3R4LmxpbmVUbyhkZXN0LngsZGVzdC55KTtcbiAgICAgIGN0eC5zdHJva2UoKTtcblx0ICBjdHguY2xvc2VQYXRoKCk7XG4gICAgfVxuICB9LFxuXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgLy8gbm8gaGl0IHRlc3RpbmcgZm9yIGxpbmVzXG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTGluZTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHBvbHlmaWxsID0gcmVxdWlyZSgnLi9wb2x5ZmlsbHMnKTtcbnZhciBHcm91cCA9IHJlcXVpcmUoJy4vZ3JvdXAnKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHNjZW5lZ3JhcGggcm9vdCBlbGVtZW50IHdoaWNoIGltcGxlbWVudHMgYW4gZXh0ZW5kZWRcbiAqIEdyb3VwIGludGVyZmFjZS4gRXhwZWN0cyBhIGBjYW52YXNgIEhUTUwgZWxlbWVudC5cbiAqL1xudmFyIFBhdGggPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIC8vIEF1dG9pbnN0YW50aWF0ZVxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGF0aCkpIHtcbiAgICByZXR1cm4gbmV3IFBhdGgoZWxlbWVudCk7XG4gIH1cbiAgR3JvdXAuYXBwbHkodGhpcyk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuZWwgPSBlbGVtZW50O1xuICB0aGlzLmNvbnRleHQgPSBlbGVtZW50LmdldENvbnRleHQoXCIyZFwiKTtcblxuICAvLyBBZGQgaGVscGVyIHBvbHlmaWxscyB0byBjb250ZXh0IGluc3RhbmNlXG4gIHBvbHlmaWxsLmRhc2hTdXBwb3J0KHRoaXMuY29udGV4dCk7XG5cbiAgLy8gT2Zmc2V0IGJ5IDEvMiBwaXhlbCB0byBhbGlnbiB3aXRoIHBpeGVsIGVkZ2VzXG4gIC8vIGh0dHA6Ly9kaXZlaW50b2h0bWw1LmluZm8vY2FudmFzLmh0bWwjcGl4ZWwtbWFkbmVzc1xuICB0aGlzLnggPSAwLjU7XG4gIHRoaXMueSA9IDAuNTtcblxuICB0aGlzLnpvb21MZXZlbCA9IDEuMDtcblxuICAvLyBCaW5kIG1lbWJlcnMgZm9yIGNvbnZlbmllbnQgY2FsbGJhY2tcbiAgdGhpcy51cGRhdGUgPSB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpO1xuICB0aGlzLl9oYW5kbGUgPSB0aGlzLl9oYW5kbGUuYmluZCh0aGlzKTtcbiAgdGhpcy5fbW91c2Vtb3ZlID0gdGhpcy5fbW91c2Vtb3ZlLmJpbmQodGhpcyk7XG5cbiAgLy8gUmVnaXN0ZXIgZXZlbnQgbGlzdGVuZXJzIG9uIGNhbnZhcyB0aGF0IHVzZSBwaWNrZXIgdG8gaGl0dGVzdFxuICBbJ2NsaWNrJywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJ10uZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG4gICAgc2VsZi5lbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIHNlbGYuX2hhbmRsZSk7XG4gIH0pO1xuICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX21vdXNlbW92ZSk7XG5cbiAgLy8gTGlzdGVuIGZvciB1cGRhdGUgcmVxdWVzdHMgZnJvbSBzY2VuZWdyYXBoLCBkZWZlciBieSBhIGZyYW1lLCBjb2FsZXNjZVxuICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gbnVsbDtcbiAgdGhpcy5vbigndXBkYXRlJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFzZWxmLl9wZW5kaW5nVXBkYXRlKSB7XG4gICAgICBzZWxmLl9wZW5kaW5nVXBkYXRlID0gcG9seWZpbGwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCBzZWxmLnVwZGF0ZSApO1xuICAgIH1cbiAgfSk7XG4gIC8vIENyZWF0ZSBhbmltYXRlLXVwZGF0ZSBmdW5jdGlvbiBvbmNlXG4gIHRoaXMuX2FuaW1VcGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBUV0VFTi51cGRhdGUoKTtcbiAgICBzZWxmLnVwZGF0ZSgpO1xuICB9O1xuXG4gIC8vIFJlc2l6ZSB0byBjdXJyZW50IERPTS1zcGVjaWZpZWQgc2l6aW5nXG4gIHRoaXMucmVzaXplKCk7XG59O1xuXG5cbl8uZXh0ZW5kKFBhdGgucHJvdG90eXBlLCBHcm91cC5wcm90b3R5cGUsIHtcbiAgLyoqXG4gICAqIFJlc2l6ZSBvciB1cGRhdGUgdGhlIHNpemUgb2YgdGhlIGNhbnZhcy4gQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIHdpbGwgZml4XG4gICAqIHRoZSBjc3Mtc3R5bGUtc3BlY2lmaWVkIHNpemUgb2YgdGhlIGNhbnZhcyBlbGVtZW50LiBDYWxsIGB1cGRhdGUoKWBcbiAgICogdG8gY2F1c2UgdGhlIGNhbnZhcyB0byByZXJlbmRlciBhdCB0aGUgbmV3IHNpemUuXG4gICAqXG4gICAqIFN0cmljdCBzaXppbmcgaXMgbmVjZXNzYXJ5IHRvIHNldCB0aGUgY2FudmFzIHdpZHRoL2hlaWdodCBwaXhlbCBjb3VudFxuICAgKiB0byB0aGUgY29ycmVjdCB2YWx1ZSBmb3IgdGhlIGNhbnZhcyBlbGVtZW50IERPTSBzaXplIGFuZCBkZXZpY2UgcGl4ZWxcbiAgICogcmF0aW8uXG4gICAqL1xuICByZXNpemU6IGZ1bmN0aW9uKHcsIGgpIHtcbiAgICAvLyBUT0RPIHRoaXMgbWF5IG5vdCBiZSByZWxpYWJsZSBvbiBtb2JpbGVcbiAgICB0aGlzLmRldmljZVBpeGVsUmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxO1xuXG4gICAgdGhpcy53aWR0aCA9IHcgfHwgdGhpcy5lbC5jbGllbnRXaWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IGggfHwgdGhpcy5lbC5jbGllbnRIZWlnaHQ7XG5cbiAgICB0aGlzLmVsLnN0eWxlLndpZHRoID0gdGhpcy53aWR0aCArICdweCc7XG4gICAgdGhpcy5lbC5zdHlsZS5oZWlnaHQgPSB0aGlzLmhlaWdodCArICdweCc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgY2FudmFzIHRvIHJlbmRlciBzeW5jaHJvbm91c2x5LiBJZiBhbnkgYW5pbWF0aW9ucyBhcmUgYWN0aXZlL3BlbmRpbmdcbiAgICogdGhpcyB3aWxsIGtpY2sgb2ZmIGEgc2VyaWVzIG9mIGF1dG9tYXRpYyB1cGRhdGVzIHVudGlsIHRoZSBhbmltYXRpb25zIGFsbFxuICAgKiBjb21wbGV0ZS5cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgLy8gVXBkYXRlIHNpemUgdG8gZXF1YWwgZGlzcGxheWVkIHBpeGVsIHNpemUgKyBjbGVhclxuICAgIHRoaXMuY29udGV4dC5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoICogdGhpcy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgIHRoaXMuY29udGV4dC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKiB0aGlzLmRldmljZVBpeGVsUmF0aW87XG4gICAgaWYgKHRoaXMuZGV2aWNlUGl4ZWxSYXRpbyAhPSAxKSB7XG4gICAgICB0aGlzLmNvbnRleHQuc2F2ZSgpO1xuICAgICAgdGhpcy5jb250ZXh0LnNjYWxlKHRoaXMuZGV2aWNlUGl4ZWxSYXRpbywgdGhpcy5kZXZpY2VQaXhlbFJhdGlvKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gbnVsbDtcblxuICAgIC8vIEFjdGl2ZSBhbmltYXRpb25zPyBzY2hlZHVsZSB0d2VlbiB1cGRhdGUgKyByZW5kZXIgb24gbmV4dCBmcmFtZVxuICAgIGlmICh3aW5kb3cuVFdFRU4gJiYgVFdFRU4uZ2V0QWxsKCkubGVuZ3RoID4gMCkge1xuICAgICAgLy8gWFhYIENvdWxkIGJlIGFuIGV4aXN0aW5nIHBlbmRpbmcgdXBkYXRlXG4gICAgICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gcG9seWZpbGwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2FuaW1VcGRhdGUpO1xuICAgIH1cblxuICAgIHRoaXMucmVuZGVyKHRoaXMuY29udGV4dCk7XG5cbiAgICBpZiAodGhpcy5kZXZpY2VQaXhlbFJhdGlvICE9IDEpIHtcbiAgICAgIHRoaXMuY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfVxuICB9LFxuXG4gIHpvb21JbjogZnVuY3Rpb24oeCx5KSB7XG5cdHRoaXMuem9vbUxldmVsKys7XG5cdHRoaXMuem9vbSh0aGlzLnpvb21MZXZlbCx4LHkpO1xuICB9LFxuICB6b29tT3V0OiBmdW5jdGlvbih4LHkpIHtcblx0dGhpcy56b29tTGV2ZWwtLTtcblx0dGhpcy56b29tKHRoaXMuem9vbUxldmVsLHgseSk7XG4gIH0sXG5cbiAgem9vbTogZnVuY3Rpb24obGV2ZWwseCx5KSB7XG4gICAgdGhpcy5zY2FsZVggPSBsZXZlbDtcbiAgICB0aGlzLnNjYWxlWSA9IGxldmVsO1xuXHR0aGlzLnVwZGF0ZSgpO1xuICB9LFxuXG4gIC8vIEdlbmVyYWwgaGFuZGxlciBmb3Igc2ltcGxlIGV2ZW50cyAoY2xpY2ssIG1vdXNlZG93biwgZXRjKVxuICBfaGFuZGxlOiBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGhpdCA9IHRoaXMucGljayh0aGlzLmNvbnRleHQsIGUub2Zmc2V0WCwgZS5vZmZzZXRZLCBlLm9mZnNldFgsIGUub2Zmc2V0WSk7XG4gICAgaWYgKGhpdCkge1xuICAgICAgZS50YXJnZXROb2RlID0gaGl0O1xuICAgICAgaGl0LnRyaWdnZXIoZS50eXBlLCBlKTtcbiAgICB9XG4gIH0sXG5cbiAgX21vdXNlbW92ZTogZnVuY3Rpb24oZSkge1xuICAgIHZhciBoaXQgPSB0aGlzLnBpY2sodGhpcy5jb250ZXh0LCBlLm9mZnNldFgsIGUub2Zmc2V0WSwgZS5vZmZzZXRYLCBlLm9mZnNldFkpO1xuICAgIGlmIChoaXQpIHtcbiAgICAgIGUudGFyZ2V0Tm9kZSA9IGhpdDtcbiAgICB9XG4gICAgLy8gTWFuYWdlIG1vdXNlb3V0L21vdXNlb3ZlclxuICAgIC8vIFRPRE8gY3JlYXRlIG5ldyBldmVudCBvYmplY3RzIHdpdGggY29ycmVjdCBldmVudCB0eXBlXG4gICAgaWYgKHRoaXMuX2xhc3RvdmVyICE9IGhpdCkge1xuICAgICAgaWYgKHRoaXMuX2xhc3RvdmVyKSB7XG4gICAgICAgIGUudGFyZ2V0Tm9kZSA9IHRoaXMuX2xhc3RvdmVyO1xuICAgICAgICB0aGlzLl9sYXN0b3Zlci50cmlnZ2VyKCdtb3VzZW91dCcsIGUpO1xuICAgICAgICBlLnRhcmdldE5vZGUgPSBoaXQ7XG4gICAgICB9XG4gICAgICB0aGlzLl9sYXN0b3ZlciA9IGhpdDtcbiAgICAgIGlmIChoaXQpIHtcbiAgICAgICAgaGl0LnRyaWdnZXIoJ21vdXNlb3ZlcicsIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbHdheXMgc2VuZCBtb3VzZW1vdmUgbGFzdFxuICAgIGlmIChoaXQpIHtcbiAgICAgIGhpdC50cmlnZ2VyKCdtb3VzZW1vdmUnLCBlKTtcbiAgICB9XG4gICAgLy8gVE9ETyBIYW5kbGUgbW91c2UgbGVhdmluZyBjYW52YXNcbiAgfVxufSk7XG5cblxuXG4vLyBTVEFUSUNcblxuLy8gQWRkIGxpYnJhcnkgY29uc3RydWN0cyB0byBuYW1lc3BhY2VcbnZhciBuYW1lc3BhY2VDb25zdHJ1Y3RvcnMgPSB7XG4gIHJlY3Q6IHJlcXVpcmUoJy4vcmVjdCcpLFxuICBwYXRoOiByZXF1aXJlKCcuL3BhdGgnKSxcbiAgdGV4dDogcmVxdWlyZSgnLi90ZXh0JyksXG4gIGltYWdlOiByZXF1aXJlKCcuL2ltYWdlJyksXG4gIGNpcmNsZTogcmVxdWlyZSgnLi9jaXJjbGUnKSxcbiAgbGluZTogcmVxdWlyZSgnLi9saW5lJyksXG4gIGdyb3VwOiBHcm91cFxufTtcblxuZm9yIChhdHRyIGluIG5hbWVzcGFjZUNvbnN0cnVjdG9ycykge1xuICBQYXRoW2F0dHJdID0gKGZ1bmN0aW9uKGF0dHIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ocHJvcHMpIHtcbiAgICAgIHJldHVybiBuZXcgbmFtZXNwYWNlQ29uc3RydWN0b3JzW2F0dHJdKHByb3BzKTtcbiAgICB9O1xuICB9KGF0dHIpKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhdGg7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudmFyIElEID0gMDtcblxuLyoqXG4gKiBCYXNlIE5vZGUgb2JqZWN0IGZvciBhbGwgc2NlbmVncmFwaCBvYmplY3RzXG4gKlxuICogaWQ6IG5vbi12aXN1YWwsIHVuaXF1ZSB2YWx1ZSBmb3IgYWxsIG5vZGVzXG4gKiB2aXNpYmxlOiBpZiBmYWxzZSwgdGhpcyBub2RlIChhbmQgZGVzY2VuZGVudHMpIHdpbGwgbm90IHJlbmRlciBub3IgcGlja1xuICogeDogdGhlIHggcG9zaXRpb24gKHRyYW5zbGF0aW9uKSBhcHBsaWVkIHRvIHRoaXMgbm9kZVxuICogeTogdGhlIHkgcG9zaXRpb24gKHRyYW5zbGF0aW9uKSBhcHBsaWVkIHRvIHRoaXMgbm9kZVxuICogcm90YXRpb246IHJvdGF0aW9uIGluIHJhZGlhbnMgYXBwbGllZCB0byB0aGlzIG5vZGUgYW5kIGFueSBkZXNjZW5kZW50c1xuICogc2NhbGVYLCBzY2FsZVk6IHggYW5kIHkgc2NhbGUgYXBwbGllZCB0byB0aGlzIG5vZGUgYW5kIGFueSBkZXNjZW5kZW50c1xuICogb3BhY2l0eTogdGhlIGdsb2JhbCBvcGFjaXR5IFswLDFdIG9mIHRoaXMgbm9kZVxuICovXG52YXIgTm9kZSA9IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgdGhpcy5pZCA9IElEKys7XG4gIHRoaXMucGFyZW50ID0gbnVsbDtcbiAgdGhpcy52aXNpYmxlID0gdHJ1ZTtcbiAgdGhpcy5oYW5kbGVycyA9IHt9O1xuXG4gIF8uZXh0ZW5kKHRoaXMsIGF0dHJpYnV0ZXMpO1xufTtcblxuTm9kZS5wcm90b3R5cGUgPSB7XG4gIC8qKlxuICAgKiBTaW1wbGVcbiAgICovXG4gIGRhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQnVsayBzZXRzIGEgZ3JvdXAgb2Ygbm9kZSBwcm9wZXJ0aWVzLCB0YWtlcyBhIG1hcCBvZiBwcm9wZXJ0eSBuYW1lc1xuICAgKiB0byB2YWx1ZXMuIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIHNldHRpbmcgZWFjaCBwcm9wZXJ0eSB2aWFcbiAgICogYG5vZGUucHJvcGVydHlOYW1lID0gdmFsdWVgXG4gICAqL1xuICBhdHRyOiBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gICAgXy5leHRlbmQodGhpcywgYXR0cmlidXRlcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFF1ZXVlcyBhIHNldCBvZiBub2RlIHByb3BlcnRpZXMgZm9yIGFuIGFuaW1hdGVkIHRyYW5zaXRpb24uIE9ubHlcbiAgICogbnVtZXJpYyBwcm9wZXJ0aWVzIGNhbiBiZSBhbmltYXRlZC4gVGhlIGxlbmd0aCBvZiB0aGUgdHJhbnNpdGlvblxuICAgKiBpcyBzcGVjaWZpZWQgaW4gdGhlIHRyYW5zaXRpb24gcHJvcGVydHksIGRlZmF1bHRzIHRvIDEgc2Vjb25kLiBBblxuICAgKiBvcHRpb25hbCBjYWxsYmFjayBjYW4gYmUgcHJvdmlkZWQgd2hpY2ggd2lsbCBiZSBjYWxsZWQgb24gYW5pbWF0aW9uXG4gICAqIGNvbXBsZXRpb24uXG4gICAqXG4gICAqIENhbGxpbmcgYHVwZGF0ZSgpYCBvbiB0aGUgc2NlbmUgcm9vdCB3aWxsIHRyaWdnZXIgdGhlIHN0YXJ0IG9mIGFsbFxuICAgKiBxdWV1ZWQgYW5pbWF0aW9ucyBhbmQgY2F1c2UgdGhlbSB0byBydW4gKGFuZCByZW5kZXIpIHRvIGNvbXBsZXRpb24uXG4gICAqL1xuICB0d2VlbkF0dHI6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMsIHRyYW5zaXRpb24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGtleSwgc3RhdGljcztcbiAgICB0cmFuc2l0aW9uID0gdHJhbnNpdGlvbiB8fCB7fTtcblxuICAgIC8vIE9ubHkgc3VwcG9ydCB0d2VlbmluZyBudW1iZXJzIC0gc3RhdGljYWxseSBzZXQgZXZlcnl0aGluZyBlbHNlXG4gICAgZm9yIChrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgaWYgKGF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiB0eXBlb2YgYXR0cmlidXRlc1trZXldICE9ICdudW1iZXInKSB7XG4gICAgICAgIHN0YXRpY3MgPSBzdGF0aWNzIHx8IHt9O1xuICAgICAgICBzdGF0aWNzW2tleV0gPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN0YXRpY3MpIHtcbiAgICAgIHRoaXMuYXR0cihzdGF0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50d2Vlbikge1xuICAgICAgLy8gVE9ETyBKdW1wIHRvIGVuZCBzdGF0ZSBvZiB2YXJzIG5vdCBiZWluZyB0cmFuc2l0aW9uZWRcbiAgICAgIHRoaXMudHdlZW4uc3RvcCgpO1xuICAgIH1cblxuICAgIHRoaXMudHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcbiAgICAgIC50byhhdHRyaWJ1dGVzLCB0cmFuc2l0aW9uLmR1cmF0aW9uIHx8IDEwMDApXG4gICAgICAub25Db21wbGV0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi50d2VlbiA9IG51bGw7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uLmNhbGxiYWNrKSB7XG4gICAgICAgICAgdHJhbnNpdGlvbi5jYWxsYmFjayh0aGlzLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGFydCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhpcyBub2RlLiBGb3IgZXhhbXBsZTpcbiAgICogYGBgXG4gICAqIG5vZGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICogICAvLyBkbyBzb21ldGhpbmdcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKiBBbiBldmVudCBvYmplY3Qgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGhhbmRsZXIgd2hlbiB0aGUgZXZlbnRcbiAgICogaXMgdHJpZ2dlcmVkLiBUaGUgZXZlbnQgb2JqZWN0IHdpbGwgYmUgYSBzdGFuZGFyZCBKYXZhU2NyaXB0XG4gICAqIGV2ZW50IGFuZCB3aWxsIGNvbnRhaW4gYSBgdGFyZ2V0Tm9kZWAgcHJvcGVydHkgY29udGFpbmluZyB0aGVcbiAgICogbm9kZSB0aGF0IHdhcyB0aGUgc291cmNlIG9mIHRoZSBldmVudC4gRXZlbnRzIGJ1YmJsZSB1cCB0aGVcbiAgICogc2NlbmVncmFwaCB1bnRpbCBoYW5kbGVkLiBIYW5kbGVycyByZXR1cm5pbmcgYSB0cnV0aHkgdmFsdWVcbiAgICogc2lnbmFsIHRoYXQgdGhlIGV2ZW50IGhhcyBiZWVuIGhhbmRsZWQuXG4gICAqL1xuICBvbjogZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbdHlwZV07XG4gICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW3R5cGVdID0gW107XG4gICAgfVxuICAgIGhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYW4gZXZlbnQgaGFuZGxlciBvZiB0aGUgZ2l2ZW4gdHlwZS4gSWYgbm8gaGFuZGxlciBpc1xuICAgKiBwcm92aWRlZCwgYWxsIGhhbmRsZXJzIG9mIHRoZSB0eXBlIHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIG9mZjogZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xuICAgIGlmICghaGFuZGxlcikge1xuICAgICAgdGhpcy5oYW5kbGVyc1t0eXBlXSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW3R5cGVdO1xuICAgICAgdmFyIGlkeCA9IGhhbmRsZXJzLmluZGV4T2YoaGFuZGxlcik7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgaGFuZGxlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBhbiBldmVudCBhbmQgYmVnaW5zIGJ1YmJsaW5nLiBSZXR1cm5zIHRydXRoeSBpZiB0aGVcbiAgICogZXZlbnQgd2FzIGhhbmRsZWQuXG4gICAqL1xuICB0cmlnZ2VyOiBmdW5jdGlvbih0eXBlLCBldmVudCkge1xuICAgIHZhciBoYW5kbGVkID0gZmFsc2U7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1t0eXBlXTtcblxuICAgIGlmIChoYW5kbGVycykge1xuICAgICAgaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZWQgPSBoYW5kbGVyKGV2ZW50KSB8fCBoYW5kbGVkO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCFoYW5kbGVkICYmIHRoaXMucGFyZW50KSB7XG4gICAgICBoYW5kbGVkID0gdGhpcy5wYXJlbnQudHJpZ2dlcih0eXBlLCBldmVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhbmRsZWQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgdGhpcyBub2RlIGZyb20gaXRzIHBhcmVudFxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wYXJlbnQpIHtcbiAgICAgIHRoaXMucGFyZW50LnJlbW92ZSh0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsOiByZW5kZXJzIHRoZSBub2RlIGdpdmVuIHRoZSBjb250ZXh0XG4gICAqL1xuICByZW5kZXI6IGZ1bmN0aW9uKGN0eCkge1xuICAgIGlmICghdGhpcy52aXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHggPSB0aGlzLnggfHwgMDtcbiAgICB2YXIgeSA9IHRoaXMueSB8fCAwO1xuICAgIHZhciBzY2FsZVggPSB0aGlzLnNjYWxlWCA9PSBudWxsID8gMSA6IHRoaXMuc2NhbGVYO1xuICAgIHZhciBzY2FsZVkgPSB0aGlzLnNjYWxlWSA9PSBudWxsID8gMSA6IHRoaXMuc2NhbGVZO1xuICAgIHZhciB0cmFuc2Zvcm1lZCA9ICEheCB8fCAhIXkgfHwgISF0aGlzLnJvdGF0aW9uIHx8IHNjYWxlWCAhPT0gMSB8fCBzY2FsZVkgIT09IDEgfHwgdGhpcy5vcGFjaXR5ICE9IG51bGw7XG5cbiAgICAvLyBUT0RPIEludmVzdGlnYXRlIGNvc3Qgb2YgYWx3YXlzIHNhdmUvcmVzdG9yZVxuICAgIGlmICh0cmFuc2Zvcm1lZCkge1xuICAgICAgY3R4LnNhdmUoKTtcbiAgICB9XG5cbiAgICBpZiAoeCB8fCB5KSB7XG4gICAgICBjdHgudHJhbnNsYXRlKHgseSk7XG4gICAgfVxuXG4gICAgaWYgKHNjYWxlWCAhPT0gMSB8fCBzY2FsZVkgIT09IDEpIHtcbiAgICAgIGN0eC5zY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucm90YXRpb24pIHtcbiAgICAgIGN0eC5yb3RhdGUodGhpcy5yb3RhdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3BhY2l0eSAhPSBudWxsKSB7XG4gICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XG4gICAgfVxuXG4gICAgdGhpcy5kcmF3KGN0eCk7XG5cbiAgICBpZiAodHJhbnNmb3JtZWQpIHtcbiAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbDogdGVzdHMgZm9yIHBpY2sgaGl0IGdpdmVuIGNvbnRleHQsIGdsb2JhbCBhbmQgbG9jYWxcbiAgICogY29vcmRpbmF0ZSBzeXN0ZW0gdHJhbnNmb3JtZWQgcGljayBjb29yZGluYXRlcy5cbiAgICovXG4gIHBpY2s6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgaWYgKCF0aGlzLnZpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gbnVsbDtcbiAgICB2YXIgcywgYywgdGVtcDtcblxuICAgIHZhciB0eCA9IHRoaXMueCB8fCAwO1xuICAgIHZhciB0eSA9IHRoaXMueSB8fCAwO1xuICAgIHZhciBzY2FsZVggPSB0aGlzLnNjYWxlWCA9PSBudWxsID8gMSA6IHRoaXMuc2NhbGVYO1xuICAgIHZhciBzY2FsZVkgPSB0aGlzLnNjYWxlWSA9PSBudWxsID8gMSA6IHRoaXMuc2NhbGVZO1xuICAgIHZhciB0cmFuc2Zvcm1lZCA9ICEhdHggfHwgISF0eSB8fCAhIXRoaXMucm90YXRpb24gfHwgc2NhbGVYICE9PSAxIHx8IHNjYWxlWSAhPT0gMSB8fCB0aGlzLm9wYWNpdHkgIT0gbnVsbDtcblxuICAgIC8vIFRPRE8gSW52ZXN0aWdhdGUgY29zdCBvZiBhbHdheXMgc2F2ZS9yZXN0b3JlXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XG4gICAgICBjdHguc2F2ZSgpO1xuICAgIH1cblxuICAgIGlmICh0eCB8fCB0eSkge1xuICAgICAgY3R4LnRyYW5zbGF0ZSh0eCx0eSk7XG4gICAgICAvLyBSZXZlcnNlIHRyYW5zbGF0aW9uIG9uIHBpY2tlZCBwb2ludFxuICAgICAgbHggLT0gdHg7XG4gICAgICBseSAtPSB0eTtcbiAgICB9XG5cbiAgICBpZiAoc2NhbGVYICE9PSAxIHx8IHNjYWxlWSAhPT0gMSkge1xuICAgICAgY3R4LnNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcbiAgICAgIC8vIFJldmVyc2Ugc2NhbGVcbiAgICAgIGx4IC89IHNjYWxlWDtcbiAgICAgIGx5IC89IHNjYWxlWTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yb3RhdGlvbikge1xuICAgICAgY3R4LnJvdGF0ZSh0aGlzLnJvdGF0aW9uKTtcbiAgICAgIC8vIFJldmVyc2Ugcm90YXRpb25cbiAgICAgIHMgPSBNYXRoLnNpbigtdGhpcy5yb3RhdGlvbik7XG4gICAgICBjID0gTWF0aC5jb3MoLXRoaXMucm90YXRpb24pO1xuICAgICAgdGVtcCA9IGMqbHggLSBzKmx5O1xuICAgICAgbHkgPSBzKmx4ICsgYypseTtcbiAgICAgIGx4ID0gdGVtcDtcbiAgICB9XG5cbiAgICByZXN1bHQgPSB0aGlzLmhpdFRlc3QoY3R4LCB4LCB5LCBseCwgbHkpO1xuXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XG4gICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRlbXBsYXRlIG1ldGhvZCBmb3IgZGVyaXZlZCBvYmplY3RzIHRvIGFjdHVhbGx5IHBlcmZvcm0gZHJhdyBvcGVyYXRpb25zLlxuICAgKiBUaGUgY2FsbGluZyBgcmVuZGVyYCBjYWxsIGhhbmRsZXMgZ2VuZXJhbCB0cmFuc2Zvcm1zIGFuZCBvcGFjaXR5LlxuICAgKi9cbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgLy8gdGVtcGxhdGUgbWV0aG9kXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRlbXBsYXRlIG1ldGhvZCBmb3IgZGVyaXZlZCBvYmplY3RzIHRvIHRlc3QgaWYgdGhleSAob3IgY2hpbGQpIGlzIGhpdCBieVxuICAgKiB0aGUgcHJvdmlkZWQgcGljayBjb29yZGluYXRlLiBJZiBoaXQsIHJldHVybiBvYmplY3QgdGhhdCB3YXMgaGl0LlxuICAgKi9cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcbiAgICAvLyB0ZW1wbGF0ZSBtZXRob2RcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG52YXIgc3ZnID0gcmVxdWlyZSgnLi9zdmcnKTtcblxuXG52YXIgTk9ORSA9IFtdO1xuXG4vKipcbiAqIFZlY3RvciBQYXRoIE5vZGVcbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIHBhdGg6IGEgdmFsaWQgU1ZHIHBhdGggc3RyaW5nIChlLmcuICdNLTUsMEE1LDUsMCwwLDEsNSwwQTUsNSwwLDAsMSwtNSwwWicpXG4gKiAgIHRvIGRyYXdcbiAqIGZpbGxTdHlsZSwgc3Ryb2tlU3R5bGUsIGxpbmVXaWR0aCwgbGluZUNhcCwgbGluZUpvaW4sIG1pdGVyTGltaXQ6XG4gKiAgIGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxuICogbGluZURhc2g6IGFuIGFycmF5IHNwZWNpZnlpbmcgb24vb2ZmIHBpeGVsIHBhdHRlcm5cbiAqICAgKGUuZy4gWzEwLCA1XSA9IDEwIHBpeGVscyBvbiwgNSBwaXhlbHMgb2ZmKSAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXG4gKiBsaW5lRGFzaE9mZnNldDogYSBwaXhlbCBvZmZzZXQgdG8gc3RhcnQgdGhlIGRhc2hlcyAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXG4gKlxuICogTm90ZTogaWYgYHN0cm9rZVN0eWxlYCBpcyBzcGVjaWZpZWQsIHBpY2tpbmcgd2lsbCBiZSBlbmFibGVkIG9uIHRoZSBwYXRoIHN0cm9rZS9vdXRsaW5lLlxuICogSWYgYGZpbGxTdHlsZWAgaXMgc3BlY2lmaWVkLCBwaWNraW5nIHdpbGwgYmUgZW5hYmxlZCBvbiB0aGUgaW50ZXJpb3IgZmlsbGVkIGFyZWFcbiAqIG9mIHRoZSBwYXRoLlxuICovXG52YXIgUGF0aCA9IGZ1bmN0aW9uKCkge1xuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5cblBhdGgucHJvdG90eXBlID0gXy5leHRlbmQoUGF0aC5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XG5cbiAgc2tldGNoOiBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgcGF0aCA9IHRoaXMucGF0aDtcbiAgICBpZiAocGF0aCAmJiBwYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciBwYXRoQ29tbWFuZHMgPSB0aGlzLl9jb21tYW5kQ2FjaGUgfHwgKHRoaXMuX2NvbW1hbmRDYWNoZSA9IHN2Zy5wYXJzZShwYXRoKSk7XG4gICAgICBzdmcucmVuZGVyKGN0eCwgcGF0aENvbW1hbmRzKTtcbiAgICB9XG4gIH0sXG5cbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlKSB7XG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsU3R5bGU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUpIHtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGU7XG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcbiAgICAgIGN0eC5saW5lQ2FwID0gdGhpcy5saW5lQ2FwIHx8ICdidXR0JztcbiAgICAgIGN0eC5saW5lSm9pbiA9IHRoaXMubGluZUpvaW4gfHwgJ21pdGVyJztcbiAgICAgIGN0eC5taXRlckxpbWl0ID0gdGhpcy5taXRlckxpbWl0IHx8IDEwO1xuICAgICAgY3R4LnNldExpbmVEYXNoKHRoaXMubGluZURhc2ggfHwgTk9ORSk7XG4gICAgICBjdHguc2V0TGluZURhc2hPZmZzZXQodGhpcy5saW5lRGFzaE9mZnNldCB8fCAwKTtcbiAgICB9XG5cbiAgICB0aGlzLnNrZXRjaChjdHgpO1xuXG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUpIHtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlKSB7XG4gICAgICBjdHguZmlsbCgpO1xuICAgIH1cbiAgfSxcblxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuICAgIHRoaXMuc2tldGNoKGN0eCk7XG5cbiAgICBpZiAodGhpcy5maWxsU3R5bGUgJiYgY3R4LmlzUG9pbnRJblBhdGgoeCx5KSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlICYmIGN0eC5pc1BvaW50SW5TdHJva2UoeCx5KSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG59KTtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUGF0aC5wcm90b3R5cGUsICdwYXRoJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9wYXRoO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX3BhdGggIT09IHZhbHVlKSB7XG4gICAgICB0aGlzLl9wYXRoID0gdmFsdWU7XG4gICAgICB0aGlzLl9jb21tYW5kQ2FjaGUgPSBudWxsO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQYXRoOyIsIlxuLy8gLS0tLVxuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG5cbi8vIGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXG4vLyBodHRwOi8vbXkub3BlcmEuY29tL2Vtb2xsZXIvYmxvZy8yMDExLzEyLzIwL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtZXItYW5pbWF0aW5nXG5cbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcblxuLy8gTUlUIGxpY2Vuc2VcblxudmFyIHJBRiA9IChmdW5jdGlvbigpIHtcbiAgdmFyIHJBRjtcblxuICBpZiAod2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkge1xuICAgIHJBRiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuYmluZCh3aW5kb3cpO1xuICB9XG5cbiAgdmFyIGxhc3RUaW1lID0gMDtcbiAgdmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xuICBmb3IodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXJBRjsgKyt4KSB7XG4gICAgckFGID0gd2luZG93W3ZlbmRvcnNbeF0rJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICB9XG5cbiAgaWYgKCFyQUYpXG4gICAgckFGID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XG4gICAgICB2YXIgaWQgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTsgfSwgdGltZVRvQ2FsbCk7XG4gICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcbiAgICAgIHJldHVybiBpZDtcbiAgICB9O1xuXG4gIHJldHVybiByQUY7XG59KCkpO1xuXG5cbi8vIC0tLS1cbi8vIERhc2ggc3VwcG9ydCBmb3IgY2FudmFzIGNvbnRleHRcblxudmFyIGRhc2hTdXBwb3J0ID0gZnVuY3Rpb24oY3R4KSB7XG4gIHZhciBOT09QID0gZnVuY3Rpb24oKXt9O1xuXG4gIGlmIChjdHguc2V0TGluZURhc2gpIHtcbiAgICBjdHguc2V0TGluZURhc2hPZmZzZXQgPSBmdW5jdGlvbihvZmYpIHsgdGhpcy5saW5lRGFzaE9mZnNldCA9IG9mZjsgfTtcbiAgfSBlbHNlIGlmIChjdHgud2Via2l0TGluZURhc2ggIT09IHVuZGVmaW5lZCkge1xuICAgIGN0eC5zZXRMaW5lRGFzaCA9IGZ1bmN0aW9uKGRhc2gpIHsgdGhpcy53ZWJraXRMaW5lRGFzaCA9IGRhc2g7IH07XG4gICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0ID0gZnVuY3Rpb24ob2ZmKSB7IHRoaXMud2Via2l0TGluZURhc2hPZmZzZXQgPSBvZmY7IH07XG4gIH0gZWxzZSBpZiAoY3R4Lm1vekRhc2ggIT09IHVuZGVmaW5lZCkge1xuICAgIGN0eC5zZXRMaW5lRGFzaCA9IGZ1bmN0aW9uKGRhc2gpIHsgdGhpcy5tb3pEYXNoID0gZGFzaDsgfTtcbiAgICBjdHguc2V0TGluZURhc2hPZmZzZXQgPSBOT09QO1xuICB9IGVsc2Uge1xuICAgIGN0eC5zZXRMaW5lRGFzaCA9IE5PT1A7XG4gICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0ID0gTk9PUDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZTogckFGLFxuICBkYXNoU3VwcG9ydDogZGFzaFN1cHBvcnRcbn07IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG5cbnZhciBOT05FID0gW107XG5cbi8qKlxuICogUmVjdGFuZ2xlIE5vZGVcbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIHdpZHRoOiB3aWR0aCBvZiB0aGUgcmVjdGFuZ2xlXG4gKiBoZWlnaHQ6IGhlaWdodCBvZiB0aGUgcmVjdGFuZ2xlXG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGgsIGxpbmVDYXAsIGxpbmVKb2luLCBtaXRlckxpbWl0OlxuICogICBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcbiAqIGxpbmVEYXNoOiBhbiBhcnJheSBzcGVjaWZ5aW5nIG9uL29mZiBwaXhlbCBwYXR0ZXJuXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICogbGluZURhc2hPZmZzZXQ6IGEgcGl4ZWwgb2Zmc2V0IHRvIHN0YXJ0IHRoZSBkYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICpcbiAqIE5vdGU6IHBpY2tpbmcgaXMgYWx3YXlzIGVuYWJsZWQgb24gdGhlIGVudGlyZSByZWN0IChubyBzdHJva2Utb25seSBwaWNraW5nKSBhdFxuICogdGhlIG1vbWVudC5cbiAqL1xudmFyIFJlY3QgPSBmdW5jdGlvbigpIHtcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuXG5SZWN0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKFJlY3QucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoIHx8IDA7XG4gICAgdmFyIGhlaWdodCA9IHRoaXMuaGVpZ2h0IHx8IDA7XG5cbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcbiAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUpIHtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGU7XG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcbiAgICAgIGN0eC5saW5lQ2FwID0gdGhpcy5saW5lQ2FwIHx8ICdidXR0JztcbiAgICAgIGN0eC5saW5lSm9pbiA9IHRoaXMubGluZUpvaW4gfHwgJ21pdGVyJztcbiAgICAgIGN0eC5taXRlckxpbWl0ID0gdGhpcy5taXRlckxpbWl0IHx8IDEwO1xuICAgICAgY3R4LnNldExpbmVEYXNoKHRoaXMubGluZURhc2ggfHwgTk9ORSk7XG4gICAgICBjdHguc2V0TGluZURhc2hPZmZzZXQodGhpcy5saW5lRGFzaE9mZnNldCB8fCAwKTtcbiAgICAgIGN0eC5zdHJva2VSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgIH1cbiAgfSxcblxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggfHwgMDtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgMDtcblxuICAgIGlmIChseCA+PSAwICYmIGx4IDwgd2lkdGggJiYgbHkgPj0gMCAmJiBseSA8IGhlaWdodCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Q7IiwiLyoqXG4gIFNWRyBwYXRoIHRvIGNhbnZhcyBwYXRoIHNrZXRjaGluZywgdGFrZW4gYW5kIGFkYXB0ZWQgZnJvbTpcbiAgIC0gVmVnYTogZ2l0aHViLmNvbS90cmlmYWN0YS92ZWdhXG4gICAgIExpY2Vuc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS90cmlmYWN0YS92ZWdhL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAgIC0gRmFicmljLmpzOiBnaXRodWIuY29tL2thbmdheC9mYWJyaWMuanMvYmxvYi9tYXN0ZXIvc3JjL3NoYXBlcy9wYXRoLmNsYXNzLmpzXG4gICAgIExpY2Vuc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9rYW5nYXgvZmFicmljLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiovXG5cblxuLy8gUGF0aCBwYXJzaW5nIGFuZCByZW5kZXJpbmcgY29kZSB0YWtlbiBmcm9tIGZhYnJpYy5qcyAtLSBUaGFua3MhXG52YXIgY29tbWFuZExlbmd0aHMgPSB7IG06MiwgbDoyLCBoOjEsIHY6MSwgYzo2LCBzOjQsIHE6NCwgdDoyLCBhOjcgfSxcbiAgICByZXBlYXRlZENvbW1hbmRzID0geyBtOiAnbCcsIE06ICdMJyB9LFxuICAgIHRva2VuaXplciA9IC9bbXpsaHZjc3F0YV1bXm16bGh2Y3NxdGFdKi9naSxcbiAgICBkaWdpdHMgPSAvKFstK10/KChcXGQrXFwuXFxkKyl8KChcXGQrKXwoXFwuXFxkKykpKSg/OmVbLStdP1xcZCspPykvaWc7XG5cbmZ1bmN0aW9uIHBhcnNlKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IFsgXSxcbiAgICAgIGNvb3JkcyA9IFsgXSxcbiAgICAgIGN1cnJlbnRQYXRoLFxuICAgICAgcGFyc2VkLFxuICAgICAgbWF0Y2gsXG4gICAgICBjb29yZHNTdHI7XG5cbiAgLy8gRmlyc3QsIGJyZWFrIHBhdGggaW50byBjb21tYW5kIHNlcXVlbmNlXG4gIHBhdGggPSBwYXRoLm1hdGNoKHRva2VuaXplcik7XG5cbiAgLy8gTmV4dCwgcGFyc2UgZWFjaCBjb21tYW5kIGluIHR1cm5cbiAgZm9yICh2YXIgaSA9IDAsIGNvb3Jkc1BhcnNlZCwgbGVuID0gcGF0aC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGN1cnJlbnRQYXRoID0gcGF0aFtpXTtcblxuICAgIGNvb3Jkc1N0ciA9IGN1cnJlbnRQYXRoLnNsaWNlKDEpLnRyaW0oKTtcbiAgICBjb29yZHMubGVuZ3RoID0gMDtcblxuICAgIHdoaWxlICgobWF0Y2ggPSBkaWdpdHMuZXhlYyhjb29yZHNTdHIpKSkge1xuICAgICAgY29vcmRzLnB1c2gobWF0Y2hbMF0pO1xuICAgIH1cblxuICAgIGNvb3Jkc1BhcnNlZCA9IFsgY3VycmVudFBhdGguY2hhckF0KDApIF07XG5cbiAgICBmb3IgKHZhciBqID0gMCwgamxlbiA9IGNvb3Jkcy5sZW5ndGg7IGogPCBqbGVuOyBqKyspIHtcbiAgICAgIHBhcnNlZCA9IHBhcnNlRmxvYXQoY29vcmRzW2pdKTtcbiAgICAgIGlmICghaXNOYU4ocGFyc2VkKSkge1xuICAgICAgICBjb29yZHNQYXJzZWQucHVzaChwYXJzZWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBjb21tYW5kID0gY29vcmRzUGFyc2VkWzBdLFxuICAgICAgICBjb21tYW5kTGVuZ3RoID0gY29tbWFuZExlbmd0aHNbY29tbWFuZC50b0xvd2VyQ2FzZSgpXSxcbiAgICAgICAgcmVwZWF0ZWRDb21tYW5kID0gcmVwZWF0ZWRDb21tYW5kc1tjb21tYW5kXSB8fCBjb21tYW5kO1xuXG4gICAgaWYgKGNvb3Jkc1BhcnNlZC5sZW5ndGggLSAxID4gY29tbWFuZExlbmd0aCkge1xuICAgICAgZm9yICh2YXIgayA9IDEsIGtsZW4gPSBjb29yZHNQYXJzZWQubGVuZ3RoOyBrIDwga2xlbjsgayArPSBjb21tYW5kTGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKFsgY29tbWFuZCBdLmNvbmNhdChjb29yZHNQYXJzZWQuc2xpY2UoaywgayArIGNvbW1hbmRMZW5ndGgpKSk7XG4gICAgICAgIGNvbW1hbmQgPSByZXBlYXRlZENvbW1hbmQ7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2goY29vcmRzUGFyc2VkKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBkcmF3QXJjKGcsIHgsIHksIGNvb3JkcywgYm91bmRzLCBsLCB0KSB7XG4gIHZhciByeCA9IGNvb3Jkc1swXTtcbiAgdmFyIHJ5ID0gY29vcmRzWzFdO1xuICB2YXIgcm90ID0gY29vcmRzWzJdO1xuICB2YXIgbGFyZ2UgPSBjb29yZHNbM107XG4gIHZhciBzd2VlcCA9IGNvb3Jkc1s0XTtcbiAgdmFyIGV4ID0gY29vcmRzWzVdO1xuICB2YXIgZXkgPSBjb29yZHNbNl07XG4gIHZhciBzZWdzID0gYXJjVG9TZWdtZW50cyhleCwgZXksIHJ4LCByeSwgbGFyZ2UsIHN3ZWVwLCByb3QsIHgsIHkpO1xuICBmb3IgKHZhciBpPTA7IGk8c2Vncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiZXogPSBzZWdtZW50VG9CZXppZXIuYXBwbHkobnVsbCwgc2Vnc1tpXSk7XG4gICAgZy5iZXppZXJDdXJ2ZVRvLmFwcGx5KGcsIGJleik7XG4gICAgLy8gYm91bmRzLmFkZChiZXpbMF0tbCwgYmV6WzFdLXQpO1xuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzJdLWwsIGJlelszXS10KTtcbiAgICAvLyBib3VuZHMuYWRkKGJlels0XS1sLCBiZXpbNV0tdCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYm91bmRBcmMoeCwgeSwgY29vcmRzLCBib3VuZHMpIHtcbiAgdmFyIHJ4ID0gY29vcmRzWzBdO1xuICB2YXIgcnkgPSBjb29yZHNbMV07XG4gIHZhciByb3QgPSBjb29yZHNbMl07XG4gIHZhciBsYXJnZSA9IGNvb3Jkc1szXTtcbiAgdmFyIHN3ZWVwID0gY29vcmRzWzRdO1xuICB2YXIgZXggPSBjb29yZHNbNV07XG4gIHZhciBleSA9IGNvb3Jkc1s2XTtcbiAgdmFyIHNlZ3MgPSBhcmNUb1NlZ21lbnRzKGV4LCBleSwgcngsIHJ5LCBsYXJnZSwgc3dlZXAsIHJvdCwgeCwgeSk7XG4gIGZvciAodmFyIGk9MDsgaTxzZWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJleiA9IHNlZ21lbnRUb0Jlemllci5hcHBseShudWxsLCBzZWdzW2ldKTtcbiAgICAvLyBib3VuZHMuYWRkKGJlelswXSwgYmV6WzFdKTtcbiAgICAvLyBib3VuZHMuYWRkKGJlelsyXSwgYmV6WzNdKTtcbiAgICAvLyBib3VuZHMuYWRkKGJlels0XSwgYmV6WzVdKTtcbiAgfVxufVxuXG52YXIgYXJjVG9TZWdtZW50c0NhY2hlID0geyB9LFxuICAgIHNlZ21lbnRUb0JlemllckNhY2hlID0geyB9LFxuICAgIGpvaW4gPSBBcnJheS5wcm90b3R5cGUuam9pbixcbiAgICBhcmdzU3RyO1xuXG4vLyBDb3BpZWQgZnJvbSBJbmtzY2FwZSBzdmd0b3BkZiwgdGhhbmtzIVxuZnVuY3Rpb24gYXJjVG9TZWdtZW50cyh4LCB5LCByeCwgcnksIGxhcmdlLCBzd2VlcCwgcm90YXRlWCwgb3gsIG95KSB7XG4gIGFyZ3NTdHIgPSBqb2luLmNhbGwoYXJndW1lbnRzKTtcbiAgaWYgKGFyY1RvU2VnbWVudHNDYWNoZVthcmdzU3RyXSkge1xuICAgIHJldHVybiBhcmNUb1NlZ21lbnRzQ2FjaGVbYXJnc1N0cl07XG4gIH1cblxuICB2YXIgdGggPSByb3RhdGVYICogKE1hdGguUEkvMTgwKTtcbiAgdmFyIHNpbl90aCA9IE1hdGguc2luKHRoKTtcbiAgdmFyIGNvc190aCA9IE1hdGguY29zKHRoKTtcbiAgcnggPSBNYXRoLmFicyhyeCk7XG4gIHJ5ID0gTWF0aC5hYnMocnkpO1xuICB2YXIgcHggPSBjb3NfdGggKiAob3ggLSB4KSAqIDAuNSArIHNpbl90aCAqIChveSAtIHkpICogMC41O1xuICB2YXIgcHkgPSBjb3NfdGggKiAob3kgLSB5KSAqIDAuNSAtIHNpbl90aCAqIChveCAtIHgpICogMC41O1xuICB2YXIgcGwgPSAocHgqcHgpIC8gKHJ4KnJ4KSArIChweSpweSkgLyAocnkqcnkpO1xuICBpZiAocGwgPiAxKSB7XG4gICAgcGwgPSBNYXRoLnNxcnQocGwpO1xuICAgIHJ4ICo9IHBsO1xuICAgIHJ5ICo9IHBsO1xuICB9XG5cbiAgdmFyIGEwMCA9IGNvc190aCAvIHJ4O1xuICB2YXIgYTAxID0gc2luX3RoIC8gcng7XG4gIHZhciBhMTAgPSAoLXNpbl90aCkgLyByeTtcbiAgdmFyIGExMSA9IChjb3NfdGgpIC8gcnk7XG4gIHZhciB4MCA9IGEwMCAqIG94ICsgYTAxICogb3k7XG4gIHZhciB5MCA9IGExMCAqIG94ICsgYTExICogb3k7XG4gIHZhciB4MSA9IGEwMCAqIHggKyBhMDEgKiB5O1xuICB2YXIgeTEgPSBhMTAgKiB4ICsgYTExICogeTtcblxuICB2YXIgZCA9ICh4MS14MCkgKiAoeDEteDApICsgKHkxLXkwKSAqICh5MS15MCk7XG4gIHZhciBzZmFjdG9yX3NxID0gMSAvIGQgLSAwLjI1O1xuICBpZiAoc2ZhY3Rvcl9zcSA8IDApIHNmYWN0b3Jfc3EgPSAwO1xuICB2YXIgc2ZhY3RvciA9IE1hdGguc3FydChzZmFjdG9yX3NxKTtcbiAgaWYgKHN3ZWVwID09IGxhcmdlKSBzZmFjdG9yID0gLXNmYWN0b3I7XG4gIHZhciB4YyA9IDAuNSAqICh4MCArIHgxKSAtIHNmYWN0b3IgKiAoeTEteTApO1xuICB2YXIgeWMgPSAwLjUgKiAoeTAgKyB5MSkgKyBzZmFjdG9yICogKHgxLXgwKTtcblxuICB2YXIgdGgwID0gTWF0aC5hdGFuMih5MC15YywgeDAteGMpO1xuICB2YXIgdGgxID0gTWF0aC5hdGFuMih5MS15YywgeDEteGMpO1xuXG4gIHZhciB0aF9hcmMgPSB0aDEtdGgwO1xuICBpZiAodGhfYXJjIDwgMCAmJiBzd2VlcCA9PSAxKXtcbiAgICB0aF9hcmMgKz0gMipNYXRoLlBJO1xuICB9IGVsc2UgaWYgKHRoX2FyYyA+IDAgJiYgc3dlZXAgPT0gMCkge1xuICAgIHRoX2FyYyAtPSAyICogTWF0aC5QSTtcbiAgfVxuXG4gIHZhciBzZWdtZW50cyA9IE1hdGguY2VpbChNYXRoLmFicyh0aF9hcmMgLyAoTWF0aC5QSSAqIDAuNSArIDAuMDAxKSkpO1xuICB2YXIgcmVzdWx0ID0gW107XG4gIGZvciAodmFyIGk9MDsgaTxzZWdtZW50czsgaSsrKSB7XG4gICAgdmFyIHRoMiA9IHRoMCArIGkgKiB0aF9hcmMgLyBzZWdtZW50cztcbiAgICB2YXIgdGgzID0gdGgwICsgKGkrMSkgKiB0aF9hcmMgLyBzZWdtZW50cztcbiAgICByZXN1bHRbaV0gPSBbeGMsIHljLCB0aDIsIHRoMywgcngsIHJ5LCBzaW5fdGgsIGNvc190aF07XG4gIH1cblxuICByZXR1cm4gKGFyY1RvU2VnbWVudHNDYWNoZVthcmdzU3RyXSA9IHJlc3VsdCk7XG59XG5cbmZ1bmN0aW9uIHNlZ21lbnRUb0JlemllcihjeCwgY3ksIHRoMCwgdGgxLCByeCwgcnksIHNpbl90aCwgY29zX3RoKSB7XG4gIGFyZ3NTdHIgPSBqb2luLmNhbGwoYXJndW1lbnRzKTtcbiAgaWYgKHNlZ21lbnRUb0JlemllckNhY2hlW2FyZ3NTdHJdKSB7XG4gICAgcmV0dXJuIHNlZ21lbnRUb0JlemllckNhY2hlW2FyZ3NTdHJdO1xuICB9XG5cbiAgdmFyIGEwMCA9IGNvc190aCAqIHJ4O1xuICB2YXIgYTAxID0gLXNpbl90aCAqIHJ5O1xuICB2YXIgYTEwID0gc2luX3RoICogcng7XG4gIHZhciBhMTEgPSBjb3NfdGggKiByeTtcblxuICB2YXIgY29zX3RoMCA9IE1hdGguY29zKHRoMCk7XG4gIHZhciBzaW5fdGgwID0gTWF0aC5zaW4odGgwKTtcbiAgdmFyIGNvc190aDEgPSBNYXRoLmNvcyh0aDEpO1xuICB2YXIgc2luX3RoMSA9IE1hdGguc2luKHRoMSk7XG5cbiAgdmFyIHRoX2hhbGYgPSAwLjUgKiAodGgxIC0gdGgwKTtcbiAgdmFyIHNpbl90aF9oMiA9IE1hdGguc2luKHRoX2hhbGYgKiAwLjUpO1xuICB2YXIgdCA9ICg4LzMpICogc2luX3RoX2gyICogc2luX3RoX2gyIC8gTWF0aC5zaW4odGhfaGFsZik7XG4gIHZhciB4MSA9IGN4ICsgY29zX3RoMCAtIHQgKiBzaW5fdGgwO1xuICB2YXIgeTEgPSBjeSArIHNpbl90aDAgKyB0ICogY29zX3RoMDtcbiAgdmFyIHgzID0gY3ggKyBjb3NfdGgxO1xuICB2YXIgeTMgPSBjeSArIHNpbl90aDE7XG4gIHZhciB4MiA9IHgzICsgdCAqIHNpbl90aDE7XG4gIHZhciB5MiA9IHkzIC0gdCAqIGNvc190aDE7XG5cbiAgcmV0dXJuIChzZWdtZW50VG9CZXppZXJDYWNoZVthcmdzU3RyXSA9IFtcbiAgICBhMDAgKiB4MSArIGEwMSAqIHkxLCAgYTEwICogeDEgKyBhMTEgKiB5MSxcbiAgICBhMDAgKiB4MiArIGEwMSAqIHkyLCAgYTEwICogeDIgKyBhMTEgKiB5MixcbiAgICBhMDAgKiB4MyArIGEwMSAqIHkzLCAgYTEwICogeDMgKyBhMTEgKiB5M1xuICBdKTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyKGcsIHBhdGgsIGwsIHQpIHtcbiAgdmFyIGN1cnJlbnQsIC8vIGN1cnJlbnQgaW5zdHJ1Y3Rpb25cbiAgICAgIHByZXZpb3VzID0gbnVsbCxcbiAgICAgIHggPSAwLCAvLyBjdXJyZW50IHhcbiAgICAgIHkgPSAwLCAvLyBjdXJyZW50IHlcbiAgICAgIGNvbnRyb2xYID0gMCwgLy8gY3VycmVudCBjb250cm9sIHBvaW50IHhcbiAgICAgIGNvbnRyb2xZID0gMCwgLy8gY3VycmVudCBjb250cm9sIHBvaW50IHlcbiAgICAgIHRlbXBYLFxuICAgICAgdGVtcFksXG4gICAgICB0ZW1wQ29udHJvbFgsXG4gICAgICB0ZW1wQ29udHJvbFksXG4gICAgICBib3VuZHM7XG4gIGlmIChsID09IHVuZGVmaW5lZCkgbCA9IDA7XG4gIGlmICh0ID09IHVuZGVmaW5lZCkgdCA9IDA7XG5cbiAgZy5iZWdpblBhdGgoKTtcblxuICBmb3IgKHZhciBpPTAsIGxlbj1wYXRoLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIGN1cnJlbnQgPSBwYXRoW2ldO1xuXG4gICAgc3dpdGNoIChjdXJyZW50WzBdKSB7IC8vIGZpcnN0IGxldHRlclxuXG4gICAgICBjYXNlICdsJzogLy8gbGluZXRvLCByZWxhdGl2ZVxuICAgICAgICB4ICs9IGN1cnJlbnRbMV07XG4gICAgICAgIHkgKz0gY3VycmVudFsyXTtcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ0wnOiAvLyBsaW5ldG8sIGFic29sdXRlXG4gICAgICAgIHggPSBjdXJyZW50WzFdO1xuICAgICAgICB5ID0gY3VycmVudFsyXTtcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2gnOiAvLyBob3Jpem9udGFsIGxpbmV0bywgcmVsYXRpdmVcbiAgICAgICAgeCArPSBjdXJyZW50WzFdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnSCc6IC8vIGhvcml6b250YWwgbGluZXRvLCBhYnNvbHV0ZVxuICAgICAgICB4ID0gY3VycmVudFsxXTtcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3YnOiAvLyB2ZXJ0aWNhbCBsaW5ldG8sIHJlbGF0aXZlXG4gICAgICAgIHkgKz0gY3VycmVudFsxXTtcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ1YnOiAvLyB2ZXJpY2FsIGxpbmV0bywgYWJzb2x1dGVcbiAgICAgICAgeSA9IGN1cnJlbnRbMV07XG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdtJzogLy8gbW92ZVRvLCByZWxhdGl2ZVxuICAgICAgICB4ICs9IGN1cnJlbnRbMV07XG4gICAgICAgIHkgKz0gY3VycmVudFsyXTtcbiAgICAgICAgZy5tb3ZlVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ00nOiAvLyBtb3ZlVG8sIGFic29sdXRlXG4gICAgICAgIHggPSBjdXJyZW50WzFdO1xuICAgICAgICB5ID0gY3VycmVudFsyXTtcbiAgICAgICAgZy5tb3ZlVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2MnOiAvLyBiZXppZXJDdXJ2ZVRvLCByZWxhdGl2ZVxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzVdO1xuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzZdO1xuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzNdO1xuICAgICAgICBjb250cm9sWSA9IHkgKyBjdXJyZW50WzRdO1xuICAgICAgICBnLmJlemllckN1cnZlVG8oXG4gICAgICAgICAgeCArIGN1cnJlbnRbMV0gKyBsLCAvLyB4MVxuICAgICAgICAgIHkgKyBjdXJyZW50WzJdICsgdCwgLy8geTFcbiAgICAgICAgICBjb250cm9sWCArIGwsIC8vIHgyXG4gICAgICAgICAgY29udHJvbFkgKyB0LCAvLyB5MlxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4ICsgY3VycmVudFsxXSwgeSArIGN1cnJlbnRbMl0pO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdDJzogLy8gYmV6aWVyQ3VydmVUbywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbNV07XG4gICAgICAgIHkgPSBjdXJyZW50WzZdO1xuICAgICAgICBjb250cm9sWCA9IGN1cnJlbnRbM107XG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFs0XTtcbiAgICAgICAgZy5iZXppZXJDdXJ2ZVRvKFxuICAgICAgICAgIGN1cnJlbnRbMV0gKyBsLFxuICAgICAgICAgIGN1cnJlbnRbMl0gKyB0LFxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcbiAgICAgICAgICBjb250cm9sWSArIHQsXG4gICAgICAgICAgeCArIGwsXG4gICAgICAgICAgeSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjdXJyZW50WzFdLCBjdXJyZW50WzJdKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAncyc6IC8vIHNob3J0aGFuZCBjdWJpYyBiZXppZXJDdXJ2ZVRvLCByZWxhdGl2ZVxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbM107XG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbNF07XG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXG4gICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcbiAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xuICAgICAgICBnLmJlemllckN1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB4ICsgY3VycmVudFsxXSArIGwsXG4gICAgICAgICAgeSArIGN1cnJlbnRbMl0gKyB0LFxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHggKyBjdXJyZW50WzFdLCB5ICsgY3VycmVudFsyXSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcblxuICAgICAgICAvLyBzZXQgY29udHJvbCBwb2ludCB0byAybmQgb25lIG9mIHRoaXMgY29tbWFuZFxuICAgICAgICAvLyBcIi4uLiB0aGUgZmlyc3QgY29udHJvbCBwb2ludCBpcyBhc3N1bWVkIHRvIGJlIHRoZSByZWZsZWN0aW9uIG9mIHRoZSBzZWNvbmQgY29udHJvbCBwb2ludCBvbiB0aGUgcHJldmlvdXMgY29tbWFuZCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBwb2ludC5cIlxuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzFdO1xuICAgICAgICBjb250cm9sWSA9IHkgKyBjdXJyZW50WzJdO1xuXG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnUyc6IC8vIHNob3J0aGFuZCBjdWJpYyBiZXppZXJDdXJ2ZVRvLCBhYnNvbHV0ZVxuICAgICAgICB0ZW1wWCA9IGN1cnJlbnRbM107XG4gICAgICAgIHRlbXBZID0gY3VycmVudFs0XTtcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHNcbiAgICAgICAgY29udHJvbFggPSAyKnggLSBjb250cm9sWDtcbiAgICAgICAgY29udHJvbFkgPSAyKnkgLSBjb250cm9sWTtcbiAgICAgICAgZy5iZXppZXJDdXJ2ZVRvKFxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcbiAgICAgICAgICBjb250cm9sWSArIHQsXG4gICAgICAgICAgY3VycmVudFsxXSArIGwsXG4gICAgICAgICAgY3VycmVudFsyXSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjdXJyZW50WzFdLCBjdXJyZW50WzJdKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIC8vIHNldCBjb250cm9sIHBvaW50IHRvIDJuZCBvbmUgb2YgdGhpcyBjb21tYW5kXG4gICAgICAgIC8vIFwiLi4uIHRoZSBmaXJzdCBjb250cm9sIHBvaW50IGlzIGFzc3VtZWQgdG8gYmUgdGhlIHJlZmxlY3Rpb24gb2YgdGhlIHNlY29uZCBjb250cm9sIHBvaW50IG9uIHRoZSBwcmV2aW91cyBjb21tYW5kIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50LlwiXG4gICAgICAgIGNvbnRyb2xYID0gY3VycmVudFsxXTtcbiAgICAgICAgY29udHJvbFkgPSBjdXJyZW50WzJdO1xuXG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdxJzogLy8gcXVhZHJhdGljQ3VydmVUbywgcmVsYXRpdmVcbiAgICAgICAgLy8gdHJhbnNmb3JtIHRvIGFic29sdXRlIHgseVxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzNdO1xuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzRdO1xuXG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG5cbiAgICAgICAgZy5xdWFkcmF0aWNDdXJ2ZVRvKFxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcbiAgICAgICAgICBjb250cm9sWSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdRJzogLy8gcXVhZHJhdGljQ3VydmVUbywgYWJzb2x1dGVcbiAgICAgICAgdGVtcFggPSBjdXJyZW50WzNdO1xuICAgICAgICB0ZW1wWSA9IGN1cnJlbnRbNF07XG5cbiAgICAgICAgZy5xdWFkcmF0aWNDdXJ2ZVRvKFxuICAgICAgICAgIGN1cnJlbnRbMV0gKyBsLFxuICAgICAgICAgIGN1cnJlbnRbMl0gKyB0LFxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGNvbnRyb2xYID0gY3VycmVudFsxXTtcbiAgICAgICAgY29udHJvbFkgPSBjdXJyZW50WzJdO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3QnOiAvLyBzaG9ydGhhbmQgcXVhZHJhdGljQ3VydmVUbywgcmVsYXRpdmVcblxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbMl07XG5cbiAgICAgICAgaWYgKHByZXZpb3VzWzBdLm1hdGNoKC9bUXFUdF0vKSA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIHByZXZpb3VzIGNvbW1hbmQgb3IgaWYgdGhlIHByZXZpb3VzIGNvbW1hbmQgd2FzIG5vdCBhIFEsIHEsIFQgb3IgdCxcbiAgICAgICAgICAvLyBhc3N1bWUgdGhlIGNvbnRyb2wgcG9pbnQgaXMgY29pbmNpZGVudCB3aXRoIHRoZSBjdXJyZW50IHBvaW50XG4gICAgICAgICAgY29udHJvbFggPSB4O1xuICAgICAgICAgIGNvbnRyb2xZID0geTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcmV2aW91c1swXSA9PT0gJ3QnKSB7XG4gICAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHMgZm9yIHRcbiAgICAgICAgICBjb250cm9sWCA9IDIgKiB4IC0gdGVtcENvbnRyb2xYO1xuICAgICAgICAgIGNvbnRyb2xZID0gMiAqIHkgLSB0ZW1wQ29udHJvbFk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocHJldmlvdXNbMF0gPT09ICdxJykge1xuICAgICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzIGZvciBxXG4gICAgICAgICAgY29udHJvbFggPSAyICogeCAtIGNvbnRyb2xYO1xuICAgICAgICAgIGNvbnRyb2xZID0gMiAqIHkgLSBjb250cm9sWTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlbXBDb250cm9sWCA9IGNvbnRyb2xYO1xuICAgICAgICB0ZW1wQ29udHJvbFkgPSBjb250cm9sWTtcblxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzFdO1xuICAgICAgICBjb250cm9sWSA9IHkgKyBjdXJyZW50WzJdO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ1QnOlxuICAgICAgICB0ZW1wWCA9IGN1cnJlbnRbMV07XG4gICAgICAgIHRlbXBZID0gY3VycmVudFsyXTtcblxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50c1xuICAgICAgICBjb250cm9sWCA9IDIgKiB4IC0gY29udHJvbFg7XG4gICAgICAgIGNvbnRyb2xZID0gMiAqIHkgLSBjb250cm9sWTtcbiAgICAgICAgZy5xdWFkcmF0aWNDdXJ2ZVRvKFxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcbiAgICAgICAgICBjb250cm9sWSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhJzpcbiAgICAgICAgZHJhd0FyYyhnLCB4ICsgbCwgeSArIHQsIFtcbiAgICAgICAgICBjdXJyZW50WzFdLFxuICAgICAgICAgIGN1cnJlbnRbMl0sXG4gICAgICAgICAgY3VycmVudFszXSxcbiAgICAgICAgICBjdXJyZW50WzRdLFxuICAgICAgICAgIGN1cnJlbnRbNV0sXG4gICAgICAgICAgY3VycmVudFs2XSArIHggKyBsLFxuICAgICAgICAgIGN1cnJlbnRbN10gKyB5ICsgdFxuICAgICAgICBdLCBib3VuZHMsIGwsIHQpO1xuICAgICAgICB4ICs9IGN1cnJlbnRbNl07XG4gICAgICAgIHkgKz0gY3VycmVudFs3XTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ0EnOlxuICAgICAgICBkcmF3QXJjKGcsIHggKyBsLCB5ICsgdCwgW1xuICAgICAgICAgIGN1cnJlbnRbMV0sXG4gICAgICAgICAgY3VycmVudFsyXSxcbiAgICAgICAgICBjdXJyZW50WzNdLFxuICAgICAgICAgIGN1cnJlbnRbNF0sXG4gICAgICAgICAgY3VycmVudFs1XSxcbiAgICAgICAgICBjdXJyZW50WzZdICsgbCxcbiAgICAgICAgICBjdXJyZW50WzddICsgdFxuICAgICAgICBdLCBib3VuZHMsIGwsIHQpO1xuICAgICAgICB4ID0gY3VycmVudFs2XTtcbiAgICAgICAgeSA9IGN1cnJlbnRbN107XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd6JzpcbiAgICAgIGNhc2UgJ1onOlxuICAgICAgICBnLmNsb3NlUGF0aCgpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcHJldmlvdXMgPSBjdXJyZW50O1xuICB9XG4gIHJldHVybjsgLy8gYm91bmRzLnRyYW5zbGF0ZShsLCB0KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBhcnNlOiAgcGFyc2UsXG4gIHJlbmRlcjogcmVuZGVyXG59O1xuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG5cblxuLyoqXG4gKiBUZXh0IE5vZGVcbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIGZvbnQ6IENhbnZhcy1BUEkgZm9ybWF0dGVkIGZvbnQgc3RyaW5nLCBmb3IgZXhhbXBsZSAnYm9sZCAxMnB4IHNlcmlmJ1xuICogdGV4dEFsaWduLCB0ZXh0QmFzZWxpbmU6IGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoLCBsaW5lQ2FwLCBsaW5lSm9pbjogYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXG4gKi9cbnZhciBUZXh0ID0gZnVuY3Rpb24oKSB7XG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblxuVGV4dC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0LnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgY3R4LmZvbnQgPSB0aGlzLmZvbnQgfHwgJzEwcHggc2Fucy1zZXJpZic7XG4gICAgY3R4LnRleHRBbGlnbiA9IHRoaXMudGV4dEFsaWduIHx8ICdzdGFydCc7XG4gICAgY3R4LnRleHRCYXNlbGluZSA9IHRoaXMudGV4dEJhc2VsaW5lIHx8ICdhbHBoYWJldGljJztcblxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZmlsbFN0eWxlO1xuICAgICAgY3R4LmZpbGxUZXh0KHRoaXMudGV4dCwgMCwgMCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XG4gICAgICBjdHgubGluZUNhcCA9IHRoaXMubGluZUNhcCB8fCAnYnV0dCc7XG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XG4gICAgICBjdHguc3Ryb2tlVGV4dCh0aGlzLnRleHQsIDAsIDApO1xuICAgIH1cbiAgfSxcblxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuICAgIC8vIFhYWCBTaXplIGNhbGN1bGF0aW9ucyAtIGZvbnQsIGZvbnQtc2l6ZSwgaGVpZ2h0XG4gICAgdmFyIHdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KHRoaXMudGV4dCk7XG4gICAgdmFyIGhlaWdodCA9IDEwO1xuXG4gICAgaWYgKGx4ID49IDAgJiYgbHggPCB3aWR0aCAmJiBseSA+PSAwICYmIGx5IDwgaGVpZ2h0KSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dDsiLCJcbnZhciBVdGlsID0ge1xuXG4gIGV4dGVuZDogZnVuY3Rpb24oZGVzdCwgc291cmNlcykge1xuICAgIHZhciBrZXksIGksIHNvdXJjZTtcbiAgICBmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGZvciAoa2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBkZXN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVzdDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(5)
});
