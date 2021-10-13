/*
	MYDIGITALSTRUCTURE-XERO;

	"get-contacts-from-xero" - get from xero.com

	"add-invoices-to-xero" - add to xero.com

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
	lambda-local -l index.js -t 9000 -e event-get-contacts.json
	lambda-local -l index.js -t 9000 -e event-create-invoices.json
	lambda-local -l index.js -t 9000 -e event-get-invoices.json
	lambda-local -l index.js -t 9000 -e event-create-contacts.json
	lambda-local -l index.js -t 9000 -e event-create-credit-notes.json
	lambda-local -l index.js -t 9000 -e event-apply-credit-notes.json
	lambda-local -l index.js -t 9000 -e event-create-apply-credit-notes.json
	lambda-local -l index.js -t 9000 -e event-convert-contacts.json

	Upload to lambda; Terminal;
	zip -r ../mydigitalstructure-xero-DDMMMYYY-1.zip *

	Setup;

	Using https://console.mydigitalstructure.cloud

	mydigitalstructure.cloud.search(
	{
		object: 'core_protect_key',
		fields: ['object', 'objectcontext', 'title', 'key', 'notes']
	});

	0/ SETUP XERO CONNECTION/URL IN MYDS

	mydigitalstructure.cloud.search(
	{
		object: 'core_url',
		fields: ['title', 'type'],
		filters: {type: 14}
	});

	mydigitalstructure.cloud.save(
	{
		object: 'core_url',
		data:
		{
			title: 'xero Integration',
			notes: 'If delete this connection the integration with xero will not work.',
			type: 14,
			url: 'https://xero.com'
		}
	});

	mydigitalstructure.cloud.search(
	{
		object: 'setup_financial_invoice_status',
		fields: ['title']
	});

	mydigitalstructure.cloud.save(
	{
		object: 'setup_financial_invoice_status',
		data:
		{
			title: 'Do not send to xero'
		}
	});

	mydigitalstructure.cloud.save(
	{
		object: 'setup_financial_invoice_status',
		data:
		{
			title: 'To be sent to xero'
		}
	});

	mydigitalstructure.cloud.save(
	{
		object: 'setup_financial_invoice_status',
		data:
		{
			title: 'Sent to xero'
		}
	});

	mydigitalstructure.cloud.save(
	{
		object: 'setup_financial_invoice_status',
		data:
		{
			title: 'Fully paid in xero'
		}
	});

	Update settings.json

	? DOES refresh-token exist for user - if not got to proxy-connect 
			-- user being the integration proxy.

	
	CONTACT_LINKS:

	mydigitalstructure.cloud.search(
	{
		object: 'core_url_link',
		fields: ['urlreference'],
		filters: {object: 12, objectcontext: 1007301}
	});
*/

exports.handler = function (event, context, callback)
{
	var mydigitalstructure = require('mydigitalstructure')
	var _ = require('lodash')
	var moment = require('moment');
	var xeroNode = require("xero-node");
	var xero;

	console.log(event)

	mydigitalstructure.set(
	{
		scope: '_event',
		value: event
	});

	mydigitalstructure.set(
	{
		scope: '_context',
		value: context
	});

	mydigitalstructure.set(
	{
		scope: '_callback',
		value: callback
	});

	var settings;

	if (event != undefined)
	{
		if (event.site != undefined)
		{
			settings = event.site;
			//ie use settings-[event.site].json
		}
	}

	mydigitalstructure.init(main, settings)

	function main(err, data)
	{
		/*
			app initialises with mydigitalstructure.invoke('app-init') after controllers added.
		*/

		var settings = mydigitalstructure.get(
		{
			scope: '_settings'
		});

		console.log(settings);

		mydigitalstructure.add(
		{
			name: 'app-init',
			code: function ()
			{
				mydigitalstructure._util.message('Using mydigitalstructure module version ' + mydigitalstructure.VERSION);
				mydigitalstructure._util.message(mydigitalstructure.data.session);
				mydigitalstructure.invoke('app-start');
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-start',
			code: function (param, response)
			{
				//Before running any function - look for refresh-token ie connection to xero has been established

				var session = mydigitalstructure.get({scope: 'session'});

				if (response == undefined)
				{
					mydigitalstructure.cloud.search(
					{
						object: 'core_protect_key',
						fields: ['title', 'notes', 'key'],
						filters:
						[
							{
								field: 'object',
								value: 22
							},
							{
								field: 'objectcontext',
								value: session.user
							},
							{
								field: 'title',
								value: 'refresh-token'
							},
							{
								field: 'type',
								value: 2
							}
						],
						rows: 1,
						sorts:
						[
							{
								field: 'createddate',
								direction: 'desc'
							}
						],
						callback: 'app-start'
					});
				}
				else
				{
					if (response.data.rows.length == 0)
					{	
						mydigitalstructure.invoke('util-end', {error: '!!! NO CONNECTION TO XERO.'});
					}
					else
					{
						var settings = mydigitalstructure.get({scope: '_settings'});

						var xeroToken = _.first(response.data.rows);
						var refreshToken = xeroToken.key;

						xero = new xeroNode.XeroClient();

						xero.refreshWithRefreshToken(settings.xero.clientID, settings.xero.clientSecret, refreshToken)
						.then(function (tokenSet)
						{
							mydigitalstructure.set(
							{
								scope: 'app',
								context: 'token-set',
								value: tokenSet
							});

							mydigitalstructure.invoke('app-start-persist-refresh-token')
						});
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-start-persist-refresh-token',
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
						callback: 'app-start-persist-refresh-token'
					});
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
				xero.updateTenants()
				.then(function ()
				{	
					var event = mydigitalstructure.get(
					{
						scope: '_event'
					});

					var controller;

					if (_.isObject(event))
					{
						controller = event.controller;

						if (controller == undefined && event.method != undefined)
						{
							controller = 'app-process-' + event.method
						}
					}

					var xeroTenant;

					if (xero.tenants.length == 1)
					{
						xeroTenant = _.first(xero.tenants);
					}
					else if (xero.tenants.length > 1)
					{
						var settings = mydigitalstructure.get({scope: '_settings'});

						if (_.has(settings, 'xero.tenantID'))
						{
							xeroTenant = _.find(xero.tenants, function (tenant) {return tenant.id == settings.xero.tenantID});
						}
					}

					if (_.isUndefined(xeroTenant))
					{
						mydigitalstructure.invoke('util-end', {error: '!!!get-tenants:NO TENANT.'});
					}
					else
					{
						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'xero-tenant',
							value: xeroTenant
						});
					}

					if (controller != undefined)
					{
						mydigitalstructure._util.testing.data(controller, 'Based on event data invoking controller');
						mydigitalstructure.invoke(controller);
					}
				},
				function (error)
				{
					mydigitalstructure.invoke('util-end', {error: 'get-tenants(xero.updateTenants).'});
				});
			}
		});

		//---- get-contacts

		mydigitalstructure.add(
		{
			name: 'app-process-get-contacts',
			code: function ()
			{	
				var xeroTenant = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'xero-tenant'
				});

				//xeroTenantId, ifModifiedSince, where, order, iDs, page, includeArchived, summaryOnly

				xero.accountingApi.getContacts(xeroTenant.tenantId)
				.then(function (data)
				{
					console.log(data.body.contacts.length);
					//console.log(data.body.contacts);
					//var fs = require('fs'); fs.writeFile("contacts.json", JSON.stringify(data.body.contacts), function (err) {})

					var xeroContacts = mydigitalstructure.set(
					{
						scope: 'app',
						context: 'xero-contacts',
						value: data.body.contacts
					});

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'xero-contacts-customers',
						value: _.map(xeroContacts, function (customer) {return {name: customer.name, id: customer.contactID}})
					});

					mydigitalstructure.invoke('app-process-get-contacts-match')
				});
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-contacts-match',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				if (response == undefined)
				{
					mydigitalstructure.cloud.search(
					{
						object: 'contact_business_group',
						fields:
						[
							'businessgroup.contactbusiness.tradename',
							'businessgroup.contactbusiness.legalname',
							'businessgroup.contactbusiness.guid',
							'businessgroup.contactbusiness',
							'grouptext'
						],
						filters:
						[
							{
								field: 'group',
								comparison: 'IN_LIST',
								value: settings.mydigitalstructure.contactGroups
							}
							
						],
						rows: 99999,
						sorts:
						[
							{
								field: 'businessgroup.contactbusiness.tradename',
								direction: 'asc'
							}
						],
						callback: 'app-process-get-contacts-match'
					});
				}
				else
				{
					var mydigitalstructureContacts = _.map(response.data.rows, function (row)
					{
						return {
									tradename: row['businessgroup.contactbusiness.tradename'],
									legalname: row['businessgroup.contactbusiness.legalname'],
									guid: row['businessgroup.contactbusiness.guid'],
									type: row['grouptext'],
									id: row['businessgroup.contactbusiness']
								}
					})

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'mydigitalstructure-contacts',
						value: mydigitalstructureContacts
					});

					var xeroContactCustomers = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'xero-contacts-customers'
					});

					//var fs = require('fs'); fs.writeFile("contacts-xero.json", JSON.stringify(xeroContactCustomers), function (err) {})

					_.each(xeroContactCustomers, function (xeroContactCustomer)
					{
						xeroContactCustomer._name = _.split(xeroContactCustomer.name, ' (');
						xeroContactCustomer.legalname = _.first(xeroContactCustomer._name);
						xeroContactCustomer.tradename = _.first(_.split(_.last(xeroContactCustomer._name), ')'));

						xeroContactCustomer._mydigitalstructureContact = 
							_.find(mydigitalstructureContacts, function (mydigitalstructureContact)
							{
								return (mydigitalstructureContact.tradename.toLowerCase() == xeroContactCustomer.tradename.toLowerCase()
											|| mydigitalstructureContact.legalname.toLowerCase() == xeroContactCustomer.legalname.toLowerCase()
											|| mydigitalstructureContact.tradename.toLowerCase() == xeroContactCustomer.legalname.toLowerCase()
											|| mydigitalstructureContact.legalname.toLowerCase() == xeroContactCustomer.tradename.toLowerCase())
							});

						xeroContactCustomer.matched = (xeroContactCustomer._mydigitalstructureContact != undefined);

						if (xeroContactCustomer.matched)
						{
							xeroContactCustomer.mydigitalstructureContactGUID = xeroContactCustomer._mydigitalstructureContact.guid;
							xeroContactCustomer.mydigitalstructureContactID = xeroContactCustomer._mydigitalstructureContact.id;
						}
					});

					var fs = require('fs'); fs.writeFile("contacts-xero-processed.json", JSON.stringify(xeroContactCustomers), function (err) {})

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'xero-contacts-customers',
						value: xeroContactCustomers
					});

					mydigitalstructure.invoke('app-process-get-contacts-check');
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-contacts-check',
			code: function ()
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				if (_.has(settings, 'mydigitalstructure.conversation'))
				{
					var xeroContactCustomers = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'xero-contacts-customers'
					});

					var xeroContactCustomersUnmatched = _.filter(xeroContactCustomers, function (xeroContactCustomer) {return !xeroContactCustomer.matched});

					if (false && xeroContactCustomersUnmatched.length != 0)
					{
						var message = [];

						message.push('<p>Hi, the following customer contacts in xero could not be matched (based on trading name or legal name) to a contact within mydigitalstructure.</p>')
						message.push('<p>You need to either update the contact in xero or mydigitalstructure so they match.</p>');
						message.push('<ul>');

						_.each(xeroContactCustomersUnmatched, function (xeroContactCustomerUnmatched)
						{
							message.push('<li>' + encodeURIComponent(xeroContactCustomerUnmatched.name) + '</li>');
						});
						message.push('</ul>');
						message.push('<p>Thanks, xero integration.</p>');

						var data = 
						{
							conversation: settings.mydigitalstructure.conversation,
							subject: 'Unmatched xero Contacts',
							message: message.join(''),
							noalerts: 'Y'
						}

						mydigitalstructure.cloud.save(
						{
							object: 'messaging_conversation_post',
							data: data,
							callback: 'app-process-get-contacts-check-complete'
						});
					}
					else
					{
						console.log(xeroContactCustomersUnmatched);
						mydigitalstructure.invoke('app-process-get-contacts-check-complete');
					}
				}
				else
				{
					mydigitalstructure.invoke('app-process-get-contacts-check-complete');
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-contacts-check-complete',
			code: function (param, response)
			{
				mydigitalstructure.invoke('app-process-get-contacts-link')
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-contacts-link',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var xeroContactCustomers = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'xero-contacts-customers'
				});

				var xeroContactCustomersMatched = _.filter(xeroContactCustomers, function (xeroContactCustomer) {return xeroContactCustomer.matched});

				var mydigitalstructureIDs = [];

				_.each(xeroContactCustomersMatched, function (xeroContactCustomerMatched)
				{
					mydigitalstructureIDs.push(xeroContactCustomerMatched._mydigitalstructureContact.id)
				});

				if (mydigitalstructureIDs.length == 0)
				{
					mydigitalstructure.invoke('util-end', {message: 'get-contacts; No matched contacts.'});
				}
				else
				{
					if (response == undefined)
					{
						mydigitalstructure.cloud.search(
						{
							object: 'core_url_link',
							fields:
							[
								'objectcontext', 'urlguid'
							],
							filters:
							[
								{
									field: 'url',
									value: settings.mydigitalstructure.xeroURL
								},
								{
									field: 'object',
									value: 12
								}
							],
							rows: 99999,
							sorts:
							[
								{
									field: 'id',
									direction: 'desc'
								}
							],
							callback: 'app-process-get-contacts-link'
						});
					}
					else
					{
						var mydigitalstructureContactsLinkIDs = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-contacts-link-ids',
							value: response.data.rows
						});

						_.each(xeroContactCustomers, function (xeroContactCustomer)
						{
							xeroContactCustomer._mydigitalstructureContactLink = 
								_.find(mydigitalstructureContactsLinkIDs, function (mydigitalstructureContactLinkID)
								{
									return (mydigitalstructureContactLinkID.urlguid == xeroContactCustomer.id)
								});

							xeroContactCustomer.linked = (xeroContactCustomer._mydigitalstructureContactLink != undefined);

							if (xeroContactCustomer.linked)
							{
								xeroContactCustomer.mydigitalstructureContactLinkID = xeroContactCustomer._mydigitalstructureContactLink.id;
							}
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'xero-contacts-customers',
							value: xeroContactCustomers
						});

						mydigitalstructure.set(
						{
							scope: 'app-process-get-contacts-link-process',
							context: 'index',
							value: 0
						});

						mydigitalstructure.invoke('app-process-get-contacts-link-process')
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-contacts-link-process',
			code: function (param)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var xeroContactCustomers = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'xero-contacts-customers'
				});

				var xeroContactCustomersMatchedUnlinked = _.filter(xeroContactCustomers, function (xeroContactCustomer)
				{
					return (xeroContactCustomer.matched && !xeroContactCustomer.linked)
				});

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-get-contacts-link-process',
					context: 'index'
				});

				if (index < xeroContactCustomersMatchedUnlinked.length)
				{
					var xeroContactCustomerMatchedUnlinked = xeroContactCustomersMatchedUnlinked[index];

					var data =
					{
						object: 12,
						url: settings.mydigitalstructure.xeroURL,
						objectcontext: xeroContactCustomerMatchedUnlinked.mydigitalstructureContactID,
						urlguid: xeroContactCustomerMatchedUnlinked.id,
						urlreference: _.truncate(xeroContactCustomerMatchedUnlinked.id, 97)
					}

					mydigitalstructure.cloud.save(
					{
						object: 'core_url_link',
						data: data,
						callback: 'app-process-get-contacts-link-process-next'
					});
				}
				else
				{
					mydigitalstructure._util.message(
					{
						xeroContactCustomers:  xeroContactCustomersMatchedUnlinked
					});

					mydigitalstructure.invoke('util-end',
					{
						message: 'get-contacts; Complete. [' + xeroContactCustomersMatchedUnlinked.length + ']',
					});
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-contacts-link-process-next',
			code: function (param, response)
			{
				var index = mydigitalstructure.get(
				{
					scope: 'app-process-get-contacts-link-process',
					context: 'index'
				});

				mydigitalstructure.set(
				{
					scope: 'app-process-get-contacts-link-process',
					context: 'index',
					value: index + 1
				});

				mydigitalstructure.invoke('app-process-get-contacts-link-process');
			}
		});

		//---- create-contacts
		//---- Create contacts in the xero based on invoices

		mydigitalstructure.add(
		{
			name: 'app-process-create-contacts',
			code: function (param, response)
			{				
				var settings = mydigitalstructure.get({scope: '_settings'});

				if (response == undefined)
				{
					var filters = 
					[
						{
							name: '('
						},
						{
							field: 'status',
							comparison: 'EQUAL_TO',
							value: settings.mydigitalstructure.invoiceStatuses.tobesenttoxero
						},
						{
							name: 'or'
						},
						{
							field: 'status',
							comparison: 'IS_NULL'
						},
						{
							name: ')'
						},
						{
							field: 'amount',
							comparison: 'NOT_EQUAL_TO',
							value: 0
						},
					]

					if (_.has(settings, 'mydigitalstructure.invoiceCreatedAfterDate'))
					{
						filters.push(
						{
							field: 'createddate',
							comparison: 'GREATER_THAN',
							value: settings.mydigitalstructure.invoiceCreatedAfterDate
						})
					}
					else
					{
						filters.push(
						{
							field: 'createddate',
							comparison: 'GREATER_THAN_OR_EQUAL_TO',
							value: moment().add(-7, 'days').format('DD MMM YYYY')
						})
					}

					if (settings.mydigitalstructure.invoicesMaximum == undefined)
					{
						settings.mydigitalstructure.invoicesMaximum = 100 
					}

					console.log(settings.mydigitalstructure.invoicesMaximum);

					mydigitalstructure.cloud.search(
					{
						object: 'financial_invoice',
						fields:
						[
							'guid', 'contactbusinesssentto', 'contactpersonsentto', 'sentdate', 'duedate', 'reference',
							'invoice.contactbusinesssentto.legalname', 'invoice.contactbusinesssentto.phonenumber',
							'invoice.contactbusinesssentto.email', 'invoice.contactbusinesssentto.abn',
							'invoice.contactbusinesssentto.mailingaddress1', 'invoice.contactbusinesssentto.mailingaddress2',
							'invoice.contactbusinesssentto.mailingsuburb', 'invoice.contactbusinesssentto.mailingstate',
							'invoice.contactbusinesssentto.mailingpostcode', 'invoice.contactbusinesssentto.mailingcountry',
							'invoice.contactbusinesssentto.phonenumber',
							'invoice.contactbusinesssentto.guid',
							'invoice.contactpersonsentto.firstname', 'invoice.contactpersonsentto.surname',
							'invoice.contactpersonsentto.workphone', 'invoice.contactpersonsentto.email',
							'invoice.contactpersonsentto.mailingaddress1', 'invoice.contactpersonsentto.mailingaddress2',
							'invoice.contactpersonsentto.mailingsuburb', 'invoice.contactpersonsentto.mailingstate',
							'invoice.contactpersonsentto.mailingpostcode', 'invoice.contactpersonsentto.mailingcountry',
							'invoice.contactpersonsentto.guid'
						],

						filters: filters,
						sorts:
						[
							{
								name: 'createddate',
								direction: 'asc'
							}
						],
						rows: settings.mydigitalstructure.invoicesMaximum,
						callback: 'app-process-create-contacts'
					});
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices-create-contacts-invoices-to-be-sent',
						value: response.data.rows
					});

					mydigitalstructure.invoke('app-process-create-contacts-check')
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-contacts-check',
			notes: 'Get the links to check if the contacts on the invoices have a link to xero.',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var invoiceContacts = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices-create-contacts-invoices-to-be-sent'
				});
	
				if (invoiceContacts.length == 0)
				{
					mydigitalstructure.invoke('util-end', {message: 'app-process-create-contacts-check; No contacts.'});
				}
				else
				{
					if (response == undefined)
					{
						var contactsBusiness = [];
						var contactsPerson = [];

						var filters =
						[
							{
								field: 'url',
								value: settings.mydigitalstructure.xeroURL
							},
							{ name: '('}
						]

						var contacts = [];

						_.each(invoiceContacts, function (invoiceContact)
						{
							if (invoiceContact.contactbusinesssentto != '')
							{
								var _contact = _.find(contacts, function (contact)
								{
									contact.object == 12 && contact.objectcontext == invoiceContact.contactbusinesssentto
								})

								if (_contact == undefined)
								{
									var email = invoiceContact['invoice.contactbusinesssentto.email'];
									if (email == '')
									{
										email = invoiceContact['invoice.contactpersonsentto.email']
									}

									var phone = invoiceContact['invoice.contactbusinesssentto.phonenumber'];
									if (phone == '')
									{
										phone = invoiceContact["invoice.contactpersonsentto.workphone"]
									}

									contacts.push(
									{
										object: 12,
										objectcontext: invoiceContact.contactbusinesssentto,
										data:
										{
											name: invoiceContact['invoice.contactbusinesssentto.legalname'],
											firstName: invoiceContact['invoice.contactpersonsentto.firstname'],
											lastName: invoiceContact['invoice.contactpersonsentto.surname'],
											contactNumber: invoiceContact['invoice.contactbusinesssentto.guid'],
											emailAddress: email,
											taxNumber: invoiceContact['invoice.contactbusinesssentto.abn'],
											addresses:
											[
												{
													addressType: xeroNode.Address.AddressTypeEnum.POBOX,
													addressLine1: invoiceContact['invoice.contactbusinesssentto.mailingaddress1'] + 
														(invoiceContact["invoice.contactbusinesssentto.mailingaddress2"] != '' 
															? ', ' + invoiceContact["invoice.contactbusinesssentto.mailingaddress2"] 
															: ''),
													city: invoiceContact["invoice.contactbusinesssentto.mailingsuburb"],
													region: invoiceContact["invoice.contactbusinesssentto.mailingstate"],
													postalCode: invoiceContact["invoice.contactbusinesssentto.mailingpostcode"],
													country: invoiceContact["invoice.contactbusinesssentto.mailingcountry"]
												}
											],
											phones:
											[
												{
													phoneType: xeroNode.Phone.PhoneTypeEnum.DEFAULT,
													phoneNumber: phone
												}
											]
										}
									})
								}

								contactsBusiness.push(invoiceContact.contactbusinesssentto)
							}
		
							if (invoiceContact.contactpersonsentto != '' && invoiceContact.contactbusinesssentto == '')
							{
								var _contact = _.find(contacts, function (contact)
								{
									contact.object == 32 && contact.objectcontext == invoiceContact.contactpersonsentto
								})

								if (_contact == undefined)
								{
									contacts.push(
									{
										object: 32,
										objectcontext: invoiceContact.contactpersonsentto,
										data:
										{
											name: invoiceContact['invoice.contactpersonsentto.firstname'] + ' ' +
											invoiceContact['invoice.contactpersonsentto.surname'],
											firstName: invoiceContact['invoice.contactpersonsentto.firstname'],
											lastName: invoiceContact['invoice.contactpersonsentto.surname'],
											contactNumber: invoiceContact['invoice.contactpersonsentto.guid'],
											emailAddress: invoiceContact['invoice.contactpersonsentto.email'],
											addresses:
											[
												{
													addressType: xeroNode.Address.AddressTypeEnum.POBOX,
													addressLine1: invoiceContact['invoice.contactpersonsentto.mailingaddress1'] + 
														(invoiceContact["invoice.contactbusinesssentto.mailingaddress2"] != '' 
															? ', ' + invoiceContact["invoice.contactpersonsentto.mailingaddress2"] 
															: ''),
													city: invoiceContact["invoice.contactpersonsentto.mailingsuburb"],
													region: invoiceContact["invoice.contactpersonsentto.mailingstate"],
													postalCode: invoiceContact["invoice.contactpersonsentto.mailingpostcode"],
													country: invoiceContact["invoice.contactpersonsentto.mailingcountry"]
												}
											],
											phones:
											[
												{
													phoneType: xeroNode.Phone.PhoneTypeEnum.DEFAULT,
													phoneNumber: invoiceContact["invoice.contactpersonsentto.workphone"]
												}
											]
										}
									})
								}

								contactsPerson.push(invoiceContact.contactpersonsentto)
							}
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-create-contacts',
							value: contacts
						});

						if (contactsBusiness.length != 0)
						{
							filters = _.concat(filters,
							{
								field: 'object',
								value: 12
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: contactsBusiness.join(',')
							});

							if (contactsPerson.length != 0)
							{
								filters = _.concat(filters, { name: 'or'});
							}
						}

						if (contactsPerson.length != 0)
						{
							filters = _.concat(filters,
							{
								field: 'object',
								value: 32
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: contactsPerson.join(',')
							});
						}

						filters = _.concat(filters, { name: ')'});

						mydigitalstructure.cloud.search(
						{
							object: 'core_url_link',
							fields:
							[
								'object', 'objectcontext', 'urlguid'
							],
							filters: filters,
							rows: 99999,
							sorts:
							[

							],
							callback: 'app-process-create-contacts-check'
						});
					}
					else
					{
						var createContactsLinks = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-create-contacts-links',
							value: response.data.rows
						});

						var createContacts = mydigitalstructure.get(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-create-contacts'
						});

						_.each(createContacts, function (contact)
						{
							contact._contactLink = 
								_.find(createContactsLinks, function (createContactsLink)
								{
									return (
												contact.object == createContactsLink.object &&
												contact.objectcontext == createContactsLink.objectcontext)
								});

								contact.linked = (contact._contactLink != undefined);

							if (contact.linked)
							{
								contact.linkID = contact._contactLink.urlguid;
							}
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-create-contacts',
							value: createContacts
						});
					
						var createContactsToBeCreated = _.filter(createContacts, function (createContact)
						{
							return (!createContact.linked)
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-create-contacts-to-be-created',
							value: createContactsToBeCreated
						});

						if (createContactsToBeCreated.length == 0)
						{
							mydigitalstructure.invoke('util-end', {message: 'create-contacts; No contacts to create.'});
						}
						else
						{
							mydigitalstructure.invoke('app-process-create-contacts-process');
						}
						
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-contacts-process',
			code: function (param)
			{
				//create contacts in xero
				//https://xeroapi.github.io/xero-node/accounting/index.html#api-Accounting-createContacts

				var contactsToBeCreated = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices-create-contacts'
				});

				//console.log(contactsToBeCreated)

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-create-contacts-process',
					context: 'index',
					valueDefault: 0
				});

				if (index < contactsToBeCreated.length)
				{
					var contactToBeCreated = contactsToBeCreated[index];
			
					//console.log(xeroNode.Contact);
					//console.log(xeroNode.Address);
					//console.log(xeroNode.Phone);

					//mydigitalstructure.invoke('util-end')

					var xeroContactData =
					{
						contactStatus: xeroNode.Contact.ContactStatusEnum.ACTIVE,
						defaultCurrency: 'AUD'
					};

					xeroContactData = _.assign(xeroContactData, contactToBeCreated.data);

					var xeroData =
					{
						contacts:
						[
							xeroContactData
						]
					};

					console.log(xeroData);

					//mydigitalstructure.invoke('util-end', xeroData);

					var xeroTenant = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'xero-tenant'
					});

					xero.accountingApi.createContacts(xeroTenant.tenantId, xeroData)
					.then(function (data)
					{	
						contactToBeCreated._xero = data.response.body;

						mydigitalstructure.set(
						{
							scope: 'app-process-create-contacts-process-next',
							context: 'xero-contact',
							value: data.response.body
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-create-contacts',
							value: contactsToBeCreated
						});

						//console.log(contactToBeCreated._xero)
						//mydigitalstructure.invoke('util-end', contactToBeCreated._xero);

						mydigitalstructure.invoke('app-process-create-contacts-process-next');
					},
					function (data)
					{
						//console.log(data.response.body);
						//console.log(data.response.body.Elements[0].ValidationErrors);

						mydigitalstructure.set(
						{
							scope: 'app-process-create-contacts-process',
							context: 'index',
							value: index + 1
						});
		
						mydigitalstructure.invoke('app-process-create-contacts-process');
					}
					);
					
				}
				else
				{
					console.log(contactsToBeCreated);
					mydigitalstructure.invoke('util-end',
					{
						notes: 'create-contacts; Complete.',
						totalCount: contactsToBeCreated.length,
						updatedAddedCount: _.filter(contactsToBeCreated, function (contactToBeCreated) {return contactToBeCreated._xero != undefined}).length
					});
				}		
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-contacts-process-next',
			code: function (param, response)
			{
				var index = mydigitalstructure.get(
				{
					scope: 'app-process-create-contacts-process',
					context: 'index'
				});

				if (response == undefined)
				{
					var xeroContactData = mydigitalstructure.get(
					{
						scope: 'app-process-create-contacts-process-next',
						context: 'xero-contact'
					})

					var contactsToBeCreated = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices-create-contacts'
					});
	
					var contactToBeCreated = contactsToBeCreated[index];

					//create link
					if (_.has(xeroContactData, 'Contacts'))
					{
						var settings = mydigitalstructure.get({scope: '_settings'});

						var xeroContact = _.first(xeroContactData.Contacts)

						var data =
						{
							url: settings.mydigitalstructure.xeroURL,
							object: contactToBeCreated.object,
							objectcontext: contactToBeCreated.objectcontext,
							urlguid: xeroContact.ContactID,
							urlreference: _.truncate(xeroContact.Name, 97)
						}

						console.log(data);

						mydigitalstructure.cloud.save(
						{
							object: 'core_url_link',
							data: data,
							callback: 'app-process-create-contacts-process-next'
						});
					}
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app-process-create-contacts-process',
						context: 'index',
						value: index + 1
					});

					mydigitalstructure.invoke('app-process-create-contacts-process');
				}
			}
		});

//---- CREATE-CREDIT_NOTES
//---- Create contacts in the xero based on credit notes

		mydigitalstructure.add(
		{
			name: 'app-process-create-credit-notes',
			code: function (param, response)
			{				
				//mydigitalstructure.invoke('util-end', xeroNode.CreditNote);

				var settings = mydigitalstructure.get({scope: '_settings'});

				if (response == undefined)
				{
					var filters = 
					[
						{
							field: 'createddate',
							comparison: 'GREATER_THAN_OR_EQUAL_TO',
							value: moment().add(-7, 'days').format('DD MMM YYYY')
						}
					]

					if (_.has(settings, 'mydigitalstructure.creditNoteCreatedAfterDate'))
					{
						filters.push(
						{
							field: 'createddate',
							comparison: 'GREATER_THAN',
							value: settings.mydigitalstructure.creditNoteCreatedAfterDate
						})
					}

					mydigitalstructure.cloud.search(
					{
						object: 'financial_credit_note',
						fields:
						[
							'guid',
							'amount',
							'contactbusiness',
							'contactperson',
							'creditdate',
							'type', 'typetext',
							'taxtype',
							'financialaccount',
							'financialaccounttext',
							'notes',
							'reasontext',
							'reference'
						],

						filters: filters,
						sorts:
						[
							{
								name: 'createddate',
								direction: 'asc'
							}
						],
						rows: 9999,
						callback: 'app-process-create-credit-notes'
					});
				}
				else
				{
					console.log(response.data.rows)

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'app-process-create-credit-notes',
						value: response.data.rows
					});

					mydigitalstructure.invoke('app-process-create-credit-notes-links')
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-credit-notes-links',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var creditNotes = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-create-credit-notes'
				});

				if (creditNotes.length == 0)
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'No credit notes'
					});
				}
				else
				{
					if (response == undefined)
					{
						var filters = 
						[
							{
								field: 'url',
								value: settings.mydigitalstructure.xeroURL
							},
							{
								field: 'object',
								value: 69
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: _.join(_.map(creditNotes, 'id'), ',')
							}
						]

						mydigitalstructure.cloud.search(
						{
							object: 'core_url_link',
							fields:
							[
								'objectcontext', 'urlguid'
							],
							filters: filters,
							rows: 99999,
							sorts:
							[
								{
									field: 'id',
									direction: 'desc'
								}
							],
							callback: 'app-process-create-credit-notes-links'
						});
					}
					else
					{
						var creditNoteLinks = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-create-credit-notes-links',
							value: response.data.rows
						});

						_.each(creditNotes, function (creditNote)
						{
							creditNote._xeroLink = 
								_.find(creditNoteLinks, function (creditNoteLink)
								{
									return (creditNoteLink.objectcontext == creditNote.id)
								});

								creditNote.xeroLink = (creditNote._xeroLink != undefined)
						});

						var creditNotesToBeSentToXero = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-create-credit-notes-to-be-sent-to-xero',
							value: _.filter(creditNotes, function (creditNote)
							{
								return (!creditNote.xeroLink)
							})
						});

						if (creditNotesToBeSentToXero.length == 0)
						{
							var event = mydigitalstructure.get({scope: '_event'});

							if (event.apply == "true")
							{
								mydigitalstructure.invoke('app-process-apply-credit-notes');
							}
							else
							{
								mydigitalstructure.invoke('util-end',
								{
									message: 'No credit notes to send to xero'
								});
							}
						}
						else
						{
							mydigitalstructure.invoke('app-process-create-credit-notes-financial-accounts');
						}
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-credit-notes-financial-accounts',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var creditNotes = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-create-credit-notes-to-be-sent-to-xero'
				});

				if (creditNotes.length == 0)
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'No credit notes'
					});
				}
				else
				{
					if (response == undefined)
					{
						var filters = 
						[
							{
								field: 'id',
								comparison: 'IN_LIST',
								value: _.join(_.map(creditNotes, 'financialaccount'), ',')
							}
						]

						mydigitalstructure.cloud.search(
						{
							object: 'setup_financial_account',
							fields:
							[
								'title', 'code'
							],
							filters: filters,
							rows: 99999,
							sorts:
							[
								{
									field: 'id',
									direction: 'desc'
								}
							],
							callback: 'app-process-create-credit-notes-financial-accounts'
						});
					}
					else
					{
						var creditNoteFinancialAccounts = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-create-credit-notes-financial-accounts',
							value: response.data.rows
						});

						_.each(creditNotes, function (creditNote)
						{
							creditNote._financialAccount = 
								_.find(creditNoteFinancialAccounts, function (creditNoteFinancialAccount)
								{
									return (creditNoteFinancialAccount.id == creditNote.financialaccount)
								});

							console.log(creditNote._financialAccount)

							if (creditNote._financialAccount != undefined)
							{
								creditNote._financialAccountCode = creditNote._financialAccount.code
							}
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-create-credit-notes-to-be-sent-to-xero',
							value: creditNotes
						});

						mydigitalstructure.invoke('app-process-create-credit-notes-contact-links');		
					}
				}
			}
		});
	
		mydigitalstructure.add(
		{
			name: 'app-process-create-credit-notes-contact-links',
			notes: 'Get the links to check if the contacts on the credit note have a link to xero.',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var creditNotesToBeSentToXero = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-create-credit-notes-to-be-sent-to-xero'
				});

				if (creditNotesToBeSentToXero.length == 0)
				{
					mydigitalstructure.invoke('util-end', {message: 'app-process-create-credit-notes-contact-links; No contacts.'});
				}
				else
				{
					if (response == undefined)
					{
						var contactsBusiness = [];
						var contactsPerson = [];

						var filters =
						[
							{
								field: 'url',
								value: settings.mydigitalstructure.xeroURL
							},
							{ name: '('}
						]

						var contacts = [];

						_.each(creditNotesToBeSentToXero, function (creditNoteToBeSentToXero)
						{
							if (creditNoteToBeSentToXero.contactbusinesssentto != '')
							{
								var _contact = _.find(contacts, function (contact)
								{
									contact.object == 12 && contact.objectcontext == creditNoteToBeSentToXero.contactbusiness
								})

								if (_contact == undefined)
								{
									contacts.push(
									{
										object: 12,
										objectcontext: creditNoteToBeSentToXero.contactbusiness,
									})
								}

								creditNoteToBeSentToXero._contactObject = 12;
								creditNoteToBeSentToXero._contactObjectContext = creditNoteToBeSentToXero.contactbusiness;

								contactsBusiness.push(creditNoteToBeSentToXero.contactbusinesssentto)
							}
		
							if (creditNoteToBeSentToXero.contactperson != '' && creditNoteToBeSentToXero.contactbusiness == '')
							{
								var _contact = _.find(contacts, function (contact)
								{
									contact.object == 32 && contact.objectcontext == creditNoteToBeSentToXero.contactperson
								})

								if (_contact == undefined)
								{
									contacts.push(
									{
										object: 32,
										objectcontext: creditNoteToBeSentToXero.contactperson,
									})
								}

								creditNoteToBeSentToXero._contactObject = 32;
								creditNoteToBeSentToXero._contactObjectContext = creditNoteToBeSentToXero.contactperson;

								contactsPerson.push(creditNoteToBeSentToXero.contactpersonsentto)
							}
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-create-credit-notes-contact-links',
							value: contacts
						});

						if (contactsBusiness.length != 0)
						{
							filters = _.concat(filters,
							{
								field: 'object',
								value: 12
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: contactsBusiness.join(',')
							});

							if (contactsPerson.length != 0)
							{
								filters = _.concat(filters, { name: 'or'});
							}
						}

						if (contactsPerson.length != 0)
						{
							filters = _.concat(filters,
							{
								field: 'object',
								value: 32
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: contactsPerson.join(',')
							});
						}

						filters = _.concat(filters, { name: ')'});

						mydigitalstructure.cloud.search(
						{
							object: 'core_url_link',
							fields:
							[
								'object', 'objectcontext', 'urlguid'
							],
							filters: filters,
							rows: 99999,
							sorts:
							[

							],
							callback: 'app-process-create-credit-notes-contact-links'
						});
					}
					else
					{
						var createCreditNotesContactsLinks = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-create-credit-notes-contact-links',
							value: response.data.rows
						});

						_.each(creditNotesToBeSentToXero, function (creditNote)
						{
							creditNote._contactLink = 
								_.find(createCreditNotesContactsLinks, function (createCreditNotesContactsLink)
								{
									return (
											creditNote._contactObject == createCreditNotesContactsLink.object &&
											creditNote._contactObjectContext == createCreditNotesContactsLink.objectcontext)
								});

								creditNote.contactLinked = (creditNote._contactLink != undefined);

							if (creditNote.contactLinked)
							{
								creditNote.contactLinkID = creditNote._contactLink.urlguid;
							}
						});

						 mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-create-credit-notes-to-be-sent-to-xero',
							value: creditNotesToBeSentToXero
						});
							
						mydigitalstructure.invoke('app-process-create-credit-notes-process');				
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-credit-notes-process',
			notes: 'Send credit notes to xero',
			code: function (param)
			{
				var creditNotesToBeSentToXero = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-create-credit-notes-to-be-sent-to-xero'
				});

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-create-credit-notes-process',
					context: 'index',
					valueDefault: 0
				});

				//1=GST Applies,2=GST Free - Export,3=GST Free - Other,4=GST Free - Input
				var settings = mydigitalstructure.get({scope: '_settings'});

				var taxTypes = settings.mydigitalstructure.taxTypes;

				if (taxTypes == undefined)
				{
					taxTypes = 
					{
						1: 'OUTPUT',
						2: 'EXEMPTOUTPUT',
						3: 'EXEMPTOUTPUT',
						4: 'EXEMPTOUTPUT'
					}
				}

				var types = 
				{
					1: 'ACCRECCREDIT',
					2: 'ACCPAYCREDIT'
				}

				if (index < creditNotesToBeSentToXero.length)
				{
					var creditNoteToBeSentToXero = creditNotesToBeSentToXero[index];

					if (!creditNoteToBeSentToXero.contactLinked)
					{
						console.log('!!ERROR; No Linked Contact');
						console.log(creditNoteToBeSentToXero);
					}
					else
					{
						var description = creditNoteToBeSentToXero.notes;
						if (description == '') {description = creditNoteToBeSentToXero.financialaccounttext}

						var xeroCreditNoteData =
						{
							type: types[creditNoteToBeSentToXero.type],
							contact:
							{
								contactID: creditNoteToBeSentToXero.contactLinkID
							},
							date: moment(creditNoteToBeSentToXero.creditdate, 'DD MMM YYYY').format('YYYY-MM-DD'),
							dueDate: moment(creditNoteToBeSentToXero.creditdate, 'DD MMM YYYY').format('YYYY-MM-DD'),
							reference: creditNoteToBeSentToXero.reference,
							status: xeroNode.CreditNote.StatusEnum.AUTHORISED,
							lineAmountTypes: 'Inclusive',
							lineItems:
							[
								{
									description: description,
									quantity: 1.0,
									unitAmount: creditNoteToBeSentToXero.amount,
									accountCode: creditNoteToBeSentToXero._financialAccountCode,
									taxType: taxTypes[creditNoteToBeSentToXero.taxtype],
									amount: creditNoteToBeSentToXero.amount
								}
							]
						}

						var xeroCreditNote =
						{
							creditNotes:
							[
								xeroCreditNoteData
							]
						};

						creditNoteToBeSentToXero._xeroData = xeroCreditNote;
						console.log(xeroCreditNote);
						console.log(xeroCreditNoteData.lineItems);

						//mydigitalstructure.invoke('util-end');

						var xeroTenant = mydigitalstructure.get(
						{
							scope: 'app',
							context: 'xero-tenant'
						});

						xero.accountingApi.createCreditNotes(xeroTenant.tenantId, xeroCreditNote)
						.then(function (data)
						{	
							creditNoteToBeSentToXero._xero = data.response.body;

							mydigitalstructure.set(
							{
								scope: 'app-process-create-credit-notes-process-next',
								context: 'xero-credit-note',
								value: data.response.body
							});

							console.log(creditNoteToBeSentToXero._xero)

							mydigitalstructure.invoke('app-process-create-credit-notes-process-next');
						},
						function (data)
						{
							//console.log(data);
							console.log(data.response.body);
							console.log(data.response.body.Elements[0].ValidationErrors);
						});	
					}	
				}
				else
				{
					var event = mydigitalstructure.get({scope: '_event'});
					mydigitalstructure.invoke('util-end', event);
					
					if (event.apply == "true")
					{
						mydigitalstructure.invoke('app-process-apply-credit-notes');
					}
					else
					{
						mydigitalstructure.invoke('util-end',
						{
							message: 'create-credit-notes; Complete.',
							count: creditNotesToBeSentToXero.length
						});
					}
				}		
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-credit-notes-process-next',
			code: function (param, response)
			{
				var creditNotesToBeSentToXero = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-create-credit-notes-to-be-sent-to-xero'
				});

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-create-credit-notes-process',
					context: 'index'
				});

				if (response == undefined)
				{
					var xeroCreditNoteData = mydigitalstructure.get(
					{
						scope: 'app-process-create-credit-notes-process-next',
						context: 'xero-credit-note'
					});

					var creditNoteToBeSentToXero = creditNotesToBeSentToXero[index];

					//create link
					if (_.has(xeroCreditNoteData, 'CreditNotes'))
					{
						var settings = mydigitalstructure.get({scope: '_settings'});

						var xeroCreditNote = _.first(xeroCreditNoteData.CreditNotes)

						var data =
						{
							url: settings.mydigitalstructure.xeroURL,
							object: 69,
							objectcontext: creditNoteToBeSentToXero.id,
							urlguid: xeroCreditNote.CreditNoteID,
							urlreference: _.truncate(xeroCreditNote.CreditNoteNumber, 97)
						}

						mydigitalstructure.cloud.save(
						{
							object: 'core_url_link',
							data: data,
							callback: 'app-process-create-credit-notes-process-next'
						});
					}
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app-process-create-credit-notes-process',
						context: 'index',
						value: index + 1
					});

					mydigitalstructure.invoke('app-process-create-credit-notes-process');
				}
			}
		});

//---- APPLY-CREDIT-NOTES

		mydigitalstructure.add(
		{
			name: 'app-process-apply-credit-notes',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				
				if (response == undefined)
				{
					var filters = 
					[
						{
							field: 'createddate',
							comparison: 'GREATER_THAN_OR_EQUAL_TO',
							value: moment().add(-7, 'days').format('DD MMM YYYY')
						}
					]

					if (_.has(settings, 'mydigitalstructure.creditNoteCreatedAfterDate'))
					{
						filters.push(
						{
							field: 'invoicecreditnote.creditnote.createddate',
							comparison: 'GREATER_THAN',
							value: settings.mydigitalstructure.creditNoteCreatedAfterDate
						})
					}

					if (_.has(settings, 'mydigitalstructure.invoiceCreatedAfterDate'))
					{
						filters.push(
						{
							field: 'invoicecreditnote.invoice.createddate',
							comparison: 'GREATER_THAN',
							value: settings.mydigitalstructure.invoiceCreatedAfterDate
						})
					}

					mydigitalstructure.cloud.search(
					{
						object: 'financial_invoice_credit_note',
						fields:
						[
							'invoice', 'amount', 'appliesdate', 'credit', 'credittext'
						],
						filters: filters,
						rows: 99999,
						sorts:
						[
							{
								field: 'id',
								direction: 'desc'
							}
						],
						callback: 'app-process-apply-credit-notes'
					});
				}
				else
				{
					var applyCreditNotes = mydigitalstructure.set(
					{
						scope: 'app',
						context: 'app-process-apply-credit-notes',
						value: response.data.rows
					});

					if (applyCreditNotes.length == 0)
					{
						mydigitalstructure.invoke('util-end', 'No credit notes to apply');
					}

					mydigitalstructure.invoke('app-process-apply-credit-notes-links');		
				}
			}
		});	

		mydigitalstructure.add(
		{
			name: 'app-process-apply-credit-notes-links',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var applyCreditNotes = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-apply-credit-notes'
				});

				if (applyCreditNotes.length == 0)
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'No credit notes to apply.'
					});
				}
				else
				{
					if (response == undefined)
					{
						var filters = 
						[
							{
								field: 'url',
								value: settings.mydigitalstructure.xeroURL
							},
							{
								field: 'object',
								value: 245
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: _.join(_.map(applyCreditNotes, 'id'), ',')
							}
						]

						mydigitalstructure.cloud.search(
						{
							object: 'core_url_link',
							fields:
							[
								'objectcontext', 'urlguid'
							],
							filters: filters,
							rows: 99999,
							sorts:
							[
								{
									field: 'id',
									direction: 'desc'
								}
							],
							callback: 'app-process-apply-credit-notes-links'
						});
					}
					else
					{
						var applyCreditNoteLinks = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-apply-credit-notes-links',
							value: response.data.rows
						});

						_.each(applyCreditNotes, function (applyCreditNote)
						{
							applyCreditNote._xeroLink = 
								_.find(applyCreditNoteLinks, function (applyCreditNoteLink)
								{
									return (applyCreditNoteLink.objectcontext == applyCreditNote.id)
								});

							applyCreditNote.xeroLink = (applyCreditNote._xeroLink != undefined)
						});

						var applyCreditNotesToBeSentToXero = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'app-process-apply-credit-notes-to-be-sent-to-xero',
							value: _.filter(applyCreditNotes, function (applyCreditNote)
							{
								return (!applyCreditNote.xeroLink)
							})
						});

						if (applyCreditNotesToBeSentToXero.length == 0)
						{
							mydigitalstructure.invoke('util-end',
							{
								message: 'No credit note applications to send to xero'
							})
						}
						else
						{
							//mydigitalstructure.invoke('util-end', applyCreditNotesToBeSentToXero);
							mydigitalstructure.invoke('app-process-apply-credit-notes-invoices-links');
						}
					}
				}
			}
		});
	
		mydigitalstructure.add(
		{
			name: 'app-process-apply-credit-notes-invoices-links',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var applyCreditNotesToBeSentToXero = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-apply-credit-notes-to-be-sent-to-xero'
				});

			
				if (response == undefined)
				{
					var filters = 
					[
						{
							field: 'url',
							value: settings.mydigitalstructure.xeroURL
						},
						{ name: '(' },
							{
								field: 'object',
								value: 5
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: _.join(_.map(applyCreditNotesToBeSentToXero, 'invoice'), ',')
							},
						{ name: 'or' },
							{
								field: 'object',
								value: 69
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: _.join(_.map(applyCreditNotesToBeSentToXero, 'credit'), ',')
							},
						{ name: ')' }
					]

					mydigitalstructure.cloud.search(
					{
						object: 'core_url_link',
						fields:
						[
							'object', 'objectcontext', 'urlguid'
						],
						filters: filters,
						rows: 99999,
						sorts:
						[
							{
								field: 'id',
								direction: 'desc'
							}
						],
						callback: 'app-process-apply-credit-notes-invoices-links'
					});
				}
				else
				{
					var applyCreditNoteInvoicesLinks = mydigitalstructure.set(
					{
						scope: 'app',
						context: 'app-process-apply-credit-notes-invoices-links',
						value: response.data.rows
					});

					_.each(applyCreditNotesToBeSentToXero, function (applyCreditNoteToBeSentToXero)
					{
						applyCreditNoteToBeSentToXero._xeroInvoiceLink = 
							_.find(applyCreditNoteInvoicesLinks, function (applyCreditNoteInvoicesLink)
							{
								return (applyCreditNoteInvoicesLink.objectcontext == applyCreditNoteToBeSentToXero.invoice
										&& applyCreditNoteInvoicesLink.object == 5)
							});

						applyCreditNoteToBeSentToXero._xeroCreditNoteLink = 
							_.find(applyCreditNoteInvoicesLinks, function (applyCreditNoteInvoicesLink)
							{
								return (applyCreditNoteInvoicesLink.objectcontext == applyCreditNoteToBeSentToXero.credit
										&& applyCreditNoteInvoicesLink.object == 69)
							});

						applyCreditNoteToBeSentToXero.xeroInvoiceLink = (applyCreditNoteToBeSentToXero._xeroInvoiceLink != undefined);
						applyCreditNoteToBeSentToXero.xeroCreditNoteLink = (applyCreditNoteToBeSentToXero._xeroCreditNoteLink != undefined);

						applyCreditNoteToBeSentToXero.canBeSentToXero = (applyCreditNoteToBeSentToXero.xeroInvoiceLink && applyCreditNoteToBeSentToXero.xeroCreditNoteLink)
					});

					var applyCreditNotesToBeSentToXero = mydigitalstructure.set(
					{
						scope: 'app',
						context: 'app-process-apply-credit-notes-to-be-sent-to-xero',
						value: _.filter(applyCreditNotesToBeSentToXero, function (applyCreditNoteToBeSentToXero)
						{
							return (applyCreditNoteToBeSentToXero.canBeSentToXero)
						})
					});

					if (applyCreditNotesToBeSentToXero.length == 0)
					{
						mydigitalstructure.invoke('util-end',
						{
							message: 'No credit note applications to send to xero with valid links'
						})
					}
					else
					{
						//mydigitalstructure.invoke('util-end', applyCreditNotesToBeSentToXero);
						mydigitalstructure.invoke('app-process-apply-credit-notes-process');
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-apply-credit-notes-process',
			notes: 'Send credit notes to xero',
			code: function (param)
			{
				var applyCreditNotesToBeSentToXero = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-apply-credit-notes-to-be-sent-to-xero'
				});

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-apply-credit-notes-process',
					context: 'index',
					valueDefault: 0
				});

				if (index < applyCreditNotesToBeSentToXero.length)
				{
					var applyCreditNoteToBeSentToXero = applyCreditNotesToBeSentToXero[index];

					if (!applyCreditNoteToBeSentToXero.canBeSentToXero)
					{
						console.log('!!ERROR; Missing Credit Note or Invoice Xero Link');
						console.log(applyCreditNoteToBeSentToXero);
					}
					else
					{
						var applyCreditNoteXeroID = applyCreditNoteToBeSentToXero._xeroCreditNoteLink.urlguid;
						var xeroApplyCreditNoteApplicationData =
						{
							amount: applyCreditNoteToBeSentToXero.amount,
							date: applyCreditNoteToBeSentToXero.appliesdate,
							invoice:
							{
								invoiceID: applyCreditNoteToBeSentToXero._xeroInvoiceLink.urlguid
							},
						}

						var xeroApplyCreditNoteApplication =
						{
							allocations:
							[
								xeroApplyCreditNoteApplicationData
							]
						};

						applyCreditNoteToBeSentToXero._xeroData = xeroApplyCreditNoteApplication;
						console.log(xeroApplyCreditNoteApplication);

						//mydigitalstructure.invoke('util-end');

						var xeroTenant = mydigitalstructure.get(
						{
							scope: 'app',
							context: 'xero-tenant'
						});

						xero.accountingApi.createCreditNoteAllocation(xeroTenant.tenantId, applyCreditNoteXeroID, xeroApplyCreditNoteApplication, true)
						.then(function (data)
						{	
							applyCreditNoteToBeSentToXero._xero = data.response.body;

							mydigitalstructure.set(
							{
								scope: 'app-process-apply-credit-notes-process-next',
								context: 'xero-credit-note-application',
								value: data.response.body
							});

							console.log(applyCreditNoteToBeSentToXero._xero)

							mydigitalstructure.invoke('app-process-apply-credit-notes-process-next');
						},
						function (data)
						{
							//console.log(data);
							console.log(data.response.body);
							console.log(data.response.body.Elements[0].ValidationErrors);
						});	
					}	
				}
				else
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'apply-credit-notes; Complete.',
						count: applyCreditNotesToBeSentToXero.length
					});
				}		
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-apply-credit-notes-process-next',
			code: function (param, response)
			{
				var applyCreditNotesToBeSentToXero = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'app-process-apply-credit-notes-to-be-sent-to-xero'
				});

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-apply-credit-notes-process',
					context: 'index',
					valueDefault: 0
				});
	
				if (response == undefined)
				{
					var xeroCreditNoteApplicationData = mydigitalstructure.get(
					{
						scope: 'app-process-apply-credit-notes-process-next',
						context: 'xero-credit-note-application'
					});

					var applyCreditNoteToBeSentToXero = applyCreditNotesToBeSentToXero[index];

					//create link
					if (_.has(xeroCreditNoteApplicationData, 'Allocations'))
					{
						var settings = mydigitalstructure.get({scope: '_settings'});

						var data =
						{
							url: settings.mydigitalstructure.xeroURL,
							object: 245,
							objectcontext: applyCreditNoteToBeSentToXero.id,
							urlguid: xeroCreditNoteApplicationData.Id,
							urlreference: _.truncate(applyCreditNoteToBeSentToXero.credittext, 97)
						}

						//mydigitalstructure.invoke('util-end', data);

						mydigitalstructure.cloud.save(
						{
							object: 'core_url_link',
							data: data,
							callback: 'app-process-apply-credit-notes-process-next'
						});
					}
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app-process-apply-credit-notes-process',
						context: 'index',
						value: index + 1
					});

					mydigitalstructure.invoke('app-process-apply-credit-notes-process');
				}
			}
		});

//---- CREATE-INVOICES

		mydigitalstructure.add(
		{
			name: 'app-process-create-invoices',
			code: function (param, response)
			{				
				var settings = mydigitalstructure.get({scope: '_settings'});

				if (response == undefined)
				{
					var filters = 
					[
						{
							name: '('
						},
						{
							field: 'status',
							comparison: 'EQUAL_TO',
							value: settings.mydigitalstructure.invoiceStatuses.tobesenttoxero
						},
						{
							name: 'or'
						},
						{
							field: 'status',
							comparison: 'IS_NULL'
						},
						{
							name: ')'
						},
						{
							field: 'amount',
							comparison: 'NOT_EQUAL_TO',
							value: 0
						},
					]

					if (_.has(settings, 'mydigitalstructure.invoiceCreatedAfterDate'))
					{
						filters.push(
						{
							field: 'createddate',
							comparison: 'GREATER_THAN',
							value: settings.mydigitalstructure.invoiceCreatedAfterDate
						})
					}
					else
					{
						filters.push(
						{
							field: 'createddate',
							comparison: 'GREATER_THAN_OR_EQUAL_TO',
							value: moment().add(-7, 'days').format('DD MMM YYYY')
						})
					}

					if (settings.mydigitalstructure.invoicesMaximum == undefined)
					{
						settings.mydigitalstructure.invoicesMaximum = 100 
					}

					console.log(settings.mydigitalstructure.invoicesMaximum);

					mydigitalstructure.cloud.search(
					{
						object: 'financial_invoice',
						fields: ['guid', 'contactbusinesssentto', 'sentdate', 'duedate', 'reference'],
						filters: filters,
						sorts:
						[
							{
								name: 'createddate',
								direction: 'asc'
							}
						],
						rows: settings.mydigitalstructure.invoicesMaximum,
						callback: 'app-process-create-invoices'
					});
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices-to-send',
						value: response.data.rows
					});

					mydigitalstructure.invoke('app-process-create-invoices-items')
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-invoices-items',
			code: function (param, response)
			{
				//Get the items

				var invoicesToSend = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices-to-send'
				});

				if (invoicesToSend.length == 0)
				{
					mydigitalstructure.invoke('util-end', {message: 'create-invoices; Complete.', count: 0});
				}
				else
				{
					if (response == undefined)
					{
						var invoicesToSendIDs = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-to-send-ids',
							value: _.map(invoicesToSend, 'id')
						});

						//should not need all the details - reduce list

						var fields =
						[
							'description',
							'financialaccounttext',
							'amount',
							'objectcontext',
							'lineitem.financialaccount.code',
							'taxtyperevenuetext',
							'preadjustmentamount',
							'preadjustmenttax',
							'taxtype'
						]
	
						var settings = mydigitalstructure.get({scope: '_settings'});

						var filters = 
						[
							{
								field: 'object',
								value: 5
							},

							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: invoicesToSendIDs.join(',')
							}
						]

						mydigitalstructure.cloud.search(
						{
							object: 'financial_item',
							fields: fields,
							filters: filters,
							rows: 99999,
							callback: 'app-process-create-invoices-items'
						});
					}
					else
					{
						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-to-send-items',
							value: response.data.rows
						});

						mydigitalstructure.invoke('app-process-create-invoices-to-send-contacts')
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-create-invoices-to-send-contacts',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var invoicesToSend = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices-to-send'
				});

				var mydigitalstructureContactBusinessIDs = _.map(invoicesToSend, 'contactbusinesssentto');
				
				if (mydigitalstructureContactBusinessIDs.length == 0)
				{
					mydigitalstructure.invoke('util-end', {message: 'app-process-create-invoices-to-send-contacts; No contacts.'});
				}
				else
				{
					if (response == undefined)
					{
						mydigitalstructure.cloud.search(
						{
							object: 'core_url_link',
							fields:
							[
								'objectcontext', 'urlguid'
							],
							filters:
							[
								{
									field: 'url',
									value: settings.mydigitalstructure.xeroURL
								},
								{
									field: 'object',
									value: 12
								},
								{
									field: 'objectcontext',
									comparison: 'IN_LIST',
									value: mydigitalstructureContactBusinessIDs.join(',')
								}
							],
							rows: 99999,
							sorts:
							[
								{
									field: 'id',
									direction: 'desc'
								}
							],
							callback: 'app-process-create-invoices-to-send-contacts'
						});
					}
					else
					{
						var mydigitalstructureInvoicesToSendContactLinks = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-to-send-contact-links',
							value: response.data.rows
						});

						var mydigitalstructureInvoicesToSendItems = mydigitalstructure.get(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-to-send-items'
						});

						_.each(invoicesToSend, function (invoiceToSend)
						{
							invoiceToSend._contactLink = 
								_.find(mydigitalstructureInvoicesToSendContactLinks, function (mydigitalstructureInvoicesToSendContactLink)
								{
									return (mydigitalstructureInvoicesToSendContactLink.objectcontext == invoiceToSend.contactbusinesssentto)
								});

							invoiceToSend.contactLinked = (invoiceToSend._contactLink != undefined);

							if (invoiceToSend.contactLinked)
							{
								invoiceToSend.contactLinkID = invoiceToSend._contactLink.urlguid;
							}

							invoiceToSend._lineItems = 
								_.filter(mydigitalstructureInvoicesToSendItems, function (mydigitalstructureInvoicesToSendItem)
								{
									return (mydigitalstructureInvoicesToSendItem.objectcontext == invoiceToSend.id)
								});
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-to-send',
							value: invoicesToSend
						});
					
						var invoicesToSendLinkedContact = _.filter(invoicesToSend, function (invoiceToSend)
						{
							return (invoiceToSend.contactLinked)
						});

						mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-to-send-contact-linked',
							value: invoicesToSendLinkedContact
						});

						mydigitalstructure.invoke('app-process-invoices-to-send-contact-linked-process')
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-invoices-to-send-contact-linked-process',
			code: function (param)
			{
				//send invoices to xero

				var invoicesToSendLinkedContact = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices-to-send-contact-linked'
				});

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-invoices-to-send-contact-linked-process',
					context: 'index',
					valueDefault: 0
				});

				if (index < invoicesToSendLinkedContact.length)
				{
					var invoiceToSend = invoicesToSendLinkedContact[index];

					var xeroInvoiceData =
					{
						type: xeroNode.Invoice.TypeEnum.ACCREC,
						contact:
						{
							contactID: invoiceToSend.contactLinkID
						},
						date: moment(invoiceToSend.sentdate, 'DD MMM YYYY').format('YYYY-MM-DD'),
						dueDate: moment(invoiceToSend.duedate, 'DD MMM YYYY').format('YYYY-MM-DD'),
						reference: invoiceToSend.reference,
						status: xeroNode.Invoice.StatusEnum.AUTHORISED,
						lineAmountTypes: 'Inclusive',
						lineItems: []
					}

					//1=GST Applies,2=GST Free - Export,3=GST Free - Other,4=GST Free - Input
					var settings = mydigitalstructure.get({scope: '_settings'});

					var invoiceTaxTypes = settings.mydigitalstructure.taxTypes;
					if (invoiceTaxTypes == undefined)
					{
						invoiceTaxTypes = 
						{
							1: 'OUTPUT',
							2: 'EXEMPTOUTPUT',
							3: 'EXEMPTOUTPUT',
							4: 'EXEMPTOUTPUT'
						}
					}

					_.each(invoiceToSend._lineItems, function (lineItem)
					{
						lineItem._preadjustmentamount = parseFloat(lineItem['preadjustmentamount'].replace(/,/g, ''));
						lineItem._preadjustmenttax = parseFloat(lineItem['preadjustmenttax'].replace(/,/g, ''))

						lineItem.amountextax = (lineItem._preadjustmentamount - lineItem._preadjustmenttax);
						lineItem.amount = lineItem._preadjustmentamount;

						var sendAsExclusive = false;

						if (sendAsExclusive)
						{
							xeroInvoiceData.lineAmountTypes = 'Exclusive'
							xeroInvoiceData.lineItems.push(
							{
								description: lineItem.description,
								quantity: 1.0,
								unitAmount: lineItem.amountextax,
								accountCode: lineItem['lineitem.financialaccount.code'],
								taxType: invoiceTaxTypes[lineItem.taxtype],
								lineAmount: lineItem.amountextax
							});
						}
						else
						{	
							xeroInvoiceData.lineItems.push(
							{
								description: lineItem.description,
								quantity: 1.0,
								unitAmount: lineItem.amount,
								accountCode: lineItem['lineitem.financialaccount.code'],
								taxType: 'OUTPUT',
								lineAmount: lineItem.amount
							});
						}
					});

					var xeroInvoice =
					{
						invoices:
						[
							xeroInvoiceData
						]
					};

					invoiceToSend._xeroData = xeroInvoiceData;
					console.log(xeroInvoice);

					var xeroTenant = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'xero-tenant'
					});

					if (invoiceToSend._lineItems.length == 0)
					{
						mydigitalstructure.set(
						{
							scope: 'app-process-invoices-to-send-contact-linked-process',
							context: 'index',
							value: index + 1
						});

						mydigitalstructure.invoke('app-process-invoices-to-send-contact-linked-process');
					}
					else
					{
						xero.accountingApi.createInvoices(xeroTenant.tenantId, xeroInvoice)
						.then(function (data)
						{	
							invoiceToSend._xero = data.response.body;

							mydigitalstructure.set(
							{
								scope: 'app-process-invoices-to-send-contact-linked-process-next',
								context: 'xero-invoice',
								value: data.response.body
							})

							mydigitalstructure.invoke('app-process-invoices-to-send-contact-linked-process-next');
						},
						function (data)
						{
							//console.log(data);
							console.log(data.response.body);
							console.log(data.response.body.Elements[0].ValidationErrors);
						});	
					}
				}
				else
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'create-invoices; Complete.',
						count: invoicesToSendLinkedContact.length,
						invoicesSentToXero: invoicesToSendLinkedContact
					});
				}		
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-invoices-to-send-contact-linked-process-next',
			code: function (param, response)
			{
				var index = mydigitalstructure.get(
				{
					scope: 'app-process-invoices-to-send-contact-linked-process',
					context: 'index'
				});

				if (response == undefined)
				{
					var xeroInvoiceData = mydigitalstructure.get(
					{
						scope: 'app-process-invoices-to-send-contact-linked-process-next',
						context: 'xero-invoice'
					})

					var invoicesToSendLinkedContact = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices-to-send-contact-linked'
					});

					var invoiceToSend = invoicesToSendLinkedContact[index];

					//create link
					if (_.has(xeroInvoiceData, 'Invoices'))
					{
						var settings = mydigitalstructure.get({scope: '_settings'});

						var xeroInvoice = _.first(xeroInvoiceData.Invoices)

						var data =
						{
							url: settings.mydigitalstructure.xeroURL,
							object: 5,
							objectcontext: invoiceToSend.id,
							urlguid: xeroInvoice.InvoiceID,
							urlreference: _.truncate(xeroInvoice.InvoiceNumber, 97)
						}

						mydigitalstructure.cloud.save(
						{
							object: 'core_url_link',
							data: data,
							callback: 'app-process-invoices-to-send-contact-linked-process-next'
						});
					}
				}
				else
				{
					mydigitalstructure.invoke('app-process-invoices-to-send-contact-linked-process-next-status');
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-invoices-to-send-contact-linked-process-next-status',
			code: function (param, response)
			{
				var index = mydigitalstructure.get(
				{
					scope: 'app-process-invoices-to-send-contact-linked-process',
					context: 'index'
				});

				if (response == undefined)
				{
					var invoicesToSendLinkedContact = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices-to-send-contact-linked'
					});

					var invoiceToSend = invoicesToSendLinkedContact[index];

					var settings = mydigitalstructure.get({scope: '_settings'});

					var data =
					{
						id: invoiceToSend.id,
						status: settings.mydigitalstructure.invoiceStatuses.senttoxero
					}

					mydigitalstructure.cloud.save(
					{
						object: 'financial_invoice',
						data: data,
						callback: 'app-process-invoices-to-send-contact-linked-process-next-status'
					});
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app-process-invoices-to-send-contact-linked-process',
						context: 'index',
						value: index + 1
					});

					mydigitalstructure.invoke('app-process-invoices-to-send-contact-linked-process');
				}
			}
		});

		//-- get-invoices
		//-- to see if have been paid
		//-- https://xeroapi.github.io/xero-node/v4/accounting/#api-Accounting-getInvoices

		mydigitalstructure.add(
		{
			name: 'app-process-get-invoices',
			code: function (param, response)
			{				
				var settings = mydigitalstructure.get({scope: '_settings'});

				if (response == undefined)
				{
					var filters = 
					[
						{
							field: 'status',
							comparison: 'EQUAL_TO',
							value: settings.mydigitalstructure.invoiceStatuses.senttoxero
						}
					]

					if (_.has(settings, 'mydigitalstructure.invoiceCreatedAfterDate'))
					{
						filters.push(
						{
							field: 'createddate',
							comparison: 'GREATER_THAN',
							value: settings.mydigitalstructure.invoiceCreatedAfterDate
						});
					}

					mydigitalstructure.cloud.search(
					{
						object: 'financial_invoice',
						fields: ['guid', 'contactbusinesssenttotext', 'reference', 'outstandingamount'],
						filters: filters,
						rows: 99999,
						callback: 'app-process-get-invoices'
					});
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices',
						value: response.data.rows
					});

					mydigitalstructure.invoke('app-process-get-invoices-links');
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-invoices-links',
			code: function (param, response)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var mydigitalstructureInvoices = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices'
				});

				if (mydigitalstructureInvoices.length == 0)
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'No outstanding invoices'
					})
				}
				else
				{
					if (response == undefined)
					{
						var filters = 
						[
							{
								field: 'url',
								value: settings.mydigitalstructure.xeroURL
							},
							{
								field: 'object',
								value: 5
							},
							{
								field: 'objectcontext',
								comparison: 'IN_LIST',
								value: _.join(_.map(mydigitalstructureInvoices, 'id'), ',')
							}
						]

						mydigitalstructure.cloud.search(
						{
							object: 'core_url_link',
							fields:
							[
								'objectcontext', 'urlguid'
							],
							filters: filters,
							rows: 99999,
							sorts:
							[
								{
									field: 'id',
									direction: 'desc'
								}
							],
							callback: 'app-process-get-invoices-links'
						});
					}
					else
					{
						var mydigitalstructureInvoicesLinks = mydigitalstructure.set(
						{
							scope: 'app',
							context: 'mydigitalstructure-invoices-links',
							value: response.data.rows
						});

						if (mydigitalstructureInvoicesLinks.length == 0)
						{
							mydigitalstructure.invoke('util-end', {message: 'No linked invoices'})
						}
						else
						{
							// Then do a xero.getInvoices for set of InvoiceIDS (urlguid)
							//mydigitalstructure.invoke('app-process-create-invoices-items')

							_.each(mydigitalstructureInvoices, function (mydigitalstructureInvoice)
							{
								mydigitalstructureInvoice._xeroInvoiceLink = 
									_.find(mydigitalstructureInvoicesLinks, function (mydigitalstructureInvoicesLink)
									{
										return (mydigitalstructureInvoicesLink.objectcontext == mydigitalstructureInvoice.id)
									});

								mydigitalstructureInvoice.xeroInvoiceLink = (mydigitalstructureInvoice._xeroInvoiceLink != undefined)
							});

							var mydigitalstructureInvoicesSentToXero = mydigitalstructure.set(
							{
								scope: 'app',
								context: 'mydigitalstructure-invoices-sent-to-xero',
								value: _.filter(mydigitalstructureInvoices, function (mydigitalstructureInvoice)
								{
									return (mydigitalstructureInvoice.xeroInvoiceLink)
								})
							});

							if (mydigitalstructureInvoicesSentToXero.length == 0)
							{}
							else
							{
								mydigitalstructure.invoke('app-process-get-invoices-from-xero');
							}

						}
					}
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-invoices-from-xero',
			code: function ()
			{	
				//https://xeroapi.github.io/xero-node/v4/accounting/index.html#api-Accounting-getInvoices
				//Outstanding invoices that have been sent to xero

				var mydigitalstructureInvoicesSentToXero = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices-sent-to-xero'
				});

				var xeroTenant = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'xero-tenant'
				});

				var xeroInvoiceIDs = _.map(mydigitalstructureInvoicesSentToXero, function (mydigitalstructureInvoiceSentToXero)
				{
					return (mydigitalstructureInvoiceSentToXero._xeroInvoiceLink.urlguid)
				});

				xero.accountingApi.getInvoices(xeroTenant.tenantId, null, null, null, xeroInvoiceIDs)
				.then(function (data)
				{
					var xeroInvoices = data.body.invoices;

					console.log(xeroInvoices)
					
					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'xero-invoices',
						value: xeroInvoices
					});

					var mydigitalstructureInvoicesSentToXero = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices-sent-to-xero'
					});

					_.each(mydigitalstructureInvoicesSentToXero, function (mydigitalstructureInvoiceSentToXero)
					{
						mydigitalstructureInvoiceSentToXero._xeroInvoice = 
							_.find(xeroInvoices, function (xeroInvoice)
							{
								return (mydigitalstructureInvoiceSentToXero._xeroInvoiceLink.urlguid == xeroInvoice.invoiceID)
							});

						mydigitalstructureInvoiceSentToXero.xeroInvoice = (mydigitalstructureInvoiceSentToXero._xeroInvoice != undefined);

						mydigitalstructureInvoiceSentToXero.paymentAmount = 0;

						if (mydigitalstructureInvoiceSentToXero.xeroInvoice)
						{
							mydigitalstructureInvoiceSentToXero.fullyPaid =
							(
								(
								parseFloat(mydigitalstructureInvoiceSentToXero.outstandingamount.replace(/,/g, ''))
									- parseFloat(mydigitalstructureInvoiceSentToXero._xeroInvoice.amountPaid)
								) == 0
							)
						}
					});

					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'mydigitalstructure-invoices-fully-paid-in-xero',
						value: _.filter(mydigitalstructureInvoicesSentToXero, function (mydigitalstructureInvoiceSentToXero)
						{
							return (mydigitalstructureInvoiceSentToXero.fullyPaid)
						})
					});

					mydigitalstructure.invoke('app-process-get-invoices-process')
				},
				function (data)
				{
					mydigitalstructure._util.message(data, 'get-invoices')
				});
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-invoices-process',
			code: function (param)
			{
				var settings = mydigitalstructure.get({scope: '_settings'});

				var fullyPaidInvoices = mydigitalstructure.get(
				{
					scope: 'app',
					context: 'mydigitalstructure-invoices-fully-paid-in-xero'
				});

				console.log(fullyPaidInvoices)

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-get-invoices-process',
					context: 'index',
					valueDefault: 0
				});

				if (index < fullyPaidInvoices.length)
				{
					var fullyPaidInvoice = fullyPaidInvoices[index];

					var data =
					{ 
						id: fullyPaidInvoice.id,
						status: settings.mydigitalstructure.invoiceStatuses.fullypaidinxero,
						_fullyreceipteddate: moment().format('DD MMM YYYY')
					}

					mydigitalstructure.cloud.save(
					{
						object: 'financial_invoice',
						data: data,
						callback: 'app-process-get-invoices-process-next'
					});
				}
				else
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'get-invoices; Complete.',
						count: fullyPaidInvoices.length,
						fullyPaidInvoices: fullyPaidInvoices
					});
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-get-invoices-process-next',
			code: function (param, response)
			{
				var index = mydigitalstructure.get(
				{
					scope: 'app-process-get-invoices-process',
					context: 'index'
				});

				mydigitalstructure.set(
				{
					scope: 'app-process-get-invoices-process',
					context: 'index',
					value: index + 1
				});

				mydigitalstructure.invoke('app-process-get-invoices-process');
			}
		});

		//---- convert-contacts
		//---- Convert contacts within mydigitalstructure based on event.fields[contactBusiness/contactPerson]

		mydigitalstructure.add(
		{
			name: 'app-process-convert-contacts',
			code: function (param, response)
			{
				var event = mydigitalstructure.get({scope: '_event'});

				if (response == undefined)
				{
					mydigitalstructure.cloud.search(
					{
						object: event.object,
						fields: [event.field],
						filters:
						[
							{field: event.field, comparision: 'IS_NOT_NULL'}
						],
						callback: 'app-process-convert-contacts',
						callbackParam: param,
					});
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app-process-convert-contacts',
						context: 'contacts',
						value: response.data.rows
					});

					mydigitalstructure.invoke('app-process-convert-contacts-links');
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-convert-contacts-links',
			code: function (param, response)
			{
				var event = mydigitalstructure.get({scope: '_event'});
				var settings = mydigitalstructure.get({scope: '_settings'});

				if (response == undefined)
				{
					mydigitalstructure.cloud.search(
					{
						object: 'core_url_link',
						fields:
						[
							'objectcontext', 'urlguid'
						],
						filters:
						[
							{
								field: 'url',
								value: settings.mydigitalstructure.xeroURL
							},
							{
								field: 'object',
								value: event.objectID
							}
						],
						rows: 99999,
						callback: 'app-process-convert-contacts-links'
					});
				}
				else
				{
					mydigitalstructure.set(
					{
						scope: 'app-process-convert-contacts-links',
						context: 'contacts-links',
						value: response.data.rows
					});

					mydigitalstructure.set(
					{
						scope: 'app-process-convert-contacts-process',
						context: 'index',
						value: 0
					});

					mydigitalstructure.invoke('app-process-convert-contacts-process');
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-convert-contacts-process',
			code: function (param)
			{
				var event = mydigitalstructure.get({scope: '_event'});
				var settings = mydigitalstructure.get({scope: '_settings'});

				var contacts = mydigitalstructure.get(
				{
					scope: 'app-process-convert-contacts',
					context: 'contacts'
				});
				
				var contactLinks = mydigitalstructure.get(
				{
					scope: 'app-process-convert-contacts-links',
					context: 'contacts-links'
				});

				var index = mydigitalstructure.get(
				{
					scope: 'app-process-convert-contacts-process',
					context: 'index'
				});

				if (index < contacts.length)
				{
					var contact = contacts[index];

					var contactLink = _.find(contactLinks, function (contactLink) {return contactLink.objectcontext == contact.id});

					if (contactLink == undefined)
					{
						var data =
						{
							object: event.objectID,
							url: settings.mydigitalstructure.xeroURL,
							objectcontext: contact.id,
							urlguid: contact[event.field],
							urlreference: _.truncate(contact[event.field], 97)
						}

						mydigitalstructure.cloud.save(
						{
							object: 'core_url_link',
							data: data,
							callback: 'app-process-convert-contacts-process-next'
						});
					}
					else
					{
						app.invoke('app-process-convert-contacts-process-next')
					}
				}
				else
				{
					mydigitalstructure.invoke('util-end',
					{
						message: 'covert-contacts; Complete. [' + contacts.length + ']',
					});
				}
			}
		});

		mydigitalstructure.add(
		{
			name: 'app-process-convert-contacts-process-next',
			code: function (param, response)
			{
				var index = mydigitalstructure.get(
				{
					scope: 'app-process-convert-contacts-process',
					context: 'index'
				});

				mydigitalstructure.set(
				{
					scope: 'aapp-process-convert-contacts-process',
					context: 'index',
					value: index + 1
				});

				mydigitalstructure.invoke('app-process-convert-contacts-process');
			}
		});

		//--- UTIL FUNCTIONS

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
			name: 'util-end',
			code: function (data, error)
			{
				var callback = mydigitalstructure.get(
				{
					scope: '_callback'
				});

				if (error == undefined) {error = null}

				if (callback != undefined)
				{
					callback(error, data);
				}
			}
		});

		// !!!! APP STARTS HERE; Initialise the app; app-init invokes app-start if authentication OK
		mydigitalstructure.invoke('app-init');
	}		
}
