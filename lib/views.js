/**
 * Handles the template views for the html content
 */
var config = require('./config');
var path = require('path');
var fs = require('fs');

var views = {};

// Get the string content of a template
views.get = function(viewName, data, callback) {
	viewName = typeof(viewName) == 'string' && viewName.length > 0 ? viewName : false;
	data = typeof(data) == 'object' && data !== null ? data : {};

	if (viewName) {
		var dir = path.join(__dirname, '/../views/');

		fs.readFile(dir + viewName + '.html', 'utf8', function(err, str) {
			if (!err && str && str.length > 0) {

				// Do interpolation on the string
				var finalString = views.interpolate(str, data);
				callback(false, finalString);
			}
			else {
				callback('No template view could be found');
			}
		});

	}
	else {
		callback('A valid template view was not specified');
	}
}

// Render the whole page with the header and footer
views.render = function(str, data, callback) {
	str = typeof(str) == 'string' && str.length > 0 ? str : '';
	data = typeof(data) == 'object' && data !== null ? data : {};

	// Get the header
	views.get('header', data, function(err, header) {
		if (!err && header) {

			// Get the footer
			views.get('footer', data, function(err, footer) {
				if (!err && footer) {

					// Add them all together
					var html = header + str + footer;
					callback(false, html);
				}
				else {
					callback('Could not find the footer template');
				}
			});
		}
		else {
			callback('Could not find the header template');
		}
	});
};

// Take a given string and a data object and find/replace all the keys within it
views.interpolate = function(str, data) {
	str = typeof(str) == 'string' && str.length > 0 ? str : '';
	data = typeof(data) == 'object' && data !== null ? data : {};

	// Add the template globals to the data object, prepending their key name with 'global'
	for (var key in config.globals) {
		if (config.globals.hasOwnProperty(key)) {
			data['global.' + key] = config.globals[key];
		}
	}

	// For each key in the data object, insert its value into the string at the corresponding placeholder
	for (var key in data) {
		if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
			var replace = data[key];
			var find = '{' + key + '}';

			str = str.replace(find, replace);
		}
	}

	return str;
};

module.exports = views;