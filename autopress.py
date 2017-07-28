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


    # Create CF zones

    cf.create_dns_record(@, domain, ip)
    cf.create_dns_record(www, domain, ip)
    cf.create_dns_record(@, domain, ipv6, record_type="AAAA)
    cf.create_dns_record(www, domain, ipv6, record_type="AAAA)

    # set correct file / folder permissions

    os.system(str(folder))
    os.system(str(filePerm))

    newData = ''
    with open('nginxconfig.conf', 'r') as f:
        for line in f:
            if line.strip().startswith('ssl_certificate_key'):
                newData += line.replace('ssl_certificate_key', 'ssl_certificate_key /etc/letsencrypt/live/'+blogurl1+'/privkey.pem;')
            elif line.strip().startswith('ssl_certificate'):
                newData += line.replace('ssl_certificate', 'ssl_certificate /etc/letsencrypt/live/'+blogurl1+'/fullchain.pem;')
            elif line.strip().startswith('root'):
                newData += line.replace('root', 'root /var/www/'+blogshortstr+';')
            elif line.strip().startswith('server_name'):
                newData += line.replace('server_name', 'server_name' + " " +blogurl2 + " " +blogurl1  +';')
            else:
                newData += line


    with open("/etc/nginx/sites-enabled/" +domain + ".conf", 'w') as f:
        f.write(newData)

    # generate LE certificates

    os.system(str("sudo systemctl stop nginx"))
    os.system(str(leDomains))
    os.system(nginxTest)

    # check nginx config before starting nginx again, else reverting
    if 'ok' in open(str('nginx.py')).read():
        print("Config tests Good")
        os.system(str("sudo systemctl start nginx"))
        if testing:
            print("Run Success and testing specified, deleting files.")
            print("Cleaning up Cloudflare zones.....")
            cf.delete_dns_record(blogshortstr + '.beautifuldisaster.group', 'beautifuldisaster.group')
            cf.delete_dns_record(bloglongstr + '.beautifuldisaster.group', 'beautifuldisaster.group')

    # Delete nginx config and restart service

    print("DNS records deleted, removing htdocs folder")
            shutil.rmtree(toDirectory)
            print("htdocs folder deleted, stopping nginx service, deleting .conf file, and starting nginx service")
            os.remove("/etc/nginx/sites-enabled/" +domain + ".conf")
            os.system(str("sudo service nginx start"))

    print("dropping user and database")

    db = MySQLdb.connect(host="mysql.beautifuldisaster.group",  # your host
                                user="root",       # username
                                passwd= mysqlRootPassword )
                                    # password


            # Create a Cursor object to execute queries.
            cur = db.cursor()

            # Select data from table using SQL query.
            cur.execute("DROP DATABASE " +blogshortstr)

            cur.execute("DROP USER " +mysqluser+"@"+"45.76.26.71")
            cur.execute("FLUSH PRIVILEGES")

            db.commit()
            db.close()

            print("Database and user dropped")

    else:
        print("Errors found in config, reverting")
        cf.delete_dns_record(@, domain)
        cf.delete_dns_record(www, domain, domain)
        # maybe someday this will delete the IPV6 records.

        print("DNS records deleted, removing htdocs folder")
        shutil.rmtree(toDirectory)
        print("htdocs folder deleted, stopping nginx service, deleting .conf file, and starting nginx service")
        os.remove("/etc/nginx/sites-enabled/" +domain + ".conf")
        os.system(str("sudo service nginx start"))
        print("nginx .conf deleted, services restarted.")
        print("Deleting files in /etc/letsencrypt")
        os.remove("/etc/letsencrypt/renewal/"+domain+".conf")
        shutil.rmtree("/etc/letsencrypt/live/"+domain)
        # drop the database and users (in theory).
        print("dropping user and database")
        db = MySQLdb.connect(host= mysqlServer,  # your host
                    user= mysqlUser,       # username
                    passwd= mysqlRootPassword )
                            # password


        # Create a Cursor object to execute queries.
        cur = db.cursor()

        # Select data from table using SQL query.
        cur.execute("DROP DATABASE " +domain)
        cur.execute("DROP USER " +domain+"@"+"*")
        cur.execute("FLUSH PRIVILEGES")
        db.commit()
        db.close()

    print("To recap:")
    print("The MySQL username is: "), (domain)
    print("The MySQL password is: "), (mysqlpassword)
    print("The domain name is: "), (domain)
    print("The Domain Name (with www) is "), (domainLong)
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
