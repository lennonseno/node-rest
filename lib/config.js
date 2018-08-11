/**
 * Create and export configuration variables
 */

// Container for all environments
var environment = {};

environment.staging = {
	'httpPort': 3000,
	'httpsPort': 3001,
	'name': 'staging',
	'hashSecret': 'ThisIsMySecret',
	'maxChecks': 5,
	'twilio': {
	    'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
	    'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
	    'fromPhone' : '+15005550006'
	},
	'globals': {
		'appName': 'Node.js Restful',
		'companyName': 'Klik Designs',
		'copyrightYear': '2018',
		'baseUrl': 'http://localhost:3000/'
	}
};

environment.production = {
	'httpPort': 5000,
	'httpsPort': 5001,
	'name': 'production',
	'hashSecret': 'ThisIsAlsoMySecret',
	'maxChecks': 5,
	'twilio': {
	    'accountSid' : '',
	    'authToken' : '',
	    'fromPhone' : ''
	},
	'globals': {
		'appName': 'Node.js Restful',
		'companyName': 'Klik Designs',
		'copyrightYear': '2018',
		'baseUrl': 'http://localhost:5000/'
	}
};

// Determine which environment was passed as a command-line argument
var currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';
var envToExport = typeof(environment[currentEnv]) == 'object' ? environment[currentEnv] : environment.staging;

// Export the module
module.exports = envToExport;