var express = require('express');
var _ = require('lodash');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('filmomat.db');

var machine = require('../machineNEW.js')();
var router = express.Router();

router.get('/', function(req, res) {
	var getRow = undefined;

	// function to render
	var render = function() {
		res.render('index', {films: getRow } );
	};

	// function to call render after number of calls
	var finished = _.after(1, render);

	// DO NOT REMOVE!
	// db.serialize(function() {
	// 	db.each("SELECT film_name as filmname, iso, manufacturer, processid, process_name as processname, step_id, step_name as step, step_time as time, temp, interval, chemical, dilution FROM FILMS INNER JOIN PROCESSES ON id = film_id INNER JOIN STEPS ON process_id = process_id where film_id = 1 GROUP BY processid", function(error, row) {
	// 		console.log(row);
	// 	});
	//
	// });

	db.serialize(function() {
		db.all("SELECT * from FILMS", function(error, row) {
			getRow = row;
			// tell finished that it's ready
			finished();
		});
	});
});

// Add new film
router.get('/newfilm', function(req, res) {
	res.render('newfilm');
});

router.post('/newfilm', function(req, res) {
	var name = req.body.name;
	var iso = req.body.iso;
	var manufacturer = req.body.manufacturer;

	if(name !== "" && iso !== 0 && manufacturer !== "") {
		db.serialize(function() {
			db.each("INSERT INTO films(film_name, iso, manufacturer) VALUES ($name, $iso, $manufacturer)", {$name: name, $iso: iso, $manufacturer: manufacturer}, function() {

			});
		});
		res.redirect('/');
	}
});

// Add new process for film
router.get('/newprocess/:id', function(req, res) {
	res.render('newprocess', {id: req.params.id});
});

router.post('/addprocess/:id', function(req, res) {
	var steps = req.body.data;
	var processName = req.body.name;
	var lastProcessId = 0;
	var succes = false;

	var filmId = req.params.id;
	db.serialize(function() {
		db.each("SELECT COUNT(*) as count FROM processes where process_name = $name AND film_id = $id", {$name: processName, $id: filmId}, function(error, row) {
			if(row.count === 0) {
				db.run("INSERT INTO processes(film_id, process_name) VALUES ($id, $name)", {$id: filmId, $name: processName}, function() {
					lastProcessId = this.lastID;
					for(var i = 0; i < steps.length; i++) {
						db.run("INSERT INTO steps(process_id, step_name, step_time, temp, interval, chemical, dilution) VALUES ($process_id, $name, $time, $temp, $interval, $chemical, $dilution)", {$process_id: lastProcessId, $name: steps[i].name, $time: steps[i].duration, $temp: steps[i].temperature, $interval: steps[i].interval, $chemical: steps[i].chemical, $dilution: steps[i].dilution });
						succes = true;
					}
				});
			}
			else {
				console.log("already exists");
				succes = false;
				// not working
				// res.send('Process name already exists!');
			}
		});
	});
	res.redirect('/');

});

// Add new process for film
router.get('/processes/:id', function(req, res) {
	var id = req.params.id;
	var processes = [];
	db.serialize(function() {
		db.all("SELECT * FROM PROCESSES where film_id = $id", {$id: id} ,function(error, row) {
			processes = row;
			res.render('processes', {processes: processes, id: req.params.id});
		});
	});
});

router.get('/steps/:processid', function(req, res) {
	var processid = req.params.processid;
	var steps = [];

	db.serialize(function() {
		db.all("SELECT * FROM STEPS where process_id = $id", {$id: processid} ,function(error, row) {
			steps = row;
			res.send(steps);
		});
	});
});

router.get('/processes/:id/delete', function(req, res) {
	var processid = req.params.id;
	db.parallelize(function() {
		db.run("DELETE FROM PROCESSES WHERE processid = $id", {$id: processid}, function(error, row) {
			console.log(this.changes);
		});
		db.run("DELETE FROM STEPS WHERE process_id = $id", {$id: processid}, function(error, row) {
			console.log(this.changes);
		});
	});
});

router.get('/film/:id/delete', function(req, res) {
	console.log("delete film: " + req.params.id);
	var filmid = req.params.id;

	db.serialize(function() {
		db.all('SELECT processid FROM PROCESSES WHERE film_id = $id', {$id: filmid}, function(error, rows) {
			rows.forEach(function(row) {
				db.run("DELETE FROM PROCESSES WHERE processid = $id", {$id: row.processid}, function(error, row) {
					console.log(this.changes);
				});
				db.run("DELETE FROM STEPS WHERE process_id = $id", {$id: row.processid}, function(error, row) {
					console.log(this.changes);
				});
			});
		});

		db.run("DELETE FROM FILMS WHERE id = $id", {$id: filmid}, function(error, row) {
			console.log(this.changes);
		});

		// db.run("DELETE FROM PROCESSES WHERE film_id = $id", {$id: filmid}, function(error, row) {
		// 	console.log(row);
		// 	console.log(this.changes);
		// });

	});
});

router.get('/processes/:id/start', function(req, res) { // change to processes/:id/start
	var processid = req.params.id;
	var steps = [];

	db.serialize(function() {
		db.all("SELECT * FROM STEPS where process_id = $id", {$id: processid} ,function(error, row) {
			steps = row;
			machine.start(JSON.stringify(steps));
		});
	});

	res.render('executing');
});

router.get('/processes/:id/stop', function(req, res) { // change to processes/:id/stop
	console.log("stop: " + req.params.id);
	machine.stop();
});

module.exports = router;
