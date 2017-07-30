## AutoPress automated NGINX / Wordpress / Cloudflare / LetsEncrypt Installer

This is a pet project I use for a personal project that will let me setup blogs for my friends as quickly and as automated as possible. This is the 2nd Python script I've written so it's probably not the best practices (This is basically v1.5 of my first one with a little more logic, and not hardcoded for a single site.). Eventually I may make a script that will take a fresh install of Linux and fully setup NGINX and your blog automagically.



# This code is tested in V0.15 and is based off that. I haven't done much testing on this code yet but there are only minor changes.

# Requirements

The following python modules are required currently. Install with pip or easy_install:
twindb.cloudflare
urllib3
requests
MySQL-python

(I think this is it)


# CURRENT PROBLEMS:

I used twindb_cloudflare to create and delete my cloudflare records. While I can change the code to create the dns zone in the script and then add the records the code will error out until the Nameservers are updated to cloudflare's DNS servers. When I originally wrote this code I use a Zone that already existed and just needed to be added to. I'm not 100% sure how to go around this. I'll have to think about this. I want to make it as automated as possible, but you may need to add the domain to cloudflare and update your DNS settings for your domain manually. :/

# Testing Updates:

Code works up until cloudflare is supposed to work. I opened a ticket with cloudflare asking what the best course of action is. Further parts of the script will error (The letsencrypt portions) due to not being able to resolve the server to do the authorization magic.

# Planned Features:

A nice person on reddit brought up the ability to auto install Wordpress themes and plugins. This (should) be easily doable. Just copy themes into the /themes folder and plugins into the /plugins folder and pass the -withAddons flag to have them copied to the correct folders automagically. The person mentioned having problems with plugins such as Wordfence, but we'll see (I really happen to like that plugin).  
