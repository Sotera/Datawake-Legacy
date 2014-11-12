#!/bin/sh

docker run -d  --name datawake-streamparse --link dockerbuild_mysql_1:mysql  --link dockerbuild_kafka_1:kafka    -w /memex-datawake-stream -e LEIN_ROOT=1  dockerbuild_datawake sparse run -n local -t 9999999 -o "'topology.deployment=\"local-docker\"'"

