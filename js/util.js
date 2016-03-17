define(function(require, exports, module) {
  var repaintFunc = window.requestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) {
        setTimeout(callback, 0);
      };

  circuit.util = {};

  /**
   * @param {!Function} subClz
   * @param {!Function} superClz
   */
  circuit.util.inherit = function(subClz, superClz) {
    subClz.prototype = Object.create(superClz.prototype, {
      constructor: {
        value: subClz,
        enumerable: false,
        writable: true,
        configurable: true,
      }
    });
    subClz.prototype._super = superClz.prototype;
  };

  /**
   * @param {!Function} callback
   */
  circuit.util.repaint = function(callback) {
    repaintFunc.call(window, callback);
  };

  return circuit.util;
});
