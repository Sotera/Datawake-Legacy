#!/bin/bash

fig up -d mysql

./verify_db.sh

fig up -d