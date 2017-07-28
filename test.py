#!/usr/bin/python

# Import Modules. twindb_cloudflare will be replaced with requests once I(we) figure out proper vanilla API calls.
#twindb doesn't support removing IPV6 records but requests with the native Cloudflare API does.

import random
# from twindb_cloudflare.twindb_cloudflare import CloudFlare, CloudFlareException
import os
import sys
import traceback
import fileinput
# import MySQLdb
import urllib
import shutil
# import tarutil
import pwd
# import group
import socket
# import requests
import json



global config

# Make sure secrets file at least exists, not checking if valid at this point
if not os.path.exists("secrets.py"):
    print("secrets.py missing, please check README.md")
    exit(1)
print("secrets.py found, continuing")


# Make sure nginxconfig.conf exists
if not os.path.exists("nginxconfig.conf"):
    print("nginxconfig.conf missing, please make sure all files have been extracted.")
    exit(1)
print("nginxconfig.conf exists, continuing")
