Datawake Deployment / Configuration
-----------------------------------


Pre-reqs
--------

1. Mysql
    a. mysql server installed and running.
    b. a database created for the datawake application
    c. a database user created with privelages on the database to be used.

2. Apache Kafka
    a. Apache Kafka setup and deployed on the cluster
    b. Note the zookeeper quorum (hostname:port,..)


3. Apache Storm
    a. python and python virtualenv installed on all storm nodes in the cluster
    b. If using the MITIE extractor the MITIE library will have to be installed on all nodes in the cluster
        (see INSTALLING MITIE below)


4.  HBase

5.  Impala and Hive

6.  Docker (to run the web server in a docker container)


Initial setup
-------------

Gather required connection information you will need.
    1. Mysql host:port
    2. Mysql database name, user name, password
    3. Zookeeper nodes (host:port,...)
    4. Kafka broker list
    5. Appache storm nimbus and worker hosts
    6. HBase host
    7. Impala hosts / port
    8. If using authenticaiton you'll need a list of valid GOOGLE client IDS
    9. List of external links to provide on domain hits.


1.  Mysql
    a. connect to the mysql instance and create your database schema using the dev-env/build_db.sql file.

2.  HBase
   a. Use hive to create the hbase tables
        1. connect to hive.
        2. If you want to use a database other than default create it with 'create database <db_name>'
        3. use the scripts in etc to create the 3 tables in hive/impala and hbase.
                a. you man change the names of the hbase tables, but make a note of the names you use for set up later.
       *4.  If you have a large domain to preload into the domains table you can do so now.
                If you do manually add a domian you'll want to add it to the mysql database as well
                INSERT INTO datawake_domains (name,description) VALUES ("","");
            If you have only small domains that can easily be added via the web UI you can wait.


3. Kafka
    a.  Create the kafka topics for the datawake.  note the names you use.
        1.  If you don't have a kafka client machine you can use docker (docker run -it --rm wurstmeister/kafka:0.8.1.1-1 /bin/bash)
        2. Add topics for the datawake visited queue and note the name you use. (deployed-datawake-visited).
           If you are using the mock crawler and not the distirbuted crawlers you'll need to create crawler queues as well.
            - To list topics:   $KAFKA_HOME/bin/kafka-topics.sh --list --zookeeper zkhost:zkport
            - To delete topics: $KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper zkhost:zkport --topic <topic_name>
            - To create topics: $KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper zkhost:zkport  --replication-factor 1 --partitions 1 --topic <topic_name>

4.  Storm
    a.  We use streamparse to write and deploy storm topolgies.
        As such you'll need a staging machine to laucnh the toplogy form that has ssh access to the the storm cluster (nimbus and supervisors)
        Set up ssh keys for your stom user from your staging machine to the storm cluster.
    b. If you are using the MITIE extractor you'll need to install the MITIE library
       and set an environment variable for each node on your storm cluster.

        1.  Save the following in a script on each storm node

        """
        #! /bin/bash

        mkdir /usr/lib/mitie \
            && cd /usr/lib/mitie \
            && git clone https://github.com/mitll/MITIE.git \
            && cd MITIE \
            && make MITIE-models \
            && cd tools/ner_stream \
            && mkdir build \
            && cd build \
            && cmake .. \
            && cmake --build . --config Release \
            && cd ../../../mitielib \
            && make

        echo "export MITIE_HOME=/usr/lib/mitie/MITIE" > /etc/profile.d/mitie.sh
        """

        2.  Run the script as sudo on each node.

        If you are not using MITIE you'll need to remove it from the topology.

     c. Edit memex-datawake-stream/config.json for your environment
        1. Set the storm user
        2. set the nimbus server
        3. set the storm supervisors
        4. set the log dir WARNING:  make sure this directory exists and the storm user can access it.
     d. Edit memex_datawake-stream/src/datawakestreams/all_settings.py
        1. set all settigns under the 'cluser' configuration
     e. submit the topology
        copy memex-datawake-stream to your staging machine
        change to the storm user
        cd memex-datawake-stream
        sparse submit -n datawake-distributed  -o "'topology.deployment=\"cluster\"'"



5. Setup the appsever for user authentication.   (https://github.com/Sotera/Datawake/wiki/User-Authentication)


6.  App Server
    a.  build the docker container
        1. cd server
        2. docker build -t datawake-appserver .
    b. edit the deployment/start_app_server.sh, add all connection information
    c. start the app server
        ./start_app_server.sh

7.  Add users.   The datawake requires that any user be added to the database with an organization.
    a. Use the deployment/user_orgs.sh script to add a user
        "./user_orgs.sh john.doe@email.com   YOURORG"





