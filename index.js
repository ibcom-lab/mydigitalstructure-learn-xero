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

	mydigitalstructure.cloud.search(
	{
		object: 'core_protect_key',
		fields: ['object', 'objectcontext', 'title', 'key', 'notes']
	});

	0/ SETUP XERO CONNECTION/URL IN MYDS

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
			title: 'Do not send to xero'
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

	DOES refresh-token exist for user - if not got to proxy-connect 
			-- user being the integration proxy.

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

				xero.accountingApi.getContacts(xeroTenant.tenantId)
				.then(function (data)
				{
					mydigitalstructure.set(
					{
						scope: 'app',
						context: 'xero-contacts',
						value: data.body.contacts
					});

					var xeroContactCustomers = mydigitalstructure.set(
					{
						scope: 'app',
						context: 'xero-contacts-customers',
						value: _.map(_.filter(data.body.contacts, function(contact) {return contact.isCustomer}),
											function (customer) {return {name: customer.name, id: customer.contactID}})
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

					_.each(xeroContactCustomers, function (xeroContactCustomer)
					{
						xeroContactCustomer._mydigitalstructureContact = 
							_.find(mydigitalstructureContacts, function (mydigitalstructureContact)
							{
								return (mydigitalstructureContact.tradename.toLowerCase() == xeroContactCustomer.name.toLowerCase()
											|| mydigitalstructureContact.legalname.toLowerCase() == xeroContactCustomer.name.toLowerCase())
							});

						xeroContactCustomer.matched = (xeroContactCustomer._mydigitalstructureContact != undefined);

						if (xeroContactCustomer.matched)
						{
							xeroContactCustomer.mydigitalstructureContactGUID = xeroContactCustomer._mydigitalstructureContact.guid;
							xeroContactCustomer.mydigitalstructureContactID = xeroContactCustomer._mydigitalstructureContact.id;
						}
					});

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

					if (xeroContactCustomersUnmatched.length != 0)
					{
						var message = [];

						message.push('<p>Hi, the following customer contacts in xero could not be matched (based on trading name or legal name) to a certification body, auditor, retailer or trainer within HARPSonline.</p>')
						message.push('<p>You need to either update the contact in xero or HARPSonline so they match.</p>');
						message.push('<ul>');

						_.each(xeroContactCustomersUnmatched, function (xeroContactCustomerUnmatched)
						{
							message.push('<li>' + encodeURIComponent(xeroContactCustomerUnmatched.name) + '</li>');
						});
						message.push('</ul>');
						message.push('<p>Thanks, HARPSonline to xero integration.</p>');

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
				}
				else
				{
					mydigitalstructure.invoke('app-process-get-contacts-check-complete')
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
							sorts: [],
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


	//---- create-invoices

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
						}
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

					mydigitalstructure.cloud.search(
					{
						object: 'financial_invoice',
						fields: ['guid', 'contactbusinesssentto', 'sentdate', 'duedate', 'reference'],
						filters: filters,
						rows: 100,
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
							'preadjustmenttax'
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
							sorts: [],
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
						lineItems: []
					}

					_.each(invoiceToSend._lineItems, function (lineItem)
					{
						lineItem._preadjustmentamount = parseFloat(lineItem['preadjustmentamount'].replace(/,/g, ''));
						lineItem._preadjustmenttax = parseFloat(lineItem['preadjustmenttax'].replace(/,/g, ''))

						lineItem.amountextax = (lineItem._preadjustmentamount - lineItem._preadjustmenttax)

						xeroInvoiceData.lineItems.push(
						{
							description: lineItem.description,
							quantity: 1.0,
							unitAmount: lineItem.amountextax,
							accountCode: lineItem['lineitem.financialaccount.code'],
							taxType: 'OUTPUT',
							lineAmount: lineItem.amountextax
						});

					});

					var xeroInvoice =
					{
						invoices:
						[
							xeroInvoiceData
						]
					};

					var xeroTenant = mydigitalstructure.get(
					{
						scope: 'app',
						context: 'xero-tenant'
					});

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
					});		
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
							sorts: [],
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
					var xeroInvoices = data.body.invoices
					
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
						status: settings.mydigitalstructure.invoiceStatuses.fullypaidinxero
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
