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
from datawaketools.data_connector import DataConnector


class MySqlEntityDataConnector(DataConnector):
    """Provides connection to local mysql database for extracted entity data"""


    def __init__(self, config):
        """
            :param config:  database connection info and table names
                {
                    user:...,
                    database:...,
                    password:...,
                    host:....,
                    lookahead_table:...,
                    visited_table:....,
                }
            :return:  a new EntityDataConnector for a mysql database
            """
        DataConnector.__init__(self)
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


    # ###  LOOK AHEAD  ####


    # TODO, update refs
    def getLookaheadEntities(self, url, org, domain='default'):
        """
        Return all lookahead entities extracted from a url
        :param url:
        :return: nested dict of extract type -> extracted value -> indomain ('y' or 'n')
        """
        org = org.upper()
        self._checkConn()
        try:
            cursor = self.cnx.cursor()
            sql = "select distinct entity_type, entity_value,indomain from " + self.config['lookahead_table'] + "  where url = %s and domain = %s and org = %s"
            params = [url, domain, org]
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            results = {}
            for row in rows:
                (entity_type, entity_value, indomain) = row
                if entity_type not in results:
                    results[entity_type] = {}
                results[entity_type][entity_value] = indomain
            cursor.close()
            return results
        except:
            self.close()
            raise


    # TODO, update refs
    def insertLookaheadEntities(self, url, entity_type, entity_values, indomain, org, domain='default'):
        """
        Bulk insertion of extracted lookahead entities
        :param url: The url entities where extracted from
        :param entity_type: type of entity i.e 'phone', 'email', or 'website',etc
        :param entity_values: a list of entity values
        :param indomain: 'y' or 'n' indicating if the extracted entity exists in the domain specific index
        :return:
        """
        org = org.upper()
        if indomain != 'y' and indomain != 'n':
            raise ValueError('indomain must be y or n was: ' + indomain)
        self._checkConn()
        cursor = self.cnx.cursor()

        try:
            for entity_value in entity_values:
                sql = "select count(1) from " + self.config['lookahead_table'] + " where url = %s and entity_type = %s and entity_value = %s and domain = %s and org = %s"
                params = [url, entity_type, entity_value, domain, org]
                cursor.execute(sql, params)
                count = cursor.fetchall()[0][0]
                if count == 0:
                    sql = "INSERT INTO " + self.config['lookahead_table'] + " (url,entity_type,entity_value,indomain,domain,org) VALUES (%s,%s,%s,%s,%s,%s)"
                    params = [url, entity_type, entity_value, indomain, domain, org]
                    cursor.execute(sql, params)
                else:
                    sql = "UPDATE " + self.config['lookahead_table'] + " set ts = NOW(),indomain=%s where url = %s and entity_type = %s and entity_value=%s and domain = %s and org = %s"
                    params = [indomain, url, entity_type, entity_value, domain, org]
                    cursor.execute(sql, params)
            self.cnx.commit()
            cursor.close()
        except:
            self.close()
            raise


    # TODO update refs
    def getLookaheadEntityMatches(self, urls, entity_set, org, domain='default'):
        """
        For a set of urls return extracted entities that match those in the provided set,
        Also include extracted entities for each url that are memebers of the domain.
        :param urls: list of urls for which to test extracted entities
        :param entity_set:  list of entities to match against
        :return: a dict of url -> {'all_matchies': entities that match the provided set, 'domain_matches': entities found in the domain }
        """
        org = org.upper()
        self._checkConn()
        cursor = self.cnx.cursor()
        result = {}
        try:
            sql = "select entity_type,entity_value,indomain from " + self.config['lookahead_table'] + " where url = %s and domain = %s and org = %s"
            for url in urls:
                result[url] = {'all_matches': set([]), 'domain_matches': set([])}
                params = [url, domain, org]
                cursor.execute(sql, params)
                for row in cursor:
                    entity = row[0] + ":" + row[1]
                    if entity in entity_set:
                        result[url]['all_matches'].add(entity)
                    if row[2] == 'y':
                        result[url]['domain_matches'].add(entity)
            cursor.close()
            return result
        except:
            self.close()
            raise


    # ###   VISITED   ####



    def insertVisitedEntities(self, userId, url, entity_type, entity_values, indomain, domain='default', org='default'):
        org = org.upper()
        if indomain != 'y' and indomain != 'n':
            raise ValueError('insertLookaheadURNS indomain must be y or n was: ' + indomain)

        self._checkConn()
        cursor = self.cnx.cursor()
        try:
            for entity_value in entity_values:
                sql = "select count(1) from " + self.config['visited_table'] + " where userId = %s and url = %s and entity_type = %s and entity_value = %s and domain = %s and org = %s"
                params = [userId, url, entity_type, entity_value, domain, org]
                cursor.execute(sql, params)
                count = cursor.fetchall()[0][0]
                if count == 0:
                    sql = "INSERT INTO " + self.config['visited_table'] + " (userId,url,entity_type,entity_value,indomain,domain,org) VALUES (%s,%s,%s,%s,%s,%s,%s)"
                    params = [userId, url, entity_type, entity_value, indomain, domain, org]
                    cursor.execute(sql, params)
                else:
                    sql = "UPDATE " + self.config['visited_table'] + " set ts = NOW(),indomain=%s where userId = %s and url = %s and entity_type = %s and entity_value=%s and domain = %s and org = %s"
                    params = [indomain, userId, url, entity_type, entity_value, domain, org]
                    cursor.execute(sql, params)
            self.cnx.commit()
            cursor.close()
        except:
            self.close()
            raise


    # TODO update refs
    def getVisitedEntities(self, userId, url, org, domain='default'):
        org = org.upper()
        self._checkConn()
        cursor = self.cnx.cursor()
        sql = "select distinct entity_type,entity_value,indomain from " + self.config['visited_table'] + " where userId = %s and url = %s and domain = %s and org =%s"
        params = [userId, url, domain, org]

        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            cursor.close()
        except:
            self.close()
            raise

        results = {}
        for row in rows:
            (entity_type, entity_value, indomain) = row
            if entity_type not in results:
                results[entity_type] = {}
            results[entity_type][entity_value] = indomain
        return results


    # TODO update refs
    def getVisitedEntitiesByUsersAndTypes(self, userIds, urls, types, org, domain='default'):
        if len(types) == 0:
            raise ValueError("must specify types")

        self._checkConn()
        cursor = self.cnx.cursor()
        results = {}

        sql = "select entity_type,entity_value,indomain from " + self.config['visited_table'] + " "
        types_in = "(" + ( ','.join(['%s' for i in range(len(types))]) ) + ")"
        sql = sql + " WHERE entity_type in " + types_in
        sql = sql + " AND domain = %s AND org =%s "
        if len(userIds) > 0:
            user_ids_in = "(" + ( ','.join(['%s' for i in range(len(userIds))]) ) + ")"
            sql = sql + " AND userId in " + user_ids_in
        for url in urls:
            final_sql = sql + " AND url = %s"
            params = []
            params.extend(types)
            params.append(domain)
            params.append(org)
            params.extend(userIds)
            params.append(url)
            try:
                cursor.execute(final_sql, params)
                for row in cursor:
                    (type, value, indomain) = row
                    if url not in results:
                        results[url] = []
                    results[url].append({'type': type, 'value': value, 'indomain': indomain})
            except:
                self.close()
                raise
        return results


    def getEntityMatches(self, domain, type, values):
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


    # # DOMAINS  ####


    def get_domain_items(self, name, limit):
        self._checkConn()
        cursor = self.cnx.cursor()
        sql = "select rowkey from datawake_domain_entities where rowkey like %s limit %s"
        params = [name + '\0%', limit]
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        except:
            self.close()
            raise
        return map(lambda x: x[0], rows)


    def delete_domain_items(self, domain_name):
        self._checkConn()
        cursor = self.cnx.cursor()
        full_name = domain_name + '\0'
        sql = "delete from datawake_domain_entities where INSTR(rowkey, %s)"
        params = [full_name]
        try:
            cursor.execute(sql, params)
            self.cnx.commit()
        except:
            self.close()
            raise

    def add_new_domain_items(self, domain_items):
        self._checkConn()
        cursor = self.cnx.cursor()
        params = []
        # item_list = ','.join(map(lambda x: "('%s','')" % x, domain_items))
        try:
            for item in domain_items:
                sql = "insert into datawake_domain_entities (rowkey) value (%s)"
                cursor.execute(sql, [item])
            self.cnx.commit()
            cursor.close()
            return True
        except:
            self.close()
            return False




