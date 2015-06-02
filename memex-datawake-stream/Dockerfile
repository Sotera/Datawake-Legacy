FROM wurstmeister/kafka:0.8.2.1

RUN apt-get -y update && apt-get -y upgrade

RUN apt-get -y install unattended-upgrades \
  python-software-properties \
  software-properties-common \
  python-pip \
  python-dev \
  git \
  make \
  cmake \
  wget \
  libopenblas-dev \
  liblapack-dev \
  libjpeg-dev \
  python-bs4 \
  default-jdk


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

# install clojure and lein
ENV LEIN_ROOT true
RUN wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein \
    && chmod a+x lein \
    && mv lein /usr/bin \
    && /usr/bin/lein

RUN easy_install -U setuptools

# install streamparse
RUN pip install streamparse \
  happybase \
  httplib2 \
  kafka-python \
  impyla

# install mysql client
RUN pip install --allow-external mysql-connector-python \
 mysql-connector-python
