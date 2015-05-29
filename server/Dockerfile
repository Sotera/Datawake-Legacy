FROM ubuntu:14.04

RUN apt-get -y update && apt-get -y upgrade
RUN apt-get -y install \
  g++ \
  git \
  python-dev \
  python-igraph \
  python-pip \
  python-software-properties \
  software-properties-common \
  unixodbc-dev \
  wget
RUN add-apt-repository -y ppa:igraph/ppa \
    && apt-get update \
    && apt-get install -y python-igraph

RUN easy_install -U setuptools
RUN pip install \
  happybase \
  httplib2 \
  impyla \
  kafka-python \
  tangelo

RUN pip install --allow-external pyodbc --allow-unverified pyodbc pyodbc
RUN pip install --allow-external mysql-connector-python \
 mysql-connector-python

# setup tangelo conf and entry point for container
RUN adduser  --no-create-home --disabled-password --disabled-login --gecos "" tangelo
