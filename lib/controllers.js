/**
 * Request controllers
 */ 
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

var controllers = {};

// USERS
controllers.users = function(data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		controllers._users[data.method](data, callback);
	}
	else {
		callback(405);
	}
};

// Container for users submethods
controllers._users = {};

// Add user
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
controllers._users.post = function(data, callback) {
	var firstName = (typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0) ? data.payload.firstName.trim() : false;
	var lastName = (typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0) ? data.payload.lastName.trim() : false;
	var phone = (typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false;
	var password = (typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false;
	var tosAgreement = (typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true) ? true : false;

	if (firstName && lastName && phone && password && tosAgreement) {
		_data.read('users', phone, function(err, data) {
			if (err) {
				// Has the password
				var hashedPassword = helpers.hash(password);

				if (hashedPassword) {
					// Create the user object
					var user = {
						'firstName': firstName,
						'lastName': lastName,
						'phone': phone,
						'password': hashedPassword,
						'tosAgreement': true
					};

					_data.create('users', phone, user, function(err) {
						if (!err) {
							callback(200)
						}
						else {
							console.log(err);
							callback(500, {'Error': 'Could not create the new user'});
						}
					});
				}
				else {
					callback(500, {'Error': 'Could not hash the user\' password'})
				}
			}
			else {
				callback(400, {'Error': 'A user with that phone number already exist'});
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required fields'});
	}
}

// Get user
// Required: phone
// Optional: none
controllers._users.get = function(data, callback) {
	var phone = (typeof(data.queryString.phone) == 'string' && data.queryString.phone.length == 10) ? data.queryString.phone.trim() : false;

	if (phone) {
		// Get the token from the headers
		var token = (typeof(data.headers.token) == 'string') ? data.headers.token : false;

		// Verify that the given token is valid for the given user
		controllers._tokens.verify(token, phone, function(isValid) {
			if (isValid) {
				_data.read('users', phone, function(err, data) {
					if (!err && data) {
						// Remove the hashed password before returning the data to the user
						delete data.password;
						callback(200, data);
					}
					else {
						callback(404);
					}
				});
			}
			else {
				callback(403, {'Error': 'Missing required token in header, or token is invalid'});
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required field'});
	}
};

// Update user
// Required: phone
// Optional: firstName, lastName, password
controllers._users.put = function(data, callback) {
	// Check for the required fields
	var phone = (typeof(data.payload.phone) == 'string' && data.payload.phone.length == 10) ? data.payload.phone.trim() : false;

	// Check for optional fields
	var firstName = (typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0) ? data.payload.firstName.trim() : false;
	var lastName = (typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0) ? data.payload.lastName.trim() : false;
	var password = (typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false;
	var tosAgreement = (typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true) ? true : false;

	if (phone) {
		if (firstName || lastName || password) {

			// Get the token from the headers
			var token = (typeof(data.headers.token) == 'string') ? data.headers.token : false;

			// Verify that the given token is valid for the given user
			controllers._tokens.verify(token, phone, function(isValid) {
				if (isValid) {

					// Lookup the user
					_data.read('users', phone, function(err, data) {
						if (!err && data) {
							// Update the fields necessary
							data.firstName = (firstName) ? firstName : data.firstName;
							data.lastName = (lastName) ? lastName : data.lastName;
							data.password = (password) ? helpers.hash(password) : data.password;

							// Store the new updates
							_data.update('users', phone, data, function(err) {
								if (!err) {
									callback(200);
								}
								else {
									console.log(err);
									callback(500, {'Error': 'Could not update the user'});
								}
							});
						}
						else {
							callback(400, {'Error': 'The specified user does not exist'});
						}
					});
				}
				else {
					callback(403, {'Error': 'Missing required token in header, or token is invalid'});
				}
			});
		}
		else {
			callback(400, {'Error': 'Missing fields to update'});
		}
	}
	else {
		callback(400, {'Error': 'Missing required fields'});
	}
};

// Delete user
// Required: phone
controllers._users.delete = function(data, callback) {
	var phone = (typeof(data.queryString.phone) == 'string' && data.queryString.phone.length == 10) ? data.queryString.phone.trim() : false;

	if (phone) {
		// Get the token from the headers
		var token = (typeof(data.headers.token) == 'string') ? data.headers.token : false;

		// Verify that the given token is valid for the given user
		controllers._tokens.verify(token, phone, function(isValid) {
			if (isValid) {
				_data.read('users', phone, function(err, userData) {
					if (!err && userData) {
						_data.delete('users', phone, function(err) {
							if (!err) {
								// Delete each of the checks associated with the user
								var checks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
								var checksToDelete = checks.length;
								
								if (checksToDelete > 0) {
									var checksDeleted = 0;
									var deletionError = false;

									// Loop through the checks
									checks.forEach(function(checkId) {
										_data.delete('checks', checkId, function(err) {
											if (err) {
												deletionError = true;
											}

											checksDeleted++;

											if (checksDeleted == checksToDelete) {
												if (!deletionError) {
													callback(200);
												}
												else {
													callback(500, {'Error': 'Errors encountered  while attempting to delete all of the user\'s checks'});
												}
											}
										});
									});
								}
								else {
									callback(200);
								}
							}
							else {
								callback(500, {'Error': 'Could not delete the specified user'});
							}
						});
					}
					else {
						callback(400, {'Error': 'Could not find the specified user'});
					}
				});
			}
			else {
				callback(403, {'Error': 'Missing required token in header, or token is invalid'});
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required field'});
	}
};


// TOKENS
controllers.tokens = function(data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		controllers._tokens[data.method](data, callback);
	}
	else {
		callback(405);
	}
};

// Container for all the tokens submethods
controllers._tokens = {};

// Add token
// Required: phone, password
// Optional: none
controllers._tokens.post = function(data, callback) {
	var phone = (typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10) ? data.payload.phone.trim() : false;
	var password = (typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0) ? data.payload.password.trim() : false;

	if (phone && password) {
		// Look up the user who matches that phone number
		_data.read('users', phone, function(err, data) {
			if (!err && data) {
				// Hash the password and compare to the user stored password
				hashedPassword = helpers.hash(password);

				if (hashedPassword == data.password) {
					// Create a new token
					// Set expiration data 1 hour in the future
					var token = helpers.createRandomString(20);
					var expires = Date.now() + 1000 * 60 * 60;
					var tokenObject = {
						'phone': phone,
						'id': token,
						'expires': expires
					};

					// Store the token
					_data.create('tokens', token, tokenObject, function(err) {
						if (!err) {
							callback(200, tokenObject);
						}
						else {
							callback(500, {'Error': 'Could not create the new token'});
						}
					});
				}
				else {
					callback(400, {'Error': 'Password did not match the user\'s stored password'});
				}
			}
			else {
				callback(400, {'Error': 'Could not find the specified user'});
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required fields'});
	}
};

// Get token
// Required: token id
// Optional: none
controllers._tokens.get = function(data, callback) {
	var token = (typeof(data.queryString.id) == 'string' && data.queryString.id.length == 20) ? data.queryString.id.trim() : false;

	if (token) {
		_data.read('tokens', token, function(err, data) {
			if (!err && data) {
				callback(200, data);
			}
			else {
				callback(404);
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required field'});
	}
};

// Update token
// Required: token id, extend
// Optional: none
controllers._tokens.put = function(data, callback) {
	var token = (typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20) ? data.payload.id.trim() : false;
	var extend = (typeof(data.payload.extend) == 'boolean' && data.payload.extend == true) ? true : false;

	if (token && extend) {
		_data.read('tokens', token, function(err, data) {
			if (!err && data) {
				// Check if token isn't already expired
				if (data.expires > Date.now()) {
					data.expires = Date.now() + 1000 * 60 * 60;

					// Store the new updates
					_data.update('tokens', token, data, function(err) {
						if (!err) {
							callback(200);
						}
						else {
							callback(500, {'Error': 'Could not update the token\'s expiration'});
						}
					});
				}
				else {
					callback(400, {'Error': 'The token has already expired and cannot be extended'});
				}
			}
			else {
				callback(400, {'Error': 'Specified token does not exist'});
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required fields or fields are invalid'});
	}

};

// Delete token
// Required: token id
// Optional: none
controllers._tokens.delete = function(data, callback) {
	var token = (typeof(data.queryString.id) == 'string' && data.queryString.id.length == 20) ? data.queryString.id.trim() : false;

	if (token) {
		_data.read('tokens', token, function(err, data) {
			if (!err && data) {
				_data.delete('tokens', token, function(err) {
					if (!err) {
						callback(200);
					}
					else {
						callback(500, {'Error': 'Could not delete the specified token'});
					}
				});
			}
			else {
				callback(400, {'Error': 'Could not find the specified token'});
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required field'});
	}
};

// Verfiy of the given token is valid for a given user
controllers._tokens.verify = function(token, phone, callback) {
	// Lookup the token
	_data.read('tokens', token, function(err, data) {
		if (!err && data) {
			if (data.phone == phone && data.expires > Date.now()) {
				callback(true);
			}
			else {
				callback(false);
			}
		}
		else {
			callback(false);
		}
	});
};

// CHECKS
controllers.checks = function(data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		controllers._checks[data.method](data, callback);
	}
	else {
		callback(405);
	}
};

// Container for users submethods
controllers._checks = {};

// Add check
// Required: protocol, url, method, successCodes, timeoutSeconds
// Optional: none
controllers._checks.post = function(data, callback) {
	// Validate inputs
	var protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

	if (protocol && url && method && successCodes && timeoutSeconds) {

		// Get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// Lookup the user by reading the token
		_data.read('tokens', token, function(err, tokenData) {
			if (!err && tokenData) {
				var phone = tokenData.phone;

				_data.read('users', phone, function(err, userData) {
					if (!err && userData) {
						var checks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

						// Verify if the user has less than the number of maxChecks 
						if (checks.length < config.maxChecks) {
							// Create a random id for the check
							var checkId = helpers.createRandomString(20);

							// Create the check object
							var checkObj = {
								'id': checkId,
								'phone': phone,
								'protocol': protocol,
								'url': url,
								'method': method,
								'successCodes': successCodes,
								'timeoutSeconds': timeoutSeconds
							};

							// Save the object
							_data.create('checks', checkId, checkObj, function(err) {
								if (!err) {
									// Add the check id to the users data
									userData.checks = checks;
									userData.checks.push(checkId);

									// Save the new user data
									_data.update('users', phone, userData, function(err) {
										if (!err) {
											// Return the data of the new check
											callback(200, checkObj);
										}
										else {
											callback(500, {'Error': 'Could not update the user with the new check'});
										}
									});
								}
								else {
									callback(500, {'Error': 'Could not create the new check'});
								}
							});
						}
						else {
							callback(400, {'Error': 'The user already has the maximum number of checks (' + config.maxChecks + ')'});
						}
					}
					else {
						callback(403);
					}
				});
			}
			else {
				callback(403)
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required inputs, or inputs are invalid'});
	}
};

// Get check
// Required: checkId
// Optional: none
controllers._checks.get = function(data, callback) {
	var checkId = (typeof(data.queryString.id) == 'string' && data.queryString.id.length == 20) ? data.queryString.id.trim() : false;
	console.log(checkId);

	if (checkId) {

		// Lookup the check
		_data.read('checks', checkId, function(err, checkData) {
			if (!err && checkData) {

				// Get the token from the headers
				var token = (typeof(data.headers.token) == 'string') ? data.headers.token : false;

				// Verify that the given token is valid and belongs to the user who created the check
				controllers._tokens.verify(token, checkData.phone, function(isValid) {
					if (isValid) {
						// Return the check data
						callback(200, checkData);
					}
					else {
						callback(403);
					}
				});
			}
			else {
				callback(404);
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required field'});
	}
};

// Update check
// Required: checkId
// Optional: protocol, url, method, successCodes, timeoutSeconds
controllers._checks.put = function(data, callback) {
	// Validate inputs
	var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
	var protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;


	// Check to make sure id is valid
	if (id) {

		// Check to make sure one or more optional fields has been sent
		if (protocol || url || method || successCodes || timeoutSeconds) {
			// Look up check
			_data.read('checks', id, function(err, checkData) {
				if (!err && checkData) {
					// Get the token from the headers
					var token = (typeof(data.headers.token) == 'string') ? data.headers.token : false;

					// Verify that the given token is valid and belongs to the user who created the check
					controllers._tokens.verify(token, checkData.phone, function(isValid) {
						if (isValid) {
							// Update the check where necessary
							checkData.protocol = (protocol) ? protocol : checkData.protocol;
							checkData.url = (url) ? url : checkData.url;
							checkData.method = (method) ? method : checkData.method;
							checkData.successCodes = (successCodes) ? successCodes : checkData.successCodes;
							checkData.timeoutSeconds = (timeoutSeconds) ? timeoutSeconds : checkData.timeoutSeconds;

							// Store check updates
							_data.update('checks', id, checkData, function(err) {
								if (!err) {
									callback(200);
								}
								else {
									callback(500, {'Error': 'Could not update the check'});
								}
							});
						}
						else {
							callback(403);
						}
					});
				}
				else {
					callback(400, {'Error': 'Check ID does not exist'});
				}
			});
		}
		else {
			callback(400, {'Error': 'Missing fields to update'});
		}
	}
	else {
		callback(400, {'Error': 'Missing required fields'});
	}
};

// Delete check
// Required: checkId
// Optional: none
controllers._checks.delete = function(data, callback) {
	var id = (typeof(data.queryString.id) == 'string' && data.queryString.id.length == 20) ? data.queryString.id.trim() : false;

	if (id) {
		_data.read('checks', id, function(err, checkData) {
			if (!err && checkData) {
				// Get the token from the headers
				var token = (typeof(data.headers.token) == 'string') ? data.headers.token : false;

				// Verify that the given token is valid and belongs to the user who created the check
				controllers._tokens.verify(token, checkData.phone, function(isValid) {
					if (isValid) {

						// Delete the check data
						_data.delete('checks', id, function(err) {
							if (!err) {
								// Lookup the user
								_data.read('users', checkData.phone, function(err, userData) {
									if (!err && userData) {
										var checks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

										// Remove the deleted check from the list of checks
										var checkPosition = checks.indexOf(id);
										if (checkPosition > -1) {
											checks.splice(checkPosition, 1);

											// Re-save the users data
											_data.update('users', checkData.phone, userData, function(err) {
												if (!err) {
													callback(200);
												}
												else {
													callback(500, {'Error': 'Could not update the user'});
												}
											});
										}
										else {
											callback(500, {'Error': 'Could not find the check on the user\' object.'});
										}
									}
									else {
										callback(500, {'Error': 'Could not find the specified user who created the check'});
									}
								})
							}
							else {
								callback(500, {'Error': 'Could not delete the check data'});
							}
						});
					}
					else {
						callback(403);
					}
				});
			}
			else {
				callback(400, {'Error': 'The specified check ID does not exist'});
			}
		});
	}
	else {
		callback(400, {'Error': 'Missing required field'});
	}
};

controllers.ping = function(data, callback) {
	callback(200);
};

controllers.notFound = function(data, callback) {
	callback(404);
};

module.exports = controllers;