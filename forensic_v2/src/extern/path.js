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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFx3b3Jrc3BhY2VcXHBhdGhqc1xcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9hcmMuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9hcnJvdy5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL2NpcmNsZS5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL2dyb3VwLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvaW1hZ2UuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9saW5lLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvbWFpbi5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL25vZGUuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy9wYXRoLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvcG9seWZpbGxzLmpzIiwiQzovd29ya3NwYWNlL3BhdGhqcy9zcmMvcmVjdC5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL3N2Zy5qcyIsIkM6L3dvcmtzcGFjZS9wYXRoanMvc3JjL3RleHQuanMiLCJDOi93b3Jrc3BhY2UvcGF0aGpzL3NyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcbnZhciBOT05FID0gW107XHJcblxyXG5cclxudmFyIEFyYyA9IGZ1bmN0aW9uKCkge1xyXG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcbkFyYy5wcm90b3R5cGUgPSBfLmV4dGVuZChBcmMucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xyXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMuc291cmNlIHx8IHt4OjAseTowfTtcclxuICAgIHZhciBkZXN0ID0gdGhpcy50YXJnZXQgfHwge3g6MCx5OjB9O1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuc3Ryb2tlU3R5bGUgfHwgJ2JsYWNrJztcclxuICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLmxpbmVXaWR0aCB8fCAxO1xyXG4gICAgY3R4LnNldExpbmVEYXNoKHRoaXMubGluZURhc2ggfHwgTk9ORSk7XHJcbiAgICBjdHguc2V0TGluZURhc2hPZmZzZXQodGhpcy5saW5lRGFzaE9mZnNldCB8fCAwKTtcclxuICAgIGN0eC5tb3ZlVG8oc291cmNlLngsc291cmNlLnkpO1xyXG4gICAgY3R4LnF1YWRyYXRpY0N1cnZlVG8oc291cmNlLngsZGVzdC55LGRlc3QueCxkZXN0LnkpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gIH0sXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICAvLyBubyBoaXQgdGVzdGluZyBmb3IgYXJjc1xyXG4gIH1cclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcmM7XHJcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XHJcblxyXG52YXIgTk9ORSA9IFtdO1xyXG5cclxuXHJcbnZhciBBcnJvdyA9IGZ1bmN0aW9uKCkge1xyXG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufTtcclxuXHJcbkFycm93LnByb3RvdHlwZSA9IF8uZXh0ZW5kKEFycm93LnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcclxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcclxuICAgIHZhciBzb3VyY2UgPSB0aGlzLnNvdXJjZSB8fCB7eDowLHk6MH07XHJcbiAgICB2YXIgZGVzdCA9IHRoaXMudGFyZ2V0IHx8IHt4OjAseTowfTtcclxuICAgIHZhciBoZWFkbGVuID0gMTAgfHwgdGhpcy5oZWFkTGVuZ3RoO1xyXG4gICAgdmFyIGhlYWRBbmdsZSA9IE1hdGguUEkvNiB8fCB0aGlzLmhlYWRBbmdsZTtcclxuICAgIHZhciBoZWFkT2Zmc2V0ID0gMCB8fCB0aGlzLmhlYWRPZmZzZXQ7XHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZSB8fCAnYmxhY2snO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XHJcbiAgICB2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKGRlc3QueS1zb3VyY2UueSxkZXN0Lngtc291cmNlLngpO1xyXG5cclxuICAgIHZhciB4Q29tcE9mZnNldCA9IDAsIHlDb21wT2Zmc2V0ID0gMDtcclxuICAgIGlmIChoZWFkT2Zmc2V0KSB7XHJcbiAgICAgIHhDb21wT2Zmc2V0ID0gaGVhZE9mZnNldCAqIE1hdGguY29zKGFuZ2xlKTtcclxuICAgICAgeUNvbXBPZmZzZXQgPSBoZWFkT2Zmc2V0ICogTWF0aC5zaW4oYW5nbGUpO1xyXG4gICAgfVxyXG4gICAgY3R4Lm1vdmVUbyhzb3VyY2UueCwgc291cmNlLnkpO1xyXG4gICAgY3R4LmxpbmVUbyhkZXN0LngsIGRlc3QueSk7XHJcbiAgICBjdHgubW92ZVRvKGRlc3QueC14Q29tcE9mZnNldCxkZXN0LnkteUNvbXBPZmZzZXQpO1xyXG4gICAgY3R4LmxpbmVUbyhkZXN0LngteENvbXBPZmZzZXQtaGVhZGxlbipNYXRoLmNvcyhhbmdsZS1oZWFkQW5nbGUpLGRlc3QueS15Q29tcE9mZnNldC1oZWFkbGVuKk1hdGguc2luKGFuZ2xlLWhlYWRBbmdsZSkpO1xyXG4gICAgY3R4Lm1vdmVUbyhkZXN0LngteENvbXBPZmZzZXQsZGVzdC55LXlDb21wT2Zmc2V0KTtcclxuICAgIGN0eC5saW5lVG8oZGVzdC54LXhDb21wT2Zmc2V0LWhlYWRsZW4qTWF0aC5jb3MoYW5nbGUraGVhZEFuZ2xlKSxkZXN0LnkteUNvbXBPZmZzZXQtaGVhZGxlbipNYXRoLnNpbihhbmdsZStoZWFkQW5nbGUpKTtcclxuICAgIGN0eC5zdHJva2UoKTtcclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICB9LFxyXG5cclxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xyXG4gICAgLy8gbm8gaGl0IHRlc3RpbmcgZm9yIEFycm93c1xyXG4gIH1cclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcnJvdztcclxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcbnZhciBOT05FID0gW107XHJcblxyXG4vKipcclxuICogQ2lyY2wgTm9kZVxyXG4gKlxyXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxyXG4gKlxyXG4gKiByYWRpdXMgOiB0aGUgcmFkaXVzIG9mIHRoZSBjaXJjbGVcclxuICogKHgseSkgOiBjb3JyZXNwb25kIHRvIHRoZSBjZW50ZXIgb2YgdGhlIGNpcmNsZVxyXG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGg6XHJcbiAqICAgYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXHJcbiAqIGxpbmVEYXNoOiBhbiBhcnJheSBzcGVjaWZ5aW5nIG9uL29mZiBwaXhlbCBwYXR0ZXJuXHJcbiAqICAgKGUuZy4gWzEwLCA1XSA9IDEwIHBpeGVscyBvbiwgNSBwaXhlbHMgb2ZmKSAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXHJcbiAqIGxpbmVEYXNoT2Zmc2V0OiBhIHBpeGVsIG9mZnNldCB0byBzdGFydCB0aGUgZGFzaGVzIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcclxuICpcclxuICogTm90ZTogcGlja2luZyBpcyBhbHdheXMgZW5hYmxlZCBvbiB0aGUgZW50aXJlIGNpcmNsZSAobm8gc3Ryb2tlLW9ubHkgcGlja2luZykgYXRcclxuICogdGhlIG1vbWVudC5cclxuICovXHJcbnZhciBDaXJjbGUgPSBmdW5jdGlvbigpIHtcclxuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgdGhpcy5yYWRpdXMyID0gdGhpcy5yYWRpdXMqdGhpcy5yYWRpdXM7XHJcbn07XHJcblxyXG5cclxuQ2lyY2xlLnByb3RvdHlwZSA9IF8uZXh0ZW5kKENpcmNsZS5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XHJcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XHJcbiAgICB2YXIgcmFkaXVzID0gdGhpcy5yYWRpdXMgfHwgMDtcclxuXHRjdHguYmVnaW5QYXRoKCk7XHJcblx0Y3R4LmFyYygwLDAsIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcclxuXHJcbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcclxuXHQgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcclxuXHQgIGN0eC5maWxsKCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xyXG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xyXG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcclxuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xyXG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XHJcbiAgICAgIGN0eC5taXRlckxpbWl0ID0gdGhpcy5taXRlckxpbWl0IHx8IDEwO1xyXG4gICAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcclxuICAgICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XHJcbiAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH1cclxuXHRjdHguY2xvc2VQYXRoKCk7XHJcbiAgfSxcclxuXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuXHR2YXIgZGlzdCA9IGx4Kmx4ICsgbHkqbHk7XHJcbiAgICBpZiAoZGlzdCA8IHRoaXMucmFkaXVzMikge1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2lyY2xlOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XHJcblxyXG5cclxuLyoqXHJcbiAqIEdyb3VwIChjb250YWluZXIpIG5vZGUgaW4gdGhlIHNjZW5lZ3JhcGguIEhhcyBubyB2aXN1YWwgcmVwcmVzZW50YXRpb24uXHJcbiAqXHJcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XHJcbiAqXHJcbiAqIGNsaXA6IHt4LCB5LCB3aWR0aCwgaGVpZ2h0fSBTcGVjaWZpZXMgYW4gb3B0aW9uYWwgcmVjdGFuZ3VsYXIgY2xpcHBpbmcgcmVjdGFuZ2xlXHJcbiAqICAgdGhhdCBhcHBsaWVzIHRvIGFsbCBjaGlsZCBub2Rlcy5cclxuICpcclxuICogTm90ZTogYXBwbHlpbmcgb3BhY2l0eSB0byBHcm91cHMgaXMgc3VwcG9ydGVkIGJ1dCBub3QgY3VtbXVsYXRpdmUuIFNwZWNpZmljYWxseSxcclxuICogaWYgYSBjaGlsZCBub2RlIHNldHMgb3BhY2l0eSBpdCB3aWxsIG92ZXJyaWRlIHRoZSBncm91cC1sZXZlbCBvcGFjaXR5LCBub3RcclxuICogYWNjdW11bGF0ZSBpdC4gQXMgc3VjaCB0aGUgZ3JvdXAgb3BhY2l0eSBzaW1wbHkgc3VwcGxpZXMgdGhlIGRlZmF1bHQgb3BhY2l0eVxyXG4gKiB0byBjaGlsZCBub2Rlcy5cclxuICovXHJcbnZhciBHcm91cCA9IGZ1bmN0aW9uKCkge1xyXG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xyXG59O1xyXG5cclxuXHJcbkdyb3VwLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEdyb3VwLnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcclxuXHJcbiAgLyoqXHJcbiAgICogQWRkcyBhIGNoaWxkIG5vZGUgdG8gdGhpcyBncm91cCwgb3B0aW9uYWxseSBpbmNsdWRpbmcgdGhlIGBpbmRleGBcclxuICAgKiBhdCB3aGljaCB0byBpbnNlcnQuIElmIGBpbmRleGAgaXMgb21pdHRlZCwgdGhlIG5vZGUgaXMgYWRkZWQgYXQgdGhlXHJcbiAgICogZW5kICh2aXN1YWxseSBvbiB0b3ApIG9mIHRoZSBleGlzdCBsaXN0IG9mIGNoaWxkcmVuLlxyXG4gICAqL1xyXG4gIGFkZENoaWxkOiBmdW5jdGlvbihjaGlsZCwgaW5kZXgpIHtcclxuICAgIGNoaWxkLnBhcmVudCA9IHRoaXM7XHJcbiAgICBpZiAoaW5kZXggIT0gbnVsbCAmJiBpbmRleCA8PSB0aGlzLmNoaWxkcmVuLmxlbmd0aCkge1xyXG4gICAgICB0aGlzLmNoaWxkcmVuLnNwbGljZShpbmRleCwgMCwgY2hpbGQpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIFJlbW92ZXMgYSBzcGVjaWZpZWQgY2hpbGQgZnJvbSB0aGlzIGdyb3VwLiBJZiB0aGUgY2hpbGQgZXhpc3RzIGluXHJcbiAgICogdGhpcyBncm91cCBpdCBpcyByZW1vdmVkIGFuZCByZXR1cm5lZC5cclxuICAgKi9cclxuICByZW1vdmVDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHtcclxuICAgIC8vIFJlbW92ZSBjaGlsZFxyXG4gICAgdmFyIGlkeCA9IHRoaXMuY2hpbGRyZW4uaW5kZXhPZihjaGlsZCk7XHJcbiAgICBpZiAoaWR4ID49IDApIHtcclxuICAgICAgdGhpcy5jaGlsZHJlbi5zcGxpY2UoaWR4LCAxKTtcclxuICAgICAgY2hpbGQucGFyZW50ID0gbnVsbDtcclxuICAgICAgcmV0dXJuIGNoaWxkO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIFJlbW92ZXMgYWxsIGNoaWxkcmVuIGZyb20gdGhlIGdyb3VwLiAgIFJldHVybnMgYSBsaXN0IG9mIGFsbCBjaGlsZHJlblxyXG4gICAqIHJlbW92ZWQuXHJcbiAgICovXHJcbiAgcmVtb3ZlQWxsOiBmdW5jdGlvbigpIHtcclxuICAgIHZhciByZW1vdmVkTGlzdCA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoLTE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgIHZhciByZW1vdmVkID0gdGhpcy5yZW1vdmVDaGlsZCh0aGlzLmNoaWxkcmVuW2ldKTtcclxuICAgICAgaWYgKHJlbW92ZWQpIHtcclxuICAgICAgICByZW1vdmVkTGlzdC5wdXNoKHJlbW92ZWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVtb3ZlZExpc3Q7XHJcbiAgfSxcclxuXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuO1xyXG4gICAgdmFyIGNsaXAgPSB0aGlzLmNsaXA7XHJcbiAgICB2YXIgcmVzdWx0O1xyXG5cclxuICAgIGlmICh0aGlzLm5vSGl0KSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY2xpcCkge1xyXG4gICAgICBpZiAobHggPCBjbGlwLnggfHwgbHggPiBjbGlwLngrY2xpcC53aWR0aCAmJiBseSA8IGNsaXAueSAmJiBseSA+IGNsaXAueStjbGlwLmhlaWdodCkge1xyXG4gICAgICAgIC8vIFBpY2sgcG9pbnQgaXMgb3V0IG9mIGNsaXAgcmVjdFxyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIERlZmVyIHBpY2tpbmcgdG8gY2hpbGRyZW4gLSBzdGFydCBhdCB0b3Agb2Ygc3RhY2sgKGVuZCBvZiBjaGlsZCBsaXN0KVxyXG4gICAgLy8gYW5kIHdvcmsgYmFja3dhcmRzLCBleGl0IGVhcmx5IGlmIGhpdCBmb3VuZFxyXG4gICAgZm9yICh2YXIgaT1jaGlsZHJlbi5sZW5ndGgtMTsgaT49MCAmJiAhcmVzdWx0OyBpLS0pIHtcclxuICAgICAgcmVzdWx0ID0gY2hpbGRyZW5baV0ucGljayhjdHgsIHgsIHksIGx4LCBseSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9LFxyXG5cclxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcclxuICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW47XHJcblxyXG4gICAgaWYgKHRoaXMuY2xpcCkge1xyXG4gICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgIGN0eC5yZWN0KHRoaXMuY2xpcC54LCB0aGlzLmNsaXAueSwgdGhpcy5jbGlwLndpZHRoLCB0aGlzLmNsaXAuaGVpZ2h0KTtcclxuICAgICAgY3R4LmNsaXAoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZW5kZXIgY2hpbGRyZW4gZnJvbSBib3R0b20tdXBcclxuICAgIGZvciAodmFyIGk9MCwgbD1jaGlsZHJlbi5sZW5ndGg7IGk8bDsgaSsrKSB7XHJcbiAgICAgIGNoaWxkcmVuW2ldLnJlbmRlcihjdHgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmNsaXApIHtcclxuICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XHJcbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XHJcblxyXG4vKipcclxuICogUmFzdGVyIEltYWdlIE5vZGVcclxuICpcclxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcclxuICpcclxuICogc3JjOiB1cmwgKHJlbGF0aXZlIG9yIGZ1bGx5IHF1YWxpZmllZCkgZnJvbSB3aGljaCB0byBsb2FkIGltYWdlXHJcbiAqIHdpZHRoOiB3aWR0aCBvZiB0aGUgcmVuZGVyZWQgcmVwcmVzZW50YXRpb24gb2YgdGhlIGltYWdlIChpbiBwaXhlbHMpLlxyXG4gKiAgIElmIHVuc2V0L251bGwsIHRoZSBuYXR1cmFsIHdpZHRoIG9mIHRoZSBpbWFnZSB3aWxsIGJlIHVzZWRcclxuICogaGVpZ2h0OiBoZWlnaHQgb2YgdGhlIHJlbmRlcmVkIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBpbWFnZSAoaW4gcGl4ZWxzKS5cclxuICogICBJZiB1bnNldC9udWxsLCB0aGUgbmF0dXJhbCBoZWlnaHQgb2YgdGhlIGltYWdlIHdpbGwgYmUgdXNlZFxyXG4gKi9cclxudmFyIEltYWdlTm9kZSA9IGZ1bmN0aW9uKCkge1xyXG4gIE5vZGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgdGhpcy5fbG9hZGVkID0gZmFsc2U7XHJcbn07XHJcblxyXG5cclxuSW1hZ2VOb2RlLnByb3RvdHlwZSA9IF8uZXh0ZW5kKEltYWdlTm9kZS5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XHJcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XHJcbiAgICB2YXIgc2VsZjtcclxuXHJcbiAgICBpZiAodGhpcy5faW1hZ2UgJiYgdGhpcy5faW1hZ2UubG9hZGVkKSB7XHJcbiAgICAgIC8vIEltYWdlXHJcbiAgICAgIGlmICh0aGlzLndpZHRoICE9IG51bGwgfHwgdGhpcy5oZWlnaHQgIT0gbnVsbCkge1xyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcy5faW1hZ2UsIDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2ltYWdlLCAwLCAwKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIGlmICghdGhpcy5faW1hZ2UpIHtcclxuICAgICAgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHRoaXMuX2ltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICAgIHRoaXMuX2ltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIE9ubHkgcmVuZGVyIHNjZW5lIGlmIGxvYWRlZCBpbWFnZSBpcyBzdGlsbCBwYXJ0IG9mIGl0XHJcbiAgICAgICAgaWYgKHRoaXMgPT09IHNlbGYuX2ltYWdlKSB7XHJcbiAgICAgICAgICBzZWxmLl9pbWFnZS5sb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgc2VsZi50cmlnZ2VyKCd1cGRhdGUnKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIHRoaXMuX2ltYWdlLnNyYyA9IHRoaXMuc3JjO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoIHx8ICh0aGlzLl9pbWFnZSAmJiB0aGlzLl9pbWFnZS53aWR0aCk7XHJcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgKHRoaXMuX2ltYWdlICYmIHRoaXMuX2ltYWdlLmhlaWdodCk7XHJcblxyXG4gICAgaWYgKGx4ID49IDAgJiYgbHggPCB3aWR0aCAmJiBseSA+PSAwICYmIGx5IDwgaGVpZ2h0KSB7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcblxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEltYWdlTm9kZS5wcm90b3R5cGUsICdzcmMnLCB7XHJcbiAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLl9zcmM7XHJcbiAgfSxcclxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICBpZiAodGhpcy5fc3JjICE9PSB2YWx1ZSkge1xyXG4gICAgICB0aGlzLl9zcmMgPSB2YWx1ZTtcclxuICAgICAgdGhpcy5faW1hZ2UgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBJbWFnZU5vZGU7IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcbnZhciBOT05FID0gW107XHJcblxyXG4vKipcclxuICogUmVjdGFuZ2xlIE5vZGVcclxuICpcclxuICogUHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBOb2RlOiB2aXNpYmxlLCB4LCB5LCByb3RhdGlvbiwgc2NhbGVYLCBzY2FsZVksIG9wYWNpdHlcclxuICpcclxuICogd2lkdGg6IHdpZHRoIG9mIHRoZSByZWN0YW5nbGVcclxuICogaGVpZ2h0OiBoZWlnaHQgb2YgdGhlIHJlY3RhbmdsZVxyXG4gKiBmaWxsU3R5bGUsIHN0cm9rZVN0eWxlLCBsaW5lV2lkdGgsIGxpbmVDYXAsIGxpbmVKb2luLCBtaXRlckxpbWl0OlxyXG4gKiAgIGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxyXG4gKiBsaW5lRGFzaDogYW4gYXJyYXkgc3BlY2lmeWluZyBvbi9vZmYgcGl4ZWwgcGF0dGVyblxyXG4gKiAgIChlLmcuIFsxMCwgNV0gPSAxMCBwaXhlbHMgb24sIDUgcGl4ZWxzIG9mZikgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxyXG4gKiBsaW5lRGFzaE9mZnNldDogYSBwaXhlbCBvZmZzZXQgdG8gc3RhcnQgdGhlIGRhc2hlcyAobm90IHN1cHBvcnRlZCBpbiBhbGwgYnJvd3NlcnMpXHJcbiAqXHJcbiAqIE5vdGU6IHBpY2tpbmcgaXMgYWx3YXlzIGVuYWJsZWQgb24gdGhlIGVudGlyZSByZWN0IChubyBzdHJva2Utb25seSBwaWNraW5nKSBhdFxyXG4gKiB0aGUgbW9tZW50LlxyXG4gKi9cclxudmFyIExpbmUgPSBmdW5jdGlvbigpIHtcclxuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn07XHJcblxyXG5MaW5lLnByb3RvdHlwZSA9IF8uZXh0ZW5kKExpbmUucHJvdG90eXBlLCBOb2RlLnByb3RvdHlwZSwge1xyXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMuc291cmNlIHx8IHt4OjAseTowfTtcclxuICAgIHZhciBkZXN0ID0gdGhpcy50YXJnZXQgfHwge3g6MCx5OjB9O1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZSB8fCAnYmxhY2snO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XHJcbiAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcclxuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCh0aGlzLmxpbmVEYXNoT2Zmc2V0IHx8IDApO1xyXG4gICAgY3R4Lm1vdmVUbyhzb3VyY2UueCxzb3VyY2UueSk7XHJcbiAgICBjdHgubGluZVRvKGRlc3QueCxkZXN0LnkpO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gIH0sXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICAvLyBubyBoaXQgdGVzdGluZyBmb3IgbGluZXNcclxuICB9XHJcbn0pO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGluZTtcclxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIHBvbHlmaWxsID0gcmVxdWlyZSgnLi9wb2x5ZmlsbHMnKTtcclxudmFyIEdyb3VwID0gcmVxdWlyZSgnLi9ncm91cCcpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgc2NlbmVncmFwaCByb290IGVsZW1lbnQgd2hpY2ggaW1wbGVtZW50cyBhbiBleHRlbmRlZFxyXG4gKiBHcm91cCBpbnRlcmZhY2UuIEV4cGVjdHMgYSBgY2FudmFzYCBIVE1MIGVsZW1lbnQuXHJcbiAqL1xyXG52YXIgUGF0aCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcclxuICAvLyBBdXRvaW5zdGFudGlhdGVcclxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGF0aCkpIHtcclxuICAgIHJldHVybiBuZXcgUGF0aChlbGVtZW50KTtcclxuICB9XHJcbiAgR3JvdXAuYXBwbHkodGhpcyk7XHJcblxyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdGhpcy5lbCA9IGVsZW1lbnQ7XHJcbiAgdGhpcy5jb250ZXh0ID0gZWxlbWVudC5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG4gIC8vIEFkZCBoZWxwZXIgcG9seWZpbGxzIHRvIGNvbnRleHQgaW5zdGFuY2VcclxuICBwb2x5ZmlsbC5kYXNoU3VwcG9ydCh0aGlzLmNvbnRleHQpO1xyXG5cclxuICAvLyBPZmZzZXQgYnkgMS8yIHBpeGVsIHRvIGFsaWduIHdpdGggcGl4ZWwgZWRnZXNcclxuICAvLyBodHRwOi8vZGl2ZWludG9odG1sNS5pbmZvL2NhbnZhcy5odG1sI3BpeGVsLW1hZG5lc3NcclxuICB0aGlzLnggPSAwLjU7XHJcbiAgdGhpcy55ID0gMC41O1xyXG5cclxuICB0aGlzLnpvb21MZXZlbCA9IDEuMDtcclxuXHJcbiAgLy8gQmluZCBtZW1iZXJzIGZvciBjb252ZW5pZW50IGNhbGxiYWNrXHJcbiAgdGhpcy51cGRhdGUgPSB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpO1xyXG4gIHRoaXMuX2hhbmRsZSA9IHRoaXMuX2hhbmRsZS5iaW5kKHRoaXMpO1xyXG4gIHRoaXMuX21vdXNlbW92ZSA9IHRoaXMuX21vdXNlbW92ZS5iaW5kKHRoaXMpO1xyXG5cclxuICAvLyBSZWdpc3RlciBldmVudCBsaXN0ZW5lcnMgb24gY2FudmFzIHRoYXQgdXNlIHBpY2tlciB0byBoaXR0ZXN0XHJcbiAgWydjbGljaycsICdkYmxjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCddLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xyXG4gICAgc2VsZi5lbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIHNlbGYuX2hhbmRsZSk7XHJcbiAgfSk7XHJcbiAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9tb3VzZW1vdmUpO1xyXG5cclxuICAvLyBMaXN0ZW4gZm9yIHVwZGF0ZSByZXF1ZXN0cyBmcm9tIHNjZW5lZ3JhcGgsIGRlZmVyIGJ5IGEgZnJhbWUsIGNvYWxlc2NlXHJcbiAgdGhpcy5fcGVuZGluZ1VwZGF0ZSA9IG51bGw7XHJcbiAgdGhpcy5vbigndXBkYXRlJywgZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAoIXNlbGYuX3BlbmRpbmdVcGRhdGUpIHtcclxuICAgICAgc2VsZi5fcGVuZGluZ1VwZGF0ZSA9IHBvbHlmaWxsLnJlcXVlc3RBbmltYXRpb25GcmFtZSggc2VsZi51cGRhdGUgKTtcclxuICAgIH1cclxuICB9KTtcclxuICAvLyBDcmVhdGUgYW5pbWF0ZS11cGRhdGUgZnVuY3Rpb24gb25jZVxyXG4gIHRoaXMuX2FuaW1VcGRhdGUgPSBmdW5jdGlvbigpIHtcclxuICAgIFRXRUVOLnVwZGF0ZSgpO1xyXG4gICAgc2VsZi51cGRhdGUoKTtcclxuICB9O1xyXG5cclxuICAvLyBSZXNpemUgdG8gY3VycmVudCBET00tc3BlY2lmaWVkIHNpemluZ1xyXG4gIHRoaXMucmVzaXplKCk7XHJcbn07XHJcblxyXG5cclxuXy5leHRlbmQoUGF0aC5wcm90b3R5cGUsIEdyb3VwLnByb3RvdHlwZSwge1xyXG4gIC8qKlxyXG4gICAqIFJlc2l6ZSBvciB1cGRhdGUgdGhlIHNpemUgb2YgdGhlIGNhbnZhcy4gQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIHdpbGwgZml4XHJcbiAgICogdGhlIGNzcy1zdHlsZS1zcGVjaWZpZWQgc2l6ZSBvZiB0aGUgY2FudmFzIGVsZW1lbnQuIENhbGwgYHVwZGF0ZSgpYFxyXG4gICAqIHRvIGNhdXNlIHRoZSBjYW52YXMgdG8gcmVyZW5kZXIgYXQgdGhlIG5ldyBzaXplLlxyXG4gICAqXHJcbiAgICogU3RyaWN0IHNpemluZyBpcyBuZWNlc3NhcnkgdG8gc2V0IHRoZSBjYW52YXMgd2lkdGgvaGVpZ2h0IHBpeGVsIGNvdW50XHJcbiAgICogdG8gdGhlIGNvcnJlY3QgdmFsdWUgZm9yIHRoZSBjYW52YXMgZWxlbWVudCBET00gc2l6ZSBhbmQgZGV2aWNlIHBpeGVsXHJcbiAgICogcmF0aW8uXHJcbiAgICovXHJcbiAgcmVzaXplOiBmdW5jdGlvbih3LCBoKSB7XHJcbiAgICAvLyBUT0RPIHRoaXMgbWF5IG5vdCBiZSByZWxpYWJsZSBvbiBtb2JpbGVcclxuICAgIHRoaXMuZGV2aWNlUGl4ZWxSYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDE7XHJcblxyXG4gICAgdGhpcy53aWR0aCA9IHcgfHwgdGhpcy5lbC5jbGllbnRXaWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0ID0gaCB8fCB0aGlzLmVsLmNsaWVudEhlaWdodDtcclxuXHJcbiAgICB0aGlzLmVsLnN0eWxlLndpZHRoID0gdGhpcy53aWR0aCArICdweCc7XHJcbiAgICB0aGlzLmVsLnN0eWxlLmhlaWdodCA9IHRoaXMuaGVpZ2h0ICsgJ3B4JztcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBDYXVzZXMgdGhlIGNhbnZhcyB0byByZW5kZXIgc3luY2hyb25vdXNseS4gSWYgYW55IGFuaW1hdGlvbnMgYXJlIGFjdGl2ZS9wZW5kaW5nXHJcbiAgICogdGhpcyB3aWxsIGtpY2sgb2ZmIGEgc2VyaWVzIG9mIGF1dG9tYXRpYyB1cGRhdGVzIHVudGlsIHRoZSBhbmltYXRpb25zIGFsbFxyXG4gICAqIGNvbXBsZXRlLlxyXG4gICAqL1xyXG4gIHVwZGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBVcGRhdGUgc2l6ZSB0byBlcXVhbCBkaXNwbGF5ZWQgcGl4ZWwgc2l6ZSArIGNsZWFyXHJcbiAgICB0aGlzLmNvbnRleHQuY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCAqIHRoaXMuZGV2aWNlUGl4ZWxSYXRpbztcclxuICAgIHRoaXMuY29udGV4dC5jYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKiB0aGlzLmRldmljZVBpeGVsUmF0aW87XHJcbiAgICBpZiAodGhpcy5kZXZpY2VQaXhlbFJhdGlvICE9IDEpIHtcclxuICAgICAgdGhpcy5jb250ZXh0LnNhdmUoKTtcclxuICAgICAgdGhpcy5jb250ZXh0LnNjYWxlKHRoaXMuZGV2aWNlUGl4ZWxSYXRpbywgdGhpcy5kZXZpY2VQaXhlbFJhdGlvKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9wZW5kaW5nVXBkYXRlID0gbnVsbDtcclxuXHJcbiAgICAvLyBBY3RpdmUgYW5pbWF0aW9ucz8gc2NoZWR1bGUgdHdlZW4gdXBkYXRlICsgcmVuZGVyIG9uIG5leHQgZnJhbWVcclxuICAgIGlmICh3aW5kb3cuVFdFRU4gJiYgVFdFRU4uZ2V0QWxsKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAvLyBYWFggQ291bGQgYmUgYW4gZXhpc3RpbmcgcGVuZGluZyB1cGRhdGVcclxuICAgICAgdGhpcy5fcGVuZGluZ1VwZGF0ZSA9IHBvbHlmaWxsLnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl9hbmltVXBkYXRlKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnJlbmRlcih0aGlzLmNvbnRleHQpO1xyXG5cclxuICAgIGlmICh0aGlzLmRldmljZVBpeGVsUmF0aW8gIT0gMSkge1xyXG4gICAgICB0aGlzLmNvbnRleHQucmVzdG9yZSgpO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIHpvb21JbjogZnVuY3Rpb24oeCx5KSB7XHJcblx0dGhpcy56b29tTGV2ZWwrKztcclxuXHR0aGlzLnpvb20odGhpcy56b29tTGV2ZWwseCx5KTtcclxuICB9LFxyXG4gIHpvb21PdXQ6IGZ1bmN0aW9uKHgseSkge1xyXG5cdHRoaXMuem9vbUxldmVsLS07XHJcblx0dGhpcy56b29tKHRoaXMuem9vbUxldmVsLHgseSk7XHJcbiAgfSxcclxuXHJcbiAgem9vbTogZnVuY3Rpb24obGV2ZWwseCx5KSB7XHJcbiAgICB0aGlzLnNjYWxlWCA9IGxldmVsO1xyXG4gICAgdGhpcy5zY2FsZVkgPSBsZXZlbDtcclxuXHR0aGlzLnVwZGF0ZSgpO1xyXG4gIH0sXHJcblxyXG4gIC8vIEdlbmVyYWwgaGFuZGxlciBmb3Igc2ltcGxlIGV2ZW50cyAoY2xpY2ssIG1vdXNlZG93biwgZXRjKVxyXG4gIF9oYW5kbGU6IGZ1bmN0aW9uKGUpIHtcclxuICAgIHZhciBoaXQgPSB0aGlzLnBpY2sodGhpcy5jb250ZXh0LCBlLm9mZnNldFgsIGUub2Zmc2V0WSwgZS5vZmZzZXRYLCBlLm9mZnNldFkpO1xyXG4gICAgaWYgKGhpdCkge1xyXG4gICAgICBlLnRhcmdldE5vZGUgPSBoaXQ7XHJcbiAgICAgIGhpdC50cmlnZ2VyKGUudHlwZSwgZSk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgX21vdXNlbW92ZTogZnVuY3Rpb24oZSkge1xyXG4gICAgdmFyIGhpdCA9IHRoaXMucGljayh0aGlzLmNvbnRleHQsIGUub2Zmc2V0WCwgZS5vZmZzZXRZLCBlLm9mZnNldFgsIGUub2Zmc2V0WSk7XHJcbiAgICBpZiAoaGl0KSB7XHJcbiAgICAgIGUudGFyZ2V0Tm9kZSA9IGhpdDtcclxuICAgIH1cclxuICAgIC8vIE1hbmFnZSBtb3VzZW91dC9tb3VzZW92ZXJcclxuICAgIC8vIFRPRE8gY3JlYXRlIG5ldyBldmVudCBvYmplY3RzIHdpdGggY29ycmVjdCBldmVudCB0eXBlXHJcbiAgICBpZiAodGhpcy5fbGFzdG92ZXIgIT0gaGl0KSB7XHJcbiAgICAgIGlmICh0aGlzLl9sYXN0b3Zlcikge1xyXG4gICAgICAgIGUudGFyZ2V0Tm9kZSA9IHRoaXMuX2xhc3RvdmVyO1xyXG4gICAgICAgIHRoaXMuX2xhc3RvdmVyLnRyaWdnZXIoJ21vdXNlb3V0JywgZSk7XHJcbiAgICAgICAgZS50YXJnZXROb2RlID0gaGl0O1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuX2xhc3RvdmVyID0gaGl0O1xyXG4gICAgICBpZiAoaGl0KSB7XHJcbiAgICAgICAgaGl0LnRyaWdnZXIoJ21vdXNlb3ZlcicsIGUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBBbHdheXMgc2VuZCBtb3VzZW1vdmUgbGFzdFxyXG4gICAgaWYgKGhpdCkge1xyXG4gICAgICBoaXQudHJpZ2dlcignbW91c2Vtb3ZlJywgZSk7XHJcbiAgICB9XHJcbiAgICAvLyBUT0RPIEhhbmRsZSBtb3VzZSBsZWF2aW5nIGNhbnZhc1xyXG4gIH1cclxufSk7XHJcblxyXG5cclxuXHJcbi8vIFNUQVRJQ1xyXG5cclxuLy8gQWRkIGxpYnJhcnkgY29uc3RydWN0cyB0byBuYW1lc3BhY2VcclxudmFyIG5hbWVzcGFjZUNvbnN0cnVjdG9ycyA9IHtcclxuICByZWN0OiByZXF1aXJlKCcuL3JlY3QnKSxcclxuICBwYXRoOiByZXF1aXJlKCcuL3BhdGgnKSxcclxuICB0ZXh0OiByZXF1aXJlKCcuL3RleHQnKSxcclxuICBpbWFnZTogcmVxdWlyZSgnLi9pbWFnZScpLFxyXG4gIGNpcmNsZTogcmVxdWlyZSgnLi9jaXJjbGUnKSxcclxuICBsaW5lOiByZXF1aXJlKCcuL2xpbmUnKSxcclxuICBhcmM6IHJlcXVpcmUoJy4vYXJjJyksXHJcbiAgYXJyb3c6IHJlcXVpcmUoJy4vYXJyb3cnKSxcclxuICBncm91cDogR3JvdXBcclxufTtcclxuXHJcbmZvciAoYXR0ciBpbiBuYW1lc3BhY2VDb25zdHJ1Y3RvcnMpIHtcclxuICBQYXRoW2F0dHJdID0gKGZ1bmN0aW9uKGF0dHIpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbihwcm9wcykge1xyXG4gICAgICByZXR1cm4gbmV3IG5hbWVzcGFjZUNvbnN0cnVjdG9yc1thdHRyXShwcm9wcyk7XHJcbiAgICB9O1xyXG4gIH0oYXR0cikpO1xyXG59XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQYXRoO1xyXG4iLCJ2YXIgXyA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG5cclxudmFyIElEID0gMDtcclxuXHJcbi8qKlxyXG4gKiBCYXNlIE5vZGUgb2JqZWN0IGZvciBhbGwgc2NlbmVncmFwaCBvYmplY3RzXHJcbiAqXHJcbiAqIGlkOiBub24tdmlzdWFsLCB1bmlxdWUgdmFsdWUgZm9yIGFsbCBub2Rlc1xyXG4gKiB2aXNpYmxlOiBpZiBmYWxzZSwgdGhpcyBub2RlIChhbmQgZGVzY2VuZGVudHMpIHdpbGwgbm90IHJlbmRlciBub3IgcGlja1xyXG4gKiB4OiB0aGUgeCBwb3NpdGlvbiAodHJhbnNsYXRpb24pIGFwcGxpZWQgdG8gdGhpcyBub2RlXHJcbiAqIHk6IHRoZSB5IHBvc2l0aW9uICh0cmFuc2xhdGlvbikgYXBwbGllZCB0byB0aGlzIG5vZGVcclxuICogcm90YXRpb246IHJvdGF0aW9uIGluIHJhZGlhbnMgYXBwbGllZCB0byB0aGlzIG5vZGUgYW5kIGFueSBkZXNjZW5kZW50c1xyXG4gKiBzY2FsZVgsIHNjYWxlWTogeCBhbmQgeSBzY2FsZSBhcHBsaWVkIHRvIHRoaXMgbm9kZSBhbmQgYW55IGRlc2NlbmRlbnRzXHJcbiAqIG9wYWNpdHk6IHRoZSBnbG9iYWwgb3BhY2l0eSBbMCwxXSBvZiB0aGlzIG5vZGVcclxuICovXHJcbnZhciBOb2RlID0gZnVuY3Rpb24oYXR0cmlidXRlcykge1xyXG4gIHRoaXMuaWQgPSBJRCsrO1xyXG4gIHRoaXMucGFyZW50ID0gbnVsbDtcclxuICB0aGlzLnZpc2libGUgPSB0cnVlO1xyXG4gIHRoaXMuaGFuZGxlcnMgPSB7fTtcclxuXHJcbiAgXy5leHRlbmQodGhpcywgYXR0cmlidXRlcyk7XHJcbn07XHJcblxyXG52YXIgZ2V0RWFzaW5nQmFzZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuXHR2YXIgc3RyaW5nTWFwID0ge1xyXG5cdFx0J2JhY2snOiBUV0VFTi5FYXNpbmcuQmFjayxcclxuXHRcdCdib3VuY2UnOiBUV0VFTi5FYXNpbmcuQm91bmNlLFxyXG5cdFx0J2NpcmN1bGFyJzogVFdFRU4uRWFzaW5nLkNpcmN1bGFyLFxyXG5cdFx0J2N1YmljJzogVFdFRU4uRWFzaW5nLkN1YmljLFxyXG5cdFx0J2VsYXN0aWMnOiBUV0VFTi5FYXNpbmcuRWxhc3RpYyxcclxuXHRcdCdleHBvbmVudGlhbCc6IFRXRUVOLkVhc2luZy5FeHBvbmVudGlhbCxcclxuXHRcdCdsaW5lYXInOiBUV0VFTi5FYXNpbmcuTGluZWFyLFxyXG5cdFx0J3F1YWRyYXRpYyc6IFRXRUVOLkVhc2luZy5RdWFkcmF0aWMsXHJcblx0XHQncXVhcnRpYyc6IFRXRUVOLkVhc2luZy5RdWFydGljLFxyXG5cdFx0J3F1aW50aWMnOiBUV0VFTi5FYXNpbmcuUXVpbnRpY1xyXG5cdH07XHJcblx0Zm9yICh2YXIgZWFzZSBpbiBzdHJpbmdNYXApIHtcclxuXHRcdGlmIChzdHJpbmdNYXAuaGFzT3duUHJvcGVydHkoZWFzZSkpIHtcclxuXHRcdFx0aWYgKG5hbWUuaW5kZXhPZihlYXNlKSE9PS0xKSB7XHJcblx0XHRcdFx0cmV0dXJuIHN0cmluZ01hcFtlYXNlXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHRyZXR1cm4gVFdFRU4uRWFzaW5nLkxpbmVhcjtcclxufTtcclxuXHJcbnZhciBnZXRFYXNpbmdGdW5jdGlvbiA9IGZ1bmN0aW9uKG5hbWUpe1xyXG5cdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XHJcblx0dmFyIGVhc2VCYXNlID0gZ2V0RWFzaW5nQmFzZShuYW1lKTtcclxuXHR2YXIgZWFzZSA9IG51bGw7XHJcblx0aWYgKG5hbWUuaW5kZXhPZignaW5vdXQnKSE9LTEpIHtcclxuXHRcdGVhc2UgPSBlYXNlQmFzZS5Jbk91dFxyXG5cdH0gZWxzZSBpZiAobmFtZS5pbmRleE9mKCdpbicpIT0tMSkge1xyXG5cdFx0ZWFzZSA9IGVhc2VCYXNlLkluO1xyXG5cdH0gZWxzZSBpZiAobmFtZS5pbmRleE9mKCdvdXQnKSE9LTEpIHtcclxuXHRcdGVhc2UgPSBlYXNlQmFzZS5PdXQ7XHJcblx0fVxyXG5cdGlmICghZWFzZSkge1xyXG5cdFx0ZWFzZSA9IGVhc2VCYXNlLk5vbmU7XHJcblx0fVxyXG5cdHJldHVybiBlYXNlO1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUgPSB7XHJcbiAgLyoqXHJcbiAgICogU2ltcGxlXHJcbiAgICovXHJcbiAgZGF0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLl9kYXRhID0gZGF0YTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBCdWxrIHNldHMgYSBncm91cCBvZiBub2RlIHByb3BlcnRpZXMsIHRha2VzIGEgbWFwIG9mIHByb3BlcnR5IG5hbWVzXHJcbiAgICogdG8gdmFsdWVzLiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBzZXR0aW5nIGVhY2ggcHJvcGVydHkgdmlhXHJcbiAgICogYG5vZGUucHJvcGVydHlOYW1lID0gdmFsdWVgXHJcbiAgICovXHJcbiAgYXR0cjogZnVuY3Rpb24oYXR0cmlidXRlcykge1xyXG4gICAgXy5leHRlbmQodGhpcywgYXR0cmlidXRlcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuICB0d2Vlbk9iajogZnVuY3Rpb24oYmFzZVByb3AsYXR0cmlidXRlcyx0cmFuc2l0aW9uKSB7XHJcblx0ICB0aGlzLnR3ZWVuQXR0ci5jYWxsKHRoaXNbYmFzZVByb3BdLGF0dHJpYnV0ZXMsdHJhbnNpdGlvbik7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogUXVldWVzIGEgc2V0IG9mIG5vZGUgcHJvcGVydGllcyBmb3IgYW4gYW5pbWF0ZWQgdHJhbnNpdGlvbi4gT25seVxyXG4gICAqIG51bWVyaWMgcHJvcGVydGllcyBjYW4gYmUgYW5pbWF0ZWQuIFRoZSBsZW5ndGggb2YgdGhlIHRyYW5zaXRpb25cclxuICAgKiBpcyBzcGVjaWZpZWQgaW4gdGhlIHRyYW5zaXRpb24gcHJvcGVydHksIGRlZmF1bHRzIHRvIDEgc2Vjb25kLiBBblxyXG4gICAqIG9wdGlvbmFsIGNhbGxiYWNrIGNhbiBiZSBwcm92aWRlZCB3aGljaCB3aWxsIGJlIGNhbGxlZCBvbiBhbmltYXRpb25cclxuICAgKiBjb21wbGV0aW9uLlxyXG4gICAqXHJcbiAgICogQ2FsbGluZyBgdXBkYXRlKClgIG9uIHRoZSBzY2VuZSByb290IHdpbGwgdHJpZ2dlciB0aGUgc3RhcnQgb2YgYWxsXHJcbiAgICogcXVldWVkIGFuaW1hdGlvbnMgYW5kIGNhdXNlIHRoZW0gdG8gcnVuIChhbmQgcmVuZGVyKSB0byBjb21wbGV0aW9uLlxyXG4gICAqL1xyXG4gIHR3ZWVuQXR0cjogZnVuY3Rpb24oYXR0cmlidXRlcywgdHJhbnNpdGlvbikge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIGtleSwgc3RhdGljcztcclxuICAgIHRyYW5zaXRpb24gPSB0cmFuc2l0aW9uIHx8IHt9O1xyXG5cclxuICAgIC8vIE9ubHkgc3VwcG9ydCB0d2VlbmluZyBudW1iZXJzIC0gc3RhdGljYWxseSBzZXQgZXZlcnl0aGluZyBlbHNlXHJcbiAgICBmb3IgKGtleSBpbiBhdHRyaWJ1dGVzKSB7XHJcbiAgICAgIGlmIChhdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KGtleSkgJiYgdHlwZW9mIGF0dHJpYnV0ZXNba2V5XSAhPSAnbnVtYmVyJykge1xyXG4gICAgICAgIHN0YXRpY3MgPSBzdGF0aWNzIHx8IHt9O1xyXG4gICAgICAgIHN0YXRpY3Nba2V5XSA9IGF0dHJpYnV0ZXNba2V5XTtcclxuICAgICAgICBkZWxldGUgYXR0cmlidXRlc1trZXldO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHN0YXRpY3MpIHtcclxuICAgICAgdGhpcy5hdHRyKHN0YXRpY3MpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnR3ZWVuKSB7XHJcbiAgICAgIC8vIFRPRE8gSnVtcCB0byBlbmQgc3RhdGUgb2YgdmFycyBub3QgYmVpbmcgdHJhbnNpdGlvbmVkXHJcbiAgICAgIHRoaXMudHdlZW4uc3RvcCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudHdlZW4gPSBuZXcgVFdFRU4uVHdlZW4odGhpcylcclxuICAgICAgLnRvKGF0dHJpYnV0ZXMsIHRyYW5zaXRpb24uZHVyYXRpb24gfHwgMTAwMClcclxuXHQgIC5lYXNpbmcoZ2V0RWFzaW5nRnVuY3Rpb24odHJhbnNpdGlvbi5lYXNpbmcgfHwgJ2xpbmVhcicpKVxyXG4gICAgICAub25Db21wbGV0ZShmdW5jdGlvbigpIHtcclxuICAgICAgICBzZWxmLnR3ZWVuID0gbnVsbDtcclxuICAgICAgICBpZiAodHJhbnNpdGlvbi5jYWxsYmFjaykge1xyXG4gICAgICAgICAgdHJhbnNpdGlvbi5jYWxsYmFjayh0aGlzLCBhdHRyaWJ1dGVzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICAgIC5zdGFydCgpO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZHMgYW4gZXZlbnQgaGFuZGxlciB0byB0aGlzIG5vZGUuIEZvciBleGFtcGxlOlxyXG4gICAqIGBgYFxyXG4gICAqIG5vZGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgKiAgIC8vIGRvIHNvbWV0aGluZ1xyXG4gICAqIH0pO1xyXG4gICAqIGBgYFxyXG4gICAqIEFuIGV2ZW50IG9iamVjdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgaGFuZGxlciB3aGVuIHRoZSBldmVudFxyXG4gICAqIGlzIHRyaWdnZXJlZC4gVGhlIGV2ZW50IG9iamVjdCB3aWxsIGJlIGEgc3RhbmRhcmQgSmF2YVNjcmlwdFxyXG4gICAqIGV2ZW50IGFuZCB3aWxsIGNvbnRhaW4gYSBgdGFyZ2V0Tm9kZWAgcHJvcGVydHkgY29udGFpbmluZyB0aGVcclxuICAgKiBub2RlIHRoYXQgd2FzIHRoZSBzb3VyY2Ugb2YgdGhlIGV2ZW50LiBFdmVudHMgYnViYmxlIHVwIHRoZVxyXG4gICAqIHNjZW5lZ3JhcGggdW50aWwgaGFuZGxlZC4gSGFuZGxlcnMgcmV0dXJuaW5nIGEgdHJ1dGh5IHZhbHVlXHJcbiAgICogc2lnbmFsIHRoYXQgdGhlIGV2ZW50IGhhcyBiZWVuIGhhbmRsZWQuXHJcbiAgICovXHJcbiAgb246IGZ1bmN0aW9uKHR5cGUsIGhhbmRsZXIpIHtcclxuICAgIHZhciBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbdHlwZV07XHJcbiAgICBpZiAoIWhhbmRsZXJzKSB7XHJcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5oYW5kbGVyc1t0eXBlXSA9IFtdO1xyXG4gICAgfVxyXG4gICAgaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIFJlbW92ZXMgYW4gZXZlbnQgaGFuZGxlciBvZiB0aGUgZ2l2ZW4gdHlwZS4gSWYgbm8gaGFuZGxlciBpc1xyXG4gICAqIHByb3ZpZGVkLCBhbGwgaGFuZGxlcnMgb2YgdGhlIHR5cGUgd2lsbCBiZSByZW1vdmVkLlxyXG4gICAqL1xyXG4gIG9mZjogZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xyXG4gICAgaWYgKCFoYW5kbGVyKSB7XHJcbiAgICAgIHRoaXMuaGFuZGxlcnNbdHlwZV0gPSBbXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBoYW5kbGVycyA9IHRoaXMuaGFuZGxlcnNbdHlwZV07XHJcbiAgICAgIHZhciBpZHggPSBoYW5kbGVycy5pbmRleE9mKGhhbmRsZXIpO1xyXG4gICAgICBpZiAoaWR4ID49IDApIHtcclxuICAgICAgICBoYW5kbGVycy5zcGxpY2UoaWR4LCAxKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogVHJpZ2dlcnMgYW4gZXZlbnQgYW5kIGJlZ2lucyBidWJibGluZy4gUmV0dXJucyB0cnV0aHkgaWYgdGhlXHJcbiAgICogZXZlbnQgd2FzIGhhbmRsZWQuXHJcbiAgICovXHJcbiAgdHJpZ2dlcjogZnVuY3Rpb24odHlwZSwgZXZlbnQpIHtcclxuICAgIHZhciBoYW5kbGVkID0gZmFsc2U7XHJcbiAgICB2YXIgaGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzW3R5cGVdO1xyXG5cclxuICAgIGlmIChoYW5kbGVycykge1xyXG4gICAgICBoYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcclxuICAgICAgICBoYW5kbGVkID0gaGFuZGxlcihldmVudCkgfHwgaGFuZGxlZDtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFoYW5kbGVkICYmIHRoaXMucGFyZW50KSB7XHJcbiAgICAgIGhhbmRsZWQgPSB0aGlzLnBhcmVudC50cmlnZ2VyKHR5cGUsIGV2ZW50KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaGFuZGxlZDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBSZW1vdmVzIHRoaXMgbm9kZSBmcm9tIGl0cyBwYXJlbnRcclxuICAgKi9cclxuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKHRoaXMucGFyZW50KSB7XHJcbiAgICAgIHRoaXMucGFyZW50LnJlbW92ZSh0aGlzKTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBJbnRlcm5hbDogcmVuZGVycyB0aGUgbm9kZSBnaXZlbiB0aGUgY29udGV4dFxyXG4gICAqL1xyXG4gIHJlbmRlcjogZnVuY3Rpb24oY3R4KSB7XHJcbiAgICBpZiAoIXRoaXMudmlzaWJsZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHggPSB0aGlzLnggfHwgMDtcclxuICAgIHZhciB5ID0gdGhpcy55IHx8IDA7XHJcbiAgICB2YXIgc2NhbGVYID0gdGhpcy5zY2FsZVggPT0gbnVsbCA/IDEgOiB0aGlzLnNjYWxlWDtcclxuICAgIHZhciBzY2FsZVkgPSB0aGlzLnNjYWxlWSA9PSBudWxsID8gMSA6IHRoaXMuc2NhbGVZO1xyXG4gICAgdmFyIHRyYW5zZm9ybWVkID0gISF4IHx8ICEheSB8fCAhIXRoaXMucm90YXRpb24gfHwgc2NhbGVYICE9PSAxIHx8IHNjYWxlWSAhPT0gMSB8fCB0aGlzLm9wYWNpdHkgIT0gbnVsbDtcclxuXHJcbiAgICAvLyBUT0RPIEludmVzdGlnYXRlIGNvc3Qgb2YgYWx3YXlzIHNhdmUvcmVzdG9yZVxyXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XHJcbiAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHggfHwgeSkge1xyXG4gICAgICBjdHgudHJhbnNsYXRlKHgseSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNjYWxlWCAhPT0gMSB8fCBzY2FsZVkgIT09IDEpIHtcclxuICAgICAgY3R4LnNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5yb3RhdGlvbikge1xyXG4gICAgICBjdHgucm90YXRlKHRoaXMucm90YXRpb24pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLm9wYWNpdHkgIT0gbnVsbCkge1xyXG4gICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLm9wYWNpdHk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5kcmF3KGN0eCk7XHJcblxyXG4gICAgaWYgKHRyYW5zZm9ybWVkKSB7XHJcbiAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogSW50ZXJuYWw6IHRlc3RzIGZvciBwaWNrIGhpdCBnaXZlbiBjb250ZXh0LCBnbG9iYWwgYW5kIGxvY2FsXHJcbiAgICogY29vcmRpbmF0ZSBzeXN0ZW0gdHJhbnNmb3JtZWQgcGljayBjb29yZGluYXRlcy5cclxuICAgKi9cclxuICBwaWNrOiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xyXG4gICAgaWYgKCF0aGlzLnZpc2libGUpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciByZXN1bHQgPSBudWxsO1xyXG4gICAgdmFyIHMsIGMsIHRlbXA7XHJcblxyXG4gICAgdmFyIHR4ID0gdGhpcy54IHx8IDA7XHJcbiAgICB2YXIgdHkgPSB0aGlzLnkgfHwgMDtcclxuICAgIHZhciBzY2FsZVggPSB0aGlzLnNjYWxlWCA9PSBudWxsID8gMSA6IHRoaXMuc2NhbGVYO1xyXG4gICAgdmFyIHNjYWxlWSA9IHRoaXMuc2NhbGVZID09IG51bGwgPyAxIDogdGhpcy5zY2FsZVk7XHJcbiAgICB2YXIgdHJhbnNmb3JtZWQgPSAhIXR4IHx8ICEhdHkgfHwgISF0aGlzLnJvdGF0aW9uIHx8IHNjYWxlWCAhPT0gMSB8fCBzY2FsZVkgIT09IDEgfHwgdGhpcy5vcGFjaXR5ICE9IG51bGw7XHJcblxyXG4gICAgLy8gVE9ETyBJbnZlc3RpZ2F0ZSBjb3N0IG9mIGFsd2F5cyBzYXZlL3Jlc3RvcmVcclxuICAgIGlmICh0cmFuc2Zvcm1lZCkge1xyXG4gICAgICBjdHguc2F2ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0eCB8fCB0eSkge1xyXG4gICAgICBjdHgudHJhbnNsYXRlKHR4LHR5KTtcclxuICAgICAgLy8gUmV2ZXJzZSB0cmFuc2xhdGlvbiBvbiBwaWNrZWQgcG9pbnRcclxuICAgICAgbHggLT0gdHg7XHJcbiAgICAgIGx5IC09IHR5O1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzY2FsZVggIT09IDEgfHwgc2NhbGVZICE9PSAxKSB7XHJcbiAgICAgIGN0eC5zY2FsZShzY2FsZVgsIHNjYWxlWSk7XHJcbiAgICAgIC8vIFJldmVyc2Ugc2NhbGVcclxuICAgICAgbHggLz0gc2NhbGVYO1xyXG4gICAgICBseSAvPSBzY2FsZVk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMucm90YXRpb24pIHtcclxuICAgICAgY3R4LnJvdGF0ZSh0aGlzLnJvdGF0aW9uKTtcclxuICAgICAgLy8gUmV2ZXJzZSByb3RhdGlvblxyXG4gICAgICBzID0gTWF0aC5zaW4oLXRoaXMucm90YXRpb24pO1xyXG4gICAgICBjID0gTWF0aC5jb3MoLXRoaXMucm90YXRpb24pO1xyXG4gICAgICB0ZW1wID0gYypseCAtIHMqbHk7XHJcbiAgICAgIGx5ID0gcypseCArIGMqbHk7XHJcbiAgICAgIGx4ID0gdGVtcDtcclxuICAgIH1cclxuXHJcbiAgICByZXN1bHQgPSB0aGlzLmhpdFRlc3QoY3R4LCB4LCB5LCBseCwgbHkpO1xyXG5cclxuICAgIGlmICh0cmFuc2Zvcm1lZCkge1xyXG4gICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogVGVtcGxhdGUgbWV0aG9kIGZvciBkZXJpdmVkIG9iamVjdHMgdG8gYWN0dWFsbHkgcGVyZm9ybSBkcmF3IG9wZXJhdGlvbnMuXHJcbiAgICogVGhlIGNhbGxpbmcgYHJlbmRlcmAgY2FsbCBoYW5kbGVzIGdlbmVyYWwgdHJhbnNmb3JtcyBhbmQgb3BhY2l0eS5cclxuICAgKi9cclxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcclxuICAgIC8vIHRlbXBsYXRlIG1ldGhvZFxyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIFRlbXBsYXRlIG1ldGhvZCBmb3IgZGVyaXZlZCBvYmplY3RzIHRvIHRlc3QgaWYgdGhleSAob3IgY2hpbGQpIGlzIGhpdCBieVxyXG4gICAqIHRoZSBwcm92aWRlZCBwaWNrIGNvb3JkaW5hdGUuIElmIGhpdCwgcmV0dXJuIG9iamVjdCB0aGF0IHdhcyBoaXQuXHJcbiAgICovXHJcbiAgaGl0VGVzdDogZnVuY3Rpb24oY3R4LCB4LCB5LCBseCwgbHkpIHtcclxuICAgIC8vIHRlbXBsYXRlIG1ldGhvZFxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOb2RlOyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XHJcbnZhciBzdmcgPSByZXF1aXJlKCcuL3N2ZycpO1xyXG5cclxuXHJcbnZhciBOT05FID0gW107XHJcblxyXG4vKipcclxuICogVmVjdG9yIFBhdGggTm9kZVxyXG4gKlxyXG4gKiBQcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIE5vZGU6IHZpc2libGUsIHgsIHksIHJvdGF0aW9uLCBzY2FsZVgsIHNjYWxlWSwgb3BhY2l0eVxyXG4gKlxyXG4gKiBwYXRoOiBhIHZhbGlkIFNWRyBwYXRoIHN0cmluZyAoZS5nLiAnTS01LDBBNSw1LDAsMCwxLDUsMEE1LDUsMCwwLDEsLTUsMFonKVxyXG4gKiAgIHRvIGRyYXdcclxuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoLCBsaW5lQ2FwLCBsaW5lSm9pbiwgbWl0ZXJMaW1pdDpcclxuICogICBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcclxuICogbGluZURhc2g6IGFuIGFycmF5IHNwZWNpZnlpbmcgb24vb2ZmIHBpeGVsIHBhdHRlcm5cclxuICogICAoZS5nLiBbMTAsIDVdID0gMTAgcGl4ZWxzIG9uLCA1IHBpeGVscyBvZmYpIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcclxuICogbGluZURhc2hPZmZzZXQ6IGEgcGl4ZWwgb2Zmc2V0IHRvIHN0YXJ0IHRoZSBkYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxyXG4gKlxyXG4gKiBOb3RlOiBpZiBgc3Ryb2tlU3R5bGVgIGlzIHNwZWNpZmllZCwgcGlja2luZyB3aWxsIGJlIGVuYWJsZWQgb24gdGhlIHBhdGggc3Ryb2tlL291dGxpbmUuXHJcbiAqIElmIGBmaWxsU3R5bGVgIGlzIHNwZWNpZmllZCwgcGlja2luZyB3aWxsIGJlIGVuYWJsZWQgb24gdGhlIGludGVyaW9yIGZpbGxlZCBhcmVhXHJcbiAqIG9mIHRoZSBwYXRoLlxyXG4gKi9cclxudmFyIFBhdGggPSBmdW5jdGlvbigpIHtcclxuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn07XHJcblxyXG5cclxuUGF0aC5wcm90b3R5cGUgPSBfLmV4dGVuZChQYXRoLnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcclxuXHJcbiAgc2tldGNoOiBmdW5jdGlvbihjdHgpIHtcclxuICAgIHZhciBwYXRoID0gdGhpcy5wYXRoO1xyXG4gICAgaWYgKHBhdGggJiYgcGF0aC5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHZhciBwYXRoQ29tbWFuZHMgPSB0aGlzLl9jb21tYW5kQ2FjaGUgfHwgKHRoaXMuX2NvbW1hbmRDYWNoZSA9IHN2Zy5wYXJzZShwYXRoKSk7XHJcbiAgICAgIHN2Zy5yZW5kZXIoY3R4LCBwYXRoQ29tbWFuZHMpO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGRyYXc6IGZ1bmN0aW9uKGN0eCkge1xyXG4gICAgaWYgKHRoaXMuZmlsbFN0eWxlKSB7XHJcbiAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZpbGxTdHlsZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xyXG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xyXG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcclxuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xyXG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XHJcbiAgICAgIGN0eC5taXRlckxpbWl0ID0gdGhpcy5taXRlckxpbWl0IHx8IDEwO1xyXG4gICAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcclxuICAgICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5za2V0Y2goY3R4KTtcclxuXHJcbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xyXG4gICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcclxuICAgICAgY3R4LmZpbGwoKTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBoaXRUZXN0OiBmdW5jdGlvbihjdHgsIHgsIHksIGx4LCBseSkge1xyXG4gICAgdGhpcy5za2V0Y2goY3R4KTtcclxuXHJcbiAgICBpZiAodGhpcy5maWxsU3R5bGUgJiYgY3R4LmlzUG9pbnRJblBhdGgoeCx5KSkge1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIGlmICh0aGlzLnN0cm9rZVN0eWxlICYmIGN0eC5pc1BvaW50SW5TdHJva2UoeCx5KSkge1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuXHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQYXRoLnByb3RvdHlwZSwgJ3BhdGgnLCB7XHJcbiAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0aGlzLl9wYXRoO1xyXG4gIH0sXHJcbiAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgaWYgKHRoaXMuX3BhdGggIT09IHZhbHVlKSB7XHJcbiAgICAgIHRoaXMuX3BhdGggPSB2YWx1ZTtcclxuICAgICAgdGhpcy5fY29tbWFuZENhY2hlID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGF0aDsiLCJcclxuLy8gLS0tLVxyXG4vLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcclxuXHJcbi8vIGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXHJcbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcclxuXHJcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcclxuXHJcbi8vIE1JVCBsaWNlbnNlXHJcblxyXG52YXIgckFGID0gKGZ1bmN0aW9uKCkge1xyXG4gIHZhciByQUY7XHJcblxyXG4gIGlmICh3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XHJcbiAgICByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLmJpbmQod2luZG93KTtcclxuICB9XHJcblxyXG4gIHZhciBsYXN0VGltZSA9IDA7XHJcbiAgdmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xyXG4gIGZvcih2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhckFGOyArK3gpIHtcclxuICAgIHJBRiA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcclxuICB9XHJcblxyXG4gIGlmICghckFGKVxyXG4gICAgckFGID0gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpIHtcclxuICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xyXG4gICAgICB2YXIgaWQgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTsgfSwgdGltZVRvQ2FsbCk7XHJcbiAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsO1xyXG4gICAgICByZXR1cm4gaWQ7XHJcbiAgICB9O1xyXG5cclxuICByZXR1cm4gckFGO1xyXG59KCkpO1xyXG5cclxuXHJcbi8vIC0tLS1cclxuLy8gRGFzaCBzdXBwb3J0IGZvciBjYW52YXMgY29udGV4dFxyXG5cclxudmFyIGRhc2hTdXBwb3J0ID0gZnVuY3Rpb24oY3R4KSB7XHJcbiAgdmFyIE5PT1AgPSBmdW5jdGlvbigpe307XHJcblxyXG4gIGlmIChjdHguc2V0TGluZURhc2gpIHtcclxuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IGZ1bmN0aW9uKG9mZikgeyB0aGlzLmxpbmVEYXNoT2Zmc2V0ID0gb2ZmOyB9O1xyXG4gIH0gZWxzZSBpZiAoY3R4LndlYmtpdExpbmVEYXNoICE9PSB1bmRlZmluZWQpIHtcclxuICAgIGN0eC5zZXRMaW5lRGFzaCA9IGZ1bmN0aW9uKGRhc2gpIHsgdGhpcy53ZWJraXRMaW5lRGFzaCA9IGRhc2g7IH07XHJcbiAgICBjdHguc2V0TGluZURhc2hPZmZzZXQgPSBmdW5jdGlvbihvZmYpIHsgdGhpcy53ZWJraXRMaW5lRGFzaE9mZnNldCA9IG9mZjsgfTtcclxuICB9IGVsc2UgaWYgKGN0eC5tb3pEYXNoICE9PSB1bmRlZmluZWQpIHtcclxuICAgIGN0eC5zZXRMaW5lRGFzaCA9IGZ1bmN0aW9uKGRhc2gpIHsgdGhpcy5tb3pEYXNoID0gZGFzaDsgfTtcclxuICAgIGN0eC5zZXRMaW5lRGFzaE9mZnNldCA9IE5PT1A7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN0eC5zZXRMaW5lRGFzaCA9IE5PT1A7XHJcbiAgICBjdHguc2V0TGluZURhc2hPZmZzZXQgPSBOT09QO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZTogckFGLFxyXG4gIGRhc2hTdXBwb3J0OiBkYXNoU3VwcG9ydFxyXG59OyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XHJcblxyXG52YXIgTk9ORSA9IFtdO1xyXG5cclxuLyoqXHJcbiAqIFJlY3RhbmdsZSBOb2RlXHJcbiAqXHJcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XHJcbiAqXHJcbiAqIHdpZHRoOiB3aWR0aCBvZiB0aGUgcmVjdGFuZ2xlXHJcbiAqIGhlaWdodDogaGVpZ2h0IG9mIHRoZSByZWN0YW5nbGVcclxuICogZmlsbFN0eWxlLCBzdHJva2VTdHlsZSwgbGluZVdpZHRoLCBsaW5lQ2FwLCBsaW5lSm9pbiwgbWl0ZXJMaW1pdDpcclxuICogICBhcyBzcGVjaWZpZWQgaW4gdGhlIEhUTUw1IENhbnZhcyBBUElcclxuICogbGluZURhc2g6IGFuIGFycmF5IHNwZWNpZnlpbmcgb24vb2ZmIHBpeGVsIHBhdHRlcm5cclxuICogICAoZS5nLiBbMTAsIDVdID0gMTAgcGl4ZWxzIG9uLCA1IHBpeGVscyBvZmYpIChub3Qgc3VwcG9ydGVkIGluIGFsbCBicm93c2VycylcclxuICogbGluZURhc2hPZmZzZXQ6IGEgcGl4ZWwgb2Zmc2V0IHRvIHN0YXJ0IHRoZSBkYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gYWxsIGJyb3dzZXJzKVxyXG4gKlxyXG4gKiBOb3RlOiBwaWNraW5nIGlzIGFsd2F5cyBlbmFibGVkIG9uIHRoZSBlbnRpcmUgcmVjdCAobm8gc3Ryb2tlLW9ubHkgcGlja2luZykgYXRcclxuICogdGhlIG1vbWVudC5cclxuICovXHJcbnZhciBSZWN0ID0gZnVuY3Rpb24oKSB7XHJcbiAgTm9kZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59O1xyXG5cclxuXHJcblJlY3QucHJvdG90eXBlID0gXy5leHRlbmQoUmVjdC5wcm90b3R5cGUsIE5vZGUucHJvdG90eXBlLCB7XHJcbiAgZHJhdzogZnVuY3Rpb24oY3R4KSB7XHJcbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoIHx8IDA7XHJcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgMDtcclxuXHJcbiAgICBpZiAodGhpcy5maWxsU3R5bGUpIHtcclxuICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuZmlsbFN0eWxlO1xyXG4gICAgICBjdHguZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5zdHJva2VTdHlsZSkge1xyXG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLnN0cm9rZVN0eWxlO1xyXG4gICAgICBjdHgubGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggfHwgMTtcclxuICAgICAgY3R4LmxpbmVDYXAgPSB0aGlzLmxpbmVDYXAgfHwgJ2J1dHQnO1xyXG4gICAgICBjdHgubGluZUpvaW4gPSB0aGlzLmxpbmVKb2luIHx8ICdtaXRlcic7XHJcbiAgICAgIGN0eC5taXRlckxpbWl0ID0gdGhpcy5taXRlckxpbWl0IHx8IDEwO1xyXG4gICAgICBjdHguc2V0TGluZURhc2godGhpcy5saW5lRGFzaCB8fCBOT05FKTtcclxuICAgICAgY3R4LnNldExpbmVEYXNoT2Zmc2V0KHRoaXMubGluZURhc2hPZmZzZXQgfHwgMCk7XHJcbiAgICAgIGN0eC5zdHJva2VSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoIHx8IDA7XHJcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgfHwgMDtcclxuXHJcbiAgICBpZiAobHggPj0gMCAmJiBseCA8IHdpZHRoICYmIGx5ID49IDAgJiYgbHkgPCBoZWlnaHQpIHtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Q7IiwiLyoqXHJcbiAgU1ZHIHBhdGggdG8gY2FudmFzIHBhdGggc2tldGNoaW5nLCB0YWtlbiBhbmQgYWRhcHRlZCBmcm9tOlxyXG4gICAtIFZlZ2E6IGdpdGh1Yi5jb20vdHJpZmFjdGEvdmVnYVxyXG4gICAgIExpY2Vuc2U6IGh0dHBzOi8vZ2l0aHViLmNvbS90cmlmYWN0YS92ZWdhL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcclxuICAgLSBGYWJyaWMuanM6IGdpdGh1Yi5jb20va2FuZ2F4L2ZhYnJpYy5qcy9ibG9iL21hc3Rlci9zcmMvc2hhcGVzL3BhdGguY2xhc3MuanNcclxuICAgICBMaWNlbnNlOiBodHRwczovL2dpdGh1Yi5jb20va2FuZ2F4L2ZhYnJpYy5qcy9ibG9iL21hc3Rlci9MSUNFTlNFXHJcbiovXHJcblxyXG5cclxuLy8gUGF0aCBwYXJzaW5nIGFuZCByZW5kZXJpbmcgY29kZSB0YWtlbiBmcm9tIGZhYnJpYy5qcyAtLSBUaGFua3MhXHJcbnZhciBjb21tYW5kTGVuZ3RocyA9IHsgbToyLCBsOjIsIGg6MSwgdjoxLCBjOjYsIHM6NCwgcTo0LCB0OjIsIGE6NyB9LFxyXG4gICAgcmVwZWF0ZWRDb21tYW5kcyA9IHsgbTogJ2wnLCBNOiAnTCcgfSxcclxuICAgIHRva2VuaXplciA9IC9bbXpsaHZjc3F0YV1bXm16bGh2Y3NxdGFdKi9naSxcclxuICAgIGRpZ2l0cyA9IC8oWy0rXT8oKFxcZCtcXC5cXGQrKXwoKFxcZCspfChcXC5cXGQrKSkpKD86ZVstK10/XFxkKyk/KS9pZztcclxuXHJcbmZ1bmN0aW9uIHBhcnNlKHBhdGgpIHtcclxuICB2YXIgcmVzdWx0ID0gWyBdLFxyXG4gICAgICBjb29yZHMgPSBbIF0sXHJcbiAgICAgIGN1cnJlbnRQYXRoLFxyXG4gICAgICBwYXJzZWQsXHJcbiAgICAgIG1hdGNoLFxyXG4gICAgICBjb29yZHNTdHI7XHJcblxyXG4gIC8vIEZpcnN0LCBicmVhayBwYXRoIGludG8gY29tbWFuZCBzZXF1ZW5jZVxyXG4gIHBhdGggPSBwYXRoLm1hdGNoKHRva2VuaXplcik7XHJcblxyXG4gIC8vIE5leHQsIHBhcnNlIGVhY2ggY29tbWFuZCBpbiB0dXJuXHJcbiAgZm9yICh2YXIgaSA9IDAsIGNvb3Jkc1BhcnNlZCwgbGVuID0gcGF0aC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgY3VycmVudFBhdGggPSBwYXRoW2ldO1xyXG5cclxuICAgIGNvb3Jkc1N0ciA9IGN1cnJlbnRQYXRoLnNsaWNlKDEpLnRyaW0oKTtcclxuICAgIGNvb3Jkcy5sZW5ndGggPSAwO1xyXG5cclxuICAgIHdoaWxlICgobWF0Y2ggPSBkaWdpdHMuZXhlYyhjb29yZHNTdHIpKSkge1xyXG4gICAgICBjb29yZHMucHVzaChtYXRjaFswXSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29vcmRzUGFyc2VkID0gWyBjdXJyZW50UGF0aC5jaGFyQXQoMCkgXTtcclxuXHJcbiAgICBmb3IgKHZhciBqID0gMCwgamxlbiA9IGNvb3Jkcy5sZW5ndGg7IGogPCBqbGVuOyBqKyspIHtcclxuICAgICAgcGFyc2VkID0gcGFyc2VGbG9hdChjb29yZHNbal0pO1xyXG4gICAgICBpZiAoIWlzTmFOKHBhcnNlZCkpIHtcclxuICAgICAgICBjb29yZHNQYXJzZWQucHVzaChwYXJzZWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGNvbW1hbmQgPSBjb29yZHNQYXJzZWRbMF0sXHJcbiAgICAgICAgY29tbWFuZExlbmd0aCA9IGNvbW1hbmRMZW5ndGhzW2NvbW1hbmQudG9Mb3dlckNhc2UoKV0sXHJcbiAgICAgICAgcmVwZWF0ZWRDb21tYW5kID0gcmVwZWF0ZWRDb21tYW5kc1tjb21tYW5kXSB8fCBjb21tYW5kO1xyXG5cclxuICAgIGlmIChjb29yZHNQYXJzZWQubGVuZ3RoIC0gMSA+IGNvbW1hbmRMZW5ndGgpIHtcclxuICAgICAgZm9yICh2YXIgayA9IDEsIGtsZW4gPSBjb29yZHNQYXJzZWQubGVuZ3RoOyBrIDwga2xlbjsgayArPSBjb21tYW5kTGVuZ3RoKSB7XHJcbiAgICAgICAgcmVzdWx0LnB1c2goWyBjb21tYW5kIF0uY29uY2F0KGNvb3Jkc1BhcnNlZC5zbGljZShrLCBrICsgY29tbWFuZExlbmd0aCkpKTtcclxuICAgICAgICBjb21tYW5kID0gcmVwZWF0ZWRDb21tYW5kO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcmVzdWx0LnB1c2goY29vcmRzUGFyc2VkKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdBcmMoZywgeCwgeSwgY29vcmRzLCBib3VuZHMsIGwsIHQpIHtcclxuICB2YXIgcnggPSBjb29yZHNbMF07XHJcbiAgdmFyIHJ5ID0gY29vcmRzWzFdO1xyXG4gIHZhciByb3QgPSBjb29yZHNbMl07XHJcbiAgdmFyIGxhcmdlID0gY29vcmRzWzNdO1xyXG4gIHZhciBzd2VlcCA9IGNvb3Jkc1s0XTtcclxuICB2YXIgZXggPSBjb29yZHNbNV07XHJcbiAgdmFyIGV5ID0gY29vcmRzWzZdO1xyXG4gIHZhciBzZWdzID0gYXJjVG9TZWdtZW50cyhleCwgZXksIHJ4LCByeSwgbGFyZ2UsIHN3ZWVwLCByb3QsIHgsIHkpO1xyXG4gIGZvciAodmFyIGk9MDsgaTxzZWdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgYmV6ID0gc2VnbWVudFRvQmV6aWVyLmFwcGx5KG51bGwsIHNlZ3NbaV0pO1xyXG4gICAgZy5iZXppZXJDdXJ2ZVRvLmFwcGx5KGcsIGJleik7XHJcbiAgICAvLyBib3VuZHMuYWRkKGJlelswXS1sLCBiZXpbMV0tdCk7XHJcbiAgICAvLyBib3VuZHMuYWRkKGJlelsyXS1sLCBiZXpbM10tdCk7XHJcbiAgICAvLyBib3VuZHMuYWRkKGJlels0XS1sLCBiZXpbNV0tdCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBib3VuZEFyYyh4LCB5LCBjb29yZHMsIGJvdW5kcykge1xyXG4gIHZhciByeCA9IGNvb3Jkc1swXTtcclxuICB2YXIgcnkgPSBjb29yZHNbMV07XHJcbiAgdmFyIHJvdCA9IGNvb3Jkc1syXTtcclxuICB2YXIgbGFyZ2UgPSBjb29yZHNbM107XHJcbiAgdmFyIHN3ZWVwID0gY29vcmRzWzRdO1xyXG4gIHZhciBleCA9IGNvb3Jkc1s1XTtcclxuICB2YXIgZXkgPSBjb29yZHNbNl07XHJcbiAgdmFyIHNlZ3MgPSBhcmNUb1NlZ21lbnRzKGV4LCBleSwgcngsIHJ5LCBsYXJnZSwgc3dlZXAsIHJvdCwgeCwgeSk7XHJcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBiZXogPSBzZWdtZW50VG9CZXppZXIuYXBwbHkobnVsbCwgc2Vnc1tpXSk7XHJcbiAgICAvLyBib3VuZHMuYWRkKGJlelswXSwgYmV6WzFdKTtcclxuICAgIC8vIGJvdW5kcy5hZGQoYmV6WzJdLCBiZXpbM10pO1xyXG4gICAgLy8gYm91bmRzLmFkZChiZXpbNF0sIGJlels1XSk7XHJcbiAgfVxyXG59XHJcblxyXG52YXIgYXJjVG9TZWdtZW50c0NhY2hlID0geyB9LFxyXG4gICAgc2VnbWVudFRvQmV6aWVyQ2FjaGUgPSB7IH0sXHJcbiAgICBqb2luID0gQXJyYXkucHJvdG90eXBlLmpvaW4sXHJcbiAgICBhcmdzU3RyO1xyXG5cclxuLy8gQ29waWVkIGZyb20gSW5rc2NhcGUgc3ZndG9wZGYsIHRoYW5rcyFcclxuZnVuY3Rpb24gYXJjVG9TZWdtZW50cyh4LCB5LCByeCwgcnksIGxhcmdlLCBzd2VlcCwgcm90YXRlWCwgb3gsIG95KSB7XHJcbiAgYXJnc1N0ciA9IGpvaW4uY2FsbChhcmd1bWVudHMpO1xyXG4gIGlmIChhcmNUb1NlZ21lbnRzQ2FjaGVbYXJnc1N0cl0pIHtcclxuICAgIHJldHVybiBhcmNUb1NlZ21lbnRzQ2FjaGVbYXJnc1N0cl07XHJcbiAgfVxyXG5cclxuICB2YXIgdGggPSByb3RhdGVYICogKE1hdGguUEkvMTgwKTtcclxuICB2YXIgc2luX3RoID0gTWF0aC5zaW4odGgpO1xyXG4gIHZhciBjb3NfdGggPSBNYXRoLmNvcyh0aCk7XHJcbiAgcnggPSBNYXRoLmFicyhyeCk7XHJcbiAgcnkgPSBNYXRoLmFicyhyeSk7XHJcbiAgdmFyIHB4ID0gY29zX3RoICogKG94IC0geCkgKiAwLjUgKyBzaW5fdGggKiAob3kgLSB5KSAqIDAuNTtcclxuICB2YXIgcHkgPSBjb3NfdGggKiAob3kgLSB5KSAqIDAuNSAtIHNpbl90aCAqIChveCAtIHgpICogMC41O1xyXG4gIHZhciBwbCA9IChweCpweCkgLyAocngqcngpICsgKHB5KnB5KSAvIChyeSpyeSk7XHJcbiAgaWYgKHBsID4gMSkge1xyXG4gICAgcGwgPSBNYXRoLnNxcnQocGwpO1xyXG4gICAgcnggKj0gcGw7XHJcbiAgICByeSAqPSBwbDtcclxuICB9XHJcblxyXG4gIHZhciBhMDAgPSBjb3NfdGggLyByeDtcclxuICB2YXIgYTAxID0gc2luX3RoIC8gcng7XHJcbiAgdmFyIGExMCA9ICgtc2luX3RoKSAvIHJ5O1xyXG4gIHZhciBhMTEgPSAoY29zX3RoKSAvIHJ5O1xyXG4gIHZhciB4MCA9IGEwMCAqIG94ICsgYTAxICogb3k7XHJcbiAgdmFyIHkwID0gYTEwICogb3ggKyBhMTEgKiBveTtcclxuICB2YXIgeDEgPSBhMDAgKiB4ICsgYTAxICogeTtcclxuICB2YXIgeTEgPSBhMTAgKiB4ICsgYTExICogeTtcclxuXHJcbiAgdmFyIGQgPSAoeDEteDApICogKHgxLXgwKSArICh5MS15MCkgKiAoeTEteTApO1xyXG4gIHZhciBzZmFjdG9yX3NxID0gMSAvIGQgLSAwLjI1O1xyXG4gIGlmIChzZmFjdG9yX3NxIDwgMCkgc2ZhY3Rvcl9zcSA9IDA7XHJcbiAgdmFyIHNmYWN0b3IgPSBNYXRoLnNxcnQoc2ZhY3Rvcl9zcSk7XHJcbiAgaWYgKHN3ZWVwID09IGxhcmdlKSBzZmFjdG9yID0gLXNmYWN0b3I7XHJcbiAgdmFyIHhjID0gMC41ICogKHgwICsgeDEpIC0gc2ZhY3RvciAqICh5MS15MCk7XHJcbiAgdmFyIHljID0gMC41ICogKHkwICsgeTEpICsgc2ZhY3RvciAqICh4MS14MCk7XHJcblxyXG4gIHZhciB0aDAgPSBNYXRoLmF0YW4yKHkwLXljLCB4MC14Yyk7XHJcbiAgdmFyIHRoMSA9IE1hdGguYXRhbjIoeTEteWMsIHgxLXhjKTtcclxuXHJcbiAgdmFyIHRoX2FyYyA9IHRoMS10aDA7XHJcbiAgaWYgKHRoX2FyYyA8IDAgJiYgc3dlZXAgPT0gMSl7XHJcbiAgICB0aF9hcmMgKz0gMipNYXRoLlBJO1xyXG4gIH0gZWxzZSBpZiAodGhfYXJjID4gMCAmJiBzd2VlcCA9PSAwKSB7XHJcbiAgICB0aF9hcmMgLT0gMiAqIE1hdGguUEk7XHJcbiAgfVxyXG5cclxuICB2YXIgc2VnbWVudHMgPSBNYXRoLmNlaWwoTWF0aC5hYnModGhfYXJjIC8gKE1hdGguUEkgKiAwLjUgKyAwLjAwMSkpKTtcclxuICB2YXIgcmVzdWx0ID0gW107XHJcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ21lbnRzOyBpKyspIHtcclxuICAgIHZhciB0aDIgPSB0aDAgKyBpICogdGhfYXJjIC8gc2VnbWVudHM7XHJcbiAgICB2YXIgdGgzID0gdGgwICsgKGkrMSkgKiB0aF9hcmMgLyBzZWdtZW50cztcclxuICAgIHJlc3VsdFtpXSA9IFt4YywgeWMsIHRoMiwgdGgzLCByeCwgcnksIHNpbl90aCwgY29zX3RoXTtcclxuICB9XHJcblxyXG4gIHJldHVybiAoYXJjVG9TZWdtZW50c0NhY2hlW2FyZ3NTdHJdID0gcmVzdWx0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2VnbWVudFRvQmV6aWVyKGN4LCBjeSwgdGgwLCB0aDEsIHJ4LCByeSwgc2luX3RoLCBjb3NfdGgpIHtcclxuICBhcmdzU3RyID0gam9pbi5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgaWYgKHNlZ21lbnRUb0JlemllckNhY2hlW2FyZ3NTdHJdKSB7XHJcbiAgICByZXR1cm4gc2VnbWVudFRvQmV6aWVyQ2FjaGVbYXJnc1N0cl07XHJcbiAgfVxyXG5cclxuICB2YXIgYTAwID0gY29zX3RoICogcng7XHJcbiAgdmFyIGEwMSA9IC1zaW5fdGggKiByeTtcclxuICB2YXIgYTEwID0gc2luX3RoICogcng7XHJcbiAgdmFyIGExMSA9IGNvc190aCAqIHJ5O1xyXG5cclxuICB2YXIgY29zX3RoMCA9IE1hdGguY29zKHRoMCk7XHJcbiAgdmFyIHNpbl90aDAgPSBNYXRoLnNpbih0aDApO1xyXG4gIHZhciBjb3NfdGgxID0gTWF0aC5jb3ModGgxKTtcclxuICB2YXIgc2luX3RoMSA9IE1hdGguc2luKHRoMSk7XHJcblxyXG4gIHZhciB0aF9oYWxmID0gMC41ICogKHRoMSAtIHRoMCk7XHJcbiAgdmFyIHNpbl90aF9oMiA9IE1hdGguc2luKHRoX2hhbGYgKiAwLjUpO1xyXG4gIHZhciB0ID0gKDgvMykgKiBzaW5fdGhfaDIgKiBzaW5fdGhfaDIgLyBNYXRoLnNpbih0aF9oYWxmKTtcclxuICB2YXIgeDEgPSBjeCArIGNvc190aDAgLSB0ICogc2luX3RoMDtcclxuICB2YXIgeTEgPSBjeSArIHNpbl90aDAgKyB0ICogY29zX3RoMDtcclxuICB2YXIgeDMgPSBjeCArIGNvc190aDE7XHJcbiAgdmFyIHkzID0gY3kgKyBzaW5fdGgxO1xyXG4gIHZhciB4MiA9IHgzICsgdCAqIHNpbl90aDE7XHJcbiAgdmFyIHkyID0geTMgLSB0ICogY29zX3RoMTtcclxuXHJcbiAgcmV0dXJuIChzZWdtZW50VG9CZXppZXJDYWNoZVthcmdzU3RyXSA9IFtcclxuICAgIGEwMCAqIHgxICsgYTAxICogeTEsICBhMTAgKiB4MSArIGExMSAqIHkxLFxyXG4gICAgYTAwICogeDIgKyBhMDEgKiB5MiwgIGExMCAqIHgyICsgYTExICogeTIsXHJcbiAgICBhMDAgKiB4MyArIGEwMSAqIHkzLCAgYTEwICogeDMgKyBhMTEgKiB5M1xyXG4gIF0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXIoZywgcGF0aCwgbCwgdCkge1xyXG4gIHZhciBjdXJyZW50LCAvLyBjdXJyZW50IGluc3RydWN0aW9uXHJcbiAgICAgIHByZXZpb3VzID0gbnVsbCxcclxuICAgICAgeCA9IDAsIC8vIGN1cnJlbnQgeFxyXG4gICAgICB5ID0gMCwgLy8gY3VycmVudCB5XHJcbiAgICAgIGNvbnRyb2xYID0gMCwgLy8gY3VycmVudCBjb250cm9sIHBvaW50IHhcclxuICAgICAgY29udHJvbFkgPSAwLCAvLyBjdXJyZW50IGNvbnRyb2wgcG9pbnQgeVxyXG4gICAgICB0ZW1wWCxcclxuICAgICAgdGVtcFksXHJcbiAgICAgIHRlbXBDb250cm9sWCxcclxuICAgICAgdGVtcENvbnRyb2xZLFxyXG4gICAgICBib3VuZHM7XHJcbiAgaWYgKGwgPT0gdW5kZWZpbmVkKSBsID0gMDtcclxuICBpZiAodCA9PSB1bmRlZmluZWQpIHQgPSAwO1xyXG5cclxuICBnLmJlZ2luUGF0aCgpO1xyXG5cclxuICBmb3IgKHZhciBpPTAsIGxlbj1wYXRoLmxlbmd0aDsgaTxsZW47ICsraSkge1xyXG4gICAgY3VycmVudCA9IHBhdGhbaV07XHJcblxyXG4gICAgc3dpdGNoIChjdXJyZW50WzBdKSB7IC8vIGZpcnN0IGxldHRlclxyXG5cclxuICAgICAgY2FzZSAnbCc6IC8vIGxpbmV0bywgcmVsYXRpdmVcclxuICAgICAgICB4ICs9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgeSArPSBjdXJyZW50WzJdO1xyXG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ0wnOiAvLyBsaW5ldG8sIGFic29sdXRlXHJcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgeSA9IGN1cnJlbnRbMl07XHJcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnaCc6IC8vIGhvcml6b250YWwgbGluZXRvLCByZWxhdGl2ZVxyXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcclxuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdIJzogLy8gaG9yaXpvbnRhbCBsaW5ldG8sIGFic29sdXRlXHJcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAndic6IC8vIHZlcnRpY2FsIGxpbmV0bywgcmVsYXRpdmVcclxuICAgICAgICB5ICs9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHgsIHkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnVic6IC8vIHZlcmljYWwgbGluZXRvLCBhYnNvbHV0ZVxyXG4gICAgICAgIHkgPSBjdXJyZW50WzFdO1xyXG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ20nOiAvLyBtb3ZlVG8sIHJlbGF0aXZlXHJcbiAgICAgICAgeCArPSBjdXJyZW50WzFdO1xyXG4gICAgICAgIHkgKz0gY3VycmVudFsyXTtcclxuICAgICAgICBnLm1vdmVUbyh4ICsgbCwgeSArIHQpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoeCwgeSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdNJzogLy8gbW92ZVRvLCBhYnNvbHV0ZVxyXG4gICAgICAgIHggPSBjdXJyZW50WzFdO1xyXG4gICAgICAgIHkgPSBjdXJyZW50WzJdO1xyXG4gICAgICAgIGcubW92ZVRvKHggKyBsLCB5ICsgdCk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ2MnOiAvLyBiZXppZXJDdXJ2ZVRvLCByZWxhdGl2ZVxyXG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbNV07XHJcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFs2XTtcclxuICAgICAgICBjb250cm9sWCA9IHggKyBjdXJyZW50WzNdO1xyXG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbNF07XHJcbiAgICAgICAgZy5iZXppZXJDdXJ2ZVRvKFxyXG4gICAgICAgICAgeCArIGN1cnJlbnRbMV0gKyBsLCAvLyB4MVxyXG4gICAgICAgICAgeSArIGN1cnJlbnRbMl0gKyB0LCAvLyB5MVxyXG4gICAgICAgICAgY29udHJvbFggKyBsLCAvLyB4MlxyXG4gICAgICAgICAgY29udHJvbFkgKyB0LCAvLyB5MlxyXG4gICAgICAgICAgdGVtcFggKyBsLFxyXG4gICAgICAgICAgdGVtcFkgKyB0XHJcbiAgICAgICAgKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHggKyBjdXJyZW50WzFdLCB5ICsgY3VycmVudFsyXSk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcclxuICAgICAgICB4ID0gdGVtcFg7XHJcbiAgICAgICAgeSA9IHRlbXBZO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnQyc6IC8vIGJlemllckN1cnZlVG8sIGFic29sdXRlXHJcbiAgICAgICAgeCA9IGN1cnJlbnRbNV07XHJcbiAgICAgICAgeSA9IGN1cnJlbnRbNl07XHJcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzNdO1xyXG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFs0XTtcclxuICAgICAgICBnLmJlemllckN1cnZlVG8oXHJcbiAgICAgICAgICBjdXJyZW50WzFdICsgbCxcclxuICAgICAgICAgIGN1cnJlbnRbMl0gKyB0LFxyXG4gICAgICAgICAgY29udHJvbFggKyBsLFxyXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxyXG4gICAgICAgICAgeCArIGwsXHJcbiAgICAgICAgICB5ICsgdFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZChjdXJyZW50WzFdLCBjdXJyZW50WzJdKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh4LCB5KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ3MnOiAvLyBzaG9ydGhhbmQgY3ViaWMgYmV6aWVyQ3VydmVUbywgcmVsYXRpdmVcclxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XHJcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFszXTtcclxuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzRdO1xyXG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXHJcbiAgICAgICAgY29udHJvbFggPSAyICogeCAtIGNvbnRyb2xYO1xyXG4gICAgICAgIGNvbnRyb2xZID0gMiAqIHkgLSBjb250cm9sWTtcclxuICAgICAgICBnLmJlemllckN1cnZlVG8oXHJcbiAgICAgICAgICBjb250cm9sWCArIGwsXHJcbiAgICAgICAgICBjb250cm9sWSArIHQsXHJcbiAgICAgICAgICB4ICsgY3VycmVudFsxXSArIGwsXHJcbiAgICAgICAgICB5ICsgY3VycmVudFsyXSArIHQsXHJcbiAgICAgICAgICB0ZW1wWCArIGwsXHJcbiAgICAgICAgICB0ZW1wWSArIHRcclxuICAgICAgICApO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHggKyBjdXJyZW50WzFdLCB5ICsgY3VycmVudFsyXSk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xyXG5cclxuICAgICAgICAvLyBzZXQgY29udHJvbCBwb2ludCB0byAybmQgb25lIG9mIHRoaXMgY29tbWFuZFxyXG4gICAgICAgIC8vIFwiLi4uIHRoZSBmaXJzdCBjb250cm9sIHBvaW50IGlzIGFzc3VtZWQgdG8gYmUgdGhlIHJlZmxlY3Rpb24gb2YgdGhlIHNlY29uZCBjb250cm9sIHBvaW50IG9uIHRoZSBwcmV2aW91cyBjb21tYW5kIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50LlwiXHJcbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFsxXTtcclxuICAgICAgICBjb250cm9sWSA9IHkgKyBjdXJyZW50WzJdO1xyXG5cclxuICAgICAgICB4ID0gdGVtcFg7XHJcbiAgICAgICAgeSA9IHRlbXBZO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnUyc6IC8vIHNob3J0aGFuZCBjdWJpYyBiZXppZXJDdXJ2ZVRvLCBhYnNvbHV0ZVxyXG4gICAgICAgIHRlbXBYID0gY3VycmVudFszXTtcclxuICAgICAgICB0ZW1wWSA9IGN1cnJlbnRbNF07XHJcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHNcclxuICAgICAgICBjb250cm9sWCA9IDIqeCAtIGNvbnRyb2xYO1xyXG4gICAgICAgIGNvbnRyb2xZID0gMip5IC0gY29udHJvbFk7XHJcbiAgICAgICAgZy5iZXppZXJDdXJ2ZVRvKFxyXG4gICAgICAgICAgY29udHJvbFggKyBsLFxyXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxyXG4gICAgICAgICAgY3VycmVudFsxXSArIGwsXHJcbiAgICAgICAgICBjdXJyZW50WzJdICsgdCxcclxuICAgICAgICAgIHRlbXBYICsgbCxcclxuICAgICAgICAgIHRlbXBZICsgdFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgeCA9IHRlbXBYO1xyXG4gICAgICAgIHkgPSB0ZW1wWTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKGN1cnJlbnRbMV0sIGN1cnJlbnRbMl0pO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XHJcbiAgICAgICAgLy8gc2V0IGNvbnRyb2wgcG9pbnQgdG8gMm5kIG9uZSBvZiB0aGlzIGNvbW1hbmRcclxuICAgICAgICAvLyBcIi4uLiB0aGUgZmlyc3QgY29udHJvbCBwb2ludCBpcyBhc3N1bWVkIHRvIGJlIHRoZSByZWZsZWN0aW9uIG9mIHRoZSBzZWNvbmQgY29udHJvbCBwb2ludCBvbiB0aGUgcHJldmlvdXMgY29tbWFuZCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBwb2ludC5cIlxyXG4gICAgICAgIGNvbnRyb2xYID0gY3VycmVudFsxXTtcclxuICAgICAgICBjb250cm9sWSA9IGN1cnJlbnRbMl07XHJcblxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAncSc6IC8vIHF1YWRyYXRpY0N1cnZlVG8sIHJlbGF0aXZlXHJcbiAgICAgICAgLy8gdHJhbnNmb3JtIHRvIGFic29sdXRlIHgseVxyXG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbM107XHJcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFs0XTtcclxuXHJcbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFsxXTtcclxuICAgICAgICBjb250cm9sWSA9IHkgKyBjdXJyZW50WzJdO1xyXG5cclxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXHJcbiAgICAgICAgICBjb250cm9sWCArIGwsXHJcbiAgICAgICAgICBjb250cm9sWSArIHQsXHJcbiAgICAgICAgICB0ZW1wWCArIGwsXHJcbiAgICAgICAgICB0ZW1wWSArIHRcclxuICAgICAgICApO1xyXG4gICAgICAgIHggPSB0ZW1wWDtcclxuICAgICAgICB5ID0gdGVtcFk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ1EnOiAvLyBxdWFkcmF0aWNDdXJ2ZVRvLCBhYnNvbHV0ZVxyXG4gICAgICAgIHRlbXBYID0gY3VycmVudFszXTtcclxuICAgICAgICB0ZW1wWSA9IGN1cnJlbnRbNF07XHJcblxyXG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcclxuICAgICAgICAgIGN1cnJlbnRbMV0gKyBsLFxyXG4gICAgICAgICAgY3VycmVudFsyXSArIHQsXHJcbiAgICAgICAgICB0ZW1wWCArIGwsXHJcbiAgICAgICAgICB0ZW1wWSArIHRcclxuICAgICAgICApO1xyXG4gICAgICAgIHggPSB0ZW1wWDtcclxuICAgICAgICB5ID0gdGVtcFk7XHJcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzFdO1xyXG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFsyXTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XHJcbiAgICAgICAgLy8gYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAndCc6IC8vIHNob3J0aGFuZCBxdWFkcmF0aWNDdXJ2ZVRvLCByZWxhdGl2ZVxyXG5cclxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XHJcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFsxXTtcclxuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzJdO1xyXG5cclxuICAgICAgICBpZiAocHJldmlvdXNbMF0ubWF0Y2goL1tRcVR0XS8pID09PSBudWxsKSB7XHJcbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBwcmV2aW91cyBjb21tYW5kIG9yIGlmIHRoZSBwcmV2aW91cyBjb21tYW5kIHdhcyBub3QgYSBRLCBxLCBUIG9yIHQsXHJcbiAgICAgICAgICAvLyBhc3N1bWUgdGhlIGNvbnRyb2wgcG9pbnQgaXMgY29pbmNpZGVudCB3aXRoIHRoZSBjdXJyZW50IHBvaW50XHJcbiAgICAgICAgICBjb250cm9sWCA9IHg7XHJcbiAgICAgICAgICBjb250cm9sWSA9IHk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHByZXZpb3VzWzBdID09PSAndCcpIHtcclxuICAgICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzIGZvciB0XHJcbiAgICAgICAgICBjb250cm9sWCA9IDIgKiB4IC0gdGVtcENvbnRyb2xYO1xyXG4gICAgICAgICAgY29udHJvbFkgPSAyICogeSAtIHRlbXBDb250cm9sWTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAocHJldmlvdXNbMF0gPT09ICdxJykge1xyXG4gICAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHMgZm9yIHFcclxuICAgICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcclxuICAgICAgICAgIGNvbnRyb2xZID0gMiAqIHkgLSBjb250cm9sWTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRlbXBDb250cm9sWCA9IGNvbnRyb2xYO1xyXG4gICAgICAgIHRlbXBDb250cm9sWSA9IGNvbnRyb2xZO1xyXG5cclxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXHJcbiAgICAgICAgICBjb250cm9sWCArIGwsXHJcbiAgICAgICAgICBjb250cm9sWSArIHQsXHJcbiAgICAgICAgICB0ZW1wWCArIGwsXHJcbiAgICAgICAgICB0ZW1wWSArIHRcclxuICAgICAgICApO1xyXG4gICAgICAgIHggPSB0ZW1wWDtcclxuICAgICAgICB5ID0gdGVtcFk7XHJcbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFsxXTtcclxuICAgICAgICBjb250cm9sWSA9IHkgKyBjdXJyZW50WzJdO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdUJzpcclxuICAgICAgICB0ZW1wWCA9IGN1cnJlbnRbMV07XHJcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzJdO1xyXG5cclxuICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50c1xyXG4gICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcclxuICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gY29udHJvbFk7XHJcbiAgICAgICAgZy5xdWFkcmF0aWNDdXJ2ZVRvKFxyXG4gICAgICAgICAgY29udHJvbFggKyBsLFxyXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxyXG4gICAgICAgICAgdGVtcFggKyBsLFxyXG4gICAgICAgICAgdGVtcFkgKyB0XHJcbiAgICAgICAgKTtcclxuICAgICAgICB4ID0gdGVtcFg7XHJcbiAgICAgICAgeSA9IHRlbXBZO1xyXG4gICAgICAgIC8vIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcclxuICAgICAgICAvLyBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdhJzpcclxuICAgICAgICBkcmF3QXJjKGcsIHggKyBsLCB5ICsgdCwgW1xyXG4gICAgICAgICAgY3VycmVudFsxXSxcclxuICAgICAgICAgIGN1cnJlbnRbMl0sXHJcbiAgICAgICAgICBjdXJyZW50WzNdLFxyXG4gICAgICAgICAgY3VycmVudFs0XSxcclxuICAgICAgICAgIGN1cnJlbnRbNV0sXHJcbiAgICAgICAgICBjdXJyZW50WzZdICsgeCArIGwsXHJcbiAgICAgICAgICBjdXJyZW50WzddICsgeSArIHRcclxuICAgICAgICBdLCBib3VuZHMsIGwsIHQpO1xyXG4gICAgICAgIHggKz0gY3VycmVudFs2XTtcclxuICAgICAgICB5ICs9IGN1cnJlbnRbN107XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdBJzpcclxuICAgICAgICBkcmF3QXJjKGcsIHggKyBsLCB5ICsgdCwgW1xyXG4gICAgICAgICAgY3VycmVudFsxXSxcclxuICAgICAgICAgIGN1cnJlbnRbMl0sXHJcbiAgICAgICAgICBjdXJyZW50WzNdLFxyXG4gICAgICAgICAgY3VycmVudFs0XSxcclxuICAgICAgICAgIGN1cnJlbnRbNV0sXHJcbiAgICAgICAgICBjdXJyZW50WzZdICsgbCxcclxuICAgICAgICAgIGN1cnJlbnRbN10gKyB0XHJcbiAgICAgICAgXSwgYm91bmRzLCBsLCB0KTtcclxuICAgICAgICB4ID0gY3VycmVudFs2XTtcclxuICAgICAgICB5ID0gY3VycmVudFs3XTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ3onOlxyXG4gICAgICBjYXNlICdaJzpcclxuICAgICAgICBnLmNsb3NlUGF0aCgpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgcHJldmlvdXMgPSBjdXJyZW50O1xyXG4gIH1cclxuICByZXR1cm47IC8vIGJvdW5kcy50cmFuc2xhdGUobCwgdCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHBhcnNlOiAgcGFyc2UsXHJcbiAgcmVuZGVyOiByZW5kZXJcclxufTtcclxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWwnKTtcclxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcclxuXHJcblxyXG4vKipcclxuICogVGV4dCBOb2RlXHJcbiAqXHJcbiAqIFByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gTm9kZTogdmlzaWJsZSwgeCwgeSwgcm90YXRpb24sIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5XHJcbiAqXHJcbiAqIGZvbnQ6IENhbnZhcy1BUEkgZm9ybWF0dGVkIGZvbnQgc3RyaW5nLCBmb3IgZXhhbXBsZSAnYm9sZCAxMnB4IHNlcmlmJ1xyXG4gKiB0ZXh0QWxpZ24sIHRleHRCYXNlbGluZTogYXMgc3BlY2lmaWVkIGluIHRoZSBIVE1MNSBDYW52YXMgQVBJXHJcbiAqIGZpbGxTdHlsZSwgc3Ryb2tlU3R5bGUsIGxpbmVXaWR0aCwgbGluZUNhcCwgbGluZUpvaW46IGFzIHNwZWNpZmllZCBpbiB0aGUgSFRNTDUgQ2FudmFzIEFQSVxyXG4gKi9cclxudmFyIFRleHQgPSBmdW5jdGlvbigpIHtcclxuICBOb2RlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn07XHJcblxyXG5cclxuVGV4dC5wcm90b3R5cGUgPSBfLmV4dGVuZChUZXh0LnByb3RvdHlwZSwgTm9kZS5wcm90b3R5cGUsIHtcclxuICBkcmF3OiBmdW5jdGlvbihjdHgpIHtcclxuICAgIGN0eC5mb250ID0gdGhpcy5mb250IHx8ICcxMHB4IHNhbnMtc2VyaWYnO1xyXG4gICAgY3R4LnRleHRBbGlnbiA9IHRoaXMudGV4dEFsaWduIHx8ICdzdGFydCc7XHJcbiAgICBjdHgudGV4dEJhc2VsaW5lID0gdGhpcy50ZXh0QmFzZWxpbmUgfHwgJ2FscGhhYmV0aWMnO1xyXG5cclxuICAgIGlmICh0aGlzLmZpbGxTdHlsZSkge1xyXG4gICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5maWxsU3R5bGU7XHJcbiAgICAgIGN0eC5maWxsVGV4dCh0aGlzLnRleHQsIDAsIDApO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuc3Ryb2tlU3R5bGUpIHtcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2VTdHlsZTtcclxuICAgICAgY3R4LmxpbmVXaWR0aCA9IHRoaXMubGluZVdpZHRoIHx8IDE7XHJcbiAgICAgIGN0eC5saW5lQ2FwID0gdGhpcy5saW5lQ2FwIHx8ICdidXR0JztcclxuICAgICAgY3R4LmxpbmVKb2luID0gdGhpcy5saW5lSm9pbiB8fCAnbWl0ZXInO1xyXG4gICAgICBjdHguc3Ryb2tlVGV4dCh0aGlzLnRleHQsIDAsIDApO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGhpdFRlc3Q6IGZ1bmN0aW9uKGN0eCwgeCwgeSwgbHgsIGx5KSB7XHJcbiAgICAvLyBYWFggU2l6ZSBjYWxjdWxhdGlvbnMgLSBmb250LCBmb250LXNpemUsIGhlaWdodFxyXG4gICAgdmFyIHdpZHRoID0gY3R4Lm1lYXN1cmVUZXh0KHRoaXMudGV4dCk7XHJcbiAgICB2YXIgaGVpZ2h0ID0gMTA7XHJcblxyXG4gICAgaWYgKGx4ID49IDAgJiYgbHggPCB3aWR0aCAmJiBseSA+PSAwICYmIGx5IDwgaGVpZ2h0KSB7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUZXh0OyIsIlxyXG52YXIgVXRpbCA9IHtcclxuXHJcbiAgZXh0ZW5kOiBmdW5jdGlvbihkZXN0LCBzb3VyY2VzKSB7XHJcbiAgICB2YXIga2V5LCBpLCBzb3VyY2U7XHJcbiAgICBmb3IgKGk9MTsgaTxhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgc291cmNlID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICBmb3IgKGtleSBpbiBzb3VyY2UpIHtcclxuICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgIGRlc3Rba2V5XSA9IHNvdXJjZVtrZXldO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlc3Q7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVdGlsOyJdfQ==
(7)
});
