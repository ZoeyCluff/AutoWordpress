#!/usr/bin/python
from __future__ import print_function
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
import zipfile
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
import MySQLdb
import pathlib

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
    print("nginxconfig.conf missing, please make sure all files have been downloaded.")
    exit(1)
print("nginxconfig.conf exists, continuing")

# make sure ssl folder exists
if not os.path.exists("/etc/nginx/ssl/"):
    print("ssl folder missing, creating")
    os.mkdir(ssl)
print("/etc/nginx/ssl/ found, continuing")

# Generate dhparams if they dont exist
if not os.path.exists("/etc/nginx/ssl/dhparam.pem"):
    print("dhparams missing, will cause config errors later. generating in a known location")
    os.system(param)
print("dhparam.pem found, continuing")

# Make sure wp-config-sample.php exists

if not os.path.exists("wp-config-sample.php"):
    print("wp-config-sample.php is missing. Make sure all files have been downloaded.")
    exit(1)
print("WP Config found, continuing")

if len(sys.argv) > 1:
    # We have args passed
    for arg in sys.argv:
        if arg.lower() == "-testing":
            # Testing is enabled
            testing = True
            break



def main(testing = False):
    global config
    domainShort = raw_input("What is the domain without .com/.net etc: ")
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
    pluginsDirectory = "/var/www/" + domain + '/' + "/wordpress/wp-content/plugins"
    os.remove("nginx.py")





    for arg in sys.argv:
        if arg.lower() == "-subdomain":
            subdomain = str(raw_input("What is the subdomain:"))
            fullDomain = subdomain +"." + domain
            wwwFull = "www."+subdomain + "." + domain
            toDirectory = "/var/www/" + fullDomain
            fromDirectory = "/var/www/" + fullDomain + "/wordpress/"
            os.mkdir(toDirectory)
            leDomains =  "sudo certbot certonly  --agree-tos -a standalone -d '%s' -d '%s'" % (fullDomain, wwwFull)
            folder = "find '%s' -type d -exec chmod 755 {} +" % str(toDirectory)
            filePerm = "find '%s' -type f -exec chmod 644 {} +" % str(toDirectory)

        else:
            toDirectory = "/var/www/" + domain + '/'
            fromDirectory = "/var/www/" + domain + '/' + "/wordpress/"

            os.mkdir(toDirectory)
            leDomains = "sudo certbot certonly --agree-tos -a standalone -d '%s' -d '%s'" % (domain, domainLong)
            wpConfig = "/var/www/" + domain + '/' + 'wp-config.php'
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
    cur.execute("CREATE DATABASE IF NOT EXISTS " + domainShort )

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


    # Add plugins and Themes



    # Create CF zones

    cf.create_dns_record('@', domain, ipv4)
    cf.create_dns_record('www', domain, ipv4)
    cf.create_dns_record('@', domain, ipv6, record_type="AAAA")
    cf.create_dns_record('www', domain, ipv6, record_type="AAAA")





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


    # Populate wp-config.php

    newData = ''
    salt = urllib.urlopen('https://api.wordpress.org/secret-key/1.1/salt/')
    content = salt.read()
    configDir = "/var/www/"+domain+"/"+"wp-config.php"
    print("/var/www/" +domain +"/"+ "wp-config.php")
    with open('wp-config-sample.php', 'r') as f:
        for line in f:
            if "define('DB_NAME', 'database_name_here');" in line:
                newData += line.replace("define('DB_NAME', 'database_name_here');", "define('DB_NAME', '{}');".format(domainShort))
            elif "define('DB_USER', 'username_here');" in line:
                newData += line.replace("define('DB_USER', 'username_here');", "define('DB_USER', '{}');".format(domainShort))
            elif "define('DB_PASSWORD', 'password_here');" in line:
                newData += line.replace("define('DB_PASSWORD', 'password_here');", "define('DB_PASSWORD', '{}');".format(mysqlpassword))
            elif "define('DB_HOST', 'localhost');" in line:
                newData += line.replace("define('DB_HOST', 'localhost');", "define('DB_HOST', '{}');".format(mysqlServer))
            elif "salts" in line:
                newData += line.replace("salts", '{}').format(content)
            else:
                newData += line


        with open(configDir, "w") as f:
            f.write(newData)


    # copy plugins
    os.chdir('./plugins')
    extension = ".zip"
    for files in os.walk("plugins"):
        for item in os.listdir("plugins"):
            if item.endswith(extension):
                file_name = os.path.abspath(item)
                zip_ref = zipfile.ZipFile(file_name)
                zip_ref.extractall(pluginsDirectory)
                zip_ref.close()


    os.system(str(folder))
    os.system(str(filePerm))
    os.system(str("sudo systemctl stop nginx"))
    os.system(str(leDomains))
    os.system(nginxTest)
    os.chown(toDirectory, 33, 33)
    # check nginx config before starting nginx again, else reverting
    if 'ok' in open(str('nginx.py')).read():
        print("Config tests Good")
        print("To recap:")
        print("The MySQL username is: " + domainShort)
        print("The MySQL password is: " + mysqlpassword)
        print("The MySQL database is: " + domainShort)
        print("The domain name is: " + domain)
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
            cur.execute("DROP DATABASE " + domainShort)

            cur.execute("DROP USER " +domainShort+"@""127.0.0.1")
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
        cur.execute("DROP DATABASE " +domainShort)
        cur.execute("DROP USER " +domainShort+"@"+"127.0.0.1")
        cur.execute("FLUSH PRIVILEGES")
        db.commit()
        db.close()




try:
    main(testing)
except Exception as e:
    # Do nginx stuff here
    print("Caught exception: " + repr(e))
    traceback.print_exc()
    exit(1)
exit(0)
