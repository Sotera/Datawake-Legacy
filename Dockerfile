FROM ubuntu:14.04
MAINTAINER Eric Kimbrel <Eric.Kimbrel@soteradefense.com>,<lekimbrel@gmail.com>

# copy and execute the  build script

COPY docker-build/init_scripts/build-container.sh /build-container.sh
RUN /build-container.sh



# setup tangelo conf and entry point for container

RUN adduser  --no-create-home --disabled-password --disabled-login --gecos "" tangelo
COPY docker-build/conf/tangelo.conf /etc/tangelo.conf
VOLUME ["/var/log/","/var/run/"]


# copy over the web apps and conf

COPY datawake /usr/local/share/tangelo/web/datawake
COPY domain /usr/local/share/tangelo/web/domain
COPY forensic /usr/local/share/tangelo/web/forensic
COPY docker-build/conf/datawakeconfig.py /usr/local/share/tangelo/web/datawake/conf/datawakeconfig.py
ENV PYTHONPATH /usr/local/share/tangelo/web


# set up streamparse to use for launching topologies or running in a local container to test
COPY memex-datawake-stream /memex-datawake-stream

CMD ["tangelo","-nd","start"]




