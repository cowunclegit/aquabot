var express = require('express');
var router = express.Router();
var aquabot = require('../aquabot');

router.get('/status', function (req, res, next) {
  if (!req.isAuthenticated()){
    return res.status(401).send("Need to login");
  }
  
  var status = aquabot.getStatus();
  status.user = req.user;
  res.send(status);
});

router.get('/valve', function (req, res, next) {
  if (!req.isAuthenticated()){
    return res.status(401).send("Need to login");
  }

  var valve = req.query.name;

  var valveStatus = {
    valve: "none"
  }

  if (valve === "pure") {
    valveStatus.valve = "pure"

    var status = aquabot.getPureWaterValve();

    if (status == 1) {
      valveStatus.status = "close";
    }
    else {
      valveStatus.status = "open";
    }
  }
  else if (valve === "waste") {
    valveStatus.valve = "waste"

    var status = aquabot.getWasteWaterValve();

    if (status == 0) {
      valveStatus.status = "close";
    }
    else {
      valveStatus.status = "open";
    }
  }
  else if (valve === "salt") {
    valveStatus.valve = "salt"

    var status = aquabot.getSaltWaterValve();

    if (status == 0) {
      valveStatus.status = "close";
    }
    else {
      valveStatus.status = "open";
    }
  }
  res.send(valveStatus);
});

router.post('/valve', function (req, res, next) {
  if (!req.isAuthenticated()){
    return res.status(401).send("Need to login");
  }

  var valve = req.query.name;

  if (valve === "pure") {
    var status = aquabot.getPureWaterValve();
    if(status == 1) {  //Pure는 LOW가 오픈임
      aquabot.openPureWaterValve();
    }
    else{
      aquabot.closePureWaterValve();
    }
  }
  else if (valve === "waste") {
    var status = aquabot.getWasteWaterValve();

    if (status == 0) {
      aquabot.openWasteWaterValve();
    }
    else {
      aquabot.closeWasteWaterValve();
    }
  }
  else if (valve === "salt") {
    var status = aquabot.getSaltWaterValve();

    if (status == 0) {
      aquabot.openSaltWaterValve();
    }
    else {
      aquabot.closeSaltWaterValve();
    }
  }
  res.send("ok");
});

router.get('/temperature', function(req, res, next){
  if (!req.isAuthenticated()){
    return res.status(401).send("Need to login");
  }

  var temp = aquabot.getTemperature();
  res.send({
    temperature: temp
  });
});

router.post('/preset', function(req, res, next){
  if (!req.isAuthenticated()){
    return res.status(401).send("Need to login");
  }

  var action = req.body.action;

  console.log("Action = " + action);

  if(action === "timerchange"){
    var wasteTime = req.body.wasteTime;
    var refillTime = req.body.refillTime;

    aquabot.timerChange(wasteTime, refillTime);
  }
  res.send("ok");
});

router.post('/schedule', function(req, res, next){
  if (!req.isAuthenticated()){
    return res.status(401).send("Need to login");
  }

  var type = req.body.type;

  console.log("Setschedule = " + type);

  if(type === "timerchange"){
    var wasteTime = req.body.wasteTime;
    var refillTime = req.body.refillTime;
    var interval = req.body.interval;

    console.log("Set Schedule : " + interval + ", " + wasteTime + ", " + refillTime);
    aquabot.stopTimerScheduler();
    aquabot.startTimerScheduler(interval, wasteTime, refillTime);
  }
  res.send("ok");
});

router.delete('/schedule', function(req, res, next){
  if (!req.isAuthenticated()){
    return res.status(401).send("Need to login");
  }

  aquabot.stopTimerScheduler();
  res.send("ok");
})

module.exports = router;
