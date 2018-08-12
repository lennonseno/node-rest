// Container for the front-end application
var app = {};

// Config
app.config = {
	'sessionToken': false
};

// Ajax client for the restful api
app.client = {};

// Interface for making API calls
app.client.request = function(headers, path, method, qs, payload, callback) {

	// Set default
	headers = typeof(headers) == 'object' && headers !== null ? headers : {};
	path = typeof(path) == 'string' ? path : '/';
	method = typeof(method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET'; 
	qs = typeof(qs) == 'object' && qs !== null ? qs : {};
	payload = typeof(payload) == 'object' && payload !== null ? payload : {};
	callback = typeof(callback) == 'function' ? callback : false;

	// Build request url with the query string
	var url = path + '?';
	var counter = 0;
	for (var key in qs) {
		if (qs.hasOwnProperty(key)) {
			counter++;

			// If at least one query string parameter  has already been added
			if (counter > 1) {
				url += '&';
			}

			url += key + '=' + qs[key]
		}
	}

	// Form the http request as a JSON type
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, true);
	xhr.setRequestHeader('Content-Type', 'application/json');

	for(var key in headers) {
		if (headers.hasOwnProperty(key)) {
			xhr.setRequestHeader(key, headers[key]);
		}
	}

	// If there's a current session, add that as a header
	if (app.config.sessionToken) {
		xhr.setRequestHeader('token', app.config.sessionToken.id);
	}

	// When the request comes back, handle the response
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			var statusCode = xhr.status;
			var response = xhr.responseText;

			// Callback if requested
			if (callback) {
				try {
					var parsedResponse = JSON.parse(response);
					callback(statusCode, parsedResponse);
				}
				catch(e) {
					callback(statusCode, false);
				}
			}
		}
	};

	// Send the payload as JSON
	var payloadString = JSON.stringify(payload);
	xhr.send(payloadString);
};