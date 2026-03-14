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


Upload a file
post
https://www.virustotal.com/api/v3/files

Upload and analyse a file

📘
File size
If the file to be uploaded is bigger than 32MB, please use the /files/upload_url endpoint instead which admits files up to 650MB.

Body Params
File to scan

file
file
Aucun fichier choisi
password
string
Optional, password to decompress and scan a file contained in a protected ZIP file.

Headers
x-apikey
string
required
Your API key

Responses

200
The analysis ID. Use /analyses/<analysis_ID> API call to check the analysis status.

400
If password was provided and the file isn't a ZIP, it contains more than one file, the password is incorrect, or the file is corrupt.

Updated 3 months ago

Files
Get a URL for uploading large files
Language

Shell

Node

Ruby

PHP

Python
1
curl --request POST \
2
     --url https://www.virustotal.com/api/v3/files \
3
     --header 'accept: application/json' \
4
     --header 'content-type: multipart/form-data'

Try It!
Response
Click Try It! to start a request and see the response here! Or choose an example:
application/json

200
