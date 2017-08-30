#!/usr/bin/python

# Import Modules. twindb_cloudflare will be replaced with requests once I(we) figure out proper vanilla API calls.
# twindb doesn't support removing IPV6 records but requests with the native Cloudflare API does.

from tempfile import mkstemp
# import passwords and API keys to make it easier to link people to this without giving away users/passwords.
from secrets import *
from distutils.dir_util import copy_tree
from random import *
import os
import sys
import traceback
import fileinput
import string
import MySQLdb
import urllib
import shutil
import tarfile
import pwd
import grp
import socket
import time
import requests
import json
from twindb_cloudflare.twindb_cloudflare import CloudFlare, CloudFlareException


testing = False
ssl = str("/etc/nginx/ssl/")
param = str("openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048")



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

# make sure ssl folder exists
if not os.path.exists("/etc/nginx/ssl/"):
    print("ssl folder missing, creating")
    os.mkdir(ssl)
print("/etc/ngin11x/ssl found, continuing")

# Generate dhparams if they dont exist
if not os.path.exists("/etc/nginx/ssl/dhparam.pem"):
    print("dhparams missing, will cause config errors later. generating in a known location")
    os.system(param)
print("dhparam.pem found, continuing")

if len(sys.argv) > 1:
    # We have args passed
    for arg in sys.argv:
        if arg.lower() == "-testing":
            # Testing is enabled
            testing = True
            print("LetsEncrypt staging is enabled, certificates generated are invalid, run without -letest for production certificates")
            break



def main(testing = False):
    global config
    # domainShort = raw_input("What is the domain without .com/.net etc: ")
    domainShort = 'zojo2016'
    domain = str(raw_input("What is the root domain name ie domain.com: "))
    domainPeriod = str('.'+domain)
    domainLong = str('www.'+domain)
    config = "/etc/nginx/sites-enabled" +domain + ".conf"
    cf = CloudFlare(CLOUDFLARE_EMAIL, CLOUDFLARE_AUTH_KEY)
    mysqluser = domainLong
    mysqlpass = string.ascii_letters + string.punctuation.replace("\"", "").replace("'", "") + string.digits
    mysqlpassword1 = "".join(choice(mysqlpass) for x in range(randint(8, 16)))
    mysqlpassword = ('%s' % mysqlpassword1)
    nginxTest = str('sudo nginx -t >nginx.py 2>&1')
    print(domainShort)




    for arg in sys.argv:
        if arg.lower() == "-subdomain":
            subdomain = str(raw_input("What is the subdomain:"))
            fullDomain = subdomain +"." + domain
            wwwFull = "www."+subdomain + "." + domain
            toDirectory = "/var/www/" + fullDomain
            fromDirectory = "/var/www/" + fullDomain + "/wordpress/"
            os.mkdir(toDirectory)
            leDomains =  "sudo certbot certonly --test-cert --staging --agree-tos -a standalone -d '%s' -d '%s'" % (fullDomain, wwwFull)
            folder = "find '%s' -type d -exec chmod 755 {} +" % str(toDirectory)
            filePerm = "find '%s' -type f -exec chmod 644 {} +" % str(toDirectory)

        else:
            toDirectory = "/var/www/" + domain + '/'
            fromDirectory = "/var/www/" + domain + '/' + "/wordpress/"
            os.mkdir(toDirectory)
            leDomains = "sudo certbot certonly --test-cert --staging --agree-tos -a standalone -d '%s' -d '%s'" % (domain, domainLong)

            folder = "find '%s' -type d -exec chmod 755 {} +" % str(toDirectory)
            filePerm = "find '%s' -type f -exec chmod 644 {} +" % str(toDirectory)



    print("Creating MySQL Database and User")

    # create db + user


    db = MySQLdb.connect(host= mysqlServer,  # your host
                        user= mysqlUser,       # username
                        passwd= mysqlRootPassword )
                            # password


    # Create a Cursor object to execute queries.
    cur = db.cursor()

    # Select data from table using SQL query.
    cur.execute("CREATE DATABASE IF NOT EXISTS zojo2057 " )

    cur.execute("GRANT ALL PRIVILEGES ON " +domainShort + ".* TO %s@'127.0.0.1' IDENTIFIED BY %s ", (domainShort, mysqlpassword))
    cur.execute("FLUSH PRIVILEGES")

    db.commit()
    db.close()


    # Create htdocs folder



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

    cf.create_dns_record('@', domain, ipv4)
    cf.create_dns_record('www', domain, ipv4)
    cf.create_dns_record('@', domain, ipv6, record_type="AAAA")
    cf.create_dns_record('www', domain, ipv6, record_type="AAAA")

    # set correct file / folder permissions

    os.system(str(folder))
    os.system(str(filePerm))

    newData = ''
    with open('nginxconfig.conf', 'r') as f:
        for line in f:
            if line.strip().startswith('ssl_certificate_key'):
                newData += line.replace('ssl_certificate_key', 'ssl_certificate_key /etc/letsencrypt/live/'+domain+'/privkey.pem;')
            elif line.strip().startswith('ssl_certificate'):
                newData += line.replace('ssl_certificate', 'ssl_certificate /etc/letsencrypt/live/'+domain+'/fullchain.pem;')
            elif line.strip().startswith('root'):
                newData += line.replace('root', 'root /var/www/'+domain+';')
            elif line.strip().startswith('server_name'):
                newData += line.replace('server_name', 'server_name' + " " +domain + " " +domainLong  +';')
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
            cf.delete_dns_record('@' + domain, domain)
            cf.delete_dns_record('www', domain, domain)
            print("DNS records deleted, removing htdocs folder")
            shutil.rmtree(toDirectory)
            print("htdocs folder deleted, stopping nginx service, deleting .conf file, and starting nginx service")
            os.remove("/etc/nginx/sites-enabled/" +domain + ".conf")
            os.system(str("sudo service nginx start"))

            print("dropping user and database")

            db = MySQLdb.connect(host= mysqlServer,  # your host
                                        user= mysqlUser,       # username
                                        passwd= mysqlRootPassword )
                                            # password


            # Create a Cursor object to execute queries.
            cur = db.cursor()

            # Select data from table using SQL query.
            cur.execute("DROP DATABASE " + domain)

            cur.execute("DROP USER " +domain+"@"+ipv4)
            cur.execute("FLUSH PRIVILEGES")

            db.commit()
            db.close()

            print("Database and user dropped")
    # Delete nginx config and restart service



    else:
        print("Errors found in config, reverting")
        cf.delete_dns_record('@', domain)
        cf.delete_dns_record('www', domain, domain)
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
    print("The MySQL username is: "), (domainShort)
    print("The MySQL password is: "), (mysqlpassword)
    print("The MySQL database is: "), (domainShort)
    print("The domain name is: "), (domain)
    print("The Domain Name (with www) is "), (domainLong)

try:
    main(testing)
except Exception as e:
    # Do nginx stuff here
    print("Caught exception: " + repr(e))
    traceback.print_exc()
    exit(1)
exit(0)
