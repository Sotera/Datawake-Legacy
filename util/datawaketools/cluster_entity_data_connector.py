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


#TODO Bring up to speed with data_connector interface.

from datawaketools.data_connector import DataConnector
from impala.dbapi import connect
import random
import threading
from Queue import Queue
from Queue import Empty
import datawakeconfig
import happybase


THREADS_PER_HOST = 2


class ImpalaQueryThread (threading.Thread):

    def __init__(self, host,port,q,do_work):
        threading.Thread.__init__(self)
        self.host = host
        self.port = port
        self.q = q
        self.do_work = do_work

    def run(self):
        cnx = connect(host=self.host,port=self.port)
        cursor = cnx.cursor()
        try:
            while True:
                work_item = self.q.get(block=False)
                self.do_work(cursor,work_item)
        except Empty:
            pass
        finally:
            cnx.close()






class ClusterEntityDataConnector(DataConnector):

    """Provides connection to local mysql database for extracted entity data"""


    def __init__(self, config):
        self.config = config
        self.cnx = None
        self.lock = threading.Lock()


    def open(self):
        host = random.choice(self.config['hosts'])
        self.cnx = connect(host=host,port=self.config['port'])


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


    # ###  LOOK AHEAD  ####
    def getLookaheadEntities(self, url, org, domain='default'):
        """
        Return all lookahead entities extracted from a url
        :param url:
        :return: nested dict of extract type -> extracted value -> indomain ('y' or 'n')
        """
        rowkey = org + '\0' + domain + '\0' + url + '\0'
        self._checkConn()
        try:
            cursor = self.cnx.cursor()
            sql = "select attribute, value, in_domain from " + self.config['lookahead_table'] + "  where rowkey >=  %(startkey)s AND rowkey < %(endkey)s"
            params = {'startkey': rowkey, 'endkey': rowkey + "~"}
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


    def insertLookaheadEntities(self, url, entity_type, entity_values, indomain, domain='default'):
        raise NotImplementedError("Insert methods not implemented for cluster data.")




    def getLookaheadEntityMatches(self,urls,entity_set,org,domain='default'):
        """
        For a set of urls return extracted entities that match those in the provided set,
        Also include extracted entities for each url that are memebers of the domain.
        :param urls: list of urls for which to test extracted entities
        :param entity_set:  list of entities to match against
        :return: a dict of url -> {'all_matchies': entities that match the provided set, 'domain_matches': entities found in the domain }
        """

        result = {}

        # create the work queue
        q = Queue()
        for url in urls:
            result[url] = {'all_matches':set([]),'domain_matches':set([])}
            try:
                rowkey = org+'\0'+domain+'\0'+url+'\0'
            except:
                continue
            work_item = {}
            work_item['sql'] = "select attribute, value, in_domain,url from "+self.config['lookahead_table']+" where rowkey >= %(startkey)s and rowkey < %(endkey)s"
            work_item['params'] = {'startkey':rowkey, 'endkey':rowkey+"~"}
            q.put(work_item)


        #define the work function
        lock = threading.Lock()
        def do_work(cursor,work_item):
            cursor.execute(work_item['sql'],work_item['params'])
            for row in cursor:
                url = row[3]
                entity = row[0]+":"+row[1]
                with lock:
                    if entity in entity_set:
                        result[url]['all_matches'].add(entity)
                    if row[2] == 'y':
                        result[url]['domain_matches'].add(entity)


        # create the thread pool
        threads = []
        hosts = self.config['hosts']
        max_threads = THREADS_PER_HOST * len(hosts)
        total_work = q.qsize()
        if total_work < len(hosts):
            hosts = random.sample(hosts,total_work)
        else:
            while len(hosts) < max_threads and total_work > len(hosts):
                diff = total_work - len(hosts)
                diff = min(diff,self.config['hosts'])
                diff = min(diff, max_threads - len(hosts))
                hosts.extend( random.sample(self.config['hosts'],diff) )

        for host in hosts:
            t = ImpalaQueryThread(host,self.config['port'],q, do_work)
            t.start()
            threads.append(t)

        #print 'created ',len(threads),' threads'

        #finished = 0
        for thread in threads:
            thread.join()
            #finished = finished + 1
            #print '\tjoined ',finished



        return result





    ####   VISITED   ####


    def insertVisitedEntities(self, userId, url, entity_type, entity_values, indomain, domain='default', org='default'):
        raise NotImplementedError("Insert methods not implemented for cluster data.")


    # TODO   Ah!  problem.  this uses a userId in the where clause but not a type, which causes a problem with the rowkey scheme
    # TODO   for now going to ignore the user id al together and just get everything for the page from the org.
    def getVisitedEntities(self, userId, url, org, domain='default'):

        rowkey = org + '\0' + domain + '\0' + url + '\0'

        self._checkConn()
        cursor = self.cnx.cursor()
        # sql = "select distinct attribute, value, in_domain from "+self.config['visited_table']+" where rowkey >= %(startkey)s and rowkey < %(endkey)s"
        sql = "select attribute, value, in_domain from " + self.config['visited_table'] + " where rowkey >= %(startkey)s and rowkey < %(endkey)s"
        #sql = "select rowkey from "+self.config['visited_table']+" where rowkey >= %(startkey)s and rowkey < %(endkey)s"
        params = {'startkey': rowkey, 'endkey': rowkey + "~"}

        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            #rows = map(lambda x: x[0].split('\0'),rows)
            #rows = map(lambda x: [x[3],x[5],'n'],rows)
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


    # TODO for now going to ignore users and get it all.   THis should really be fine because we
    # already pull the urls based on users browse paths
    def getVisitedEntitiesByUsersAndTypes(self, userIds, urls, types, org, domain='default'):

        if len(types) == 0:
            raise ValueError("must specify types")

        # create the work queue
        q = Queue()
        sql = "select attribute, value, in_domain,url from "+self.config['visited_table']+" "
        for url in urls:
            for type in types:
                work_item = {}
                rowkey = org+'\0'+domain+'\0'+url+'\0'+type+'\0'
                work_item['sql'] = sql + " where rowkey >= %(startkey)s and rowkey < %(endkey)s "
                work_item['params'] = {'startkey':rowkey, 'endkey':rowkey+"~"}
                q.put(work_item)
        #print 'added ',q.qsize(),' work items to queue'

        # define the work function
        results = {}
        lock = threading.Lock()
        def do_work(cursor,work_item):
            cursor.execute(work_item['sql'],work_item['params'])
            for row in cursor:
                (type,value,indomain,url) = row
                with lock:
                    if url not in results:
                        results[url] = []
                    results[url].append({'type':type,'value':value,'indomain':indomain})


        # create the thread pool
        threads = []
        hosts = self.config['hosts']
        max_threads = THREADS_PER_HOST * len(hosts)
        total_work = q.qsize()
        if total_work < len(hosts):
            hosts = random.sample(hosts,total_work)
        else:
            while len(hosts) < max_threads and total_work > len(hosts):
                diff = total_work - len(hosts)
                diff = min(diff,self.config['hosts'])
                diff = min(diff, max_threads - len(hosts))
                hosts.extend( random.sample(self.config['hosts'],diff) )

        for host in hosts:
            t = ImpalaQueryThread(host,self.config['port'],q, do_work)
            t.start()
            threads.append(t)

        #print 'created ',len(threads),' threads'

        # execute with all threads
        #finished = 0
        for thread in threads:
            thread.join()
            #finished = finished + 1
            #print '\tjoined ',finished

        return results





    def getEntityMatches(self,values):
        self._checkConn()
        cursor = self.cnx.cursor()
        sql = ""
        params = {}
        max = len(values) - 1
        for i in range(len(values)):
            paramname = 'url' + str(i)
            params[paramname] = values[i]
            sql = sql + "select rowkey from hbase_idx_memexht_urn where rowkey = %(" + paramname + ")s "
            if i < max:
                sql = sql + " union all "
        #print sql,params
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        except:
            self.close()
            raise
        return map(lambda x: x[0], rows)


    ## DOMAINS  ####
    def get_domain_items(self, name, limit):
        self._checkConn()
        cursor = self.cnx.cursor()
        #sql = "select rowkey from " + self.config["values_table"] + " where instr(rowkey,%(name)s) >= 1 limit " + str(limit)
        sql = "select rowkey from " + self.config["values_table"] + " where rowkey >= %(startkey)s and rowkey < %(endkey)s limit %(limit)s"
        params = {
            'startkey': name + '\0',
            'endkey': name + '\0~',
            'limit': limit
        }
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        except:
            self.close()
            raise
        return map(lambda x: x[0], rows)

    #TODO: Might need to make this threaded
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


    # TODO vulnerable to sql injection
    def add_new_domain_items(self, domain_items):
        self._checkConn()
        cursor = self.cnx.cursor()
        params = []
        item_list = ','.join(map(lambda x: "('%s','')" % x, domain_items))
        sql = "insert into %s values %s" % (self.config["values_table"], item_list)
        try:
            cursor.execute(sql, params)
            self.cnx.commit()
            cursor.close()
            return True
        except:
            self.close()
            return False
