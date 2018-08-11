/**
 * Handles the template views for the html content
 */
var path = require('path');
var fs = require('fs');

var views = {};

// Get the string content of a template
views.get = function(viewName, callback) {
	viewName = typeof(viewName) == 'string' && viewName.length > 0 ? viewName : false;

	if (viewName) {
		var dir = path.join(__dirname, '/../views/');

		fs.readFile(dir + viewName + '.html', 'utf8', function(err, str) {
			if (!err && str && str.length > 0) {
				callback(false, str);
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


module.exports = views;