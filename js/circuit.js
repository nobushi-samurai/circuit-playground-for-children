define(function(require, exports, module) {
  require('jquery');
  require('util');
  require('field');

  var $window = $(window);
  var $container = $('#container');
  /**
   * @struct
   * @type {{
   *   target:?circuit.Circuit,
   *   startPageX:number,
   *   startPageY:number,
   *   startX:number,
   *   startY:number,
   * }}
   */
  var touchData = {
    target: null,
    startPageX: 0,
    startPageY: 0,
    startX: 0,
    startY: 0,
    isMoved: false,
  };

  $window.bind('mousemove touchmove', onPointerMove);
  $window.bind('mouseup touchend', onPointerEnd);

  /**
   * @constructor
   * @param {!{
   *    $template: !jQuery,
   *    rectangle: !{x:number, y:number, width:number, height:number},
   *    collisionMap: !Array<!Array<number>>,
   *    connectionMap: !Array<!Array<!{type:number, className:string}>>
   * }} circuitData
   */
  circuit.Circuit = function(circuitData) {
    var self = this;
    var $elem = circuitData.$template.clone();

    /** {!jQuery} */
    self.$elem = $elem;
    /** {number} */
    self.x = NaN;
    /** {number} */
    self.y = NaN;
    /** @private {number} */
    self.width_ = circuitData.rectangle.width;
    /** @private {number} */
    self.height_ = circuitData.rectangle.height;
    /** {!Array<!Array<number>>} */
    self.collisionMap = circuitData.collisionMap;
    /** {!Array<!Array<!{type:number, className:string}>>} */
    self.connectionMap = JSON.parse(JSON.stringify(circuitData.connectionMap));
    /** {!Array<!{$elem:jQuery, posAry:!Array<{x:number, y:number}>}>} */
    self.inputElems = [];
    /** {!Array<!{$elem:jQuery, posAry:!Array<{x:number, y:number}>}>} */
    self.outputElems = [];
    /** @private {Function} */
    self.onPositionChangedListener_ = null;

    (function() {
      var connBuffer = {};
      $.each(self.connectionMap, function(y) {
        $.each(this, function(x, conn) {
          if (conn) {
            var connData = connBuffer[conn.className];
            if (!connData) {
              connData = {
                $elem: $elem.find('.' + conn.className),
                posAry: []
              };
              connData.$elem.cirData = {
                isOn: false
              };
              switch (conn.type) {
              case circuit.field.UNIT_TYPE_IN:
                self.inputElems.push(connData);
                break;
              case circuit.field.UNIT_TYPE_OUT:
                self.outputElems.push(connData);
                break;
              }
              connBuffer[conn.className] = connData;
            }
            connData.posAry.push({x:x, y:y});
            conn.$elem = connData.$elem;
          }
        });
      });
    })();

    circuit.util.repaint(function() {
      self.$elem.hide();
      self.$elem.appendTo($container);
    });
    self.$elem.find('.cir-handle').bind('mousedown touchstart', function(evt) {
      if (evt.type == 'mousedown' && (evt.which || evt.button) != 1) {
        return;
      }
      evt.preventDefault();
      touchData.target = self;
      touchData.startPageX = evt.pageX;
      touchData.startPageY = evt.pageY;
      touchData.startX = self.x;
      touchData.startY = self.y;
      touchData.isMoved = false;
    });
  }
  circuit.util.inherit(circuit.Circuit, Object);

  /**
   * @param {string} cssClassName
   * @return {!{
   *    $template: !jQuery,
   *    rectangle: !{x:number, y:number, width:number, height:number},
   *    collisionMap: !Array<!Array<number>>,
   *    connectionMap: !Array<!Array<!{type:number, className:string}>>
   * }}
   */
  circuit.Circuit.createCircuitData = function(cssClassName) {
    var $circuitTag = $('#container .tray .' + cssClassName);
    var unitX = 0;
    var unitY = 0;
    var width = parseInt($circuitTag.outerWidth() / circuit.UNIT_WIDTH, 10);
    var height = parseInt($circuitTag.outerHeight() / circuit.UNIT_HEIGHT, 10);
    var collisionMap = new Array(height);
    var connectionMap = new Array(height);
    (function() {
      // Calculate position
      var containerOffset = $container.offset();
      var circuitOffset = $circuitTag.offset();
      unitX = Math.floor((circuitOffset.left - containerOffset.left) / circuit.UNIT_WIDTH);
      unitY = Math.floor((circuitOffset.top - containerOffset.top) / circuit.UNIT_HEIGHT);
      // Map settings
      var $circuitTray = $('#container .tray .tray__circuit-tray').has('.' + cssClassName);
      var collisionLine = new Array(Math.ceil(width / circuit.field.UNITS_IN_32BIT));
      for (var i = 0; i < collisionLine.length; i++) {
        collisionLine[i] = 0;
      }
      for (var i = 0; i < height; i++) {
        collisionMap[i] = collisionLine.concat();
        connectionMap[i] = new Array(width);
      }
      $circuitTag.find('.cir-handle, .cir-in, .cir-out').each(function(index) {
        var $elem = $(this);
        var connection = {};
        var x = parseInt(parseInt($elem.css('left'), 10) / circuit.UNIT_WIDTH, 10);
        var y = parseInt(parseInt($elem.css('top'), 10) / circuit.UNIT_HEIGHT, 10);
        var w = parseInt($elem.outerWidth() / circuit.UNIT_WIDTH, 10);
        var h = parseInt($elem.outerHeight() / circuit.UNIT_HEIGHT, 10);
        var bits = 0;
        var idxClsName = 'idx-' + index;
        if ($elem.hasClass('cir-handle')) {
          bits = circuit.field.UNIT_TYPE_HANDLE;
        } else if ($elem.hasClass('cir-in')) {
          bits = circuit.field.UNIT_TYPE_IN;
        } else if ($elem.hasClass('cir-out')) {
          bits = circuit.field.UNIT_TYPE_OUT;
        }
        connection.type = bits;
        connection.className = idxClsName;
        $elem.addClass(idxClsName);
        for (var y_ = y; y_ < y + h; y_++) {
          for (var x_ = x; x_ < x + w; x_++) {
            var xIdx = Math.floor(x_ / circuit.field.UNITS_IN_32BIT);
            var shift = (circuit.field.UNITS_IN_32BIT - (x_ % circuit.field.UNITS_IN_32BIT + 1))
                * circuit.field.BITS_OF_UNIT;
            var shiftBits = bits << shift;
            collisionMap[y_][xIdx] = collisionMap[y_][xIdx] | shiftBits;
            connectionMap[y_][x_] = connection;
          }
        }
      });
    })();
    return {
      $template: $circuitTag,
      rectangle: {
        x: unitX,
        y: unitY,
        width: width,
        height: height
      },
      collisionMap: collisionMap,
      connectionMap: connectionMap
    };
  };

  /**
   * @param {!Function} constructor
   * @param {!{
   *    $template: !jQuery,
   *    rectangle: !{x:number, y:number, width:number, height:number},
   *    collisionMap: !Array<!Array<number>>,
   *    connectionMap: !Array<!Array<!{type:number, className:string}>>
   * }} circuitData
   */
  circuit.Circuit.registerConstruct = function(constructor, circuitData) {
    createTemplate();
    function createTemplate() {
      var cir = new constructor();
      cir.setPosition(circuitData.rectangle.x, circuitData.rectangle.y);
      cir.onPositionChangedListener_ = function() {
        cir.onPositionChangedListener_ = null;
        createTemplate();
      }
      cir.show();
    }
  }

  /**
   * @param {jQuery.Event} evt
   */
  function onPointerMove(evt) {
    var target = touchData.target;
    if (target) {
      evt.preventDefault();
      var diffPageX = evt.pageX - touchData.startPageX;
      var diffPageY = evt.pageY - touchData.startPageY;
      var diffX = parseInt(diffPageX / circuit.UNIT_WIDTH, 10);
      var diffY = parseInt(diffPageY / circuit.UNIT_HEIGHT, 10);
      if (diffX != 0 || diffY != 0) {
        touchData.isMoved = true;
      }
      target.setPosition(
        Math.min(Math.max(0, touchData.startX + diffX), circuit.CONTAINER_H_UNIT - target.width_),
        Math.min(Math.max(0, touchData.startY + diffY), circuit.CONTAINER_V_UNIT - target.height_),
        true
      );
    }
  }

  /**
   * @param {jQuery.Event} evt
   */
  function onPointerEnd(evt) {
    var target = touchData.target;
    if (target) {
      touchData.target = null;
      if (!touchData.isMoved) {
        target.onHandleClicked(evt);
      }
    }
  }

  /**
   * @param {jQuery.Event} evt
   */
  circuit.Circuit.prototype.onHandleClicked = function(evt) {
    // abstract
  };

  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean=} nearAsPossible
   * @return {!circuit.Circuit}
   */
  circuit.Circuit.prototype.setPosition = function(x, y, nearAsPossible) {
    var self = this;
    var newPos = {x:x, y:y};
    var prevPos = undefined;
    if (!isNaN(self.x) && !isNaN(self.y)) {
      prevPos = {x:self.x, y:self.y};
    }
    if (circuit.field.getCollision(self, newPos, prevPos)) {
      if (!nearAsPossible || !prevPos) {
        return self;
      }
      do {
        if (newPos.x < prevPos.x) {
          newPos.x++;
        } else if (newPos.x > prevPos.x) {
          newPos.x--;
        } else {
          newPos.x = x;
          if (newPos.y < prevPos.y) {
            newPos.y++;
          } else if (newPos.y > prevPos.y) {
            newPos.y--;
          } else {
            return self;
          }
        }
      } while (circuit.field.getCollision(self, newPos, prevPos));
    }
    if (newPos.x != self.x || newPos.y != self.y) {
      self.x = newPos.x;
      self.y = newPos.y;
      circuit.field.notifyPosition(self, newPos, prevPos);
      if (self.onPositionChangedListener_) {
        self.onPositionChangedListener_();
      }
      circuit.util.repaint(function() {
        self.$elem.css({
          'left': self.x * circuit.UNIT_WIDTH,
          'top': self.y * circuit.UNIT_HEIGHT,
        });
      });
    }
    return self;
  };

  /**
   * @param {boolean} on
   * @param {number} x
   * @param {number} y
   * @return {!circuit.Circuit}
   */
  circuit.Circuit.prototype.setInput = function(on, x, y) {
    var self = this;
    var conn = self.connectionMap[y][x];
    var $elem = conn.$elem;
    if ($elem.cirData.isOn != on) {
      $elem.cirData.isOn = on;
      circuit.util.repaint(function() {
        if ($elem.cirData.isOn) {
          $elem.addClass('cir-on');
        } else {
          $elem.removeClass('cir-on');
        }
      });
      setTimeout(function() {
        self.onInputChanged(x, y);
      });
    }
    return self;
  };

  /**
   * @param {number} x
   * @param {number} y
   */
  circuit.Circuit.prototype.onInputChanged = function(x, y) {
    // abstract
  };

  /**
   * @param {number} x
   * @param {number} y
   * @return {boolean}
   */
  circuit.Circuit.prototype.getOutput = function(x, y) {
    var self = this;
    var conn = self.connectionMap[y][x];
    var $elem = conn.$elem;
    return $elem.hasClass('cir-out') && $elem.cirData.isOn;
  };

  /**
   * @return {!circuit.Circuit}
   */
  circuit.Circuit.prototype.show = function() {
    var self = this;
    circuit.util.repaint(function() {
      self.$elem.show();
    });
    return self;
  };

  /**
   * @return {!circuit.Circuit}
   */
  circuit.Circuit.prototype.hide = function() {
    var self = this;
    circuit.util.repaint(function() {
      self.$elem.hide();
    });
    return self;
  };

  return circuit.Circuit;
});
