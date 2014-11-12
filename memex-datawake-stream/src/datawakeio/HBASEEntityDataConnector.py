import happybase

from datawakeio.data_connector import ExtractedDataConnector

class HBASEDataConnector(ExtractedDataConnector):
    def __init__(self, hbase_host):
        ExtractedDataConnector.__init__(self)
        self.hbase_host = hbase_host
        self.hbase_conn = None


    def open(self):
        self.hbase_conn = happybase.Connection(self.hbase_host)

    def close(self):
        if self.hbase_conn is not None:
            self.hbase_conn.close()

    def _checkConn(self):
        self.open()

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

    def insert_entities(self, url, entity_type, entity_values):
        rowkey_prefix = "%s\0%s\0" % (url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, "general_extractor_web_index_hbase")

    def insert_domain_entities(self, domain, url, entity_type, entity_values):
        rowkey_prefix = "%s\0%s\0%s\0" % (domain, url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, "domain_extractor_web_index_hbase")

    def get_domain_entity_matches(self, domain, type, values):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table("datawake_domain_entities_hbase")
            rowkey = "%s\0%s\0" % (domain, type)
            found = []
            for value in values:
                for item in hbase_table.scan(row_prefix="%s%s" % (rowkey, value)):
                    found.append(value)
            return found
        finally:
            self.close()