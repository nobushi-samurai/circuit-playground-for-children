define(function(require, exports, module) {
  require('jquery');

  circuit.field = {};

  var $container = $('#container');
  var circuitMap = new Array(circuit.CONTAINER_V_UNIT);
  circuit.field.BITS_OF_UNIT = 2;
  circuit.field.MASK_OF_UNIT = 0x03;
  circuit.field.UNIT_TYPE_HANDLE = circuit.field.MASK_OF_UNIT;
  circuit.field.UNIT_TYPE_OUT = 0x01;
  circuit.field.UNIT_TYPE_IN = 0x02;
  circuit.field.UNITS_IN_32BIT = Math.floor(32 / circuit.field.BITS_OF_UNIT);

  (function() {
    var ELEMS_IN_LINE = Math.ceil(circuit.CONTAINER_H_UNIT / circuit.field.UNITS_IN_32BIT);
    var collisionBits = new Array(ELEMS_IN_LINE);
    for (var i = 0; i < ELEMS_IN_LINE; i++) {
      collisionBits[i] = 0;
    }
    for (var i = 0; i < circuitMap.length; i++) {
      var connections = new Array(circuit.CONTAINER_H_UNIT);
      for (var j = 0; j < connections.length; j++) {
        connections[j] = {in:null, out:null};
      }
      circuitMap[i] = {
        collisionBits: collisionBits.concat(),
        connections: connections
      };
    }
    (function() {
      // Enable collision bits of circuit tray area.
      var $tray = $('#container .tray');
      var trayYUnit = Math.floor($tray.position().top / circuit.UNIT_HEIGHT);
      var trayHUnit = Math.floor($tray.innerHeight() / circuit.UNIT_HEIGHT);
      for (var i = trayYUnit; i < trayYUnit + trayHUnit; i++) {
        var bits = circuitMap[i].collisionBits;
        for (var j = 0; j < bits.length; j++) {
          bits[j] = 0xffffffff;
        }
      }
      // Disable collision bits of circuit dimension in tray.
      var containerOffset = $container.offset();
      $('#container .tray__circuit-tray .circuit').each(function() {
        var $elem = $(this);
        var elemOffset = $elem.offset();
        var unitX = Math.floor((elemOffset.left - containerOffset.left) / circuit.UNIT_WIDTH);
        var unitY = Math.floor((elemOffset.top - containerOffset.top) / circuit.UNIT_HEIGHT);
        var unitW = Math.floor($elem.innerWidth() / circuit.UNIT_WIDTH);
        var unitH = Math.floor($elem.innerHeight() / circuit.UNIT_HEIGHT);
        var lineBits = (0xffffffff >>> (unitW * circuit.field.BITS_OF_UNIT)) ^ 0xffffffff;
        var shift = (unitX % circuit.field.UNITS_IN_32BIT) * circuit.field.BITS_OF_UNIT;
        var leftIndex = Math.floor(unitX / circuit.field.UNITS_IN_32BIT);
        for (var i = unitY; i < unitY + unitH; i++) {
          var bits = circuitMap[i].collisionBits;
          bits[leftIndex] = (bits[leftIndex] & ~(lineBits >>> shift)) >>> 0;
          if (shift > 0 && bits[leftIndex + 1] !== undefined) {
            bits[leftIndex + 1] = (bits[leftIndex + 1] & ~(lineBits << (32 - shift))) >>> 0;
          }
        }
      });
    })();
    collisionBits = undefined;
  })();

  /**
   * @param {!circuit.Circuit} cir
   */
  circuit.field.notifyOutputChanged = function(cir) {
    $.each(cir.outputElems, function(elemIdx, outputElem) {
      $.each(outputElem.posAry, function(posIdx, pos) {
        var connObj = circuitMap[cir.y + pos.y].connections[cir.x + pos.x].in;
        if (connObj) {
          var outIsOn = outputElem.$elem.cirData.isOn;
          connObj.target.setInput(outIsOn, connObj.x, connObj.y);
        }
      });
    });
  };

  /**
   * @param {!circuit.Circuit} cir
   * @param {!{x:number, y:number}} to
   * @param {!{x:number, y:number}=} from
   */
  circuit.field.notifyPosition = function(cir, to, from) {
    if (from) {
      setPositionConnections(false, cir, from.x, from.y);
      setPositionBitmap(false, cir, from.x, from.y);
    }
    setPositionConnections(true, cir, to.x, to.y);
    setPositionBitmap(true, cir, to.x, to.y);
  };

  /**
   * @param {boolean} on
   * @param {!circuit.Circuit} cir
   * @param {number} x
   * @param {number} y
   */
  function setPositionConnections(on, cir, x, y) {
    var cirConnMap = cir.connectionMap;
    for (var cy = 0; cy < cirConnMap.length; cy++) {
      var cirConnLine = cirConnMap[cy];
      for (var cx = 0; cx < cirConnLine.length; cx++) {
        var fieldConnObj = circuitMap[y + cy].connections[x + cx];
        switch (cirConnLine[cx].type) {
        case circuit.field.UNIT_TYPE_OUT:
          if (on) {
            fieldConnObj.out = {target:cir, x:cx, y:cy};
            if (fieldConnObj.in) {
              var connObj = fieldConnObj.in;
              connObj.target.setInput(cir.getOutput(cx, cy), connObj.x, connObj.y);
            }
          } else {
            fieldConnObj.out = null;
            if (fieldConnObj.in) {
              var connObj = fieldConnObj.in;
              connObj.target.setInput(false, connObj.x, connObj.y);
            }
          }
          break;
        case circuit.field.UNIT_TYPE_IN:
          if (on) {
            fieldConnObj.in = {target:cir, x:cx, y:cy};
            if (fieldConnObj.out) {
              var connObj = fieldConnObj.out;
              cir.setInput(connObj.target.getOutput(connObj.x, connObj.y), cx, cy);
            }
          } else {
            if (fieldConnObj.in) {
              var connObj = fieldConnObj.in;
              fieldConnObj.in = null;
              connObj.target.setInput(false, connObj.x, connObj.y);
            }
          }
          break;
        }
      }
    }
  }

  /**
   * @param {boolean} on
   * @param {!circuit.Circuit} cir
   * @param {number} x
   * @param {number} y
   */
  function setPositionBitmap(on, cir, x, y) {
    var collisionMap = cir.collisionMap;
    var mapLeftIdx = Math.floor(x / circuit.field.UNITS_IN_32BIT);
    var shift = (x % circuit.field.UNITS_IN_32BIT) * circuit.field.BITS_OF_UNIT;
    var expr = on ? function(a, b) {return a | b} : function(a, b) {return (a & ~b) >>> 0};
    // Each line of bit map.
    // > 10100000 01010000
    //   11110000 11000000
    //   01010100 00000000
    for (var i = 0; i < collisionMap.length; i++) {
      var line = collisionMap[i];
      var mapLine = circuitMap[i + y].collisionBits;
      // Each byte of line.
      //   10100000 01010000
      //   ^^^^^^^^
      for (var j = 0; j < line.length; j++) {
        var lineBlock = line[j];
        var mapIndex = j + mapLeftIdx;
        mapLine[mapIndex] = expr(mapLine[mapIndex], (lineBlock >>> shift));
        if (shift > 0 && mapLine[mapIndex + 1] !== undefined) {
          mapLine[mapIndex + 1] = expr(mapLine[mapIndex + 1], (lineBlock << (32 - shift)));
        }
      }
    }
  }

  /**
   * @param {!circuit.Circuit} cir
   * @param {!{x:number, y:number}} to
   * @param {!{x:number, y:number}=} from
   * @return {boolean}
   */
  circuit.field.getCollision = function(cir, to, from) {
    var collisionMap = cir.collisionMap;
    if (from) {
      setPositionBitmap(false, cir, from.x, from.y);
    }
    try {
      var mapLeftIdx = Math.floor(to.x / circuit.field.UNITS_IN_32BIT);
      var shift = (to.x % circuit.field.UNITS_IN_32BIT) * circuit.field.BITS_OF_UNIT;
      // Each line of bit map.
      // > 10100000 01010000
      //   11110000 11000000
      //   01010100 00000000
      for (var i = 0; i < collisionMap.length; i++) {
        var line = collisionMap[i];
        var mapLine = circuitMap[i + to.y].collisionBits;
        // Each byte of line.
        //   10100000 01010000
        //   ^^^^^^^^
        for (var j = 0; j < line.length; j++) {
          var lineBlock = line[j];
          var mapIndex = j + mapLeftIdx;
          if (mapLine[mapIndex] & (lineBlock >>> shift)) {
            return true;
          }
          if (shift > 0 && mapLine[mapIndex + 1] !== undefined) {
            if (mapLine[mapIndex + 1] & (lineBlock << (32 - shift))) {
              return true;
            }
          }
        }
      }
      return false;
    } finally {
      if (from) {
        setPositionBitmap(true, cir, from.x, from.y);
      }
    }
  };

  return circuit.field;
});
