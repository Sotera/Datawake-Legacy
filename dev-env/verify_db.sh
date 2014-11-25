#!/bin/bash

echo "creating database tables"
docker run  -it --link devenv_mysql_1:mysql --rm mysql sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD" ' < create_db.sql

echo "adding test user for mock authentication"
docker run  -it --link devenv_mysql_1:mysql --rm mysql sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD" memex_sotera -e "INSERT INTO datawake_org (email,org) VALUES (\"john.doe@nomail.none\",\"LOCALDEV\");"  '