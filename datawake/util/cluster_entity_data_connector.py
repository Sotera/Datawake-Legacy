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


# TODO Bring up to speed with data_connector interface.

import random
import threading
from Queue import Queue
from Queue import Empty

from impala.dbapi import connect
import happybase
import tangelo

from entity import Entity
from datawake.conf import datawakeconfig
from datawake.util.data_connector import DataConnector


THREADS_PER_HOST = 2


class ImpalaQueryThread(threading.Thread):
    def __init__(self, host, port, q, do_work):
        threading.Thread.__init__(self)
        self.host = host
        self.port = port
        self.q = q
        self.do_work = do_work

    def run(self):
        cnx = connect(host=self.host, port=self.port)
        cursor = cnx.cursor()
        try:
            while True:
                work_item = self.q.get(block=False)
                self.do_work(cursor, work_item)
        except Empty:
            pass
        finally:
            cnx.close()


class ClusterEntityDataConnector(DataConnector):
    """Provides connection to local mysql database for extracted entity data"""

    def __init__(self, config):
        DataConnector.__init__(self)
        self.config = config
        self.cnx = None
        self.lock = threading.Lock()


    def open(self):
        host = random.choice(self.config['hosts'])
        self.cnx = connect(host=host, port=self.config['port'])


    def close(self):
        if self.cnx is not None:
            try:
                self.cnx.close()
            except:
                pass
            finally:
                self.cnx = None

    def _checkConn(self):
        if self.cnx is None:
            self.open()

    def get_domain_entity_matches(self, domain, type, values):
        hbase_conn = None
        try:
            hbase_conn = happybase.Connection(datawakeconfig.HBASE_HOST)
            hbase_table = hbase_conn.table(datawakeconfig.DOMAIN_VALUES_TABLE_HBASE)
            rowkey = "%s\0%s\0" % (domain, type)
            found = []
            for value in values:
                for item in hbase_table.scan(row_prefix="%s%s" % (rowkey, value)):
                    found.append(value)
            return found
        finally:
            if hbase_conn is not None:
                hbase_conn.close()


    def getExtractedDomainEntitiesFromUrls(self, domain, urls, type=None):
        hbase_conn = None
        try:
            hbase_conn = happybase.Connection(datawakeconfig.HBASE_HOST)
            hbase_table = hbase_conn.table("domain_extractor_web_index_hbase")
            entity_dict = dict()
            for url in urls:
                entity_dict[url] = dict()
                for d in hbase_table.scan(row_prefix="%s\0%s\0" % (domain, url)):
                    tokens = d[0].split("\0")
                    type = tokens[2]
                    value = tokens[3]
                    if type not in entity_dict[url]:
                        entity_dict[url][type] = [value]
                    else:
                        entity_dict[url][type].append(value)
            return entity_dict
        finally:
            if hbase_conn is not None:
                hbase_conn.close()

    def get_extracted_entities_list_from_urls(self, urls):
        hbase_conn = None
        try:
            hbase_conn = happybase.Connection(datawakeconfig.HBASE_HOST)
            hbase_table = hbase_conn.table("general_extractor_web_index_hbase")
            data = []
            for url in urls:
                for d in hbase_table.scan(row_prefix="%s\0" % url):
                    data.append(d[0])
            return data
        finally:
            if hbase_conn is not None:
                hbase_conn.close()

    def getExtractedEntitiesFromUrls(self, urls, type=None):
        q = Queue()
        sql = "select rowkey from general_extractor_web_index "
        results = {}
        for url in urls:
            results[url] = dict()
            work_item = {}
            rowkey = "%s\0" % url
            work_item['sql'] = sql + " where rowkey >= %(startkey)s and rowkey < %(endkey)s "
            work_item['params'] = {'startkey': rowkey, 'endkey': rowkey + "~"}
            q.put(work_item)

        # define the work function

        lock = threading.Lock()

        def append_to_list(cursor, work_item):
            cursor.execute(work_item['sql'], work_item['params'])
            for row in cursor:
                (rowkey) = row
                tokens = rowkey[0].split("\0")
                url = tokens[0]
                attr = tokens[1]
                value = tokens[2]
                with lock:
                    if attr not in results[url]:
                        results[url][attr] = [value]
                    else:
                        results[url][attr].append(value)


        threads = []
        hosts = self.config['hosts']
        max_threads = THREADS_PER_HOST * len(hosts)
        total_work = q.qsize()
        if total_work < len(hosts):
            hosts = random.sample(hosts, total_work)
        else:
            while len(hosts) < max_threads and total_work > len(hosts):
                diff = total_work - len(hosts)
                diff = min(diff, self.config['hosts'])
                diff = min(diff, max_threads - len(hosts))
                hosts.extend(random.sample(self.config['hosts'], diff))

        for host in hosts:
            t = ImpalaQueryThread(host, self.config['port'], q, append_to_list)
            t.start()
            threads.append(t)


        # execute with all threads
        for thread in threads:
            thread.join()

        return results


    def getExtractedEntitiesWithDomainCheck(self, urls, types=[], domain='default'):
        return DataConnector.getExtractedEntitiesWithDomainCheck(self, urls, types, domain)

    def get_extracted_domain_entities_for_urls(self, domain, urls):
        hbase_conn = None
        try:
            hbase_conn = happybase.Connection(datawakeconfig.HBASE_HOST)
            hbase_table = hbase_conn.table("domain_extractor_web_index_hbase")
            entity_values = []
            for url in urls:
                for d in hbase_table.scan(row_prefix="%s\0%s\0" % (domain, url)):
                    tokens = d[0].split("\0")
                    value = tokens[3]
                    entity_values.append(value)
            return entity_values
        finally:
            if hbase_conn is not None:
                hbase_conn.close()

    def insertHBASE(self, rowkey_prefix, items, table):
        hbase_conn = None
        try:
            hbase_conn = happybase.Connection(datawakeconfig.HBASE_HOST)
            hbase_table = hbase_conn.table(table)
            batch_put = hbase_table.batch(batch_size=100)
            for i in items:
                batch_put.put(row="%s%s" % (rowkey_prefix, i), data=dict(c=""))

            batch_put.send()
        finally:
            if hbase_conn is not None:
                hbase_conn.close()

    def insertEntities(self, url, entity_type, entity_values):
        rowkey_prefix = "%s\0%s\0" % (url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, "general_extractor_web_index_hbase")

    def insertDomainEntities(self, domain, url, entity_type, entity_values):
        rowkey_prefix = "%s\0%s\0%s\0" % (domain, url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, "domain_extractor_web_index_hbase")

    def get_matching_entities_from_url(self, urls):
        entities = self.get_extracted_entities_list_from_urls(urls)
        url_dict = dict()
        for url in urls:
            url_dict[url] = set()

        def new_entity(x):
            values = x.split("\0")
            if len(values) == 3:
                url_dict[values[0]].add(Entity(dict(type=values[1], name=values[2])))
            else:
                tangelo.log(",".join(values))

        map(lambda x: new_entity(x), entities)
        vals = url_dict.values()
        return map(lambda entity: entity.item["name"], set.intersection(*vals))


    # # DOMAINS  ####
    def get_domain_items(self, name, limit):
        self._checkConn()
        cursor = self.cnx.cursor()
        sql = "select rowkey from %(table)s where rowkey >= %(startkey)s and rowkey < %(endkey)s limit %(limit)s"
        params = {
            'startkey': name + '\0',
            'endkey': name + '\0~',
            'limit': limit,
            'table': datawakeconfig.DOMAIN_VALUES_TABLE_HBASE
        }
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        except:
            self.close()
            raise
        return map(lambda x: x[0], rows)

    def delete_domain_items(self, domain_name):
        hbase_conn = None
        try:
            hbase_conn = happybase.Connection(host=datawakeconfig.HBASE_HOST)
            hbase_table = hbase_conn.table(datawakeconfig.DOMAIN_VALUES_TABLE_HBASE)
            rowkey_prefix = domain_name + '\0'
            batch_delete = hbase_table.batch(batch_size=20)
            for key in hbase_table.scan(row_prefix=rowkey_prefix):
                batch_delete.delete(row=key[0])
            batch_delete.send()
        finally:
            if hbase_conn is not None:
                hbase_conn.close()


    def add_new_domain_items(self, domain_items):
        hbase_conn = None
        try:
            hbase_conn = happybase.Connection(datawakeconfig.HBASE_HOST)
            hbase_table = hbase_conn.table(datawakeconfig.DOMAIN_VALUES_TABLE_HBASE)
            batch_put = hbase_table.batch(batch_size=100)
            for i in domain_items:
                batch_put.put(row=i, data=dict(c=""))

            batch_put.send()
        finally:
            if hbase_conn is not None:
                hbase_conn.close()
