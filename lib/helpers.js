/**
 * Helpers for various tasks
 */
var crypto = require('crypto');
var fs = require('fs');
var https = require('https');
var path = require('path');
var querystring = require('querystring');
var config = require('./config');

var helpers = {};

// Create a SHA256 hash
helpers.hash = function(str) {
	if (typeof(str) == 'string' && str.length > 0) {
		var hash = crypto.createHmac('sha256', config.hashSecret).update(str).digest('hex');
		return hash;
	}
	else {
		return false;
	}
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJSONtoObject = function(str) {
	try {
		var obj = JSON.parse(str);
		return obj;
	}
	catch (e) {
		return {};
	}
};

// Create a string of random alpha-numeric characters of a given length
helpers.createRandomString = function(strLength) {
	if (typeof(strLength) == 'number' && strLength > 0) {
		var possibleCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var str = '';

		for (i = 1; i <= strLength; i++) {
			var randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
			str += randomChar;
		}

		return str;
	}
	else {
		return false;
	}
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = function(phone, msg, callback) {
	phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
	msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

	if (phone && msg) {
		//Config the request payload 
		var payload = {
			'From': config.twilio.fromPhone,
			'To': '+1'+phone,
			'Body': msg
		};

		//Stringify the payload
		var stringPayload = querystring.stringify(payload);

		// Configure the request details
		var requestDetails = {
			'protocal': 'https:',
			'hostname': 'api.twilio.com',
			'method': 'POST',
			'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
			'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
			'headers': {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(stringPayload)
			}
		};

		// Instantiate the request object
		var req = https.request(requestDetails, function(res) {
			// Grab the status of the sent request
			var status = res.statusCode;

			if (status == 200 || status == 201) {
				callback(false);
			}
			else {
				callback('Status code returned was ' + status);
			}
		});

		// Bind to the error event so it doesn't get thrown
		req.on('error', function(e) {
			callback(e);
		});

		req.write(stringPayload);
		req.end();
	}
	else {
		callback('Given parameters were missing or invalid');
	}
};

// Get the contents of a static (public) asset
helpers.getStaticAsset = function(fileName, callback) {
	fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
	if (fileName) {
		var dir = path.join(__dirname, '/../public/');
		fs.readFile(dir + fileName, function(err, data) {
			if (!err && data) {
				callback(false, data);
			}
			else {
				callback('No file could be found');
			}
		});
	}
	else {
		callback('A valid filename was not specified');
	}
};

module.exports = helpers;