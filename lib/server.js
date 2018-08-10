/**
 * Server-related tasks
 */
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var path = require('path');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var controllers = require('./controllers');
var helpers = require('./helpers');
var util = require('util');
var debug = util.debuglog('server');

// Instantiate the server module
var server = {};

// Defining the HTTP server
server.httpServer = http.createServer(function(request, response) {
	server.unifiedServer(request, response);
});

// Defining the HTTPS server
server.httpsServerOptions = {
	'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
	'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(request, response) {
	server.unifiedServer(request, response);
});

server.unifiedServer = function(request, response) {
	var parsedUrl = url.parse(request.url, true);
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');
	var method = request.method.toLowerCase();
	var qs = parsedUrl.query;
	var headers = request.headers;
	var decoder = new StringDecoder('utf-8');
	var payload = '';

	request.on('data', function(data) {
		payload += decoder.write(data);
	});

	request.on('end', function() {
		payload += decoder.end();

		var handler = (typeof(server.routes[trimmedPath]) !== 'undefined') ? server.routes[trimmedPath] : controllers.notFound;
		var data = {
			'trimmedPath': trimmedPath,
			'queryString': qs,
			'method': method,
			'headers': headers,
			'payload': helpers.parseJSONtoObject(payload)
		};

		handler(data, function(statusCode, payload) {
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
			payload = typeof(payload) == 'object' ? payload : {};
			payload = JSON.stringify(payload);

			response.setHeader('Content-Type', 'application/json');
			response.writeHead(statusCode);
			response.end(payload);

			// If the response is 200, print green otherwise print red
			if (statusCode == 200) {
				debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			}
			else {
				debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			}
		});
	});
};

server.routes = {
	'ping': controllers.ping,
	'users': controllers.users,
	'tokens': controllers.tokens,
	'checks': controllers.checks
};

// Init script
server.init = function() {
	// Start the http server
	server.httpServer.listen(config.httpPort, function() {
		console.log('\x1b[36m%s\x1b[0m', 'The server is listening to port ' + config.httpPort + '.');
	});

	// Start the https server
	server.httpsServer.listen(config.httpsPort, function() {
		console.log('\x1b[35m%s\x1b[0m', 'The server is listening to port ' + config.httpsPort + '.');
	});
};

// Export the server module
module.exports = server;