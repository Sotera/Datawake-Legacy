# Base Docker image for tangelo web aps
FROM ubuntu:14.04
MAINTAINER Eric Kimbrel <Eric.Kimbrel@soteradefense.com>,<lekimbrel@gmail.com>


# install pip and python dev tools
RUN apt-get update
RUN apt-get install -y python-software-properties
RUN apt-get -y install python-pip
RUN apt-get -y install python-dev

# install and setup tangelo as the entry point
RUN pip install tangelo
RUN adduser  --no-create-home --disabled-password --disabled-login --gecos "" tangelo
COPY conf/tangelo.conf /etc/tangelo.conf
VOLUME ["/var/log/","/var/run/"]
ENTRYPOINT ["tangelo","-nd","start"]


