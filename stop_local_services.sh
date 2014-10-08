#! /bin/bash

KAFKA_HOME=/usr/local/kafka

$KAFKA_HOME/bin/zookeeper-server-stop.sh
$KAFKA_HOME/bin/kafka-server-stop.sh

$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic memex-datawake-lookahead

sleep 5

cd /vagrant/mock_backend
rm visiting.out lookahead.out &> /dev/null

sudo -H su vagrant bash -c "tangelo stop"
