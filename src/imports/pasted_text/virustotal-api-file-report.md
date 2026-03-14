Jump to Content
VirusTotal
Home
Guides
API Reference

Search
CTRL-K
JUMP TO
CTRL-/
Introduction
VirusTotal API v3 Overview
Public vs Premium API
Technology Integrations
Getting started
Authentication
API responses

Legend
API v2 to v3 Migration Guide
IOC REPUTATION & ENRICHMENT
IP addresses

Domains & Resolutions

Files

Upload a file
post
Get a URL for uploading large files
get
Get a file report
get
Request a file rescan (re-analyze)
post
Get a file’s download URL
get
Download a file
get
Get comments on a file
get
Add a comment to a file
post
Get objects related to a file
get
Get object descriptors related to a file
get
Get a crowdsourced Sigma rule object
get
Get a crowdsourced YARA ruleset
get
Get votes on a file
get
Add a vote on a file
post
File Behaviours

URLs

Comments

Analyses, Submissions & Operations

Attack Tactics

Attack Techniques

Popular Threat Categories

Code Insights

Saved Searches

VT Enterprise
Search & Metadata

Collections

Zipping files

VT Hunting
YARA Rules

IoC Stream

🔒 Livehunt

🔒 Retrohunt

VT GRAPH
VT Graphs

VT Graphs Permissions & ACL

VT Private Scanning
🔒 Files

🔒 Analyses

🔒 File Behaviours

🔒 URLs

Zipping private files

VT FeedS
🔒 File intelligence feed

🔒 Sandbox analyses feed

🔒 Domain intelligence feed

🔒 IP intelligence feed

🔒 URL intelligence feed

VT ENTERPRISE ADMINISTRATION
User management

Group management

Quota management

Service Account Management

Audit Log

VT Augment
Overview
Rendering

Theming
API Objects
Activity Log
Analyses

Attack Tactics

Attack Techniques

Collections

Comments

Domains

Files

Files Behaviour

Graphs

Groups

Hunting Notifications
Hunting Rulesets

IoC-Stream Notifications
IP addresses

Operations
🔒 Private Analyses

🔒 Private Files

🔒 Private Files Behaviours

🔒 Private URLs
🔒 Private URLs Behaviours
Resolutions
Retrohunt Jobs

Screenshots
Sigma Analyses

Sigma Rules
SSL Certificate
Submissions
URLs

Users

Saved Searches
Service Accounts

Votes
Whois
YARA Rules
YARA Rulesets
VT Monitor
Software Publishers

Antivirus Partners


Get a file report
get
https://www.virustotal.com/api/v3/files/{id}


Retrieve information about a file

Returns a File object.

Metadata
id
string
required
SHA-256, SHA-1 or MD5 identifying the file

x-apikey
string
required
Your API key

Responses

200
200


400
400

Updated 3 months ago

Get a URL for uploading large files
Request a file rescan (re-analyze)
Language

Shell

Node

Ruby

PHP

Python
npx api install "@virustotal/v3.0#1j4ack8rmko7qve4"
1
import virustotal from '@api/virustotal';
2
​
3
virustotal.fileInfo({id: 'id'})
4
  .then(({ data }) => console.log(data))
5
  .catch(err => console.error(err));

Try It!
Response
Click Try It! to start a request and see the response here! Or choose an example:
application/json

400 - Result
