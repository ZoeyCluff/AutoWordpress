#!/usr/bin/python

# Import Modules. twindb_cloudflare will be replaced with requests once I(we) figure out proper vanilla API calls.
#twindb doesn't support removing IPV6 records but requests with the native Cloudflare API does.

import random
from twindb_cloudflare.twindb_cloudflare import CloudFlare, CloudFlareException
import os
import sys
import traceback
import fileinput
import MySQLdb
import urllib
import shutil
import tarfile
import pwd
import grp
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
    mysqluser = domainLong
    mysqlpass = string.ascii_letters + string.punctuation.replace("\"", "").replace("'", "") + string.digits
    mysqlpassword1 = "".join(choice(mysqlpass) for x in range(randint(8, 16)))
    mysqlpassword = ('%s' % mysqlpassword1)




    if arg.lower() == "-subdomain":
        subdomain = str(raw_input("What is the subdomain:"))
        fullDomain = subdomain +"." + domain
        wwwFull = "www."+subdomain + "." + domain
        toDirectory = "/var/www/" + fullDomain
        fromDirectory = "/var/www/" + fullDomain + "/wordpress/"
        leDomains =  "sudo certbot certonly --test-cert --staging --agree-tos -a standalone -d '%s' -d '%s'" % (fullDomain, wwwFull)

    elif:
        toDirectory = "/var/www/" + domain
        fromDirectory = "/var/www/" + domain + "/wordpress/"
        leDomains = "sudo certbot certonly --test-cert --staging --agree-tos -a standalone -d '%s' -d '%s'" % (domain, domainLong)



    print("Creating MySQL Database and User")

    # create db + user


    db = MySQLdb.connect(host= mysqlServer,  # your host
                        user= mysqlUser,       # username
                        passwd= mysqlRootPassword )
                            # password


    # Create a Cursor object to execute queries.
    cur = db.cursor()

    # Select data from table using SQL query.
    cur.execute("CREATE DATABASE IF NOT EXISTS " +domain)

    cur.execute("GRANT ALL PRIVILEGES ON `%s`.* TO %s@'*' IDENTIFIED BY %s ", (domain, domain, mysqlpassword))
    cur.execute("FLUSH PRIVILEGES")

    db.commit()
    db.close()


    # Create htdocs folder
    os.mkdir(toDirectory)


    # Download Wordpress and extract

    linkToFile = "https://wordpress.org/latest.tar.gz"
    localDestination = toDirectory + "wordpress.tar.gz"
    resultFilePath, responseHeaders = urllib.urlretrieve(linkToFile, localDestination)

    tar = tarfile.open(localDestination)
    tar.extractall(toDirectory)
    tar.close

    copy_tree(fromDirectory, toDirectory)
    shutil.rmtree(fromDirectory)

    # set correct permissions
    os.chown(toDirectory, 33, 33)

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
