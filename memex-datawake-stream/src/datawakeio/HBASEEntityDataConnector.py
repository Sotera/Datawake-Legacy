import happybase
import traceback
from datawakeio.data_connector import ExtractedDataConnector

class HBASEDataConnector(ExtractedDataConnector):
    def __init__(self, conf):
        ExtractedDataConnector.__init__(self)
        self.host = conf['hbase_host']
        self.port = int(conf['hbase_port'])
        table_prefix = '' if conf['hbase_namespace'] == 'default' or conf['hbase_namespace'] == '' else conf['hbase_namespace'].encode()+':'
        self.domain_table = table_prefix + conf['hbase_domain_table'].encode()
        self.extracted_all_table = table_prefix + conf['hbase_extracted_all_table'].encode()
        self.extracted_domain_table = table_prefix + conf['hbase_extracted_domain_table'].encode()
        self.hbase_conn = None


    def open(self):
        self.hbase_conn = happybase.Connection(host=self.host,port=self.port)

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
        url = url.encode('utf-8')
        entity_type = entity_type.encode('utf-8')
        entity_values = map(lambda x: x.encode('utf-8'),entity_values)
        rowkey_prefix = "%s\0%s\0" % (url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, self.extracted_all_table)


    def insert_domain_entities(self, domain, url, entity_type, entity_values):
        url = url.encode('utf-8')
        entity_type = entity_type.encode('utf-8')
        entity_values = map(lambda x: x.encode('utf-8'),entity_values)
        rowkey_prefix = "%s\0%s\0%s\0" % (domain, url, entity_type)
        self.insertHBASE(rowkey_prefix, entity_values, self.extracted_domain_table)

    def get_domain_entity_matches(self, domain, type, values):
        try:
            self._checkConn()
            hbase_table = self.hbase_conn.table(self.domain_table)
            rowkey = "%s\0%s\0" % (domain, type)
            found = []
            for value in values:
                prefix = "%s%s" % (rowkey, value)
                prefix = prefix.encode('utf-8')
                for item in hbase_table.scan(row_prefix=prefix):
                    found.append(value)
            return found
        except:
            traceback.print_exc()
            raise
        finally:
            self.close()