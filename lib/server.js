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

		// If the request is within the public directory, use the public controller instead
		handler = trimmedPath.indexOf('public/') > -1 ? controllers.public : handler;


		var data = {
			'trimmedPath': trimmedPath,
			'queryString': qs,
			'method': method,
			'headers': headers,
			'payload': helpers.parseJSONtoObject(payload)
		};

		handler(data, function(statusCode, payload, contentType) {
			contentType = typeof(contentType) == 'string' ? contentType : 'json';
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			// Return the response parts that are content-specific
			var payloadString = '';
			
			if (contentType == 'json') {
				response.setHeader('Content-Type', 'application/json');
				payload = typeof(payload) == 'object' ? payload : {};
				payloadString = JSON.stringify(payload);
			}
			else if (contentType == 'html') {
				response.setHeader('Content-Type', 'text/html');
				payloadString = typeof(payload) == 'string' ? payload : '';
			}
			else if (contentType == 'css') {
				response.setHeader('Content-Type', 'text/css');
				payloadString = typeof(payload) == 'object' ? payload : '';
			}
			else if (contentType == 'js') {
				response.setHeader('Content-Type', 'text/javascript');
				payloadString = typeof(payload) == 'object' ? payload : '';
			}
			else if (contentType == 'png') {
				response.setHeader('Content-Type', 'image/png');
				payloadString = typeof(payload) == 'object' ? payload : '';
			}
			else if (contentType == 'jpg') {
				response.setHeader('Content-Type', 'image/jpeg');
				payloadString = typeof(payload) == 'object' ? payload : '';
			}
			else if (contentType == 'favicon') {
				response.setHeader('Content-Type', 'image/x-icon');
				payloadString = typeof(payload) == 'object' ? payload : '';
			}
			else if (contentType == 'plain') {
				response.setHeader('Content-Type', 'text/plain');
				payloadString = typeof(payload) == 'string' ? payload : '';
			}

			// Return the response parts that are common to all content types
			response.writeHead(statusCode);
			response.end(payloadString);

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

// Define a request router
server.routes = {
	'': controllers.index,
	'account/create': controllers.accountCreate,
	'account/edit': controllers.accountEdit,
	'account/deleted': controllers.accountDeleted,
	'session/create': controllers.sessionCreate,
	'session/deleted': controllers.sessionDeleted,
	'checks/all': controllers.checksList,
	'checks/create': controllers.checksCreate,
	'checks/edit': controllers.checksEdit,
	'ping': controllers.ping,
	'api/users': controllers.users,
	'api/tokens': controllers.tokens,
	'api/checks': controllers.checks,
	'public': controllers.public,
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