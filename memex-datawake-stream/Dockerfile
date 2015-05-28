FROM wurstmeister/kafka:0.8.2.1

RUN apt-get -y update \
    && apt-get -y upgrade
RUN apt-get -y update &&  apt-get -y install unattended-upgrades

RUN apt-get install -y --fix-missing python-software-properties \
    && apt-get install -y --fix-missing software-properties-common \
    && apt-get install -y --fix-missing python-pip \
    && apt-get install -y --fix-missing python-dev

RUN apt-get install -y --fix-missing git \
    && apt-get install -y --fix-missing make \
    && apt-get install -y --fix-missing cmake

RUN apt-get install -y --fix-missing wget

# install the MITIE library
RUN sudo apt-get install -y --fix-missing libopenblas-dev liblapack-dev libjpeg-dev
RUN mkdir /usr/lib/mitie \
    && cd /usr/lib/mitie \
    && git clone https://github.com/mitll/MITIE.git \
    && cd MITIE \
    && make MITIE-models \
    && cd tools/ner_stream \
    && mkdir build \
    && cd build \
    && cmake .. \
    && cmake --build . --config Release \
    && cd ../../../mitielib \
    && make
ENV MITIE_HOME /usr/lib/mitie/MITIE

# install beatiful soup
RUN apt-get install -y --fix-missing python-bs4

# install java
RUN apt-get install -y --fix-missing default-jdk

# install clojure and lein
ENV LEIN_ROOT true
RUN wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein \
    && chmod a+x lein \
    && mv lein /usr/bin \
    && /usr/bin/lein


# install streamparse
RUN pip install streamparse


# misc python libs

RUN pip install happybase
RUN pip install httplib2


# install mysql client

RUN wget http://dev.mysql.com/get/Downloads/Connector-Python/mysql-connector-python-1.2.3.tar.gz \
    && tar xf mysql-connector-python-1.2.3.tar.gz \
    && cd mysql-connector-python-1.2.3/ \
    && python setup.py install


# install kafka python client

RUN wget https://github.com/mumrah/kafka-python/releases/download/v0.9.3/kafka-python-0.9.3.tar.gz \
    && tar -xzvf kafka-python-0.9.3.tar.gz \
    && cd kafka-python-0.9.3/ \
    && python setup.py install



# install impyla

RUN git clone https://github.com/cloudera/impyla.git \
    && cd impyla \
    && python setup.py install

# install kafka

#RUN wget -q http://mirror.gopotato.co.uk/apache/kafka/0.8.1.1/kafka_2.8.0-0.8.1.1.tgz -O /tmp/kafka_2.8.0-0.8.1.1.tgz
RUN wget -q http://apache.arvixe.com/kafka/0.8.2.1/kafka_2.10.0-0.8.2.1.tgz
RUN tar xfz /tmp/kafka_2.10.0-0.8.2.1.tgz -C /opt
ENV KAFKA_HOME /opt/kafka_2.10.0-0.8.2.1

COPY . /memex-datawake-stream

ADD dev_container_start.sh /usr/bin/dev_container_start.sh
WORKDIR /memex-datawake-stream

CMD dev_container_start.sh
