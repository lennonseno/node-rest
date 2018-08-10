/**
 * Workers-related tasks
 */
var path = require('path');
var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var _data = require('./data');
var _logs = require('./logs');
var helpers = require('./helpers');
var util = require('util');
var debug = util.debuglog('workers');

// Instantiate the worker object
var workers = {};

// Lookup all the checks, get their data and send to a validator
workers.gatherAllChecks = function() {
	_data.list('checks', function(err, checks) {
		if (!err && checks && checks.length > 0) {
			checks.forEach(function(check) {
				// Read in the check data
				_data.read('checks', check, function(err, checkData) {
					if (!err && checkData) {
						// Pass it to the check validator
						workers.validateCheckData(checkData);
					}
					else {
						debug('Error reading one of the check\s data');
					}
				});
			})
		}
		else {
			debug("Error: Could not find any checks to process");
		}
	});
};

// Sanity-checking the check data
workers.validateCheckData = function(check) {
	check = typeof(check) == 'object' && check != null ? check : {};
	check.id = typeof(check.id) == 'string' && check.id.trim().length == 20 ? check.id.trim() : false;
	check.phone = typeof(check.phone) == 'string' && check.phone.trim().length == 10 ? check.phone.trim() : false;
	check.protocol = typeof(check.protocol) == 'string' && ['http', 'https'].indexOf(check.protocol) > -1 ? check.protocol : false;
	check.url = typeof(check.url) == 'string' && check.url.trim().length > 0 ? check.url.trim() : false;
	check.method = typeof(check.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(check.method) > -1 ? check.method : false;
	check.successCodes = typeof(check.successCodes) == 'object' && check.successCodes instanceof Array && check.successCodes.length > 0 ? check.successCodes : false;
	check.timeoutSeconds = typeof(check.timeoutSeconds) == 'number' && check.timeoutSeconds % 1 === 0 && check.timeoutSeconds >= 1 && check.timeoutSeconds <= 5 ? check.timeoutSeconds : false;

	// Set the keys that may not be set (if the workers have never seen this check before)
	check.state = typeof(check.state) == 'string' && ['up', 'down'].indexOf(check.state) > -1 ? check.state : 'down';
	check.lastChecked = typeof(check.lastChecked) == 'number' && check.lastChecked > 0 ? check.lastChecked : false;	

	// If all the checks pass, pass the data along to the next step in the process
	if (check.id && check.phone && check.protocol && check.url && check.method && check.successCodes && check.timeoutSeconds) {
		workers.performCheck(check);
	} 
	else {
		debug('Error: One of the checks is not properly formatted. Skipping it.')
	}
}

// Perform the check, send the original check data and the outcome of the check process to the next step
workers.performCheck = function(check) {
	var checkOutcome = {
		'error': false,
		'responseCode': false
	};

	var outcomeSent = false;
	var parsedUrl = url.parse(check.protocol + '://' + check.url, true);
	var hostname = parsedUrl.hostname;
	var path = parsedUrl.path;

	// Constructing the request
	var requestDetails = {
		'protocol': check.protocol + ':',
		'hostname': hostname,
		'method': check.method.toUpperCase(),
		'path': path,
		'timeout': check.timeoutSeconds * 1000
	};

	// Instantiate the request object (using the either the http or https module)
	var protocol = (check.protocol == 'http') ? http : https;
	var req = protocol.request(requestDetails, function(response) {
		// Grab the status of the sent request
		var status = response.statusCode;

		// Update the checkoutcome and pass the data along
		checkOutcome.responseCode = status;
		if (!outcomeSent) {
			workers.processCheckOutcome(check, checkOutcome);
			outcomeSent = true;
		}
	});

	// Bind to the error event so it doesn't get thrown
	req.on('error', function(e) {
		checkOutcome.error = {
			'error': true,
			'value': e
		};

		if (!outcomeSent) {
			workers.processCheckOutcome(check, checkOutcome);
			outcomeSent = true;
		}
	});

	// Bind to the timeout event
	req.on('timeout', function(e) {
		checkOutcome.error = {
			'error': true,
			'value': 'timeout'
		};

		if (!outcomeSent) {
			workers.processCheckOutcome(check, checkOutcome);
			outcomeSent = true;
		}
	});

	// End the request
	req.end();
};

// Process the check outcome and update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function(check, outcome) {
	// Decide of the check is up or down
	var state = !outcome.error && outcome.responseCode && check.successCodes.indexOf(outcome.responseCode) > -1 ? 'up' : 'down';

	// Decide if an alert is warranted
	var alert = check.lastChecked && check.state !== state ? true : false;
	var timeOfCheck = Date.now();

	// Update the check data
	var newCheckData = check;
	newCheckData.state = state;
	newCheckData.lastChecked = timeOfCheck;

	// Log the outcome
	workers.log(check, outcome, state, alert, timeOfCheck);

	// Save the updates
	_data.update('checks', newCheckData.id, newCheckData, function(err) {
		if (!err) {
			// Send the check data to the next phase in the process if needed
			if (alert) {
				workers.alertUserToStatusChange(newCheckData);
			}
			else {
				debug('Check outcome has not changed. No alert needed');
			}
		}
		else {
			debug('Error trying to save updates to one of the checks');
		}
	});
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(check) {
	var msg = 'Alert: Your check for ' + check.method.toUpperCase() + ' ' + check.protocol + '://' + check.url + ' is currently ' + check.state;
	helpers.sendTwilioSms(check.phone, msg, function(err) {
		if (!err) {
			debug('Success! User was alerted to a status change in ther check, via sms: ', msg);
		}
		else {
			debug('Error: Could not send sms alert to user who had a status change in their check');
		}
	});
}

workers.log = function(check, outcome, state, alert, timeOfCheck) {
	// Form the log data
	var log = {
		'check': check,
		'outcome': outcome,
		'state': state,
		'alert': alert,
		'time': timeOfCheck
	};

	// Convert log data to string
	var logString = JSON.stringify(log);

	// Determine the name of the log file
	var logFileName = check.id;

	// Append the logString to the file
	_logs.append(logFileName, logString, function(err) {
		if (!err) {
			debug('Logging to the file succeeded');
		}
		else {
			debug('Logging to the file failed')
		}
	});
};

// Timer to execute the work-process once per minute
workers.loop = function() {
	setInterval(function() {
		workers.gatherAllChecks();
	}, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = function() {
	// List all the non compressed log files
	_logs.list(false, function(err, logs) {
		if (!err && logs && logs.length > 0) {
			logs.forEach(function(logName){
				// Compress the log to a different file
				var logId = logName.replace('.log', '');
				var newFileId = logId + '-' + Date.now();
				_logs.compress(logId, newFileId, function(err) {
					if (!err) {
						// Truncate the log
						_logs.truncate(logId, function(err) {
							if (!err) {
								debug('Success truncating log file');
							}
							else {
								debug('Error truncating log file');
							}
						});
					}
					else {
						debug('Error compressing one of the log files: ', err);
					}
				});
			});
		}
		else {
			debug('Error: Could not find any logs to rotate');
		}
	});
};

// Timer to execute the log rotation process once per day
workers.logRotationLoop = function() {
	setInterval(function() {
		workers.rotateLogs();
	}, 1000 * 60 * 60 * 24);
};

// Init script
workers.init = function() {

	// Send to console in yellow
	console.log('\x1b[33m%s\x1b[0m', 'Background workers are running...');

	// Execute all the checks
	workers.gatherAllChecks();

	// Call the loop so the checks will execute on their own
	workers.loop();

	// Compress all the logs immediately
	workers.rotateLogs();

	// Call the compression loop so logs will be compressed later on
	workers.logRotationLoop();
};

// Export the module
module.exports = workers;