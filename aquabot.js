var Gpio = require('onoff').Gpio;
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
	host: "http://aquabot:" + process.env.AQUA_BOT_PASSWORD + "@192.168.0.13:9200",
	log: 'trace'
})

var saltWaterLevelSensor = new Gpio(1, 'in', 'both'); 	//Yellow
var wasteFlowSensor = new Gpio(12, 'in', 'both');		//White
var saltFlowSensor = new Gpio(16, 'in', 'both');		//Orange

var wasteWaterValve = new Gpio(20, 'out');	//Purple
var pureWaterValve = new Gpio(21, 'out');	//Brown
var saltWaterValve = new Gpio(26, 'out');	//Red

var saltEmptyEvtFunc = null;
var waterChangeEvtFunc = null;
var waterEmptyChecker = 0;

var status = "idle";
var temperature = 0.0;
var isWaterEmpty = false;
var changeMount = 0;
var wasteWaterFlowCount = 0;
var saltWaterFlowCount = 0;
var prevSaltWaterFlowCount = -1;

var wasteTime = 0;
var refillTime = 0;
var remainWasteTime = 0;
var remainRefillTime = 0;

var exec = require('child_process').exec;

wasteFlowSensor.watch(function (err, value) {
	if (err) {
		console.error('There was an error of Water Flow sensor', err);
		return;
	}

	if(value == 1){
		return;
	}

	wasteWaterFlowCount++;

	if(status === "wasting"){
		waterChangeEvtFunc({
			status: "wasting",
			value: wasteWaterFlowCount
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

	//console.log("Salt Flow : " + value);
	saltWaterFlowCount++;

	if(status === "salt"){
		waterChangeEvtFunc({
			status: "salt",
			value: saltWaterFlowCount
		});
	}
});

saltWaterLevelSensor.watch(function (err, value) {
	if (err) {
		console.error('There was an error of Salt water Level sensor', err);
		return;
	}

	console.log("Salt Level : " + value);
})

//Empty & Temp check
setInterval(function() {
	var empty = saltWaterLevelSensor.readSync();
	if(empty == 0){
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

	//Temperature
	exeTemperature();
	
	if(temperature > 0){
		//Log to elasticsearch
		var json = getStatus();
		json.date = new Date();
		client.index({
			index: "aquabot_status",
			body: json
		});
	}
}, 10000);

/*setInterval(function() {
	console.log(saltWaterLevelSensor.readSync());
}, 500);
*/

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
	wasteWaterValve.writeSync(0);
}

function closeWasteWaterValve(){
	wasteWaterValve.writeSync(1);
}

function getWasteWaterValve(){
	return wasteWaterValve.readSync();
}

function openPureWaterValve(){
	pureWaterValve.writeSync(1);
}

function closePureWaterValve(){
	pureWaterValve.writeSync(0);
}

function getPureWaterValve(){
	return pureWaterValve.readSync();
}

function openSaltWaterValve(){
	saltWaterValve.writeSync(0);
}

function closeSaltWaterValve(){
	saltWaterValve.writeSync(1);
}

function getSaltWaterValve(){
	return saltWaterValve.readSync();
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

function exeTemperature() {
	child = exec("./DS18B20Scan -gpio 4", function (error, stdout, stderr) {
   	if (error !== null) {
        	console.log('exec error: ' + error);
    	}
		var result = stdout.split(' ');
		console.log(result);
		if(result[0] === "***"){
			return;
		}
		temperature = result[7];
	});
}

function timerChange(wasteRequestTime, refillRequestTime){
	status = "timerchange";
	wasteTime = wasteRequestTime;
	refillTime = refillRequestTime;	

	remainWasteTime = wasteTime;
	remainRefillTime = refillTime;
}

var timerChangeScheduler = null;
var schedulerInterval = 0;
var schedulerWasteRequestTime = 0;
var schedulerRefillRequestTime = 0;
function startTimerScheduler(interval, wasteRequestTime, refillRequestTime){
	schedulerInterval = interval;
	schedulerWasteRequestTime = wasteRequestTime;
	schedulerRefillRequestTime = refillRequestTime;

	var intervalTime = 1000 * 60 /* 1min */ * 60 /* 1hour */ * 24 / interval;
	timerChangeScheduler = setInterval(() => {
		var json = {
			type: "timerchange",
			interval: interval,
			wasteRequestTime: schedulerWasteRequestTime,
			refillRequestTime: schedulerRefillRequestTime,
			date: new Date()
		};

		client.index({
			index: "aquabot_scheduler",
			body: json
		});
		timerChange(schedulerWasteRequestTime, schedulerRefillRequestTime);
	}, intervalTime);
}

function stopTimerScheduler(){
	if(timerChangeScheduler){
		clearInterval(timerChangeScheduler);

		schedulerInterval = 0;
		schedulerWasteRequestTime = 0;
		schedulerRefillRequestTime = 0;
		timerChangeScheduler = null;
	}
}

function getTimerScheduler(){
	if(timerChangeScheduler){
		return {
			type: "timerchange",
			interval: schedulerInterval,
			wasteRequestTIme: schedulerWasteRequestTime,
			refillRequestTime: schedulerRefillRequestTime
		}
	}
	else {
		return {
			type: "stop"
		}
	}
}

function getStatus(){
	var valveStatus = {
		pure: "none",
		waste: "none",
		salt: "none"
	};
	
	if (getPureWaterValve() == 0) {
		valveStatus.pure = "close";
	}
	else {
		valveStatus.pure = "open";
	}
	
	if (getWasteWaterValve() == 1) {
		valveStatus.waste = "close";
	}
	else {
		valveStatus.waste = "open";
	}
	
	if (getSaltWaterValve() == 1) {
		valveStatus.salt = "close";
	}
	else {
		valveStatus.salt = "open";
	}

	return {
		status: status,
		changeMount: changeMount,
		wasteWaterFlowCount: wasteWaterFlowCount,
		saltWaterFlowCount: saltWaterFlowCount,
		remainWasteTime: remainWasteTime,
		remainRefillTime: remainRefillTime,
		valve: valveStatus,
		temperature: temperature,
		schedulerInterval: schedulerInterval,
		schedulerWasteRequestTime: schedulerWasteRequestTime,
		schedulerRefillRequestTime: schedulerRefillRequestTime
	};
}

module.exports.getTemperature = function() {
	return temperature;
}

module.exports.openWasteWaterValve = openWasteWaterValve;
module.exports.closeWasteWaterValve = closeWasteWaterValve;
module.exports.getWasteWaterValve = getWasteWaterValve;
module.exports.openPureWaterValve = openPureWaterValve;
module.exports.closePureWaterValve = closePureWaterValve;
module.exports.getPureWaterValve = getPureWaterValve;
module.exports.openSaltWaterValve = openSaltWaterValve;
module.exports.closeSaltWaterValve = closeSaltWaterValve;
module.exports.getSaltWaterValve = getSaltWaterValve;
module.exports.getStatus = getStatus;
module.exports.timerChange = timerChange;
module.exports.startTimerScheduler = startTimerScheduler;
module.exports.stopTimerScheduler = stopTimerScheduler;
module.exports.getTimerScheduler = getTimerScheduler;

//Timer Preset Loop
setInterval(() => {
	/*if(status === "empty"){
		remainWasteTime = 0;
		remainRefillTime = 0;
		closePureWaterValve();
		closeSaltWaterValve();
		closeWasteWaterValve();
	}*/
	
	if(remainWasteTime > 0){
		if(getWasteWaterValve() == 1){
			openWasteWaterValve();
		}

		if(getPureWaterValve() == 1){
			closePureWaterValve();
		}

		if(getSaltWaterValve() == 0){
			closeSaltWaterValve();
		}

		remainWasteTime--;
	}
	else if(remainRefillTime > 0){
		if(getWasteWaterValve() == 0){
			closeWasteWaterValve();
		}

		if(getPureWaterValve() == 1){
			closePureWaterValve();
		}

		if(getSaltWaterValve() == 1){
			openSaltWaterValve();
		}

		remainRefillTime--;
	}
	else if(status === "timerchange"){
		if(getPureWaterValve() == 0){
			openPureWaterValve();
		}

		if(getSaltWaterValve() == 0){
			closeSaltWaterValve();
		}

		if(getWasteWaterValve() == 0){
			closeWasteWaterValve();
		}

		status = "idle";
	}
}, 1000);

closeWasteWaterValve();
closeSaltWaterValve();
openPureWaterValve();

client.indices.exists({
	index: "aquabot_status"
}).then(function(result){
	console.log(result);
	if(result == false){
		client.indices.create({
			index: "aquabot_status",
			body: {
				"settings": {
					"number_of_shards": 1
				  },
					"mappings":{
						"properties": {
						  "changeMount": {
							"type": "long"
						  },
						  "date": {
							"type": "date"
						  },
						  "remainRefillTime": {
							"type": "long"
						  },
						  "remainWasteTime": {
							"type": "long"
						  },
						  "saltWaterFlowCount": {
							"type": "long"
						  },
						  "status": {
							"type": "text",
							"fields": {
							  "keyword": {
								"type": "keyword",
								"ignore_above": 256
							  }
							}
						  },
						  "temperature": {
							"type": "double"
						  },
						  "valve": {
							"properties": {
							  "pure": {
								"type": "text",
								"fields": {
								  "keyword": {
									"type": "keyword",
									"ignore_above": 256
								  }
								}
							  },
							  "salt": {
								"type": "text",
								"fields": {
								  "keyword": {
									"type": "keyword",
									"ignore_above": 256
								  }
								}
							  },
							  "waste": {
								"type": "text",
								"fields": {
								  "keyword": {
									"type": "keyword",
									"ignore_above": 256
								  }
								}
							  }
							}
						  },
						  "wasteWaterFlowCount": {
							"type": "long"
						  }
						}
					  }
					}
		});
	}
});
