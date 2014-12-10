from __future__ import absolute_import, print_function, unicode_literals
import os
"""
Deployment based configuration

When deploying topology specify a deployment to match with a settings key.

    -o "'topology.deployment=\"local\"'"

Spouts / Bolts in the topolgoy will then pull the settings then need from this module

"""


ALL_SETTINGS = {}

ALL_SETTINGS['cluster'] = {
    'topology':'cluster',

    'appid': 'datawake',
    'crawler-in-topic' : 'crawler-in',
    'crawler-out-topic' : 'crawler-out',
    'visited-topic': 'datawake-visited',
    'conn_pool' : "",
    'crawler_conn_pool' : "",

    'hbase_host':'',
    'hbase_port':'9090',
    'hbase_namespace':'default',
    'hbase_domain_table': '',
    'hbase_extracted_all_table': '',
    'hbase_extracted_domain_table': ''
}


ALL_SETTINGS['local-docker'] = {
    'topology':'local',

    'appid': 'datawake',
    'crawler-in-topic' : 'crawler-in',
    'crawler-out-topic' : 'crawler-out',
    'visited-topic': 'memex-datawake-visited',
    'conn_pool' : os.environ['KAFKA_PORT_9092_TCP_ADDR']+":9092" if 'KAFKA_PORT_9092_TCP_ADDR' in os.environ else '',
    'user':'root',
    'database':'memex_sotera',
    'password':os.environ['MYSQL_ENV_MYSQL_ROOT_PASSWORD'] if 'MYSQL_ENV_MYSQL_ROOT_PASSWORD' in os.environ else '',
    'host':os.environ['MYSQL_PORT_3306_TCP_ADDR'] if 'MYSQL_PORT_3306_TCP_ADDR' in os.environ else ''
}



def get_settings(key):
    return ALL_SETTINGS[key]
