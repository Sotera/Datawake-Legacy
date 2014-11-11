from __future__ import absolute_import, print_function, unicode_literals
import os
"""
Deployment based configuration

When deploying topology specify a deployment to match with a settings key.

    -o "'topology.deployment=\"local\"'"

Spouts / Bolts in the topolgoy will then pull the settings then need from this module

"""


ALL_SETTINGS = {}


ALL_SETTINGS['local'] = {
    'topology':'local',
    'appid': 'datawake',
    'crawler-in-topic' : 'crawler-in',
    'crawler-out-topic' : 'crawler-out',
    'visited-topic': 'memex-datawake-visited',
    'conn_pool' : "localhost:9092",
    'user':'root',
    'database':'memex_sotera',
    'password':'root',
    'host':'localhost'
}

ALL_SETTINGS['cluster'] = {
    'topology':'cluster',
    'hbase_host':'localhost',
    'appid': 'datawake',
    'crawler-in-topic' : 'crawler-in',
    'crawler-out-topic' : 'crawler-out',
    'visited-topic': 'memex-datawake-visited',
    'conn_pool' : "localhost:9092",

    'user':'root',
    'database':'memex_sotera',
    'password':'root',
    'host':'localhost'
}



ALL_SETTINGS['local-docker'] = {
    'topology':'local',
    'appid': 'datawake',
    'crawler-in-topic' : 'crawler-in',
    'crawler-out-topic' : 'crawler-out',
    'visited-topic': 'memex-datawake-visited',
    'conn_pool' : os.environ['KAFKA_PORT_9092_TCP_ADDR']+":9092",

    'user':'root',
    'database':'memex_sotera',
    'password':os.environ['MYSQL_ENV_MYSQL_ROOT_PASSWORD'],
    'host':os.environ['MYSQL_PORT_3306_TCP_ADDR']
}



def get_settings(key):
    return ALL_SETTINGS[key]
