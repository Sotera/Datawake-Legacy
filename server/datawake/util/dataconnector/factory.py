"""

Copyright 2014 Sotera Defense Solutions, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""
from datawake.conf import datawakeconfig


if datawakeconfig.ENTITY_CONNECTION == 'cluster-impala':
    from datawake.util.dataconnector.impala_entity_data_connector import ClusterEntityDataConnector
elif datawakeconfig.ENTITY_CONNECTION == 'cluster-hbase':
    from datawake.util.dataconnector.hbase_entity_data_connector import HBASEDataConnector
elif datawakeconfig.ENTITY_CONNECTION == 'mysql':
    from datawake.util.dataconnector.local_entity_data_connector import MySqlEntityDataConnector


def get_entity_data_connector():
    if datawakeconfig.ENTITY_CONNECTION == 'cluster-impala':
        config = {
            'hosts': datawakeconfig.IMPALA_HOSTS,
            'port': datawakeconfig.IMPALA_PORT
        }
        return ClusterEntityDataConnector(config)
    elif datawakeconfig.ENTITY_CONNECTION == 'mysql':
        config = datawakeconfig.DATAWAKE_CORE_DB
        return MySqlEntityDataConnector(config)
    elif datawakeconfig.ENTITY_CONNECTION == 'cluster-hbase':
        return HBASEDataConnector(datawakeconfig.HBASE_HOST)
    else:
        raise ValueError("ENTITY_CONNECTION must be 'mysql' or 'cluster', not " + datawakeconfig.ENTITY_CONNECTION)








