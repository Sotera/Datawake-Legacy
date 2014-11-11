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

import mysql.connector
from datawakeio.data_connector import ExtractedDataConnector


class MySqlEntityDataConnector(ExtractedDataConnector):
    """Provides connection to local mysql database for extracted entity data"""


    def __init__(self, config):
        """
            :param config:  database connection info and table names
                {
                    user:...,
                    database:...,
                    password:...,
                    host:....,
                }
            :return:  a new EntityDataConnector for a mysql database
            """
        ExtractedDataConnector.__init__(self)
        self.config = config
        self.cnx = None


    def open(self):
        """ Open a new database connection. """

        self.close()
        user = self.config['user']
        db = self.config['database']
        pw = self.config['password']
        host = self.config['host']
        self.cnx = mysql.connector.connect(user=user, password=pw, host=host, database=db)


    def close(self):
        """Close any existing database connection. """

        if self.cnx is not None:
            try:
                self.cnx.close()
            except:
                pass
            finally:
                self.cnx = None


    def _checkConn(self):
        """Open a new database conneciton if one does not currently exist."""

        if self.cnx is None:
            self.open()





    def insert_entities(self, url, entity_type, entity_values):
        self._checkConn()
        cursor = self.cnx.cursor()
        try:
            for entity_value in entity_values:
                sql = "select count(1) from general_extractor_web_index where url = %s and entity_type = %s and entity_value = %s"
                params = [url,entity_type,entity_value]
                cursor.execute(sql,params)
                count = cursor.fetchall()[0][0]
                if count == 0:
                    sql = "INSERT INTO general_extractor_web_index (url,entity_type,entity_value) VALUES (%s,%s,%s)"
                    cursor.execute(sql,params)
            self.cnx.commit()
            cursor.close()
        except:
            self.close()
            raise



    def insert_domain_entities(self, domain,url, entity_type, entity_values):
        self._checkConn()
        cursor = self.cnx.cursor()
        try:
            for entity_value in entity_values:
                sql = "select count(1) from domain_extractor_web_index where domain = %s and url = %s and entity_type = %s and entity_value = %s"
                params = [domain,url,entity_type,entity_value]
                cursor.execute(sql,params)
                count = cursor.fetchall()[0][0]
                if count == 0:
                    sql = "INSERT INTO domain_extractor_web_index (domain,url,entity_type,entity_value) VALUES (%s,%s,%s,%s)"
                    cursor.execute(sql,params)
            self.cnx.commit()
            cursor.close()
        except:
            self.close()
            raise




    # # DOMAINS  ####


    def get_domain_entity_matches(self, domain, type, values):
        self._checkConn()
        cursor = self.cnx.cursor()
        sql = ""
        params = []
        max = len(values) - 1
        for i in range(len(values)):
            params.append(domain + '\0' + type + '\0' + values[i])
            sql = sql + "select rowkey from datawake_domain_entities where rowkey = %s"
            if i < max:
                sql = sql + " union all "
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            cursor.close()
            return map(lambda x: x[0].split('\0')[2], rows)
        except:
            self.close()
            raise



