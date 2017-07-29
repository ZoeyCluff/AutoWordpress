#!/usr/bin/python

from tempfile import mkstemp
# import passwords and API keys to make it easier to link people to this without giving away users/passwords.
from secrets import *
from distutils.dir_util import copy_tree

from random import *
from twindb_cloudflare.twindb_cloudflare import CloudFlare, CloudFlareException
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



global config


# Init testing var
testing = False

# Check through passed args for -testing
if len(sys.argv) > 1:
    # We have args passed
    for arg in sys.argv:
        if arg.lower() == "-testing":
            # Testing is enabled
            testing = True
            break

def main(testing = False):
    blognamestr = str(raw_input("What is the blog name? "))
    blogshortstr = str(raw_input("What is the short name (no spaces / symbols) "))
    bloglongstr = str('www.' +blogshortstr)
    blogurl1 = str(blogshortstr+'.beautifuldisaster.group')
    blogurl2 = str('www.'+blogshortstr+'.beautifuldisaster.group')
    mysqluser = blogshortstr
    mysqlpass = string.ascii_letters + string.punctuation.replace("\"", "").replace("'", "") + string.digits
    mysqlpassword1 = "".join(choice(mysqlpass) for x in range(randint(8, 16)))
    mysqlpassword = ('%s' % mysqlpassword1)
    fromDirectory = "/var/www/"+blogshortstr+"/wordpress"
    toDirectory = "/var/www/"+blogshortstr
    global config
    config = "/etc/nginx/sites-enabled/" +blogshortstr + ".conf"
    cf = CloudFlare(CLOUDFLARE_EMAIL, CLOUDFLARE_AUTH_KEY)
    folder = "find '%s' -type d -exec chmod 755 {} +" % str(toDirectory)
    filePerm = "find '%s' -type f -exec chmod 644 {} +" % str(toDirectory)
    leDomains = "sudo certbot certonly --test-cert --staging --agree-tos -a standalone -d '%s' -d '%s'" % (blogurl1, blogurl2)
    nginx = "/etc/nginx/sites-enabled/"+blogshortstr
    nginxTest = str('sudo nginx -t >nginx.py 2>&1')
    zone = '1b553539997e68d2aa0c938cbb72ac43'
    apikey = 'e434d062e2a896a80e25df4014bcb26b1636c'
    email = 'zoey.cluff@gmail.com'
    domain = 'beautifuldisaster.group'
    ipv6 = str(blogshortstr) + " " + str(bloglongstr)


    # create db + user


    db = MySQLdb.connect(host="mysql.beautifuldisaster.group",  # your host
                        user="root",       # username
                        passwd= mysqlRootPassword )
                            # password


    # Create a Cursor object to execute queries.
    cur = db.cursor()

    # Select data from table using SQL query.
    cur.execute("CREATE DATABASE IF NOT EXISTS " +blogshortstr)

    cur.execute("GRANT ALL PRIVILEGES ON `%s`.* TO %s@'45.76.26.71' IDENTIFIED BY %s ", (blogshortstr, mysqluser, mysqlpassword))
    cur.execute("FLUSH PRIVILEGES")

    db.commit()
    db.close()

    # create folder


    os.mkdir("/var/www/"+blogshortstr)




    # download wordpress and extract

    linkToFile = "https://wordpress.org/latest.tar.gz"
    localDestination = "/var/www/"+blogshortstr+"/" + "wordpress.tar.gz"
    resultFilePath, responseHeaders = urllib.urlretrieve(linkToFile, localDestination)

    tar = tarfile.open(localDestination)
    tar.extractall("/var/www/"+blogshortstr)
    tar.close

    # copy wordpress folder contents to correct directory and remove the old folder


    copy_tree(fromDirectory, toDirectory)
    shutil.rmtree(fromDirectory)

    # set correct permissions
    os.chown(toDirectory, 33, 33)
    # add zones to CloudFlare

    # Don't catch exceptions here - they're caught in the try/except
    # around the main() func call
    # try:
    cf.create_dns_record(blogshortstr, 'beautifuldisaster.group', '45.76.26.71')
    cf.create_dns_record(bloglongstr, 'beautifuldisaster.group', '45.76.26.71')
    # while you can create ipv6 records with this, you cannot currently remove them using the API and I CBA to delete these by hand.
    cf.create_dns_record(blogshortstr, 'beautifuldisaster.group', '2001:19f0:5c01:1de:5400:00ff:fe6f:ec58', record_type="AAAA")
    cf.create_dns_record(bloglongstr, 'beautifuldisaster.group', '2001:19f0:5c01:1de:5400:00ff:fe6f:ec58', record_type="AAAA")
    # except CloudFlareException as err:
    #     print(err)
    #     return False

    # set correct file / folder permissions.

    os.system(str(folder))
    os.system(str(filePerm))

    # edit the config


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


    with open("/etc/nginx/sites-enabled/" +blogshortstr + ".conf", 'w') as f:
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
            # maybe someday this will delete the IPV6 records.
            # cf.delete_dns_record(blogshortstr + '.beautifuldisaster.group', 'beautifuldisaster.group', type='AAAA')
            # cf.delete_dns_record(bloglongstr + '.beautifuldisaster.group', 'beautifuldisaster.group')
            print("DNS records deleted, removing htdocs folder")
            shutil.rmtree(toDirectory)
            print("htdocs folder deleted, stopping nginx service, deleting .conf file, and starting nginx service")
            os.remove("/etc/nginx/sites-enabled/" +blogshortstr + ".conf")
            os.system(str("sudo service nginx start"))
            print("nginx .conf deleted, services restarted.")
            print("Deleting files in /etc/letsencrypt")
            os.remove("/etc/letsencrypt/renewal/"+blogurl1+".conf")
            shutil.rmtree("/etc/letsencrypt/live/"+blogurl1)
            # drop the database and users (in theory).
            print("dropping user and database")
            print(blogshortstr)
            print(mysqluser)
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
        cf.delete_dns_record(blogshortstr + '.beautifuldisaster.group', 'beautifuldisaster.group')
        cf.delete_dns_record(bloglongstr + '.beautifuldisaster.group', 'beautifuldisaster.group')
        # maybe someday this will delete the IPV6 records.
        # cf.delete_dns_record(blogshortstr + '.beautifuldisaster.group', 'beautifuldisaster.group')
        # cf.delete_dns_record(bloglongstr + '.beautifuldisaster.group', 'beautifuldisaster.group')
        print("DNS records deleted, removing htdocs folder")
        shutil.rmtree(toDirectory)
        print("htdocs folder deleted, stopping nginx service, deleting .conf file, and starting nginx service")
        os.remove("/etc/nginx/sites-enabled/" +blogshortstr + ".conf")
        os.system(str("sudo service nginx start"))
        print("nginx .conf deleted, services restarted.")
        print("Deleting files in /etc/letsencrypt")
        os.remove("/etc/letsencrypt/renewal/"+blogurl1+".conf")
        shutil.rmtree("/etc/letsencrypt/live/"+blogurl1)
        # drop the database and users (in theory).
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

    print("To recap:")
    print("The MySQL username is: "), (mysqluser)
    print("The MySQL password is: "), (mysqlpassword)
    print("The domain name is: "), (blogurl1)
    print("The Domain Name (with www) is "), (blogurl2)
    print("LetsEncrypt --staging is enabled, certificates generated are invalid. remove --test-cert and --staging for production.")






    # End of main()


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
