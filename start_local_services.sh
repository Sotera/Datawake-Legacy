#! /bin/bash

KAFKA_HOME=/usr/local/kafka

$KAFKA_HOME/bin/zookeeper-server-start.sh -daemon $KAFKA_HOME/config/zookeeper.properties
$KAFKA_HOME/bin/kafka-server-start.sh -daemon $KAFKA_HOME/config/server.properties

$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic memex-datawake-lookahead

$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic memex-datawake-lookahead
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic memex-datawake-visited

sleep 5

cd /vagrant/mock_backend
rm visiting.out lookahead.out &> /dev/null
nohup python kafka_visiting_consumer.py > visiting.out & \
nohup python kafka_lookahead_consumer.py > lookahead.out & \

sudo -H su vagrant bash -c "tangelo start"
