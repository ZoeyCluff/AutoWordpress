## AutoPress automated NGINX / Wordpress / Cloudflare / LetsEncrypt Installer

This is a pet project I use for a personal project that will let me setup blogs for my friends as quickly and as automated as possible. This is the 2nd Python script I've written so it's probably not the best practices (This is basically v1.5 of my first one with a little more logic, and not hardcoded for a single site.). Eventually I may make a script that will take a fresh install of Linux and fully setup NGINX and your blog automagically.





# Requirements

* A Domain name (duh)
* A Cloudflare account and API key (free)
* Add your domain to Cloudflare, but don't create any records (MX records for email are fine, just no A or AAAA records).
* Point your domain's DNS servers to Cloudflare
* This was only tested on Ubuntu 17.04 with all updates.
* A MySQL Server. if you use the one line ubuntu apt-get install, it installs a mysql server in the process.

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
sudo apt-get install nginx php7.0 php7.0-mysql php7.0-fpm php7.0-cli php7.0-gd php7.0-json php7.0-mbstring php7.0-mcrypt php7.0-readline php7.0-xml php7.0-zip python-pip mysql-server git mysql-client libmysqlclient-dev certbot
```

(this may take awhile, it's about 450mb of packages. Remember the MySQL root password you entered for later. I don't know if all the php7.0-things are required, they're just installed on my production server running Wordpress.)

The following python modules are required currently. Install with pip or easy_install:

* twindb.cloudflare
* urllib3
* requests (coming soon....)
* MySQL-python

(I think this is it for python modules)


# Downloading and Configuring

* clone the git repository to your freshly spun up VPS / VM

```
git clone https://github.com/ZoeyCluff/AutoWordpress.git
```

* CD into the directory and rename secrets.py.default to secrets.py.
* Replace the placeholders with actual values. If  you use the mysql server installed from the above apt-get install command, for mysqlServer enter '127.0.0.1' and the user 'root'. for ipv4 enter the ipv4 address issued by your provider, same with IPV6. I'll make IPV6 optional in a later update, but seeing that over 60% of the internet supports it, it's good to have. Also you need to get your ["Global API Key"](https://www.cloudflare.com/a/profile) from Cloudflare and enter it in CLOUDFLARE_AUTH_KEY. Also enter your cloudflare e-mail address. All values after the = need to be in single quotes ('').


For the current version simply run:

```
python autopress.py
```

and follow the prompts. In future versions there will be flags you can add for different features. If this is the first time you've run this script it will take several minutes to generate DH parameters. This only occurs once.

NOTE: If you've run this script before using the same domain name, it will error out on the Cloudflare portions because it's trying to add records that already exist. delete the records from Cloudflare and try again. The script currently isn't very good at handling errors correctly, that's the next thing I'm working on.

Eventually you will see "Enter email address (used for urgent renewal and security notices) (Enter 'c' to
cancel):" Enter your e-mail. This is for LetsEncrypt (SSL Certificate for HTTPS) to send you renewal e-mails for when you need to renew your certificate (every 90 days).

If everything is successful, you will eventually see:

IMPORTANT NOTES:
 - Congratulations! Your certificate and chain have been saved at: *Directory*

 As well as "Config tests Good". Take note of the information provided under "To Recap:" As these are your database username and passwords.

If you browse to your domain, you should be shown "Welcome" with a few fields asking for Site Title, Username, password, and e-mail. Enter these details and Congratulations, you have a fully functioning Wordpress install!  

## CURRENT PROBLEMS:

* The script does not handle errors well at all. V0.1 of this had code that would detect problems and cleanup after itself (remove DNS zones, database, user, and all the files it creates). It's broken in V1.0 and I need to work on that. You will manually have to cleanup everything it's done before the script will run correctly.

* to cleanup:

* rm -rf /var/www/(yourdomain)
* rm /etc/nginx/sites-enabled/domain.conf
* Connect to your mysql server (mysql -u root -p) and drop database and drop user.
* Delete Cloudflare records (All the A and AAAA records)

* The testing code only somewhat works. When I wrote the testing code the generation of the wp-config.php file didn't exist and I considered the run a success if no errors were reported. Eventually I started checking that I got the Wordpress install screen but never ran through it which hid a bug for months with the SQL code that was difficult to tackle. I'm looking into ways to do a more complete testing method that tests everything rather than assume it worked if there's no errors.

## Planned Features:

* Reverting when errors are encountered instead of forcing you to clean up after the script before it'll run without errors again.


* Automagically install Wordpress Themes and plugins you drop into the respective folders. I know for a fact at least one plugin will not work like this (WordFence), there will probably be more.

* Be able to toggle if you enable IPV6 in Cloudflare

* Subdomain support. either as subdomain.domain.com or domain.com/site.

* Clean up leftovers from V0.1 that aren't being used. I know for a fact a large portion of imports are unused.


## Why?

I know there's things like [EasyEngine](https://easyengine.io/) or even [wp-cli](http://wp-cli.org/) out there that do this better, so why did I make this? EasyEngine caused problems on one of my sites and it was a complete and utter nightmare to clean up after. It was easier to nuke the server and start over than to try and undo all the random config changes it does. I never used wp-cli so I can't speak of it. This is as vanilla of a setup as humanly possible. I basically took everything I did to manually setup a blog for a friend, and found how to script it. Everything can be edited without causing random problems (looking at you EasyEngine), you can run more than one site per server (again looking at you EasyEngine), etc.

 Mostly I wanted to learn Python, and I've tried learning things on sites like Udemy, learnpythonthehardway, FreeCodeCamp, and none of them were as helpful as coming up with an idea and coding it. I've spent 100+ hours watching tutorials and following along, and I've learned way more just trying to do it myself (with ample help from friends and Google...(And StackOverflow)). This was originally going to be used to create sites for my friends to use, and I had gotten really sick of doing all this manually. In my (inexperienced) head, I figured I could have done this completed in 50 or so lines. Well, several months, hundreds of hours of trial and error, filling up my friend's beer fridge at least once in exchange for code help, and 6x the amount of code I expected, but I actually "finished" what I had originally set out to do.

 I'm going to continue working on this in my free time, adding new features that are either suggested, or I think would be cool. While it was frustrating sometimes, it makes me feel good that I learned something from scratch (The only python I had ever written before I wrote the first line of this project was print("Hello World!"). Now there's 325 lines that (In my opinion) do pretty cool things.)
