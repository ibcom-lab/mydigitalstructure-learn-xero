/*
	MYDIGITALSTRUCTURE-XERO PROXY CONNECT;

	Used to set up OAuth2 connection between mydigitalstructure space and xero.

	Depends on;
	https://learn-next.mydigitalstructure.cloud/learn-function-automation

	---

	This is a lambda compliant node app with a wrapper to process data from API Gateway & respond to it.

	To run it on your local computer your need to install
	https://www.npmjs.com/package/lambda-local and then run as:

	lambda-local -l index.js -t 9000 -e event-1991.json

	Also see learn.js for more example code using the mydigitalstructure node module.

	API Gateway docs:
	- https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
	
	!!! In production make sure the settings.json is unrestricted data with functional restriction to setup_user
	!!! The apiKey user has restricted data (based on relationships) and functional access

	Run;
	lambda-local -l index.proxy-connect.js -t 9000 -e event-lab.json

	mydigitalstructure.cloud.search(
	{
		object: 'core_protect_key',
		fields: ['object', 'objectcontext', 'title', 'key', 'notes']
	})
*/

exports.handler = function (event, context, callback)
{
	var mydigitalstructure = require('mydigitalstructure')
	var _ = require('lodash')
	var moment = require('moment');

	console.log(event)

	mydigitalstructure.set(
	{
		scope: 'app',
		context: 'event',
		value: event
	});

	mydigitalstructure.set(
	{
		scope: 'app',
		context: 'context',
		value: context
	});

	/*
		Use promise to responded to API Gateway once all the processing has been completed.
	*/

	const promise = new Promise(function(resolve, reject)
	{	
		mydigitalstructure.init(main)

		function main(err, data)
		{
			/*
				app initialises with mydigitalstructure.invoke('app-init') after controllers added.
			*/

			mydigitalstructure.add(
			{
				name: 'app-init',
				code: function ()
				{
					mydigitalstructure._util.message('Using mydigitalstructure module version ' + mydigitalstructure.VERSION);
					mydigitalstructure._util.message(mydigitalstructure.data.session);

					var eventData = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'event'
					});

					var request =
					{ 
						body: {},
						queryString: {},
						headers: {}
					}

					if (eventData != undefined)
					{
						request.queryString = eventData.queryStringParameters;
						request.headers = eventData.headers;

						if (_.isString(eventData.body))
						{
							request.body = JSON.parse(eventData.body)
						}
						else
						{
							request.body = eventData.body;
						}	
					}

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'request',
						value: request
					});

					console.log(request);

					//mydigitalstructure.invoke('app-auth');
					mydigitalstructure.invoke('app-start');
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-auth',
				code: function (param)
				{
					// 1.0.1: Use the apiKey to get the user record

					var request = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'request'
					});

					var requestApiKeyGUID = request.body.apikey;

					mydigitalstructure.cloud.search(
					{
						object: 'setup_user',
						fields: [{name: 'username'}],
						filters:
						[
							{
								field: 'guid',
								comparison: 'EQUAL_TO',
								value: requestApiKeyGUID
							}
						],
						callback: 'app-auth-process'
					});
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-auth-process',
				code: function (param, response)
				{
					console.log(response)

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'user',
						value: response
					});

					if (response.status == 'ER')
					{
						mydigitalstructure.invoke('util-end', {error: 'Error processing user authentication.'}, '401');
					}
					else
					{
						if (response.data.rows.length == 0)
						{
							var request = mydigitalstructure.get(
							{
								scope: 'app',
								context: 'request'
							});

							var requestApiKeyGUID = request.body.apikey;

							mydigitalstructure.invoke('util-end', {error: 'Bad apikey [' + requestApiKeyGUID + ']'}, '401');
						}
						else
						{
							var user = _.first(response.data.rows);

							var request = mydigitalstructure.get(
							{
								scope: 'app',
								context: 'request'
							});

							var requestAuthKeyGUID = request.body.authkey;

							mydigitalstructure.logon('app-auth-logon-process',
							{
								logon: user.username,
								password: requestAuthKeyGUID
							});
						}
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-auth-logon-process',
				code: function (response)
				{
					if (response.status == 'ER')
					{
						mydigitalstructure.invoke('util-end', {error: 'Bad authkey [' + requestAuthKeyGUID + ']'}, '401');
					}
					else
					{
						console.log(response);

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'user',
							value: response
						});

						mydigitalstructure.invoke('app-user');
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-user',
				code: function (param)
				{
					mydigitalstructure.cloud.invoke(
					{
						method: 'core_get_user_details',
						callback: 'app-user-process'
					});
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-user-process',
				code: function (param, response)
				{
					console.log(response)

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'user',
						value: response
					})

					mydigitalstructure.invoke('app-start')
				}
			});

			mydigitalstructure.add(
			{
				name: 'util-uuid',
				code: function (param)
				{
					var pattern = mydigitalstructure._util.param.get(param, 'pattern', {"default": 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'}).value;
					var scope = mydigitalstructure._util.param.get(param, 'scope').value;
					var context = mydigitalstructure._util.param.get(param, 'context').value;

					var uuid = pattern.replace(/[xy]/g, function(c) {
						    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
						    return v.toString(16);
						  });

					mydigitalstructure.set(
					{
						scope: scope,
						context: context,
						value: uuid
					})
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-log',
				code: function ()
				{
					var eventData = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'event'
					});

					mydigitalstructure.cloud.invoke(
					{
						object: 'core_debug_log',
						fields:
						{
							data: JSON.stringify(eventData),
							notes: 'app Log (Event)'
						}
					});

					var requestData = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'request'
					});

					mydigitalstructure.cloud.invoke(
					{
						object: 'core_debug_log',
						fields:
						{
							data: JSON.stringify(requestData),
							notes: 'app Log (Request)'
						}
					});

					var contextData = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'context'
					});

					mydigitalstructure.cloud.invoke(
					{
						object: 'core_debug_log',
						fields:
						{
							data: JSON.stringify(contextData),
							notes: 'appLog (Context)'
						},
						callback: 'app-log-saved'
					});
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-log-saved',
				code: function (param, response)
				{
					mydigitalstructure._util.message('Log data saved to mydigitalstructure.cloud');
					mydigitalstructure._util.message(param);
					mydigitalstructure._util.message(response);
				
					mydigitalstructure.invoke('app-respond')
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-respond',
				code: function (response)
				{
					if (response == undefined)
					{
						response = mydigitalstructure.get(
						{
							scope: 'app',
							context: 'response'
						});
					}

					var statusCode = response.httpStatus;
					if (statusCode == undefined) {statusCode = '200'}

					var body = response.data;
					if (body == undefined) {body = {}}

					var headers = response.headers;
					if (headers == undefined) {headers = {}}

					let httpResponse =
					{
						statusCode: statusCode,
						headers: headers,
						body: JSON.stringify(body)
					};

					resolve(httpResponse)
				}
			});

			mydigitalstructure.add(
			{
				name: 'util-end',
				code: function (data, statusCode, headers)
				{
					if (statusCode == undefined) { statusCode: '200' }

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'response',
						value: {data: data, statusCode: statusCode, headers: headers}
					});

					mydigitalstructure.invoke('app-respond')
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-start',
				code: function ()
				{
					var request = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'request'
					});

					var mode;
					var method;

					var data = request.body;

					if (data != undefined)
					{
						var mode = data.mode;
						var method = data.method;
					}

					if (_.isString(mode))
					{
						mode = {type: mode, status: 'OK'}
					}

					if (mode == undefined)
					{
						mode = {type: 'live', status: 'OK'}
					}

					if (mode.status == undefined)
					{
						mode.status = 'OK';
					}

					mode.status = mode.status.toUpperCase();

					if (mode.type == 'reflect')
					{
						var response = {}

						if (mode.data != undefined)
						{
							response.data = mode.data;
						}
						
						mydigitalstructure.invoke('util-uuid',
						{
							scope: 'guid',
							context: 'log'
						});

						response.data = _.assign(response.data,
						{
							status: mode.status,
							method: method,
							reflected: data,
							guids: mydigitalstructure.get(
							{
								scope: 'guid'
							})
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'response',
							value: response
						});

						mydigitalstructure.invoke('app-respond');
					}
					else
					{
						mydigitalstructure.invoke('app-process');
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-process',
				code: function ()
				{
					var request = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'request'
					});

					var data = request.body;

					var method;

					if (data != undefined)
					{
						method = data.method;
					}

					if (method == undefined)
					{
						if (_.has(request.queryString, 'code'))
						{
							//if request has code then set method = 'set-consent' - ie from redirectURI
							method = 'set-consent';
						}
						else
						{
							method = 'get-consent';
						}
					}
		
					if (method == 'get-consent' || method == 'set-consent')
					{
						mydigitalstructure.invoke('app-process-' + method)
					}
					else
					{
						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'response',
							value:
							{
								status: 'ER',
								data: {error: {code: '2', description: 'Not a valid method [' + method + ']'}}
							}
						});

						mydigitalstructure.invoke('app-respond');
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-process-get-consent',
				code: function ()
				{
					var request = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'request'
					});

					const xeroNode = require("xero-node");

					var settings = mydigitalstructure.get({scope: '_settings'});

					console.log('!!! app-process-get-consent');
					console.log(settings.xero)

					if (settings.xero == undefined)
					{
						console.log('!!! NO XERO SETTINGS')
					}
					else
					{
						const xero = new xeroNode.XeroClient(
						{
			            clientId: settings.xero.clientID,
			            clientSecret: settings.xero.clientSecret,
			            redirectUris: [settings.xero.redirectURL],
			            scopes: settings.xero.scopes.split(" "),
			        });

						xero.buildConsentUrl().then(
							function (data)
							{
								mydigitalstructure.invoke('app-process-get-consent-response', {consentURL: data});
								console.log(data)
							})
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-process-get-consent-response',
				code: function (param)
				{
					if (param.consentURL == undefined)
					{
						mydigitalstructure.invoke('util-end', {error: 'Can not get consent URL.'}, '500');
					}
					else
					{
						let httpResponse =
						{
							statusCode: 301,
							headers:
							{
		               	"Access-Control-Allow-Origin": "*",
		               	Location: param.consentURL
		           		}
						};

						resolve(httpResponse)
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-process-set-consent',
				code: function ()
				{
					var request = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'request'
					});

					var event = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'event'
					});

					const xeroNode = require("xero-node");

					var settings = mydigitalstructure.get({scope: '_settings'});

					console.log('!!! app-process-set-consent');
					console.log(settings.xero)

					if (settings.xero == undefined)
					{
						console.log('!!! NO XERO SETTINGS')
					}
					else
					{
						const xero = new xeroNode.XeroClient(
						{
			            clientId: settings.xero.clientID,
			            clientSecret: settings.xero.clientSecret,
			            redirectUris: [settings.xero.redirectURL],
			            scopes: settings.xero.scopes.split(" "),
			        	});

						var url = event.rawPath + '?' + event.rawQueryString;

						console.log(url)

						xero.initialize()
						.then(function ()
						{
							xero.apiCallback(url)
							.then(function (tokenSet)
							{
								console.log(tokenSet)

								mydigitalstructure.set(
								{
									scope: 'app',
									context: 'token-set',
									value: tokenSet
								})

								xero.updateTenants()
								.then(function ()
								{
									mydigitalstructure.invoke('app-process-set-consent-response');
								},
								function (error)
								{
									console.log(error);
									mydigitalstructure.invoke('util-end', {error: 'get-tenants(xero.updateTenants).'}, '500');
								})
							},
							function (error)
							{
								console.log(error);
								mydigitalstructure.invoke('util-end', {error: 'get-token(xero.apiCallback).'}, '500');
							})
						})
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-process-set-consent-response',
				code: function (param)
				{
					var tokenSet = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'token-set'
					});

					if (tokenSet == undefined)
					{
						mydigitalstructure.invoke('util-end', {error: 'Can not set consent tokens.'}, '500');
					}
					else
					{
						mydigitalstructure.invoke('app-process-set-consent-response-persist-refresh-token')
					}
				}
			});

			mydigitalstructure.add(
			{
				name: 'app-process-set-consent-response-persist-refresh-token',
				code: function (param, response)
				{
					var tokenSet = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'token-set'
					});

					var session = mydigitalstructure.get({scope: 'session'});

					if (response == undefined)
					{
						mydigitalstructure.cloud.save(
						{
							object: 'core_protect_key',
							data:
							{
								title: 'refresh-token',
								type: 2,
								object: 22,
								objectcontext: session.user,
								notes: JSON.stringify(tokenSet),
								key: tokenSet.refresh_token
							},
							callback: 'app-process-set-consent-response-persist-refresh-token'
						});
					}
					else
					{
						mydigitalstructure.invoke('util-end', 
						{message: 'Connection established'},
						'200');
					}
				}
			});
	
			// !!!! APP STARTS HERE; Initialise the app; app-init invokes app-start if authentication OK
			mydigitalstructure.invoke('app-init');
		}		
   });

  	return promise
}