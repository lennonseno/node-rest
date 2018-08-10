/**
 * Library for storing and editing data
 */
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

var lib = {};
// Base directory  of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = function(dir, file, data, callback) {
	fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', function(err, fileDescriptor) {
		if (!err && fileDescriptor) {
			// Convert data to string
			var stringData = JSON.stringify(data);

			fs.writeFile(fileDescriptor, stringData, function(err) {
				if (!err) {
					fs.close(fileDescriptor, function(err) {
						if (!err) {
							callback(false);
						}
						else {
							callback('Error closing new file');
						}
					});
				}
				else {
					callback('Error writing to new file');
				}
			});
		}
		else {
			callback('Could not create new file, it may already exist.');
		}
	});
};

// Read data from a file
lib.read = function(dir, file, callback) {
	fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf-8', function(err, data) {
		if (!err && data) {
			var parsedData = helpers.parseJSONtoObject(data);
			callback(false, parsedData);
		}
		else {
			callback(err, data);
		}
	});
};

// Update existing file with data
lib.update = function(dir, file, data, callback) {
	fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', function(err, fileDescriptor) {
		if (!err && fileDescriptor) {
			// Convert data to string
			var stringData = JSON.stringify(data);

			fs.truncate(fileDescriptor, function(err) {
				if (!err) {
					// Write to the file and close it
					fs.writeFile(fileDescriptor, stringData, function(err) {
						if (!err) {
							fs.close(fileDescriptor, function(err) {
								if (!err) {
									callback(false);
								}
								else {
									callback('Error closing the file');
								}
							});
						}
						else {
							callback('Error writing to existing file');
						}
					});
				}
				else {
					callback('Error truncating file');
				}
			});
		}
		else {
			callback('Could not open the file for updating, it may not exist yet');
		}
	});
};

// Deleting a file
lib.delete = function(dir, file, callback) {
	// Unlink the file
	fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err) {
		if (!err) {
			callback(false);
		}
		else {
			callback('Error deleting file');
		}
	});
};

// List all the items in the directory
lib.list = function(dir, callback) {
	fs.readdir(lib.baseDir + dir + '/', function(err, data) {
		if (!err && data) {
			var trimmedFilenames = [];
			data.forEach(function(fileName) {
				trimmedFilenames.push(fileName.replace('.json', ''));
			});

			callback(false, trimmedFilenames);
		}
		else {
			callback(err, data);
		}
	});
};

module.exports = lib;