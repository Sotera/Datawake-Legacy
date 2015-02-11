#!/usr/bin/perl

print "\nHello, Installing Datawave!\n\n";

#Get use to enter 'sudo' password
`sudo ls`;

#Turn on SSH (This should only apply to Bitnami stacks)

#Use scalar and interpolating back-tick operator to avoid forward slash/regex issues
print "Creating new SSH keys ...\n"; 
$key_filename = '/etc/ssh/ssh_host_rsa_key';
print `sudo echo -e 'y\n'|sudo ssh-keygen -q -t rsa -N "" -f $key_filename`;

$key_filename = '/etc/ssh/ssh_host_dsa_key';
print `sudo echo -e 'y\n'|sudo ssh-keygen -q -t dsa -N "" -f $key_filename`;

print `sudo cp /etc/init/ssh.conf.back /etc/init/ssh.conf`;
print "Restarting SSH daemon ...\n";
print `sudo start ssh`;


#Shutdown MEAN stack and set to no auto-restart (This should only apply to Bitnami stacks)
print "Shutting down MEAN stack and disabling MEAN stack on startup";
print `sudo /opt/bitnami/ctlscript.sh stop`;
print `sudo update-rc.d bitnami disable`;

print "Updating aptitude caches ...\n";
print `sudo apt-get update`;

print "Getting aptitude HTTPS support ...\n";
print `sudo apt-get -y install apt-transport-https`;

print "Getting the latest Docker packages ...\n";
print `curl -ssl https://get.docker.com/ubuntu/ |sudo sh`;
print `source /etc/bash_completion.d/docker`;

print "Updating aptitude ...\n";
print `sudo apt-get update`;

print "Installing apparmor ...\n";
print `sudo apt-get -y install apparmor apparmor-utils`;

print "Installing PIP ...\n";
print `sudo apt-get -y install python-pip`;
print `mkdir ~/src`;
print `cd ~/src`;

print "Cloning Datawake.git ...\n";
print `git clone https://github.com/Sotera/Datawake.git`;

print "Writing fig.yml to Datawake/dev-env ...\n";
print `cd ~`;

@lines = <DATA>;
open(FILE, '> src/Datawake/dev-env/fig.yml');
foreach(@lines){
    print FILE "$_";
}
close(FILE);

print "Starting Docker ...\n";
print `sudo service docker start`;

__END__
mysql:
  image: mysql
  environment:
    MYSQL_ROOT_PASSWORD: root
  ports:
    - "3336:3306"

zookeeper:
  image: jplock/zookeeper:3.4.6
  ports:
    - "2181"

kafka:
  image: wurstmeister/kafka:0.8.1.1-1
  ports:
    - "9092:9092"
  links:
    - zookeeper:zk
  environment:
    KAFKA_ADVERTISED_HOST_NAME: localhost
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock

dwstream:
  build: ../memex-datawake-stream
  links:
    - mysql:mysql
    - kafka:kafka
    - zookeeper:zk
  volumes:
    - ~/src/Datawake/memex-datawake-stream:/memex-datawake-stream

datawake:
  build: ../server
  links:
    - mysql:mysql
    - kafka:kafka
  ports:
    - "80:80"
  environment:
    DW_DB: memex_sotera
    DW_DB_USER: root
    DW_DB_PASSWORD: root
    DW_DB_HOST: localhost
    DW_DB_PORT: 3336
    DW_KAFKA_CONN_POOL: localhost:9092
    DW_KAFKA_PUB_TOPIC: memex-datawake-visited
    #DW_GOOGLE_CLIENT_IDS:
    DW_MOCK_AUTH:  1
    DW_MOCK_FORENSIC_AUTH: 1
    DW_CONN_TYPE: mysql
    #DW_IMPALA_HOSTS:
    #DW_HBASE_HOST:
    #DW_EXTERNAL_LINK_NAMES:
    #DW_EXTERNAL_LINK_VALUES:
  volumes:
    - ~/src/Datawake/server/datawake:/usr/local/share/tangelo/web/datawake
    - ~/src/Datawake/server/domain:/usr/local/share/tangelo/web/domain
    - ~/src/Datawake/server/forensic:/usr/local/share/tangelo/web/forensic
    - ~/src/Datawake/memex-datawake-stream:/memex-datawake-stream

