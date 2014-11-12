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

import random
import threading
from Queue import Queue
from Queue import Empty

from impala.dbapi import connect
import tangelo

from entity import Entity
from datawake.conf import datawakeconfig
from datawake.util.dataconnector.data_connector import DataConnector


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

    def _check_conn(self):
        if self.cnx is None:
            self.open()

    def queue_impala_query(self, result_method, results, work_item_iterator):
        q = Queue()
        for work_item in work_item_iterator():
            q.put(work_item)

        # define the work function

        lock = threading.Lock()

        def work_method(cursor, work_item):
            cursor.execute(work_item['sql'], work_item['params'])
            for row in cursor:
                result_method(row, lock, results)

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
            t = ImpalaQueryThread(host, self.config['port'], q, work_method)
            t.start()
            threads.append(t)


        # execute with all threads
        for thread in threads:
            thread.join()

        return results

    def get_extracted_entities_from_urls(self, urls, type=None):

        def work_item_iterator():
            sql = "select rowkey from general_extractor_web_index "
            for url in urls:
                work_item = {}
                rowkey = "%s\0" % url
                work_item['sql'] = sql + " where rowkey >= %(startkey)s and rowkey < %(endkey)s "
                work_item['params'] = {'startkey': rowkey, 'endkey': rowkey + "~"}
                yield work_item

        # define the work function

        def append_to_list(row, lock, results):
            tokens = row[0].split("\0")
            url = tokens[0]
            attr = tokens[1]
            value = tokens[2]
            with lock:
                if url not in results:
                    results[url] = {}
                if attr not in results[url]:
                    results[url][attr] = [value]
                else:
                    results[url][attr].append(value)

        results = {}
        return self.queue_impala_query(append_to_list, results, work_item_iterator)


    def get_extracted_entities_with_domain_check(self, urls, types=[], domain='default'):
        return DataConnector.get_extracted_entities_with_domain_check(self, urls, types, domain)

    # # DOMAINS  ####
    def get_domain_items(self, name, limit):
        self._check_conn()
        cursor = self.cnx.cursor()
        sql = "select rowkey from %(table)s where rowkey >= %(startkey)s and rowkey < %(endkey)s limit %(limit)s"
        params = {
            'startkey': name + '\0',
            'endkey': name + '\0~',
            'limit': limit,
            'table': datawakeconfig.DOMAIN_VALUES_TABLE
        }
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        except:
            self.close()
            raise
        return map(lambda x: x[0], rows)


    def get_domain_entity_matches(self, domain, type, values):
        def work_item_iterator():
            sql = "select rowkey from datawake_domain_entities "
            for value in values:
                work_item = {}
                rowkey = "%s\0%s\0%s" % (domain, type, value)
                work_item['sql'] = sql + " where rowkey >= %(startkey)s and rowkey < %(endkey)s "
                work_item['params'] = {'startkey': rowkey, 'endkey': rowkey + "~"}
                yield work_item

        def append_to_list(row, lock, results):
            tokens = row[0].split("\0")
            value = tokens[2]
            with lock:
                results.append(value)

        results = []
        return self.queue_impala_query(append_to_list, results, work_item_iterator)


    def get_extracted_domain_entities_from_urls(self, domain, urls, type=None):
        def work_item_iterator():
            sql = "select rowkey from datawake_domain_entities "
            for url in urls:
                work_item = {}
                rowkey = "%s\0%s\0" % (domain, url)
                work_item['sql'] = sql + " where rowkey >= %(startkey)s and rowkey < %(endkey)s "
                work_item['params'] = {'startkey': rowkey, 'endkey': rowkey + "~"}
                yield work_item

        def append_to_list(row, lock, results):
            tokens = row[0].split("\0")
            url = tokens[1]
            type = tokens[2]
            value = tokens[3]
            with lock:
                if url not in results:
                    results[url] = {}
                if type not in results[url]:
                    results[url][type] = [value]
                else:
                    results[url][type].append(value)

        results = {}
        return self.queue_impala_query(append_to_list, results, work_item_iterator)

    def get_extracted_domain_entities_for_urls(self, domain, urls):
        def work_item_iterator():
            sql = "select rowkey from datawake_domain_entities "
            for url in urls:
                work_item = {}
                rowkey = "%s\0%s\0" % (domain, url)
                work_item['sql'] = sql + " where rowkey >= %(startkey)s and rowkey < %(endkey)s "
                work_item['params'] = {'startkey': rowkey, 'endkey': rowkey + "~"}
                yield work_item

        def append_to_list(row, lock, results):
            tokens = row[0].split("\0")
            value = tokens[3]
            with lock:
                results.append(value)

        results = []
        return self.queue_impala_query(append_to_list, results, work_item_iterator)

    def get_extracted_entities_list_from_urls(self, urls):
        def work_item_iterator():
            sql = "select rowkey from datawake_domain_entities "
            for url in urls:
                work_item = {}
                rowkey = "%s\0" % url
                work_item['sql'] = sql + " where rowkey >= %(startkey)s and rowkey < %(endkey)s "
                work_item['params'] = {'startkey': rowkey, 'endkey': rowkey + "~"}
                yield work_item

        def append_to_list(row, lock, results):
            with lock:
                results.append(row[0])

        results = []
        return self.queue_impala_query(append_to_list, results, work_item_iterator)

    def get_matching_entities_from_url(self, urls):
        entities = self.get_matching_entities_from_url(urls)
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


    # TODO: Might be able to remove this.  No inserts or deletions through Impala
    def delete_domain_items(self, domain_name):
        return DataConnector.delete_domain_items(self, domain_name)

    def add_new_domain_items(self, domain_items):
        return DataConnector.add_new_domain_items(self, domain_items)

