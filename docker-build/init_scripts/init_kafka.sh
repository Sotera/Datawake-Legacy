#!/bin/sh

docker run  --link dockerbuild_zookeeper_1:zk   --rm  wurstmeister/kafka:latest /bin/sh -c '$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic memex-datawake-visited'
docker run  --link dockerbuild_zookeeper_1:zk   --rm  wurstmeister/kafka:latest /bin/sh -c '$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic crawler-out'
docker run  --link dockerbuild_zookeeper_1:zk   --rm  wurstmeister/kafka:latest /bin/sh -c '$KAFKA_HOME/bin/kafka-run-class.sh kafka.admin.DeleteTopicCommand --zookeeper $ZK_PORT_2888_TCP_ADDR --topic crawler-in'
docker run  --link dockerbuild_zookeeper_1:zk   --rm  wurstmeister/kafka:latest /bin/sh -c '$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic memex-datawake-visited'
docker run  --link dockerbuild_zookeeper_1:zk   --rm  wurstmeister/kafka:latest /bin/sh -c '$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic crawler-in'
docker run  --link dockerbuild_zookeeper_1:zk   --rm  wurstmeister/kafka:latest /bin/sh -c '$KAFKA_HOME/bin/kafka-topics.sh --create --zookeeper $ZK_PORT_2888_TCP_ADDR --replication-factor 1 --partitions 1 --topic crawler-out'



