define(function(require, exports, module) {
  require('jquery');
  require('util');
  require('circuit');

  var circuitData = circuit.Circuit.createCircuitData('or-circuit');

  /**
   * @constructor
   * @extends {circuit.Circuit}
   */
  circuit.OrCircuit = function() {
    this._super.constructor.call(this, circuitData);
  }
  circuit.util.inherit(circuit.OrCircuit, circuit.Circuit);

  /**
   * @param {number} x
   * @param {number} y
   */
  circuit.OrCircuit.prototype.onInputChanged = function(x, y) {
    var self = this;
    var $inputElem1 = self.inputElems[0].$elem;
    var $inputElem2 = self.inputElems[1].$elem;
    var $outputElem = self.outputElems[0].$elem;
    var outVal = $inputElem1.cirData.isOn || $inputElem2.cirData.isOn;
    if ($outputElem.cirData.isOn != outVal) {
      $outputElem.cirData.isOn = outVal;
      circuit.util.repaint(function() {
        if ($outputElem.cirData.isOn) {
          $outputElem.addClass('cir-on');
        } else {
          $outputElem.removeClass('cir-on');
        }
      });
      circuit.field.notifyOutputChanged(self);
    }
  };

  circuit.Circuit.registerConstruct(circuit.OrCircuit, circuitData);

  return circuit.OrCircuit;
});
