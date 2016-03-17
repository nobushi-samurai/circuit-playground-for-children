var circuit = {};

/** @define {number} */
circuit.UNIT_WIDTH = 24;
/** @define {number} */
circuit.UNIT_HEIGHT = 24;
/** @define {number} */
circuit.CONTAINER_H_UNIT = 32;
/** @define {number} */
circuit.CONTAINER_V_UNIT = 32;

require.config({
  paths: {
    'jquery': 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min'
  }
});

require(['or-circuit', 'switch-circuit'], function() {
  console.log('Running...');
});
