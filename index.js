/**
 * Primary file for the APi
 */
var server = require('./lib/server');
var workers = require('./lib/workers');

app = {};

app.init = function() {
	// Start the server
	server.init();

	// Start the workers
	workers.init();
};

app.init();


// Export the app
module.exports = app;