import os

# list of client ids used for google user authentication
# before we use an access_token we have to validate that it is from one of our clients
CLIENT_IDS = [

]

# Flag to skip actual user Auth and return fake results instead
MOCK_AUTH = True


### DATABASE SETTINGS


DATAWAKE_CORE_DB = {
    'database': 'memex_sotera',
    'user': 'root',
    'password':os.environ['MYSQL_ENV_MYSQL_ROOT_PASSWORD'],
    'host': os.environ['MYSQL_PORT_3306_TCP_ADDR']
}

KAFKA_CONN_POOL="localhost:9092"
KAFKA_LOOKAHEAD_TOPIC='memex-datawake-lookahead'
KAFKA_VISITING_TOPIC='memex-datawake-visited'


IMPALA_HOSTS = []

# can be "cluster" or "mysql"
ENTITY_CONNECTION = "mysql"


VISITED_ENTITY_TABLENAME = "datawake_visited"
LOOKAHEAD_ENTITY_TABLENAME = "datawake_lookahead"
DOMAIN_VALUES_TABLE = "datawake_domain_entities"

#
# Link to external tools.  provide a list of links in the form:
#   {'display':'display name','link':"..."}
# The link text may contain "$ATTR" and/or "$VALUE"
# which will be replaced with an extracted type and value such as "phone" and "5555555555"
#
EXTERNAL_LINKS = []

