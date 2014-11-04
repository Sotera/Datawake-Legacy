#! /bin/bash

echo "creating database tables"
docker run  -it --link dockerbuild_mysql_1:mysql --rm mysql sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD" ' < build_db.sql

echo "creating kafka topics"
docker run -it  --link dockerbuild_zookeeper_1:zk  --rm -v `pwd`:/scripts wurstmeister/kafka:latest /scripts/init_kafka.sh
