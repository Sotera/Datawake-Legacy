#!/usr/bin/env bash

DBPASSWD=root
echo "export PYTHONPATH=$PYTHONPATH:/vagrant/" >> /etc/environment
source /etc/environment

apt-get update

# install node and npm, required for tangelo build

echo "installing node / npm"
apt-get install -y python-software-properties &> /dev/null
apt-add-repository -y ppa:chris-lea/node.js  &> /dev/null
apt-get update &> /dev/null
apt-get install -y nodejs  &> /dev/null



# install git

echo "installing git"
apt-get -y install git &> /dev/null



# install make and cmake

echo "installing make and cmake"
apt-get -y install make &> /dev/null
apt-get -y install cmake &> /dev/null



# install pip for various python packages

echo "installing pip and python-dev"
apt-get -y install python-pip &> /dev/null
apt-get -y install python-dev &> /dev/null


# install happybase for hbase connections
pip install happybase &> /dev/null

# install httplib2
echo "installing httplib2"
pip install httplib2 &> /dev/null


# install tangelo from sessions branch

echo "installing tangelo from sessions branch"
git clone https://github.com/Kitware/tangelo.git &> /dev/null
cd tangelo
git checkout sessions
cd ..
mkdir tangelo-build
cd tangelo-build
cmake -DNPM_EXECUTABLE=/usr/bin/npm  -DBUILD_DOCUMENTATION=OFF -DBUILD_TESTING=OFF ../tangelo  &> /dev/null
make &> /dev/null
pip install sdist/tangelo-0.7.tar.gz
cd ..


# install clojure and lein

apt-get -y install clojure &> /dev/null
wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein &> /dev/null
chmod a+x lein
mv lein /usr/bin
/usr/bin/lein &> /dev/null



# install streamparse (from parse.ly)

echo "installing streamparse"
pip install streamparse &> /dev/null 



# install kafka

wget http://mirror.nexcess.net/apache/kafka/0.8.1.1/kafka_2.9.2-0.8.1.1.tgz &> /dev/null
tar -xzf kafka_2.9.2-0.8.1.1.tgz 
mv kafka_2.9.2-0.8.1.1 /usr/local/kafka



# install mysql

echo "installing mysql"
echo "mysql-server mysql-server/root_password password $DBPASSWD" | debconf-set-selections
echo "mysql-server mysql-server/root_password_again password $DBPASSWD" | debconf-set-selections
apt-get -y install mysql-server > /dev/null 2>&1
echo "CREATE DATABASE memex_sotera" | mysql -uroot -p$DBPASSWD



# install mysql python client

echo "install mysql python connector"
wget http://dev.mysql.com/get/Downloads/Connector-Python/mysql-connector-python-1.2.3.tar.gz &> /dev/null
tar xf mysql-connector-python-1.2.3.tar.gz
cd mysql-connector-python-1.2.3/
python setup.py install &> /dev/null
cd ..



# install igraph

echo "installing igraph"
add-apt-repository -y ppa:igraph/ppa &> /dev/null
apt-get update
apt-get install -y python-igraph &> /dev/null




# install kafka python client

echo "installing kafka-python"
wget https://github.com/mumrah/kafka-python/releases/download/v0.9.2/kafka-python-0.9.2.tar.gz &> /dev/null
tar -xzvf kafka-python-0.9.2.tar.gz
cd kafka-python-0.9.2/
python setup.py install &> /dev/null
cd ..



# install impyla

echo "installing impyla"
git clone https://github.com/cloudera/impyla.git &> /dev/null
cd impyla
python setup.py install &> /dev/null
cd ..


# install pyodc
aptitude -y install g++ &> /dev/null
apt-get -y install unixodbc-dev &> /dev/null
pip install pyodbc &> /dev/null

# make sym links to tangelo web directory

echo "linking tangelo web server"
ln -s /vagrant/datawake/ /usr/local/share/tangelo/web/
ln -s /vagrant/forensic/ /usr/local/share/tangelo/web/
ln -s /vagrant/domain/ /usr/local/share/tangelo/web/
ln -s /vagrant/version/ /usr/local/share/tangelo/web/

echo "installing datawake tools and setting up empty database"
cd /vagrant/datawake/conf/
cp datawakeconfig.py.template datawakeconfig.py
cd /vagrant/datawake/util/db/
python datawake_mysql.py create-db
cd /vagrant/datawake/util/loader
python domain.py memex_program "emails asscoiated with the memex program" ../../../etc/default_domain.csv
cd ~

# start kafka and create topics

#echo "starting kafka and creating topics"
#/vagrant/etc/kafka_startup.sh start
#sleep 5
#/usr/local/kafka/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic memex-datawake-lookahead
#/usr/local/kafka/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic memex-datawake-visited 



# start local consumers

#echo "starting local python consumers"
#cd /vagrant/mock_backend
#rm visiting.out lookahead.out &> /dev/null
#nohup python kafka_visiting_consumer.py > visiting.out &
#nohup python kafka_lookahead_consumer.py > lookahead.out &
#cd ~

# start tangelo
#echo "starting tangelo"
#sudo -H su vagrant bash -c "tangelo start"

echo "running local services start up script"
#sudo -H su vagrant bash -c "/vagrant/start_local_services.sh"





