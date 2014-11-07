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
	var dist = Math.sqrt( (this.x - x)*(this.x - x) + (this.y - y)*(this.y - y));
    if (dist < this.radius) {
      return this;
    }
  }
});


module.exports = Circle;
},{"./node":5,"./util":11}],2:[function(_dereq_,module,exports){
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
},{"./node":5,"./util":11}],3:[function(_dereq_,module,exports){
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
},{"./node":5,"./util":11}],4:[function(_dereq_,module,exports){
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
},{"./circle":1,"./group":2,"./image":3,"./path":6,"./polyfills":7,"./rect":8,"./text":10,"./util":11}],5:[function(_dereq_,module,exports){
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
	var d = new $.Deferred();
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
		d.resolve(this,attributes);
        if (transition.callback) {
          transition.callback(this, attributes);
        }
      })
      .start();
	 return d.promise;
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
},{"./util":11}],6:[function(_dereq_,module,exports){
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
},{"./node":5,"./svg":9,"./util":11}],7:[function(_dereq_,module,exports){

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
},{}],8:[function(_dereq_,module,exports){
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
},{"./node":5,"./util":11}],9:[function(_dereq_,module,exports){
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

},{}],10:[function(_dereq_,module,exports){
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
},{"./node":5,"./util":11}],11:[function(_dereq_,module,exports){

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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL2NpcmNsZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL2dyb3VwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvaW1hZ2UuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9tYWluLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvbm9kZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL3BhdGguanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9wb2x5ZmlsbHMuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9yZWN0LmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvc3ZnLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvdGV4dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xuXG52YXIgTk9ORSA9IFtdO1xuXG4vKipcbiAqIENpcmNsIE5vZGVcbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIHJhZGl1cyA6IHRoZSByYWRpdXMgb2YgdGhlIGNpcmNsZVxuICogKHgseSkgOiBjb3JyZXNwb25kIHRvIHRoZSBjZW50ZXIgb2YgdGhlIGNpcmNsZVxuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoOlxuICogICBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcbiAqIGxpbmVEYXNoOiBhbiBhcnJheSBzcGVjaWZ5aW5nIG9uL29mZiBwaXhlbCBwYXR0ZXJuXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICogbGluZURhc2hPZmZzZXQ6IGEgcGl4ZWwgb2Zmc2V0IHRvIHN0YXJ0IHRoZSBkYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICpcbiAqIE5vdGU6IHBpY2tpbmcgaXMgYWx3YXlzIGVuYWJsZWQgb24gdGhlIGVudGlyZSBjaXJjbGUgKG5vIHN0cm9rZS1vbmx5IHBpY2tpbmcpIGF0XG4gKiB0aGUgbW9tZW50LlxuICovXG52YXIgQ2lyY2xlID0gZnVuY3Rpb24oKSB7XG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblxuQ2lyY2xlLnByb3RvdHlwZSA9IF8uZXh0ZW5kKENpcmNsZS5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cyB8fCAwO1xuXHRjdHguYmVnaW5QYXRoKCk7XG5cdGN0eC5hcmMoMCwwLCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG5cbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcblx0ICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsU3R5bGU7XG5cdCAgY3R4LmZpbGwoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUpIHtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGU7XG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcbiAgICAgIGN0eC5saW5lQ2FwID0gdGhpcy5saW5lQ2FwIHx8ICdidXR0JztcbiAgICAgIGN0eC5saW5lSm9pbiA9IHRoaXMubGluZUpvaW4gfHwgJ21pdGVyJztcbiAgICAgIGN0eC5taXRlckxpbWl0ID0gdGhpcy5taXRlckxpbWl0IHx8IDEwO1xuICAgICAgY3R4LnNldExpbmVEYXNoKHRoaXMubGluZURhc2ggfHwgTk9ORSk7XG4gICAgICBjdHguc2V0TGluZURhc2hPZmZzZXQodGhpcy5saW5lRGFzaE9mZnNldCB8fCAwKTtcbiAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9XG5cdGN0eC5jbG9zZVBhdGgoKTtcbiAgfSxcblxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuXHR2YXIgZGlzdCA9IE1hdGguc3FydCggKHRoaXMueCAtIHgpKih0aGlzLnggLSB4KSArICh0aGlzLnkgLSB5KSoodGhpcy55IC0geSkpO1xuICAgIGlmIChkaXN0IDwgdGhpcy5yYWRpdXMpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDaXJjbGU7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG5cblxuLyoqXG4gKiBHcm91cCAoY29udGFpbmVyKSBub2RlIGluIHRoZSBzY2VuZWdyYXBoLiBIYXMgbm8gdmlzdWFsIHJlcHJlc2VudGF0aW9uLlxuICpcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XG4gKlxuICogY2xpcDoge3gsIHksIHdpZHRoLCBoZWlnaHR9IFNwZWNpZmllcyBhbiBvcHRpb25hbCByZWN0YW5ndWxhciBjbGlwcGluZyByZWN0YW5nbGVcbiAqICAgdGhhdCBhcHBsaWVzIHRvIGFsbCBjaGlsZCBub2Rlcy5cbiAqXG4gKiBOb3RlOiBhcHBseWluZyBvcGFjaXR5IHRvIEdyb3VwcyBpcyBzdXBwb3J0ZWQgYnV0IG5vdCBjdW1tdWxhdGl2ZS4gU3BlY2lmaWNhbGx5LFxuICogaWYgYSBjaGlsZCBub2RlIHNldHMgb3BhY2l0eSBpdCB3aWxsIG92ZXJyaWRlIHRoZSBncm91cC1sZXZlbCBvcGFjaXR5LCBub3RcbiAqIGFjY3VtdWxhdGUgaXQuIEFzIHN1Y2ggdGhlIGdyb3VwIG9wYWNpdHkgc2ltcGx5IHN1cHBsaWVzIHRoZSBkZWZhdWx0IG9wYWNpdHlcbiAqIHRvIGNoaWxkIG5vZGVzLlxuICovXG52YXIgR3JvdXAgPSBmdW5jdGlvbigpIHtcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIHRoaXMuY2hpbGRyZW4gPSBbXTtcbn07XG5cblxuR3JvdXAucHJvdG90eXBlID0gXy5leHRlbmQoR3JvdXAucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xuXG4gIC8qKlxuICAgKiBBZGRzIGEgY2hpbGQgbm9kZSB0byB0aGlzIGdyb3VwLCBvcHRpb25hbGx5IGluY2x1ZGluZyB0aGUgYGluZGV4YFxuICAgKiBhdCB3aGljaCB0byBpbnNlcnQuIElmIGBpbmRleGAgaXMgb21pdHRlZCwgdGhlIG5vZGUgaXMgYWRkZWQgYXQgdGhlXG4gICAqIGVuZCAodmlzdWFsbHkgb24gdG9wKSBvZiB0aGUgZXhpc3QgbGlzdCBvZiBjaGlsZHJlbi5cbiAgICovXG4gIGFkZENoaWxkOiBmdW5jdGlvbihjaGlsZCwgaW5kZXgpIHtcbiAgICBjaGlsZC5wYXJlbnQgPSB0aGlzO1xuICAgIGlmIChpbmRleCAhPSBudWxsICYmIGluZGV4IDw9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuLnNwbGljZShpbmRleCwgMCwgY2hpbGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIHNwZWNpZmllZCBjaGlsZCBmcm9tIHRoaXMgZ3JvdXAuIElmIHRoZSBjaGlsZCBleGlzdHMgaW5cbiAgICogdGhpcyBncm91cCBpdCBpcyByZW1vdmVkIGFuZCByZXR1cm5lZC5cbiAgICovXG4gIHJlbW92ZUNoaWxkOiBmdW5jdGlvbihjaGlsZCkge1xuICAgIC8vIFJlbW92ZSBjaGlsZFxuICAgIHZhciBpZHggPSB0aGlzLmNoaWxkcmVuLmluZGV4T2YoY2hpbGQpO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgdGhpcy5jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIGNoaWxkLnBhcmVudCA9IG51bGw7XG4gICAgICByZXR1cm4gY2hpbGQ7XG4gICAgfVxuICB9LFxuXG5cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuO1xuICAgIHZhciBjbGlwID0gdGhpcy5jbGlwO1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBpZiAoY2xpcCkge1xuICAgICAgaWYgKGx4IDwgY2xpcC54IHx8IGx4ID4gY2xpcC54K2NsaXAud2lkdGggJiYgbHkgPCBjbGlwLnkgJiYgbHkgPiBjbGlwLnkrY2xpcC5oZWlnaHQpIHtcbiAgICAgICAgLy8gUGljayBwb2ludCBpcyBvdXQgb2YgY2xpcCByZWN0XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWZlciBwaWNraW5nIHRvIGNoaWxkcmVuIC0gc3RhcnQgYXQgdG9wIG9mIHN0YWNrIChlbmQgb2YgY2hpbGQgbGlzdClcbiAgICAvLyBhbmQgd29yayBiYWNrd2FyZHMsIGV4aXQgZWFybHkgaWYgaGl0IGZvdW5kXG4gICAgZm9yICh2YXIgaT1jaGlsZHJlbi5sZW5ndGgtMTsgaT49MCAmJiAhcmVzdWx0OyBpLS0pIHtcbiAgICAgIHJlc3VsdCA9IGNoaWxkcmVuW2ldLnBpY2soY3R4LCB4LCB5LCBseCwgbHkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdGhpcy5jaGlsZHJlbjtcblxuICAgIGlmICh0aGlzLmNsaXApIHtcbiAgICAgIGN0eC5zYXZlKCk7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHgucmVjdCh0aGlzLmNsaXAueCwgdGhpcy5jbGlwLnksIHRoaXMuY2xpcC53aWR0aCwgdGhpcy5jbGlwLmhlaWdodCk7XG4gICAgICBjdHguY2xpcCgpO1xuICAgIH1cblxuICAgIC8vIFJlbmRlciBjaGlsZHJlbiBmcm9tIGJvdHRvbS11cFxuICAgIGZvciAodmFyIGk9MCwgbD1jaGlsZHJlbi5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBjaGlsZHJlbltpXS5yZW5kZXIoY3R4KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jbGlwKSB7XG4gICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcblxuLyoqXG4gKiBSYXN0ZXIgSW1hZ2UgTm9kZVxuICpcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XG4gKlxuICogc3JjOiB1cmwgKHJlbGF0aXZlIG9yIGZ1bGx5IHF1YWxpZmllZCkgZnJvbSB3aGljaCB0byBsb2FkIGltYWdlXG4gKiB3aWR0aDogd2lkdGggb2YgdGhlIHJlbmRlcmVkIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBpbWFnZSAoaW4gcGl4ZWxzKS5cbiAqICAgSWYgdW5zZXQvbnVsbCwgdGhlIG5hdHVyYWwgd2lkdGggb2YgdGhlIGltYWdlIHdpbGwgYmUgdXNlZFxuICogaGVpZ2h0OiBoZWlnaHQgb2YgdGhlIHJlbmRlcmVkIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBpbWFnZSAoaW4gcGl4ZWxzKS5cbiAqICAgSWYgdW5zZXQvbnVsbCwgdGhlIG5hdHVyYWwgaGVpZ2h0IG9mIHRoZSBpbWFnZSB3aWxsIGJlIHVzZWRcbiAqL1xudmFyIEltYWdlTm9kZSA9IGZ1bmN0aW9uKCkge1xuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgdGhpcy5fbG9hZGVkID0gZmFsc2U7XG59O1xuXG5cbkltYWdlTm9kZS5wcm90b3R5cGUgPSBfLmV4dGVuZChJbWFnZU5vZGUucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgc2VsZjtcblxuICAgIGlmICh0aGlzLl9pbWFnZSAmJiB0aGlzLl9pbWFnZS5sb2FkZWQpIHtcbiAgICAgIC8vIEltYWdlXG4gICAgICBpZiAodGhpcy53aWR0aCAhPSBudWxsIHx8IHRoaXMuaGVpZ2h0ICE9IG51bGwpIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLl9pbWFnZSwgMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmRyYXdJbWFnZSh0aGlzLl9pbWFnZSwgMCwgMCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGhpcy5faW1hZ2UpIHtcbiAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5faW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAgIHRoaXMuX2ltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBPbmx5IHJlbmRlciBzY2VuZSBpZiBsb2FkZWQgaW1hZ2UgaXMgc3RpbGwgcGFydCBvZiBpdFxuICAgICAgICBpZiAodGhpcyA9PT0gc2VsZi5faW1hZ2UpIHtcbiAgICAgICAgICBzZWxmLl9pbWFnZS5sb2FkZWQgPSB0cnVlO1xuICAgICAgICAgIHNlbGYudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB0aGlzLl9pbWFnZS5zcmMgPSB0aGlzLnNyYztcbiAgICB9XG4gIH0sXG5cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoIHx8ICh0aGlzLl9pbWFnZSAmJiB0aGlzLl9pbWFnZS53aWR0aCk7XG4gICAgdmFyIGhlaWdodCA9IHRoaXMuaGVpZ2h0IHx8ICh0aGlzLl9pbWFnZSAmJiB0aGlzLl9pbWFnZS5oZWlnaHQpO1xuXG4gICAgaWYgKGx4ID49IDAgJiYgbHggPCB3aWR0aCAmJiBseSA+PSAwICYmIGx5IDwgaGVpZ2h0KSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbn0pO1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShJbWFnZU5vZGUucHJvdG90eXBlLCAnc3JjJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zcmM7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodGhpcy5fc3JjICE9PSB2YWx1ZSkge1xuICAgICAgdGhpcy5fc3JjID0gdmFsdWU7XG4gICAgICB0aGlzLl9pbWFnZSA9IG51bGw7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlTm9kZTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHBvbHlmaWxsID0gcmVxdWlyZSgnLi9wb2x5ZmlsbHMnKTtcbnZhciBHcm91cCA9IHJlcXVpcmUoJy4vZ3JvdXAnKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHNjZW5lZ3JhcGggcm9vdCBlbGVtZW50IHdoaWNoIGltcGxlbWVudHMgYW4gZXh0ZW5kZWRcbiAqIEdyb3VwIGludGVyZmFjZS4gRXhwZWN0cyBhIGBjYW52YXNgIEhUTUwgZWxlbWVudC5cbiAqL1xudmFyIFBhdGggPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIC8vIEF1dG9pbnN0YW50aWF0ZVxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGF0aCkpIHtcbiAgICByZXR1cm4gbmV3IFBhdGgoZWxlbWVudCk7XG4gIH1cbiAgR3JvdXAuYXBwbHkodGhpcyk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMuZWwgPSBlbGVtZW50O1xuICB0aGlzLmNvbnRleHQgPSBlbGVtZW50LmdldENvbnRleHQoXCIyZFwiKTtcblxuICAvLyBBZGQgaGVscGVyIHBvbHlmaWxscyB0byBjb250ZXh0IGluc3RhbmNlXG4gIHBvbHlmaWxsLmRhc2hTdXBwb3J0KHRoaXMuY29udGV4dCk7XG5cbiAgLy8gT2Zmc2V0IGJ5IDEvMiBwaXhlbCB0byBhbGlnbiB3aXRoIHBpeGVsIGVkZ2VzXG4gIC8vIGh0dHA6Ly9kaXZlaW50b2h0bWw1LmluZm8vY2FudmFzLmh0bWwjcGl4ZWwtbWFkbmVzc1xuICB0aGlzLnggPSAwLjU7XG4gIHRoaXMueSA9IDAuNTtcblxuICAvLyBCaW5kIG1lbWJlcnMgZm9yIGNvbnZlbmllbnQgY2FsbGJhY2tcbiAgdGhpcy51cGRhdGUgPSB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpO1xuICB0aGlzLl9oYW5kbGUgPSB0aGlzLl9oYW5kbGUuYmluZCh0aGlzKTtcbiAgdGhpcy5fbW91c2Vtb3ZlID0gdGhpcy5fbW91c2Vtb3ZlLmJpbmQodGhpcyk7XG5cbiAgLy8gUmVnaXN0ZXIgZXZlbnQgbGlzdGVuZXJzIG9uIGNhbnZhcyB0aGF0IHVzZSBwaWNrZXIgdG8gaGl0dGVzdFxuICBbJ2NsaWNrJywgJ2RibGNsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJ10uZm9yRWFjaChmdW5jdGlvbih0eXBlKSB7XG4gICAgc2VsZi5lbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIHNlbGYuX2hhbmRsZSk7XG4gIH0pO1xuICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuX21vdXNlbW92ZSk7XG5cbiAgLy8gTGlzdGVuIGZvciB1cGRhdGUgcmVxdWVzdHMgZnJvbSBzY2VuZWdyYXBoLCBkZWZlciBieSBhIGZyYW1lLCBjb2FsZXNjZVxuICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gbnVsbDtcbiAgdGhpcy5vbigndXBkYXRlJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFzZWxmLl9wZW5kaW5nVXBkYXRlKSB7XG4gICAgICBzZWxmLl9wZW5kaW5nVXBkYXRlID0gcG9seWZpbGwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCBzZWxmLnVwZGF0ZSApO1xuICAgIH1cbiAgfSk7XG4gIC8vIENyZWF0ZSBhbmltYXRlLXVwZGF0ZSBmdW5jdGlvbiBvbmNlXG4gIHRoaXMuX2FuaW1VcGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBUV0VFTi51cGRhdGUoKTtcbiAgICBzZWxmLnVwZGF0ZSgpO1xuICB9O1xuXG4gIC8vIFJlc2l6ZSB0byBjdXJyZW50IERPTS1zcGVjaWZpZWQgc2l6aW5nXG4gIHRoaXMucmVzaXplKCk7XG59O1xuXG5cbl8uZXh0ZW5kKFBhdGgucHJvdG90eXBlLCBHcm91cC5wcm90b3R5cGUsIHtcbiAgLyoqXG4gICAqIFJlc2l6ZSBvciB1cGRhdGUgdGhlIHNpemUgb2YgdGhlIGNhbnZhcy4gQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIHdpbGwgZml4XG4gICAqIHRoZSBjc3Mtc3R5bGUtc3BlY2lmaWVkIHNpemUgb2YgdGhlIGNhbnZhcyBlbGVtZW50LiBDYWxsIGB1cGRhdGUoKWBcbiAgICogdG8gY2F1c2UgdGhlIGNhbnZhcyB0byByZXJlbmRlciBhdCB0aGUgbmV3IHNpemUuXG4gICAqXG4gICAqIFN0cmljdCBzaXppbmcgaXMgbmVjZXNzYXJ5IHRvIHNldCB0aGUgY2FudmFzIHdpZHRoL2hlaWdodCBwaXhlbCBjb3VudFxuICAgKiB0byB0aGUgY29ycmVjdCB2YWx1ZSBmb3IgdGhlIGNhbnZhcyBlbGVtZW50IERPTSBzaXplIGFuZCBkZXZpY2UgcGl4ZWxcbiAgICogcmF0aW8uXG4gICAqL1xuICByZXNpemU6IGZ1bmN0aW9uKHcsIGgpIHtcbiAgICAvLyBUT0RPIHRoaXMgbWF5IG5vdCBiZSByZWxpYWJsZSBvbiBtb2JpbGVcbiAgICB0aGlzLmRldmljZVBpeGVsUmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxO1xuXG4gICAgdGhpcy53aWR0aCA9IHcgfHwgdGhpcy5lbC5jbGllbnRXaWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IGggfHwgdGhpcy5lbC5jbGllbnRIZWlnaHQ7XG5cbiAgICB0aGlzLmVsLnN0eWxlLndpZHRoID0gdGhpcy53aWR0aCArICdweCc7XG4gICAgdGhpcy5lbC5zdHlsZS5oZWlnaHQgPSB0aGlzLmhlaWdodCArICdweCc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgY2FudmFzIHRvIHJlbmRlciBzeW5jaHJvbm91c2x5LiBJZiBhbnkgYW5pbWF0aW9ucyBhcmUgYWN0aXZlL3BlbmRpbmdcbiAgICogdGhpcyB3aWxsIGtpY2sgb2ZmIGEgc2VyaWVzIG9mIGF1dG9tYXRpYyB1cGRhdGVzIHVudGlsIHRoZSBhbmltYXRpb25zIGFsbFxuICAgKiBjb21wbGV0ZS5cbiAgICovXG4gIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgLy8gVXBkYXRlIHNpemUgdG8gZXF1YWwgZGlzcGxheWVkIHBpeGVsIHNpemUgKyBjbGVhclxuICAgIHRoaXMuY29udGV4dC5jYW52YXMud2lkdGggPSB0aGlzLndpZHRoICogdGhpcy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgIHRoaXMuY29udGV4dC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKiB0aGlzLmRldmljZVBpeGVsUmF0aW87XG4gICAgaWYgKHRoaXMuZGV2aWNlUGl4ZWxSYXRpbyAhPSAxKSB7XG4gICAgICB0aGlzLmNvbnRleHQuc2F2ZSgpO1xuICAgICAgdGhpcy5jb250ZXh0LnNjYWxlKHRoaXMuZGV2aWNlUGl4ZWxSYXRpbywgdGhpcy5kZXZpY2VQaXhlbFJhdGlvKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gbnVsbDtcblxuICAgIC8vIEFjdGl2ZSBhbmltYXRpb25zPyBzY2hlZHVsZSB0d2VlbiB1cGRhdGUgKyByZW5kZXIgb24gbmV4dCBmcmFtZVxuICAgIGlmICh3aW5kb3cuVFdFRU4gJiYgVFdFRU4uZ2V0QWxsKCkubGVuZ3RoID4gMCkge1xuICAgICAgLy8gWFhYIENvdWxkIGJlIGFuIGV4aXN0aW5nIHBlbmRpbmcgdXBkYXRlXG4gICAgICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gcG9seWZpbGwucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2FuaW1VcGRhdGUpO1xuICAgIH1cblxuICAgIHRoaXMucmVuZGVyKHRoaXMuY29udGV4dCk7XG5cbiAgICBpZiAodGhpcy5kZXZpY2VQaXhlbFJhdGlvICE9IDEpIHtcbiAgICAgIHRoaXMuY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIEdlbmVyYWwgaGFuZGxlciBmb3Igc2ltcGxlIGV2ZW50cyAoY2xpY2ssIG1vdXNlZG93biwgZXRjKVxuICBfaGFuZGxlOiBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGhpdCA9IHRoaXMucGljayh0aGlzLmNvbnRleHQsIGUub2Zmc2V0WCwgZS5vZmZzZXRZLCBlLm9mZnNldFgsIGUub2Zmc2V0WSk7XG4gICAgaWYgKGhpdCkge1xuICAgICAgZS50YXJnZXROb2RlID0gaGl0O1xuICAgICAgaGl0LnRyaWdnZXIoZS50eXBlLCBlKTtcbiAgICB9XG4gIH0sXG5cbiAgX21vdXNlbW92ZTogZnVuY3Rpb24oZSkge1xuICAgIHZhciBoaXQgPSB0aGlzLnBpY2sodGhpcy5jb250ZXh0LCBlLm9mZnNldFgsIGUub2Zmc2V0WSwgZS5vZmZzZXRYLCBlLm9mZnNldFkpO1xuICAgIGlmIChoaXQpIHtcbiAgICAgIGUudGFyZ2V0Tm9kZSA9IGhpdDtcbiAgICB9XG4gICAgLy8gTWFuYWdlIG1vdXNlb3V0L21vdXNlb3ZlclxuICAgIC8vIFRPRE8gY3JlYXRlIG5ldyBldmVudCBvYmplY3RzIHdpdGggY29ycmVjdCBldmVudCB0eXBlXG4gICAgaWYgKHRoaXMuX2xhc3RvdmVyICE9IGhpdCkge1xuICAgICAgaWYgKHRoaXMuX2xhc3RvdmVyKSB7XG4gICAgICAgIGUudGFyZ2V0Tm9kZSA9IHRoaXMuX2xhc3RvdmVyO1xuICAgICAgICB0aGlzLl9sYXN0b3Zlci50cmlnZ2VyKCdtb3VzZW91dCcsIGUpO1xuICAgICAgICBlLnRhcmdldE5vZGUgPSBoaXQ7XG4gICAgICB9XG4gICAgICB0aGlzLl9sYXN0b3ZlciA9IGhpdDtcbiAgICAgIGlmIChoaXQpIHtcbiAgICAgICAgaGl0LnRyaWdnZXIoJ21vdXNlb3ZlcicsIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbHdheXMgc2VuZCBtb3VzZW1vdmUgbGFzdFxuICAgIGlmIChoaXQpIHtcbiAgICAgIGhpdC50cmlnZ2VyKCdtb3VzZW1vdmUnLCBlKTtcbiAgICB9XG4gICAgLy8gVE9ETyBIYW5kbGUgbW91c2UgbGVhdmluZyBjYW52YXNcbiAgfVxufSk7XG5cblxuXG4vLyBTVEFUSUNcblxuLy8gQWRkIGxpYnJhcnkgY29uc3RydWN0cyB0byBuYW1lc3BhY2VcbnZhciBuYW1lc3BhY2VDb25zdHJ1Y3RvcnMgPSB7XG4gIHJlY3Q6IHJlcXVpcmUoJy4vcmVjdCcpLFxuICBwYXRoOiByZXF1aXJlKCcuL3BhdGgnKSxcbiAgdGV4dDogcmVxdWlyZSgnLi90ZXh0JyksXG4gIGltYWdlOiByZXF1aXJlKCcuL2ltYWdlJyksXG4gIGNpcmNsZTogcmVxdWlyZSgnLi9jaXJjbGUnKSxcbiAgZ3JvdXA6IEdyb3VwXG59O1xuXG5mb3IgKGF0dHIgaW4gbmFtZXNwYWNlQ29uc3RydWN0b3JzKSB7XG4gIFBhdGhbYXR0cl0gPSAoZnVuY3Rpb24oYXR0cikge1xuICAgIHJldHVybiBmdW5jdGlvbihwcm9wcykge1xuICAgICAgcmV0dXJuIG5ldyBuYW1lc3BhY2VDb25zdHJ1Y3RvcnNbYXR0cl0ocHJvcHMpO1xuICAgIH07XG4gIH0oYXR0cikpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gUGF0aDsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG52YXIgSUQgPSAwO1xuXG4vKipcbiAqIEJhc2UgTm9kZSBvYmplY3QgZm9yIGFsbCBzY2VuZWdyYXBoIG9iamVjdHNcbiAqXG4gKiBpZDogbm9uLXZpc3VhbCwgdW5pcXVlIHZhbHVlIGZvciBhbGwgbm9kZXNcbiAqIHZpc2libGU6IGlmIGZhbHNlLCB0aGlzIG5vZGUgKGFuZCBkZXNjZW5kZW50cykgd2lsbCBub3QgcmVuZGVyIG5vciBwaWNrXG4gKiB4OiB0aGUgeCBwb3NpdGlvbiAodHJhbnNsYXRpb24pIGFwcGxpZWQgdG8gdGhpcyBub2RlXG4gKiB5OiB0aGUgeSBwb3NpdGlvbiAodHJhbnNsYXRpb24pIGFwcGxpZWQgdG8gdGhpcyBub2RlXG4gKiByb3RhdGlvbjogcm90YXRpb24gaW4gcmFkaWFucyBhcHBsaWVkIHRvIHRoaXMgbm9kZSBhbmQgYW55IGRlc2NlbmRlbnRzXG4gKiBzY2FsZVgsIHNjYWxlWTogeCBhbmQgeSBzY2FsZSBhcHBsaWVkIHRvIHRoaXMgbm9kZSBhbmQgYW55IGRlc2NlbmRlbnRzXG4gKiBvcGFjaXR5OiB0aGUgZ2xvYmFsIG9wYWNpdHkgWzAsMV0gb2YgdGhpcyBub2RlXG4gKi9cbnZhciBOb2RlID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICB0aGlzLmlkID0gSUQrKztcbiAgdGhpcy5wYXJlbnQgPSBudWxsO1xuICB0aGlzLnZpc2libGUgPSB0cnVlO1xuICB0aGlzLmhhbmRsZXJzID0ge307XG5cbiAgXy5leHRlbmQodGhpcywgYXR0cmlidXRlcyk7XG59O1xuXG5Ob2RlLnByb3RvdHlwZSA9IHtcbiAgLyoqXG4gICAqIFNpbXBsZVxuICAgKi9cbiAgZGF0YTogZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBCdWxrIHNldHMgYSBncm91cCBvZiBub2RlIHByb3BlcnRpZXMsIHRha2VzIGEgbWFwIG9mIHByb3BlcnR5IG5hbWVzXG4gICAqIHRvIHZhbHVlcy4gRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gc2V0dGluZyBlYWNoIHByb3BlcnR5IHZpYVxuICAgKiBgbm9kZS5wcm9wZXJ0eU5hbWUgPSB2YWx1ZWBcbiAgICovXG4gIGF0dHI6IGZ1bmN0aW9uKGF0dHJpYnV0ZXMpIHtcbiAgICBfLmV4dGVuZCh0aGlzLCBhdHRyaWJ1dGVzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogUXVldWVzIGEgc2V0IG9mIG5vZGUgcHJvcGVydGllcyBmb3IgYW4gYW5pbWF0ZWQgdHJhbnNpdGlvbi4gT25seVxuICAgKiBudW1lcmljIHByb3BlcnRpZXMgY2FuIGJlIGFuaW1hdGVkLiBUaGUgbGVuZ3RoIG9mIHRoZSB0cmFuc2l0aW9uXG4gICAqIGlzIHNwZWNpZmllZCBpbiB0aGUgdHJhbnNpdGlvbiBwcm9wZXJ0eSwgZGVmYXVsdHMgdG8gMSBzZWNvbmQuIEFuXG4gICAqIG9wdGlvbmFsIGNhbGxiYWNrIGNhbiBiZSBwcm92aWRlZCB3aGljaCB3aWxsIGJlIGNhbGxlZCBvbiBhbmltYXRpb25cbiAgICogY29tcGxldGlvbi5cbiAgICpcbiAgICogQ2FsbGluZyBgdXBkYXRlKClgIG9uIHRoZSBzY2VuZSByb290IHdpbGwgdHJpZ2dlciB0aGUgc3RhcnQgb2YgYWxsXG4gICAqIHF1ZXVlZCBhbmltYXRpb25zIGFuZCBjYXVzZSB0aGVtIHRvIHJ1biAoYW5kIHJlbmRlcikgdG8gY29tcGxldGlvbi5cbiAgICovXG4gIHR3ZWVuQXR0cjogZnVuY3Rpb24oYXR0cmlidXRlcywgdHJhbnNpdGlvbikge1xuXHR2YXIgZCA9IG5ldyAkLkRlZmVycmVkKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBrZXksIHN0YXRpY3M7XG4gICAgdHJhbnNpdGlvbiA9IHRyYW5zaXRpb24gfHwge307XG5cbiAgICAvLyBPbmx5IHN1cHBvcnQgdHdlZW5pbmcgbnVtYmVycyAtIHN0YXRpY2FsbHkgc2V0IGV2ZXJ5dGhpbmcgZWxzZVxuICAgIGZvciAoa2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgIGlmIChhdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KGtleSkgJiYgdHlwZW9mIGF0dHJpYnV0ZXNba2V5XSAhPSAnbnVtYmVyJykge1xuICAgICAgICBzdGF0aWNzID0gc3RhdGljcyB8fCB7fTtcbiAgICAgICAgc3RhdGljc1trZXldID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICBkZWxldGUgYXR0cmlidXRlc1trZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGF0aWNzKSB7XG4gICAgICB0aGlzLmF0dHIoc3RhdGljcyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudHdlZW4pIHtcbiAgICAgIC8vIFRPRE8gSnVtcCB0byBlbmQgc3RhdGUgb2YgdmFycyBub3QgYmVpbmcgdHJhbnNpdGlvbmVkXG4gICAgICB0aGlzLnR3ZWVuLnN0b3AoKTtcbiAgICB9XG5cbiAgICB0aGlzLnR3ZWVuID0gbmV3IFRXRUVOLlR3ZWVuKHRoaXMpXG4gICAgICAudG8oYXR0cmlidXRlcywgdHJhbnNpdGlvbi5kdXJhdGlvbiB8fCAxMDAwKVxuICAgICAgLm9uQ29tcGxldGUoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYudHdlZW4gPSBudWxsO1xuXHRcdGQucmVzb2x2ZSh0aGlzLGF0dHJpYnV0ZXMpO1xuICAgICAgICBpZiAodHJhbnNpdGlvbi5jYWxsYmFjaykge1xuICAgICAgICAgIHRyYW5zaXRpb24uY2FsbGJhY2sodGhpcywgYXR0cmlidXRlcyk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhcnQoKTtcblx0IHJldHVybiBkLnByb21pc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGlzIG5vZGUuIEZvciBleGFtcGxlOlxuICAgKiBgYGBcbiAgICogbm9kZS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuICAgKiAgIC8vIGRvIHNvbWV0aGluZ1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqIEFuIGV2ZW50IG9iamVjdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgaGFuZGxlciB3aGVuIHRoZSBldmVudFxuICAgKiBpcyB0cmlnZ2VyZWQuIFRoZSBldmVudCBvYmplY3Qgd2lsbCBiZSBhIHN0YW5kYXJkIEphdmFTY3JpcHRcbiAgICogZXZlbnQgYW5kIHdpbGwgY29udGFpbiBhIGB0YXJnZXROb2RlYCBwcm9wZXJ0eSBjb250YWluaW5nIHRoZVxuICAgKiBub2RlIHRoYXQgd2FzIHRoZSBzb3VyY2Ugb2YgdGhlIGV2ZW50LiBFdmVudHMgYnViYmxlIHVwIHRoZVxuICAgKiBzY2VuZWdyYXBoIHVudGlsIGhhbmRsZWQuIEhhbmRsZXJzIHJldHVybmluZyBhIHRydXRoeSB2YWx1ZVxuICAgKiBzaWduYWwgdGhhdCB0aGUgZXZlbnQgaGFzIGJlZW4gaGFuZGxlZC5cbiAgICovXG4gIG9uOiBmdW5jdGlvbih0eXBlLCBoYW5kbGVyKSB7XG4gICAgdmFyIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1t0eXBlXTtcbiAgICBpZiAoIWhhbmRsZXJzKSB7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbdHlwZV0gPSBbXTtcbiAgICB9XG4gICAgaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBhbiBldmVudCBoYW5kbGVyIG9mIHRoZSBnaXZlbiB0eXBlLiBJZiBubyBoYW5kbGVyIGlzXG4gICAqIHByb3ZpZGVkLCBhbGwgaGFuZGxlcnMgb2YgdGhlIHR5cGUgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgb2ZmOiBmdW5jdGlvbih0eXBlLCBoYW5kbGVyKSB7XG4gICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICB0aGlzLmhhbmRsZXJzW3R5cGVdID0gW107XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbdHlwZV07XG4gICAgICB2YXIgaWR4ID0gaGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyKTtcbiAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICBoYW5kbGVycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGFuIGV2ZW50IGFuZCBiZWdpbnMgYnViYmxpbmcuIFJldHVybnMgdHJ1dGh5IGlmIHRoZVxuICAgKiBldmVudCB3YXMgaGFuZGxlZC5cbiAgICovXG4gIHRyaWdnZXI6IGZ1bmN0aW9uKHR5cGUsIGV2ZW50KSB7XG4gICAgdmFyIGhhbmRsZWQgPSBmYWxzZTtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW3R5cGVdO1xuXG4gICAgaWYgKGhhbmRsZXJzKSB7XG4gICAgICBoYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlZCA9IGhhbmRsZXIoZXZlbnQpIHx8IGhhbmRsZWQ7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIWhhbmRsZWQgJiYgdGhpcy5wYXJlbnQpIHtcbiAgICAgIGhhbmRsZWQgPSB0aGlzLnBhcmVudC50cmlnZ2VyKHR5cGUsIGV2ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFuZGxlZDtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyB0aGlzIG5vZGUgZnJvbSBpdHMgcGFyZW50XG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgdGhpcy5wYXJlbnQucmVtb3ZlKHRoaXMpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSW50ZXJuYWw6IHJlbmRlcnMgdGhlIG5vZGUgZ2l2ZW4gdGhlIGNvbnRleHRcbiAgICovXG4gIHJlbmRlcjogZnVuY3Rpb24oY3R4KSB7XG4gICAgaWYgKCF0aGlzLnZpc2libGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgeCA9IHRoaXMueCB8fCAwO1xuICAgIHZhciB5ID0gdGhpcy55IHx8IDA7XG4gICAgdmFyIHNjYWxlWCA9IHRoaXMuc2NhbGVYID09IG51bGwgPyAxIDogdGhpcy5zY2FsZVg7XG4gICAgdmFyIHNjYWxlWSA9IHRoaXMuc2NhbGVZID09IG51bGwgPyAxIDogdGhpcy5zY2FsZVk7XG4gICAgdmFyIHRyYW5zZm9ybWVkID0gISF4IHx8ICEheSB8fCAhIXRoaXMucm90YXRpb24gfHwgc2NhbGVYICE9PSAxIHx8IHNjYWxlWSAhPT0gMSB8fCB0aGlzLm9wYWNpdHkgIT0gbnVsbDtcblxuICAgIC8vIFRPRE8gSW52ZXN0aWdhdGUgY29zdCBvZiBhbHdheXMgc2F2ZS9yZXN0b3JlXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XG4gICAgICBjdHguc2F2ZSgpO1xuICAgIH1cblxuICAgIGlmICh4IHx8IHkpIHtcbiAgICAgIGN0eC50cmFuc2xhdGUoeCx5KTtcbiAgICB9XG5cbiAgICBpZiAoc2NhbGVYICE9PSAxIHx8IHNjYWxlWSAhPT0gMSkge1xuICAgICAgY3R4LnNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yb3RhdGlvbikge1xuICAgICAgY3R4LnJvdGF0ZSh0aGlzLnJvdGF0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcGFjaXR5ICE9IG51bGwpIHtcbiAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMub3BhY2l0eTtcbiAgICB9XG5cbiAgICB0aGlzLmRyYXcoY3R4KTtcblxuICAgIGlmICh0cmFuc2Zvcm1lZCkge1xuICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEludGVybmFsOiB0ZXN0cyBmb3IgcGljayBoaXQgZ2l2ZW4gY29udGV4dCwgZ2xvYmFsIGFuZCBsb2NhbFxuICAgKiBjb29yZGluYXRlIHN5c3RlbSB0cmFuc2Zvcm1lZCBwaWNrIGNvb3JkaW5hdGVzLlxuICAgKi9cbiAgcGljazogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcbiAgICBpZiAoIXRoaXMudmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQgPSBudWxsO1xuICAgIHZhciBzLCBjLCB0ZW1wO1xuXG4gICAgdmFyIHR4ID0gdGhpcy54IHx8IDA7XG4gICAgdmFyIHR5ID0gdGhpcy55IHx8IDA7XG4gICAgdmFyIHNjYWxlWCA9IHRoaXMuc2NhbGVYID09IG51bGwgPyAxIDogdGhpcy5zY2FsZVg7XG4gICAgdmFyIHNjYWxlWSA9IHRoaXMuc2NhbGVZID09IG51bGwgPyAxIDogdGhpcy5zY2FsZVk7XG4gICAgdmFyIHRyYW5zZm9ybWVkID0gISF0eCB8fCAhIXR5IHx8ICEhdGhpcy5yb3RhdGlvbiB8fCBzY2FsZVggIT09IDEgfHwgc2NhbGVZICE9PSAxIHx8IHRoaXMub3BhY2l0eSAhPSBudWxsO1xuXG4gICAgLy8gVE9ETyBJbnZlc3RpZ2F0ZSBjb3N0IG9mIGFsd2F5cyBzYXZlL3Jlc3RvcmVcbiAgICBpZiAodHJhbnNmb3JtZWQpIHtcbiAgICAgIGN0eC5zYXZlKCk7XG4gICAgfVxuXG4gICAgaWYgKHR4IHx8IHR5KSB7XG4gICAgICBjdHgudHJhbnNsYXRlKHR4LHR5KTtcbiAgICAgIC8vIFJldmVyc2UgdHJhbnNsYXRpb24gb24gcGlja2VkIHBvaW50XG4gICAgICBseCAtPSB0eDtcbiAgICAgIGx5IC09IHR5O1xuICAgIH1cblxuICAgIGlmIChzY2FsZVggIT09IDEgfHwgc2NhbGVZICE9PSAxKSB7XG4gICAgICBjdHguc2NhbGUoc2NhbGVYLCBzY2FsZVkpO1xuICAgICAgLy8gUmV2ZXJzZSBzY2FsZVxuICAgICAgbHggLz0gc2NhbGVYO1xuICAgICAgbHkgLz0gc2NhbGVZO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdGF0aW9uKSB7XG4gICAgICBjdHgucm90YXRlKHRoaXMucm90YXRpb24pO1xuICAgICAgLy8gUmV2ZXJzZSByb3RhdGlvblxuICAgICAgcyA9IE1hdGguc2luKC10aGlzLnJvdGF0aW9uKTtcbiAgICAgIGMgPSBNYXRoLmNvcygtdGhpcy5yb3RhdGlvbik7XG4gICAgICB0ZW1wID0gYypseCAtIHMqbHk7XG4gICAgICBseSA9IHMqbHggKyBjKmx5O1xuICAgICAgbHggPSB0ZW1wO1xuICAgIH1cblxuICAgIHJlc3VsdCA9IHRoaXMuaGl0VGVzdChjdHgsIHgsIHksIGx4LCBseSk7XG5cbiAgICBpZiAodHJhbnNmb3JtZWQpIHtcbiAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvKipcbiAgICogVGVtcGxhdGUgbWV0aG9kIGZvciBkZXJpdmVkIG9iamVjdHMgdG8gYWN0dWFsbHkgcGVyZm9ybSBkcmF3IG9wZXJhdGlvbnMuXG4gICAqIFRoZSBjYWxsaW5nIGByZW5kZXJgIGNhbGwgaGFuZGxlcyBnZW5lcmFsIHRyYW5zZm9ybXMgYW5kIG9wYWNpdHkuXG4gICAqL1xuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICAvLyB0ZW1wbGF0ZSBtZXRob2RcbiAgfSxcblxuICAvKipcbiAgICogVGVtcGxhdGUgbWV0aG9kIGZvciBkZXJpdmVkIG9iamVjdHMgdG8gdGVzdCBpZiB0aGV5IChvciBjaGlsZCkgaXMgaGl0IGJ5XG4gICAqIHRoZSBwcm92aWRlZCBwaWNrIGNvb3JkaW5hdGUuIElmIGhpdCwgcmV0dXJuIG9iamVjdCB0aGF0IHdhcyBoaXQuXG4gICAqL1xuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuICAgIC8vIHRlbXBsYXRlIG1ldGhvZFxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcbnZhciBzdmcgPSByZXF1aXJlKCcuL3N2ZycpO1xuXG5cbnZhciBOT05FID0gW107XG5cbi8qKlxuICogVmVjdG9yIFBhdGggTm9kZVxuICpcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XG4gKlxuICogcGF0aDogYSB2YWxpZCBTVkcgcGF0aCBzdHJpbmcgKGUuZy4gJ00tNSwwQTUsNSwwLDAsMSw1LDBBNSw1LDAsMCwxLC01LDBaJylcbiAqICAgdG8gZHJhd1xuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoLCBsaW5lQ2FwLCBsaW5lSm9pbiwgbWl0ZXJMaW1pdDpcbiAqICAgYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXG4gKiBsaW5lRGFzaDogYW4gYXJyYXkgc3BlY2lmeWluZyBvbi9vZmYgcGl4ZWwgcGF0dGVyblxuICogICAoZS5nLiBbMTAsIDVdID0gMTAgcGl4ZWxzIG9uLCA1IHBpeGVscyBvZmYpIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqIGxpbmVEYXNoT2Zmc2V0OiBhIHBpeGVsIG9mZnNldCB0byBzdGFydCB0aGUgZGFzaGVzIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqXG4gKiBOb3RlOiBpZiBgc3Ryb2tlU3R5bGVgIGlzIHNwZWNpZmllZCwgcGlja2luZyB3aWxsIGJlIGVuYWJsZWQgb24gdGhlIHBhdGggc3Ryb2tlL291dGxpbmUuXG4gKiBJZiBgZmlsbFN0eWxlYCBpcyBzcGVjaWZpZWQsIHBpY2tpbmcgd2lsbCBiZSBlbmFibGVkIG9uIHRoZSBpbnRlcmlvciBmaWxsZWQgYXJlYVxuICogb2YgdGhlIHBhdGguXG4gKi9cbnZhciBQYXRoID0gZnVuY3Rpb24oKSB7XG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblxuUGF0aC5wcm90b3R5cGUgPSBfLmV4dGVuZChQYXRoLnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcblxuICBza2V0Y2g6IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciBwYXRoID0gdGhpcy5wYXRoO1xuICAgIGlmIChwYXRoICYmIHBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIHBhdGhDb21tYW5kcyA9IHRoaXMuX2NvbW1hbmRDYWNoZSB8fCAodGhpcy5fY29tbWFuZENhY2hlID0gc3ZnLnBhcnNlKHBhdGgpKTtcbiAgICAgIHN2Zy5yZW5kZXIoY3R4LCBwYXRoQ29tbWFuZHMpO1xuICAgIH1cbiAgfSxcblxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZTtcbiAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xuICAgICAgY3R4LmxpbmVKb2luID0gdGhpcy5saW5lSm9pbiB8fCAnbWl0ZXInO1xuICAgICAgY3R4Lm1pdGVyTGltaXQgPSB0aGlzLm1pdGVyTGltaXQgfHwgMTA7XG4gICAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCh0aGlzLmxpbmVEYXNoT2Zmc2V0IHx8IDApO1xuICAgIH1cblxuICAgIHRoaXMuc2tldGNoKGN0eCk7XG5cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcbiAgICAgIGN0eC5maWxsKCk7XG4gICAgfVxuICB9LFxuXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgdGhpcy5za2V0Y2goY3R4KTtcblxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSAmJiBjdHguaXNQb2ludEluUGF0aCh4LHkpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUgJiYgY3R4LmlzUG9pbnRJblN0cm9rZSh4LHkpKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbn0pO1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQYXRoLnByb3RvdHlwZSwgJ3BhdGgnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3BhdGg7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodGhpcy5fcGF0aCAhPT0gdmFsdWUpIHtcbiAgICAgIHRoaXMuX3BhdGggPSB2YWx1ZTtcbiAgICAgIHRoaXMuX2NvbW1hbmRDYWNoZSA9IG51bGw7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhdGg7IiwiXG4vLyAtLS0tXG4vLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcblxuLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcblxuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxuXG4vLyBNSVQgbGljZW5zZVxuXG52YXIgckFGID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgckFGO1xuXG4gIGlmICh3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZS5iaW5kKHdpbmRvdyk7XG4gIH1cblxuICB2YXIgbGFzdFRpbWUgPSAwO1xuICB2YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XG4gIGZvcih2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhckFGOyArK3gpIHtcbiAgICByQUYgPSB3aW5kb3dbdmVuZG9yc1t4XSsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gIH1cblxuICBpZiAoIXJBRilcbiAgICByQUYgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xuICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LCB0aW1lVG9DYWxsKTtcbiAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsO1xuICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG5cbiAgcmV0dXJuIHJBRjtcbn0oKSk7XG5cblxuLy8gLS0tLVxuLy8gRGFzaCBzdXBwb3J0IGZvciBjYW52YXMgY29udGV4dFxuXG52YXIgZGFzaFN1cHBvcnQgPSBmdW5jdGlvbihjdHgpIHtcbiAgdmFyIE5PT1AgPSBmdW5jdGlvbigpe307XG5cbiAgaWYgKGN0eC5zZXRMaW5lRGFzaCkge1xuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IGZ1bmN0aW9uKG9mZikgeyB0aGlzLmxpbmVEYXNoT2Zmc2V0ID0gb2ZmOyB9O1xuICB9IGVsc2UgaWYgKGN0eC53ZWJraXRMaW5lRGFzaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY3R4LnNldExpbmVEYXNoID0gZnVuY3Rpb24oZGFzaCkgeyB0aGlzLndlYmtpdExpbmVEYXNoID0gZGFzaDsgfTtcbiAgICBjdHguc2V0TGluZURhc2hPZmZzZXQgPSBmdW5jdGlvbihvZmYpIHsgdGhpcy53ZWJraXRMaW5lRGFzaE9mZnNldCA9IG9mZjsgfTtcbiAgfSBlbHNlIGlmIChjdHgubW96RGFzaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY3R4LnNldExpbmVEYXNoID0gZnVuY3Rpb24oZGFzaCkgeyB0aGlzLm1vekRhc2ggPSBkYXNoOyB9O1xuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IE5PT1A7XG4gIH0gZWxzZSB7XG4gICAgY3R4LnNldExpbmVEYXNoID0gTk9PUDtcbiAgICBjdHguc2V0TGluZURhc2hPZmZzZXQgPSBOT09QO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiByQUYsXG4gIGRhc2hTdXBwb3J0OiBkYXNoU3VwcG9ydFxufTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcblxudmFyIE5PTkUgPSBbXTtcblxuLyoqXG4gKiBSZWN0YW5nbGUgTm9kZVxuICpcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XG4gKlxuICogd2lkdGg6IHdpZHRoIG9mIHRoZSByZWN0YW5nbGVcbiAqIGhlaWdodDogaGVpZ2h0IG9mIHRoZSByZWN0YW5nbGVcbiAqIGZpbGxTdHlsZSwgc3Ryb2tlU3R5bGUsIGxpbmVXaWR0aCwgbGluZUNhcCwgbGluZUpvaW4sIG1pdGVyTGltaXQ6XG4gKiAgIGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxuICogbGluZURhc2g6IGFuIGFycmF5IHNwZWNpZnlpbmcgb24vb2ZmIHBpeGVsIHBhdHRlcm5cbiAqICAgKGUuZy4gWzEwLCA1XSA9IDEwIHBpeGVscyBvbiwgNSBwaXhlbHMgb2ZmKSAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXG4gKiBsaW5lRGFzaE9mZnNldDogYSBwaXhlbCBvZmZzZXQgdG8gc3RhcnQgdGhlIGRhc2hlcyAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXG4gKlxuICogTm90ZTogcGlja2luZyBpcyBhbHdheXMgZW5hYmxlZCBvbiB0aGUgZW50aXJlIHJlY3QgKG5vIHN0cm9rZS1vbmx5IHBpY2tpbmcpIGF0XG4gKiB0aGUgbW9tZW50LlxuICovXG52YXIgUmVjdCA9IGZ1bmN0aW9uKCkge1xuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5cblJlY3QucHJvdG90eXBlID0gXy5leHRlbmQoUmVjdC5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggfHwgMDtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgMDtcblxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZmlsbFN0eWxlO1xuICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZTtcbiAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xuICAgICAgY3R4LmxpbmVKb2luID0gdGhpcy5saW5lSm9pbiB8fCAnbWl0ZXInO1xuICAgICAgY3R4Lm1pdGVyTGltaXQgPSB0aGlzLm1pdGVyTGltaXQgfHwgMTA7XG4gICAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCh0aGlzLmxpbmVEYXNoT2Zmc2V0IHx8IDApO1xuICAgICAgY3R4LnN0cm9rZVJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgfVxuICB9LFxuXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy53aWR0aCB8fCAwO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCB8fCAwO1xuXG4gICAgaWYgKGx4ID49IDAgJiYgbHggPCB3aWR0aCAmJiBseSA+PSAwICYmIGx5IDwgaGVpZ2h0KSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVjdDsiLCIvKipcbiAgU1ZHIHBhdGggdG8gY2FudmFzIHBhdGggc2tldGNoaW5nLCB0YWtlbiBhbmQgYWRhcHRlZCBmcm9tOlxuICAgLSBWZWdhOiBnaXRodWIuY29tL3RyaWZhY3RhL3ZlZ2FcbiAgICAgTGljZW5zZTogaHR0cHM6Ly9naXRodWIuY29tL3RyaWZhY3RhL3ZlZ2EvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICAgLSBGYWJyaWMuanM6IGdpdGh1Yi5jb20va2FuZ2F4L2ZhYnJpYy5qcy9ibG9iL21hc3Rlci9zcmMvc2hhcGVzL3BhdGguY2xhc3MuanNcbiAgICAgTGljZW5zZTogaHR0cHM6Ly9naXRodWIuY29tL2thbmdheC9mYWJyaWMuanMvYmxvYi9tYXN0ZXIvTElDRU5TRVxuKi9cblxuXG4vLyBQYXRoIHBhcnNpbmcgYW5kIHJlbmRlcmluZyBjb2RlIHRha2VuIGZyb20gZmFicmljLmpzIC0tIFRoYW5rcyFcbnZhciBjb21tYW5kTGVuZ3RocyA9IHsgbToyLCBsOjIsIGg6MSwgdjoxLCBjOjYsIHM6NCwgcTo0LCB0OjIsIGE6NyB9LFxuICAgIHJlcGVhdGVkQ29tbWFuZHMgPSB7IG06ICdsJywgTTogJ0wnIH0sXG4gICAgdG9rZW5pemVyID0gL1ttemxodmNzcXRhXVtebXpsaHZjc3F0YV0qL2dpLFxuICAgIGRpZ2l0cyA9IC8oWy0rXT8oKFxcZCtcXC5cXGQrKXwoKFxcZCspfChcXC5cXGQrKSkpKD86ZVstK10/XFxkKyk/KS9pZztcblxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gWyBdLFxuICAgICAgY29vcmRzID0gWyBdLFxuICAgICAgY3VycmVudFBhdGgsXG4gICAgICBwYXJzZWQsXG4gICAgICBtYXRjaCxcbiAgICAgIGNvb3Jkc1N0cjtcblxuICAvLyBGaXJzdCwgYnJlYWsgcGF0aCBpbnRvIGNvbW1hbmQgc2VxdWVuY2VcbiAgcGF0aCA9IHBhdGgubWF0Y2godG9rZW5pemVyKTtcblxuICAvLyBOZXh0LCBwYXJzZSBlYWNoIGNvbW1hbmQgaW4gdHVyblxuICBmb3IgKHZhciBpID0gMCwgY29vcmRzUGFyc2VkLCBsZW4gPSBwYXRoLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgY3VycmVudFBhdGggPSBwYXRoW2ldO1xuXG4gICAgY29vcmRzU3RyID0gY3VycmVudFBhdGguc2xpY2UoMSkudHJpbSgpO1xuICAgIGNvb3Jkcy5sZW5ndGggPSAwO1xuXG4gICAgd2hpbGUgKChtYXRjaCA9IGRpZ2l0cy5leGVjKGNvb3Jkc1N0cikpKSB7XG4gICAgICBjb29yZHMucHVzaChtYXRjaFswXSk7XG4gICAgfVxuXG4gICAgY29vcmRzUGFyc2VkID0gWyBjdXJyZW50UGF0aC5jaGFyQXQoMCkgXTtcblxuICAgIGZvciAodmFyIGogPSAwLCBqbGVuID0gY29vcmRzLmxlbmd0aDsgaiA8IGpsZW47IGorKykge1xuICAgICAgcGFyc2VkID0gcGFyc2VGbG9hdChjb29yZHNbal0pO1xuICAgICAgaWYgKCFpc05hTihwYXJzZWQpKSB7XG4gICAgICAgIGNvb3Jkc1BhcnNlZC5wdXNoKHBhcnNlZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNvbW1hbmQgPSBjb29yZHNQYXJzZWRbMF0sXG4gICAgICAgIGNvbW1hbmRMZW5ndGggPSBjb21tYW5kTGVuZ3Roc1tjb21tYW5kLnRvTG93ZXJDYXNlKCldLFxuICAgICAgICByZXBlYXRlZENvbW1hbmQgPSByZXBlYXRlZENvbW1hbmRzW2NvbW1hbmRdIHx8IGNvbW1hbmQ7XG5cbiAgICBpZiAoY29vcmRzUGFyc2VkLmxlbmd0aCAtIDEgPiBjb21tYW5kTGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBrID0gMSwga2xlbiA9IGNvb3Jkc1BhcnNlZC5sZW5ndGg7IGsgPCBrbGVuOyBrICs9IGNvbW1hbmRMZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goWyBjb21tYW5kIF0uY29uY2F0KGNvb3Jkc1BhcnNlZC5zbGljZShrLCBrICsgY29tbWFuZExlbmd0aCkpKTtcbiAgICAgICAgY29tbWFuZCA9IHJlcGVhdGVkQ29tbWFuZDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChjb29yZHNQYXJzZWQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGRyYXdBcmMoZywgeCwgeSwgY29vcmRzLCBib3VuZHMsIGwsIHQpIHtcbiAgdmFyIHJ4ID0gY29vcmRzWzBdO1xuICB2YXIgcnkgPSBjb29yZHNbMV07XG4gIHZhciByb3QgPSBjb29yZHNbMl07XG4gIHZhciBsYXJnZSA9IGNvb3Jkc1szXTtcbiAgdmFyIHN3ZWVwID0gY29vcmRzWzRdO1xuICB2YXIgZXggPSBjb29yZHNbNV07XG4gIHZhciBleSA9IGNvb3Jkc1s2XTtcbiAgdmFyIHNlZ3MgPSBhcmNUb1NlZ21lbnRzKGV4LCBleSwgcngsIHJ5LCBsYXJnZSwgc3dlZXAsIHJvdCwgeCwgeSk7XG4gIGZvciAodmFyIGk9MDsgaTxzZWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJleiA9IHNlZ21lbnRUb0Jlemllci5hcHBseShudWxsLCBzZWdzW2ldKTtcbiAgICBnLmJlemllckN1cnZlVG8uYXBwbHkoZywgYmV6KTtcbiAgICAvLyBib3VuZHMuYWRkKGJlelswXS1sLCBiZXpbMV0tdCk7XG4gICAgLy8gYm91bmRzLmFkZChiZXpbMl0tbCwgYmV6WzNdLXQpO1xuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzRdLWwsIGJlels1XS10KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBib3VuZEFyYyh4LCB5LCBjb29yZHMsIGJvdW5kcykge1xuICB2YXIgcnggPSBjb29yZHNbMF07XG4gIHZhciByeSA9IGNvb3Jkc1sxXTtcbiAgdmFyIHJvdCA9IGNvb3Jkc1syXTtcbiAgdmFyIGxhcmdlID0gY29vcmRzWzNdO1xuICB2YXIgc3dlZXAgPSBjb29yZHNbNF07XG4gIHZhciBleCA9IGNvb3Jkc1s1XTtcbiAgdmFyIGV5ID0gY29vcmRzWzZdO1xuICB2YXIgc2VncyA9IGFyY1RvU2VnbWVudHMoZXgsIGV5LCByeCwgcnksIGxhcmdlLCBzd2VlcCwgcm90LCB4LCB5KTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYmV6ID0gc2VnbWVudFRvQmV6aWVyLmFwcGx5KG51bGwsIHNlZ3NbaV0pO1xuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzBdLCBiZXpbMV0pO1xuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzJdLCBiZXpbM10pO1xuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzRdLCBiZXpbNV0pO1xuICB9XG59XG5cbnZhciBhcmNUb1NlZ21lbnRzQ2FjaGUgPSB7IH0sXG4gICAgc2VnbWVudFRvQmV6aWVyQ2FjaGUgPSB7IH0sXG4gICAgam9pbiA9IEFycmF5LnByb3RvdHlwZS5qb2luLFxuICAgIGFyZ3NTdHI7XG5cbi8vIENvcGllZCBmcm9tIElua3NjYXBlIHN2Z3RvcGRmLCB0aGFua3MhXG5mdW5jdGlvbiBhcmNUb1NlZ21lbnRzKHgsIHksIHJ4LCByeSwgbGFyZ2UsIHN3ZWVwLCByb3RhdGVYLCBveCwgb3kpIHtcbiAgYXJnc1N0ciA9IGpvaW4uY2FsbChhcmd1bWVudHMpO1xuICBpZiAoYXJjVG9TZWdtZW50c0NhY2hlW2FyZ3NTdHJdKSB7XG4gICAgcmV0dXJuIGFyY1RvU2VnbWVudHNDYWNoZVthcmdzU3RyXTtcbiAgfVxuXG4gIHZhciB0aCA9IHJvdGF0ZVggKiAoTWF0aC5QSS8xODApO1xuICB2YXIgc2luX3RoID0gTWF0aC5zaW4odGgpO1xuICB2YXIgY29zX3RoID0gTWF0aC5jb3ModGgpO1xuICByeCA9IE1hdGguYWJzKHJ4KTtcbiAgcnkgPSBNYXRoLmFicyhyeSk7XG4gIHZhciBweCA9IGNvc190aCAqIChveCAtIHgpICogMC41ICsgc2luX3RoICogKG95IC0geSkgKiAwLjU7XG4gIHZhciBweSA9IGNvc190aCAqIChveSAtIHkpICogMC41IC0gc2luX3RoICogKG94IC0geCkgKiAwLjU7XG4gIHZhciBwbCA9IChweCpweCkgLyAocngqcngpICsgKHB5KnB5KSAvIChyeSpyeSk7XG4gIGlmIChwbCA+IDEpIHtcbiAgICBwbCA9IE1hdGguc3FydChwbCk7XG4gICAgcnggKj0gcGw7XG4gICAgcnkgKj0gcGw7XG4gIH1cblxuICB2YXIgYTAwID0gY29zX3RoIC8gcng7XG4gIHZhciBhMDEgPSBzaW5fdGggLyByeDtcbiAgdmFyIGExMCA9ICgtc2luX3RoKSAvIHJ5O1xuICB2YXIgYTExID0gKGNvc190aCkgLyByeTtcbiAgdmFyIHgwID0gYTAwICogb3ggKyBhMDEgKiBveTtcbiAgdmFyIHkwID0gYTEwICogb3ggKyBhMTEgKiBveTtcbiAgdmFyIHgxID0gYTAwICogeCArIGEwMSAqIHk7XG4gIHZhciB5MSA9IGExMCAqIHggKyBhMTEgKiB5O1xuXG4gIHZhciBkID0gKHgxLXgwKSAqICh4MS14MCkgKyAoeTEteTApICogKHkxLXkwKTtcbiAgdmFyIHNmYWN0b3Jfc3EgPSAxIC8gZCAtIDAuMjU7XG4gIGlmIChzZmFjdG9yX3NxIDwgMCkgc2ZhY3Rvcl9zcSA9IDA7XG4gIHZhciBzZmFjdG9yID0gTWF0aC5zcXJ0KHNmYWN0b3Jfc3EpO1xuICBpZiAoc3dlZXAgPT0gbGFyZ2UpIHNmYWN0b3IgPSAtc2ZhY3RvcjtcbiAgdmFyIHhjID0gMC41ICogKHgwICsgeDEpIC0gc2ZhY3RvciAqICh5MS15MCk7XG4gIHZhciB5YyA9IDAuNSAqICh5MCArIHkxKSArIHNmYWN0b3IgKiAoeDEteDApO1xuXG4gIHZhciB0aDAgPSBNYXRoLmF0YW4yKHkwLXljLCB4MC14Yyk7XG4gIHZhciB0aDEgPSBNYXRoLmF0YW4yKHkxLXljLCB4MS14Yyk7XG5cbiAgdmFyIHRoX2FyYyA9IHRoMS10aDA7XG4gIGlmICh0aF9hcmMgPCAwICYmIHN3ZWVwID09IDEpe1xuICAgIHRoX2FyYyArPSAyKk1hdGguUEk7XG4gIH0gZWxzZSBpZiAodGhfYXJjID4gMCAmJiBzd2VlcCA9PSAwKSB7XG4gICAgdGhfYXJjIC09IDIgKiBNYXRoLlBJO1xuICB9XG5cbiAgdmFyIHNlZ21lbnRzID0gTWF0aC5jZWlsKE1hdGguYWJzKHRoX2FyYyAvIChNYXRoLlBJICogMC41ICsgMC4wMDEpKSk7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ21lbnRzOyBpKyspIHtcbiAgICB2YXIgdGgyID0gdGgwICsgaSAqIHRoX2FyYyAvIHNlZ21lbnRzO1xuICAgIHZhciB0aDMgPSB0aDAgKyAoaSsxKSAqIHRoX2FyYyAvIHNlZ21lbnRzO1xuICAgIHJlc3VsdFtpXSA9IFt4YywgeWMsIHRoMiwgdGgzLCByeCwgcnksIHNpbl90aCwgY29zX3RoXTtcbiAgfVxuXG4gIHJldHVybiAoYXJjVG9TZWdtZW50c0NhY2hlW2FyZ3NTdHJdID0gcmVzdWx0KTtcbn1cblxuZnVuY3Rpb24gc2VnbWVudFRvQmV6aWVyKGN4LCBjeSwgdGgwLCB0aDEsIHJ4LCByeSwgc2luX3RoLCBjb3NfdGgpIHtcbiAgYXJnc1N0ciA9IGpvaW4uY2FsbChhcmd1bWVudHMpO1xuICBpZiAoc2VnbWVudFRvQmV6aWVyQ2FjaGVbYXJnc1N0cl0pIHtcbiAgICByZXR1cm4gc2VnbWVudFRvQmV6aWVyQ2FjaGVbYXJnc1N0cl07XG4gIH1cblxuICB2YXIgYTAwID0gY29zX3RoICogcng7XG4gIHZhciBhMDEgPSAtc2luX3RoICogcnk7XG4gIHZhciBhMTAgPSBzaW5fdGggKiByeDtcbiAgdmFyIGExMSA9IGNvc190aCAqIHJ5O1xuXG4gIHZhciBjb3NfdGgwID0gTWF0aC5jb3ModGgwKTtcbiAgdmFyIHNpbl90aDAgPSBNYXRoLnNpbih0aDApO1xuICB2YXIgY29zX3RoMSA9IE1hdGguY29zKHRoMSk7XG4gIHZhciBzaW5fdGgxID0gTWF0aC5zaW4odGgxKTtcblxuICB2YXIgdGhfaGFsZiA9IDAuNSAqICh0aDEgLSB0aDApO1xuICB2YXIgc2luX3RoX2gyID0gTWF0aC5zaW4odGhfaGFsZiAqIDAuNSk7XG4gIHZhciB0ID0gKDgvMykgKiBzaW5fdGhfaDIgKiBzaW5fdGhfaDIgLyBNYXRoLnNpbih0aF9oYWxmKTtcbiAgdmFyIHgxID0gY3ggKyBjb3NfdGgwIC0gdCAqIHNpbl90aDA7XG4gIHZhciB5MSA9IGN5ICsgc2luX3RoMCArIHQgKiBjb3NfdGgwO1xuICB2YXIgeDMgPSBjeCArIGNvc190aDE7XG4gIHZhciB5MyA9IGN5ICsgc2luX3RoMTtcbiAgdmFyIHgyID0geDMgKyB0ICogc2luX3RoMTtcbiAgdmFyIHkyID0geTMgLSB0ICogY29zX3RoMTtcblxuICByZXR1cm4gKHNlZ21lbnRUb0JlemllckNhY2hlW2FyZ3NTdHJdID0gW1xuICAgIGEwMCAqIHgxICsgYTAxICogeTEsICBhMTAgKiB4MSArIGExMSAqIHkxLFxuICAgIGEwMCAqIHgyICsgYTAxICogeTIsICBhMTAgKiB4MiArIGExMSAqIHkyLFxuICAgIGEwMCAqIHgzICsgYTAxICogeTMsICBhMTAgKiB4MyArIGExMSAqIHkzXG4gIF0pO1xufVxuXG5mdW5jdGlvbiByZW5kZXIoZywgcGF0aCwgbCwgdCkge1xuICB2YXIgY3VycmVudCwgLy8gY3VycmVudCBpbnN0cnVjdGlvblxuICAgICAgcHJldmlvdXMgPSBudWxsLFxuICAgICAgeCA9IDAsIC8vIGN1cnJlbnQgeFxuICAgICAgeSA9IDAsIC8vIGN1cnJlbnQgeVxuICAgICAgY29udHJvbFggPSAwLCAvLyBjdXJyZW50IGNvbnRyb2wgcG9pbnQgeFxuICAgICAgY29udHJvbFkgPSAwLCAvLyBjdXJyZW50IGNvbnRyb2wgcG9pbnQgeVxuICAgICAgdGVtcFgsXG4gICAgICB0ZW1wWSxcbiAgICAgIHRlbXBDb250cm9sWCxcbiAgICAgIHRlbXBDb250cm9sWSxcbiAgICAgIGJvdW5kcztcbiAgaWYgKGwgPT0gdW5kZWZpbmVkKSBsID0gMDtcbiAgaWYgKHQgPT0gdW5kZWZpbmVkKSB0ID0gMDtcblxuICBnLmJlZ2luUGF0aCgpO1xuXG4gIGZvciAodmFyIGk9MCwgbGVuPXBhdGgubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgY3VycmVudCA9IHBhdGhbaV07XG5cbiAgICBzd2l0Y2ggKGN1cnJlbnRbMF0pIHsgLy8gZmlyc3QgbGV0dGVyXG5cbiAgICAgIGNhc2UgJ2wnOiAvLyBsaW5ldG8sIHJlbGF0aXZlXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcbiAgICAgICAgeSArPSBjdXJyZW50WzJdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnTCc6IC8vIGxpbmV0bywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XG4gICAgICAgIHkgPSBjdXJyZW50WzJdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnaCc6IC8vIGhvcml6b250YWwgbGluZXRvLCByZWxhdGl2ZVxuICAgICAgICB4ICs9IGN1cnJlbnRbMV07XG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdIJzogLy8gaG9yaXpvbnRhbCBsaW5ldG8sIGFic29sdXRlXG4gICAgICAgIHggPSBjdXJyZW50WzFdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndic6IC8vIHZlcnRpY2FsIGxpbmV0bywgcmVsYXRpdmVcbiAgICAgICAgeSArPSBjdXJyZW50WzFdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnVic6IC8vIHZlcmljYWwgbGluZXRvLCBhYnNvbHV0ZVxuICAgICAgICB5ID0gY3VycmVudFsxXTtcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ20nOiAvLyBtb3ZlVG8sIHJlbGF0aXZlXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcbiAgICAgICAgeSArPSBjdXJyZW50WzJdO1xuICAgICAgICBnLm1vdmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnTSc6IC8vIG1vdmVUbywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XG4gICAgICAgIHkgPSBjdXJyZW50WzJdO1xuICAgICAgICBnLm1vdmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnYyc6IC8vIGJlemllckN1cnZlVG8sIHJlbGF0aXZlXG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbNV07XG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbNl07XG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbM107XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbNF07XG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcbiAgICAgICAgICB4ICsgY3VycmVudFsxXSArIGwsIC8vIHgxXG4gICAgICAgICAgeSArIGN1cnJlbnRbMl0gKyB0LCAvLyB5MVxuICAgICAgICAgIGNvbnRyb2xYICsgbCwgLy8geDJcbiAgICAgICAgICBjb250cm9sWSArIHQsIC8vIHkyXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHggKyBjdXJyZW50WzFdLCB5ICsgY3VycmVudFsyXSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ0MnOiAvLyBiZXppZXJDdXJ2ZVRvLCBhYnNvbHV0ZVxuICAgICAgICB4ID0gY3VycmVudFs1XTtcbiAgICAgICAgeSA9IGN1cnJlbnRbNl07XG4gICAgICAgIGNvbnRyb2xYID0gY3VycmVudFszXTtcbiAgICAgICAgY29udHJvbFkgPSBjdXJyZW50WzRdO1xuICAgICAgICBnLmJlemllckN1cnZlVG8oXG4gICAgICAgICAgY3VycmVudFsxXSArIGwsXG4gICAgICAgICAgY3VycmVudFsyXSArIHQsXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB4ICsgbCxcbiAgICAgICAgICB5ICsgdFxuICAgICAgICApO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGN1cnJlbnRbMV0sIGN1cnJlbnRbMl0pO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzJzogLy8gc2hvcnRoYW5kIGN1YmljIGJlemllckN1cnZlVG8sIHJlbGF0aXZlXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0byBhYnNvbHV0ZSB4LHlcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFs0XTtcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHNcbiAgICAgICAgY29udHJvbFggPSAyICogeCAtIGNvbnRyb2xYO1xuICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gY29udHJvbFk7XG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIHggKyBjdXJyZW50WzFdICsgbCxcbiAgICAgICAgICB5ICsgY3VycmVudFsyXSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCArIGN1cnJlbnRbMV0sIHkgKyBjdXJyZW50WzJdKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuXG4gICAgICAgIC8vIHNldCBjb250cm9sIHBvaW50IHRvIDJuZCBvbmUgb2YgdGhpcyBjb21tYW5kXG4gICAgICAgIC8vIFwiLi4uIHRoZSBmaXJzdCBjb250cm9sIHBvaW50IGlzIGFzc3VtZWQgdG8gYmUgdGhlIHJlZmxlY3Rpb24gb2YgdGhlIHNlY29uZCBjb250cm9sIHBvaW50IG9uIHRoZSBwcmV2aW91cyBjb21tYW5kIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50LlwiXG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG5cbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdTJzogLy8gc2hvcnRoYW5kIGN1YmljIGJlemllckN1cnZlVG8sIGFic29sdXRlXG4gICAgICAgIHRlbXBYID0gY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzRdO1xuICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50c1xuICAgICAgICBjb250cm9sWCA9IDIqeCAtIGNvbnRyb2xYO1xuICAgICAgICBjb250cm9sWSA9IDIqeSAtIGNvbnRyb2xZO1xuICAgICAgICBnLmJlemllckN1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICBjdXJyZW50WzFdICsgbCxcbiAgICAgICAgICBjdXJyZW50WzJdICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGN1cnJlbnRbMV0sIGN1cnJlbnRbMl0pO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgLy8gc2V0IGNvbnRyb2wgcG9pbnQgdG8gMm5kIG9uZSBvZiB0aGlzIGNvbW1hbmRcbiAgICAgICAgLy8gXCIuLi4gdGhlIGZpcnN0IGNvbnRyb2wgcG9pbnQgaXMgYXNzdW1lZCB0byBiZSB0aGUgcmVmbGVjdGlvbiBvZiB0aGUgc2Vjb25kIGNvbnRyb2wgcG9pbnQgb24gdGhlIHByZXZpb3VzIGNvbW1hbmQgcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgcG9pbnQuXCJcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzFdO1xuICAgICAgICBjb250cm9sWSA9IGN1cnJlbnRbMl07XG5cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3EnOiAvLyBxdWFkcmF0aWNDdXJ2ZVRvLCByZWxhdGl2ZVxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbM107XG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbNF07XG5cbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFsxXTtcbiAgICAgICAgY29udHJvbFkgPSB5ICsgY3VycmVudFsyXTtcblxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ1EnOiAvLyBxdWFkcmF0aWNDdXJ2ZVRvLCBhYnNvbHV0ZVxuICAgICAgICB0ZW1wWCA9IGN1cnJlbnRbM107XG4gICAgICAgIHRlbXBZID0gY3VycmVudFs0XTtcblxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXG4gICAgICAgICAgY3VycmVudFsxXSArIGwsXG4gICAgICAgICAgY3VycmVudFsyXSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzFdO1xuICAgICAgICBjb250cm9sWSA9IGN1cnJlbnRbMl07XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndCc6IC8vIHNob3J0aGFuZCBxdWFkcmF0aWNDdXJ2ZVRvLCByZWxhdGl2ZVxuXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0byBhYnNvbHV0ZSB4LHlcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFsxXTtcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFsyXTtcblxuICAgICAgICBpZiAocHJldmlvdXNbMF0ubWF0Y2goL1tRcVR0XS8pID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gcHJldmlvdXMgY29tbWFuZCBvciBpZiB0aGUgcHJldmlvdXMgY29tbWFuZCB3YXMgbm90IGEgUSwgcSwgVCBvciB0LFxuICAgICAgICAgIC8vIGFzc3VtZSB0aGUgY29udHJvbCBwb2ludCBpcyBjb2luY2lkZW50IHdpdGggdGhlIGN1cnJlbnQgcG9pbnRcbiAgICAgICAgICBjb250cm9sWCA9IHg7XG4gICAgICAgICAgY29udHJvbFkgPSB5O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByZXZpb3VzWzBdID09PSAndCcpIHtcbiAgICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50cyBmb3IgdFxuICAgICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSB0ZW1wQ29udHJvbFg7XG4gICAgICAgICAgY29udHJvbFkgPSAyICogeSAtIHRlbXBDb250cm9sWTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcmV2aW91c1swXSA9PT0gJ3EnKSB7XG4gICAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHMgZm9yIHFcbiAgICAgICAgICBjb250cm9sWCA9IDIgKiB4IC0gY29udHJvbFg7XG4gICAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVtcENvbnRyb2xYID0gY29udHJvbFg7XG4gICAgICAgIHRlbXBDb250cm9sWSA9IGNvbnRyb2xZO1xuXG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnVCc6XG4gICAgICAgIHRlbXBYID0gY3VycmVudFsxXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzJdO1xuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXG4gICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcbiAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBkcmF3QXJjKGcsIHggKyBsLCB5ICsgdCwgW1xuICAgICAgICAgIGN1cnJlbnRbMV0sXG4gICAgICAgICAgY3VycmVudFsyXSxcbiAgICAgICAgICBjdXJyZW50WzNdLFxuICAgICAgICAgIGN1cnJlbnRbNF0sXG4gICAgICAgICAgY3VycmVudFs1XSxcbiAgICAgICAgICBjdXJyZW50WzZdICsgeCArIGwsXG4gICAgICAgICAgY3VycmVudFs3XSArIHkgKyB0XG4gICAgICAgIF0sIGJvdW5kcywgbCwgdCk7XG4gICAgICAgIHggKz0gY3VycmVudFs2XTtcbiAgICAgICAgeSArPSBjdXJyZW50WzddO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIGRyYXdBcmMoZywgeCArIGwsIHkgKyB0LCBbXG4gICAgICAgICAgY3VycmVudFsxXSxcbiAgICAgICAgICBjdXJyZW50WzJdLFxuICAgICAgICAgIGN1cnJlbnRbM10sXG4gICAgICAgICAgY3VycmVudFs0XSxcbiAgICAgICAgICBjdXJyZW50WzVdLFxuICAgICAgICAgIGN1cnJlbnRbNl0gKyBsLFxuICAgICAgICAgIGN1cnJlbnRbN10gKyB0XG4gICAgICAgIF0sIGJvdW5kcywgbCwgdCk7XG4gICAgICAgIHggPSBjdXJyZW50WzZdO1xuICAgICAgICB5ID0gY3VycmVudFs3XTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3onOlxuICAgICAgY2FzZSAnWic6XG4gICAgICAgIGcuY2xvc2VQYXRoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBwcmV2aW91cyA9IGN1cnJlbnQ7XG4gIH1cbiAgcmV0dXJuOyAvLyBib3VuZHMudHJhbnNsYXRlKGwsIHQpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGFyc2U6ICBwYXJzZSxcbiAgcmVuZGVyOiByZW5kZXJcbn07XG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcblxuXG4vKipcbiAqIFRleHQgTm9kZVxuICpcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XG4gKlxuICogZm9udDogQ2FudmFzLUFQSSBmb3JtYXR0ZWQgZm9udCBzdHJpbmcsIGZvciBleGFtcGxlICdib2xkIDEycHggc2VyaWYnXG4gKiB0ZXh0QWxpZ24sIHRleHRCYXNlbGluZTogYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGgsIGxpbmVDYXAsIGxpbmVKb2luOiBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcbiAqL1xudmFyIFRleHQgPSBmdW5jdGlvbigpIHtcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuXG5UZXh0LnByb3RvdHlwZSA9IF8uZXh0ZW5kKFRleHQucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICBjdHguZm9udCA9IHRoaXMuZm9udCB8fCAnMTBweCBzYW5zLXNlcmlmJztcbiAgICBjdHgudGV4dEFsaWduID0gdGhpcy50ZXh0QWxpZ24gfHwgJ3N0YXJ0JztcbiAgICBjdHgudGV4dEJhc2VsaW5lID0gdGhpcy50ZXh0QmFzZWxpbmUgfHwgJ2FscGhhYmV0aWMnO1xuXG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlKSB7XG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsU3R5bGU7XG4gICAgICBjdHguZmlsbFRleHQodGhpcy50ZXh0LCAwLCAwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUpIHtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGU7XG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcbiAgICAgIGN0eC5saW5lQ2FwID0gdGhpcy5saW5lQ2FwIHx8ICdidXR0JztcbiAgICAgIGN0eC5saW5lSm9pbiA9IHRoaXMubGluZUpvaW4gfHwgJ21pdGVyJztcbiAgICAgIGN0eC5zdHJva2VUZXh0KHRoaXMudGV4dCwgMCwgMCk7XG4gICAgfVxuICB9LFxuXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgLy8gWFhYIFNpemUgY2FsY3VsYXRpb25zIC0gZm9udCwgZm9udC1zaXplLCBoZWlnaHRcbiAgICB2YXIgd2lkdGggPSBjdHgubWVhc3VyZVRleHQodGhpcy50ZXh0KTtcbiAgICB2YXIgaGVpZ2h0ID0gMTA7XG5cbiAgICBpZiAobHggPj0gMCAmJiBseCA8IHdpZHRoICYmIGx5ID49IDAgJiYgbHkgPCBoZWlnaHQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0OyIsIlxudmFyIFV0aWwgPSB7XG5cbiAgZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XG4gICAgdmFyIGtleSwgaSwgc291cmNlO1xuICAgIGZvciAoaT0xOyBpPGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yIChrZXkgaW4gc291cmNlKSB7XG4gICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXN0O1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7Il19
(4)
});
