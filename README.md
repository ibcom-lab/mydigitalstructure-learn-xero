# mydigitalstructure-xero

Xero integration

# Flow;

- Get accesstoken (30 min life)
- Use refreshtoken (6 months life)

- Store tokens on myds as CORE_PROTECT_KEY_ against user. Type=2 (Private). Use Reference = 'xero-refresh-token'

# Techical;

- index-proxy-connect.js; lambda - gateway API - to get consent URL and then get tokens after user Allow Access
- redirectURL is for token save - ie the AWS gateapi URL

- index.js; do the sync
-- get contacts and store xero ContactID as CORE_URL_LINK_ against business contact
-- send invoices based on stored contactID - store xero invoiceID as CORE_URL_LINK_ against Invoice.

# More;

https://xeroapi.github.io/xero-node/v4/accounting/#api-Accounting-getContacts
https://developer.xero.com/documentation/oauth2/scopes
https://developer.xero.com/documentation/getting-started/development-accounts
https://developer.xero.com/documentation/libraries/node-js
https://www.npmjs.com/package/xero-node
https://app.getpostman.com/run-collection/d069793e904f7602770d#?env%5BOAuth%202.0%5D=W3sia2V5IjoiY2xpZW50X2lkIiwidmFsdWUiOiIiLCJlbmFibGVkIjp0cnVlfSx7ImtleSI6ImNsaWVudF9zZWNyZXQiLCJ2YWx1ZSI6IiIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoicmVmcmVzaF90b2tlbiIsInZhbHVlIjoiIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJhY2Nlc3NfdG9rZW4iLCJ2YWx1ZSI6IiIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoieGVyby10ZW5hbnQtaWQiLCJ2YWx1ZSI6IiIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoicmVfZGlyZWN0VVJJIiwidmFsdWUiOiIiLCJlbmFibGVkIjp0cnVlfSx7ImtleSI6InNjb3BlcyIsInZhbHVlIjoiIiwiZW5hYmxlZCI6dHJ1ZX0seyJrZXkiOiJzdGF0ZSIsInZhbHVlIjoiIiwiZW5hYmxlZCI6dHJ1ZX1d

