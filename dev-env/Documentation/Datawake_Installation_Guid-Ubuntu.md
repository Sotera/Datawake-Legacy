# Datawake on Ubuntu
##Bitnami meanstack 2.6.7 (Ubuntu 14.04)
- user/pwd: bitnami/bitnami
- make sure you have an IPv4 (not just IPv6) Address for use later 
- know your ipaddress 


1. Download and install VMWare workstation (10) if you don't have it
2. Download the Bitnami meanstack 2.6.7 (Ubuntu 14.04) VM image
3. Start the image in VMWare.
4. Enable SSH

  - sudo cp /etc/init/ssh.conf.back /etc/init/ssh.conf
  - sudo service ssh start
5. Get your ip Address
  - ifconfig

5. This stack already has a webserver running that conflicts with our Datawake port 80, stop the default bitnami stack to bypass this
  - sudo /opt/bitnami/ctlscript.sh stop
6. Update apt-get if necessary
  - sudo apt-get update
7. Install docker (https://docs.docker.com/installation/ubuntulinux/)	
  - sudo apt-get install docker.io
8. (Optional) To enable tab-completion of Docker commands in BASH, either restart BASH or:
  - source /etc/bash_completion.d/docker.io
9. Install apparmor (needed by docker.io to run properly on Ubuntu)	
  - sudo apt-get install apparmor apparmor-utils -y
10. Install python pip
  - sudo apt-get install python-pip -y
11. Create a source folder for the project
  - mkdir src
  - cd ~/src
12. Pull down the latest code
  - git clone https://github.com/Sotera/Datawake.git
13. change to Datawake/dev-env folder
  - cd Datawake/dev-env
14. Create your fig.yml (configuration file) from the template
  - cp fig.yml.template fig.yml
15. Edit your fig.yml for your docker host ipaddress and for your volumes, on linux it's just the ip address for your machine or ‘localhost’ should work.
  - vi fig.yml
  - change all instances of your ip 
  - change the volumes to ~/src/Datawake....	
11. Start docker
  - sudo service docker.io start
12. Check to make sure docker is running
  - sudo docker ps
  - --if docker failed, check to see if it still has a docker.pid in /var/run
  - cat /var/run/docker.pid 
    - (if so, delete it)
	sudo rm /var/run/docker.pid
13. Install fig   
  - sudo pip install fig
14. Setup your  mysql container in docker
  - sudo fig up –d mysql
15. Setup your mysql database and test user
  - sudo ./init_db.sh
16. Start up docker and all it's containers (uses settings in fig.yml that you created)
  - sudo fig up –d
18.	Now you have a local dev instance of the datawake running in docker containers on your machine
  - visit http://your_vm_ip_address/domain/loader    
  - For the domain name fill in “memex.program”,  select the default domain file from your local computer's Datawake/etc directory and click 'Submit'. You now have a default domain.