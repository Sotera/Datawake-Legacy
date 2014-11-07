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
	ctx.arc(this.x, this.y, radius, 0, 2 * Math.PI, false);

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
	var dist = Math.sqrt( (this.x - lx)*(this.x - lx) + (this.y - ly)*(this.y - ly))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL2NpcmNsZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL2dyb3VwLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvaW1hZ2UuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9tYWluLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvbm9kZS5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL3BhdGguanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9wb2x5ZmlsbHMuanMiLCIvVXNlcnMvY2hyaXNkaWNrc29uL0RvY3VtZW50cy93b3Jrc3BhY2UvcGF0aGpzL3NyYy9yZWN0LmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvc3ZnLmpzIiwiL1VzZXJzL2NocmlzZGlja3Nvbi9Eb2N1bWVudHMvd29ya3NwYWNlL3BhdGhqcy9zcmMvdGV4dC5qcyIsIi9Vc2Vycy9jaHJpc2RpY2tzb24vRG9jdW1lbnRzL3dvcmtzcGFjZS9wYXRoanMvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xuXG52YXIgTk9ORSA9IFtdO1xuXG4vKipcbiAqIENpcmNsIE5vZGVcbiAqXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxuICpcbiAqIHJhZGl1cyA6IHRoZSByYWRpdXMgb2YgdGhlIGNpcmNsZVxuICogKHgseSkgOiBjb3JyZXNwb25kIHRvIHRoZSBjZW50ZXIgb2YgdGhlIGNpcmNsZVxuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoOlxuICogICBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcbiAqIGxpbmVEYXNoOiBhbiBhcnJheSBzcGVjaWZ5aW5nIG9uL29mZiBwaXhlbCBwYXR0ZXJuXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICogbGluZURhc2hPZmZzZXQ6IGEgcGl4ZWwgb2Zmc2V0IHRvIHN0YXJ0IHRoZSBkYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICpcbiAqIE5vdGU6IHBpY2tpbmcgaXMgYWx3YXlzIGVuYWJsZWQgb24gdGhlIGVudGlyZSBjaXJjbGUgKG5vIHN0cm9rZS1vbmx5IHBpY2tpbmcpIGF0XG4gKiB0aGUgbW9tZW50LlxuICovXG52YXIgQ2lyY2xlID0gZnVuY3Rpb24oKSB7XG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblxuQ2lyY2xlLnByb3RvdHlwZSA9IF8uZXh0ZW5kKENpcmNsZS5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciByYWRpdXMgPSB0aGlzLnJhZGl1cyB8fCAwO1xuXHRjdHguYmVnaW5QYXRoKCk7XG5cdGN0eC5hcmModGhpcy54LCB0aGlzLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcblxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xuXHQgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcblx0ICBjdHguZmlsbCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZTtcbiAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xuICAgICAgY3R4LmxpbmVKb2luID0gdGhpcy5saW5lSm9pbiB8fCAnbWl0ZXInO1xuICAgICAgY3R4Lm1pdGVyTGltaXQgPSB0aGlzLm1pdGVyTGltaXQgfHwgMTA7XG4gICAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCh0aGlzLmxpbmVEYXNoT2Zmc2V0IHx8IDApO1xuICAgICAgY3R4LnN0cm9rZSgpO1xuICAgIH1cblx0Y3R4LmNsb3NlUGF0aCgpO1xuICB9LFxuXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG5cdHZhciBkaXN0ID0gTWF0aC5zcXJ0KCAodGhpcy54IC0gbHgpKih0aGlzLnggLSBseCkgKyAodGhpcy55IC0gbHkpKih0aGlzLnkgLSBseSkpXG4gICAgaWYgKGRpc3QgPCB0aGlzLnJhZGl1cykge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENpcmNsZTsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcblxuXG4vKipcbiAqIEdyb3VwIChjb250YWluZXIpIG5vZGUgaW4gdGhlIHNjZW5lZ3JhcGguIEhhcyBubyB2aXN1YWwgcmVwcmVzZW50YXRpb24uXG4gKlxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcbiAqXG4gKiBjbGlwOiB7eCwgeSwgd2lkdGgsIGhlaWdodH0gU3BlY2lmaWVzIGFuIG9wdGlvbmFsIHJlY3Rhbmd1bGFyIGNsaXBwaW5nIHJlY3RhbmdsZVxuICogICB0aGF0IGFwcGxpZXMgdG8gYWxsIGNoaWxkIG5vZGVzLlxuICpcbiAqIE5vdGU6IGFwcGx5aW5nIG9wYWNpdHkgdG8gR3JvdXBzIGlzIHN1cHBvcnRlZCBidXQgbm90IGN1bW11bGF0aXZlLiBTcGVjaWZpY2FsbHksXG4gKiBpZiBhIGNoaWxkIG5vZGUgc2V0cyBvcGFjaXR5IGl0IHdpbGwgb3ZlcnJpZGUgdGhlIGdyb3VwLWxldmVsIG9wYWNpdHksIG5vdFxuICogYWNjdW11bGF0ZSBpdC4gQXMgc3VjaCB0aGUgZ3JvdXAgb3BhY2l0eSBzaW1wbHkgc3VwcGxpZXMgdGhlIGRlZmF1bHQgb3BhY2l0eVxuICogdG8gY2hpbGQgbm9kZXMuXG4gKi9cbnZhciBHcm91cCA9IGZ1bmN0aW9uKCkge1xuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xufTtcblxuXG5Hcm91cC5wcm90b3R5cGUgPSBfLmV4dGVuZChHcm91cC5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjaGlsZCBub2RlIHRvIHRoaXMgZ3JvdXAsIG9wdGlvbmFsbHkgaW5jbHVkaW5nIHRoZSBgaW5kZXhgXG4gICAqIGF0IHdoaWNoIHRvIGluc2VydC4gSWYgYGluZGV4YCBpcyBvbWl0dGVkLCB0aGUgbm9kZSBpcyBhZGRlZCBhdCB0aGVcbiAgICogZW5kICh2aXN1YWxseSBvbiB0b3ApIG9mIHRoZSBleGlzdCBsaXN0IG9mIGNoaWxkcmVuLlxuICAgKi9cbiAgYWRkQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkLCBpbmRleCkge1xuICAgIGNoaWxkLnBhcmVudCA9IHRoaXM7XG4gICAgaWYgKGluZGV4ICE9IG51bGwgJiYgaW5kZXggPD0gdGhpcy5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4uc3BsaWNlKGluZGV4LCAwLCBjaGlsZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgc3BlY2lmaWVkIGNoaWxkIGZyb20gdGhpcyBncm91cC4gSWYgdGhlIGNoaWxkIGV4aXN0cyBpblxuICAgKiB0aGlzIGdyb3VwIGl0IGlzIHJlbW92ZWQgYW5kIHJldHVybmVkLlxuICAgKi9cbiAgcmVtb3ZlQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgLy8gUmVtb3ZlIGNoaWxkXG4gICAgdmFyIGlkeCA9IHRoaXMuY2hpbGRyZW4uaW5kZXhPZihjaGlsZCk7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuLnNwbGljZShpZHgsIDEpO1xuICAgICAgY2hpbGQucGFyZW50ID0gbnVsbDtcbiAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9XG4gIH0sXG5cblxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW47XG4gICAgdmFyIGNsaXAgPSB0aGlzLmNsaXA7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIGlmIChjbGlwKSB7XG4gICAgICBpZiAobHggPCBjbGlwLnggfHwgbHggPiBjbGlwLngrY2xpcC53aWR0aCAmJiBseSA8IGNsaXAueSAmJiBseSA+IGNsaXAueStjbGlwLmhlaWdodCkge1xuICAgICAgICAvLyBQaWNrIHBvaW50IGlzIG91dCBvZiBjbGlwIHJlY3RcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlZmVyIHBpY2tpbmcgdG8gY2hpbGRyZW4gLSBzdGFydCBhdCB0b3Agb2Ygc3RhY2sgKGVuZCBvZiBjaGlsZCBsaXN0KVxuICAgIC8vIGFuZCB3b3JrIGJhY2t3YXJkcywgZXhpdCBlYXJseSBpZiBoaXQgZm91bmRcbiAgICBmb3IgKHZhciBpPWNoaWxkcmVuLmxlbmd0aC0xOyBpPj0wICYmICFyZXN1bHQ7IGktLSkge1xuICAgICAgcmVzdWx0ID0gY2hpbGRyZW5baV0ucGljayhjdHgsIHgsIHksIGx4LCBseSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuO1xuXG4gICAgaWYgKHRoaXMuY2xpcCkge1xuICAgICAgY3R4LnNhdmUoKTtcbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5yZWN0KHRoaXMuY2xpcC54LCB0aGlzLmNsaXAueSwgdGhpcy5jbGlwLndpZHRoLCB0aGlzLmNsaXAuaGVpZ2h0KTtcbiAgICAgIGN0eC5jbGlwKCk7XG4gICAgfVxuXG4gICAgLy8gUmVuZGVyIGNoaWxkcmVuIGZyb20gYm90dG9tLXVwXG4gICAgZm9yICh2YXIgaT0wLCBsPWNoaWxkcmVuLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIGNoaWxkcmVuW2ldLnJlbmRlcihjdHgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNsaXApIHtcbiAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xuXG4vKipcbiAqIFJhc3RlciBJbWFnZSBOb2RlXG4gKlxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcbiAqXG4gKiBzcmM6IHVybCAocmVsYXRpdmUgb3IgZnVsbHkgcXVhbGlmaWVkKSBmcm9tIHdoaWNoIHRvIGxvYWQgaW1hZ2VcbiAqIHdpZHRoOiB3aWR0aCBvZiB0aGUgcmVuZGVyZWQgcmVwcmVzZW50YXRpb24gb2YgdGhlIGltYWdlIChpbiBwaXhlbHMpLlxuICogICBJZiB1bnNldC9udWxsLCB0aGUgbmF0dXJhbCB3aWR0aCBvZiB0aGUgaW1hZ2Ugd2lsbCBiZSB1c2VkXG4gKiBoZWlnaHQ6IGhlaWdodCBvZiB0aGUgcmVuZGVyZWQgcmVwcmVzZW50YXRpb24gb2YgdGhlIGltYWdlIChpbiBwaXhlbHMpLlxuICogICBJZiB1bnNldC9udWxsLCB0aGUgbmF0dXJhbCBoZWlnaHQgb2YgdGhlIGltYWdlIHdpbGwgYmUgdXNlZFxuICovXG52YXIgSW1hZ2VOb2RlID0gZnVuY3Rpb24oKSB7XG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICB0aGlzLl9sb2FkZWQgPSBmYWxzZTtcbn07XG5cblxuSW1hZ2VOb2RlLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEltYWdlTm9kZS5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIHZhciBzZWxmO1xuXG4gICAgaWYgKHRoaXMuX2ltYWdlICYmIHRoaXMuX2ltYWdlLmxvYWRlZCkge1xuICAgICAgLy8gSW1hZ2VcbiAgICAgIGlmICh0aGlzLndpZHRoICE9IG51bGwgfHwgdGhpcy5oZWlnaHQgIT0gbnVsbCkge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2ltYWdlLCAwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2ltYWdlLCAwLCAwKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9pbWFnZSkge1xuICAgICAgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLl9pbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgICAgdGhpcy5faW1hZ2Uub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIE9ubHkgcmVuZGVyIHNjZW5lIGlmIGxvYWRlZCBpbWFnZSBpcyBzdGlsbCBwYXJ0IG9mIGl0XG4gICAgICAgIGlmICh0aGlzID09PSBzZWxmLl9pbWFnZSkge1xuICAgICAgICAgIHNlbGYuX2ltYWdlLmxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgc2VsZi50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHRoaXMuX2ltYWdlLnNyYyA9IHRoaXMuc3JjO1xuICAgIH1cbiAgfSxcblxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggfHwgKHRoaXMuX2ltYWdlICYmIHRoaXMuX2ltYWdlLndpZHRoKTtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgKHRoaXMuX2ltYWdlICYmIHRoaXMuX2ltYWdlLmhlaWdodCk7XG5cbiAgICBpZiAobHggPj0gMCAmJiBseCA8IHdpZHRoICYmIGx5ID49IDAgJiYgbHkgPCBoZWlnaHQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxufSk7XG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEltYWdlTm9kZS5wcm90b3R5cGUsICdzcmMnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NyYztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9zcmMgIT09IHZhbHVlKSB7XG4gICAgICB0aGlzLl9zcmMgPSB2YWx1ZTtcbiAgICAgIHRoaXMuX2ltYWdlID0gbnVsbDtcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gSW1hZ2VOb2RlOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgcG9seWZpbGwgPSByZXF1aXJlKCcuL3BvbHlmaWxscycpO1xudmFyIEdyb3VwID0gcmVxdWlyZSgnLi9ncm91cCcpO1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBuZXcgc2NlbmVncmFwaCByb290IGVsZW1lbnQgd2hpY2ggaW1wbGVtZW50cyBhbiBleHRlbmRlZFxuICogR3JvdXAgaW50ZXJmYWNlLiBFeHBlY3RzIGEgYGNhbnZhc2AgSFRNTCBlbGVtZW50LlxuICovXG52YXIgUGF0aCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgLy8gQXV0b2luc3RhbnRpYXRlXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQYXRoKSkge1xuICAgIHJldHVybiBuZXcgUGF0aChlbGVtZW50KTtcbiAgfVxuICBHcm91cC5hcHBseSh0aGlzKTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5lbCA9IGVsZW1lbnQ7XG4gIHRoaXMuY29udGV4dCA9IGVsZW1lbnQuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG4gIC8vIEFkZCBoZWxwZXIgcG9seWZpbGxzIHRvIGNvbnRleHQgaW5zdGFuY2VcbiAgcG9seWZpbGwuZGFzaFN1cHBvcnQodGhpcy5jb250ZXh0KTtcblxuICAvLyBPZmZzZXQgYnkgMS8yIHBpeGVsIHRvIGFsaWduIHdpdGggcGl4ZWwgZWRnZXNcbiAgLy8gaHR0cDovL2RpdmVpbnRvaHRtbDUuaW5mby9jYW52YXMuaHRtbCNwaXhlbC1tYWRuZXNzXG4gIHRoaXMueCA9IDAuNTtcbiAgdGhpcy55ID0gMC41O1xuXG4gIC8vIEJpbmQgbWVtYmVycyBmb3IgY29udmVuaWVudCBjYWxsYmFja1xuICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcyk7XG4gIHRoaXMuX2hhbmRsZSA9IHRoaXMuX2hhbmRsZS5iaW5kKHRoaXMpO1xuICB0aGlzLl9tb3VzZW1vdmUgPSB0aGlzLl9tb3VzZW1vdmUuYmluZCh0aGlzKTtcblxuICAvLyBSZWdpc3RlciBldmVudCBsaXN0ZW5lcnMgb24gY2FudmFzIHRoYXQgdXNlIHBpY2tlciB0byBoaXR0ZXN0XG4gIFsnY2xpY2snLCAnZGJsY2xpY2snLCAnbW91c2Vkb3duJywgJ21vdXNldXAnXS5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBzZWxmLmVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgc2VsZi5faGFuZGxlKTtcbiAgfSk7XG4gIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5fbW91c2Vtb3ZlKTtcblxuICAvLyBMaXN0ZW4gZm9yIHVwZGF0ZSByZXF1ZXN0cyBmcm9tIHNjZW5lZ3JhcGgsIGRlZmVyIGJ5IGEgZnJhbWUsIGNvYWxlc2NlXG4gIHRoaXMuX3BlbmRpbmdVcGRhdGUgPSBudWxsO1xuICB0aGlzLm9uKCd1cGRhdGUnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXNlbGYuX3BlbmRpbmdVcGRhdGUpIHtcbiAgICAgIHNlbGYuX3BlbmRpbmdVcGRhdGUgPSBwb2x5ZmlsbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHNlbGYudXBkYXRlICk7XG4gICAgfVxuICB9KTtcbiAgLy8gQ3JlYXRlIGFuaW1hdGUtdXBkYXRlIGZ1bmN0aW9uIG9uY2VcbiAgdGhpcy5fYW5pbVVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIFRXRUVOLnVwZGF0ZSgpO1xuICAgIHNlbGYudXBkYXRlKCk7XG4gIH07XG5cbiAgLy8gUmVzaXplIHRvIGN1cnJlbnQgRE9NLXNwZWNpZmllZCBzaXppbmdcbiAgdGhpcy5yZXNpemUoKTtcbn07XG5cblxuXy5leHRlbmQoUGF0aC5wcm90b3R5cGUsIEdyb3VwLnByb3RvdHlwZSwge1xuICAvKipcbiAgICogUmVzaXplIG9yIHVwZGF0ZSB0aGUgc2l6ZSBvZiB0aGUgY2FudmFzLiBDYWxsaW5nIHRoaXMgZnVuY3Rpb24gd2lsbCBmaXhcbiAgICogdGhlIGNzcy1zdHlsZS1zcGVjaWZpZWQgc2l6ZSBvZiB0aGUgY2FudmFzIGVsZW1lbnQuIENhbGwgYHVwZGF0ZSgpYFxuICAgKiB0byBjYXVzZSB0aGUgY2FudmFzIHRvIHJlcmVuZGVyIGF0IHRoZSBuZXcgc2l6ZS5cbiAgICpcbiAgICogU3RyaWN0IHNpemluZyBpcyBuZWNlc3NhcnkgdG8gc2V0IHRoZSBjYW52YXMgd2lkdGgvaGVpZ2h0IHBpeGVsIGNvdW50XG4gICAqIHRvIHRoZSBjb3JyZWN0IHZhbHVlIGZvciB0aGUgY2FudmFzIGVsZW1lbnQgRE9NIHNpemUgYW5kIGRldmljZSBwaXhlbFxuICAgKiByYXRpby5cbiAgICovXG4gIHJlc2l6ZTogZnVuY3Rpb24odywgaCkge1xuICAgIC8vIFRPRE8gdGhpcyBtYXkgbm90IGJlIHJlbGlhYmxlIG9uIG1vYmlsZVxuICAgIHRoaXMuZGV2aWNlUGl4ZWxSYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDE7XG5cbiAgICB0aGlzLndpZHRoID0gdyB8fCB0aGlzLmVsLmNsaWVudFdpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gaCB8fCB0aGlzLmVsLmNsaWVudEhlaWdodDtcblxuICAgIHRoaXMuZWwuc3R5bGUud2lkdGggPSB0aGlzLndpZHRoICsgJ3B4JztcbiAgICB0aGlzLmVsLnN0eWxlLmhlaWdodCA9IHRoaXMuaGVpZ2h0ICsgJ3B4JztcbiAgfSxcblxuICAvKipcbiAgICogQ2F1c2VzIHRoZSBjYW52YXMgdG8gcmVuZGVyIHN5bmNocm9ub3VzbHkuIElmIGFueSBhbmltYXRpb25zIGFyZSBhY3RpdmUvcGVuZGluZ1xuICAgKiB0aGlzIHdpbGwga2ljayBvZmYgYSBzZXJpZXMgb2YgYXV0b21hdGljIHVwZGF0ZXMgdW50aWwgdGhlIGFuaW1hdGlvbnMgYWxsXG4gICAqIGNvbXBsZXRlLlxuICAgKi9cbiAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAvLyBVcGRhdGUgc2l6ZSB0byBlcXVhbCBkaXNwbGF5ZWQgcGl4ZWwgc2l6ZSArIGNsZWFyXG4gICAgdGhpcy5jb250ZXh0LmNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggKiB0aGlzLmRldmljZVBpeGVsUmF0aW87XG4gICAgdGhpcy5jb250ZXh0LmNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCAqIHRoaXMuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICBpZiAodGhpcy5kZXZpY2VQaXhlbFJhdGlvICE9IDEpIHtcbiAgICAgIHRoaXMuY29udGV4dC5zYXZlKCk7XG4gICAgICB0aGlzLmNvbnRleHQuc2NhbGUodGhpcy5kZXZpY2VQaXhlbFJhdGlvLCB0aGlzLmRldmljZVBpeGVsUmF0aW8pO1xuICAgIH1cblxuICAgIHRoaXMuX3BlbmRpbmdVcGRhdGUgPSBudWxsO1xuXG4gICAgLy8gQWN0aXZlIGFuaW1hdGlvbnM/IHNjaGVkdWxlIHR3ZWVuIHVwZGF0ZSArIHJlbmRlciBvbiBuZXh0IGZyYW1lXG4gICAgaWYgKHdpbmRvdy5UV0VFTiAmJiBUV0VFTi5nZXRBbGwoKS5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBYWFggQ291bGQgYmUgYW4gZXhpc3RpbmcgcGVuZGluZyB1cGRhdGVcbiAgICAgIHRoaXMuX3BlbmRpbmdVcGRhdGUgPSBwb2x5ZmlsbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5fYW5pbVVwZGF0ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5yZW5kZXIodGhpcy5jb250ZXh0KTtcblxuICAgIGlmICh0aGlzLmRldmljZVBpeGVsUmF0aW8gIT0gMSkge1xuICAgICAgdGhpcy5jb250ZXh0LnJlc3RvcmUoKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gR2VuZXJhbCBoYW5kbGVyIGZvciBzaW1wbGUgZXZlbnRzIChjbGljaywgbW91c2Vkb3duLCBldGMpXG4gIF9oYW5kbGU6IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgaGl0ID0gdGhpcy5waWNrKHRoaXMuY29udGV4dCwgZS5vZmZzZXRYLCBlLm9mZnNldFksIGUub2Zmc2V0WCwgZS5vZmZzZXRZKTtcbiAgICBpZiAoaGl0KSB7XG4gICAgICBlLnRhcmdldE5vZGUgPSBoaXQ7XG4gICAgICBoaXQudHJpZ2dlcihlLnR5cGUsIGUpO1xuICAgIH1cbiAgfSxcblxuICBfbW91c2Vtb3ZlOiBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGhpdCA9IHRoaXMucGljayh0aGlzLmNvbnRleHQsIGUub2Zmc2V0WCwgZS5vZmZzZXRZLCBlLm9mZnNldFgsIGUub2Zmc2V0WSk7XG4gICAgaWYgKGhpdCkge1xuICAgICAgZS50YXJnZXROb2RlID0gaGl0O1xuICAgIH1cbiAgICAvLyBNYW5hZ2UgbW91c2VvdXQvbW91c2VvdmVyXG4gICAgLy8gVE9ETyBjcmVhdGUgbmV3IGV2ZW50IG9iamVjdHMgd2l0aCBjb3JyZWN0IGV2ZW50IHR5cGVcbiAgICBpZiAodGhpcy5fbGFzdG92ZXIgIT0gaGl0KSB7XG4gICAgICBpZiAodGhpcy5fbGFzdG92ZXIpIHtcbiAgICAgICAgZS50YXJnZXROb2RlID0gdGhpcy5fbGFzdG92ZXI7XG4gICAgICAgIHRoaXMuX2xhc3RvdmVyLnRyaWdnZXIoJ21vdXNlb3V0JywgZSk7XG4gICAgICAgIGUudGFyZ2V0Tm9kZSA9IGhpdDtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2xhc3RvdmVyID0gaGl0O1xuICAgICAgaWYgKGhpdCkge1xuICAgICAgICBoaXQudHJpZ2dlcignbW91c2VvdmVyJywgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFsd2F5cyBzZW5kIG1vdXNlbW92ZSBsYXN0XG4gICAgaWYgKGhpdCkge1xuICAgICAgaGl0LnRyaWdnZXIoJ21vdXNlbW92ZScsIGUpO1xuICAgIH1cbiAgICAvLyBUT0RPIEhhbmRsZSBtb3VzZSBsZWF2aW5nIGNhbnZhc1xuICB9XG59KTtcblxuXG5cbi8vIFNUQVRJQ1xuXG4vLyBBZGQgbGlicmFyeSBjb25zdHJ1Y3RzIHRvIG5hbWVzcGFjZVxudmFyIG5hbWVzcGFjZUNvbnN0cnVjdG9ycyA9IHtcbiAgcmVjdDogcmVxdWlyZSgnLi9yZWN0JyksXG4gIHBhdGg6IHJlcXVpcmUoJy4vcGF0aCcpLFxuICB0ZXh0OiByZXF1aXJlKCcuL3RleHQnKSxcbiAgaW1hZ2U6IHJlcXVpcmUoJy4vaW1hZ2UnKSxcbiAgY2lyY2xlOiByZXF1aXJlKCcuL2NpcmNsZScpLFxuICBncm91cDogR3JvdXBcbn07XG5cbmZvciAoYXR0ciBpbiBuYW1lc3BhY2VDb25zdHJ1Y3RvcnMpIHtcbiAgUGF0aFthdHRyXSA9IChmdW5jdGlvbihhdHRyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHByb3BzKSB7XG4gICAgICByZXR1cm4gbmV3IG5hbWVzcGFjZUNvbnN0cnVjdG9yc1thdHRyXShwcm9wcyk7XG4gICAgfTtcbiAgfShhdHRyKSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQYXRoOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbnZhciBJRCA9IDA7XG5cbi8qKlxuICogQmFzZSBOb2RlIG9iamVjdCBmb3IgYWxsIHNjZW5lZ3JhcGggb2JqZWN0c1xuICpcbiAqIGlkOiBub24tdmlzdWFsLCB1bmlxdWUgdmFsdWUgZm9yIGFsbCBub2Rlc1xuICogdmlzaWJsZTogaWYgZmFsc2UsIHRoaXMgbm9kZSAoYW5kIGRlc2NlbmRlbnRzKSB3aWxsIG5vdCByZW5kZXIgbm9yIHBpY2tcbiAqIHg6IHRoZSB4IHBvc2l0aW9uICh0cmFuc2xhdGlvbikgYXBwbGllZCB0byB0aGlzIG5vZGVcbiAqIHk6IHRoZSB5IHBvc2l0aW9uICh0cmFuc2xhdGlvbikgYXBwbGllZCB0byB0aGlzIG5vZGVcbiAqIHJvdGF0aW9uOiByb3RhdGlvbiBpbiByYWRpYW5zIGFwcGxpZWQgdG8gdGhpcyBub2RlIGFuZCBhbnkgZGVzY2VuZGVudHNcbiAqIHNjYWxlWCwgc2NhbGVZOiB4IGFuZCB5IHNjYWxlIGFwcGxpZWQgdG8gdGhpcyBub2RlIGFuZCBhbnkgZGVzY2VuZGVudHNcbiAqIG9wYWNpdHk6IHRoZSBnbG9iYWwgb3BhY2l0eSBbMCwxXSBvZiB0aGlzIG5vZGVcbiAqL1xudmFyIE5vZGUgPSBmdW5jdGlvbihhdHRyaWJ1dGVzKSB7XG4gIHRoaXMuaWQgPSBJRCsrO1xuICB0aGlzLnBhcmVudCA9IG51bGw7XG4gIHRoaXMudmlzaWJsZSA9IHRydWU7XG4gIHRoaXMuaGFuZGxlcnMgPSB7fTtcblxuICBfLmV4dGVuZCh0aGlzLCBhdHRyaWJ1dGVzKTtcbn07XG5cbk5vZGUucHJvdG90eXBlID0ge1xuICAvKipcbiAgICogU2ltcGxlXG4gICAqL1xuICBkYXRhOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzLl9kYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEJ1bGsgc2V0cyBhIGdyb3VwIG9mIG5vZGUgcHJvcGVydGllcywgdGFrZXMgYSBtYXAgb2YgcHJvcGVydHkgbmFtZXNcbiAgICogdG8gdmFsdWVzLiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBzZXR0aW5nIGVhY2ggcHJvcGVydHkgdmlhXG4gICAqIGBub2RlLnByb3BlcnR5TmFtZSA9IHZhbHVlYFxuICAgKi9cbiAgYXR0cjogZnVuY3Rpb24oYXR0cmlidXRlcykge1xuICAgIF8uZXh0ZW5kKHRoaXMsIGF0dHJpYnV0ZXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBRdWV1ZXMgYSBzZXQgb2Ygbm9kZSBwcm9wZXJ0aWVzIGZvciBhbiBhbmltYXRlZCB0cmFuc2l0aW9uLiBPbmx5XG4gICAqIG51bWVyaWMgcHJvcGVydGllcyBjYW4gYmUgYW5pbWF0ZWQuIFRoZSBsZW5ndGggb2YgdGhlIHRyYW5zaXRpb25cbiAgICogaXMgc3BlY2lmaWVkIGluIHRoZSB0cmFuc2l0aW9uIHByb3BlcnR5LCBkZWZhdWx0cyB0byAxIHNlY29uZC4gQW5cbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgY2FuIGJlIHByb3ZpZGVkIHdoaWNoIHdpbGwgYmUgY2FsbGVkIG9uIGFuaW1hdGlvblxuICAgKiBjb21wbGV0aW9uLlxuICAgKlxuICAgKiBDYWxsaW5nIGB1cGRhdGUoKWAgb24gdGhlIHNjZW5lIHJvb3Qgd2lsbCB0cmlnZ2VyIHRoZSBzdGFydCBvZiBhbGxcbiAgICogcXVldWVkIGFuaW1hdGlvbnMgYW5kIGNhdXNlIHRoZW0gdG8gcnVuIChhbmQgcmVuZGVyKSB0byBjb21wbGV0aW9uLlxuICAgKi9cbiAgdHdlZW5BdHRyOiBmdW5jdGlvbihhdHRyaWJ1dGVzLCB0cmFuc2l0aW9uKSB7XG5cdHZhciBkID0gbmV3ICQuRGVmZXJyZWQoKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGtleSwgc3RhdGljcztcbiAgICB0cmFuc2l0aW9uID0gdHJhbnNpdGlvbiB8fCB7fTtcblxuICAgIC8vIE9ubHkgc3VwcG9ydCB0d2VlbmluZyBudW1iZXJzIC0gc3RhdGljYWxseSBzZXQgZXZlcnl0aGluZyBlbHNlXG4gICAgZm9yIChrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgaWYgKGF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiB0eXBlb2YgYXR0cmlidXRlc1trZXldICE9ICdudW1iZXInKSB7XG4gICAgICAgIHN0YXRpY3MgPSBzdGF0aWNzIHx8IHt9O1xuICAgICAgICBzdGF0aWNzW2tleV0gPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN0YXRpY3MpIHtcbiAgICAgIHRoaXMuYXR0cihzdGF0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50d2Vlbikge1xuICAgICAgLy8gVE9ETyBKdW1wIHRvIGVuZCBzdGF0ZSBvZiB2YXJzIG5vdCBiZWluZyB0cmFuc2l0aW9uZWRcbiAgICAgIHRoaXMudHdlZW4uc3RvcCgpO1xuICAgIH1cblxuICAgIHRoaXMudHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcbiAgICAgIC50byhhdHRyaWJ1dGVzLCB0cmFuc2l0aW9uLmR1cmF0aW9uIHx8IDEwMDApXG4gICAgICAub25Db21wbGV0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi50d2VlbiA9IG51bGw7XG5cdFx0ZC5yZXNvbHZlKHRoaXMsYXR0cmlidXRlcyk7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uLmNhbGxiYWNrKSB7XG4gICAgICAgICAgdHJhbnNpdGlvbi5jYWxsYmFjayh0aGlzLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGFydCgpO1xuXHQgcmV0dXJuIGQucHJvbWlzZTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkcyBhbiBldmVudCBoYW5kbGVyIHRvIHRoaXMgbm9kZS4gRm9yIGV4YW1wbGU6XG4gICAqIGBgYFxuICAgKiBub2RlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAqICAgLy8gZG8gc29tZXRoaW5nXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICogQW4gZXZlbnQgb2JqZWN0IHdpbGwgYmUgcGFzc2VkIHRvIHRoZSBoYW5kbGVyIHdoZW4gdGhlIGV2ZW50XG4gICAqIGlzIHRyaWdnZXJlZC4gVGhlIGV2ZW50IG9iamVjdCB3aWxsIGJlIGEgc3RhbmRhcmQgSmF2YVNjcmlwdFxuICAgKiBldmVudCBhbmQgd2lsbCBjb250YWluIGEgYHRhcmdldE5vZGVgIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlXG4gICAqIG5vZGUgdGhhdCB3YXMgdGhlIHNvdXJjZSBvZiB0aGUgZXZlbnQuIEV2ZW50cyBidWJibGUgdXAgdGhlXG4gICAqIHNjZW5lZ3JhcGggdW50aWwgaGFuZGxlZC4gSGFuZGxlcnMgcmV0dXJuaW5nIGEgdHJ1dGh5IHZhbHVlXG4gICAqIHNpZ25hbCB0aGF0IHRoZSBldmVudCBoYXMgYmVlbiBoYW5kbGVkLlxuICAgKi9cbiAgb246IGZ1bmN0aW9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW3R5cGVdO1xuICAgIGlmICghaGFuZGxlcnMpIHtcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1t0eXBlXSA9IFtdO1xuICAgIH1cbiAgICBoYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGFuIGV2ZW50IGhhbmRsZXIgb2YgdGhlIGdpdmVuIHR5cGUuIElmIG5vIGhhbmRsZXIgaXNcbiAgICogcHJvdmlkZWQsIGFsbCBoYW5kbGVycyBvZiB0aGUgdHlwZSB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBvZmY6IGZ1bmN0aW9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnNbdHlwZV0gPSBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1t0eXBlXTtcbiAgICAgIHZhciBpZHggPSBoYW5kbGVycy5pbmRleE9mKGhhbmRsZXIpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIGhhbmRsZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvKipcbiAgICogVHJpZ2dlcnMgYW4gZXZlbnQgYW5kIGJlZ2lucyBidWJibGluZy4gUmV0dXJucyB0cnV0aHkgaWYgdGhlXG4gICAqIGV2ZW50IHdhcyBoYW5kbGVkLlxuICAgKi9cbiAgdHJpZ2dlcjogZnVuY3Rpb24odHlwZSwgZXZlbnQpIHtcbiAgICB2YXIgaGFuZGxlZCA9IGZhbHNlO1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbdHlwZV07XG5cbiAgICBpZiAoaGFuZGxlcnMpIHtcbiAgICAgIGhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVkID0gaGFuZGxlcihldmVudCkgfHwgaGFuZGxlZDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICghaGFuZGxlZCAmJiB0aGlzLnBhcmVudCkge1xuICAgICAgaGFuZGxlZCA9IHRoaXMucGFyZW50LnRyaWdnZXIodHlwZSwgZXZlbnQpO1xuICAgIH1cblxuICAgIHJldHVybiBoYW5kbGVkO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoaXMgbm9kZSBmcm9tIGl0cyBwYXJlbnRcbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgICB0aGlzLnBhcmVudC5yZW1vdmUodGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbDogcmVuZGVycyB0aGUgbm9kZSBnaXZlbiB0aGUgY29udGV4dFxuICAgKi9cbiAgcmVuZGVyOiBmdW5jdGlvbihjdHgpIHtcbiAgICBpZiAoIXRoaXMudmlzaWJsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB4ID0gdGhpcy54IHx8IDA7XG4gICAgdmFyIHkgPSB0aGlzLnkgfHwgMDtcbiAgICB2YXIgc2NhbGVYID0gdGhpcy5zY2FsZVggPT0gbnVsbCA/IDEgOiB0aGlzLnNjYWxlWDtcbiAgICB2YXIgc2NhbGVZID0gdGhpcy5zY2FsZVkgPT0gbnVsbCA/IDEgOiB0aGlzLnNjYWxlWTtcbiAgICB2YXIgdHJhbnNmb3JtZWQgPSAhIXggfHwgISF5IHx8ICEhdGhpcy5yb3RhdGlvbiB8fCBzY2FsZVggIT09IDEgfHwgc2NhbGVZICE9PSAxIHx8IHRoaXMub3BhY2l0eSAhPSBudWxsO1xuXG4gICAgLy8gVE9ETyBJbnZlc3RpZ2F0ZSBjb3N0IG9mIGFsd2F5cyBzYXZlL3Jlc3RvcmVcbiAgICBpZiAodHJhbnNmb3JtZWQpIHtcbiAgICAgIGN0eC5zYXZlKCk7XG4gICAgfVxuXG4gICAgaWYgKHggfHwgeSkge1xuICAgICAgY3R4LnRyYW5zbGF0ZSh4LHkpO1xuICAgIH1cblxuICAgIGlmIChzY2FsZVggIT09IDEgfHwgc2NhbGVZICE9PSAxKSB7XG4gICAgICBjdHguc2NhbGUoc2NhbGVYLCBzY2FsZVkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdGF0aW9uKSB7XG4gICAgICBjdHgucm90YXRlKHRoaXMucm90YXRpb24pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wYWNpdHkgIT0gbnVsbCkge1xuICAgICAgY3R4Lmdsb2JhbEFscGhhID0gdGhpcy5vcGFjaXR5O1xuICAgIH1cblxuICAgIHRoaXMuZHJhdyhjdHgpO1xuXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XG4gICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSW50ZXJuYWw6IHRlc3RzIGZvciBwaWNrIGhpdCBnaXZlbiBjb250ZXh0LCBnbG9iYWwgYW5kIGxvY2FsXG4gICAqIGNvb3JkaW5hdGUgc3lzdGVtIHRyYW5zZm9ybWVkIHBpY2sgY29vcmRpbmF0ZXMuXG4gICAqL1xuICBwaWNrOiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xuICAgIGlmICghdGhpcy52aXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IG51bGw7XG4gICAgdmFyIHMsIGMsIHRlbXA7XG5cbiAgICB2YXIgdHggPSB0aGlzLnggfHwgMDtcbiAgICB2YXIgdHkgPSB0aGlzLnkgfHwgMDtcbiAgICB2YXIgc2NhbGVYID0gdGhpcy5zY2FsZVggPT0gbnVsbCA/IDEgOiB0aGlzLnNjYWxlWDtcbiAgICB2YXIgc2NhbGVZID0gdGhpcy5zY2FsZVkgPT0gbnVsbCA/IDEgOiB0aGlzLnNjYWxlWTtcbiAgICB2YXIgdHJhbnNmb3JtZWQgPSAhIXR4IHx8ICEhdHkgfHwgISF0aGlzLnJvdGF0aW9uIHx8IHNjYWxlWCAhPT0gMSB8fCBzY2FsZVkgIT09IDEgfHwgdGhpcy5vcGFjaXR5ICE9IG51bGw7XG5cbiAgICAvLyBUT0RPIEludmVzdGlnYXRlIGNvc3Qgb2YgYWx3YXlzIHNhdmUvcmVzdG9yZVxuICAgIGlmICh0cmFuc2Zvcm1lZCkge1xuICAgICAgY3R4LnNhdmUoKTtcbiAgICB9XG5cbiAgICBpZiAodHggfHwgdHkpIHtcbiAgICAgIGN0eC50cmFuc2xhdGUodHgsdHkpO1xuICAgICAgLy8gUmV2ZXJzZSB0cmFuc2xhdGlvbiBvbiBwaWNrZWQgcG9pbnRcbiAgICAgIGx4IC09IHR4O1xuICAgICAgbHkgLT0gdHk7XG4gICAgfVxuXG4gICAgaWYgKHNjYWxlWCAhPT0gMSB8fCBzY2FsZVkgIT09IDEpIHtcbiAgICAgIGN0eC5zY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgICAvLyBSZXZlcnNlIHNjYWxlXG4gICAgICBseCAvPSBzY2FsZVg7XG4gICAgICBseSAvPSBzY2FsZVk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucm90YXRpb24pIHtcbiAgICAgIGN0eC5yb3RhdGUodGhpcy5yb3RhdGlvbik7XG4gICAgICAvLyBSZXZlcnNlIHJvdGF0aW9uXG4gICAgICBzID0gTWF0aC5zaW4oLXRoaXMucm90YXRpb24pO1xuICAgICAgYyA9IE1hdGguY29zKC10aGlzLnJvdGF0aW9uKTtcbiAgICAgIHRlbXAgPSBjKmx4IC0gcypseTtcbiAgICAgIGx5ID0gcypseCArIGMqbHk7XG4gICAgICBseCA9IHRlbXA7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gdGhpcy5oaXRUZXN0KGN0eCwgeCwgeSwgbHgsIGx5KTtcblxuICAgIGlmICh0cmFuc2Zvcm1lZCkge1xuICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBUZW1wbGF0ZSBtZXRob2QgZm9yIGRlcml2ZWQgb2JqZWN0cyB0byBhY3R1YWxseSBwZXJmb3JtIGRyYXcgb3BlcmF0aW9ucy5cbiAgICogVGhlIGNhbGxpbmcgYHJlbmRlcmAgY2FsbCBoYW5kbGVzIGdlbmVyYWwgdHJhbnNmb3JtcyBhbmQgb3BhY2l0eS5cbiAgICovXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIC8vIHRlbXBsYXRlIG1ldGhvZFxuICB9LFxuXG4gIC8qKlxuICAgKiBUZW1wbGF0ZSBtZXRob2QgZm9yIGRlcml2ZWQgb2JqZWN0cyB0byB0ZXN0IGlmIHRoZXkgKG9yIGNoaWxkKSBpcyBoaXQgYnlcbiAgICogdGhlIHByb3ZpZGVkIHBpY2sgY29vcmRpbmF0ZS4gSWYgaGl0LCByZXR1cm4gb2JqZWN0IHRoYXQgd2FzIGhpdC5cbiAgICovXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XG4gICAgLy8gdGVtcGxhdGUgbWV0aG9kXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xudmFyIHN2ZyA9IHJlcXVpcmUoJy4vc3ZnJyk7XG5cblxudmFyIE5PTkUgPSBbXTtcblxuLyoqXG4gKiBWZWN0b3IgUGF0aCBOb2RlXG4gKlxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcbiAqXG4gKiBwYXRoOiBhIHZhbGlkIFNWRyBwYXRoIHN0cmluZyAoZS5nLiAnTS01LDBBNSw1LDAsMCwxLDUsMEE1LDUsMCwwLDEsLTUsMFonKVxuICogICB0byBkcmF3XG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGgsIGxpbmVDYXAsIGxpbmVKb2luLCBtaXRlckxpbWl0OlxuICogICBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcbiAqIGxpbmVEYXNoOiBhbiBhcnJheSBzcGVjaWZ5aW5nIG9uL29mZiBwaXhlbCBwYXR0ZXJuXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICogbGluZURhc2hPZmZzZXQ6IGEgcGl4ZWwgb2Zmc2V0IHRvIHN0YXJ0IHRoZSBkYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxuICpcbiAqIE5vdGU6IGlmIGBzdHJva2VTdHlsZWAgaXMgc3BlY2lmaWVkLCBwaWNraW5nIHdpbGwgYmUgZW5hYmxlZCBvbiB0aGUgcGF0aCBzdHJva2Uvb3V0bGluZS5cbiAqIElmIGBmaWxsU3R5bGVgIGlzIHNwZWNpZmllZCwgcGlja2luZyB3aWxsIGJlIGVuYWJsZWQgb24gdGhlIGludGVyaW9yIGZpbGxlZCBhcmVhXG4gKiBvZiB0aGUgcGF0aC5cbiAqL1xudmFyIFBhdGggPSBmdW5jdGlvbigpIHtcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuXG5QYXRoLnByb3RvdHlwZSA9IF8uZXh0ZW5kKFBhdGgucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xuXG4gIHNrZXRjaDogZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIHBhdGggPSB0aGlzLnBhdGg7XG4gICAgaWYgKHBhdGggJiYgcGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcGF0aENvbW1hbmRzID0gdGhpcy5fY29tbWFuZENhY2hlIHx8ICh0aGlzLl9jb21tYW5kQ2FjaGUgPSBzdmcucGFyc2UocGF0aCkpO1xuICAgICAgc3ZnLnJlbmRlcihjdHgsIHBhdGhDb21tYW5kcyk7XG4gICAgfVxuICB9LFxuXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZmlsbFN0eWxlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XG4gICAgICBjdHgubGluZUNhcCA9IHRoaXMubGluZUNhcCB8fCAnYnV0dCc7XG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XG4gICAgICBjdHgubWl0ZXJMaW1pdCA9IHRoaXMubWl0ZXJMaW1pdCB8fCAxMDtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoIHx8IE5PTkUpO1xuICAgICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XG4gICAgfVxuXG4gICAgdGhpcy5za2V0Y2goY3R4KTtcblxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xuICAgICAgY3R4LmZpbGwoKTtcbiAgICB9XG4gIH0sXG5cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcbiAgICB0aGlzLnNrZXRjaChjdHgpO1xuXG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlICYmIGN0eC5pc1BvaW50SW5QYXRoKHgseSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSAmJiBjdHguaXNQb2ludEluU3Ryb2tlKHgseSkpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxufSk7XG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFBhdGgucHJvdG90eXBlLCAncGF0aCcsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcGF0aDtcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9wYXRoICE9PSB2YWx1ZSkge1xuICAgICAgdGhpcy5fcGF0aCA9IHZhbHVlO1xuICAgICAgdGhpcy5fY29tbWFuZENhY2hlID0gbnVsbDtcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUGF0aDsiLCJcbi8vIC0tLS1cbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuXG4vLyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xuLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xuXG4vLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyLiBmaXhlcyBmcm9tIFBhdWwgSXJpc2ggYW5kIFRpbm8gWmlqZGVsXG5cbi8vIE1JVCBsaWNlbnNlXG5cbnZhciByQUYgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciByQUY7XG5cbiAgaWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcbiAgICByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLmJpbmQod2luZG93KTtcbiAgfVxuXG4gIHZhciBsYXN0VGltZSA9IDA7XG4gIHZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcbiAgZm9yKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICFyQUY7ICsreCkge1xuICAgIHJBRiA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgfVxuXG4gIGlmICghckFGKVxuICAgIHJBRiA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgY3VyclRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xuICAgICAgdmFyIGlkID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7IH0sIHRpbWVUb0NhbGwpO1xuICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG4gICAgICByZXR1cm4gaWQ7XG4gICAgfTtcblxuICByZXR1cm4gckFGO1xufSgpKTtcblxuXG4vLyAtLS0tXG4vLyBEYXNoIHN1cHBvcnQgZm9yIGNhbnZhcyBjb250ZXh0XG5cbnZhciBkYXNoU3VwcG9ydCA9IGZ1bmN0aW9uKGN0eCkge1xuICB2YXIgTk9PUCA9IGZ1bmN0aW9uKCl7fTtcblxuICBpZiAoY3R4LnNldExpbmVEYXNoKSB7XG4gICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0ID0gZnVuY3Rpb24ob2ZmKSB7IHRoaXMubGluZURhc2hPZmZzZXQgPSBvZmY7IH07XG4gIH0gZWxzZSBpZiAoY3R4LndlYmtpdExpbmVEYXNoICE9PSB1bmRlZmluZWQpIHtcbiAgICBjdHguc2V0TGluZURhc2ggPSBmdW5jdGlvbihkYXNoKSB7IHRoaXMud2Via2l0TGluZURhc2ggPSBkYXNoOyB9O1xuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IGZ1bmN0aW9uKG9mZikgeyB0aGlzLndlYmtpdExpbmVEYXNoT2Zmc2V0ID0gb2ZmOyB9O1xuICB9IGVsc2UgaWYgKGN0eC5tb3pEYXNoICE9PSB1bmRlZmluZWQpIHtcbiAgICBjdHguc2V0TGluZURhc2ggPSBmdW5jdGlvbihkYXNoKSB7IHRoaXMubW96RGFzaCA9IGRhc2g7IH07XG4gICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0ID0gTk9PUDtcbiAgfSBlbHNlIHtcbiAgICBjdHguc2V0TGluZURhc2ggPSBOT09QO1xuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IE5PT1A7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IHJBRixcbiAgZGFzaFN1cHBvcnQ6IGRhc2hTdXBwb3J0XG59OyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xuXG52YXIgTk9ORSA9IFtdO1xuXG4vKipcbiAqIFJlY3RhbmdsZSBOb2RlXG4gKlxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcbiAqXG4gKiB3aWR0aDogd2lkdGggb2YgdGhlIHJlY3RhbmdsZVxuICogaGVpZ2h0OiBoZWlnaHQgb2YgdGhlIHJlY3RhbmdsZVxuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoLCBsaW5lQ2FwLCBsaW5lSm9pbiwgbWl0ZXJMaW1pdDpcbiAqICAgYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXG4gKiBsaW5lRGFzaDogYW4gYXJyYXkgc3BlY2lmeWluZyBvbi9vZmYgcGl4ZWwgcGF0dGVyblxuICogICAoZS5nLiBbMTAsIDVdID0gMTAgcGl4ZWxzIG9uLCA1IHBpeGVscyBvZmYpIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqIGxpbmVEYXNoT2Zmc2V0OiBhIHBpeGVsIG9mZnNldCB0byBzdGFydCB0aGUgZGFzaGVzIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcbiAqXG4gKiBOb3RlOiBwaWNraW5nIGlzIGFsd2F5cyBlbmFibGVkIG9uIHRoZSBlbnRpcmUgcmVjdCAobm8gc3Ryb2tlLW9ubHkgcGlja2luZykgYXRcbiAqIHRoZSBtb21lbnQuXG4gKi9cbnZhciBSZWN0ID0gZnVuY3Rpb24oKSB7XG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblxuUmVjdC5wcm90b3R5cGUgPSBfLmV4dGVuZChSZWN0LnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy53aWR0aCB8fCAwO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCB8fCAwO1xuXG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlKSB7XG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsU3R5bGU7XG4gICAgICBjdHguZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlKSB7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XG4gICAgICBjdHgubGluZUNhcCA9IHRoaXMubGluZUNhcCB8fCAnYnV0dCc7XG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XG4gICAgICBjdHgubWl0ZXJMaW1pdCA9IHRoaXMubWl0ZXJMaW1pdCB8fCAxMDtcbiAgICAgIGN0eC5zZXRMaW5lRGFzaCh0aGlzLmxpbmVEYXNoIHx8IE5PTkUpO1xuICAgICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XG4gICAgICBjdHguc3Ryb2tlUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB9XG4gIH0sXG5cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoIHx8IDA7XG4gICAgdmFyIGhlaWdodCA9IHRoaXMuaGVpZ2h0IHx8IDA7XG5cbiAgICBpZiAobHggPj0gMCAmJiBseCA8IHdpZHRoICYmIGx5ID49IDAgJiYgbHkgPCBoZWlnaHQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBSZWN0OyIsIi8qKlxuICBTVkcgcGF0aCB0byBjYW52YXMgcGF0aCBza2V0Y2hpbmcsIHRha2VuIGFuZCBhZGFwdGVkIGZyb206XG4gICAtIFZlZ2E6IGdpdGh1Yi5jb20vdHJpZmFjdGEvdmVnYVxuICAgICBMaWNlbnNlOiBodHRwczovL2dpdGh1Yi5jb20vdHJpZmFjdGEvdmVnYS9ibG9iL21hc3Rlci9MSUNFTlNFXG4gICAtIEZhYnJpYy5qczogZ2l0aHViLmNvbS9rYW5nYXgvZmFicmljLmpzL2Jsb2IvbWFzdGVyL3NyYy9zaGFwZXMvcGF0aC5jbGFzcy5qc1xuICAgICBMaWNlbnNlOiBodHRwczovL2dpdGh1Yi5jb20va2FuZ2F4L2ZhYnJpYy5qcy9ibG9iL21hc3Rlci9MSUNFTlNFXG4qL1xuXG5cbi8vIFBhdGggcGFyc2luZyBhbmQgcmVuZGVyaW5nIGNvZGUgdGFrZW4gZnJvbSBmYWJyaWMuanMgLS0gVGhhbmtzIVxudmFyIGNvbW1hbmRMZW5ndGhzID0geyBtOjIsIGw6MiwgaDoxLCB2OjEsIGM6Niwgczo0LCBxOjQsIHQ6MiwgYTo3IH0sXG4gICAgcmVwZWF0ZWRDb21tYW5kcyA9IHsgbTogJ2wnLCBNOiAnTCcgfSxcbiAgICB0b2tlbml6ZXIgPSAvW216bGh2Y3NxdGFdW15temxodmNzcXRhXSovZ2ksXG4gICAgZGlnaXRzID0gLyhbLStdPygoXFxkK1xcLlxcZCspfCgoXFxkKyl8KFxcLlxcZCspKSkoPzplWy0rXT9cXGQrKT8pL2lnO1xuXG5mdW5jdGlvbiBwYXJzZShwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBbIF0sXG4gICAgICBjb29yZHMgPSBbIF0sXG4gICAgICBjdXJyZW50UGF0aCxcbiAgICAgIHBhcnNlZCxcbiAgICAgIG1hdGNoLFxuICAgICAgY29vcmRzU3RyO1xuXG4gIC8vIEZpcnN0LCBicmVhayBwYXRoIGludG8gY29tbWFuZCBzZXF1ZW5jZVxuICBwYXRoID0gcGF0aC5tYXRjaCh0b2tlbml6ZXIpO1xuXG4gIC8vIE5leHQsIHBhcnNlIGVhY2ggY29tbWFuZCBpbiB0dXJuXG4gIGZvciAodmFyIGkgPSAwLCBjb29yZHNQYXJzZWQsIGxlbiA9IHBhdGgubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBjdXJyZW50UGF0aCA9IHBhdGhbaV07XG5cbiAgICBjb29yZHNTdHIgPSBjdXJyZW50UGF0aC5zbGljZSgxKS50cmltKCk7XG4gICAgY29vcmRzLmxlbmd0aCA9IDA7XG5cbiAgICB3aGlsZSAoKG1hdGNoID0gZGlnaXRzLmV4ZWMoY29vcmRzU3RyKSkpIHtcbiAgICAgIGNvb3Jkcy5wdXNoKG1hdGNoWzBdKTtcbiAgICB9XG5cbiAgICBjb29yZHNQYXJzZWQgPSBbIGN1cnJlbnRQYXRoLmNoYXJBdCgwKSBdO1xuXG4gICAgZm9yICh2YXIgaiA9IDAsIGpsZW4gPSBjb29yZHMubGVuZ3RoOyBqIDwgamxlbjsgaisrKSB7XG4gICAgICBwYXJzZWQgPSBwYXJzZUZsb2F0KGNvb3Jkc1tqXSk7XG4gICAgICBpZiAoIWlzTmFOKHBhcnNlZCkpIHtcbiAgICAgICAgY29vcmRzUGFyc2VkLnB1c2gocGFyc2VkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29tbWFuZCA9IGNvb3Jkc1BhcnNlZFswXSxcbiAgICAgICAgY29tbWFuZExlbmd0aCA9IGNvbW1hbmRMZW5ndGhzW2NvbW1hbmQudG9Mb3dlckNhc2UoKV0sXG4gICAgICAgIHJlcGVhdGVkQ29tbWFuZCA9IHJlcGVhdGVkQ29tbWFuZHNbY29tbWFuZF0gfHwgY29tbWFuZDtcblxuICAgIGlmIChjb29yZHNQYXJzZWQubGVuZ3RoIC0gMSA+IGNvbW1hbmRMZW5ndGgpIHtcbiAgICAgIGZvciAodmFyIGsgPSAxLCBrbGVuID0gY29vcmRzUGFyc2VkLmxlbmd0aDsgayA8IGtsZW47IGsgKz0gY29tbWFuZExlbmd0aCkge1xuICAgICAgICByZXN1bHQucHVzaChbIGNvbW1hbmQgXS5jb25jYXQoY29vcmRzUGFyc2VkLnNsaWNlKGssIGsgKyBjb21tYW5kTGVuZ3RoKSkpO1xuICAgICAgICBjb21tYW5kID0gcmVwZWF0ZWRDb21tYW5kO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKGNvb3Jkc1BhcnNlZCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZHJhd0FyYyhnLCB4LCB5LCBjb29yZHMsIGJvdW5kcywgbCwgdCkge1xuICB2YXIgcnggPSBjb29yZHNbMF07XG4gIHZhciByeSA9IGNvb3Jkc1sxXTtcbiAgdmFyIHJvdCA9IGNvb3Jkc1syXTtcbiAgdmFyIGxhcmdlID0gY29vcmRzWzNdO1xuICB2YXIgc3dlZXAgPSBjb29yZHNbNF07XG4gIHZhciBleCA9IGNvb3Jkc1s1XTtcbiAgdmFyIGV5ID0gY29vcmRzWzZdO1xuICB2YXIgc2VncyA9IGFyY1RvU2VnbWVudHMoZXgsIGV5LCByeCwgcnksIGxhcmdlLCBzd2VlcCwgcm90LCB4LCB5KTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYmV6ID0gc2VnbWVudFRvQmV6aWVyLmFwcGx5KG51bGwsIHNlZ3NbaV0pO1xuICAgIGcuYmV6aWVyQ3VydmVUby5hcHBseShnLCBiZXopO1xuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzBdLWwsIGJlelsxXS10KTtcbiAgICAvLyBib3VuZHMuYWRkKGJlelsyXS1sLCBiZXpbM10tdCk7XG4gICAgLy8gYm91bmRzLmFkZChiZXpbNF0tbCwgYmV6WzVdLXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJvdW5kQXJjKHgsIHksIGNvb3JkcywgYm91bmRzKSB7XG4gIHZhciByeCA9IGNvb3Jkc1swXTtcbiAgdmFyIHJ5ID0gY29vcmRzWzFdO1xuICB2YXIgcm90ID0gY29vcmRzWzJdO1xuICB2YXIgbGFyZ2UgPSBjb29yZHNbM107XG4gIHZhciBzd2VlcCA9IGNvb3Jkc1s0XTtcbiAgdmFyIGV4ID0gY29vcmRzWzVdO1xuICB2YXIgZXkgPSBjb29yZHNbNl07XG4gIHZhciBzZWdzID0gYXJjVG9TZWdtZW50cyhleCwgZXksIHJ4LCByeSwgbGFyZ2UsIHN3ZWVwLCByb3QsIHgsIHkpO1xuICBmb3IgKHZhciBpPTA7IGk8c2Vncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiZXogPSBzZWdtZW50VG9CZXppZXIuYXBwbHkobnVsbCwgc2Vnc1tpXSk7XG4gICAgLy8gYm91bmRzLmFkZChiZXpbMF0sIGJlelsxXSk7XG4gICAgLy8gYm91bmRzLmFkZChiZXpbMl0sIGJlelszXSk7XG4gICAgLy8gYm91bmRzLmFkZChiZXpbNF0sIGJlels1XSk7XG4gIH1cbn1cblxudmFyIGFyY1RvU2VnbWVudHNDYWNoZSA9IHsgfSxcbiAgICBzZWdtZW50VG9CZXppZXJDYWNoZSA9IHsgfSxcbiAgICBqb2luID0gQXJyYXkucHJvdG90eXBlLmpvaW4sXG4gICAgYXJnc1N0cjtcblxuLy8gQ29waWVkIGZyb20gSW5rc2NhcGUgc3ZndG9wZGYsIHRoYW5rcyFcbmZ1bmN0aW9uIGFyY1RvU2VnbWVudHMoeCwgeSwgcngsIHJ5LCBsYXJnZSwgc3dlZXAsIHJvdGF0ZVgsIG94LCBveSkge1xuICBhcmdzU3RyID0gam9pbi5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChhcmNUb1NlZ21lbnRzQ2FjaGVbYXJnc1N0cl0pIHtcbiAgICByZXR1cm4gYXJjVG9TZWdtZW50c0NhY2hlW2FyZ3NTdHJdO1xuICB9XG5cbiAgdmFyIHRoID0gcm90YXRlWCAqIChNYXRoLlBJLzE4MCk7XG4gIHZhciBzaW5fdGggPSBNYXRoLnNpbih0aCk7XG4gIHZhciBjb3NfdGggPSBNYXRoLmNvcyh0aCk7XG4gIHJ4ID0gTWF0aC5hYnMocngpO1xuICByeSA9IE1hdGguYWJzKHJ5KTtcbiAgdmFyIHB4ID0gY29zX3RoICogKG94IC0geCkgKiAwLjUgKyBzaW5fdGggKiAob3kgLSB5KSAqIDAuNTtcbiAgdmFyIHB5ID0gY29zX3RoICogKG95IC0geSkgKiAwLjUgLSBzaW5fdGggKiAob3ggLSB4KSAqIDAuNTtcbiAgdmFyIHBsID0gKHB4KnB4KSAvIChyeCpyeCkgKyAocHkqcHkpIC8gKHJ5KnJ5KTtcbiAgaWYgKHBsID4gMSkge1xuICAgIHBsID0gTWF0aC5zcXJ0KHBsKTtcbiAgICByeCAqPSBwbDtcbiAgICByeSAqPSBwbDtcbiAgfVxuXG4gIHZhciBhMDAgPSBjb3NfdGggLyByeDtcbiAgdmFyIGEwMSA9IHNpbl90aCAvIHJ4O1xuICB2YXIgYTEwID0gKC1zaW5fdGgpIC8gcnk7XG4gIHZhciBhMTEgPSAoY29zX3RoKSAvIHJ5O1xuICB2YXIgeDAgPSBhMDAgKiBveCArIGEwMSAqIG95O1xuICB2YXIgeTAgPSBhMTAgKiBveCArIGExMSAqIG95O1xuICB2YXIgeDEgPSBhMDAgKiB4ICsgYTAxICogeTtcbiAgdmFyIHkxID0gYTEwICogeCArIGExMSAqIHk7XG5cbiAgdmFyIGQgPSAoeDEteDApICogKHgxLXgwKSArICh5MS15MCkgKiAoeTEteTApO1xuICB2YXIgc2ZhY3Rvcl9zcSA9IDEgLyBkIC0gMC4yNTtcbiAgaWYgKHNmYWN0b3Jfc3EgPCAwKSBzZmFjdG9yX3NxID0gMDtcbiAgdmFyIHNmYWN0b3IgPSBNYXRoLnNxcnQoc2ZhY3Rvcl9zcSk7XG4gIGlmIChzd2VlcCA9PSBsYXJnZSkgc2ZhY3RvciA9IC1zZmFjdG9yO1xuICB2YXIgeGMgPSAwLjUgKiAoeDAgKyB4MSkgLSBzZmFjdG9yICogKHkxLXkwKTtcbiAgdmFyIHljID0gMC41ICogKHkwICsgeTEpICsgc2ZhY3RvciAqICh4MS14MCk7XG5cbiAgdmFyIHRoMCA9IE1hdGguYXRhbjIoeTAteWMsIHgwLXhjKTtcbiAgdmFyIHRoMSA9IE1hdGguYXRhbjIoeTEteWMsIHgxLXhjKTtcblxuICB2YXIgdGhfYXJjID0gdGgxLXRoMDtcbiAgaWYgKHRoX2FyYyA8IDAgJiYgc3dlZXAgPT0gMSl7XG4gICAgdGhfYXJjICs9IDIqTWF0aC5QSTtcbiAgfSBlbHNlIGlmICh0aF9hcmMgPiAwICYmIHN3ZWVwID09IDApIHtcbiAgICB0aF9hcmMgLT0gMiAqIE1hdGguUEk7XG4gIH1cblxuICB2YXIgc2VnbWVudHMgPSBNYXRoLmNlaWwoTWF0aC5hYnModGhfYXJjIC8gKE1hdGguUEkgKiAwLjUgKyAwLjAwMSkpKTtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKHZhciBpPTA7IGk8c2VnbWVudHM7IGkrKykge1xuICAgIHZhciB0aDIgPSB0aDAgKyBpICogdGhfYXJjIC8gc2VnbWVudHM7XG4gICAgdmFyIHRoMyA9IHRoMCArIChpKzEpICogdGhfYXJjIC8gc2VnbWVudHM7XG4gICAgcmVzdWx0W2ldID0gW3hjLCB5YywgdGgyLCB0aDMsIHJ4LCByeSwgc2luX3RoLCBjb3NfdGhdO1xuICB9XG5cbiAgcmV0dXJuIChhcmNUb1NlZ21lbnRzQ2FjaGVbYXJnc1N0cl0gPSByZXN1bHQpO1xufVxuXG5mdW5jdGlvbiBzZWdtZW50VG9CZXppZXIoY3gsIGN5LCB0aDAsIHRoMSwgcngsIHJ5LCBzaW5fdGgsIGNvc190aCkge1xuICBhcmdzU3RyID0gam9pbi5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChzZWdtZW50VG9CZXppZXJDYWNoZVthcmdzU3RyXSkge1xuICAgIHJldHVybiBzZWdtZW50VG9CZXppZXJDYWNoZVthcmdzU3RyXTtcbiAgfVxuXG4gIHZhciBhMDAgPSBjb3NfdGggKiByeDtcbiAgdmFyIGEwMSA9IC1zaW5fdGggKiByeTtcbiAgdmFyIGExMCA9IHNpbl90aCAqIHJ4O1xuICB2YXIgYTExID0gY29zX3RoICogcnk7XG5cbiAgdmFyIGNvc190aDAgPSBNYXRoLmNvcyh0aDApO1xuICB2YXIgc2luX3RoMCA9IE1hdGguc2luKHRoMCk7XG4gIHZhciBjb3NfdGgxID0gTWF0aC5jb3ModGgxKTtcbiAgdmFyIHNpbl90aDEgPSBNYXRoLnNpbih0aDEpO1xuXG4gIHZhciB0aF9oYWxmID0gMC41ICogKHRoMSAtIHRoMCk7XG4gIHZhciBzaW5fdGhfaDIgPSBNYXRoLnNpbih0aF9oYWxmICogMC41KTtcbiAgdmFyIHQgPSAoOC8zKSAqIHNpbl90aF9oMiAqIHNpbl90aF9oMiAvIE1hdGguc2luKHRoX2hhbGYpO1xuICB2YXIgeDEgPSBjeCArIGNvc190aDAgLSB0ICogc2luX3RoMDtcbiAgdmFyIHkxID0gY3kgKyBzaW5fdGgwICsgdCAqIGNvc190aDA7XG4gIHZhciB4MyA9IGN4ICsgY29zX3RoMTtcbiAgdmFyIHkzID0gY3kgKyBzaW5fdGgxO1xuICB2YXIgeDIgPSB4MyArIHQgKiBzaW5fdGgxO1xuICB2YXIgeTIgPSB5MyAtIHQgKiBjb3NfdGgxO1xuXG4gIHJldHVybiAoc2VnbWVudFRvQmV6aWVyQ2FjaGVbYXJnc1N0cl0gPSBbXG4gICAgYTAwICogeDEgKyBhMDEgKiB5MSwgIGExMCAqIHgxICsgYTExICogeTEsXG4gICAgYTAwICogeDIgKyBhMDEgKiB5MiwgIGExMCAqIHgyICsgYTExICogeTIsXG4gICAgYTAwICogeDMgKyBhMDEgKiB5MywgIGExMCAqIHgzICsgYTExICogeTNcbiAgXSk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlcihnLCBwYXRoLCBsLCB0KSB7XG4gIHZhciBjdXJyZW50LCAvLyBjdXJyZW50IGluc3RydWN0aW9uXG4gICAgICBwcmV2aW91cyA9IG51bGwsXG4gICAgICB4ID0gMCwgLy8gY3VycmVudCB4XG4gICAgICB5ID0gMCwgLy8gY3VycmVudCB5XG4gICAgICBjb250cm9sWCA9IDAsIC8vIGN1cnJlbnQgY29udHJvbCBwb2ludCB4XG4gICAgICBjb250cm9sWSA9IDAsIC8vIGN1cnJlbnQgY29udHJvbCBwb2ludCB5XG4gICAgICB0ZW1wWCxcbiAgICAgIHRlbXBZLFxuICAgICAgdGVtcENvbnRyb2xYLFxuICAgICAgdGVtcENvbnRyb2xZLFxuICAgICAgYm91bmRzO1xuICBpZiAobCA9PSB1bmRlZmluZWQpIGwgPSAwO1xuICBpZiAodCA9PSB1bmRlZmluZWQpIHQgPSAwO1xuXG4gIGcuYmVnaW5QYXRoKCk7XG5cbiAgZm9yICh2YXIgaT0wLCBsZW49cGF0aC5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICBjdXJyZW50ID0gcGF0aFtpXTtcblxuICAgIHN3aXRjaCAoY3VycmVudFswXSkgeyAvLyBmaXJzdCBsZXR0ZXJcblxuICAgICAgY2FzZSAnbCc6IC8vIGxpbmV0bywgcmVsYXRpdmVcbiAgICAgICAgeCArPSBjdXJyZW50WzFdO1xuICAgICAgICB5ICs9IGN1cnJlbnRbMl07XG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdMJzogLy8gbGluZXRvLCBhYnNvbHV0ZVxuICAgICAgICB4ID0gY3VycmVudFsxXTtcbiAgICAgICAgeSA9IGN1cnJlbnRbMl07XG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdoJzogLy8gaG9yaXpvbnRhbCBsaW5ldG8sIHJlbGF0aXZlXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ0gnOiAvLyBob3Jpem9udGFsIGxpbmV0bywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd2JzogLy8gdmVydGljYWwgbGluZXRvLCByZWxhdGl2ZVxuICAgICAgICB5ICs9IGN1cnJlbnRbMV07XG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdWJzogLy8gdmVyaWNhbCBsaW5ldG8sIGFic29sdXRlXG4gICAgICAgIHkgPSBjdXJyZW50WzFdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbSc6IC8vIG1vdmVUbywgcmVsYXRpdmVcbiAgICAgICAgeCArPSBjdXJyZW50WzFdO1xuICAgICAgICB5ICs9IGN1cnJlbnRbMl07XG4gICAgICAgIGcubW92ZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdNJzogLy8gbW92ZVRvLCBhYnNvbHV0ZVxuICAgICAgICB4ID0gY3VycmVudFsxXTtcbiAgICAgICAgeSA9IGN1cnJlbnRbMl07XG4gICAgICAgIGcubW92ZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdjJzogLy8gYmV6aWVyQ3VydmVUbywgcmVsYXRpdmVcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFs1XTtcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFs2XTtcbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFszXTtcbiAgICAgICAgY29udHJvbFkgPSB5ICsgY3VycmVudFs0XTtcbiAgICAgICAgZy5iZXppZXJDdXJ2ZVRvKFxuICAgICAgICAgIHggKyBjdXJyZW50WzFdICsgbCwgLy8geDFcbiAgICAgICAgICB5ICsgY3VycmVudFsyXSArIHQsIC8vIHkxXG4gICAgICAgICAgY29udHJvbFggKyBsLCAvLyB4MlxuICAgICAgICAgIGNvbnRyb2xZICsgdCwgLy8geTJcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCArIGN1cnJlbnRbMV0sIHkgKyBjdXJyZW50WzJdKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnQyc6IC8vIGJlemllckN1cnZlVG8sIGFic29sdXRlXG4gICAgICAgIHggPSBjdXJyZW50WzVdO1xuICAgICAgICB5ID0gY3VycmVudFs2XTtcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzNdO1xuICAgICAgICBjb250cm9sWSA9IGN1cnJlbnRbNF07XG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcbiAgICAgICAgICBjdXJyZW50WzFdICsgbCxcbiAgICAgICAgICBjdXJyZW50WzJdICsgdCxcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIHggKyBsLFxuICAgICAgICAgIHkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY3VycmVudFsxXSwgY3VycmVudFsyXSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3MnOiAvLyBzaG9ydGhhbmQgY3ViaWMgYmV6aWVyQ3VydmVUbywgcmVsYXRpdmVcbiAgICAgICAgLy8gdHJhbnNmb3JtIHRvIGFic29sdXRlIHgseVxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzNdO1xuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzRdO1xuICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50c1xuICAgICAgICBjb250cm9sWCA9IDIgKiB4IC0gY29udHJvbFg7XG4gICAgICAgIGNvbnRyb2xZID0gMiAqIHkgLSBjb250cm9sWTtcbiAgICAgICAgZy5iZXppZXJDdXJ2ZVRvKFxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcbiAgICAgICAgICBjb250cm9sWSArIHQsXG4gICAgICAgICAgeCArIGN1cnJlbnRbMV0gKyBsLFxuICAgICAgICAgIHkgKyBjdXJyZW50WzJdICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4ICsgY3VycmVudFsxXSwgeSArIGN1cnJlbnRbMl0pO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG5cbiAgICAgICAgLy8gc2V0IGNvbnRyb2wgcG9pbnQgdG8gMm5kIG9uZSBvZiB0aGlzIGNvbW1hbmRcbiAgICAgICAgLy8gXCIuLi4gdGhlIGZpcnN0IGNvbnRyb2wgcG9pbnQgaXMgYXNzdW1lZCB0byBiZSB0aGUgcmVmbGVjdGlvbiBvZiB0aGUgc2Vjb25kIGNvbnRyb2wgcG9pbnQgb24gdGhlIHByZXZpb3VzIGNvbW1hbmQgcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgcG9pbnQuXCJcbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFsxXTtcbiAgICAgICAgY29udHJvbFkgPSB5ICsgY3VycmVudFsyXTtcblxuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ1MnOiAvLyBzaG9ydGhhbmQgY3ViaWMgYmV6aWVyQ3VydmVUbywgYWJzb2x1dGVcbiAgICAgICAgdGVtcFggPSBjdXJyZW50WzNdO1xuICAgICAgICB0ZW1wWSA9IGN1cnJlbnRbNF07XG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXG4gICAgICAgIGNvbnRyb2xYID0gMip4IC0gY29udHJvbFg7XG4gICAgICAgIGNvbnRyb2xZID0gMip5IC0gY29udHJvbFk7XG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIGN1cnJlbnRbMV0gKyBsLFxuICAgICAgICAgIGN1cnJlbnRbMl0gKyB0LFxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY3VycmVudFsxXSwgY3VycmVudFsyXSk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICAvLyBzZXQgY29udHJvbCBwb2ludCB0byAybmQgb25lIG9mIHRoaXMgY29tbWFuZFxuICAgICAgICAvLyBcIi4uLiB0aGUgZmlyc3QgY29udHJvbCBwb2ludCBpcyBhc3N1bWVkIHRvIGJlIHRoZSByZWZsZWN0aW9uIG9mIHRoZSBzZWNvbmQgY29udHJvbCBwb2ludCBvbiB0aGUgcHJldmlvdXMgY29tbWFuZCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBwb2ludC5cIlxuICAgICAgICBjb250cm9sWCA9IGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFsyXTtcblxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAncSc6IC8vIHF1YWRyYXRpY0N1cnZlVG8sIHJlbGF0aXZlXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0byBhYnNvbHV0ZSB4LHlcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFs0XTtcblxuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzFdO1xuICAgICAgICBjb250cm9sWSA9IHkgKyBjdXJyZW50WzJdO1xuXG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnUSc6IC8vIHF1YWRyYXRpY0N1cnZlVG8sIGFic29sdXRlXG4gICAgICAgIHRlbXBYID0gY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzRdO1xuXG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcbiAgICAgICAgICBjdXJyZW50WzFdICsgbCxcbiAgICAgICAgICBjdXJyZW50WzJdICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBjb250cm9sWCA9IGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFsyXTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0JzogLy8gc2hvcnRoYW5kIHF1YWRyYXRpY0N1cnZlVG8sIHJlbGF0aXZlXG5cbiAgICAgICAgLy8gdHJhbnNmb3JtIHRvIGFic29sdXRlIHgseVxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzFdO1xuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzJdO1xuXG4gICAgICAgIGlmIChwcmV2aW91c1swXS5tYXRjaCgvW1FxVHRdLykgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBwcmV2aW91cyBjb21tYW5kIG9yIGlmIHRoZSBwcmV2aW91cyBjb21tYW5kIHdhcyBub3QgYSBRLCBxLCBUIG9yIHQsXG4gICAgICAgICAgLy8gYXNzdW1lIHRoZSBjb250cm9sIHBvaW50IGlzIGNvaW5jaWRlbnQgd2l0aCB0aGUgY3VycmVudCBwb2ludFxuICAgICAgICAgIGNvbnRyb2xYID0geDtcbiAgICAgICAgICBjb250cm9sWSA9IHk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocHJldmlvdXNbMF0gPT09ICd0Jykge1xuICAgICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzIGZvciB0XG4gICAgICAgICAgY29udHJvbFggPSAyICogeCAtIHRlbXBDb250cm9sWDtcbiAgICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gdGVtcENvbnRyb2xZO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByZXZpb3VzWzBdID09PSAncScpIHtcbiAgICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50cyBmb3IgcVxuICAgICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcbiAgICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gY29udHJvbFk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZW1wQ29udHJvbFggPSBjb250cm9sWDtcbiAgICAgICAgdGVtcENvbnRyb2xZID0gY29udHJvbFk7XG5cbiAgICAgICAgZy5xdWFkcmF0aWNDdXJ2ZVRvKFxuICAgICAgICAgIGNvbnRyb2xYICsgbCxcbiAgICAgICAgICBjb250cm9sWSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFsxXTtcbiAgICAgICAgY29udHJvbFkgPSB5ICsgY3VycmVudFsyXTtcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdUJzpcbiAgICAgICAgdGVtcFggPSBjdXJyZW50WzFdO1xuICAgICAgICB0ZW1wWSA9IGN1cnJlbnRbMl07XG5cbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHNcbiAgICAgICAgY29udHJvbFggPSAyICogeCAtIGNvbnRyb2xYO1xuICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gY29udHJvbFk7XG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnYSc6XG4gICAgICAgIGRyYXdBcmMoZywgeCArIGwsIHkgKyB0LCBbXG4gICAgICAgICAgY3VycmVudFsxXSxcbiAgICAgICAgICBjdXJyZW50WzJdLFxuICAgICAgICAgIGN1cnJlbnRbM10sXG4gICAgICAgICAgY3VycmVudFs0XSxcbiAgICAgICAgICBjdXJyZW50WzVdLFxuICAgICAgICAgIGN1cnJlbnRbNl0gKyB4ICsgbCxcbiAgICAgICAgICBjdXJyZW50WzddICsgeSArIHRcbiAgICAgICAgXSwgYm91bmRzLCBsLCB0KTtcbiAgICAgICAgeCArPSBjdXJyZW50WzZdO1xuICAgICAgICB5ICs9IGN1cnJlbnRbN107XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdBJzpcbiAgICAgICAgZHJhd0FyYyhnLCB4ICsgbCwgeSArIHQsIFtcbiAgICAgICAgICBjdXJyZW50WzFdLFxuICAgICAgICAgIGN1cnJlbnRbMl0sXG4gICAgICAgICAgY3VycmVudFszXSxcbiAgICAgICAgICBjdXJyZW50WzRdLFxuICAgICAgICAgIGN1cnJlbnRbNV0sXG4gICAgICAgICAgY3VycmVudFs2XSArIGwsXG4gICAgICAgICAgY3VycmVudFs3XSArIHRcbiAgICAgICAgXSwgYm91bmRzLCBsLCB0KTtcbiAgICAgICAgeCA9IGN1cnJlbnRbNl07XG4gICAgICAgIHkgPSBjdXJyZW50WzddO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAneic6XG4gICAgICBjYXNlICdaJzpcbiAgICAgICAgZy5jbG9zZVBhdGgoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHByZXZpb3VzID0gY3VycmVudDtcbiAgfVxuICByZXR1cm47IC8vIGJvdW5kcy50cmFuc2xhdGUobCwgdCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwYXJzZTogIHBhcnNlLFxuICByZW5kZXI6IHJlbmRlclxufTtcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xuXG5cbi8qKlxuICogVGV4dCBOb2RlXG4gKlxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcbiAqXG4gKiBmb250OiBDYW52YXMtQVBJIGZvcm1hdHRlZCBmb250IHN0cmluZywgZm9yIGV4YW1wbGUgJ2JvbGQgMTJweCBzZXJpZidcbiAqIHRleHRBbGlnbiwgdGV4dEJhc2VsaW5lOiBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcbiAqIGZpbGxTdHlsZSwgc3Ryb2tlU3R5bGUsIGxpbmVXaWR0aCwgbGluZUNhcCwgbGluZUpvaW46IGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxuICovXG52YXIgVGV4dCA9IGZ1bmN0aW9uKCkge1xuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5cblRleHQucHJvdG90eXBlID0gXy5leHRlbmQoVGV4dC5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xuICAgIGN0eC5mb250ID0gdGhpcy5mb250IHx8ICcxMHB4IHNhbnMtc2VyaWYnO1xuICAgIGN0eC50ZXh0QWxpZ24gPSB0aGlzLnRleHRBbGlnbiB8fCAnc3RhcnQnO1xuICAgIGN0eC50ZXh0QmFzZWxpbmUgPSB0aGlzLnRleHRCYXNlbGluZSB8fCAnYWxwaGFiZXRpYyc7XG5cbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcbiAgICAgIGN0eC5maWxsVGV4dCh0aGlzLnRleHQsIDAsIDApO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZTtcbiAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xuICAgICAgY3R4LmxpbmVKb2luID0gdGhpcy5saW5lSm9pbiB8fCAnbWl0ZXInO1xuICAgICAgY3R4LnN0cm9rZVRleHQodGhpcy50ZXh0LCAwLCAwKTtcbiAgICB9XG4gIH0sXG5cbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcbiAgICAvLyBYWFggU2l6ZSBjYWxjdWxhdGlvbnMgLSBmb250LCBmb250LXNpemUsIGhlaWdodFxuICAgIHZhciB3aWR0aCA9IGN0eC5tZWFzdXJlVGV4dCh0aGlzLnRleHQpO1xuICAgIHZhciBoZWlnaHQgPSAxMDtcblxuICAgIGlmIChseCA+PSAwICYmIGx4IDwgd2lkdGggJiYgbHkgPj0gMCAmJiBseSA8IGhlaWdodCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHQ7IiwiXG52YXIgVXRpbCA9IHtcblxuICBleHRlbmQ6IGZ1bmN0aW9uKGRlc3QsIHNvdXJjZXMpIHtcbiAgICB2YXIga2V5LCBpLCBzb3VyY2U7XG4gICAgZm9yIChpPTE7IGk8YXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgZGVzdFtrZXldID0gc291cmNlW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlc3Q7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDsiXX0=
(4)
});
