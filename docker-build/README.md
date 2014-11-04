docker-build
==============

Dockerfile and conf files to build a Datawake docker container.  Prior to running conf files within the container must be updated to point to required services such as mysql,kafka,etc.



other / supporting  docker containers
=====

https://registry.hub.docker.com/_/mysql/


```

# pull the mysql container
docker pull mysql

# start a mysql docker instance
docker run --name datawake-mysql -e MYSQL_ROOT_PASSWORD=root -d mysql

# connect to the instance via mysql terminal
docker run -it --link datawake-mysql:mysql --rm mysql sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD"'

# run the build_db.sql script
docker run  -it --link datawake-mysql:mysql --rm mysql sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD" ' < build_db.sql


# link the datawake web app to the mysql container
docker run --name datawake-web --link datawake-mysql:mysql -d -p 80:80 erickimbrel/datawake tangelo -nd start

#run a datawake console
docker run  --link dockerbuild_kafka_1:kafka  dockerbuild_datawake env


```