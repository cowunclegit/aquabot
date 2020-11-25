var Gpio = require('onoff').Gpio;

var saltWaterLevelSensor = new Gpio(12, 'in', 'both');
var wasteFlowSensor = new Gpio(19, 'in', 'both');
var saltFlowSensor = new Gpio(26, 'in', 'both');

var wasteWaterValve = new Gpio(16, 'out');
var pureWaterValve = new Gpio(20, 'out');
var saltWaterValve = new Gpio(21, 'out');

var saltEmptyEvtFunc = null;
var waterChangeEvtFunc = null;
var waterEmptyChecker = 0;

var status = "idle";
var isWaterEmpty = false;
var changeMount = 0;
var wasteWaterFlowCount = 0;
var saltWaterFlowCount = 0;
var prevSaltWaterFlowCount = -1;

saltWaterLevelSensor.watch(function (err, value) {
	if (err) {
		console.error('There was an error of Water Level sensor', err);
		return;
	}

	if(value == 1){
		waterEmptyChecker++;
	}
});

wasteFlowSensor.watch(function (err, value) {
	if (err) {
		console.error('There was an error of Water Flow sensor', err);
		return;
	}

	console.log("Wasting Flow : " + value);
	waterFlowCount++;

	if(status === "wasting"){
		waterChangeEvtFunc({
			status: "wasting",
			value: waterFlowCount
		});

		if(wasteWaterFlowCount > changeMount){
			status = "salt";
			closeWasteWaterValve();
			openSaltWaterValve();
		}
	}
});

saltFlowSensor.watch(function (err, value) {
	if (err) {
		console.error('There was an error of Salt water Flow sensor', err);
		return;
	}

	console.log("Salt Flow : " + value);
	saltWaterFlowCount++;

	if(status === "salt"){
		waterChangeEvtFunc({
			status: "salt",
			value: saltWaterFlowCount
		});
	}
});

//Empty check
setInterval(function() {
	if(waterEmptyChecker == 0){
		console.log("Salt Water is Empty!");

		isWaterEmpty = true;

		if(saltEmptyEvtFunc){
			saltEmptyEvtFunc("empty");
		}

		if(waterChangeEvtFunc){
			waterChangeEvtFunc({
				status: "empty"
			});
		}

		status = "empty";
	}
	else {
		console.log("Salt Water is NOT Empty!");

		isWaterEmpty = false;

		if(saltEmptyEvtFunc){
			saltEmptyEvtFunc("not empty");
		}
	}
	waterEmptyChecker = 0;
}, 10000);

//check Salt adding end
setInterval(function() {
	if(status === "salt"){
		if(prevSaltWaterFlowCount == -1){
			prevSaltWaterFlowCount = saltWaterFlowCount;
		}
		else {
			if(prevSaltWaterFlowCount == saltWaterFlowCount){
				//end
				
				//Check Something wrong status
				//배수량과 입수량 오차가 90% 이상이면 오류 발생
				if(chnageMount * 0.9 > saltWaterFlowCount){
					status = "error";
					waterChangeEvtFunc({
						status: "error",
						value: saltWaterFlowCount,
						changeMount: changeMount
					});
				}
				else {
					status = "idle";
					closeSaltWaterValve();
					openPureWaterValve();
					waterChangeEvtFunc({
						status: "end",
						value: saltWaterFlowCount
					});
				}
			}
			else {
				prevSaltWaterFlowCount = saltWaterFlowCount;
			}
		}
	}
}, 30000);

function openWasteWaterValve(){
	wasteWaterValve.writeSync(1);
}

function closeWasteWaterValve(){
	wasteWaterValve.writeSync(0);
}

function openPureWaterValve(){
	pureWaterValve.writeSync(1);
}

function closePureWaterValve(){
	pureWaterValve.writeSync(0);
}

function openSaltWaterValve(){
	saltWaterValve.writeSync(1);
}

function closeSaltWaterValve(){
	saltWaterValve.writeSync(0);
}

module.exports.setSaltWaterEvent = function(evtFunc){
	saltEmptyEvtFunc = evtFunc;
}

module.exports.waterChange = function(evtFunc, milliLiter){
	if(isWaterEmpty){
		evtFunc({
			status: "empty"
		});
	}
	else{		
		status = "wasting";
		waterChangeEvtFunc = evtFunc;
		changeMount = milliLiter;

		wasteWaterFlowCount = 0;
		saltWaterFlowCount = 0;

		closePureWaterValve();
		openWasteWaterValve();

		//Wait the waste.. check event
	}
}

module.exports.getStatus = function(){
	return {
		status: status,
		changeMount: changeMount,
		wasteWaterFlowCount: wasteWaterFlowCount,
		saltWaterFlowCount: saltWaterFlowCount
	};
}

module.exports.openWasteWaterValve = openWasteWaterValve;
module.exports.closeWasteWaterValve = closeWasteWaterValve;
module.exports.openPureWaterValve = openPureWaterValve;
module.exports.closePureWaterValve = closePureWaterValve;
module.exports.openSaltWaterValve = openSaltWaterValve;
module.exports.closeSaltWaterValve = closeSaltWaterValve;
