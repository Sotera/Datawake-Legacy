# Datawake 

The datawake is currently in alpha development.  

## What is the Datawake?

The datawake is multi-tier software system consisting of client side applications (chrome plugin), web servers (tangelo), and distributed backend platforms (kafka,storm,etc).

The datawake captures user browsing data for future analysis while also capturing important information on web pages and supplementing that information with domain specific knowledge and tools.


## Quick Start / Local Development Environemnts using Vagrant

While the datawake is designed to operate in conjunction with a cluster running kafka, storm, hbase and impla and web crawlers a local deployment is great for developemnt and integration.  For easy set up of development environemtns we use Vagrant.

1. Install [Vagrant](https://www.vagrantup.com/)
2. If you don't already have a virtualization solution install [Virtual Box](https://www.virtualbox.org/)
3. clone this repo
4. execute the 'vagrant up' command from the directory containing VagrantFile

for more infomration on what to do / how to explore the datawake see [the wiki](https://github.com/Sotera/Datawake/wiki/Quick-Start-VM)

