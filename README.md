## AutoPress automated NGINX / Wordpress / Cloudflare / LetsEncrypt Installer

This is a pet project I use for a personal project that will let me setup blogs for my friends as quickly and as automated as possible. This is the 2nd Python script I've written so it's probably not the best practices (This is basically v1.5 of my first one with a little more logic, and not hardcoded for a single site.). Eventually I may make a script that will take a fresh install of Linux and fully setup NGINX and your blog automagically.



# This code is tested in V0.15 and is based off that. I haven't done much testing on this code yet but there are only minor changes.

# Requirements



The following system packages are currently required.

* Nginx
* php7.0
* php7.0-mysql
* php7.0-fpm
* php7.0-cli
* php7.0-gd
* php7.0-json
* php7.0-gd
* php7.0-mbstring
* php7.0-mcrypt
* php7.0-readline
* php7.0-xml
* php7.0-zip
* python-pip
* Certbot*

* I use certbot from [Their PPA](https://certbot.eff.org/all-instructions/#ubuntu-17-04-zesty-nginx). It's untested with the version in Ubuntu 17.04's default repository.

for ubuntu a one line to install everything is:

```
sudo apt-get install nginx php7.0 php7.0-mysql php7.0-fpm php7.0-cli php7.0-gd php7.0-json php7.0-mbstring php7.0-mcrypt php7.0-readline php7.0-xml php7.0-zip python-pip mysql-server mysql-client libmysqlclient-dev certbot
```

(this may take awhile, it's about 450mb of packages. Remember the MySQL root password you entered for later. I don't know if all the php7.0-things are required, they're just installed on my production server running Wordpress.)

The following python modules are required currently. Install with pip or easy_install:

* twindb.cloudflare
* urllib3
* requests (coming soon....)
* MySQL-python

(I think this is it for python modules)
# CURRENT PROBLEMS:
