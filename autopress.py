#!/usr/bin/python

# Import Modules. twindb_cloudflare will be replaced with requests once I(we) figure out proper vanilla API calls.
#twindb doesn't support removing IPV6 records but requests with the native Cloudflare API does.

import random
from twindb_cloudflare.twindb_cloudflare import CloudFlare, CloudFlareException
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
import requests
import json
from secrets import *


testing = False

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

if len(sys.argv) > 1:
    # We have args passed
    for arg in sys.argv:
        if arg.lower() == "-testing":
            # Testing is enabled
            testing = True
            print("LetsEncrypt staging is enabled, certificates generated are invalid, run without -letest for production certificates")
            break



def main(testing = False):
    domain = str(raw_input("What is the root domain name ie domain.com:"))
    domainLong = str('www.'+domain)
    config = "/etc/nginx/sites-enabled" +domain + ".conf"
    cf = CloudFlare(CLOUDFLARE_EMAIL, CLOUDFLARE_AUTH_KEY)


    if arg.lower() == "-subdomain":
        subdomain = str(raw_input("What is the subdomain:"))
        fullDomain = subdomain +"." + domain
        wwwFull = "www."+subdomain + "." + domain
        toDirectory = "/var/www/" + fullDomain





try:
    main(testing)
except Exception as e:
        # Do nginx stuff here
    print("Error detected, reverting")
    print("Nothing to revert.")

    print(" \n\n")

    print("Caught exception: " + repr(e))
    traceback.print_exc()
    exit(1)
exit(0)
