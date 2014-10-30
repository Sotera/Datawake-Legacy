from __future__ import absolute_import, print_function, unicode_literals

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





def get_settings(key):
    return ALL_SETTINGS[key]
