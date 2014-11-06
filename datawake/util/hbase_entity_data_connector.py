import happybase
import tangelo

from entity import Entity
import data_connector
from datawake.conf import datawakeconfig


class HBASEDataConnector(data_connector.DataConnector):
    def __init__(self, hbase_host):
        data_connector.DataConnector.__init__(self)
        self.hbase_host = hbase_host
        self.hbase_conn = None


    def open(self):
        self.hbase_conn = happybase.Connection(self.hbase_host)

    def close(self):
        if self.hbase_conn is not None:
            self.hbase_conn.close()

    def get_domain_items(self, name, limit):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table(datawakeconfig.DOMAIN_VALUES_TABLE_HBASE)
            rowkey = "%s\0" % name
            entities = []
            for item in hbase_table.scan(row_prefix=rowkey, limit=limit):
                entities.append(item[0])
            return entities
        finally:
            self.close()

    def get_domain_entity_matches(self, domain, type, values):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table(datawakeconfig.DOMAIN_VALUES_TABLE_HBASE)
            rowkey = "%s\0%s\0" % (domain, type)
            found = []
            for value in values:
                for item in hbase_table.scan(row_prefix="%s%s" % (rowkey, value)):
                    found.append(value)
            return found
        finally:
            self.close()

    def getExtractedDomainEntitiesFromUrls(self, domain, urls, type=None):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table("domain_extractor_web_index_hbase")
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
            self.close()

    def _checkConn(self):
        self.open()

    def getExtractedEntitiesFromUrls(self, urls, type=None):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table("general_extractor_web_index_hbase")
            results = {}
            for url in urls:
                for d in hbase_table.scan(row_prefix="%s\0" % url):
                    if url not in results:
                        results[url] = {}
                    tokens = d[0].split("\0")
                    url = tokens[0]
                    type = tokens[1]
                    value = tokens[2]
                    if type not in results[url]:
                        results[url][type] = [value]
                    else:
                        results[url][type].append(value)
            return results
        finally:
            self.close()

    def delete_domain_items(self, domain_name):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table(datawakeconfig.DOMAIN_VALUES_TABLE_HBASE)
            rowkey_prefix = domain_name + '\0'
            batch_delete = hbase_table.batch(batch_size=20)
            for key in hbase_table.scan(row_prefix=rowkey_prefix):
                batch_delete.delete(row=key[0])
            batch_delete.send()
        finally:
            self.close()

    def getExtractedEntitiesWithDomainCheck(self, urls, types=[], domain='default'):
        return data_connector.DataConnector.getExtractedEntitiesWithDomainCheck(self, urls, types, domain)

    def get_extracted_domain_entities_for_urls(self, domain, urls):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table("domain_extractor_web_index_hbase")
            entity_values = []
            for url in urls:
                for d in hbase_table.scan(row_prefix="%s\0%s\0" % (domain, url)):
                    tokens = d[0].split("\0")
                    value = tokens[3]
                    entity_values.append(value)
            return entity_values
        finally:
            self.close()

    def get_extracted_entities_list_from_urls(self, urls):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table("general_extractor_web_index_hbase")
            data = []
            for url in urls:
                for d in hbase_table.scan(row_prefix="%s\0" % url):
                    data.append(d[0])
            return data
        finally:
            self.close()

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

    def add_new_domain_items(self, domain_items):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table(datawakeconfig.DOMAIN_VALUES_TABLE_HBASE)
            batch_put = hbase_table.batch(batch_size=100)
            for i in domain_items:
                batch_put.put(row=i, data={"colFam:c": ""})

            batch_put.send()
        finally:
            self.close()

    def insertHBASE(self, rowkey_prefix, items, table):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table(table)
            batch_put = hbase_table.batch(batch_size=len(items))
            for i in items:
                batch_put.put(row="%s%s" % (rowkey_prefix, i), data={"colFam:c": ""})

            batch_put.send()
        finally:
            self.close()

    def insertEntities(self, url, entity_type, entity_values):
        rowkey_prefix = "%s\0%s\0" % (url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, "general_extractor_web_index_hbase")

    def insertDomainEntities(self, domain, url, entity_type, entity_values):
        rowkey_prefix = "%s\0%s\0%s\0" % (domain, url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, "domain_extractor_web_index_hbase")