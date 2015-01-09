#!/bin/sh
export DOCKER_HOST=tcp://192.168.59.103:2376
export DOCKER_CERT_PATH=/Users/cdickson/.boot2docker/certs/boot2docker-vm
export DOCKER_TLS_VERIFY=1

boot2docker up

fig up -d


if [ "$1" = "init" ]
then
    ./init_db.sh
fi

