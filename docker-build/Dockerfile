# Base Docker image for tangelo web aps

FROM ubuntu:14.04
MAINTAINER Eric Kimbrel <Eric.Kimbrel@soteradefense.com>,<lekimbrel@gmail.com>

# copy and execute the  build script

COPY build-container.sh /build-container.sh
RUN /build-container.sh



# setup tangelo conf and entry point for container

RUN adduser  --no-create-home --disabled-password --disabled-login --gecos "" tangelo
COPY conf/tangelo.conf /etc/tangelo.conf
VOLUME ["/var/log/","/var/run/"]
ENTRYPOINT ["tangelo","-nd","start"]

