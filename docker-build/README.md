docker-build
==============

Dockerfile and conf files to build a Datawake docker container.  Prior to running conf files within the container must be updated to point to required services such as mysql,kafka,etc.



other / supporting  docker containers
=====

https://registry.hub.docker.com/_/mysql/



useful snippets
===============

```

# start up the app local
fig up -d


# set up the database and kafka topics
cd init_scripts
./init_system.sh

# start the local streamparse topology
cd init_scripts
./start_topology.sh


# connect to the mysql terminal
docker run -it --link  dockerbuild_mysql_1:mysql --rm mysql sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD"'


# start a datawake terminal
docker run -it --rm  --link dockerbuild_mysql_1:mysql  --link dockerbuild_kafka_1:kafka    -w /usr/local/share/tangelo/web  dockerbuild_datawake /bin/bash

```