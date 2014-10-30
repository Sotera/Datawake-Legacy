#! /bin/bash

KAFKA_HOME=/usr/local/kafka

$KAFKA_HOME/bin/zookeeper-server-start.sh -daemon $KAFKA_HOME/config/zookeeper.properties
$KAFKA_HOME/bin/kafka-server-start.sh -daemon $KAFKA_HOME/config/server.properties

$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic memex-datawake-lookahead
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic crawler-out
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper localhost:2181 --topic crawler-in

$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic memex-datawake-lookahead
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic crawler-in
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic crawler-out
#sleep 5


logfilename="streamparse_$(date +%F_%H:%M:%S,%N)"
cd /vagrant/memex-datawake-stream
rm nohup.out
nohup sparse run -n local -t 9999999 -o "'topology.deployment=\"local\"'"  >> /var/log/${logfilename}_stdout.log 2>> /var/log/${logfilename}_stderr.log & 
echo "started local topology"


sudo -H su vagrant bash -c "tangelo start"
