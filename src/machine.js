var five = require('johnny-five');
var board = new five.Board(); // {port: 'com4'}
var io;

var machine = function() {};

machine.prototype.time = 0;

machine.prototype.init = function() {
	board.on('ready', function() {
		// set everything
		console.log('everything set');
	});
};

machine.prototype.start = function(steps) {
	var allSteps = JSON.parse(steps);
	console.log("started process " + allSteps[0].step_name);
	for(var i = 0; i < allSteps.length; i++) {
		// var stepname = allSteps[i].step_name;
		// var duration = allSteps[i].step_time;
		// var temperature = allSteps[i].temp;
		// var interval = allSteps[i].interval;
		// var chemical = allSteps[i].chemical;
		//
		// console.log("step: " + i + " = " + stepname + ", " + duration + ", " + temperature + ", " + interval + ", " + chemical);
		execute(allSteps[i]);
	}

};

//
String.prototype.toSeconds = function () {
	if (!this) return null;
	var time = this.split(':');
	return (+time[0]) * 60 + (+time[1] || 0);
};

var execute = function(step) {
	console.log("executing step " + step.step_name + " (" + step.step_id + ")");
	if(step.step_time !== "" && step.interval !== "") {
		moveChemical(step.chemical);
		var duration = step.step_time.toSeconds();
		var interval = step.interval.toSeconds();

		console.log('duration: ' + duration + " interval: " + interval);
		// startTimer(duration, interval);
	}
};

var startTimer = function(duration, interval) {
	var interv;

	io.sockets.on('connection', function(socket) {
		var start = Date.now(), diff, minutes, seconds;
		var int = 0;
		var string = "";

		function timer() {
			diff = duration - (((Date.now() - start) / 1000) | 0);

			minutes = (diff / 60) | 0;
			seconds = (diff % 60) | 0;

			minutes = minutes < 10 ? "0" + minutes : minutes;
			seconds = seconds < 10 ? "0" + seconds : seconds;

			string = minutes.toString() + ":" + seconds.toString();
			// Send update to page
			io.sockets.emit('message', {message: string});

			if(diff <= 0) {
				start = Date.now() + 1000;
			}
			if(int == interval) {
				console.log("agitate!");
				toggleRelay("agitate"); // make agitate function
				int = 0;
			}
			if(minutes === "00" && seconds === "00") {
				clearInterval(interv);
			}
			int++;
		}

		// timer();
		interv = setInterval(timer, 1000);
	});
};

var moveChemical = function() {

};

var toggleRelay = function(action) {

};

module.exports = function(socket_io) {
	io = socket_io;
	return new machine();
};
