FROM ubuntu:14.04
MAINTAINER Eric Kimbrel <Eric.Kimbrel@soteradefense.com>,<lekimbrel@gmail.com>

# copy and execute the  build script

COPY docker-build/init_scripts/build-container.sh /build-container.sh
RUN /build-container.sh


# setup tangelo conf and entry point for container

RUN adduser  --no-create-home --disabled-password --disabled-login --gecos "" tangelo
COPY docker-build/conf/tangelo.conf /etc/tangelo.conf
EXPOSE 80


# copy over the web apps and conf

COPY server/datawake /usr/local/share/tangelo/web/datawake
COPY server/domain /usr/local/share/tangelo/web/domain
COPY server/forensic /usr/local/share/tangelo/web/forensic
ENV PYTHONPATH /usr/local/share/tangelo/web:$PYTHONPATH


# set up streamparse to use for launching topologies or running in a local container to test

COPY memex-datawake-stream /memex-datawake-stream

# set an environment variable for MITIE
ENV MITIE_HOME /MITIE

# set the default container command to run tangelo

CMD ["tangelo","-nd","start"]




