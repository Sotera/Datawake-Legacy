#!/bin/sh
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic memex-datawake-lookahead
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic crawler-out
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic crawler-in

$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic memex-datawake-lookahead
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic crawler-in
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic crawler-out