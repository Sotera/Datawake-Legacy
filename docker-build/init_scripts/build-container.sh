#! /bin/bash

# install pip and python dev tools
echo "install pip and python dev tools"
apt-get update
apt-get upgrade
apt-get install -y python-software-properties
apt-get install -y software-properties-common
apt-get -y install python-pip
apt-get -y install python-dev


# install dependencies required to build tangelo

# needed until sessions are supported in offical tangelo release
echo "install dependencies required to build tangelo"
add-apt-repository -y ppa:chris-lea/node.js
apt-get install -y nodejs
apt-get install -y npm
ln -s /usr/bin/nodejs /usr/bin/node
apt-get -y install git
apt-get -y install make
apt-get -y install cmake



# install tangelo from sessions branch

echo "build/install tangelo"
git clone https://github.com/Kitware/tangelo.git
cd tangelo
git checkout sessions
cd ..
mkdir tangelo-build
cd tangelo-build
cmake -DNPM_EXECUTABLE=/usr/bin/npm  -DBUILD_DOCUMENTATION=OFF -DBUILD_TESTING=OFF ../tangelo
make
pip install sdist/tangelo-0.7.tar.gz
cd ..



# misc python libs

echo "install misc python libs"
pip install happybase
pip install httplib2


# install wget

echo "install wget"
apt-get install -y wget


# install mysql client

echo "install mysql client"
wget http://dev.mysql.com/get/Downloads/Connector-Python/mysql-connector-python-1.2.3.tar.gz
tar xf mysql-connector-python-1.2.3.tar.gz
cd mysql-connector-python-1.2.3/
python setup.py install &> /dev/null
cd ..



# install igraph

echo "install igraph"
add-apt-repository -y ppa:igraph/ppa
apt-get update
apt-get install -y python-igraph



# install kafka python client

echo "install kafka python client"
wget https://github.com/mumrah/kafka-python/releases/download/v0.9.2/kafka-python-0.9.2.tar.gz
tar -xzvf kafka-python-0.9.2.tar.gz
cd kafka-python-0.9.2/
python setup.py install
cd ..


# install impyla

echo "install impyla"
git clone https://github.com/cloudera/impyla.git &> /dev/null
cd impyla
python setup.py install
cd ..



# install pyodc

echo "install odbc"
apt-get -y install aptitude
aptitude -y install g++
apt-get -y install unixodbc-dev
pip install --allow-external pyodbc --allow-unverified pyodbc pyodbc



# install java

apt-get -y install default-jdk


# install clojure and lein

echo "installing clojure and lein"
apt-get -y install clojure &> /dev/null
wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein &> /dev/null
chmod a+x lein
mv lein /usr/bin
/usr/bin/lein &> /dev/null



# install streamparse (from parse.ly)

echo "installing streamparse"
pip install streamparse &> /dev/null



echo "install MITIE"
cd /
git clone https://github.com/mitll/MITIE.git
cd MITIE
make MITIE-models
cd tools/ner_stream
mkdir build
cd build
cmake ..
cmake --build . --config Release
cd ../../../mitielib
make


echo "installing Beautiful Soup"
apt-get install -y python-bs4



echo "software install complete"



