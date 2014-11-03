FROM ubuntu:14.04
MAINTAINER Eric Kimbrel <Eric.Kimbrel@soteradefense.com>,<lekimbrel@gmail.com>

# copy and execute the  build script

COPY docker-build/build-container.sh /build-container.sh
RUN /build-container.sh



# setup tangelo conf and entry point for container

RUN adduser  --no-create-home --disabled-password --disabled-login --gecos "" tangelo
COPY docker-build/tangelo.conf /etc/tangelo.conf
VOLUME ["/var/log/","/var/run/"]


# copy over the web apps and conf

COPY datawake /usr/local/share/tangelo/web/datawake
COPY domain /usr/local/share/tangelo/web/domain
COPY forensic /usr/local/share/tangelo/web/forensic
COPY docker-build/datawakeconfig.py /usr/local/share/tangelo/web/datawake/conf/datawakeconfig.py





