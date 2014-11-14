FROM wurstmeister/kafka:0.8.1.1-1

RUN apt-get -y update \
    && apt-get -y upgrade

RUN apt-get install -y wget

RUN apt-get install -y libjansi-java

RUN apt-get remove scala-library scala \
    && wget http://www.scala-lang.org/files/archive/scala-2.10.4.deb \
    && dpkg -i scala-2.10.4.deb \
    && apt-get update \
    && apt-get install scala

RUN apt-get install -y software-properties-common \
    && apt-get install -y python-software-properties

RUN add-apt-repository ppa:cwchien/gradle \
    && apt-get update \
    && apt-get install -y gradle-1.10


COPY . /trail-specific-search

WORKDIR /trail-specific-search

RUN gradle clean shadowJar
