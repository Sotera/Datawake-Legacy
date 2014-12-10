#!/bin/bash

source config.sh

echo "$#"
if [ $# -lt 2 ]
then
    echo "usage: ./user_orgs.sh user org <--delete>"
    exit 1
fi


docker run -it --rm -p $EXPOSED_PORT:80 \
    -e "DW_KAFKA_CONN_POOL=notset" \
    -e "DW_KAFKA_PUB_TOPIC=notset" \
    -e "DW_DB=$DW_DB" \
    -e "DW_DB_USER=$DW_DB_USER" \
    -e "DW_DB_PASSWORD=$DW_DB_PASSWORD" \
    -e "DW_DB_HOST=$DW_DB_HOST" \
    -e "DW_DB_PORT=$DW_DB_PORT" \
    -w /usr/local/share/tangelo/web/datawake/util/loader/ \
    $IMAGE sh -c "python org.py --user $1 --org $2 $3"