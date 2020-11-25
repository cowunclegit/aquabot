var Gpio = require('onoff').Gpio;
var waterSensor= new Gpio(20, 'in', 'both');

waterSensor.watch(function (err, value) {
  if (err) {
    console.error('There was an error', err);
  return;
  }
	if(value == 1){
		console.log("Sensor : " + value);
	}
});
/*
var sensorInterval = setInterval(sensorCheck, 100);

function sensorCheck(){
	waterSensor.read(function(err, value){
//		console.log(err);
//		console.log(value);
//.		console.log("");
		//	
		if(value == 1){
			console.log("Check");
		}
	});
}*/
