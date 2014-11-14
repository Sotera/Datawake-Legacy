#!/bin/sh

# This file executes inside of a docker container to create topics and execute a topology for local dev environments
# not intended for production deployments.


$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic crawler-out
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic crawler-in
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic trail-search
$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic update-url
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic memex-datawake-visited
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic crawler-in
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic crawler-out
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic trail-search
$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic update-url

sparse run -n datawake-mockcrawler -t 9999999 -o "'topology.deployment=\"local-docker\"'"
