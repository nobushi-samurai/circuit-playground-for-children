define(function(require, exports, module) {
  require('jquery');
  require('util');
  require('circuit');

  var circuitData = circuit.Circuit.createCircuitData('switch-circuit');

  /**
   * @constructor
   * @extends {circuit.Circuit}
   */
  circuit.SwitchCircuit = function() {
    this._super.constructor.call(this, circuitData);
  }
  circuit.util.inherit(circuit.SwitchCircuit, circuit.Circuit);

  /**
   * @param {jQuery.Event} evt
   */
  circuit.SwitchCircuit.prototype.onHandleClicked = function(evt) {
    var self = this;
    var $outputElem = self.outputElems[0].$elem;
    $outputElem.cirData.isOn = !($outputElem.cirData.isOn);
    circuit.util.repaint(function() {
      if ($outputElem.cirData.isOn) {
        $outputElem.addClass('cir-on');
      } else {
        $outputElem.removeClass('cir-on');
      }
    });
    circuit.field.notifyOutputChanged(self);
  };

  circuit.Circuit.registerConstruct(circuit.SwitchCircuit, circuitData);

  return circuit.SwitchCircuit;
});
